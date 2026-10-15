/** D16A01. Strict projection of persisted manifest metadata; never accept payload JSON. */
import type { DoohPlayerDetailView } from './doohPlayerDetailContract';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA = /^[a-f0-9]{64}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX = 9223372036854775807n;
const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const validVersion = (value: unknown): value is string =>
  typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value) && value.length <= 19 && BigInt(value) <= MAX;
const stamp = (value: unknown): value is string => typeof value === 'string' && ISO.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

export interface DoohManifestInventoryView {
  latestRecordedVersion: string | null;
  desiredManifestVersion: string;
  currentManifestVersion: string;
  lifecycleStatus: 'ACTIVE' | 'INACTIVE' | 'RETIRED';
  hasMore: boolean;
  records: { version: string; checksumShort: string; publishedAt: string }[];
}

export function canReadManifestInventory(companyId: string, sessionCompanyId: string | null | undefined,
  grantCompanyId: string | null | undefined, granted: boolean | undefined, accessMode: string | undefined,
  roles: readonly string[]): boolean {
  return UUID.test(companyId) && companyId === sessionCompanyId && companyId === grantCompanyId && granted === true &&
    (accessMode === 'FULL' || accessMode === 'READ_ONLY') &&
    roles.some((role) => role === 'ADMINISTRATIVO' || role === 'TI');
}

export function parseDoohManifestInventory(raw: unknown, companyId: string,
  player: DoohPlayerDetailView): DoohManifestInventoryView | null {
  const row = object(raw);
  if (!row || !UUID.test(companyId) || !UUID.test(player.id) || row.companyId !== companyId ||
    row.playerId !== player.id || row.scope !== 'PERSISTED_METADATA_ONLY' ||
    row.payloadIntegrity !== 'NOT_CHECKED' || row.distribution !== 'NOT_CHECKED' ||
    row.playback !== 'NOT_CHECKED' || row.lifecycleStatus !== player.lifecycleStatus ||
    !validVersion(row.currentManifestVersion) || !validVersion(row.desiredManifestVersion) ||
    row.currentManifestVersion !== player.currentManifestVersion ||
    row.desiredManifestVersion !== player.desiredManifestVersion || row.limit !== 50 ||
    typeof row.hasMore !== 'boolean' || !Array.isArray(row.records) || row.records.length > 50 ||
    (row.hasMore && row.records.length !== 50) ||
    (row.latestRecordedVersion !== null && !validVersion(row.latestRecordedVersion))) return null;
  let prev: bigint | null = null;
  const records: DoohManifestInventoryView['records'] = [];
  for (const item of row.records) {
    const r = object(item);
    if (!r || !validVersion(r.version) || r.version === '0' || !SHA.test(String(r.checksum)) ||
      !stamp(r.publishedAt) || (prev !== null && BigInt(r.version) >= prev)) return null;
    prev = BigInt(r.version);
    records.push({ version: r.version, checksumShort: `${String(r.checksum).slice(0, 12)}…`,
      publishedAt: r.publishedAt });
  }
  if (row.latestRecordedVersion !== (records[0]?.version ?? null) ||
    (records.length === 0 && row.hasMore)) return null;
  return {
    lifecycleStatus: player.lifecycleStatus,
    latestRecordedVersion: row.latestRecordedVersion as string | null,
    currentManifestVersion: row.currentManifestVersion,
    desiredManifestVersion: row.desiredManifestVersion,
    hasMore: row.hasMore,
    records,
  };
}

export function manifestInventorySignals(data: DoohManifestInventoryView): string[] {
  const notices: string[] = [];
  if (!data.latestRecordedVersion) {
    notices.push('Nenhum snapshot persistido encontrado nos registros consultados.');
  } else if (data.latestRecordedVersion !== data.desiredManifestVersion) {
    notices.push('A versão mais recente registrada diverge da versão desejada pelo player.');
  }
  if (BigInt(data.currentManifestVersion) > BigInt(data.desiredManifestVersion)) {
    notices.push('Versão reportada pelo player maior que a desejada: revisar estado técnico.');
  } else if (data.currentManifestVersion !== data.desiredManifestVersion) {
    notices.push('Versões atual e desejada divergem: sem confirmação de sincronização.');
  } else if (data.currentManifestVersion !== '0') {
    notices.push('Versões numéricas coincidem, mas isso não comprova download, integridade ou reprodução.');
  }
  if (data.hasMore) notices.push('Há outros registros anteriores fora do limite de 50 versões.');
  if (data.lifecycleStatus !== 'ACTIVE') notices.push('Player inativo ou aposentado no cadastro; não inferir conectividade.');
  return notices;
}

export function manifestInventoryError(error: unknown): string {
  const status = object(object(error)?.response)?.status;
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 402 || status === 403) return 'Sem acesso técnico à consulta de manifests.';
  if (status === 404) return 'Player não encontrado nesta empresa ou rota indisponível na API.';
  if (status === 409) return 'Registro inconsistente. Solicite revisão do estado técnico.';
  if (status === 429) return 'Limite de consultas atingido. Aguarde.';
  return 'Não foi possível consultar o inventário de manifests.';
}
