# 🏦 Bank Management System - Nexus Banking

![Sơ đồ Cơ sở dữ liệu Ngân hàng](./Customer%20Account%20Management-2026-03-25-075144.png)
> *Hình 1: Sơ đồ Thực thể Liên kết (ER Diagram) biểu diễn kiến trúc cơ sở dữ liệu cốt lõi của Hệ thống Nexus Banking. Bảng thiết kế thể hiện cấu hình Data Model tuân thủ chặt chẽ chuẩn 3NF, đi kèm hệ khóa chính bảo mật UUID kết nối xuyên suốt các bảng. Đặc biệt, có đầy đủ các ghi chú về Tùy chọn Ràng buộc Toàn vẹn (như `CHECK balance >= 0`)*

Dự án Hệ thống Quản trị CSDL Ngân hàng, được thiết kế chuyên nghiệp chuyên sâu vào xử lý toàn vẹn dữ liệu (Data Integrity), quy trình tự động và ứng dụng Web nội bộ theo chuẩn Premium.

## 🌟 Tổng quan Pipeline (Kiến trúc Hệ thống)

Dự án bao gồm 2 mảnh ghép chính hoạt động song song để tạo thành một Pipeline vòng lặp an toàn:

1. **Backend Database (PostgreSQL 15)**
   - **Lưu trữ Cốt lõi**: Cấu trúc Data Model ở dạng **chuẩn 3NF** bằng UUID an toàn thông qua các bảng `Customers`, `Account_Types`, `Accounts`, `Transactions`.
   - **Xử lý Tự động (Triggers)**: Kích hoạt Function tự động trừ/cộng tiền (`trg_update_balance`) và ghi vào nhật ký kiểm toán (`trg_log_account_changes`) mỗi khi có biến động giao dịch.
   - **Transaction Logic**: Vận hành bởi các Function và Blocks `EXCEPTION`, đảm bảo nguyên tắc **ACID**. Mọi thông tin sai trái sẽ buộc Database phải `ROLLBACK` ngay lập tức.
   - **Reporting**: Được truy vấn thời gian thực (Real-time) qua View `v_customer_summary`.

2. **Frontend Web App (Next.js - React)**
   - Đóng vai trò là Client giao tiếp thẳng với Database thông qua Next.js **Server API Routes**.
   - Cung cấp giao diện làm việc **Deep Dark Mode**, **Glassmorphism**, không dùng dính dáng tới các Framework nặng như Tailwind. Tính năng này giúp App trở nên gọn gàng, thẩm mỹ cực kỳ bắt mắt.
   - Bắt trọn toàn bộ mã lỗi từ SQL ném lên và render thành Toast Loading mượt mà trên UI. Mọi lệnh chuyển tiền được quản lý nguyên tử bằng Function PL/pgSQL gọi từ Web.

---

## 🛠️ Hướng dẫn Cài đặt & Khởi chạy (Cách chạy App)

Để chạy trọn vẹn dự án dưới local của bạn, hãy làm theo tuần tự 2 bước dưới đây:

### Bước 1: Khởi tạo Database qua Docker
Hệ thống sử dụng Docker để tạo ra Container chứa Postgres 15 sạch sẽ chạy port **5433** nhằm tránh xung đột. Script khởi tạo `init.sql` sẽ tự động tạo bảng dữ liệu và Trigger ngầm.
```bash
# Đứng tại thư mục gốc của dự án (bank_system)
docker compose up -d
```
Đợi khoảng vài giây để Docker kéo Image và chạy kịch bản tạo Data cho Database.

### Bước 2: Chạy Giao diện Quản trị Web
Tại thư mục gốc, tiến hành cài đặt thư viện cho web và chạy dev-server.
```bash
# Chuyển vào folder chứa Frontend
cd web

# Cài đặt thư viện yêu cầu (pg, lucide-react, next)
npm install

# Khởi chạy server 
npm run dev
```

### Bước 3: Trải nghiệm
- **Website mở ở:** [http://localhost:3000](http://localhost:3000)
- Tại đây, bạn có thể thực hiện 3 hành động chính: 
  ✅ **Tạo Tài khoản Khách hàng mới** (Lấy ngẫu nhiên mã 10 số, số dư ban đầu bằng 0đ).  
  ✅ **Nạp Tiền** (kích hoạt báo cáo và số dư lên tự động thông qua hàm Update DEPOSIT API).  
  ✅ **Chuyển Khoản Trực Tiếp** (đưa tiền từ số Tài khoản A sang Số Tài khoản B an toàn tuyệt đối).

---

## 💡 Xử lý sự cố
- Nếu Frontend báo lỗi "Kết nối Database thất bại", hãy đảm bảo Container Postgres vẫn đang `Up` qua lệnh `docker ps`.
- Nếu có file `postcss.config.mjs` bị báo lỗi Undefined, yên tâm vì file này đã được setup xuất object rỗng `export default {};` nhằm cấu hình thuần cho Vanilla CSS. Thường bạn sẽ không phải lo về nó nữa.
