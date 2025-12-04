/**
 * Mock authentication functions
 * 
 * TODO: Replace with real API calls as described in Infra.pdf
 * - POST /auth/login
 * - POST /auth/2fa/verify
 */

import { mockUsers } from './mockDataSettings';
import { 
  LoginCredentials, 
  TwoFactorPayload, 
  LoginResult,
  AuthUser,
  AuthTokens 
} from '../types/auth';
import { UserStatus } from '../types';

// Mock password for all users (in real app, this is validated on backend)
const MOCK_PASSWORD = 'senha123';

// Mock 2FA code (in real app, this is generated and sent via email/SMS/TOTP)
const MOCK_2FA_CODE = '123456';

/**
 * Simulates login with email + password
 * 
 * @param credentials - User email, password, and rememberMe flag
 * @returns LoginResult with user, tokens (if no 2FA), or requiresTwoFactor flag
 */
export async function mockLogin(credentials: LoginCredentials): Promise<LoginResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Find user by email
  const user = mockUsers.find(u => u.email === credentials.email);

  // Validate user exists
  if (!user) {
    throw new Error('Credenciais inválidas');
  }

  // Validate password (in real app, backend validates passwordHash)
  if (credentials.password !== MOCK_PASSWORD) {
    throw new Error('Credenciais inválidas');
  }

  // Validate user is ACTIVE
  if (user.status !== UserStatus.ACTIVE) {
    throw new Error('Usuário inativo ou convite ainda não concluído.');
  }

  // Check if 2FA is enabled
  if (user.twoFactorEnabled) {
    // Return partial result - requires 2FA verification
    return {
      user: null,
      tokens: null,
      requiresTwoFactor: true,
    };
  }

  // No 2FA - complete login
  const authUser: AuthUser = {
    id: user.id,
    companyId: user.companyId,
    name: user.name,
    email: user.email,
    isSuperAdmin: user.isSuperAdmin,
    status: user.status,
    twoFactorEnabled: user.twoFactorEnabled,
    twoFactorType: user.twoFactorType,
  };

  const tokens: AuthTokens = {
    accessToken: `mock_access_token_${user.id}_${Date.now()}`,
    refreshToken: `mock_refresh_token_${user.id}_${Date.now()}`,
  };

  return {
    user: authUser,
    tokens,
    requiresTwoFactor: false,
  };
}

/**
 * Simulates 2FA code verification
 * 
 * @param payload - User email and 6-digit code
 * @returns LoginResult with user and tokens if code is valid
 */
export async function mockVerifyTwoFactor(payload: TwoFactorPayload): Promise<LoginResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));

  // Find user by email
  const user = mockUsers.find(u => u.email === payload.email);

  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  // Validate 2FA code (in real app, backend validates TOTP/SMS/Email code)
  if (payload.code !== MOCK_2FA_CODE) {
    throw new Error('Código inválido ou expirado. Tente novamente.');
  }

  // 2FA verified - complete login
  const authUser: AuthUser = {
    id: user.id,
    companyId: user.companyId,
    name: user.name,
    email: user.email,
    isSuperAdmin: user.isSuperAdmin,
    status: user.status,
    twoFactorEnabled: user.twoFactorEnabled,
    twoFactorType: user.twoFactorType,
  };

  const tokens: AuthTokens = {
    accessToken: `mock_access_token_${user.id}_${Date.now()}`,
    refreshToken: `mock_refresh_token_${user.id}_${Date.now()}`,
  };

  return {
    user: authUser,
    tokens,
    requiresTwoFactor: false,
  };
}

/**
 * Mock user credentials for testing:
 * 
 * Users with 2FA ENABLED:
 * - carlos.mendes@outdoorbrasil.com.br / senha123 / 2FA code: 123456
 * 
 * Users WITHOUT 2FA:
 * - ana.silva@outdoorbrasil.com.br / senha123
 * - roberto.lima@outdoorbrasil.com.br / senha123
 * 
 * Inactive user (should fail):
 * - maria.santos@outdoorbrasil.com.br / senha123 (status: INACTIVE)
 */