/**
 * Validation and formatting utilities
 */

// ========================================
// Phone Validation & Formatting
// ========================================

/**
 * Remove all non-digit characters from a string
 */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Validates Brazilian phone (10 or 11 digits with DDD)
 */
export function isValidPhone(digits: string): boolean {
  const cleaned = onlyDigits(digits);
  return cleaned.length === 10 || cleaned.length === 11;
}

/**
 * Format phone digits for display
 * Examples:
 * - 10 digits: 1198765432 → (11) 9876-5432
 * - 11 digits: 11987654321 → (11) 98765-4321
 */
export function formatPhoneDisplay(digits: string): string {
  const cleaned = onlyDigits(digits);
  
  if (cleaned.length === 0) return '';
  
  // Extract parts
  const ddd = cleaned.slice(0, 2);
  
  if (cleaned.length <= 2) {
    return `(${cleaned}`;
  }
  
  if (cleaned.length === 10) {
    // Fixed line: (11) 9876-5432
    const firstPart = cleaned.slice(2, 6);
    const secondPart = cleaned.slice(6, 10);
    return `(${ddd}) ${firstPart}-${secondPart}`;
  }
  
  if (cleaned.length === 11) {
    // Mobile: (11) 98765-4321
    const firstPart = cleaned.slice(2, 7);
    const secondPart = cleaned.slice(7, 11);
    return `(${ddd}) ${firstPart}-${secondPart}`;
  }
  
  // Incomplete or too long - just format what we have
  if (cleaned.length < 10) {
    const firstPart = cleaned.slice(2, 6);
    const secondPart = cleaned.slice(6);
    return `(${ddd}) ${firstPart}${secondPart ? '-' + secondPart : ''}`;
  }
  
  // Too long - truncate to 11
  return formatPhoneDisplay(cleaned.slice(0, 11));
}

/**
 * Handle phone input change - limits to 11 digits
 */
export function handlePhoneInput(value: string): string {
  const cleaned = onlyDigits(value);
  return cleaned.slice(0, 11); // Max 11 digits
}

// ========================================
// Password Validation
// ========================================

export interface PasswordRequirements {
  minLength: boolean;
  hasUpperCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
}

/**
 * Validates password requirements for signup
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export function validatePasswordRequirements(password: string): PasswordRequirements {
  const minLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  
  return {
    minLength,
    hasUpperCase,
    hasNumber,
    hasSpecialChar,
    isValid: minLength && hasUpperCase && hasNumber && hasSpecialChar,
  };
}

/**
 * Get password requirement error message
 */
export function getPasswordErrorMessage(password: string): string | null {
  if (!password) return 'Senha é obrigatória';
  
  const reqs = validatePasswordRequirements(password);
  
  if (!reqs.isValid) {
    const missing: string[] = [];
    if (!reqs.minLength) missing.push('8 caracteres');
    if (!reqs.hasUpperCase) missing.push('1 letra maiúscula');
    if (!reqs.hasNumber) missing.push('1 número');
    if (!reqs.hasSpecialChar) missing.push('1 caractere especial');
    
    return `A senha deve conter: ${missing.join(', ')}`;
  }
  
  return null;
}

// ========================================
// Email Validation
// ========================================

/**
 * Normalize email input:
 * - trims and removes spaces
 * - forces lowercase (we store e-mails in lowercase to avoid mismatches)
 */
export function normalizeEmailInput(value: string): string {
  return (value || '').trim().replace(/\s+/g, '').toLowerCase();
}

/**
 * Returns a human-friendly error message for invalid e-mails.
 *
 * We intentionally add a few guardrails for common typos in BR domains
 * like ".con.br" or ".com.bre".
 */
export function getEmailErrorMessage(email: string): string | null {
  const normalized = normalizeEmailInput(email);
  if (!normalized) return null;

  // Basic format (accepts + and common special chars in the local part)
  const basic = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;
  if (!basic.test(normalized)) return 'E-mail inválido.';
  if (normalized.includes('..')) return 'E-mail inválido (não pode conter ".." ).';

  const domain = normalized.split('@')[1] || '';

  // Common BR typos: ".con.br" instead of ".com.br"
  if (domain.endsWith('.con.br')) {
    return 'E-mail inválido. Você quis dizer ".com.br"?';
  }

  // Blocks endings like: .com.bre, .com.bra, .com.br1, etc.
  if (/\.com\.br[a-z0-9]+$/i.test(domain)) {
    return 'E-mail inválido. Verifique o final do domínio (use ".com.br", sem letras extras).';
  }

  return null;
}

/**
 * Boolean helper for email validity.
 */
export function isValidEmail(email: string): boolean {
  return getEmailErrorMessage(email) === null;
}

// ========================================
// CPF / CNPJ Validation & Formatting
// ========================================

/**
 * Format CNPJ for display
 * Example: 12345678000190 → 12.345.678/0001-90
 */
export function formatCNPJDisplay(value: string): string {
  const numbers = onlyDigits(value);
  
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  }
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
}

/**
 * Format CPF for display
 * Example: 12345678901 → 123.456.789-01
 */
export function formatCPFDisplay(value: string): string {
  const numbers = onlyDigits(value);

  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
}

/**
 * Formats a document as CPF (<= 11 digits) or CNPJ (> 11 digits)
 */
export function formatCpfCnpjDisplay(value: string): string {
  const numbers = onlyDigits(value);
  if (numbers.length <= 11) return formatCPFDisplay(numbers);
  return formatCNPJDisplay(numbers);
}

/**
 * Validates CPF (11 digits + check digits)
 */
export function isValidCPF(value: string): boolean {
  const numbers = onlyDigits(value);
  if (numbers.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(numbers)) return false; // reject all-equal

  const digits = numbers.split('').map((d) => Number(d));
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += digits[i] * (len + 1 - i);
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const d1 = calc(9);
  const d2 = calc(10);
  return digits[9] === d1 && digits[10] === d2;
}

/**
 * Validates CNPJ (14 digits + check digits)
 */
export function isValidCNPJ(value: string): boolean {
  const numbers = onlyDigits(value);
  if (numbers.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(numbers)) return false; // reject all-equal

  const digits = numbers.split('').map((d) => Number(d));
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const calc = (baseDigits: number[], weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += baseDigits[i] * weights[i];
    }
    const mod = sum % 11;
    const res = 11 - mod;
    return res >= 10 ? 0 : res;
  };

  const d1 = calc(digits, weights1);
  const d2 = calc([...digits.slice(0, 12), d1], weights2);

  return digits[12] === d1 && digits[13] === d2;
}

/**
 * Returns a human-friendly error for CPF/CNPJ.
 * - null means "no error" (including empty input)
 */
export function getCpfCnpjErrorMessage(value: string): string | null {
  const numbers = onlyDigits(value);
  if (!numbers) return null; // optional
  if (numbers.length !== 11 && numbers.length !== 14) {
    return 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).';
  }
  if (numbers.length === 11 && !isValidCPF(numbers)) return 'CPF inválido.';
  if (numbers.length === 14 && !isValidCNPJ(numbers)) return 'CNPJ inválido.';
  return null;
}
