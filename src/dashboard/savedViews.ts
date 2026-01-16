import type { DashboardFilters, DashboardTab } from './types';

export type DashboardLayoutPreset = {
  // MVP: versao do layout salvo. No futuro, pode guardar grid/ordem/colapso por widget.
  version: 1;
  data?: Record<string, unknown>;
};

export type SavedDashboardView = {
  id: string;
  name: string;
  tab: DashboardTab;
  filters: DashboardFilters;
  layout: DashboardLayoutPreset;
  createdAt: string;
  updatedAt: string;
};

function keyFor(companyId: string, userKey: string) {
  return `oneMedia.dashboard.savedViews.v1:${companyId}:${userKey}`;
}

export function makeSavedViewId(): string {
  // Browser-first; fallback deterministic enough for localStorage.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `view_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function normalizeView(v: unknown): SavedDashboardView | null {
  if (!isObject(v)) return null;
  const id = typeof v.id === 'string' ? v.id : undefined;
  const name = typeof v.name === 'string' ? v.name : undefined;
  const tab = typeof v.tab === 'string' ? (v.tab as DashboardTab) : undefined;
  const filters = isObject(v.filters) ? (v.filters as DashboardFilters) : undefined;
  // Keep the literal version type (1) to satisfy DashboardLayoutPreset.
  const layout = isObject(v.layout)
    ? (v.layout as DashboardLayoutPreset)
    : ({ version: 1 } as DashboardLayoutPreset);
  const createdAt = typeof v.createdAt === 'string' ? v.createdAt : new Date().toISOString();
  const updatedAt = typeof v.updatedAt === 'string' ? v.updatedAt : createdAt;

  if (!id || !name || !tab || !filters) return null;
  return { id, name, tab, filters, layout, createdAt, updatedAt };
}

export function loadSavedViews(companyId: string, userKey: string): SavedDashboardView[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(keyFor(companyId, userKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed.map(normalizeView).filter((v): v is SavedDashboardView => v !== null);
    // newest first
    normalized.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    return normalized;
  } catch {
    return [];
  }
}

function persist(companyId: string, userKey: string, views: SavedDashboardView[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(keyFor(companyId, userKey), JSON.stringify(views));
  } catch {
    // ignore quota errors
  }
}

export function upsertSavedView(companyId: string, userKey: string, view: SavedDashboardView): SavedDashboardView[] {
  const current = loadSavedViews(companyId, userKey);
  const idx = current.findIndex((v) => v.id === view.id);
  const next = [...current];
  if (idx >= 0) next[idx] = view;
  else next.unshift(view);

  next.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  persist(companyId, userKey, next);
  return next;
}

export function deleteSavedView(companyId: string, userKey: string, id: string): SavedDashboardView[] {
  const current = loadSavedViews(companyId, userKey);
  const next = current.filter((v) => v.id !== id);
  persist(companyId, userKey, next);
  return next;
}
