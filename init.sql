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
DROP TABLE IF EXISTS Tellers CASCADE;
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
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'LOCKED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
/* Ký sự tư duy thiết kế: 
- Việc sử dụng UUID thay vì SERIAL ngăn chặn rủi ro IDOR.
- UNIQUE tại cột email và số điện thoại đảm bảo dữ liệu không trùng lặp.
- KHÔNG DÙNG ON DELETE CASCADE để bảo toàn lịch sử dữ liệu chuẩn Core Banking, chỉ cập nhật status.
*/

-- 2. Bảng Nhân viên / Giao dịch viên (Tellers)
CREATE TABLE Tellers (
    teller_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'TELLER' CHECK (role IN ('ADMIN', 'TELLER')),
    branch_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Loại tài khoản (Account_Types)
CREATE TABLE Account_Types (
    account_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name VARCHAR(50) UNIQUE NOT NULL, 
    interest_rate NUMERIC(5, 4) DEFAULT 0 CHECK (interest_rate >= 0),
    description TEXT
);

-- 4. Bảng Tài khoản ngân hàng (Accounts)
CREATE TABLE Accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES Customers(customer_id), -- Bỏ CASCADE
    account_type_id UUID NOT NULL REFERENCES Account_Types(account_type_id),
    account_number VARCHAR(20) UNIQUE NOT NULL,
    balance NUMERIC(20, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'SUSPENDED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
/* Ký sự tư duy thiết kế:
- NUMERIC(20, 2) ngăn sai số máy tính. 
- CHECK (balance >= 0) chặn việc tài khoản bị trừ thủng tiền ở Native Database Level.
*/

-- 5. Bảng Giao dịch (Transactions)
CREATE TABLE Transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code VARCHAR(30) UNIQUE DEFAULT ('TXN-' || substring(md5(random()::text) from 1 for 10)),
    from_account_id UUID REFERENCES Accounts(account_id),
    to_account_id UUID REFERENCES Accounts(account_id),  
    teller_id UUID REFERENCES Tellers(teller_id),         
    amount NUMERIC(20, 2) NOT NULL CHECK (amount > 0),    
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER')),
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REVERTED')),
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- 6. Bảng Nhật ký kiểm toán (Audit_Logs)
CREATE TABLE Audit_Logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES Accounts(account_id),
    action VARCHAR(50) NOT NULL, 
    old_data JSONB, 
    new_data JSONB,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INDEXING: Đánh chỉ mục (Index) hỗ trợ truy vấn báo cáo siêu tốc
-- ==========================================
CREATE INDEX idx_accounts_customer ON Accounts(customer_id);
CREATE INDEX idx_transactions_from ON Transactions(from_account_id);
CREATE INDEX idx_transactions_to ON Transactions(to_account_id);
CREATE INDEX idx_transactions_teller ON Transactions(teller_id);
CREATE INDEX idx_transactions_date ON Transactions(transaction_date);
CREATE INDEX idx_audit_logs_account ON Audit_Logs(account_id);


-- ==========================================
-- PHẦN 2: ADVANCED LOGIC (PL/pgSQL - FUNCTION VÀ TRIGGER)
-- ==========================================

-- 1. Trigger: Tự động cập nhật balance khi phát sinh Transaction thành công
CREATE OR REPLACE FUNCTION fn_update_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Chỉ tính tiền khi giao dịch hợp lệ
    IF NEW.status = 'COMPLETED' THEN
        IF NEW.transaction_type = 'DEPOSIT' THEN
            UPDATE Accounts SET balance = balance + NEW.amount, updated_at = CURRENT_TIMESTAMP 
            WHERE account_id = NEW.to_account_id;
            
        ELSIF NEW.transaction_type = 'WITHDRAWAL' THEN
            UPDATE Accounts SET balance = balance - NEW.amount, updated_at = CURRENT_TIMESTAMP 
            WHERE account_id = NEW.from_account_id;
            
        ELSIF NEW.transaction_type = 'TRANSFER' THEN
            UPDATE Accounts SET balance = balance - NEW.amount, updated_at = CURRENT_TIMESTAMP 
            WHERE account_id = NEW.from_account_id;
            
            UPDATE Accounts SET balance = balance + NEW.amount, updated_at = CURRENT_TIMESTAMP 
            WHERE account_id = NEW.to_account_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_balance
AFTER INSERT ON Transactions
FOR EACH ROW
EXECUTE FUNCTION fn_update_balance();

-- 2. Trigger: Ghi Log khi Accounts thay đổi
CREATE OR REPLACE FUNCTION fn_log_account_changes()
RETURNS TRIGGER AS $$
BEGIN
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

-- 3. Cấu trúc Stored Function: Chuyển tiền an toàn 
CREATE OR REPLACE FUNCTION fn_transfer_money(
    p_from_account VARCHAR(20),
    p_to_account VARCHAR(20),
    p_amount NUMERIC(20, 2),
    p_teller_id UUID DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    v_from_id UUID;
    v_to_id UUID;
    v_current_balance NUMERIC(20, 2);
    v_ref_code VARCHAR(30);
BEGIN
    -- Sinh mã tham chiếu đặc biệt cho chuyển tiền
    v_ref_code := 'TRF-' || substring(md5(random()::text) from 1 for 8);

    -- Dùng FOR UPDATE để chống Race Condition
    SELECT account_id, balance INTO v_from_id, v_current_balance 
    FROM Accounts WHERE account_number = p_from_account AND status = 'ACTIVE' FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'LỖI: Tài khoản người gửi không tồn tại hoặc bị khóa.';
    END IF;

    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION 'LỖI: Số dư trong tài khoản không đủ. Yêu cầu: %, Hiện tại: %', p_amount, v_current_balance;
    END IF;

    SELECT account_id INTO v_to_id 
    FROM Accounts WHERE account_number = p_to_account AND status = 'ACTIVE' FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LỖI: Tài khoản đích không tồn tại hoặc bị khóa.';
    END IF;

    -- Đẩy Transaction sinh log tự động thông qua function
    INSERT INTO Transactions(reference_code, from_account_id, to_account_id, teller_id, amount, transaction_type, status, description)
    VALUES (v_ref_code, v_from_id, v_to_id, p_teller_id, p_amount, 'TRANSFER', 'COMPLETED', 'Lệnh chuyển tiền an toàn từ Function');

    RETURN 'Giao dịch chuyển tiền thực hiện thành công. Mã tham chiếu: ' || v_ref_code;

EXCEPTION
    WHEN OTHERS THEN
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
    a.balance AS "Current Balance",
    a.status AS "Account Status"
FROM Customers c
JOIN Accounts a ON c.customer_id = a.customer_id
JOIN Account_Types t ON a.account_type_id = t.account_type_id
WHERE c.status = 'ACTIVE';

-- ==========================================
-- PHẦN 4: INSERT DỮ LIỆU MẪU ĐỂ TEST
-- ==========================================

-- Lệnh 0: Insert 1 Admin
INSERT INTO Tellers (teller_id, username, password_hash, full_name, role, branch_name) VALUES 
('99999999-9999-9999-9999-999999999999', 'admin', 'pbkdf2:sha256:...', 'Admin System', 'ADMIN', 'Hội Sở Chính');

-- Lệnh 1: Insert 2 Loại tài khoản
INSERT INTO Account_Types (account_type_id, type_name, description) VALUES 
('11111111-1111-1111-1111-111111111111', 'Checking Account', 'Tài khoản chi tiêu thẻ ATM'),
('22222222-2222-2222-2222-222222222222', 'Savings Account', 'Tài khoản tiết kiệm có kỳ hạn');

-- Lệnh 2: Insert 2 Khách hàng
INSERT INTO Customers (customer_id, full_name, email, phone_number, address) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tran Van A', 'vana@gmail.com', '0901234567', 'So 1 Le Duan, DN'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Nguyen Thi B', 'thib@gmail.com', '0919876543', 'So 25 Nguyen Hue, HCM');

-- Lệnh 3: Insert Mở tài khoản
INSERT INTO Accounts (account_id, customer_id, account_type_id, account_number, balance) VALUES 
('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '1010101010', 50000.00),
('20000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '2020202020', 10000.00);

-- Lệnh 4: Test DEPOSIT với Teller
INSERT INTO Transactions (reference_code, teller_id, to_account_id, amount, transaction_type, description)
VALUES ('DEP-TEST88', '99999999-9999-9999-9999-999999999999', '10000000-0000-0000-0000-000000000001', 5000.00, 'DEPOSIT', 'A Nạp tiền khởi tạo tại quầy');

-- Lệnh 5: Test Chuyển tiền từ Function an toàn
SELECT fn_transfer_money('1010101010', '2020202020', 15000.00, '99999999-9999-9999-9999-999999999999');
