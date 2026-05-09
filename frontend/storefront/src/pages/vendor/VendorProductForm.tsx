import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance, { BASE_URL } from '@shared-ui/lib/axios';
import { getFullImageUrl } from '@shared-ui/lib/image-utils';
import ImageUploader from '@shared-ui/components/ImageUploader';

const VendorProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category_id: '',
    is_featured: false,
    status: 'active' as 'active' | 'inactive' | 'out_of_stock'
  });

  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  // 1. Fetch Categories
  const { data: categories } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await axiosInstance.get('/categories');
      return res.data.data.categories;
    }
  });

  // 2. Fetch Product Data (if Edit)
  const { data: productData, isLoading: isProductLoading } = useQuery({
    queryKey: ['vendor-product', id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/vendor/products/${id}`);
      return res.data.data;
    },
    enabled: isEdit
  });

  useEffect(() => {
    if (productData) {
      setFormData({
        name: productData.name || '',
        description: productData.description || '',
        price: (productData.price || 0).toString(),
        stock: (productData.stock || 0).toString(),
        category_id: productData.category_id || '',
        is_featured: !!productData.is_featured,
        status: productData.status || 'active'
      });
      const rawUrls = Array.isArray(productData.image_urls) ? productData.image_urls : [];
      const urls = rawUrls.map((url: string) => getFullImageUrl(url));
      setExistingImages(urls);
    }
  }, [productData]);

  // 3. Mutation
  const mutation = useMutation({
    mutationFn: async (payload: FormData) => {
      if (isEdit) {
        return axiosInstance.put(`/vendor/products/${id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        return axiosInstance.post('/vendor/products', payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      alert(isEdit ? 'Cập nhật thành công!' : 'Thêm sản phẩm thành công!');
      navigate('/vendor/products');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category_id) {
        alert('Vui lòng chọn danh mục');
        return;
    }

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value.toString());
    });
    
    // Add new images
    images.forEach(file => {
      data.append('images', file);
    });

    // Add existing images if editing (Ensure relative paths)
    if (isEdit) {
        const relativeUrls = existingImages.map(url => {
            // Robust extraction of /uploads/ path
            const uploadsIndex = url.indexOf('/uploads/');
            if (uploadsIndex !== -1) {
                return url.substring(uploadsIndex);
            }
            return url;
        });
        data.append('existing_images', JSON.stringify(relativeUrls));
    }

    mutation.mutate(data);
  };

  const handleImagesChange = React.useCallback((files: File[]) => {
    setImages(files);
  }, []);

  const handleRemoveExistingImage = React.useCallback((url: string) => {
    setExistingImages(prev => prev.filter(u => u !== url));
  }, []);

  if (isEdit && isProductLoading) {
    return <div className="p-20 text-center text-slate-500 font-bold">Đang tải dữ liệu sản phẩm...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">{isEdit ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}</h2>
          <p className="text-slate-500 text-sm mt-1">Cung cấp thông tin chi tiết để thu hút khách hàng.</p>
        </div>
        <button 
          onClick={() => navigate('/vendor/products')}
          className="text-sm font-bold text-slate-400 hover:text-white transition-colors"
        >
          Quay lại danh sách
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Tên sản phẩm</label>
              <input 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition"
                placeholder="Ví dụ: Vợt cầu lông Yonex Astrox 100ZZ..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Mô tả sản phẩm</label>
              <textarea 
                rows={8}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition resize-none"
                placeholder="Mô tả đặc điểm, thông số kỹ thuật, ưu đãi..."
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-white/5 rounded-3xl p-8">
            <ImageUploader 
                maxImages={8}
                initialPreviews={existingImages}
                onChange={handleImagesChange}
                onRemoveInitial={handleRemoveExistingImage}
            />
          </div>
        </div>

        {/* Right Column: Pricing & Status */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Danh mục</label>
              <select 
                required
                value={formData.category_id}
                onChange={e => setFormData({...formData, category_id: e.target.value})}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition appearance-none"
              >
                <option value="">Chọn danh mục</option>
                {categories?.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Giá bán (VND)</label>
              <input 
                type="number"
                required
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition"
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Số lượng tồn kho</label>
              <input 
                type="number"
                required
                value={formData.stock}
                onChange={e => setFormData({...formData, stock: e.target.value})}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition"
                placeholder="0"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-200">Sản phẩm nổi bật</label>
              <button 
                type="button"
                onClick={() => setFormData({...formData, is_featured: !formData.is_featured})}
                className={`w-12 h-6 rounded-full transition-colors relative ${formData.is_featured ? 'bg-indigo-600' : 'bg-slate-800'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.is_featured ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Trạng thái</label>
              <div className="grid grid-cols-1 gap-2">
                {(['active', 'inactive', 'out_of_stock'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFormData({...formData, status: s})}
                    className={`px-4 py-3 rounded-2xl border text-xs font-bold transition-all ${
                      formData.status === s 
                      ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' 
                      : 'bg-slate-950 border-white/5 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    {s === 'active' ? 'Đang bán' : s === 'inactive' ? 'Ẩn' : 'Hết hàng'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-5 rounded-3xl transition shadow-xl shadow-indigo-500/20 disabled:opacity-50"
          >
            {mutation.isPending ? 'Đang lưu...' : (isEdit ? 'Lưu thay đổi' : 'Đăng sản phẩm')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VendorProductForm;
