# CD Reshop - Multi Vendor E-commerce Platform

Dự án Hệ thống Sàn thương mại điện tử Đa nhà cung cấp (Multi-Vendor E-commerce Platform). Hệ thống được chia theo kiến trúc Modular Monolith dành cho Backend và 3 portal độc lập dành cho Frontend (Customer, Vendor, Admin).

Toàn bộ dự án được quản lý và khởi chạy thông qua **Docker & Docker Compose** để tối ưu hóa quy trình cài đặt và đồng bộ hóa môi trường giữa các thành viên.

---

## 🛠️ Yêu cầu Hệ thống (Prerequisites)

Để chạy được dự án, máy tính của bạn cần được cài đặt sẵn:
- **Docker & Docker Compose**
- **Git** (để quản lý phiên bản)

---

## 🚀 Hướng Dẫn Cài Đặt và Khởi Chạy Nhanh (Docker-based Setup)

Vui lòng làm tuần tự theo các bước dưới đây để thiết lập được hệ thống.

### Bước 1: Thiết lập Biến Môi Trường (Environment Variables)

Sao chép file mẫu `.env.example` ở thư mục gốc thành `.env`:

```bash
cp .env.example .env
```

Mở file `.env` vừa tạo và cập nhật các thông tin cấu hình (như mật khẩu PostgreSQL hoặc API Key của Gemini nếu có).

### Bước 2: Khởi chạy các dịch vụ (Containers)

Chạy lệnh dưới đây tại thư mục gốc của dự án để build và chạy toàn bộ dịch vụ (Database, Backend, Frontend):

```bash
docker compose up --build -d
```

Sau khi chạy thành công, các dịch vụ sẽ hoạt động tại:
- **Frontend Storefront**: `http://localhost:5173` (Cổng mặc định cho cả Customer, Vendor, Admin)
- **Backend API Server**: `http://localhost:8000`
- **PostgreSQL Database**: Cổng `5433` (được map từ cổng `5432` trong container)

---

## 💾 Khởi Tạo Cơ Sở Dữ Liệu & Hạt Giống (Database & Seed)

Hệ thống sử dụng PostgreSQL. Để thiết lập database cho lần đầu khởi chạy hoặc làm mới toàn bộ dữ liệu, hãy thực hiện các lệnh sau:

### 1. Reset database (Nếu muốn làm sạch toàn bộ dữ liệu cũ)
```bash
docker compose exec backend node database/drop.js
```

### 2. Tạo cấu trúc bảng (Migration)
Khởi tạo cấu trúc cơ sở dữ liệu chuẩn dựa trên file `schema.sql`:
```bash
docker compose exec backend node database/migrate.js
```

### 3. Seed dữ liệu mẫu hệ thống (Master Seed)
Khởi tạo dữ liệu cơ bản bao gồm cấu hình phí (fee tiers), tài khoản admin, tài khoản chủ shop, danh mục, và các sản phẩm mẫu:
```bash
docker compose exec backend node database/seeds/seed-master.js
```

### 4. Seed kịch bản đánh giá & đặt hàng (Scenario Seed)
Khởi tạo kịch bản tự động hóa gồm 60 đơn hàng hoàn thành và 60 đánh giá/phản hồi chi tiết (dành cho người mua và các shop) dựa theo file `tool/review.md` và `tool/kicban.md`:
```bash
docker compose exec backend node database/seeds/seed-reviews-kicban.js
```

---

## 🧪 Chạy Kiểm Thử (Run Tests)

### Chạy kiểm thử Backend:
Để kiểm tra tính đúng đắn của toàn bộ các API, phân quyền, và nghiệp vụ tài chính:
```bash
docker compose exec backend npm run test
```

### Chạy kiểm thử Frontend:
```bash
# Ở môi trường local hoặc chạy trực tiếp qua npm:
cd frontend/storefront
npm run test
```

---

## 🔑 Thông tin Tài khoản Demo mặc định

Sau khi chạy lệnh **Master Seed**, bạn có thể đăng nhập vào hệ thống bằng các tài khoản demo sau:

*   **Super Admin**:
    *   Email: `admin@reshop.vn`
    *   Mật khẩu: `admin123@<>`
*   **Chủ shop Cầu Lông Pro** (Vendor 1):
    *   Email: `contact@caulongstore.com`
    *   Mật khẩu: `password123`
*   **Chủ shop Thế Giới Cầu Lông** (Vendor 2):
    *   Email: `contact2@caulongstore.com`
    *   Mật khẩu: `password123`
*   **Khách hàng Phương Thúy**:
    *   Email: `phuongthuy@reshop.vn`
    *   Mật khẩu: `12345678`
*   **Khách hàng Acerikyl**:
    *   Email: `acerikyl@gmail.com`
    *   Mật khẩu: `dung123xzx`
