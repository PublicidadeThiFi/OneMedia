import type { MenuCatalogAvailabilityFilter, MenuCatalogQueryParams } from './menuFlow';
import { normalizeAvailability, sortPublicMediaKitPoints, type PublicMediaKitPoint } from './publicMediaKit';

export type MenuCatalogOption = {
  value: string;
  label: string;
  count: number;
};

export type MenuCatalogActiveFilter = {
  key: 'uf' | 'city' | 'q' | 'type' | 'district' | 'environment' | 'availability' | 'sort';
  label: string;
};

export type MenuCatalogStats = {
  totalPoints: number;
  totalUnits: number;
  totalImpressions: number;
  available: number;
  partial: number;
  occupied: number;
};

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

function pointMatchesText(point: PublicMediaKitPoint, search: string | null): boolean {
  if (!search) return true;
  const query = normalizeText(search);
  if (!query) return true;

  const haystack = [
    point.name,
    point.subcategory,
    point.addressStreet,
    point.addressNumber,
    point.addressDistrict,
    point.addressCity,
    point.addressState,
    point.environment,
    point.type,
  ]
    .map((value) => normalizeText(value))
    .join(' ');

  return haystack.includes(query);
}

function pointMatchesEqual(value: string | null | undefined, expected: string | null | undefined): boolean {
  if (!expected) return true;
  return normalizeText(value) === normalizeText(expected);
}

function pointMatchesType(point: PublicMediaKitPoint, type: string | null): boolean {
  if (!type) return true;
  return String(point.type ?? '').trim().toUpperCase() === String(type).trim().toUpperCase();
}

function pointMatchesAvailability(point: PublicMediaKitPoint, availability: MenuCatalogAvailabilityFilter): boolean {
  if (availability === 'all') return true;
  const current = normalizeAvailability(point);
  if (availability === 'available') return current === 'Disponível';
  if (availability === 'partial') return current === 'Parcial';
  return current === 'Ocupado';
}

export function buildMenuCatalogOptions(
  points: PublicMediaKitPoint[],
  pick: (point: PublicMediaKitPoint) => string | null | undefined,
): MenuCatalogOption[] {
  const grouped = new Map<string, MenuCatalogOption>();

  for (const point of points) {
    const rawValue = String(pick(point) ?? '').trim();
    if (!rawValue) continue;

    const key = normalizeText(rawValue);
    if (!key) continue;

    const current = grouped.get(key);
    if (current) {
      current.count += 1;
      continue;
    }

    grouped.set(key, {
      value: rawValue,
      label: rawValue,
      count: 1,
    });
  }

  return Array.from(grouped.values()).sort((left, right) =>
    left.label.localeCompare(right.label, 'pt-BR', { sensitivity: 'base' }),
  );
}

export function getRegionScopedPoints(points: PublicMediaKitPoint[], params: Pick<MenuCatalogQueryParams, 'uf'>): PublicMediaKitPoint[] {
  return points.filter((point) => {
    if (!params.uf) return true;
    return String(point.addressState ?? '').trim().toUpperCase() === params.uf;
  });
}

export function getCityScopedPoints(
  points: PublicMediaKitPoint[],
  params: Pick<MenuCatalogQueryParams, 'city'>,
): PublicMediaKitPoint[] {
  return points.filter((point) => pointMatchesEqual(point.addressCity, params.city));
}

export function filterMenuCatalogPoints(
  points: PublicMediaKitPoint[],
  params: Pick<MenuCatalogQueryParams, 'q' | 'type' | 'district' | 'environment' | 'availability' | 'sort'>,
): PublicMediaKitPoint[] {
  const visible = points.filter((point) => {
    if (!pointMatchesText(point, params.q)) return false;
    if (!pointMatchesType(point, params.type)) return false;
    if (!pointMatchesEqual(point.addressDistrict, params.district)) return false;
    if (!pointMatchesEqual(point.environment, params.environment)) return false;
    if (!pointMatchesAvailability(point, params.availability)) return false;
    return true;
  });

  return sortPublicMediaKitPoints(visible, params.sort);
}

export function summarizeMenuCatalogPoints(points: PublicMediaKitPoint[]): MenuCatalogStats {
  let totalUnits = 0;
  let totalImpressions = 0;
  let available = 0;
  let partial = 0;
  let occupied = 0;

  for (const point of points) {
    totalUnits += Number(point.unitsCount ?? point.units?.length ?? 0);
    totalImpressions += Number(point.dailyImpressions ?? 0);

    const availability = normalizeAvailability(point);
    if (availability === 'Disponível') available += 1;
    else if (availability === 'Parcial') partial += 1;
    else occupied += 1;
  }

  return {
    totalPoints: points.length,
    totalUnits,
    totalImpressions,
    available,
    partial,
    occupied,
  };
}

export function getMenuCatalogActiveFilters(query: MenuCatalogQueryParams): MenuCatalogActiveFilter[] {
  const labels: MenuCatalogActiveFilter[] = [];

  if (query.uf) labels.push({ key: 'uf', label: `UF: ${query.uf}` });
  if (query.city) labels.push({ key: 'city', label: `Cidade: ${query.city}` });
  if (query.q) labels.push({ key: 'q', label: `Busca: ${query.q}` });
  if (query.type) labels.push({ key: 'type', label: `Tipo: ${query.type}` });
  if (query.district) labels.push({ key: 'district', label: `Bairro: ${query.district}` });
  if (query.environment) labels.push({ key: 'environment', label: `Ambiente: ${query.environment}` });
  if (query.availability !== 'all') {
    const mapping = {
      available: 'Disponíveis',
      partial: 'Parcial',
      occupied: 'Ocupados',
      all: 'Todos',
    } as const;
    labels.push({ key: 'availability', label: `Status: ${mapping[query.availability]}` });
  }

  if (query.sort !== 'featured') {
    const mapping = {
      featured: 'Ordenação: Destaques',
      'name-asc': 'Ordenação: Nome (A-Z)',
      'name-desc': 'Ordenação: Nome (Z-A)',
      'price-asc': 'Ordenação: Menor preço',
      'price-desc': 'Ordenação: Maior preço',
      'impressions-desc': 'Ordenação: Impacto',
    } as const;
    labels.push({ key: 'sort', label: mapping[query.sort] });
  }

  return labels;
}

export function removeMenuCatalogFilter(query: MenuCatalogQueryParams, key: MenuCatalogActiveFilter['key']): MenuCatalogQueryParams {
  if (key === 'uf') {
    return {
      ...query,
      uf: null,
      city: null,
      district: null,
      environment: null,
    };
  }

  if (key === 'city') {
    return {
      ...query,
      city: null,
      district: null,
      environment: null,
    };
  }

  if (key === 'q') return { ...query, q: null };
  if (key === 'type') return { ...query, type: null };
  if (key === 'district') return { ...query, district: null };
  if (key === 'environment') return { ...query, environment: null };
  if (key === 'availability') return { ...query, availability: 'all' };
  if (key === 'sort') return { ...query, sort: 'featured' };

  return query;
}
