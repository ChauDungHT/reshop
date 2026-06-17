import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@shared-ui/lib/axios';
import type { IApiResponse, IWalletTransaction, IVendor, IUser } from '@shared-ui/types';

interface PaginatedTransactions {
  items: IWalletTransaction[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

const VendorWallet: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 8;

  // State for Withdraw Modal
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawError, setWithdrawError] = useState('');

  // State for Bank Edit Modal/Section
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    bank_name: '',
    bank_account: '',
    bank_owner: '',
  });

  // Fetch Vendor Profile/Shop for Bank Info
  const { data: shop, isLoading: shopLoading } = useQuery<IVendor>({
    queryKey: ['vendor-shop'],
    queryFn: async () => {
      const res = await axiosInstance.get<IApiResponse<IVendor>>('/vendor/shop');
      return res.data.data;
    },
  });

  // Fetch User Profile for Wallet and Pending Balances
  const { data: profile, isLoading: profileLoading } = useQuery<IUser>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await axiosInstance.get<IApiResponse<IUser>>('/users/profile');
      return res.data.data;
    },
  });

  // Fetch Vendor Stats for cumulative revenue
  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ['vendor-stats'],
    queryFn: async () => {
      const res = await axiosInstance.get<IApiResponse<any>>('/vendor/dashboard');
      return res.data.data;
    },
  });

  // Fetch Transaction History
  const { data: historyData, isLoading: historyLoading } = useQuery<PaginatedTransactions>({
    queryKey: ['wallet-history', page],
    queryFn: async () => {
      const res = await axiosInstance.get<IApiResponse<PaginatedTransactions>>(
        `/wallet/history?page=${page}&limit=${limit}`
      );
      return res.data.data;
    },
  });

  // Update Bank Info Mutation
  const updateBankMutation = useMutation({
    mutationFn: async (data: typeof bankForm) => {
      const fd = new FormData();
      fd.append('bank_name', data.bank_name);
      fd.append('bank_account', data.bank_account);
      fd.append('bank_owner', data.bank_owner);
      // Retain other fields if available
      if (shop) {
        fd.append('store_name', shop.store_name || '');
        fd.append('phone', shop.phone || '');
        fd.append('email', shop.email || '');
        fd.append('address', shop.address || '');
        fd.append('return_policy_days', String(shop.return_policy_days ?? 7));
        fd.append('return_policy_desc', shop.return_policy_desc || '');
      }
      await axiosInstance.put('/vendor/shop', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-shop'] });
      setIsEditingBank(false);
      alert('Cập nhật thông tin ngân hàng thành công!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật.');
    },
  });

  // Withdraw Mutation
  const withdrawMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await axiosInstance.post<IApiResponse<any>>('/wallet/withdraw', { amount });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-history'] });
      setIsWithdrawOpen(false);
      setWithdrawAmount('');
      alert('Gửi yêu cầu rút tiền thành công!');
    },
    onError: (err: any) => {
      setWithdrawError(err.response?.data?.message || 'Không thể thực hiện yêu cầu rút tiền.');
    },
  });

  const handleOpenWithdraw = () => {
    if (!shop?.bank_info || !shop.bank_info.bank || !shop.bank_info.account_no || !shop.bank_info.owner) {
      alert('Vui lòng cấu hình tài khoản ngân hàng trước khi thực hiện rút tiền.');
      setBankForm({
        bank_name: shop?.bank_info?.bank || '',
        bank_account: shop?.bank_info?.account_no || '',
        bank_owner: shop?.bank_info?.owner || '',
      });
      setIsEditingBank(true);
      return;
    }
    setWithdrawError('');
    setIsWithdrawOpen(true);
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setWithdrawError('Vui lòng nhập số tiền rút hợp lệ.');
      return;
    }
    const currentWalletBalance = typeof profile?.wallet_balance === 'string' ? parseFloat(profile.wallet_balance) : (profile?.wallet_balance || 0);
    if (profile && amt > currentWalletBalance) {
      setWithdrawError('Số dư ví khả dụng không đủ.');
      return;
    }
    if (amt < 50000) {
      setWithdrawError('Số tiền rút tối thiểu là 50.000₫.');
      return;
    }
    withdrawMutation.mutate(amt);
  };

  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.bank_name.trim() || !bankForm.bank_account.trim() || !bankForm.bank_owner.trim()) {
      alert('Vui lòng điền đầy đủ thông tin ngân hàng.');
      return;
    }
    updateBankMutation.mutate(bankForm);
  };

  const formatCurrency = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'deposit':
        return { text: 'Nạp tiền vào ví', icon: '📥', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' };
      case 'withdraw':
        return { text: 'Rút tiền về NH', icon: '📤', color: 'text-rose-400 bg-rose-500/10 border-rose-500/25' };
      case 'payment':
        return { text: 'Thanh toán đơn hàng', icon: '💸', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25' };
      case 'refund':
        return { text: 'Hoàn tiền đơn hàng', icon: '↩️', color: 'text-sky-400 bg-sky-500/10 border-sky-500/25' };
      case 'pending_credit':
        return { text: 'Đóng băng ký quỹ', icon: '🔒', color: 'text-amber-400 bg-amber-500/10 border-amber-500/25' };
      case 'pending_release':
        return { text: 'Giải phóng số dư', icon: '🔓', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' };
      default:
        return { text: type, icon: '💼', color: 'text-slate-400 bg-slate-500/10 border-slate-500/25' };
    }
  };

  const isConfiguredBank = shop?.bank_info && shop.bank_info.bank && shop.bank_info.account_no && shop.bank_info.owner;

  if (shopLoading || profileLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight uppercase tracking-widest">Ví Cửa Hàng</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium italic">
            Quản lý doanh thu, ví số dư khả dụng và theo dõi các khoản thanh toán, rút tiền.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Hệ thống ví Reshop Pay
        </div>
      </div>

      {/* Balances & Bank Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Cumulative Revenue Card */}
        <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[180px]">
          <div className="absolute -right-10 -top-10 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Doanh thu tích lũy</span>
            <div className="flex items-center gap-3">
              <span className="text-2xl">💰</span>
              <h3 className="text-3xl font-black text-slate-100 tracking-tight">
                {formatCurrency(stats?.total_revenue || 0)}
              </h3>
            </div>
            <p className="text-xs text-slate-400">Tổng doanh thu tích lũy từ các đơn đã giao thành công.</p>
          </div>
          <div className="mt-4 px-4 py-2 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-[11px] text-indigo-400/80 text-center font-medium italic">
            Tổng doanh thu của gian hàng
          </div>
        </div>

        {/* Available Balance Card */}
        <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[180px]">
          <div className="absolute -right-10 -top-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Số dư khả dụng</span>
            <div className="flex items-center gap-3">
              <span className="text-2xl">👛</span>
              <h3 className="text-3xl font-black text-emerald-400 tracking-tight">
                {formatCurrency(profile?.wallet_balance || 0)}
              </h3>
            </div>
            <p className="text-xs text-slate-400">Có thể thực hiện rút về tài khoản ngân hàng liên kết.</p>
          </div>
          <button
            onClick={handleOpenWithdraw}
            className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-emerald-500/10 text-sm uppercase tracking-wider"
          >
            Yêu cầu rút tiền
          </button>
        </div>

        {/* Pending Balance Card */}
        <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[180px]">
          <div className="absolute -right-10 -top-10 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Số dư tạm giữ (Escrow)</span>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔒</span>
              <h3 className="text-3xl font-black text-amber-400 tracking-tight">
                {formatCurrency(profile?.pending_balance || 0)}
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Doanh thu từ các đơn hàng mới giao. Sẽ tự động tất toán sau 7 ngày hoặc khi khách đánh giá.
            </p>
          </div>
          <div className="mt-4 px-4 py-2 bg-amber-500/5 rounded-xl border border-amber-500/10 text-[11px] text-amber-400/80 text-center font-medium italic">
            Đảm bảo quyền lợi khách hàng và tránh tranh chấp
          </div>
        </div>

        {/* Bank Info Card */}
        <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[180px]">
          <div className="absolute -right-10 -top-10 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Ngân hàng thụ hưởng</span>
            {isConfiguredBank ? (
              <div className="space-y-1.5 pt-1">
                <p className="text-sm font-bold text-slate-200 uppercase">{shop.bank_info.bank}</p>
                <p className="text-sm font-mono text-indigo-300 font-bold">{shop.bank_info.account_no}</p>
                <p className="text-xs text-slate-400">Chủ tài khoản: <span className="font-semibold text-slate-300 uppercase">{shop.bank_info.owner}</span></p>
              </div>
            ) : (
              <div className="text-xs text-rose-400 pt-2 flex items-start gap-1">
                <span>⚠️</span>
                <span>Chưa thiết lập thông tin ngân hàng. Hãy liên kết tài khoản để rút tiền.</span>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setBankForm({
                bank_name: shop?.bank_info?.bank || '',
                bank_account: shop?.bank_info?.account_no || '',
                bank_owner: shop?.bank_info?.owner || '',
              });
              setIsEditingBank(true);
            }}
            className="mt-4 w-full bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold py-3 rounded-2xl transition-all text-sm"
          >
            {isConfiguredBank ? 'Thay đổi tài khoản liên kết' : 'Thiết lập tài khoản ngân hàng'}
          </button>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-slate-200 text-base">Lịch sử giao dịch ví</h3>
          <span className="text-xs text-slate-500">Mỗi trang hiển thị tối đa {limit} giao dịch</span>
        </div>

        <div className="overflow-x-auto">
          {historyLoading ? (
            <div className="py-20 text-center text-slate-500 animate-pulse">Đang tải lịch sử giao dịch...</div>
          ) : !historyData?.items || historyData.items.length === 0 ? (
            <div className="py-20 text-center text-slate-500 italic">Chưa phát sinh giao dịch nào.</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead>
                <tr className="bg-slate-950/40 text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-white/5">
                  <th className="px-6 py-4">Mã GD</th>
                  <th className="px-6 py-4">Loại giao dịch</th>
                  <th className="px-6 py-4">Số tiền</th>
                  <th className="px-6 py-4">Số dư sau GD</th>
                  <th className="px-6 py-4">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {historyData.items.map((tx) => {
                  const label = getTransactionLabel(tx.type);
                  const isNegative = tx.amount < 0 || tx.type === 'withdraw' || tx.type === 'payment';
                  const amountVal = Math.abs(tx.amount);

                  return (
                    <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400 truncate max-w-[120px]" title={tx.id}>
                        {tx.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${label.color}`}>
                          <span>{label.icon}</span>
                          <span>{label.text}</span>
                        </span>
                      </td>
                      <td className={`px-6 py-4 font-bold text-base ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {isNegative ? '-' : '+'}{formatCurrency(amountVal)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-300">
                        {formatCurrency(tx.balance_after)}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(tx.created_at).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {historyData && historyData.total_pages > 1 && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Trang {page} / {historyData.total_pages} (Tổng {historyData.total} giao dịch)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
              >
                Trước
              </button>
              <button
                disabled={page >= historyData.total_pages}
                onClick={() => setPage(p => Math.min(historyData.total_pages, p + 1))}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
              >
                Tiếp
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Bank Modal */}
      {isEditingBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/5 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl relative">
            <div>
              <h3 className="text-lg font-bold text-white">Cấu hình ngân hàng liên kết</h3>
              <p className="text-slate-500 text-xs mt-1">Thông tin dùng để rút tiền từ số dư ví khả dụng của gian hàng.</p>
            </div>

            <form onSubmit={handleBankSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Tên ngân hàng</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Vietcombank, Techcombank..."
                  value={bankForm.bank_name}
                  onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Số tài khoản</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập số tài khoản ngân hàng"
                  value={bankForm.bank_account}
                  onChange={(e) => setBankForm({ ...bankForm, bank_account: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Tên chủ tài khoản (Không dấu)</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: NGUYEN VAN A"
                  value={bankForm.bank_owner}
                  onChange={(e) => setBankForm({ ...bankForm, bank_owner: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 uppercase transition"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingBank(false)}
                  className="flex-1 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold py-3 rounded-xl transition text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updateBankMutation.isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/10 text-xs"
                >
                  {updateBankMutation.isPending ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/5 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl relative">
            <div>
              <h3 className="text-lg font-bold text-white">Yêu cầu rút tiền</h3>
              <p className="text-slate-500 text-xs mt-1">Số dư khả dụng hiện tại: <span className="font-bold text-emerald-400">{formatCurrency(profile?.wallet_balance || 0)}</span></p>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Số tiền cần rút (VND)</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="50000"
                    placeholder="Nhập số tiền muốn rút..."
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl pl-4 pr-12 py-3.5 text-base font-bold text-white outline-none focus:border-indigo-500 transition"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-500 uppercase">VND</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">Số tiền rút tối thiểu: 50.000₫. Miễn phí rút tiền.</p>
              </div>

              {shop?.bank_info && (
                <div className="bg-slate-950/80 border border-white/5 rounded-xl p-4 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Chuyển về tài khoản ngân hàng</span>
                  <div className="text-xs">
                    <p className="font-bold text-slate-300">{shop.bank_info.bank} - {shop.bank_info.account_no}</p>
                    <p className="text-slate-400 mt-0.5">Chủ thẻ: {shop.bank_info.owner}</p>
                  </div>
                </div>
              )}

              {withdrawError && (
                <div className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 rounded-xl">
                  ⚠️ {withdrawError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawOpen(false)}
                  className="flex-1 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold py-3 rounded-xl transition text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={withdrawMutation.isPending}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/10 text-xs uppercase tracking-wider"
                >
                  {withdrawMutation.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorWallet;
