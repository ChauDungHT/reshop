import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../../shared-ui/src/lib/axios';

interface AdminStats {
  gmv: number;
  gmvGrowth: number;
  newUsers: number;
  activeVendors: number;
  openDisputes: number;
  systemHealth: 'healthy' | 'degraded' | 'down';
}

const GlobalMetric = ({ label, value, sub, icon, accent }: { label: string; value: string; sub?: string; icon: string; accent: string }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
    <div className="flex items-start justify-between mb-3">
      <span className="text-2xl">{icon}</span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${accent.replace('text-', 'bg-').replace('-400', '-500/15')} ${accent}`}>
        Live
      </span>
    </div>
    <p className={`text-3xl font-black ${accent}`}>{value}</p>
    <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">{label}</p>
    {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

const AdminDashboard = () => {
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => (await axiosInstance.get('/admin/stats')).data,
  });

  const { data: recentActions } = useQuery<any[]>({
    queryKey: ['admin-audit', 'recent'],
    queryFn: async () => (await axiosInstance.get('/admin/audit?limit=5')).data,
  });

  const mockStats: AdminStats = {
    gmv: 2850000000,
    gmvGrowth: 18.7,
    newUsers: 1240,
    activeVendors: 328,
    openDisputes: 4,
    systemHealth: 'healthy',
  };

  const mockAudit = [
    { actor: 'admin@reshop.vn', action: 'Khóa tài khoản vendor', target: 'vendor_id: 441', time: '14:32' },
    { actor: 'support@reshop.vn', action: 'Giải quyết tranh chấp', target: 'dispute_id: 89', time: '13:55' },
    { actor: 'admin@reshop.vn', action: 'Cập nhật phí hoa hồng', target: 'category: Electronics', time: '11:20' },
    { actor: 'admin@reshop.vn', action: 'Phê duyệt shop mới', target: 'vendor: TechZone Store', time: '10:05' },
  ];

  const s = stats || mockStats;
  const audit = recentActions || mockAudit;

  const healthColor = { healthy: 'text-emerald-400', degraded: 'text-amber-400', down: 'text-rose-400' }[s.systemHealth];
  const healthLabel = { healthy: '✓ Hoạt động bình thường', degraded: '⚠ Hiệu suất giảm', down: '✗ Có sự cố' }[s.systemHealth];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-100">Tổng Quan Hệ Thống</h2>
          <p className="text-slate-500 text-sm mt-1">Dữ liệu realtime toàn sàn RESHOP</p>
        </div>
        <div className={`flex items-center gap-2 text-sm font-semibold ${healthColor}`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          {healthLabel}
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <GlobalMetric
          label="Tổng GMV"
          value={`${(s.gmv / 1000000000).toFixed(2)}B`}
          sub={`+${s.gmvGrowth}% so với tháng trước`}
          icon="🌐"
          accent="text-indigo-400"
        />
        <GlobalMetric label="User mới hôm nay" value={s.newUsers.toLocaleString()} icon="👥" accent="text-emerald-400" />
        <GlobalMetric label="Vendor đang hoạt động" value={String(s.activeVendors)} icon="🏪" accent="text-violet-400" />
      </div>

      {/* Disputes alert */}
      {s.openDisputes > 0 && (
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 flex items-center gap-4">
          <span className="text-2xl">⚖️</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-rose-400">Tranh chấp đang mở</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Có <strong className="text-rose-400">{s.openDisputes} tranh chấp</strong> giữa Vendor và Customer cần Admin xử lý.
            </p>
          </div>
          <button className="text-xs bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-600/30 px-3 py-1.5 rounded-lg transition-colors font-semibold flex-shrink-0">
            Xử lý ngay
          </button>
        </div>
      )}

      {/* Audit Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-200">Nhật ký hệ thống gần đây</h3>
          <a href="/reports" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Xem đầy đủ →</a>
        </div>
        <div className="divide-y divide-slate-800">
          {audit.map((entry: any, i: number) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors">
              <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center text-sm flex-shrink-0">🔑</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200">{entry.action}</p>
                <p className="text-xs text-slate-500 truncate">{entry.actor} · {entry.target}</p>
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0">{entry.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
