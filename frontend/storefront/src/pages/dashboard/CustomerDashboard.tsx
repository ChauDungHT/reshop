const CustomerDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="bg-[#1e293b]/50 border border-slate-800 p-8 rounded-2xl backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-white mb-2">Chào mừng tài khoản Người mua!</h1>
        <p className="text-slate-400">Khám phá hàng ngàn sản phẩm chất lượng từ các nhà cung cấp uy tín.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Đơn hàng đã đặt', value: '12', color: 'blue' },
          { label: 'Sản phẩm yêu thích', value: '05', color: 'emerald' },
          { label: 'Số dư ví', value: '500,000đ', color: 'purple' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#1e293b]/30 border border-slate-800 p-6 rounded-xl hover:border-slate-700 transition-colors">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-bold text-${stat.color}-400 mt-1`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerDashboard;
