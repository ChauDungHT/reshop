import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../../shared-ui/src/lib/axios';
import { getFullImageUrl } from '../shared/utils/image';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  userName?: string;
  onUploadSuccess?: (newUrl: string) => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatarUrl,
  userName = 'User',
  onUploadSuccess,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setPreviewUrl(currentAvatarUrl || null);
  }, [currentAvatarUrl]);

  // Auto dismiss toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleAvatarClick = () => {
    if (isPending) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation: MIME type check
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setToast({
        message: 'Chỉ chấp nhận ảnh định dạng JPG, PNG, WebP!',
        type: 'error',
      });
      e.target.value = ''; // Clear input
      return;
    }

    // Client-side validation: File size check (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setToast({
        message: 'Dung lượng file không được vượt quá 5MB!',
        type: 'error',
      });
      e.target.value = ''; // Clear input
      return;
    }

    try {
      setIsPending(true);
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await axiosInstance.post<{ data: { avatar_url: string }; message?: string }>(
        '/users/profile/avatar',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const newAvatarUrl = res.data.data.avatar_url;
      setPreviewUrl(newAvatarUrl);
      setToast({
        message: res.data.message || 'Cập nhật ảnh đại diện thành công!',
        type: 'success',
      });

      // Invalidate queries to update profile across header and other components
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });

      if (onUploadSuccess) {
        onUploadSuccess(newAvatarUrl);
      }
    } catch (err: any) {
      console.error('[AvatarUpload error]:', err);
      const errorMsg = err.response?.data?.message || 'Không thể tải ảnh đại diện lên server.';
      setToast({
        message: errorMsg,
        type: 'error',
      });
    } finally {
      setIsPending(false);
      e.target.value = ''; // Clear input
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-4 relative">
      {/* Toast UI notification */}
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

      {/* Avatar circular frame */}
      <div
        onClick={handleAvatarClick}
        className="w-32 h-32 rounded-full overflow-hidden border border-slate-800 bg-slate-900 shadow-xl relative cursor-pointer group shrink-0"
      >
        <img
          src={getFullImageUrl(previewUrl, 'avatar')}
          alt={userName}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
          <span className="text-xl">📷</span>
          <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">
            Đổi ảnh
          </span>
        </div>

        {/* Loading Spinner */}
        {isPending && (
          <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center z-10">
            <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg, image/png, image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default AvatarUpload;
