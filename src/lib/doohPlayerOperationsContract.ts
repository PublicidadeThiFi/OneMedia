/** D15A1 — projeções restritas para gerenciamento de nomes e grupos DOOH.
 * Não propagar DTO administrativo, metadados, segredos ou payloads de erro da API.
 */
export interface DoohPlayerGroupSummary {
  id: string;
  name: string;
  memberCount: number;
  scheduleTargetCount: number;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizedOperationalName(value: string): string | null {
  const normalized = value.trim();
  return normalized.length >= 1 && normalized.length <= 120 ? normalized : null;
}

export function parseDoohPlayerGroups(value: unknown): DoohPlayerGroupSummary[] | null {
  if (!Array.isArray(value) || value.length > 5000) return null;
  const ids = new Set<string>();
  const result: DoohPlayerGroupSummary[] = [];
  for (const entry of value) {
    if (!record(entry) || typeof entry.id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entry.id) || ids.has(entry.id) ||
        typeof entry.name !== 'string' || !normalizedOperationalName(entry.name) ||
        !Number.isSafeInteger(entry.memberCount) || (entry.memberCount as number) < 0 ||
        !Number.isSafeInteger(entry.scheduleTargetCount) || (entry.scheduleTargetCount as number) < 0) return null;
    ids.add(entry.id);
    result.push({ id: entry.id, name: entry.name,
      memberCount: entry.memberCount as number,
      scheduleTargetCount: entry.scheduleTargetCount as number });
  }
  return result;
}

export function doohOperationalError(error: unknown): string {
  const response = record(record(error)?.response);
  switch (response?.status) {
    case 400: return 'Dados inválidos. Confira o nome e tente novamente.';
    case 401: return 'Sessão expirada. Entre novamente antes de continuar.';
    case 402:
    case 403: return 'Operação não autorizada para este usuário ou acesso DOOH.';
    case 404: return 'Registro não encontrado nesta empresa. Atualize a listagem.';
    case 409: return 'Conflito com o estado atual. Atualize a listagem e verifique duplicidades.';
    case 429: return 'Operação temporariamente limitada. Aguarde e tente novamente.';
    default:
      return typeof response?.status === 'number' && response.status >= 500
        ? 'Serviço temporariamente indisponível. Nenhuma confirmação de alteração foi recebida.'
        : 'A operação não pôde ser confirmada. Verifique sua conexão antes de repetir.';
  }
}

export function isOperationalWriteAllowed(
  companyId: string | null | undefined,
  snapshotCompanyId: string | null | undefined,
  mode: string | null | undefined,
  granted: boolean | undefined,
  roles: readonly string[] | undefined,
): boolean {
  return Boolean(companyId && snapshotCompanyId === companyId && granted && mode === 'FULL' &&
    roles?.some((role) => role === 'ADMINISTRATIVO' || role === 'TI'));
}
