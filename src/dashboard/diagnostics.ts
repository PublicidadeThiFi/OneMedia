import { useEffect, useMemo, useState } from 'react';
import apiClient from '../lib/apiClient';

export type DashboardDiagnosticKind =
  | 'effect-start'
  | 'effect-cleanup'
  | 'request-start'
  | 'request-success'
  | 'request-error'
  | 'request-abort'
  | 'warning';

export type DashboardDiagnosticEvent = {
  id: string;
  at: string;
  kind: DashboardDiagnosticKind;
  queryKey?: string;
  path?: string;
  url?: string;
  message?: string;
  durationMs?: number;
  details?: Record<string, unknown>;
};

type DashboardDiagnosticsStore = {
  events: DashboardDiagnosticEvent[];
  listeners: Set<() => void>;
};

const MAX_EVENTS = 250;

function getWindowObject(): Window | undefined {
  if (typeof window === 'undefined') return undefined;
  return window;
}

function getStore(): DashboardDiagnosticsStore | undefined {
  const win = getWindowObject() as (Window & { __dashboardDiagnosticsStore?: DashboardDiagnosticsStore }) | undefined;
  if (!win) return undefined;
  if (!win.__dashboardDiagnosticsStore) {
    win.__dashboardDiagnosticsStore = {
      events: [],
      listeners: new Set(),
    };
  }
  return win.__dashboardDiagnosticsStore;
}

export function isDashboardDiagnosticsEnabled(): boolean {
  const win = getWindowObject();
  if (!win) return false;

  try {
    const url = new URL(win.location.href);
    const qp = (url.searchParams.get('dashboardDebug') || '').toLowerCase();
    if (qp === '1' || qp === 'true') return true;
  } catch {
    // ignore
  }

  try {
    const stored = (win.localStorage.getItem('dashboard.debug') || '').toLowerCase();
    return stored === '1' || stored === 'true';
  } catch {
    return false;
  }
}

function safeConsoleLog(kind: DashboardDiagnosticKind, payload: DashboardDiagnosticEvent) {
  if (typeof console === 'undefined') return;
  const tag = '[dashboard][debug]';
  if (kind === 'warning' || kind === 'request-error') {
    console.warn(tag, payload);
    return;
  }
  console.info(tag, payload);
}

export function recordDashboardDiagnostic(event: Omit<DashboardDiagnosticEvent, 'id' | 'at'>) {
  if (!isDashboardDiagnosticsEnabled()) return;
  const store = getStore();
  if (!store) return;

  const payload: DashboardDiagnosticEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    ...event,
  };

  store.events = [...store.events, payload].slice(-MAX_EVENTS);
  store.listeners.forEach((listener) => listener());
  safeConsoleLog(payload.kind, payload);
}

export function subscribeDashboardDiagnostics(listener: () => void) {
  const store = getStore();
  if (!store) return () => undefined;
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
}

export function clearDashboardDiagnostics() {
  const store = getStore();
  if (!store) return;
  store.events = [];
  store.listeners.forEach((listener) => listener());
}

export function getDashboardDiagnosticsSnapshot(): DashboardDiagnosticEvent[] {
  const store = getStore();
  return store?.events ? [...store.events] : [];
}

export function normalizeDashboardRequestPath(path: string, baseURL?: string) {
  const originalPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedBase = String(baseURL ?? apiClient.defaults.baseURL ?? '').replace(/\/+$/, '');

  const baseHasApiPrefix = /\/api$/i.test(normalizedBase);
  const pathHasApiPrefix = /^\/api(?:\/|$)/i.test(originalPath);
  const duplicateApiPrefix = baseHasApiPrefix && pathHasApiPrefix;

  const normalizedPath = duplicateApiPrefix
    ? originalPath.replace(/^\/api(?=\/|$)/i, '') || '/'
    : originalPath;

  return {
    originalPath,
    normalizedBase,
    normalizedPath,
    duplicateApiPrefix,
  };
}

export function getDashboardResolvedUrl(path: string, queryString?: string) {
  const requestPath = normalizeDashboardRequestPath(path);
  const joinedPath = `${requestPath.normalizedBase}${requestPath.normalizedPath}`;
  const withQuery = `${joinedPath}${queryString ? `?${queryString}` : ''}`;

  let url = withQuery;
  if (/^https?:\/\//i.test(withQuery)) {
    url = withQuery;
  } else if (typeof window !== 'undefined') {
    try {
      url = new URL(withQuery, window.location.origin).toString();
    } catch {
      url = withQuery;
    }
  }

  return {
    baseURL: requestPath.normalizedBase,
    originalPath: requestPath.originalPath,
    normalizedPath: requestPath.normalizedPath,
    duplicateApiPrefix: requestPath.duplicateApiPrefix,
    url,
  };
}

function summarizeDiagnostics(events: DashboardDiagnosticEvent[]) {
  const byQuery = new Map<
    string,
    {
      starts: number;
      cleanups: number;
      aborts: number;
      successes: number;
      errors: number;
      warnings: number;
      lastMessage?: string;
    }
  >();

  let duplicateApiWarnings = 0;
  let fetcherIdentityWarnings = 0;

  for (const event of events) {
    const key = event.queryKey || event.path || 'global';
    const current = byQuery.get(key) ?? {
      starts: 0,
      cleanups: 0,
      aborts: 0,
      successes: 0,
      errors: 0,
      warnings: 0,
      lastMessage: undefined,
    };

    if (event.kind === 'effect-start') current.starts += 1;
    if (event.kind === 'effect-cleanup') current.cleanups += 1;
    if (event.kind === 'request-abort') current.aborts += 1;
    if (event.kind === 'request-success') current.successes += 1;
    if (event.kind === 'request-error') current.errors += 1;
    if (event.kind === 'warning') current.warnings += 1;
    if (event.message) current.lastMessage = event.message;
    byQuery.set(key, current);

    if (event.message?.includes('prefixo /api duplicado')) duplicateApiWarnings += 1;
    if (event.message?.includes('fetcher mudou sem alteração dos filtros')) fetcherIdentityWarnings += 1;
  }

  return {
    duplicateApiWarnings,
    fetcherIdentityWarnings,
    byQuery: Array.from(byQuery.entries())
      .map(([queryKey, stats]) => ({ queryKey, ...stats }))
      .sort((a, b) => {
        const scoreA = a.aborts + a.warnings + a.errors + a.cleanups;
        const scoreB = b.aborts + b.warnings + b.errors + b.cleanups;
        return scoreB - scoreA;
      }),
  };
}

export function useDashboardDiagnosticsFeed() {
  const enabled = isDashboardDiagnosticsEnabled();
  const [events, setEvents] = useState<DashboardDiagnosticEvent[]>(() => (enabled ? getDashboardDiagnosticsSnapshot() : []));

  useEffect(() => {
    if (!enabled) {
      setEvents([]);
      return;
    }

    setEvents(getDashboardDiagnosticsSnapshot());
    return subscribeDashboardDiagnostics(() => {
      setEvents(getDashboardDiagnosticsSnapshot());
    });
  }, [enabled]);

  const summary = useMemo(() => summarizeDiagnostics(events), [events]);

  return {
    enabled,
    events,
    summary,
    clear: clearDashboardDiagnostics,
  };
}
