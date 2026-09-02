import { publicApiClient } from './apiClient';
import type {
  PricingCatalogBillingPeriod,
  PublicPricingCatalogOffer,
  PublicPricingCatalogPlan,
  PublicPricingCatalogResponse,
} from '../types/pricingCatalog';

export const PUBLIC_PRICING_CATALOG_VERSION = 2;

export async function fetchPublicPricingCatalog(): Promise<PublicPricingCatalogResponse> {
  const response = await publicApiClient.get<PublicPricingCatalogResponse>('/public/pricing-catalog');
  return validatePublicPricingCatalog(response.data);
}

export function validatePublicPricingCatalog(value: unknown): PublicPricingCatalogResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Catálogo público de planos indisponível ou inválido.');
  }

  const data = value as Partial<PublicPricingCatalogResponse>;

  if (data.catalogVersion !== PUBLIC_PRICING_CATALOG_VERSION || !Array.isArray(data.plans)) {
    throw new Error('Versão do catálogo público de planos incompatível.');
  }

  const plans = data.plans.filter(isPublicPricingCatalogPlan);
  if (plans.length !== data.plans.length || plans.length === 0) {
    throw new Error('Catálogo público de planos incompleto.');
  }

  return {
    catalogVersion: data.catalogVersion,
    plans,
  };
}

function isPublicPricingCatalogPlan(value: unknown): value is PublicPricingCatalogPlan {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const plan = value as Partial<PublicPricingCatalogPlan>;
  return (
    typeof plan.code === 'string' &&
    plan.code.trim().length > 0 &&
    typeof plan.publicName === 'string' &&
    plan.publicName.trim().length > 0 &&
    !!plan.entitlements &&
    typeof plan.entitlements === 'object' &&
    Array.isArray(plan.offers) &&
    plan.offers.every(isPublicPricingCatalogOffer)
  );
}

function isPublicPricingCatalogOffer(value: unknown): value is PublicPricingCatalogOffer {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const offer = value as Partial<PublicPricingCatalogOffer>;
  return (
    typeof offer.code === 'string' &&
    offer.code.trim().length > 0 &&
    (offer.billingPeriod === 'MONTHLY' || offer.billingPeriod === 'ANNUAL') &&
    typeof offer.billingCycleMonths === 'number' &&
    Number.isInteger(offer.billingCycleMonths) &&
    offer.billingCycleMonths > 0 &&
    typeof offer.amount === 'string' &&
    Number.isFinite(Number(offer.amount)) &&
    typeof offer.currency === 'string' &&
    typeof offer.trialDays === 'number' &&
    Number.isInteger(offer.trialDays) &&
    offer.trialDays >= 0
  );
}

export function getCatalogOffer(
  plan: PublicPricingCatalogPlan,
  billingPeriod: PricingCatalogBillingPeriod,
): PublicPricingCatalogOffer | null {
  return plan.offers.find((offer) => offer.billingPeriod === billingPeriod) ?? null;
}

export function getCatalogMonthlyTrialDays(plans: PublicPricingCatalogPlan[]): number | null {
  const trialDays = plans
    .map((plan) => getCatalogOffer(plan, 'MONTHLY'))
    .filter((offer): offer is PublicPricingCatalogOffer => offer !== null)
    .map((offer) => offer.trialDays)
    .filter((days) => days > 0);

  if (trialDays.length === 0) return null;

  const first = trialDays[0];
  return trialDays.every((days) => days === first) ? first : null;
}

export type CatalogAnnualPaymentTerms = {
  monthsAccess: number;
  monthsCharged: number;
  savingsMonths: number;
  installments: number;
  effectiveDiscountPercent: number;
};

export function getCatalogAnnualPaymentTerms(
  offer: PublicPricingCatalogOffer | null,
): CatalogAnnualPaymentTerms | null {
  if (!offer || offer.billingPeriod !== 'ANNUAL' || !offer.payment) return null;

  const { mode, installments, monthsAccess, monthsCharged } = offer.payment;
  if (
    mode !== 'UPFRONT' ||
    installments !== 1 ||
    monthsAccess === null ||
    monthsCharged === null ||
    monthsAccess <= 0 ||
    monthsCharged <= 0 ||
    monthsCharged >= monthsAccess ||
    monthsAccess !== offer.billingCycleMonths
  ) {
    return null;
  }

  const savingsMonths = monthsAccess - monthsCharged;
  return {
    monthsAccess,
    monthsCharged,
    savingsMonths,
    installments,
    effectiveDiscountPercent: (savingsMonths / monthsAccess) * 100,
  };
}

export function getCatalogSharedAnnualPaymentTerms(
  plans: PublicPricingCatalogPlan[],
): CatalogAnnualPaymentTerms | null {
  const selfServicePlans = plans.filter((plan) => plan.offers.length > 0);
  if (selfServicePlans.length === 0) return null;

  const annualOffers = selfServicePlans.map((plan) => getCatalogOffer(plan, 'ANNUAL'));
  if (annualOffers.some((offer) => offer === null)) return null;

  const terms = (annualOffers as PublicPricingCatalogOffer[]).map(getCatalogAnnualPaymentTerms);
  if (terms.some((term) => term === null)) return null;

  const normalized = terms as CatalogAnnualPaymentTerms[];
  const first = normalized[0];
  return normalized.every(
    (term) =>
      term.monthsAccess === first.monthsAccess &&
      term.monthsCharged === first.monthsCharged &&
      term.installments === first.installments,
  )
    ? first
    : null;
}

export function formatCatalogPercentage(value: number): string {
  if (!Number.isFinite(value)) return '—';

  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function formatCatalogMoney(amount: string | number, currency = 'BRL'): string {
  const value = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(value)) return '—';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCatalogLimit(value: number | null, suffix = ''): string {
  if (value === null) return 'Sob consulta';
  const formatted = new Intl.NumberFormat('pt-BR').format(value);
  return suffix ? `${formatted} ${suffix}` : formatted;
}

export function billingPeriodLabel(period: PricingCatalogBillingPeriod): string {
  return period === 'MONTHLY' ? 'Mensal' : 'Anual';
}
