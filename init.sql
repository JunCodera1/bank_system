-- Dọn dẹp schema trước khi khởi tạo (giúp script có thể chạy lại nhiều lần mà không bị lỗi báo trùng)
DROP VIEW IF EXISTS v_customer_summary;
DROP TRIGGER IF EXISTS trg_update_balance ON Transactions;
DROP TRIGGER IF EXISTS trg_log_account_changes ON Accounts;
DROP FUNCTION IF EXISTS fn_transfer_money;
DROP FUNCTION IF EXISTS fn_update_balance;
DROP FUNCTION IF EXISTS fn_log_account_changes;
DROP TABLE IF EXISTS Audit_Logs CASCADE;
DROP TABLE IF EXISTS Transactions CASCADE;
DROP TABLE IF EXISTS Accounts CASCADE;
DROP TABLE IF EXISTS Account_Types CASCADE;
DROP TABLE IF EXISTS Customers CASCADE;

-- ==========================================
-- PHẦN 1: DDL - DATA DEFINITION LANGUAGE (TẠO BẢNG)
-- Thiết kế các bảng ở dạng chuẩn hóa 3NF 
-- ==========================================

-- 1. Bảng Khách hàng (Customers)
CREATE TABLE Customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
/* Ký sự tư duy thiết kế: 
- Việc sử dụng UUID thay vì SERIAL (INT auto increment) ngăn chặn rủi ro hacker 
  đoán được ID của khách hàng kế tiếp (Lỗ hổng IDOR - Insecure Direct Object Reference). 
  Đây là chuẩn mực hiện đại trong các hệ thống Banking và FinTech.
- UNIQUE tại cột email và số điện thoại đảm bảo không có dữ liệu trùng lặp (rác).
*/


-- 2. Bảng Loại tài khoản (Account_Types)
CREATE TABLE Account_Types (
    account_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name VARCHAR(50) UNIQUE NOT NULL, -- VD: 'Checking', 'Savings'
    interest_rate NUMERIC(5, 4) DEFAULT 0 CHECK (interest_rate >= 0),
    description TEXT
);


-- 3. Bảng Tài khoản ngân hàng (Accounts)
CREATE TABLE Accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES Customers(customer_id) ON DELETE CASCADE,
    account_type_id UUID NOT NULL REFERENCES Account_Types(account_type_id),
    account_number VARCHAR(20) UNIQUE NOT NULL,
    balance NUMERIC(20, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'SUSPENDED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
/* Ký sự tư duy thiết kế:
- Tại sao dùng NUMERIC(20, 2) cho tài chính? Tránh tuyệt đối dùng FLOAT/REAL vì 
  chúng là các kiểu dấu phẩy động cơ số 2 bị giới hạn bởi phần cứng, sẽ gây tụt/sai 
  sau vài phép toán. NUMERIC(20,2) cho phép độ chính xác tuyệt đối, lưu ý cả phần thập phân.
- Ràng buộc CHECK (balance >= 0) trên Database Level là chốt chặn tự nhiên tốt nhất, 
  giúp đảm bảo không tài khoản nào có số dư bị âm (ngoại trừ thẻ tín dụng không nằm trong phạm vi đồ án).
*/


-- 4. Bảng Giao dịch (Transactions)
CREATE TABLE Transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_account_id UUID REFERENCES Accounts(account_id), -- Có thể NULL nếu là gửi tiền mặt vào
    to_account_id UUID REFERENCES Accounts(account_id),   -- Có thể NULL nếu là rút ra bằng tiền mặt
    amount NUMERIC(20, 2) NOT NULL CHECK (amount > 0),    -- Không được giao dịch âm hoặc bằng 0
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER')),
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);


-- 5. Bảng Nhật ký kiểm toán (Audit_Logs)
CREATE TABLE Audit_Logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES Accounts(account_id),
    action VARCHAR(50) NOT NULL, 
    old_data JSONB, -- Sử dụng JSONB để lưu trữ bản snapshot cũ/mới, rất mềm dẻo cho audit
    new_data JSONB,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- PHẦN 2: ADVANCED LOGIC (PL/pgSQL - FUNCTION VÀ TRIGGER)
