const AdminDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="bg-[#1e293b]/50 border border-slate-800 p-8 rounded-2xl backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-white mb-2">Hệ thống Quản trị Reshop</h1>
        <p className="text-slate-400">Toàn quyền kiểm soát hệ thống, phê duyệt NCC và quản lý người dùng.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Tổng số User', value: '1,240', color: 'blue' },
          { label: 'NCC cần phê duyệt', value: '14', color: 'red' },
          { label: 'Tổng doanh sàn', value: '450tr', color: 'emerald' },
          { label: 'Báo cáo vi phạm', value: '03', color: 'orange' },
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

export default AdminDashboard;
