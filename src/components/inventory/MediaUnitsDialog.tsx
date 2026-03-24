import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Plus, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { MediaPoint, MediaType, MediaUnit, UnitType, Orientation } from '../../types';
import { useMediaUnits } from '../../hooks/useMediaUnits';
import { useCompany } from '../../contexts/CompanyContext';
import { validateUploadBatchAgainstEntitlements } from '../../lib/mediaValidation';
import { resolveUploadsUrl } from '../../lib/format';
import { toast } from 'sonner';

interface MediaUnitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaPointId: string;
  mediaPointName: string;
  mediaPointType: MediaType;
  mediaPoint?: MediaPoint | null;
  onChanged?: () => Promise<any> | void;
  onEnqueueUploads?: (args: { pointId: string; pointName: string; unitId: string; unitLabel: string; imageFiles: File[]; videoFiles: File[] }) => Promise<any> | void;
}

type UnitFormPayload = Partial<
  Pick<
    MediaUnit,
    | 'label'
    | 'orientation'
    | 'widthM'
    | 'heightM'
    | 'insertionsPerDay'
    | 'resolutionWidthPx'
    | 'resolutionHeightPx'
    | 'priceMonth'
    | 'priceWeek'
  >
>;

function sanitizeUnitPayload(payload: UnitFormPayload) {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    clean[k] = v;
  }
  return clean;
}

function parseNonNegativeFloatInput(value: string) {
  if (!value) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, numeric);
}

function parseNonNegativeIntInput(value: string) {
  if (!value) return null;
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, numeric);
}

