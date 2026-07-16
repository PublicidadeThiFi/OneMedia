import { apiClient } from "./apiClient";
import type {
  MarketplaceInquiryOperatorItem,
  MarketplaceInquiryOperatorResponse,
  MarketplaceInquiryStatus,
} from "../types/marketplace";

export type MarketplaceOperatorInquiryFilters = {
  status?: MarketplaceInquiryStatus | "";
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function fetchMarketplaceOperatorInquiries(
  filters: MarketplaceOperatorInquiryFilters = {},
  signal?: AbortSignal,
): Promise<MarketplaceInquiryOperatorResponse> {
  const response = await apiClient.get<MarketplaceInquiryOperatorResponse>(
    "/marketplace/operator/inquiries",
    { params: filters, signal },
  );
  return response.data;
}

export async function updateMarketplaceOperatorInquiryStatus(
  inquiryId: string,
  status: Exclude<
    MarketplaceInquiryStatus,
    "SUBMITTED" | "CONVERTED" | "CANCELED"
  >,
  reason?: string,
): Promise<MarketplaceInquiryOperatorItem> {
  const response = await apiClient.patch<MarketplaceInquiryOperatorItem>(
    `/marketplace/operator/inquiries/${encodeURIComponent(inquiryId)}/status`,
    { status, reason: reason || undefined },
  );
  return response.data;
}

export async function convertMarketplaceOperatorInquiry(
  inquiryId: string,
  payload: { mediaUnitId?: string; conditionsText?: string } = {},
): Promise<MarketplaceInquiryOperatorItem> {
  const response = await apiClient.post<MarketplaceInquiryOperatorItem>(
    `/marketplace/operator/inquiries/${encodeURIComponent(inquiryId)}/convert`,
    payload,
  );
  return response.data;
}
