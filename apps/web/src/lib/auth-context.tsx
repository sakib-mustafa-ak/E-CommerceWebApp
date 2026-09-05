'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AccountType, UserSession } from '@siam-aqua/shared-types';

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  isLoading: boolean;
  login: (userData: UserSession, token: string) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isAccountType: (types: AccountType[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('siamaqua_token');
      const storedUser = localStorage.getItem('siamaqua_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (userData: UserSession, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('siamaqua_token', authToken);
    localStorage.setItem('siamaqua_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('siamaqua_token');
    localStorage.removeItem('siamaqua_user');
    window.location.href = '/login';
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.accountType === AccountType.SUPER_ADMIN) return true;
    return user.permissions?.includes(permission) || false;
  };

  const isAccountType = (types: AccountType[]) => {
    if (!user) return false;
    if (user.accountType === AccountType.SUPER_ADMIN) return true;
    return types.includes(user.accountType);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        hasPermission,
        isAccountType,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
