import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Format currency in VND
export const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

interface RevenueTrendItem {
  date: string;
  revenue: number;
  orders_count: number;
}

interface RevenueChartProps {
  data: RevenueTrendItem[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  return (
    <div className="w-full h-80 min-h-[20rem]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
          <XAxis
            dataKey="date"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
            dx={-10}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '12px',
              color: '#f8fafc',
            }}
            formatter={(value: any) => [formatVND(Number(value)), 'Doanh thu']}
            labelFormatter={(label) => `Ngày: ${label}`}
          />
          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
          <Line
            name="Doanh thu (VND)"
            type="monotone"
            dataKey="revenue"
            stroke="#ec4899"
            strokeWidth={3}
            dot={{ r: 4, stroke: '#ec4899', strokeWidth: 2, fill: '#0f172a' }}
            activeDot={{ r: 6, fill: '#ec4899' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

interface DistributionItem {
  status: string;
  count: number;
}

interface OrderStatusChartProps {
  data: DistributionItem[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#64748b'];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  returned: 'Trả hàng',
};

export const OrderStatusChart: React.FC<OrderStatusChartProps> = ({ data }) => {
  const chartData = data.map((item) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
  }));

  return (
    <div className="w-full h-80 min-h-[20rem] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '12px',
              color: '#f8fafc',
            }}
          />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
