import React from 'react';

type ProductCardProps = {
  imageUrl: string;
  name: string;
  price: number;
  rating: number;
  isFeatured?: boolean;
  onClick?: () => void;
};

const formatPrice = (value: number) => {
  return new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
};

const ProductCard: React.FC<ProductCardProps> = ({
  imageUrl,
  name,
  price,
  rating,
  isFeatured = false,
  onClick,
}) => {
  const stars = Array.from({ length: 5 }, (_, index) => index + 1);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none"
    >
      <div className="relative overflow-hidden">
        <img
          src={imageUrl}
          alt={name}
          className="h-64 w-full object-cover transition duration-300 group-hover:scale-105"
        />
        {isFeatured && (
          <span className="absolute left-4 top-4 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
            Nổi bật
          </span>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
          <p className="text-xl font-bold text-emerald-600">{formatPrice(price)}</p>
        </div>

        <div className="flex items-center gap-1 text-sm text-slate-500">
          {stars.map((star) => (
            <span key={star} className={star <= rating ? 'text-amber-400' : 'text-slate-300'}>
              ★
            </span>
          ))}
          <span className="ml-2 font-medium text-slate-700">{rating.toFixed(1)} / 5</span>
        </div>
      </div>
    </button>
  );
};

export default ProductCard;
