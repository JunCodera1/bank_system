# Kịch bản Thuyết trình Đồ án Core Banking (Tập trung SQL/Database)

**Ghi chú cho bạn:** Trong buổi bảo vệ, hãy mở Giao diện Web lên cho có không khí (để thầy chọc ngoáy tạo lệnh nạp/chuyển), nhưng Màn hình chính hãy **bật file `init.sql`** lên để phân tích các dòng lệnh bên dưới.

---

## PHẦN 1: MỞ ĐẦU (1-2 Phút)
"Dạ em chào Thầy và các bạn. Hôm nay em xin trình bày đồ án Hệ thống Quản trị Ngân hàng Nội bộ (Nexus Banking). Mục tiêu lớn nhất em đặt ra trong đồ án này không phải là làm một trang web mượt hay đẹp, mà là thiết kế một **Kiến trúc Database vòng lặp khép kín, cực kỳ chặt chẽ, bảo toàn tính toàn vẹn dữ liệu (Data Integrity)**."

*(Bật mở thử Web tạo 1 khách hàng và chia màn hình bật file SQL)*

---

## PHẦN 2: BẢN THUYẾT TRÌNH CÁC ĐIỂM NHẤN DATABASE (3-4 Phút)

### 1. Kiểu dữ liệu và Ràng buộc nguyên thủy (Database Native Constraints)
- "Hệ thống của em chia làm 6 bảng đạt chuẩn 3NF: `Customers`, `Tellers`, `Account_Types`, `Accounts`, `Transactions`, và `Audit_Logs`."
- "Thay vì dùng ID kiểu `INT AUTO_INCREMENT` quen thuộc, em sử dụng **`UUID`** làm Khóa chính. Đối với ngân hàng, khóa chính phải vô nghĩa hóa và không thể đoán trước, nhằm chống lại lỗ hổng dò quét ID khách hàng."
- "Về loại biến chứa Tiền, em ép dùng **`NUMERIC(20, 2)`** thay vì `FLOAT / DOUBLE` để triệt tiêu lỗi làm tròn sai số cơ số 2 cực kỳ nguy hiểm trong tài chính."
- "Em gài thẳng luật `CHECK (balance >= 0)`. Dù code trên Backend bị lủng đi chăng nữa, Engine PostgreSQL tuyệt đối từ chối lệnh trừ thủng túi tiền."

### 2. Nghệ thuật tự vận hành bằng Triggers (Database Automation)
- "Dạ thưa thầy, điểm đặc biệt là em đã đẩy phân nửa sức chịu tải về lại Engine SQL thay vì code logic tay ở Backend."
- "Em viết **Trigger `trg_update_balance`**: Cứ hễ có một lệnh `INSERT` giao dịch vào bảng `Transactions` và có cờ `COMPLETED` thành công, Trigger sẽ bám theo đuôi tự động cộng/trừ số dư bên `Accounts`. Web chỉ cần ra lệnh Nạp/Rút 1 thao tác."
- "Tiếp theo là **Trigger `trg_log_account_changes`**: Bất cứ khi nào cục số dư tài khoản chênh lệch, Trigger lập tức bắt Snapshot Raw JSON (`old_data` và `new_data`) lưu vào `Audit_Logs`. Dù người ta có vào tận SQL Editor để hack số thì mọi dòng chảy thay đổi vẫn bị bắt quả tang."

### 3. Stored Function & Đối phó Race Condition (PL/pgSQL)
- "Với lệnh luân chuyển dòng tiền trừ bên này cộng bên kia, em viết Stored Function `fn_transfer_money` áp dụng khối **`EXCEPTION`** (Bắt ngoại lệ). Bất cứ một ràng buộc nào bị vi phạm, lệnh `ROLLBACK` tự nổ và toàn bộ quy trình Transaction chưa hoàn tất sẽ bị hủy ngang, bảo toàn tính ACID."
- "Đồng thời trong Function này, trước khi trừ tiền, vòng `SELECT` của em được bổ trợ mác **`FOR UPDATE`**. Đây là Kỹ thuật Khóa dòng (Row-level lock). Nó khóa chặt tài khoản lại trong thời gian xử lý, 2 luồng chuyển tiền va vào nhau cùng 1 tích tắc thì 1 luồng phải quỳ xuống chờ luồng kia làm xong (chặn Double-withdaw Race Condition)."

---

