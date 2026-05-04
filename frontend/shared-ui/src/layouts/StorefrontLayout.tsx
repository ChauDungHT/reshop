import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const StorefrontLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <NavLink to="/" className="text-xl font-black tracking-tight text-white">
            RESHOP
          </NavLink>

          {/* Nav links */}
          <nav className="hidden items-center gap-6 md:flex">
            <NavLink
              to="/shop"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              Cửa hàng
            </NavLink>
          </nav>

          {/* Auth buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <NavLink
                  to="/dashboard"
                  className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  Quản lý
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                >
                  Đăng nhập
                </NavLink>
                <NavLink
                  to="/register"
                  className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  Đăng ký
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-600">
        © 2026 Reshop · Sàn thương mại điện tử đa nhà bán hàng
      </footer>
    </div>
  );
};

export default StorefrontLayout;
