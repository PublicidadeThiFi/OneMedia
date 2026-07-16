import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchMarketplaceAccount,
  loginMarketplaceAccount,
  logoutMarketplaceAccount,
  updateMarketplaceAccount,
} from '../lib/marketplaceAccountApi';
import {
  clearMarketplaceTokens,
  getMarketplaceRefreshToken,
  persistMarketplaceTokens,
  subscribeMarketplaceAuthStorage,
} from '../lib/marketplaceAuthStorage';
import type { MarketplaceAccount } from '../types/marketplace';

type MarketplaceAuthContextValue = {
  account: MarketplaceAccount | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: {
    email: string;
    password: string;
    rememberMe?: boolean;
    captchaToken?: string;
  }) => Promise<MarketplaceAccount>;
  logout: () => Promise<void>;
  refreshAccount: () => Promise<MarketplaceAccount | null>;
  updateProfile: (payload: { name?: string; phone?: string }) => Promise<MarketplaceAccount>;
};

const MarketplaceAuthContext = createContext<MarketplaceAuthContextValue | null>(null);

export function MarketplaceAuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<MarketplaceAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAccount = useCallback(async () => {
    const refreshToken = getMarketplaceRefreshToken();
    if (!refreshToken) {
      setAccount(null);
      setIsLoading(false);
      return null;
    }
    try {
      const next = await fetchMarketplaceAccount();
      setAccount(next);
      return next;
    } catch {
      clearMarketplaceTokens();
      setAccount(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAccount();
    return subscribeMarketplaceAuthStorage(() => {
      void refreshAccount();
    });
  }, [refreshAccount]);

  const login = useCallback(async (payload: {
    email: string;
    password: string;
    rememberMe?: boolean;
    captchaToken?: string;
  }) => {
    const result = await loginMarketplaceAccount(payload);
    persistMarketplaceTokens(result.tokens, Boolean(payload.rememberMe));
    setAccount(result.account);
    return result.account;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getMarketplaceRefreshToken();
    try {
      await logoutMarketplaceAccount(refreshToken);
    } finally {
      setAccount(null);
    }
  }, []);

  const updateProfile = useCallback(async (payload: { name?: string; phone?: string }) => {
    const updated = await updateMarketplaceAccount(payload);
    setAccount((current) => current ? { ...current, ...updated } : updated);
    return updated;
  }, []);

  const value = useMemo<MarketplaceAuthContextValue>(() => ({
    account,
    isLoading,
    isAuthenticated: Boolean(account),
    login,
    logout,
    refreshAccount,
    updateProfile,
  }), [account, isLoading, login, logout, refreshAccount, updateProfile]);

  return (
    <MarketplaceAuthContext.Provider value={value}>
      {children}
    </MarketplaceAuthContext.Provider>
  );
}

export function useMarketplaceAuth() {
  const value = useContext(MarketplaceAuthContext);
  if (!value) throw new Error('useMarketplaceAuth deve ser usado dentro de MarketplaceAuthProvider.');
  return value;
}
