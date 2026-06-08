import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../shared-ui/src/context/AuthContext';
import axiosInstance from '../../../../shared-ui/src/lib/axios';
import AvatarUpload from '../../components/AvatarUpload';

const profileSchema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const AccountPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'address' | 'security'>('profile');
  const [saved, setSaved] = useState(false);

  // Fetch real-time profile data from the database
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await axiosInstance.get('/users/profile');
      return res.data.data;
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profileData?.name || user?.name || '',
      email: profileData?.email || user?.email || '',
      phone: profileData?.phone || '',
    },
  });

  // Sync form default values once profile data is loaded
  useEffect(() => {
    if (profileData) {
      reset({
        name: profileData.name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
      });
    }
  }, [profileData, reset]);

  const onSubmit = async (data: ProfileForm) => {
    try {
      await axiosInstance.put('/users/profile', {
        name: data.name,
        phone: data.phone || null,
      });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('[AccountPage update error]:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin.');
    }
  };

  const tabs = [
    { key: 'profile', label: 'Thông tin', icon: '👤' },
    { key: 'address', label: 'Địa chỉ', icon: '📍' },
    { key: 'security', label: 'Bảo mật', icon: '🔒' },
  ] as const;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-100">Tài khoản cá nhân</h2>
        <p className="text-slate-500 text-sm mt-1">Quản lý thông tin và cài đặt của bạn</p>
      </div>

      {/* Avatar Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center">
        <AvatarUpload
          currentAvatarUrl={profileData?.avatar_url}
          userName={profileData?.name || user?.name}
        />
        <div className="text-center mt-2">
          <p className="font-bold text-slate-100 text-lg">{profileData?.name || user?.name}</p>
          <p className="text-slate-500 text-sm">{profileData?.email || user?.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Họ và tên</label>
              <input {...register('name')} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
              {errors.name && <p className="mt-1.5 text-xs text-rose-400">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
              <input {...register('email')} type="email" disabled className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-500 text-sm focus:outline-none cursor-not-allowed" />
              {errors.email && <p className="mt-1.5 text-xs text-rose-400">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Số điện thoại</label>
              <input {...register('phone')} type="tel" placeholder="0912 345 678" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-2.5 px-6 rounded-xl transition-all text-sm">
                {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              {saved && <span className="text-sm text-emerald-400">✓ Đã lưu thành công</span>}
            </div>
          </form>
        )}
        {activeTab === 'address' && (
          <div className="text-center py-8 text-slate-500">
            <p className="text-3xl mb-3">📍</p>
            <p className="font-semibold text-slate-400">Chưa có địa chỉ nào</p>
            <p className="text-sm mt-1">Thêm địa chỉ giao hàng để thanh toán nhanh hơn.</p>
            <button className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2 px-5 rounded-xl transition-colors">
              + Thêm địa chỉ
            </button>
          </div>
        )}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mật khẩu hiện tại</label>
              <input type="password" placeholder="••••••••" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mật khẩu mới</label>
              <input type="password" placeholder="••••••••" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
            </div>
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl transition-all text-sm">
              Đổi mật khẩu
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountPage;
