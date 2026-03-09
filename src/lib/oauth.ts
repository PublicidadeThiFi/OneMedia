import { publicApiClient } from './apiClient';

export type SocialProvider = 'google' | 'outlook';

export type BackendOAuthProvider = 'google' | 'microsoft';

export function toBackendProvider(provider: SocialProvider): BackendOAuthProvider {
  return provider === 'outlook' ? 'microsoft' : 'google';
}

function safeInternalNext(next: string | null | undefined): string {
  const n = String(next || '').trim();
  if (!n) return '/app/';

  // Prevent open-redirects: allow only internal paths.
  if (!n.startsWith('/')) return '/app/';

  // Avoid protocol-relative (//evil.com)
  if (n.startsWith('//')) return '/app/';

  return n;
}

export function buildOAuthStartUrl(provider: SocialProvider, opts?: { next?: string | null }) {
  const base = (publicApiClient.defaults.baseURL as string | undefined) || '/api';
  const normalized = base === '__MISSING_API_BASE_URL__' ? '/api' : base;

  const backendProvider = toBackendProvider(provider);
  const next = safeInternalNext(opts?.next ?? '/app/');

  // Controller supports both '/api/auth/oauth/*' and '/auth/oauth/*'.
  // Here we keep it relative to the configured API base.
  const url = `${normalized.replace(/\/$/, '')}/auth/oauth/${backendProvider}/start?next=${encodeURIComponent(next)}`;
  return url;
}

export function parseOAuthCallbackParams(loc: Location = window.location) {
  const qs = new URLSearchParams(loc.search);
  const hs = new URLSearchParams(loc.hash.replace(/^#/, ''));

  const accessToken =
    qs.get('access_token') ??
    qs.get('token') ??
    hs.get('access_token') ??
    hs.get('token');

  const refreshToken = qs.get('refresh_token') ?? hs.get('refresh_token');
  const error = qs.get('error') ?? hs.get('error');
  const errorDescription = qs.get('error_description') ?? hs.get('error_description');
  const next = qs.get('next') ?? hs.get('next');

  return {
    accessToken: accessToken || null,
    refreshToken: refreshToken || null,
    error: error || null,
    errorDescription: errorDescription || null,
    next: safeInternalNext(next),
  };
}
