import { useCallback, useEffect, useMemo, useState } from 'react';
import './menuCatalogTheme.css';
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
import { computePointPriceSummary, normalizeAvailability } from '../../../lib/publicMediaKit';
import { addToCart, getCartCount, MENU_CART_UPDATED_EVENT } from '../../../lib/menuCart';
import { toast } from 'sonner';
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
import './menuCatalogTheme.css';

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
  const { data, loading, error } = usePublicMediaKit({
    token: query.token,
    ownerCompanyId: query.ownerCompanyId,
    flow: query.flow,
  });

  const [searchValue, setSearchValue] = useState(query.q ?? '');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);
  const [cartCount, setCartCount] = useState<number>(() => {
    try {
      return getCartCount();
    } catch {
      return 0;
    }
  });

  const syncCartCount = useCallback(() => {
    try {
      setCartCount(getCartCount());
    } catch {
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    setSearchValue(query.q ?? '');
  }, [query.q]);

  useEffect(() => {
    syncCartCount();

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'menu_cart') {
        syncCartCount();
      }
    };

    const onCartUpdated = () => {
      syncCartCount();
    };

    const onPageVisible = () => {
      syncCartCount();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(MENU_CART_UPDATED_EVENT, onCartUpdated as EventListener);
    window.addEventListener('focus', onPageVisible);
    window.addEventListener('pageshow', onPageVisible);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(MENU_CART_UPDATED_EVENT, onCartUpdated as EventListener);
      window.removeEventListener('focus', onPageVisible);
      window.removeEventListener('pageshow', onPageVisible);
    };
  }, [syncCartCount]);

  const hero = useMemo(() => resolveMenuCatalogHeroContract(data), [data]);
  const isAgency = isAgencyFlow(query.flow);
  const agencyMarkupPercent = getAgencyMarkupPercent(data?.company);

  const allPoints = useMemo(() => (Array.isArray(data?.points) ? data.points : []), [data?.points]);

  useEffect(() => {
    if (allPoints.length === 0) {
      setSelectedPointIds((current) => (current.length > 0 ? [] : current));
      setIsSelectionMode((current) => (current ? false : current));
      return;
    }

    const availablePointIds = new Set(
      allPoints
        .filter((point) => normalizeAvailability(point) === 'Disponível')
        .map((point) => point.id),
    );

    setSelectedPointIds((current) => current.filter((id) => availablePointIds.has(id)));
  }, [allPoints]);

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

  useEffect(() => {
    if (!isSelectionMode) return;

    const visibleAvailableIds = new Set(
      filteredPoints
        .filter((point) => normalizeAvailability(point) === 'Disponível')
        .map((point) => point.id),
    );

    setSelectedPointIds((current) => current.filter((id) => visibleAvailableIds.has(id)));
  }, [filteredPoints, isSelectionMode]);

  const featuredPoint = filteredPoints[0] ?? null;
  const featuredPrice = featuredPoint ? computePointPriceSummary(featuredPoint, 'month').startingFrom : null;
  const selectedCount = selectedPointIds.length;
  const missingToken = !query.token;

  const changeCatalogQuery = (partial: Partial<MenuCatalogQueryParams>) => {
    const next: MenuCatalogQueryParams = {
      ...query,
      ...partial,
    };

    navigate(buildMenuCatalogUrl('/menu', next));
  };

  const clearCatalogFilters = () => {
    setSearchValue('');
    setSelectedPointIds([]);
    setIsSelectionMode(false);

    changeCatalogQuery({
      q: null,
      type: null,
      district: null,
      environment: null,
      availability: 'all',
      sort: 'featured',
    });
  };

  const handleSearchSubmit = () => {
    changeCatalogQuery({ q: searchValue.trim() || null });

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        document.getElementById('catalog-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const handleChangeRegion = () => {
    navigate(buildMenuCatalogUrl('/menu/uf', query));
  };

  const handleOpenRegionList = () => {
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

  const handleToggleSelectionMode = () => {
    if (isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedPointIds([]);
      return;
    }

    setIsSelectionMode(true);
  };

  const handleTogglePointSelection = (pointId: string) => {
    const point = allPoints.find((item) => item.id === pointId);
    if (!point || normalizeAvailability(point) !== 'Disponível') return;

    setSelectedPointIds((current) =>
      current.includes(pointId) ? current.filter((id) => id !== pointId) : [...current, pointId],
    );
  };

  const handleAddSelectedToCart = () => {
    if (selectedPointIds.length === 0) {
      toast.info('Selecione pelo menos um ponto disponível para adicionar ao carrinho.');
      return;
    }

    const selectedPoints = allPoints.filter((point) =>
      selectedPointIds.includes(point.id) && normalizeAvailability(point) === 'Disponível',
    );

    if (selectedPoints.length === 0) {
      toast.error('Os itens selecionados não estão mais disponíveis para entrar no carrinho.');
      setSelectedPointIds([]);
      return;
    }

    let addedCount = 0;
    let duplicatedCount = 0;

    for (const point of selectedPoints) {
      const result = addToCart({ point });
      if (result.added) {
        addedCount += 1;
      } else {
        duplicatedCount += 1;
      }
    }

    syncCartCount();

    setSelectedPointIds([]);

    if (addedCount > 0 && duplicatedCount > 0) {
      toast.success(`${addedCount} ponto${addedCount === 1 ? '' : 's'} adicionado${addedCount === 1 ? '' : 's'} ao carrinho.`, {
        description: `${duplicatedCount} já ${duplicatedCount === 1 ? 'estava' : 'estavam'} no carrinho e ${duplicatedCount === 1 ? 'foi ignorado' : 'foram ignorados'}.`,
      });
      return;
    }

    if (addedCount > 0) {
      toast.success(`${addedCount} ponto${addedCount === 1 ? '' : 's'} adicionado${addedCount === 1 ? '' : 's'} ao carrinho.`);
      return;
    }

    toast.info('Os pontos selecionados já estão no carrinho.');
  };

  return (
    <div className="menu-catalog-screen">
      <div className="menu-catalog-frame flex flex-col gap-5 sm:gap-6">
        <MenuCatalogHero
          companyName={hero.companyName || 'Mídia Kit'}
          logoUrl={hero.logoUrl}
          heroImageUrl={hero.heroImageUrl}
          generatedAt={hero.generatedAt}
          lastInventoryChangeAt={hero.lastInventoryChangeAt}
        />

        <MenuCatalogAbout aboutText={hero.aboutText} companyName={hero.companyName || 'Mídia Kit'} />

        {missingToken ? (
          <Card className="rounded-[28px] border-amber-200 bg-amber-50 shadow-[0_12px_30px_rgba(245,158,11,0.08)]">
            <CardContent className="flex items-start gap-4 p-6">
              <KeyRound className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <div className="text-base font-semibold text-amber-950">Token ausente</div>
                <div className="mt-1 text-sm leading-6 text-amber-900">
                  Abra o cardápio usando o link compartilhado para carregar os dados públicos corretamente e manter o recorte comercial esperado.
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

        <section className="space-y-3">
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
            totalPoints={baseStats.totalPoints}
            filteredPoints={filteredPoints.length}
            totalUnits={filteredStats.totalUnits}
            totalImpressionsLabel={formatCompactNumber(filteredStats.totalImpressions)}
            availableCount={filteredStats.available}
            partialCount={filteredStats.partial}
            occupiedCount={filteredStats.occupied}
            activeFilters={activeFilters}
            onSearchValueChange={setSearchValue}
            onSearchSubmit={handleSearchSubmit}
            onTypeChange={(value) => changeCatalogQuery({ type: value })}
            onCityChange={(value) => changeCatalogQuery({ city: value, district: null, environment: null })}
            onDistrictChange={(value) => changeCatalogQuery({ district: value })}
            onEnvironmentChange={(value) => changeCatalogQuery({ environment: value })}
            onAvailabilityChange={(value) => changeCatalogQuery({ availability: value })}
            onSortChange={(value) => changeCatalogQuery({ sort: value })}
            onClearFilters={clearCatalogFilters}
            onRemoveFilter={handleRemoveFilter}
          />
        </section>

        <MenuCatalogActions
          onOpenRegionList={handleOpenRegionList}
          onChangeRegion={handleChangeRegion}
          onToggleSelectionMode={handleToggleSelectionMode}
          onOpenCart={handleOpenCart}
          onAddSelectedToCart={handleAddSelectedToCart}
          regionCtaLabel={query.city || query.uf ? 'Abrir lista da região' : 'Escolher região'}
          disabled={loading}
          featuredPrice={featuredPrice !== null ? formatBRL(featuredPrice) : null}
          featuredPointName={featuredPoint?.name ?? null}
          cartCount={cartCount}
          selectedCount={selectedCount}
          canAddSelected={selectedCount > 0}
          isSelectionMode={isSelectionMode}
        />

        <section id="catalog-grid" className="scroll-mt-6">
          <MenuCatalogGrid
            points={filteredPoints}
            loading={loading}
            isAgency={isAgency}
            markupPercent={agencyMarkupPercent}
            onOpenDetail={handleOpenDetail}
            isSelectionMode={isSelectionMode}
            selectedPointIds={selectedPointIds}
            onToggleSelection={handleTogglePointSelection}
            onClearFilters={clearCatalogFilters}
            onChangeRegion={handleChangeRegion}
          />
        </section>

      </div>
    </div>
  );
}
