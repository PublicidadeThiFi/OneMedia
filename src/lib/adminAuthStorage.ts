const ADMIN_NEWS_ACCESS_TOKEN_KEY = 'news_admin_access_token';

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export { ADMIN_NEWS_ACCESS_TOKEN_KEY };

export function getAdminNewsAccessToken(): string | null {
  const session = getSessionStorage();
  const local = getLocalStorage();

  try {
    const sessionToken = session?.getItem(ADMIN_NEWS_ACCESS_TOKEN_KEY);
    if (sessionToken && sessionToken.trim()) return sessionToken;

    const legacyLocalToken = local?.getItem(ADMIN_NEWS_ACCESS_TOKEN_KEY);
    if (legacyLocalToken && legacyLocalToken.trim()) {
      session?.setItem(ADMIN_NEWS_ACCESS_TOKEN_KEY, legacyLocalToken);
      local?.removeItem(ADMIN_NEWS_ACCESS_TOKEN_KEY);
      return legacyLocalToken;
    }
  } catch {
    // ignore storage errors
  }

  return null;
}

export function setAdminNewsAccessToken(token: string): void {
  const session = getSessionStorage();
  const local = getLocalStorage();
  try {
    session?.setItem(ADMIN_NEWS_ACCESS_TOKEN_KEY, token);
    local?.removeItem(ADMIN_NEWS_ACCESS_TOKEN_KEY);
  } catch {
    // ignore quota/privacy errors
  }
}

export function clearAdminNewsAccessToken(): void {
  const session = getSessionStorage();
  const local = getLocalStorage();
  try {
    session?.removeItem(ADMIN_NEWS_ACCESS_TOKEN_KEY);
    local?.removeItem(ADMIN_NEWS_ACCESS_TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}
