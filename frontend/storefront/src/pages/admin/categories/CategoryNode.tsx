import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../../../../shared-ui/src/lib/axios';
import type { ITreeCategory } from './CategoryModal';

interface CategoryNodeProps {
  node: ITreeCategory;
  depth: number;
  allCategories: ITreeCategory[];
  onAddChild: (parentId: string) => void;
  onEdit: (category: ITreeCategory) => void;
}

// ── Delete confirmation inline ─────────────────────────────────────────────
const DeleteButton: React.FC<{
  node: ITreeCategory;
  onDeleted: () => void;
}> = ({ node, onDeleted }) => {
  const [confirming, setConfirming] = useState(false);
  const queryClient = useQueryClient();

  const hasProducts = (node.product_count ?? 0) > 0;
  const hasChildren = node.children.length > 0;
  const canDelete = !hasProducts && !hasChildren;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.delete(`/admin/categories/${node.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-category-tree'] });
      onDeleted();
    },
  });

  if (!canDelete) {
    const reason = hasProducts ? 'có sản phẩm' : 'có danh mục con';
    return (
      <span
        title={`Không thể xóa: ${reason}`}
        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 border border-slate-800 cursor-not-allowed"
      >
        🗑 Xóa
      </span>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-rose-400 font-semibold">Xác nhận?</span>
        <button
          id={`delete-confirm-btn-${node.id}`}
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all disabled:opacity-50"
        >
          {deleteMutation.isPending ? '...' : 'Xóa'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
        >
          Hủy
        </button>
      </div>
    );
  }

  return (
    <button
      id={`delete-btn-${node.id}`}
      onClick={() => setConfirming(true)}
      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
    >
      🗑 Xóa
    </button>
  );
};

// ── Move (sort_order) buttons ──────────────────────────────────────────────
const MoveButtons: React.FC<{
  node: ITreeCategory;
  siblings: ITreeCategory[];
}> = ({ node, siblings }) => {
  const queryClient = useQueryClient();
  const idx = siblings.findIndex((s) => s.id === node.id);

  const moveMutation = useMutation({
    mutationFn: async (direction: 'up' | 'down') => {
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      const swapNode = siblings[swapIdx];
      if (!swapNode) return;
      // Swap sort_order values
      await Promise.all([
        axiosInstance.put(`/admin/categories/${node.id}`, { sort_order: swapNode.sort_order }),
        axiosInstance.put(`/admin/categories/${swapNode.id}`, { sort_order: node.sort_order }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-category-tree'] });
    },
  });

  return (
    <div className="flex gap-1">
      <button
        id={`move-up-btn-${node.id}`}
        onClick={() => moveMutation.mutate('up')}
        disabled={idx === 0 || moveMutation.isPending}
        title="Di chuyển lên"
        className="w-7 h-7 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
      >
        ↑
      </button>
      <button
        id={`move-down-btn-${node.id}`}
        onClick={() => moveMutation.mutate('down')}
        disabled={idx === siblings.length - 1 || moveMutation.isPending}
        title="Di chuyển xuống"
        className="w-7 h-7 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
      >
        ↓
      </button>
    </div>
  );
};

// ── Move to parent (drag-drop substitute) ─────────────────────────────────
const ReparentSelect: React.FC<{
  node: ITreeCategory;
  allCategories: ITreeCategory[];
}> = ({ node, allCategories }) => {
  const queryClient = useQueryClient();

  function flattenTree(nodes: ITreeCategory[], depth = 0): { cat: ITreeCategory; depth: number }[] {
    const result: { cat: ITreeCategory; depth: number }[] = [];
    for (const n of nodes) {
      result.push({ cat: n, depth });
      result.push(...flattenTree(n.children, depth + 1));
    }
    return result;
  }

  const flat = flattenTree(allCategories);

  const moveMutation = useMutation({
    mutationFn: async (newParentId: string) => {
      await axiosInstance.put(`/admin/categories/${node.id}`, {
        parent_id: newParentId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-category-tree'] });
    },
  });

  return (
    <select
      id={`reparent-select-${node.id}`}
      title="Chuyển sang danh mục cha khác"
      defaultValue={node.parent_id ?? ''}
      onChange={(e) => moveMutation.mutate(e.target.value)}
      disabled={moveMutation.isPending}
      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[160px] disabled:opacity-50 transition-all"
    >
      <option value="">— Cấp gốc —</option>
      {flat
        .filter((item) => item.cat.id !== node.id)
        .map(({ cat, depth }) => (
          <option key={cat.id} value={cat.id}>
            {'　'.repeat(depth)}{depth > 0 ? '└ ' : ''}{cat.name}
          </option>
        ))}
    </select>
  );
};

// ── CategoryNode ───────────────────────────────────────────────────────────
const CategoryNode: React.FC<CategoryNodeProps> = ({
  node,
  depth,
  allCategories,
  onAddChild,
  onEdit,
}) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  const depthColors = [
    'border-indigo-500/30 bg-indigo-500/5',
    'border-sky-500/20 bg-sky-500/5',
    'border-violet-500/20 bg-violet-500/5',
  ];
  const borderColor = depthColors[Math.min(depth, depthColors.length - 1)];

  return (
    <div className="w-full">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${borderColor} mb-2 group hover:border-indigo-400/40 transition-all`}
      >
        {/* Expand/Collapse */}
        <button
          id={`expand-btn-${node.id}`}
          onClick={() => setExpanded((v) => !v)}
          disabled={!hasChildren}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-200 shrink-0 text-sm disabled:opacity-0 transition-all"
        >
          {hasChildren ? (expanded ? '▾' : '▸') : ''}
        </button>

        {/* Icon by depth */}
        <span className="text-base shrink-0">
          {depth === 0 ? '📂' : depth === 1 ? '📁' : '📄'}
        </span>

        {/* Name & Slug */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-100 text-sm">{node.name}</span>
            <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded-lg">
              {node.slug}
            </span>
            {/* Product count badge */}
            {(node.product_count ?? 0) > 0 && (
              <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                {node.product_count} sản phẩm
              </span>
            )}
            {node.children.length > 0 && (
              <span className="text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full">
                {node.children.length} danh mục con
              </span>
            )}
          </div>
          {/* Reparent select (move to another parent) */}
          <div className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <ReparentSelect node={node} allCategories={allCategories} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoveButtons node={node} siblings={[]} />
          <button
            id={`add-child-btn-${node.id}`}
            onClick={() => onAddChild(node.id)}
            title="Thêm danh mục con"
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-all"
          >
            + Con
          </button>
          <button
            id={`edit-btn-${node.id}`}
            onClick={() => onEdit(node)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
          >
            ✏️ Sửa
          </button>
          <DeleteButton node={node} onDeleted={() => {}} />
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className={`ml-8 border-l-2 border-slate-800 pl-4 space-y-0`}>
          {node.children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              depth={depth + 1}
              allCategories={allCategories}
              onAddChild={onAddChild}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryNode;
