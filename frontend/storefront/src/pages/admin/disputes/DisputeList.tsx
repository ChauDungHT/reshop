import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../../../shared-ui/src/lib/axios';

export interface IDisputeItem {
  id: string;
  reason: string;
  description: string;
  images: string[] | string | null;
  status: string;
  reject_reason: string;
  created_at: string;
  buyer_name: string;
  buyer_email: string;
  buyer_id: string;
  store_name: string;
  vendor_slug: string;
  vendor_id: string;
  order_code: string;
  product_name: string;
  quantity: number;
  price_snapshot: number;
}

const DisputeList = () => {
  const navigate = useNavigate();

  const { data: disputes, isLoading, error } = useQuery<IDisputeItem[]>({
    queryKey: ['admin-disputes'],
    queryFn: async () => {
      const res = await axiosInstance.get('/admin/disputes');
      return res.data.data;
    },
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-100">⚖️ Phân Xử Tranh Chấp</h2>
        <p className="text-slate-500 text-sm mt-1">
          Xem xét và giải quyết các khiếu nại hoàn tiền bị người bán từ chối đã được chuyển lên hệ thống.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Đang tải danh sách khiếu nại...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-6 py-4 rounded-xl text-sm font-medium">
          Có lỗi xảy ra khi tải dữ liệu khiếu nại. Vui lòng thử lại sau.
        </div>
      ) : !disputes || disputes.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-4">
          <span className="text-4xl">🎉</span>
          <p className="text-slate-300 font-bold">Không có tranh chấp nào cần xử lý</p>
          <p className="text-slate-500 text-xs max-w-sm">
            Tất cả các yêu cầu trả hàng/hoàn tiền đã được người bán đồng thuận hoặc tranh chấp đã phân xử hoàn tất.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Mã đơn hàng</th>
                  <th className="px-6 py-4">Khách hàng</th>
                  <th className="px-6 py-4">Cửa hàng</th>
                  <th className="px-6 py-4">Lý do khiếu nại</th>
                  <th className="px-6 py-4">Ngày yêu cầu</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                {disputes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-400">
                      {item.order_code}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-100">{item.buyer_name}</div>
                      <div className="text-xs text-slate-500">{item.buyer_email}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-200">
                      {item.store_name}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate">
                      <span className="px-2 py-1 rounded bg-slate-950 text-xs font-semibold text-slate-400 mr-2">
                        {item.reason}
                      </span>
                      <span className="text-slate-400 text-xs">{item.description}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/disputes/${item.id}`)}
                        className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg border border-indigo-500 transition shadow-lg inline-flex items-center gap-1.5"
                      >
                        ⚖️ Phân xử
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisputeList;
