import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../../../shared-ui/src/context/CartContext';
import { BASE_URL } from '../../../../shared-ui/src/lib/axios';

const formatPrice = (value: number) => `${Number(value).toLocaleString('vi-VN')}₫`;

const CartPage = () => {
  const { cartItems, removeItem, updateQuantity, toggleSelect, selectAll, isLoading } = useCart();
  const navigate = useNavigate();

  const selectedItems = cartItems.filter(i => i.selected && i.current_stock > 0);
  const totalPrice = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const isAllSelected = cartItems.length > 0 && cartItems.every(i => i.current_stock === 0 || i.selected);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <h1 className="text-3xl font-black text-white">Giỏ hàng của bạn</h1>

      {cartItems.length === 0 ? (
        <div className="rounded-4xl border border-dashed border-slate-800 p-20 text-center space-y-4">
          <p className="text-slate-500">Giỏ hàng đang trống</p>
          <Link to="/shop" className="inline-block rounded-2xl bg-indigo-600 px-8 py-3 font-bold text-white transition hover:bg-indigo-500">
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
          {/* List Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-6 py-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={isAllSelected}
                  onChange={(e) => selectAll(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950"
                />
                <span className="text-sm font-bold text-slate-400 group-hover:text-slate-200 transition">Chọn tất cả</span>
              </label>
            </div>

            {cartItems.map((item) => (
              <div 
                key={item.id} 
                className={`group relative flex gap-6 rounded-4xl bg-slate-900/50 p-6 border border-white/5 transition-all hover:bg-slate-900 ${
                  item.current_stock === 0 ? 'opacity-50 grayscale' : ''
                }`}
              >
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    disabled={item.current_stock === 0}
                    checked={!!item.selected}
                    onChange={() => toggleSelect(item.id)}
                    className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950 disabled:opacity-30"
                  />
                </div>

                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-800">
                  <img 
                    src={item.image_urls?.[0] ? (item.image_urls[0].startsWith('http') ? item.image_urls[0] : `${BASE_URL}${item.image_urls[0]}`) : ''} 
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex justify-between gap-4">
                    <div>
                      <Link to={`/product/${item.product_id}`} className="font-bold text-slate-100 hover:text-indigo-400 transition">
                        {item.name}
                      </Link>
                      {item.current_stock === 0 && (
                        <p className="text-xs font-bold text-rose-500 mt-1 uppercase tracking-widest">Hết hàng</p>
                      )}
                    </div>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="text-slate-600 hover:text-rose-500 transition"
                    >
                      <span className="text-xl">×</span>
                    </button>
                  </div>

                  <div className="flex items-end justify-between">
                    <p className="font-black text-emerald-400">{formatPrice(item.price)}</p>
                    <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-white/5">
                      <button 
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="h-8 w-8 text-slate-400 hover:text-white transition"
                      >
                        -
                      </button>
                      <span className="w-10 text-center text-sm font-bold text-slate-200">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, Math.min(item.current_stock, item.quantity + 1))}
                        disabled={item.quantity >= item.current_stock}
                        className="h-8 w-8 text-slate-400 hover:text-white transition disabled:opacity-10"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="h-fit space-y-6 rounded-4xl bg-slate-900 p-8 border border-white/5">
            <h3 className="text-xl font-bold text-white">Tổng cộng</h3>
            <div className="space-y-4 border-b border-white/5 pb-6">
              <div className="flex justify-between text-slate-400">
                <span>Số lượng chọn:</span>
                <span className="font-bold text-slate-200">{selectedItems.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tạm tính:</span>
                <span className="font-bold text-slate-200">{formatPrice(totalPrice)}</span>
              </div>
            </div>
            <div className="flex justify-between text-xl font-black text-white">
              <span>Tổng tiền:</span>
              <span className="text-emerald-400">{formatPrice(totalPrice)}</span>
            </div>
            <button 
              disabled={selectedItems.length === 0}
              onClick={() => navigate('/checkout')}
              className="w-full rounded-3xl bg-indigo-600 py-4 font-bold text-white shadow-lg transition hover:bg-indigo-500 hover:shadow-indigo-500/20 disabled:grayscale disabled:opacity-50"
            >
              Thanh toán ngay
            </button>
            <div className="rounded-2xl bg-indigo-500/5 p-4 border border-indigo-500/10 text-center">
              <p className="text-xs text-indigo-300">💡 Có thể áp dụng mã giảm giá của từng Shop ở bước tiếp theo</p>
            </div>
            <p className="text-center text-xs text-slate-500 uppercase tracking-widest">
              Giao hàng nhanh toàn quốc
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
