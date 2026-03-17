/**
 * Types for the signup flow
 * These are front-end DTOs and view models
 * Backend will map these to Company, User, PlatformPlan, PlatformSubscription
 */

// Importar para uso local
import type { PlanRange, PlanDefinition } from '../lib/plans';

// Re-exportar para outros módulos poderem usar
export type { PlanRange, PlanDefinition } from '../lib/plans';
export { PLATFORM_PLANS as PLAN_DEFINITIONS } from '../lib/plans';

export type SignupPlanStep = {
  estimatedPoints: number | null;
  selectedPlanRange: PlanRange | null;
  selectedPlatformPlanId: string | null; // Will be filled when API integration happens
};


export type SignupCompanyStep = {
  fantasyName: string; // tradeName in DB
  legalName: string;
  cnpj: string; // taxId in DB
  phone: string;
  website: string;
  city: string;
  state: string;
  country: string;
  estimatedUsers: string;
  billingContactName: string;
  billingLegalName: string;
  billingEmail: string;
  billingPhone: string;
  billingDocument: string;
  billingPreferredMethod: 'CARTAO' | 'PIX' | 'BOLETO';
  billingAddressZipcode: string;
  billingAddressStreet: string;
  billingAddressNumber: string;
  billingAddressComplement: string;
  billingAddressDistrict: string;
  billingAddressCity: string;
  billingAddressState: string;
  billingAddressCountry: string;
};

export type SignupUserStep = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
};

export type SignupPayload = {
  plan: {
    platformPlanId: string;
    planRange: PlanRange;
  };
  company: {
    fantasyName: string;
    legalName?: string;
    cnpj: string;
    phone?: string; // Only digits - no formatting
    website?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  adminUser: {
    name: string;
    email: string;
    phone: string; // Only digits - no formatting
    password: string;
  };
};

export interface SignupRequestDto {
  planId: string;

  companyName: string;
  companyEmail?: string;
  cnpj?: string;
  companyPhone?: string;
  site?: string;
  addressZipcode?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressDistrict?: string;
  addressCity?: string;
  addressState?: string;
  addressCountry?: string;
  estimatedUsers?: number;
  billingContactName: string;
  billingLegalName: string;
  billingEmail: string;
  billingPhone?: string;
  billingDocument: string;
  billingPreferredMethod: 'CARTAO' | 'PIX' | 'BOLETO';
  billingAddressZipcode: string;
  billingAddressStreet: string;
  billingAddressNumber: string;
  billingAddressComplement?: string;
  billingAddressDistrict: string;
  billingAddressCity: string;
  billingAddressState: string;
  billingAddressCountry: string;

  adminName: string;
  adminEmail: string;
  adminPhone?: string;
  adminPassword: string;
  adminPasswordConfirmation: string;

  acceptTerms: boolean;

  /** Cloudflare Turnstile token (Managed). */
  captchaToken?: string;
};

/**
 * Completa o onboarding de um usuário autenticado via OAuth/OIDC.
 * Mesmos campos do signup, mas:
 * - sem captcha
 * - senha é opcional (usuário pode continuar apenas com Google)
 */
export interface CompleteOAuthSignupRequestDto {
  planId: string;

  companyName: string;
  companyEmail?: string;
  cnpj?: string;
  companyPhone?: string;
  site?: string;
  addressZipcode?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressDistrict?: string;
  addressCity?: string;
  addressState?: string;
  addressCountry?: string;
  estimatedUsers?: number;
  billingContactName: string;
  billingLegalName: string;
  billingEmail: string;
  billingPhone?: string;
  billingDocument: string;
  billingPreferredMethod: 'CARTAO' | 'PIX' | 'BOLETO';
  billingAddressZipcode: string;
  billingAddressStreet: string;
  billingAddressNumber: string;
  billingAddressComplement?: string;
  billingAddressDistrict: string;
  billingAddressCity: string;
  billingAddressState: string;
  billingAddressCountry: string;

  adminName: string;
  adminEmail: string;
  adminPhone?: string;
  adminPassword?: string;
  adminPasswordConfirmation?: string;

  acceptTerms: boolean;
}
