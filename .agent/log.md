## QUY TẮC GHI LOG CHUẨN MỰC (LOGGING CONVENTION)
Để dễ dàng theo dõi hệ thống và debug, mọi log bắn ra console phải tuân thủ chuẩn sau:

### Cấu trúc tổng quát (Pattern)
Mỗi dòng log nên bao gồm các thành phần:
`[Module/Context]: Action/Event - Status Code - [Thông tin bổ sung]`

### Phân loại cấu trúc log theo mục đích

**A. Log Hệ thống (System/Infrastructure)**
Dùng khi khởi tạo server, kết nối Database, cấu trúc port hoặc các dịch vụ bên thứ ba.
*   **Cấu trúc:** `[server/database/redis]: <Event> at <Location/Port>`
*   Ví dụ: `[server]: Server is running at http://localhost:8000`
*   Ví dụ: `[database]: Connected to PostgreSQL at 127.0.0.1:5432`

**B. Log Nghiệp vụ (Business/API Logic)**
Dùng trong các Controller hoặc Service để theo dõi luồng đi của request. Cần bao phủ các Status Code cơ bản (200, 201, 400, 401, 403, 404, 409).
*   **Cấu trúc:** `[<Module_Name>]: <Action> <Result> - <Status_Code> - [Detail]`
*   Ví dụ Thành công (200/201):
    *   `[auth]: Login Successful - 200 - User: dung@example.com`
    *   `[auth]: Register Customer Successful - 201 - User ID: uuid-1234`
*   Ví dụ Thất bại phía Client (400/401/403/404/409):
    *   `[order]: Create Order Failed - 400 - Insufficient Stock`
    *   `[auth]: Access Denied - 401 - Invalid JWT Token`
    *   `[admin]: Approve Vendor Failed - 403 - Permission Denied (Not Admin)`
    *   `[catalog]: Fetch Product Failed - 404 - Product not found`
    *   `[auth]: Register Vendor Failed - 409 - Email already taken`

**C. Log Lỗi Hệ thống Nghiêm trọng (Error/Exception)**
Dùng trong các khối `catch` để ghi lại các lỗi runtime, sập kết nối hoặc lỗi bất định.
*   **Cấu trúc:** `[Error - <Module_Name>]: <Method> <Path> - <Error_Code> - <Message>`
*   Ví dụ (500/503):
    *   `[Error - auth]: POST /api/auth/register - 500 - Error: connect ECONNREFUSED`
    *   `[Error - upload]: POST /api/media/avatar - 503 - Multer Timeout`