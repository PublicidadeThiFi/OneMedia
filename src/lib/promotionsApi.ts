import apiClient from './apiClient';
import type { PromotionDiscountType, PromotionPayload, UnitType, Orientation } from '../types';

export type PromotionScope = 'POINT' | 'UNIT';

export type PromotionRecord = PromotionPayload & {
  companyId: string;
  createdAt: string;
  updatedAt: string;
  mediaPoint?: {
    id: string;
    name: string;
    addressCity?: string | null;
    addressState?: string | null;
  } | null;
  mediaUnit?: {
    id: string;
    label: string;
    unitType: UnitType;
    orientation?: Orientation | null;
    mediaPointId?: string | null;
  } | null;
};

export type PromotionsMeta = {
  points: {
    id: string;
    name: string;
    addressCity?: string | null;
    addressState?: string | null;
    showInMediaKit?: boolean;
    mediaUnits: {
      id: string;
      label: string;
      unitType: UnitType;
      orientation?: Orientation | null;
    }[];
  }[];
};

export async function fetchPromotionsMeta(): Promise<PromotionsMeta> {
  const resp = await apiClient.get<PromotionsMeta>('/promotions/meta');
  return resp.data;
}

export async function fetchPromotions(params?: {
  mediaPointId?: string;
  at?: string;
  showInMediaKit?: boolean;
}): Promise<PromotionRecord[]> {
  const resp = await apiClient.get<PromotionRecord[]>('/promotions', { params });
  return resp.data;
}

export async function createPromotion(payload: {
  scope: PromotionScope;
  mediaPointId: string;
  mediaUnitIds?: string[];
  discountType: PromotionDiscountType;
  discountValue: number;
  startsAt?: string;
  endsAt?: string;
  showInMediaKit?: boolean;
  showInOutsideProposals?: boolean;
}): Promise<{ created: PromotionRecord[] }> {
  const resp = await apiClient.post<{ created: PromotionRecord[] }>('/promotions', payload);
  return resp.data;
}

export async function updatePromotion(id: string, payload: Partial<{
  discountType: PromotionDiscountType;
  discountValue: number;
  startsAt: string | null;
  endsAt: string | null;
  showInMediaKit: boolean;
  showInOutsideProposals: boolean;
}>): Promise<PromotionRecord> {
  const resp = await apiClient.put<PromotionRecord>(`/promotions/${id}`, payload);
  return resp.data;
}

export async function deletePromotion(id: string): Promise<{ ok: true }> {
  const resp = await apiClient.delete<{ ok: true }>(`/promotions/${id}`);
  return resp.data;
}
