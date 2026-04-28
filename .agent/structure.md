```text
reshop/
│   .gitignore
│   docker-compose.yml
│   package-lock.json
│   package.json
│   README.md
│   
├── .agent
│       backendteam.md
│       content.md
│       db.md
│       frontendteam.md
│       function.md
│       log.md
│       rule.md
│       structure.md
│       test.md
│       testteam.md
│       
├── backend
│   │   .env
│   │   .env.example
│   │   eslint.config.mjs
│   │   jest.config.js
│   │   package-lock.json
│   │   package.json
│   │   tsconfig.json
│   │   
│   ├── database
│   │   │   migrate.js
│   │   │   schema.sql
│   │   │   
│   │   └── seeds
│   │           seed-admin.js
│   │           
│   └── src
│       │   server.ts
│       │   
│       ├── core
│       │       db.ts
│       │       test-connection.js
│       │       
│       ├── modules
│       │   └── identity
│       │       │   auth.controller.ts
│       │       │   auth.route.ts
│       │       │   user.controller.ts
│       │       │   user.route.ts
│       │       │   
│       │       └── __tests__
│       │               auth.api.test.ts
│       │               user.api.test.ts
│       │               
│       └── shared
│           │   response.ts
│           │   
│           └── middlewares
│               │   auth.middleware.ts
│               │   owner.guard.ts
│               │   role.guard.ts
│               │   
│               └── __tests__
│                       middlewares.test.ts
│                       
├── frontend
│   ├── shared-ui
│   │   │   package.json
│   │   │   tsconfig.json
│   │   │   
│   │   └── src
│   │       ├── components
│   │       │       PrivateRoute.tsx
│   │       │       RoleRoute.tsx
│   │       │       
│   │       ├── context
│   │       │       AuthContext.tsx
│   │       │       
│   │       ├── layouts
│   │       │       DashboardLayout.tsx
│   │       │       
│   │       ├── lib
│   │       │       axios.ts
│   │       │       
│   │       └── styles
│   └── storefront
│       │   .gitignore
│       │   eslint.config.js
│       │   index.html
│       │   package-lock.json
│       │   package.json
│       │   README.md
│       │   tsconfig.app.json
│       │   tsconfig.json
│       │   tsconfig.node.json
│       │   vite.config.ts
│       │   
│       ├── public
│       │       favicon.svg
│       │       icons.svg
│       │       
│       └── src
│           │   App.css
│           │   App.tsx
│           │   index.css
│           │   main.tsx
│           │   
│           ├── assets
│           │       hero.png
│           │       react.svg
│           │       vite.svg
│           │       
│           ├── context
│           ├── pages
│           │   ├── account
│           │   │       AccountPage.tsx
│           │   │       
│           │   ├── auth
│           │   │       LoginPage.tsx
│           │   │       
│           │   ├── dashboard
│           │   │       AdminDashboard.tsx
│           │   │       CustomerDashboard.tsx
│           │   │       VendorDashboard.tsx
│           │   │       
│           │   ├── error
│           │   │       ForbiddenPage.tsx
│           │   │       
│           │   └── shop
│           │           ShopPage.tsx
│           │           
│           └── test
│                   AuthContext.test.tsx
│                   Routing.test.tsx
│                   setup.ts
│
```
