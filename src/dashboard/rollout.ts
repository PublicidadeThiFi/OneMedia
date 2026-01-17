import type { DashboardDataMode } from '../hooks/useDashboardQuery';

export type DashboardUiVariant = 'v2' | 'compact';

export type DashboardRolloutState = {
  variant: DashboardUiVariant;
  reason: string;
  source: 'query' | 'forced' | 'config' | 'env' | 'default';
  dataModeOverride?: DashboardDataMode;
  canOverride: boolean;
  debug: {
    queryDashboard?: string;
    queryDataMode?: string;
    forcedUntil?: number;
    forcedVariant?: DashboardUiVariant;
  };
};

type RolloutConfig = {
  defaultVariant?: DashboardUiVariant;
  enabledCompanies?: string[];
  enabledUsers?: string[];
  disabledCompanies?: string[];
  disabledUsers?: string[];
};

type ForceState = {
  variant: DashboardUiVariant;
  until: number;
  reason?: string;
};

const CONFIG_KEY = 'oneMedia.dashboard.rollout.config.v1';
const FORCE_KEY_PREFIX = 'oneMedia.dashboard.rollout.force.v1';

const safeWindow = () => (typeof window !== 'undefined' ? window : null);

function normalizeId(v?: string | null) {
  return (v || '').trim();
}

