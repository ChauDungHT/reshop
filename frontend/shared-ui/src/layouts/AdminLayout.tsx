import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../lib/axios';
import AdminSidebar from '../components/AdminSidebar';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  // Fetch admin profile details
  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await axiosInstance.get('/users/profile');
      return res.data.data;
    },
    enabled: !!user,
  });

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Collapsible Sidebar */}
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 flex items-center px-6 gap-4 bg-slate-900/40 backdrop-blur-md sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <h1 className="text-xs font-black text-rose-450 uppercase tracking-widest">
              Hệ Thống Quản Trị Viên
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-3 pr-2">
              <div className="flex flex-col items-end hidden sm:flex">
                <p className="text-sm font-semibold text-slate-200 truncate">{user.name}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 mt-0.5">
                  Super Admin
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 flex items-center justify-center text-sm font-bold overflow-hidden border border-rose-500/30 shadow-lg shrink-0">
                {profileData?.avatar_url ? (
                  <img
                    src={`${axiosInstance.defaults.baseURL?.replace('/api', '')}${profileData.avatar_url}`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (profileData?.name || user.name).charAt(0).toUpperCase()
                )}
              </div>
              <button
                onClick={handleLogout}
                className="ml-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-rose-400 hover:border-rose-500/30 transition-all duration-150 cursor-pointer shadow-md"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content Outer Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
