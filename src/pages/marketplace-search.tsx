import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, List, Map as MapIcon, RefreshCw, SearchX } from 'lucide-react';
import { MarketplaceMap } from '../components/marketplace/MarketplaceMap';
import { MarketplacePagination } from '../components/marketplace/MarketplacePagination';
import { MarketplacePointCard } from '../components/marketplace/MarketplacePointCard';
import { MarketplaceResultsToolbar } from '../components/marketplace/MarketplaceResultsToolbar';
import { MarketplaceSearchFilters } from '../components/marketplace/MarketplaceSearchFilters';
import { MarketplaceShell } from '../components/marketplace/MarketplaceShell';
import { useNavigation } from '../contexts/NavigationContext';
import { fetchMarketplacePoints } from '../lib/marketplaceApi';
import {
  buildMarketplacePatchedSearchPath,
  countMarketplaceAdvancedFilters,
  parseMarketplaceSearchParams,
} from '../lib/marketplaceFilters';
import type { MarketplaceSearchResponse } from '../types/marketplace';
import {
  buildMarketplaceSearchReturnUrl,
  consumeMarketplaceSearchReturnState,
  readMarketplaceSearchUiState,
  saveMarketplaceSearchReturnState,
} from '../lib/marketplaceSearchReturn';

function resultLabel(total: number) {
  return `${total.toLocaleString('pt-BR')} ${total === 1 ? 'ponto de mídia encontrado' : 'pontos de mídia encontrados'}`;
}

function MarketplaceSearchSkeleton() {
  return (
    <div className="marketplace-results-skeleton" aria-label="Carregando pontos de mídia">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="marketplace-results-skeleton__card" key={index}>
          <span className="marketplace-results-skeleton__media" />
          <span className="marketplace-results-skeleton__line marketplace-results-skeleton__line--wide" />
          <span className="marketplace-results-skeleton__line" />
          <span className="marketplace-results-skeleton__line marketplace-results-skeleton__line--price" />
        </div>
      ))}
    </div>
  );
}

