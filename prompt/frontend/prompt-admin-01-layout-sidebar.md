# Prompt: Implement Admin Layout, Sidebar, and Route Guards

## Context
We need to build the foundational layout for the Super Admin panel. This includes a persistent sidebar for navigation and a security layer to ensure only users with the 'admin' role can access these routes.

## Reference
- Database Schema: `backend/database/schema.sql` (Table: `users.role`)
- Technology: React, Tailwind CSS, React Router.

## Requirements

### 1. AdminLayout Component
- Create a layout with a fixed/collapsible **Sidebar** on the left and a top **Header**.
- The main content area should be scrollable and responsive.
- Sidebar menu items:
  - Dashboard
  - Quản lý Người dùng
  - Quản lý Danh mục
  - Quản lý Gian hàng
  - Tranh chấp & Khiếu nại
  - Cài đặt hệ thống

### 2. AdminRouteGuard
- Create a wrapper component (HOC or standard wrapper) that checks the current user's role from the AuthContext.
- If `role !== 'admin'`, redirect the user to `/403` (Access Denied) or `/login`.

### 3. Styling (Tailwind)
- Use a premium dark-themed or professional slate-themed design.
- Sidebar should highlight the active route.

## Expected Output
- `AdminLayout.tsx`
- `AdminSidebar.tsx`
- `AdminRoute.tsx` (The Guard)
- Proper integration in `App.tsx`.

## Verification
- Log in as a 'customer' and attempt to navigate to `/admin/dashboard` -> Should be blocked.
- Log in as an 'admin' -> Should see the sidebar and dashboard.
