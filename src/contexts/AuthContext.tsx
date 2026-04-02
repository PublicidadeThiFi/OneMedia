/**
 * AuthContext - Global authentication state
 *
 * Gerencia sessão, login, 2FA e logout
 */

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import apiClient, { publicApiClient } from '../lib/apiClient';
import { clearAccessState } from '../lib/accessControl';
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
  /**
   * True when the provider has finished bootstrapping the session.
   * While false, the app should NOT redirect to /login yet.
   */
  authReady: boolean;
  requiresTwoFactor: boolean;
  pendingEmail: string | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  verifyTwoFactor: (payload: TwoFactorPayload) => Promise<void>;
  /**
   * Used by /oauth-callback. Stores tokens, fetches /auth/me and updates state.
   * Does NOT perform navigation.
   */
  completeOAuthLogin: (tokens: AuthTokens) => Promise<AuthUser>;
  /** Refresh /auth/me and update user state (keeps current tokens). */
  refreshMe: () => Promise<AuthUser | null>;
  logout: () => void;
}

/**
 * Formato real da resposta da API de auth:
 * - /api/auth/login
 * - /api/auth/verify-2fa
 *
 * Ela pode devolver:
 *  A) requiresTwoFactor + email
 *  B) user + tokens.{accessToken, refreshToken}
 *  (mantendo compatibilidade com access_token / refresh_token na raiz)
 */
type AuthResponse = {
  requiresTwoFactor?: boolean;
  email?: string;

  // Versão “flat” (compatibilidade)
  access_token?: string;
  accessToken?: string;
  refresh_token?: string;
  refreshToken?: string;

  // Versão aninhada (formato atual da sua API)
  user?: {
    id: string;
    email: string;
    name: string;
    companyId: string | null;
    isSuperAdmin?: boolean;
    twoFactorEnabled?: boolean;
  };
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
  };
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
  const [authReady, setAuthReady] = useState(false);

  const fetchMe = async (): Promise<AuthUser> => {
    const response = await apiClient.get<AuthUser>('/auth/me', { params: { _ts: Date.now() } });
    return response.data;
  };

  const setSessionFromTokens = async (newTokens: AuthTokens): Promise<AuthUser> => {
    clearAccessState();

    localStorage.setItem('access_token', newTokens.accessToken);
    localStorage.setItem('refresh_token', newTokens.refreshToken);

    setTokens(newTokens);
    const me = await fetchMe();
    setUser(me);
    setRequiresTwoFactor(false);
    setPendingEmail(null);
    setAuthReady(true);
    return me;
  };

  // Tenta carregar usuário atual ao montar, se houver tokens no localStorage
  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');

    if (!accessToken && !refreshToken) {
      setAuthReady(true);
      return;
    }

    const fetchCurrentUser = async () => {
      try {
        setLoading(true);
        const me = await fetchMe();
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
        setAuthReady(true);
      }
    };

    void fetchCurrentUser();
  }, []);

  /**
   * Helper para extrair tokens em QUALQUER formato aceito
   */
  const extractTokens = (data: AuthResponse): AuthTokens | null => {
    const access =
      data.access_token ??
      data.accessToken ??
      data.tokens?.accessToken ??
      null;

    const refresh =
      data.refresh_token ??
      data.refreshToken ??
      data.tokens?.refreshToken ??
      null;

    if (!access || !refresh) {
      return null;
    }

    return {
      accessToken: access,
      refreshToken: refresh,
    };
  };

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    try {
      // Avoid getting stuck due to a stale local blocked state (e.g. after trial ended, then got exempt/unblocked).
      clearAccessState();
      // Use public client so we never send a stale Authorization header during login.
      const response = await publicApiClient.post<AuthResponse>(
        '/auth/login',
        credentials
      );
      const data = response.data;

      // Caso 2FA
      if (data?.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setPendingEmail(credentials.email);
        return;
      }

      // Extrai tokens (formato flat ou tokens.{...})
      const extracted = extractTokens(data);
      if (!extracted) {
        throw new Error(
          'A API não retornou tokens de autenticação em /auth/login.'
        );
      }

      // Salva tokens no localStorage
      await setSessionFromTokens(extracted);

        // Garante a barra final: GitHub Pages costuma canonizar "/app" -> "/app/".
        // Evita um 301 extra (e edge-cases de cache) durante recarregamentos.
        navigate('/app/');
    } finally {
      setLoading(false);
    }
  };

  const verifyTwoFactor = async (payload: TwoFactorPayload) => {
    setLoading(true);
    try {
      clearAccessState();
      // Use public client so we never send a stale Authorization header during 2FA verification.
      const response = await publicApiClient.post<AuthResponse>(
        '/auth/verify-2fa',
        payload
      );
      const data = response.data;

      const extracted = extractTokens(data);
      if (!extracted) {
        throw new Error(
          'A API não retornou tokens de autenticação em /auth/verify-2fa.'
        );
      }

      await setSessionFromTokens(extracted);
        // Garante a barra final: GitHub Pages costuma canonizar "/app" -> "/app/".
        // Evita um 301 extra (e edge-cases de cache) durante recarregamentos.
        navigate('/app/');
    } finally {
      setLoading(false);
    }
  };

  const completeOAuthLogin = async (newTokens: AuthTokens) => {
    setLoading(true);
    try {
      return await setSessionFromTokens(newTokens);
    } finally {
      setLoading(false);
    }
  };

  const refreshMe = async () => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    if (!accessToken && !refreshToken) {
      setUser(null);
      setTokens(null);
      setAuthReady(true);
      return null;
    }

    setLoading(true);
    try {
      const me = await fetchMe();
      setUser(me);
      setTokens({ accessToken: accessToken || '', refreshToken: refreshToken || '' });
      setAuthReady(true);
      return me;
    } catch {
      setUser(null);
      setTokens(null);
      setAuthReady(true);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignora erro de logout
    }
    clearAccessState();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setTokens(null);
    setRequiresTwoFactor(false);
    setPendingEmail(null);
    setAuthReady(true);
    navigate('/login');
  };

  const value: AuthContextValue = {
    user,
    tokens,
    isAuthenticated: !!user && !!tokens,
    authReady,
    requiresTwoFactor,
    pendingEmail,
    loading,
    login,
    verifyTwoFactor,
    completeOAuthLogin,
    refreshMe,
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
