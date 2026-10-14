/** D15B-01: projeções estritamente de leitura para Biblioteca DOOH.
 * A API entrega DTOs administrativos; não guardar nem renderizar objetos brutos.
 */
export interface DoohLibraryFolder {
  id: string;
  parentId: string | null;
  name: string;
  childrenCount: number;
  mediaCount: number;
  depth: number;
}

export type DoohLibraryStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';
export type DoohLibraryKind = 'IMAGE' | 'VIDEO' | 'PDF' | 'OTHER';

export interface DoohLibraryMedia {
  id: string;
  folderId: string | null;
  name: string;
  status: DoohLibraryStatus;
  kind: DoohLibraryKind;
  mimeType: string;
  bytes: string;
  durationMs: number | null;
  widthPx: number | null;
  heightPx: number | null;
  versionCount: number;
  createdAt: string;
}

export type DoohLibraryFolderFilter = 'all' | 'root' | string;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses = new Set(['PENDING', 'PROCESSING', 'READY', 'ERROR']);
const kinds = new Set(['IMAGE', 'VIDEO', 'PDF', 'OTHER']);
const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function uuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}
function validDate(value: unknown): value is string {
  return typeof value === 'string' && datePattern.test(value) && Number.isFinite(Date.parse(value));
}
function optionalPositive(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0);
}

export function parseDoohLibraryFolders(value: unknown, companyId: string): DoohLibraryFolder[] | null {
  if (!uuid(companyId) || !Array.isArray(value) || value.length > 5000) return null;
  const raw = new Map<string, Omit<DoohLibraryFolder, 'depth'>>();
  for (const entry of value) {
    const item = object(entry);
    const count = object(item?._count);
    if (!item || !uuid(item.id) || item.companyId !== companyId || raw.has(item.id) ||
        (item.parentId !== null && !uuid(item.parentId)) || item.parentId === item.id ||
        typeof item.name !== 'string' || item.name.trim() !== item.name ||
        !item.name || item.name.length > 120 || !count ||
        !Number.isSafeInteger(count.children) || Number(count.children) < 0 ||
        !Number.isSafeInteger(count.media) || Number(count.media) < 0) return null;
    raw.set(item.id, {
      id: item.id, parentId: item.parentId as string | null, name: item.name,
      childrenCount: count.children as number, mediaCount: count.media as number,
    });
  }
  const visiting = new Set<string>();
  const depths = new Map<string, number>();
  const getDepth = (id: string): number | null => {
    if (depths.has(id)) return depths.get(id)!;
    const item = raw.get(id);
    if (!item || visiting.has(id)) return null;
    visiting.add(id);
    const parentDepth = item.parentId === null ? -1 : getDepth(item.parentId);
    visiting.delete(id);
    if (parentDepth === null || parentDepth >= 100) return null;
    const depth = parentDepth + 1;
    depths.set(id, depth);
    return depth;
  };
  const result: DoohLibraryFolder[] = [];
  for (const item of raw.values()) {
    const depth = getDepth(item.id);
    if (depth === null) return null;
    result.push({ ...item, depth });
  }
  return result.sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export function parseDoohLibraryMedia(
  value: unknown,
  companyId: string,
  folderFilter: DoohLibraryFolderFilter,
  folders: readonly DoohLibraryFolder[],
): DoohLibraryMedia[] | null {
  if (!uuid(companyId) || !Array.isArray(value) || value.length > 100 ||
      !['all', 'root'].includes(folderFilter) && !folders.some((folder) => folder.id === folderFilter)) return null;
  const folderIds = new Set(folders.map((folder) => folder.id));
  const ids = new Set<string>();
  const result: DoohLibraryMedia[] = [];
  for (const entry of value) {
    const item = object(entry);
    const asset = object(item?.storedAsset);
    const count = object(item?._count);
    if (!item || !uuid(item.id) || ids.has(item.id) || item.companyId !== companyId ||
        (item.folderId !== null && (!uuid(item.folderId) || !folderIds.has(item.folderId))) ||
        (folderFilter === 'root' && item.folderId !== null) ||
        (folderFilter !== 'all' && folderFilter !== 'root' && item.folderId !== folderFilter) ||
        typeof item.name !== 'string' || !item.name.trim() || item.name.length > 160 ||
        !statuses.has(String(item.status)) || !asset || !kinds.has(String(asset.kind)) ||
        typeof asset.mimeType !== 'string' || asset.mimeType.length > 120 || !asset.mimeType ||
        typeof asset.bytes !== 'string' || !/^(0|[1-9]\d{0,19})$/.test(asset.bytes) ||
        !count || !Number.isSafeInteger(count.versions) || Number(count.versions) < 0 ||
        !optionalPositive(item.durationMs) || !optionalPositive(item.widthPx) ||
        !optionalPositive(item.heightPx) || !validDate(item.createdAt)) return null;
    ids.add(item.id);
    result.push({
      id: item.id, folderId: item.folderId as string | null, name: item.name.trim(),
      status: item.status as DoohLibraryStatus, kind: asset.kind as DoohLibraryKind,
      mimeType: asset.mimeType, bytes: asset.bytes,
      durationMs: item.durationMs as number | null,
      widthPx: item.widthPx as number | null,
      heightPx: item.heightPx as number | null,
      versionCount: count.versions as number, createdAt: item.createdAt,
    });
  }
  return result;
}

export function doohLibraryReadError(error: unknown): string {
  const status = object(object(error)?.response)?.status;
  if (status === 401) return 'Sessão expirada. Entre novamente para consultar a Biblioteca DOOH.';
  if (status === 402 || status === 403) return 'Consulta não autorizada para este usuário, empresa ou acesso DOOH.';
  if (status === 404) return 'Biblioteca ou pasta não encontrada nesta empresa. Atualize os filtros.';
  if (status === 429) return 'Consultas temporariamente limitadas. Aguarde e tente novamente.';
  if (typeof status === 'number' && status >= 500 && status <= 599)
    return 'Serviço de Biblioteca DOOH temporariamente indisponível.';
  return 'Não foi possível consultar a Biblioteca DOOH. Verifique a conexão.';
}

export function displayDoohMediaSize(bytes: string): string {
  const integer = BigInt(bytes);
  if (integer < 1024n) return `${integer.toString()} B`;
  const mb = Number(integer) / (1024 * 1024);
  if (mb < 1) return `${(Number(integer) / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KiB`;
  return `${mb.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MiB`;
}
