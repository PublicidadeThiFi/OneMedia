import type { AuthTokens } from '../types/auth';

type PersistenceMode = 'local' | 'session';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const PERSISTENCE_KEY = 'auth_persistence';

function getStorage(mode: PersistenceMode): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return mode === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function readToken(mode: PersistenceMode, key: string) {
  const storage = getStorage(mode);
  if (!storage) return null;
  try {
    const value = storage.getItem(key);
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

function writeToken(mode: PersistenceMode, key: string, value: string) {
  const storage = getStorage(mode);
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // ignore quota/privacy errors
  }
}

function removeToken(mode: PersistenceMode, key: string) {
  const storage = getStorage(mode);
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
}

export function clearStoredTokens() {
  removeToken('local', ACCESS_TOKEN_KEY);
  removeToken('local', REFRESH_TOKEN_KEY);
  removeToken('local', PERSISTENCE_KEY);
  removeToken('session', ACCESS_TOKEN_KEY);
  removeToken('session', REFRESH_TOKEN_KEY);
  removeToken('session', PERSISTENCE_KEY);
}

export function getPersistenceMode(): PersistenceMode {
  const explicit = readToken('session', PERSISTENCE_KEY) ?? readToken('local', PERSISTENCE_KEY);
  if (explicit === 'local' || explicit === 'session') return explicit;

  if (readToken('local', REFRESH_TOKEN_KEY)) return 'local';
  return 'session';
}

export function getAccessToken() {
  return readToken('session', ACCESS_TOKEN_KEY) ?? readToken('local', ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return readToken('session', REFRESH_TOKEN_KEY) ?? readToken('local', REFRESH_TOKEN_KEY);
}

export function getStoredTokens(): AuthTokens | null {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!accessToken && !refreshToken) return null;
  return {
    accessToken: accessToken ?? '',
    refreshToken: refreshToken ?? '',
  };
}

export function storeTokens(tokens: AuthTokens, opts?: { remember?: boolean }) {
  const mode: PersistenceMode = opts?.remember ? 'local' : 'session';

  clearStoredTokens();
  // Keep the short-lived access token only in session storage whenever possible.
  // This reduces long-term exposure in localStorage while preserving the refresh session.
  writeToken('session', ACCESS_TOKEN_KEY, tokens.accessToken);
  writeToken(mode, REFRESH_TOKEN_KEY, tokens.refreshToken);
  writeToken(mode, PERSISTENCE_KEY, mode);
}

export function persistRotatedTokens(tokens: Partial<AuthTokens>) {
  const current = getStoredTokens();
  const mode = getPersistenceMode();
  const accessToken = tokens.accessToken ?? current?.accessToken ?? '';
  const refreshToken = tokens.refreshToken ?? current?.refreshToken ?? '';

  if (!accessToken && !refreshToken) {
    clearStoredTokens();
    return;
  }

  clearStoredTokens();
  if (accessToken) writeToken('session', ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) writeToken(mode, REFRESH_TOKEN_KEY, refreshToken);
  writeToken(mode, PERSISTENCE_KEY, mode);
}
