import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../../../../shared-ui/src/lib/axios';

// ── Types ──────────────────────────────────────────────────────────────────
export interface ITreeCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  children: ITreeCategory[];
  product_count?: number;
}

interface CategoryModalProps {
  /** null = create mode, ITreeCategory = edit mode */
  category: ITreeCategory | null;
  /** Pre-selected parent when clicking Add from a parent node */
  defaultParentId: string | null;
  allCategories: ITreeCategory[];
  onClose: () => void;
}

// ── Helper: flatten tree to a 1-D list for the parent dropdown ─────────────
function flattenTree(nodes: ITreeCategory[], depth = 0): { cat: ITreeCategory; depth: number }[] {
  const result: { cat: ITreeCategory; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ cat: node, depth });
    result.push(...flattenTree(node.children, depth + 1));
  }
  return result;
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  category,
  defaultParentId,
  allCategories,
  onClose,
}) => {
  const isEdit = category !== null;
  const queryClient = useQueryClient();

  const [name, setName] = useState(category?.name ?? '');
  const [parentId, setParentId] = useState<string>(
    isEdit ? (category.parent_id ?? '') : (defaultParentId ?? '')
  );
  const [sortOrder, setSortOrder] = useState<number>(
    isEdit ? category.sort_order : 0
  );
  const [serverError, setServerError] = useState('');

  const flatList = flattenTree(allCategories);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        parent_id: parentId || null,
        sort_order: sortOrder,
      };
      if (isEdit) {
        await axiosInstance.put(`/admin/categories/${category.id}`, payload);
      } else {
        await axiosInstance.post('/admin/categories', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-category-tree'] });
      onClose();
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      setServerError(error.response?.data?.message ?? 'Có lỗi xảy ra. Vui lòng thử lại.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!name.trim()) { setServerError('Tên danh mục không được để trống.'); return; }
    mutation.mutate();
  };

  return (
    <div
      id="category-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
          <span className="text-2xl">{isEdit ? '✏️' : '➕'}</span>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              {isEdit ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
            </h3>
            {isEdit && (
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                slug: {category.slug}
              </p>
            )}
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="cat-name-input" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Tên danh mục <span className="text-rose-400">*</span>
            </label>
            <input
              id="cat-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Cầu lông cao cấp"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              autoFocus
            />
          </div>

          {/* Parent */}
          <div>
            <label htmlFor="cat-parent-select" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Danh mục cha
            </label>
            <select
              id="cat-parent-select"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="">— Không có (cấp gốc) —</option>
              {flatList
                .filter((item) => item.cat.id !== category?.id)
                .map(({ cat, depth }) => (
                  <option key={cat.id} value={cat.id}>
                    {'　'.repeat(depth)}{depth > 0 ? '└ ' : ''}{cat.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label htmlFor="cat-sort-input" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Thứ tự sắp xếp
            </label>
            <input
              id="cat-sort-input"
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Error */}
          {serverError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl px-4 py-3 text-sm">
              {serverError}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              id="cat-modal-cancel-btn"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              id="cat-modal-submit-btn"
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang lưu...</>
              ) : (
                isEdit ? '💾 Lưu thay đổi' : '➕ Tạo danh mục'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
