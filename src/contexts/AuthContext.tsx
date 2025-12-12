/**
 * AuthContext - Global authentication state
 *
 * Manages user session, login, 2FA verification, and logout
 *
 * NAVIGATION AFTER LOGIN (updated 02/12/2024):
 * - After successful login (with or without 2FA), user is redirected to /app
 * - /app renders the internal application (MainApp) with sidebar and all modules
 * - The old /dashboard route (demo page) is no longer used after login
 */

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import { useNavigation } from '../App';
import apiClient from '../lib/apiClient';
import {
  AuthUser,
  AuthTokens,
  LoginCredentials,
  TwoFactorPayload,
} from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  requiresTwoFactor: boolean;
  pendingEmail: string | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  verifyTwoFactor: (payload: TwoFactorPayload) => Promise<void>;
  logout: () => void;
}

// Resposta padrão dos endpoints de auth (login / verify-2fa)
type AuthResponse = {
  requiresTwoFactor?: boolean;
  access_token?: string;
  accessToken?: string;
  refresh_token?: string;
  refreshToken?: string;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Try to fetch current user on mount if tokens exist
  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');

    if (!accessToken && !refreshToken) {
      return;
    }

    const fetchCurrentUser = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<AuthUser>('/auth/me');
        const me = response.data;
        setUser(me);
        setTokens({
          accessToken: accessToken || '',
          refreshToken: refreshToken || '',
        });
      } catch {
        setUser(null);
        setTokens(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchCurrentUser();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    try {
      const response = await apiClient.post<AuthResponse>(
        '/auth/login',
        credentials
      );
      const data = response.data;

      if (data?.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setPendingEmail(credentials.email);
        return;
      }

      const access = data.access_token ?? data.accessToken;
      const refresh = data.refresh_token ?? data.refreshToken;

      if (access) {
        localStorage.setItem('access_token', access);
      }
      if (refresh) {
        localStorage.setItem('refresh_token', refresh);
      }

      setTokens({
        accessToken: access || '',
        refreshToken: refresh || '',
      });

      const meResponse = await apiClient.get<AuthUser>('/auth/me');
      setUser(meResponse.data);
      setRequiresTwoFactor(false);
      setPendingEmail(null);
      navigate('/app');
    } finally {
      setLoading(false);
    }
  };

  const verifyTwoFactor = async (payload: TwoFactorPayload) => {
    setLoading(true);
    try {
      const response = await apiClient.post<AuthResponse>(
        '/auth/verify-2fa',
        payload
      );
      const data = response.data;

      const access = data.access_token ?? data.accessToken;
      const refresh = data.refresh_token ?? data.refreshToken;

      if (access) {
        localStorage.setItem('access_token', access);
      }
      if (refresh) {
        localStorage.setItem('refresh_token', refresh);
      }

      setTokens({
        accessToken: access || '',
        refreshToken: refresh || '',
      });

      const meResponse = await apiClient.get<AuthUser>('/auth/me');
      setUser(meResponse.data);
      setRequiresTwoFactor(false);
      setPendingEmail(null);
      navigate('/app');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore logout error
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setTokens(null);
    setRequiresTwoFactor(false);
    setPendingEmail(null);
    navigate('/login');
  };

  const value: AuthContextValue = {
    user,
    tokens,
    isAuthenticated: !!user && !!tokens,
    requiresTwoFactor,
    pendingEmail,
    loading,
    login,
    verifyTwoFactor,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
