const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);

/**
 * Cadastro empresarial permanece fechado por padrão.
 * Para reabrir em um ambiente controlado, defina:
 * VITE_ENTERPRISE_SIGNUP_ENABLED=true
 */
export function isEnterpriseSignupEnabled(): boolean {
  return TRUTHY_VALUES.has(
    String(import.meta.env.VITE_ENTERPRISE_SIGNUP_ENABLED || '')
      .trim()
      .toLowerCase(),
  );
}

export const ENTERPRISE_SIGNUP_WAITLIST_ORIGIN = 'enterprise-signup:closed';
