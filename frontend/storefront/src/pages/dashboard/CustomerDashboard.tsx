import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../../shared-ui/src/context/AuthContext';
import axiosInstance from '../../../../shared-ui/src/lib/axios';

interface OrderSummary { total: number; pending: number; delivering: number; completed: number; }
interface CustomerStats { orders: OrderSummary; voucherCount: number; points: number; }

const StatCard = ({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) => (
  <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors`}>
    <div className="flex items-center justify-between mb-4">
      <span className="text-2xl">{icon}</span>
      <span className={`text-xs font-bold px-2 py-1 rounded-full ${color}`}>Tháng này</span>
    </div>
    <p className="text-2xl font-black text-slate-100">{value}</p>
    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{label}</p>
  </div>
);

const OrderStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    pending: 'bg-amber-500/15 text-amber-400',
    delivering: 'bg-blue-500/15 text-blue-400',
    completed: 'bg-emerald-500/15 text-emerald-400',
    cancelled: 'bg-red-500/15 text-red-400',
  };
  const label: Record<string, string> = {
    pending: 'Chờ duyệt',
    delivering: 'Đang giao',
    completed: 'Đã nhận',
    cancelled: 'Đã hủy',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[status] || 'bg-slate-700 text-slate-300'}`}>
      {label[status] || status}
    </span>
  );
};

const CustomerDashboard = () => {
  const { user } = useAuth();

  // TanStack Query: fetch customer stats
  const { data: stats, isLoading: statsLoading } = useQuery<CustomerStats>({
    queryKey: ['customer-stats'],
    queryFn: async () => {
      const res = await axiosInstance.get('/customers/stats');
      return res.data;
    },
  });

  // TanStack Query: fetch recent orders
  const { data: recentOrders, isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ['customer-orders', 'recent'],
    queryFn: async () => {
      const res = await axiosInstance.get('/orders?limit=5');
      return res.data;
    },
  });

  const mockStats = { orders: { total: 24, pending: 2, delivering: 3, completed: 19 }, voucherCount: 5, points: 1240 };
  const mockOrders = [
    { id: '#DH001', product: 'Nike Air Max 270', amount: '1.850.000₫', status: 'delivering', date: '28/04/2026' },
    { id: '#DH002', product: 'Samsung Galaxy Buds', amount: '2.100.000₫', status: 'completed', date: '25/04/2026' },
    { id: '#DH003', product: 'Mechanical Keyboard', amount: '890.000₫', status: 'pending', date: '27/04/2026' },
  ];

  const s = stats || mockStats;
  const orders = recentOrders || mockOrders;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-black text-slate-100">
          Xin chào, <span className="text-indigo-400">{user?.name}</span> 👋
        </h2>
        <p className="text-slate-500 text-sm mt-1">Đây là tổng quan tài khoản của bạn hôm nay.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Tổng đơn hàng" value={s.orders.total} icon="📦" color="bg-indigo-500/15 text-indigo-400" />
        <StatCard label="Đang giao" value={s.orders.delivering} icon="🚚" color="bg-blue-500/15 text-blue-400" />
        <StatCard label="Voucher" value={s.voucherCount} icon="🎟" color="bg-violet-500/15 text-violet-400" />
        <StatCard label="Điểm tích lũy" value={s.points.toLocaleString()} icon="⭐" color="bg-amber-500/15 text-amber-400" />
      </div>

      {/* Recent Orders */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-200">Đơn hàng gần đây</h3>
          <a href="/orders" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Xem tất cả →</a>
        </div>
        {ordersLoading ? (
          <div className="p-8 text-center text-slate-500">Đang tải...</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {orders.map((order: any) => (
              <div key={order.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors">
                <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center text-lg flex-shrink-0">📦</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{order.product}</p>
                  <p className="text-xs text-slate-500">{order.id} · {order.date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-emerald-400">{order.amount}</p>
                  <div className="mt-1"><OrderStatusBadge status={order.status} /></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
