import React from 'react';

type QuantitySelectorProps = {
  quantity: number;
  stock: number;
  onChange: (next: number) => void;
};

const QuantitySelector: React.FC<QuantitySelectorProps> = ({ quantity, stock, onChange }) => {
  const handleDecrement = () => {
    const next = Math.max(1, quantity - 1);
    onChange(next);
  };

  const handleIncrement = () => {
    const next = Math.min(stock, quantity + 1);
    onChange(next);
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={quantity <= 1}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-lg font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 hover:bg-slate-100"
      >
        -
      </button>
      <div className="min-w-12 text-center text-sm font-semibold text-slate-900">{quantity}</div>
      <button
        type="button"
        onClick={handleIncrement}
        disabled={quantity >= stock}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-lg font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 hover:bg-slate-100"
      >
        +
      </button>
      <span className="text-xs text-slate-500">Tối đa {stock}</span>
    </div>
  );
};

export default QuantitySelector;
