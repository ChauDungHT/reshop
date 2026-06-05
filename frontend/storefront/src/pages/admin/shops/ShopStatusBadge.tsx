import React from 'react';

interface ShopStatusBadgeProps {
  status: string;
}

const ShopStatusBadge: React.FC<ShopStatusBadgeProps> = ({ status }) => {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: 'Đang hoạt động', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    inactive: { label: 'Chờ phê duyệt', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    banned: { label: 'Bị khóa', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
    pending: { label: 'Chờ phê duyệt', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    pending_approval: { label: 'Chờ phê duyệt', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  };

  const cfg = map[status] || { label: status, cls: 'bg-slate-700 text-slate-300 border-slate-600' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

export default ShopStatusBadge;
