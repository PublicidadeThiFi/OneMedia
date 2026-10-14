/** D15A1-B05 — frontend only uses a minimal non-secret projection. */
import type { DoohPlayerInventoryItem } from './doohPlayerInventoryContract';
import type { PlayerCommandView } from './doohPlayerAuditContract';

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const uuid = (value: unknown): value is string => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const iso = (value: unknown): value is string => typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  Number.isFinite(Date.parse(value));

export type RestartReceipt = { commandId: string; status: PlayerCommandView['status']; idempotentReplay: boolean };
export function parseRestartReceipt(input: unknown, playerId: string): RestartReceipt | null {
  if (!uuid(playerId) || !object(input) || typeof input.idempotentReplay !== 'boolean' ||
      !object(input.command) || !uuid(input.command.id) || input.command.playerId !== playerId ||
      input.command.type !== 'RESTART' ||
      !['QUEUED', 'DELIVERED', 'ACKED', 'FAILED', 'EXPIRED'].includes(String(input.command.status)) ||
      !iso(input.command.requestedAt) || !iso(input.command.expiresAt)) return null;
  return { commandId: input.command.id, status: input.command.status as RestartReceipt['status'],
    idempotentReplay: input.idempotentReplay };
}

export function canRequestQaRestart(
  player: DoohPlayerInventoryItem | undefined,
  history: PlayerCommandView[] | null,
  access: { companyId: string | null; snapshotCompanyId: string | null;
    mode: string | undefined; granted: boolean | undefined; roles: readonly string[] | undefined },
  qaEnabled: boolean,
): boolean {
  return Boolean(qaEnabled && access.companyId && access.companyId === access.snapshotCompanyId &&
    access.granted && access.mode === 'FULL' &&
    access.roles?.some((r) => r === 'ADMINISTRATIVO' || r === 'TI') &&
    player && uuid(player.id) &&
    player.lifecycleStatus === 'ACTIVE' && player.online === true && history &&
    !history.some((command) => command.status === 'QUEUED' || command.status === 'DELIVERED'));
}

export function safeRestartError(error: unknown): string {
  const response = object(error) && object(error.response) ? error.response : null;
  if (response?.status === 401) return 'Sessão expirada. Entre novamente.';
  if ([402, 403].includes(Number(response?.status))) return 'Reinicialização não autorizada para esta empresa ou desabilitada no backend.';
  if (response?.status === 404) return 'Player não encontrado para esta empresa.';
  if (response?.status === 409) return 'Player indisponível ou estado divergente. Atualize o inventário.';
  if (response?.status === 429) return 'Operação temporariamente limitada. Aguarde.';
  return 'A API não confirmou o comando. Consulte o histórico antes de tentar novamente com a mesma chave.';
}
