import { MediaPoint, MediaType, MediaUnit, UnitType } from '../types';

export const CART_STORAGE_KEY = 'menu_cart';

export type MenuCartItemSnapshot = {
  pointName: string;
  pointType?: MediaType | string;
  addressLine?: string;
  city?: string;
  state?: string;
  imageUrl?: string;
  // When item is a specific face/screen
  unitLabel?: string;
  unitType?: UnitType;
  priceMonth?: number | null;
  priceWeek?: number | null;
};

export type MenuCartItem = {
  id: string;
  pointId: string;
  unitId?: string | null;
  durationDays: number;
  addedAt: string;
  snapshot: MenuCartItemSnapshot;
};

export type MenuCart = {
  version: 1;
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

export function readCart(): MenuCart {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { version: 1, updatedAt: nowIso(), items: [] };

    const parsed = JSON.parse(raw);

    // Backward compatibility: some versions stored just an array
    const items = Array.isArray(parsed?.items)
      ? parsed.items
      : Array.isArray(parsed)
        ? parsed
        : [];

    return {
      version: 1,
      updatedAt: String(parsed?.updatedAt || nowIso()),
      items: items.filter(Boolean) as MenuCartItem[],
    };
  } catch {
    return { version: 1, updatedAt: nowIso(), items: [] };
  }
}

export function writeCart(cart: MenuCart) {
  const safe: MenuCart = {
    version: 1,
    updatedAt: nowIso(),
    items: Array.isArray(cart?.items) ? cart.items : [],
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
  durationDays?: number;
}): { added: boolean; item: MenuCartItem } {
  const cart = readCart();

  const unit = input.unit ?? null;
  const durationDays = Number.isFinite(Number(input.durationDays)) ? Number(input.durationDays) : 30;

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
  };

  const pointId = point.id;
  const unitId = unit?.id ?? null;

  const exists = cart.items.some((i) => isSameSelection(i, pointId, unitId));
  const item: MenuCartItem = {
    id: exists ? cart.items.find((i) => isSameSelection(i, pointId, unitId))!.id : makeId(),
    pointId,
    unitId,
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

export function updateItemDuration(itemId: string, durationDays: number) {
  const cart = readCart();
  const d = Math.max(1, Math.floor(Number(durationDays) || 30));
  cart.items = cart.items.map((i) => (i.id === itemId ? { ...i, durationDays: d } : i));
  writeCart(cart);
}

export function applyDurationToAll(durationDays: number) {
  const cart = readCart();
  const d = Math.max(1, Math.floor(Number(durationDays) || 30));
  cart.items = cart.items.map((i) => ({ ...i, durationDays: d }));
  writeCart(cart);
}

export function clearCart() {
  writeCart({ version: 1, updatedAt: nowIso(), items: [] });
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
