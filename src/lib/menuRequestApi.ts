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

export async function fetchMenuRequest(params: { requestId: string; token: string }): Promise<MenuRequestRecord> {
  const requestId = String(params.requestId || '').trim();
  const token = String(params.token || '').trim();

  const resp = await publicApiClient.get<MenuRequestRecord>(
    `/public/menu/request/${encodeURIComponent(requestId)}`,
    { params: { token } },
  );
  return resp.data;
}
