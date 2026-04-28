import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../../shared-ui/src/lib/axios';

interface VendorStats {
  revenue: number;
  revenueGrowth: number;
  pendingOrders: number;
  lowStockCount: number;
  totalProducts: number;
}

const MetricCard = ({ label, value, sub, icon, accent }: { label: string; value: string; sub?: string; icon: string; accent: string }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={`text-3xl font-black mt-1 ${accent}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <span className="text-2xl">{icon}</span>
    </div>
  </div>
);

const VendorDashboard = () => {
  const { data: stats } = useQuery<VendorStats>({
    queryKey: ['vendor-stats'],
    queryFn: async () => (await axiosInstance.get('/vendor/stats')).data,
  });

  const { data: pendingOrders } = useQuery<any[]>({
    queryKey: ['vendor-orders', 'pending'],
    queryFn: async () => (await axiosInstance.get('/orders?status=pending&limit=5')).data,
  });

  const mockStats: VendorStats = { revenue: 48500000, revenueGrowth: 12.4, pendingOrders: 7, lowStockCount: 3, totalProducts: 142 };
  const mockOrders = [
    { id: '#VC001', buyer: 'Nguyễn Văn A', items: 3, amount: '1.250.000₫', time: '10 phút trước' },
    { id: '#VC002', buyer: 'Trần Thị B', items: 1, amount: '890.000₫', time: '35 phút trước' },
    { id: '#VC003', buyer: 'Lê Minh C', items: 2, amount: '2.100.000₫', time: '1 giờ trước' },
  ];

  const s = stats || mockStats;
  const orders = pendingOrders || mockOrders;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-100">Bảng Điều Khiển Vendor</h2>
        <p className="text-slate-500 text-sm mt-1">Dữ liệu kinh doanh trong tháng 4/2026</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Doanh thu tháng"
          value={`${(s.revenue / 1000000).toFixed(1)}M`}
          sub={`+${s.revenueGrowth}% so với tháng trước`}
          icon="💹"
          accent="text-emerald-400"
        />
        <MetricCard label="Đơn chờ xác nhận" value={String(s.pendingOrders)} sub="Cần xử lý ngay" icon="⏳" accent="text-amber-400" />
        <MetricCard label="Sản phẩm sắp hết" value={String(s.lowStockCount)} sub="Cần nhập kho" icon="⚠️" accent="text-rose-400" />
        <MetricCard label="Tổng sản phẩm" value={String(s.totalProducts)} icon="🗂" accent="text-indigo-400" />
      </div>

      {/* Pending Orders */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-200">Đơn hàng chờ xác nhận</h3>
            <span className="bg-amber-500/15 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">{s.pendingOrders}</span>
          </div>
          <button className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors font-semibold">
            Xem tất cả
          </button>
        </div>
        <div className="divide-y divide-slate-800">
          {orders.map((order: any) => (
            <div key={order.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200">{order.buyer}</p>
                <p className="text-xs text-slate-500">{order.id} · {order.items} sản phẩm · {order.time}</p>
              </div>
              <span className="text-sm font-bold text-emerald-400 flex-shrink-0">{order.amount}</span>
              <div className="flex gap-2 flex-shrink-0">
                <button className="text-xs bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-600/30 px-3 py-1.5 rounded-lg transition-colors font-semibold">
                  Xác nhận
                </button>
                <button className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-3 py-1.5 rounded-lg transition-colors">
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Low stock warning */}
      {s.lowStockCount > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex items-center gap-4">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-bold text-amber-400">Cảnh báo tồn kho thấp</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Có <strong className="text-amber-400">{s.lowStockCount} sản phẩm</strong> sắp hết hàng. Vui lòng nhập kho sớm để tránh ảnh hưởng doanh số.
            </p>
          </div>
          <button className="ml-auto text-xs bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-600/30 px-3 py-1.5 rounded-lg transition-colors font-semibold flex-shrink-0">
            Xem ngay
          </button>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;
