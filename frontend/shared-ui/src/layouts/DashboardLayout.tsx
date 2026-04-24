import { ReactNode } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SidebarItemProps {
  to: string;
  label: string;
  icon?: ReactNode;
}

const SidebarItem = ({ to, label, icon }: SidebarItemProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center px-4 py-3 mb-2 rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
    >
      {icon && <span className="mr-3">{icon}</span>}
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const isPendingVendor = user?.role === 'vendor' && user?.status === 'pending_approval';

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1e293b] border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Reshop
          </h1>
        </div>

        <nav className="flex-1 p-4 mt-4 overflow-y-auto">
          {/* Menu tĩnh sẽ bị ẩn nếu Vendor đang chờ duyệt */}
          {!isPendingVendor ? (
            <>
              <SidebarItem to="/dashboard" label="Tổng quan" />
              {user?.role === 'customer' && (
                <>
                  <SidebarItem to="/orders" label="Đơn hàng của tôi" />
                  <SidebarItem to="/profile" label="Hồ sơ" />
                </>
              )}
              {user?.role === 'vendor' && (
                <>
                  <SidebarItem to="/products" label="Sản phẩm" />
                  <SidebarItem to="/sales" label="Doanh thu" />
                </>
              )}
              {user?.role === 'admin' && (
                <>
                  <SidebarItem to="/users" label="Người dùng" />
                  <SidebarItem to="/vendors" label="Phê duyệt NCC" />
                </>
              )}
            </>
          ) : (
            <div className="px-4 py-3 text-sm text-yellow-500 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              Menu bị hạn chế cho đến khi tài khoản được duyệt.
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-inner">
              {user?.role?.[0].toUpperCase()}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-semibold truncate uppercase tracking-wider text-blue-400">
                {user?.role}
              </p>
              <p className="text-xs text-slate-500 truncate">{user?.id}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full px-4 py-2 text-sm font-medium text-red-400 border border-red-400/30 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header/Top Bar */}
        <header className="h-16 border-b border-slate-800 bg-[#1e293b]/50 backdrop-blur-md flex items-center px-8 justify-between z-10">
          <h2 className="text-lg font-semibold text-slate-100">Dashboard</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-400">ID: {user?.id}</span>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-[#0f172a] to-[#1e293b]">
          {/* Cảnh báo Vendor Pending Approval */}
          {isPendingVendor && (
            <div className="mb-8 p-6 bg-red-500/10 border border-red-500/50 rounded-xl backdrop-blur-sm animate-pulse">
              <div className="flex items-center">
                <div className="p-3 bg-red-500 rounded-lg mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-400 uppercase tracking-tight">Tài khoản đang chờ phê duyệt</h3>
                  <p className="text-slate-400 mt-1">Cửa hàng của bạn đang được quản trị viên kiểm tra. Vui lòng quay lại sau.</p>
                </div>
              </div>
            </div>
          )}

          {/* Render Page Content */}
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