function parseBytes(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return 0;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const decimals = size >= 100 || unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(decimals)} ${units[unitIndex]}`;
}

export function MediaUnitsDialog({
  open,
  onOpenChange,
  mediaPointId,
  mediaPointName,
  mediaPointType,
  mediaPoint,
  onChanged,
  onEnqueueUploads,
}: MediaUnitsDialogProps) {
  const { units, loading, error, refetch, createUnit, getUnitById, updateUnit, deleteUnit, deleteUnitAsset } =
    useMediaUnits({ mediaPointId: open ? mediaPointId : null });

  const company = useCompany() as any;
  const entitlements = company?.entitlements;
  const refreshEntitlements = company?.refreshEntitlements;
  const [isAdding, setIsAdding] = useState(false);
  const [editingUnit, setEditingUnit] = useState<MediaUnit | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setIsAdding(false);
      setEditingUnit(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleUploadsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ pointId?: string }>).detail;
      if (detail?.pointId !== mediaPointId) return;
      void refetch();
    };

    window.addEventListener('inventory:uploads-updated', handleUploadsUpdated as EventListener);
    return () => {
      window.removeEventListener('inventory:uploads-updated', handleUploadsUpdated as EventListener);
    };
  }, [mediaPointId, open, refetch]);

  const getOrientationLabel = (orientation?: Orientation) => {
    if (!orientation) return '-';
    return orientation === Orientation.FLUXO ? 'Fluxo' : 'Contra-Fluxo';
  };

  const getOrientationColor = (orientation?: Orientation) => {
    if (!orientation) return 'bg-gray-100 text-gray-800';
    return orientation === Orientation.FLUXO
      ? 'bg-blue-100 text-blue-800'
      : 'bg-purple-100 text-purple-800';
  };

  const unitTypeForPoint = mediaPointType === MediaType.OOH ? UnitType.FACE : UnitType.SCREEN;
  const unitLabel = mediaPointType === MediaType.OOH ? 'Face' : 'Tela';
  const storageLimitBytes = Math.max(0, Number(entitlements?.limits?.totalStorageGb ?? 0) * 1024 * 1024 * 1024);
  const pointBaseStorageBytes = parseBytes(mediaPoint?.storageUsedBytes);
  const pointUnitsStorageBytes = units.reduce((total, unit) => total + parseBytes(unit.storageUsedBytes), 0);
  const pointTotalStorageBytes = pointBaseStorageBytes + pointUnitsStorageBytes;
  const globalStorageUsedBytes = parseBytes(entitlements?.usage?.storageUsedBytes);
  const globalStorageRemainingBytes = parseBytes(entitlements?.remaining?.storageRemainingBytes);
  const pointStoragePercent = storageLimitBytes > 0 ? Math.min(100, (globalStorageUsedBytes / storageLimitBytes) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {unitLabel}s do Ponto - {mediaPointName}
          </DialogTitle>
          <p className="text-gray-600">
            {mediaPointType === MediaType.OOH
              ? 'Gerencie as faces (unidades de veiculação) deste ponto OOH'
              : 'Gerencie as telas (unidades digitais) deste ponto DOOH'}
          </p>
        </DialogHeader>

        {storageLimitBytes > 0 && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Armazenamento do plano</p>
                <p className="text-xs text-slate-600">Uso global da assinatura. Deste ponto: {formatBytes(pointTotalStorageBytes)}.</p>
              </div>
              <div className="text-right text-sm text-slate-700">
                <div>{formatBytes(globalStorageUsedBytes)} / {formatBytes(storageLimitBytes)}</div>
                <div className="text-xs text-slate-500">Disponível no plano: {formatBytes(globalStorageRemainingBytes)}</div>
              </div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pointStoragePercent}%` }} />
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Lista de unidades */}
          <div className="space-y-3">
            {loading ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-600">Carregando...</CardContent>
              </Card>
            ) : error ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-red-600 mb-3">Erro ao carregar unidades.</p>
                  <p className="text-sm text-gray-600">{String(error.message || error)}</p>
                </CardContent>
              </Card>
            ) : units.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-gray-500 mb-4">Nenhuma {unitLabel.toLowerCase()} cadastrada</p>
                  <Button onClick={() => setIsAdding(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar {unitLabel}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {units.map((unit) => (
                  <Card key={unit.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-gray-900">{unit.label}</h4>
                            {unit.orientation && (
                              <Badge className={getOrientationColor(unit.orientation)}>
                                {getOrientationLabel(unit.orientation)}
                              </Badge>
                            )}
                            <Badge variant={unit.isActive ? 'default' : 'secondary'}>
                              {unit.isActive ? 'Ativa' : 'Inativa'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                            {mediaPointType === MediaType.OOH && (
                              <>
                                {(unit.widthM || unit.heightM) && (
                                  <div>
                                    <span className="text-gray-600">Dimensões: </span>
                                    <span className="text-gray-900">
                                      {unit.widthM || '-'}m x {unit.heightM || '-'}m
                                    </span>
                                  </div>
                                )}
                              </>
                            )}

                            {mediaPointType === MediaType.DOOH && (
                              <>
                                {unit.insertionsPerDay !== undefined &&
                                  unit.insertionsPerDay !== null && (
                                    <div>
                                      <span className="text-gray-600">Inserções/dia: </span>
                                      <span className="text-gray-900">{unit.insertionsPerDay}</span>
                                    </div>
                                  )}
                                {unit.resolutionWidthPx && unit.resolutionHeightPx && (
                                  <div>
                                    <span className="text-gray-600">Resolução: </span>
                                    <span className="text-gray-900">
                                      {unit.resolutionWidthPx}x{unit.resolutionHeightPx}px
                                    </span>
                                  </div>
                                )}
                              </>
                            )}

                            {(unit.priceMonth || unit.priceWeek) && (
                              <div className="md:col-span-2">
                                <span className="text-gray-600">Preços: </span>
                                <span className="text-gray-900">
                                  {unit.priceMonth ? `R$ ${unit.priceMonth}/mês` : ''}
                                  {unit.priceWeek ? ` • R$ ${unit.priceWeek}/bi-semana` : ''}
                                </span>
                              </div>
                            )}
                          </div>

                          {unit.imageUrl && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <ImageIcon className="w-4 h-4" />
                              <span>Imagem disponível</span>
                            </div>
                          )}

                          {unit.videoUrl && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-gray-100 text-gray-700 text-[10px]">
                                ▶
                              </span>
                              <span>Vídeo disponível</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loadingEditId === unit.id}
                            onClick={async () => {
                              setLoadingEditId(unit.id);
                              try {
                                const detailed = await getUnitById(unit.id);
                                setEditingUnit(detailed);
                              } catch {
                                setEditingUnit(unit);
                              } finally {
                                setLoadingEditId(null);
                              }
                            }}
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const ok = window.confirm('Excluir esta unidade?');
                              if (!ok) return;
                              try {
                                await deleteUnit(unit.id);
                                await refreshEntitlements?.();
                                await onChanged?.();
                              } catch (e) {
                                console.error(e);
                                alert('Erro ao excluir unidade.');
                              }
                            }}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button variant="outline" className="w-full" onClick={() => setIsAdding(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar {unitLabel}
                </Button>
              </>
            )}
          </div>

          {/* Formulário de adição/edição */}
          {(isAdding || editingUnit) && (
            <UnitForm
              unit={editingUnit}
              mediaPointType={mediaPointType}
              entitlements={entitlements}
              onSave={async (data, imageFiles = [], videoFiles = []) => {
                try {
                  const clean = sanitizeUnitPayload(data);

                  if (editingUnit) {
                    const updated = await updateUnit(editingUnit.id, clean);
                    if (imageFiles.length || videoFiles.length) {
                      await onEnqueueUploads?.({
                        pointId: mediaPointId,
                        pointName: mediaPointName,
                        unitId: editingUnit.id,
                        unitLabel: String(clean.label ?? updated?.label ?? editingUnit.label ?? unitLabel),
                        imageFiles: [...imageFiles],
                        videoFiles: [...videoFiles],
                      });
                    }
                    await onChanged?.();
                    setEditingUnit(null);
                    toast.success(
                      imageFiles.length || videoFiles.length
                        ? 'Unidade salva. Os uploads continuarão em segundo plano.'
                        : 'Unidade atualizada com sucesso.',
                    );
                  } else {
                    const created = await createUnit({
                      ...clean,
                      unitType: unitTypeForPoint,
                      label: (clean.label ?? '').toString(),
                    } as any);
                    if (imageFiles.length || videoFiles.length) {
                      await onEnqueueUploads?.({
                        pointId: mediaPointId,
                        pointName: mediaPointName,
                        unitId: created.id,
                        unitLabel: String(clean.label ?? created.label ?? unitLabel),
                        imageFiles: [...imageFiles],
                        videoFiles: [...videoFiles],
                      });
                    }
                    await onChanged?.();
                    setIsAdding(false);
                    toast.success(
                      imageFiles.length || videoFiles.length
                        ? 'Unidade criada. Os uploads continuarão em segundo plano.'
                        : 'Unidade criada com sucesso.',
                    );
                  }
	                } catch (e: any) {
	                  console.error(e);
	                  const msg = e?.message || 'Erro ao salvar unidade.';
	                  toast.error(msg);
                }
              }}
              onCancel={() => {
                setIsAdding(false);
                setEditingUnit(null);
              }}
              onDeleteAsset={deleteUnitAsset}
              refreshEntitlements={refreshEntitlements}
              pointBaseStorageBytes={pointBaseStorageBytes}
              otherUnitsStorageBytes={units.reduce((total, current) => total + (editingUnit && current.id === editingUnit.id ? 0 : parseBytes(current.storageUsedBytes)), 0)}
              storageLimitBytes={storageLimitBytes}
              unitLabel={unitLabel}
              onChanged={onChanged}
            />
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type ExistingAssetPreview = { id?: string; src: string };

interface UnitFormProps {
  unit: MediaUnit | null;
  mediaPointType: MediaType;
  onSave: (data: UnitFormPayload, imageFiles?: File[], videoFiles?: File[]) => void;
  onCancel: () => void;
  entitlements: any;
  onDeleteAsset?: (unitId: string, assetId: string) => Promise<any> | void;
  refreshEntitlements?: () => Promise<any> | void;
  pointBaseStorageBytes: number;
  otherUnitsStorageBytes: number;
  storageLimitBytes: number;
  unitLabel: string;
  onChanged?: () => Promise<any> | void;
}

function UnitForm({ unit, mediaPointType, onSave, onCancel, entitlements, onDeleteAsset, refreshEntitlements, pointBaseStorageBytes, otherUnitsStorageBytes, storageLimitBytes, unitLabel, onChanged }: UnitFormProps) {
  const [formData, setFormData] = useState<UnitFormPayload>(
    unit
      ? {
        label: unit.label,
        orientation: unit.orientation,
        widthM: unit.widthM,
        heightM: unit.heightM,
        insertionsPerDay: unit.insertionsPerDay,
        resolutionWidthPx: unit.resolutionWidthPx,
        resolutionHeightPx: unit.resolutionHeightPx,
        priceMonth: unit.priceMonth,
        priceWeek: unit.priceWeek,
      }
      : {
        label: '',
      }
  );

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImageAssets, setExistingImageAssets] = useState<ExistingAssetPreview[]>([]);

  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [existingVideoAssets, setExistingVideoAssets] = useState<ExistingAssetPreview[]>([]);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
  const [unitSnapshot, setUnitSnapshot] = useState<MediaUnit | null>(unit);

  const fileLimits = entitlements?.limits?.file;

  const syncExistingAssets = (target?: MediaUnit | null) => {
    const mediaAssets = Array.isArray((target as any)?.mediaAssets) ? (target as any).mediaAssets : [];
    const imageAssets = mediaAssets
      .filter((asset: any) => asset?.kind === 'IMAGE' && asset?.url)
      .map((asset: any) => ({ id: asset.id, src: resolveUploadsUrl(asset.url) || asset.url }))
      .filter((asset: ExistingAssetPreview) => !!asset.src);
    const videoAssets = mediaAssets
      .filter((asset: any) => asset?.kind === 'VIDEO' && asset?.url)
      .map((asset: any) => ({ id: asset.id, src: resolveUploadsUrl(asset.url) || asset.url }))
      .filter((asset: ExistingAssetPreview) => !!asset.src);

    setExistingImageAssets(imageAssets.length ? imageAssets : (resolveUploadsUrl(target?.imageUrl) ? [{ src: resolveUploadsUrl(target?.imageUrl)! }] : []));
    setExistingVideoAssets(videoAssets.length ? videoAssets : (resolveUploadsUrl(target?.videoUrl) ? [{ src: resolveUploadsUrl(target?.videoUrl)! }] : []));
  };

  const resolveExistingAssetId = (kind: 'image' | 'video', src: string, preferredId?: string) => {
    if (preferredId) return preferredId;

    const snapshot = unitSnapshot ?? unit ?? null;
    const mediaAssets = Array.isArray((snapshot as any)?.mediaAssets) ? (snapshot as any).mediaAssets : [];
    const targetKind = kind === 'image' ? 'IMAGE' : 'VIDEO';
    const normalizedSrc = resolveUploadsUrl(src) || src;

    const match = mediaAssets.find((asset: any) => {
      if (!asset || asset.kind !== targetKind || !asset.url) return false;
      const normalizedAssetUrl = resolveUploadsUrl(asset.url) || asset.url;
      return normalizedAssetUrl === normalizedSrc;
    });

    return match?.id as string | undefined;
  };

  // Quando alterna de "nova unidade" para "editar" (ou troca a unidade sendo editada),
  // precisamos sincronizar o estado interno do formulário com a prop `unit`.
  useEffect(() => {
    if (unit) {
      setUnitSnapshot(unit);
      setFormData({
        label: unit.label,
        orientation: unit.orientation,
        widthM: unit.widthM,
        heightM: unit.heightM,
        insertionsPerDay: unit.insertionsPerDay,
        resolutionWidthPx: unit.resolutionWidthPx,
        resolutionHeightPx: unit.resolutionHeightPx,
        priceMonth: unit.priceMonth,
        priceWeek: unit.priceWeek,
      });
      setImageFiles([]);
      setImagePreviews([]);
      setVideoFiles([]);
      setVideoPreviews([]);
      syncExistingAssets(unit);
    } else {
      setUnitSnapshot(null);
      setFormData({ label: '' });
      setImageFiles([]);
      setImagePreviews([]);
      setExistingImageAssets([]);

      setVideoFiles([]);
      setVideoPreviews([]);
      setExistingVideoAssets([]);
    }
  }, [unit]);


  const updateField = (field: keyof UnitFormPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) {
      setImageFiles([]);
      setImagePreviews([]);
      return;
    }

    const err = await validateUploadBatchAgainstEntitlements([
      ...imageFiles.map((file) => ({ file, kind: 'image' as const })),
      ...files.map((file) => ({ file, kind: 'image' as const })),
      ...videoFiles.map((file) => ({ file, kind: 'video' as const })),
    ], entitlements);
    if (err) {
      toast.error(err);
      try { (e.target as any).value = ''; } catch {}
      setImageFiles([]);
      return;
    }

    setImageFiles((prev) => [...prev, ...files]);
    setImagePreviews((prev) => [...prev, ...files.map((file) => URL.createObjectURL(file))]);
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) {
      setVideoFiles([]);
      setVideoPreviews([]);
      return;
    }

    const err = await validateUploadBatchAgainstEntitlements([
      ...imageFiles.map((file) => ({ file, kind: 'image' as const })),
      ...videoFiles.map((file) => ({ file, kind: 'video' as const })),
      ...files.map((file) => ({ file, kind: 'video' as const })),
    ], entitlements);
    if (err) {
      toast.error(err);
      try { (e.target as any).value = ''; } catch {}
      setVideoFiles([]);
      return;
    }

    setVideoFiles((prev) => [...prev, ...files]);
    setVideoPreviews([]);
  };

  const removePendingImage = (idx: number) => {
    setImageFiles((prev) => prev.filter((_, currentIdx) => currentIdx !== idx));
    setImagePreviews((prev) => {
      const target = prev[idx];
      if (target?.startsWith('blob:')) URL.revokeObjectURL(target);
      return prev.filter((_, currentIdx) => currentIdx !== idx);
    });
  };

  const removePendingVideo = (idx: number) => {
    setVideoFiles((prev) => prev.filter((_, currentIdx) => currentIdx !== idx));
    setVideoPreviews([]);
  };

  const handleDeleteExistingAsset = async (kind: 'image' | 'video', assetId?: string) => {
    if (!unit?.id || !assetId || !onDeleteAsset) return;

    try {
      setDeletingAssetId(assetId);
      const updated = await onDeleteAsset(unit.id, assetId);
      const nextUnit = (updated as MediaUnit) ?? unit;
      setUnitSnapshot(nextUnit);
      syncExistingAssets(nextUnit);
      await refreshEntitlements?.();
      await onChanged?.();
      toast.success(kind === 'image' ? 'Imagem da unidade removida.' : 'Vídeo da unidade removido.');
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível remover a mídia da unidade.');
    } finally {
      setDeletingAssetId(null);
    }
  };

  useEffect(() => {
    return () => {
      for (const src of imagePreviews) {
        if (src?.startsWith('blob:')) URL.revokeObjectURL(src);
      }
      for (const src of videoPreviews) {
        if (src?.startsWith('blob:')) URL.revokeObjectURL(src);
      }
    };
  }, [imagePreviews, videoPreviews]);

  const currentUnitStorageBytes = parseBytes(unitSnapshot?.storageUsedBytes);
  const globalStorageUsedBytes = parseBytes(entitlements?.usage?.storageUsedBytes);
  const pendingStorageBytes = [...imageFiles, ...videoFiles].reduce((total, file) => total + (file?.size ?? 0), 0);
  const projectedPointStorageBytes = pointBaseStorageBytes + otherUnitsStorageBytes + currentUnitStorageBytes + pendingStorageBytes;
  const projectedGlobalStorageUsedBytes = globalStorageUsedBytes + pendingStorageBytes;
  const projectedStoragePercent = storageLimitBytes > 0 ? Math.min(100, (projectedGlobalStorageUsedBytes / storageLimitBytes) * 100) : 0;

  return (
    <Card className="border-2 border-indigo-200">
      <CardContent className="pt-6 space-y-4">
        <h4 className="text-gray-900 mb-4">{unit ? 'Editar Unidade' : 'Nova Unidade'}</h4>

        {storageLimitBytes > 0 && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Armazenamento do plano compartilhado com as {unitLabel.toLowerCase()}s</p>
                <p className="text-xs text-slate-600">Esta {unitLabel.toLowerCase()} consome o armazenamento global do plano. Deste ponto: {formatBytes(pointBaseStorageBytes + otherUnitsStorageBytes + currentUnitStorageBytes)}.</p>
              </div>
              <div className="text-right text-sm text-slate-700">
                <div>{formatBytes(globalStorageUsedBytes)} / {formatBytes(storageLimitBytes)}</div>
                {pendingStorageBytes > 0 ? <div className="text-xs text-amber-700">Após salvar: {formatBytes(projectedGlobalStorageUsedBytes)}</div> : <div className="text-xs text-slate-500">Disponível no plano: {formatBytes(Math.max(0, storageLimitBytes - globalStorageUsedBytes))}</div>}
              </div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${projectedStoragePercent}%` }} />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Nome/Label *</Label>
          <Input
            placeholder={mediaPointType === MediaType.OOH ? 'Ex: Face 1 - Principal' : 'Ex: Tela 1 - Entrada'}
            value={formData.label || ''}
            onChange={(e) => updateField('label', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Imagem da {mediaPointType === MediaType.OOH ? 'Face' : 'Tela'}</Label>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/gif"
            multiple
            onChange={handleImageChange}
            className="flex-1"
          />
          {(existingImageAssets.length > 0 || imagePreviews.length > 0) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">Imagens selecionadas/cadastradas</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {existingImageAssets.map((asset, idx) => {
                  const deleteAssetId = resolveExistingAssetId('image', asset.src, asset.id);
                  return (
                    <div key={`existing-img-${asset.id ?? idx}`} className="rounded-lg border bg-white p-2 space-y-2">
                      <div className="h-24 bg-gray-100 rounded overflow-hidden">
                        <img src={asset.src} alt={`Imagem cadastrada ${idx + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-600">Imagem cadastrada {idx + 1}</span>
                        {deleteAssetId && onDeleteAsset ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={deletingAssetId === deleteAssetId}
                            onClick={() => handleDeleteExistingAsset('image', deleteAssetId)}
                          >
                            Excluir
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                {imagePreviews.map((src, idx) => (
                  <div key={`img-${idx}`} className="rounded-lg border border-dashed bg-white p-2 space-y-2">
                    <div className="h-24 bg-gray-100 rounded overflow-hidden">
                      <img src={src} alt={`Nova imagem ${idx + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-600">Nova imagem {idx + 1}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removePendingImage(idx)}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500">
            JPG, PNG ou GIF (máx. {fileLimits?.maxImageMb ?? 4}MB por arquivo, respeitando o armazenamento restante do plano).
          </p>
        </div>

        <div className="space-y-2">
          <Label>Vídeo da {mediaPointType === MediaType.OOH ? 'Face' : 'Tela'} (opcional)</Label>
          <Input
            type="file"
            accept="video/*"
            multiple
            onChange={handleVideoChange}
            className="flex-1"
          />
          {(existingVideoAssets.length > 0 || videoFiles.length > 0) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">Vídeos selecionados/cadastrados</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {existingVideoAssets.map((asset, idx) => {
                  const deleteAssetId = resolveExistingAssetId('video', asset.src, asset.id);
                  return (
                    <div key={`existing-video-${asset.id ?? idx}`} className="rounded-lg border bg-white p-2 space-y-2">
                      <div className="h-24 bg-gray-100 rounded overflow-hidden">
                        <video src={asset.src} className="w-full h-full object-cover" controls muted preload="none" />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-600">Vídeo cadastrado {idx + 1}</span>
                        {deleteAssetId && onDeleteAsset ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={deletingAssetId === deleteAssetId}
                            onClick={() => handleDeleteExistingAsset('video', deleteAssetId)}
                          >
                            Excluir
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                {videoFiles.map((file, idx) => (
                  <div key={`video-${idx}`} className="rounded-lg border border-dashed bg-white p-3 space-y-2">
                    <div className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      <div className="font-medium truncate">{file.name}</div>
                      <div className="text-xs text-gray-500">{formatBytes(file.size)} • upload pendente</div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-600">Novo vídeo {idx + 1}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removePendingVideo(idx)}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500">
            MP4/WebM/MOV (máx. {fileLimits?.maxVideoMb ?? 150}MB e {fileLimits?.maxVideoSeconds ?? 90}s por arquivo). O upload será feito ao salvar, respeitando o armazenamento restante do plano.
          </p>
        </div>

        {/* Campos específicos OOH */}
        {mediaPointType === MediaType.OOH && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Largura (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="3.00"
                  min="0"
                  value={formData.widthM ?? ''}
                  onChange={(e) => updateField('widthM', parseNonNegativeFloatInput(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Altura (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="9.00"
                  min="0"
                  value={formData.heightM ?? ''}
                  onChange={(e) => updateField('heightM', parseNonNegativeFloatInput(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Orientação</Label>
              <Select
                value={formData.orientation || ''}
                onValueChange={(value: string) =>
                  updateField('orientation', (value || null) as Orientation | null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a orientação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Orientation.FLUXO}>Fluxo</SelectItem>
                  <SelectItem value={Orientation.CONTRA_FLUXO}>Contra-Fluxo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Campos específicos DOOH */}
        {mediaPointType === MediaType.DOOH && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inserções por Dia</Label>
                <Input
                  type="number"
                  placeholder="150"
                  min="0"
                  value={formData.insertionsPerDay ?? ''}
                  onChange={(e) =>
                    updateField('insertionsPerDay', parseNonNegativeIntInput(e.target.value))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Orientação</Label>
                <Select
                  value={formData.orientation || ''}
                  onValueChange={(value: string) =>
                    updateField('orientation', (value || null) as Orientation | null)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a orientação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Orientation.FLUXO}>Fluxo</SelectItem>
                    <SelectItem value={Orientation.CONTRA_FLUXO}>Contra-Fluxo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Resolução Largura (px)</Label>
                <Input
                  type="number"
                  placeholder="1920"
                  min="0"
                  value={formData.resolutionWidthPx ?? ''}
                  onChange={(e) =>
                    updateField('resolutionWidthPx', parseNonNegativeIntInput(e.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Resolução Altura (px)</Label>
                <Input
                  type="number"
                  placeholder="1080"
                  min="0"
                  value={formData.resolutionHeightPx ?? ''}
                  onChange={(e) =>
                    updateField('resolutionHeightPx', parseNonNegativeIntInput(e.target.value))
                  }
                />
              </div>
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label>Preços (opcional)</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Preço/Mês (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="5000.00"
                min="0"
                value={formData.priceMonth ?? ''}
                onChange={(e) =>
                  updateField('priceMonth', parseNonNegativeFloatInput(e.target.value))
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Preço/Bi-semana (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="1500.00"
                min="0"
                value={formData.priceWeek ?? ''}
                onChange={(e) =>
                  updateField('priceWeek', parseNonNegativeFloatInput(e.target.value))
                }
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(formData, imageFiles, videoFiles)} disabled={!formData.label?.trim()}>
            {unit ? 'Salvar Alterações' : 'Adicionar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
