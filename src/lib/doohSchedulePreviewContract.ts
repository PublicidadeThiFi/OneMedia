/** D15D-04 — fail-closed projection of existing D6C1/D6C3 read-only previews.
 * Sampled timelines are NOT an interval-conflict proof, publish approval, manifest or PoP.
 */
import { canReadDoohSchedules, type DoohSchedulePriority, type DoohScheduleStatus } from './doohScheduleCatalogContract.ts';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OFFSET = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/;
const priorities = new Set(['TAKEOVER', 'STANDARD', 'FALLBACK']);
const statuses = new Set(['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED']);
const states = new Set(['READY', 'CONFLICT', 'NO_MATCH']);
const object = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const id = (value: unknown): value is string => typeof value === 'string' && ID.test(value);
const int = (value: unknown, min: number, max: number): value is number => Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max;
export { canReadDoohSchedules as canPreviewDoohSchedules };

export function normalizePreviewInstant(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const parts = OFFSET.exec(value.trim());
  if (!parts) return null;
  const [, yy, mm, dd, hh, mi, ss, fraction, offset] = parts;
  const [y, m, d, h, minute, second] = [yy, mm, dd, hh, mi, ss].map(Number);
  const wall = new Date(Date.UTC(y, m - 1, d, h, minute, second));
  const oh = offset === 'Z' ? 0 : Number(offset.slice(1, 3));
  const om = offset === 'Z' ? 0 : Number(offset.slice(4, 6));
  if (y < 100 || m < 1 || m > 12 || wall.getUTCFullYear() !== y || wall.getUTCMonth() !== m - 1 ||
      wall.getUTCDate() !== d || h > 23 || minute > 59 || second > 59 || oh > 23 || om > 59) return null;
  const epoch = Date.parse(value.trim());
  if (!Number.isFinite(epoch)) return null;
  const milliseconds = fraction ? Number(fraction.padEnd(3, '0')) : 0;
  const sign = offset.startsWith('-') ? -1 : 1;
  const computed = wall.getTime() + milliseconds - (offset === 'Z' ? 0 : sign * (oh * 60 + om) * 60_000);
  return epoch === computed ? new Date(epoch).toISOString() : null;
}

export type PreviewMode = 'instant' | 'timeline';
export interface PreviewRequest { playerId: string; draftScheduleId: string | null; at?: string; from?: string; to?: string; }
export function buildPreviewRequest(mode: PreviewMode, playerId: string, draftScheduleId: string, time: { at: string; from: string; to: string }, draftIds: readonly string[]): PreviewRequest | null {
  const player = playerId.trim(), draft = draftScheduleId.trim();
  if (!id(player) || (draft !== '' && (!id(draft) || !draftIds.includes(draft)))) return null;
  if (mode === 'instant') {
    const at = normalizePreviewInstant(time.at);
    return at ? { playerId: player, draftScheduleId: draft || null, at } : null;
  }
  if (mode !== 'timeline') return null;
  const from = normalizePreviewInstant(time.from), to = normalizePreviewInstant(time.to);
  if (!from || !to) return null;
  const diff = Date.parse(to) - Date.parse(from);
  if (diff <= 0 || diff > 86_400_000) return null;
  return { playerId: player, draftScheduleId: draft || null, from, to };
}
export interface PreviewSchedule { id: string; name: string; priority: DoohSchedulePriority; status: DoohScheduleStatus; playlistVersionId: string; }
export interface PreviewConflict { priority: DoohSchedulePriority; scheduleIds: string[]; }
export type PreviewStatus = 'READY' | 'NO_MATCH' | 'CONFLICT';
export interface InstantPreview { playerId: string; at: string; draftScheduleId: string | null; status: PreviewStatus; effective: PreviewSchedule | null; matchedSchedules: PreviewSchedule[]; conflicts: PreviewConflict[]; }
export interface PreviewSegment { from: string; to: string; status: PreviewStatus; effective: PreviewSchedule | null; conflicts: PreviewConflict[]; }
export interface TimelinePreview { playerId: string; from: string; to: string; draftScheduleId: string | null; resolution: 'SAMPLED_UTC_MINUTE'; authoritativeForPublication: false; samples: number; scannedScheduleEvaluations: number; segments: PreviewSegment[]; }

