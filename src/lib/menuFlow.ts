export type MenuFlow = 'default' | 'promotions' | 'agency';

export type MenuQueryParams = {
  token: string;
  flow: MenuFlow;
  ownerCompanyId: string | null;
  uf: string | null;
  city: string | null;
  // alguns screens usam pointId diretamente do query
  pointId?: string | null;
};

function stripAccents(v: string): string {
  try {
    return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    return v;
  }
}

export function normalizeMenuFlow(raw?: string | null): MenuFlow {
  const v0 = String(raw ?? '').trim().toLowerCase();
  if (!v0) return 'default';

  const v = stripAccents(v0);

  // Agency aliases
  if (v === 'agency' || v === 'agencia' || v === 'ag\u00eancia' || v === 'agencies') return 'agency';

  // Promotions aliases
  if (
    v === 'promotions' ||
    v === 'promotion' ||
    v === 'promo' ||
    v === 'promos' ||
    v === 'promocoes' ||
    v === 'promocao' ||
    v === 'promocaoes' ||
    v === 'ofertas' ||
    v === 'offers'
  ) {
    return 'promotions';
  }

  // Default aliases
  if (v === 'default' || v === 'padrao' || v === 'cardapio' || v === 'catalogo' || v === 'menu') return 'default';

  return 'default';
}

export function buildQueryString(params: Record<string, any>): string {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    const val = String(v ?? '').trim();
    if (val) sp.set(k, val);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export function getMenuQueryParams(search?: string): MenuQueryParams {
  const sp = new URLSearchParams(typeof search === 'string' ? search : window.location.search);
  const token = sp.get('token') || sp.get('t') || '';

  // Backward compat: algumas rotas antigas usavam `f`/`mode`.
  const flow = normalizeMenuFlow(sp.get('flow') || sp.get('f') || sp.get('mode') || sp.get('m'));

  // Backward compat (aliases)
  const ownerCompanyId = (sp.get('ownerCompanyId') || sp.get('owner') || sp.get('oc') || '').trim() || null;

  const ufRaw = String(sp.get('uf') || '').trim();
  const cityRaw = String(sp.get('city') || '').trim();
  const pointId = String(sp.get('pointId') || sp.get('id') || sp.get('point') || '').trim() || null;

  return {
    token,
    flow,
    ownerCompanyId,
    uf: ufRaw ? ufRaw.toUpperCase() : null,
    city: cityRaw || null,
    pointId,
  };
}

export function isAgencyFlow(flow: MenuFlow): boolean {
  return flow === 'agency';
}

function clampPercent(raw: any): number {
  const p = Number(raw);
  if (!Number.isFinite(p)) return 0;
  // protege contra valores absurdos, mas mantém flexível
  return Math.max(0, Math.min(500, p));
}

export function getAgencyMarkupPercent(company?: { agencyMarkupPercent?: number | null } | null): number {
  return clampPercent(company?.agencyMarkupPercent);
}

export function applyAgencyMarkup(value: number | null | undefined, percent: number | null | undefined): number | null {
  const v = Number(value);
  if (!Number.isFinite(v)) return null;

  const p = clampPercent(percent);
  if (p <= 0) return v;

  return Number((v * (1 + p / 100)).toFixed(2));
}

export function buildMenuUrl(
  path: string,
  ctx: Partial<MenuQueryParams> & { token: string },
  extra?: Record<string, any>,
): string {
  return `${path}${buildQueryString({
    token: ctx.token,
    flow: ctx.flow,
    ownerCompanyId: ctx.ownerCompanyId ?? undefined,
    uf: ctx.uf ?? undefined,
    city: ctx.city ?? undefined,
    ...(extra || {}),
  })}`;
}
