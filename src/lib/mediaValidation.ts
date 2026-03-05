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
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv'].includes(ext)) return 'video';

  return null;
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
