/** D15D-05: publication of a reviewed QA draft is a DB state transition, never distribution. */
import { canReadDoohSchedules, type DoohScheduleSummary, type DoohScheduleTargetInventory } from './doohScheduleCatalogContract.ts';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validUuid = (value: unknown): value is string => typeof value === 'string' && uuid.test(value);
const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const validIso = (value: unknown): value is string => typeof value === 'string' && iso.test(value) && Number.isFinite(Date.parse(value));
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

export const canPublishDoohSchedule = (companyId: unknown, actualCompanyId: unknown, granted: unknown,
  mode: unknown, roles: readonly string[]) =>
  canReadDoohSchedules(companyId, actualCompanyId, granted, mode, roles) && mode === 'FULL';

export function buildSchedulePublishCas(schedule: DoohScheduleSummary,
  inventory: DoohScheduleTargetInventory) {
  if (schedule.status !== 'DRAFT' || schedule.publishedAt !== null ||
      !validUuid(schedule.id) || !validUuid(schedule.playlistVersionId) ||
      !validIso(schedule.updatedAt) || !validIso(schedule.createdAt) ||
      !validIso(schedule.startsAt) || !validIso(schedule.endsAt) ||
      Date.parse(schedule.startsAt) >= Date.parse(schedule.endsAt) ||
      inventory.scheduleId !== schedule.id || inventory.status !== 'DRAFT' ||
      inventory.updatedAt !== schedule.updatedAt || inventory.capped ||
      inventory.targets.length < 1 || inventory.targets.length !== schedule.targetCount ||
      inventory.targets.length > 100) return null;
  const seen = new Set<string>();
  for (const target of inventory.targets) {
    if (!validUuid(target.id) || !validUuid(target.targetId) || !validIso(target.createdAt) ||
        !['PLAYER', 'GROUP', 'MEDIA_UNIT', 'MEDIA_POINT'].includes(target.targetType) ||
        seen.has(target.id)) return null;
    seen.add(target.id);
  }
  return {
    expectedSchedule: {
      id: schedule.id, status: schedule.status, createdAt: schedule.createdAt, updatedAt: schedule.updatedAt,
      name: schedule.name, playlistVersionId: schedule.playlistVersionId, priority: schedule.priority,
      timezone: schedule.timezone, startsAt: schedule.startsAt, endsAt: schedule.endsAt,
      weekdays: [...schedule.weekdays], dailyStartMinute: schedule.dailyStartMinute,
      dailyEndMinute: schedule.dailyEndMinute, targetCount: schedule.targetCount,
    },
    expectedTargets: inventory.targets.map(({ id, targetType, targetId, createdAt }) => ({ id, targetType, targetId, createdAt })),
  };
}

export function publishSnapshotMatches(original: DoohScheduleSummary, next: DoohScheduleSummary,
  originalTargets: DoohScheduleTargetInventory, nextTargets: DoohScheduleTargetInventory): boolean {
  if (JSON.stringify(original) !== JSON.stringify(next)) return false;
  const snapshot = (inventory: DoohScheduleTargetInventory) => JSON.stringify({
    scheduleId: inventory.scheduleId, status: inventory.status, updatedAt: inventory.updatedAt,
    targets: [...inventory.targets].sort((a, b) => a.id.localeCompare(b.id)),
  });
  return snapshot(originalTargets) === snapshot(nextTargets);
}

export function parseSchedulePublishReceipt(input: unknown, schedule: DoohScheduleSummary) {
  const item = record(input);
  if (!item || item.scheduleId !== schedule.id || item.status !== 'PUBLISHED' ||
      item.alreadyPublished !== false || !validIso(item.publishedAt) ||
      Date.parse(item.publishedAt) < Date.parse(schedule.updatedAt) ||
      !Number.isSafeInteger(item.activePlayerCount) || (item.activePlayerCount as number) < 1 ||
      !Number.isSafeInteger(item.checkedSchedules) || (item.checkedSchedules as number) < 0) return null;
  return { publishedAt: item.publishedAt as string, activePlayerCount: item.activePlayerCount as number,
    checkedSchedules: item.checkedSchedules as number };
}
export function schedulePublishError(error: unknown): string {
  const status = record(record(error)?.response)?.status;
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 402 || status === 403) return 'Publicação de agendas bloqueada: QA não autorizado ou acesso insuficiente.';
  if (status === 404) return 'Agenda não encontrada nesta empresa.';
  if (status === 409) return 'Agenda, destinos ou conflitos alterados. Atualize, revise e tente novamente.';
  if (status === 429) return 'Muitas solicitações; aguarde antes de continuar.';
  if (typeof status === 'number' && status >= 500) return 'Publicação indisponível no momento; consulte o catálogo antes de tentar novamente.';
  return 'Não foi possível confirmar publicação. Consulte o estado da agenda antes de repetir.';
}
