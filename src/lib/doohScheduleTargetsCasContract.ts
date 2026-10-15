/** D15D-02 — edición individual de destinos com full-snapshot CAS, sem publicação. */
import { type DoohScheduleSummary, type DoohScheduleTargetInventory,
  type DoohScheduleTargetType } from './doohScheduleCatalogContract.ts';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const record = (v: unknown): Record<string, unknown> | null => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string,unknown> : null;
const valid = (v: unknown): v is string => typeof v === 'string' && uuid.test(v);
const types = new Set(['PLAYER', 'GROUP', 'MEDIA_UNIT', 'MEDIA_POINT']);
export function canWriteScheduleTargets(companyId: unknown, snapshotCompanyId: unknown,
  grant: unknown, mode: unknown, roles: readonly string[]): boolean {
  return valid(companyId) && companyId === snapshotCompanyId && grant === true && mode === 'FULL' &&
    roles.some((role) => role === 'ADMINISTRATIVO' || role === 'TI');
}
export function targetsSnapshotMatches(a: DoohScheduleTargetInventory, b: DoohScheduleTargetInventory): boolean {
  if (a.scheduleId !== b.scheduleId || a.updatedAt !== b.updatedAt || a.status !== b.status ||
      a.targets.length !== b.targets.length) return false;
  const sort = (s: DoohScheduleTargetInventory) => s.targets.map((t) =>
    [t.id, t.targetType, t.targetId.toLowerCase(), t.createdAt].join('|')).sort();
  const x = sort(a), y = sort(b);
  return x.every((item, i) => item === y[i]);
}
export type TargetEdit = { action: 'add'; type: DoohScheduleTargetType; id: string } | { action: 'remove'; associationId: string };
export type TargetCasBody = {
  expectedUpdatedAt: string;
  expectedTargets: Array<{ id: string; targetType: DoohScheduleTargetType; targetId: string; createdAt: string }>;
  targets: Array<{ targetType: DoohScheduleTargetType; targetId: string }>;
};
export function buildScheduleTargetsCas(summary: DoohScheduleSummary, inventory: DoohScheduleTargetInventory,
  edit: TargetEdit): TargetCasBody | null {
  if (summary.status !== 'DRAFT' || inventory.status !== 'DRAFT' ||
      summary.id !== inventory.scheduleId || inventory.updatedAt !== summary.updatedAt ||
      inventory.targets.length !== summary.targetCount || inventory.targets.length > 100) return null;
  const existing = inventory.targets.map((t) => ({ targetType: t.targetType, targetId: t.targetId.toLowerCase() }));
  let next: typeof existing;
  if (edit.action === 'add') {
    const id = edit.id.trim().toLowerCase();
    if (!types.has(edit.type) || !valid(id) || existing.length >= 100 ||
        existing.some((t) => t.targetType === edit.type && t.targetId === id)) return null;
    next = [...existing, { targetType: edit.type, targetId: id }];
  } else {
    if (!valid(edit.associationId) || !inventory.targets.some((t) => t.id === edit.associationId)) return null;
    next = existing.filter((t, i) => inventory.targets[i].id !== edit.associationId);
  }
  return {
    expectedUpdatedAt: inventory.updatedAt,
    expectedTargets: inventory.targets.map((t) => ({ id: t.id, targetType: t.targetType, targetId: t.targetId.toLowerCase(), createdAt: t.createdAt })),
    targets: next,
  };
}
export function parseScheduleTargetsCasReceipt(input: unknown, scheduleId: string, expectedCount: number): { updatedAt: string; changed: true } | null {
  const row = record(input);
  if (!row || row.scheduleId !== scheduleId || row.changed !== true || row.count !== expectedCount ||
      typeof row.updatedAt !== 'string' || !Number.isFinite(Date.parse(row.updatedAt)) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(row.updatedAt)) return null;
  return { updatedAt: row.updatedAt, changed: true };
}
export function doohScheduleTargetWriteError(error: unknown): string {
  const status = record(record(error)?.response)?.status;
  if (status === 409) return 'Conflito de edição: agenda ou destinos alterados. Atualize antes de tentar novamente.';
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 402 || status === 403) return 'Permissão insuficiente para alterar destinos DOOH.';
  if (status === 404) return 'Agenda ou destino não encontrado nesta empresa.';
  if (status === 400 || status === 422) return 'Destino inválido. Verifique o UUID e o tipo selecionado.';
  if (status === 429) return 'Operações limitadas temporariamente. Aguarde.';
  if (typeof status === 'number' && status >= 500) return 'Serviço de agendas temporariamente indisponível.';
  return 'Não foi possível alterar os destinos. Confira a conexão e atualize.';
}
