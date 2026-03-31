import apiClient from '../lib/apiClient';
import type { NewsArticleRecord, PublishedNewsListResponse } from '../types/news';

export interface PublishedNewsListQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchPublishedNews(query: PublishedNewsListQuery = {}): Promise<PublishedNewsListResponse> {
  const response = await apiClient.get<PublishedNewsListResponse>('/news', {
    params: query,
  });

  return response.data;
}

export async function fetchPublishedNewsArticleBySlug(slug: string): Promise<NewsArticleRecord> {
  const response = await apiClient.get<NewsArticleRecord>(`/news/${encodeURIComponent(slug)}`);
  return response.data;
}
