import type { PlayerGroupDetailView } from './doohPlayerAuditContract';
import type { DoohPlayerInventoryItem } from './doohPlayerInventoryContract';

const isV4 = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

/** No destructive multi-select: exactly one explicit addition/removal per operation. */
export function draftGroupMemberChange(
  group: PlayerGroupDetailView,
  operation: 'add' | 'remove',
  candidate: Pick<DoohPlayerInventoryItem, 'id' | 'lifecycleStatus'>,
): { expectedPlayerIds: string[]; playerIds: string[] } | null {
  if (!isV4(group.id) || group.scheduleTargetCount !== 0 || !isV4(candidate.id) ||
      group.members.length > 500 || group.members.some((member) => !isV4(member.id)) ||
      new Set(group.members.map((m) => m.id)).size !== group.members.length) return null;
  const current = group.members.map((member) => member.id).sort();
  const present = current.includes(candidate.id);
  if (operation === 'add' && (present || candidate.lifecycleStatus === 'RETIRED' || current.length >= 500)) return null;
  if (operation === 'remove' && !present) return null;
  return {
    expectedPlayerIds: current,
    playerIds: (operation === 'add' ? [...current, candidate.id] : current.filter((id) => id !== candidate.id)).sort(),
  };
}

export function isExpectedMembershipResult(input: unknown, groupId: string, expectedIds: string[]): boolean {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !isV4(groupId) ||
      !Array.isArray(expectedIds)) return false;
  const result = input as Record<string, unknown>;
  if (result.id !== groupId || !Array.isArray(result.members)) return false;
  const ids = result.members.map((member) => {
    if (!member || typeof member !== 'object' || Array.isArray(member)) return null;
    return (member as Record<string, unknown>).id;
  });
  return ids.length === expectedIds.length && ids.every(isV4) &&
    new Set(ids).size === ids.length && ids.every((id) => expectedIds.includes(id as string));
}

/** Never render error.data, authorization headers, URLs, user names, or response bodies. */
export function safeMembershipError(error: unknown): string {
  const status = error && typeof error === 'object' && 'response' in error &&
    error.response && typeof error.response === 'object' && 'status' in error.response
    ? Number(error.response.status) : null;
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 402 || status === 403) return 'Sem permissão ou licença FULL para modificar o grupo.';
  if (status === 404) return 'Operação protegida indisponível na API ou grupo inexistente. Não use o endpoint legado.';
  if (status === 409) return 'Conflito: grupo alterado, em uso por programação ou player indisponível. Atualize antes de repetir.';
  if (status === 400) return 'Dados de membros inválidos. Atualize antes de repetir.';
  return 'Operação não confirmada. Verifique o grupo novamente antes de tentar outra vez.';
}
