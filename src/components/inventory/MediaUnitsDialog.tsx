import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Plus, Edit, Trash2, Image as ImageIcon, X } from 'lucide-react';
import { MediaType, MediaUnit, UnitType, Orientation } from '../../types';
import { useMediaUnits } from '../../hooks/useMediaUnits';
import { useCompany } from '../../contexts/CompanyContext';
import { validateUploadBatchAgainstEntitlements } from '../../lib/mediaValidation';
import { resolveUploadsUrl } from '../../lib/format';
import { getUploadErrorMessage } from '../../lib/httpErrorMessage';
import { toast } from 'sonner';

interface MediaUnitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaPointId: string;
  mediaPointName: string;
  mediaPointType: MediaType;
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

export function MediaUnitsDialog({
  open,
  onOpenChange,
  mediaPointId,
  mediaPointName,
  mediaPointType,
}: MediaUnitsDialogProps) {
  const { units, loading, error, createUnit, updateUnit, deleteUnit, uploadManyUnitImages, uploadManyUnitVideos, deleteUnitAsset } =
    useMediaUnits({ mediaPointId: open ? mediaPointId : null });

  const company = useCompany() as any;
  const entitlements = company?.entitlements;
  const refreshEntitlements = company?.refreshEntitlements;
  const [isAdding, setIsAdding] = useState(false);
  const [editingUnit, setEditingUnit] = useState<MediaUnit | null>(null);

  useEffect(() => {
    if (!open) {
      setIsAdding(false);
      setEditingUnit(null);
    }
  }, [open]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
                                  {unit.priceWeek ? ` • R$ ${unit.priceWeek}/quinz` : ''}
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
                            onClick={() => setEditingUnit(unit)}
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
                    await updateUnit(editingUnit.id, clean);
                    if (imageFiles.length) {
                      try {
                        await uploadManyUnitImages(editingUnit.id, imageFiles);
                        toast.success(`${imageFiles.length} imagem(ns) da unidade enviada(s)!`);
                      } catch (e: any) {
                        const msg = getUploadErrorMessage(e, 'Erro ao enviar imagens da unidade');
                        toast.error(msg);
                        throw new Error(msg);
                      }
                    }
                    if (videoFiles.length) {
                      try {
                        await uploadManyUnitVideos(editingUnit.id, videoFiles);
                        toast.success(`${videoFiles.length} vídeo(s) da unidade enviado(s)!`);
                      } catch (e: any) {
                        const msg = getUploadErrorMessage(e, 'Erro ao enviar vídeos da unidade');
                        toast.error(msg);
                        throw new Error(msg);
                      }
                    }
                    if (imageFiles.length || videoFiles.length) {
                      await refreshEntitlements?.();
                    }
                    setEditingUnit(null);
                  } else {
                    const created = await createUnit({
                      ...clean,
                      unitType: unitTypeForPoint,
                      label: (clean.label ?? '').toString(),
                    } as any);
                    if (imageFiles.length) {
                      try {
                        await uploadManyUnitImages(created.id, imageFiles);
                        toast.success(`${imageFiles.length} imagem(ns) da unidade enviada(s)!`);
                      } catch (e: any) {
                        const msg = getUploadErrorMessage(e, 'Erro ao enviar imagens da unidade');
                        toast.error(msg);
                        throw new Error(msg);
                      }
                    }
                    if (videoFiles.length) {
                      try {
                        await uploadManyUnitVideos(created.id, videoFiles);
                        toast.success(`${videoFiles.length} vídeo(s) da unidade enviado(s)!`);
                      } catch (e: any) {
                        const msg = getUploadErrorMessage(e, 'Erro ao enviar vídeos da unidade');
                        toast.error(msg);
                        throw new Error(msg);
                      }
                    }
                    if (imageFiles.length || videoFiles.length) {
                      await refreshEntitlements?.();
                    }
                    setIsAdding(false);
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
}

function UnitForm({ unit, mediaPointType, onSave, onCancel, entitlements, onDeleteAsset, refreshEntitlements }: UnitFormProps) {
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

  // Quando alterna de "nova unidade" para "editar" (ou troca a unidade sendo editada),
  // precisamos sincronizar o estado interno do formulário com a prop `unit`.
  useEffect(() => {
    if (unit) {
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
      ...files.map((file) => ({ file, kind: 'image' as const })),
      ...videoFiles.map((file) => ({ file, kind: 'video' as const })),
    ], entitlements);
    if (err) {
      toast.error(err);
      try { (e.target as any).value = ''; } catch {}
      setImageFiles([]);
      return;
    }

    setImageFiles(files);
    setImagePreviews(files.map((file) => URL.createObjectURL(file)));
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
      ...files.map((file) => ({ file, kind: 'video' as const })),
    ], entitlements);
    if (err) {
      toast.error(err);
      try { (e.target as any).value = ''; } catch {}
      setVideoFiles([]);
      return;
    }

    setVideoFiles(files);
    setVideoPreviews(files.map((file) => URL.createObjectURL(file)));
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
    setVideoPreviews((prev) => {
      const target = prev[idx];
      if (target?.startsWith('blob:')) URL.revokeObjectURL(target);
      return prev.filter((_, currentIdx) => currentIdx !== idx);
    });
  };

  const handleDeleteExistingAsset = async (kind: 'image' | 'video', assetId?: string) => {
    if (!unit?.id || !assetId || !onDeleteAsset) return;

    try {
      setDeletingAssetId(assetId);
      const updated = await onDeleteAsset(unit.id, assetId);
      syncExistingAssets((updated as MediaUnit) ?? unit);
      await refreshEntitlements?.();
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

  return (
    <Card className="border-2 border-indigo-200">
      <CardContent className="pt-6 space-y-4">
        <h4 className="text-gray-900 mb-4">{unit ? 'Editar Unidade' : 'Nova Unidade'}</h4>

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
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/gif"
              multiple
              onChange={handleImageChange}
              className="flex-1"
            />
            {(existingImageAssets.length > 0 || imagePreviews.length > 0) && (
              <div className="grid grid-cols-2 gap-2">
                {existingImageAssets.map((asset, idx) => (
                  <div key={`existing-img-${asset.id ?? idx}`} className="relative w-24 h-16 bg-gray-100 rounded overflow-hidden border">
                    <img src={asset.src} alt={`Imagem cadastrada ${idx + 1}`} className="w-full h-full object-cover" />
                    {asset.id && onDeleteAsset ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6"
                        disabled={deletingAssetId === asset.id}
                        onClick={() => handleDeleteExistingAsset('image', asset.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    ) : null}
                  </div>
                ))}
                {imagePreviews.map((src, idx) => (
                  <div key={`img-${idx}`} className="relative w-24 h-16 bg-gray-100 rounded overflow-hidden border border-dashed">
                    <img src={src} alt={`Nova imagem ${idx + 1}`} className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removePendingImage(idx)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            JPG, PNG ou GIF (máx. {fileLimits?.maxImageMb ?? 4}MB por arquivo, respeitando o armazenamento restante do plano).
          </p>
        </div>

        <div className="space-y-2">
          <Label>Vídeo da {mediaPointType === MediaType.OOH ? 'Face' : 'Tela'} (opcional)</Label>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept="video/*"
              multiple
              onChange={handleVideoChange}
              className="flex-1"
            />
            {(existingVideoAssets.length > 0 || videoPreviews.length > 0) && (
              <div className="grid grid-cols-2 gap-2">
                {existingVideoAssets.map((asset, idx) => (
                  <div key={`existing-video-${asset.id ?? idx}`} className="relative w-24 h-16 bg-gray-100 rounded overflow-hidden border">
                    <video src={asset.src} className="w-full h-full object-cover" controls muted />
                    {asset.id && onDeleteAsset ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6"
                        disabled={deletingAssetId === asset.id}
                        onClick={() => handleDeleteExistingAsset('video', asset.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    ) : null}
                  </div>
                ))}
                {videoPreviews.map((src, idx) => (
                  <div key={`video-${idx}`} className="relative w-24 h-16 bg-gray-100 rounded overflow-hidden border border-dashed">
                    <video src={src} className="w-full h-full object-cover" controls muted />
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removePendingVideo(idx)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                  value={formData.widthM ?? ''}
                  onChange={(e) => updateField('widthM', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Altura (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="9.00"
                  value={formData.heightM ?? ''}
                  onChange={(e) => updateField('heightM', e.target.value ? parseFloat(e.target.value) : null)}
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
                  value={formData.insertionsPerDay ?? ''}
                  onChange={(e) =>
                    updateField('insertionsPerDay', e.target.value ? parseInt(e.target.value) : null)
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
                  value={formData.resolutionWidthPx ?? ''}
                  onChange={(e) =>
                    updateField('resolutionWidthPx', e.target.value ? parseInt(e.target.value) : null)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Resolução Altura (px)</Label>
                <Input
                  type="number"
                  placeholder="1080"
                  value={formData.resolutionHeightPx ?? ''}
                  onChange={(e) =>
                    updateField('resolutionHeightPx', e.target.value ? parseInt(e.target.value) : null)
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
                value={formData.priceMonth ?? ''}
                onChange={(e) =>
                  updateField('priceMonth', e.target.value ? parseFloat(e.target.value) : null)
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Preço/Quinzenal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="1500.00"
                value={formData.priceWeek ?? ''}
                onChange={(e) =>
                  updateField('priceWeek', e.target.value ? parseFloat(e.target.value) : null)
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
