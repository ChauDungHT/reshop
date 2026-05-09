import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance, { BASE_URL } from '../../../../shared-ui/src/lib/axios';
import type { IVendor, IApiResponse } from '../../../../shared-ui/src/types';

const VendorShopProfile = () => {
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const { data: shop, isLoading } = useQuery<IVendor>({
    queryKey: ['vendor-shop'],
    queryFn: async () => {
      const res = await axiosInstance.get<IApiResponse<IVendor>>('/vendor/shop');
      return res.data.data;
    },
  });

  const [formData, setFormData] = useState({
    store_name: '',
    phone: '',
    email: '',
    address: '',
    return_policy_days: 7,
    return_policy_desc: '',
  });

  useEffect(() => {
    if (shop) {
      setFormData({
        store_name: shop.store_name || '',
        phone: shop.phone || '',
        email: shop.email || '',
        address: shop.address || '',
        return_policy_days: shop.return_policy_days ?? 7,
        return_policy_desc: shop.return_policy_desc || '',
      });
      if (shop.logo_url) setLogoPreview(`${BASE_URL}${shop.logo_url}`);
      if (shop.banner_url) setBannerPreview(`${BASE_URL}${shop.banner_url}`);
    }
  }, [shop]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('store_name', formData.store_name);
      fd.append('phone', formData.phone);
      fd.append('email', formData.email);
      fd.append('address', formData.address);
      fd.append('return_policy_days', String(formData.return_policy_days));
      fd.append('return_policy_desc', formData.return_policy_desc);
      if (logoFile) fd.append('logo', logoFile);
      if (bannerFile) fd.append('banner', bannerFile);

      await axiosInstance.put('/vendor/shop', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-shop'] });
      alert('Cập nhật gian hàng thành công!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Không thể cập nhật gian hàng');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      if (type === 'logo') {
        setLogoFile(file);
        setLogoPreview(preview);
      } else {
        setBannerFile(file);
        setBannerPreview(preview);
      }
    }
  };

  if (isLoading) return <div className="p-20 text-center text-slate-500 animate-pulse">Đang tải thông tin...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div>
        <h2 className="text-3xl font-black text-white">Hồ Sơ Gian Hàng</h2>
        <p className="text-slate-500 mt-1">Cập nhật thông tin công khai và chính sách cho cửa hàng của bạn.</p>
      </div>

      <div className="bg-slate-900 border border-white/5 rounded-4xl overflow-hidden shadow-2xl">
        {/* Banner Section */}
        <div className="relative h-48 md:h-64 bg-slate-950 group">
          {bannerPreview ? (
            <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-700">Chưa có ảnh bìa</div>
          )}
          <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer bg-black/40 backdrop-blur-sm">
            <span className="bg-slate-900/80 text-white px-4 py-2 rounded-full font-bold text-sm border border-white/10 shadow-xl">
              📸 Cập nhật ảnh bìa
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'banner')} />
          </label>
        </div>

        {/* Logo Section */}
        <div className="px-8 flex flex-col sm:flex-row gap-6 relative -mt-12 sm:-mt-16 mb-8">
          <div className="relative group shrink-0 self-start">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-slate-900 bg-slate-800 overflow-hidden shadow-xl">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 text-3xl">🏪</div>
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer bg-black/60 rounded-full">
              <span className="text-white text-xl">📸</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'logo')} />
            </label>
          </div>
          
          <div className="pt-2 sm:pt-16 flex-1">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Tên gian hàng</label>
              <input
                value={formData.store_name}
                readOnly
                className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-6 py-4 text-slate-400 font-bold outline-none cursor-not-allowed"
                placeholder="Tên cửa hàng của bạn"
              />
              <p className="text-[10px] text-slate-500 px-1">Tên gian hàng không thể thay đổi sau khi duyệt.</p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="p-8 border-t border-white/5 space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Số điện thoại</label>
              <input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition"
                placeholder="098x xxx xxx"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition"
                placeholder="shop@example.com"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Địa chỉ</label>
              <input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition"
                placeholder="Địa chỉ cửa hàng hoặc kho"
              />
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-white/5">
            <h3 className="text-lg font-bold text-white">Chính sách sau bán hàng</h3>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Thời gian cho phép trả hàng (ngày)</label>
              <input
                type="number"
                min="0"
                value={formData.return_policy_days}
                onChange={(e) => setFormData({ ...formData, return_policy_days: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Mô tả chính sách trả hàng</label>
              <textarea
                value={formData.return_policy_desc}
                onChange={(e) => setFormData({ ...formData, return_policy_desc: e.target.value })}
                rows={4}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 resize-none transition"
                placeholder="Ví dụ: Chỉ nhận đổi trả khi hàng còn nguyên seal..."
              />
            </div>
          </div>

          <div className="pt-6">
            <button
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorShopProfile;
