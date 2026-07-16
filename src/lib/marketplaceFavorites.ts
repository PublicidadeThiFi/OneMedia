import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'onemedia:marketplace:favorites:v1';
const CHANGE_EVENT = 'onemedia:marketplace:favorites-changed';

let cachedFavorites: string[] | null = null;

function sanitize(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function readFromStorage(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function getSnapshot() {
  if (cachedFavorites === null) cachedFavorites = readFromStorage();
  return cachedFavorites;
}

function getServerSnapshot() {
  return [] as string[];
}

function refreshSnapshot() {
  cachedFavorites = readFromStorage();
}

function subscribe(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;

  const handleCustomEvent = () => {
    // A alteração na mesma aba já atualizou o cache em memória. Não releia o
    // storage aqui, pois ele pode estar indisponível no modo privado.
    listener();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    refreshSnapshot();
    listener();
  };

  window.addEventListener(CHANGE_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
  };
}

function persist(values: string[]) {
  const next = sanitize(values);
  cachedFavorites = next;

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Navegação e favoritos da sessão continuam funcionando mesmo quando o
      // navegador bloqueia o localStorage.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return next;
}

export function toggleMarketplaceFavorite(slug: string) {
  const normalized = String(slug || '').trim();
  if (!normalized) return getSnapshot();

  const current = new Set(getSnapshot());
  if (current.has(normalized)) current.delete(normalized);
  else current.add(normalized);
  return persist([...current]);
}

export function useMarketplaceFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    favorites,
    isFavorite: (slug: string) => favorites.includes(slug),
    toggleFavorite: toggleMarketplaceFavorite,
  };
}
