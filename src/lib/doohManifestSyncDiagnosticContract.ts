/** D16A05 — strict, read-only projection. Reported version equality is NOT delivery proof. */
import type { DoohPlayerDetailView } from './doohPlayerDetailContract';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function canReadManifestSyncDiagnostic(companyId: string, sessionCompanyId: string | null | undefined,
  grantCompanyId: string | null | undefined, granted: boolean | undefined, accessMode: string | undefined,
  roles: readonly string[]): boolean {
  return UUID.test(companyId) && companyId === sessionCompanyId && companyId === grantCompanyId && granted === true &&
    (accessMode === 'FULL' || accessMode === 'READ_ONLY') &&
    roles.some((role) => role === 'ADMINISTRATIVO' || role === 'TI');
}
const VERSION = /^(0|[1-9]\d*)$/;
const MAX = 9223372036854775807n;
const STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const version = (value: unknown): value is string => typeof value === 'string' && VERSION.test(value) &&
  value.length <= 19 && BigInt(value) <= MAX;
const stamp = (value: unknown): value is string => typeof value === 'string' && STAMP.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
export type HeartbeatState = 'RECENT' | 'STALE' | 'NEVER' | 'NOT_ACTIVE' | 'CLOCK_SKEW';
export type VersionState = 'REPORTED_AHEAD' | 'REPORTED_BEHIND' | 'REPORTED_EQUAL' | 'NO_DESIRED_VERSION';
export interface ManifestSyncDiagnosticView {
  observedAt: string;
  lastSeenAt: string | null;
  lifecycleStatus: 'ACTIVE' | 'INACTIVE' | 'RETIRED';
  offlineAfterSeconds: number;
  currentManifestVersion: string;
  desiredManifestVersion: string;
  latestRecordedVersion: string | null;
  latestRecordedChecksumPrefix: string | null;
  heartbeatState: HeartbeatState;
  versionState: VersionState;
}
export function parseManifestSyncDiagnostic(raw: unknown, companyId: string,
  player: DoohPlayerDetailView): ManifestSyncDiagnosticView | null {
  const r = object(raw);
  if (!r || !UUID.test(companyId) || !UUID.test(player.id) || r.companyId !== companyId ||
    r.playerId !== player.id || r.scope !== 'TECHNICAL_SNAPSHOT_ONLY' ||
    r.versionSource !== 'PLAYER_HEARTBEAT_REPORT' || r.checksumSource !== 'STORED_METADATA' ||
    r.payloadIntegrity !== 'NOT_CHECKED' || r.distribution !== 'NOT_CHECKED' ||
    r.playback !== 'NOT_CHECKED' || r.lifecycleStatus !== player.lifecycleStatus ||
    !stamp(r.observedAt) || (r.lastSeenAt !== null && !stamp(r.lastSeenAt)) ||
    !Number.isSafeInteger(r.offlineAfterSeconds) || Number(r.offlineAfterSeconds) < 1 ||
    !version(r.currentManifestVersion) || !version(r.desiredManifestVersion) ||
    !version(player.currentManifestVersion) || !version(player.desiredManifestVersion) ||
    r.currentManifestVersion !== player.currentManifestVersion ||
    r.desiredManifestVersion !== player.desiredManifestVersion ||
    (r.latestRecordedVersion !== null && (!version(r.latestRecordedVersion) || r.latestRecordedVersion === '0')) ||
    ((r.latestRecordedVersion === null) !== (r.latestRecordedChecksumPrefix === null)) ||
    (r.latestRecordedChecksumPrefix !== null &&
      (typeof r.latestRecordedChecksumPrefix !== 'string' || !/^[a-f0-9]{12}$/.test(r.latestRecordedChecksumPrefix)))) return null;
  const sameHeartbeat = (r.lastSeenAt === null && player.lastSeenAt === null) ||
    (typeof r.lastSeenAt === 'string' && typeof player.lastSeenAt === 'string' &&
      Date.parse(r.lastSeenAt) === Date.parse(player.lastSeenAt));
  if (!sameHeartbeat) return null;
  const observed = Date.parse(r.observedAt as string);
  const seen = r.lastSeenAt === null ? null : Date.parse(r.lastSeenAt as string);
  const age = seen === null ? null : observed - seen;
  const heartbeat: HeartbeatState = r.lifecycleStatus !== 'ACTIVE' ? 'NOT_ACTIVE' :
    age === null ? 'NEVER' : age < -30000 ? 'CLOCK_SKEW' :
      age <= Number(r.offlineAfterSeconds) * 1000 ? 'RECENT' : 'STALE';
  const actual = BigInt(r.currentManifestVersion as string), desired = BigInt(r.desiredManifestVersion as string);
  const comparison: VersionState = actual > desired ? 'REPORTED_AHEAD' :
    actual < desired ? 'REPORTED_BEHIND' : desired === 0n ? 'NO_DESIRED_VERSION' : 'REPORTED_EQUAL';
  if (r.heartbeatState !== heartbeat || r.versionState !== comparison) return null;
  return {
    observedAt: r.observedAt as string, lastSeenAt: r.lastSeenAt as string | null,
    lifecycleStatus: player.lifecycleStatus, offlineAfterSeconds: r.offlineAfterSeconds as number,
    currentManifestVersion: r.currentManifestVersion as string,
    desiredManifestVersion: r.desiredManifestVersion as string,
    latestRecordedVersion: r.latestRecordedVersion as string | null,
    latestRecordedChecksumPrefix: r.latestRecordedChecksumPrefix as string | null,
    heartbeatState: heartbeat, versionState: comparison,
  };
}

export function manifestSyncSignals(view: ManifestSyncDiagnosticView): string[] {
  const result: string[] = [];
  const heartbeats: Record<HeartbeatState, string> = {
    RECENT: 'Heartbeat recente recebido. Isso não comprova download ou reprodução.',
    STALE: 'Heartbeat fora da janela esperada. Verificar conectividade sem alterar licença ACTIVE.',
    NEVER: 'Nenhum heartbeat disponível para diagnóstico.',
    NOT_ACTIVE: 'Player não está em ciclo ACTIVE. Não inferir conectividade operacional.',
    CLOCK_SKEW: 'Data do heartbeat à frente do relógio do servidor. Verificar relógios.',
  };
  result.push(heartbeats[view.heartbeatState]);
  const versions: Record<VersionState, string> = {
    REPORTED_AHEAD: 'Versão reportada maior que a desejada. Verificar consistência do estado.',
    REPORTED_BEHIND: 'Versão reportada inferior à desejada. Divergência técnica pendente.',
    REPORTED_EQUAL: 'Versões iguais no relato técnico. Não é confirmação de integridade, entrega ou exibição.',
    NO_DESIRED_VERSION: 'Não há versão desejada positiva; nenhuma sincronização pode ser afirmada.',
  };
  result.push(versions[view.versionState]);
  if (view.latestRecordedVersion === null) result.push('Nenhum manifest persistido encontrado para este player.');
  else if (view.latestRecordedVersion !== view.desiredManifestVersion)
    result.push('A última versão persistida diverge da versão desejada.');
  return result;
}

export function manifestSyncError(error: unknown): string {
  const status = object(object(error)?.response)?.status;
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 402 || status === 403) return 'Acesso técnico negado.';
  if (status === 404) return 'Player não encontrado nesta empresa ou rota indisponível.';
  if (status === 409) return 'Estado técnico inconsistente. Solicite revisão.';
  if (status === 429) return 'Limite de requisições. Aguarde.';
  return 'Não foi possível consultar o diagnóstico técnico.';
}
