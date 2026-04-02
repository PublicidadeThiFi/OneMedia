const OAUTH_PARAM_KEYS = [
  'access_token',
  'refresh_token',
  'token',
  'error',
  'error_description',
  'oauth_error',
  'oauth_error_description',
] as const;

const TOKEN_PARAM_KEYS = ['token'] as const;
const OAUTH_ERROR_PARAM_KEYS = ['error', 'error_description', 'oauth_error', 'oauth_error_description'] as const;

type StripParamsOptions = {
  pathname?: string;
};

export function stripSearchParams(keys: readonly string[], options?: StripParamsOptions) {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  let changed = false;

  for (const key of keys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }

  const pathname = options?.pathname ?? url.pathname;
  if (!changed && pathname === url.pathname) return;

  const nextSearch = url.searchParams.toString();
  const nextUrl = `${pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
  window.history.replaceState(null, '', nextUrl);
}

export function stripOAuthCallbackParams(pathname = '/oauth-callback') {
  stripSearchParams(OAUTH_PARAM_KEYS, { pathname });
}

export function stripTokenParam(pathname?: string) {
  stripSearchParams(TOKEN_PARAM_KEYS, pathname ? { pathname } : undefined);
}

export function stripOAuthErrorParams(pathname?: string) {
  stripSearchParams(OAUTH_ERROR_PARAM_KEYS, pathname ? { pathname } : undefined);
}
