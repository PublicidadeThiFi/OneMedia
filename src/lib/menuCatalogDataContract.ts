import type { PublicMediaKitHeroMetric, PublicMediaKitPoint, PublicMediaKitResponse } from './publicMediaKit';

export type MenuCatalogContractFieldStatus = 'available' | 'derived' | 'missing';

export type MenuCatalogDerivedMetrics = {
  pointsCount: number;
  totalUnits: number;
  totalImpressions: number;
  citiesCount: number;
  districtsCount: number;
  environmentsCount: number;
  mediaTypesCount: number;
};

export type MenuCatalogHeroContract = {
  companyName: string;
  logoUrl: string | null;
  generatedAt: string | null;
  heroImageUrl: string | null;
  aboutText: string | null;
  heroMetrics: PublicMediaKitHeroMetric[];
  metrics: MenuCatalogDerivedMetrics;
};

export type MenuCatalogDataContractReview = {
  sourceOfTruth: string;
  stage: 3 | 4;
  endpoint: '/api/public/media-kit';
  readyBlocks: readonly string[];
  fieldStatus: {
    company: MenuCatalogContractFieldStatus;
    points: MenuCatalogContractFieldStatus;
    stats: MenuCatalogContractFieldStatus;
    generatedAt: MenuCatalogContractFieldStatus;
    heroImageUrl: MenuCatalogContractFieldStatus;
    aboutText: MenuCatalogContractFieldStatus;
    heroMetrics: MenuCatalogContractFieldStatus;
  };
  gaps: readonly ('heroImageUrl' | 'aboutText' | 'heroMetrics')[];
};

function normalizedKey(value: string | null | undefined): string | null {
  const text = String(value ?? '').trim();
  return text ? text.toLocaleLowerCase('pt-BR') : null;
}

function uniqueCount(points: PublicMediaKitPoint[], getValue: (point: PublicMediaKitPoint) => string | null | undefined): number {
  const values = new Set<string>();

  for (const point of points) {
    const key = normalizedKey(getValue(point));
    if (key) values.add(key);
  }

  return values.size;
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value);
}

export function deriveMenuCatalogMetrics(data: Pick<PublicMediaKitResponse, 'stats' | 'points'> | null | undefined): MenuCatalogDerivedMetrics {
  const points = Array.isArray(data?.points) ? data.points : [];

  const totalUnitsFromPoints = points.reduce((sum, point) => sum + Number(point.unitsCount ?? point.units?.length ?? 0), 0);
  const totalImpressionsFromPoints = points.reduce((sum, point) => sum + Number(point.dailyImpressions ?? 0), 0);

  return {
    pointsCount: Number(data?.stats?.pointsCount ?? points.length),
    totalUnits: Number(data?.stats?.totalUnits ?? totalUnitsFromPoints),
    totalImpressions: Number(data?.stats?.totalImpressions ?? totalImpressionsFromPoints),
    citiesCount: uniqueCount(points, (point) => point.addressCity),
    districtsCount: uniqueCount(points, (point) => point.addressDistrict),
    environmentsCount: uniqueCount(points, (point) => point.environment),
    mediaTypesCount: uniqueCount(points, (point) => point.type),
  };
}

export function deriveMenuCatalogHeroMetrics(data: PublicMediaKitResponse | null | undefined): PublicMediaKitHeroMetric[] {
  if (Array.isArray(data?.heroMetrics) && data!.heroMetrics.length > 0) {
    return data!.heroMetrics;
  }

  const metrics = deriveMenuCatalogMetrics(data);
  const impressionsLabel = data?.stats?.totalImpressionsFormatted ?? formatInteger(metrics.totalImpressions);
  const coverageValue = Math.max(metrics.citiesCount, metrics.environmentsCount);

  return [
    {
      id: 'points',
      label: 'Pontos',
      value: formatInteger(metrics.pointsCount),
      rawValue: metrics.pointsCount,
      kind: 'points',
      helperText: 'veículos ativos no catálogo',
    },
    {
      id: 'units',
      label: 'Telas/Faces',
      value: formatInteger(metrics.totalUnits),
      rawValue: metrics.totalUnits,
      kind: 'units',
      helperText: 'inventário público disponível',
    },
    {
      id: 'impressions',
      label: 'Impactos',
      value: impressionsLabel,
      rawValue: metrics.totalImpressions,
      kind: 'impressions',
      helperText: 'estimativa diária agregada',
    },
    {
      id: 'coverage',
      label: 'Cobertura',
      value: formatInteger(coverageValue),
      rawValue: coverageValue,
      kind: metrics.environmentsCount >= metrics.citiesCount ? 'environments' : 'cities',
      helperText: metrics.environmentsCount >= metrics.citiesCount ? 'ambientes distintos' : 'cidades distintas',
    },
  ];
}

export function resolveMenuCatalogHeroContract(data: PublicMediaKitResponse | null | undefined): MenuCatalogHeroContract {
  const derivedMetrics = deriveMenuCatalogMetrics(data);

  return {
    companyName: String(data?.company?.name ?? '').trim(),
    logoUrl: data?.company?.logoUrl ?? null,
    generatedAt: data?.generatedAt ?? null,
    heroImageUrl: data?.heroImageUrl ?? null,
    aboutText: data?.aboutText ?? null,
    heroMetrics: deriveMenuCatalogHeroMetrics(data),
    metrics: derivedMetrics,
  };
}

export function isMenuCatalogPayloadReady(data: PublicMediaKitResponse | null | undefined): boolean {
  return Boolean(
    data &&
      data.company &&
      typeof data.company.name === 'string' &&
      Array.isArray(data.points) &&
      data.stats &&
      typeof data.generatedAt === 'string',
  );
}

/**
 * Etapa 4: o payload público já expõe os campos dedicados do hero.
 */
export const MENU_CATALOG_DATA_CONTRACT_REVIEW: MenuCatalogDataContractReview = {
  sourceOfTruth: 'Novo_Cardapio_Etapas.pdf',
  stage: 4,
  endpoint: '/api/public/media-kit',
  readyBlocks: [
    'hero-logo',
    'hero-background',
    'hero-about',
    'hero-metrics',
    'hero-last-update',
    'quick-actions',
    'filters',
    'results-summary',
    'point-grid',
  ],
  fieldStatus: {
    company: 'available',
    points: 'available',
    stats: 'available',
    generatedAt: 'available',
    heroImageUrl: 'available',
    aboutText: 'available',
    heroMetrics: 'available',
  },
  gaps: [],
};
