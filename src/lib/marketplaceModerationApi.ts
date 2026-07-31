import { apiClient } from "./apiClient";
import type {
  MarketplaceModerationProfileItem,
  MarketplaceModerationProfilesResponse,
  MarketplaceModerationReportItem,
  MarketplaceModerationReportsResponse,
  MarketplacePointHighlight,
  MarketplacePointPublicationStatus,
  MarketplaceReportStatus,
} from "../types/marketplace";

export async function fetchMarketplaceModerationProfiles(
  params: {
    q?: string;
    status?: MarketplacePointPublicationStatus | "";
    page?: number;
    pageSize?: number;
  } = {},
  signal?: AbortSignal,
) {
  const response = await apiClient.get<MarketplaceModerationProfilesResponse>(
    "/marketplace/operator/moderation/profiles",
    { params, signal },
  );
  return response.data;
}

export async function updateMarketplaceModerationProfile(
  mediaPointId: string,
  payload: {
    status?: MarketplacePointPublicationStatus;
    shortDescription?: string;
    longDescription?: string;
    highlights?: MarketplacePointHighlight[];
    campaignUseCases?: string[];
    featuredRank?: number;
    verified?: boolean;
  },
): Promise<MarketplaceModerationProfileItem> {
  const response = await apiClient.patch<MarketplaceModerationProfileItem>(
    `/marketplace/operator/moderation/profiles/${encodeURIComponent(mediaPointId)}`,
    payload,
  );
  return response.data;
}

export async function fetchMarketplaceModerationReports(
  params: {
    q?: string;
    status?: MarketplaceReportStatus | "";
    page?: number;
    pageSize?: number;
  } = {},
  signal?: AbortSignal,
) {
  const response = await apiClient.get<MarketplaceModerationReportsResponse>(
    "/marketplace/operator/moderation/reports",
    { params, signal },
  );
  return response.data;
}

export async function updateMarketplaceModerationReport(
  reportId: string,
  payload: {
    status: MarketplaceReportStatus;
    note?: string;
    suspendPoint?: boolean;
  },
): Promise<MarketplaceModerationReportItem> {
  const response = await apiClient.patch<MarketplaceModerationReportItem>(
    `/marketplace/operator/moderation/reports/${encodeURIComponent(reportId)}`,
    payload,
  );
  return response.data;
}
