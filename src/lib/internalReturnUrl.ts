const MAX_INTERNAL_URL_LENGTH = 2048;
const UNSAFE_CHARACTERS = /[\\\u0000-\u001F\u007F]/;

function fallbackOrigin() {
  return typeof window !== 'undefined' ? window.location.origin : 'https://onemedia.invalid';
}

export function safeInternalReturnUrl(
  value: string | null | undefined,
  fallback = '/home',
) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > MAX_INTERNAL_URL_LENGTH || UNSAFE_CHARACTERS.test(raw)) {
    return fallback;
  }
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;

  try {
    const origin = fallbackOrigin();
    const parsed = new URL(raw, origin);
    if (parsed.origin !== origin) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`.slice(0, MAX_INTERNAL_URL_LENGTH);
  } catch {
    return fallback;
  }
}

export function currentInternalUrl(fallback = '/home') {
  if (typeof window === 'undefined') return fallback;
  return safeInternalReturnUrl(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
    fallback,
  );
}

export function readInternalReturnUrl(
  fallback = '/home',
  parameterName = 'returnUrl',
) {
  if (typeof window === 'undefined') return fallback;
  try {
    return safeInternalReturnUrl(
      new URLSearchParams(window.location.search).get(parameterName),
      fallback,
    );
  } catch {
    return fallback;
  }
}

export function appendInternalReturnUrl(
  path: string,
  returnUrl: string,
  parameterName = 'returnUrl',
) {
  const safePath = safeInternalReturnUrl(path, '/home');
  const safeReturnUrl = safeInternalReturnUrl(returnUrl, '/home');
  const url = new URL(safePath, fallbackOrigin());
  url.searchParams.set(parameterName, safeReturnUrl);
  return `${url.pathname}${url.search}${url.hash}`;
}
