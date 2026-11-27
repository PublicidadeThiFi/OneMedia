/**
 * F11b — read-only playback report (D9B `GET /dooh/reports/summary`).
 * Counts are events REPORTED by the devices (proof of play), never a physical verification.
 */
export type DoohReportPeriod = 'today' | 'yesterday' | '7d';
export type DoohReportGroup = 'PLAYER' | 'MEDIA_VERSION' | 'DAY_UTC';
export type DoohReportResult = 'PLAYED' | 'INTERRUPTED' | 'FAILED' | 'OTHER';
export type DoohReportGroupRow = { groupKey: string; total: number; byResult: Record<DoohReportResult, number> };
export type DoohReportSummary = {
  from: string; to: string; groupBy: DoohReportGroup; total: number;
  byResult: Record<DoohReportResult, number>; groups: DoohReportGroupRow[]; generatedAt: string;
};

const RESULTS: readonly DoohReportResult[] = ['PLAYED', 'INTERRUPTED', 'FAILED', 'OTHER'];
const GROUPS: readonly DoohReportGroup[] = ['PLAYER', 'MEDIA_VERSION', 'DAY_UTC'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const obj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const count = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0;
const iso = (x: unknown): x is string => typeof x === 'string' && Number.isFinite(Date.parse(x));

/** Server limit is 7 days and `to` may not be in the future; both windows end "now". */
export function doohReportWindow(period: DoohReportPeriod, now: Date = new Date()): { from: string; to: string } {
  const to = new Date(Math.floor(now.getTime() / 1000) * 1000);
  if (period === 'yesterday') {
    // F12: the whole previous local day; it ends at today's local midnight (never in the future).
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  const from = period === 'today'
    ? new Date(to.getFullYear(), to.getMonth(), to.getDate())
    : new Date(to.getTime() - 7 * 86_400_000 + 60_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function doohReportParams(period: DoohReportPeriod, groupBy: DoohReportGroup, now: Date = new Date()) {
  const { from, to } = doohReportWindow(period, now);
  return { schemaVersion: '1', reportType: 'PLAYBACK_EVENTS_SUMMARY', timeBasis: 'PLAYER_STARTED_AT', from, to, groupBy };
}

function byResult(x: unknown): Record<DoohReportResult, number> | null {
  if (!obj(x)) return null;
  const out = {} as Record<DoohReportResult, number>;
  for (const key of RESULTS) { if (!count(x[key])) return null; out[key] = x[key] as number; }
  return out;
}

/** Strict: anything that does not look like the D9B summary for this company is rejected (null). */
export function parseDoohReportSummary(raw: unknown, companyId: string, groupBy: DoohReportGroup): DoohReportSummary | null {
  if (!obj(raw) || raw.schemaVersion !== 1 || raw.reportType !== 'PLAYBACK_EVENTS_SUMMARY' ||
      typeof raw.companyId !== 'string' || raw.companyId.toLowerCase() !== companyId.toLowerCase() ||
      raw.evidenceKind !== 'PLAYER_REPORTED' || raw.physicalDisplayVerified !== false ||
      raw.groupBy !== groupBy || !GROUPS.includes(raw.groupBy as DoohReportGroup) ||
      !obj(raw.window) || !iso(raw.window.from) || !iso(raw.window.to) || !iso(raw.generatedAt) ||
      !count(raw.totalPersisted) || !Array.isArray(raw.groups) || raw.groups.length > 10_000) return null;
  const totals = byResult(raw.byResult);
  if (!totals) return null;
  const groups: DoohReportGroupRow[] = [];
  for (const g of raw.groups) {
    if (!obj(g) || typeof g.groupKey !== 'string' || !count(g.totalPersisted)) return null;
    const key = g.groupKey;
    if (key !== 'UNASSIGNED' && (groupBy === 'DAY_UTC' ? !DAY.test(key) : !UUID.test(key))) return null;
    const r = byResult(g.byResult);
    if (!r) return null;
    groups.push({ groupKey: key, total: g.totalPersisted, byResult: r });
  }
  return { from: raw.window.from, to: raw.window.to, groupBy, total: raw.totalPersisted, byResult: totals,
    groups: groups.sort((a, b) => groupBy === 'DAY_UTC' ? a.groupKey.localeCompare(b.groupKey) : b.total - a.total),
    generatedAt: raw.generatedAt };
}

export const doohReportResultLabel: Record<DoohReportResult, string> = {
  PLAYED: 'Exibidas até o fim', INTERRUPTED: 'Interrompidas', FAILED: 'Com falha', OTHER: 'Outras',
};

export function doohReportDayLabel(day: string): string {
  const [y, m, d] = day.split('-');
  return `${d}/${m}/${y}`;
}

const csvCell = (value: string | number) => {
  const text = String(value);
  // Quote every text cell; neutralize spreadsheet formulas (=, +, -, @) in names.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return typeof value === 'number' ? text : `"${safe.replace(/"/g, '""')}"`;
};
const groupColumn: Record<DoohReportGroup, string> = { PLAYER: 'Tela', MEDIA_VERSION: 'Mídia', DAY_UTC: 'Dia (UTC)' };

/** F12: CSV of what is on screen (friendly names, never ids), separated by ";" for Excel in pt-BR. */
export function doohReportCsv(summary: DoohReportSummary, label: (key: string) => string): string {
  const header = [groupColumn[summary.groupBy], 'Total', doohReportResultLabel.PLAYED, doohReportResultLabel.INTERRUPTED,
    doohReportResultLabel.FAILED, doohReportResultLabel.OTHER].map(csvCell).join(';');
  const rows = summary.groups.map(g => [label(g.groupKey), g.total, g.byResult.PLAYED, g.byResult.INTERRUPTED,
    g.byResult.FAILED, g.byResult.OTHER].map(csvCell).join(';'));
  const total = ['Total do período', summary.total, summary.byResult.PLAYED, summary.byResult.INTERRUPTED,
    summary.byResult.FAILED, summary.byResult.OTHER].map(csvCell).join(';');
  return '\uFEFF' + [header, ...rows, total].join('\r\n') + '\r\n';
}

export function doohReportErrorText(code: string | undefined): string {
  if (code === 'DOOH_REPORT_WINDOW_INVALID') return 'Período inválido. Escolha até 7 dias.';
  if (code === 'DOOH_REPORT_TOO_MANY_GROUPS') return 'Há dados demais para este agrupamento. Escolha um período menor.';
  return 'Não foi possível carregar o relatório agora. Tente novamente em instantes.';
}
