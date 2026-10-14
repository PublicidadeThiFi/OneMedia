/** D15B-04: minimal, fail-closed projections for direct-to-S3 DOOH upload. */
import { parseDoohLibraryMedia, type DoohLibraryFolder, type DoohLibraryMedia } from './doohMediaLibraryContract.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm',
  mov: 'video/quicktime', m4v: 'video/x-m4v', avi: 'video/x-msvideo',
  mkv: 'video/x-matroska', pdf: 'application/pdf',
};
const MAX_SINGLE_PUT_BYTES = 5 * 1024 * 1024 * 1024;
const object = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;

export function canUploadDoohMedia(
  companyId: unknown, snapshotCompanyId: unknown, granted: unknown,
  accessMode: unknown, roles: readonly string[], uiEnabled: boolean,
): boolean {
  return uiEnabled && typeof companyId === 'string' && UUID.test(companyId) &&
    snapshotCompanyId === companyId && granted === true && accessMode === 'FULL' &&
    roles.some((r) => r === 'TI' || r === 'ADMINISTRATIVO');
}

export function validateDoohUploadFile(file: Pick<File, 'name' | 'size' | 'type'> | null):
  { fileName: string; mimeType: string; size: number } | null {
  if (!file || typeof file.name !== 'string' || !file.name || file.name.length > 255 ||
      /[\\/\u0000-\u001f\u007f]/.test(file.name) || !Number.isSafeInteger(file.size) ||
      file.size < 1 || file.size > MAX_SINGLE_PUT_BYTES) return null;
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  const mimeType = MIME_BY_EXTENSION[ext];
  // Reject browser-supplied MIME mismatches and types missing from the supported policy.
  if (!mimeType || file.type.trim().toLowerCase() !== mimeType) return null;
  return { fileName: file.name, mimeType, size: file.size };
}

export function normalizeDoohUploadName(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim();
  return name && name.length <= 160 && !/[\u0000-\u001f\u007f]/.test(name) ? name : null;
}

export function validDoohUploadFolder(folderId: string | null, folders: readonly DoohLibraryFolder[]): boolean {
  return folderId === null || (UUID.test(folderId) && folders.some((f) => f.id === folderId));
}

export type DoohUploadIntent = {
  intentId: string; url: string; headers: Record<string, string>;
  contentType: string; size: number; expiresAt: string;
};

/** Never store this object in React state or render its signed URL/headers. */
export function parseDoohUploadIntent(value: unknown, expected: { size: number; mimeType: string }): DoohUploadIntent | null {
  const dto = object(value);
  if (!dto || typeof dto.intentId !== 'string' || !UUID.test(dto.intentId) ||
      dto.contentType !== expected.mimeType || dto.size !== expected.size ||
      typeof dto.uploadUrl !== 'string' || typeof dto.expiresAt !== 'string') return null;
  const expiry = Date.parse(dto.expiresAt);
  if (!Number.isFinite(expiry) || expiry <= Date.now() || expiry > Date.now() + 16 * 60_000) return null;
  let url: URL;
  try { url = new URL(dto.uploadUrl); } catch { return null; }
  if (url.protocol !== 'https:' || url.port || url.username || url.password || url.hash ||
      !/^[a-z0-9][a-z0-9.-]{1,200}\.s3\.[a-z0-9-]+\.amazonaws\.com$/.test(url.hostname) ||
      !url.searchParams.has('X-Amz-Signature') || !url.searchParams.has('X-Amz-Credential')) return null;
  const headersRaw = object(dto.uploadHeaders);
  if (!headersRaw || Object.keys(headersRaw).some((h) => h.toLowerCase() !== 'content-type') ||
      Object.values(headersRaw).some((v) => typeof v !== 'string')) return null;
  if (Object.entries(headersRaw).some(([key, v]) => key.toLowerCase() === 'content-type' && v !== expected.mimeType)) return null;
  return { intentId: dto.intentId, url: url.toString(), headers: headersRaw as Record<string, string>,
    contentType: expected.mimeType, size: expected.size, expiresAt: dto.expiresAt };
}

export function confirmDoohUploadFinalized(
  value: unknown, companyId: string, folderId: string | null,
  name: string, file: { mimeType: string; size: number }, folders: readonly DoohLibraryFolder[],
): DoohLibraryMedia | null {
  const parsed = parseDoohLibraryMedia([value], companyId, 'all', folders);
  const media = parsed?.[0];
  if (!media || media.name !== name || media.folderId !== folderId ||
      media.status !== 'PENDING' || media.versionCount !== 0 ||
      media.mimeType !== file.mimeType || media.bytes !== String(file.size)) return null;
  return media;
}

export function doohUploadError(error: unknown, phase: 'init' | 'put' | 'finalize'): string {
  if (phase === 'put') return 'Falha no envio ao storage S3. Verifique a conexão e a política CORS do bucket. Nenhuma mídia foi confirmada.';
  const status = object(object(error)?.response)?.status;
  if (status === 401) return 'Sessão expirada; autentique-se novamente.';
  if (status === 402) return 'Cota de armazenamento indisponível ou insuficiente para a empresa.';
  if (status === 403) return 'A operação exige acesso DOOH FULL e função técnica.';
  if (status === 404) return 'Pasta ou intenção de upload não encontrada.';
  if (status === 409) return 'Intenção expirada, consumida ou alterada. Atualize a Biblioteca.';
  if (status === 413) return 'Arquivo excede o limite técnico de envio único.';
  if (status === 429) return 'Envios limitados temporariamente. Aguarde.';
  if (status === 503) return 'Upload DOOH desabilitado ou storage S3 indisponível neste ambiente.';
  if (typeof status === 'number' && status >= 500) return 'O serviço de mídia está temporariamente indisponível.';
  return 'Não foi possível concluir a operação de upload. Atualize antes de repetir.';
}
