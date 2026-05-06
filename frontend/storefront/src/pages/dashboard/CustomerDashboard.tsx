import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../shared-ui/src/context/AuthContext';
import axiosInstance, { BASE_URL } from '../../../../shared-ui/src/lib/axios';

const formatPrice = (value: number) => `${Number(value).toLocaleString('vi-VN')}₫`;

// Components
const OrderStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    pending: 'bg-amber-500/15 text-amber-400',
    confirmed: 'bg-indigo-500/15 text-indigo-400',
    processing: 'bg-blue-500/15 text-blue-400',
    shipped: 'bg-violet-500/15 text-violet-400',
    delivered: 'bg-emerald-500/15 text-emerald-400',
    cancelled: 'bg-red-500/15 text-red-400',
    returned: 'bg-slate-500/15 text-slate-300',
  };
  const label: Record<string, string> = {
    pending: 'Chờ duyệt',
    confirmed: 'Đã xác nhận',
    processing: 'Đang xử lý',
    shipped: 'Đang giao',
    delivered: 'Đã nhận',
    cancelled: 'Đã hủy',
    returned: 'Trả hàng',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[status] || 'bg-slate-700 text-slate-300'}`}>
      {label[status] || status}
    </span>
  );
};

const CustomerDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'orders' | 'wallet'>('orders');
  const [orderFilter, setOrderFilter] = useState('all');

  // Modal States
  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const [returnOrder, setReturnOrder] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [topupAmount, setTopupAmount] = useState('');

  // Fetch Data
  const { data: orders, isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const res = await axiosInstance.get('/checkout/my');
      return res.data.data;
    },
  });

  const { data: walletHistory, isLoading: walletLoading } = useQuery<any[]>({
    queryKey: ['wallet-history'],
    queryFn: async () => {
      const res = await axiosInstance.get('/wallet/history');
      return res.data.data;
    },
    enabled: activeTab === 'wallet',
  });

  // Mutations
  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await axiosInstance.post(`/checkout/${orderId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      alert('Đã hủy đơn hàng thành công');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Không thể hủy đơn hàng');
    }
  });

  const topupMutation = useMutation({
    mutationFn: async (amount: number) => {
      await axiosInstance.post('/wallet/topup', { amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-history'] });
      // In a real app, we'd also update user profile balance
      alert('Nạp tiền thành công!');
      setTopupAmount('');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ orderItemId, rating, comment }: any) => {
      await axiosInstance.post('/after-sales/reviews', { order_item_id: orderItemId, rating, comment });
    },
    onSuccess: () => {
      alert('Cảm ơn bạn đã đánh giá!');
      setReviewOrder(null);
    },
  });

  const returnMutation = useMutation({
    mutationFn: async ({ orderId, reason }: any) => {
      await axiosInstance.post('/after-sales/returns', { order_id: orderId, reason });
    },
    onSuccess: () => {
      alert('Yêu cầu trả hàng đã được gửi!');
      setReturnOrder(null);
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    },
  });

  const filteredOrders = orders?.filter(o => orderFilter === 'all' || o.status === orderFilter) || [];

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white">Dashboard</h2>
          <p className="text-slate-500 mt-1">Xin chào, {user?.name}. Quản lý đơn hàng và tài chính của bạn.</p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition ${activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Đơn hàng
          </button>
          <button 
            onClick={() => setActiveTab('wallet')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition ${activeTab === 'wallet' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Ví Reshop
          </button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <div className="space-y-6">
          {/* Order Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(f => (
              <button 
                key={f}
                onClick={() => setOrderFilter(f)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition ${
                  orderFilter === f ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-white/5 text-slate-500 hover:border-slate-700'
                }`}
              >
                {f === 'all' ? 'Tất cả' : f === 'pending' ? 'Chờ duyệt' : f === 'processing' ? 'Đang xử lý' : f === 'shipped' ? 'Đang giao' : f === 'delivered' ? 'Đã nhận' : 'Đã hủy'}
              </button>
            ))}
          </div>

          {/* Orders List */}
          <div className="grid gap-6">
            {ordersLoading ? (
              <div className="p-20 text-center animate-pulse text-slate-600">Đang tải đơn hàng...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-20 text-center bg-slate-900 rounded-4xl border border-dashed border-slate-800 text-slate-500">
                Chưa có đơn hàng nào trong mục này.
              </div>
            ) : (
              filteredOrders.map(order => (
                <div key={order.id} className="bg-slate-900 border border-white/5 rounded-4xl overflow-hidden hover:border-indigo-500/30 transition-all group">
                  <div className="p-6 md:p-8 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-100">{order.order_code}</p>
                        <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString('vi-VN')}</p>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>

                    <div className="space-y-3">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-4 bg-slate-950/50 p-3 rounded-2xl border border-white/5">
                          <img src={item.image_urls?.[0]} className="h-12 w-12 rounded-xl object-cover bg-slate-800" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-200 text-sm truncate">{item.product_name}</p>
                            <p className="text-xs text-slate-500">{item.quantity} x {formatPrice(item.price_snapshot)}</p>
                          </div>
                          <div className="flex gap-2">
                            {order.status === 'delivered' && (
                              <button 
                                onClick={() => setReviewOrder({ orderId: order.id, item })}
                                className="text-[10px] font-bold text-indigo-400 hover:bg-indigo-500/10 px-2 py-1 rounded-lg transition"
                              >
                                Đánh giá
                              </button>
                            )}
                            {order.status === 'delivered' && (new Date().getTime() - new Date(order.updated_at || order.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 7 && (
                              <button 
                                onClick={() => setReturnOrder({ orderId: order.id, item })}
                                className="text-[10px] font-bold text-rose-400 hover:bg-rose-500/10 px-2 py-1 rounded-lg transition"
                              >
                                Trả hàng
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <p className="text-sm text-slate-400">Tổng cộng: <span className="text-lg font-black text-emerald-400 ml-2">{formatPrice(order.total_amount)}</span></p>
                      <div className="flex gap-2">
                        {order.status === 'pending' && (
                          <button 
                            onClick={() => {
                              if (confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
                                cancelMutation.mutate(order.id);
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-rose-600/10 text-rose-400 text-xs font-bold border border-rose-500/20 hover:bg-rose-600/20"
                          >
                            Hủy đơn hàng
                          </button>
                        )}
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700"
                        >
                          Chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Transaction History */}
          <div className="bg-slate-900 rounded-4xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-slate-900/50">
              <h3 className="font-bold text-white">Lịch sử giao dịch</h3>
            </div>
            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
              {walletLoading ? (
                <div className="p-10 text-center text-slate-600">Đang tải...</div>
              ) : walletHistory?.length === 0 ? (
                <div className="p-20 text-center text-slate-500 italic text-sm">Chưa có giao dịch nào.</div>
              ) : (
                walletHistory?.map(tx => (
                  <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-white/[0.02]">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-200">{tx.description || 'Giao dịch ví'}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{new Date(tx.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                    <p className={`font-black ${tx.type === 'deposit' || tx.type === 'refund' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.type === 'deposit' || tx.type === 'refund' ? '+' : '-'}{formatPrice(tx.amount)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Wallet Summary & Topup */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-4xl p-8 text-white shadow-xl shadow-indigo-500/20">
              <p className="text-xs font-bold uppercase tracking-widest opacity-70">Số dư hiện tại</p>
              <h2 className="text-4xl font-black mt-2">{formatPrice(user?.wallet_balance || 0)}</h2>
              <div className="mt-8 flex items-center gap-2 text-xs font-medium bg-white/10 w-fit px-3 py-1.5 rounded-full">
                <span className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse" />
                Đang hoạt động
              </div>
            </div>

            <div className="bg-slate-900 rounded-4xl p-8 border border-white/5 space-y-6">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span>⚡</span> Nạp tiền nhanh
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[50000, 100000, 200000, 500000].map(amt => (
                  <button 
                    key={amt} 
                    onClick={() => setTopupAmount(amt.toString())}
                    className="p-3 rounded-2xl bg-slate-950 border border-white/5 text-xs font-bold text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition"
                  >
                    {formatPrice(amt)}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                <input 
                  type="number" 
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  placeholder="Nhập số tiền khác..."
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500"
                />
                <button 
                  disabled={!topupAmount || topupMutation.isPending}
                  onClick={() => topupMutation.mutate(Number(topupAmount))}
                  className="w-full rounded-3xl bg-indigo-600 py-4 font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50"
                >
                  {topupMutation.isPending ? 'Đang xử lý...' : 'Nạp tiền ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals (Review/Return) - Simple implementation with alerts for now */}
      {reviewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-4xl p-8 max-w-md w-full space-y-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Đánh giá sản phẩm</h3>
            <div className="flex gap-4 items-center bg-slate-950 p-4 rounded-3xl">
              <img src={reviewOrder.item.image_urls?.[0]} className="h-16 w-16 rounded-2xl object-cover" />
              <p className="font-bold text-sm text-slate-200 line-clamp-2">{reviewOrder.item.product_name}</p>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Số sao</p>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} className="text-2xl grayscale hover:grayscale-0 transition">⭐</button>
                  ))}
                </div>
              </div>
              <textarea placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..." rows={4} className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 resize-none" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setReviewOrder(null)} className="flex-1 py-4 font-bold text-slate-400 hover:text-white transition">Đóng</button>
              <button onClick={() => reviewMutation.mutate({ orderItemId: reviewOrder.item.id, rating: 5, comment: 'Sản phẩm tuyệt vời!' })} className="flex-2 rounded-3xl bg-indigo-600 py-4 font-bold text-white hover:bg-indigo-500 transition">Gửi đánh giá</button>
            </div>
          </div>
        </div>
      )}

      {returnOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-4xl p-8 max-w-md w-full space-y-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Yêu cầu trả hàng</h3>
            <div className="flex gap-4 items-center bg-slate-950 p-4 rounded-3xl">
              <img src={returnOrder.item.image_urls?.[0]} className="h-16 w-16 rounded-2xl object-cover" />
              <p className="font-bold text-sm text-slate-200 line-clamp-2">{returnOrder.item.product_name}</p>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Số lượng trả (tối đa {returnOrder.item.quantity})</p>
                <input 
                  type="number"
                  id="returnQty"
                  defaultValue={returnOrder.item.quantity}
                  min={1}
                  max={returnOrder.item.quantity}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Lý do trả hàng</p>
                <select 
                  id="returnReason"
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-rose-500"
                >
                  <option value="Sản phẩm lỗi/hỏng">Sản phẩm lỗi/hỏng</option>
                  <option value="Không đúng mô tả">Không đúng mô tả</option>
                  <option value="Gửi sai hàng">Gửi sai hàng</option>
                  <option value="Lý do khác">Lý do khác</option>
                </select>
              </div>
              <textarea 
                id="returnDesc"
                placeholder="Mô tả chi tiết tình trạng sản phẩm..." 
                rows={3} 
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-rose-500 resize-none" 
              />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setReturnOrder(null)} className="flex-1 py-4 font-bold text-slate-400 hover:text-white transition">Hủy bỏ</button>
              <button 
                onClick={() => {
                  const qty = parseInt((document.getElementById('returnQty') as HTMLInputElement).value);
                  if (isNaN(qty) || qty < 1 || qty > returnOrder.item.quantity) {
                    alert('Số lượng trả không hợp lệ');
                    return;
                  }
                  const reason = (document.getElementById('returnReason') as HTMLSelectElement).value;
                  const description = (document.getElementById('returnDesc') as HTMLTextAreaElement).value;
                  returnMutation.mutate({ order_item_id: returnOrder.item.id, reason, description, quantity: qty });
                }} 
                className="flex-2 rounded-3xl bg-rose-600 py-4 font-bold text-white hover:bg-rose-500 transition"
              >
                Gửi yêu cầu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-4xl p-8 max-w-2xl w-full my-auto space-y-8 shadow-2xl relative">
            <button onClick={() => setSelectedOrder(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white text-2xl">×</button>
            
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">Chi tiết đơn hàng</h3>
              <p className="text-sm text-indigo-400 font-bold">{selectedOrder.order_code}</p>
            </div>

            {/* Stepper Trạng thái */}
            <div className="flex items-center justify-between">
              {[
                { s: 'pending', label: 'Chờ duyệt' },
                { s: 'confirmed', label: 'Xác nhận' },
                { s: 'processing', label: 'Xử lý' },
                { s: 'shipped', label: 'Giao hàng' },
                { s: 'delivered', label: 'Thành công' }
              ].map((step, idx, arr) => {
                const isCompleted = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'].indexOf(selectedOrder.status) >= idx;
                const isCurrent = selectedOrder.status === step.s;
                
                return (
                  <React.Fragment key={step.s}>
                    <div className="flex flex-col items-center gap-2">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] border-2 transition-all ${
                        isCompleted ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'
                      } ${isCurrent ? 'ring-4 ring-indigo-500/20' : ''}`}>
                        {isCompleted ? '✓' : idx + 1}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-tighter ${isCompleted ? 'text-slate-200' : 'text-slate-600'}`}>{step.label}</span>
                    </div>
                    {idx < arr.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-2 rounded-full ${isCompleted ? 'bg-indigo-500/50' : 'bg-slate-800'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <div className="grid md:grid-cols-2 gap-8 pt-4">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Thông tin người nhận</h4>
                <div className="bg-slate-950 p-4 rounded-3xl space-y-2 text-sm border border-white/5">
                  <p><span className="text-slate-500">Họ tên:</span> <span className="text-slate-200 font-medium">{selectedOrder.shipping_address?.name}</span></p>
                  <p><span className="text-slate-500">SĐT:</span> <span className="text-slate-200 font-medium">{selectedOrder.shipping_address?.phone}</span></p>
                  <p><span className="text-slate-500">Địa chỉ:</span> <span className="text-slate-200 font-medium">{selectedOrder.shipping_address?.address}</span></p>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Thanh toán</h4>
                <div className="bg-slate-950 p-4 rounded-3xl space-y-2 text-sm border border-white/5">
                  <p><span className="text-slate-500">Phương thức:</span> <span className="text-indigo-400 font-bold uppercase">{selectedOrder.payment_method}</span></p>
                  <p><span className="text-slate-500">Tổng tiền:</span> <span className="text-emerald-400 font-black text-lg">{formatPrice(selectedOrder.total_amount)}</span></p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Danh sách sản phẩm</h4>
              <div className="space-y-2">
                {selectedOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4 bg-slate-950/50 p-3 rounded-2xl border border-white/5">
                    <img src={item.image_urls?.[0]} className="h-10 w-10 rounded-xl object-cover bg-slate-800" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-200 text-xs truncate">{item.product_name}</p>
                      <p className="text-[10px] text-slate-500">{item.quantity} x {formatPrice(item.price_snapshot)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
