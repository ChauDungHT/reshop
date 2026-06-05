import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../../shared-ui/src/context/AuthContext';
import { useEffect } from 'react';

vi.mock('../../../shared-ui/src/lib/axios', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
    defaults: {
      baseURL: 'http://localhost:8000/api',
    },
  },
}));

// ─── JWT Mock Token (role: customer) ──────────────────────────────────────
// Header: {"alg":"HS256","typ":"JWT"}
// Payload: {"id":"uuid-1234","role":"customer","vendor_id":null,"iat":1000000000,"exp":9999999999}
const MOCK_CUSTOMER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InV1aWQtMTIzNCIsInJvbGUiOiJjdXN0b21lciIsInZlbmRvcl9pZCI6bnVsbCwiaWF0IjoxMDAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9.HMAC_SIGNATURE_NOT_VERIFIED';

// ─── Helper Component ─────────────────────────────────────────────────────
const TestConsumer = ({ onAction }: { onAction?: (ctx: ReturnType<typeof useAuth>) => void }) => {
  const auth = useAuth();
  if (onAction) onAction(auth);
  return (
    <div>
      <span data-testid="isAuthenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="role">{auth.user?.role ?? 'null'}</span>
      <span data-testid="userId">{auth.user?.id ?? 'null'}</span>
    </div>
  );
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>{children}</AuthProvider>
  </BrowserRouter>
);

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should start unauthenticated by default', () => {
    render(<TestConsumer />, { wrapper });
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    expect(screen.getByTestId('role').textContent).toBe('null');
  });

  it('should authenticate after login() is called with valid token', async () => {
    let authCtx: ReturnType<typeof useAuth>;
    render(
      <TestConsumer onAction={(ctx) => { authCtx = ctx; }} />,
      { wrapper }
    );

    await act(async () => {
      authCtx.login(MOCK_CUSTOMER_TOKEN, { id: 'uuid-1234', name: 'Test', email: 'test@example.com', role: 'customer', wallet_balance: 0 });
    });

    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
    expect(screen.getByTestId('role').textContent).toBe('customer');
    expect(screen.getByTestId('userId').textContent).toBe('uuid-1234');
  });

  it('should persist token to localStorage on login', async () => {
    let authCtx: ReturnType<typeof useAuth>;
    render(
      <TestConsumer onAction={(ctx) => { authCtx = ctx; }} />,
      { wrapper }
    );

    await act(async () => {
      authCtx.login(MOCK_CUSTOMER_TOKEN, { id: 'uuid-1234', name: 'Test', email: 'test@example.com', role: 'customer', wallet_balance: 0 });
    });

    expect(localStorage.getItem('reshop_token')).toBe(MOCK_CUSTOMER_TOKEN);
  });

  it('should clear state and localStorage on logout()', async () => {
    localStorage.setItem('reshop_token', MOCK_CUSTOMER_TOKEN);
    localStorage.setItem('reshop_user', JSON.stringify({ id: 'uuid-1234', role: 'customer' }));
    let authCtx: ReturnType<typeof useAuth>;
    render(
      <TestConsumer onAction={(ctx) => { authCtx = ctx; }} />,
      { wrapper }
    );

    await act(async () => {
      authCtx.logout();
    });

    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    expect(localStorage.getItem('reshop_token')).toBeNull();
  });

  it('should restore session from localStorage on mount', () => {
    localStorage.setItem('reshop_token', MOCK_CUSTOMER_TOKEN);
    localStorage.setItem('reshop_user', JSON.stringify({ id: 'uuid-1234', role: 'customer' }));
    render(<TestConsumer />, { wrapper });
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
    expect(screen.getByTestId('role').textContent).toBe('customer');
  });
});
