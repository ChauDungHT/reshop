import React, { useState } from 'react';

interface ResolutionFormProps {
  refundAmount: number;
  customerName: string;
  vendorName: string;
  isSubmitting: boolean;
  onSubmit: (winner: 'customer' | 'vendor', notes: string) => void;
}

const ResolutionForm: React.FC<ResolutionFormProps> = ({
  refundAmount,
  customerName,
  vendorName,
  isSubmitting,
  onSubmit,
}) => {
  const [winner, setWinner] = useState<'customer' | 'vendor'>('customer');
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleResolveClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setErrorMsg('Vui lòng nhập ghi chú phân xử của Admin.');
      return;
    }
    setErrorMsg('');
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    onSubmit(winner, notes);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3 flex items-center gap-2">
        ⚖️ Quyết định Phân xử của Admin
      </h3>

      <form onSubmit={handleResolveClick} className="space-y-4">
        {/* Winner Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Bên Thắng Cuộc</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label
              className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                winner === 'customer'
                  ? 'border-emerald-500 bg-emerald-500/5 text-emerald-300'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-400'
              }`}
            >
              <input
                type="radio"
                name="winner"
                value="customer"
                checked={winner === 'customer'}
                onChange={() => setWinner('customer')}
                className="accent-emerald-500 w-4 h-4 cursor-pointer"
              />
              <div>
                <p className="font-bold text-sm">Khách hàng thắng</p>
                <p className="text-xs text-slate-500 mt-0.5">Hoàn tiền {refundAmount.toLocaleString('vi-VN')}đ cho {customerName}</p>
              </div>
            </label>

            <label
              className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                winner === 'vendor'
                  ? 'border-indigo-500 bg-indigo-500/5 text-indigo-300'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-400'
              }`}
            >
              <input
                type="radio"
                name="winner"
                value="vendor"
                checked={winner === 'vendor'}
                onChange={() => setWinner('vendor')}
                className="accent-indigo-500 w-4 h-4 cursor-pointer"
              />
              <div>
                <p className="font-bold text-sm">Người bán thắng</p>
                <p className="text-xs text-slate-500 mt-0.5">Giữ nguyên số tiền thanh toán cho {vendorName}</p>
              </div>
            </label>
          </div>
        </div>

        {/* Admin Notes */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Ghi chú Phân xử (Bắt buộc)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
            placeholder="Nhập lý do phân xử và các bằng chứng đối chiếu..."
          />
          {errorMsg && <p className="text-rose-400 text-xs font-medium">{errorMsg}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm py-3 px-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Đang xử lý phân xử...
            </>
          ) : (
            'Đóng Tranh Chấp & Ban Hành Quyết Định'
          )}
        </button>
      </form>

      {/* Double Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <span className="text-3xl">⚠️</span>
              <h4 className="text-lg font-bold text-slate-100">Xác Nhận Quyết Định Phân Xử</h4>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Quyết định này là **chung cuộc** và không thể hoàn tác. 
              {winner === 'customer' ? (
                <span>
                  {' '}Khách hàng <strong className="text-emerald-400">{customerName}</strong> sẽ được hoàn lại số tiền{' '}
                  <strong className="text-emerald-400">{refundAmount.toLocaleString('vi-VN')}đ</strong> vào ví Reshop và sản phẩm sẽ được hoàn kho.
                </span>
              ) : (
                <span>
                  {' '}Tiền thanh toán sẽ được giữ lại cho cửa hàng <strong className="text-indigo-400">{vendorName}</strong>.
                </span>
              )}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 px-4 rounded-lg border border-slate-700 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-lg transition shadow-md"
              >
                Đồng ý, Thực thi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResolutionForm;
