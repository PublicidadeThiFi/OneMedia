import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, KeyRound } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { useNavigation } from '../../../contexts/NavigationContext';
import { usePublicMediaKit } from '../../../hooks/usePublicMediaKit';
import {
  buildMenuCatalogOptions,
  filterMenuCatalogPoints,
  getCityScopedPoints,
  getMenuCatalogActiveFilters,
  getRegionScopedPoints,
  removeMenuCatalogFilter,
  summarizeMenuCatalogPoints,
} from '../../../lib/menuCatalogFilters';
import { resolveMenuCatalogHeroContract } from '../../../lib/menuCatalogDataContract';
import { formatBRL } from '../../../lib/format';
import { computePointPriceSummary } from '../../../lib/publicMediaKit';
import { getCartCount } from '../../../lib/menuCart';
import {
  buildMenuCatalogUrl,
  buildMenuUrl,
  getAgencyMarkupPercent,
  getMenuCatalogQueryParams,
  isAgencyFlow,
  type MenuCatalogQueryParams,
} from '../../../lib/menuFlow';
import { MenuCatalogAbout } from './MenuCatalogAbout';
import { MenuCatalogActions } from './MenuCatalogActions';
import { MenuCatalogFilters } from './MenuCatalogFilters';
import { MenuCatalogGrid } from './MenuCatalogGrid';
import { MenuCatalogHero } from './MenuCatalogHero';
import { MenuCatalogResults } from './MenuCatalogResults';

function buildFlowLabel(flow: 'default' | 'promotions' | 'agency'): string {
  if (flow === 'agency') return 'Modo agência';
  if (flow === 'promotions') return 'Modo promoções';
  return 'Modo padrão';
}

function buildLocationLabel(uf: string | null, city: string | null): string | null {
  if (city && uf) return `${city} • ${uf}`;
  if (city) return city;
  if (uf) return uf;
  return null;
}

function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: value >= 1000000 ? 1 : 0,
  }).format(value);
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.max(0, value));
}

