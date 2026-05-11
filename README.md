# CD Reshop - Multi Vendor E-commerce Platform

Dự án Hệ thống Sàn thương mại điện tử Đa nhà cung cấp (Multi-Vendor E-commerce Platform). Hệ thống được chia theo kiến trúc Modular Monolith dành cho Backend và 3 portal độc lập dành cho Frontend (Customer, Vendor, Admin).

## Yêu cầu Hệ thống (Prerequisites)

Để chạy được dự án ở môi trường Local, máy tính của bạn cần được cài đặt sẵn:

- **Node.js**: v18.x hoặc cao hơn.
- **Docker & Docker Compose**: Để chạy PostgreSQL cục bộ mà không cần phải config thủ công.
- **Git**: Quản lý phiên bản.

---

## 🚀 Hướng Dẫn Cài Đặt và Khởi Chạy Nhanh (Local Setup)

Vui lòng làm tuần tự theo các bước dưới đây để thiết lập được hệ thống.

### Bước 1: Khởi động Database (PostgreSQL)

Dự án đã đính kèm sẵn cấu hình `docker-compose.yml`. Bạn chỉ cần khởi chạy container DB ở thư mục gốc của dự án:

```bash
docker-compose up -d
```

_Lưu ý: PostgreSQL sẽ chạy trên cổng `5433` để tránh xung độ với các PostgreSQL service nội bộ có thể đã được cài đặt._

### Bước 2: Thiết lập Biến Môi Trường (Environment Variables)

Chuyển hướng vào thư mục backend và copy file mẫu `.env.example` thành `.env`:

```bash
cd backend
cp .env.example .env
```

Mở file `.env` vừa tạo và điền các giá trị tương ứng với cấu hình Docker của bạn:

```env
DATABASE_URL=postgres://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:5433/<POSTGRES_DB>
JWT_SECRET=<chuỗi-bí-mật-đủ-dài-và-ngẫu-nhiên>
```

> **Lưu ý**: Thay `<POSTGRES_USER>`, `<POSTGRES_PASSWORD>`, `<POSTGRES_DB>` bằng đúng giá trị bạn đã khai báo trong file `.env` ở thư mục gốc (dùng cho Docker).

### Bước 3: Cài đặt Dependencies Backend

Chắc chắn bạn đang ở thư mục `backend/` và gõ lệnh cài gói NPM:

```bash
npm install
```

### Bước 4: Khởi tạo Dữ Liệu (Migrate & Seed)

Hệ thống sử dụng file schema tĩnh. Để khởi tạo tất cả các bảng DB cùng với tài khoản Root Admin đầu tiên, hãy chạy:

```bash
# 1. Chạy cập nhật bảng (Migration)
npm run db:migrate

# 2. Sinh tài khoản Admin đầu tiên (Seed)
npm run seed:admin -- --email=admin@cdshop.com --password=123456
```

### Bước 5: Khởi Chạy Server Đang Phát Triển (Dev)

```bash
npm run dev
```

🎉 **Hoàn thành!** Server Backend hiện đang chạy tại: `http://localhost:8000`.

---

## 🛠 Các Lệnh Hữu Ích Của Developer (Scripts)

Nằm trong `backend/package.json`:

- `npm run dev`: Chạy server dev sử dụng `ts-node` tự động reload.
- `npm run build`: Biên dịch mã TypeScript thuần sang Javascript Native.
- `npm run lint`: Chạy ESLint để rà soát lỗi format TypeScript.
- `npm run test:tsc`: Phân tích tĩnh bắt lỗi logic Type-Checking của toàn hệ thống (không Build).

---

## 🔑 Tài Khoản Demo (Seed Data)

Sau khi chạy `npm run db:migrate` và `npm run seed:admin`, hệ thống sẽ có tài khoản Admin đầu tiên với email và mật khẩu bạn truyền vào lệnh seed.

Thông tin đăng nhập của các tài khoản demo **không được lưu trong repo** để tránh rủi ro bảo mật. Vui lòng liên hệ trực tiếp với người quản lý dự án để lấy credentials khi cần.
