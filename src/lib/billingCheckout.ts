import apiClient from './apiClient';

const CAKTO_CHECKOUT_HOST = 'pay.cakto.com.br';
const pendingAttemptKeys = new Map<string, string>();
const PENDING_OFFER_STORAGE_KEY = 'onemedia:billing:pending-offer';

export interface BillingCheckoutResponse {
  provider: 'CAKTO';
  checkoutSessionId: string;
  offerCode: string;
  checkoutUrl: string;
  expiresAt: string | null;
}

function normalizeOfferCode(value: string): string {
  return String(value || '').trim().toUpperCase();
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

function getAttemptKey(offerCode: string): string {
  const normalized = normalizeOfferCode(offerCode);
  const existing = pendingAttemptKeys.get(normalized);
  if (existing) return existing;

  const created = `web:${normalized.toLowerCase()}:${randomId()}`;
  pendingAttemptKeys.set(normalized, created);
  return created;
}

export function validateCaktoCheckoutUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(String(rawUrl || '').trim());
  } catch {
    throw new Error('Checkout retornou uma URL inválida.');
  }

  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== CAKTO_CHECKOUT_HOST) {
    throw new Error('Checkout retornou um destino não autorizado.');
  }

  return url.toString();
}

export async function createBillingCheckout(offerCode: string): Promise<BillingCheckoutResponse> {
  const normalized = normalizeOfferCode(offerCode);
  if (!normalized) throw new Error('Oferta inválida para checkout.');

  const idempotencyKey = getAttemptKey(normalized);

  const response = await apiClient.post<BillingCheckoutResponse>(
    '/billing/checkout',
    { offerCode: normalized },
    {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    },
  );

  const data = response.data;
  if (!data || data.provider !== 'CAKTO' || normalizeOfferCode(data.offerCode) !== normalized) {
    throw new Error('Backend retornou um checkout incompatível com a oferta selecionada.');
  }

  return {
    ...data,
    checkoutUrl: validateCaktoCheckoutUrl(data.checkoutUrl),
  };
}

export async function startCaktoCheckout(offerCode: string): Promise<boolean> {
  const normalized = normalizeOfferCode(offerCode);
  const checkout = await createBillingCheckout(normalized);

  pendingAttemptKeys.delete(normalized);
  clearPendingBillingOffer(normalized);

  if (typeof window === 'undefined') {
    throw new Error('Redirecionamento para checkout indisponível fora do navegador.');
  }

  window.location.assign(checkout.checkoutUrl);
  return true;
}

export function rememberPendingBillingOffer(offerCode: string): void {
  const normalized = normalizeOfferCode(offerCode);
  if (!normalized || typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(PENDING_OFFER_STORAGE_KEY, normalized);
  } catch {
    // sessionStorage may be unavailable in hardened browsers; Settings remains a fallback.
  }
}

export function getPendingBillingOffer(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = normalizeOfferCode(window.sessionStorage.getItem(PENDING_OFFER_STORAGE_KEY) || '');
    return value || null;
  } catch {
    return null;
  }
}

export function clearPendingBillingOffer(expectedOfferCode?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (expectedOfferCode) {
      const current = getPendingBillingOffer();
      if (current && current !== normalizeOfferCode(expectedOfferCode)) return;
    }
    window.sessionStorage.removeItem(PENDING_OFFER_STORAGE_KEY);
  } catch {
    // no-op
  }
}

export async function resumePendingCaktoCheckout(): Promise<boolean> {
  const pendingOffer = getPendingBillingOffer();
  if (!pendingOffer) return false;

  return startCaktoCheckout(pendingOffer);
}