-- ==========================================

-- 1. Trigger: Tự động cập nhật balance khi phát sinh Transaction
CREATE OR REPLACE FUNCTION fn_update_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Áp dụng logic cộng/trừ tiền tùy vào loại giao dịch
    IF NEW.transaction_type = 'DEPOSIT' THEN
        UPDATE Accounts SET balance = balance + NEW.amount, updated_at = CURRENT_TIMESTAMP 
        WHERE account_id = NEW.to_account_id;
        
    ELSIF NEW.transaction_type = 'WITHDRAWAL' THEN
        UPDATE Accounts SET balance = balance - NEW.amount, updated_at = CURRENT_TIMESTAMP 
        WHERE account_id = NEW.from_account_id;
        
    ELSIF NEW.transaction_type = 'TRANSFER' THEN
        -- Trừ tiền từ lúc chuyển
        UPDATE Accounts SET balance = balance - NEW.amount, updated_at = CURRENT_TIMESTAMP 
        WHERE account_id = NEW.from_account_id;
        -- Cộng tiền cho người nhận (Tránh gộp lại trong 1 câu Query để tránh rủi ro Deadlock tùy cấu trúc)
        UPDATE Accounts SET balance = balance + NEW.amount, updated_at = CURRENT_TIMESTAMP 
        WHERE account_id = NEW.to_account_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_balance
AFTER INSERT ON Transactions
FOR EACH ROW
EXECUTE FUNCTION fn_update_balance();
/* Ký sự tư duy thiết kế: 
- Trigger AFTER INSERT luôn nằm ở trung tâm của bài toán tính toán bất đồng bộ. Thay vì cập nhật
  số dư theo cách thủ công lập trình ở Server/Backend, dùng Trigger luôn dảm bảo Database ở trạng
  thái Clean/Consistent (nhất quán tuyệt đối). 
*/


