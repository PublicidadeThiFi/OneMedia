import type { PlatformSubscriptionEntitlementsResponse } from '../types';

export type MediaUploadKind = 'image' | 'pdf' | 'video';

export function bytesFromString(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : 0;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = bytes;
  let idx = 0;
  while (v >= 1024 && idx < units.length - 1) {
    v /= 1024;
    idx += 1;
  }
  const decimals = idx === 0 ? 0 : idx === 1 ? 0 : 1;
  return `${v.toFixed(decimals)} ${units[idx]}`;
}

function mbToBytes(mb: number): number {
  return Math.round(mb * 1024 * 1024);
}

function normalizeExt(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name || '');
  return (m?.[1] ?? '').toLowerCase();
}

export function detectKind(file: File): MediaUploadKind | null {
  const t = String(file.type || '').toLowerCase();
  if (t.startsWith('image/')) return 'image';
  if (t === 'application/pdf') return 'pdf';
  if (t.startsWith('video/')) return 'video';

  const ext = normalizeExt(file.name);
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv'].includes(ext)) return 'video';

  return null;
}


const IMAGE_SIGNATURE_ERROR = 'O arquivo selecionado não corresponde a uma imagem válida.';
const PDF_SIGNATURE_ERROR = 'O arquivo selecionado não corresponde a um PDF válido.';
const VIDEO_SIGNATURE_ERROR = 'O arquivo selecionado não corresponde a um vídeo válido compatível.';

function startsWithBytes(bytes: Uint8Array, expected: number[]): boolean {
  if (bytes.length < expected.length) return false;
  return expected.every((value, index) => bytes[index] === value);
}

function asciiAt(bytes: Uint8Array, start: number, end: number): string {
  return new TextDecoder('ascii').decode(bytes.slice(start, end));
}

async function readFileHeader(file: File, length = 64): Promise<Uint8Array> {
  const buffer = await file.slice(0, length).arrayBuffer();
  return new Uint8Array(buffer);
}

function getNormalizedExtension(file: File): string {
  const m = /\.([a-z0-9]+)$/i.exec(file.name || '');
  return `.${(m?.[1] ?? '').toLowerCase()}`;
}

function isJpeg(bytes: Uint8Array): boolean {
  return startsWithBytes(bytes, [0xff, 0xd8, 0xff]);
}

