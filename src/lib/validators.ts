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
 * Simple email validation
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ========================================
// CNPJ Validation & Formatting
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
 * Validates CNPJ format (14 digits)
 */
export function isValidCNPJ(value: string): boolean {
  const numbers = onlyDigits(value);
  return numbers.length === 14;
}
