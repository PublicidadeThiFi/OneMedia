/** D15C-02: operações de criação e renomeação CAS. Nunca publicar playlists aqui. */
import { canReadDoohPlaylists, parseDoohPlaylistDetail, playlistUuid,
  type DoohPlaylistDetail, type DoohPlaylistSummary } from './doohPlaylistCatalogContract.ts';

const object = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function canWriteDoohPlaylists(companyId: unknown, snapshotCompanyId: unknown,
  granted: unknown, mode: unknown, roles: readonly string[]): boolean {
  return mode === 'FULL' && canReadDoohPlaylists(companyId, snapshotCompanyId, granted, mode, roles);
}

export function normalizeDoohPlaylistName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name && name.length <= 160 && !/[\x00-\x1f\x7f]/.test(name) ? name : null;
}

export function validPlaylistSnapshot(entry: DoohPlaylistSummary | null | undefined): boolean {
  return Boolean(entry && playlistUuid.test(entry.id) && entry.status === 'ACTIVE' &&
    normalizeDoohPlaylistName(entry.name) === entry.name && iso.test(entry.updatedAt) &&
    Number.isFinite(Date.parse(entry.updatedAt)));
}

export function playlistSnapshotCurrent(previous: DoohPlaylistSummary, detail: DoohPlaylistDetail): boolean {
  return validPlaylistSnapshot(previous) && detail.id === previous.id &&
    detail.status === 'ACTIVE' && detail.name === previous.name &&
    detail.updatedAt === previous.updatedAt &&
    detail.currentVersion === previous.currentVersion;
}

export function parseDoohPlaylistCreated(input: unknown, companyId: string, expectedName: string,
  existingIds: readonly string[]): DoohPlaylistDetail | null {
  const raw = object(input);
  if (!raw || typeof raw.id !== 'string' || !playlistUuid.test(raw.id) || existingIds.includes(raw.id)) return null;
  const parsed = parseDoohPlaylistDetail(input, companyId, raw.id);
  return parsed && parsed.name === expectedName && parsed.status === 'ACTIVE' && parsed.currentVersion === 0 &&
    parsed.totalVersions === 1 && parsed.versions[0]?.status === 'DRAFT' &&
    parsed.versions[0]?.version === 1 && parsed.versions[0]?.itemCount === 0 ? parsed : null;
}

export function parseDoohPlaylistRenamed(input: unknown, companyId: string,
  before: DoohPlaylistSummary, expectedName: string): DoohPlaylistDetail | null {
  const parsed = parseDoohPlaylistDetail(input, companyId, before.id);
  return parsed && parsed.name === expectedName && parsed.status === 'ACTIVE' &&
    parsed.currentVersion === before.currentVersion ? parsed : null;
}

export function doohPlaylistWriteError(error: unknown): string {
  const status = object(object(error)?.response)?.status;
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 402 || status === 403) return 'Operação indisponível: acesso DOOH FULL necessário.';
  if (status === 404) return 'Playlist não encontrada nesta empresa.';
  if (status === 409) return 'A playlist mudou ou há conflito de gravação. Atualize o catálogo antes de tentar novamente.';
  if (status === 400 || status === 422) return 'Nome ou snapshot inválido. Revise os dados.';
  if (status === 429) return 'Muitas solicitações. Aguarde antes de tentar novamente.';
  if (typeof status === 'number' && status >= 500) return 'Serviço de playlists indisponível.';
  return 'Não foi possível salvar a playlist. Verifique a conexão.';
}
