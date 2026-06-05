import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../../../shared-ui/src/lib/axios';
import type { IUser } from '../../../../../shared-ui/src/types/models';
import type { IPaginatedData } from '../../../../../shared-ui/src/types/api';
import BanUserModal from './BanUserModal';

// ── Types ──────────────────────────────────────────────────────────────────
interface IUserDetail extends IUser {
  orders_count: number;
  wallet_transactions_count: number;
  vendor_profile: {
    id: string;
    store_name: string;
    slug: string;
    status: string;
    commission_rate: number;
    products_count: number;
    created_at: string;
  } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' });

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const map: Record<string, { label: string; cls: string }> = {
    admin:    { label: 'Admin',    cls: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
    vendor:   { label: 'Vendor',   cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    customer: { label: 'Customer', cls: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  };
  const cfg = map[role] ?? { label: role, cls: 'bg-slate-700 text-slate-300 border-slate-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string }> = {
    active:  { label: 'Hoạt động', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    banned:  { label: 'Bị chặn',   cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
    pending: { label: 'Chờ duyệt', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  };
  const cfg = map[status] ?? { label: status, cls: 'bg-slate-700 text-slate-300 border-slate-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

// ── Profile Detail Modal ───────────────────────────────────────────────────
const ProfileModal: React.FC<{ userId: string; onClose: () => void }> = ({ userId, onClose }) => {
  const { data, isLoading } = useQuery<IUserDetail>({
    queryKey: ['admin-user-detail', userId],
    queryFn: async () => {
      const res = await axiosInstance.get(`/admin/users/${userId}`);
      return res.data.data;
    },
  });

  return (
    <div
      id="profile-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-100">👤 Hồ sơ người dùng</h3>
          <button
            id="profile-modal-close-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data ? (
            <>
              {/* Avatar & Name */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                  {data.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-100">{data.name}</div>
                  <div className="text-sm text-slate-400">{data.email}</div>
                  <div className="flex gap-2 mt-2">
                    <RoleBadge role={data.role} />
                    <StatusBadge status={data.status} />
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Đơn hàng', value: data.orders_count, icon: '📦' },
                  { label: 'Giao dịch ví', value: data.wallet_transactions_count, icon: '💰' },
                  { label: 'Số dư ví', value: formatCurrency(data.wallet_balance), icon: '💳' },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-xl mb-1">{s.icon}</div>
                    <div className="text-slate-100 font-bold text-sm">{s.value}</div>
                    <div className="text-slate-500 text-xs">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Info Table */}
              <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden text-sm">
                {[
                  { label: 'Ngày tham gia', value: formatDate(data.created_at) },
                  { label: 'Đăng nhập cuối', value: data.last_login_at ? formatDate(data.last_login_at) : '—' },
                  { label: 'Số điện thoại', value: data.phone ?? '—' },
                  { label: 'Địa chỉ', value: data.address ?? '—' },
                ].map((row, i) => (
                  <div key={row.label} className={`flex px-4 py-2.5 gap-3 ${i % 2 === 0 ? '' : 'bg-slate-800/30'}`}>
                    <span className="text-slate-500 shrink-0 w-36">{row.label}</span>
                    <span className="text-slate-200">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Vendor Profile */}
              {data.vendor_profile && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">🏪 Thông tin gian hàng</h4>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Tên gian hàng</span><span className="text-slate-100 font-semibold">{data.vendor_profile.store_name}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Trạng thái</span><StatusBadge status={data.vendor_profile.status} /></div>
                    <div className="flex justify-between"><span className="text-slate-400">Sản phẩm</span><span className="text-slate-100">{data.vendor_profile.products_count}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Hoa hồng</span><span className="text-slate-100">{data.vendor_profile.commission_rate}%</span></div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// ── Reset Password Modal ───────────────────────────────────────────────────
const ResetPasswordModal: React.FC<{ user: IUser; onClose: () => void }> = ({ user, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock: no real API — just show success
    setDone(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div
      id="reset-password-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="px-6 py-5 border-b border-slate-800">
          <h3 className="text-lg font-bold text-slate-100">🔑 Đặt lại mật khẩu</h3>
          <p className="text-slate-400 text-xs mt-1">Cho tài khoản: <span className="text-indigo-400 font-semibold">{user.email}</span></p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {done ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-sm font-semibold text-center">
              ✅ Mật khẩu đã được đặt lại thành công!
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="new-password-input" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Mật khẩu mới
                </label>
                <input
                  id="new-password-input"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  required
                  minLength={6}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 text-amber-300 text-xs">
                ⚠️ Chức năng này dành cho mục đích kiểm thử nội bộ.
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all">
                  Hủy
                </button>
                <button
                  id="reset-password-confirm-btn"
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all"
                >
                  Đặt lại
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

// ── UserTable Component ────────────────────────────────────────────────────
interface UserTableProps {
  data: IPaginatedData<IUser>;
  page: number;
  onPageChange: (p: number) => void;
}

const UserTable: React.FC<UserTableProps> = ({ data, page, onPageChange }) => {
  const [banTarget, setBanTarget] = useState<IUser | null>(null);
  const [profileTarget, setProfileTarget] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<IUser | null>(null);

  const { items, total, total_pages } = data;

  return (
    <>
      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Người dùng</th>
                <th className="px-5 py-4">Vai trò</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4">Ngày tham gia</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">🔍</span>
                      <span>Không tìm thấy người dùng nào</span>
                    </div>
                  </td>
                </tr>
              ) : items.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/40 transition-colors group">
                  {/* ID */}
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg">
                      {user.id.slice(0, 8)}…
                    </span>
                  </td>
                  {/* Name & Email */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-100">{user.name}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  {/* Role */}
                  <td className="px-5 py-4"><RoleBadge role={user.role} /></td>
                  {/* Status */}
                  <td className="px-5 py-4"><StatusBadge status={user.status} /></td>
                  {/* Join Date */}
                  <td className="px-5 py-4 text-xs text-slate-400">{formatDate(user.created_at)}</td>
                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        id={`view-profile-btn-${user.id}`}
                        onClick={() => setProfileTarget(user.id)}
                        title="Xem hồ sơ"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                      >
                        👁 Hồ sơ
                      </button>
                      <button
                        id={`reset-password-btn-${user.id}`}
                        onClick={() => setResetTarget(user)}
                        title="Đặt lại mật khẩu"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                      >
                        🔑 Mật khẩu
                      </button>
                      {user.role !== 'admin' && (
                        <button
                          id={`ban-unban-btn-${user.id}`}
                          onClick={() => setBanTarget(user)}
                          title={user.status === 'banned' ? 'Gỡ chặn' : 'Chặn'}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            user.status === 'banned'
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {user.status === 'banned' ? '🔓 Gỡ chặn' : '🔒 Chặn'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {total_pages > 1 && (
          <div className="border-t border-slate-800 px-5 py-4 flex items-center justify-between bg-slate-950/50">
            <span className="text-xs text-slate-500">
              Tổng <span className="text-slate-300 font-semibold">{total}</span> người dùng
            </span>
            <div className="flex items-center gap-1.5">
              <button
                id="pagination-prev-btn"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ← Trước
              </button>
              {Array.from({ length: Math.min(5, total_pages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(page - 2, total_pages - 4)) + i;
                return pageNum <= total_pages ? (
                  <button
                    key={pageNum}
                    id={`pagination-page-${pageNum}-btn`}
                    onClick={() => onPageChange(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${
                      pageNum === page
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                ) : null;
              })}
              <button
                id="pagination-next-btn"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= total_pages}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Tiếp →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {banTarget && <BanUserModal user={banTarget} onClose={() => setBanTarget(null)} />}
      {profileTarget && <ProfileModal userId={profileTarget} onClose={() => setProfileTarget(null)} />}
      {resetTarget && <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />}
    </>
  );
};

export default UserTable;
