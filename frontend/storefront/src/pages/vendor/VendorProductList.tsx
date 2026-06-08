import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFullImageUrl, getThumbnailUrl } from '../../shared/utils/image';
import axiosInstance from '@shared-ui/lib/axios';
import { DataTable } from '@shared-ui/components';
import type { Column } from '@shared-ui/components/DataTable';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  category_name: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive' | 'out_of_stock';
  image_urls: string[];
  created_at: string;
}

const VendorProductList = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  
  // Local state to track quantity adjustments (for UI demonstration as requested)
  const [adjustedStocks, setAdjustedStocks] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading, refetch } = useQuery<{ items: Product[], total: number }>({
    queryKey: ['vendor-products', page, search],
    queryFn: async () => {
      const res = await axiosInstance.get('/vendor/products', {
        params: { page, q: search, limit: 10 }
      });
      return res.data.data;
    },
    placeholderData: (previousData) => previousData
  });

  const handleAdjustQuantity = (productId: string, currentStock: number, delta: number) => {
    setAdjustedStocks(prev => ({
      ...prev,
      [productId]: (prev[productId] ?? currentStock) + delta
    }));
  };

  const handleSaveStock = async () => {
    if (Object.keys(adjustedStocks).length === 0) return;
    
    setIsSaving(true);
    try {
      const updates = Object.entries(adjustedStocks).map(([id, stock]) => ({
        id,
        stock
      }));

      await axiosInstance.put('/vendor/products/bulk-stock', { updates });
      
      alert('Cập nhật tồn kho thành công!');
      setAdjustedStocks({});
      refetch();
    } catch (err) {
      console.error('Error saving stock:', err);
      alert('Có lỗi xảy ra khi cập nhật tồn kho.');
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Sản phẩm',
      render: (name, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-700">
            {row.image_urls?.[0] ? (
              <img src={getThumbnailUrl(row.image_urls[0])} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">N/A</div>
            )}
          </div>
          <div>
            <div className="font-bold text-slate-200 line-clamp-1">{name}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-tight">{row.category_name}</div>
          </div>
        </div>
      )
    },
    {
      key: 'price',
      header: 'Giá bán',
      render: (val) => (
        <span className="text-slate-300 font-medium">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)}
        </span>
      )
    },
    {
      key: 'stock',
      header: 'Tồn kho',
      render: (stock, row) => {
        const displayStock = adjustedStocks[row.id] ?? stock;
        const isChanged = adjustedStocks[row.id] !== undefined && adjustedStocks[row.id] !== stock;

        return (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleAdjustQuantity(row.id, stock, -1)}
              disabled={displayStock <= 0}
              className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700 transition-colors disabled:opacity-30"
            >
              -
            </button>
            <div className="min-w-[2.5rem] text-center">
              <span className={`font-bold ${isChanged ? 'text-amber-400' : 'text-slate-200'}`}>
                {displayStock}
              </span>
              {isChanged && <div className="text-[8px] text-amber-500/80 absolute -mt-1 ml-4">Chưa lưu</div>}
            </div>
            <button
              onClick={() => handleAdjustQuantity(row.id, stock, 1)}
              className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400 border border-slate-700 transition-colors"
            >
              +
            </button>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (status) => {
        const styles = {
          active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
          out_of_stock: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
        };
        const labels = {
          active: 'Đang bán',
          inactive: 'Ẩn',
          out_of_stock: 'Hết hàng'
        };
        return (
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${styles[status as keyof typeof styles]}`}>
            {labels[status as keyof typeof labels]}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (_, row) => (
        <div className="flex gap-2">
          <button 
            onClick={() => navigate(`/vendor/products/${row.id}/edit`)}
            className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors border border-slate-700"
            title="Chỉnh sửa"
          >
            ✏️
          </button>
          <button 
            className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors border border-slate-700"
            title="Xóa"
          >
            🗑️
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Quản Lý Sản Phẩm</h2>
          <p className="text-slate-500 text-sm mt-1">Xem và quản lý danh mục hàng hóa của bạn.</p>
        </div>
        <button 
          onClick={() => navigate('/vendor/products/new')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
        >
          <span className="text-lg">+</span> Thêm sản phẩm
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tên hoặc mô tả..." 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => refetch()}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-200 transition-colors"
           >
            Làm mới
           </button>
        </div>
      </div>

      <DataTable 
        columns={columns}
        data={data?.items || []}
        loading={isLoading}
        pagination={{
          total: data?.total || 0,
          page,
          limit: 10,
          onPageChange: (p) => setPage(p)
        }}
        emptyText="Không tìm thấy sản phẩm nào."
      />

      {Object.keys(adjustedStocks).length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl shadow-indigo-500/40 flex items-center gap-6 animate-in slide-in-from-bottom-full duration-300">
          <div className="text-sm font-medium">
            Có thay đổi chưa lưu cho <span className="font-bold">{Object.keys(adjustedStocks).length}</span> sản phẩm.
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setAdjustedStocks({})}
              disabled={isSaving}
              className="text-xs font-bold uppercase tracking-widest hover:underline opacity-80 disabled:opacity-30"
            >
              Hủy
            </button>
            <button 
              onClick={handleSaveStock}
              disabled={isSaving}
              className="bg-white text-indigo-600 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  Đang lưu...
                </>
              ) : 'Lưu ngay'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorProductList;
