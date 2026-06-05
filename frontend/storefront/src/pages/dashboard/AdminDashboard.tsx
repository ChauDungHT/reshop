import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../../shared-ui/src/lib/axios';
import StatCard from '../../../../shared-ui/src/components/StatCard';
import { RevenueChart, OrderStatusChart, formatVND } from './RevenueChart';

interface ToolPermission {
  tool_code: string;
  tool_name: string;
  allowed_roles: string[];
}

interface TopShopItem {
  id: string;
  store_name: string;
  slug: string;
  revenue: number;
}

interface TopProductItem {
  id: string;
  name: string;
  sales_count: number;
  sales_amount: number;
}

interface DashboardStatsData {
  total_revenue: number;
  orders_today: number;
  active_users: number;
  active_products: number;
  top_shops: TopShopItem[];
  top_products: TopProductItem[];
}

interface TrendItem {
  date: string;
  revenue: number;
  orders_count: number;
}

interface DistributionItem {
  status: string;
  count: number;
}

interface DashboardChartsData {
  trend: TrendItem[];
  distribution: DistributionItem[];
}

const AdminDashboard = () => {
  const [range, setRange] = useState<'7days' | '30days' | '1year'>('7days');

  // Tool Permissions management states
  const [localPermissions, setLocalPermissions] = useState<ToolPermission[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const ROLES = [
    { code: 'guest', label: 'Khách (Guest)' },
    { code: 'customer', label: 'Khách hàng (Customer)' },
    { code: 'vendor', label: 'Người bán (Vendor)' },
    { code: 'admin', label: 'Quản trị (Admin)' },
  ];

  // Fetch AI Tool access permissions
  const { data: permissions, refetch: refetchPermissions } = useQuery<ToolPermission[]>({
    queryKey: ['tool-permissions'],
    queryFn: async () => {
      const res = await axiosInstance.get('/tool-permissions');
      return res.data.data;
    },
  });

  useEffect(() => {
    if (permissions) {
      setLocalPermissions(permissions);
    }
  }, [permissions]);

  const handleToggle = (toolCode: string, roleCode: string) => {
    if (!localPermissions) return;
    setLocalPermissions(prev => {
      if (!prev) return null;
      return prev.map(p => {
        if (p.tool_code !== toolCode) return p;
        const exists = p.allowed_roles.includes(roleCode);
        const newRoles = exists
          ? p.allowed_roles.filter(r => r !== roleCode)
          : [...p.allowed_roles, roleCode];
        return { ...p, allowed_roles: newRoles };
      });
    });
  };

  const handleSave = async () => {
    if (!localPermissions) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await axiosInstance.put('/tool-permissions/admin', {
        permissions: localPermissions.map(p => ({
          tool_code: p.tool_code,
          allowed_roles: p.allowed_roles,
        })),
      });
      setSaveStatus({ type: 'success', message: 'Cấu hình quyền truy cập công cụ AI đã được lưu thành công!' });
      refetchPermissions();
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (err: any) {
      console.error('Failed to save permissions:', err);
      setSaveStatus({
        type: 'error',
        message: err.response?.data?.message || 'Có lỗi xảy ra khi lưu cấu hình quyền truy cập.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Fetch KPI metrics and Top rankings
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<DashboardStatsData>({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const res = await axiosInstance.get('/admin/dashboard/stats');
      return res.data.data;
    },
  });

  // 2. Fetch charts trend and order distribution
  const { data: charts, isLoading: chartsLoading } = useQuery<DashboardChartsData>({
    queryKey: ['admin-dashboard-charts', range],
    queryFn: async () => {
      const res = await axiosInstance.get(`/admin/dashboard/charts?range=${range}`);
      return res.data.data;
    },
  });

  const isInitialLoading = (statsLoading && !stats) || (chartsLoading && !charts);

  if (isInitialLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-semibold tracking-wider animate-pulse">
          Đang tải dữ liệu báo cáo thống kê...
        </p>
      </div>
    );
  }

  if (statsError || !stats) {
    return (
      <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-6 text-center max-w-lg mx-auto mt-10">
        <span className="text-4xl">⚠️</span>
        <h3 className="text-lg font-bold text-rose-450 mt-3">Lỗi tải dữ liệu báo cáo</h3>
        <p className="text-slate-400 text-sm mt-1">
          Hệ thống gặp sự cố khi kết nối với máy chủ thống kê. Vui lòng thử lại sau.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">
            Thống Kê Toàn Sàn
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Dữ liệu tổng quan và báo cáo thời gian thực của Reshop
          </p>
        </div>

        {/* Date range filter */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl shrink-0">
          {(['7days', '30days', '1year'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                range === r
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {r === '7days' ? '7 Ngày' : r === '30days' ? '30 Ngày' : '1 Năm'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng Doanh Thu"
          value={formatVND(stats.total_revenue)}
          icon="💰"
          accent="text-emerald-400"
          sub="+14.2% so với tháng trước"
          trend="up"
        />
        <StatCard
          label="Đơn Hàng Mới Hôm Nay"
          value={stats.orders_today}
          icon="📦"
          accent="text-rose-450"
          sub="Đơn hàng chờ xử lý mới"
        />
        <StatCard
          label="Người Dùng Hoạt Động"
          value={stats.active_users.toLocaleString()}
          icon="👥"
          accent="text-indigo-400"
          sub="Tài khoản trên toàn sàn"
        />
        <StatCard
          label="Sản Phẩm Đang Bán"
          value={stats.active_products.toLocaleString()}
          icon="🏪"
          accent="text-violet-400"
          sub="Sản phẩm đang kích hoạt"
        />
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Line Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-slate-950/30">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">
                Xu Hướng Doanh Thu
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Báo cáo doanh số bán hàng trong khoảng thời gian đã chọn</p>
            </div>
            <span className="text-xs text-rose-450 font-bold px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
              Biểu đồ doanh thu
            </span>
          </div>
          {charts?.trend && charts.trend.length > 0 ? (
            <RevenueChart data={charts.trend} />
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
              Chưa có dữ liệu giao dịch trong khoảng thời gian này
            </div>
          )}
        </div>

        {/* Order Status Distribution Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-slate-950/30">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">
                Trạng Thái Đơn Hàng
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Phân bổ chi tiết số lượng đơn hàng</p>
            </div>
            <span className="text-xs text-indigo-400 font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              Cơ cấu
            </span>
          </div>
          {charts?.distribution && charts.distribution.length > 0 ? (
            <OrderStatusChart data={charts.distribution} />
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
              Không tìm thấy thông tin đơn hàng nào
            </div>
          )}
        </div>
      </div>

      {/* Top rankings lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Shops */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg shadow-slate-950/20">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">
              Top 5 Gian Hàng Doanh Thu Lớn Nhất
            </h3>
            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
              Kinh doanh xuất sắc
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-450 bg-slate-950/30">
                  <th className="py-3 px-6 font-bold uppercase tracking-wider">Hạng</th>
                  <th className="py-3 px-6 font-bold uppercase tracking-wider">Tên Cửa Hàng</th>
                  <th className="py-3 px-6 font-bold uppercase tracking-wider text-right">Doanh Thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {stats.top_shops.length > 0 ? (
                  stats.top_shops.map((shop, index) => (
                    <tr key={shop.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-slate-350">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-200">
                        {shop.store_name}
                      </td>
                      <td className="py-3.5 px-6 font-black text-right text-emerald-400">
                        {formatVND(shop.revenue)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500">
                      Chưa có số liệu doanh thu của gian hàng
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 5 Products */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg shadow-slate-950/20">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">
              Top 5 Sản Phẩm Bán Chạy Nhất
            </h3>
            <span className="text-[10px] font-bold bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">
              Sản phẩm HOT
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-450 bg-slate-950/30">
                  <th className="py-3 px-6 font-bold uppercase tracking-wider">Hạng</th>
                  <th className="py-3 px-6 font-bold uppercase tracking-wider">Tên Sản Phẩm</th>
                  <th className="py-3 px-6 font-bold uppercase tracking-wider text-center">Đã Bán</th>
                  <th className="py-3 px-6 font-bold uppercase tracking-wider text-right">Doanh Số</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {stats.top_products.length > 0 ? (
                  stats.top_products.map((prod, index) => (
                    <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-slate-350">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-200 max-w-[150px] truncate">
                        {prod.name}
                      </td>
                      <td className="py-3.5 px-6 font-bold text-center text-rose-450">
                        {prod.sales_count}
                      </td>
                      <td className="py-3.5 px-6 font-black text-right text-indigo-400">
                        {formatVND(prod.sales_amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      Chưa ghi nhận số liệu bán hàng của sản phẩm
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AI & Chatbot Permissions Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg shadow-slate-950/20 p-6 mt-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4 mb-6">
          <div>
            <h3 className="font-extrabold text-slate-100 text-base flex items-center gap-2">
              <span>🛠️</span> Quản Lý Quyền Truy Cập Công Cụ AI & Chatbot
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Cho phép hoặc chặn các nhóm người dùng sử dụng chatbot và các chức năng phân tích nâng cao.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || !localPermissions}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg ${
              isSaving 
                ? 'bg-slate-700 cursor-not-allowed' 
                : 'bg-rose-600 hover:bg-rose-500 hover:scale-[1.02] cursor-pointer shadow-rose-950/30'
            }`}
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>💾 Lưu Cấu Hình</>
            )}
          </button>
        </div>

        {saveStatus && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs flex items-center gap-3 border transition-all ${
              saveStatus.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-450'
            }`}
          >
            <span>{saveStatus.type === 'success' ? '✅' : '⚠️'}</span>
            <p className="font-semibold">{saveStatus.message}</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/30">
                <th className="py-4 px-6 font-bold uppercase tracking-wider text-slate-300 w-1/3">Tính năng / Công cụ</th>
                {ROLES.map(role => (
                  <th key={role.code} className="py-4 px-6 font-bold uppercase tracking-wider text-slate-300 text-center">
                    {role.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {localPermissions ? (
                localPermissions.map(p => (
                  <tr key={p.tool_code} className="hover:bg-slate-850/30 transition-colors">
                    <td className="py-4.5 px-6">
                      <span className="font-bold text-slate-200 block text-sm">{p.tool_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{p.tool_code}</span>
                    </td>
                    {ROLES.map(role => {
                      const isAllowed = p.allowed_roles.includes(role.code);
                      return (
                        <td key={role.code} className="py-4.5 px-6 text-center">
                          <div className="flex items-center justify-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isAllowed}
                                onChange={() => handleToggle(p.tool_code, role.code)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-focus:ring-1 peer-focus:ring-rose-500/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600 peer-checked:after:bg-white peer-checked:after:border-transparent"></div>
                            </label>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                    Đang tải danh sách phân quyền công cụ...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
