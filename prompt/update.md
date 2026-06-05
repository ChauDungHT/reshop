# SKILL: DOCKERIZE_RESHOP_PROJECT
**Mục tiêu:** Cấu hình Docker và Docker Compose để container hóa toàn bộ dự án Reshop (Monorepo gồm Backend và Frontend) cho môi trường phát triển cá nhân (Development), đơn giản hóa tối đa và không cần cấu hình mạng nội bộ tùy chỉnh (`networks`).

**PROJECT SPECIFICATIONS:**
- **Backend:** Node.js, TypeScript, Express, pg (PostgreSQL client) chạy trên cổng nội bộ `8000`.
- **Frontend (Storefront):** React, Vite, TailwindCSS v4 chạy trên cổng nội bộ `5173`.
- **Database:** PostgreSQL chạy trên cổng `5432` (Ánh xạ ra ngoài qua cổng `5433:5432` để dễ quản lý từ máy host).
- **Cấu trúc thư mục:** Monorepo với gốc chứa `/backend`, `/frontend/storefront`, `/frontend/shared-ui` và file `docker-compose.yml` nằm ở gốc.

---

**HƯỚNG DẪN THỰC THI CHO AGENT:**

### Bước 1: Tạo Dockerfile cho Backend (`backend/Dockerfile`)
Tạo một Dockerfile tối ưu cho môi trường Development:
- Sử dụng base image `node:20-alpine`.
- Thiết lập thư mục làm việc `/app`.
- Copy các file cấu hình `package.json`, `package-lock.json` và cài đặt dependencies trước để tối ưu hóa cache lớp (layer cache).
- Cài đặt `typescript` và `ts-node` toàn cục hoặc chạy trực tiếp qua `npx`.
- Hỗ trợ chạy ứng dụng ở chế độ hot-reload (`npm run dev` thông qua nodemon đã cấu hình trong dự án).

### Bước 2: Tạo Dockerfile cho Frontend (`frontend/Dockerfile` hoặc thiết lập trực tiếp trong docker-compose)
Tạo Dockerfile hoặc thiết lập chạy dev server cho Frontend:
- Sử dụng base image `node:20-alpine`.
- Vì frontend `storefront` có tham chiếu đến thư mục `shared-ui` ở cấp cha (`../shared-ui`), giải pháp đơn giản nhất là đặt Dockerfile tại `/frontend/Dockerfile` (cấp cha) hoặc copy toàn bộ thư mục `/frontend` vào container và thiết lập thư mục làm việc (`WORKDIR`) là `/app/storefront`.
- Cấu hình port `5173` và chạy lệnh `npm run dev` với tham số `--host` để Vite có thể truy cập được từ bên ngoài container.

### Bước 3: Cập nhật Docker Compose (`docker-compose.yml`)
Cập nhật file `docker-compose.yml` ở thư mục gốc:
- Định nghĩa 3 dịch vụ: `db` (PostgreSQL), `backend`, và `frontend`.
- Sử dụng mạng mặc định của Docker Compose (không khai báo thẻ `networks` tùy chỉnh phức tạp).
- Ánh xạ trực tiếp các cổng ra máy host:
  - **db:** `5433:5432` (cho phép các công cụ GUI như DBeaver, pgAdmin kết nối trực tiếp từ host).
  - **backend:** `8000:8000`.
  - **frontend:** `5173:5173`.
- Cấu hình các `volumes` để đồng bộ nóng (hot-reload) code từ máy thật (host) vào trong container mà không cần build lại:
  - Backend: Mount thư mục `./backend` vào `/app`.
  - Frontend: Mount thư mục `./frontend` vào `/app` hoặc cấu hình tương ứng để nhận diện code thay đổi ở cả `storefront` và `shared-ui`.
- Đảm bảo service `backend` phụ thuộc (`depends_on`) vào service `db`.

### Bước 4: Hướng dẫn Cấu hình Biến Môi Trường (`.env`)
- Cấu hình kết nối DB cho Backend: Trong file `.env` của backend, chuỗi kết nối host của database sẽ trỏ đến tên service `db` thay vì `localhost` (Ví dụ: `DB_HOST=db` hoặc `DATABASE_URL=postgresql://postgres:password@db:5432/cdshop`).

---

**YÊU CẦU ĐẦU RA:**
- Tạo/cập nhật đầy đủ các file: `backend/Dockerfile`, `frontend/storefront/Dockerfile` (hoặc `frontend/Dockerfile`), và `docker-compose.yml`.
- Các file Dockerfile và docker-compose hoạt động mượt mà, khởi động hệ thống chỉ với một lệnh duy nhất: `docker compose up --build`.
- Code thay đổi trên máy host phải tự động đồng bộ (hot-reload) vào container mà không cần build lại.