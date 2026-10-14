/** D15C-01: projeções estritamente de leitura do catálogo de playlists DOOH.
 * Não armazenar dados Prisma brutos, metadata, usuário publicador ou conteúdo.
 */
export const playlistUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isoDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const sha256 = /^[0-9a-f]{64}$/i;
const versionStatuses = new Set(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
const obj = (input: unknown): Record<string, unknown> | null => input !== null && typeof input === 'object' && !Array.isArray(input)
  ? input as Record<string, unknown> : null;
const uuid = (input: unknown): input is string => typeof input === 'string' && playlistUuid.test(input);
const date = (input: unknown): input is string => typeof input === 'string' && isoDate.test(input) && Number.isFinite(Date.parse(input));
const int = (input: unknown, min = 0): input is number => Number.isSafeInteger(input) && (input as number) >= min;

export type DoohPlaylistStatus = 'ACTIVE' | 'ARCHIVED';
export type DoohPlaylistVersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export interface DoohPlaylistSummary {
  id: string;
  name: string;
  status: DoohPlaylistStatus;
  currentVersion: number;
  versionCount: number;
  draftVersion: number | null;
  createdAt: string;
  updatedAt: string;
}
export interface DoohPlaylistVersionSummary {
  id: string;
  version: number;
  status: DoohPlaylistVersionStatus;
  checksumPrefix: string | null;
  publishedAt: string | null;
  createdAt: string;
  itemCount: number;
}
export interface DoohPlaylistDetail extends Omit<DoohPlaylistSummary, 'versionCount' | 'draftVersion'> {
  versions: DoohPlaylistVersionSummary[];
  totalVersions: number;
  versionsTruncated: boolean;
}

export function canReadDoohPlaylists(companyId: unknown, snapshotCompanyId: unknown,
  granted: unknown, accessMode: unknown, roles: readonly string[]): boolean {
  return uuid(companyId) && companyId === snapshotCompanyId && granted === true &&
    (accessMode === 'READ_ONLY' || accessMode === 'FULL') &&
    roles.some((role) => role === 'ADMINISTRATIVO' || role === 'TI');
}

function common(raw: Record<string, unknown>, companyId: string) {
  if (!uuid(raw.id) || raw.companyId !== companyId || typeof raw.name !== 'string' ||
      raw.name.trim() !== raw.name || !raw.name.trim() || raw.name.length > 160 ||
      (raw.status !== 'ACTIVE' && raw.status !== 'ARCHIVED') || !int(raw.currentVersion) ||
      !date(raw.createdAt) || !date(raw.updatedAt)) return null;
  return { id: raw.id, name: raw.name, status: raw.status as DoohPlaylistStatus,
    currentVersion: raw.currentVersion as number, createdAt: raw.createdAt, updatedAt: raw.updatedAt };
}

/** O backend retorna um array de até 100 playlists (sem total nem paginação). */
export function parseDoohPlaylistCatalog(input: unknown, companyId: string): DoohPlaylistSummary[] | null {
  if (!uuid(companyId) || !Array.isArray(input) || input.length > 100) return null;
  const ids = new Set<string>();
  const output: DoohPlaylistSummary[] = [];
  for (const row of input) {
    const raw = obj(row);
    const base = raw && common(raw, companyId);
    const count = raw && obj(raw._count);
    if (!base || ids.has(base.id) || !count || !int(count.versions) ||
        !Array.isArray(raw!.versions) || raw!.versions.length > 1) return null;
    const draft = (raw!.versions as unknown[])[0];
    let draftVersion: number | null = null;
    if (draft !== undefined) {
      const data = obj(draft);
      if (!data || !uuid(data.id) || data.status !== 'DRAFT' || !int(data.version, 1) ||
          !date(data.createdAt) || (count.versions as number) < 1) return null;
      draftVersion = data.version as number;
    }
    ids.add(base.id);
    output.push({ ...base, versionCount: count.versions as number, draftVersion });
  }
  return output;
}

/** O detalhe pode conter múltiplas versões; não transformar status em publicação ou exibição. */
export function parseDoohPlaylistDetail(input: unknown, companyId: string, selectedId: string): DoohPlaylistDetail | null {
  const raw = obj(input);
  const base = raw && common(raw, companyId);
  if (!base || base.id !== selectedId || !Array.isArray(raw!.versions) || raw!.versions.length > 500) return null;
  const seenIds = new Set<string>();
  const seenVersions = new Set<number>();
  const versions: DoohPlaylistVersionSummary[] = [];
  let lastVersion = Infinity;
  for (const row of raw!.versions as unknown[]) {
    const entry = obj(row);
    const count = entry && obj(entry._count);
    if (!entry || !uuid(entry.id) || seenIds.has(entry.id) || !int(entry.version, 1) ||
        seenVersions.has(entry.version as number) || (entry.version as number) >= lastVersion ||
        !versionStatuses.has(String(entry.status)) ||
        !(entry.checksum === null || (typeof entry.checksum === 'string' && sha256.test(entry.checksum))) ||
        !(entry.publishedAt === null || date(entry.publishedAt)) || !date(entry.createdAt) ||
        !count || !int(count.items)) return null;
    if (entry.status === 'DRAFT' && (entry.publishedAt !== null || entry.checksum !== null)) return null;
    if (entry.status === 'PUBLISHED' && (entry.publishedAt === null || entry.checksum === null)) return null;
    seenIds.add(entry.id);
    seenVersions.add(entry.version as number);
    lastVersion = entry.version as number;
    versions.push({ id: entry.id, version: entry.version as number,
      status: entry.status as DoohPlaylistVersionStatus,
      checksumPrefix: entry.checksum === null ? null : (entry.checksum as string).slice(0, 12),
      publishedAt: entry.publishedAt as string | null, createdAt: entry.createdAt as string,
      itemCount: count.items as number });
  }
  if (base.currentVersion > 0 && !versions.some((v) => v.version === base.currentVersion && v.status !== 'DRAFT')) return null;
  const draftCount = versions.filter((v) => v.status === 'DRAFT').length;
  if (draftCount > 1) return null;
  return { ...base, totalVersions: versions.length, versionsTruncated: versions.length > 50,
    versions: versions.slice(0, 50) };
}

export function doohPlaylistReadError(error: unknown): string {
  const status = obj(obj(error)?.response)?.status;
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 402 || status === 403) return 'Permissão insuficiente para consultar playlists DOOH.';
  if (status === 404) return 'Playlist não encontrada para a empresa atual.';
  if (status === 429) return 'Consultas temporariamente limitadas. Aguarde.';
  if (typeof status === 'number' && status >= 500) return 'Serviço de playlists indisponível.';
  return 'Não foi possível consultar as playlists DOOH. Verifique a conexão.';
}
