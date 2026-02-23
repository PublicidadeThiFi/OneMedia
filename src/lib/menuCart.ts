import { MediaPoint, MediaType, MediaUnit, PromotionPayload, ProductionCosts, UnitType } from '../types';
import { getEffectivePromotion } from './menuPromotions';

export const CART_STORAGE_KEY = 'menu_cart';

export type DurationParts = {
  years: number;
  months: number;
  days: number;
};

export type MenuCartItemSnapshot = {
  pointName: string;
  /**
   * Backward compatibility (older carts/snapshots used different field names).
   * Prefer using `pointName` and `unitLabel` in new code.
   */
  mediaPointName?: string;
  pointType?: MediaType | string;
  addressLine?: string;
  city?: string;
  state?: string;
  imageUrl?: string;
  // When item is a specific face/screen
  unitLabel?: string;
  /** Backward compatibility alias for `unitLabel`. */
  mediaUnitLabel?: string;
  unitType?: UnitType;
  priceMonth?: number | null;
  priceWeek?: number | null;

  /** Etapa 3: herança ponto->face (fallback) */
  pointBasePriceMonth?: number | null;
  pointBasePriceWeek?: number | null;
  unitPriceMonth?: number | null;
  unitPriceWeek?: number | null;

  /** Etapa 3: custos de produção do item */
  productionCosts?: ProductionCosts | null;

  /** Etapa 3: promoção efetiva aplicada ao item (face > ponto), quando existir */
  effectivePromotion?: PromotionPayload | null;
  /** Alias compatível */
  promotion?: PromotionPayload | null;
};

export type MenuCartItem = {
  id: string;
  pointId: string;
  unitId?: string | null;

  /**
   * New: duration split in years/months/days (free input).
   * We also keep durationDays for easier pricing/math.
   */
  duration: DurationParts;
  durationDays: number;

  addedAt: string;
  snapshot: MenuCartItemSnapshot;
};

export type MenuCart = {
  version: 2;
  updatedAt: string;
  items: MenuCartItem[];
};

function nowIso() {
  return new Date().toISOString();
}

