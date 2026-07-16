import { apiClient } from './apiClient';
import { marketplaceAccountApiClient } from './marketplaceAccountApi';
import type {
  MarketplaceConversationListResponse,
  MarketplaceConversationMessage,
  MarketplaceConversationMessagesResponse,
} from '../types/marketplace';

export type MarketplaceConversationFilters = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function fetchMarketplaceCustomerConversations(
  params: MarketplaceConversationFilters = {},
  signal?: AbortSignal,
) {
  const response = await marketplaceAccountApiClient.get<MarketplaceConversationListResponse>(
    '/marketplace/conversations',
    { params, signal },
  );
  return response.data;
}

export async function fetchMarketplaceCustomerMessages(
  conversationId: string,
  params: { page?: number; pageSize?: number } = {},
  signal?: AbortSignal,
) {
  const response = await marketplaceAccountApiClient.get<MarketplaceConversationMessagesResponse>(
    `/marketplace/conversations/${encodeURIComponent(conversationId)}/messages`,
    { params, signal },
  );
  return response.data;
}

export async function sendMarketplaceCustomerMessage(
  conversationId: string,
  contentText: string,
) {
  const response = await marketplaceAccountApiClient.post<MarketplaceConversationMessage>(
    `/marketplace/conversations/${encodeURIComponent(conversationId)}/messages`,
    { contentText },
  );
  return response.data;
}

export async function fetchMarketplaceOperatorConversations(
  params: MarketplaceConversationFilters = {},
  signal?: AbortSignal,
) {
  const response = await apiClient.get<MarketplaceConversationListResponse>(
    '/marketplace/operator/conversations',
    { params, signal },
  );
  return response.data;
}

export async function fetchMarketplaceOperatorMessages(
  conversationId: string,
  params: { page?: number; pageSize?: number } = {},
  signal?: AbortSignal,
) {
  const response = await apiClient.get<MarketplaceConversationMessagesResponse>(
    `/marketplace/operator/conversations/${encodeURIComponent(conversationId)}/messages`,
    { params, signal },
  );
  return response.data;
}

export async function sendMarketplaceOperatorMessage(
  conversationId: string,
  contentText: string,
) {
  const response = await apiClient.post<MarketplaceConversationMessage>(
    `/marketplace/operator/conversations/${encodeURIComponent(conversationId)}/messages`,
    { contentText },
  );
  return response.data;
}
