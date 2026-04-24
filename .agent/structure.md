cdshop/
├── backend/                # Node.js API
│   ├── src/
│   │   ├── modules/        # Các module nghiệp vụ độc lập
│   │   │   ├── catalog/    # + Quản lý Review, Q&A (từ Module 2 & 3)
│   │   │   ├── vendor/     # Thông tin nhà cung cấp, đăng ký gian hàng
│   │   │   ├── order/      # Đơn hàng + Xử lý trả hàng/tranh chấp (Module 4)
│   │   │   ├── identity/   # User, Auth, Phân quyền
│   │   │   ├── wallet/     # Xử lý số dư ví ảo và lịch sử giao dịch (Module 2)
│   │   │   ├── message/    # Hội thoại và tin nhắn realtime Shop ↔ Khách (Module 7)
│   │   │   ├── notif/      # Hệ thống thông báo in-app / push theo loại (Module 5)
│   │   │   ├── chatbot/    # Xử lý prompt, gọi API local Ollama / OpenAI (Module 6)
│   │   │   └── media/      # Upload file, resize ảnh (tích hợp multer, sharp) (Module 8)
│   │   ├── core/           # Cấu hình DB, Logger + Khởi tạo Socket.IO & Redis
│   │   ├── shared/         # Middlewares (Auth, FileUpload), Helper
│   │   └── server.ts       
│   ├── uploads/            # Thư mục trỏ public chứa file tĩnh (avatars, shops, products...) (Module 8)
│   ├── .env                
│   └── package.json
├── frontend/               # Ứng dụng React
│   ├── storefront/         # Customer Portal
│   ├── vendor-portal/      # Vendor Portal
│   ├── admin-dashboard/    # Admin Dashboard
│   └── shared-ui/          # Components mới: ChatBubble, Socket Context, Notifications
├── database/               # Scripts cho PostgreSQL
│   ├── migrations/         
│   ├── seeds/              
│   └── schema.sql          
├── docker-compose.yml      # Cấu hình Postgres + Ollama (Tuỳ chọn AI Local)
└── package.json            

reshop
├── README.md
├── backend
│   ├── database
│   │   ├── migrate.js
│   │   ├── schema.sql
│   │   └── seeds
│   │       └── seed-admin.js
│   ├── eslint.config.mjs
│   ├── jest.config.js
│   ├── package-lock.json
│   ├── package.json
│   ├── src
│   │   ├── core
│   │   │   ├── db.ts
│   │   │   └── test-connection.js
│   │   ├── modules
│   │   │   └── identity
│   │   │       ├── __tests__
│   │   │       │   ├── auth.api.test.ts
│   │   │       │   └── user.api.test.ts
│   │   │       ├── auth.controller.ts
│   │   │       ├── auth.route.ts
│   │   │       ├── user.controller.ts
│   │   │       └── user.route.ts
│   │   ├── server.ts
│   │   └── shared
│   │       ├── middlewares
│   │       │   ├── __tests__
│   │       │   │   └── middlewares.test.ts
│   │       │   ├── auth.middleware.ts
│   │       │   ├── owner.guard.ts
│   │       │   └── role.guard.ts
│   │       └── response.ts
│   └── tsconfig.json
├── docker-compose.yml
├── frontend
│   ├── shared-ui
│   │   ├── package.json
│   │   ├── src
│   │   │   ├── components
│   │   │   │   ├── PrivateRoute.tsx
│   │   │   │   └── RoleRoute.tsx
│   │   │   ├── context
│   │   │   │   └── AuthContext.tsx
│   │   │   ├── layouts
│   │   │   │   └── DashboardLayout.tsx
│   │   │   ├── lib
│   │   │   │   └── axios.ts
│   │   │   └── styles
│   │   └── tsconfig.json
│   └── storefront
│       ├── README.md
│       ├── eslint.config.js
│       ├── index.html
│       ├── package-lock.json
│       ├── package.json
│       ├── public
│       │   ├── favicon.svg
│       │   └── icons.svg
│       ├── src
│       │   ├── App.css
│       │   ├── App.tsx
│       │   ├── assets
│       │   │   ├── hero.png
│       │   │   ├── react.svg
│       │   │   └── vite.svg
│       │   ├── context
│       │   ├── index.css
│       │   ├── main.tsx
│       │   ├── pages
│       │   │   ├── account
│       │   │   ├── auth
│       │   │   │   └── LoginPage.tsx
│       │   │   ├── dashboard
│       │   │   │   ├── AdminDashboard.tsx
│       │   │   │   ├── CustomerDashboard.tsx
│       │   │   │   └── VendorDashboard.tsx
│       │   │   ├── error
│       │   │   │   └── ForbiddenPage.tsx
│       │   │   └── shop
│       │   └── test
│       │       ├── AuthContext.test.tsx
│       │       ├── Routing.test.tsx
│       │       └── setup.ts
│       ├── tsconfig.app.json
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       └── vite.config.ts
├── package-lock.json
├── package.json
├── parent-module
│   ├── index.js
│   ├── license
│   ├── package.json
│   └── readme.md
└── prompt
    ├── backend
    │   ├── 01_database_and_seed.md
    │   ├── 02_auth_apis.md
    │   ├── 03_middlewares.md
    │   └── 04_user_apis.md
    ├── frontend
    │   ├── 01_context_and_axios.md
    │   ├── 02_routes_and_dashboard.md
    │   ├── 03_auth_forms.md
    │   ├── 04_profile_page.md
    │   └── temp.md
    ├── template.md
    └── test
        ├── 01_api_postman.md
        └── 02_ui_manual.md