import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Ban, ChevronUp, Loader2, Pause, Play, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import apiClient from "../lib/apiClient";
import { useCompany } from "./CompanyContext";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

type UploadTaskKind = "image" | "video";
type UploadTaskTargetType = "point" | "unit";
type UploadTaskStatus = "queued" | "uploading" | "paused" | "completed" | "error" | "canceled";

export interface UploadTask {
  id: string;
  targetType: UploadTaskTargetType;
  targetId: string;
  pointId: string;
  pointName: string;
  unitId?: string;
  unitLabel?: string;
  kind: UploadTaskKind;
  file: File;
  fileName: string;
  totalBytes: number;
  loadedBytes: number;
  status: UploadTaskStatus;
  error?: string;
}

interface UploadQueueContextValue {
  uploadTasks: UploadTask[];
  enqueuePointUploads: (args: { pointId: string; pointName: string; imageFiles?: File[]; videoFiles?: File[] }) => void;
  enqueueUnitUploads: (args: { pointId: string; pointName: string; unitId: string; unitLabel: string; imageFiles?: File[]; videoFiles?: File[] }) => void;
}

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null);

const MAX_CONCURRENT_UPLOADS: Record<UploadTaskKind, number> = {
  image: 3,
  video: 2,
};

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

function getUploadErrorMessage(error: any, fallback: string) {
  const rawMessage = error?.response?.data?.message ?? error?.message;
  if (Array.isArray(rawMessage)) return rawMessage.join(", ");
  return String(rawMessage || fallback);
}

