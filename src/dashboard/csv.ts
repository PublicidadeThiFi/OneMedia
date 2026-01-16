import { toast } from 'sonner';
import type { AgingBucket, DrilldownRow, TimeseriesPoint } from './types';
import type { DrilldownColumnSpec } from './drilldownSpec';
import { formatCell, formatCurrency } from './utils';

export function escapeCsvValue(value: unknown) {
  const s = String(value ?? '');
  if (/([\n\r";,])/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportDrilldownCsv(label: string, rows: DrilldownRow[], columns?: DrilldownColumnSpec[]) {
  const cols = (columns || [
    { id: 'id', label: 'id', get: (r: DrilldownRow) => r.id },
    { id: 'title', label: 'item', get: (r: DrilldownRow) => r.title },
    { id: 'subtitle', label: 'cidade', get: (r: DrilldownRow) => r.subtitle },
    { id: 'status', label: 'status', get: (r: DrilldownRow) => r.status },
    { id: 'amountCents', label: 'valor', get: (r: DrilldownRow) => r.amountCents },
  ]).filter((c) => c.csv !== false);

  const header = cols.map((c) => c.label);
  const lines = [header.map(escapeCsvValue).join(';')];

  for (const r of rows) {
    const values = cols.map((c) => {
      const v = c.get(r);
      // tenta manter valores amigáveis para planilha
      if (c.id === 'amountCents') return formatCell(v, 'currency');
      if (c.id.toLowerCase().includes('percent')) return formatCell(v, 'percent');
      if (c.id === 'lastSeen') return formatCell(v, 'datetime');
      if (c.id === 'dueDate') return formatCell(v, 'date');
      return formatCell(v);
    });
    lines.push(values.map(escapeCsvValue).join(';'));
  }

  const safe = label.replace(/[^a-z0-9\-\_]+/gi, '_').slice(0, 40);
  const filename = `export_${safe || 'drilldown'}.csv`;
  downloadTextFile(filename, lines.join('\n'), 'text/csv;charset=utf-8');
  toast.success('CSV exportado', { description: filename });
}

export function exportAgingBucketsCsv(label: string, buckets: AgingBucket[], totalCents?: number) {
  const header = ['bucket', 'amount', 'total'];
  const lines = [header.join(';')];

  for (const b of buckets) {
    lines.push(
      [
        escapeCsvValue(b.label),
        escapeCsvValue(formatCurrency(b.amountCents)),
        escapeCsvValue(typeof totalCents === 'number' ? formatCurrency(totalCents) : ''),
      ].join(';'),
    );
  }

  const safe = label.replace(/[^a-z0-9\-\_]+/gi, '_').slice(0, 40);
  const filename = `export_${safe || 'dashboard'}_aging.csv`;
  downloadTextFile(filename, lines.join('\n'), 'text/csv;charset=utf-8');
  toast.success('CSV exportado (mock)', { description: filename });
}

export function exportTimeseriesCsv(label: string, points: TimeseriesPoint[]) {
  const header = ['date', 'value'];
  const lines = [header.join(';')];

  for (const p of points) {
    lines.push([escapeCsvValue(p.date), escapeCsvValue(formatCurrency(p.valueCents))].join(';'));
  }

  const safe = label.replace(/[^a-z0-9\-\_]+/gi, '_').slice(0, 40);
  const filename = `export_${safe || 'dashboard'}.csv`;
  downloadTextFile(filename, lines.join('\n'), 'text/csv;charset=utf-8');
  toast.success('CSV exportado', { description: filename });
}
