import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, type UserRole } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../lib/axios';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  badgeCount?: number;
}

const navByRole: Record<UserRole, NavItem[]> = {
  customer: [
    { label: 'Đơn hàng', path: '/dashboard', icon: '📦' },
    { label: 'Ví Reshop', path: '/dashboard?tab=wallet', icon: '💳' },
    { label: 'Hồ sơ', path: '/dashboard?tab=profile', icon: '👤' },
  ],
  vendor: [
    { label: 'Dashboard', path: '/vendor/dashboard', icon: '📊' },
    { label: 'Sản phẩm', path: '/vendor/products', icon: '🗂' },
    { label: 'Đơn hàng', path: '/vendor/orders', icon: '📦' },
    { label: 'Trả hàng', path: '/vendor/returns', icon: '↩️' },
    { label: 'Hỏi & Đáp', path: '/vendor/qa', icon: '💬' },
    { label: 'Gian hàng', path: '/vendor/shop-profile', icon: '🏪' },
    { label: 'Phí sản phẩm', path: '/vendor/fees', icon: '💸' },
  ],
  admin: [
    { label: 'Tổng quan', path: '/dashboard', icon: '🌐' },
    { label: 'Người dùng', path: '/users', icon: '👥' },
    { label: 'Vendors', path: '/vendors', icon: '🏪' },
    { label: 'Tranh chấp', path: '/disputes', icon: '⚖️' },
    { label: 'Cấu hình', path: '/settings', icon: '⚙️' },
    { label: 'Báo cáo', path: '/reports', icon: '📑' },
  ],
};

const roleLabel: Record<UserRole, string> = {
  customer: 'Khách Hàng',
  vendor: 'Trung tâm Nhà bán hàng',
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
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
        const res = await axiosInstance.get('/users/profile');
        return res.data.data;
    },
    enabled: !!user,
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ['vendor-dashboard-stats'],
    queryFn: async () => {
        const res = await axiosInstance.get('/vendor/dashboard');
        return res.data.data;
    },
    enabled: !!user && user.role === 'vendor',
    refetchInterval: 30000, // 30s
  });

  if (!user) return null;

  const getBadgeCount = (label: string) => {
    if (user.role !== 'vendor' || !dashboardStats) return undefined;
    if (label === 'Đơn hàng') return dashboardStats.new_orders;
    if (label === 'Trả hàng') return dashboardStats.pending_returns;
    if (label === 'Hỏi & Đáp') return dashboardStats.unanswered_qa;
    return undefined;
  };

  const navItems = navByRole[user.role].map(item => ({
    ...item,
    badgeCount: getBadgeCount(item.label)
  }));

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
          {navItems.map((item) => {
            const isCustomer = user.role === 'customer';
            const currentFullPath = location.pathname + location.search;
            const isTabActive = isCustomer && (
              (item.path === '/dashboard' && (currentFullPath === '/dashboard' || currentFullPath === '/dashboard?tab=orders')) ||
              currentFullPath === item.path
            );
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    (isCustomer ? isTabActive : isActive)
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`
                }
              >
                <span className="text-base flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                      {item.badgeCount > 99 ? '99+' : item.badgeCount}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="h-16 border-b border-slate-800 flex items-center px-6 gap-4 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
          <h1 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
            {roleLabel[user.role]}
          </h1>
          <div className="ml-auto flex items-center gap-4">
            {user.role === 'customer' && (
              <NavLink
                to="/shop"
                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Về cửa hàng
              </NavLink>
            )}
            <button className="relative p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
              🔔
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-800 py-1">
              <div className="flex flex-col items-end hidden sm:flex">
                <p className="text-sm font-semibold text-slate-200 truncate">{user.name}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 ${roleBadgeColor[user.role]}`}>
                  {roleLabel[user.role]}
                </span>
              </div>
              <NavLink
                to="/account"
                className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold overflow-hidden border border-slate-700 shadow-md shrink-0 hover:ring-2 hover:ring-indigo-500/50 transition-all"
              >
                {profileData?.avatar_url ? (
                  <img src={`${axiosInstance.defaults.baseURL?.replace('/api', '')}${profileData.avatar_url}`} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (profileData?.name || user.name).charAt(0).toUpperCase()
                )}
              </NavLink>
              <button
                onClick={handleLogout}
                className="ml-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-rose-400"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </header>
        <div className="p-6">
          {user.role === 'vendor' && user.status === 'pending_approval' && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <p className="font-bold">Tài khoản đang chờ phê duyệt</p>
              <p className="text-sm mt-1 text-slate-400">Menu bị hạn chế cho đến khi tài khoản được duyệt.</p>
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
