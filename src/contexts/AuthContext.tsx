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

import { createContext, useContext, useState, ReactNode } from 'react';
import { useNavigation } from '../App';
import { mockLogin, mockVerifyTwoFactor } from '../lib/mockAuth';
import { 
  AuthUser, 
  AuthTokens, 
  LoginCredentials, 
  TwoFactorPayload 
} from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  requiresTwoFactor: boolean;
  pendingEmail: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  verifyTwoFactor: (payload: TwoFactorPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const login = async (credentials: LoginCredentials) => {
    const result = await mockLogin(credentials);

    if (result.requiresTwoFactor) {
      // 2FA required - don't set user/tokens yet
      setRequiresTwoFactor(true);
      setPendingEmail(credentials.email);
    } else {
      // Login complete
      setUser(result.user);
      setTokens(result.tokens);
      setRequiresTwoFactor(false);
      setPendingEmail(null);
      
      // Redirect to internal app
      navigate('/app');
    }
  };

  const verifyTwoFactor = async (payload: TwoFactorPayload) => {
    const result = await mockVerifyTwoFactor(payload);

    if (result.user && result.tokens) {
      // 2FA verified - complete login
      setUser(result.user);
      setTokens(result.tokens);
      setRequiresTwoFactor(false);
      setPendingEmail(null);
      
      // Redirect to internal app
      navigate('/app');
    }
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    setRequiresTwoFactor(false);
    setPendingEmail(null);
    
    // Redirect to login
    navigate('/login');
  };

  const value: AuthContextValue = {
    user,
    tokens,
    isAuthenticated: !!user && !!tokens,
    requiresTwoFactor,
    pendingEmail,
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