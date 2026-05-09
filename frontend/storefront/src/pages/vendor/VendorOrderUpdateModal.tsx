import React, { useState } from 'react';
import axiosInstance from '@shared-ui/lib/axios';

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
}

interface Order {
  id: string;
  order_code: string;
  status: string;
  tracking_code?: string;
  items: OrderItem[];
}

interface Props {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

const VendorOrderUpdateModal: React.FC<Props> = ({ order, onClose, onSuccess }) => {
  const [status, setStatus] = useState(order.status);
  const [trackingCode, setTrackingCode] = useState(order.tracking_code || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axiosInstance.put(`/vendor/orders/${order.id}/status`, {
        status,
        tracking_code: trackingCode
      });
      alert('Cập nhật đơn hàng thành công!');
      onSuccess();
    } catch (err) {
      console.error('Update order error:', err);
      alert('Có lỗi xảy ra khi cập nhật đơn hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Chờ duyệt' },
    { value: 'confirmed', label: 'Xác nhận đơn' },
    { value: 'processing', label: 'Đang đóng gói' },
    { value: 'shipped', label: 'Đang giao' },
    { value: 'delivered', label: 'Đã giao' },
    { value: 'cancelled', label: 'Hủy đơn' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-100">Cập nhật đơn hàng</h3>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Mã đơn: #{order.order_code}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Trạng thái đơn hàng</label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight border transition-all ${
                    status === opt.value 
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {(status === 'shipped' || status === 'delivered') && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mã vận đơn (Tracking Code)</label>
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="VD: GHN123456789"
                required={status === 'shipped'}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
              />
              <p className="text-[10px] text-slate-500 italic">* Bắt buộc khi chuyển sang trạng thái Đang giao.</p>
            </div>
          )}

          <div className="pt-4 flex gap-3">
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
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50"
            >
              {isSubmitting ? 'Đang lưu...' : 'Xác nhận'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorOrderUpdateModal;
