import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../../../shared-ui/src/lib/axios';
import CategoryNode from './CategoryNode';
import CategoryModal, { type ITreeCategory } from './CategoryModal';

interface CategoryTreeResponse {
  categories: ITreeCategory[];
}

const CategoryManagement: React.FC = () => {
  const [modalState, setModalState] = useState<{
    open: boolean;
    category: ITreeCategory | null;
    defaultParentId: string | null;
  }>({ open: false, category: null, defaultParentId: null });

  const { data, isLoading, isError, refetch } = useQuery<CategoryTreeResponse>({
    queryKey: ['admin-category-tree'],
    queryFn: async () => {
      const res = await axiosInstance.get('/admin/categories/tree');
      return res.data.data;
    },
  });

  const rootCategories = data?.categories ?? [];

  const openCreate = (parentId: string | null = null) => {
    setModalState({ open: true, category: null, defaultParentId: parentId });
  };

  const openEdit = (category: ITreeCategory) => {
    setModalState({ open: true, category, defaultParentId: null });
  };

  const closeModal = () => {
    setModalState({ open: false, category: null, defaultParentId: null });
  };

  // Count all categories recursively
  function countAll(nodes: ITreeCategory[]): number {
    return nodes.reduce((acc, n) => acc + 1 + countAll(n.children), 0);
  }

  const totalCount = countAll(rootCategories);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-slate-100">🗂 Quản Lý Danh Mục</h2>
          <p className="text-slate-500 text-sm mt-1">
            Quản lý cây phân cấp danh mục sản phẩm trên nền tảng.
            {!isLoading && (
              <span className="ml-2 text-slate-300 font-semibold">{totalCount} danh mục</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="refresh-tree-btn"
            onClick={() => refetch()}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all disabled:opacity-50"
          >
            🔄 Làm mới
          </button>
          <button
            id="add-root-category-btn"
            onClick={() => openCreate(null)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-900/30"
          >
            ➕ Thêm danh mục gốc
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
        <span className="flex items-center gap-1.5"><span className="text-base">📂</span> Cấp 1 (Gốc)</span>
        <span className="flex items-center gap-1.5"><span className="text-base">📁</span> Cấp 2 (Con)</span>
        <span className="flex items-center gap-1.5"><span className="text-base">📄</span> Cấp 3+ (Cháu)</span>
        <span className="text-slate-700">|</span>
        <span>Di chuyển chuột qua nút danh mục để xem các thao tác</span>
        <span>|</span>
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-400 font-bold">●</span> Có sản phẩm — không thể xóa
        </span>
      </div>

      {/* Tree Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Đang tải cây danh mục...</p>
        </div>
      ) : isError ? (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-6 py-4 rounded-xl text-sm font-medium">
          ⚠️ Có lỗi xảy ra khi tải dữ liệu danh mục. Vui lòng thử lại.
        </div>
      ) : rootCategories.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center gap-4">
          <span className="text-5xl">🗂</span>
          <h3 className="text-lg font-bold text-slate-200">Chưa có danh mục nào</h3>
          <p className="text-slate-500 text-sm max-w-sm">
            Bắt đầu bằng cách thêm danh mục gốc đầu tiên để xây dựng cây phân cấp sản phẩm.
          </p>
          <button
            onClick={() => openCreate(null)}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
          >
            ➕ Thêm danh mục đầu tiên
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-2">
          {rootCategories.map((node) => (
            <CategoryNode
              key={node.id}
              node={node}
              depth={0}
              allCategories={rootCategories}
              onAddChild={(parentId) => openCreate(parentId)}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalState.open && (
        <CategoryModal
          category={modalState.category}
          defaultParentId={modalState.defaultParentId}
          allCategories={rootCategories}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default CategoryManagement;
