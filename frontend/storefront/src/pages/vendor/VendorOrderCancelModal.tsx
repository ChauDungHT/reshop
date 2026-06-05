import React, { useState } from 'react';
import axiosInstance from '@shared-ui/lib/axios';

interface Order {
  id: string;
  order_code: string;
  parent_order_code?: string;
}

interface Props {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

const VendorOrderCancelModal: React.FC<Props> = ({ order, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cancellationReasons = [
    'Hết hàng / Không đủ tồn kho',
    'Thông tin khách hàng không chính xác',
    'Khách hàng yêu cầu hủy',
    'Sai giá hoặc thông tin sản phẩm',
    'Lý do vận hành khác'
  ];

  const handleConfirm = async () => {
    if (!reason) {
      alert('Vui lòng chọn hoặc nhập lý do hủy đơn.');
      return;
    }

    setIsSubmitting(true);
    try {
      await axiosInstance.put(`/vendor/orders/${order.id}/status`, { 
        status: 'cancelled',
        cancel_reason: reason // Optional: backend might not store this yet but good for future proofing
      });
      alert('Đã hủy đơn hàng thành công.');
      onSuccess();
    } catch (err) {
      console.error('Cancel order error:', err);
      alert('Có lỗi xảy ra khi hủy đơn hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 text-xl">⚠️</div>
             <div>
                <h3 className="text-xl font-black text-slate-100">Xác nhận hủy đơn</h3>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-0.5">
                  #{order.order_code}
                  {order.parent_order_code ? ` · Gốc #${order.parent_order_code}` : ''}
                </p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors text-xl">×</button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
             <p className="text-sm text-slate-400 leading-relaxed">
                Bạn có chắc chắn muốn hủy đơn hàng này không? Hành động này sẽ hoàn lại tồn kho cho sản phẩm và không thể hoàn tác.
             </p>
             
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chọn lý do hủy đơn</label>
                <div className="space-y-2">
                   {cancellationReasons.map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReason(r)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-medium transition-all border ${
                          reason === r 
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {r}
                      </button>
                   ))}
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lý do khác (tùy chọn)</label>
                <textarea
                  value={reason && !cancellationReasons.includes(reason) ? reason : ''}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nhập lý do chi tiết..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-all h-20 resize-none"
                />
             </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-800 text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-700 transition-colors"
            >
              Quay lại
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting || !reason}
              className="flex-1 px-4 py-3 rounded-2xl bg-rose-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-rose-500 transition-all shadow-lg shadow-rose-500/30 disabled:opacity-30"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận hủy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorOrderCancelModal;
