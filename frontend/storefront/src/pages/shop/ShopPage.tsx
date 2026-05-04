import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../../shared-ui/src/lib/axios';

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image_urls?: string[] | null;
  average_rating: number;
  sold?: number;
  is_featured?: boolean;
  category_name?: string;
  category_slug?: string;
  created_at?: string;
}

const STAR_OPTIONS = [
  { label: '4 sao trở lên', value: 4 },
  { label: '3 sao trở lên', value: 3 },
  { label: '2 sao trở lên', value: 2 },
];

const PLACEHOLDER_IMG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' fill='%231e293b'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='40' fill='%2364748b'%3ENo Image%3C/text%3E%3C/svg%3E`;

const formatPrice = (value: number) => `${value.toLocaleString('vi-VN')}₫`;

const ProductCard = ({ product }: { product: Product }) => {
  const imgSrc = product.image_urls?.[0] ?? PLACEHOLDER_IMG;
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-lg cursor-pointer">
      <div className="aspect-square bg-slate-800 relative overflow-hidden">
        <img
          src={imgSrc}
          alt={product.name}
          className="h-full w-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }}
        />
        {product.is_featured && (
          <span className="absolute left-4 top-4 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
            Nổi bật
          </span>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-100 line-clamp-2">{product.name}</p>
          {product.category_name && <p className="text-xs text-slate-500">{product.category_name}</p>}
        </div>
        <div className="flex items-center gap-2 text-sm text-amber-400">
          <span>★ {Number(product.average_rating).toFixed(1)}</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-500">Đã bán {product.sold ?? 0}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-black text-emerald-400">{formatPrice(Number(product.price))}</span>
          {product.originalPrice && (
            <span className="text-slate-500 text-xs line-through">{formatPrice(product.originalPrice)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden animate-pulse">
    <div className="aspect-square bg-slate-800" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-slate-800 rounded-full w-3/4" />
      <div className="h-3 bg-slate-800 rounded-full w-1/3" />
      <div className="h-5 bg-slate-800 rounded-full w-1/2" />
    </div>
  </div>
);

const ShopPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000000);
  const [page, setPage] = useState(1);
  const limit = 12;

  // Fetch categories từ API
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await axiosInstance.get('/categories');
      const categories = response.data.data.categories as Category[];
      console.log('[shop]: Categories fetched - 200');
      return categories;
    },
    staleTime: 10 * 60 * 1000, // 10 phút
  });

  const categories = categoriesQuery.data ?? [];
  // Chỉ hiển thị danh mục cha (parent_id === null)
  const parentCategories = categories.filter((c) => c.parent_id === null);

  // Featured products
  const featuredQuery = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const params = new URLSearchParams({ is_featured: 'true', limit: '8', sort: 'latest' });
      const response = await axiosInstance.get(`/products?${params}`);
      const products = response.data.data.products as Product[];
      console.log('[shop]: Featured products fetched - 200 - [is_featured=true]');
      return products;
    },
  });

  // Latest products
  const latestQuery = useQuery({
    queryKey: ['latest-products'],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '8', sort: 'latest' });
      const response = await axiosInstance.get(`/products?${params}`);
      const products = response.data.data.products as Product[];
      console.log('[shop]: Latest products fetched - 200 - [8 newest products]');
      return products;
    },
  });

  // Product listing với filters
  const listingQuery = useQuery({
    queryKey: ['products', searchQuery, sortBy, selectedCategory, ratingFilter, minPrice, maxPrice, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (sortBy) params.append('sort', sortBy);
      if (minPrice > 0) params.append('min_price', String(minPrice));
      if (maxPrice < 10000000) params.append('max_price', String(maxPrice));
      if (selectedCategory) params.append('category', selectedCategory);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const response = await axiosInstance.get(`/products?${params}`);
      const data = response.data.data as { products: Product[]; total: number; page: number; limit: number };
      console.log('[shop]: Product listing fetched - 200 - [Catalog query completed]');
      return data;
    },
  });

  const listingData = listingQuery.data;
  const products = listingData?.products ?? [];
  const total = listingData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const featuredProducts = featuredQuery.data;
  const latestProducts = latestQuery.data;

  const displayProducts = useMemo(() => {
    if (ratingFilter > 0) {
      return products.filter((p) => Number(p.average_rating) >= ratingFilter);
    }
    return products;
  }, [products, ratingFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="space-y-10">
      {/* Hero Banner */}
      <section className="rounded-4xl bg-linear-to-r from-slate-950 via-slate-900 to-slate-800 p-8 shadow-xl">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] items-center">
          <div className="space-y-6">
            <span className="inline-flex rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
              Khuyến mãi đặc biệt
            </span>
            <h1 className="text-4xl font-black text-white leading-tight">Mua sắm thông minh, nhận ưu đãi ngay hôm nay</h1>
            <p className="max-w-xl text-slate-400">
              Khám phá sản phẩm nổi bật và mới nhất trên Reshop. Lọc theo danh mục, giá, sao và tìm ra lựa chọn phù hợp chỉ trong vài giây.
            </p>
            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="Tìm kiếm sản phẩm..."
                className="flex-1 rounded-full border border-slate-700 bg-slate-900 px-5 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                Tìm
              </button>
            </form>
          </div>
          <div className="rounded-4xl border border-white/10 bg-slate-950/70 p-6 shadow-inner">
            <div className="aspect-4/3 overflow-hidden rounded-3xl bg-slate-700">
              <img
                src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80"
                alt="Reshop banner"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-100">Sản phẩm nổi bật</h2>
            <p className="text-slate-500">Những sản phẩm được chọn lọc từ nhà cung cấp uy tín.</p>
          </div>
          <span className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-300">
            Có {featuredProducts?.length ?? 0} sản phẩm nổi bật
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featuredQuery.isLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : (featuredProducts ?? []).length > 0
            ? (featuredProducts as Product[]).map((p) => <ProductCard key={p.id} product={p} />)
            : (
              <div className="col-span-4 rounded-3xl border border-dashed border-slate-700 p-10 text-center text-slate-500">
                Chưa có sản phẩm nổi bật
              </div>
            )}
        </div>
      </section>

      {/* Latest Products */}
      <section className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-100">Mới nhất</h2>
            <p className="text-slate-500">Sản phẩm cập nhật gần nhất từ hệ thống.</p>
          </div>
          <span className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-300">
            {latestProducts ? `${latestProducts.length} sản phẩm` : '...'}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {latestQuery.isLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : (latestProducts ?? []).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Catalog: Filter + Listing */}
      <section className="grid gap-6 xl:grid-cols-[300px_1fr]">
        {/* Sidebar filter */}
        <aside className="rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-lg h-fit">
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Bộ lọc</h3>
              <p className="text-sm text-slate-500">Lọc theo danh mục, giá và đánh giá sao.</p>
            </div>

            {/* Danh mục (từ API) */}
            <div className="space-y-3 rounded-3xl bg-slate-950 p-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Danh mục</h4>
              {categoriesQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-4 animate-pulse rounded-full bg-slate-800" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="flex items-center gap-3 text-sm text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === ''}
                      onChange={() => { setSelectedCategory(''); setPage(1); }}
                      className="h-4 w-4 border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                    />
                    <span>Tất cả</span>
                  </label>
                  {parentCategories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-3 text-sm text-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        checked={selectedCategory === cat.slug}
                        onChange={() => { setSelectedCategory(cat.slug); setPage(1); }}
                        className="h-4 w-4 border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                      />
                      <span>{cat.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Khoảng giá */}
            <div className="space-y-3 rounded-3xl bg-slate-950 p-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Khoảng giá</h4>
              <div className="grid gap-3">
                <input
                  type="number"
                  value={minPrice}
                  min={0}
                  onChange={(e) => { setMinPrice(Number(e.target.value)); setPage(1); }}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
                  placeholder="Giá từ"
                />
                <input
                  type="number"
                  value={maxPrice}
                  min={0}
                  onChange={(e) => { setMaxPrice(Number(e.target.value)); setPage(1); }}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
                  placeholder="Giá đến"
                />
              </div>
            </div>

            {/* Đánh giá sao */}
            <div className="space-y-3 rounded-3xl bg-slate-950 p-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Đánh giá</h4>
              <div className="space-y-2">
                {STAR_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-3 text-sm text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="rating"
                      checked={ratingFilter === option.value}
                      onChange={() => setRatingFilter(option.value)}
                      className="h-4 w-4 border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
                <label className="flex items-center gap-3 text-sm text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="rating"
                    checked={ratingFilter === 0}
                    onChange={() => setRatingFilter(0)}
                    className="h-4 w-4 border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span>Tất cả</span>
                </label>
              </div>
            </div>
          </div>
        </aside>

        {/* Product listing */}
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-lg sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">Hiển thị {displayProducts.length} / {total} sản phẩm</p>
              <h3 className="text-xl font-black text-slate-100">Danh sách sản phẩm</h3>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="rounded-2xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="latest">Mới nhất</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
                <option value="rating">Đánh giá cao</option>
              </select>
              {/* Pagination */}
              <button
                onClick={() => setPage((c) => Math.max(1, c - 1))}
                disabled={page <= 1}
                className="rounded-2xl bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Trước
              </button>
              <button
                onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
                disabled={page >= totalPages}
                className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sau →
              </button>
            </div>
          </div>

          {/* Grid */}
          {listingQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 p-16 text-center text-slate-500">
              <p className="text-4xl mb-4">🔍</p>
              <p className="font-semibold text-slate-400">Không tìm thấy sản phẩm nào</p>
              <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {displayProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination footer */}
          <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-slate-900 p-4 text-sm text-slate-400">
            <span>Trang {page} / {totalPages}</span>
            <span>{displayProducts.length} sản phẩm được hiển thị</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ShopPage;
