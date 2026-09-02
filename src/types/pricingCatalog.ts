export type PricingCatalogBillingPeriod = 'MONTHLY' | 'ANNUAL';

export interface PublicPricingPaymentMetadata {
  mode: string | null;
  installments: number | null;
  monthsAccess: number | null;
  monthsCharged: number | null;
}

export interface PublicPricingCatalogOffer {
  code: string;
  billingPeriod: PricingCatalogBillingPeriod;
  billingCycleMonths: number;
  amount: string;
  currency: string;
  trialDays: number;
  payment: PublicPricingPaymentMetadata | null;
}

export interface PublicPricingCatalogEntitlements {
  pointsLimit: number | null;
  usersLimit: number | null;
  storageLimitGb: number | null;
  trafficLimitGb: number | null;
  maxOwnersPerMediaPoint: number | null;
  fileLimits: unknown | null;
}

export interface PublicPricingCatalogPlan {
  code: string;
  publicName: string;
  description: string | null;
  entitlements: PublicPricingCatalogEntitlements;
  offers: PublicPricingCatalogOffer[];
}

export interface PublicPricingCatalogResponse {
  catalogVersion: number;
  plans: PublicPricingCatalogPlan[];
}
