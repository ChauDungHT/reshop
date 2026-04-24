const VendorDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="bg-[#1e293b]/50 border border-slate-800 p-8 rounded-2xl backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-white mb-2">Trung tâm Nhà bán hàng</h1>
        <p className="text-slate-400">Quản lý gian hàng, sản phẩm và theo dõi doanh thu của bạn.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Sản phẩm đang bán', value: '45', color: 'blue' },
          { label: 'Đơn hàng mới', value: '08', color: 'orange' },
          { label: 'Doanh thu tháng', value: '12.5tr', color: 'emerald' },
          { label: 'Đánh giá Shop', value: '4.8/5', color: 'yellow' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#1e293b]/30 border border-slate-800 p-6 rounded-xl">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-bold text-${stat.color}-400 mt-1`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VendorDashboard;
