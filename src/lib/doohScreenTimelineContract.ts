/** F12 — what the installed programming shows over the next hours (GET operational-screens/:id/timeline). */
export type ScreenTimelineSegment = { from: string; to: string; status: 'READY' | 'NO_MATCH'; items: { name: string | null; durationMs: number }[]; itemCount: number };
export type ScreenTimeline = { state: 'NO_DEVICE' | 'NOT_INSTALLED' | 'UNAVAILABLE' | 'INSTALLED'; observedAt: string; windowTo: string | null; segments: ScreenTimelineSegment[] };

const obj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const iso = (x: unknown): x is string => typeof x === 'string' && Number.isFinite(Date.parse(x));
const STATES = new Set(['NO_DEVICE', 'NOT_INSTALLED', 'UNAVAILABLE', 'INSTALLED']);

export function parseScreenTimeline(raw: unknown, screenId: string): ScreenTimeline | null {
  if (!obj(raw) || raw.screenId !== screenId || !iso(raw.observedAt) || typeof raw.state !== 'string' || !STATES.has(raw.state) ||
      !Array.isArray(raw.segments) || raw.segments.length > 48) return null;
  const segments: ScreenTimelineSegment[] = [];
  for (const s of raw.segments) {
    if (!obj(s) || !iso(s.from) || !iso(s.to) || Date.parse(s.to) <= Date.parse(s.from) ||
        (s.status !== 'READY' && s.status !== 'NO_MATCH') || !Array.isArray(s.items) || s.items.length > 20 ||
        typeof s.itemCount !== 'number' || !Number.isSafeInteger(s.itemCount) || s.itemCount < s.items.length) return null;
    const items: ScreenTimelineSegment['items'] = [];
    for (const i of s.items) {
      if (!obj(i) || (i.name !== null && typeof i.name !== 'string') || typeof i.durationMs !== 'number' || !Number.isSafeInteger(i.durationMs) || i.durationMs < 1) return null;
      items.push({ name: i.name as string | null, durationMs: i.durationMs });
    }
    segments.push({ from: s.from, to: s.to, status: s.status, items, itemCount: s.itemCount });
  }
  if (raw.state !== 'INSTALLED' && segments.length) return null;
  const windowTo = obj(raw.window) && iso(raw.window.to) ? raw.window.to : null;
  return { state: raw.state as ScreenTimeline['state'], observedAt: raw.observedAt, windowTo, segments };
}

const hhmm = (value: string) => new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dayDiff = (value: string, now: Date) => {
  const d = new Date(value); const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - a.getTime()) / 86_400_000);
};
/** "agora até 18:00", "18:00 até 08:00 (amanhã)". */
export function timelineRangeText(segment: ScreenTimelineSegment, now: Date = new Date()): string {
  const start = Date.parse(segment.from) <= now.getTime() ? 'Agora' : hhmm(segment.from);
  const tomorrow = dayDiff(segment.to, now) >= 1 ? ' (amanhã)' : '';
  return `${start} até ${hhmm(segment.to)}${tomorrow}`;
}
export function timelineContentText(segment: ScreenTimelineSegment): string {
  if (segment.status === 'NO_MATCH') return 'Nada programado neste horário';
  const names = segment.items.map(i => i.name ?? 'Mídia removida');
  const unique = [...new Set(names)];
  if (unique.length === 0) return `${segment.itemCount} mídia(s)`;
  return unique.length > 3 ? `${unique.slice(0, 3).join(', ')} e mais ${unique.length - 3}` : unique.join(', ');
}
export function timelineEmptyText(state: ScreenTimeline['state']): string {
  if (state === 'NO_DEVICE') return 'Conecte um aparelho para ver a programação.';
  if (state === 'NOT_INSTALLED') return 'O aparelho ainda não instalou nenhuma programação.';
  if (state === 'UNAVAILABLE') return 'Não foi possível conferir a programação instalada agora.';
  return 'Nada programado nas próximas horas.';
}
