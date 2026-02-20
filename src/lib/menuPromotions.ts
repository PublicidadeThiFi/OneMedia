import type { MediaPoint, MediaUnit, PromotionPayload } from '../types';

export type PromoPrice = {
  from: number;
  to: number;
  promotion: PromotionPayload;
};

function safeNumber(v: any): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function isPromoActiveNow(promo: PromotionPayload | null | undefined): promo is PromotionPayload {
  if (!promo) return false;
  if (promo.showInMediaKit === false) return false;

  const now = Date.now();
  const start = promo.startsAt ? Date.parse(String(promo.startsAt)) : NaN;
  const end = promo.endsAt ? Date.parse(String(promo.endsAt)) : NaN;

  if (Number.isFinite(start) && now < start) return false;
  if (Number.isFinite(end) && now > end) return false;
  return true;
}

export function getEffectivePromotion(unit?: MediaUnit | null, point?: MediaPoint | null): PromotionPayload | null {
  const promo = (unit as any)?.effectivePromotion ?? (unit as any)?.promotion ?? (point as any)?.promotion ?? null;
  return isPromoActiveNow(promo) ? promo : null;
}

export function applyPromotion(value: number | null | undefined, promo?: PromotionPayload | null): number | null {
  const base = safeNumber(value);
  if (base === null) return null;
  if (!promo) return base;

  const dv = safeNumber((promo as any).discountValue);
  if (dv === null || dv <= 0) return base;

  const type = String((promo as any).discountType || '').toUpperCase();
  if (type === 'PERCENT') {
    const pct = Math.max(0, Math.min(100, dv));
    return Math.max(0, base * (1 - pct / 100));
  }

  // FIXED = amount off
  return Math.max(0, base - dv);
}

export function buildPromoPrice(value: number | null | undefined, promo?: PromotionPayload | null): PromoPrice | null {
  if (!promo) return null;
  const from = safeNumber(value);
  if (from === null) return null;
  const to = applyPromotion(from, promo);
  if (to === null) return null;
  // Only consider a promo when it actually reduces the price.
  if (to >= from) return null;
  return { from, to, promotion: promo };
}

export function formatPromotionBadge(promo?: PromotionPayload | null): string | null {
  if (!promo) return null;
  const dv = safeNumber((promo as any).discountValue);
  if (dv === null || dv <= 0) return 'Promoção';
  const type = String((promo as any).discountType || '').toUpperCase();
  if (type === 'PERCENT') return `-${Math.round(dv)}%`;
  return `-R$ ${Math.round(dv)}`;
}

export function pickBestPromoForPoint(point: MediaPoint, kind: 'month' | 'week' | 'day'): PromoPrice | null {
  const p = point as any;
  const units: MediaUnit[] = Array.isArray(p.units) ? p.units : [];

  const pointPromo = isPromoActiveNow(p.promotion) ? (p.promotion as PromotionPayload) : null;
  const basePointValue =
    kind === 'week' ? safeNumber(p.basePriceWeek) : kind === 'day' ? safeNumber(p.basePriceDay) : safeNumber(p.basePriceMonth);

  let best: PromoPrice | null = basePointValue !== null ? buildPromoPrice(basePointValue, pointPromo) : null;

  for (const u of units) {
    const promo = getEffectivePromotion(u, point);
    if (!promo) continue;

    const base =
      kind === 'week'
        ? safeNumber((u as any).priceWeek ?? p.basePriceWeek)
        : kind === 'day'
          ? safeNumber((u as any).priceDay ?? p.basePriceDay)
          : safeNumber((u as any).priceMonth ?? p.basePriceMonth);

    const cand = buildPromoPrice(base, promo);
    if (!cand) continue;

    if (!best || cand.to < best.to) best = cand;
  }

  return best;
}

export function pointHasAnyPromotion(point: MediaPoint): boolean {
  const p = point as any;
  if (isPromoActiveNow(p.promotion)) return true;
  const units: MediaUnit[] = Array.isArray(p.units) ? p.units : [];
  return units.some((u) => !!getEffectivePromotion(u, point));
}
