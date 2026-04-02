import { publicApiClient } from '../lib/apiClient';
import type {
  AdminNewsListResponse,
  AdminNewsLoginPayload,
  AdminNewsLoginResponse,
  AdminNewsMeResponse,
  NewsArticleRecord,
  NewsArticleStatus,
  AdminNewsUploadResponse,
  NewsArticleUpsertInput,
  NewsEditorSchema,
} from '../types/news';

import { clearAdminNewsAccessToken, getAdminNewsAccessToken, setAdminNewsAccessToken } from '../lib/adminAuthStorage';

function buildAdminAuthHeaders(token?: string | null) {
  const accessToken = token ?? getAdminNewsAccessToken();
  return accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;
}

export async function loginAdminNews(payload: AdminNewsLoginPayload): Promise<AdminNewsLoginResponse> {
  const response = await publicApiClient.post<AdminNewsLoginResponse>('/admin/auth/login', payload);
  return response.data;
}

export async function fetchAdminNewsMe(token?: string | null): Promise<AdminNewsMeResponse> {
  const response = await publicApiClient.get<AdminNewsMeResponse>('/admin/auth/me', {
    headers: buildAdminAuthHeaders(token),
  });
  return response.data;
}

export async function logoutAdminNews(token?: string | null): Promise<void> {
  await publicApiClient.post(
    '/admin/auth/logout',
    {},
    {
      headers: buildAdminAuthHeaders(token),
    },
  );
}

export interface AdminNewsListQuery {
  search?: string;
  status?: NewsArticleStatus | '';
  page?: number;
  pageSize?: number;
}

export async function fetchAdminNewsSchema(token?: string | null): Promise<NewsEditorSchema> {
  const response = await publicApiClient.get<NewsEditorSchema>('/admin/news/schema', {
    headers: buildAdminAuthHeaders(token),
  });
  return response.data;
}

export async function fetchAdminNewsArticles(query: AdminNewsListQuery = {}, token?: string | null): Promise<AdminNewsListResponse> {
  const response = await publicApiClient.get<AdminNewsListResponse>('/admin/news', {
    headers: buildAdminAuthHeaders(token),
    params: query,
  });
  return response.data;
}

export async function fetchAdminNewsArticle(id: string, token?: string | null): Promise<NewsArticleRecord> {
  const response = await publicApiClient.get<NewsArticleRecord>(`/admin/news/${id}`, {
    headers: buildAdminAuthHeaders(token),
  });
  return response.data;
}

export async function createAdminNewsArticle(payload: NewsArticleUpsertInput, token?: string | null): Promise<NewsArticleRecord> {
  const response = await publicApiClient.post<NewsArticleRecord>('/admin/news', payload, {
    headers: buildAdminAuthHeaders(token),
  });
  return response.data;
}

export async function updateAdminNewsArticle(id: string, payload: Partial<NewsArticleUpsertInput>, token?: string | null): Promise<NewsArticleRecord> {
  const response = await publicApiClient.put<NewsArticleRecord>(`/admin/news/${id}`, payload, {
    headers: buildAdminAuthHeaders(token),
  });
  return response.data;
}

export async function publishAdminNewsArticle(id: string, token?: string | null): Promise<NewsArticleRecord> {
  const response = await publicApiClient.post<NewsArticleRecord>(`/admin/news/${id}/publish`, {}, {
    headers: buildAdminAuthHeaders(token),
  });
  return response.data;
}

export async function unpublishAdminNewsArticle(id: string, token?: string | null): Promise<NewsArticleRecord> {
  const response = await publicApiClient.post<NewsArticleRecord>(`/admin/news/${id}/unpublish`, {}, {
    headers: buildAdminAuthHeaders(token),
  });
  return response.data;
}

export async function archiveAdminNewsArticle(id: string, token?: string | null): Promise<NewsArticleRecord> {
  const response = await publicApiClient.post<NewsArticleRecord>(`/admin/news/${id}/archive`, {}, {
    headers: buildAdminAuthHeaders(token),
  });
  return response.data;
}

export async function restoreAdminNewsArticle(id: string, token?: string | null): Promise<NewsArticleRecord> {
  const response = await publicApiClient.post<NewsArticleRecord>(`/admin/news/${id}/restore`, {}, {
    headers: buildAdminAuthHeaders(token),
  });
  return response.data;
}

export async function uploadAdminNewsImage(
  file: File,
  options: {
    kind?: 'cover' | 'content' | 'gallery';
    onProgress?: (progress: { loaded: number; total: number }) => void;
    token?: string | null;
  } = {},
): Promise<AdminNewsUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (options.kind) {
    formData.append('kind', options.kind);
  }

  const response = await publicApiClient.post<AdminNewsUploadResponse>('/admin/news/upload', formData, {
    headers: {
      ...buildAdminAuthHeaders(options.token),
      'Content-Type': undefined as any,
    },
    onUploadProgress: (event: ProgressEvent) => {
      const loaded = Number(event.loaded ?? 0);
      const total = Number(event.total ?? file.size ?? 0);
      options.onProgress?.({ loaded, total: total > 0 ? total : file.size });
    },
  });

  return response.data;
}

// Re-export auth storage functions
export { clearAdminNewsAccessToken, getAdminNewsAccessToken, setAdminNewsAccessToken } from '../lib/adminAuthStorage';