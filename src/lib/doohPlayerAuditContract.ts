/** D15A1-B03 — projeções seguras para consultas operacionais.
 * Dados do dispositivo, installationId, nonce, result, actor/e-mail, token e metadados nunca entram no estado React.
 */
const isUuidV4 = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export type PlayerGroupMemberView = {
  id: string;
  name: string;
  lifecycleStatus: 'ACTIVE' | 'INACTIVE' | 'RETIRED';
  online: boolean;
  memberSince: string;
};
export type PlayerGroupDetailView = {
  id: string;
  name: string;
  scheduleTargetCount: number;
  members: PlayerGroupMemberView[];
};
export type PlayerCommandView = {
  id: string;
  type: 'RESTART';
  status: 'QUEUED' | 'DELIVERED' | 'ACKED' | 'FAILED' | 'EXPIRED';
  requestedAt: string;
  expiresAt: string;
};
const object = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v));
const validDate = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v));
const validName = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 120;

export function parsePlayerGroupDetail(input: unknown, groupId: string): PlayerGroupDetailView | null {
  if (!isUuidV4(groupId) || !object(input) || input.id !== groupId || !validName(input.name) ||
      !Number.isSafeInteger(input.scheduleTargetCount) || (input.scheduleTargetCount as number) < 0 ||
      !Array.isArray(input.members) || input.members.length > 500) return null;
  const seen = new Set<string>();
  const members: PlayerGroupMemberView[] = [];
  for (const item of input.members) {
    if (!object(item) || !isUuidV4(item.id) || seen.has(item.id) || !validName(item.name) ||
        !['ACTIVE', 'INACTIVE', 'RETIRED'].includes(String(item.lifecycleStatus)) ||
        typeof item.online !== 'boolean' || (item.online && item.lifecycleStatus !== 'ACTIVE') ||
        !validDate(item.memberSince)) return null;
    seen.add(item.id);
    members.push({ id: item.id, name: item.name, lifecycleStatus: item.lifecycleStatus as PlayerGroupMemberView['lifecycleStatus'],
      online: item.online, memberSince: item.memberSince });
  }
  return { id: groupId, name: input.name, scheduleTargetCount: input.scheduleTargetCount as number, members };
}

export function parsePlayerCommandHistory(input: unknown, playerId: string): PlayerCommandView[] | null {
  if (!isUuidV4(playerId) || !object(input) || !Array.isArray(input.items) || input.items.length > 50) return null;
  const seen = new Set<string>();
  const commands: PlayerCommandView[] = [];
  for (const item of input.items) {
    if (!object(item) || !isUuidV4(item.id) || seen.has(item.id) || item.playerId !== playerId ||
        item.type !== 'RESTART' || !['QUEUED', 'DELIVERED', 'ACKED', 'FAILED', 'EXPIRED'].includes(String(item.status)) ||
        !validDate(item.requestedAt) || !validDate(item.expiresAt)) return null;
    seen.add(item.id);
    commands.push({ id: item.id, type: 'RESTART', status: item.status as PlayerCommandView['status'],
      requestedAt: item.requestedAt, expiresAt: item.expiresAt });
  }
  return commands;
}

export function safeAuditReadError(error: unknown): string {
  const response = object(error) && object(error.response) ? error.response : null;
  if (response?.status === 401) return 'Sessão expirada. Entre novamente.';
  if ([402, 403].includes(Number(response?.status))) return 'Acesso insuficiente para consultar este recurso.';
  if (response?.status === 404) return 'Recurso não encontrado para esta empresa. Atualize a lista.';
  if (response?.status === 429) return 'Consultas temporariamente limitadas. Aguarde antes de repetir.';
  return 'Não foi possível confirmar os dados da API. Atualize e tente novamente.';
}
