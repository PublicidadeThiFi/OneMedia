/**
 * Types for authentication flow
 * Based on schema.prisma User model and Infra.pdf Auth module
 */

import { UserRoleType, UserStatus, TwoFactorType } from './index';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
  /** Cloudflare Turnstile token (Managed). */
  captchaToken?: string;
}

export interface TwoFactorPayload {
  email: string;
  code: string; // 6 dígitos
}

export interface AuthUser {
  id: string;
  /** Can be null for new SSO users before completing onboarding. */
  companyId: string | null;
  name: string;
  email: string;
  /** Optional phone, may be null. */
  phone?: string | null;
  isSuperAdmin: boolean;
  status: UserStatus;
  twoFactorEnabled: boolean;
  twoFactorType: TwoFactorType | null;
  roles?: UserRoleType[];

  /**
   * True when the user has completed the required onboarding steps
   * (Plano -> Empresa -> Acesso).
   */
  onboardingCompleted?: boolean;
  /** Step index (1..3) when onboarding is pending. */
  onboardingStep?: number;
  /** Linked SSO providers returned by /auth/me (e.g. ['google','microsoft']). */
  providers?: Array<'google' | 'microsoft'>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  requiresTwoFactor: boolean;
}
