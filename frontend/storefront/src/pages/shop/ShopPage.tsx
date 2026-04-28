import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../../shared-ui/src/lib/axios';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  sold: number;
  category: string;
  isNew?: boolean;
  isSale?: boolean;
}

const CATEGORIES = ['Tất cả', 'Điện tử', 'Thời trang', 'Gia dụng', 'Sách', 'Thể thao'];

const ProductCard = ({ product }: { product: Product }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
    <div className="aspect-square bg-slate-800 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-30">🛍</div>
      {product.isSale && (
        <span className="absolute top-2 left-2 bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">SALE</span>
      )}
      {product.isNew && (
        <span className="absolute top-2 right-2 bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">MỚI</span>
      )}
      <button className="absolute bottom-2 right-2 w-8 h-8 bg-slate-700/80 hover:bg-rose-500 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-300 hover:text-white transition-all opacity-0 group-hover:opacity-100">
        ♡
      </button>
    </div>
    <div className="p-4">
      <p className="text-sm text-slate-200 font-semibold line-clamp-2 leading-tight">{product.name}</p>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-amber-400 text-xs">★ {product.rating}</span>
        <span className="text-slate-600 text-xs">·</span>
        <span className="text-slate-500 text-xs">Đã bán {product.sold}</span>
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <span className="text-indigo-400 font-black text-base">{product.price.toLocaleString()}₫</span>
        {product.originalPrice && (
          <span className="text-slate-600 text-xs line-through">{product.originalPrice.toLocaleString()}₫</span>
        )}
      </div>
    </div>
  </div>
);

const ShopPage = () => {
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products', activeCategory, searchQuery, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams({ category: activeCategory, q: searchQuery, sort: sortBy });
      return (await axiosInstance.get(`/products?${params}`)).data;
    },
  });

  const mockProducts: Product[] = [
    { id: '1', name: 'Nike Air Max 270 React', price: 1850000, originalPrice: 2200000, rating: 4.8, sold: 234, category: 'Thời trang', isSale: true },
    { id: '2', name: 'Samsung Galaxy Buds2 Pro', price: 2100000, rating: 4.7, sold: 189, category: 'Điện tử', isNew: true },
    { id: '3', name: 'Mechanical Keyboard Keychron K2', price: 890000, rating: 4.9, sold: 512, category: 'Điện tử' },
    { id: '4', name: 'Áo Polo Ralph Lauren Basic', price: 650000, originalPrice: 850000, rating: 4.6, sold: 320, category: 'Thời trang', isSale: true },
    { id: '5', name: 'Bình Giữ Nhiệt Stanley 1L', price: 750000, rating: 4.8, sold: 445, category: 'Gia dụng' },
    { id: '6', name: 'Đắc Nhân Tâm (Bìa Cứng)', price: 89000, rating: 4.9, sold: 1200, category: 'Sách', isNew: true },
  ];

  const displayProducts = products || mockProducts;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-100">Cửa Hàng</h2>
        <p className="text-slate-500 text-sm mt-1">Khám phá hàng nghìn sản phẩm chất lượng</p>
      </div>

      {/* Search + Sort bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm sản phẩm..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none transition-all"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-all"
        >
          <option value="popular">Phổ biến nhất</option>
          <option value="newest">Mới nhất</option>
          <option value="price_asc">Giá thấp → cao</option>
          <option value="price_desc">Giá cao → thấp</option>
        </select>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
              activeCategory === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-square bg-slate-800" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-slate-800 rounded" />
                <div className="h-3 bg-slate-800 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ShopPage;
