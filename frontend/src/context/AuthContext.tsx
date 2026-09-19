import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, AdminType } from '../types';
import { apiClient } from '../services/api-client';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isOwnerAdmin: boolean;
  isCounsellor: boolean;
  isStudent: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('jaiva_crm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('jaiva_crm_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('jaiva_crm_token', newToken);
    localStorage.setItem('jaiva_crm_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('jaiva_crm_token');
    localStorage.removeItem('jaiva_crm_user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await apiClient.get<User>('/auth/me');
      setUser(res.data);
      localStorage.setItem('jaiva_crm_user', JSON.stringify(res.data));
    } catch (error) {
      console.error('Failed to refresh user', error);
    }
  };

  useEffect(() => {
    const verifyAuth = async () => {
      if (token) {
        try {
          const res = await apiClient.get<User>('/auth/me');
          setUser(res.data);
          localStorage.setItem('jaiva_crm_user', JSON.stringify(res.data));
        } catch (error) {
          logout();
        }
      }
      setIsLoading(false);
    };

    verifyAuth();
  }, [token]);

  const isAdmin = user?.role === UserRole.ADMIN;
  const isOwnerAdmin = user?.role === UserRole.ADMIN && user?.adminType === AdminType.OWNER_ADMIN;
  const isCounsellor = user?.role === UserRole.COUNSELLOR;
  const isStudent = user?.role === UserRole.STUDENT;
  const isStaff = isAdmin || isCounsellor;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        refreshUser,
        isAdmin,
        isOwnerAdmin,
        isCounsellor,
        isStudent,
        isStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
