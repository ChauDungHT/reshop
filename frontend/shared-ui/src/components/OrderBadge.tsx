import React from 'react';

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

interface OrderBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending: {
    label: 'Chờ xử lý',
    classes: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
  },
  confirmed: {
    label: 'Đã xác nhận',
    classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  },
  processing: {
    label: 'Đang đóng gói',
    classes: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
  },
  shipped: {
    label: 'Đang giao',
    classes: 'bg-sky-500/10 text-sky-400 border-sky-500/20'
  },
  delivered: {
    label: 'Đã giao',
    classes: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
  },
  cancelled: {
    label: 'Đã hủy',
    classes: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
  },
  returned: {
    label: 'Trả hàng',
    classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
};

const OrderBadge: React.FC<OrderBadgeProps> = ({ status, className = '' }) => {
  const config = statusConfig[status] || { label: status, classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };

  return (
    <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${config.classes} ${className}`}>
      {config.label}
    </span>
  );
};

export default OrderBadge;
