import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../../../../shared-ui/src/lib/axios';
import type { IUser } from '../../../../../shared-ui/src/types/models';

interface BanUserModalProps {
  user: IUser;
  onClose: () => void;
}

const BanUserModal: React.FC<BanUserModalProps> = ({ user, onClose }) => {
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();
  const isBanned = user.status === 'banned';

  const mutation = useMutation({
    mutationFn: async () => {
      if (isBanned) {
        await axiosInstance.post(`/admin/users/${user.id}/unban`);
      } else {
        await axiosInstance.post(`/admin/users/${user.id}/ban`, { reason });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
    },
  });

  return (
    <div
      id="ban-user-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-5 border-b border-slate-800 flex items-center gap-3 ${isBanned ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
          <span className="text-2xl">{isBanned ? '🔓' : '🔒'}</span>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              {isBanned ? 'Gỡ chặn người dùng' : 'Chặn người dùng'}
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {isBanned ? 'Khôi phục quyền truy cập cho tài khoản này' : 'Người dùng sẽ không thể đăng nhập vào hệ thống'}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* User Info */}
          <div className="bg-slate-800/60 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-100 truncate">{user.name}</div>
              <div className="text-xs text-slate-400 truncate">{user.email}</div>
            </div>
          </div>

          {/* Reason (only for banning) */}
          {!isBanned && (
            <div>
              <label htmlFor="ban-reason" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Lý do chặn <span className="text-rose-400">(tùy chọn)</span>
              </label>
              <textarea
                id="ban-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Nhập lý do chặn tài khoản này..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none transition-all"
              />
            </div>
          )}

          {/* Error */}
          {mutation.isError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm">
              Có lỗi xảy ra. Vui lòng thử lại sau.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3 justify-end">
          <button
            id="ban-modal-cancel-btn"
            onClick={onClose}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            id="ban-modal-confirm-btn"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className={`px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isBanned
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-rose-600 hover:bg-rose-500'
            }`}
          >
            {mutation.isPending ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang xử lý...</>
            ) : (
              isBanned ? '🔓 Xác nhận gỡ chặn' : '🔒 Xác nhận chặn'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BanUserModal;
