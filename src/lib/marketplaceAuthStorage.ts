export type MarketplaceStoredTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresInSeconds?: number;
};

const ACCESS_TOKEN_STORAGE = 'onemedia:marketplace:access-token:v1';
const REFRESH_TOKEN_STORAGE = 'onemedia:marketplace:refresh-token:v1';
const REMEMBER_PREFERENCE_STORAGE = 'onemedia:marketplace:remember:v1';
const EVENT_NAME = 'onemedia:marketplace:auth-changed';

function safeGet(storage: Storage | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) || null;
  } catch {
    return null;
  }
}

function safeSet(storage: Storage | undefined, key: string, value: string) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Storage bloqueado não deve derrubar a navegação.
  }
}

function safeRemove(storage: Storage | undefined, key: string) {
  try {
    storage?.removeItem(key);
  } catch {
    // noop
  }
}

function stores() {
  if (typeof window === 'undefined') return { local: undefined, session: undefined };
  return { local: window.localStorage, session: window.sessionStorage };
}

function dispatchChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function getMarketplaceAccessToken(): string | null {
  const { local, session } = stores();
  return safeGet(session, ACCESS_TOKEN_STORAGE) || safeGet(local, ACCESS_TOKEN_STORAGE);
}

export function getMarketplaceRefreshToken(): string | null {
  const { local, session } = stores();
  return safeGet(session, REFRESH_TOKEN_STORAGE) || safeGet(local, REFRESH_TOKEN_STORAGE);
}

export function isMarketplaceRemembered(): boolean {
  const { local } = stores();
  return safeGet(local, REMEMBER_PREFERENCE_STORAGE) === '1';
}

export function persistMarketplaceTokens(
  tokens: MarketplaceStoredTokens,
  rememberMe: boolean,
) {
  const { local, session } = stores();
  clearMarketplaceTokens(false);
  const target = rememberMe ? local : session;
  safeSet(target, ACCESS_TOKEN_STORAGE, tokens.accessToken);
  safeSet(target, REFRESH_TOKEN_STORAGE, tokens.refreshToken);
  if (rememberMe) safeSet(local, REMEMBER_PREFERENCE_STORAGE, '1');
  else safeRemove(local, REMEMBER_PREFERENCE_STORAGE);
  dispatchChanged();
}

export function updateMarketplaceTokens(tokens: MarketplaceStoredTokens) {
  persistMarketplaceTokens(tokens, isMarketplaceRemembered());
}

export function clearMarketplaceTokens(notify = true) {
  const { local, session } = stores();
  [local, session].forEach((storage) => {
    safeRemove(storage, ACCESS_TOKEN_STORAGE);
    safeRemove(storage, REFRESH_TOKEN_STORAGE);
  });
  safeRemove(local, REMEMBER_PREFERENCE_STORAGE);
  if (notify) dispatchChanged();
}

export function subscribeMarketplaceAuthStorage(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const storageListener = (event: StorageEvent) => {
    if ([ACCESS_TOKEN_STORAGE, REFRESH_TOKEN_STORAGE, REMEMBER_PREFERENCE_STORAGE].includes(event.key || '')) listener();
  };
  window.addEventListener('storage', storageListener);
  window.addEventListener(EVENT_NAME, listener);
  return () => {
    window.removeEventListener('storage', storageListener);
    window.removeEventListener(EVENT_NAME, listener);
  };
}
