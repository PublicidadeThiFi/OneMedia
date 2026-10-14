/** D15C-04: projeções locais de reordenação do draft; sem mutação de versões publicadas. */
import { playlistUuid } from './doohPlaylistCatalogContract.ts';
import type { PlaylistDraftSnapshot } from './doohPlaylistDraftEditorContract.ts';

const uuid = (value: unknown): value is string => typeof value === 'string' && playlistUuid.test(value);
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

export function draftOrder(snapshot: PlaylistDraftSnapshot): string[] {
  return snapshot.items.map((item) => item.id);
}

/** No browser-supplied IDs are invented: a complete one-to-one permutation is required. */
export function validDraftOrder(snapshot: PlaylistDraftSnapshot, proposed: readonly string[]): boolean {
  const original = draftOrder(snapshot);
  return proposed.length === original.length && proposed.length <= 200 &&
    proposed.every((id) => uuid(id) && original.includes(id)) && new Set(proposed).size === original.length;
}

export function draftOrderChanged(snapshot: PlaylistDraftSnapshot, proposed: readonly string[]): boolean {
  return validDraftOrder(snapshot, proposed) && proposed.some((id, index) => id !== snapshot.items[index].id);
}

/** Up/down controls avoid implicit drag persistence. Movement is purely local. */
export function shiftDraftItem(snapshot: PlaylistDraftSnapshot, current: readonly string[], id: string, offset: -1 | 1): string[] | null {
  if (!validDraftOrder(snapshot, current) || !uuid(id)) return null;
  const index = current.indexOf(id);
  if (index < 0 || index + offset < 0 || index + offset >= current.length) return null;
  const updated = [...current];
  [updated[index], updated[index + offset]] = [updated[index + offset], updated[index]];
  return updated;
}

export function reorderCasRequest(snapshot: PlaylistDraftSnapshot, proposed: readonly string[]) {
  if (!draftOrderChanged(snapshot, proposed)) return null;
  return { expectedDraftId: snapshot.draftId, expectedItemIds: draftOrder(snapshot), itemIds: [...proposed] };
}

export function parseReorderConfirmation(response: unknown, snapshot: PlaylistDraftSnapshot, proposed: readonly string[]): boolean {
  const raw = record(response);
  return Boolean(raw && raw.success === true && raw.changed === true && raw.draftId === snapshot.draftId &&
    raw.count === proposed.length && draftOrderChanged(snapshot, proposed));
}
