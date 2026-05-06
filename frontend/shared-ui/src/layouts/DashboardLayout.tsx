import { useState } from 'react';
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
    { label: 'Cửa hàng', path: '/shop', icon: '🛍' },
    { label: 'Tài khoản', path: '/account', icon: '👤' },
  ],
  vendor: [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Sản phẩm', path: '/products', icon: '🗂' },
    { label: 'Tài chính', path: '/finance', icon: '💰' },
  ],
  admin: [
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
  admin: 'Quản Trị Viên',
};

const roleBadgeColor: Record<UserRole, string> = {
  customer: 'bg-emerald-500/15 text-emerald-400',
  vendor: 'bg-amber-500/15 text-amber-400',
  admin: 'bg-rose-500/15 text-rose-400',
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
        {/* Header Section */}
        <div className="border-b border-slate-800 p-2">
          {!collapsed && (
            <div className="px-4 py-3">
              <span className="text-xl font-black tracking-tight text-white">
                RESHOP
              </span>
            </div>
          )}
          <div className={`flex items-center ${collapsed ? 'h-16 justify-center' : 'px-4 h-12 justify-end'}`}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 text-xl font-black tracking-tight"
            >
              {collapsed ? '→' : '←'}
            </button>
          </div>
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
