import { Link } from 'react-router-dom';

const ForbiddenPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-white p-4">
      <div className="text-center max-w-md">
        <h1 className="text-9xl font-extrabold text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]">
          403
        </h1>
        <h2 className="mt-4 text-3xl font-bold text-slate-100">Truy cập bị chặn</h2>
        <p className="mt-4 text-slate-400">
          Bạn không có quyền truy cập vào tài nguyên này. Vui lòng liên hệ quản trị viên hoặc quay lại trang chủ.
        </p>
        <div className="mt-8">
          <Link
            to="/dashboard"
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            Quay lại Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForbiddenPage;
