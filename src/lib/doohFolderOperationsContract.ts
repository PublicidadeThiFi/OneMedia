/** D15B-02: validation/projection for non-destructive folder operations.
 * Backend DTOs remain authoritative. No raw server messages or secret fields in state.
 */
import type { DoohLibraryFolder } from './doohMediaLibraryContract';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const isUuid = (value: unknown): value is string => typeof value === 'string' && uuidPattern.test(value);

export function canWriteDoohFolders(
  userCompanyId: string | null | undefined,
  grantedCompanyId: string | null | undefined,
  granted: boolean | undefined,
  mode: string | null | undefined,
  roles: readonly string[],
): boolean {
  return isUuid(userCompanyId) && userCompanyId === grantedCompanyId &&
    granted === true && mode === 'FULL' &&
    roles.some((role) => role === 'ADMINISTRATIVO' || role === 'TI');
}

export function normalizeDoohFolderName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  if (!name || name.length > 120 || /[\u0000-\u001f\u007f]/.test(name)) return null;
  return name;
}

export function validDoohFolderTarget(
  parentId: string | null, folders: readonly DoohLibraryFolder[],
): boolean {
  return parentId === null || (isUuid(parentId) && folders.some((f) => f.id === parentId));
}

export function parseDoohFolderWriteResponse(
  value: unknown, companyId: string,
  operation: 'create' | 'rename',
  expected: { id?: string; name: string; parentId: string | null },
  folders: readonly DoohLibraryFolder[],
): DoohLibraryFolder | null {
  if (!isUuid(companyId) || !normalizeDoohFolderName(expected.name) ||
      !validDoohFolderTarget(expected.parentId, folders)) return null;
  const data = asRecord(value);
  const count = asRecord(data?._count);
  if (!data || !isUuid(data.id) || data.companyId !== companyId ||
      data.name !== expected.name || data.parentId !== expected.parentId || !count ||
      !Number.isSafeInteger(count.children) || Number(count.children) < 0 ||
      !Number.isSafeInteger(count.media) || Number(count.media) < 0) return null;
  if (operation === 'create') {
    if (folders.some((folder) => folder.id === data.id) || expected.id !== undefined) return null;
  } else {
    if (data.id !== expected.id || !folders.some((folder) => folder.id === expected.id && folder.parentId === expected.parentId)) return null;
  }
  const parent = folders.find((folder) => folder.id === expected.parentId);
  return {
    id: data.id, parentId: expected.parentId, name: expected.name,
    childrenCount: count.children as number, mediaCount: count.media as number,
    depth: parent ? parent.depth + 1 : 0,
  };
}

/** Fail closed if a folder was renamed or changed parent since the listing was loaded. */
export function isDoohFolderPreflightCurrent(
  response: unknown, companyId: string, selected: DoohLibraryFolder,
  folders: readonly DoohLibraryFolder[],
): boolean {
  const result = parseDoohFolderWriteResponse(response, companyId, 'rename', {
    id: selected.id, name: selected.name, parentId: selected.parentId,
  }, folders);
  return result !== null;
}

export function doohFolderWriteError(error: unknown): string {
  const status = asRecord(asRecord(error)?.response)?.status;
  if (status === 400) return 'Nome ou referência de pasta inválidos. Corrija os dados e tente novamente.';
  if (status === 401) return 'Sessão expirada. Entre novamente antes de alterar pastas.';
  if (status === 402 || status === 403) return 'Operação não autorizada para este usuário, empresa ou licença DOOH.';
  if (status === 404) return 'Pasta não encontrada. Atualize o inventário antes de tentar novamente.';
  if (status === 409) return 'Conflito de nome ou alteração concorrente. Atualize a Biblioteca antes de repetir.';
  if (status === 429) return 'Limite temporário de solicitações. Aguarde antes de tentar novamente.';
  if (typeof status === 'number' && status >= 500 && status <= 599)
    return 'Serviço da Biblioteca indisponível. Confira o resultado antes de repetir.';
  return 'Não foi possível confirmar a operação. Atualize e confira o estado antes de repetir.';
}
