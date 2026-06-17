import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useDebounce } from '../../../../shared-ui/src/hooks/useDebounce';
import axiosInstance, { BASE_URL } from '../../../../shared-ui/src/lib/axios';
import { getFullImageUrl, getThumbnailUrl } from '../../shared/utils/image';
import { useAuth } from '../../../../shared-ui/src/context/AuthContext';

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
  const imgSrc = product.image_urls?.[0] ? getThumbnailUrl(product.image_urls[0]) : PLACEHOLDER_IMG;
  return (
    <Link to={`/product/${product.id}`} className="block h-full">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-lg cursor-pointer h-full">
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
    </Link>
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
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedSearch = useDebounce(searchInput, 300);
  const productListRef = React.useRef<HTMLDivElement>(null);

  const [isSearchingByImage, setIsSearchingByImage] = useState(false);
  const imageSearchInputRef = React.useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const currentRole = user?.role || 'guest';

  // Fetch tool permissions to check if image search is allowed
  const { data: toolPermissions } = useQuery({
    queryKey: ['tool-permissions'],
    queryFn: async () => {
      const response = await axiosInstance.get('/tool-permissions');
      return response.data.data as { tool_code: string; allowed_roles: string[] }[];
    },
  });

  const isImageSearchAllowed = useMemo(() => {
    if (!toolPermissions) return true; // fallback to true during loading
    const permission = toolPermissions.find(p => p.tool_code === 'search_image');
    if (!permission) return true;
    return permission.allowed_roles.includes(currentRole);
  }, [toolPermissions, currentRole]);

  const handleImageSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      const mimeType = file.type;
      const base64Str = base64Data.split(',')[1];
      
      setIsSearchingByImage(true);
      try {
        const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
        const API_URL = import.meta.env.VITE_GEMINI_API_URL 
          ? `${import.meta.env.VITE_GEMINI_API_URL}?key=${API_KEY}`
          : `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${API_KEY}`;

        const requestOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Hãy phân tích hình ảnh này và trả về duy nhất tên của sản phẩm trong hình. Hãy trả về tên sản phẩm ngắn gọn nhất bằng tiếng Việt hoặc tiếng Anh phổ biến, không thêm bất kỳ từ ngữ giải thích nào khác (không có "Đây là", không có dấu chấm, không giải thích). Ví dụ: "Vợt cầu lông Yonex Astrox 88D".'
                  },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Str
                    }
                  }
                ]
              }
            ]
          })
        };

        const response = await fetch(API_URL, requestOptions);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "Lỗi kết nối");

        const productName = data.candidates[0].content.parts[0].text.trim();
        if (productName) {
          setSearchInput(productName);
          updateFilters({ q: productName });
          productListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch (error) {
        console.error("Lỗi tìm kiếm hình ảnh:", error);
        alert("Không thể phân tích hình ảnh. Vui lòng thử lại!");
      } finally {
        setIsSearchingByImage(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const sortBy = searchParams.get('sort') || 'latest';
  const selectedCategory = searchParams.get('category') || '';
  const minPrice = parseInt(searchParams.get('min_price') || '0', 10);
  const maxPrice = parseInt(searchParams.get('max_price') || '10000000', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const ratingFilter = parseInt(searchParams.get('rating') || '0', 10);
  const limit = 12;

  const updateFilters = (newFilters: Record<string, string | number | undefined>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === 0 || (key === 'max_price' && value === 10000000)) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });
    if (!newFilters.page) nextParams.set('page', '1');
    setSearchParams(nextParams);
  };

  useEffect(() => {
    const currentQ = searchParams.get('q') || '';
    if (debouncedSearch !== currentQ) {
      updateFilters({ q: debouncedSearch });
    }
    if (debouncedSearch.length >= 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [debouncedSearch]);

  const suggestionsQuery = useQuery({
    queryKey: ['suggestions', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const response = await axiosInstance.get(`/products?q=${debouncedSearch}&limit=5`);
      return response.data.data.items as Product[];
    },
    enabled: debouncedSearch.length >= 2,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await axiosInstance.get('/categories');
      const categories = response.data.data.categories as Category[];
      console.log('[shop]: Categories fetched - 200');
      return categories;
    },
    staleTime: 10 * 60 * 1000,
  });

  const categories = categoriesQuery.data ?? [];
  const parentCategories = categories.filter((c) => c.parent_id === null);

  const featuredQuery = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const params = new URLSearchParams({ is_featured: 'true', limit: '8', sort: 'latest' });
      const response = await axiosInstance.get(`/products?${params}`);
      const products = response.data.data.items as Product[];
      return products;
    },
  });

  const latestQuery = useQuery({
    queryKey: ['latest-products'],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '8', sort: 'latest' });
      const response = await axiosInstance.get(`/products?${params}`);
      const products = response.data.data.items as Product[];
      return products;
    },
  });

  const listingQuery = useQuery({
    queryKey: ['products', debouncedSearch, sortBy, selectedCategory, minPrice, maxPrice, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('q', debouncedSearch);
      if (sortBy) params.append('sort', sortBy);
      if (minPrice > 0) params.append('min_price', String(minPrice));
      if (maxPrice < 10000000) params.append('max_price', String(maxPrice));
      if (selectedCategory) params.append('category', selectedCategory);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const response = await axiosInstance.get(`/products?${params}`);
      const data = response.data.data as { items: Product[]; total: number; page: number; limit: number };
      console.log('[shop]: Product listing fetched - 200');
      return data;
    },
  });

  const products = listingQuery.data?.items ?? [];
  const total = listingQuery.data?.total ?? 0;
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
    setShowSuggestions(false);
    updateFilters({ q: searchInput });
    // Scroll to results
    productListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            <form onSubmit={handleSearch} className="flex gap-2 max-w-lg relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="flex-1 rounded-full border border-slate-700 bg-slate-900 px-5 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                Tìm
              </button>
              {isImageSearchAllowed && (
                <>
                  <button
                    type="button"
                    onClick={() => imageSearchInputRef.current?.click()}
                    disabled={isSearchingByImage}
                    className="rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-3 text-slate-300 transition flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                    title="Tìm kiếm bằng hình ảnh"
                  >
                    {isSearchingByImage ? (
                      <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    ref={imageSearchInputRef}
                    onChange={handleImageSearchChange}
                    className="hidden"
                  />
                </>
              )}

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestionsQuery.data && suggestionsQuery.data.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden z-50">
                  {suggestionsQuery.data.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSearchInput(p.name);
                        setShowSuggestions(false);
                        updateFilters({ q: p.name });
                        productListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="px-5 py-3 hover:bg-slate-800 cursor-pointer flex items-center justify-between border-b border-slate-800 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">🔍</span>
                        <span className="text-sm text-slate-200">{p.name}</span>
                      </div>
                      <span className="text-xs text-emerald-400 font-bold">{formatPrice(p.price)}</span>
                    </div>
                  ))}
                </div>
              )}
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {latestQuery.isLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : (latestProducts ?? []).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Catalog: Filter + Listing */}
      <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar filter */}
        <aside className="rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-lg h-fit">
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-100">Bộ lọc</h3>
                {(selectedCategory || minPrice > 0 || maxPrice < 10000000 || ratingFilter > 0) && (
                  <button 
                    onClick={() => updateFilters({ category: '', min_price: 0, max_price: 10000000, rating: 0, page: 1 })}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>
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
                      onChange={() => updateFilters({ category: '' })}
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
                        onChange={() => updateFilters({ category: cat.slug })}
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
                  onChange={(e) => updateFilters({ min_price: Number(e.target.value) })}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
                  placeholder="Giá từ"
                />
                <input
                  type="number"
                  value={maxPrice}
                  min={0}
                  onChange={(e) => updateFilters({ max_price: Number(e.target.value) })}
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
                      onChange={() => updateFilters({ rating: option.value })}
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
                    onChange={() => updateFilters({ rating: 0 })}
                    className="h-4 w-4 border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span>Tất cả</span>
                </label>
              </div>
            </div>
          </div>
        </aside>

        {/* Product listing */}
        <div ref={productListRef} className="space-y-6 scroll-mt-10">
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
                onChange={(e) => updateFilters({ sort: e.target.value })}
                className="rounded-2xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="latest">Mới nhất</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
                <option value="rating">Đánh giá cao</option>
              </select>
              {/* Pagination */}
              <button
                onClick={() => updateFilters({ page: page - 1 })}
                disabled={page <= 1}
                className="rounded-2xl bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Trước
              </button>
              <button
                onClick={() => updateFilters({ page: page + 1 })}
                disabled={page >= totalPages}
                className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sau →
              </button>
            </div>
          </div>

          {/* Grid */}
          {listingQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 p-16 text-center text-slate-500">
              <p className="text-4xl mb-4">🔍</p>
              <p className="font-semibold text-slate-400">Không tìm thấy sản phẩm nào</p>
              <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
