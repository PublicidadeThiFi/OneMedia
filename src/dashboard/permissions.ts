import type { DashboardTab } from './types';

export type DashboardPermissions = {
  allowedTabs: DashboardTab[];
  canViewFinance: boolean;
  canManageSavedViews: boolean;
};

function toStr(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function toStrArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(toStr).filter(Boolean);
  if (typeof v === 'string') return [v];
  return [];
}

function includesAny(hay: string[], needles: string[]) {
  const h = hay.map((s) => s.toLowerCase());
  return needles.some((n) => h.includes(n.toLowerCase()));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getUserSignals(user: any) {
  const role = toStr(user?.role || user?.type || user?.profile);
  const roles = toStrArray(user?.roles);
  const perms = toStrArray(user?.permissions || user?.perms);
  const scopes = toStrArray(user?.scopes);
  const all = [role, ...roles, ...perms, ...scopes].filter(Boolean);
  return { role, roles, perms, scopes, all };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCompanySignals(company: any) {
  const modules = toStrArray(company?.modules || company?.features || company?.enabledModules);
  const plan = toStr(company?.plan || company?.tier);
  const all = [...modules, plan].filter(Boolean);
  return { modules, plan, all };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDashboardPermissions(user: any, company: any): DashboardPermissions {
  const u = getUserSignals(user);
  const c = getCompanySignals(company);

  const financeNeedles = [
    'finance',
    'financial',
    'billing',
    'invoices',
    'payments',
    'contas',
    'faturamento',
    'financeiro',
    'DASHBOARD_FINANCE',
    'dashboard:finance',
    'finance:read',
    'billing:read',
  ];

  const canViewFinance = includesAny(u.all, financeNeedles) || includesAny(c.all, financeNeedles);

  // Saved Views: por padrao liberado, a menos que exista um sinal explicito de readonly.
  const readonlyNeedles = ['readonly', 'read_only', 'DASHBOARD_VIEWS_READONLY', 'dashboard:views:readonly'];
  const canManageSavedViews = !includesAny(u.all, readonlyNeedles);

  const allowedTabs: DashboardTab[] = ['executivo', 'comercial', 'operacoes', ...(canViewFinance ? (['financeiro'] as DashboardTab[]) : []), 'inventario'];

  return { allowedTabs, canViewFinance, canManageSavedViews };
}