function makeId(): string {
  try {
    const anyCrypto = (globalThis as any).crypto;
    if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
  } catch {
    // ignore
  }
  return `mc_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function normalizeDurationParts(input: any): DurationParts {
  const years = Math.max(0, Math.floor(Number(input?.years) || 0));
  const months = Math.max(0, Math.floor(Number(input?.months) || 0));
  const days = Math.max(0, Math.floor(Number(input?.days) || 0));
  return { years, months, days };
}

export function durationPartsToDays(parts: DurationParts): number {
  const p = normalizeDurationParts(parts);
  // Pricing approximation: month=30 days, year=365 days.
  const total = p.years * 365 + p.months * 30 + p.days;
  return Math.max(1, Math.min(365 * 100, Math.floor(total || 0)));
}

export function daysToDurationParts(daysRaw: any): DurationParts {
  const d = Math.max(1, Math.min(365 * 100, Math.floor(Number(daysRaw) || 30)));
  const years = Math.floor(d / 365);
  const rem1 = d % 365;
  const months = Math.floor(rem1 / 30);
  const days = rem1 % 30;
  return { years, months, days };
}

export function formatDurationParts(parts: DurationParts): string {
  const p = normalizeDurationParts(parts);
  const segs: string[] = [];
  if (p.years) segs.push(`${p.years} ${p.years === 1 ? 'ano' : 'anos'}`);
  if (p.months) segs.push(`${p.months} ${p.months === 1 ? 'mês' : 'meses'}`);
  if (p.days || segs.length === 0) segs.push(`${p.days || 0} ${p.days === 1 ? 'dia' : 'dias'}`);
  return segs.join(', ');
}

function normalizeItem(raw: any): MenuCartItem | null {
  if (!raw) return null;
  const id = String(raw.id || '').trim();
  const pointId = String(raw.pointId || '').trim();
  if (!id || !pointId) return null;

  const unitId = raw.unitId === null || raw.unitId === undefined ? null : String(raw.unitId);

  // Backward compatibility:
  // - older cart stored durationDays only
  // - newer cart stores duration parts
  const durationParts = raw.duration ? normalizeDurationParts(raw.duration) : daysToDurationParts(raw.durationDays);
  const durationDays = durationPartsToDays(durationParts);

  return {
    id,
    pointId,
    unitId,
    duration: durationParts,
    durationDays,
    addedAt: String(raw.addedAt || nowIso()),
    snapshot: (raw.snapshot || {}) as MenuCartItemSnapshot,
  };
}

export function readCart(): MenuCart {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { version: 2, updatedAt: nowIso(), items: [] };

    const parsed = JSON.parse(raw);

    // Backward compatibility: some versions stored just an array
    const rawItems = Array.isArray(parsed?.items)
      ? parsed.items
      : Array.isArray(parsed)
        ? parsed
        : [];

    const items: MenuCartItem[] = [];
    for (const it of rawItems) {
      const n = normalizeItem(it);
      if (n) items.push(n);
    }

    return {
      version: 2,
      updatedAt: String(parsed?.updatedAt || nowIso()),
      items,
    };
  } catch {
    return { version: 2, updatedAt: nowIso(), items: [] };
  }
}

export function writeCart(cart: MenuCart) {
  const rawItems = Array.isArray(cart?.items) ? cart.items : [];
  const items: MenuCartItem[] = [];
  for (const it of rawItems) {
    const n = normalizeItem(it);
    if (n) items.push(n);
  }

  const safe: MenuCart = {
    version: 2,
    updatedAt: nowIso(),
    items,
  };

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(safe));
}

export function getCartCount(): number {
  return readCart().items.length;
}

export function isSameSelection(a: MenuCartItem, pointId: string, unitId?: string | null): boolean {
  return a.pointId === pointId && String(a.unitId ?? '') === String(unitId ?? '');
}

export function addToCart(input: {
  point: MediaPoint;
  unit?: MediaUnit | null;
  duration?: DurationParts;
  /** @deprecated keep compatibility */
  durationDays?: number;
}): { added: boolean; item: MenuCartItem } {
  const cart = readCart();

  const unit = input.unit ?? null;

  const duration = input.duration
    ? normalizeDurationParts(input.duration)
    : daysToDurationParts(Number.isFinite(Number(input.durationDays)) ? Number(input.durationDays) : 30);
  const durationDays = durationPartsToDays(duration);

  const point = input.point;
  const pointName = String(point.name || '').trim() || 'Ponto';

  const addressLine = [
    [String(point.addressStreet ?? '').trim(), String(point.addressNumber ?? '').trim()].filter(Boolean).join(', '),
    String(point.addressDistrict ?? '').trim(),
  ]
    .filter(Boolean)
    .join(' • ');

  const snapshot: MenuCartItemSnapshot = {
    pointName,
    pointType: point.type,
    addressLine: addressLine || undefined,
    city: String(point.addressCity ?? '').trim() || undefined,
    state: String(point.addressState ?? '').trim() || undefined,
    imageUrl: (unit?.imageUrl ?? point.mainImageUrl) || undefined,
    unitLabel: unit?.label ? String(unit.label) : undefined,
    unitType: unit?.unitType,
    priceMonth: (unit?.priceMonth ?? point.basePriceMonth) ?? null,
    priceWeek: (unit?.priceWeek ?? point.basePriceWeek) ?? null,

    pointBasePriceMonth: point.basePriceMonth ?? null,
    pointBasePriceWeek: point.basePriceWeek ?? null,
    unitPriceMonth: unit?.priceMonth ?? null,
    unitPriceWeek: unit?.priceWeek ?? null,

    productionCosts: point.productionCosts ?? null,
    effectivePromotion: getEffectivePromotion(unit, point),
    promotion: getEffectivePromotion(unit, point),
  };

  const pointId = point.id;
  const unitId = unit?.id ?? null;

  const exists = cart.items.some((i) => isSameSelection(i, pointId, unitId));
  const item: MenuCartItem = {
    id: exists ? cart.items.find((i) => isSameSelection(i, pointId, unitId))!.id : makeId(),
    pointId,
    unitId,
    duration,
    durationDays,
    addedAt: nowIso(),
    snapshot,
  };

  if (exists) {
    return { added: false, item };
  }

  cart.items = [...cart.items, item];
  writeCart(cart);
  return { added: true, item };
}

export function removeFromCart(itemId: string) {
  const cart = readCart();
  cart.items = cart.items.filter((i) => i.id !== itemId);
  writeCart(cart);
}

export function updateItemDurationParts(itemId: string, duration: DurationParts) {
  const cart = readCart();
  const parts = normalizeDurationParts(duration);
  const days = durationPartsToDays(parts);
  cart.items = cart.items.map((i) => (i.id === itemId ? { ...i, duration: parts, durationDays: days } : i));
  writeCart(cart);
}

/** @deprecated compatibility */
export function updateItemDuration(itemId: string, durationDays: number) {
  updateItemDurationParts(itemId, daysToDurationParts(durationDays));
}

export function applyDurationToAllParts(duration: DurationParts) {
  const cart = readCart();
  const parts = normalizeDurationParts(duration);
  const days = durationPartsToDays(parts);
  cart.items = cart.items.map((i) => ({ ...i, duration: parts, durationDays: days }));
  writeCart(cart);
}

/** @deprecated compatibility */
export function applyDurationToAll(durationDays: number) {
  applyDurationToAllParts(daysToDurationParts(durationDays));
}

export function clearCart() {
  writeCart({ version: 2, updatedAt: nowIso(), items: [] });
}

export function normalizeUnitLabel(unit?: MediaUnit | null): string {
  if (!unit) return '';
  const prefix = unit.unitType === UnitType.SCREEN ? 'Tela' : 'Face';
  const label = String(unit.label || '').trim();
  return label ? `${prefix} ${label}` : prefix;
}

export function formatAddress(point: MediaPoint): string {
  const street = String(point.addressStreet ?? '').trim();
  const number = String(point.addressNumber ?? '').trim();
  const district = String(point.addressDistrict ?? '').trim();
  const city = String(point.addressCity ?? '').trim();
  const state = String(point.addressState ?? '').trim();

  const first = [street, number].filter(Boolean).join(', ');
  const parts = [first, district, [city, state].filter(Boolean).join(' - ')].filter(Boolean);
  return parts.join(' • ');
}