## PHẦN 3: BỘ DỰ ĐOÁN 5 CÂU HỎI "XOÁY" CỦA THẦY VÀ CÁCH ĐÁP TRẢ (Q&A)

### 1. Thầy vặn: *"Tại sao lại dùng UUID làm Khóa chính? Đánh Index tra cứu ID dạng Int tuần tự chẳng nhanh và tối ưu bộ nhớ hơn à?"*
> **Trả lời tự tin:** "Dạ thưa Thầy, Int tự tăng tốc độ đánh Index có hể nhỉnh hơn và nhẹ DB hơn, nhưng trong Tài chính thì nó vi phạm bảo mật cấu trúc nghiêm trọng (Lỗ hổng tên là IDOR). Ví dụ, kẻ gian tạo 1 tài khoản lấy được ID `105`, hắn lập tức biết ngân hàng mình mới có 105 khách hàng, và hắn có thể viết script vòng lặp gọi API với ID 1, 2, 3 để trộm Data. Chuỗi `UUID` vô hình định dạng ngẫu nhiên nên phá vỡ được nguy cơ này thưa thầy."

### 2. Thầy vặn: *"Lý do nào em chống chỉ định dùng FLOAT cho tài khoản ngân hàng?"*
> **Trả lời:** "Dạ các kiểu số thực như FLOAT hay REAL trong SQL lưu giá trị bằng cơ số nhị phân (Floating-point) giới hạn bởi phần cứng nên nó không thể biểu diễn chính xác hoàn toàn các số lẻ hệ thập phân. Ví dụ như $0.1 + 0.2$ máy tính sẽ tính ra `$0.300000000004$`. Kiểu `NUMERIC` ấn định số lượng chữ số tĩnh sẽ đảm bảo độ chính xác tuyệt đối không trượt đi đâu được 1 xu ạ."

### 3. Thầy vặn: *"Nếu User xài thủ thuật Double click 1 lúc 2 lần (2 luồng gửi API cùng lúc), làm sao đảm bảo tiền không bị trừ lố 2 lần nếu check số dư ban đầu đều qua cửa hợp lệ?"*
> **Trả lời:** "Dạ chính vì sợ vấn đề va chạm (Race Condition) này nên em đã xử lý Khóa dòng (Row Level Lock) mấu chốt ở hàm `fn_transfer_money`. Em dùng lệnh **`SELECT ... FOR UPDATE`**. Câu lệnh này sẽ dựng khóa lên Record của Thẻ đó. Query số 2 có gọi đè vào cũng buộc phải rơi vào trạng thái 'Wait' cho đến khi Query 1 xả khóa (`COMMIT` vòng lặp báo xong). Kết hợp vòng `CHECK (balance >=0)` nên mọi ngõ ngách âm tiền đều bít cửa."

### 4. Thầy vặn: *"Tại sao em lại sử dụng Trigger SQL để tính tiền, tính ngay trên NodeJS ở Backend cho dễ lập trình có hơn không?"*
> **Trả lời:** "Dạ vì rủi ro tính toàn vẹn (Single source of truth) ạ. Nếu thiết kế Backend tính toán, lỡ tuần sau nhóm Dev khác không xài NodeJS mà xài Python chọc API vào bảng Database thì họ phải ngồi code lại luồng Update số tiền đấy. Việc em dời trí não Core logic về Trigger trong Engine SQL giúp Engine này đứng độc lập, không cần quan tâm bên ngoài là Web, App hay Công cụ Admin, Database vẫn luôn tự sống, tự cập nhật đúng quy trình nhất quán."

### 5. Thầy vặn: *"Vậy nếu người ta xóa 1 cái thẻ tài khoản thẻ đó có đem theo lịch sử không? Và tại sao em phải lưu old/new data dạng JSON?"*
> **Trả lời:** 
> - "Dạ trong Core Banking không bao giờ có lệnh xóa Xóa cứng (Hard Delete). Em đã áp dụng Xóa mềm (Soft Delete) qua cột `status ('SUSPENDED')` và đập bỏ Rule xóa dây chuyền `ON DELETE CASCADE`. Thẻ Khóa rồi thì dấu vết mãi nằm ở đó ạ."
> - "Còn em xài JSONB cho Audit lưu dạng Snapshots quá khứ/hiện tại vì JSON phi cấu trúc, dù sau này em đẻ thêm bao nhiêu Field trong Schema tiền tệ, JSON vẫn cuốn cuộn lại mượt mà được không cần can thiệp bảng."
