import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../shared-ui/src/context/AuthContext';
import axiosInstance, { BASE_URL } from '../../../../shared-ui/src/lib/axios';
import { daysSince } from '../../../../shared-ui/src/lib/dateUtils';
import type { IOrder, IOrderItem, ISubOrder, IWalletTransaction, IUser, IApiResponse } from '../../../../shared-ui/src/types';
import AvatarUpload from '../../components/AvatarUpload';

const formatPrice = (value: number) => `${Number(value).toLocaleString('vi-VN')}₫`;

function orderPassesTabFilter(order: IOrder, filter: string): boolean {
  if (filter === 'all') return true;
  if (order.status === filter) return true;
  return Boolean(order.sub_orders?.some((so) => so.status === filter));
}

function allSubOrdersPending(order: IOrder): boolean {
  const subs = order.sub_orders;
  if (subs && subs.length > 0) return subs.every((s) => s.status === 'pending');
  return order.status === 'pending';
}

function lineNet(so: ISubOrder): number {
  return (
    Number(so.subtotal) +
    Number(so.shipping_fee) -
    Number(so.vendor_discount) -
    Number(so.platform_discount)
  );
}

function itemThumb(item: IOrderItem): string {
  const urls = item.image_urls as string[] | undefined;
  const u = urls?.[0];
  if (!u) return '';
  return u.startsWith('http') ? u : `${BASE_URL}${u}`;
}

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
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'orders';
  const [orderFilter, setOrderFilter] = useState('all');

  // Modal States
  const [reviewOrder, setReviewOrder] = useState<{ orderId: string; item: IOrderItem } | null>(null);
  const [returnOrder, setReturnOrder] = useState<{ orderId: string; item: IOrderItem } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [orderExpanded, setOrderExpanded] = useState<Record<string, boolean>>({});
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [returnReason, setReturnReason] = useState('Sản phẩm lỗi/hỏng');
  const [returnDesc, setReturnDesc] = useState('');

  const orderIsOpen = (id: string) => orderExpanded[id] ?? true;
  const toggleOrder = (id: string) => {
    setOrderExpanded((m) => ({ ...m, [id]: !(m[id] ?? true) }));
  };



  // Fetch Data
  const { data: orders, isLoading: ordersLoading } = useQuery<IOrder[]>({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const res = await axiosInstance.get<IApiResponse<IOrder[]>>('/checkout/my');
      return res.data.data;
    },
  });

  const { data: walletHistory, isLoading: walletLoading } = useQuery<IWalletTransaction[]>({
    queryKey: ['wallet-history'],
    queryFn: async () => {
      const res = await axiosInstance.get<IApiResponse<{ items: IWalletTransaction[] }>>('/wallet/history');
      return res.data.data.items;
    },
    enabled: activeTab === 'wallet',
  });

  const { data: profileData, isLoading: profileLoading } = useQuery<IUser>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await axiosInstance.get<IApiResponse<IUser>>('/users/profile');
      return res.data.data;
    },
    enabled: activeTab === 'profile' || activeTab === 'wallet',
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
    },
  });

  const cancelSubOrderMutation = useMutation({
    mutationFn: async (subOrderId: string) => {
      await axiosInstance.post(`/checkout/sub-orders/${subOrderId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      alert('Đã hủy đơn theo shop.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Không thể hủy đơn shop');
    },
  });

  const topupMutation = useMutation({
    mutationFn: async (amount: number) => {
      await axiosInstance.post('/wallet/topup', { amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-history'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      alert('Nạp tiền thành công!');
      setTopupAmount('');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (payload: {
      order_id: string;
      product_id: string;
      stars: number;
      comment: string;
      images?: string[];
    }) => {
      await axiosInstance.post('/after-sales/reviews', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      alert('Cảm ơn bạn đã đánh giá!');
      setReviewOrder(null);
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (data: { order_item_id: string; reason: string; description?: string; images?: string[] }) => {
      await axiosInstance.post('/after-sales/returns', data);
    },
    onSuccess: () => {
      alert('Yêu cầu trả hàng đã được gửi!');
      setReturnOrder(null);
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Không thể gửi yêu cầu trả hàng');
    }
  });

  const profileMutation = useMutation({
    mutationFn: async (data: { name: string | null; phone: string | null; address: string | null }) => {
      const res = await axiosInstance.put<IApiResponse>('/users/profile', data);
      return res.data;
    },
    onSuccess: (res: IApiResponse) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      const updatedName = res.data?.name || 'người dùng';
      alert(`${res.message || 'Cập nhật thành công'}: Chào ${updatedName}!`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật');
    }
  });

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await axiosInstance.post<IApiResponse>('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      alert('Đổi ảnh đại diện thành công!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Không thể tải ảnh lên');
    }
  });

  const filteredOrders = orders?.filter((o) => orderPassesTabFilter(o, orderFilter)) || [];

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white">Dashboard</h2>
          <p className="text-slate-500 mt-1">Xin chào, {user?.name}. Quản lý đơn hàng và tài chính của bạn.</p>
        </div>
      </div>

      {activeTab === 'orders' && (
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
              filteredOrders.map((order) => {
                const subs = order.sub_orders?.length ? order.sub_orders : null;
                const open = orderIsOpen(order.id);
                return (
                  <div
                    key={order.id}
                    className="bg-slate-900 border border-white/5 rounded-4xl overflow-hidden hover:border-indigo-500/30 transition-all group"
                  >
                    <div className="p-6 md:p-8 space-y-4">
                      <button
                        type="button"
                        onClick={() => toggleOrder(order.id)}
                        className="w-full flex justify-between items-start text-left gap-4"
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="text-sm font-black text-slate-100">{order.order_code}</p>
                          <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString('vi-VN')}</p>
                          <p className="text-[10px] text-slate-600">Đơn cha · trạng thái tổng hợp</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <OrderStatusBadge status={order.status} />
                          <span className="text-slate-500 text-lg">{open ? '▼' : '▶'}</span>
                        </div>
                      </button>

                      {open && (
                        <div className="space-y-4 pt-2 border-t border-white/5">
                          {subs ? (
                            subs.map((sub: ISubOrder) => (
                              <div
                                key={sub.id}
                                className="rounded-2xl border border-indigo-500/15 bg-slate-950/40 p-4 space-y-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Shop</p>
                                    <p className="text-sm font-black text-slate-100">{sub.store_name || 'Cửa hàng'}</p>
                                    <p className="text-[10px] text-slate-600 font-mono">{sub.sub_order_code}</p>
                                  </div>
                                  <OrderStatusBadge status={sub.status} />
                                </div>
                                {sub.tracking_number ? (
                                  <p className="text-xs text-slate-400">
                                    Vận đơn: <span className="text-slate-200 font-mono">{sub.tracking_number}</span>
                                  </p>
                                ) : null}
                                <p className="text-[10px] text-slate-500">
                                  Thành tiền shop:{' '}
                                  <span className="text-emerald-400 font-bold">{formatPrice(lineNet(sub))}</span>
                                  {Number(sub.refunded_amount) > 0 ? (
                                    <span className="ml-2 text-rose-400">
                                      Đã hoàn {formatPrice(Number(sub.refunded_amount))}
                                    </span>
                                  ) : null}
                                </p>
                                <div className="space-y-2">
                                  {(sub.items || []).map((item: IOrderItem) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center gap-3 bg-slate-900/60 p-2 rounded-xl border border-white/5"
                                    >
                                      <img
                                        src={itemThumb(item)}
                                        alt=""
                                        className="h-10 w-10 rounded-lg object-cover bg-slate-800"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-200 text-xs truncate">{item.product_name}</p>
                                        <p className="text-[10px] text-slate-500">
                                          {item.quantity} x {formatPrice(Number(item.price_snapshot))}
                                        </p>
                                      </div>
                                      <div className="flex flex-col gap-1 shrink-0">
                                        {sub.status === 'delivered' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setReviewRating(5);
                                              setReviewComment('');
                                              setReviewOrder({ orderId: order.id, item });
                                            }}
                                            className="text-[10px] font-bold text-indigo-400 hover:bg-indigo-500/10 px-2 py-1 rounded-lg transition"
                                          >
                                            Đánh giá
                                          </button>
                                        )}
                                        {sub.status === 'delivered' &&
                                          daysSince(sub.updated_at || sub.created_at) <= 7 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setReturnReason('Sản phẩm lỗi/hỏng');
                                                setReturnDesc('');
                                                setReturnOrder({ orderId: order.id, item });
                                              }}
                                              className="text-[10px] font-bold text-rose-400 hover:bg-rose-500/10 px-2 py-1 rounded-lg transition"
                                            >
                                              Trả hàng
                                            </button>
                                          )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {sub.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (
                                        confirm(
                                          `Hủy đơn shop "${sub.store_name || sub.sub_order_code}"? Tiền shop sẽ được hoàn (nếu đã trả bằng ví).`
                                        )
                                      ) {
                                        cancelSubOrderMutation.mutate(sub.id);
                                      }
                                    }}
                                    disabled={cancelSubOrderMutation.isPending}
                                    className="w-full mt-1 py-2 rounded-xl bg-rose-600/10 text-rose-400 text-[10px] font-bold border border-rose-500/20 hover:bg-rose-600/20 disabled:opacity-50"
                                  >
                                    Hủy từ shop này
                                  </button>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[10px] text-amber-500/90 uppercase tracking-widest">
                                Chưa có dữ liệu sub_order — hiển thị dòng đơn phẳng
                              </p>
                              {order.items?.map((item: IOrderItem, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-4 bg-slate-950/50 p-3 rounded-2xl border border-white/5"
                                >
                                  <img
                                    src={itemThumb(item)}
                                    alt=""
                                    className="h-12 w-12 rounded-xl object-cover bg-slate-800"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-200 text-sm truncate">{item.product_name}</p>
                                    <p className="text-xs text-slate-500">
                                      {item.quantity} x {formatPrice(Number(item.price_snapshot))}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    {order.status === 'delivered' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReviewRating(5);
                                          setReviewComment('');
                                          setReviewOrder({ orderId: order.id, item });
                                        }}
                                        className="text-[10px] font-bold text-indigo-400 hover:bg-indigo-500/10 px-2 py-1 rounded-lg transition"
                                      >
                                        Đánh giá
                                      </button>
                                    )}
                                    {order.status === 'delivered' &&
                                      daysSince(order.updated_at || order.created_at) <= 7 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setReturnReason('Sản phẩm lỗi/hỏng');
                                            setReturnDesc('');
                                            setReturnOrder({ orderId: order.id, item });
                                          }}
                                          className="text-[10px] font-bold text-rose-400 hover:bg-rose-500/10 px-2 py-1 rounded-lg transition"
                                        >
                                          Trả hàng
                                        </button>
                                      )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/5">
                        <p className="text-sm text-slate-400">
                          Tổng đơn cha:{' '}
                          <span className="text-lg font-black text-emerald-400 ml-1">
                            {formatPrice(Number(order.total_amount))}
                          </span>
                        </p>
                        <div className="flex gap-2">
                          {allSubOrdersPending(order) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Hủy toàn bộ đơn hàng (mọi shop đang chờ)?')) {
                                  cancelMutation.mutate(order.id);
                                }
                              }}
                              disabled={cancelMutation.isPending}
                              className="px-4 py-2 rounded-xl bg-rose-600/10 text-rose-400 text-xs font-bold border border-rose-500/20 hover:bg-rose-600/20 disabled:opacity-50"
                            >
                              Hủy đơn hàng
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700"
                          >
                            Chi tiết
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'wallet' && (
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
                walletHistory?.map(tx => {
                  const typeLabel = {
                    deposit: 'Nạp tiền',
                    withdraw: 'Rút tiền',
                    refund: 'Hoàn tiền',
                    payment: 'Thanh toán',
                  }[tx.type] || 'Giao dịch ví';
                  return (
                    <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-white/[0.02]">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-200">{typeLabel}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{new Date(tx.created_at).toLocaleString('vi-VN')}</p>
                      </div>
                      <p className={`font-black ${tx.type === 'deposit' || tx.type === 'refund' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tx.type === 'deposit' || tx.type === 'refund' ? '+' : '-'}{formatPrice(Math.abs(tx.amount))}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Wallet Summary & Topup */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-4xl p-8 text-white shadow-xl shadow-indigo-500/20">
              <p className="text-xs font-bold uppercase tracking-widest opacity-70">Số dư hiện tại</p>
              <h2 className="text-4xl font-black mt-2">{formatPrice(profileData?.wallet_balance ?? user?.wallet_balance ?? 0)}</h2>
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
                    onClick={() => {
                      if (confirm(`Bạn có muốn nạp nhanh ${formatPrice(amt)} vào ví không?`)) {
                        topupMutation.mutate(amt);
                      }
                    }}
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
              <img src={itemThumb(reviewOrder.item)} className="h-16 w-16 rounded-2xl object-cover" alt="" />
              <p className="font-bold text-sm text-slate-200 line-clamp-2">{reviewOrder.item.product_name}</p>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Số sao</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setReviewRating(s)}
                      className={`text-2xl transition ${reviewRating >= s ? '' : 'grayscale opacity-40'}`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
                rows={4}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 resize-none"
              />
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setReviewOrder(null)}
                className="flex-1 py-4 font-bold text-slate-400 hover:text-white transition"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={reviewMutation.isPending || !reviewOrder.item.product_id}
                onClick={() =>
                  reviewMutation.mutate({
                    order_id: reviewOrder.orderId,
                    product_id: reviewOrder.item.product_id,
                    stars: reviewRating,
                    comment: reviewComment.trim() || ' ',
                  })
                }
                className="flex-[2] rounded-3xl bg-indigo-600 py-4 font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50"
              >
                {reviewMutation.isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </div>
        </div>
      )}

      {returnOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-4xl p-8 max-w-md w-full space-y-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Yêu cầu trả hàng</h3>
            <div className="flex gap-4 items-center bg-slate-950 p-4 rounded-3xl">
              <img src={itemThumb(returnOrder.item)} className="h-16 w-16 rounded-2xl object-cover" alt="" />
              <p className="font-bold text-sm text-slate-200 line-clamp-2">{returnOrder.item.product_name}</p>
            </div>
            <p className="text-[10px] text-slate-500">
              Trong vòng 7 ngày kể từ khi shop cập nhật giao (theo đơn con). SL dòng: {returnOrder.item.quantity}.
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Lý do trả hàng</p>
                <select 
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-rose-500"
                >
                  <option value="Sản phẩm lỗi/hỏng">Sản phẩm lỗi/hỏng</option>
                  <option value="Không đúng mô tả">Không đúng mô tả</option>
                  <option value="Gửi sai hàng">Gửi sai hàng</option>
                  <option value="Lý do khác">Lý do khác</option>
                </select>
              </div>
              <textarea 
                value={returnDesc}
                onChange={(e) => setReturnDesc(e.target.value)}
                placeholder="Mô tả chi tiết tình trạng sản phẩm..." 
                rows={3} 
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-rose-500 resize-none" 
              />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setReturnOrder(null)} className="flex-1 py-4 font-bold text-slate-400 hover:text-white transition">Hủy bỏ</button>
              <button 
                type="button"
                disabled={returnMutation.isPending}
                onClick={() => {
                  returnMutation.mutate({ order_item_id: returnOrder.item.id, reason: returnReason, description: returnDesc });
                }} 
                className="flex-2 rounded-3xl bg-rose-600 py-4 font-bold text-white hover:bg-rose-500 transition disabled:opacity-50"
              >
                {returnMutation.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
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
                  <p>
                    <span className="text-slate-500">Phương thức:</span>{' '}
                    <span className="text-indigo-400 font-bold uppercase">
                      {(selectedOrder as { payment_method?: string }).payment_method || '—'}
                    </span>
                  </p>
                  <p><span className="text-slate-500">Tổng tiền:</span> <span className="text-emerald-400 font-black text-lg">{formatPrice(selectedOrder.total_amount)}</span></p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Theo shop (sub_order)</h4>
              {selectedOrder.sub_orders?.length ? (
                <div className="space-y-3">
                  {selectedOrder.sub_orders.map((sub: ISubOrder) => (
                    <div key={sub.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 space-y-2">
                      <div className="flex justify-between items-center gap-2">
                        <p className="text-sm font-bold text-slate-100">{sub.store_name || sub.sub_order_code}</p>
                        <OrderStatusBadge status={sub.status} />
                      </div>
                      {sub.tracking_number ? (
                        <p className="text-[10px] text-slate-500 font-mono">Tracking: {sub.tracking_number}</p>
                      ) : null}
                      <div className="space-y-1">
                        {(sub.items || []).map((item: IOrderItem) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 bg-slate-900/60 p-2 rounded-xl border border-white/5"
                          >
                            <img src={itemThumb(item)} alt="" className="h-9 w-9 rounded-lg object-cover bg-slate-800" />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-200 text-xs truncate">{item.product_name}</p>
                              <p className="text-[10px] text-slate-500">
                                {item.quantity} x {formatPrice(Number(item.price_snapshot))}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedOrder.items?.map((item: IOrderItem, idx: number) => (
                    <div key={idx} className="flex items-center gap-4 bg-slate-950/50 p-3 rounded-2xl border border-white/5">
                      <img src={itemThumb(item)} alt="" className="h-10 w-10 rounded-xl object-cover bg-slate-800" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-200 text-xs truncate">{item.product_name}</p>
                        <p className="text-[10px] text-slate-500">
                          {item.quantity} x {formatPrice(Number(item.price_snapshot))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="max-w-2xl mx-auto bg-slate-900 border border-white/5 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 border-b border-white/5">
            <h3 className="text-xl font-bold text-white">Thông tin cá nhân</h3>
            <p className="text-slate-500 text-sm mt-1">Cập nhật thông tin liên hệ của bạn để việc giao hàng thuận tiện hơn.</p>
          </div>
          
          {profileLoading ? (
            <div className="p-20 flex justify-center">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="p-8 space-y-8">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-4 py-4">
                <AvatarUpload
                  currentAvatarUrl={profileData?.avatar_url}
                  userName={profileData?.name || user?.name}
                />
                <div className="text-center">
                  <h4 className="text-white font-bold">{profileData?.name || user?.name}</h4>
                  <p className="text-slate-500 text-xs">{profileData?.email || user?.email}</p>
                </div>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  profileMutation.mutate({
                    name: (formData.get('name') as string) || null,
                    phone: (formData.get('phone') as string) || null,
                    address: (formData.get('address') as string) || null,
                  });
                }}
                className="space-y-6"
              >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Họ và tên</label>
                <input 
                  name="name"
                  defaultValue={profileData?.name || user?.name || ''}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition"
                  placeholder="Nhập họ và tên..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Email</label>
                <input 
                  disabled
                  value={profileData?.email || user?.email || ''}
                  className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-6 py-4 text-slate-500 outline-none cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Số điện thoại</label>
                <input 
                  name="phone"
                  defaultValue={profileData?.phone || ''}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition"
                  placeholder="098x xxx xxx"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Địa chỉ</label>
                <input 
                  name="address"
                  defaultValue={profileData?.address || ''}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition"
                  placeholder="Số nhà, tên đường, phường/xã..."
                />
              </div>
            </div>
            
            <div className="pt-4">
              <button 
                type="submit"
                disabled={profileMutation.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {profileMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
