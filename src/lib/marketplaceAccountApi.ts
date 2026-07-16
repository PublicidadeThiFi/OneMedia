import axios from 'axios';
import { publicApiClient } from './apiClient';
import {
  clearMarketplaceTokens,
  getMarketplaceAccessToken,
  getMarketplaceRefreshToken,
  updateMarketplaceTokens,
  type MarketplaceStoredTokens,
} from './marketplaceAuthStorage';
import type {
  MarketplaceAccount,
  MarketplaceAccountAuthResponse,
  MarketplaceCustomerInquiry,
  MarketplaceCustomerInquiryResponse,
  MarketplaceInquiryCampaignType,
} from '../types/marketplace';

export const marketplaceAccountApiClient = axios.create({
  baseURL: publicApiClient.defaults.baseURL,
  headers: {},
});

marketplaceAccountApiClient.interceptors.request.use((config) => {
  const method = String(config.method || 'get').toLowerCase();
  config.headers = config.headers || {};
  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
  if (['post', 'put', 'patch'].includes(method) && !isFormData) {
    (config.headers as any)['Content-Type'] = 'application/json';
  } else if (!['post', 'put', 'patch'].includes(method)) {
    delete (config.headers as any)['Content-Type'];
  }
  const token = getMarketplaceAccessToken();
  if (token) (config.headers as any).Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getMarketplaceRefreshToken();
  if (!refreshToken) return null;
  try {
    const response = await publicApiClient.post<MarketplaceAccountAuthResponse>(
      '/marketplace/auth/refresh',
      { refreshToken },
    );
    updateMarketplaceTokens(response.data.tokens);
    return response.data.tokens.accessToken;
  } catch {
    clearMarketplaceTokens();
    return null;
  }
}

marketplaceAccountApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config as any;
    if (!original || error?.response?.status !== 401 || original.__marketplaceRetry) {
      return Promise.reject(error);
    }
    original.__marketplaceRetry = true;
    refreshPromise ||= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    const accessToken = await refreshPromise;
    if (!accessToken) return Promise.reject(error);
    original.headers = original.headers || {};
    original.headers.Authorization = `Bearer ${accessToken}`;
    return marketplaceAccountApiClient.request(original);
  },
);

export async function signupMarketplaceAccount(payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
  acceptTerms: true;
  termsVersion?: string;
  captchaToken?: string;
  returnUrl?: string;
}) {
  const response = await publicApiClient.post<{
    account: MarketplaceAccount;
    message: string;
    verificationExpiresInMinutes: number;
  }>('/marketplace/auth/signup', payload);
  return response.data;
}

export async function verifyMarketplaceEmail(token: string) {
  const response = await publicApiClient.post<{ account: MarketplaceAccount; message: string }>(
    '/marketplace/auth/verify-email',
    { token },
  );
  return response.data;
}

export async function resendMarketplaceVerification(payload: {
  email: string;
  captchaToken?: string;
  returnUrl?: string;
}) {
  const response = await publicApiClient.post<{ message: string; retryAfterSeconds?: number }>(
    '/marketplace/auth/resend-verification',
    payload,
  );
  return response.data;
}

export async function loginMarketplaceAccount(payload: {
  email: string;
  password: string;
  rememberMe?: boolean;
  captchaToken?: string;
}) {
  const response = await publicApiClient.post<MarketplaceAccountAuthResponse>(
    '/marketplace/auth/login',
    payload,
  );
  return response.data;
}

export async function logoutMarketplaceAccount(refreshToken?: string | null) {
  try {
    await publicApiClient.post('/marketplace/auth/logout', {
      refreshToken: refreshToken || undefined,
    });
  } finally {
    clearMarketplaceTokens();
  }
}

export async function forgotMarketplacePassword(payload: {
  email: string;
  captchaToken?: string;
  returnUrl?: string;
}) {
  const response = await publicApiClient.post<{ message: string }>(
    '/marketplace/auth/forgot-password',
    payload,
  );
  return response.data;
}

export async function resetMarketplacePassword(payload: {
  token: string;
  newPassword: string;
}) {
  const response = await publicApiClient.post<{ message: string }>(
    '/marketplace/auth/reset-password',
    payload,
  );
  return response.data;
}

export async function fetchMarketplaceAccount(signal?: AbortSignal) {
  const response = await marketplaceAccountApiClient.get<MarketplaceAccount>(
    '/marketplace/account/me',
    { signal },
  );
  return response.data;
}

export async function updateMarketplaceAccount(payload: { name?: string; phone?: string }) {
  const response = await marketplaceAccountApiClient.patch<MarketplaceAccount>(
    '/marketplace/account/me',
    payload,
  );
  return response.data;
}

export async function createMarketplaceCustomerInquiry(payload: {
  slug: string;
  startDate: string;
  endDate: string;
  campaignType: MarketplaceInquiryCampaignType;
  notes?: string;
}) {
  const response = await marketplaceAccountApiClient.post<MarketplaceCustomerInquiry>(
    '/marketplace/inquiries',
    payload,
  );
  return response.data;
}

export async function fetchMarketplaceCustomerInquiries(
  params: { page?: number; pageSize?: number; status?: string } = {},
  signal?: AbortSignal,
) {
  const response = await marketplaceAccountApiClient.get<MarketplaceCustomerInquiryResponse>(
    '/marketplace/inquiries',
    { params, signal },
  );
  return response.data;
}

export async function cancelMarketplaceCustomerInquiry(id: string) {
  const response = await marketplaceAccountApiClient.patch<MarketplaceCustomerInquiry>(
    `/marketplace/inquiries/${encodeURIComponent(id)}/cancel`,
  );
  return response.data;
}

export type { MarketplaceStoredTokens };
