import React from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../shared-ui/src/lib/axios';
import AdminDashboard from '../pages/dashboard/AdminDashboard';

vi.mock('../../../shared-ui/src/lib/axios', () => {
  const m = vi.fn();
  (globalThis as unknown as Record<string, unknown>).mockGetShared = m;
  return {
    default: {
      get: m,
    },
  };
});

vi.mock('../../../../shared-ui/src/lib/axios', () => {
  const m = vi.fn();
  (globalThis as unknown as Record<string, unknown>).mockGetShared = m;
  return {
    default: {
      get: m,
    },
  };
});

const mockGet = (globalThis as unknown as Record<string, unknown>).mockGetShared as Mock;

let queryClient: QueryClient;

const renderWithQuery = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

const mockStatsData = {
  total_revenue: 125000000,
  orders_today: 15,
  active_users: 1420,
  active_products: 680,
  top_shops: [
    { id: 'v1', store_name: 'Store Alpha', slug: 'store-alpha', revenue: 95000000 },
    { id: 'v2', store_name: 'Store Beta', slug: 'store-beta', revenue: 30000000 },
  ],
  top_products: [
    { id: 'p1', name: 'Product A', sales_count: 50, sales_amount: 15000000 },
    { id: 'p2', name: 'Product B', sales_count: 30, sales_amount: 9000000 },
  ],
};

const mockChartsData = {
  trend: [
    { date: '2026-05-18', revenue: 15000000, orders_count: 8 },
    { date: '2026-05-19', revenue: 22000000, orders_count: 12 },
  ],
  distribution: [
    { status: 'delivered', count: 45 },
    { status: 'pending', count: 12 },
  ],
};

describe('AdminDashboard Statistics and Charts Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    // Set up default axios mocks
    (mockGet as Mock).mockImplementation((url: string) => {
      console.log('--- mockGet called with url:', url);
      if (url.includes('/admin/dashboard/stats')) {
        return Promise.resolve({ data: { success: true, data: mockStatsData } });
      }
      if (url.includes('/admin/dashboard/charts')) {
        return Promise.resolve({ data: { success: true, data: mockChartsData } });
      }
      return Promise.reject(new Error('Not Found'));
    });
  });

  it('should render stats loading spinner initially', async () => {
    // Keep queries in loading state by postponing resolve
    (mockGet as Mock).mockImplementation(() => new Promise(() => {}));

    renderWithQuery(<AdminDashboard />);
    expect(screen.getByText(/Đang tải dữ liệu báo cáo thống kê.../i)).toBeInTheDocument();
  });

  it('should render all KPI values and format total_revenue in VND', async () => {
    renderWithQuery(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Thống Kê Toàn Sàn')).toBeInTheDocument();
    });

    // Check KPIs
    expect(screen.getByText('Tổng Doanh Thu')).toBeInTheDocument();
    // VND formatted total_revenue
    expect(screen.getByText(/125.000.000/)).toBeInTheDocument();
    
    expect(screen.getByText('Đơn Hàng Mới Hôm Nay')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();

    expect(screen.getByText('Người Dùng Hoạt Động')).toBeInTheDocument();
    expect(screen.getByText('1.420')).toBeInTheDocument();

    expect(screen.getByText('Sản Phẩm Đang Bán')).toBeInTheDocument();
    expect(screen.getByText('680')).toBeInTheDocument();
  });

  it('should render Top Rankings tables with correct rows and data', async () => {
    renderWithQuery(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Top 5 Gian Hàng Doanh Thu Lớn Nhất')).toBeInTheDocument();
    });

    // Shop rankings
    expect(screen.getByText('Store Alpha')).toBeInTheDocument();
    expect(screen.getByText(/95.000.000/)).toBeInTheDocument();
    expect(screen.getByText('Store Beta')).toBeInTheDocument();
    expect(screen.getByText(/30.000.000/)).toBeInTheDocument();

    // Product rankings
    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText(/15.000.000/)).toBeInTheDocument();
  });

  it('should request chart data with active range filter when clicking buttons', async () => {
    renderWithQuery(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('7 Ngày')).toBeInTheDocument();
    });

    // Click 30 Days filter
    const rangeBtn30 = screen.getByText('30 Ngày');
    fireEvent.click(rangeBtn30);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/admin/dashboard/charts?range=30days');
    });

    // Wait for loading to finish and UI to re-render
    await screen.findByText('1 Năm');

    // Click 1 Year filter
    const rangeBtnYear = screen.getByText('1 Năm');
    fireEvent.click(rangeBtnYear);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/admin/dashboard/charts?range=1year');
    });
  });
});
