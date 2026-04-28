# RESHOP FRONTEND — NỘI DUNG CÁC FILE CẦN TẠO

---

## BƯỚC 1: PHÂN TÍCH SHARED vs. PAGE-SPECIFIC

### 1.1. Phần DÙNG CHUNG (shared-ui + layout cố định)

| Thành phần | Vị trí | Mô tả |
|---|---|---|
| `AuthContext` | `shared-ui/src/context/` | Lưu user, token, role — tất cả các trang đều dùng |
| `PrivateRoute` | `shared-ui/src/components/` | Bảo vệ route, redirect nếu chưa login |
| `RoleRoute` | `shared-ui/src/components/` | Chặn theo role: customer / vendor / superadmin |
| `DashboardLayout` | `shared-ui/src/layouts/` | Sidebar + Header dùng chung cho cả 3 dashboard |
| `axiosInstance` | `shared-ui/src/lib/` | Cấu hình base URL, interceptor token |
| `index.css` (globals) | `storefront/src/` | Tailwind directives + CSS variables |

### 1.2. Phần THAY ĐỔI THEO TỪNG TRANG

| Trang | Vị trí | Nội dung riêng |
|---|---|---|
| **LoginPage** | `storefront/src/pages/auth/` | Form React Hook Form + Zod, gọi POST /auth/login |
| **CustomerDashboard** | `storefront/src/pages/dashboard/` | Đơn hàng, voucher, điểm tích lũy |
| **VendorDashboard** | `storefront/src/pages/dashboard/` | Biểu đồ doanh thu, đơn chờ xử lý, kho thấp |
| **AdminDashboard** | `storefront/src/pages/dashboard/` | GMV tổng, users mới, heatmap, quản lý toàn sàn |
| **AccountPage** | `storefront/src/pages/account/` | Cài đặt tài khoản, địa chỉ giao hàng |
| **ShopPage** | `storefront/src/pages/shop/` | Danh mục sản phẩm, tìm kiếm, filter |
| **ForbiddenPage** | `storefront/src/pages/error/` | 403 khi truy cập sai role |
| `App.tsx` | `storefront/src/` | Routing toàn bộ ứng dụng |

---

## BƯỚC 2: DANH SÁCH FILE CẦN TẠO

### 2.1. shared-ui

```
frontend/shared-ui/src/
├── context/
│   └── AuthContext.tsx          ← [TẠO MỚI]
├── components/
│   ├── PrivateRoute.tsx          ← [TẠO MỚI]
│   └── RoleRoute.tsx             ← [TẠO MỚI]
├── layouts/
│   └── DashboardLayout.tsx       ← [TẠO MỚI]
├── lib/
│   └── axios.ts                  ← [TẠO MỚI]
└── styles/
    └── globals.css               ← [TẠO MỚI]
```

### 2.2. storefront

```
frontend/storefront/src/
├── pages/
│   ├── auth/
│   │   └── LoginPage.tsx         ← [TẠO MỚI]
│   ├── dashboard/
│   │   ├── CustomerDashboard.tsx ← [TẠO MỚI]
│   │   ├── VendorDashboard.tsx   ← [TẠO MỚI]
│   │   └── AdminDashboard.tsx    ← [TẠO MỚI]
│   ├── account/
│   │   └── AccountPage.tsx       ← [TẠO MỚI]
│   ├── shop/
│   │   └── ShopPage.tsx          ← [TẠO MỚI]
│   └── error/
│       └── ForbiddenPage.tsx     ← [TẠO MỚI]
├── App.tsx                        ← [TẠO MỚI]
├── main.tsx                       ← [TẠO MỚI]
└── index.css                      ← [TẠO MỚI]
```

---

## BƯỚC 3: NỘI DUNG CÁC FILE

---

### FILE: `frontend/shared-ui/src/context/AuthContext.tsx`

```tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'customer' | 'vendor' | 'superadmin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('reshop_token');
    const storedUser = localStorage.getItem('reshop_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem('reshop_token', newToken);
    localStorage.setItem('reshop_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('reshop_token');
    localStorage.removeItem('reshop_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
```

---

### FILE: `frontend/shared-ui/src/components/PrivateRoute.tsx`

```tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
```

---

### FILE: `frontend/shared-ui/src/components/RoleRoute.tsx`

```tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';

interface RoleRouteProps {
  allowedRoles: UserRole[];
}

const RoleRoute = ({ allowedRoles }: RoleRouteProps) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/forbidden" replace />;

  return <Outlet />;
};

export default RoleRoute;
```

---

### FILE: `frontend/shared-ui/src/layouts/DashboardLayout.tsx`

```tsx
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../context/AuthContext';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const navByRole: Record<UserRole, NavItem[]> = {
  customer: [
    { label: 'Tổng quan', path: '/dashboard', icon: '⊞' },
    { label: 'Đơn hàng', path: '/orders', icon: '📦' },
    { label: 'Cửa hàng', path: '/shop', icon: '🛍' },
    { label: 'Tài khoản', path: '/account', icon: '👤' },
  ],
  vendor: [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Sản phẩm', path: '/products', icon: '🗂' },
    { label: 'Đơn hàng', path: '/orders', icon: '📋' },
    { label: 'Tài chính', path: '/finance', icon: '💰' },
  ],
  superadmin: [
    { label: 'Tổng quan', path: '/dashboard', icon: '🌐' },
    { label: 'Người dùng', path: '/users', icon: '👥' },
    { label: 'Vendors', path: '/vendors', icon: '🏪' },
    { label: 'Cấu hình', path: '/settings', icon: '⚙️' },
    { label: 'Báo cáo', path: '/reports', icon: '📑' },
  ],
};

const roleLabel: Record<UserRole, string> = {
  customer: 'Khách Hàng',
  vendor: 'Nhà Bán Hàng',
  superadmin: 'Quản Trị Viên',
};

const roleBadgeColor: Record<UserRole, string> = {
  customer: 'bg-emerald-500/15 text-emerald-400',
  vendor: 'bg-amber-500/15 text-amber-400',
  superadmin: 'bg-rose-500/15 text-rose-400',
};

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const navItems = navByRole[user.role];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-slate-800 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-60'
        } bg-slate-900/80 backdrop-blur-sm`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-800">
          {!collapsed && (
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              RESHOP
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400"
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User Section */}
        <div className="border-t border-slate-800 p-3">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">{user.name}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${roleBadgeColor[user.role]}`}>
                  {roleLabel[user.role]}
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="mt-3 w-full text-xs text-slate-500 hover:text-rose-400 transition-colors text-left px-1"
            >
              Đăng xuất
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="h-16 border-b border-slate-800 flex items-center px-6 gap-4 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
          <h1 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
            {roleLabel[user.role]}
          </h1>
          <div className="ml-auto flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
              🔔
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
```

---

### FILE: `frontend/shared-ui/src/lib/axios.ts`

```ts
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: gắn token vào header
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('reshop_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: xử lý 401
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('reshop_token');
      localStorage.removeItem('reshop_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
```

---

### FILE: `frontend/storefront/src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-brand: #6366f1;
  --color-brand-light: #818cf8;
  --color-surface: #0f172a;
  --color-surface-2: #1e293b;
  --color-border: #1e293b;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
}

* {
  box-sizing: border-box;
}

body {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  font-family: 'DM Sans', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover { background: #475569; }
```

---

### FILE: `frontend/storefront/src/main.tsx`

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../shared-ui/src/context/AuthContext';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 phút
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

---

### FILE: `frontend/storefront/src/App.tsx`

```tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Shared
import PrivateRoute from '../../shared-ui/src/components/PrivateRoute';
import RoleRoute from '../../shared-ui/src/components/RoleRoute';
import DashboardLayout from '../../shared-ui/src/layouts/DashboardLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import CustomerDashboard from './pages/dashboard/CustomerDashboard';
import VendorDashboard from './pages/dashboard/VendorDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import AccountPage from './pages/account/AccountPage';
import ShopPage from './pages/shop/ShopPage';
import ForbiddenPage from './pages/error/ForbiddenPage';

const App = () => {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      {/* Protected — tất cả user đã login */}
      <Route element={<PrivateRoute />}>
        <Route element={<DashboardLayout />}>

          {/* Customer */}
          <Route element={<RoleRoute allowedRoles={['customer']} />}>
            <Route path="/dashboard" element={<CustomerDashboard />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>

          {/* Vendor */}
          <Route element={<RoleRoute allowedRoles={['vendor']} />}>
            <Route path="/dashboard" element={<VendorDashboard />} />
          </Route>

          {/* Superadmin */}
          <Route element={<RoleRoute allowedRoles={['superadmin']} />}>
            <Route path="/dashboard" element={<AdminDashboard />} />
          </Route>

        </Route>
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
```

---

### FILE: `frontend/storefront/src/pages/auth/LoginPage.tsx`

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../../../shared-ui/src/context/AuthContext';
import axiosInstance from '../../../../shared-ui/src/lib/axios';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

type LoginForm = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      const res = await axiosInstance.post('/auth/login', data);
      login(res.data.token, res.data.user);

      const role = res.data.user.role;
      navigate('/dashboard');
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            RESHOP
          </h1>
          <p className="text-slate-500 text-sm mt-2">Đăng nhập vào tài khoản của bạn</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-slate-950">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-rose-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Mật khẩu
              </label>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-rose-400">{errors.password.message}</p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm">
                {serverError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-150 text-sm tracking-wide"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang đăng nhập...
                </span>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
```

---

### FILE: `frontend/storefront/src/pages/dashboard/CustomerDashboard.tsx`

```tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../../shared-ui/src/context/AuthContext';
import axiosInstance from '../../../../shared-ui/src/lib/axios';

interface OrderSummary { total: number; pending: number; delivering: number; completed: number; }
interface CustomerStats { orders: OrderSummary; voucherCount: number; points: number; }

const StatCard = ({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) => (
  <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors`}>
    <div className="flex items-center justify-between mb-4">
      <span className="text-2xl">{icon}</span>
      <span className={`text-xs font-bold px-2 py-1 rounded-full ${color}`}>Tháng này</span>
    </div>
    <p className="text-2xl font-black text-slate-100">{value}</p>
    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{label}</p>
  </div>
);

const OrderStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    pending: 'bg-amber-500/15 text-amber-400',
    delivering: 'bg-blue-500/15 text-blue-400',
    completed: 'bg-emerald-500/15 text-emerald-400',
    cancelled: 'bg-red-500/15 text-red-400',
  };
  const label: Record<string, string> = {
    pending: 'Chờ duyệt',
    delivering: 'Đang giao',
    completed: 'Đã nhận',
    cancelled: 'Đã hủy',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[status] || 'bg-slate-700 text-slate-300'}`}>
      {label[status] || status}
    </span>
  );
};

const CustomerDashboard = () => {
  const { user } = useAuth();

  // TanStack Query: fetch customer stats
  const { data: stats, isLoading: statsLoading } = useQuery<CustomerStats>({
    queryKey: ['customer-stats'],
    queryFn: async () => {
      const res = await axiosInstance.get('/customers/stats');
      return res.data;
    },
  });

  // TanStack Query: fetch recent orders
  const { data: recentOrders, isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ['customer-orders', 'recent'],
    queryFn: async () => {
      const res = await axiosInstance.get('/orders?limit=5');
      return res.data;
    },
  });

  const mockStats = { orders: { total: 24, pending: 2, delivering: 3, completed: 19 }, voucherCount: 5, points: 1240 };
  const mockOrders = [
    { id: '#DH001', product: 'Nike Air Max 270', amount: '1.850.000₫', status: 'delivering', date: '28/04/2026' },
    { id: '#DH002', product: 'Samsung Galaxy Buds', amount: '2.100.000₫', status: 'completed', date: '25/04/2026' },
    { id: '#DH003', product: 'Mechanical Keyboard', amount: '890.000₫', status: 'pending', date: '27/04/2026' },
  ];

  const s = stats || mockStats;
  const orders = recentOrders || mockOrders;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-black text-slate-100">
          Xin chào, <span className="text-indigo-400">{user?.name}</span> 👋
        </h2>
        <p className="text-slate-500 text-sm mt-1">Đây là tổng quan tài khoản của bạn hôm nay.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Tổng đơn hàng" value={s.orders.total} icon="📦" color="bg-indigo-500/15 text-indigo-400" />
        <StatCard label="Đang giao" value={s.orders.delivering} icon="🚚" color="bg-blue-500/15 text-blue-400" />
        <StatCard label="Voucher" value={s.voucherCount} icon="🎟" color="bg-violet-500/15 text-violet-400" />
        <StatCard label="Điểm tích lũy" value={s.points.toLocaleString()} icon="⭐" color="bg-amber-500/15 text-amber-400" />
      </div>

      {/* Recent Orders */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-200">Đơn hàng gần đây</h3>
          <a href="/orders" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Xem tất cả →</a>
        </div>
        {ordersLoading ? (
          <div className="p-8 text-center text-slate-500">Đang tải...</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {orders.map((order: any) => (
              <div key={order.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors">
                <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center text-lg flex-shrink-0">📦</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{order.product}</p>
                  <p className="text-xs text-slate-500">{order.id} · {order.date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-emerald-400">{order.amount}</p>
                  <div className="mt-1"><OrderStatusBadge status={order.status} /></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
```

---

### FILE: `frontend/storefront/src/pages/dashboard/VendorDashboard.tsx`

```tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../../shared-ui/src/lib/axios';

interface VendorStats {
  revenue: number;
  revenueGrowth: number;
  pendingOrders: number;
  lowStockCount: number;
  totalProducts: number;
}

const MetricCard = ({ label, value, sub, icon, accent }: { label: string; value: string; sub?: string; icon: string; accent: string }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={`text-3xl font-black mt-1 ${accent}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <span className="text-2xl">{icon}</span>
    </div>
  </div>
);

const VendorDashboard = () => {
  const { data: stats } = useQuery<VendorStats>({
    queryKey: ['vendor-stats'],
    queryFn: async () => (await axiosInstance.get('/vendor/stats')).data,
  });

  const { data: pendingOrders } = useQuery<any[]>({
    queryKey: ['vendor-orders', 'pending'],
    queryFn: async () => (await axiosInstance.get('/orders?status=pending&limit=5')).data,
  });

  const mockStats: VendorStats = { revenue: 48500000, revenueGrowth: 12.4, pendingOrders: 7, lowStockCount: 3, totalProducts: 142 };
  const mockOrders = [
    { id: '#VC001', buyer: 'Nguyễn Văn A', items: 3, amount: '1.250.000₫', time: '10 phút trước' },
    { id: '#VC002', buyer: 'Trần Thị B', items: 1, amount: '890.000₫', time: '35 phút trước' },
    { id: '#VC003', buyer: 'Lê Minh C', items: 2, amount: '2.100.000₫', time: '1 giờ trước' },
  ];

  const s = stats || mockStats;
  const orders = pendingOrders || mockOrders;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-100">Bảng Điều Khiển Vendor</h2>
        <p className="text-slate-500 text-sm mt-1">Dữ liệu kinh doanh trong tháng 4/2026</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Doanh thu tháng"
          value={`${(s.revenue / 1000000).toFixed(1)}M`}
          sub={`+${s.revenueGrowth}% so với tháng trước`}
          icon="💹"
          accent="text-emerald-400"
        />
        <MetricCard label="Đơn chờ xác nhận" value={String(s.pendingOrders)} sub="Cần xử lý ngay" icon="⏳" accent="text-amber-400" />
        <MetricCard label="Sản phẩm sắp hết" value={String(s.lowStockCount)} sub="Cần nhập kho" icon="⚠️" accent="text-rose-400" />
        <MetricCard label="Tổng sản phẩm" value={String(s.totalProducts)} icon="🗂" accent="text-indigo-400" />
      </div>

      {/* Pending Orders */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-200">Đơn hàng chờ xác nhận</h3>
            <span className="bg-amber-500/15 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">{s.pendingOrders}</span>
          </div>
          <button className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors font-semibold">
            Xem tất cả
          </button>
        </div>
        <div className="divide-y divide-slate-800">
          {orders.map((order: any) => (
            <div key={order.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200">{order.buyer}</p>
                <p className="text-xs text-slate-500">{order.id} · {order.items} sản phẩm · {order.time}</p>
              </div>
              <span className="text-sm font-bold text-emerald-400 flex-shrink-0">{order.amount}</span>
              <div className="flex gap-2 flex-shrink-0">
                <button className="text-xs bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-600/30 px-3 py-1.5 rounded-lg transition-colors font-semibold">
                  Xác nhận
                </button>
                <button className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-3 py-1.5 rounded-lg transition-colors">
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Low stock warning */}
      {s.lowStockCount > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex items-center gap-4">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-bold text-amber-400">Cảnh báo tồn kho thấp</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Có <strong className="text-amber-400">{s.lowStockCount} sản phẩm</strong> sắp hết hàng. Vui lòng nhập kho sớm để tránh ảnh hưởng doanh số.
            </p>
          </div>
          <button className="ml-auto text-xs bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-600/30 px-3 py-1.5 rounded-lg transition-colors font-semibold flex-shrink-0">
            Xem ngay
          </button>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;
```

---

### FILE: `frontend/storefront/src/pages/dashboard/AdminDashboard.tsx`

```tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../../shared-ui/src/lib/axios';

interface AdminStats {
  gmv: number;
  gmvGrowth: number;
  newUsers: number;
  activeVendors: number;
  openDisputes: number;
  systemHealth: 'healthy' | 'degraded' | 'down';
}

const GlobalMetric = ({ label, value, sub, icon, accent }: { label: string; value: string; sub?: string; icon: string; accent: string }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
    <div className="flex items-start justify-between mb-3">
      <span className="text-2xl">{icon}</span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${accent.replace('text-', 'bg-').replace('-400', '-500/15')} ${accent}`}>
        Live
      </span>
    </div>
    <p className={`text-3xl font-black ${accent}`}>{value}</p>
    <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">{label}</p>
    {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

const AdminDashboard = () => {
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => (await axiosInstance.get('/admin/stats')).data,
  });

  const { data: recentActions } = useQuery<any[]>({
    queryKey: ['admin-audit', 'recent'],
    queryFn: async () => (await axiosInstance.get('/admin/audit?limit=5')).data,
  });

  const mockStats: AdminStats = {
    gmv: 2850000000,
    gmvGrowth: 18.7,
    newUsers: 1240,
    activeVendors: 328,
    openDisputes: 4,
    systemHealth: 'healthy',
  };

  const mockAudit = [
    { actor: 'admin@reshop.vn', action: 'Khóa tài khoản vendor', target: 'vendor_id: 441', time: '14:32' },
    { actor: 'support@reshop.vn', action: 'Giải quyết tranh chấp', target: 'dispute_id: 89', time: '13:55' },
    { actor: 'admin@reshop.vn', action: 'Cập nhật phí hoa hồng', target: 'category: Electronics', time: '11:20' },
    { actor: 'admin@reshop.vn', action: 'Phê duyệt shop mới', target: 'vendor: TechZone Store', time: '10:05' },
  ];

  const s = stats || mockStats;
  const audit = recentActions || mockAudit;

  const healthColor = { healthy: 'text-emerald-400', degraded: 'text-amber-400', down: 'text-rose-400' }[s.systemHealth];
  const healthLabel = { healthy: '✓ Hoạt động bình thường', degraded: '⚠ Hiệu suất giảm', down: '✗ Có sự cố' }[s.systemHealth];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-100">Tổng Quan Hệ Thống</h2>
          <p className="text-slate-500 text-sm mt-1">Dữ liệu realtime toàn sàn RESHOP</p>
        </div>
        <div className={`flex items-center gap-2 text-sm font-semibold ${healthColor}`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          {healthLabel}
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <GlobalMetric
          label="Tổng GMV"
          value={`${(s.gmv / 1000000000).toFixed(2)}B`}
          sub={`+${s.gmvGrowth}% so với tháng trước`}
          icon="🌐"
          accent="text-indigo-400"
        />
        <GlobalMetric label="User mới hôm nay" value={s.newUsers.toLocaleString()} icon="👥" accent="text-emerald-400" />
        <GlobalMetric label="Vendor đang hoạt động" value={String(s.activeVendors)} icon="🏪" accent="text-violet-400" />
      </div>

      {/* Disputes alert */}
      {s.openDisputes > 0 && (
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 flex items-center gap-4">
          <span className="text-2xl">⚖️</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-rose-400">Tranh chấp đang mở</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Có <strong className="text-rose-400">{s.openDisputes} tranh chấp</strong> giữa Vendor và Customer cần Admin xử lý.
            </p>
          </div>
          <button className="text-xs bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-600/30 px-3 py-1.5 rounded-lg transition-colors font-semibold flex-shrink-0">
            Xử lý ngay
          </button>
        </div>
      )}

      {/* Audit Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-200">Nhật ký hệ thống gần đây</h3>
          <a href="/reports" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Xem đầy đủ →</a>
        </div>
        <div className="divide-y divide-slate-800">
          {audit.map((entry: any, i: number) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors">
              <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center text-sm flex-shrink-0">🔑</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200">{entry.action}</p>
                <p className="text-xs text-slate-500 truncate">{entry.actor} · {entry.target}</p>
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0">{entry.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
```

---

### FILE: `frontend/storefront/src/pages/account/AccountPage.tsx`

```tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../../../shared-ui/src/context/AuthContext';

const profileSchema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const AccountPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'address' | 'security'>('profile');
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', email: user?.email || '' },
  });

  const onSubmit = async (data: ProfileForm) => {
    // TODO: axiosInstance.put('/profile', data)
    await new Promise(r => setTimeout(r, 800));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = [
    { key: 'profile', label: 'Thông tin', icon: '👤' },
    { key: 'address', label: 'Địa chỉ', icon: '📍' },
    { key: 'security', label: 'Bảo mật', icon: '🔒' },
  ] as const;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-100">Tài khoản cá nhân</h2>
        <p className="text-slate-500 text-sm mt-1">Quản lý thông tin và cài đặt của bạn</p>
      </div>

      {/* Avatar Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-2xl font-black text-white flex-shrink-0">
          {user?.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-slate-100 text-lg">{user?.name}</p>
          <p className="text-slate-500 text-sm">{user?.email}</p>
        </div>
        <button className="ml-auto text-xs border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg transition-colors">
          Đổi ảnh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Họ và tên</label>
              <input {...register('name')} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
              {errors.name && <p className="mt-1.5 text-xs text-rose-400">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
              <input {...register('email')} type="email" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
              {errors.email && <p className="mt-1.5 text-xs text-rose-400">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Số điện thoại</label>
              <input {...register('phone')} type="tel" placeholder="0912 345 678" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-2.5 px-6 rounded-xl transition-all text-sm">
                {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              {saved && <span className="text-sm text-emerald-400">✓ Đã lưu thành công</span>}
            </div>
          </form>
        )}
        {activeTab === 'address' && (
          <div className="text-center py-8 text-slate-500">
            <p className="text-3xl mb-3">📍</p>
            <p className="font-semibold text-slate-400">Chưa có địa chỉ nào</p>
            <p className="text-sm mt-1">Thêm địa chỉ giao hàng để thanh toán nhanh hơn.</p>
            <button className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2 px-5 rounded-xl transition-colors">
              + Thêm địa chỉ
            </button>
          </div>
        )}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mật khẩu hiện tại</label>
              <input type="password" placeholder="••••••••" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mật khẩu mới</label>
              <input type="password" placeholder="••••••••" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
            </div>
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl transition-all text-sm">
              Đổi mật khẩu
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountPage;
```

---

### FILE: `frontend/storefront/src/pages/shop/ShopPage.tsx`

```tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../../shared-ui/src/lib/axios';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  sold: number;
  category: string;
  isNew?: boolean;
  isSale?: boolean;
}

const CATEGORIES = ['Tất cả', 'Điện tử', 'Thời trang', 'Gia dụng', 'Sách', 'Thể thao'];

const ProductCard = ({ product }: { product: Product }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
    <div className="aspect-square bg-slate-800 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-30">🛍</div>
      {product.isSale && (
        <span className="absolute top-2 left-2 bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">SALE</span>
      )}
      {product.isNew && (
        <span className="absolute top-2 right-2 bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">MỚI</span>
      )}
      <button className="absolute bottom-2 right-2 w-8 h-8 bg-slate-700/80 hover:bg-rose-500 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-300 hover:text-white transition-all opacity-0 group-hover:opacity-100">
        ♡
      </button>
    </div>
    <div className="p-4">
      <p className="text-sm text-slate-200 font-semibold line-clamp-2 leading-tight">{product.name}</p>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-amber-400 text-xs">★ {product.rating}</span>
        <span className="text-slate-600 text-xs">·</span>
        <span className="text-slate-500 text-xs">Đã bán {product.sold}</span>
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <span className="text-indigo-400 font-black text-base">{product.price.toLocaleString()}₫</span>
        {product.originalPrice && (
          <span className="text-slate-600 text-xs line-through">{product.originalPrice.toLocaleString()}₫</span>
        )}
      </div>
    </div>
  </div>
);

const ShopPage = () => {
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products', activeCategory, searchQuery, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams({ category: activeCategory, q: searchQuery, sort: sortBy });
      return (await axiosInstance.get(`/products?${params}`)).data;
    },
  });

  const mockProducts: Product[] = [
    { id: '1', name: 'Nike Air Max 270 React', price: 1850000, originalPrice: 2200000, rating: 4.8, sold: 234, category: 'Thời trang', isSale: true },
    { id: '2', name: 'Samsung Galaxy Buds2 Pro', price: 2100000, rating: 4.7, sold: 189, category: 'Điện tử', isNew: true },
    { id: '3', name: 'Mechanical Keyboard Keychron K2', price: 890000, rating: 4.9, sold: 512, category: 'Điện tử' },
    { id: '4', name: 'Áo Polo Ralph Lauren Basic', price: 650000, originalPrice: 850000, rating: 4.6, sold: 320, category: 'Thời trang', isSale: true },
    { id: '5', name: 'Bình Giữ Nhiệt Stanley 1L', price: 750000, rating: 4.8, sold: 445, category: 'Gia dụng' },
    { id: '6', name: 'Đắc Nhân Tâm (Bìa Cứng)', price: 89000, rating: 4.9, sold: 1200, category: 'Sách', isNew: true },
  ];

  const displayProducts = products || mockProducts;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-100">Cửa Hàng</h2>
        <p className="text-slate-500 text-sm mt-1">Khám phá hàng nghìn sản phẩm chất lượng</p>
      </div>

      {/* Search + Sort bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm sản phẩm..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none transition-all"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-all"
        >
          <option value="popular">Phổ biến nhất</option>
          <option value="newest">Mới nhất</option>
          <option value="price_asc">Giá thấp → cao</option>
          <option value="price_desc">Giá cao → thấp</option>
        </select>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
              activeCategory === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-square bg-slate-800" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-slate-800 rounded" />
                <div className="h-3 bg-slate-800 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ShopPage;
```

---

### FILE: `frontend/storefront/src/pages/error/ForbiddenPage.tsx`

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../shared-ui/src/context/AuthContext';

const ForbiddenPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-rose-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center max-w-md">
        <div className="text-8xl mb-6 select-none">🔒</div>
        <h1 className="text-6xl font-black text-slate-800 mb-2">403</h1>
        <h2 className="text-xl font-bold text-slate-300 mb-3">Truy cập bị từ chối</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          Bạn không có quyền truy cập trang này.
          {user && (
            <> Tài khoản <strong className="text-slate-300">{user.name}</strong> ({user.role}) không được phép vào khu vực này.</>
          )}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl transition-all text-sm"
          >
            Về Dashboard
          </button>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold py-2.5 px-6 rounded-xl transition-all text-sm"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForbiddenPage;
```

---

## TÓM TẮT ĐỐI CHIẾU CÂY THƯ MỤC

```
reshop/
├── frontend/
│   ├── shared-ui/src/
│   │   ├── context/AuthContext.tsx        ✅ Tạo mới
│   │   ├── components/
│   │   │   ├── PrivateRoute.tsx           ✅ Tạo mới
│   │   │   └── RoleRoute.tsx              ✅ Tạo mới
│   │   ├── layouts/DashboardLayout.tsx    ✅ Tạo mới
│   │   └── lib/axios.ts                  ✅ Tạo mới
│   └── storefront/src/
│       ├── index.css                      ✅ Tạo mới
│       ├── main.tsx                       ✅ Tạo mới
│       ├── App.tsx                        ✅ Tạo mới
│       └── pages/
│           ├── auth/LoginPage.tsx         ✅ Tạo mới
│           ├── dashboard/
│           │   ├── CustomerDashboard.tsx  ✅ Tạo mới
│           │   ├── VendorDashboard.tsx    ✅ Tạo mới
│           │   └── AdminDashboard.tsx     ✅ Tạo mới
│           ├── account/AccountPage.tsx    ✅ Tạo mới
│           ├── shop/ShopPage.tsx          ✅ Tạo mới
│           └── error/ForbiddenPage.tsx    ✅ Tạo mới
```

**Tổng cộng: 14 file mới** · Stack: React 18 + TypeScript + Vite + Tailwind + React Router DOM v6 + TanStack Query v5 + React Hook Form + Zod
