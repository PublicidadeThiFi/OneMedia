/** D15D-01 — catálogo de agendas DOOH estritamente de consulta.
 * Projeta campos operacionais mínimos; não transforma publicação em reprodução.
 */
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isoRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const record = (v: unknown): Record<string, unknown> | null => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
const uuid = (v: unknown): v is string => typeof v === 'string' && uuidRe.test(v);
const date = (v: unknown): v is string => typeof v === 'string' && isoRe.test(v) && Number.isFinite(Date.parse(v));
const nullableDate = (v: unknown): v is string | null => v === null || date(v);
const safeInt = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number => Number.isSafeInteger(v) && (v as number) >= min && (v as number) <= max;
const statuses = new Set(['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED']);
const priorities = new Set(['TAKEOVER', 'STANDARD', 'FALLBACK']);
const targetTypes = ['PLAYER', 'GROUP', 'MEDIA_UNIT', 'MEDIA_POINT'] as const;
export type DoohScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED';
export type DoohSchedulePriority = 'TAKEOVER' | 'STANDARD' | 'FALLBACK';
export type DoohScheduleTargetType = typeof targetTypes[number];
export interface DoohScheduleSummary {
  id: string; playlistVersionId: string; name: string; status: DoohScheduleStatus;
  priority: DoohSchedulePriority; timezone: string; startsAt: string | null;
  endsAt: string | null; weekdays: number[]; dailyStartMinute: number | null;
  dailyEndMinute: number | null; publishedAt: string | null;
  createdAt: string; updatedAt: string; targetCount: number;
}
export interface DoohScheduleTarget { id: string; targetType: DoohScheduleTargetType; targetId: string; createdAt: string; }
export interface DoohScheduleTargetInventory { scheduleId: string; status: DoohScheduleStatus; updatedAt: string; targets: DoohScheduleTarget[]; capped: boolean; }

export function canReadDoohSchedules(companyId: unknown, snapshotCompanyId: unknown, granted: unknown, accessMode: unknown, roles: readonly string[]) {
  return uuid(companyId) && companyId === snapshotCompanyId && granted === true &&
    (accessMode === 'FULL' || accessMode === 'READ_ONLY') &&
    roles.some((role) => role === 'ADMINISTRATIVO' || role === 'TI');
}

/** Respeita a projeção scheduleSelect do backend D6A (array de até 100 itens). */
export function parseDoohSchedule(input: unknown, companyId: string): DoohScheduleSummary | null {
  const row = record(input);
  const count = row && record(row._count);
  const weekdays = row && Array.isArray(row.weekdays) ? row.weekdays : null;
  if (!row || !uuid(companyId) || !uuid(row.id) || row.companyId !== companyId ||
      !uuid(row.playlistVersionId) || typeof row.name !== 'string' || !row.name.trim() ||
      row.name !== row.name.trim() || row.name.length > 160 ||
      !statuses.has(String(row.status)) || !priorities.has(String(row.priority)) ||
      typeof row.timezone !== 'string' || row.timezone.length > 64 || !row.timezone.trim() ||
      !nullableDate(row.startsAt) || !nullableDate(row.endsAt) ||
      !nullableDate(row.publishedAt) || !date(row.createdAt) || !date(row.updatedAt) ||
      !weekdays || weekdays.length > 7 ||
      weekdays.some((day, i) => !safeInt(day, 1, 7) || (i > 0 && day <= weekdays[i-1])) ||
      !(row.dailyStartMinute === null || safeInt(row.dailyStartMinute, 0, 1439)) ||
      !(row.dailyEndMinute === null || safeInt(row.dailyEndMinute, 1, 1440)) ||
      (row.dailyStartMinute === null) !== (row.dailyEndMinute === null) ||
      (row.dailyStartMinute !== null && row.dailyEndMinute !== null && (row.dailyStartMinute as number) >= (row.dailyEndMinute as number)) ||
      (row.startsAt !== null && row.endsAt !== null && Date.parse(row.startsAt as string) >= Date.parse(row.endsAt as string)) ||
      !count || !safeInt(count.targets, 0, 100)) return null;
  return {
    id: row.id, playlistVersionId: row.playlistVersionId as string,
    name: row.name as string, status: row.status as DoohScheduleStatus,
    priority: row.priority as DoohSchedulePriority, timezone: row.timezone as string,
    startsAt: row.startsAt as string | null, endsAt: row.endsAt as string | null,
    weekdays: [...weekdays] as number[],
    dailyStartMinute: row.dailyStartMinute as number | null,
    dailyEndMinute: row.dailyEndMinute as number | null,
    publishedAt: row.publishedAt as string | null,
    createdAt: row.createdAt as string, updatedAt: row.updatedAt as string,
    targetCount: count.targets as number,
  };
}

export function parseDoohScheduleCatalog(input: unknown, companyId: string): DoohScheduleSummary[] | null {
  if (!Array.isArray(input) || input.length > 100 || !uuid(companyId)) return null;
  const seen = new Set<string>();
  const result: DoohScheduleSummary[] = [];
  for (const raw of input) {
    const parsed = parseDoohSchedule(raw, companyId);
    if (!parsed || seen.has(parsed.id)) return null;
    seen.add(parsed.id);
    result.push(parsed);
  }
  return result;
}

/** GET /:id/targets devolve 0..100 destinos, sem expansão de grupos ou cálculo de exibição. */
export function parseDoohScheduleTargets(input: unknown, companyId: string, selected: DoohScheduleSummary): DoohScheduleTargetInventory | null {
  const row = record(input);
  if (!row || !uuid(companyId) || row.scheduleId !== selected.id || row.status !== selected.status ||
      !date(row.updatedAt) || row.updatedAt !== selected.updatedAt ||
      !Array.isArray(row.targets) || row.targets.length > 100 || row.targets.length !== selected.targetCount) return null;
  const ids = new Set<string>();
  const entries = new Set<string>();
  const targets: DoohScheduleTarget[] = [];
  const byType: Record<DoohScheduleTargetType, string> = {
    PLAYER: 'playerId', GROUP: 'groupId', MEDIA_UNIT: 'mediaUnitId', MEDIA_POINT: 'mediaPointId',
  };
  for (const raw of row.targets) {
    const v = record(raw);
    const type = v?.targetType as DoohScheduleTargetType;
    if (!v || !uuid(v.id) || ids.has(v.id) || v.companyId !== companyId || v.scheduleId !== selected.id ||
        !targetTypes.includes(type) || !date(v.createdAt)) return null;
    const field = byType[type];
    const targetId = v[field];
    if (!uuid(targetId) || targetTypes.some((otherType) => otherType !== type && v[byType[otherType]] !== null)) return null;
    const key = `${type}:${targetId.toLowerCase()}`;
    if (entries.has(key)) return null;
    ids.add(v.id); entries.add(key);
    targets.push({ id: v.id, targetType: type, targetId, createdAt: v.createdAt as string });
  }
  return { scheduleId: selected.id, status: selected.status, updatedAt: row.updatedAt as string,
    targets, capped: targets.length === 100 };
}

/** Mensagens fixas; nunca refletir payloads de erro. */
export function doohScheduleReadError(error: unknown): string {
  const status = record(record(error)?.response)?.status;
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 402 || status === 403) return 'Permissão insuficiente para consultar agendas DOOH.';
  if (status === 404) return 'Agenda não encontrada nesta empresa.';
  if (status === 429) return 'Consultas temporariamente limitadas. Aguarde.';
  if (typeof status === 'number' && status >= 500) return 'Serviço de agendas indisponível.';
  return 'Não foi possível consultar as agendas DOOH. Verifique a conexão.';
}
