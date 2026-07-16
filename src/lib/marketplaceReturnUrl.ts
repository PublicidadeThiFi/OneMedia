export function safeMarketplaceReturnUrl(
  value: string | null | undefined,
  fallback = '/marketplace/solicitacoes',
) {
  const raw = String(value || '').trim();
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback;
  return raw.slice(0, 2048);
}

export function readMarketplaceReturnUrl(fallback = '/marketplace/solicitacoes') {
  if (typeof window === 'undefined') return fallback;
  try {
    return safeMarketplaceReturnUrl(
      new URLSearchParams(window.location.search).get('returnUrl'),
      fallback,
    );
  } catch {
    return fallback;
  }
}
