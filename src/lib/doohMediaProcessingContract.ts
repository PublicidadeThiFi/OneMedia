/** D15B-05 — projeções minimizadas do histórico/solicitação de processamento DOOH.
 * O serviço tem fila durável, mas o worker atual é somente manual e isolado.
 * Nunca transportar leaseToken, URLs S3, detalhes de erro do backend ou resultados binários.
 */
import type { DoohLibraryMedia } from './doohMediaLibraryContract.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const SHA = /^[a-f\d]{64}$/i;
const statuses = new Set(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED']);
const versionStatuses = new Set(['PENDING', 'PROCESSING', 'READY', 'ERROR']);
function obj(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
}
const uuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);
const date = (v: unknown): v is string => typeof v === 'string' && ISO_DATE.test(v) && Number.isFinite(Date.parse(v));
const nullableDate = (v: unknown): v is string | null => v === null || date(v);
const metadata = (v: unknown): v is number | null => v === null || (Number.isSafeInteger(v) && (v as number) >= 0);

export type DoohProcessingJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type DoohProcessingJob = {
  id: string; status: DoohProcessingJobStatus; attempts: number; version: number;
  versionStatus: 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';
  createdAt: string; availableAt: string; startedAt: string | null;
  completedAt: string | null; failed: boolean;
};

export function canReadDoohProcessing(companyId: unknown, accessCompanyId: unknown, granted: unknown,
  mode: unknown, roles: readonly string[]): boolean {
  return uuid(companyId) && companyId === accessCompanyId && granted === true &&
    (mode === 'FULL' || mode === 'READ_ONLY') &&
    roles.some((role) => role === 'ADMINISTRATIVO' || role === 'TI');
}

export function canRequestDoohProcessing(companyId: unknown, accessCompanyId: unknown, granted: unknown,
  mode: unknown, roles: readonly string[], uiEnabled: boolean): boolean {
  return uiEnabled && canReadDoohProcessing(companyId, accessCompanyId, granted, mode, roles) && mode === 'FULL';
}

/** Sem inferir processamento ou prova de exibição a partir de status de mídia. */
export function parseDoohProcessingHistory(input: unknown, mediaId: string): DoohProcessingJob[] | null {
  if (!uuid(mediaId) || !Array.isArray(input) || input.length > 50) return null;
  const seen = new Set<string>();
  const jobs: DoohProcessingJob[] = [];
  for (const entry of input) {
    const value = obj(entry);
    const version = obj(value?.version);
    if (!value || !version || !uuid(value.id) || seen.has(value.id) ||
        value.mediaId !== mediaId || !uuid(value.versionId) ||
        !statuses.has(String(value.status)) || !versionStatuses.has(String(version.status)) ||
        !Number.isSafeInteger(value.attempts) || (value.attempts as number) < 0 || (value.attempts as number) > 3 ||
        !Number.isSafeInteger(version.version) || (version.version as number) < 1 ||
        !date(value.availableAt) || !date(value.createdAt) ||
        !nullableDate(value.startedAt) || !nullableDate(value.completedAt) ||
        !(value.errorCode === null || (typeof value.errorCode === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(value.errorCode))) ||
        !(version.checksum === null || (typeof version.checksum === 'string' && SHA.test(version.checksum))) ||
        !metadata(version.widthPx) || !metadata(version.heightPx) || !metadata(version.durationMs)) return null;
    const status = value.status as DoohProcessingJobStatus;
    // Do not invent completion from a QUEUED or RUNNING job.
    if (((status === 'COMPLETED' || status === 'FAILED') && value.completedAt === null) ||
        ((status === 'QUEUED' || status === 'RUNNING') && value.completedAt !== null) ||
        (status === 'QUEUED' && version.status !== 'PENDING') ||
        (status === 'RUNNING' && version.status !== 'PROCESSING') ||
        (status === 'COMPLETED' && version.status !== 'READY') ||
        (status === 'FAILED' && version.status !== 'ERROR')) return null;
    seen.add(value.id);
    jobs.push({ id: value.id, status, attempts: value.attempts as number,
      version: version.version as number,
      versionStatus: version.status as DoohProcessingJob['versionStatus'],
      createdAt: value.createdAt, availableAt: value.availableAt,
      startedAt: value.startedAt as string | null, completedAt: value.completedAt as string | null,
      failed: status === 'FAILED' });
  }
  return jobs;
}

export function canEnqueueDoohProcessing(media: DoohLibraryMedia | undefined,
  jobs: readonly DoohProcessingJob[] | null): boolean {
  return Boolean(media && (media.status === 'PENDING' || media.status === 'ERROR') && jobs &&
    !jobs.some((job) => job.status === 'QUEUED' || job.status === 'RUNNING'));
}

export function confirmDoohProcessingEnqueued(input: unknown):
  { jobId: string; status: 'QUEUED' | 'RUNNING'; version: number; alreadyQueued: boolean } | null {
  const value = obj(input);
  if (!value || !uuid(value.jobId) || (value.status !== 'QUEUED' && value.status !== 'RUNNING') ||
      !Number.isSafeInteger(value.version) || (value.version as number) < 1 ||
      typeof value.alreadyQueued !== 'boolean' ||
      (value.alreadyQueued === false && value.status !== 'QUEUED')) return null;
  return { jobId: value.jobId, status: value.status, version: value.version as number,
    alreadyQueued: value.alreadyQueued };
}

export function doohProcessingError(error: unknown, operation: 'read' | 'queue'): string {
  const status = obj(obj(error)?.response)?.status;
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 402 || status === 403) return 'Permissão DOOH insuficiente para esta operação.';
  if (status === 404) return 'Mídia não encontrada nesta empresa. Atualize a Biblioteca.';
  if (status === 409) return 'A mídia ou a fila mudou. Atualize antes de repetir.';
  if (status === 429) return 'Solicitações temporariamente limitadas. Aguarde.';
  if (status === 503 && operation === 'queue') return 'Enfileiramento desligado no backend; nenhum job foi confirmado.';
  if (typeof status === 'number' && status >= 500) return 'Serviço de processamento DOOH indisponível.';
  return operation === 'queue'
    ? 'Não foi possível confirmar o enfileiramento. Reconsulte o histórico antes de repetir.'
    : 'Não foi possível consultar o histórico de processamento. Verifique a conexão.';
}
