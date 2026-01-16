import type { DrilldownCellValue, DrilldownRow, TimeseriesPoint } from './types';

export function formatCurrency(cents: number) {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function seedNumber(seed: string) {
  // tiny deterministic hash -> number
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function buildSpark(seed: number, len = 10) {
  const pts: number[] = [];
  let v = (seed % 40) + 20;
  for (let i = 0; i < len; i++) {
    const step = ((seed + i * 97) % 11) - 5;
    v = clamp(v + step, 5, 95);
    pts.push(v);
  }
  return pts;
}

export function normalizeText(v: string) {
  return (v || '').trim().toLowerCase();
}

export function includesNormalized(haystack: string, needle: string) {
  const h = normalizeText(haystack);
  const n = normalizeText(needle);
  if (!n) return true;
  return h.includes(n);
}

export function uniqById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

export function getRowField(row: DrilldownRow, key: string): DrilldownCellValue {
  if (key === 'id') return row.id;
  if (key === 'title') return row.title;
  if (key === 'subtitle') return row.subtitle;
  if (key === 'status') return row.status;
  if (key === 'amountCents') return row.amountCents;
  return row.fields ? row.fields[key] : undefined;
}

export function formatCell(value: DrilldownCellValue, kind?: 'currency' | 'percent' | 'datetime' | 'date'): string {
  if (value === null || value === undefined) return '—';
  if (kind === 'currency') return formatCurrency(Number(value) || 0);
  if (kind === 'percent') return `${Math.round(Number(value) || 0)}%`;
  if (kind === 'datetime') {
    const ms = Date.parse(String(value));
    if (!Number.isFinite(ms)) return String(value);
    return new Date(ms).toLocaleString('pt-BR');
  }
  if (kind === 'date') {
    const ms = Date.parse(String(value));
    if (!Number.isFinite(ms)) return String(value);
    return new Date(ms).toLocaleDateString('pt-BR');
  }
  return String(value);
}

export function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}

export function timeseriesToSpark(points: TimeseriesPoint[]) {
  const values = points.map((p) => (p?.valueCents ?? 0) / 100);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);
  return values.map((v) => {
    const n = ((v - min) / range) * 90 + 5;
    return Math.round(clamp(n, 5, 95));
  });
}
