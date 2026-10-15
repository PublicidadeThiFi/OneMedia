/** D15C-05 — review before an immutable, QA-only playlist version publication. */
import { playlistUuid } from './doohPlaylistCatalogContract.ts';
import type { PlaylistDraftSnapshot } from './doohPlaylistDraftEditorContract.ts';

const obj = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
const iso = (v: unknown): v is string => typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v));
const sha = /^[a-f0-9]{64}$/i;

export function publishReviewReady(draft: PlaylistDraftSnapshot | null): boolean {
  return Boolean(draft && playlistUuid.test(draft.playlistId) && playlistUuid.test(draft.draftId) &&
    draft.items.length > 0 && draft.items.length <= 200 && draft.items.every((it, i) =>
      playlistUuid.test(it.id) && playlistUuid.test(it.mediaVersionId) && it.position === i &&
      Number.isSafeInteger(it.durationMs) && it.durationMs >= 1 && it.durationMs <= 86_400_000));
}
export function publishCasPayload(draft: PlaylistDraftSnapshot | null) {
  if (!publishReviewReady(draft) || !draft) return null;
  return { expectedDraftId: draft.draftId, expectedItems: draft.items.map((it) =>
    ({ id: it.id, mediaVersionId: it.mediaVersionId, position: it.position, durationMs: it.durationMs })) };
}
export function parsePlaylistPublished(input: unknown, draft: PlaylistDraftSnapshot, currentVersion: number):
  { publishedVersion: number; nextDraftId: string; checksumPrefix: string; alreadyPublished: boolean } | null {
  const raw = obj(input), p = obj(raw?.published), next = obj(raw?.nextDraft);
  if (!raw || raw.playlistId !== draft.playlistId || !p || !next || p.id !== draft.draftId ||
      !Number.isSafeInteger(p.version) || p.version !== currentVersion + 1 || !sha.test(String(p.checksum)) ||
      !iso(p.publishedAt) || !playlistUuid.test(String(next.id)) || next.id === draft.draftId ||
      next.version !== (p.version as number) + 1 || typeof raw.alreadyPublished !== 'boolean') return null;
  return { publishedVersion: p.version as number, nextDraftId: next.id as string,
    checksumPrefix: (p.checksum as string).slice(0, 12), alreadyPublished: raw.alreadyPublished };
}
export function playlistPublishError(error: unknown): string {
  const status = obj(obj(error)?.response)?.status;
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 402 || status === 403) return 'Publicação QA não autorizada ou acesso DOOH insuficiente.';
  if (status === 404) return 'Playlist não encontrada nesta empresa.';
  if (status === 409) return 'O rascunho mudou ou contém mídia indisponível. Atualize e revise antes de publicar.';
  if (status === 400 || status === 422) return 'Snapshot de publicação inválido. Revise a composição.';
  if (status === 429) return 'Limite temporário de solicitações. Aguarde.';
  if (typeof status === 'number' && status >= 500) return 'Resultado indeterminado. Consulte o histórico antes de repetir a publicação.';
  return 'Publicação não confirmada. Consulte o histórico antes de tentar novamente.';
}
