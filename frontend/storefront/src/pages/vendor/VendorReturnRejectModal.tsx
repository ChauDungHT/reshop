import React, { useState } from 'react';
import axiosInstance from '@shared-ui/lib/axios';

interface ReturnRequest {
  id: string;
  product_name: string;
}

interface Props {
  request: ReturnRequest;
  onClose: () => void;
  onSuccess: () => void;
}

const VendorReturnRejectModal: React.FC<Props> = ({ request, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.length < 20) {
      setError('Lý do từ chối phải có ít nhất 20 ký tự.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await axiosInstance.put(`/vendor/returns/${request.id}/reject`, {
        reject_reason: reason
      });
      alert('Đã từ chối yêu cầu trả hàng.');
      onSuccess();
    } catch (err: any) {
      console.error('Reject return error:', err);
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi thực hiện.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-100">Từ chối trả hàng</h3>
            <p className="text-xs text-slate-500 font-medium truncate mt-1">Sản phẩm: {request.product_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lý do từ chối</label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.length >= 20) setError('');
              }}
              placeholder="Nhập lý do chi tiết vì sao bạn từ chối yêu cầu trả hàng này..."
              rows={4}
              className={`w-full bg-slate-800 border ${error ? 'border-rose-500/50' : 'border-slate-700'} rounded-2xl py-4 px-5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all shadow-inner resize-none`}
              required
            />
            <div className="flex justify-between items-center px-1">
               <p className={`text-[10px] font-medium ${reason.length < 20 ? 'text-slate-500' : 'text-emerald-500'}`}>
                  {reason.length}/20 ký tự tối thiểu
               </p>
               {error && <p className="text-[10px] text-rose-500 font-bold italic">{error}</p>}
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-800 text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-700 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || reason.length < 20}
              className="flex-1 px-4 py-3 rounded-2xl bg-rose-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-rose-500 transition-all shadow-lg shadow-rose-500/30 disabled:opacity-30"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorReturnRejectModal;
