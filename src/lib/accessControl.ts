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
    // Legacy/buggy builds may have stored something like:
    // {'isBlocked':false,'reason':null} (single quotes / not valid JSON).
    // Try a best-effort normalization and, if it works, we'll rewrite it.
    try {
      const looksLikeSingleQuotedJson = raw.includes("'") && !raw.includes('"');
      if (!looksLikeSingleQuotedJson) return null;

      const normalized = raw.replace(/'/g, '"');
      const parsed = JSON.parse(normalized);
      if (typeof (parsed as any)?.isBlocked !== 'boolean') return null;
      return parsed as AccessState;
    } catch {
      return null;
    }
  }
}

function loadFromStorage() {
  if (typeof window === 'undefined') return;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const stored = safeParse(raw);
  if (stored) {
    state = stored;
    // If we managed to recover a legacy format, persist it back in valid JSON
    // so future boots don't depend on this heuristic.
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }
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
