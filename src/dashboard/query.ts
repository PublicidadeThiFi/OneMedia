import type { DatePreset, DashboardFilters, DashboardBackendQuery } from './types';

export function resolveDateRangeFromPreset(preset: DatePreset): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const from = new Date(now);

  if (preset === '7d') {
    from.setDate(from.getDate() - 7);
  } else if (preset === '30d') {
    from.setDate(from.getDate() - 30);
  } else if (preset === '90d') {
    from.setDate(from.getDate() - 90);
  } else if (preset === 'ytd') {
    from.setMonth(0, 1);
    from.setHours(0, 0, 0, 0);
  }

  return {
    dateFrom: from.toISOString(),
    dateTo: now.toISOString(),
  };
}

export function buildDashboardBackendQuery(filters: DashboardFilters): DashboardBackendQuery {
  const { dateFrom, dateTo } = resolveDateRangeFromPreset(filters.datePreset);

  return {
    dateFrom,
    dateTo,
    q: filters.query?.trim() ? filters.query.trim() : undefined,
    city: filters.city?.trim() ? filters.city.trim() : undefined,
    mediaType: filters.mediaType === 'ALL' ? undefined : filters.mediaType,
  };
}

export function toQueryString(query: DashboardBackendQuery, extra?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  const merged: Record<string, string | undefined> = {
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    q: query.q,
    city: query.city,
    mediaType: query.mediaType,
    ...(extra || {}),
  };

  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === null) continue;
    const vv = String(v).trim();
    if (!vv) continue;
    params.set(k, vv);
  }

  return params.toString();
}
