import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance, { BASE_URL } from '../../../../shared-ui/src/lib/axios';
import { useAuth } from '../../../../shared-ui/src/context/AuthContext';
import { useCart } from '../../../../shared-ui/src/context/CartContext';
import { getFullImageUrl, getThumbnailUrl } from '../../shared/utils/image';
import { useQueryClient } from '@tanstack/react-query';
import type { IProduct, IReview, IQAItem } from '@shared-ui/types/models';



interface ProductDetail extends IProduct {
  store_name: string;
  vendor_slug: string;
}

interface ReviewWithUser extends IReview {
  user_name: string;
  avatar_url?: string;
}



const PLACEHOLDER_IMG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' fill='%231e293b'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='40' fill='%2364748b'%3ENo Image%3C/text%3E%3C/svg%3E`;
const formatPrice = (value: number) => `${Number(value).toLocaleString('vi-VN')}₫`;

const ProductDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { addItem } = useCart();
  const [activeImg, setActiveImg] = useState(0);
  const [ratingFilter, setRatingFilter] = useState(0);

  const [isAdding, setIsAdding] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [questionContent, setQuestionContent] = useState('');
  const [isSubmittingQA, setIsSubmittingQA] = useState(false);
  const queryClient = useQueryClient();

  const { data: couponsData, refetch: refetchCoupons } = useQuery({
    queryKey: ['product-coupons', id],
    queryFn: async () => {
      const endpoint = user ? `/coupons/product/${id}` : `/coupons/product/${id}/public`;
      const response = await axiosInstance.get<{ data: any[] }>(endpoint);
      return response.data.data;
    },
    enabled: !!id,
  });

  const handleCollectCoupon = async (couponId: string) => {
    if (!user) {
      alert('Vui lòng đăng nhập để lưu mã giảm giá!');
      return;
    }
    try {
      await axiosInstance.post('/coupons/collect', { coupon_id: couponId });
      alert('Đã lưu mã giảm giá thành công!');
      refetchCoupons();
    } catch (error: any) {
      const errMsg = error.response?.data?.message || 'Có lỗi xảy ra khi lưu mã giảm giá.';
      alert(errMsg);
    }
  };

  const handleAddToCart = async () => {
    if (!data?.product) return;
    setIsAdding(true);
    await addItem(data.product, 1);
    setIsAdding(false);
    // Simple alert for feedback
    alert('Đã thêm sản phẩm vào giỏ hàng!');
  };

  const handleSubmitQuestion = async () => {
    if (!questionContent.trim()) return;
    
    setIsSubmittingQA(true);
    try {
      await axiosInstance.post(`/products/${id}/qa`, { question: questionContent });
      setQuestionContent('');
      setIsAsking(false);
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      alert('Câu hỏi của bạn đã được gửi thành công!');
    } catch (error) {
      console.error('Error submitting question:', error);
      alert('Đã có lỗi xảy ra khi gửi câu hỏi. Vui lòng thử lại sau.');
    } finally {
      setIsSubmittingQA(false);
    }
  };


  const { data, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await axiosInstance.get<{ data: { product: ProductDetail; relatedProducts: IProduct[]; reviews: ReviewWithUser[]; qa: IQAItem[] } }>(`/products/${id}`);
      return response.data.data;
    },

    enabled: !!id,
  });

  if (isLoading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
    </div>
  );

  if (error || !data) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
      <h2 className="text-2xl font-bold text-slate-100">Sản phẩm không tồn tại</h2>
      <Link to="/shop" className="text-indigo-400 hover:underline">Quay lại cửa hàng</Link>
    </div>
  );

  const { product, relatedProducts, reviews, qa } = data;
  const images = product.image_urls && product.image_urls.length > 0 
    ? product.image_urls 
    : [null];

  const filteredReviews = ratingFilter === 0 
    ? reviews 
    : reviews.filter(r => r.stars === ratingFilter);

  return (
    <div className="space-y-12 pb-20">
      {/* Breadcrumb */}
      <nav className="flex text-sm text-slate-500">
        <Link to="/shop" className="hover:text-slate-300">Cửa hàng</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300 line-clamp-1">{product.name}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-4xl bg-slate-900 border border-white/5">
            <img 
              src={getFullImageUrl(images[activeImg])} 
              alt={product.name} 
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 transition-all ${
                    activeImg === i ? 'border-indigo-500' : 'border-transparent grayscale hover:grayscale-0'
                  }`}
                >
                  <img src={getThumbnailUrl(img)} className="h-full w-full object-cover" alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                {product.store_name}
              </span>
              <div className="flex items-center text-amber-400 text-sm">
                <span>★ {Number(product.average_rating).toFixed(1)}</span>
                <span className="mx-2 text-slate-700">|</span>
                <span className="text-slate-500">{reviews.length} Đánh giá</span>
              </div>
            </div>
            <h1 className="text-4xl font-black text-white leading-tight">{product.name}</h1>
            <p className="text-3xl font-black text-emerald-400">{formatPrice(product.price)}</p>
          </div>

          <div className="space-y-4 border-y border-white/5 py-8">
            <div className="flex items-center gap-4">
              <span className="text-slate-400">Tình trạng:</span>
              {product.stock > 0 ? (
                <span className="font-bold text-emerald-400">Còn {product.stock} sản phẩm</span>
              ) : (
                <span className="font-bold text-rose-500">Hết hàng</span>
              )}
            </div>
            <div className="prose prose-invert max-w-none text-slate-400 leading-relaxed">
              {product.description || 'Chưa có mô tả cho sản phẩm này.'}
            </div>
          </div>

          {/* Coupons section */}
          {couponsData && couponsData.length > 0 && (
            <div className="space-y-4 border-b border-white/5 pb-8">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Mã giảm giá của shop</h3>
              <div className="flex flex-wrap gap-3">
                {couponsData.map((coupon: any) => (
                  <div
                    key={coupon.id}
                    className="relative flex items-center bg-slate-900 border border-indigo-500/30 rounded-xl overflow-hidden p-3 pl-4 pr-4 shadow-md transition-all hover:border-indigo-500/60"
                  >
                    {/* Ticket cut details on the left */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-3 bg-slate-950 rounded-r-full border-y border-r border-indigo-500/30" />
                    
                    <div className="flex flex-col space-y-0.5 mr-6">
                      <span className="text-xs font-black text-indigo-400 uppercase tracking-wide">
                        {coupon.code}
                      </span>
                      <span className="text-sm font-black text-white">
                        {coupon.type === 'percentage' 
                          ? `Giảm ${parseFloat(coupon.value)}%` 
                          : `Giảm ${parseFloat(coupon.value).toLocaleString('vi-VN')}đ`}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Đơn tối thiểu {parseFloat(coupon.min_order_value || 0).toLocaleString('vi-VN')}đ
                      </span>
                    </div>

                    <button
                      onClick={() => handleCollectCoupon(coupon.id)}
                      disabled={coupon.is_collected}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                        coupon.is_collected
                          ? 'bg-emerald-500/10 text-emerald-400 cursor-default'
                          : 'bg-indigo-600 text-white hover:bg-indigo-500'
                      }`}
                    >
                      {coupon.is_collected ? 'Đã lưu' : 'Lưu mã'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button 
              disabled={product.stock === 0 || isAdding}
              onClick={handleAddToCart}
              className="flex-1 rounded-3xl bg-indigo-600 px-8 py-4 font-bold text-white shadow-lg transition-all hover:bg-indigo-500 hover:shadow-indigo-500/20 disabled:grayscale disabled:opacity-50"
            >
              {isAdding ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
            </button>
            <button className="rounded-3xl border border-slate-700 px-8 py-4 font-bold text-white transition-all hover:bg-slate-800">
              Mua ngay
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_350px]">
        {/* Reviews & QA */}
        <div className="space-y-12">
          {/* Reviews */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-white">Đánh giá khách hàng</h2>
              <div className="flex gap-2">
                {[0, 5, 4, 3, 2, 1].map(s => (
                  <button
                    key={s}
                    onClick={() => setRatingFilter(s)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                      ratingFilter === s 
                        ? 'bg-indigo-500 text-white' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {s === 0 ? 'Tất cả' : `${s} ★`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {filteredReviews.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center text-slate-500">
                  Chưa có đánh giá nào cho mức này
                </div>
              ) : (
                filteredReviews.map(r => (
                  <div key={r.id} className="rounded-4xl bg-slate-900/50 p-6 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 font-bold">
                          {r.user_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{r.user_name}</p>
                          <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString('vi-VN')}</p>
                        </div>
                      </div>
                      <div className="flex text-amber-400 text-xs">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i}>{i < r.stars ? '★' : '☆'}</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{r.comment}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* QA */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-white">Hỏi đáp về sản phẩm</h2>
              {user && !isAsking && (
                <button 
                  onClick={() => setIsAsking(true)}
                  className="rounded-full bg-slate-800 px-6 py-2 text-sm font-bold text-indigo-400 transition hover:bg-slate-700"
                >
                  Đặt câu hỏi
                </button>
              )}
            </div>

            {isAsking && (
              <div className="rounded-3xl bg-slate-800/50 p-6 border border-slate-700 space-y-4">
                <textarea
                  value={questionContent}
                  onChange={(e) => setQuestionContent(e.target.value)}
                  placeholder="Nhập câu hỏi của bạn tại đây..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px]"
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setIsAsking(false);
                      setQuestionContent('');
                    }}
                    className="px-6 py-2 text-sm font-bold text-slate-400 hover:text-white transition"
                    disabled={isSubmittingQA}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSubmitQuestion}
                    disabled={isSubmittingQA || !questionContent.trim()}
                    className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingQA ? 'Đang gửi...' : 'Gửi câu hỏi'}
                  </button>
                </div>
              </div>
            )}


            {!user && (
              <div className="rounded-3xl bg-indigo-500/5 p-4 text-center border border-indigo-500/10 text-sm text-indigo-300">
                Vui lòng <Link to="/login" className="font-bold underline">đăng nhập</Link> để đặt câu hỏi.
              </div>
            )}

            <div className="space-y-6">
              {qa.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center text-slate-500">
                  Chưa có câu hỏi nào. Hãy là người đầu tiên!
                </div>
              ) : (
                qa.map(q => (
                  <div key={q.id} className="space-y-4">
                    <div className="flex gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-xs font-bold text-white">Q</span>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-white">{q.question}</p>
                        <p className="text-xs text-slate-500">Bởi {q.user_name} · {new Date(q.created_at).toLocaleDateString('vi-VN')}</p>
                      </div>
                    </div>
                    {q.answer && (
                      <div className="ml-12 flex gap-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-white">A</span>
                        <div className="rounded-2xl bg-slate-900 p-4 border border-white/5">
                          <p className="text-sm text-slate-300 leading-relaxed">{q.answer}</p>
                          <p className="mt-2 text-[10px] uppercase font-bold tracking-widest text-emerald-500">Phản hồi từ Shop</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Related */}
        <aside className="space-y-6">
          <h3 className="text-xl font-bold text-white">Sản phẩm tương tự</h3>
          <div className="grid gap-4">
            {relatedProducts.map(rp => (
              <Link 
                to={`/product/${rp.id}`} 
                key={rp.id}
                className="group flex gap-4 rounded-3xl bg-slate-900/50 p-3 border border-white/5 transition-all hover:bg-slate-900"
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-800">
                  <img 
                    src={getThumbnailUrl(rp.image_urls?.[0])} 
                    className="h-full w-full object-cover transition-transform group-hover:scale-110" 
                    alt={rp.name} 
                  />
                </div>
                <div className="flex flex-col justify-center space-y-1">
                  <p className="text-sm font-bold text-slate-100 line-clamp-1 group-hover:text-indigo-400">{rp.name}</p>
                  <p className="text-xs font-black text-emerald-400">{formatPrice(rp.price)}</p>
                  <div className="flex items-center text-[10px] text-amber-400">
                    <span>★ {Number(rp.average_rating).toFixed(1)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ProductDetailPage;
