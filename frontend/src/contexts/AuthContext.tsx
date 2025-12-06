import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  token: string | null;
  companyId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [companyId, setCompanyId] = useState<string | null>(localStorage.getItem('company_id'));

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('auth_token');
    if (token) {
      authAPI
        .getCurrentUser()
        .then((response: any) => {
          setUser(response.user);
          // Store company_id if not already set
          const currentCompanyId = localStorage.getItem('company_id');
          if (!currentCompanyId && response.companies && response.companies.length > 0) {
            localStorage.setItem('company_id', response.companies[0].id);
          }
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('company_id');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      if (response.success && response.data?.token && response.data?.user) {
        localStorage.setItem('auth_token', response.data.token);
        setToken(response.data.token);
        // Store first company ID from companies array
        if (response.data.companies && response.data.companies.length > 0) {
          const compId = response.data.companies[0].id;
          localStorage.setItem('company_id', compId);
          setCompanyId(compId);
        }
        setUser(response.data.user);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await authAPI.register(email, password, name);
      if (response.success && response.data?.token && response.data?.user) {
        localStorage.setItem('auth_token', response.data.token);
        setToken(response.data.token);
        // Store first company ID from companies array
        if (response.data.companies && response.data.companies.length > 0) {
          const compId = response.data.companies[0].id;
          localStorage.setItem('company_id', compId);
          setCompanyId(compId);
        }
        setUser(response.data.user);
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('company_id');
    setUser(null);
    setToken(null);
    setCompanyId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        token,
        companyId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
