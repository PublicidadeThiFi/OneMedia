import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigation } from '../App';
import {
  clearAdminNewsAccessToken,
  fetchAdminNewsMe,
  getAdminNewsAccessToken,
  loginAdminNews,
  logoutAdminNews,
  setAdminNewsAccessToken,
} from '../services/admin-news';
import type { AdminNewsLoginPayload, AdminNewsUser } from '../types/admin-news-auth';

interface AdminAuthContextValue {
  user: AdminNewsUser | null;
  isAuthenticated: boolean;
  authReady: boolean;
  loading: boolean;
  login: (payload: AdminNewsLoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<AdminNewsUser | null>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigation();
  const [user, setUser] = useState<AdminNewsUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const refreshMe = async (): Promise<AdminNewsUser | null> => {
    const token = getAdminNewsAccessToken();
    if (!token) {
      setUser(null);
      setAuthReady(true);
      return null;
    }

    try {
      const data = await fetchAdminNewsMe(token);
      setUser(data.user);
      return data.user;
    } catch {
      clearAdminNewsAccessToken();
      setUser(null);
      return null;
    } finally {
      setAuthReady(true);
    }
  };

  useEffect(() => {
    void refreshMe();
  }, []);

  const login = async (payload: AdminNewsLoginPayload) => {
    setLoading(true);
    try {
      const response = await loginAdminNews(payload);
      setAdminNewsAccessToken(response.tokens.accessToken);
      setUser(response.user);
      setAuthReady(true);
      navigate('/admin/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const token = getAdminNewsAccessToken();
      if (token) {
        try {
          await logoutAdminNews(token);
        } catch {
          // noop - logout local é suficiente nesta etapa
        }
      }
    } finally {
      clearAdminNewsAccessToken();
      setUser(null);
      setAuthReady(true);
      setLoading(false);
      navigate('/admin');
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        authReady,
        loading,
        login,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth deve ser usado dentro de AdminAuthProvider');
  }
  return context;
}
