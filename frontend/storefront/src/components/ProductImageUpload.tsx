import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../../shared-ui/src/lib/axios';
import { getFullImageUrl, getThumbnailUrl } from '../shared/utils/image';

interface ProductImage {
  id: string;
  url: string;
  is_primary: boolean;
  display_order?: number;
}

interface ProductImageUploadProps {
  productId: string;
  images: ProductImage[];
  onSuccess?: () => void;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  preview: string;
}

const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  productId,
  images = [],
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    await processAndUploadFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processAndUploadFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset input
    }
  };

  const processAndUploadFiles = async (files: File[]) => {
    if (!productId) {
      setToast({ message: 'Vui lòng lưu thông tin sản phẩm trước!', type: 'error' });
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validFiles: File[] = [];

    for (const file of files) {
      // Validate type
      if (!allowedTypes.includes(file.type)) {
        setToast({ message: `File "${file.name}" không đúng định dạng JPG, PNG, WebP!`, type: 'error' });
        continue;
      }
      // Validate size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setToast({ message: `File "${file.name}" vượt quá dung lượng 5MB!`, type: 'error' });
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Create temporary uploading files list for progress representation
    const newUploads = validFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      progress: 0,
      preview: URL.createObjectURL(file),
    }));

    setUploadingFiles((prev) => [...prev, ...newUploads]);

    try {
      const formData = new FormData();
      validFiles.forEach((file) => {
        formData.append('product_images', file);
      });

      // Upload with progress tracking
      const uploadId = newUploads[0].id;
      const res = await axiosInstance.post(
        `/products/${productId}/images`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadingFiles((prev) =>
                prev.map((up) => {
                  if (newUploads.some((nu) => nu.id === up.id)) {
                    return { ...up, progress: percent };
                  }
                  return up;
                })
              );
            }
          },
        }
      );

      setToast({ message: 'Tải ảnh sản phẩm lên thành công!', type: 'success' });

      // Clean up previews
      newUploads.forEach((nu) => URL.revokeObjectURL(nu.preview));
      setUploadingFiles((prev) => prev.filter((up) => !newUploads.some((nu) => nu.id === up.id)));

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['vendor-product', productId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('[ProductImageUpload error]:', err);
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi tải ảnh lên.';
      setToast({ message: errorMsg, type: 'error' });

      // Clean up on error
      newUploads.forEach((nu) => URL.revokeObjectURL(nu.preview));
      setUploadingFiles((prev) => prev.filter((up) => !newUploads.some((nu) => nu.id === up.id)));
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa hình ảnh này khỏi sản phẩm?')) {
      return;
    }

    try {
      await axiosInstance.delete(`/products/${productId}/images/${imageId}`);
      setToast({ message: 'Xóa ảnh sản phẩm thành công!', type: 'success' });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['vendor-product', productId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('[Delete Product Image Error]:', err);
      const errorMsg = err.response?.data?.message || 'Không thể xóa ảnh.';
      setToast({ message: errorMsg, type: 'error' });
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      await axiosInstance.put(`/products/${productId}/images/${imageId}/primary`);
      setToast({ message: 'Đã đặt hình ảnh làm ảnh chính!', type: 'success' });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['vendor-product', productId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('[Set Primary Image Error]:', err);
      const errorMsg = err.response?.data?.message || 'Không thể đặt làm ảnh chính.';
      setToast({ message: errorMsg, type: 'error' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl border transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-1">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Hình ảnh sản phẩm
        </label>
        <span className="text-[10px] text-slate-500 font-bold bg-slate-800/50 px-2 py-0.5 rounded-full">
          {images.length} Ảnh
        </span>
      </div>

      {/* Drag & Drop Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-dashed border-2 rounded-2xl p-8 text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-500/5'
            : 'border-slate-800 bg-slate-900/30 hover:bg-indigo-500/5 hover:border-indigo-500/50'
        }`}
      >
        <span className="text-3xl block mb-2">☁️</span>
        <p className="text-slate-300 text-sm font-semibold">
          Kéo thả các file ảnh sản phẩm vào đây hoặc click để chọn
        </p>
        <p className="text-slate-500 text-xs mt-1">
          Hỗ trợ JPG, PNG, WebP (Tối đa 5MB)
        </p>
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/jpeg, image/png, image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Grid Display */}
      {((images && images.length > 0) || uploadingFiles.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* Uploaded Images */}
          {images.map((img) => (
            <div
              key={img.id}
              className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-900 group shadow-lg"
            >
              <img
                src={getThumbnailUrl(img.url)}
                alt="Product image"
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
              />

              {/* Primary Badge or Set Primary Button */}
              {img.is_primary ? (
                <div className="absolute bottom-2 left-2 bg-emerald-500 text-white text-[9px] font-extrabold uppercase px-2 py-1 rounded-md shadow z-10">
                  Ảnh chính
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSetPrimary(img.id)}
                  className="absolute bottom-2 left-2 bg-slate-950/80 border border-white/10 text-white text-[9px] font-extrabold uppercase px-2 py-1 rounded-md shadow opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 hover:bg-indigo-600 hover:border-indigo-500"
                >
                  Đặt ảnh chính
                </button>
              )}

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleDelete(img.id)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-rose-500/90 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow z-10"
              >
                ✕
              </button>
            </div>
          ))}

          {/* Uploading Files with Progress Bar */}
          {uploadingFiles.map((up) => (
            <div
              key={up.id}
              className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col items-center justify-center p-3 shadow-lg"
            >
              <img
                src={up.preview}
                alt="preview"
                className="w-full h-full object-cover opacity-35 absolute inset-0"
              />
              <div className="w-full relative z-10 space-y-2 px-2 text-center">
                <span className="text-[10px] font-bold text-slate-300 truncate block">
                  {up.name}
                </span>
                {/* Progress bar container */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${up.progress}%` }}
                  />
                </div>
                <span className="text-[10px] font-black text-indigo-400">
                  {up.progress}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageUpload;
