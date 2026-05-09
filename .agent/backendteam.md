# [BACKEND TEAM] - MODULE 4: SUPER ADMIN (QUẢN TRỊ SÀN)

## 1. DATABASE SCHEMA (PostgreSQL)

### 1.1 Bảng users (Mở rộng)
| Trường | Kiểu dữ liệu | Ràng buộc | Ghi chú |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | |
| name | VARCHAR(100) | NOT NULL | |
| email | VARCHAR(100) | UNIQUE, NOT NULL | |
| password_hash | TEXT | NOT NULL | |
| role | VARCHAR(20) | CHECK (role IN ('customer', 'vendor', 'admin')) | |
| status | VARCHAR(20) | DEFAULT 'active' | active, pending, banned, rejected |
| wallet_balance | DECIMAL(15,2) | DEFAULT 0, CHECK (wallet_balance >= 0) | |
| last_login_at | TIMESTAMP | NULLABLE | |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

### 1.2 Bảng shops
| Trường | Kiểu dữ liệu | Ràng buộc | Ghi chú |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY | |
| user_id | UUID | FK users(id), UNIQUE | Chủ sở hữu |
| name | VARCHAR(100) | UNIQUE, NOT NULL | |
| slug | VARCHAR(100) | UNIQUE, NOT NULL | |
| status | VARCHAR(20) | DEFAULT 'inactive' | active, inactive, banned |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

### 1.3 Bảng categories (Cấu trúc Tree)
| Trường | Kiểu dữ liệu | Ràng buộc | Ghi chú |
| :--- | :--- | :--- | :--- |
| id | SERIAL | PRIMARY KEY | |
| parent_id | INTEGER | FK categories(id), NULLABLE | NULL = Gốc |
| name | VARCHAR(100) | UNIQUE, NOT NULL | |
| slug | VARCHAR(100) | UNIQUE, NOT NULL | |
| sort_order | INTEGER | DEFAULT 0 | |
| is_visible | BOOLEAN | DEFAULT true | |

### 1.4 Bảng return_requests (Disputes)
| Trường | Kiểu dữ liệu | Ràng buộc | Ghi chú |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY | |
| order_id | UUID | FK orders(id) | |
| status | VARCHAR(30) | | pending_vendor, rejected, escalated, resolved_admin |
| admin_notes | TEXT | NULLABLE | Phán quyết của Admin |
| resolved_at | TIMESTAMP | NULLABLE | |

---

## 2. API ENDPOINTS

### 2.1 Quản lý Người dùng & Shop
| Method | URL | Payload | Response mẫu (200 OK) |
| :--- | :--- | :--- | :--- |
| GET | `/api/admin/users` | query: page, limit, role, status, q | `{ "items": [user1, user2], "total": 100 }` |
| POST | `/api/admin/users/:id/ban` | `{ "reason": "Vi phạm điều khoản" }` | `{ "message": "User banned successfully" }` |
| GET | `/api/admin/shops` | query: status, q | `{ "items": [shop1, shop2], "total": 10 }` |
| PATCH | `/api/admin/shops/:id/status` | `{ "status": "active" }` | `{ "message": "Shop status updated" }` |

### 2.2 Quản lý Danh mục
| Method | URL | Payload | Response mẫu (200 OK) |
| :--- | :--- | :--- | :--- |
| GET | `/api/admin/categories/tree` | - | `{ "categories": [ { id, name, children: [...] } ] }` |
| POST | `/api/admin/categories` | `{ name, parent_id, sort_order }` | `{ "id": 10, "name": "New Cat" }` |
| DELETE | `/api/admin/categories/:id` | - | `{ "message": "Deleted" }` (Lỗi 409 nếu có SP) |

### 2.3 Thống kê & Export
| Method | URL | Payload | Ghi chú |
| :--- | :--- | :--- | :--- |
| GET | `/api/admin/dashboard/stats` | - | Trả về KPI: Doanh thu, Đơn mới, Users, Products |
| GET | `/api/admin/dashboard/charts` | query: range (7d, 30d, 1y) | Trả về dữ liệu vẽ biểu đồ Line/Pie |
| GET | `/api/admin/reports/users/export` | query: role, status | Trả về stream file CSV |

---

## 3. LOGIC CỐT LÕI

1.  **RBAC Middleware**: Kiểm tra `req.user.role === 'admin'`. Trả 403 nếu sai.
2.  **Tree Query**: Sử dụng Recursive CTE trong SQL để lấy toàn bộ cây danh mục hoặc xử lý đệ quy ở Node.js để build nested JSON.
3.  **Ràng buộc xóa**: `SELECT COUNT(*) FROM products WHERE category_id = :id`. Nếu > 0 -> Trả lỗi 409 "Cannot delete category with products".
4.  **Transaction Tranh chấp**:
    *   `BEGIN`
    *   Update `return_requests` status + `admin_notes`.
    *   Nếu Customer thắng: 
        *   Update `users.wallet_balance` (+ refund_amount).
        *   Insert `wallet_transactions` (type='refund').
        *   Update `products.stock` (+ quantity).
    *   `COMMIT`