function readJson<T>(key: string): T | null {
  const w = safeWindow();
  if (!w) return null;
  try {
    const raw = w.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: any) {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function removeKey(key: string) {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function getEnv(name: string): string | undefined {
  try {
    return ((import.meta as any)?.env?.[name] as string) || undefined;
  } catch {
    return undefined;
  }
}

function csvToList(v?: string): string[] {
  if (!v) return [];
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getQueryParams() {
  const w = safeWindow();
  if (!w) return new URLSearchParams();
  return new URLSearchParams(w.location.search);
}

function forceKey(companyId?: string, userId?: string) {
  return `${FORCE_KEY_PREFIX}:${normalizeId(companyId) || 'na'}:${normalizeId(userId) || 'na'}`;
}

export function setForcedDashboardVariant(args: {
  companyId?: string;
  userId?: string;
  variant: DashboardUiVariant;
  ttlMs?: number;
  reason?: string;
}) {
  const ttl = args.ttlMs ?? 24 * 60 * 60 * 1000; // 24h
  const until = Date.now() + ttl;
  const next: ForceState = { variant: args.variant, until, reason: args.reason };
  writeJson(forceKey(args.companyId, args.userId), next);
}

export function clearForcedDashboardVariant(companyId?: string, userId?: string) {
  removeKey(forceKey(companyId, userId));
}

export function loadRolloutConfig(): RolloutConfig {
  const cfg = readJson<RolloutConfig>(CONFIG_KEY) || {};

  // Env allowlists (comma separated)
  const envDefault = getEnv('VITE_DASHBOARD_ROLLOUT_DEFAULT');
  const envEnabledCompanies = csvToList(getEnv('VITE_DASHBOARD_ROLLOUT_ENABLED_COMPANIES'));
  const envEnabledUsers = csvToList(getEnv('VITE_DASHBOARD_ROLLOUT_ENABLED_USERS'));
  const envDisabledCompanies = csvToList(getEnv('VITE_DASHBOARD_ROLLOUT_DISABLED_COMPANIES'));
  const envDisabledUsers = csvToList(getEnv('VITE_DASHBOARD_ROLLOUT_DISABLED_USERS'));

  return {
    defaultVariant: (cfg.defaultVariant || (envDefault === 'compact' ? 'compact' : envDefault === 'v2' ? 'v2' : undefined)),
    enabledCompanies: uniq([...(cfg.enabledCompanies || []), ...envEnabledCompanies]),
    enabledUsers: uniq([...(cfg.enabledUsers || []), ...envEnabledUsers]),
    disabledCompanies: uniq([...(cfg.disabledCompanies || []), ...envDisabledCompanies]),
    disabledUsers: uniq([...(cfg.disabledUsers || []), ...envDisabledUsers]),
  };
}

function uniq(list: string[]) {
  const s = new Set<string>();
  list.forEach((x) => {
    const n = normalizeId(x);
    if (n) s.add(n);
  });
  return Array.from(s);
}

function parseVariant(v?: string | null): DashboardUiVariant | null {
  const s = (v || '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'v2' || s === 'new') return 'v2';
  if (s === 'compact' || s === 'safe' || s === 'v1' || s === 'off') return 'compact';
  return null;
}

function parseDataMode(v?: string | null): DashboardDataMode | undefined {
  const s = (v || '').trim().toLowerCase();
  if (!s) return undefined;
  if (s === 'backend') return 'backend';
  if (s === 'mock') return 'mock';
  return undefined;
}

export function getDashboardRolloutState(input: {
  companyId?: string;
  userId?: string;
  userEmail?: string;
  canOverride?: boolean;
}): DashboardRolloutState {
  const companyId = normalizeId(input.companyId);
  const userId = normalizeId(input.userId) || normalizeId(input.userEmail);
  const canOverride = !!input.canOverride;

  const qp = getQueryParams();
  const queryDashboard = qp.get('dashboard');
  const queryDataMode = qp.get('dashboardData');

  const queryVariant = parseVariant(queryDashboard);
  const dataModeOverride = parseDataMode(queryDataMode);

  // 1) Query param override (always wins)
  if (queryVariant) {
    return {
      variant: queryVariant,
      reason: `Override por URL (?dashboard=${queryDashboard})`,
      source: 'query',
      dataModeOverride,
      canOverride,
      debug: { queryDashboard: queryDashboard || undefined, queryDataMode: queryDataMode || undefined },
    };
  }

  // 2) Forced override (per company+user)
  const forced = readJson<ForceState>(forceKey(companyId, userId));
  if (forced && typeof forced.until === 'number' && forced.until > Date.now()) {
    return {
      variant: forced.variant,
      reason: forced.reason || 'Override forçado (rollback/mitigação)',
      source: 'forced',
      dataModeOverride,
      canOverride,
      debug: { forcedUntil: forced.until, forcedVariant: forced.variant, queryDataMode: queryDataMode || undefined },
    };
  }

  const cfg = loadRolloutConfig();
  const disabledCompanies = new Set(cfg.disabledCompanies || []);
  const disabledUsers = new Set(cfg.disabledUsers || []);
  const enabledCompanies = new Set(cfg.enabledCompanies || []);
  const enabledUsers = new Set(cfg.enabledUsers || []);

  // 3) Config denylist
  if (companyId && disabledCompanies.has(companyId)) {
    return {
      variant: 'compact',
      reason: 'Bloqueado por empresa (denylist)',
      source: 'config',
      dataModeOverride,
      canOverride,
      debug: { queryDataMode: queryDataMode || undefined },
    };
  }
  if (userId && disabledUsers.has(userId)) {
    return {
      variant: 'compact',
      reason: 'Bloqueado por usuário (denylist)',
      source: 'config',
      dataModeOverride,
      canOverride,
      debug: { queryDataMode: queryDataMode || undefined },
    };
  }

  // 4) Config allowlist
  if (companyId && enabledCompanies.has(companyId)) {
    return {
      variant: 'v2',
      reason: 'Habilitado por empresa (allowlist)',
      source: 'config',
      dataModeOverride,
      canOverride,
      debug: { queryDataMode: queryDataMode || undefined },
    };
  }
  if (userId && enabledUsers.has(userId)) {
    return {
      variant: 'v2',
      reason: 'Habilitado por usuário (allowlist)',
      source: 'config',
      dataModeOverride,
      canOverride,
      debug: { queryDataMode: queryDataMode || undefined },
    };
  }

  // 5) Default (env/config) — fallback para v2 pra não quebrar quem já usa
  const defaultVariant: DashboardUiVariant = cfg.defaultVariant || 'v2';

  return {
    variant: defaultVariant,
    reason: defaultVariant === 'v2' ? 'Padrão (v2)' : 'Padrão (compact)',
    source: cfg.defaultVariant ? 'env' : 'default',
    dataModeOverride,
    canOverride,
    debug: { queryDataMode: queryDataMode || undefined },
  };
}
