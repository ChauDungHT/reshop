import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import axiosInstance from '../../../../shared-ui/src/lib/axios';

const registerSchema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  confirmPassword: z.string().min(6, 'Xác nhận mật khẩu tối thiểu 6 ký tự'),
  role: z.enum(['customer', 'vendor']),
  // Vendor specific fields
  store_name: z.string().optional(),
  slug: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu không khớp",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.role === 'vendor' && !data.store_name) return false;
  return true;
}, {
  message: "Tên cửa hàng là bắt buộc đối với người bán",
  path: ["store_name"],
}).refine((data) => {
  if (data.role === 'vendor' && !data.slug) return false;
  return true;
}, {
  message: "Slug cửa hàng là bắt buộc",
  path: ["slug"],
});

type RegisterForm = z.infer<typeof registerSchema>;

const RegisterPage = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ 
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'customer' }
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null);
    try {
      const endpoint = data.role === 'customer' ? '/auth/register-customer' : '/auth/register-vendor';
      await axiosInstance.post(endpoint, data);
      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl max-w-md">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Đăng ký thành công!</h2>
          <p className="text-slate-400">
            {selectedRole === 'vendor' 
              ? 'Yêu cầu của bạn đang chờ quản trị viên phê duyệt. Đang chuyển hướng về trang đăng nhập...' 
              : 'Tài khoản của bạn đã sẵn sàng. Đang chuyển hướng về trang đăng nhập...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight text-white">
            TẠO TÀI KHOẢN
          </h1>
          <p className="text-slate-500 text-sm mt-2">Bắt đầu mua bán trên Reshop</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-slate-950">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            
            {/* Role Selection */}
            <div className="flex bg-slate-800 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {}}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedRole === 'customer' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
                {...register('role', { value: 'customer' })}
              >
                KHÁCH HÀNG
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedRole === 'vendor' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
                onClick={() => {}}
              >
                NGƯỜI BÁN
              </button>
              {/* Note: In a real app we'd use radio buttons or a better logic for role selection with react-hook-form */}
              <select {...register('role')} className="hidden">
                 <option value="customer">Customer</option>
                 <option value="vendor">Vendor</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Họ và tên</label>
                <input
                  {...register('name')}
                  placeholder="Nguyễn Văn A"
                  className={`w-full bg-slate-800 border ${errors.name ? 'border-rose-500' : 'border-slate-700'} rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                {errors.name && <p className="mt-1 text-[10px] text-rose-400">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@example.com"
                  className={`w-full bg-slate-800 border ${errors.email ? 'border-rose-500' : 'border-slate-700'} rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                {errors.email && <p className="mt-1 text-[10px] text-rose-400">{errors.email.message}</p>}
              </div>

              {selectedRole === 'vendor' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Tên cửa hàng</label>
                    <input
                      {...register('store_name')}
                      placeholder="My Store"
                      className={`w-full bg-slate-800 border ${errors.store_name ? 'border-rose-500' : 'border-slate-700'} rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    />
                    {errors.store_name && <p className="mt-1 text-[10px] text-rose-400">{errors.store_name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Slug (URL)</label>
                    <input
                      {...register('slug')}
                      placeholder="my-store"
                      className={`w-full bg-slate-800 border ${errors.slug ? 'border-rose-500' : 'border-slate-700'} rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    />
                    {errors.slug && <p className="mt-1 text-[10px] text-rose-400">{errors.slug.message}</p>}
                  </div>
                </>
              )}

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Mật khẩu</label>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`w-full bg-slate-800 border ${errors.password ? 'border-rose-500' : 'border-slate-700'} rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
                {errors.password && <p className="mt-1 text-[10px] text-rose-400">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Xác nhận mật khẩu</label>
                <input
                  {...register('confirmPassword')}
                  type="password"
                  placeholder="••••••••"
                  className={`w-full bg-slate-800 border ${errors.confirmPassword ? 'border-rose-500' : 'border-slate-700'} rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                {errors.confirmPassword && <p className="mt-1 text-[10px] text-rose-400">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            {serverError && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-2 text-rose-400 text-xs mt-2">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold py-3 rounded-xl transition-all mt-4 text-xs tracking-widest"
            >
              {isSubmitting ? 'ĐANG XỬ LÝ...' : 'ĐĂNG KÝ NGAY'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-xs mt-6">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-indigo-400 font-bold hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
