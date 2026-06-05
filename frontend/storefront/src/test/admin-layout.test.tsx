import React from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../../../shared-ui/src/context/AuthContext';
import AdminRoute from '../../../shared-ui/src/components/AdminRoute';
import AdminLayout from '../../../shared-ui/src/layouts/AdminLayout';

// Mock AuthContext hook
vi.mock('../../../shared-ui/src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithQuery = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('Admin security and layout components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AdminRoute Guard', () => {
    it('should redirect unauthenticated users to /login', () => {
      (useAuth as Mock).mockReturnValue({
        user: null,
        isLoading: false,
      });

      renderWithQuery(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/admin/dashboard" element={<div>Dashboard</div>} />
            </Route>
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });

    it('should redirect customer role users to /forbidden', () => {
      (useAuth as Mock).mockReturnValue({
        user: { id: 'user-1', name: 'John Customer', role: 'customer' },
        isLoading: false,
      });

      renderWithQuery(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/admin/dashboard" element={<div>Dashboard</div>} />
            </Route>
            <Route path="/forbidden" element={<div>Access Denied</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });

    it('should permit admin role users to view the content', () => {
      (useAuth as Mock).mockReturnValue({
        user: { id: 'admin-1', name: 'John Admin', role: 'admin' },
        isLoading: false,
      });

      renderWithQuery(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/admin/dashboard" element={<div>Dashboard content approved</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Dashboard content approved')).toBeInTheDocument();
    });
  });

  describe('AdminSidebar and AdminLayout', () => {
    beforeEach(() => {
      (useAuth as Mock).mockReturnValue({
        user: { id: 'admin-1', name: 'John Admin', role: 'admin' },
        isLoading: false,
        logout: vi.fn(),
      });
    });

    it('should render collapsible sidebar layout with correct header and menu options', () => {
      renderWithQuery(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<div>Admin main panel</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      // Verify layout header
      expect(screen.getByText(/Hệ Thống Quản Trị Viên/i)).toBeInTheDocument();
      expect(screen.getByText('Super Admin')).toBeInTheDocument();
      expect(screen.getByText('Đăng xuất')).toBeInTheDocument();

      // Verify sidebar content
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Người dùng')).toBeInTheDocument();
      expect(screen.getByText('Danh mục')).toBeInTheDocument();
      expect(screen.getByText('Gian hàng')).toBeInTheDocument();
      expect(screen.getByText('Tranh chấp')).toBeInTheDocument();
      expect(screen.getByText('Cài đặt')).toBeInTheDocument();
    });

    it('should toggle sidebar collapse state when clicking the arrow button', () => {
      renderWithQuery(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<div>Admin main panel</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      const toggleBtn = screen.getByTestId('sidebar-toggle');
      expect(toggleBtn.textContent).toBe('←');
      expect(screen.getByText('Dashboard')).toBeInTheDocument();

      // Click collapse
      fireEvent.click(toggleBtn);
      expect(toggleBtn.textContent).toBe('→');
      
      // Sidebar texts should be hidden
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Người dùng')).not.toBeInTheDocument();
    });

    it('should highlight the active NavLink route', () => {
      renderWithQuery(
        <MemoryRouter initialEntries={['/admin/disputes']}>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route path="/admin/disputes" element={<div>Disputes panel</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      const disputesLink = screen.getByText('Tranh chấp').closest('a');
      expect(disputesLink).toHaveClass('text-rose-400');
      expect(disputesLink).toHaveClass('bg-rose-500/15');

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).not.toHaveClass('text-rose-400');
    });
  });
});
