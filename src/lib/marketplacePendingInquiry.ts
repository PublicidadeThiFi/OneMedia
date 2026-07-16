import type { PendingMarketplaceInquiry } from "../types/marketplace";

const STORAGE_KEY = "onemedia:marketplace:pending-inquiry:v1";

export function savePendingMarketplaceInquiry(
  inquiry: Omit<PendingMarketplaceInquiry, "version" | "createdAt">,
) {
  if (typeof window === "undefined") return;
  const payload: PendingMarketplaceInquiry = {
    ...inquiry,
    version: 1,
    createdAt: new Date().toISOString(),
  };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // A indisponibilidade do storage não deve impedir o cadastro.
  }
}

export function readPendingMarketplaceInquiry(): PendingMarketplaceInquiry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingMarketplaceInquiry;
    if (
      parsed?.version !== 1 ||
      !parsed.slug ||
      !parsed.startDate ||
      !parsed.endDate
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingMarketplaceInquiry() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}
