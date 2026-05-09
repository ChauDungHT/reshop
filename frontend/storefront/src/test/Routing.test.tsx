import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';
import * as AuthContext from '../../../shared-ui/src/context/AuthContext';

// Mock AuthContext
vi.mock('../../../shared-ui/src/context/AuthContext', async () => {
  const actual = await vi.importActual('../../../shared-ui/src/context/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

// Mock React Query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual as any,
    useQuery: vi.fn(() => ({ data: null, isLoading: false })),
    useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  };
});

describe('Routing & Protected Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('should redirect to /login when accessing dashboard while unauthenticated', () => {
    (AuthContext.useAuth as any).mockReturnValue({
      isAuthenticated: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Kiểm tra xem trang Login có hiển thị không
    expect(screen.getByText(/Chào mừng quay lại/i)).toBeDefined();
    expect(screen.getByText(/Dán JWT Token để đăng nhập/i)).toBeDefined();
  });

  it('should redirect to /403 when a customer accesses admin dashboard', () => {
    (AuthContext.useAuth as any).mockReturnValue({
      isAuthenticated: true,
      role: 'customer',
      user: { id: 'cust-123', role: 'customer' },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard/admin']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/403/)).toBeDefined();
    expect(screen.getByText(/Truy cập bị chặn/i)).toBeDefined();
  });

  it('should render Vendor Dashboard with warning when status is pending_approval', () => {
    (AuthContext.useAuth as any).mockReturnValue({
      isAuthenticated: true,
      role: 'vendor',
      user: { id: 'vend-123', role: 'vendor', status: 'pending_approval' },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard/vendor']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/Trung tâm Nhà bán hàng/i)).toBeDefined();
    expect(screen.getByText(/Tài khoản đang chờ phê duyệt/i)).toBeDefined();
    expect(screen.getByText(/Menu bị hạn chế cho đến khi tài khoản được duyệt/i)).toBeDefined();
  });

  it('should render Admin Dashboard for admin users', () => {
    (AuthContext.useAuth as any).mockReturnValue({
      isAuthenticated: true,
      role: 'admin',
      user: { id: 'admin-123', role: 'admin' },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard/admin']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/Hệ thống Quản trị Reshop/i)).toBeDefined();
    expect(screen.getByText(/NCC cần phê duyệt/i)).toBeDefined();
  });
});
