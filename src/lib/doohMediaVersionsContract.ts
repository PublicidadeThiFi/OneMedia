/** D15B-06 — inventário técnico somente leitura de versões DOOH.
 * Nenhum id de asset, URL S3, chave privada, token, metadata ou lease é guardado.
 */
import { canReadDoohProcessing } from './doohMediaProcessingContract.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const HEX64 = /^[0-9a-f]{64}$/i;
const STATES = new Set(['PENDING', 'PROCESSING', 'READY', 'ERROR']);
const obj = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
const uuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);
const date = (v: unknown): v is string => typeof v === 'string' && DATE.test(v) && Number.isFinite(Date.parse(v));
const dimension = (v: unknown): v is number | null => v === null ||
  (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0);

export { canReadDoohProcessing as canReadDoohMediaVersions };
export interface DoohProcessedAssetSummary {
  mimeType: string;
  bytes: string;
  available: boolean;
}
export interface DoohVersionSummary {
  id: string;
  version: number;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';
  checksum: string | null;
  widthPx: number | null;
  heightPx: number | null;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
  processedAsset: DoohProcessedAssetSummary | null;
  verification: 'READY_METADATA_OK' | 'REVIEW_REQUIRED' | 'NOT_READY';
}
export interface DoohVersionInventory {
  total: number;
  limited: boolean;
  versions: DoohVersionSummary[];
}

/** Validação estrutural; não prova que os bytes existem no S3 ou que foram exibidos. */
export function parseDoohVersions(input: unknown, mediaId: string): DoohVersionInventory | null {
  const data = obj(input);
  if (!uuid(mediaId) || !data || data.mediaId !== mediaId || data.limit !== 50 ||
      !Number.isSafeInteger(data.total) || (data.total as number) < 0 ||
      !Array.isArray(data.versions) || data.versions.length > 50 || data.versions.length > (data.total as number)) return null;
  const seenIds = new Set<string>();
  const result: DoohVersionSummary[] = [];
  let lastNumber = Infinity;
  for (const entry of data.versions) {
    const value = obj(entry);
    if (!value || !uuid(value.id) || seenIds.has(value.id) || value.mediaId !== mediaId ||
        !Number.isSafeInteger(value.version) || (value.version as number) < 1 ||
        (value.version as number) >= lastNumber || !STATES.has(String(value.status)) ||
        !(value.checksum === null || (typeof value.checksum === 'string' && HEX64.test(value.checksum))) ||
        !dimension(value.widthPx) || !dimension(value.heightPx) || !dimension(value.durationMs) ||
        !date(value.createdAt) || !date(value.updatedAt)) return null;
    let asset: DoohProcessedAssetSummary | null = null;
    if (value.processedAsset !== null) {
      const raw = obj(value.processedAsset);
      if (!raw || typeof raw.mimeType !== 'string' || !/^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/i.test(raw.mimeType) ||
          typeof raw.bytes !== 'string' || !/^(0|[1-9]\d{0,19})$/.test(raw.bytes) ||
          typeof raw.available !== 'boolean') return null;
      asset = { mimeType: raw.mimeType, bytes: raw.bytes, available: raw.available };
    }
    const status = value.status as DoohVersionSummary['status'];
    const checksum = value.checksum as string | null;
    const ready = status === 'READY';
    // Ready metadata checklist does not assert file availability, codec correctness or playback.
    const verification: DoohVersionSummary['verification'] = !ready ? 'NOT_READY' :
      (!asset?.available || !checksum || BigInt(asset.bytes) <= 0n) ? 'REVIEW_REQUIRED' : 'READY_METADATA_OK';
    const version = value.version as number;
    seenIds.add(value.id); lastNumber = version;
    result.push({ id: value.id, version, status, checksum,
      widthPx: value.widthPx as number | null, heightPx: value.heightPx as number | null,
      durationMs: value.durationMs as number | null,
      createdAt: value.createdAt as string, updatedAt: value.updatedAt as string,
      processedAsset: asset, verification });
  }
  return { total: data.total as number, limited: (data.total as number) > result.length, versions: result };
}

export function doohVersionsError(error: unknown): string {
  const status = obj(obj(error)?.response)?.status;
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 402 || status === 403) return 'Acesso DOOH insuficiente para consultar versões.';
  if (status === 404) return 'Mídia não encontrada nesta empresa. Atualize a Biblioteca.';
  if (status === 429) return 'Consultas temporariamente limitadas. Aguarde.';
  if (typeof status === 'number' && status >= 500) return 'Serviço de versões DOOH indisponível.';
  return 'Não foi possível consultar as versões. Verifique a conexão.';
}
