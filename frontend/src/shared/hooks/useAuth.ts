/**
 * @fileoverview Hook para gestionar la autenticación del usuario
 * @module shared/hooks/useAuth
 */

import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../utils/api';
import type { User } from '../types';

/**
 * Interfaz retornada por el hook useAuth.
 * @interface UseAuthReturn
 */
interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook que maneja el estado de autenticación del usuario.
 * Provee métodos para login, registro, logout y verificación de sesión.
 * @function useAuth
 * @returns {UseAuthReturn} Objeto con estado y métodos de autenticación
 */
export function useAuth(): UseAuthReturn {
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
    if (response.data.success && response.data.data) {
      setUser(response.data.data);
    } else {
      throw new Error(response.data.message || 'Registration failed');
    }
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refetch,
  };
}