export default function MarketplaceSearchPage() {
  const navigate = useNavigation();
  const currentSearch = window.location.search;
  const params = useMemo(() => parseMarketplaceSearchParams(currentSearch), [currentSearch]);
  const requestKey = useMemo(() => JSON.stringify(params), [params]);
  const [data, setData] = useState<MarketplaceSearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const initialUiState = useMemo(() => readMarketplaceSearchUiState(), []);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(initialUiState.activeSlug);
  const [mobileView, setMobileView] = useState<'list' | 'map'>(initialUiState.mobileView);
  const restoredRef = useRef(false);
  const [mapHeight, setMapHeight] = useState(620);
  const listBlockRef = useRef<HTMLDivElement | null>(null);
  const headingRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchMarketplacePoints(params, controller.signal)
      .then((response) => {
        setData(response);
        setActiveSlug((current) => (
          current && response.mapPoints.some((point) => point.slug === current) ? current : null
        ));
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        console.error('[marketplace] Falha ao buscar pontos:', requestError);
        setError('Não foi possível carregar os pontos de mídia. Verifique os filtros e tente novamente.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [requestKey, retryVersion]);

  useEffect(() => {
    const element = listBlockRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const updateHeight = () => {
      const measured = Math.ceil(element.getBoundingClientRect().height);
      setMapHeight(Math.max(560, measured));
    };
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, [data?.pagination.page, data?.items.length, loading]);

  const activeFilterCount = countMarketplaceAdvancedFilters(params);
  const updateSearch = useCallback((patch: Record<string, string | number | null | undefined>, resetPage = true) => {
    setActiveSlug(null);
    navigate(buildMarketplacePatchedSearchPath(
      window.location.search,
      { ...patch, active: null },
      resetPage,
    ));
  }, [navigate]);

  useEffect(() => {
    if (loading || !data || restoredRef.current) return;
    restoredRef.current = true;

    const currentUrl = `${window.location.pathname}${window.location.search}`;
    const stored = consumeMarketplaceSearchReturnState(currentUrl);
    const queryState = readMarketplaceSearchUiState();
    const restoredSlug = stored?.activeSlug || queryState.activeSlug;
    const restoredView = stored?.mobileView || queryState.mobileView;

    setMobileView(restoredView);
    if (restoredSlug && data.mapPoints.some((point) => point.slug === restoredSlug)) {
      setActiveSlug(restoredSlug);
    }

    if (!stored) return;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (stored.scrollY > 0) window.scrollTo({ top: stored.scrollY, behavior: 'auto' });
        else if (restoredSlug) cardRefs.current[restoredSlug]?.scrollIntoView({ block: 'center' });
      });
    });
  }, [data, loading]);

  const changePage = (page: number) => {
    updateSearch({ page: page <= 1 ? null : page }, false);
    window.requestAnimationFrame(() => {
      headingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const clearAdvancedFilters = () => {
    updateSearch({
      state: null,
      city: null,
      subcategory: null,
      environment: null,
      availability: null,
      sort: null,
      minPrice: null,
      maxPrice: null,
    });
    setFiltersOpen(false);
  };

  const openPoint = useCallback((slug: string) => {
    const returnUrl = buildMarketplaceSearchReturnUrl({
      activeSlug: slug,
      mobileView,
    });
    saveMarketplaceSearchReturnState({
      returnUrl,
      scrollY: window.scrollY,
      activeSlug: slug,
      mobileView,
    });
    // Atualiza a entrada atual do histórico antes de abrir o detalhe. Assim,
    // o botão Voltar do navegador restaura exatamente a mesma busca.
    window.history.replaceState(window.history.state, '', returnUrl);

    const detailQuery = new URLSearchParams();
    detailQuery.set('returnUrl', returnUrl);
    if (params.startDate) detailQuery.set('startDate', params.startDate);
    if (params.endDate) detailQuery.set('endDate', params.endDate);
    navigate(`/pontos/${encodeURIComponent(slug)}?${detailQuery.toString()}`);
  }, [mobileView, navigate, params.endDate, params.startDate]);

  const replaceUiState = (nextActiveSlug: string | null, nextView: 'list' | 'map') => {
    const nextUrl = buildMarketplaceSearchReturnUrl({
      activeSlug: nextActiveSlug,
      mobileView: nextView,
    });
    window.history.replaceState(window.history.state, '', nextUrl);
  };

  const changeMobileView = (view: 'list' | 'map') => {
    setMobileView(view);
    replaceUiState(activeSlug, view);
  };

  const activatePoint = (slug: string) => {
    setActiveSlug(slug);
    replaceUiState(slug, mobileView);
  };

  const activateFromMap = (slug: string) => {
    activatePoint(slug);
    cardRefs.current[slug]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const deactivate = (slug: string) => {
    setActiveSlug((current) => {
      if (current !== slug) return current;
      replaceUiState(null, mobileView);
      return null;
    });
  };

  const total = data?.pagination.total ?? 0;
  const hasResults = total > 0;

  return (
    <MarketplaceShell pageTitle="Buscar pontos de mídia">
      <section className="marketplace-search-page__top">
        <div className="marketplace-container">
          <MarketplaceResultsToolbar
            params={params}
            activeFilterCount={activeFilterCount}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen((open) => !open)}
          />
          <MarketplaceSearchFilters
            open={filtersOpen}
            params={params}
            metadata={data?.filters}
            onClose={() => setFiltersOpen(false)}
            onApply={(patch) => {
              updateSearch(patch);
              setFiltersOpen(false);
            }}
            onClear={clearAdvancedFilters}
          />
        </div>
      </section>

      <section className="marketplace-search-page__catalog" aria-busy={loading}>
        <div className="marketplace-search-page__container">
          <p className="marketplace-visually-hidden" aria-live="polite" aria-atomic="true">
            {loading ? 'Atualizando resultados.' : error && !data ? 'Falha ao carregar os resultados.' : resultLabel(total)}
          </p>
          <div className="marketplace-results-heading" ref={headingRef}>
            <div>
              <h1>{loading && !data ? 'Buscando pontos de mídia…' : resultLabel(total)}</h1>
              <p>Compare formatos, localização, período e o menor valor bisemanal de cada ponto.</p>
            </div>
            <div className="marketplace-results-heading__mobile-toggle" role="group" aria-label="Visualização dos resultados">
              <button type="button" aria-pressed={mobileView === 'list'} className={mobileView === 'list' ? 'is-active' : ''} onClick={() => changeMobileView('list')}>
                <List aria-hidden="true" /> Lista
              </button>
              <button type="button" aria-pressed={mobileView === 'map'} className={mobileView === 'map' ? 'is-active' : ''} onClick={() => changeMobileView('map')}>
                <MapIcon aria-hidden="true" /> Mapa
              </button>
            </div>
          </div>

          {error && !data && (
            <div className="marketplace-search-state" role="alert">
              <AlertCircle aria-hidden="true" />
              <h2>Não conseguimos carregar a busca</h2>
              <p>{error}</p>
              <button type="button" className="marketplace-button marketplace-button--primary" onClick={() => setRetryVersion((version) => version + 1)}>
                <RefreshCw aria-hidden="true" /> Tentar novamente
              </button>
            </div>
          )}

          {!error || data ? (
            <div className={`marketplace-results-layout marketplace-results-layout--${mobileView}`}>
              <div className="marketplace-results-list" ref={listBlockRef}>
                {loading && !data ? (
                  <MarketplaceSearchSkeleton />
                ) : hasResults ? (
                  <>
                    <div className="marketplace-results-grid" aria-busy={loading}>
                      {(data?.items ?? []).map((point) => (
                        <div
                          className="marketplace-results-grid__item"
                          key={point.id}
                          ref={(element) => { cardRefs.current[point.slug] = element; }}
                        >
                          <MarketplacePointCard
                            point={point}
                            active={activeSlug === point.slug}
                            onActivate={activatePoint}
                            onDeactivate={deactivate}
                            onOpen={openPoint}
                          />
                        </div>
                      ))}
                    </div>
                    {data && <MarketplacePagination pagination={data.pagination} onPageChange={changePage} />}
                  </>
                ) : (
                  <div className="marketplace-search-state marketplace-search-state--empty">
                    <SearchX aria-hidden="true" />
                    <h2>Nenhum ponto encontrado</h2>
                    <p>Altere o período, a localização ou remova alguns filtros para ampliar os resultados.</p>
                    <button type="button" className="marketplace-button marketplace-button--primary" onClick={() => navigate('/buscar')}>
                      Limpar toda a busca
                    </button>
                  </div>
                )}

                {data && error && (
                  <div className="marketplace-home-inline-error" role="status">
                    Os resultados podem estar desatualizados.{' '}
                    <button type="button" onClick={() => setRetryVersion((version) => version + 1)}>Atualizar</button>
                  </div>
                )}
              </div>

              <aside className="marketplace-results-map-column" aria-label="Mapa dos pontos encontrados">
                <div className="marketplace-results-map-sticky">
                  <MarketplaceMap
                    points={data?.mapPoints ?? []}
                    activeSlug={activeSlug}
                    height={mapHeight}
                    visibilityToken={mobileView}
                    onPointActivate={activateFromMap}
                    onPointDeactivate={deactivate}
                    onPointOpen={openPoint}
                  />
                </div>
              </aside>
            </div>
          ) : null}
        </div>
      </section>
    </MarketplaceShell>
  );
}
