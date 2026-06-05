import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../../../../shared-ui/src/lib/axios';
import type { IPaginatedData } from '../../../../../shared-ui/src/types/api';
import ShopStatusBadge from './ShopStatusBadge';
import VendorApprovalModal from './VendorApprovalModal';
import type { IPendingVendorItem } from './VendorApprovalModal';

// Types matching the backend response for GET /api/admin/shops
export interface IAdminShopItem {
  id: string;
  store_name: string;
  slug: string;
  status: 'active' | 'inactive' | 'banned';
  created_at: string;
  owner_name: string;
  owner_email: string;
  products_count: number;
  sales_amount: number;
}

type TabType = 'all' | 'active' | 'pending' | 'banned';
const DEBOUNCE_MS = 300;

const ShopOversight: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [approvalTarget, setApprovalTarget] = useState<IPendingVendorItem | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<IAdminShopItem | null>(null);
  const [statusErrorMsg, setStatusErrorMsg] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when switching tabs/searching
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  // 1. Query for standard shops list (All, Active, Banned)
  const {
    data: shopsData,
    isLoading: isShopsLoading,
    isError: isShopsError,
  } = useQuery<IPaginatedData<IAdminShopItem>>({
    queryKey: ['admin-shops', debouncedSearch, activeTab, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');

      if (debouncedSearch) {
        params.set('q', debouncedSearch);
      }

      // Map tab filter to status query param
      if (activeTab === 'active') params.set('status', 'active');
      if (activeTab === 'banned') params.set('status', 'banned');

      const res = await axiosInstance.get(`/admin/shops?${params.toString()}`);
      return res.data.data;
    },
    enabled: activeTab !== 'pending',
    placeholderData: (prev) => prev,
  });

  // 2. Query for pending vendors
  const {
    data: pendingData,
    isLoading: isPendingLoading,
    isError: isPendingError,
  } = useQuery<IPaginatedData<IPendingVendorItem>>({
    queryKey: ['admin-pending-vendors', debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      // note: the pending vendors endpoint might not support full text search natively in the same way,
      // but let's pass it anyway or handle it gracefully.
      if (debouncedSearch) {
        params.set('q', debouncedSearch);
      }
      const res = await axiosInstance.get(`/admin/vendors/pending?${params.toString()}`);
      return res.data.data;
    },
    enabled: activeTab === 'pending',
    placeholderData: (prev) => prev,
  });

  // Status mutation (Activate/Deactivate/Ban)
  const statusMutation = useMutation({
    mutationFn: async ({ shopId, nextStatus }: { shopId: string; nextStatus: 'active' | 'banned' }) => {
      await axiosInstance.patch(`/admin/shops/${shopId}/status`, { status: nextStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shops'] });
      setDeactivateTarget(null);
      setStatusErrorMsg('');
    },
    onError: (err: any) => {
      setStatusErrorMsg(err?.response?.data?.message || 'Không thể cập nhật trạng thái cửa hàng.');
    },
  });

  const handleToggleStatus = (shop: IAdminShopItem) => {
    setStatusErrorMsg('');
    if (shop.status === 'active') {
      // Need confirmation modal
      setDeactivateTarget(shop);
    } else {
      // Direct activation
      statusMutation.mutate({ shopId: shop.id, nextStatus: 'active' });
    }
  };

  const handleConfirmDeactivate = () => {
    if (deactivateTarget) {
      statusMutation.mutate({ shopId: deactivateTarget.id, nextStatus: 'banned' });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const isLoading = activeTab === 'pending' ? isPendingLoading : isShopsLoading;
  const isError = activeTab === 'pending' ? isPendingError : isShopsError;
  const totalItems = activeTab === 'pending' ? pendingData?.total || 0 : shopsData?.total || 0;
  const totalPages = activeTab === 'pending' ? pendingData?.total_pages || 0 : shopsData?.total_pages || 0;
  const itemsList = activeTab === 'pending' ? pendingData?.items || [] : shopsData?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-100">🏪 Quản Lý Gian Hàng</h2>
        <p className="text-slate-500 text-sm mt-1">
          Giám sát hoạt động của các gian hàng, phê duyệt cửa hàng đăng ký mới và điều chỉnh trạng thái hoạt động.
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-800 gap-1 overflow-x-auto">
        {[
          { type: 'all', label: 'Tất cả' },
          { type: 'active', label: 'Đang hoạt động' },
          { type: 'pending', label: 'Chờ phê duyệt' },
          { type: 'banned', label: 'Bị khóa' },
        ].map((tab) => {
          const isActive = activeTab === tab.type;
          return (
            <button
              key={tab.type}
              id={`tab-btn-${tab.type}`}
              onClick={() => handleTabChange(tab.type as TabType)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all shrink-0 ${
                isActive
                  ? 'border-rose-500 text-rose-400 font-bold bg-rose-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[280px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
          <input
            id="shop-search-input"
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Tìm kiếm theo tên cửa hàng, chủ shop hoặc email..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
          />
        </div>
      </div>

      {/* Dynamic Count Bar */}
      {!isLoading && !isError && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="text-slate-300 font-semibold">{totalItems}</span> gian hàng được tìm thấy
          {(debouncedSearch || activeTab !== 'all') && (
            <button
              onClick={() => { setSearch(''); setActiveTab('all'); setPage(1); }}
              className="text-rose-400 hover:text-rose-300 font-semibold ml-1 transition-colors"
            >
              × Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {/* Main Grid/Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Đang tải danh sách gian hàng...</p>
        </div>
      ) : isError ? (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-6 py-4 rounded-xl text-sm font-medium">
          ⚠️ Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="px-5 py-4">Tên Cửa Hàng</th>
                  <th className="px-5 py-4">Chủ Sở Hữu</th>
                  <th className="px-5 py-4">Ngày Tham Gia</th>
                  {activeTab !== 'pending' && (
                    <>
                      <th className="px-5 py-4 text-center">Sản Phẩm</th>
                      <th className="px-5 py-4 text-right">Doanh Thu</th>
                    </>
                  )}
                  <th className="px-5 py-4">Trạng Thái</th>
                  <th className="px-5 py-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                {itemsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-4xl">🔍</span>
                        <span>Không tìm thấy gian hàng nào</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  itemsList.map((item: any) => {
                    const isPendingType = activeTab === 'pending';
                    const shopId = isPendingType ? item.vendor_id : item.id;
                    const name = isPendingType ? item.store_name : item.store_name;
                    const ownerName = isPendingType ? item.name : item.owner_name;
                    const ownerEmail = isPendingType ? item.email : item.owner_email;
                    const date = isPendingType ? item.vendor_created_at : item.created_at;
                    const status = isPendingType ? 'pending' : item.status;

                    return (
                      <tr key={shopId} className="hover:bg-slate-800/40 transition-colors group">
                        {/* Store Name & Slug */}
                        <td className="px-5 py-4">
                          <div>
                            <div className="font-semibold text-slate-100">{name}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">/{item.slug}</div>
                          </div>
                        </td>

                        {/* Owner Info */}
                        <td className="px-5 py-4">
                          <div>
                            <div className="font-medium text-slate-200">{ownerName}</div>
                            <div className="text-xs text-slate-500">{ownerEmail}</div>
                          </div>
                        </td>

                        {/* Join Date */}
                        <td className="px-5 py-4 text-xs text-slate-400">
                          {formatDate(date)}
                        </td>

                        {/* Stats - Products Count */}
                        {!isPendingType && (
                          <td className="px-5 py-4 text-center font-semibold text-slate-200">
                            {item.products_count}
                          </td>
                        )}

                        {/* Stats - Total Revenue */}
                        {!isPendingType && (
                          <td className="px-5 py-4 text-right font-bold text-slate-100">
                            {formatCurrency(item.sales_amount || 0)}
                          </td>
                        )}

                        {/* Status */}
                        <td className="px-5 py-4">
                          <ShopStatusBadge status={status} />
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPendingType ? (
                              <button
                                id={`review-btn-${shopId}`}
                                onClick={() => setApprovalTarget(item)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-950/20 transition-all"
                              >
                                🔍 Xem Hồ Sơ & Duyệt
                              </button>
                            ) : (
                              <button
                                id={`toggle-status-btn-${shopId}`}
                                onClick={() => handleToggleStatus(item)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                  item.status === 'active'
                                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                }`}
                              >
                                {item.status === 'active' ? '🔒 Khóa Cửa Hàng' : '🔓 Kích Hoạt'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="border-t border-slate-800 px-5 py-4 flex items-center justify-between bg-slate-950/50">
              <span className="text-xs text-slate-500">
                Tổng <span className="text-slate-300 font-semibold">{totalItems}</span> gian hàng
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  id="pagination-prev-btn"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  ← Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      id={`pagination-page-${pageNum}-btn`}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${
                        pageNum === page
                          ? 'bg-rose-600 text-white border-rose-500'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  id="pagination-next-btn"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Tiếp →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vendor Review / Approval Modal */}
      {approvalTarget && (
        <VendorApprovalModal
          vendor={approvalTarget}
          onClose={() => setApprovalTarget(null)}
        />
      )}

      {/* Warning/Deactivate Modal */}
      {deactivateTarget && (
        <div
          id="deactivate-confirm-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setDeactivateTarget(null); }}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-5 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100">🔒 Khóa Gian Hàng</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-slate-300 text-sm">
                Vô hiệu hóa shop <strong className="text-slate-100">{deactivateTarget.store_name}</strong> sẽ làm ẩn toàn bộ sản phẩm của họ khỏi khách hàng. Tiếp tục?
              </p>

              {statusErrorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs font-medium">
                  ⚠️ {statusErrorMsg}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setDeactivateTarget(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all"
                >
                  Hủy
                </button>
                <button
                  id="deactivate-confirm-btn"
                  onClick={handleConfirmDeactivate}
                  disabled={statusMutation.isPending}
                  className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {statusMutation.isPending && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Tiếp tục
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopOversight;
