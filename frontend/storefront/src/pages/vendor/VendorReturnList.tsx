import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@shared-ui/lib/axios';
import { DataTable } from '@shared-ui/components';
import type { Column } from '@shared-ui/components/DataTable';
import VendorReturnRejectModal from './VendorReturnRejectModal';

interface ReturnRequest {
  id: string;
  order_item_id: string;
  product_name: string;
  buyer_name: string;
  quantity: number;
  price_snapshot: number;
  reason: string;
  description?: string;
  status: 'pending_vendor' | 'approved' | 'rejected' | 'pending_admin';
  created_at: string;
  reject_reason?: string;
}

const VendorReturnList = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(null);

  const { data: requests, isLoading, refetch } = useQuery<ReturnRequest[]>({
    queryKey: ['vendor-returns', statusFilter],
    queryFn: async () => {
      const res = await axiosInstance.get('/vendor/returns', {
        params: { status: statusFilter }
      });
      return res.data.data.items;
    }
  });

  const handleApprove = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn duyệt yêu cầu trả hàng này? Tiền sẽ được hoàn lại cho khách hàng ngay lập tức.')) return;
    try {
      await axiosInstance.put(`/vendor/returns/${id}/approve`);
      alert('Đã duyệt yêu cầu trả hàng thành công.');
      refetch();
    } catch (err) {
      console.error('Approve return error:', err);
      alert('Có lỗi xảy ra khi duyệt yêu cầu.');
    }
  };

  const columns: Column<ReturnRequest>[] = [
    {
      key: 'product_name',
      header: 'Sản phẩm',
      render: (name, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-200 line-clamp-1">{name}</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-tight">SL: {row.quantity}</span>
        </div>
      )
    },
    {
      key: 'buyer_name',
      header: 'Khách hàng',
      render: (name) => <span className="font-medium text-slate-300">{name}</span>
    },
    {
      key: 'reason',
      header: 'Lý do & Mô tả',
      render: (reason, row) => (
        <div className="max-w-[200px]">
          <div className="text-xs font-bold text-rose-400">{reason}</div>
          {row.description && <div className="text-[10px] text-slate-500 line-clamp-2 italic">{row.description}</div>}
        </div>
      )
    },
    {
      key: 'price_snapshot',
      header: 'Hoàn tiền',
      render: (price, row) => (
        <span className="font-bold text-emerald-400">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price * row.quantity)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (status) => {
        const config: any = {
          pending_vendor: { label: 'Chờ duyệt', classes: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
          approved: { label: 'Đã duyệt', classes: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
          rejected: { label: 'Từ chối', classes: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
          pending_admin: { label: 'Admin xử lý', classes: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' }
        };
        const c = config[status] || { label: status, classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
        return <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${c.classes}`}>{c.label}</span>;
      }
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (_, row) => (
        <div className="flex gap-2">
          {row.status === 'pending_vendor' && (
            <>
              <button 
                onClick={() => handleApprove(row.id)}
                className="text-[10px] bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all font-bold uppercase"
              >
                Duyệt
              </button>
              <button 
                onClick={() => setSelectedRequest(row)}
                className="text-[10px] bg-rose-500/10 text-rose-400 px-3 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/20 transition-all font-bold uppercase"
              >
                Từ chối
              </button>
            </>
          )}
          {row.status === 'rejected' && (
             <div className="text-[10px] text-slate-500 italic max-w-[150px] truncate" title={row.reject_reason}>
                Lý do: {row.reject_reason}
             </div>
          )}
        </div>
      )
    }
  ];

  const tabs = [
    { id: 'all', label: 'Tất cả' },
    { id: 'pending_vendor', label: 'Chờ duyệt' },
    { id: 'approved', label: 'Đã duyệt' },
    { id: 'rejected', label: 'Đã từ chối' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Yêu Cầu Trả Hàng</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium italic">Xem và xử lý các yêu cầu hoàn tiền từ khách hàng.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-t-xl ${
              statusFilter === tab.id 
                ? 'bg-slate-800 text-rose-400 border-b-2 border-rose-500' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable 
        columns={columns}
        data={requests || []}
        loading={isLoading}
        emptyText="Không có yêu cầu trả hàng nào."
      />

      {selectedRequest && (
        <VendorReturnRejectModal 
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onSuccess={() => {
            setSelectedRequest(null);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default VendorReturnList;
