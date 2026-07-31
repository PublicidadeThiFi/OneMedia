import { safeInternalReturnUrl } from './internalReturnUrl';

const STORAGE_KEY = 'onemedia:marketplace:search-return:v1';

type MarketplaceSearchView = 'list' | 'map';

type MarketplaceSearchReturnState = {
  returnUrl: string;
  scrollY: number;
  activeSlug: string | null;
  mobileView: MarketplaceSearchView;
  savedAt: number;
};

function normalizeView(value: string | null | undefined): MarketplaceSearchView {
  return value === 'map' ? 'map' : 'list';
}

export function buildMarketplaceSearchReturnUrl(params: {
  activeSlug?: string | null;
  mobileView?: MarketplaceSearchView;
}) {
  const url = new URL(
    `${window.location.pathname}${window.location.search}`,
    window.location.origin,
  );

  if (params.activeSlug) url.searchParams.set('active', params.activeSlug);
  else url.searchParams.delete('active');

  if (params.mobileView === 'map') url.searchParams.set('view', 'map');
  else url.searchParams.delete('view');

  return safeInternalReturnUrl(`${url.pathname}${url.search}`, '/buscar');
}

export function readMarketplaceSearchUiState() {
  const query = new URLSearchParams(window.location.search);
  return {
    activeSlug: String(query.get('active') || '').trim() || null,
    mobileView: normalizeView(query.get('view')),
  };
}

export function saveMarketplaceSearchReturnState(
  state: Omit<MarketplaceSearchReturnState, 'savedAt'>,
) {
  try {
    const normalized: MarketplaceSearchReturnState = {
      ...state,
      returnUrl: safeInternalReturnUrl(state.returnUrl, '/buscar'),
      scrollY: Number.isFinite(state.scrollY) ? Math.max(0, state.scrollY) : 0,
      mobileView: normalizeView(state.mobileView),
      savedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // A navegação continua funcionando mesmo sem armazenamento disponível.
  }
}

export function consumeMarketplaceSearchReturnState(currentUrl: string) {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);

    const parsed = JSON.parse(raw) as Partial<MarketplaceSearchReturnState>;
    const expectedUrl = safeInternalReturnUrl(currentUrl, '/buscar');
    const savedUrl = safeInternalReturnUrl(parsed.returnUrl, '/buscar');
    const isFresh = Date.now() - Number(parsed.savedAt || 0) <= 30 * 60 * 1000;
    if (!isFresh || expectedUrl !== savedUrl) return null;

    return {
      returnUrl: savedUrl,
      scrollY: Math.max(0, Number(parsed.scrollY || 0)),
      activeSlug: String(parsed.activeSlug || '').trim() || null,
      mobileView: normalizeView(parsed.mobileView),
    } satisfies Omit<MarketplaceSearchReturnState, 'savedAt'>;
  } catch {
    return null;
  }
}
