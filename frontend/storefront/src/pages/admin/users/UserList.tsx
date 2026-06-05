import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance, { BASE_URL } from '../../../../../shared-ui/src/lib/axios';
import type { IUser } from '../../../../../shared-ui/src/types/models';
import type { IPaginatedData } from '../../../../../shared-ui/src/types/api';
import UserTable from './UserTable';

type RoleFilter = '' | 'customer' | 'vendor' | 'admin';
type StatusFilter = '' | 'active' | 'banned' | 'pending';

const DEBOUNCE_MS = 300;

const UserList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);

  // 300ms debounce on search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 when any filter changes
  const handleRoleChange = useCallback((v: RoleFilter) => { setRole(v); setPage(1); }, []);
  const handleStatusChange = useCallback((v: StatusFilter) => { setStatus(v); setPage(1); }, []);
  const handleSearchChange = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  const { data, isLoading, isError } = useQuery<IPaginatedData<IUser>>({
    queryKey: ['admin-users', debouncedSearch, role, status, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '15');
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (role) params.set('role', role);
      if (status) params.set('status', status);
      const res = await axiosInstance.get(`/admin/users?${params.toString()}`);
      return res.data.data;
    },
    placeholderData: (prev) => prev,
  });

  const handleExportCSV = () => {
    const token = localStorage.getItem('reshop_token');
    const url = `${BASE_URL}/api/admin/reports/orders/export`;
    const link = document.createElement('a');
    link.href = url;
    // Pass token via query (simple approach for file download)
    link.href = `${BASE_URL}/api/admin/reports/orders/export?token=${token ?? ''}`;
    link.download = 'orders_report.csv';
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-slate-100">👥 Quản Lý Người Dùng</h2>
          <p className="text-slate-500 text-sm mt-1">
            Quản lý tài khoản, vai trò và trạng thái người dùng trên nền tảng.
          </p>
        </div>
        <button
          id="export-csv-btn"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-900/30"
        >
          📥 Xuất CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
          <input
            id="user-search-input"
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Tìm kiếm theo tên hoặc email..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Role Filter */}
        <select
          id="role-filter-select"
          value={role}
          onChange={(e) => handleRoleChange(e.target.value as RoleFilter)}
          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        >
          <option value="">Tất cả vai trò</option>
          <option value="customer">Customer</option>
          <option value="vendor">Vendor</option>
          <option value="admin">Admin</option>
        </select>

        {/* Status Filter */}
        <select
          id="status-filter-select"
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="banned">Bị chặn</option>
          <option value="pending">Chờ duyệt</option>
        </select>
      </div>

      {/* Stats Bar */}
      {data && !isLoading && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="text-slate-300 font-semibold">{data.total}</span> người dùng được tìm thấy
          {(debouncedSearch || role || status) && (
            <button
              onClick={() => { setSearch(''); setRole(''); setStatus(''); setPage(1); }}
              className="text-indigo-400 hover:text-indigo-300 font-semibold ml-1 transition-colors"
            >
              × Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Đang tải danh sách người dùng...</p>
        </div>
      ) : isError ? (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-6 py-4 rounded-xl text-sm font-medium">
          ⚠️ Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.
        </div>
      ) : data ? (
        <UserTable
          data={data}
          page={page}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
};

export default UserList;
