export type AccessBlockReason = 'TRIAL_EXPIRED' | 'PAST_DUE' | 'CANCELED' | 'UNKNOWN';

export interface AccessState {
  isBlocked: boolean;
  reason?: AccessBlockReason;
  /** ISO string */
  blockedAt?: string;
  /** Optional message to show in UI */
  message?: string;
}

const STORAGE_KEY = 'one_media_access_state_v1';

let state: AccessState = { isBlocked: false };
const listeners = new Set<(s: AccessState) => void>();

function safeParse(raw: string | null): AccessState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof (parsed as any)?.isBlocked !== 'boolean') return null;
    return parsed as AccessState;
  } catch {
    return null;
  }
}

function loadFromStorage() {
  if (typeof window === 'undefined') return;
  const stored = safeParse(window.localStorage.getItem(STORAGE_KEY));
  if (stored) state = stored;
}

function saveToStorage() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota/security errors
  }
}

function notify() {
  listeners.forEach((cb) => {
    try {
      cb(state);
    } catch {
      // ignore listener errors
    }
  });
}

if (typeof window !== 'undefined') {
  loadFromStorage();
}

export function getAccessState(): AccessState {
  return state;
}

export function setAccessState(next: AccessState): void {
  state = { ...state, ...next };
  if (state.isBlocked && !state.blockedAt) {
    state.blockedAt = new Date().toISOString();
  }
  saveToStorage();
  notify();
}

export function clearAccessState(): void {
  state = { isBlocked: false };
  saveToStorage();
  notify();
}

export function subscribeAccessState(cb: (s: AccessState) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function defaultBlockMessage(reason?: AccessBlockReason): string {
  switch (reason) {
    case 'TRIAL_EXPIRED':
      return 'Seu período de teste acabou. Para continuar usando a plataforma, assine um plano.';
    case 'PAST_DUE':
      return 'Não identificamos o pagamento da renovação. Para continuar usando a plataforma, regularize a assinatura.';
    case 'CANCELED':
      return 'Sua assinatura não está ativa. Para continuar usando a plataforma, assine um plano.';
    default:
      return 'Sua conta está com acesso restrito. Para continuar, regularize sua assinatura.';
  }
}
