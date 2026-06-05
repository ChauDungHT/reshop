import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@shared-ui/lib/axios';
import { DataTable, OrderBadge } from '@shared-ui/components';
import type { Column } from '@shared-ui/components/DataTable';
import VendorOrderUpdateModal from './VendorOrderUpdateModal';
import VendorOrderCancelModal from './VendorOrderCancelModal';

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price_snapshot: number;
}

interface Order {
  /** sub_order id — PUT /vendor/orders/:id/status */
  id: string;
  order_code: string;
  parent_order_code?: string;
  buyer_name: string;
  total_amount: number;
  parent_order_status: string;
  sub_order_status: string;
  created_at: string;
  tracking_code?: string | null;
  items: OrderItem[];
}

const VendorOrderList = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);

  const { data, isLoading, refetch } = useQuery<{ items: Order[], total: number }>({
    queryKey: ['vendor-orders', page, statusFilter],
    queryFn: async () => {
      const res = await axiosInstance.get('/vendor/orders', {
        params: { page, status: statusFilter, limit: 10 }
      });
      return res.data.data;
    }
  });

  const columns: Column<Order>[] = [
    {
      key: 'order_code',
      header: 'Mã đơn',
      render: (code, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-200">#{code}</span>
          {row.parent_order_code ? (
            <span className="text-[10px] text-slate-600">Đơn gốc #{row.parent_order_code}</span>
          ) : null}
          <span className="text-[10px] text-slate-500">{new Date(row.created_at).toLocaleString('vi-VN')}</span>
        </div>
      )
    },
    {
      key: 'buyer_name',
      header: 'Khách hàng',
      render: (name) => <span className="font-medium text-slate-300">{name}</span>
    },
    {
      key: 'items',
      header: 'Sản phẩm',
      render: (items: OrderItem[]) => (
        <div className="max-w-[200px]">
          <div className="text-xs text-slate-400 truncate">
            {items.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
          </div>
          <div className="text-[10px] text-slate-500">{items.length} mặt hàng</div>
        </div>
      )
    },
    {
      key: 'total_amount',
      header: 'Tổng tiền',
      render: (amount) => (
        <span className="font-bold text-emerald-400">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
        </span>
      )
    },
    {
      key: 'sub_order_status',
      header: 'Trạng thái shop',
      render: (sub_order_status: string) => <OrderBadge status={sub_order_status} />
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (_, row) => (
        <div className="flex gap-2">
          <button 
            onClick={() => setSelectedOrder(row)}
            className="text-[10px] bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-all font-bold uppercase tracking-tight"
          >
            Cập nhật
          </button>
          {(row.sub_order_status === 'pending' || row.sub_order_status === 'confirmed') && (
            <button 
              onClick={() => setOrderToCancel(row)}
              className="text-[10px] bg-rose-500/10 text-rose-400 px-3 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/20 transition-all font-bold uppercase tracking-tight"
            >
              Hủy đơn
            </button>
          )}
        </div>
      )
    }
  ];

  const tabs = [
    { id: 'all', label: 'Tất cả' },
    { id: 'pending', label: 'Chờ duyệt' },
    { id: 'confirmed', label: 'Đã xác nhận' },
    { id: 'processing', label: 'Đang xử lý' },
    { id: 'shipped', label: 'Đang giao' },
    { id: 'delivered', label: 'Đã giao' },
    { id: 'cancelled', label: 'Đã hủy' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Quản Lý Đơn Hàng</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Theo dõi và xử lý các đơn hàng từ khách hàng của bạn.</p>
        </div>
        <div className="flex gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
           <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
           Tự động cập nhật
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setStatusFilter(tab.id); setPage(1); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-t-xl ${
              statusFilter === tab.id 
                ? 'bg-slate-800 text-indigo-400 border-b-2 border-indigo-500' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable 
        columns={columns}
        data={data?.items || []}
        loading={isLoading}
        pagination={{
          total: data?.total || 0,
          page,
          limit: 10,
          onPageChange: (p) => setPage(p)
        }}
        emptyText="Không tìm thấy đơn hàng nào."
      />

      {selectedOrder && (
        <VendorOrderUpdateModal 
          subOrder={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSuccess={() => {
            setSelectedOrder(null);
            refetch();
          }}
        />
      )}

      {orderToCancel && (
        <VendorOrderCancelModal 
          order={orderToCancel}
          onClose={() => setOrderToCancel(null)}
          onSuccess={() => {
            setOrderToCancel(null);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default VendorOrderList;
