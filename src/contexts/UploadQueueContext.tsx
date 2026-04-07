import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import axios from "axios";
import { Ban, CheckCircle2, ChevronUp, Loader2, Pause, Play, RotateCcw, Upload, Video, X, Image as ImageIcon, AlertCircle, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import apiClient from "../lib/apiClient";
import { useCompany } from "./CompanyContext";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

type UploadTaskKind = "image" | "video";
type UploadTaskTargetType = "point" | "unit";
type UploadTaskStatus = "queued" | "uploading" | "finalizing" | "paused" | "completed" | "error" | "canceled" | "interrupted";

export interface UploadTask {
  id: string;
  targetType: UploadTaskTargetType;
  targetId: string;
  pointId: string;
  pointName: string;
  unitId?: string;
  unitLabel?: string;
  kind: UploadTaskKind;
  file: File | null;
  restoredFromStorage?: boolean;
  fileName: string;
  totalBytes: number;
  loadedBytes: number;
  status: UploadTaskStatus;
  attemptCount: number;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  lastDurationMs?: number;
  averageSpeedBps?: number;
  autoRetryCount?: number;
  scheduledRetryAt?: number;
}

interface UploadQueueContextValue {
  uploadTasks: UploadTask[];
  enqueuePointUploads: (args: { pointId: string; pointName: string; imageFiles?: File[]; videoFiles?: File[] }) => void;
  enqueueUnitUploads: (args: { pointId: string; pointName: string; unitId: string; unitLabel: string; imageFiles?: File[]; videoFiles?: File[] }) => void;
}

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null);
const UPLOAD_HUB_STORAGE_KEY = "onemedia-upload-hub-open";
const UPLOAD_QUEUE_STORAGE_KEY = "onemedia-upload-queue";

const MAX_CONCURRENT_UPLOADS: Record<UploadTaskKind, number> = {
  image: 3,
  video: 2,
};

const MAX_TOTAL_CONCURRENT_UPLOADS = 4;
const AUTO_RETRY_LIMIT = 2;
const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

interface PersistedUploadTask {
  id: string;
  targetType: UploadTaskTargetType;
  targetId: string;
  pointId: string;
  pointName: string;
  unitId?: string;
  unitLabel?: string;
  kind: UploadTaskKind;
  fileName: string;
  totalBytes: number;
  loadedBytes: number;
  status: UploadTaskStatus;
  attemptCount: number;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  lastDurationMs?: number;
  averageSpeedBps?: number;
  autoRetryCount?: number;
  scheduledRetryAt?: number;
}

function normalizeRestoredStatus(status: UploadTaskStatus): UploadTaskStatus {
  if (status === "completed" || status === "canceled") {
    return status;
  }
  return "interrupted";
}

function getInterruptedDescription(task: Pick<UploadTask, "loadedBytes" | "totalBytes">) {
  const hasKnownProgress = Number.isFinite(task.loadedBytes) && task.loadedBytes > 0 && Number.isFinite(task.totalBytes) && task.totalBytes > 0;
  if (hasKnownProgress) {
    return `Sessão interrompida após ${formatBytes(task.loadedBytes)} de ${formatBytes(task.totalBytes)}. Reabra o cadastro e selecione o arquivo novamente para reenviar.`;
  }
  return "A sessão foi interrompida. Reabra o cadastro e selecione o arquivo novamente para reenviar.";
}

function sanitizePersistedUploadTask(value: any): UploadTask | null {
  if (!value || typeof value !== "object") return null;
  if (typeof value.id !== "string" || typeof value.fileName !== "string") return null;
  if (value.targetType !== "point" && value.targetType !== "unit") return null;
  if (value.kind !== "image" && value.kind !== "video") return null;

  const normalizedStatus = normalizeRestoredStatus(value.status as UploadTaskStatus);
  const totalBytes = Number(value.totalBytes ?? 0);
  const loadedBytes = Number(value.loadedBytes ?? 0);
  const safeTotalBytes = Number.isFinite(totalBytes) && totalBytes > 0 ? totalBytes : 0;
  const safeLoadedBytes = Number.isFinite(loadedBytes) && loadedBytes > 0 ? Math.min(loadedBytes, safeTotalBytes || loadedBytes) : 0;

  return {
    id: value.id,
    targetType: value.targetType,
    targetId: String(value.targetId ?? ""),
    pointId: String(value.pointId ?? ""),
    pointName: String(value.pointName ?? "Ponto"),
    unitId: value.unitId ? String(value.unitId) : undefined,
    unitLabel: value.unitLabel ? String(value.unitLabel) : undefined,
    kind: value.kind,
    file: null,
    fileName: value.fileName,
    totalBytes: safeTotalBytes,
    loadedBytes: safeLoadedBytes,
    status: normalizedStatus,
    attemptCount: Math.max(1, Number(value.attemptCount ?? 1) || 1),
    error: normalizedStatus === "interrupted"
      ? getInterruptedDescription({ loadedBytes: safeLoadedBytes, totalBytes: safeTotalBytes } as UploadTask)
      : (typeof value.error === "string" ? value.error : undefined),
    startedAt: Number.isFinite(Number(value.startedAt)) ? Number(value.startedAt) : undefined,
    completedAt: Number.isFinite(Number(value.completedAt)) ? Number(value.completedAt) : undefined,
    lastDurationMs: Number.isFinite(Number(value.lastDurationMs)) ? Number(value.lastDurationMs) : undefined,
    averageSpeedBps: Number.isFinite(Number(value.averageSpeedBps)) ? Number(value.averageSpeedBps) : undefined,
    autoRetryCount: Math.max(0, Number(value.autoRetryCount ?? 0) || 0),
    scheduledRetryAt: undefined,
    restoredFromStorage: true,
  };
}

