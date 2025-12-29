'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getGlobalErrorLogger } from '@/hooks/useErrorLogger';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN' | 'ACCOUNTANT';
  tier?: 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
  company?: string;
  cui?: string;
  organizationId?: string;
  organizationName?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, returnUrl?: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  company?: string;
  cui?: string;
  businessType?: string;
  redirectUrl?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    try {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        // Migrate old user data: add default tier if missing
        if (!parsedUser.tier) {
          parsedUser.tier = 'FREE';
          localStorage.setItem('auth_user', JSON.stringify(parsedUser));
        }
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Error reading auth from localStorage:', error);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, returnUrl?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      // Check content type to avoid JSON parse errors on HTML responses
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Eroare server. Vă rugăm încercați din nou.');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      setToken(data.accessToken);
      setUser(data.user);

      // Store in localStorage
      localStorage.setItem('auth_token', data.accessToken);
      localStorage.setItem('auth_user', JSON.stringify(data.user));

      // Store in cookie for middleware access (7 days expiry)
      // Secure flag required for HTTPS, SameSite=Lax for CSRF protection
      const isSecure = window.location.protocol === 'https:';
      document.cookie = `auth_token=${data.accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${isSecure ? '; Secure' : ''}`;

      router.push(returnUrl || '/dashboard');
    } catch (error) {
      // Log error to error tracking system
      const errorLogger = getGlobalErrorLogger();
      if (errorLogger) {
        errorLogger({
          message: error instanceof Error ? error.message : 'Login failed',
          stack: error instanceof Error ? error.stack || '' : '',
          type: error instanceof Error && error.message.includes('fetch') ? 'NetworkError' : 'APIError',
          url: window.location.href,
          userAgent: navigator.userAgent,
          metadata: { action: 'login', email: email.replace(/(.{2}).*(@.*)/, '$1***$2') },
        });
      }
      throw error; // Re-throw so the UI can handle it
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      // Extract redirect URL and business type before sending to API
      const { redirectUrl, businessType, ...registerPayload } = data;

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(registerPayload),
      });

      // Check content type to avoid JSON parse errors on HTML responses
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Eroare server. Vă rugăm încercați din nou.');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const result = await response.json();
      setToken(result.access_token);
      setUser(result.user);
      localStorage.setItem('auth_token', result.access_token);
      localStorage.setItem('auth_user', JSON.stringify(result.user));

      // Save business type for onboarding wizard
      if (businessType) {
        localStorage.setItem('onboarding_business_type', businessType);
      }

      // Store in cookie for middleware access (7 days expiry)
      const isSecure = window.location.protocol === 'https:';
      document.cookie = `auth_token=${result.access_token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${isSecure ? '; Secure' : ''}`;

      router.push(redirectUrl || '/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    // Clear cookie
    document.cookie = 'auth_token=; path=/; max-age=0';
    router.push('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