export default function MenuCatalogPage() {
  const navigate = useNavigation();
  const query = getMenuCatalogQueryParams();
  const { data, loading, error, reload } = usePublicMediaKit({
    token: query.token,
    ownerCompanyId: query.ownerCompanyId,
    flow: query.flow,
  });

  const [searchValue, setSearchValue] = useState(query.q ?? '');
  const [cartCount, setCartCount] = useState<number>(() => {
    try {
      return getCartCount();
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    setSearchValue(query.q ?? '');
  }, [query.q]);

  useEffect(() => {
    try {
      setCartCount(getCartCount());
    } catch {
      setCartCount(0);
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'menu_cart') {
        try {
          setCartCount(getCartCount());
        } catch {
          setCartCount(0);
        }
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const hero = useMemo(() => resolveMenuCatalogHeroContract(data), [data]);
  const isAgency = isAgencyFlow(query.flow);
  const agencyMarkupPercent = getAgencyMarkupPercent(data?.company);

  const allPoints = useMemo(() => (Array.isArray(data?.points) ? data.points : []), [data?.points]);

  const regionScopedPoints = useMemo(() => getRegionScopedPoints(allPoints, query), [allPoints, query]);
  const cityScopedPoints = useMemo(() => getCityScopedPoints(regionScopedPoints, query), [regionScopedPoints, query]);
  const filteredPoints = useMemo(
    () => filterMenuCatalogPoints(cityScopedPoints, query),
    [cityScopedPoints, query],
  );

  const activeFilters = useMemo(() => getMenuCatalogActiveFilters(query), [query]);
  const activeFiltersCount = activeFilters.length;

  const legacyUrl = useMemo(() => {
    if (query.uf && query.city) return buildMenuCatalogUrl('/menu/pontos', query);
    if (query.uf) return buildMenuCatalogUrl('/menu/cidades', query);
    return buildMenuCatalogUrl('/menu/uf', query);
  }, [query]);

  const typeOptions = useMemo(() => buildMenuCatalogOptions(cityScopedPoints, (point) => point.type), [cityScopedPoints]);
  const cityOptions = useMemo(() => buildMenuCatalogOptions(regionScopedPoints, (point) => point.addressCity), [regionScopedPoints]);
  const districtOptions = useMemo(() => buildMenuCatalogOptions(cityScopedPoints, (point) => point.addressDistrict), [cityScopedPoints]);
  const environmentOptions = useMemo(
    () => buildMenuCatalogOptions(cityScopedPoints, (point) => point.environment),
    [cityScopedPoints],
  );

  const baseStats = useMemo(() => summarizeMenuCatalogPoints(cityScopedPoints), [cityScopedPoints]);
  const filteredStats = useMemo(() => summarizeMenuCatalogPoints(filteredPoints), [filteredPoints]);

  const featuredPoint = filteredPoints[0] ?? null;
  const featuredPrice = featuredPoint ? computePointPriceSummary(featuredPoint, 'month').startingFrom : null;
  const locationLabel = buildLocationLabel(query.uf, query.city);
  const missingToken = !query.token;

  const changeCatalogQuery = (partial: Partial<MenuCatalogQueryParams>) => {
    const next: MenuCatalogQueryParams = {
      ...query,
      ...partial,
    };

    navigate(buildMenuCatalogUrl('/menu', next));
  };

  const handleSearchSubmit = () => {
    changeCatalogQuery({ q: searchValue.trim() || null });
  };

  const handleChangeRegion = () => {
    navigate(buildMenuCatalogUrl('/menu/uf', query));
  };

  const handleOpenLegacy = () => {
    navigate(legacyUrl);
  };

  const handleOpenCart = () => {
    navigate(
      buildMenuUrl('/menu/carrinho', {
        token: query.token,
        flow: query.flow,
        ownerCompanyId: query.ownerCompanyId,
        uf: query.uf,
        city: query.city,
        source: 'catalog',
        q: query.q,
        type: query.type,
        district: query.district,
        environment: query.environment,
        availability: query.availability,
        sort: query.sort,
      }),
    );
  };

  const handleScrollToGrid = () => {
    const element = document.getElementById('catalog-grid');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDetail = (pointId: string) => {
    const point = filteredPoints.find((item) => item.id === pointId);
    navigate(
      buildMenuUrl(
        '/menu/detalhe',
        {
          token: query.token,
          flow: query.flow,
          ownerCompanyId: query.ownerCompanyId,
          uf: query.uf ?? (point?.addressState ? String(point.addressState).toUpperCase() : null),
          city: query.city ?? point?.addressCity ?? null,
          source: 'catalog',
          q: query.q,
          type: query.type,
          district: query.district,
          environment: query.environment,
          availability: query.availability,
          sort: query.sort,
        },
        { pointId },
      ),
    );
  };

  const handleRemoveFilter = (key: Parameters<typeof removeMenuCatalogFilter>[1]) => {
    navigate(buildMenuCatalogUrl('/menu', removeMenuCatalogFilter(query, key)));
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_35%,#f8fafc_100%)] text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <MenuCatalogHero
          companyName={hero.companyName || 'Mídia Kit'}
          logoUrl={hero.logoUrl}
          heroImageUrl={hero.heroImageUrl}
          generatedAt={hero.generatedAt}
          heroMetrics={hero.heroMetrics}
          flowLabel={buildFlowLabel(query.flow)}
          locationLabel={locationLabel}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <MenuCatalogAbout aboutText={hero.aboutText} companyName={hero.companyName || 'Mídia Kit'} />

          <MenuCatalogActions
            onReload={reload}
            onOpenLegacy={handleOpenLegacy}
            onChangeRegion={handleChangeRegion}
            onScrollToGrid={handleScrollToGrid}
            onOpenCart={handleOpenCart}
            legacyCtaLabel={query.city || query.uf ? 'Abrir lista legada da região' : 'Escolher região no fluxo legado'}
            disabled={loading}
            featuredPrice={featuredPrice !== null ? formatBRL(featuredPrice) : null}
            featuredPointName={featuredPoint?.name ?? null}
            cartCount={cartCount}
          />
        </div>

        {missingToken ? (
          <Card className="rounded-[28px] border-amber-200 bg-amber-50 shadow-[0_12px_30px_rgba(245,158,11,0.08)]">
            <CardContent className="flex items-start gap-4 p-6">
              <KeyRound className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <div className="text-base font-semibold text-amber-950">Token ausente</div>
                <div className="mt-1 text-sm leading-6 text-amber-900">
                  Abra o cardápio usando o link compartilhado para que o novo catálogo consiga carregar os dados públicos corretamente.
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="rounded-[28px] border-rose-200 bg-rose-50 shadow-[0_12px_30px_rgba(244,63,94,0.08)]">
            <CardContent className="flex items-start gap-4 p-6">
              <AlertCircle className="mt-0.5 h-5 w-5 text-rose-700" />
              <div>
                <div className="text-base font-semibold text-rose-950">Não foi possível carregar o catálogo</div>
                <div className="mt-1 text-sm leading-6 text-rose-900">{error}</div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <MenuCatalogFilters
          searchValue={searchValue}
          typeValue={query.type}
          cityValue={query.city}
          districtValue={query.district}
          environmentValue={query.environment}
          availabilityValue={query.availability}
          sortValue={query.sort}
          typeOptions={typeOptions}
          cityOptions={cityOptions}
          districtOptions={districtOptions}
          environmentOptions={environmentOptions}
          loading={loading}
          activeFiltersCount={activeFiltersCount}
          onSearchValueChange={setSearchValue}
          onSearchSubmit={handleSearchSubmit}
          onTypeChange={(value) => changeCatalogQuery({ type: value })}
          onCityChange={(value) => changeCatalogQuery({ city: value, district: null, environment: null })}
          onDistrictChange={(value) => changeCatalogQuery({ district: value })}
          onEnvironmentChange={(value) => changeCatalogQuery({ environment: value })}
          onAvailabilityChange={(value) => changeCatalogQuery({ availability: value })}
          onSortChange={(value) => changeCatalogQuery({ sort: value })}
          onClearFilters={() =>
            changeCatalogQuery({
              q: null,
              type: null,
              district: null,
              environment: null,
              availability: 'all',
              sort: 'featured',
            })
          }
        />

        <MenuCatalogResults
          totalPoints={baseStats.totalPoints}
          filteredPoints={filteredPoints.length}
          totalUnits={filteredStats.totalUnits}
          totalImpressionsLabel={formatCompactNumber(filteredStats.totalImpressions)}
          availableCount={filteredStats.available}
          partialCount={filteredStats.partial}
          occupiedCount={filteredStats.occupied}
          activeFilters={activeFilters}
          onRemoveFilter={handleRemoveFilter}
        />

        <section id="catalog-grid" className="scroll-mt-6">
          <MenuCatalogGrid
            points={filteredPoints}
            loading={loading}
            isAgency={isAgency}
            markupPercent={agencyMarkupPercent}
            onOpenDetail={handleOpenDetail}
            onClearFilters={() =>
              changeCatalogQuery({
                q: null,
                type: null,
                district: null,
                environment: null,
                availability: 'all',
                sort: 'featured',
              })
            }
            onChangeRegion={handleChangeRegion}
          />
        </section>

        {!loading && filteredPoints.length > 0 ? (
          <div className="pb-2 text-center text-xs uppercase tracking-[0.16em] text-slate-400">
            Mostrando {formatInteger(filteredPoints.length)} de {formatInteger(baseStats.totalPoints)} veículos ativos no catálogo
          </div>
        ) : null}
      </div>
    </div>
  );
}
