/** D13K: projeção mínima segura de GET /api/dooh/players/:id.
 * Campos técnicos sensíveis devolvidos pelo backend (installationId, metadata,
 * credentialHistory, assignedById) nunca são propagados ao componente.
 */
import type { DoohPlayerLifecycle } from './doohPlayerInventoryContract';

export interface DoohPlayerDetailView {
  id: string;
  name: string;
  platform: string;
  lifecycleStatus: DoohPlayerLifecycle;
  online: boolean;
  lastSeenAt: string | null;
  appVersion: string | null;
  currentManifestVersion: string;
  desiredManifestVersion: string;
  offlineAfterSeconds: number;
  screen: { name: string; point: string | null; active: boolean } | null;
  groups: string[];
  credentialActive: boolean;
  credentialLastUsedAt: string | null;
  manifestCount: number;
  playbackEventCount: number;
  commandCount: number;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function safeInt(value: unknown, min: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= min;
}
function timestamp(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value)));
}
function lifecycle(value: unknown): value is DoohPlayerLifecycle {
  return value === 'ACTIVE' || value === 'INACTIVE' || value === 'RETIRED';
}
function manifestVersion(value: unknown): value is string {
  return typeof value === 'string' && /^\d+$/.test(value);
}
function optionalString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

/** Incompatibilidade de contrato => null; nunca exibir resposta parcial. */
export function parseDoohPlayerDetail(value: unknown, expectedPlayerId: string): DoohPlayerDetailView | null {
  if (!record(value) || !expectedPlayerId || value.id !== expectedPlayerId ||
      typeof value.name !== 'string' || typeof value.platform !== 'string' ||
      !lifecycle(value.lifecycleStatus) || typeof value.online !== 'boolean' ||
      (value.online && value.lifecycleStatus !== 'ACTIVE') || !timestamp(value.lastSeenAt) ||
      !optionalString(value.appVersion) || !manifestVersion(value.currentManifestVersion) ||
      !manifestVersion(value.desiredManifestVersion) || !safeInt(value.offlineAfterSeconds, 1) ||
      !safeInt(value.manifestCount, 0) || !safeInt(value.playbackEventCount, 0) ||
      !safeInt(value.commandCount, 0) || !Array.isArray(value.groups) ||
      !record(value.credential) || typeof value.credential.active !== 'boolean' ||
      !timestamp(value.credential.lastUsedAt)) return null;

  const groupNames: string[] = [];
  for (const group of value.groups) {
    if (!record(group) || typeof group.id !== 'string' || typeof group.name !== 'string') return null;
    groupNames.push(group.name);
  }

  let screen: DoohPlayerDetailView['screen'] = null;
  if (value.currentAssignment !== null) {
    if (!record(value.currentAssignment) || !record(value.currentAssignment.mediaUnit)) return null;
    const unit = value.currentAssignment.mediaUnit;
    if (typeof unit.label !== 'string' || typeof unit.isActive !== 'boolean') return null;
    let point: string | null = null;
    if (unit.mediaPoint !== null && unit.mediaPoint !== undefined) {
      if (!record(unit.mediaPoint) || typeof unit.mediaPoint.name !== 'string') return null;
      point = unit.mediaPoint.name;
    }
    screen = { name: unit.label, point, active: unit.isActive };
  }

  return {
    id: expectedPlayerId,
    name: value.name,
    platform: value.platform,
    lifecycleStatus: value.lifecycleStatus,
    online: value.online,
    lastSeenAt: value.lastSeenAt,
    appVersion: value.appVersion,
    currentManifestVersion: value.currentManifestVersion,
    desiredManifestVersion: value.desiredManifestVersion,
    offlineAfterSeconds: value.offlineAfterSeconds,
    screen,
    groups: groupNames,
    credentialActive: value.credential.active,
    credentialLastUsedAt: value.credential.lastUsedAt,
    manifestCount: value.manifestCount,
    playbackEventCount: value.playbackEventCount,
    commandCount: value.commandCount,
  };
}

export function doohPlayerDetailSignals(player: DoohPlayerDetailView): string[] {
  const signals: string[] = [];
  if (player.lifecycleStatus === 'ACTIVE') {
    signals.push('Licença ACTIVE ocupada, mesmo quando offline.');
    if (!player.online) signals.push('Sem heartbeat recente: verificar conectividade; não indica desativação.');
    if (!player.screen) signals.push('Sem tela associada: verificar atribuição.');
  } else {
    signals.push('Player fora do ciclo ACTIVE; não contabilizar como licença ACTIVE.');
  }
  if (player.currentManifestVersion !== player.desiredManifestVersion) {
    signals.push('Versões de manifest divergentes; sincronização técnica pendente de verificação.');
  }
  if (player.screen && !player.screen.active) signals.push('A tela associada está inativa no cadastro.');
  return signals;
}
