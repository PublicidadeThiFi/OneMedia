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
    companyId: string;
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
      const response = await apiClient.post<AuthResponse>(
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
      localStorage.setItem('access_token', extracted.accessToken);
      localStorage.setItem('refresh_token', extracted.refreshToken);

      setTokens(extracted);

      // Carrega usuário completo
      const meResponse = await apiClient.get<AuthUser>('/auth/me');
      setUser(meResponse.data);
      setRequiresTwoFactor(false);
      setPendingEmail(null);
      setAuthReady(true);

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

      const extracted = extractTokens(data);
      if (!extracted) {
        throw new Error(
          'A API não retornou tokens de autenticação em /auth/verify-2fa.'
        );
      }

      localStorage.setItem('access_token', extracted.accessToken);
      localStorage.setItem('refresh_token', extracted.refreshToken);

      setTokens(extracted);

      const meResponse = await apiClient.get<AuthUser>('/auth/me');
      setUser(meResponse.data);
      setRequiresTwoFactor(false);
      setPendingEmail(null);
      setAuthReady(true);
      navigate('/app');
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
