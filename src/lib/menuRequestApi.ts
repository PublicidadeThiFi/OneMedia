import { publicApiClient } from './apiClient';
import type { MenuCartItem } from './menuCart';

export type CreateMenuRequestInput = {
  token: string;

  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompanyName?: string;
  customerCnpj?: string;

  notes?: string;
  items: MenuCartItem[];

  // Context (helps owner understand what client was browsing)
  uf?: string;
  city?: string;
};

export type CreateMenuRequestResponse = {
  requestId: string;
};

export type MenuRequestRecord = {
  id: string;
  companyId: string;
  createdAt: string;
  updatedAt?: string;
  status: string;

  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompanyName?: string | null;
  customerCnpj?: string | null;
  notes?: string | null;

  uf?: string | null;
  city?: string | null;

  items: MenuCartItem[];

  // Stage 5
  events?: MenuEvent[];
  quotes?: MenuQuoteVersionRecord[];
  currentQuoteVersion?: number | null;
};

export type MenuEventType =
  | 'REQUEST_SUBMITTED'
  | 'OWNER_OPENED'
  | 'QUOTE_SENT'
  | 'QUOTE_OPENED'
  | 'QUOTE_REJECTED'
  | 'QUOTE_APPROVED';

export type MenuEvent = {
  type: MenuEventType;
  at: string;
  meta?: Record<string, any>;
};

export type MenuQuoteServiceLine = {
  name: string;
  value: number;
};

export type MenuQuoteDraft = {
  message?: string | null;
  services?: MenuQuoteServiceLine[];
  manualServiceValue?: number | null;
  discountPercent?: number | null;
  discountFixed?: number | null;
};

export type MenuQuoteTotals = {
  base: number;
  services: number;
  discount: number;
  total: number;
};

export type MenuQuoteVersionRecord = {
  version: number;
  createdAt: string;
  status: 'SENT' | 'REJECTED' | 'APPROVED';
  draft: MenuQuoteDraft;
  totals: MenuQuoteTotals;
  rejectReason?: string | null;
  openedAt?: string | null;
};

export async function createMenuRequest(input: CreateMenuRequestInput): Promise<CreateMenuRequestResponse> {
  const payload = {
    token: String(input.token || '').trim(),
    customerName: String(input.customerName || '').trim(),
    customerEmail: String(input.customerEmail || '').trim(),
    customerPhone: String(input.customerPhone || '').trim(),
    customerCompanyName: String(input.customerCompanyName || '').trim() || undefined,
    customerCnpj: String(input.customerCnpj || '').trim() || undefined,
    notes: String(input.notes || '').trim() || undefined,
    uf: String(input.uf || '').trim().toUpperCase() || undefined,
    city: String(input.city || '').trim() || undefined,
    items: Array.isArray(input.items) ? input.items : [],
  };

  const resp = await publicApiClient.post<CreateMenuRequestResponse>('/public/menu/request', payload);
  return resp.data;
}

export async function fetchMenuRequest(params: { requestId: string; token: string; view?: 'client' | 'owner' }): Promise<MenuRequestRecord> {
  const requestId = String(params.requestId || '').trim();
  const token = String(params.token || '').trim();
  const view = params.view;

  const resp = await publicApiClient.get<MenuRequestRecord>(
    `/public/menu/request/${encodeURIComponent(requestId)}`,
    { params: { token, view } },
  );
  return resp.data;
}

export async function sendMenuQuote(params: { requestId: string; token: string; draft: MenuQuoteDraft }): Promise<{ version: number; totals: MenuQuoteTotals }> {
  const requestId = String(params.requestId || '').trim();
  const token = String(params.token || '').trim();
  const resp = await publicApiClient.post<{ version: number; totals: MenuQuoteTotals }>(
    `/public/menu/quote/${encodeURIComponent(requestId)}/send`,
    { token, draft: params.draft },
  );
  return resp.data;
}

export async function rejectMenuQuote(params: { requestId: string; token: string; reason?: string }): Promise<{ ok: true }> {
  const requestId = String(params.requestId || '').trim();
  const token = String(params.token || '').trim();
  const resp = await publicApiClient.post<{ ok: true }>(
    `/public/menu/quote/${encodeURIComponent(requestId)}/reject`,
    { token, reason: params.reason },
  );
  return resp.data;
}

export async function approveMenuQuote(params: { requestId: string; token: string }): Promise<{ ok: true }> {
  const requestId = String(params.requestId || '').trim();
  const token = String(params.token || '').trim();
  const resp = await publicApiClient.post<{ ok: true }>(
    `/public/menu/quote/${encodeURIComponent(requestId)}/approve`,
    { token },
  );
  return resp.data;
}
