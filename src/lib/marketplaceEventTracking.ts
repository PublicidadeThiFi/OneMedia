import { recordMarketplaceEvent } from "./marketplaceApi";
import type { MarketplacePublicEventType } from "../types/marketplace";

const PREFIX = "onemedia:marketplace:event:v1";

export function trackMarketplaceEventOnce(
  slug: string,
  eventType: MarketplacePublicEventType,
) {
  const normalized = String(slug || "").trim();
  if (!normalized || typeof window === "undefined") return;
  const key = `${PREFIX}:${eventType}:${normalized}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
  } catch {
    // A métrica não pode interromper a navegação quando o storage está bloqueado.
  }
  void recordMarketplaceEvent(normalized, eventType).catch(() => undefined);
}
