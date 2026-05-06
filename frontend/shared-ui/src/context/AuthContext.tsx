import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axiosInstance from '../lib/axios';

export type UserRole = 'customer' | 'vendor' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  wallet_balance: number;
  phone?: string;
  address?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('reshop_token');
    const storedUser = localStorage.getItem('reshop_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem('reshop_token', newToken);
    localStorage.setItem('reshop_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch (err) {
      console.error('Logout error on server:', err);
    } finally {
      localStorage.removeItem('reshop_token');
      localStorage.removeItem('reshop_user');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
