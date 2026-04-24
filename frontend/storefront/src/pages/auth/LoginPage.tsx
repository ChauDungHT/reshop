import { useState } from 'react';
import { useAuth } from '../../../../shared-ui/src/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [token, setToken] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) {
      login(token);
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 font-sans">
      <div className="w-full max-w-md bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-800 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Chào mừng quay lại
          </h1>
          <p className="text-slate-400 mt-2">Dán JWT Token để đăng nhập hệ thống</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">JWT Token</label>
            <textarea
              className="w-full h-32 px-4 py-3 bg-[#0f172a] border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
          >
            Đăng nhập
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-xs text-center text-slate-500 leading-relaxed">
            Hệ thống quản trị Reshop Multi-vendor. <br />
            Nếu gặp sự cố, vui lòng liên hệ hỗ trợ kỹ thuật.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
