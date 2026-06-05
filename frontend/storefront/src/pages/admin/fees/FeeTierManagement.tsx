import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../../../../shared-ui/src/lib/axios';

interface IFeeTierItem {
  id: string;
  fee_name: string;
  fee_type: 'percentage' | 'fixed';
  fee_value: string;
}

interface IFeeTier {
  id: string;
  tier_name: string;
  description: string;
  items: IFeeTierItem[];
}

interface IShopFeeItem {
  id: string;
  store_name: string;
  slug: string;
  status: string;
  fee_tier_id: string | null;
  fee_tier_name: string | null;
  owner_name: string;
  owner_email: string;
}

const FeeTierManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingShop, setEditingShop] = useState<IShopFeeItem | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 1. Fetch all fee tiers
  const { data: tiers, isLoading: isTiersLoading } = useQuery<IFeeTier[]>({
    queryKey: ['admin-fee-tiers'],
    queryFn: async () => {
      const res = await axiosInstance.get('/admin/fees/tiers');
      return res.data.data;
    },
  });

  // 2. Fetch all shops with their fee tier
  const { data: shops, isLoading: isShopsLoading } = useQuery<IShopFeeItem[]>({
    queryKey: ['admin-shops-fees'],
    queryFn: async () => {
      const res = await axiosInstance.get('/admin/fees/shops');
      return res.data.data;
    },
  });

  // 3. Mutation to update shop fee tier
  const updateTierMutation = useMutation({
    mutationFn: async ({ shopId, feeTierId }: { shopId: string; feeTierId: string }) => {
      await axiosInstance.put(`/admin/fees/shops/${shopId}`, { fee_tier_id: feeTierId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shops-fees'] });
      setSuccessMessage('Cập nhật hạng phí thành công!');
      setEditingShop(null);
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật.');
      setTimeout(() => setErrorMessage(''), 4000);
    },
  });

  const handleEditClick = (shop: IShopFeeItem) => {
    setEditingShop(shop);
    setSelectedTierId(shop.fee_tier_id || '');
  };

  const handleSave = () => {
    if (editingShop && selectedTierId) {
      updateTierMutation.mutate({
        shopId: editingShop.id,
        feeTierId: selectedTierId,
      });
    }
  };

  const formatFeeValue = (item: IFeeTierItem) => {
    if (item.fee_type === 'percentage') {
      return `${parseFloat(item.fee_value)}%`;
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
      parseFloat(item.fee_value)
    );
  };

  const isLoading = isTiersLoading || isShopsLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-100">💸 Quản Lý Cấu Hình Phí</h2>
        <p className="text-slate-500 text-sm mt-1">
          Xem thông tin chi tiết các hạng phí giao dịch trên sàn và gán hạng phí phù hợp cho từng gian hàng.
        </p>
      </div>

      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-4 rounded-xl text-sm font-medium">
          ✅ {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-6 py-4 rounded-xl text-sm font-medium">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Available Tiers Cards */}
      <div>
        <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
          <span>🏷️</span> Hạng Phí Giao Dịch Hiện Tại
        </h3>
        
        {isTiersLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((n) => (
              <div key={n} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 h-40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tiers?.map((tier) => (
              <div
                key={tier.id}
                className="relative overflow-hidden bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-6 shadow-xl flex flex-col justify-between"
              >
                {/* Background Decorative Gradient */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl" />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-bold text-slate-100">{tier.tier_name}</h4>
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Active
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mb-4">{tier.description}</p>
                </div>

                <div className="border-t border-slate-800/80 pt-4 space-y-2.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Cấu hình phí chi tiết</span>
                  <div className="grid grid-cols-2 gap-3">
                    {tier.items.map((item) => (
                      <div key={item.id} className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50">
                        <div className="text-[10px] text-slate-500 truncate">{item.fee_name}</div>
                        <div className="text-sm font-black text-rose-400 mt-0.5">{formatFeeValue(item)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shops Fee Tier List */}
      <div>
        <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
          <span>🏪</span> Thiết Lập Gói Phí Của Gian Hàng
        </h3>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Đang tải cấu hình gian hàng...</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-5 py-4">Tên Cửa Hàng</th>
                    <th className="px-5 py-4">Chủ Gian Hàng</th>
                    <th className="px-5 py-4">Hạng Phí Hiện Tại</th>
                    <th className="px-5 py-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                  {shops && shops.length > 0 ? (
                    shops.map((shop) => (
                      <tr key={shop.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4">
                          <div>
                            <div className="font-semibold text-slate-100">{shop.store_name}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">/{shop.slug}</div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div>
                            <div className="font-medium text-slate-200">{shop.owner_name}</div>
                            <div className="text-xs text-slate-500">{shop.owner_email}</div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-950/60 border border-slate-800 text-rose-400">
                            {shop.fee_tier_name || 'Hạng Thường (Mặc định)'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            id={`change-tier-btn-${shop.id}`}
                            onClick={() => handleEditClick(shop)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
                          >
                            ⚙️ Đổi Hạng Phí
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-16 text-center text-slate-500">
                        Không tìm thấy gian hàng nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Fee Tier Modal */}
      {editingShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-100">⚙️ Thiết Lập Hạng Phí</h3>
              <button
                onClick={() => setEditingShop(null)}
                className="text-slate-500 hover:text-slate-300 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium">Gian hàng</span>
                <p className="text-slate-200 font-bold text-base">{editingShop.store_name}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium">Chọn hạng phí áp dụng</span>
                <select
                  id="fee-tier-select"
                  value={selectedTierId}
                  onChange={(e) => setSelectedTierId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="" disabled>-- Chọn gói hạng phí --</option>
                  {tiers?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tier_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800/80">
                <button
                  onClick={() => setEditingShop(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all"
                >
                  Hủy
                </button>
                <button
                  id="confirm-save-tier-btn"
                  onClick={handleSave}
                  disabled={updateTierMutation.isPending || !selectedTierId}
                  className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {updateTierMutation.isPending && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeTierManagement;
