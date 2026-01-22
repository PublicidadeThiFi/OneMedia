import apiClient from './apiClient';

export function safeDate(value?: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value as any);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function formatDateBR(value?: unknown, fallback: string = '-') {
  const d = safeDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTimeBR(value?: unknown, fallback: string = '-') {
  const d = safeDate(value);
  if (!d) return fallback;
  return d.toLocaleString('pt-BR');
}

export function formatBRL(value?: unknown, fallback: string = 'R$ 0,00') {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : typeof (value as any)?.toNumber === 'function'
          ? (value as any).toNumber()
          : Number(value);

  if (!Number.isFinite(n)) return fallback;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatBRLFromCents(cents?: unknown, fallback: string = 'R$ 0,00') {
  const n =
    typeof cents === 'number'
      ? cents
      : typeof cents === 'string'
        ? Number(cents)
        : typeof (cents as any)?.toNumber === 'function'
          ? (cents as any).toNumber()
          : Number(cents);

  if (!Number.isFinite(n)) return fallback;
  return formatBRL(n / 100, fallback);
}

/**
 * Normaliza URLs de uploads para abrir em nova aba.
 * - Se já for URL absoluta, retorna como está.
 * - Se for /uploads/..., mantém assim quando a API é relativa (/api).
 * - Se a API tiver base URL absoluta (http://.../api), prefixa a origem.
 */
export function resolveUploadsUrl(url?: string | null): string | null {
  if (!url) return null;

  if (/^https?:\/\//i.test(url)) return url;

  const uploadsIndex = url.indexOf('/uploads/');
  const normalized = uploadsIndex >= 0 ? url.slice(uploadsIndex) : url;

  const base = String((apiClient.defaults as any)?.baseURL ?? '');
  // Base relativa: /api (Vercel rewrites / reverse proxy)
  if (!base || base.startsWith('/')) return normalized;

  // Base absoluta: https://host/api -> origin https://host
  const origin = base.replace(/\/?api\/?$/, '');
  const originNormalized = origin.endsWith('/') ? origin.slice(0, -1) : origin;
  return `${originNormalized}${normalized}`;
}
