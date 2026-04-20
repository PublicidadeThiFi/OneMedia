import { publicApiClient } from './apiClient';
import { MediaPoint, MediaType } from '../types';
import { MenuCatalogSort, normalizeMenuFlow } from './menuFlow';

export type Availability = 'Disponível' | 'Parcial' | 'Ocupado';
export type UnitAvailability = 'Disponível' | 'Reservada' | 'Ocupado';
export type PublicMediaKitHeroMetricKind =
  | 'points'
  | 'units'
  | 'impressions'
  | 'cities'
  | 'districts'
  | 'environments'
  | 'mediaTypes'
  | 'custom';

export type PublicMediaKitHeroMetric = {
  id: string;
  label: string;
  value: string;
  rawValue: number | null;
  kind: PublicMediaKitHeroMetricKind;
  helperText: string | null;
};

export type PublicMediaKitUnit = {
  id: string;
  label: string;
  unitType?: string | null;
  orientation?: string | null;
  widthM?: number | null;
  heightM?: number | null;
  priceMonth?: number | null;
  priceWeek?: number | null;
  priceDay?: number | null;
  imageUrl?: string | null;
  isActive?: boolean;
  isOccupied?: boolean;
  isAvailable?: boolean;
  availability?: UnitAvailability;
  availableOn?: string | null;
  blockedFrom?: string | null;
  blockedUntil?: string | null;
  effectivePromotion?: any;
  promotion?: any;
};

export type PublicMediaKitPoint = MediaPoint & {
  units?: PublicMediaKitUnit[];
  unitsCount?: number;
  occupiedUnitsCount?: number;
  availableUnitsCount?: number;
  availability?: Availability;
};

export type PublicMediaKitCompany = {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  email: string | null;
  phone: string | null;
  site: string | null;
  addressCity: string | null;
  addressState: string | null;
  agencyMarkupPercent: number | null;
};

export type PublicMediaKitResponse = {
  ownerCompanies?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    site?: string | null;
    logoUrl?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    isPrimary: boolean;
  }[];
  selectedOwnerCompanyId?: string | null;
  company: PublicMediaKitCompany;
  points: PublicMediaKitPoint[];
  stats: {
    pointsCount: number;
    totalUnits: number;
    totalImpressions: number;
    totalImpressionsFormatted: string;
  };
  generatedAt: string;
  heroImageUrl?: string | null;
  aboutText?: string | null;
  heroMetrics?: PublicMediaKitHeroMetric[];
};

