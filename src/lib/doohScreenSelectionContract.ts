/** P0-02: projections for existing OOH inventory; never trust screen IDs from a list for writes. */
export type DoohPointOption = { id: string; name: string };
export type DoohScreenOption = { id: string; label: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const obj = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v));
const entries = (v: unknown): unknown[] | null => Array.isArray(v) ? v : obj(v) && Array.isArray(v.data) ? v.data : null;

export function parseDoohPointOptions(value: unknown, companyId: string): { items: DoohPointOption[]; hasMore: boolean } | null {
  const rows = entries(value);
  if (!UUID.test(companyId) || !rows || rows.length > 100) return null;
  const ids = new Set<string>();
  const items: DoohPointOption[] = [];
  for (const row of rows) {
    if (!obj(row) || !UUID.test(String(row.id ?? '')) || row.companyId !== companyId ||
        row.type !== 'DOOH' || typeof row.name !== 'string' || row.name.trim().length < 1 ||
        row.name.length > 256 || ids.has(String(row.id))) return null;
    const id = String(row.id); ids.add(id); items.push({ id, name: row.name.trim() });
  }
  const total = obj(value) && typeof value.total === 'number' && Number.isSafeInteger(value.total) ? value.total : rows.length;
  if (total < rows.length) return null;
  return { items, hasMore: total > rows.length };
}

export function parseDoohScreenOptions(value: unknown, companyId: string, pointId: string): DoohScreenOption[] | null {
  const rows = entries(value);
  if (!UUID.test(companyId) || !UUID.test(pointId) || !rows || rows.length > 500) return null;
  const ids = new Set<string>();
  const items: DoohScreenOption[] = [];
  for (const row of rows) {
    if (!obj(row) || !UUID.test(String(row.id ?? '')) || row.companyId !== companyId ||
        row.mediaPointId !== pointId || !['SCREEN','FACE'].includes(String(row.unitType)) ||
        typeof row.isActive !== 'boolean' || typeof row.label !== 'string' || row.label.length > 256 ||
        ids.has(String(row.id))) return null;
    ids.add(String(row.id));
    if (row.unitType === 'SCREEN' && row.isActive && row.label.trim()) items.push({ id: String(row.id), label: row.label.trim() });
  }
  return items;
}
