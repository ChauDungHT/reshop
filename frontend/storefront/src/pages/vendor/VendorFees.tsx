import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@shared-ui/lib/axios';
import type { IApiResponse } from '@shared-ui/types';

interface FeeItem {
  id: string;
  fee_name: string;
  fee_type: 'percentage' | 'fixed';
  fee_value: string;
}

interface VendorFeeData {
  vendor_id: string;
  store_name: string;
  fee_tier_id: string;
  tier_name: string;
  description: string;
  items: FeeItem[];
}

const VendorFees: React.FC = () => {
  const { data: feeData, isLoading, error } = useQuery<VendorFeeData>({
    queryKey: ['vendor-fees'],
    queryFn: async () => {
      const res = await axiosInstance.get<IApiResponse<VendorFeeData>>('/vendor/fees');
      return res.data.data;
    },
    retry: false,
  });

  const formatFeeValue = (item: FeeItem) => {
    const val = parseFloat(item.fee_value);
    if (item.fee_type === 'percentage') {
      return `${val}%`;
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !feeData) {
    return (
      <div className="p-8 text-center text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
        Có lỗi xảy ra khi tải thông tin biểu phí sản phẩm. Vui lòng thử lại sau.
      </div>
    );
  }

  const isVerifiedTier = feeData.tier_name === 'Hạng Đã Xác Thực';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      <div>
        <h2 className="text-2xl font-black text-slate-100 tracking-tight uppercase tracking-widest">
          Phí Sản Phẩm
        </h2>
        <p className="text-slate-500 text-sm mt-1 font-medium italic">
          Xem thông tin gói biểu phí và tỷ lệ khấu trừ được áp dụng cho gian hàng của bạn.
        </p>
      </div>

      {/* Fee Tier Card */}
      <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💸</span>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Gói Phí Hiện Tại</span>
              <h3 className="text-xl font-bold text-white mt-0.5 flex items-center gap-2">
                {feeData.tier_name}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  isVerifiedTier 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                }`}>
                  {isVerifiedTier ? 'Ưu đãi cao' : 'Hạng Thường'}
                </span>
              </h3>
            </div>
          </div>
          <p className="text-sm text-slate-400 max-w-xl pl-10">
            {feeData.description}
          </p>
        </div>

        {!isVerifiedTier && (
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 max-w-sm shrink-0">
            <p className="text-xs font-bold text-indigo-400 flex items-center gap-1">
              ✨ Nâng cấp lên Hạng Đã Xác Thực
            </p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Hoàn thành xác minh danh tính gian hàng (KYC) trong phần Hồ sơ để được Admin duyệt nâng cấp hạng phí, hưởng mức phí chiết khấu thấp hơn.
            </p>
          </div>
        )}
      </div>

      {/* Detailed Fee Structure Table */}
      <div className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-white/5">
          <h3 className="font-bold text-slate-200 text-base">Chi tiết các khoản phí khấu trừ</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-white/5">
                <th className="px-6 py-4">Tên loại phí</th>
                <th className="px-6 py-4">Phương thức tính</th>
                <th className="px-6 py-4 text-right">Mức phí áp dụng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {feeData.items && feeData.items.length > 0 ? (
                feeData.items.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-200">
                      {item.fee_name}
                    </td>
                    <td className="px-6 py-4">
                      {item.fee_type === 'percentage' ? (
                        <span className="bg-sky-500/10 text-sky-400 text-xs px-2 py-0.5 rounded-md border border-sky-500/15">
                          Theo phần trăm doanh thu
                        </span>
                      ) : (
                        <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded-md border border-amber-500/15">
                          Cố định trên mỗi đơn hàng
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-rose-400 text-base">
                      {formatFeeValue(item)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-slate-500 italic">
                    Chưa cấu hình chi tiết biểu phí cho hạng này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Explainer Section */}
      <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-6 md:p-8 space-y-4">
        <h4 className="font-bold text-indigo-300 text-sm uppercase tracking-wider flex items-center gap-2">
          ℹ️ Cơ chế khấu trừ và quyết toán tài chính
        </h4>
        <div className="grid md:grid-cols-2 gap-6 text-xs text-slate-400 leading-relaxed">
          <div className="space-y-2">
            <p className="font-bold text-slate-300">1. Cách tính số tiền thực nhận</p>
            <p>
              Khi một đơn hàng được hoàn tất, hệ thống sẽ tự động tính toán tổng số tiền phí khấu trừ bằng tổng của các loại phí cố định cộng với phí theo phần trăm doanh thu sản phẩm.
            </p>
            <p className="bg-slate-950/40 p-2.5 rounded-xl border border-white/5 text-slate-300 font-mono">
              Thực nhận = Doanh thu thô - Tổng phí sàn
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-bold text-slate-300">2. Cột mốc quyết toán (Tất toán ví)</p>
            <p>
              Số tiền thực nhận sẽ được chuyển vào ngăn đóng băng (Pending Balance) khi giao hàng. Tiền được cộng vào số dư khả dụng (Available Balance) để rút khi:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Khách hàng chủ động nhấn xác nhận đã nhận hàng.</li>
              <li>Sau 72 giờ kể từ lúc giao hàng thành công mà không phát sinh khiếu nại/trả hàng.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorFees;