async function uploadTaskRequest(task: UploadTask, controller: AbortController, onProgress?: (progress: { loaded: number; total: number }) => void) {
  const formData = new FormData();
  formData.append("file", task.file);

  const uploadConfig = {
    signal: controller.signal,
    onUploadProgress: (event: ProgressEvent) => {
      const loaded = Number(event.loaded ?? 0);
      const total = Number(event.total ?? task.file.size ?? 0);
      onProgress?.({ loaded, total: total > 0 ? total : task.file.size });
    },
  } as any;

  if (task.targetType === "point") {
    const endpoint = task.kind === "image" ? `/media-points/${task.targetId}/image` : `/media-points/${task.targetId}/video`;
    await apiClient.post(endpoint, formData, uploadConfig);
    return;
  }

  const endpoint = task.kind === "image" ? `/media-units/${task.targetId}/image` : `/media-units/${task.targetId}/video`;
  await apiClient.post(endpoint, formData, uploadConfig);
}

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const company = useCompany() as any;
  const refreshEntitlements = company?.refreshEntitlements;

  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [isUploadPanelHovered, setIsUploadPanelHovered] = useState(false);

  const uploadTasksRef = useRef<UploadTask[]>([]);
  const activeTaskIdsRef = useRef<Set<string>>(new Set());
  const taskControllersRef = useRef<Map<string, AbortController>>(new Map());
  const taskAbortActionRef = useRef<Map<string, "pause" | "cancel">>(new Map());
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    uploadTasksRef.current = uploadTasks;
  }, [uploadTasks]);

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
    };
  }, []);

  const updateUploadTask = useCallback((taskId: string, updater: (task: UploadTask) => UploadTask) => {
    setUploadTasks((prev) => prev.map((task) => (task.id === taskId ? updater(task) : task)));
  }, []);

  const clearFinishedUploads = useCallback(() => {
    setUploadTasks((prev) => prev.filter((task) => task.status === "queued" || task.status === "uploading" || task.status === "paused" || task.status === "error"));
  }, []);

  const dismissUploadTask = useCallback((taskId: string) => {
    const controller = taskControllersRef.current.get(taskId);
    if (controller) {
      taskAbortActionRef.current.set(taskId, "cancel");
      controller.abort();
      taskControllersRef.current.delete(taskId);
    }
    activeTaskIdsRef.current.delete(taskId);
    setUploadTasks((prev) => prev.filter((task) => task.id !== taskId));
  }, []);

  const queueUploadTask = useCallback((taskId: string) => {
    setUploadTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: "queued", loadedBytes: 0, error: undefined } : task)));
  }, []);

  const pauseUploadTask = useCallback((taskId: string) => {
    const task = uploadTasksRef.current.find((item) => item.id === taskId);
    if (!task) return;

    if (task.status === "queued") {
      setUploadTasks((prev) => prev.map((item) => (item.id === taskId ? { ...item, status: "paused" } : item)));
      return;
    }

    if (task.status === "uploading") {
      const controller = taskControllersRef.current.get(taskId);
      if (controller) {
        taskAbortActionRef.current.set(taskId, "pause");
        controller.abort();
      }
    }
  }, []);

  const resumeUploadTask = useCallback((taskId: string) => {
    const task = uploadTasksRef.current.find((item) => item.id === taskId);
    if (!task) return;
    setUploadTasks((prev) => prev.map((item) => (item.id === taskId ? { ...item, status: "queued", loadedBytes: 0, error: undefined } : item)));
  }, []);

  const cancelUploadTask = useCallback((taskId: string) => {
    const task = uploadTasksRef.current.find((item) => item.id === taskId);
    if (!task) return;

    if (task.status === "uploading") {
      const controller = taskControllersRef.current.get(taskId);
      if (controller) {
        taskAbortActionRef.current.set(taskId, "cancel");
        controller.abort();
        return;
      }
    }

    setUploadTasks((prev) => prev.map((item) => (item.id === taskId ? { ...item, status: "canceled", error: undefined } : item)));
  }, []);

  const retryUploadTask = useCallback((taskId: string) => {
    queueUploadTask(taskId);
  }, [queueUploadTask]);

  const startUploadTask = useCallback(async (task: UploadTask) => {
    const controller = new AbortController();
    taskControllersRef.current.set(task.id, controller);
    activeTaskIdsRef.current.add(task.id);
    updateUploadTask(task.id, (current) => ({ ...current, status: "uploading", loadedBytes: 0, error: undefined }));

    try {
      await uploadTaskRequest(task, controller, ({ loaded, total }) => {
        updateUploadTask(task.id, (current) => ({
          ...current,
          loadedBytes: Math.min(total || current.totalBytes, loaded),
          totalBytes: total > 0 ? total : current.totalBytes,
        }));
      });

      updateUploadTask(task.id, (current) => ({
        ...current,
        status: "completed",
        loadedBytes: current.totalBytes,
        error: undefined,
      }));
      window.dispatchEvent(new CustomEvent("inventory:uploads-updated", { detail: { pointId: task.pointId, targetType: task.targetType, targetId: task.targetId } }));
      scheduleEntitlementRefresh();
    } catch (error: any) {
      const abortAction = taskAbortActionRef.current.get(task.id);
      const wasAborted = controller.signal.aborted || error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError";

      if (wasAborted && abortAction === "pause") {
        updateUploadTask(task.id, (current) => ({ ...current, status: "paused", error: undefined }));
      } else if (wasAborted && abortAction === "cancel") {
        updateUploadTask(task.id, (current) => ({ ...current, status: "canceled", error: undefined }));
      } else {
        updateUploadTask(task.id, (current) => ({
          ...current,
          status: "error",
          error: getUploadErrorMessage(error, `Falha ao enviar ${current.fileName}`),
        }));
        toast.error(getUploadErrorMessage(error, `Falha ao enviar ${task.fileName}`));
      }
    } finally {
      taskAbortActionRef.current.delete(task.id);
      taskControllersRef.current.delete(task.id);
      activeTaskIdsRef.current.delete(task.id);
    }
  }, [scheduleEntitlementRefresh, updateUploadTask]);

  const pumpUploadQueue = useCallback(() => {
    const snapshot = uploadTasksRef.current;
    const activeByKind: Record<UploadTaskKind, number> = { image: 0, video: 0 };

    for (const activeId of activeTaskIdsRef.current) {
      const activeTask = snapshot.find((task) => task.id === activeId);
      if (activeTask) activeByKind[activeTask.kind] += 1;
    }

    for (const task of snapshot) {
      if (task.status !== "queued") continue;
      if (activeTaskIdsRef.current.has(task.id)) continue;
      if (activeByKind[task.kind] >= MAX_CONCURRENT_UPLOADS[task.kind]) continue;
      activeByKind[task.kind] += 1;
      void startUploadTask(task);
    }
  }, [startUploadTask]);

  useEffect(() => {
    pumpUploadQueue();
  }, [uploadTasks, pumpUploadQueue]);

  const enqueuePointUploads = useCallback((args: { pointId: string; pointName: string; imageFiles?: File[]; videoFiles?: File[] }) => {
    const imageFiles = args.imageFiles ?? [];
    const videoFiles = args.videoFiles ?? [];
    const createdAt = Date.now();
    const nextTasks: UploadTask[] = [
      ...imageFiles.map((file, index) => ({
        id: `point-image-${args.pointId}-${createdAt}-${index}-${crypto.randomUUID()}`,
        targetType: "point" as const,
        targetId: args.pointId,
        pointId: args.pointId,
        pointName: args.pointName,
        kind: "image" as const,
        file,
        fileName: file.name,
        totalBytes: file.size ?? 0,
        loadedBytes: 0,
        status: "queued" as const,
      })),
      ...videoFiles.map((file, index) => ({
        id: `point-video-${args.pointId}-${createdAt}-${index}-${crypto.randomUUID()}`,
        targetType: "point" as const,
        targetId: args.pointId,
        pointId: args.pointId,
        pointName: args.pointName,
        kind: "video" as const,
        file,
        fileName: file.name,
        totalBytes: file.size ?? 0,
        loadedBytes: 0,
        status: "queued" as const,
      })),
    ];

    if (!nextTasks.length) return;
    setUploadTasks((prev) => [...prev, ...nextTasks]);
    toast.success(`${nextTasks.length} arquivo(s) estão sendo enviados em segundo plano.`);
  }, []);

  const enqueueUnitUploads = useCallback((args: { pointId: string; pointName: string; unitId: string; unitLabel: string; imageFiles?: File[]; videoFiles?: File[] }) => {
    const imageFiles = args.imageFiles ?? [];
    const videoFiles = args.videoFiles ?? [];
    const createdAt = Date.now();
    const nextTasks: UploadTask[] = [
      ...imageFiles.map((file, index) => ({
        id: `unit-image-${args.unitId}-${createdAt}-${index}-${crypto.randomUUID()}`,
        targetType: "unit" as const,
        targetId: args.unitId,
        pointId: args.pointId,
        pointName: args.pointName,
        unitId: args.unitId,
        unitLabel: args.unitLabel,
        kind: "image" as const,
        file,
        fileName: file.name,
        totalBytes: file.size ?? 0,
        loadedBytes: 0,
        status: "queued" as const,
      })),
      ...videoFiles.map((file, index) => ({
        id: `unit-video-${args.unitId}-${createdAt}-${index}-${crypto.randomUUID()}`,
        targetType: "unit" as const,
        targetId: args.unitId,
        pointId: args.pointId,
        pointName: args.pointName,
        unitId: args.unitId,
        unitLabel: args.unitLabel,
        kind: "video" as const,
        file,
        fileName: file.name,
        totalBytes: file.size ?? 0,
        loadedBytes: 0,
        status: "queued" as const,
      })),
    ];

    if (!nextTasks.length) return;
    setUploadTasks((prev) => [...prev, ...nextTasks]);
    toast.success(`${nextTasks.length} arquivo(s) da unidade estão sendo enviados em segundo plano.`);
  }, []);

  const uploadSummary = useMemo(() => {
    const totalFiles = uploadTasks.length;
    const completedFiles = uploadTasks.filter((task) => task.status === "completed").length;
    const failedFiles = uploadTasks.filter((task) => task.status === "error").length;
    const pausedFiles = uploadTasks.filter((task) => task.status === "paused").length;
    const canceledFiles = uploadTasks.filter((task) => task.status === "canceled").length;
    const activeFiles = uploadTasks.filter((task) => task.status === "uploading").length;
    const queuedFiles = uploadTasks.filter((task) => task.status === "queued").length;
    const finishedFiles = completedFiles + failedFiles + canceledFiles;
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
      activeFiles,
      queuedFiles,
      pausedFiles,
      canceledFiles,
      remainingFiles,
      totalBytes,
      loadedBytes,
      progressPercent,
    };
  }, [uploadTasks]);

  const value = useMemo<UploadQueueContextValue>(() => ({
    uploadTasks,
    enqueuePointUploads,
    enqueueUnitUploads,
  }), [uploadTasks, enqueuePointUploads, enqueueUnitUploads]);

  return (
    <UploadQueueContext.Provider value={value}>
      {children}

      {uploadSummary.totalFiles > 0 && (
        <div
          className={`fixed bottom-6 right-6 z-[80] transition-all duration-200 ${isUploadPanelHovered ? "w-full max-w-xl" : "w-full max-w-sm"}`}
          onMouseEnter={() => setIsUploadPanelHovered(true)}
          onMouseLeave={() => setIsUploadPanelHovered(false)}
        >
          <Card className="border-slate-200 shadow-2xl">
            <CardContent className={`pt-4 ${isUploadPanelHovered ? "space-y-4" : "space-y-3"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">Uploads de mídia</p>
                    {uploadSummary.activeFiles > 0 ? <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> : null}
                  </div>
                  <p className="text-xs text-slate-600">
                    {uploadSummary.completedFiles}/{uploadSummary.totalFiles} concluídos
                    {uploadSummary.activeFiles ? ` · ${uploadSummary.activeFiles} enviando` : ""}
                    {uploadSummary.queuedFiles ? ` · ${uploadSummary.queuedFiles} na fila` : ""}
                    {uploadSummary.pausedFiles ? ` · ${uploadSummary.pausedFiles} pausados` : ""}
                    {uploadSummary.failedFiles ? ` · ${uploadSummary.failedFiles} com erro` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronUp className={`h-4 w-4 text-slate-500 transition-transform ${isUploadPanelHovered ? "rotate-180" : ""}`} />
                  <Button type="button" variant="outline" size="sm" onClick={clearFinishedUploads}>
                    Limpar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>{formatBytes(uploadSummary.loadedBytes)} enviados</span>
                  <span>{formatBytes(uploadSummary.totalBytes)} no total</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${uploadSummary.progressPercent}%` }} />
                </div>
              </div>

              {isUploadPanelHovered ? (
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {uploadTasks.map((task) => {
                    const percent = task.totalBytes > 0 ? Math.min(100, (Math.min(task.loadedBytes, task.totalBytes) / task.totalBytes) * 100) : 0;
                    return (
                      <div key={task.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{task.fileName}</p>
                            <p className="text-xs text-slate-600">
                              {task.targetType === "point" ? task.pointName : `${task.pointName} · ${task.unitLabel || "Unidade"}`}
                            </p>
                            <p className="text-xs text-slate-500">
                              {task.kind === "video" ? "Vídeo" : "Imagem"} · {formatBytes(task.totalBytes)}
                            </p>
                          </div>
                          <span className="text-xs text-slate-500">
                            {task.status === "queued" ? "Na fila" : task.status === "paused" ? "Pausado" : task.status === "uploading" ? `${percent.toFixed(0)}%` : task.status === "completed" ? "Concluído" : task.status === "canceled" ? "Cancelado" : "Erro"}
                          </span>
                        </div>

                        <div className="mt-3 space-y-2">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full transition-all ${task.status === "error" ? "bg-red-500" : task.status === "completed" ? "bg-emerald-500" : task.status === "paused" ? "bg-amber-500" : task.status === "canceled" ? "bg-slate-400" : "bg-indigo-500"}`}
                              style={{ width: `${task.status === "completed" ? 100 : task.status === "error" ? Math.max(percent, 8) : task.status === "canceled" ? Math.max(percent, 8) : percent}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                            <span className="min-w-0 truncate">
                              {task.status === "queued" && "Aguardando envio"}
                              {task.status === "paused" && "Upload pausado"}
                              {task.status === "uploading" && `${formatBytes(task.loadedBytes)} de ${formatBytes(task.totalBytes)}`}
                              {task.status === "completed" && "Upload concluído"}
                              {task.status === "canceled" && "Upload cancelado"}
                              {task.status === "error" && (task.error || "Falha no upload")}
                            </span>
                            <div className="flex shrink-0 items-center gap-1">
                              {task.status === "uploading" ? (
                                <>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => pauseUploadTask(task.id)}><Pause className="h-3.5 w-3.5" /></Button>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => cancelUploadTask(task.id)}><Ban className="h-3.5 w-3.5" /></Button>
                                </>
                              ) : null}
                              {task.status === "queued" ? (
                                <>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => pauseUploadTask(task.id)}><Pause className="h-3.5 w-3.5" /></Button>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => cancelUploadTask(task.id)}><Ban className="h-3.5 w-3.5" /></Button>
                                </>
                              ) : null}
                              {task.status === "paused" ? (
                                <>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => resumeUploadTask(task.id)}><Play className="h-3.5 w-3.5" /></Button>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => cancelUploadTask(task.id)}><Ban className="h-3.5 w-3.5" /></Button>
                                </>
                              ) : null}
                              {task.status === "error" ? (
                                <>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => retryUploadTask(task.id)}><RotateCcw className="h-3.5 w-3.5" /></Button>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => dismissUploadTask(task.id)}><X className="h-3.5 w-3.5" /></Button>
                                </>
                              ) : null}
                              {(task.status === "completed" || task.status === "canceled") ? (
                                <Button type="button" variant="ghost" size="sm" onClick={() => dismissUploadTask(task.id)}><X className="h-3.5 w-3.5" /></Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>{uploadSummary.remainingFiles} restantes</span>
                  <span>{uploadSummary.totalFiles} arquivos</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
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
