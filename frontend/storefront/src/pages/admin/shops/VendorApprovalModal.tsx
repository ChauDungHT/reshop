import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../../../../shared-ui/src/lib/axios';

export interface IPendingVendorItem {
  user_id: string;
  name: string;
  email: string;
  user_status: string;
  user_created_at: string;
  vendor_id: string;
  store_name: string;
  slug: string;
  vendor_status: string;
  logo_url: string | null;
  banner_url: string | null;
  phone: string | null;
  address: string | null;
  vendor_email: string | null;
  return_policy_days: number;
  return_policy_desc: string | null;
  vendor_created_at: string;
}

interface VendorApprovalModalProps {
  vendor: IPendingVendorItem;
  onClose: () => void;
}

const VendorApprovalModal: React.FC<VendorApprovalModalProps> = ({ vendor, onClose }) => {
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const approveMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.post(`/admin/vendors/${vendor.user_id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-shops'] });
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message || 'Có lỗi xảy ra khi phê duyệt gian hàng.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (rejectReason: string) => {
      await axiosInstance.post(`/admin/vendors/${vendor.user_id}/reject`, { reason: rejectReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-shops'] });
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message || 'Có lỗi xảy ra khi từ chối gian hàng.');
    },
  });

  const handleApprove = () => {
    setErrorMsg('');
    approveMutation.mutate();
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do từ chối.');
      return;
    }
    setErrorMsg('');
    rejectMutation.mutate(reason);
  };

  return (
    <div
      id="vendor-approval-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-100">🏪 Phê Duyệt Đăng Ký Gian Hàng</h3>
          <button
            id="close-approval-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-sm font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Vendor Details */}
          <div className="space-y-4">
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Tên Chủ Cửa Hàng
              </span>
              <p className="text-slate-200 text-sm font-semibold">{vendor.name}</p>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Email Liên Hệ
              </span>
              <p className="text-slate-200 text-sm">{vendor.email}</p>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Tên Gian Hàng
              </span>
              <p className="text-slate-100 text-base font-bold">{vendor.store_name}</p>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Đường Dẫn Slug
              </span>
              <p className="text-indigo-400 text-sm font-mono bg-slate-950 px-2.5 py-1.5 rounded-lg inline-block">
                {vendor.slug}
              </p>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Số Điện Thoại
              </span>
              <p className="text-slate-200 text-sm">{vendor.phone || '—'}</p>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Địa Chỉ
              </span>
              <p className="text-slate-200 text-sm">{vendor.address || '—'}</p>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Chính Sách Đổi Trả (Mô Tả)
              </span>
              <p className="text-slate-300 text-sm bg-slate-800/50 border border-slate-700/30 rounded-xl p-3">
                {vendor.return_policy_desc || 'Chưa cung cấp'}
              </p>
            </div>
          </div>

          {/* Actions */}
          {!rejecting ? (
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
              <button
                id="reject-trigger-btn"
                onClick={() => setRejecting(true)}
                className="px-5 py-2.5 text-sm font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all"
              >
                Từ chối đăng ký
              </button>
              <button
                id="approve-confirm-btn"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {approveMutation.isPending && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Phê duyệt cửa hàng
              </button>
            </div>
          ) : (
            <form onSubmit={handleRejectSubmit} className="pt-4 border-t border-slate-800 space-y-4">
              <div>
                <label htmlFor="reject-reason-input" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Lý do từ chối <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="reject-reason-input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nhập lý do từ chối cụ thể để thông báo cho chủ shop..."
                  required
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setRejecting(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all"
                >
                  Quay lại
                </button>
                <button
                  id="reject-confirm-btn"
                  type="submit"
                  disabled={rejectMutation.isPending}
                  className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {rejectMutation.isPending && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Xác nhận từ chối
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorApprovalModal;
