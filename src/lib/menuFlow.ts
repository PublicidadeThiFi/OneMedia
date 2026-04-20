export type MenuFlow = 'default' | 'promotions' | 'agency';
export type MenuCatalogAvailabilityFilter = 'all' | 'available' | 'partial' | 'occupied';
export type MenuCatalogSort = 'featured' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'impressions-desc';
export type MenuEntrySource = 'catalog' | 'legacy';

export type MenuQueryParams = {
  token: string;
  flow: MenuFlow;
  ownerCompanyId: string | null;
  uf: string | null;
  city: string | null;
  source: MenuEntrySource | null;
  // alguns screens usam pointId diretamente do query
  pointId?: string | null;
};

export type MenuCatalogQueryParams = MenuQueryParams & {
  q: string | null;
  type: string | null;
  district: string | null;
  environment: string | null;
  availability: MenuCatalogAvailabilityFilter;
  sort: MenuCatalogSort;
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

  if (v === 'agency' || v === 'agencia' || v === 'ag\u00eancia' || v === 'agencies') return 'agency';

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

  if (v === 'default' || v === 'padrao' || v === 'cardapio' || v === 'catalogo' || v === 'menu') return 'default';

  return 'default';
}

export function normalizeMenuCatalogAvailability(raw?: string | null): MenuCatalogAvailabilityFilter {
  const value = stripAccents(String(raw ?? '').trim().toLowerCase());
  if (value === 'available' || value === 'disponivel' || value === 'disponiveis' || value === 'livre') return 'available';
  if (value === 'partial' || value === 'parcial') return 'partial';
  if (value === 'occupied' || value === 'ocupado' || value === 'ocupados') return 'occupied';
  return 'all';
}

export function normalizeMenuCatalogSort(raw?: string | null): MenuCatalogSort {
  const value = stripAccents(String(raw ?? '').trim().toLowerCase());
  if (value === 'name-asc' || value === 'nome' || value === 'az' || value === 'a-z') return 'name-asc';
  if (value === 'name-desc' || value === 'za' || value === 'z-a') return 'name-desc';
  if (value === 'price-asc' || value === 'menor-preco' || value === 'preco-asc') return 'price-asc';
  if (value === 'price-desc' || value === 'maior-preco' || value === 'preco-desc') return 'price-desc';
  if (value === 'impressions-desc' || value === 'impacto' || value === 'impactos') return 'impressions-desc';
  return 'featured';
}

export function normalizeMenuEntrySource(raw?: string | null): MenuEntrySource | null {
  const value = stripAccents(String(raw ?? '').trim().toLowerCase());
  if (!value) return null;
  if (value === 'catalog' || value === 'catalogo' || value === 'vitrine') return 'catalog';
  if (value === 'legacy' || value === 'legado') return 'legacy';
  return null;
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
  const flow = normalizeMenuFlow(sp.get('flow') || sp.get('f') || sp.get('mode') || sp.get('m'));
  const ownerCompanyId = (sp.get('ownerCompanyId') || sp.get('owner') || sp.get('oc') || '').trim() || null;

  const ufRaw = String(sp.get('uf') || '').trim();
  const cityRaw = String(sp.get('city') || '').trim();
  const pointId = String(sp.get('pointId') || sp.get('id') || sp.get('point') || '').trim() || null;
  const source = normalizeMenuEntrySource(sp.get('source') || sp.get('entry'));

  return {
    token,
    flow,
    ownerCompanyId,
    uf: ufRaw ? ufRaw.toUpperCase() : null,
    city: cityRaw || null,
    pointId,
    source,
  };
}

export function getMenuCatalogQueryParams(search?: string): MenuCatalogQueryParams {
  const base = getMenuQueryParams(search);
  const sp = new URLSearchParams(typeof search === 'string' ? search : window.location.search);

  const q = String(sp.get('q') || sp.get('search') || '').trim() || null;
  const type = String(sp.get('type') || sp.get('mediaType') || '').trim().toUpperCase() || null;
  const district = String(sp.get('district') || sp.get('bairro') || '').trim() || null;
  const environment = String(sp.get('environment') || sp.get('ambiente') || '').trim() || null;
  const availability = normalizeMenuCatalogAvailability(sp.get('availability') || sp.get('status'));
  const sort = normalizeMenuCatalogSort(sp.get('sort') || sp.get('orderBy'));

  return {
    ...base,
    q,
    type,
    district,
    environment,
    availability,
    sort,
  };
}

export function isAgencyFlow(flow: MenuFlow): boolean {
  return flow === 'agency';
}

function clampPercent(raw: any): number {
  const p = Number(raw);
  if (!Number.isFinite(p)) return 0;
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
  ctx: Partial<MenuCatalogQueryParams> & { token: string },
  extra?: Record<string, any>,
): string {
  return `${path}${buildQueryString({
    token: ctx.token,
    flow: ctx.flow,
    ownerCompanyId: ctx.ownerCompanyId ?? undefined,
    uf: ctx.uf ?? undefined,
    city: ctx.city ?? undefined,
    source: ctx.source ?? undefined,
    q: ctx.q ?? undefined,
    type: ctx.type ?? undefined,
    district: ctx.district ?? undefined,
    environment: ctx.environment ?? undefined,
    availability: ctx.availability && ctx.availability !== 'all' ? ctx.availability : undefined,
    sort: ctx.sort && ctx.sort !== 'featured' ? ctx.sort : undefined,
    ...(extra || {}),
  })}`;
}

export function buildMenuCatalogUrl(
  path: string,
  ctx: Partial<MenuCatalogQueryParams> & { token: string },
  extra?: Record<string, any>,
): string {
  return `${path}${buildQueryString({
    token: ctx.token,
    flow: ctx.flow,
    ownerCompanyId: ctx.ownerCompanyId ?? undefined,
    uf: ctx.uf ?? undefined,
    city: ctx.city ?? undefined,
    source: ctx.source ?? undefined,
    q: ctx.q ?? undefined,
    type: ctx.type ?? undefined,
    district: ctx.district ?? undefined,
    environment: ctx.environment ?? undefined,
    availability: ctx.availability && ctx.availability !== 'all' ? ctx.availability : undefined,
    sort: ctx.sort && ctx.sort !== 'featured' ? ctx.sort : undefined,
    ...(extra || {}),
  })}`;
}

export function getMenuEntryUrl(ctx: Partial<MenuCatalogQueryParams> & { token: string }): string {
  if (ctx.source === 'catalog') {
    return buildMenuCatalogUrl('/menu', ctx);
  }

  if (ctx.uf && ctx.city) {
    return buildMenuUrl('/menu/pontos', ctx);
  }

  if (ctx.uf) {
    return buildMenuUrl('/menu/cidades', ctx);
  }

  return buildMenuUrl('/menu/uf', ctx);
}
