```text
reshop/
├── backend
│   ├── .env
│   ├── .env.example
│   ├── database
│   │   ├── drop.js
│   │   ├── migrate.js
│   │   ├── schema.sql
│   │   └── seeds
│   │       ├── seed-admin.js
│   │       ├── seed-data.js
│   │       └── sync-data.js
│   ├── eslint.config.mjs
│   ├── jest.config.js
│   ├── nodemon.json
│   ├── package.json
│   ├── scratch
│   ├── src
│   │   ├── core
│   │   │   ├── db.ts
│   │   │   └── test-connection.js
│   │   ├── modules
│   │   │   ├── after-sales
│   │   │   │   ├── after-sales.controller.ts
│   │   │   │   └── after-sales.route.ts
│   │   │   ├── cart
│   │   │   │   ├── cart.controller.ts
│   │   │   │   └── cart.route.ts
│   │   │   ├── catalog
│   │   │   │   ├── category.controller.ts
│   │   │   │   ├── category.route.ts
│   │   │   │   ├── product.controller.ts
│   │   │   │   └── product.route.ts
│   │   │   ├── checkout
│   │   │   │   ├── checkout.controller.ts
│   │   │   │   └── checkout.route.ts
│   │   │   ├── identity
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.route.ts
│   │   │   │   ├── user.controller.ts
│   │   │   │   ├── user.route.ts
│   │   │   │   └── __tests__
│   │   │   │       ├── auth.api.test.ts
│   │   │   │       └── user.api.test.ts
│   │   │   ├── vendor
│   │   │   │   ├── vendor.controller.ts
│   │   │   │   └── vendor.route.ts
│   │   │   └── wallet
│   │   │       ├── wallet.controller.ts
│   │   │       └── wallet.route.ts
│   │   ├── server.ts
│   │   └── shared
│   │       ├── middlewares
│   │       │   ├── auth.middleware.ts
│   │       │   ├── owner.guard.ts
│   │       │   ├── role.guard.ts
│   │       │   ├── upload.middleware.ts
│   │       │   └── __tests__
│   │       │       └── middlewares.test.ts
│   │       ├── response.ts
│   │       └── templates
│   │           └── invoice.html
│   └── tsconfig.json
├── docker-compose.yml
├── frontend
│   ├── shared-ui
│   │   ├── package.json
│   │   ├── src
│   │   │   ├── components
│   │   │   │   ├── DataTable.tsx
│   │   │   │   ├── ImageUploader.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── OrderBadge.tsx
│   │   │   │   ├── OrderStepper.tsx
│   │   │   │   ├── PrivateRoute.tsx
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   ├── QuantitySelector.tsx
│   │   │   │   ├── RichTextEditor.tsx
│   │   │   │   ├── RoleRoute.tsx
│   │   │   │   └── StatCard.tsx
│   │   │   ├── context
│   │   │   │   ├── AuthContext.tsx
│   │   │   │   └── CartContext.tsx
│   │   │   ├── hooks
│   │   │   │   └── useDebounce.ts
│   │   │   ├── layouts
│   │   │   │   ├── DashboardLayout.tsx
│   │   │   │   └── StorefrontLayout.tsx
│   │   │   ├── lib
│   │   │   │   └── axios.ts
│   │   │   └── styles
│   │   └── tsconfig.json
│   └── storefront
│       ├── eslint.config.js
│       ├── index.html
│       ├── package.json
│       ├── public
│       │   ├── favicon.svg
│       │   └── icons.svg
│       ├── README.md
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
│       │   │   │   └── AccountPage.tsx
│       │   │   ├── auth
│       │   │   │   ├── LoginPage.tsx
│       │   │   │   └── RegisterPage.tsx
│       │   │   ├── dashboard
│       │   │   │   ├── AdminDashboard.tsx
│       │   │   │   ├── CustomerDashboard.tsx
│       │   │   │   └── VendorDashboard.tsx
│       │   │   ├── error
│       │   │   │   └── ForbiddenPage.tsx
│       │   │   ├── shop
│       │   │   │   ├── CartPage.tsx
│       │   │   │   ├── CheckoutPage.tsx
│       │   │   │   ├── ProductDetailPage.tsx
│       │   │   │   ├── ShopPage.test.tsx
│       │   │   │   └── ShopPage.tsx
│       │   │   └── vendor
│       │   │       ├── VendorDashboard.tsx
│       │   │       ├── VendorOrderCancelModal.tsx
│       │   │       ├── VendorOrderDetail.tsx
│       │   │       ├── VendorOrderList.tsx
│       │   │       ├── VendorOrderUpdateModal.tsx
│       │   │       ├── VendorProductForm.tsx
│       │   │       ├── VendorProductList.tsx
│       │   │       ├── VendorQAPage.tsx
│       │   │       ├── VendorReturnList.tsx
│       │   │       ├── VendorReturnRejectModal.tsx
│       │   │       └── VendorShopProfile.tsx
│       │   └── test
│       │       ├── AuthContext.test.tsx
│       │       ├── Routing.test.tsx
│       │       └── setup.ts
│       ├── tsconfig.app.json
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       └── vite.config.ts
├── package.json
├── parent-module
│   ├── index.js
│   ├── license
│   ├── package.json
│   └── readme.md
└── scratch
```