type CacheEntry = {
  data: PublicMediaKitResponse;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<PublicMediaKitResponse>>();

function makeKey(token: string, ownerCompanyId: string | null, flow: string) {
  return `${token}::${ownerCompanyId ?? ''}::${flow}`;
}

const TTL_MS = 60 * 1000;

export async function fetchPublicMediaKit(params: {
  token: string;
  ownerCompanyId?: string | null;
  flow?: string | null;
  force?: boolean;
}): Promise<PublicMediaKitResponse> {
  const token = String(params.token ?? '').trim();
  const ownerCompanyId = params.ownerCompanyId ?? null;
  const flow = normalizeMenuFlow(params.flow);

  if (!token) {
    throw new Error('Token ausente. Abra o Cardápio a partir do link compartilhado.');
  }

  const key = makeKey(token, ownerCompanyId, flow);
  const now = Date.now();
  const cached = cache.get(key);

  if (!params.force && cached && now - cached.fetchedAt < TTL_MS) {
    return cached.data;
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const p: Promise<PublicMediaKitResponse> = (async () => {
    try {
      const resp = await publicApiClient.get<PublicMediaKitResponse>('/public/media-kit', {
        params: {
          token,
          ownerCompanyId: ownerCompanyId || undefined,
          flow: flow === 'default' ? undefined : flow,
        },
      });
      cache.set(key, { data: resp.data, fetchedAt: Date.now() });
      return resp.data;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

export function normalizeAvailability(point: PublicMediaKitPoint): Availability {
  const avail = point.availability;
  if (avail === 'Disponível' || avail === 'Parcial' || avail === 'Ocupado') return avail;

  const units = point.unitsCount ?? point.units?.length ?? 0;
  const occupied = point.occupiedUnitsCount ?? 0;
  const free = point.availableUnitsCount ?? Math.max(units - occupied, 0);

  if (units <= 0) return 'Disponível';
  if (free <= 0) return 'Ocupado';
  if (occupied > 0) return 'Parcial';
  return 'Disponível';
}

export function normalizeMediaType(value?: string | null): MediaType | null {
  const t = String(value ?? '').trim().toUpperCase();
  if (t === MediaType.OOH) return MediaType.OOH;
  if (t === MediaType.DOOH) return MediaType.DOOH;
  return null;
}

export type PriceKind = 'month' | 'week' | 'day';

export type PointPriceSummary = {
  kind: PriceKind;
  base: number | null;
  startingFrom: number | null;
  isStartingFrom: boolean;
  unitsCount: number;
};

function safeNumber(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getPointBasePrice(point: Pick<MediaPoint, 'basePriceMonth' | 'basePriceWeek' | 'basePriceDay'>, kind: PriceKind): number | null {
  if (kind === 'week') return safeNumber((point as any).basePriceWeek);
  if (kind === 'day') return safeNumber((point as any).basePriceDay);
  return safeNumber((point as any).basePriceMonth);
}

function getUnitPriceRaw(unit: any, kind: PriceKind): number | null {
  if (!unit) return null;
  if (kind === 'week') return safeNumber(unit.priceWeek);
  if (kind === 'day') return safeNumber(unit.priceDay);
  return safeNumber(unit.priceMonth);
}

export function computePointPriceSummary(
  point: Pick<MediaPoint, 'basePriceMonth' | 'basePriceWeek' | 'basePriceDay'> & { units?: any[] },
  kind: PriceKind,
): PointPriceSummary {
  const base = getPointBasePrice(point, kind);
  const units = Array.isArray((point as any).units)
    ? ((point as any).units as any[]).filter((u) => u && u.isActive !== false)
    : [];

  let min: number | null = null;
  for (const u of units) {
    const unitRaw = getUnitPriceRaw(u, kind);
    const effective = unitRaw !== null ? unitRaw : base;
    if (effective === null) continue;
    if (min === null || effective < min) min = effective;
  }

  const startingFrom = min !== null ? min : base;

  const isStartingFrom =
    startingFrom !== null &&
    ((base !== null && startingFrom < base) || (base === null && units.length > 0));

  return {
    kind,
    base,
    startingFrom,
    isStartingFrom,
    unitsCount: units.length,
  };
}

export function getPublicMediaKitPointPrimaryImage(point: PublicMediaKitPoint): string | null {
  const pointImage = String(point.mainImageUrl ?? point.imageUrl ?? '').trim();
  if (pointImage) return pointImage;

  if (Array.isArray(point.units)) {
    for (const unit of point.units) {
      const unitImage = String(unit?.imageUrl ?? '').trim();
      if (unitImage) return unitImage;
    }
  }

  return null;
}

export function getPublicMediaKitPointAddress(point: PublicMediaKitPoint): string {
  const line1 = [point.addressStreet, point.addressNumber].filter(Boolean).join(', ').trim();
  const line2 = [point.addressDistrict, point.addressCity, point.addressState].filter(Boolean).join(' • ').trim();
  return [line1, line2].filter(Boolean).join(' — ');
}

export function getPublicMediaKitPointMapUrl(
  point: Pick<PublicMediaKitPoint, 'latitude' | 'longitude' | 'name' | 'addressStreet' | 'addressNumber' | 'addressCity' | 'addressState'>,
): string | null {
  const lat = Number(point.latitude);
  const lng = Number(point.longitude);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  }

  const fallbackAddress = [point.name, point.addressStreet, point.addressNumber, point.addressCity, point.addressState]
    .filter(Boolean)
    .join(', ')
    .trim();

  return fallbackAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackAddress)}` : null;
}

export function getPublicMediaKitPointSortablePrice(point: PublicMediaKitPoint, kind: PriceKind = 'month'): number | null {
  return computePointPriceSummary(point, kind).startingFrom;
}

function compareText(a: string | null | undefined, b: string | null | undefined): number {
  return String(a ?? '').localeCompare(String(b ?? ''), 'pt-BR', { sensitivity: 'base' });
}

export function sortPublicMediaKitPoints(points: PublicMediaKitPoint[], sort: MenuCatalogSort = 'featured'): PublicMediaKitPoint[] {
  const next = [...points];

  next.sort((left, right) => {
    const leftAvailability = normalizeAvailability(left);
    const rightAvailability = normalizeAvailability(right);
    const leftPrice = getPublicMediaKitPointSortablePrice(left, 'month');
    const rightPrice = getPublicMediaKitPointSortablePrice(right, 'month');
    const leftImpressions = Number(left.dailyImpressions ?? 0);
    const rightImpressions = Number(right.dailyImpressions ?? 0);

    if (sort === 'name-asc') return compareText(left.name, right.name);
    if (sort === 'name-desc') return compareText(right.name, left.name);
    if (sort === 'price-asc') return (leftPrice ?? Number.POSITIVE_INFINITY) - (rightPrice ?? Number.POSITIVE_INFINITY) || compareText(left.name, right.name);
    if (sort === 'price-desc') return (rightPrice ?? Number.NEGATIVE_INFINITY) - (leftPrice ?? Number.NEGATIVE_INFINITY) || compareText(left.name, right.name);
    if (sort === 'impressions-desc') return rightImpressions - leftImpressions || compareText(left.name, right.name);

    const availabilityScore = (value: Availability) => {
      if (value === 'Disponível') return 2;
      if (value === 'Parcial') return 1;
      return 0;
    };

    return (
      availabilityScore(rightAvailability) - availabilityScore(leftAvailability) ||
      rightImpressions - leftImpressions ||
      compareText(left.name, right.name)
    );
  });

  return next;
}
