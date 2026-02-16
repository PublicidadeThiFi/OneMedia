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

  // Stage 6 — links assinados + rastreio + expiração
  links?: {
    client: {
      token?: string;
      expiresAt: string;
      openedAtFirst?: string | null;
      openedAtLast?: string | null;
      regeneratedAt?: string | null;
    };
    owner: {
      token?: string;
      expiresAt: string;
      openedAtFirst?: string | null;
      openedAtLast?: string | null;
      regeneratedAt?: string | null;
    };
  };
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

export type MenuQuoteDiscountApplyTo = 'SERVICES' | 'BASE' | 'ALL';

export type MenuQuoteServiceLine = {
  name: string;
  value: number;
  discountPercent?: number | null;
  discountFixed?: number | null;
};

export type MenuQuoteDraft = {
  message?: string | null;
  services?: MenuQuoteServiceLine[];
  manualServiceValue?: number | null;

  // Desconto global (opcional)
  discountPercent?: number | null;
  discountFixed?: number | null;
  discountApplyTo?: MenuQuoteDiscountApplyTo | null;
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


export type MenuRequestLoadErrorKind = 'REVOKED' | 'EXPIRED' | 'NOT_FOUND' | 'MISSING_TOKEN' | 'GENERIC';

export type MenuRequestLoadError = {
  kind: MenuRequestLoadErrorKind;
  title: string;
  description: string;
};

export function classifyMenuRequestError(err: any): MenuRequestLoadError {
  const status = Number(err?.response?.status || 0);
  const rawMsg = String(err?.response?.data?.message || err?.message || '').trim();
  const msg = rawMsg.toLowerCase();

  if (status === 401) {
    if (msg.includes('expir')) {
      return {
        kind: 'EXPIRED',
        title: 'Link expirado',
        description: 'Este link expirou. Peça ao responsável para gerar um novo link.',
      };
    }
    return {
      kind: 'REVOKED',
      title: 'Link revogado ou inválido',
      description: 'Este link não é mais válido (pode ter sido regenerado). Peça um novo link ao responsável.',
    };
  }

  if (status === 404) {
    return {
      kind: 'NOT_FOUND',
      title: 'Solicitação não encontrada',
      description: 'Verifique se o link está completo ou peça ao responsável para reenviar.',
    };
  }

  if (status === 400 && (msg.includes('token') || msg.includes('ausente'))) {
    return {
      kind: 'MISSING_TOKEN',
      title: 'Acesso inválido',
      description: 'Token ausente. Abra o Cardápio a partir do link compartilhado.',
    };
  }

  return {
    kind: 'GENERIC',
    title: 'Não foi possível carregar',
    description: rawMsg || 'Falha ao carregar.',
  };
}

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

export async function fetchMenuRequest(params: {
  requestId: string;
  token?: string;
  t?: string;
  view?: 'client' | 'owner';
}): Promise<MenuRequestRecord> {
  const requestId = String(params.requestId || '').trim();
  const token = String(params.token || '').trim();
  const t = String(params.t || '').trim();
  const view = params.view;

  const query: Record<string, string | undefined> = { view };
  if (t) query.t = t;
  else query.token = token;

  const resp = await publicApiClient.get<MenuRequestRecord>(
    `/public/menu/request/${encodeURIComponent(requestId)}`,
    { params: query },
  );
  return resp.data;
}

export async function sendMenuQuote(params: {
  requestId: string;
  token?: string;
  t?: string;
  draft: MenuQuoteDraft;
}): Promise<{ version: number; totals: MenuQuoteTotals }> {
  const requestId = String(params.requestId || '').trim();
  const token = String(params.token || '').trim();
  const t = String(params.t || '').trim();
  const resp = await publicApiClient.post<{ version: number; totals: MenuQuoteTotals }>(
    `/public/menu/quote/${encodeURIComponent(requestId)}/send`,
    { token: token || undefined, t: t || undefined, draft: params.draft },
  );
  return resp.data;
}

export async function rejectMenuQuote(params: {
  requestId: string;
  token?: string;
  t?: string;
  reason?: string;
}): Promise<{ ok: true }> {
  const requestId = String(params.requestId || '').trim();
  const token = String(params.token || '').trim();
  const t = String(params.t || '').trim();
  const resp = await publicApiClient.post<{ ok: true }>(
    `/public/menu/quote/${encodeURIComponent(requestId)}/reject`,
    { token: token || undefined, t: t || undefined, reason: params.reason },
  );
  return resp.data;
}

export async function approveMenuQuote(params: { requestId: string; token?: string; t?: string }): Promise<{ ok: true }> {
  const requestId = String(params.requestId || '').trim();
  const token = String(params.token || '').trim();
  const t = String(params.t || '').trim();
  const resp = await publicApiClient.post<{ ok: true }>(
    `/public/menu/quote/${encodeURIComponent(requestId)}/approve`,
    { token: token || undefined, t: t || undefined },
  );
  return resp.data;
}

export async function regenerateMenuLink(params: {
  requestId: string;
  aud: 'client' | 'owner';
  token?: string;
  t?: string;
}): Promise<{ aud: 'client' | 'owner'; token: string; expiresAt: string }> {
  const requestId = String(params.requestId || '').trim();
  const token = String(params.token || '').trim();
  const t = String(params.t || '').trim();
  const aud = params.aud;

  const resp = await publicApiClient.post<{ aud: 'client' | 'owner'; token: string; expiresAt: string }>(
    `/public/menu/link/${encodeURIComponent(requestId)}/regenerate`,
    { token: token || undefined, t: t || undefined },
    { params: { aud } },
  );
  return resp.data;
}
