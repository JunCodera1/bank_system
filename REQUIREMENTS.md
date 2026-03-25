# Tài liệu Yêu cầu Hệ thống (System Requirements Specification)
**Dự án:** Hệ thống Quản trị Ngân hàng Nội bộ (Nexus Banking)

---

## 1. Mục tiêu Dự án
Xây dựng một hệ thống phần mềm quản lý ngân hàng thu nhỏ, tập trung cốt lõi vào thiết kế Cơ sở dữ liệu đạt chuẩn 3NF và tính toàn vẹn dữ liệu (Data Integrity). Hệ thống phục vụ cho nghiệp vụ quản trị viên nội bộ (Admin/Teller) thao tác kiểm tra số dư, mở tài khoản, nạp tiền và luân chuyển dòng tiền tệ một cách an toàn nhất.

## 2. Hệ tác nhân (Actors)
- **Quản trị viên / Giao dịch viên (Admin / Teller)**: Là người dùng duy nhất của hệ thống nội bộ, có quyền khởi tạo tài khoản, tra cứu số dư, thực hiện nạp tiền và luân chuyển tiền từ tài khoản này sang tài khoản khác theo yêu cầu của khách hàng.
- **Hệ thống tự động (Database Triggers)**: Đóng vai trò giám sát ngầm, tự động tính toán số dư và ghi chép nhật ký kiểm toán (Audit Log) mỗi khi có truy vấn thay đổi dữ liệu bảng tài khoản.

## 3. Yêu cầu Chức năng (Functional Requirements)

### 3.1. Quản lý Khách hàng & Tài khoản
- **Đăng ký Tài khoản (Mở thẻ gốc)**:
  - Hệ thống cho phép thu thập: Họ tên, Email, Số điện thoại di động, Địa chỉ và Loại hình tài khoản (Checking / Savings).
  - Tự động sinh `Account Number` duy nhất dưới dạng 10 chữ số liền kề.
  - Số dư khởi tạo luôn luôn phải bằng `0 VNĐ`.
  - Từ chối đăng ký nếu Email hoặc Số điện thoại đã được sử dụng trước đó (cảnh báo lỗi tức thời).

### 3.2. Quản lý Giao dịch Tài chính
- **Tra cứu và Báo cáo (Reporting)**:
  - Hiển thị danh sách tổng quan tất cả các tài khoản đang Active trong hệ thống với các trường: *Tên KH, Số Tài Khoản, Loại Tài Khoản, Số Dư Hiện Tại*.
- **Nạp tiền (Deposit)**:
  - Cho phép Teller nạp tiền mặt vào một tài khoản cụ thể. 
  - Yêu cầu: Xác thực thông tin tài khoản đích. Số lượng tiền nạp phải `> 0`.
- **Chuyển khoản nội bộ (Internal Transfer)**:
  - Xử lý chuyển tiền trừ tài khoản A sang tài khoản B.
  - Từ chối giao dịch và báo lỗi nếu tài khoản A không đáp ứng đủ số dư.
  - Từ chối giao dịch nếu một trong hai tài khoản đã bị khóa hoặc không tồn tại.

### 3.3. Yêu cầu Kiểm toán (Audit & Logs)
- Ghi lại vết mọi giao dịch (DEPOSIT, WITHDRAWAL, TRANSFER) với thông tin chiều gửi/chiều nhận cụ thể, timestamps, cùng lý do giao dịch vào bảng `Transactions`.
- **Trigger Track**: Bất kỳ khi nào thông số `balance` của một tài khoản trên hệ thống thay đổi (do Trigger hay do thao tác thủ công), phải tự động ghi vào bảng `Audit_Logs` với định dạng JSON log rõ ràng `old_data`, `new_data`.

---

## 4. Yêu cầu Phi chức năng (Non-Functional Requirements)

### 4.1. An toàn & Toàn vẹn Dữ liệu (Data Integrity & Security)
- **Tính Nguyên tử (ACID)**: Ràng buộc vòng lặp Transaction cực kỳ nghiêm ngặt. Phải đảm bảo logic tiền của người gửi trừ xong thì người nhận chắc chắn phải được cộng vào. Mọi phát sinh trục trặc giữa chừng phải kích hoạt hiệu lệnh `ROLLBACK` khôi phục hiện trạng dữ liệu gốc.
- **Tranh chấp Đồng thời (Row-Level Locking)**: Khi tài khoản bị trừ tiền, record đó phải bị khóa (`FOR UPDATE`) cho tới khi luồng chuyển tiền hoàn tất để chống lỗi **Race Condition** (Double-withdrawal / Trừ trùng lặp do 2 luồng xử lý cùng lúc).
- **Anti-IDOR (Insecure Direct Object Reference)**: Hệ thống định danh khóa chính trong CSDL hoàn toàn không được dùng `INTEGER AUTO_INCREMENT` (SERIAL) nhằm chống lộ số lượng khách hàng thực tế và bị dò quét id. Thay vào đó chuẩn bộ Key phải là **UUID v4**.

### 4.2. Ràng buộc CSDL Thực tế (Constraints)
- Định dạng tiền tệ: Bắt buộc dùng kiểu dữ liệu `NUMERIC(20, 2)` (Độ rộng 20, đuôi thập phân giới hạn 2) nhằm triệt tiêu hoàn toàn sai số máy tính dạng Floating-point mà các hệ thống code non trẻ dùng FLOAT thường mắc phải.
- `CHECK (balance >= 0)`: Số dư không bao giờ được phép âm ở cấp độ Native Database.
- `CHECK (amount > 0)`: Tuyệt đối không giao dịch chuyển hoặc nạp giá trị `<=` 0.

### 4.3. Giao diện (UI/UX Aesthetics)
- Trải nghiệm thị giác phải mang tính thẩm mỹ cao cấp (Premium).
- Áp dụng hệ thiết kế Glassmorphism trên nền Deep Dark Mode. Không dùng TailwindCSS, thuần **Vanilla CSS** Module. Đổ bóng có chiều sâu và Typography hiện đại (`Outfit` Font).
- Báo cáo lỗi (Exception UI) trực quan ngay trên luồng hiển thị bằng ngôn ngữ Tiếng Việt, hỗ trợ định dạng tiền `VNĐ` trực tiếp từ Frontend mà không can thiệp Data Types.
