/**
 * Types for authentication flow
 * Based on schema.prisma User model and Infra.pdf Auth module
 */

import { UserStatus, TwoFactorType } from './index';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface TwoFactorPayload {
  email: string;
  code: string; // 6 dígitos
}

export interface AuthUser {
  id: string;
  companyId: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  status: UserStatus;
  twoFactorEnabled: boolean;
  twoFactorType: TwoFactorType | null;
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
