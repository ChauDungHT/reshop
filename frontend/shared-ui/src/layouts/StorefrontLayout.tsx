import { useEffect, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Chatbot from '../components/Chatbot';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ChatbotErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Chatbot error caught:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ position: 'fixed', bottom: '30px', right: '35px', zIndex: 99999, background: '#fee2e2', border: '1px solid #fca5a5', padding: '15px', borderRadius: '12px', color: '#991b1b', maxWidth: '300px', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <strong style={{ display: 'block', marginBottom: '5px' }}>⚠️ Lỗi Chatbot</strong>
          <code style={{ fontSize: '11px', wordBreak: 'break-all' }}>{this.state.error?.message}</code>
        </div>
      );
    }
    return this.props.children;
  }
}

const StorefrontLayout = () => {
  const { user, logout } = useAuth();
  const { cartItems } = useCart();
  const navigate = useNavigate();


  // Chặn Vendor và Admin truy cập Storefront
  useEffect(() => {
    if (user && (user.role === 'vendor' || user.role === 'admin')) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const cartCount = cartItems.length;

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

          {/* Right side: Cart & Auth */}
          <div className="flex items-center gap-4">
            {/* Cart Button */}
            <NavLink
              to="/cart"
              className={({ isActive }) =>
                `group relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 transition-all hover:bg-slate-900 ${
                  isActive ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-slate-950 transition-transform group-hover:scale-110">
                  {cartCount}
                </span>
              )}
            </NavLink>

            {/* Auth buttons */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <NavLink
                    to="/dashboard"
                    className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                  >
                    Quản lý Tài khoản
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

      {/* AI Chatbot */}
      <ChatbotErrorBoundary>
        <Chatbot />
      </ChatbotErrorBoundary>
    </div>
  );
};

export default StorefrontLayout;
