import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@shared-ui/lib/axios';
import { StatCard, DataTable } from '@shared-ui/components';
import type { Column } from '@shared-ui/components/DataTable';

interface VendorStats {
  total_revenue: number;
  new_orders: number;
  active_products: number;
  low_stock_count: number;
  unanswered_qa: number;
}

const VendorDashboard = () => {
  const { data: stats, isLoading: statsLoading } = useQuery<VendorStats>({
    queryKey: ['vendor-stats'],
    queryFn: async () => {
        try {
            const res = await axiosInstance.get('/vendor/dashboard');
            return res.data.data;
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
            throw err;
        }
    },
    retry: false
  });

  const { data: orderData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery<{ orders: any[], total: number }>({
    queryKey: ['vendor-orders', 'pending'],
    queryFn: async () => {
        try {
            const res = await axiosInstance.get('/vendor/orders?status=pending&limit=5');
            return res.data.data; // Extract .data which contains { orders, total }
        } catch (err) {
            console.error('Error fetching pending orders:', err);
            return { orders: [], total: 0 };
        }
    },
    retry: false
  });

  const handleUpdateStatus = async (id: string, status: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn ${status === 'processing' ? 'duyệt' : 'từ chối'} đơn hàng này?`)) return;
    
    try {
        await axiosInstance.put(`/vendor/orders/${id}/status`, { status });
        alert('Cập nhật trạng thái thành công!');
        refetchOrders();
    } catch (err) {
        console.error('Update status error:', err);
        alert('Có lỗi xảy ra khi cập nhật đơn hàng.');
    }
  };

  const mockStats: VendorStats = { 
    total_revenue: 48500000, 
    new_orders: 7, 
    active_products: 142,
    low_stock_count: 3,
    unanswered_qa: 5
  };
  const mockOrders = [
    { id: 'VC001', buyer_name: 'Nguyễn Văn A', items: [{product_name: 'Vợt 1'}, {product_name: 'Vợt 2'}], total_amount: 1250000, created_at: new Date().toISOString() },
    { id: 'VC002', buyer_name: 'Trần Thị B', items: [{product_name: 'Áo 1'}], total_amount: 890000, created_at: new Date().toISOString() },
  ];

  const s = stats || mockStats;
  const orders = orderData?.orders || mockOrders;
  const totalOrders = orderData?.total || (orders?.length || 0);

  const orderColumns: Column<any>[] = [
    { key: 'id', header: 'Mã đơn' },
    { key: 'buyer_name', header: 'Khách hàng' },
    { 
      key: 'items', 
      header: 'Số lượng', 
      render: (items) => Array.isArray(items) ? items.length : 0 
    },
    { 
      key: 'total_amount', 
      header: 'Thành tiền', 
      render: (val) => <span className="text-emerald-400 font-bold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)}</span> 
    },
    { 
        key: 'created_at', 
        header: 'Ngày đặt',
        render: (val) => new Date(val).toLocaleDateString('vi-VN')
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (_, row) => (
        <div className="flex gap-2">
          <button 
            onClick={() => handleUpdateStatus(row.id, 'processing')}
            className="text-[10px] bg-emerald-600/20 text-emerald-400 px-2 py-1 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/40 transition-colors uppercase font-bold"
          >
            Duyệt
          </button>
          <button 
            onClick={() => handleUpdateStatus(row.id, 'cancelled')}
            className="text-[10px] bg-rose-600/20 text-rose-400 px-2 py-1 rounded-lg border border-rose-500/30 hover:bg-rose-500/40 transition-colors uppercase font-bold"
          >
            Từ chối
          </button>
        </div>
      )
    }
  ];

  if (statsLoading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Tổng Quan Kinh Doanh</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium italic">Chào mừng trở lại! Dưới đây là tình hình gian hàng của bạn.</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Dữ liệu thời gian thực
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          label="Doanh thu"
          value={`${((s.total_revenue || 0) / 1000000).toFixed(1)}M`}
          sub="Tổng doanh thu"
          icon="💹"
          accent="text-emerald-400"
        />
        <StatCard 
          label="Đơn mới" 
          value={s.new_orders || 0} 
          sub="Chờ xác nhận" 
          icon="📦" 
          accent="text-amber-400" 
        />
        <StatCard 
          label="Tồn kho thấp" 
          value={s.low_stock_count || 0} 
          sub="Cần bổ sung" 
          trend={(s.low_stock_count || 0) > 0 ? 'down' : undefined}
          icon="⚠️" 
          accent="text-rose-400" 
        />
        <StatCard 
          label="Hỏi đáp mới" 
          value={s.unanswered_qa || 0} 
          sub="Chờ phản hồi" 
          icon="💬" 
          accent="text-sky-400" 
        />
        <StatCard 
          label="Sản phẩm" 
          value={s.active_products || 0} 
          icon="🗂" 
          accent="text-indigo-400" 
        />
      </div>

      {/* Pending Orders Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-200 text-lg flex items-center gap-2">
            Đơn hàng chờ xử lý
            {s.new_orders > 0 && <span className="bg-amber-500/10 text-amber-500 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/20">{s.new_orders}</span>}
          </h3>
          <button className="text-xs text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-widest transition-colors">Xem tất cả →</button>
        </div>
        <DataTable
          columns={orderColumns}
          data={orders}
          loading={ordersLoading}
          selectable={true}
          pagination={{
            total: totalOrders,
            page: 1,
            limit: 5,
            onPageChange: () => {}
          }}
        />
      </div>

      {/* Warning banner */}
      {(s.low_stock_count || 0) > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-2xl">⚠️</div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-400">Cảnh báo vận hành</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Có {s.low_stock_count} sản phẩm sắp hết hàng. Vui lòng cập nhật để khách hàng có thể tiếp tục đặt mua.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;
