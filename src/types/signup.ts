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