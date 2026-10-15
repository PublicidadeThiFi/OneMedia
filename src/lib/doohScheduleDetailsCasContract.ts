/** D15D-03: form validation and full observed draft CAS, never publish or deliver. */
import { parseDoohSchedule, type DoohScheduleSummary, type DoohSchedulePriority } from './doohScheduleCatalogContract.ts';
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isoOffset = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const validId = (v: unknown): v is string => typeof v === 'string' && uuidRe.test(v);
const record = (v: unknown): Record<string, unknown> | null => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
const validInstant = (v: string): boolean => {
  if (!isoOffset.test(v) || !Number.isFinite(Date.parse(v))) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(v);
  if (!match) return false;
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return year >= 100 && month >= 1 && month <= 12 && day >= 1 && hour <= 23 && minute <= 59 && second <= 59 &&
    calendar.getUTCFullYear() === year && calendar.getUTCMonth() === month - 1 && calendar.getUTCDate() === day;
};
const validZone = (v: string): boolean => { try { new Intl.DateTimeFormat('en-US', { timeZone: v }); return true; } catch { return false; } };
export interface DoohScheduleDetailsForm {
  name: string; playlistVersionId: string; timezone: string; priority: DoohSchedulePriority;
  startsAt: string; endsAt: string; weekdays: number[];
  dailyStart: string; dailyEnd: string;
}
export interface DoohScheduleDetailsData {
  name: string; playlistVersionId: string; timezone: string; priority: DoohSchedulePriority;
  startsAt: string | null; endsAt: string | null; weekdays: number[];
  dailyStartMinute: number | null; dailyEndMinute: number | null;
}
export function canWriteDoohScheduleDetails(companyId: unknown, snapshotCompanyId: unknown,
  granted: unknown, mode: unknown, roles: readonly string[]): boolean {
  return validId(companyId) && companyId === snapshotCompanyId && granted === true && mode === 'FULL' &&
    roles.some(r => r === 'ADMINISTRATIVO' || r === 'TI');
}
const clock = (minute: number | null) => minute === null ? '' :
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
export function detailsFormFromSchedule(s: DoohScheduleSummary | null): DoohScheduleDetailsForm {
  return { name: s?.name ?? '', playlistVersionId: s?.playlistVersionId ?? '',
    timezone: s?.timezone ?? 'America/Sao_Paulo', priority: s?.priority ?? 'STANDARD',
    startsAt: s?.startsAt ?? '', endsAt: s?.endsAt ?? '', weekdays: s ? [...s.weekdays] : [],
    dailyStart: clock(s?.dailyStartMinute ?? null), dailyEnd: clock(s?.dailyEndMinute ?? null) };
}
const minutes = (value: string, end: boolean): number | null | undefined => {
  if (!value) return null;
  if (!/^\d{2}:\d{2}$/.test(value)) return undefined;
  const [hour, minute] = value.split(':').map(Number);
  const n = hour * 60 + minute;
  return minute > 59 || (end && hour === 24 && minute !== 0) || hour > (end ? 24 : 23) ||
    n < (end ? 1 : 0) ? undefined : n;
};
export function normalizeScheduleDetailsForm(form: DoohScheduleDetailsForm): DoohScheduleDetailsData | null {
  if (!form || typeof form !== 'object' || typeof form.name !== 'string' || typeof form.playlistVersionId !== 'string' ||
      typeof form.timezone !== 'string' || typeof form.startsAt !== 'string' || typeof form.endsAt !== 'string' ||
      typeof form.dailyStart !== 'string' || typeof form.dailyEnd !== 'string') return null;
  const name = form.name.trim(); const timezone = form.timezone.trim();
  if (!name || name.length > 160 || /[\x00-\x1f\x7f]/.test(name) || !validId(form.playlistVersionId.trim()) ||
      timezone.length === 0 || timezone.length > 64 || !validZone(timezone) ||
      !(['TAKEOVER', 'STANDARD', 'FALLBACK'] as string[]).includes(form.priority)) return null;
  const startsAt = form.startsAt.trim() || null, endsAt = form.endsAt.trim() || null;
  if ((startsAt !== null && !validInstant(startsAt)) || (endsAt !== null && !validInstant(endsAt)) ||
      (startsAt && endsAt && Date.parse(startsAt) >= Date.parse(endsAt))) return null;
  const dailyStartMinute = minutes(form.dailyStart.trim(), false);
  const dailyEndMinute = minutes(form.dailyEnd.trim(), true);
  if (dailyStartMinute === undefined || dailyEndMinute === undefined ||
      (dailyStartMinute === null) !== (dailyEndMinute === null) ||
      (dailyStartMinute !== null && dailyEndMinute !== null && dailyStartMinute >= dailyEndMinute)) return null;
  if (!Array.isArray(form.weekdays) || form.weekdays.length > 7 ||
      form.weekdays.some(d => !Number.isInteger(d) || d < 1 || d > 7) ||
      new Set(form.weekdays).size !== form.weekdays.length) return null;
  return { name, playlistVersionId: form.playlistVersionId.trim(), timezone, priority: form.priority,
    startsAt, endsAt, weekdays: [...form.weekdays].sort((a, b) => a - b), dailyStartMinute, dailyEndMinute };
}
export function scheduleDetailsEqual(a: DoohScheduleDetailsData, b: DoohScheduleDetailsData): boolean {
  return a.name === b.name && a.playlistVersionId === b.playlistVersionId && a.timezone === b.timezone &&
    a.priority === b.priority &&
    ((a.startsAt === null && b.startsAt === null) || (a.startsAt !== null && b.startsAt !== null && Date.parse(a.startsAt) === Date.parse(b.startsAt))) &&
    ((a.endsAt === null && b.endsAt === null) || (a.endsAt !== null && b.endsAt !== null && Date.parse(a.endsAt) === Date.parse(b.endsAt))) &&
    JSON.stringify(a.weekdays) === JSON.stringify(b.weekdays) &&
    a.dailyStartMinute === b.dailyStartMinute && a.dailyEndMinute === b.dailyEndMinute;
}
export function scheduleDetailsFromSummary(s: DoohScheduleSummary): DoohScheduleDetailsData {
  return { name: s.name, playlistVersionId: s.playlistVersionId, timezone: s.timezone, priority: s.priority,
    startsAt: s.startsAt, endsAt: s.endsAt, weekdays: s.weekdays, dailyStartMinute: s.dailyStartMinute,
    dailyEndMinute: s.dailyEndMinute };
}
export function buildScheduleDetailsCas(s: DoohScheduleSummary, form: DoohScheduleDetailsForm) {
  if (!s || s.status !== 'DRAFT') return null;
  const changes = normalizeScheduleDetailsForm(form);
  if (!changes || scheduleDetailsEqual(changes, scheduleDetailsFromSummary(s))) return null;
  // The server checks the full draft state and updatedAt in the same SERIALIZABLE transaction.
  return { expected: { updatedAt: s.updatedAt, ...scheduleDetailsFromSummary(s) }, changes };
}
export function scheduleDetailsSnapshotMatches(before: DoohScheduleSummary, fresh: DoohScheduleSummary): boolean {
  return before.id === fresh.id && JSON.stringify(before) === JSON.stringify(fresh);
}
/** Confirm just the intended field edits; target count and published state must be unchanged. */
export function parseScheduleDetailsReceipt(input: unknown, companyId: string, original: DoohScheduleSummary | null,
  wanted: DoohScheduleDetailsData, existingIds: readonly string[] = []): DoohScheduleSummary | null {
  const result = parseDoohSchedule(input, companyId);
  if (!result || result.status !== 'DRAFT' || result.publishedAt !== null ||
      !scheduleDetailsEqual(scheduleDetailsFromSummary(result), wanted)) return null;
  if (original) {
    if (result.id !== original.id || result.createdAt !== original.createdAt || result.targetCount !== original.targetCount ||
        Date.parse(result.updatedAt) < Date.parse(original.updatedAt)) return null;
  } else if (existingIds.includes(result.id) || result.targetCount !== 0) return null;
  return result;
}
export function doohScheduleDetailsError(error: unknown): string {
  const status = record(record(error)?.response)?.status;
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 402 || status === 403) return 'Edição de agendas exige acesso DOOH FULL e função técnica.';
  if (status === 404) return 'Agenda ou versão de playlist não encontrada nesta empresa.';
  if (status === 409) return 'Agenda, revisão ou playlist modificada ou protegida. Atualize antes de tentar novamente.';
  if (status === 429) return 'Muitas tentativas. Aguarde antes de continuar.';
  if (typeof status === 'number' && status >= 500) return 'Serviço de agendas temporariamente indisponível.';
  return 'Não foi possível salvar a agenda. Verifique a conexão e atualize o catálogo.';
}
