/**
 * @fileoverview Contexto de autenticación para estado global
 * @module shared/contexts/AuthContext
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi } from '../utils/api';
import type { User } from '../types';

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<UseAuthReturn | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const response = await authApi.me();
      if (response.data.success && response.data.data) {
        setUser(response.data.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    if (response.data.success && response.data.data) {
      setUser(response.data.data);
    } else {
      throw new Error(response.data.message || 'Login failed');
    }
  };

  const register = async (email: string, password: string, username: string) => {
    const response = await authApi.register({ email, password, username });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Registration failed');
    }
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  const value: UseAuthReturn = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}