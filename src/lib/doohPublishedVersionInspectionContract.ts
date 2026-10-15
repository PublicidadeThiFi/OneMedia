/** D15C-06 — projeção segura de uma versão de playlist já publicada.
 * Verificação estrutural APENAS: não recalcula SHA-256 (faltam checksums das mídias),
 * não consulta storage, não declara reprodução, audiência ou distribuição.
 */
import { playlistUuid, type DoohPlaylistVersionSummary } from './doohPlaylistCatalogContract.ts';

const asObject = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const isUuid = (value: unknown): value is string => typeof value === 'string' && playlistUuid.test(value);
const sha256 = /^[0-9a-f]{64}$/i;
const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const isDate = (value: unknown): value is string => typeof value === 'string' && iso.test(value) && Number.isFinite(Date.parse(value));
const isDuration = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= 86_400_000;

export interface PublishedPlaylistItem {
  id: string;
  mediaVersionId: string;
  position: number;
  durationMs: number;
}
export interface InspectedPublishedPlaylist {
  playlistId: string;
  versionId: string;
  version: number;
  checksumPrefix: string;
  publishedAt: string;
  items: PublishedPlaylistItem[];
  totalDurationMs: number;
}

/** A referência deve ser obtida de GET /dooh/playlists/:id sob o tenant autenticado. */
export function canInspectPublishedVersion(reference: DoohPlaylistVersionSummary | undefined): boolean {
  return Boolean(reference && isUuid(reference.id) && reference.status === 'PUBLISHED' &&
    Number.isSafeInteger(reference.version) && reference.version >= 1 &&
    typeof reference.checksumPrefix === 'string' && /^[a-f0-9]{12}$/i.test(reference.checksumPrefix) &&
    isDate(reference.publishedAt) && Number.isSafeInteger(reference.itemCount) &&
    reference.itemCount >= 1 && reference.itemCount <= 200);
}

/** Retorna APENAS campos operacionais; transition, metadata e outros campos da API são descartados. */
export function parseInspectedPublishedVersion(
  input: unknown, expectedPlaylistId: string, reference: DoohPlaylistVersionSummary,
): InspectedPublishedPlaylist | null {
  if (!isUuid(expectedPlaylistId) || !canInspectPublishedVersion(reference)) return null;
  const response = asObject(input);
  const published = asObject(response?.published);
  if (!response || response.playlistId !== expectedPlaylistId || !published ||
    published.id !== reference.id || published.version !== reference.version ||
    typeof published.checksum !== 'string' || !sha256.test(published.checksum) ||
    published.checksum.slice(0, 12).toLowerCase() !== reference.checksumPrefix!.toLowerCase() ||
    !isDate(published.publishedAt) || published.publishedAt !== reference.publishedAt ||
    !Array.isArray(response.items) || response.items.length !== reference.itemCount ||
    response.items.length > 200) return null;

  const seenIds = new Set<string>();
  const items: PublishedPlaylistItem[] = [];
  let totalDurationMs = 0;
  for (let index = 0; index < response.items.length; index += 1) {
    const item = asObject(response.items[index]);
    if (!item || !isUuid(item.id) || seenIds.has(item.id) ||
      !isUuid(item.mediaVersionId) || item.position !== index || !isDuration(item.durationMs)) return null;
    seenIds.add(item.id);
    totalDurationMs += item.durationMs;
    items.push({ id: item.id, mediaVersionId: item.mediaVersionId,
      position: index, durationMs: item.durationMs });
  }
  return { playlistId: expectedPlaylistId, versionId: published.id as string,
    version: reference.version, checksumPrefix: (published.checksum as string).slice(0, 12),
    publishedAt: published.publishedAt as string, items, totalDurationMs };
}

export function publishedInspectionError(error: unknown): string {
  const status = asObject(asObject(error)?.response)?.status;
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 402 || status === 403) return 'Permissão insuficiente para consultar versões publicadas.';
  if (status === 404) return 'Versão publicada indisponível nesta empresa. Atualize o histórico.';
  if (status === 429) return 'Limite temporário de consultas. Aguarde.';
  if (typeof status === 'number' && status >= 500) return 'Serviço de versões publicadas indisponível.';
  return 'Não foi possível consultar os itens publicados. Verifique a conexão.';
}
