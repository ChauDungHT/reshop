import React, { useState, useEffect } from 'react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    onPageChange: (page: number) => void;
  };
  loading?: boolean;
  emptyText?: string;
  idKey?: keyof T; // Key to use as ID for selection
}

const DataTable = <T extends Record<string, any>>({
  columns,
  data,
  selectable = false,
  onSelectionChange,
  pagination,
  loading = false,
  emptyText = 'Không có dữ liệu hiển thị.',
  idKey = 'id' as keyof T
}: DataTableProps<T>) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedIds);
    }
  }, [selectedIds, onSelectionChange]);

  const toggleSelectAll = () => {
    if (selectedIds.length === (data?.length || 0)) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data?.map(item => String(item[idKey])) || []);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead className="bg-slate-800/50 border-b border-slate-800">
            <tr>
              {selectable && (
                <th className="px-6 py-4 w-12">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    checked={(data?.length || 0) > 0 && selectedIds.length === data?.length}
                    onChange={toggleSelectAll}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={String(col.key)} className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    {col.header}
                    {col.sortable && <span className="cursor-pointer hover:text-slate-200">⇅</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {loading ? (
              // Skeleton Loading
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {selectable && <td className="px-6 py-4"><div className="w-4 h-4 bg-slate-800 rounded"></div></td>}
                  {columns.map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-slate-800 rounded w-2/3"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : (data?.length || 0) === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-12 text-center text-slate-500 italic">
                  {emptyText}
                </td>
              </tr>
            ) : (
              data?.map((row, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors group">
                  {selectable && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                        checked={selectedIds.includes(String(row[idKey]))}
                        onChange={() => toggleSelect(String(row[idKey]))}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-6 py-4 text-sm text-slate-300">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Hiển thị <span className="text-slate-300">{data?.length || 0}</span> trên <span className="text-slate-300">{pagination.total}</span> kết quả
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-widest">
              Trang {pagination.page} / {totalPages || 1}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-slate-700/50"
              >
                ←
              </button>
              <button
                disabled={pagination.page >= totalPages}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-slate-700/50"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
