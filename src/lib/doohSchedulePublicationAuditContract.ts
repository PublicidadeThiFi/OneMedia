import type { DoohScheduleSummary } from './doohScheduleCatalogContract';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const obj = (v: unknown): Record<string, unknown> | null => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
const date = (v: unknown) => typeof v === 'string' && ISO.test(v) && Number.isFinite(Date.parse(v));
const types = ['PLAYER', 'GROUP', 'MEDIA_UNIT', 'MEDIA_POINT'] as const;
export const auditCheckNames = {
  SCHEDULE_NOT_PUBLISHED: 'Agenda não está publicada',
  PUBLICATION_TIMESTAMP_MISSING: 'Data de publicação ausente',
  PUBLISHER_REFERENCE_MISSING: 'Referência ao responsável não registrada',
  WINDOW_NOT_FINITE: 'Janela temporal incompleta ou inválida',
  PLAYLIST_VERSION_NOT_VERIFIED: 'Versão de playlist não verificada',
  NO_TARGETS: 'Nenhum destino cadastrado',
  TARGET_LIST_LIMIT: 'Lista de destinos excedeu o limite de auditoria',
  TARGET_INCONSISTENT: 'Vínculo de destino inconsistente',
} as const;
type Check = keyof typeof auditCheckNames;
export type PublicationAuditView = {
  scheduleId: string;
  publishedAt: string | null;
  publisherReferenceRecorded: boolean;
  playlistVersionRecorded: boolean;
  targetCount: number;
  targetTypeCounts: Record<typeof types[number], number>;
  outcome: 'REVIEW_REQUIRED' | 'STRUCTURAL_RECORD_CONSISTENT';
  checks: Check[];
};

/** Reject any mismatched revision, tenant, classification or unknown signal. */
export function parsePublicationAudit(data: unknown, companyId: string, selected: DoohScheduleSummary): PublicationAuditView | null {
  const row = obj(data);
  const counts = obj(row?.targetTypeCounts);
  if (!row || !UUID.test(companyId) || row.companyId !== companyId || row.scheduleId !== selected.id ||
    row.scope !== 'CURRENT_RECORD_ONLY' || row.scheduleStatus !== selected.status ||
    row.scheduleUpdatedAt !== selected.updatedAt || row.playlistVersionId !== selected.playlistVersionId ||
    row.publishedAt !== selected.publishedAt ||
    (row.publishedAt !== null && !date(row.publishedAt)) ||
    typeof row.publisherReferenceRecorded !== 'boolean' || typeof row.playlistVersionRecorded !== 'boolean' ||
    !Number.isSafeInteger(row.targetCount) || (row.targetCount as number) < 0 || (row.targetCount as number) > 100 ||
    row.targetCount !== selected.targetCount || row.targetListCapped !== false ||
    row.distribution !== 'NOT_CHECKED' || row.playback !== 'NOT_CHECKED' || row.history !== 'NOT_AVAILABLE' ||
    (row.outcome !== 'REVIEW_REQUIRED' && row.outcome !== 'STRUCTURAL_RECORD_CONSISTENT') ||
    !Array.isArray(row.checks) || row.checks.length > Object.keys(auditCheckNames).length ||
    !counts || !types.every((type) => Number.isSafeInteger(counts[type]) && (counts[type] as number) >= 0 && (counts[type] as number) <= 100) ||
    Object.keys(counts).length !== types.length) return null;
  const validChecks = row.checks.every((c: unknown) => typeof c === 'string' && Object.hasOwn(auditCheckNames, c));
  if (!validChecks || new Set(row.checks).size !== row.checks.length) return null;
  const checks = row.checks as Check[];
  if ((checks.length === 0) !== (row.outcome === 'STRUCTURAL_RECORD_CONSISTENT')) return null;
  if (checks.length === 0 && (row.publishedAt === null || !row.publisherReferenceRecorded ||
     !row.playlistVersionRecorded || row.targetCount === 0 ||
     types.reduce((n, t) => n + (counts[t] as number), 0) !== row.targetCount)) return null;
  return { scheduleId: selected.id, publishedAt: row.publishedAt as string | null,
    publisherReferenceRecorded: row.publisherReferenceRecorded as boolean,
    playlistVersionRecorded: row.playlistVersionRecorded as boolean,
    targetCount: row.targetCount as number,
    targetTypeCounts: Object.fromEntries(types.map((t) => [t, counts[t]])) as PublicationAuditView['targetTypeCounts'],
    outcome: row.outcome as PublicationAuditView['outcome'], checks };
}

export function publicationAuditError(cause: unknown): string {
  const status = obj(obj(cause)?.response)?.status;
  if (status === 401) return 'Sessão encerrada. Autentique-se novamente.';
  if (status === 402 || status === 403) return 'Sem permissão para consultar o registro de publicação.';
  if (status === 404) return 'Registro da agenda não encontrado nesta empresa.';
  if (status === 429) return 'Limite de consultas atingido. Aguarde.';
  return 'Não foi possível consultar a verificação estrutural da publicação.';
}
