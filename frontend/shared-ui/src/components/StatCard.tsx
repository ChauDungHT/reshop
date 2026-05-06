import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  accent?: string;
  sub?: string;
  trend?: 'up' | 'down';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, accent = 'text-slate-100', sub, trend }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all duration-300 group shadow-sm hover:shadow-indigo-500/10">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
          <p className={`text-3xl font-black tracking-tight ${accent}`}>{value}</p>
          
          {(sub || trend) && (
            <div className="flex items-center gap-1.5 mt-1">
              {trend === 'up' && <span className="text-emerald-400 text-xs">▲</span>}
              {trend === 'down' && <span className="text-rose-400 text-xs">▼</span>}
              <p className="text-xs text-slate-400 font-medium">{sub}</p>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 border border-slate-700/50">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
