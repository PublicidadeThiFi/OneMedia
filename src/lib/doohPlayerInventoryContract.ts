/** D13L — Contrato e projeção mínima para GET /api/dooh/players.
 * O backend pode incluir installationId, credenciais e outros campos administrativos;
 * nunca reter o DTO bruto em estado React.
 */
export type DoohPlayerLifecycle = 'ACTIVE' | 'INACTIVE' | 'RETIRED';

export interface DoohPlayerInventoryItem {
  id: string;
  name: string;
  platform: string;
  lifecycleStatus: DoohPlayerLifecycle;
  online: boolean;
  lastSeenAt: string | null;
  appVersion: string | null;
  desiredManifestVersion: string;
  currentManifestVersion: string;
  currentAssignment: {
    id: string;
    mediaUnit: { id: string; label: string; unitType: string; isActive: boolean };
  } | null;
}
export interface DoohPlayerInventoryResponse {
  items: DoohPlayerInventoryItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number; offlineAfterSeconds: number };
}

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const safeInteger = (value: unknown, minimum: number) =>
  Number.isSafeInteger(value) && (value as number) >= minimum;
const lifecycle = (value: unknown): value is DoohPlayerLifecycle =>
  value === 'ACTIVE' || value === 'INACTIVE' || value === 'RETIRED';
const safeText = (value: unknown, max: number, nonempty = false): value is string =>
  typeof value === 'string' && value.length <= max && (!nonempty || value.trim().length > 0);
const timestampOrNull = (value: unknown): value is string | null => value === null ||
  (safeText(value, 64, true) && Number.isFinite(Date.parse(value)));
const version = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{1,20}$/.test(value);

/**
 * Projeção defensiva: aceita campos adicionais do backend, mas só devolve os
 * campos expressamente usados pela tela. Falha fechada ante um contrato inválido.
 */
export function parseDoohPlayerInventoryResponse(value: unknown): DoohPlayerInventoryResponse | null {
  if (!object(value) || !Array.isArray(value.items) || !object(value.meta)) return null;
  const m = value.meta;
  if (!safeInteger(m.page, 1) || !safeInteger(m.pageSize, 1) || (m.pageSize as number) > 100 ||
      !safeInteger(m.total, 0) || !safeInteger(m.totalPages, 1) ||
      !safeInteger(m.offlineAfterSeconds, 1) ||
      m.totalPages !== Math.max(1, Math.ceil((m.total as number) / (m.pageSize as number))) ||
      value.items.length > (m.pageSize as number) || value.items.length > (m.total as number)) return null;

  const ids = new Set<string>();
  const items: DoohPlayerInventoryItem[] = [];
  for (const raw of value.items) {
    if (!object(raw) || !safeText(raw.id, 128, true) || ids.has(raw.id) ||
        !safeText(raw.name, 256) || !safeText(raw.platform, 100) ||
        !lifecycle(raw.lifecycleStatus) || typeof raw.online !== 'boolean' ||
        (raw.online && raw.lifecycleStatus !== 'ACTIVE') ||
        !timestampOrNull(raw.lastSeenAt) ||
        (raw.appVersion !== null && !safeText(raw.appVersion, 100)) ||
        !version(raw.desiredManifestVersion) || !version(raw.currentManifestVersion)) return null;

    let currentAssignment: DoohPlayerInventoryItem['currentAssignment'] = null;
    if (raw.currentAssignment !== null) {
      if (!object(raw.currentAssignment) || !safeText(raw.currentAssignment.id, 128, true) ||
          !object(raw.currentAssignment.mediaUnit)) return null;
      const unit = raw.currentAssignment.mediaUnit;
      if (!safeText(unit.id, 128, true) || !safeText(unit.label, 256) ||
          !safeText(unit.unitType, 64) || typeof unit.isActive !== 'boolean') return null;
      currentAssignment = {
        id: raw.currentAssignment.id,
        mediaUnit: { id: unit.id, label: unit.label, unitType: unit.unitType, isActive: unit.isActive },
      };
    }
    ids.add(raw.id);
    items.push({
      id: raw.id,
      name: raw.name,
      platform: raw.platform,
      lifecycleStatus: raw.lifecycleStatus,
      online: raw.online,
      lastSeenAt: raw.lastSeenAt,
      appVersion: raw.appVersion,
      currentManifestVersion: raw.currentManifestVersion,
      desiredManifestVersion: raw.desiredManifestVersion,
      currentAssignment,
    });
  }
  return {
    items,
    meta: {
      page: m.page as number,
      pageSize: m.pageSize as number,
      total: m.total as number,
      totalPages: m.totalPages as number,
      offlineAfterSeconds: m.offlineAfterSeconds as number,
    },
  };
}

/** Mantido para compatibilidade com os testes/consumidores D13J. */
export function isDoohPlayerInventoryResponse(value: unknown): value is DoohPlayerInventoryResponse {
  return parseDoohPlayerInventoryResponse(value) !== null;
}

export function doohPlayerConnectionLabel(item: DoohPlayerInventoryItem): string {
  if (item.lifecycleStatus !== 'ACTIVE') return 'Não operacional';
  return item.online ? 'Heartbeat recente' : 'Sem heartbeat recente';
}

/** Versões divergentes são sinal técnico, nunca certificação de reprodução. */
export function doohPlayerManifestLabel(item: DoohPlayerInventoryItem): string {
  return item.currentManifestVersion === item.desiredManifestVersion
    ? `v${item.currentManifestVersion} · versões iguais`
    : `Atual v${item.currentManifestVersion} / desejada v${item.desiredManifestVersion}`;
}
