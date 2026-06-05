import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../../../../shared-ui/src/lib/axios';
import { getFullImageUrl } from '../../../../../shared-ui/src/lib/image-utils';
import type { IDisputeItem } from './DisputeList';
import ResolutionForm from './ResolutionForm';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=500&auto=format&fit=crop&q=60';

const DisputeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  // Fetch disputes list and find the matched item in memory
  const { data: disputes, isLoading, error } = useQuery<IDisputeItem[]>({
    queryKey: ['admin-disputes'],
    queryFn: async () => {
      const res = await axiosInstance.get('/admin/disputes');
      return res.data.data;
    },
  });

  const dispute = disputes?.find((item) => item.id === id);

  // Mutation to resolve the dispute
  const resolveMutation = useMutation({
    mutationFn: async ({ winner, admin_notes }: { winner: 'customer' | 'vendor'; admin_notes: string }) => {
      const res = await axiosInstance.post(`/admin/disputes/${id}/resolve`, {
        winner,
        admin_notes,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      alert('Đã ban hành quyết định phân xử thành công và đóng tranh chấp!');
      navigate('/disputes');
    },
    onError: (err: any) => {
      console.error('Resolve dispute error:', err);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra trong quá trình thực thi giao dịch.';
      alert(`Phân xử thất bại: ${errMsg}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium">Đang tải hồ sơ tranh chấp...</p>
      </div>
    );
  }

  if (error || !dispute) {
    return (
      <div className="space-y-4">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-6 py-4 rounded-xl text-sm font-medium">
          Không tìm thấy hồ sơ khiếu nại tranh chấp hoặc hồ sơ đã được xử lý.
        </div>
        <button
          onClick={() => navigate('/disputes')}
          className="text-sm text-indigo-400 hover:text-indigo-300 font-bold"
        >
          ← Quay lại danh sách
        </button>
      </div>
    );
  }

  const refundAmount = dispute.quantity * dispute.price_snapshot;

  // Process Images from JSONB/array
  let evidenceImages: string[] = [];
  if (dispute.images) {
    try {
      if (typeof dispute.images === 'string') {
        const parsed = JSON.parse(dispute.images);
        evidenceImages = Array.isArray(parsed) ? parsed : [parsed];
      } else if (Array.isArray(dispute.images)) {
        evidenceImages = dispute.images;
      } else {
        evidenceImages = [String(dispute.images)];
      }
    } catch {
      evidenceImages = [String(dispute.images)];
    }
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/disputes')}
            className="text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest flex items-center gap-1"
          >
            ← Quay lại danh sách
          </button>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-3">
            Hồ Sơ Tranh Chấp <span className="font-mono text-indigo-400">{dispute.order_code}</span>
          </h2>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
            Yêu cầu phân xử (Escalated)
          </span>
        </div>
      </div>

      {/* Info card of transaction */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm shadow-lg">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Khách Hàng</p>
          <p className="font-bold text-slate-200 mt-1">{dispute.buyer_name}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{dispute.buyer_email}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Cửa Hàng (Vendor)</p>
          <p className="font-bold text-slate-200 mt-1">{dispute.store_name}</p>
          <p className="text-xs text-slate-500 mt-0.5">Slug: {dispute.vendor_slug}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Sản Phẩm Trả Hàng</p>
          <p className="font-bold text-slate-200 mt-1 truncate">{dispute.product_name}</p>
          <p className="text-xs text-slate-500 mt-0.5">SL: {dispute.quantity} × {dispute.price_snapshot.toLocaleString('vi-VN')}đ</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Tổng Hoàn Tiền</p>
          <p className="text-base font-black text-emerald-400 mt-1">
            {refundAmount.toLocaleString('vi-VN')}đ
          </p>
        </div>
      </div>

      {/* Split screen comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left pane - Customer Claims */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl flex flex-col">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <span className="text-xl">👤</span>
            <div>
              <h3 className="font-bold text-slate-100">Yêu Cầu Từ Khách Hàng</h3>
              <p className="text-xs text-slate-500 mt-0.5">Bằng chứng và lý do hoàn tiền</p>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Lý do khiếu nại</p>
              <p className="text-sm font-semibold text-slate-200 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-850 mt-1.5 inline-block">
                {dispute.reason}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Mô tả tình trạng chi tiết</p>
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-950 px-4 py-3 rounded-xl border border-slate-850 mt-1.5">
                {dispute.description || 'Khách hàng không cung cấp mô tả chi tiết.'}
              </p>
            </div>

            {/* Evidence Gallery */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Hình ảnh bằng chứng thực tế</p>
              {evidenceImages.length === 0 ? (
                <p className="text-xs text-slate-650 italic">Không cung cấp hình ảnh đính kèm.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-1.5">
                  {evidenceImages.map((img, i) => {
                    const fullUrl = getFullImageUrl(img);
                    return (
                      <div
                        key={i}
                        onClick={() => setActiveLightboxImg(fullUrl)}
                        className="aspect-square bg-slate-950 border border-slate-850 rounded-xl overflow-hidden cursor-pointer hover:border-indigo-500 transition-colors group relative shadow-md"
                      >
                        <img
                          src={fullUrl}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = PLACEHOLDER_IMG;
                          }}
                          alt={`Evidence ${i + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        />
                        <div className="absolute inset-0 bg-indigo-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white font-bold">
                          🔍 Phóng to
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right pane - Vendor Rejections */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl flex flex-col">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <span className="text-xl">🏪</span>
            <div>
              <h3 className="font-bold text-slate-100">Phản Hồi Từ Người Bán</h3>
              <p className="text-xs text-slate-500 mt-0.5">Lý do từ chối yêu cầu hoàn tiền</p>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Lý do từ chối từ Shop</p>
              <div className="text-sm text-slate-300 leading-relaxed bg-slate-950 px-4 py-3.5 rounded-xl border border-rose-950/30 text-rose-300/90 font-medium mt-1.5">
                {dispute.reject_reason || 'Không cung cấp lý do từ chối từ chối cụ thể.'}
              </div>
            </div>

            <div className="bg-slate-950/50 border border-slate-850 rounded-xl p-4 space-y-3 mt-4 text-xs text-slate-400 leading-relaxed flex-1 flex flex-col justify-center">
              <p className="font-bold text-slate-300 flex items-center gap-1.5 text-[13px]">
                💡 Quy trình phân định tranh chấp:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-1">
                <li>Đối chiếu hình ảnh hàng nhận thực tế của khách hàng so với mô tả.</li>
                <li>Xem xét lý do phản bác từ người bán có thỏa đáng không.</li>
                <li>Lựa chọn hoàn trả tiền cho Khách hàng (Đồng thời hàng hoàn kho) hoặc Giữ nguyên tiền cho Cửa hàng.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Judgment Form */}
      <ResolutionForm
        refundAmount={refundAmount}
        customerName={dispute.buyer_name}
        vendorName={dispute.store_name}
        isSubmitting={resolveMutation.isPending}
        onSubmit={(winner, notes) => resolveMutation.mutate({ winner, admin_notes: notes })}
      />

      {/* Image Lightbox Modal */}
      {activeLightboxImg && (
        <div
          onClick={() => setActiveLightboxImg(null)}
          className="fixed inset-0 bg-slate-950/95 flex flex-col items-center justify-center z-50 p-4 animate-fadeIn cursor-zoom-out"
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Bấm bất kỳ đâu để đóng</span>
            <button
              onClick={() => setActiveLightboxImg(null)}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-lg p-2 transition font-bold"
            >
              ✕
            </button>
          </div>
          <img
            src={activeLightboxImg}
            alt="Evidence Detail View"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-slate-800"
          />
        </div>
      )}
    </div>
  );
};

export default DisputeDetail;
