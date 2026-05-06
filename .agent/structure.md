```text
reshop/
├── .agent
│   ├── AI_Engineering.md
│   ├── Q&A.md
│   ├── api_skill.md
│   ├── backendteam.md
│   ├── content.md
│   ├── db.md
│   ├── frontendteam.md
│   ├── function.md
│   ├── log.md
│   ├── rule.md
│   ├── structure.md
│   ├── test.md
│   └── testteam.md
├── .gitignore
├── README.md
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
│   │   │   │   ├── __tests__
│   │   │   │   │   ├── auth.api.test.ts
│   │   │   │   │   └── user.api.test.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.route.ts
│   │   │   │   ├── user.controller.ts
│   │   │   │   └── user.route.ts
│   │   │   └── wallet
│   │   │       ├── wallet.controller.ts
│   │   │       └── wallet.route.ts
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
│   │   │   │   ├── OrderBadge.tsx
│   │   │   │   ├── OrderStepper.tsx
│   │   │   │   ├── PrivateRoute.tsx
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   ├── QuantitySelector.tsx
│   │   │   │   ├── RoleRoute.tsx
│   │   │   │   └── index.ts
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
│       ├── .gitignore
│       ├── README.md
│       ├── eslint.config.js
│       ├── index.html
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
│       │   │   └── shop
│       │   │       ├── CartPage.tsx
│       │   │       ├── CheckoutPage.tsx
│       │   │       ├── ProductDetailPage.tsx
│       │   │       ├── ShopPage.test.tsx
│       │   │       └── ShopPage.tsx
│       │   └── test
│       │       ├── AuthContext.test.tsx
│       │       ├── Routing.test.tsx
│       │       └── setup.ts
│       ├── tsconfig.app.json
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       └── vite.config.ts
├── implementation_plan.md
├── package.json
├── parent-module
│   ├── index.js
│   ├── license
│   ├── package.json
│   └── readme.md
├── prompt
│   ├── backend
│   ├── frontend
│   ├── insert.md
│   ├── review.md
│   ├── task.md
│   ├── template.md
│   └── test
│       └── information.md
└── uploads
    └── products
        ├── ac102ex-grip.png
        ├── arcsaber-11-pro.png
        ├── astrox-88d.png
        ├── axforce-80.png
        ├── bg66-ultimax.png
        ├── brave-sword-12.png
        ├── halbertec-8000.png
        ├── nanoflare-1000z.png
        ├── ryuga-ii.png
        └── yonex-65z3.png
```
