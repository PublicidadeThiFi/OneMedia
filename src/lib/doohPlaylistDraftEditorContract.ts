/** D15C-03: visões mínimas para editar SOMENTE o draft; jamais publicar. */
import { playlistUuid } from './doohPlaylistCatalogContract.ts';

const obj = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const uuid = (value: unknown): value is string => typeof value === 'string' && playlistUuid.test(value);
const positive = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0 && (value as number) <= 86_400_000;
export interface PlaylistDraftItem { id: string; mediaVersionId: string; position: number; durationMs: number }
export interface PlaylistDraftSnapshot { playlistId: string; draftId: string; items: PlaylistDraftItem[] }
export interface PlaylistMediaOption { id: string; name: string }
export function canEditPlaylistDraft(companyId: unknown, accessCompanyId: unknown, granted: unknown, mode: unknown, roles: readonly string[]): boolean {
  return uuid(companyId) && companyId === accessCompanyId && granted === true && mode === 'FULL' &&
    roles.some((role) => role === 'ADMINISTRATIVO' || role === 'TI');
}
export function parsePlaylistDraft(input: unknown, playlistId: string): PlaylistDraftSnapshot | null {
  const raw = obj(input);
  if (!uuid(playlistId) || !raw || raw.playlistId !== playlistId || !uuid(raw.draftId) || !Array.isArray(raw.items) || raw.items.length > 200) return null;
  const ids = new Set<string>();
  const items: PlaylistDraftItem[] = [];
  for (const row of raw.items) {
    const item = obj(row);
    if (!item || !uuid(item.id) || ids.has(item.id) || !uuid(item.mediaVersionId) ||
        !Number.isSafeInteger(item.position) || item.position !== items.length || !positive(item.durationMs)) return null;
    ids.add(item.id);
    items.push({ id: item.id, mediaVersionId: item.mediaVersionId, position: item.position as number,
      durationMs: item.durationMs as number });
  }
  return { playlistId, draftId: raw.draftId as string, items };
}
export function draftStillCurrent(original: PlaylistDraftSnapshot, fresh: PlaylistDraftSnapshot): boolean {
  return original.playlistId === fresh.playlistId && original.draftId === fresh.draftId &&
    original.items.length === fresh.items.length && original.items.every((item, i) =>
      item.id === fresh.items[i].id && item.mediaVersionId === fresh.items[i].mediaVersionId &&
      item.position === fresh.items[i].position && item.durationMs === fresh.items[i].durationMs);
}
export function draftCasPayload(snapshot: PlaylistDraftSnapshot) {
  return { expectedDraftId: snapshot.draftId, expectedItemIds: snapshot.items.map((item) => item.id) };
}
/** Catálogo informativo de até 100 mídias, sem dados do storage, blobs ou chaves. */
export function parsePlaylistMediaOptions(input: unknown, companyId: string): PlaylistMediaOption[] | null {
  if (!uuid(companyId) || !Array.isArray(input) || input.length > 100) return null;
  const result: PlaylistMediaOption[] = [];
  const ids = new Set<string>();
  for (const row of input) {
    const item = obj(row);
    if (!item || !uuid(item.id) || item.companyId !== companyId || ids.has(item.id) ||
        typeof item.name !== 'string' || !item.name.trim() || item.name.length > 160) return null;
    ids.add(item.id);
    result.push({ id: item.id, name: item.name.trim() });
  }
  return result;
}
export function parseAddedDraftItem(input: unknown, snapshot: PlaylistDraftSnapshot, mediaVersionId: string, durationMs: number): boolean {
  const item = obj(input);
  return Boolean(item && uuid(item.id) && item.playlistVersionId === snapshot.draftId &&
    item.mediaVersionId === mediaVersionId && item.position === snapshot.items.length && item.durationMs === durationMs &&
    !snapshot.items.some((row) => row.id === item.id));
}
export function parseRemovedDraftItem(input: unknown, snapshot: PlaylistDraftSnapshot, itemId: string): boolean {
  const item = obj(input);
  return Boolean(item && item.success === true && item.draftId === snapshot.draftId &&
    item.removedItemId === itemId && item.remaining === snapshot.items.length - 1 &&
    snapshot.items.some((row) => row.id === itemId));
}
export function playlistDraftError(error: unknown): string {
  const response = obj(obj(error)?.response);
  const status = response?.status;
  if (status === 409) return 'O rascunho foi alterado por outra operação. Atualize e revise antes de tentar novamente.';
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 402 || status === 403) return 'Acesso DOOH insuficiente para editar o rascunho.';
  if (status === 404) return 'Playlist, item ou mídia não encontrado nesta empresa.';
  if (status === 400) return 'Operação recusada pela validação do servidor. Confira a versão e a duração.';
  if (status === 429) return 'Limite temporário de solicitações. Aguarde.';
  if (typeof status === 'number' && status >= 500) return 'Serviço DOOH indisponível. Verifique o estado antes de repetir a operação.';
  return 'Não foi possível concluir a operação. Atualize o rascunho antes de tentar novamente.';
}