function parseSchedule(value: unknown): PreviewSchedule | null {
  const r = object(value);
  if (!r || !id(r.id) || !id(r.playlistVersionId) || typeof r.name !== 'string' || !r.name.trim() || r.name.length > 160 ||
      !priorities.has(String(r.priority)) || !statuses.has(String(r.status)) || !['DRAFT', 'PUBLISHED'].includes(String(r.status))) return null;
  return { id: r.id, name: r.name, priority: r.priority as DoohSchedulePriority, status: r.status as DoohScheduleStatus, playlistVersionId: r.playlistVersionId };
}
function parseConflicts(value: unknown, included?: readonly PreviewSchedule[]): PreviewConflict[] | null {
  if (!Array.isArray(value) || value.length > 3) return null;
  const seenPriorities = new Set<string>(), seenIds = new Set<string>();
  const result: PreviewConflict[] = [];
  for (const entry of value) {
    const row = object(entry);
    if (!row || !priorities.has(String(row.priority)) || seenPriorities.has(String(row.priority)) ||
        !Array.isArray(row.scheduleIds) || row.scheduleIds.length < 2 || row.scheduleIds.length > 200) return null;
    const ids: string[] = [];
    for (const item of row.scheduleIds) {
      if (!id(item) || seenIds.has(item) || (included && !included.some(s => s.id === item && s.priority === row.priority))) return null;
      seenIds.add(item); ids.push(item);
    }
    seenPriorities.add(String(row.priority));
    result.push({ priority: row.priority as DoohSchedulePriority, scheduleIds: ids });
  }
  return result;
}
function parseOutcome(row: Record<string, unknown>, included?: readonly PreviewSchedule[]) {
  if (!states.has(String(row.status))) return null;
  const effective = row.effective === null ? null : parseSchedule(row.effective);
  if (row.effective !== null && !effective) return null;
  const conflicts = parseConflicts(row.conflicts, included);
  if (!conflicts || (row.status === 'READY' && (!effective || conflicts.length !== 0)) ||
      (row.status === 'CONFLICT' && (effective !== null || conflicts.length === 0)) ||
      (row.status === 'NO_MATCH' && (effective !== null || conflicts.length !== 0))) return null;
  if (included && effective && !included.some(s => JSON.stringify(s) === JSON.stringify(effective))) return null;
  if (included && row.status === 'NO_MATCH' && included.length) return null;
  if (included && row.status === 'READY' && effective) {
    const rank: Record<string, number> = { TAKEOVER: 0, STANDARD: 1, FALLBACK: 2 };
    if (included.some(s => rank[s.priority] < rank[effective.priority])) return null;
  }
  return { status: row.status as PreviewStatus, effective, conflicts };
}
function corresponds(value: Record<string, unknown>, request: PreviewRequest, mode: PreviewMode): boolean {
  if (value.playerId !== request.playerId || value.draftScheduleId !== request.draftScheduleId) return false;
  return mode === 'instant' ? normalizePreviewInstant(value.at) === request.at :
    normalizePreviewInstant(value.from) === request.from && normalizePreviewInstant(value.to) === request.to;
}
export function parseInstantPreview(value: unknown, request: PreviewRequest): InstantPreview | null {
  const row = object(value);
  if (!row || !request.at || !corresponds(row, request, 'instant') || !Array.isArray(row.matchedSchedules) || row.matchedSchedules.length > 200) return null;
  const schedules: PreviewSchedule[] = [], seen = new Set<string>();
  for (const raw of row.matchedSchedules) {
    const s = parseSchedule(raw);
    if (!s || seen.has(s.id) || (s.status === 'DRAFT' && s.id !== request.draftScheduleId)) return null;
    seen.add(s.id); schedules.push(s);
  }
  const outcome = parseOutcome(row, schedules);
  if (!outcome || (outcome.status === 'CONFLICT' && outcome.conflicts.some(c => !c.scheduleIds.every(i => seen.has(i))))) return null;
  return { playerId: request.playerId, at: request.at, draftScheduleId: request.draftScheduleId, ...outcome, matchedSchedules: schedules };
}
export function parseTimelinePreview(value: unknown, request: PreviewRequest): TimelinePreview | null {
  const row = object(value);
  if (!row || !request.from || !request.to || !corresponds(row, request, 'timeline') ||
      row.resolution !== 'SAMPLED_UTC_MINUTE' || row.authoritativeForPublication !== false ||
      !int(row.samples, 1, 1441) || !int(row.scannedScheduleEvaluations, 0, 75_000) ||
      !Array.isArray(row.segments) || row.segments.length === 0 || row.segments.length > 1441 || row.segments.length > row.samples) return null;
  const fromMs = Date.parse(request.from), toMs = Date.parse(request.to);
  const expectedSamples = Math.ceil(toMs / 60_000) - Math.floor(fromMs / 60_000);
  if (row.samples !== expectedSamples) return null;
  const segments: PreviewSegment[] = [];
  let cursor = fromMs;
  for (const raw of row.segments) {
    const s = object(raw);
    if (!s) return null;
    const start = normalizePreviewInstant(s.from), end = normalizePreviewInstant(s.to);
    if (!start || !end || Date.parse(start) !== cursor || Date.parse(end) <= cursor || Date.parse(end) > toMs) return null;
    if (cursor !== fromMs && cursor % 60_000 !== 0) return null;
    const outcome = parseOutcome(s);
    if (!outcome || (outcome.effective?.status === 'DRAFT' && outcome.effective.id !== request.draftScheduleId)) return null;
    segments.push({ from: start, to: end, ...outcome });
    cursor = Date.parse(end);
  }
  if (cursor !== toMs) return null;
  return { playerId: request.playerId, from: request.from, to: request.to, draftScheduleId: request.draftScheduleId,
    resolution: 'SAMPLED_UTC_MINUTE', authoritativeForPublication: false,
    samples: row.samples, scannedScheduleEvaluations: row.scannedScheduleEvaluations, segments };
}
export function doohPreviewError(error: unknown): string {
  const status = object(object(error)?.response)?.status;
  if (status === 400) return 'Player ou período inválido. Informe UUID e datas ISO com offset.';
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 402 || status === 403) return 'Acesso DOOH insuficiente para consultar a prévia.';
  if (status === 404) return 'Player ativo ou rascunho não encontrado nesta empresa.';
  if (status === 409) return 'Prévia inconclusiva: houve mudança ou limite de processamento. Atualize os dados.';
  if (status === 429) return 'Limite de consultas atingido. Tente mais tarde.';
  if (typeof status === 'number' && status >= 500) return 'Serviço de prévia de agendas indisponível.';
  return 'Não foi possível consultar a prévia. Verifique sua conexão.';
}
