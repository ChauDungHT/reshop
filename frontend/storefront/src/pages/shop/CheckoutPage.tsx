import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useCart } from '../../../../shared-ui/src/context/CartContext';
import { useAuth } from '../../../../shared-ui/src/context/AuthContext';
import axiosInstance, { BASE_URL } from '../../../../shared-ui/src/lib/axios';

const formatPrice = (value: number) => `${Number(value).toLocaleString('vi-VN')}₫`;

const STEPS = [
  { id: 1, title: 'Địa chỉ', icon: '📍' },
  { id: 2, title: 'Vận chuyển', icon: '🚚' },
  { id: 3, title: 'Thanh toán', icon: '💳' },
  { id: 4, title: 'Xác nhận', icon: '✨' },
];

const CheckoutPage = () => {
  const { cartItems, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null);

  // Form State
  const [addressInfo, setAddressInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [shippingMethod, setShippingMethod] = useState('standard'); // 'standard' (20k), 'fast' (50k)
  const [paymentMethod, setPaymentMethod] = useState('cod'); // 'cod', 'wallet'

  const selectedItems = cartItems.filter(i => i.selected && i.current_stock > 0);
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = shippingMethod === 'standard' ? 20000 : 50000;
  const total = subtotal + shippingFee;

  if (selectedItems.length === 0 && !successOrder) {
    return <Navigate to="/cart" replace />;
  }

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        items: selectedItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        shipping_address: { ...addressInfo, shipping_method: shippingMethod },
        payment_method: paymentMethod
      };

      const res = await axiosInstance.post('/checkout', payload);
      if (res.data.success) {
        setSuccessOrder(res.data.data);
        clearCart();
        setStep(4);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi đặt hàng');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 4 && successOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="h-24 w-24 bg-emerald-500/20 rounded-full flex items-center justify-center text-5xl animate-bounce">
          🎉
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white">Đặt hàng thành công!</h1>
          <p className="text-slate-500">Mã đơn hàng của bạn là <span className="font-bold text-indigo-400">{successOrder.order_code}</span></p>
        </div>
        <div className="flex gap-4 pt-4">
          <button onClick={() => navigate('/dashboard')} className="rounded-3xl bg-indigo-600 px-8 py-3 font-bold text-white hover:bg-indigo-500 transition">
            Xem đơn hàng
          </button>
          <button onClick={() => navigate('/')} className="rounded-3xl border border-slate-700 px-8 py-3 font-bold text-slate-300 hover:bg-slate-800 transition">
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-8">
      {/* Stepper */}
      <div className="flex items-center justify-between px-4">
        {STEPS.map((s, idx) => (
          <React.Fragment key={s.id}>
            <div className={`flex flex-col items-center gap-2 ${step >= s.id ? 'text-indigo-400' : 'text-slate-600'}`}>
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl border-2 transition-all ${
                step === s.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' : 
                step > s.id ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-slate-900 border-slate-800'
              }`}>
                {s.icon}
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">{s.title}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-1 flex-1 mx-4 rounded-full ${step > s.id ? 'bg-indigo-500/50' : 'bg-slate-900'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
        {/* Main Step Content */}
        <div className="bg-slate-900 rounded-4xl p-8 border border-white/5 shadow-xl">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Thông tin giao hàng</h2>
              <div className="grid gap-4">
                <input 
                  type="text" placeholder="Họ và tên người nhận"
                  value={addressInfo.name} onChange={e => setAddressInfo({...addressInfo, name: e.target.value})}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:border-indigo-500 outline-none transition"
                />
                <input 
                  type="text" placeholder="Số điện thoại"
                  value={addressInfo.phone} onChange={e => setAddressInfo({...addressInfo, phone: e.target.value})}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:border-indigo-500 outline-none transition"
                />
                <textarea 
                  placeholder="Địa chỉ chi tiết (Số nhà, đường, phường/xã...)" rows={3}
                  value={addressInfo.address} onChange={e => setAddressInfo({...addressInfo, address: e.target.value})}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:border-indigo-500 outline-none transition resize-none"
                />
              </div>
              <button onClick={() => setStep(2)} disabled={!addressInfo.address || !addressInfo.phone} className="w-full rounded-3xl bg-indigo-600 py-4 font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50">
                Tiếp tục: Vận chuyển
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Phương thức vận chuyển</h2>
              <div className="grid gap-4">
                {[
                  { id: 'standard', name: 'Giao hàng tiêu chuẩn', time: '3-5 ngày', price: 20000 },
                  { id: 'fast', name: 'Giao hàng nhanh (Express)', time: '1-2 ngày', price: 50000 },
                ].map((m) => (
                  <label key={m.id} className={`flex items-center justify-between p-6 rounded-3xl border cursor-pointer transition ${
                    shippingMethod === m.id ? 'bg-indigo-600/10 border-indigo-500' : 'bg-slate-950 border-white/5'
                  }`}>
                    <div className="flex items-center gap-4">
                      <input type="radio" name="ship" checked={shippingMethod === m.id} onChange={() => setShippingMethod(m.id)} className="hidden" />
                      <div>
                        <p className="font-bold text-white">{m.name}</p>
                        <p className="text-xs text-slate-500">{m.time}</p>
                      </div>
                    </div>
                    <p className="font-bold text-emerald-400">{formatPrice(m.price)}</p>
                  </label>
                ))}
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 rounded-3xl border border-slate-700 py-4 font-bold text-slate-300 hover:bg-slate-800 transition">Quay lại</button>
                <button onClick={() => setStep(3)} className="flex-2 rounded-3xl bg-indigo-600 py-4 font-bold text-white hover:bg-indigo-500 transition">Tiếp tục: Thanh toán</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Phương thức thanh toán</h2>
              <div className="grid gap-4">
                <label className={`flex items-center justify-between p-6 rounded-3xl border cursor-pointer transition ${
                  paymentMethod === 'cod' ? 'bg-indigo-600/10 border-indigo-500' : 'bg-slate-950 border-white/5'
                }`}>
                  <div className="flex items-center gap-4">
                    <input type="radio" name="pay" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="hidden" />
                    <span className="text-2xl">💵</span>
                    <div>
                      <p className="font-bold text-white">Thanh toán khi nhận hàng (COD)</p>
                      <p className="text-xs text-slate-500">Thanh toán tiền mặt cho shipper</p>
                    </div>
                  </div>
                </label>
                <label className={`flex flex-col gap-4 p-6 rounded-3xl border cursor-pointer transition ${
                  paymentMethod === 'wallet' ? 'bg-indigo-600/10 border-indigo-500' : 'bg-slate-950 border-white/5'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <input type="radio" name="pay" checked={paymentMethod === 'wallet'} onChange={() => setPaymentMethod('wallet')} className="hidden" />
                      <span className="text-2xl">👛</span>
                      <div>
                        <p className="font-bold text-white">Thanh toán qua Ví Reshop</p>
                        <p className="text-xs text-slate-500">Số dư hiện tại: <span className="text-indigo-400 font-bold">{formatPrice(user?.wallet_balance || 0)}</span></p>
                      </div>
                    </div>
                  </div>
                  {paymentMethod === 'wallet' && user && user.wallet_balance < total && (
                    <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex items-center justify-between">
                      <p className="text-xs text-rose-400">Số dư không đủ. Bạn cần nạp thêm {formatPrice(total - user.wallet_balance)}</p>
                      <button onClick={() => navigate('/dashboard')} className="text-xs font-bold text-white bg-rose-600 px-3 py-1.5 rounded-lg">Nạp ngay</button>
                    </div>
                  )}
                </label>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep(2)} className="flex-1 rounded-3xl border border-slate-700 py-4 font-bold text-slate-300 hover:bg-slate-800 transition">Quay lại</button>
                <button 
                  onClick={handlePlaceOrder} 
                  disabled={isSubmitting || !!(paymentMethod === 'wallet' && user && user.wallet_balance < total)}
                  className="flex-2 rounded-3xl bg-emerald-600 py-4 font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                >
                  {isSubmitting ? 'Đang xử lý...' : `Đặt hàng: ${formatPrice(total)}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Order Summary */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-4xl p-6 border border-white/5 shadow-xl space-y-4">
            <h3 className="font-bold text-white">Xem lại đơn hàng</h3>
            <div className="max-h-60 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
              {selectedItems.map(item => (
                <div key={item.id} className="flex gap-3 text-xs">
                  <img 
                    src={item.image_urls?.[0] ? (item.image_urls[0].startsWith('http') ? item.image_urls[0] : `${BASE_URL}${item.image_urls[0]}`) : ''} 
                    className="h-10 w-10 rounded-lg object-cover bg-slate-800"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-200 truncate">{item.name}</p>
                    <p className="text-slate-500">{item.quantity} x {formatPrice(item.price)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-white/5 space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Tạm tính:</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Phí ship:</span>
                <span>{formatPrice(shippingFee)}</span>
              </div>
              <div className="flex justify-between text-lg font-black text-white pt-2">
                <span>Tổng:</span>
                <span className="text-emerald-400">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
          <div className="bg-indigo-600/10 p-4 rounded-3xl border border-indigo-500/20 text-[10px] text-slate-500 uppercase tracking-widest text-center">
            An toàn · Bảo mật · Nhanh chóng
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
