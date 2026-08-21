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
  /** Resolves to { requiresMfa, mfaToken } when the account has MFA — caller shows the code step. */
  login: (email: string, password: string, returnUrl?: string) => Promise<LoginResult | void>;
  /** Second step of an MFA login (REQ-049 B5). */
  verifyMfa: (mfaToken: string, code: string, returnUrl?: string, backupCode?: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  /** Re-read the current user from the server (role/tier/org changes become visible). */
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

export interface LoginResult { requiresMfa: true; mfaToken: string }

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

import { persistSession, clearAuthData as clearStoredSession, fetchCurrentUser } from '@/lib/api';
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
        // REQ-049 B5: localStorage is a cache, not the truth. Re-read the user
        // (role/tier/org) from the server; silently refresh an expired token.
        void fetchCurrentUser().then((fresh) => {
          if (fresh) {
            setUser((prev) => ({ ...(prev || {}), ...fresh }));
            setToken(localStorage.getItem('auth_token'));
            localStorage.setItem('auth_user', JSON.stringify({ ...(parsedUser || {}), ...fresh }));
          } else if (fresh === null) {
            // definitively invalid (refresh failed too) — drop the stale session
            clearStoredSession();
            setUser(null);
            setToken(null);
          }
        });
      }
    } catch (error) {
      console.error('Error reading auth from localStorage:', error);
    }
    setIsLoading(false);
  }, []);

  const applySession = (data: { accessToken: string; refreshToken?: string; user: User }) => {
    setToken(data.accessToken);
    setUser(data.user);
    persistSession(data);
  };

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

      // REQ-049 B5: accounts with MFA get a second step instead of a token.
      if (data.requiresMfa) {
        return { requiresMfa: true as const, mfaToken: data.mfaToken as string };
      }

      applySession(data);
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
      // REQ-049 B5: the API returns `accessToken`; this read `access_token`, so
      // every new account was stored with an undefined token and logged out on
      // the next request. Accept both for safety.
      const accessToken = result.accessToken ?? result.access_token;
      if (!accessToken) throw new Error('Înregistrarea a reușit, dar sesiunea nu a putut fi pornită. Autentificați-vă.');
      applySession({ accessToken, refreshToken: result.refreshToken, user: result.user });

      // Save business type for onboarding wizard
      if (businessType) {
        localStorage.setItem('onboarding_business_type', businessType);
      }

      // Store in cookie for middleware access (7 days expiry)

      router.push(redirectUrl || '/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyMfa = async (mfaToken: string, code: string, returnUrl?: string, backupCode?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login/verify-mfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ mfaToken, code, backupCode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.messageRo || data.message || 'Cod MFA invalid');
      applySession(data);
      router.push(returnUrl || '/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    const fresh = await fetchCurrentUser();
    if (fresh) {
      setUser((prev) => ({ ...(prev || {}), ...fresh }));
      localStorage.setItem('auth_user', JSON.stringify({ ...(user || {}), ...fresh }));
    }
  };

  const logout = () => {
    clearStoredSession();
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
        verifyMfa,
        refreshUser,
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
