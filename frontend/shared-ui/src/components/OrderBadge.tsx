import React from 'react';

type OrderBadgeStatus = 'pending' | 'shipping' | 'cancelled';

type OrderBadgeProps = {
  status: OrderBadgeStatus;
};

const metadata: Record<OrderBadgeStatus, { label: string; className: string }> = {
  pending: {
    label: 'Chờ duyệt',
    className: 'rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800',
  },
  shipping: {
    label: 'Đang giao',
    className: 'rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-800',
  },
  cancelled: {
    label: 'Đã hủy',
    className: 'rounded-full border border-red-200 bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-800',
  },
};

const OrderBadge: React.FC<OrderBadgeProps> = ({ status }) => {
  const item = metadata[status];

  return <span className={item.className}>{item.label}</span>;
};

export default OrderBadge;