function isPng(bytes: Uint8Array): boolean {
  return startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function isGif(bytes: Uint8Array): boolean {
  const header = asciiAt(bytes, 0, 6);
  return header === 'GIF87a' || header === 'GIF89a';
}

function isWebp(bytes: Uint8Array): boolean {
  return asciiAt(bytes, 0, 4) === 'RIFF' && asciiAt(bytes, 8, 12) === 'WEBP';
}

function isAvif(bytes: Uint8Array): boolean {
  return asciiAt(bytes, 4, 8) === 'ftyp' && ['avif', 'avis'].includes(asciiAt(bytes, 8, 12));
}

function isPdf(bytes: Uint8Array): boolean {
  return asciiAt(bytes, 0, 5) === '%PDF-';
}

function isEbmlVideo(bytes: Uint8Array): boolean {
  return startsWithBytes(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
}

function isAvi(bytes: Uint8Array): boolean {
  return asciiAt(bytes, 0, 4) === 'RIFF' && asciiAt(bytes, 8, 11) === 'AVI';
}

function isIsoBaseMediaVideo(bytes: Uint8Array): boolean {
  if (asciiAt(bytes, 4, 8) !== 'ftyp') return false;
  const brand = asciiAt(bytes, 8, 12);
  return ['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'qt  ', 'M4V ', 'M4VH', 'mmp4'].includes(brand);
}

export async function validateFileBinarySignature(file: File, kind: MediaUploadKind): Promise<string | null> {
  const bytes = await readFileHeader(file, 64);
  const ext = getNormalizedExtension(file);

  if (kind === 'image') {
    const ok =
      (ext === '.jpg' || ext === '.jpeg') ? isJpeg(bytes) :
      ext === '.png' ? isPng(bytes) :
      ext === '.gif' ? isGif(bytes) :
      ext === '.webp' ? isWebp(bytes) :
      ext === '.avif' ? isAvif(bytes) :
      (isJpeg(bytes) || isPng(bytes) || isGif(bytes) || isWebp(bytes) || isAvif(bytes));
    return ok ? null : IMAGE_SIGNATURE_ERROR;
  }

  if (kind === 'pdf') {
    return isPdf(bytes) ? null : PDF_SIGNATURE_ERROR;
  }

  const ok =
    ext === '.webm' || ext === '.mkv'
      ? isEbmlVideo(bytes)
      : ext === '.avi'
        ? isAvi(bytes)
        : (isIsoBaseMediaVideo(bytes) || isEbmlVideo(bytes) || isAvi(bytes));
  return ok ? null : VIDEO_SIGNATURE_ERROR;
}

export async function getVideoDurationSeconds(file: File): Promise<number | null> {
  try {
    // Safari/Chrome: create a video element and read metadata duration.
    const url = URL.createObjectURL(file);
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';

      const duration = await new Promise<number>((resolve, reject) => {
        const clean = () => {
          video.onloadedmetadata = null;
          video.onerror = null;
        };

        video.onloadedmetadata = () => {
          clean();
          const d = Number(video.duration);
          resolve(Number.isFinite(d) ? d : 0);
        };

        video.onerror = () => {
          clean();
          reject(new Error('Video metadata read failed'));
        };

        video.src = url;
      });

      return duration > 0 ? duration : null;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}

export async function validateFileAgainstEntitlements(
  file: File,
  kind: MediaUploadKind,
  entitlements: PlatformSubscriptionEntitlementsResponse | null | undefined
): Promise<string | null> {
  const signatureError = await validateFileBinarySignature(file, kind);
  if (signatureError) return signatureError;

  const limits = entitlements?.limits?.file;
  if (!limits) return null;

  const maxImageMb = limits.maxImageMb;
  const maxPdfMb = limits.maxPdfMb;
  const maxVideoMb = limits.maxVideoMb;
  const maxVideoSeconds = limits.maxVideoSeconds;

  if (kind === 'image') {
    const maxBytes = mbToBytes(maxImageMb);
    if (file.size > maxBytes) {
      return `A imagem deve ter no máximo ${maxImageMb}MB.`;
    }
    return null;
  }

  if (kind === 'pdf') {
    const maxBytes = mbToBytes(maxPdfMb);
    if (file.size > maxBytes) {
      return `O PDF deve ter no máximo ${maxPdfMb}MB.`;
    }
    return null;
  }

  if (kind === 'video') {
    const maxBytes = mbToBytes(maxVideoMb);
    if (file.size > maxBytes) {
      return `O vídeo deve ter no máximo ${maxVideoMb}MB.`;
    }

    // Duration check (best-effort). Backend may enforce later too.
    const dur = await getVideoDurationSeconds(file);
    if (dur != null && Number.isFinite(dur) && dur > maxVideoSeconds) {
      const sec = Math.round(dur);
      return `O vídeo deve ter no máximo ${maxVideoSeconds}s. (Este tem ~${sec}s)`;
    }
    return null;
  }

  return null;
}

export function buildMediaUsageSummary(entitlements: PlatformSubscriptionEntitlementsResponse | null | undefined): {
  storageUsedBytes: number;
  storageLimitBytes: number;
  trafficUsedBytes: number;
  trafficLimitBytes: number;
} | null {
  if (!entitlements) return null;
  const usedStorage = bytesFromString(entitlements.usage?.storageUsedBytes);
  const usedTraffic = bytesFromString(entitlements.usage?.trafficUsedBytesThisMonth);

  const storageLimitBytes = mbToBytes(Number(entitlements.limits?.totalStorageGb || 0) * 1024); // GB -> MB -> bytes
  const trafficLimitBytes = mbToBytes(Number(entitlements.limits?.totalTrafficGbPerMonth || 0) * 1024);

  return {
    storageUsedBytes: usedStorage,
    storageLimitBytes,
    trafficUsedBytes: usedTraffic,
    trafficLimitBytes,
  };
}

export async function validateUploadBatchAgainstEntitlements(
  entries: Array<{ file: File; kind: MediaUploadKind }>,
  entitlements: PlatformSubscriptionEntitlementsResponse | null | undefined
): Promise<string | null> {
  if (!entries.length) return null;

  for (const entry of entries) {
    const err = await validateFileAgainstEntitlements(entry.file, entry.kind, entitlements);
    if (err) return err;
  }

  const usage = buildMediaUsageSummary(entitlements);
  if (!usage) return null;

  const totalSelectedBytes = entries.reduce((sum, entry) => sum + Math.max(0, entry.file.size || 0), 0);
  const remainingBytes = Math.max(0, usage.storageLimitBytes - usage.storageUsedBytes);

  if (totalSelectedBytes > remainingBytes) {
    return `Os arquivos selecionados somam ${formatBytes(totalSelectedBytes)}, mas restam apenas ${formatBytes(remainingBytes)} no seu plano.`;
  }

  return null;
}
