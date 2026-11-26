/** UX10/F3A — public DTOs for the editable screen content, never a playback claim. */
import { playlistUuid } from './doohPlaylistCatalogContract.ts';
import type { PlaylistDraftSnapshot } from './doohPlaylistDraftEditorContract.ts';

const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const uuid = (value: unknown): value is string => typeof value === 'string' && playlistUuid.test(value);

export interface GuidedContentItem {
  id: string; mediaVersionId: string; position: number; durationMs: number;
  mediaName: string; mediaStatus: 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';
}
export interface GuidedContentDraft {
  screenId: string; playlistId: string | null; draftId: string | null; items: GuidedContentItem[];
}

export function parseGuidedContentCapabilities(raw: unknown): boolean | null {
  const data = object(raw);
  return data && typeof data.draftEnabled === 'boolean' ? data.draftEnabled : null;
}

export function parseGuidedContentDraft(raw: unknown, screenId: string): GuidedContentDraft | null {
  const data = object(raw);
  if (!uuid(screenId) || !data || data.screenId !== screenId || !Array.isArray(data.items) || data.items.length > 200) return null;
  if (data.playlistId === null && data.draftId === null && data.items.length === 0) {
    return { screenId, playlistId: null, draftId: null, items: [] };
  }
  if (!uuid(data.playlistId) || !uuid(data.draftId)) return null;
  const seen = new Set<string>();
  const statuses = new Set(['PENDING', 'PROCESSING', 'READY', 'ERROR']);
  const items: GuidedContentItem[] = [];
  for (const entry of data.items) {
    const item = object(entry);
    if (!item || !uuid(item.id) || seen.has(item.id) || !uuid(item.mediaVersionId) ||
        !Number.isSafeInteger(item.position) || item.position !== items.length ||
        !Number.isSafeInteger(item.durationMs) || Number(item.durationMs) < 1 || Number(item.durationMs) > 86_400_000 ||
        typeof item.mediaName !== 'string' || !item.mediaName.trim() || item.mediaName.length > 160 ||
        !statuses.has(String(item.mediaStatus))) return null;
    seen.add(item.id);
    items.push({
      id: item.id, mediaVersionId: item.mediaVersionId, position: item.position as number,
      durationMs: item.durationMs as number, mediaName: item.mediaName.trim(),
      mediaStatus: item.mediaStatus as GuidedContentItem['mediaStatus'],
    });
  }
  return { screenId, playlistId: data.playlistId, draftId: data.draftId, items };
}

export function guidedSnapshotToCas(snapshot: GuidedContentDraft): PlaylistDraftSnapshot | null {
  if (!snapshot.playlistId || !snapshot.draftId) return null;
  return { playlistId: snapshot.playlistId, draftId: snapshot.draftId, items: snapshot.items.map(({ id, mediaVersionId, position, durationMs }) =>
    ({ id, mediaVersionId, position, durationMs })) };
}

export function parseGuidedDraftCreation(raw: unknown, screenId: string): { playlistId: string; draftId: string } | null {
  const value = object(raw);
  return value && value.screenId === screenId && uuid(value.playlistId) && uuid(value.draftId) &&
    typeof value.created === 'boolean' ? { playlistId: value.playlistId, draftId: value.draftId } : null;
}

export function guidedContentError(error: unknown): string {
  const response = object(object(error)?.response);
  const status = response?.status;
  const code = object(response?.data)?.code;
  if (code === 'DOOH_GUIDED_DRAFT_DISABLED' || status === 503) return 'Esta função ainda não está habilitada para sua empresa.';
  if (code === 'DOOH_GUIDED_DRAFT_CONCURRENT_CHANGE' || status === 409) return 'O conteúdo foi alterado. Atualize a tela e revise antes de salvar novamente.';
  if (status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (status === 403 || status === 402) return 'Sua conta não tem permissão para editar o conteúdo desta tela.';
  if (status === 404) return 'Tela ou mídia não encontrada nesta empresa.';
  if (status === 429) return 'Muitas solicitações. Tente novamente depois.';
  return 'Não foi possível concluir a operação. Atualize para verificar o que foi salvo.';
}
