import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../shared-ui/src/context/AuthContext';

const ForbiddenPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-75 bg-rose-600/5 rounded-full blur-3xl" />
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
