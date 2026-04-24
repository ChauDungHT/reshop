import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

// ─── Types ─────────────────────────────────────────────────────────────
export interface UserPayload {
  id: string;
  role: 'customer' | 'vendor' | 'admin';
  vendor_id?: string | null;
  status?: 'active' | 'pending_approval' | 'banned';
}

interface AuthState {
  user: UserPayload | null;
  role: string | null;
  token: string | null;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (token: string) => void;
  logout: () => void;
}

// ─── Context ────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'reshop_token';

// ─── Provider ───────────────────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const getInitialState = (): AuthState => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      try {
        const decoded = jwtDecode<UserPayload>(savedToken);
        console.log(`[auth-context]: Restored Session - User ID: ${decoded.id}`);
        return {
          user: decoded,
          role: decoded.role,
          token: savedToken,
          isAuthenticated: true,
        };
      } catch {
        console.log(`[auth-context]: Restore Session Failed - Invalid stored token`);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    return { user: null, role: null, token: null, isAuthenticated: false };
  };

  const [authState, setAuthState] = useState<AuthState>(getInitialState);

  const login = useCallback((token: string) => {
    try {
      const decoded = jwtDecode<UserPayload>(token);
      localStorage.setItem(TOKEN_KEY, token);
      setAuthState({
        user: decoded,
        role: decoded.role,
        token,
        isAuthenticated: true,
      });
      console.log(`[auth-context]: Login Successful - 200 - User ID: ${decoded.id}, Role: ${decoded.role}`);
    } catch (error) {
      console.log(`[auth-context]: Login Failed - Invalid token received`);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthState({ user: null, role: null, token: null, isAuthenticated: false });
    console.log(`[auth-context]: Logout triggered - Session cleared`);
  }, []);

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────────────────
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
