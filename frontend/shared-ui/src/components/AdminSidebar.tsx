import React from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarItem {
  label: string;
  path: string;
  icon: string;
}

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const adminMenuItems: SidebarItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: '📊' },
  { label: 'Người dùng', path: '/admin/users', icon: '👥' },
  { label: 'Danh mục', path: '/admin/categories', icon: '🗂' },
  { label: 'Gian hàng', path: '/admin/shops', icon: '🏪' },
  { label: 'Cấu hình Phí', path: '/admin/fees', icon: '💸' },
  { label: 'Tranh chấp', path: '/admin/disputes', icon: '⚖️' },
  { label: 'Cài đặt', path: '/admin/settings', icon: '⚙️' },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed, onToggle }) => {
  return (
    <aside
      className={`flex flex-col border-r border-slate-800 transition-all duration-350 ${
        collapsed ? 'w-16' : 'w-60'
      } bg-slate-900/90 backdrop-blur-md h-screen`}
    >
      {/* Header and Toggle */}
      <div className="border-b border-slate-800 p-2 flex items-center justify-between min-h-[4rem]">
        {!collapsed && (
          <div className="px-4 py-3 flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-white bg-linear-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              ADMIN
            </span>
            <span className="text-[10px] font-bold bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full uppercase">
              Pro
            </span>
          </div>
        )}
        <div className={`flex-1 flex items-center ${collapsed ? 'justify-center' : 'justify-end px-3'}`}>
          <button
            onClick={onToggle}
            data-testid="sidebar-toggle"
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors font-mono font-bold"
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 py-4 space-y-1.5 px-2 overflow-y-auto">
        {adminMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20 font-bold shadow-md shadow-rose-950/5'
                  : 'text-slate-450 hover:text-slate-200 hover:bg-slate-800/60'
              }`
            }
          >
            <span className="text-base flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
