const STORAGE_KEY = 'onemedia:marketplace-signup-draft:v1';
const MAX_AGE_MS = 30 * 60 * 1000;

export interface MarketplaceSignupDraft {
  name: string;
  email: string;
  phone: string;
  acceptTerms: boolean;
}

interface StoredMarketplaceSignupDraft extends MarketplaceSignupDraft {
  savedAt: number;
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function sanitizeText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : '';
}

export function saveMarketplaceSignupDraft(draft: MarketplaceSignupDraft): void {
  const storage = getSessionStorage();
  if (!storage) return;

  const payload: StoredMarketplaceSignupDraft = {
    name: sanitizeText(draft.name, 120),
    email: sanitizeText(draft.email, 254),
    phone: sanitizeText(draft.phone, 24),
    acceptTerms: draft.acceptTerms === true,
    savedAt: Date.now(),
  };

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // O cadastro continua funcionando mesmo quando o navegador bloqueia o storage.
  }
}

export function readMarketplaceSignupDraft(): MarketplaceSignupDraft | null {
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredMarketplaceSignupDraft>;
    if (
      typeof parsed.savedAt !== 'number'
      || !Number.isFinite(parsed.savedAt)
      || Date.now() - parsed.savedAt > MAX_AGE_MS
      || parsed.savedAt > Date.now() + 60_000
    ) {
      return null;
    }

    return {
      name: sanitizeText(parsed.name, 120),
      email: sanitizeText(parsed.email, 254),
      phone: sanitizeText(parsed.phone, 24),
      acceptTerms: parsed.acceptTerms === true,
    };
  } catch {
    return null;
  }
}

export function clearMarketplaceSignupDraft(): void {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Sem impacto no fluxo principal.
  }
}