function loadPersistedUploadTasks() {
  if (typeof window === "undefined") return [] as UploadTask[];

  try {
    const raw = window.localStorage.getItem(UPLOAD_QUEUE_STORAGE_KEY);
    if (!raw) return [] as UploadTask[];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as UploadTask[];
    return parsed.map(sanitizePersistedUploadTask).filter(Boolean) as UploadTask[];
  } catch {
    return [] as UploadTask[];
  }
}

function persistUploadTasks(tasks: UploadTask[]) {
  if (typeof window === "undefined") return;

  if (!tasks.length) {
    window.localStorage.removeItem(UPLOAD_QUEUE_STORAGE_KEY);
    return;
  }

  const serialized: PersistedUploadTask[] = tasks.map((task) => ({
    id: task.id,
    targetType: task.targetType,
    targetId: task.targetId,
    pointId: task.pointId,
    pointName: task.pointName,
    unitId: task.unitId,
    unitLabel: task.unitLabel,
    kind: task.kind,
    fileName: task.fileName,
    totalBytes: task.totalBytes,
    loadedBytes: task.loadedBytes,
    status: task.status,
    attemptCount: task.attemptCount,
    error: task.error,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    lastDurationMs: task.lastDurationMs,
    averageSpeedBps: task.averageSpeedBps,
    autoRetryCount: task.autoRetryCount,
    scheduledRetryAt: task.scheduledRetryAt,
  }));

  window.localStorage.setItem(UPLOAD_QUEUE_STORAGE_KEY, JSON.stringify(serialized));
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const decimals = size >= 100 || unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(decimals)} ${units[unitIndex]}`;
}

function formatDuration(ms?: number) {
  if (!Number.isFinite(ms) || !ms || ms <= 0) return null;
  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function formatRate(bps?: number) {
  if (!Number.isFinite(bps) || !bps || bps <= 0) return null;
  return `${formatBytes(bps)}/s`;
}

function computeAverageSpeedBps(task: Pick<UploadTask, "startedAt" | "loadedBytes" | "totalBytes">, fallbackBytes?: number) {
  if (!task.startedAt) return undefined;
  const elapsedMs = Date.now() - task.startedAt;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return undefined;
  const bytes = Math.max(0, fallbackBytes ?? Math.min(task.loadedBytes || 0, task.totalBytes || 0));
  if (bytes <= 0) return undefined;
  return Math.round((bytes / elapsedMs) * 1000);
}

function isRetryableUploadError(error: any) {
  const status = Number(error?.response?.status ?? 0);
  if (RETRYABLE_STATUS_CODES.has(status)) return true;
  if (!error?.response) return true;
  const code = String(error?.code || "").toUpperCase();
  return code === "ECONNABORTED" || code === "ERR_NETWORK" || code === "ETIMEDOUT";
}

function getRetryDelayMs(attemptNumber: number) {
  const exponential = Math.min(15000, 2000 * Math.pow(2, Math.max(0, attemptNumber - 1)));
  const jitter = Math.floor(Math.random() * 600);
  return exponential + jitter;
}

function getAdaptiveTotalConcurrency() {
  if (typeof navigator === "undefined") return MAX_TOTAL_CONCURRENT_UPLOADS;
  const connection = (navigator as any).connection as { saveData?: boolean; effectiveType?: string } | undefined;
  if (!connection) return MAX_TOTAL_CONCURRENT_UPLOADS;
  if (connection.saveData) return 2;
  const effectiveType = String(connection.effectiveType || "").toLowerCase();
  if (effectiveType.includes("2g") || effectiveType === "slow-2g") return 1;
  if (effectiveType.includes("3g")) return 2;
  return MAX_TOTAL_CONCURRENT_UPLOADS;
}

function getUploadErrorMessage(error: any, fallback: string) {
  const rawMessage = error?.response?.data?.message ?? error?.message;
  if (Array.isArray(rawMessage)) return rawMessage.join(", ");
  return String(rawMessage || fallback);
}

function getTaskPercent(task: UploadTask) {
  return task.totalBytes > 0
    ? Math.min(100, (Math.min(task.loadedBytes, task.totalBytes) / task.totalBytes) * 100)
    : 0;
}

function getStatusLabel(status: UploadTaskStatus, percent: number) {
  switch (status) {
    case "queued":
      return "Na fila";
    case "uploading":
      return `${percent.toFixed(0)}%`;
    case "finalizing":
      return "Finalizando";
    case "paused":
      return "Pausado";
    case "completed":
      return "Concluído";
    case "interrupted":
      return "Interrompido";
    case "error":
      return "Erro";
    case "canceled":
      return "Cancelado";
    default:
      return status;
  }
}

function getStatusTone(status: UploadTaskStatus) {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "error":
      return "bg-red-100 text-red-700 border-red-200";
    case "paused":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "interrupted":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "canceled":
      return "bg-slate-100 text-slate-600 border-slate-200";
    case "uploading":
    case "finalizing":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getDestinationLabel(task: UploadTask) {
  return task.targetType === "point"
    ? `${task.pointName} · ponto`
    : `${task.pointName} · ${task.unitLabel || "Face/Tela"}`;
}

function getTaskStatusDescription(task: UploadTask) {
  switch (task.status) {
    case "queued":
      return "Aguardando janela de envio";
    case "uploading":
      return `${formatBytes(task.loadedBytes)} de ${formatBytes(task.totalBytes)} enviados`;
    case "finalizing":
      return "Arquivo enviado. Finalizando no servidor para liberar o uso na plataforma";
    case "paused":
      return "Envio pausado. Ao retomar, o upload reinicia do começo nesta fase.";
    case "completed":
      return "Upload concluído e liberado para uso na plataforma";
    case "canceled":
      return "Upload cancelado";
    case "interrupted":
      return task.error || getInterruptedDescription(task);
    case "error":
      return task.error || "Falha no upload";
    default:
      return "";
  }
}

function buildUploadTasks(args: {
  targetType: UploadTaskTargetType;
  targetId: string;
  pointId: string;
  pointName: string;
  unitId?: string;
  unitLabel?: string;
  imageFiles?: File[];
  videoFiles?: File[];
}) {
  const imageFiles = args.imageFiles ?? [];
  const videoFiles = args.videoFiles ?? [];
  const createdAt = Date.now();

  const createTask = (kind: UploadTaskKind, file: File, index: number): UploadTask => ({
    id: `${args.targetType}-${kind}-${args.targetId}-${createdAt}-${index}-${crypto.randomUUID()}`,
    targetType: args.targetType,
    targetId: args.targetId,
    pointId: args.pointId,
    pointName: args.pointName,
    unitId: args.unitId,
    unitLabel: args.unitLabel,
    kind,
    file,
    fileName: file.name,
    totalBytes: file.size ?? 0,
    loadedBytes: 0,
    status: "queued",
    attemptCount: 1,
    autoRetryCount: 0,
  });

  return [
    ...imageFiles.map((file, index) => createTask("image", file, index)),
    ...videoFiles.map((file, index) => createTask("video", file, index)),
  ];
}

type DirectUploadInitResponse = {
  mode: "direct" | "legacy";
  uploadUrl?: string;
  uploadHeaders?: Record<string, string>;
  objectKey?: string;
  contentType?: string;
  size?: number;
};

async function uploadTaskRequest(task: UploadTask, controller: AbortController, onProgress?: (progress: { loaded: number; total: number }) => void) {
  if (!task.file) {
    throw new Error(`O arquivo ${task.fileName} não está mais disponível nesta sessão.`);
  }

  const contentType = task.file.type || (task.kind === "image" ? "image/jpeg" : "video/mp4");
  const legacyEndpoint = task.targetType === "point"
    ? (task.kind === "image" ? `/media-points/${task.targetId}/image` : `/media-points/${task.targetId}/video`)
    : (task.kind === "image" ? `/media-units/${task.targetId}/image` : `/media-units/${task.targetId}/video`);
  const initEndpoint = task.targetType === "point"
    ? `/media-points/${task.targetId}/uploads/init`
    : `/media-units/${task.targetId}/uploads/init`;
  const completeEndpoint = task.targetType === "point"
    ? `/media-points/${task.targetId}/uploads/complete`
    : `/media-units/${task.targetId}/uploads/complete`;

  const reportProgress = (loadedValue: number, totalValue: number) => {
    const total = totalValue > 0 ? totalValue : task.file?.size ?? 0;
    const loaded = Math.min(total || task.file?.size || 0, loadedValue);
    onProgress?.({ loaded, total: total > 0 ? total : task.file?.size ?? 0 });
  };

  const runLegacyUpload = async () => {
    const formData = new FormData();
    formData.append("file", task.file as File);

    await apiClient.post(legacyEndpoint, formData, {
      signal: controller.signal,
      onUploadProgress: (event: ProgressEvent) => {
        reportProgress(Number(event.loaded ?? 0), Number(event.total ?? task.file?.size ?? 0));
      },
    } as any);
  };

  let initResponse: DirectUploadInitResponse | null = null;
  try {
    const response = await apiClient.post<DirectUploadInitResponse>(initEndpoint, {
      kind: task.kind,
      fileName: task.file.name,
      contentType,
      size: task.file.size,
    }, {
      signal: controller.signal,
    } as any);
    initResponse = response.data;
  } catch (error: any) {
    const status = Number(error?.response?.status ?? 0);
    if (status === 404 || status === 405 || !error?.response) {
      await runLegacyUpload();
      return;
    }
    throw error;
  }

  if (!initResponse || initResponse.mode !== "direct" || !initResponse.uploadUrl || !initResponse.objectKey) {
    await runLegacyUpload();
    return;
  }

  try {
    const directHeaders: Record<string, string> = {
      ...(initResponse.uploadHeaders ?? {}),
    };
    if (directHeaders["Content-Type"] == null && directHeaders["content-type"] == null && (initResponse.contentType || contentType)) {
      directHeaders["Content-Type"] = initResponse.contentType || contentType;
    }

    await axios.put(initResponse.uploadUrl, task.file, {
      signal: controller.signal,
      headers: directHeaders,
      onUploadProgress: (event) => {
        reportProgress(Number(event.loaded ?? 0), Number(event.total ?? task.file?.size ?? 0));
      },
    });
  } catch (error: any) {
    const wasAborted = controller.signal.aborted || error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError";
    const status = Number(error?.response?.status ?? 0);
    const shouldFallbackToLegacy = !wasAborted && (!error?.response || status === 400 || status === 403 || status === 405 || status >= 500);
    if (shouldFallbackToLegacy) {
      await runLegacyUpload();
      return;
    }
    throw error;
  }

  await apiClient.post(completeEndpoint, {
    kind: task.kind,
    objectKey: initResponse.objectKey,
    fileName: task.file.name,
    contentType: initResponse.contentType || contentType,
    size: task.file.size,
  }, {
    signal: controller.signal,
  } as any);
}

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const company = useCompany() as any;
  const refreshEntitlements = company?.refreshEntitlements;

  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>(() => loadPersistedUploadTasks());
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(UPLOAD_HUB_STORAGE_KEY) === "1";
  });

  const uploadTasksRef = useRef<UploadTask[]>([]);
  const activeTaskIdsRef = useRef<Set<string>>(new Set());
  const taskControllersRef = useRef<Map<string, AbortController>>(new Map());
  const taskAbortActionRef = useRef<Map<string, "pause" | "cancel">>(new Map());
  const refreshTimerRef = useRef<number | null>(null);
  const previousTaskCountRef = useRef(0);
  const hasAnnouncedRestoredRef = useRef(false);
  const retryTimeoutsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    uploadTasksRef.current = uploadTasks;
  }, [uploadTasks]);

  useEffect(() => {
    persistUploadTasks(uploadTasks);
  }, [uploadTasks]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(UPLOAD_HUB_STORAGE_KEY, isUploadPanelOpen ? "1" : "0");
  }, [isUploadPanelOpen]);

  useEffect(() => {
    if (hasAnnouncedRestoredRef.current) return;
    const interruptedCount = uploadTasks.filter((task) => task.status === "interrupted").length;
    if (interruptedCount <= 0) return;

    hasAnnouncedRestoredRef.current = true;
    setIsUploadPanelOpen(true);
    toast.warning(
      interruptedCount === 1
        ? "1 upload foi restaurado como interrompido. Se quiser reenviar, selecione o arquivo novamente no cadastro correspondente."
        : `${interruptedCount} uploads foram restaurados como interrompidos. Se quiser reenviar, selecione os arquivos novamente nos cadastros correspondentes.`
    );
  }, [uploadTasks]);

  const clearRetryTimeout = useCallback((taskId: string) => {
    const timeoutId = retryTimeoutsRef.current.get(taskId);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      retryTimeoutsRef.current.delete(taskId);
    }
  }, []);

  const scheduleEntitlementRefresh = useCallback(() => {
    if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      void refreshEntitlements?.();
    }, 900);
  }, [refreshEntitlements]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      for (const controller of taskControllersRef.current.values()) controller.abort();
      taskControllersRef.current.clear();
      taskAbortActionRef.current.clear();
      for (const timeoutId of retryTimeoutsRef.current.values()) window.clearTimeout(timeoutId);
      retryTimeoutsRef.current.clear();
    };
  }, []);

  const updateUploadTask = useCallback((taskId: string, updater: (task: UploadTask) => UploadTask) => {
    setUploadTasks((prev) => prev.map((task) => (task.id === taskId ? updater(task) : task)));
  }, []);

  const clearFinishedUploads = useCallback(() => {
    setUploadTasks((prev) => prev.filter((task) => task.status === "queued" || task.status === "uploading" || task.status === "finalizing" || task.status === "paused" || task.status === "error" || task.status === "interrupted"));
  }, []);

  const dismissUploadTask = useCallback((taskId: string) => {
    clearRetryTimeout(taskId);
    const controller = taskControllersRef.current.get(taskId);
    if (controller) {
      taskAbortActionRef.current.set(taskId, "cancel");
      controller.abort();
      taskControllersRef.current.delete(taskId);
    }
    taskAbortActionRef.current.delete(taskId);
    activeTaskIdsRef.current.delete(taskId);
    setUploadTasks((prev) => prev.filter((task) => task.id !== taskId));
  }, []);

  const queueUploadTask = useCallback((taskId: string, reason: "resume" | "retry" | "system" = "system") => {
    const task = uploadTasksRef.current.find((item) => item.id === taskId);
    if (!task) return;

    if (!task.file) {
      toast.error(`O arquivo ${task.fileName} não está mais disponível nesta sessão. Reabra o cadastro e selecione-o novamente para reenviar.`);
      return;
    }

    clearRetryTimeout(taskId);

    setUploadTasks((prev) => prev.map((item) => (item.id === taskId
      ? { ...item, status: "queued", loadedBytes: 0, error: undefined, attemptCount: item.attemptCount + (reason === "system" ? 0 : 1), restoredFromStorage: false, scheduledRetryAt: undefined, startedAt: undefined, completedAt: undefined, lastDurationMs: undefined, averageSpeedBps: undefined }
      : item)));

    if (reason === "resume") {
      toast(`Retomando ${task.fileName}. Nesta fase, o envio reinicia do começo.`);
    } else if (reason === "retry") {
      toast(`Tentando novamente enviar ${task.fileName}.`);
    }
  }, [clearRetryTimeout]);

  const pauseUploadTask = useCallback((taskId: string) => {
    const task = uploadTasksRef.current.find((item) => item.id === taskId);
    if (!task) return;

    if (task.status === "queued") {
      clearRetryTimeout(taskId);
      setUploadTasks((prev) => prev.map((item) => (item.id === taskId ? { ...item, status: "paused", scheduledRetryAt: undefined } : item)));
      toast(`Upload pausado: ${task.fileName}.`);
      return;
    }

    clearRetryTimeout(taskId);

    if (task.status === "uploading" || task.status === "finalizing") {
      const controller = taskControllersRef.current.get(taskId);
      if (controller) {
        taskAbortActionRef.current.set(taskId, "pause");
        controller.abort();
        toast(`Pausando ${task.fileName}...`);
      }
    }
  }, [clearRetryTimeout]);

  const resumeUploadTask = useCallback((taskId: string) => {
    queueUploadTask(taskId, "resume");
  }, [queueUploadTask]);

  const cancelUploadTask = useCallback((taskId: string) => {
    const task = uploadTasksRef.current.find((item) => item.id === taskId);
    if (!task) return;

    clearRetryTimeout(taskId);

    if (task.status === "uploading" || task.status === "finalizing") {
      const controller = taskControllersRef.current.get(taskId);
      if (controller) {
        taskAbortActionRef.current.set(taskId, "cancel");
        controller.abort();
        toast(`Cancelando ${task.fileName}...`);
        return;
      }
    }

    setUploadTasks((prev) => prev.map((item) => (item.id === taskId ? { ...item, status: "canceled", error: undefined, scheduledRetryAt: undefined } : item)));
    taskAbortActionRef.current.delete(taskId);
    activeTaskIdsRef.current.delete(taskId);
    toast(`Upload cancelado: ${task.fileName}.`);
  }, [clearRetryTimeout]);

  const retryUploadTask = useCallback((taskId: string) => {
    queueUploadTask(taskId, "retry");
  }, [queueUploadTask]);

  const startUploadTask = useCallback(async (task: UploadTask) => {
    const controller = new AbortController();
    taskControllersRef.current.set(task.id, controller);
    activeTaskIdsRef.current.add(task.id);
    const startedAt = Date.now();
    clearRetryTimeout(task.id);
    updateUploadTask(task.id, (current) => ({ ...current, status: "uploading", loadedBytes: 0, error: undefined, restoredFromStorage: false, startedAt, completedAt: undefined, scheduledRetryAt: undefined }));

    try {
      await uploadTaskRequest(task, controller, ({ loaded, total }) => {
        updateUploadTask(task.id, (current) => {
          const safeTotal = total > 0 ? total : current.totalBytes;
          const safeLoaded = Math.min(safeTotal || current.totalBytes, loaded);
          const nextStatus: UploadTaskStatus = safeTotal > 0 && safeLoaded >= safeTotal ? "finalizing" : "uploading";

          return {
            ...current,
            status: nextStatus,
            loadedBytes: safeLoaded,
            totalBytes: safeTotal > 0 ? safeTotal : current.totalBytes,
            averageSpeedBps: computeAverageSpeedBps(current, safeLoaded),
          };
        });
      });

      updateUploadTask(task.id, (current) => {
        const completedAt = Date.now();
        const lastDurationMs = current.startedAt ? Math.max(0, completedAt - current.startedAt) : undefined;
        return {
          ...current,
          status: "completed",
          loadedBytes: current.totalBytes,
          error: undefined,
          completedAt,
          lastDurationMs,
          averageSpeedBps: current.averageSpeedBps ?? computeAverageSpeedBps(current, current.totalBytes),
          scheduledRetryAt: undefined,
        };
      });
      window.dispatchEvent(new CustomEvent("inventory:uploads-updated", { detail: { pointId: task.pointId, targetType: task.targetType, targetId: task.targetId } }));
      toast.success(`Upload concluído: ${task.fileName}.`);
      scheduleEntitlementRefresh();
    } catch (error: any) {
      const abortAction = taskAbortActionRef.current.get(task.id);
      const wasAborted = controller.signal.aborted || error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError";

      if (wasAborted && abortAction === "pause") {
        updateUploadTask(task.id, (current) => ({ ...current, status: "paused", error: undefined, scheduledRetryAt: undefined }));
      } else if (wasAborted && abortAction === "cancel") {
        updateUploadTask(task.id, (current) => ({ ...current, status: "canceled", error: undefined, scheduledRetryAt: undefined }));
      } else {
        const baseMessage = getUploadErrorMessage(error, `Falha ao enviar ${task.fileName}`);
        const shouldAutoRetry = isRetryableUploadError(error) && (task.autoRetryCount ?? 0) < AUTO_RETRY_LIMIT && !!task.file;
        const failureCompletedAt = Date.now();
        const failureDurationMs = startedAt ? Math.max(0, failureCompletedAt - startedAt) : undefined;

        if (shouldAutoRetry) {
          const nextAutoRetryCount = (task.autoRetryCount ?? 0) + 1;
          const retryDelayMs = getRetryDelayMs(nextAutoRetryCount);
          const scheduledRetryAt = Date.now() + retryDelayMs;
          const retryMessage = `${baseMessage} Nova tentativa automática em ${Math.ceil(retryDelayMs / 1000)}s.`;

          updateUploadTask(task.id, (current) => ({
            ...current,
            status: "error",
            error: retryMessage,
            autoRetryCount: nextAutoRetryCount,
            scheduledRetryAt,
            completedAt: failureCompletedAt,
            lastDurationMs: failureDurationMs,
            averageSpeedBps: current.averageSpeedBps ?? computeAverageSpeedBps(current),
          }));

          const timeoutId = window.setTimeout(() => {
            retryTimeoutsRef.current.delete(task.id);
            const currentTask = uploadTasksRef.current.find((item) => item.id === task.id);
            if (!currentTask || currentTask.status === "canceled" || currentTask.status === "completed" || currentTask.status === "paused") return;
            queueUploadTask(task.id, "system");
          }, retryDelayMs);
          retryTimeoutsRef.current.set(task.id, timeoutId);
          toast.warning(`${baseMessage} Nova tentativa automática agendada para ${task.fileName}.`);
        } else {
          updateUploadTask(task.id, (current) => ({
            ...current,
            status: "error",
            error: baseMessage,
            completedAt: failureCompletedAt,
            lastDurationMs: failureDurationMs,
            averageSpeedBps: current.averageSpeedBps ?? computeAverageSpeedBps(current),
            scheduledRetryAt: undefined,
          }));
          toast.error(baseMessage);
        }
      }
    } finally {
      taskAbortActionRef.current.delete(task.id);
      taskControllersRef.current.delete(task.id);
      activeTaskIdsRef.current.delete(task.id);
    }
  }, [clearRetryTimeout, queueUploadTask, scheduleEntitlementRefresh, updateUploadTask]);

  const pumpUploadQueue = useCallback(() => {
    const snapshot = uploadTasksRef.current;
    const activeByKind: Record<UploadTaskKind, number> = { image: 0, video: 0 };
    let totalActive = 0;
    const totalLimit = getAdaptiveTotalConcurrency();

    for (const activeId of activeTaskIdsRef.current) {
      const activeTask = snapshot.find((task) => task.id === activeId);
      if (activeTask) {
        activeByKind[activeTask.kind] += 1;
        totalActive += 1;
      }
    }

    for (const task of snapshot) {
      if (task.status !== "queued") continue;
      if (activeTaskIdsRef.current.has(task.id)) continue;
      if (totalActive >= totalLimit) continue;
      if (activeByKind[task.kind] >= MAX_CONCURRENT_UPLOADS[task.kind]) continue;
      activeByKind[task.kind] += 1;
      totalActive += 1;
      void startUploadTask(task);
    }
  }, [startUploadTask]);

  useEffect(() => {
    pumpUploadQueue();
  }, [uploadTasks, pumpUploadQueue]);

  const enqueuePointUploads = useCallback((args: { pointId: string; pointName: string; imageFiles?: File[]; videoFiles?: File[] }) => {
    const nextTasks = buildUploadTasks({
      targetType: "point",
      targetId: args.pointId,
      pointId: args.pointId,
      pointName: args.pointName,
      imageFiles: args.imageFiles,
      videoFiles: args.videoFiles,
    });

    if (!nextTasks.length) return;
    setUploadTasks((prev) => [...prev, ...nextTasks]);
    setIsUploadPanelOpen(true);
    toast.success(`${nextTasks.length} arquivo(s) do ponto estão sendo enviados em segundo plano.`);
  }, []);

  const enqueueUnitUploads = useCallback((args: { pointId: string; pointName: string; unitId: string; unitLabel: string; imageFiles?: File[]; videoFiles?: File[] }) => {
    const nextTasks = buildUploadTasks({
      targetType: "unit",
      targetId: args.unitId,
      pointId: args.pointId,
      pointName: args.pointName,
      unitId: args.unitId,
      unitLabel: args.unitLabel,
      imageFiles: args.imageFiles,
      videoFiles: args.videoFiles,
    });

    if (!nextTasks.length) return;
    setUploadTasks((prev) => [...prev, ...nextTasks]);
    setIsUploadPanelOpen(true);
    toast.success(`${nextTasks.length} arquivo(s) da unidade estão sendo enviados em segundo plano.`);
  }, []);

  const uploadSummary = useMemo(() => {
    const totalFiles = uploadTasks.length;
    const completedFiles = uploadTasks.filter((task) => task.status === "completed").length;
    const failedFiles = uploadTasks.filter((task) => task.status === "error").length;
    const scheduledRetryFiles = uploadTasks.filter((task) => task.status === "error" && Number(task.scheduledRetryAt ?? 0) > Date.now()).length;
    const interruptedFiles = uploadTasks.filter((task) => task.status === "interrupted").length;
    const pausedFiles = uploadTasks.filter((task) => task.status === "paused").length;
    const canceledFiles = uploadTasks.filter((task) => task.status === "canceled").length;
    const activeFiles = uploadTasks.filter((task) => task.status === "uploading" || task.status === "finalizing").length;
    const finalizingFiles = uploadTasks.filter((task) => task.status === "finalizing").length;
    const queuedFiles = uploadTasks.filter((task) => task.status === "queued").length;
    const processingFiles = activeFiles + queuedFiles;
    const finishedFiles = completedFiles + failedFiles + canceledFiles + interruptedFiles;
    const remainingFiles = Math.max(0, totalFiles - finishedFiles);
    const totalBytes = uploadTasks.reduce((sum, task) => sum + (task.totalBytes || 0), 0);
    const loadedBytes = uploadTasks.reduce((sum, task) => {
      if (task.status === "completed") return sum + (task.totalBytes || 0);
      return sum + Math.min(task.loadedBytes || 0, task.totalBytes || 0);
    }, 0);
    const progressPercent = totalBytes > 0 ? Math.min(100, (loadedBytes / totalBytes) * 100) : 0;

    return {
      totalFiles,
      completedFiles,
      failedFiles,
      scheduledRetryFiles,
      interruptedFiles,
      activeFiles,
      finalizingFiles,
      queuedFiles,
      pausedFiles,
      canceledFiles,
      processingFiles,
      remainingFiles,
      totalBytes,
      loadedBytes,
      progressPercent,
    };
  }, [uploadTasks]);

  useEffect(() => {
    const hasNewTasks = uploadSummary.totalFiles > previousTaskCountRef.current;
    if (hasNewTasks) {
      setIsUploadPanelOpen(true);
    }
    previousTaskCountRef.current = uploadSummary.totalFiles;
  }, [uploadSummary.totalFiles]);

  const value = useMemo<UploadQueueContextValue>(() => ({
    uploadTasks,
    enqueuePointUploads,
    enqueueUnitUploads,
  }), [uploadTasks, enqueuePointUploads, enqueueUnitUploads]);


  const getTaskMetricsLabel = useCallback((task: UploadTask) => {
    const parts: string[] = [];
    const rate = formatRate(task.averageSpeedBps);
    const duration = formatDuration(task.lastDurationMs ?? (task.startedAt ? Date.now() - task.startedAt : undefined));
    if (rate && (task.status === "uploading" || task.status === "finalizing" || task.status === "completed" || task.status === "error")) {
      parts.push(rate);
    }
    if (duration && (task.status === "uploading" || task.status === "finalizing" || task.status === "completed" || task.status === "error")) {
      parts.push(duration);
    }
    if (task.status === "error" && task.scheduledRetryAt && task.scheduledRetryAt > Date.now()) {
      parts.push(`retry em ${Math.max(1, Math.ceil((task.scheduledRetryAt - Date.now()) / 1000))}s`);
    }
    return parts.join(" · ");
  }, [uploadTasks]);

  const hasVisibleHub = uploadSummary.totalFiles > 0;

  return (
    <UploadQueueContext.Provider value={value}>
      {children}

      {hasVisibleHub ? (
        <div className="fixed bottom-5 right-5 z-[90] flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-3">
          {isUploadPanelOpen ? (
            <Card className="w-[min(92vw,28rem)] border-slate-200 bg-white/98 shadow-2xl backdrop-blur-sm">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-indigo-100 p-2 text-indigo-700">
                        {uploadSummary.activeFiles > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Central de uploads</p>
                        <p className="text-xs text-slate-600">
                          Acompanhe os envios em qualquer módulo da plataforma.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={clearFinishedUploads}>
                      Limpar finalizados
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setIsUploadPanelOpen(false)} aria-label="Recolher central de uploads">
                      <Minimize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Em andamento</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{uploadSummary.processingFiles}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Concluídos</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-700">{uploadSummary.completedFiles}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Pausados / interrup.</p>
                    <p className="mt-1 text-lg font-semibold text-amber-700">{uploadSummary.pausedFiles + uploadSummary.interruptedFiles}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Com erro</p>
                    <p className="mt-1 text-lg font-semibold text-red-700">{uploadSummary.failedFiles}</p>
                    {uploadSummary.scheduledRetryFiles > 0 ? <p className="mt-1 text-[10px] text-slate-500">{uploadSummary.scheduledRetryFiles} com retry auto</p> : null}
                  </div>
                </div>

                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">Progresso geral</p>
                      <p className="text-xs text-slate-600">
                        {uploadSummary.completedFiles}/{uploadSummary.totalFiles} arquivos finalizados
                        {uploadSummary.remainingFiles > 0 ? ` · ${uploadSummary.remainingFiles} ainda em andamento` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-indigo-700">{uploadSummary.progressPercent.toFixed(0)}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${uploadSummary.progressPercent}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{formatBytes(uploadSummary.loadedBytes)} enviados</span>
                    <span>{formatBytes(uploadSummary.totalBytes)} no total</span>
                  </div>
                </div>

                <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
                  {uploadTasks.map((task) => {
                    const percent = getTaskPercent(task);
                    const isRestartStyle = task.status === "paused" || task.status === "error";
                    const destinationLabel = getDestinationLabel(task);

                    return (
                      <div key={task.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-slate-100 p-1.5 text-slate-600">
                                {task.kind === "video" ? <Video className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                              </span>
                              <p className="truncate text-sm font-medium text-slate-900">{task.fileName}</p>
                            </div>
                            <p className="mt-1 text-xs text-slate-600">{destinationLabel}</p>
                            <p className="text-[11px] text-slate-500">{task.kind === "video" ? "Vídeo" : "Imagem"} · {formatBytes(task.totalBytes)} · tentativa {Math.max(task.attemptCount, 1)}</p>
                            {getTaskMetricsLabel(task) ? <p className="text-[11px] text-slate-400">{getTaskMetricsLabel(task)}</p> : null}
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${getStatusTone(task.status)}`}>
                            {getStatusLabel(task.status, percent)}
                          </span>
                        </div>

                        <div className="mt-3 space-y-2">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full transition-all ${task.status === "error" ? "bg-red-500" : task.status === "completed" ? "bg-emerald-500" : task.status === "paused" ? "bg-amber-500" : task.status === "interrupted" ? "bg-orange-500" : task.status === "canceled" ? "bg-slate-400" : "bg-indigo-500"}`}
                              style={{ width: `${task.status === "completed" ? 100 : task.status === "finalizing" ? 100 : task.status === "error" ? Math.max(percent, 8) : task.status === "interrupted" ? Math.max(percent, 8) : task.status === "canceled" ? Math.max(percent, 8) : percent}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                            <span className="min-w-0 truncate">{getTaskStatusDescription(task)}</span>

                            <div className="flex shrink-0 items-center gap-1">
                              {task.status === "uploading" ? (
                                <>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => pauseUploadTask(task.id)} aria-label={`Pausar ${task.fileName}`}>
                                    <Pause className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => cancelUploadTask(task.id)} aria-label={`Cancelar ${task.fileName}`}>
                                    <Ban className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              ) : null}

                              {task.status === "finalizing" ? (
                                <Button type="button" variant="ghost" size="sm" onClick={() => cancelUploadTask(task.id)} aria-label={`Cancelar ${task.fileName}`}>
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              ) : null}

                              {task.status === "queued" ? (
                                <>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => pauseUploadTask(task.id)} aria-label={`Pausar ${task.fileName}`}>
                                    <Pause className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => cancelUploadTask(task.id)} aria-label={`Cancelar ${task.fileName}`}>
                                    <Ban className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              ) : null}

                              {task.status === "paused" ? (
                                <>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => resumeUploadTask(task.id)} aria-label={`Retomar ${task.fileName}`}>
                                    <Play className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => cancelUploadTask(task.id)} aria-label={`Cancelar ${task.fileName}`}>
                                    <Ban className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              ) : null}

                              {task.status === "error" ? (
                                <>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => retryUploadTask(task.id)} aria-label={`Tentar novamente ${task.fileName}`}>
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => dismissUploadTask(task.id)} aria-label={`Fechar ${task.fileName}`}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              ) : null}

                              {(task.status === "completed" || task.status === "canceled" || task.status === "interrupted") ? (
                                <Button type="button" variant="ghost" size="sm" onClick={() => dismissUploadTask(task.id)} aria-label={`Remover ${task.fileName}`}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              ) : null}
                            </div>
                          </div>

                          {(task.status === "paused" || task.status === "error" || task.status === "interrupted") ? (
                            <div className={`flex items-start gap-2 rounded-xl px-3 py-2 text-[11px] ${task.status === "interrupted" ? "bg-orange-50 text-orange-800" : isRestartStyle ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-600"}`}>
                              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span>
                                {task.status === "interrupted"
                                  ? "Esta lista foi restaurada após uma interrupção. Para reenviar este arquivo, abra o cadastro correspondente e selecione a mídia novamente."
                                  : `Nesta etapa, ${task.status === "paused" ? "retomar" : "tentar novamente"} reinicia o envio do arquivo. A retomada real por partes ficará para a próxima evolução do fluxo.`}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <button
            type="button"
            onClick={() => setIsUploadPanelOpen((current) => !current)}
            className="group flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-xl transition hover:border-indigo-200 hover:bg-indigo-50"
            aria-label={isUploadPanelOpen ? "Fechar central de uploads" : "Abrir central de uploads"}
          >
            <div className="relative">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg">
                {uploadSummary.activeFiles > 0 ? <Loader2 className="h-5 w-5 animate-spin" /> : (uploadSummary.failedFiles + uploadSummary.interruptedFiles) > 0 ? <AlertCircle className="h-5 w-5" /> : uploadSummary.completedFiles === uploadSummary.totalFiles ? <CheckCircle2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
              </span>
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[10px] font-semibold text-white">
                {uploadSummary.totalFiles}
              </span>
            </div>

            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900">Uploads de mídia</p>
              <p className="text-xs text-slate-600">
                {uploadSummary.activeFiles > 0
                  ? uploadSummary.finalizingFiles > 0
                    ? `${uploadSummary.activeFiles} em andamento · ${uploadSummary.finalizingFiles} finalizando`
                    : `${uploadSummary.activeFiles} enviando agora`
                  : (uploadSummary.failedFiles + uploadSummary.interruptedFiles) > 0
                    ? `${uploadSummary.failedFiles + uploadSummary.interruptedFiles} com atenção`
                    : `${uploadSummary.completedFiles} concluído(s)`}
                {uploadSummary.queuedFiles > 0 ? ` · ${uploadSummary.queuedFiles} na fila` : ""}{uploadSummary.scheduledRetryFiles > 0 ? ` · ${uploadSummary.scheduledRetryFiles} em retry` : ""}
              </p>
            </div>

            <ChevronUp className={`h-4 w-4 text-slate-500 transition-transform ${isUploadPanelOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      ) : null}
    </UploadQueueContext.Provider>
  );
}

export function useUploadQueue() {
  const context = useContext(UploadQueueContext);
  if (!context) {
    throw new Error("useUploadQueue deve ser usado dentro de UploadQueueProvider");
  }
  return context;
}
