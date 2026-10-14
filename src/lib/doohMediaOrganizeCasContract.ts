/** D15B-03: safe non-destructive media rename/move. The server CAS is authoritative. */
import { parseDoohLibraryMedia, type DoohLibraryFolder, type DoohLibraryMedia } from './doohMediaLibraryContract.ts';
import { canWriteDoohFolders } from './doohFolderOperationsContract.ts';

export { canWriteDoohFolders as canOrganizeDoohMedia };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

export function normalizeDoohMediaName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name && name.length <= 160 && !/[\u0000-\u001f\u007f]/.test(name) ? name : null;
}

export function validDoohMediaDestination(target: string | null, folders: readonly DoohLibraryFolder[]): boolean {
  return target === null || (UUID.test(target) && folders.some((folder) => folder.id === target));
}

export function parseDoohMediaCasSnapshot(value: unknown, companyId: string,
  mediaId: string, folders: readonly DoohLibraryFolder[]): DoohLibraryMedia | null {
  const parsed = parseDoohLibraryMedia([value], companyId, 'all', folders);
  return UUID.test(mediaId) && parsed?.[0]?.id === mediaId ? parsed[0] : null;
}

export function unchangedDoohMediaSnapshot(original: DoohLibraryMedia, current: DoohLibraryMedia): boolean {
  return original.id === current.id && original.name === current.name &&
    original.folderId === current.folderId && original.updatedAt === current.updatedAt;
}

export function prepareDoohMediaCasPayload(original: DoohLibraryMedia, operation: 'rename' | 'move',
  newName: string, targetFolderId: string | null, folders: readonly DoohLibraryFolder[]) {
  if (!UUID.test(original.id) || !normalizeDoohMediaName(original.name) ||
      !validDoohMediaDestination(original.folderId, folders) ||
      !Number.isFinite(Date.parse(original.updatedAt))) return null;
  const common = {
    expectedName: original.name,
    expectedFolderId: original.folderId,
    expectedUpdatedAt: original.updatedAt,
  };
  if (operation === 'rename') {
    const name = normalizeDoohMediaName(newName);
    return name && name !== original.name ? { ...common, name } : null;
  }
  return validDoohMediaDestination(targetFolderId, folders) && targetFolderId !== original.folderId
    ? { ...common, folderId: targetFolderId } : null;
}

export function verifyDoohMediaCasResponse(value: unknown, companyId: string, original: DoohLibraryMedia,
  operation: 'rename' | 'move', expected: string | null, folders: readonly DoohLibraryFolder[]): boolean {
  const result = parseDoohMediaCasSnapshot(value, companyId, original.id, folders);
  // PostgreSQL may persist two updates in the same millisecond; the changed
  // name/folder is the authoritative postcondition, not a timestamp delta.
  if (!result) return false;
  if (operation === 'rename') return result.name === expected && result.folderId === original.folderId;
  return result.folderId === expected && result.name === original.name;
}

export function doohMediaOrganizeError(error: unknown): string {
  const status = asObject(asObject(error)?.response)?.status;
  if (status === 401) return 'Sua sessão expirou. Faça login novamente.';
  if (status === 402 || status === 403) return 'Seu acesso não permite reorganizar mídias DOOH.';
  if (status === 404) return 'Mídia ou pasta não encontrada na empresa atual. Atualize a Biblioteca.';
  if (status === 409) return 'Mídia modificada por outra operação. Atualize a Biblioteca antes de tentar novamente.';
  if (status === 400) return 'Dados inválidos para organização. Atualize o inventário e revise os campos.';
  if (status === 429) return 'Muitas solicitações. Aguarde antes de tentar novamente.';
  if (typeof status === 'number' && status >= 500 && status <= 599) return 'Serviço DOOH temporariamente indisponível.';
  return 'Não foi possível reorganizar a mídia. Verifique a conexão.';
}
