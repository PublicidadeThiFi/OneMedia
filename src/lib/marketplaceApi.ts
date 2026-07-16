import { publicApiClient } from "./apiClient";
import type {
  MarketplaceAvailabilityResponse,
  MarketplaceHomeResponse,
  MarketplaceNearbyResponse,
  MarketplacePointDetail,
  MarketplaceSearchParams,
  MarketplaceSearchResponse,
} from "../types/marketplace";

export type MarketplaceHomeParams = {
  startDate?: string;
  endDate?: string;
};

export async function fetchMarketplaceHome(
  params: MarketplaceHomeParams = {},
  signal?: AbortSignal,
): Promise<MarketplaceHomeResponse> {
  const response = await publicApiClient.get<MarketplaceHomeResponse>(
    "/public/marketplace/home",
    {
      params,
      signal,
    },
  );
  return response.data;
}

export async function fetchMarketplacePoints(
  params: MarketplaceSearchParams = {},
  signal?: AbortSignal,
): Promise<MarketplaceSearchResponse> {
  const response = await publicApiClient.get<MarketplaceSearchResponse>(
    "/public/marketplace/points",
    {
      params: { ...params, pageSize: 6 },
      signal,
    },
  );
  return response.data;
}

export function buildMarketplaceSearchPath(
  values: Record<string, string | number | boolean | null | undefined>,
) {
  const query = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(values)) {
    if (rawValue === null || rawValue === undefined || rawValue === "")
      continue;
    query.set(key, String(rawValue));
  }

  const serialized = query.toString();
  return serialized ? `/buscar?${serialized}` : "/buscar";
}

export type MarketplacePointDateParams = {
  startDate?: string;
  endDate?: string;
};

export async function fetchMarketplacePoint(
  slug: string,
  params: MarketplacePointDateParams = {},
  signal?: AbortSignal,
): Promise<MarketplacePointDetail> {
  const response = await publicApiClient.get<MarketplacePointDetail>(
    `/public/marketplace/points/${encodeURIComponent(slug)}`,
    { params, signal },
  );
  return response.data;
}

export async function fetchMarketplaceAvailability(
  slug: string,
  params: Required<MarketplacePointDateParams>,
  signal?: AbortSignal,
): Promise<MarketplaceAvailabilityResponse> {
  const response = await publicApiClient.get<MarketplaceAvailabilityResponse>(
    `/public/marketplace/points/${encodeURIComponent(slug)}/availability`,
    { params, signal },
  );
  return response.data;
}

export async function fetchMarketplaceNearby(
  slug: string,
  params: MarketplacePointDateParams & {
    radiusKm?: number;
    limit?: number;
  } = {},
  signal?: AbortSignal,
): Promise<MarketplaceNearbyResponse> {
  const response = await publicApiClient.get<MarketplaceNearbyResponse>(
    `/public/marketplace/points/${encodeURIComponent(slug)}/nearby`,
    { params, signal },
  );
  return response.data;
}

export async function recordMarketplaceEvent(
  slug: string,
  eventType: import("../types/marketplace").MarketplacePublicEventType,
): Promise<void> {
  await publicApiClient.post("/public/marketplace/events", { slug, eventType });
}

export async function createMarketplaceReport(payload: {
  slug: string;
  reason: import("../types/marketplace").MarketplaceReportReason;
  email?: string;
  details?: string;
  captchaToken?: string;
}) {
  const response = await publicApiClient.post<{
    id: string;
    status: string;
    createdAt: string;
    message: string;
  }>("/public/marketplace/reports", payload);
  return response.data;
}
