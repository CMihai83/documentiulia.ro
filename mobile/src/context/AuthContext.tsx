import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { User, AuthState } from '../types';
import api from '../services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  loginWithBiometrics: () => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkBiometricsAvailable: () => Promise<boolean>;
  enableBiometrics: () => Promise<boolean>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const BIOMETRICS_ENABLED_KEY = 'biometrics_enabled';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true,
  });

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);

      if (token && userJson) {
        const user = JSON.parse(userJson);
        api.setAuthToken(token);
        setState({
          isAuthenticated: true,
          user,
          token,
          isLoading: false,
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const response = await api.login(email, password);

      if (response.success && response.data) {
        const { token, user } = response.data;

        await SecureStore.setItemAsync(TOKEN_KEY, token);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

        api.setAuthToken(token);

        setState({
          isAuthenticated: true,
          user,
          token,
          isLoading: false,
        });

        return true;
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    } catch (error) {
      console.error('Login error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const loginWithBiometrics = async (): Promise<boolean> => {
    try {
      const biometricsEnabled = await SecureStore.getItemAsync(BIOMETRICS_ENABLED_KEY);

      if (biometricsEnabled !== 'true') {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autentificare cu Face ID / Touch ID',
        cancelLabel: 'Anuleaza',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Reload stored credentials
        await loadStoredAuth();
        return state.isAuthenticated;
      }

      return false;
    } catch (error) {
      console.error('Biometric login error:', error);
      return false;
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const response = await api.register(email, password, name);

      if (response.success && response.data) {
        const { token, user } = response.data;

        await SecureStore.setItemAsync(TOKEN_KEY, token);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

        api.setAuthToken(token);

        setState({
          isAuthenticated: true,
          user,
          token,
          isLoading: false,
        });

        return true;
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    } catch (error) {
      console.error('Register error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      await SecureStore.deleteItemAsync(BIOMETRICS_ENABLED_KEY);

      api.clearAuthToken();

      setState({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const checkBiometricsAvailable = async (): Promise<boolean> => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return compatible && enrolled;
    } catch (error) {
      console.error('Check biometrics error:', error);
      return false;
    }
  };

  const enableBiometrics = async (): Promise<boolean> => {
    try {
      const available = await checkBiometricsAvailable();

      if (!available) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Activeaza autentificarea biometrica',
        cancelLabel: 'Anuleaza',
      });

      if (result.success) {
        await SecureStore.setItemAsync(BIOMETRICS_ENABLED_KEY, 'true');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Enable biometrics error:', error);
      return false;
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      if (!state.token) return;

      const response = await api.refreshToken();

      if (response.success && response.data) {
        const { token } = response.data;
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        api.setAuthToken(token);
        setState(prev => ({ ...prev, token }));
      }
    } catch (error) {
      console.error('Refresh token error:', error);
      // If refresh fails, logout
      await logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        loginWithBiometrics,
        register,
        logout,
        checkBiometricsAvailable,
        enableBiometrics,
        refreshToken,
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
