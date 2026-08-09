import apiClient, { publicApiClient } from '../../lib/apiClient';
import type { MediaKitShare, PublicMediaMap, ShareRegion, ShareVisibility } from './types';

export type CreateMediaKitShareInput =
  | { scopeType: 'ALL'; regions: []; visibility: ShareVisibility }
  | { scopeType: 'REGIONS'; regions: ShareRegion[]; visibility: ShareVisibility };

export async function listMediaKitShares(): Promise<MediaKitShare[]> {
  const response = await apiClient.get<MediaKitShare[]>('/media-kit-shares');
  return response.data;
}

export async function listMediaKitShareRegions(): Promise<ShareRegion[]> {
  const response = await apiClient.get<ShareRegion[]>('/media-kit-shares/regions');
  return response.data;
}

export async function createMediaKitShare(
  input: CreateMediaKitShareInput,
): Promise<MediaKitShare & { url: string }> {
  const response = await apiClient.post<MediaKitShare & { url: string }>(
    '/media-kit-shares',
    input,
  );
  return response.data;
}

export async function revokeMediaKitShare(id: string): Promise<MediaKitShare> {
  const response = await apiClient.post<MediaKitShare>(
    `/media-kit-shares/${encodeURIComponent(id)}/revoke`,
  );
  return response.data;
}

export async function deleteMediaKitShare(id: string): Promise<{ deleted: true }> {
  const response = await apiClient.delete<{ deleted: true }>(
    `/media-kit-shares/${encodeURIComponent(id)}`,
  );
  return response.data;
}

export async function regenerateMediaKitShare(
  id: string,
): Promise<MediaKitShare & { url: string }> {
  const response = await apiClient.post<MediaKitShare & { url: string }>(
    `/media-kit-shares/${encodeURIComponent(id)}/regenerate`,
  );
  return response.data;
}

export async function fetchPublicMediaMap(token: string): Promise<PublicMediaMap> {
  const response = await publicApiClient.get<PublicMediaMap>(
    `/public/media-map/${encodeURIComponent(token)}`,
  );
  return response.data;
}