-- 2. Trigger: Ghi Log khi Accounts thay đổi
CREATE OR REPLACE FUNCTION fn_log_account_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Chỉ ghi nhận audit khi số dư thực sự (balance) thay đổi
    IF OLD.balance IS DISTINCT FROM NEW.balance THEN
        INSERT INTO Audit_Logs(account_id, action, old_data, new_data)
        VALUES (
            NEW.account_id, 
            'BALANCE_UPDATE', 
            jsonb_build_object('balance', OLD.balance), 
            jsonb_build_object('balance', NEW.balance)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_account_changes
AFTER UPDATE ON Accounts
FOR EACH ROW
EXECUTE FUNCTION fn_log_account_changes();


-- 3. Cấu trúc Stored Function: Chuyển tiền an toàn (Bắt EXCEPTION và tự ROLLBACK)
CREATE OR REPLACE FUNCTION fn_transfer_money(
    p_from_account VARCHAR(20),
    p_to_account VARCHAR(20),
    p_amount NUMERIC(20, 2)
) RETURNS TEXT AS $$
DECLARE
    v_from_id UUID;
    v_to_id UUID;
    v_current_balance NUMERIC(20, 2);
BEGIN
    -- Bước 1: Lock record gửi và check số dư
    -- FOR UPDATE khóa dòng để tránh "Race Condition" lúc trừ tiền.
    SELECT account_id, balance INTO v_from_id, v_current_balance 
    FROM Accounts WHERE account_number = p_from_account AND status = 'ACTIVE' FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'LỖI: Tài khoản người gửi không tồn tại hoặc bị khóa.';
    END IF;

    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION 'LỖI: Số dư trong tài khoản không đủ. Yêu cầu: %, Hiện tại: %', p_amount, v_current_balance;
    END IF;

    -- Bước 2: Lock record nhận
    SELECT account_id INTO v_to_id 
    FROM Accounts WHERE account_number = p_to_account AND status = 'ACTIVE' FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LỖI: Tài khoản đích (người nhận) không tồn tại hoặc bị khóa.';
    END IF;

    -- Bước 3: Đẩy Transaction vào. Trigger trg_update_balance sẽ gánh phần cập nhật số dư của 2 Accounts.
    INSERT INTO Transactions(from_account_id, to_account_id, amount, transaction_type, description)
    VALUES (v_from_id, v_to_id, p_amount, 'TRANSFER', 'Hệ thống gọi Function fn_transfer_money');

    RETURN 'Giao dịch chuyển tiền thực hiện thành công!';

EXCEPTION
    WHEN OTHERS THEN
        /* Ký sự tư duy thiết kế:
           Bất cứ lỗi nào bên trên sinh ra (do RAISE EXCEPTION hoặc Ràng Buộc Hệ Thống bị break, ví dụ check âm tiền)
           thì luồng điều khiển sẽ bay xuống khối EXCEPTION này.
           Trong PL/pgSQL, toàn bộ transaction (kể từ BEGIN của hàm) ngay khi dính lỗi sẽ bị PostgreSQL 
           TỰ ĐỘNG TRIGGER HÀNH ĐỘNG HỦY (ROLLBACK). 
           Sau đó, mình ném thông báo này lên cho ứng dụng / người dùng biết. */
        RAISE NOTICE 'Transation đã bị hủy (Rollback) vì bắt gặp ngoại lệ: %', SQLERRM;
        RAISE EXCEPTION '(ROLLBACK) Cảnh báo lỗi: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;


-- ==========================================
-- PHẦN 3: REPORTING (VIEW DỮ LIỆU CẨM NANG NGÂN HÀNG)
-- ==========================================

CREATE OR REPLACE VIEW v_customer_summary AS
SELECT 
    c.full_name AS "Customer Name",
    a.account_number AS "Account Number",
    t.type_name AS "Account Type",
    a.balance AS "Current Balance"
FROM Customers c
JOIN Accounts a ON c.customer_id = a.customer_id
JOIN Account_Types t ON a.account_type_id = t.account_type_id
WHERE a.status = 'ACTIVE';

-- ==========================================
-- PHẦN 4: 5 CÂU LỆNH INSERT DỮ LIỆU MẪU ĐỂ TEST
-- ==========================================

-- Lệnh 1: Insert 2 Loại tài khoản (Chèn dữ liệu theo UUID cụ thể để dễ mock)
INSERT INTO Account_Types (account_type_id, type_name, description) VALUES 
('11111111-1111-1111-1111-111111111111', 'Checking Account', 'Tài khoản chi tiêu thẻ ATM'),
('22222222-2222-2222-2222-222222222222', 'Savings Account', 'Tài khoản tiết kiệm có kỳ hạn');

-- Lệnh 2: Insert 2 Khách hàng
INSERT INTO Customers (customer_id, full_name, email, phone_number, address) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tran Van A', 'vana@gmail.com', '0901234567', 'So 1 Le Duan, DN'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Nguyen Thi B', 'thib@gmail.com', '0919876543', 'So 25 Nguyen Hue, HCM');

-- Lệnh 3: Insert Mở tài khoản cho người dùng 
INSERT INTO Accounts (account_id, customer_id, account_type_id, account_number, balance) VALUES 
('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '1010101010', 50000.00),
('20000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '2020202020', 10000.00);

-- Lệnh 4: Thực hiện Test Transaction "NẠP TIỀN" vào tài khoản của A (Giao dịch ban đầu sẽ tự sinh log qua Trigger)
INSERT INTO Transactions (to_account_id, amount, transaction_type, description)
VALUES ('10000000-0000-0000-0000-000000000001', 5000.00, 'DEPOSIT', 'A Nạp thêm tiền tại quầy');
-- GHI CHÚ TEST: Sau lệnh 4, balance của A ('1010101010') sẽ tự động up lên 55,000. (Test được Trigger 1)

-- Lệnh 5: Thực hiện Test Logic CHUYỂN TIỀN CÓ RÀNG BUỘC bằng function tự động
-- A chuyển khoản sang B với số tiền hạn mức 15,000
SELECT fn_transfer_money('1010101010', '2020202020', 15000.00);
-- GHI CHÚ TEST: Lệnh này xong, A sẽ còn 40,000. B sẽ thành 25,000. Kích hoạt trigger ghi lại Logs siêu mượt (Test được Function EXCEPTION/ROLLBACK và Trigger 2).
