import { useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { X, ChevronDown, Package, ExternalLink, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';
import { MediaPoint, MediaType, ProductionCosts, CashFlowType, PaymentMethod, PaymentType, CashTransaction } from '../../types';
import { useCompany } from '../../contexts/CompanyContext';
import { validateUploadBatchAgainstEntitlements } from '../../lib/mediaValidation';
import { useMediaPointsMeta } from '../../hooks/useMediaPointsMeta';
import { useTransactionCategories } from '../../hooks/useTransactionCategories';
import apiClient from '../../lib/apiClient';
import { resolveUploadsUrl } from '../../lib/format';
import { OOH_SUBCATEGORIES, DOOH_SUBCATEGORIES, ENVIRONMENTS, BRAZILIAN_STATES, SOCIAL_CLASSES } from '../../lib/mockData';

import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { reverseGeocodeOSM, type ReverseGeocodeAddress } from '../../lib/geocode';

type LatLng = { lat: number; lng: number };
type ExistingAssetPreview = { id?: string; src: string };

const BRAZILIA_CENTER: LatLng = { lat: -15.793889, lng: -47.882778 };

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

function normalizeZipcodeInput(value: string) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function normalizeAddressNumberInput(value: string) {
  return String(value ?? '').replace(/-/g, '');
}

function isValidLatitude(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= -90 && numeric <= 90;
}

function isValidLongitude(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= -180 && numeric <= 180;
}

function buildPinIcon() {
  // Evita o ícone padrão do Leaflet (que costuma quebrar no bundler por falta de assets).
  return L.divIcon({
    html: `
      <div style="
        width:28px;
        height:28px;
        border-radius:999px;
        background:rgba(79,70,229,0.96);
        border:3px solid rgba(255,255,255,0.96);
        box-shadow:0 8px 22px rgba(0,0,0,0.22);
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <div style="
          width:10px;
          height:10px;
          border-radius:999px;
          background:rgba(255,255,255,0.95);
        "></div>
      </div>
    `,
    className: 'one-media-form-pin',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function MapPickEvents({ enabled, onPick }: { enabled: boolean; onPick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function MapViewportSync({ center, zoom, open }: { center: LatLng | null; zoom: number; open: boolean }) {
  const map = useMap();

  useEffect(() => {
    const target = center ?? BRAZILIA_CENTER;
    map.setView([target.lat, target.lng] as any, zoom, { animate: false });
  }, [map, center?.lat, center?.lng, zoom]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [map, open, center?.lat, center?.lng]);

  return null;
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

function dateInputValue(value?: string | Date | null) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function transactionDateToHtml(value?: Date | string | null) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function buildEmptyPointFinancialForm() {
  return {
    flowType: CashFlowType.DESPESA as CashFlowType,
    date: new Date().toISOString().slice(0, 10),
    dueDate: '',
    description: '',
    partnerName: '',
    categoryId: '',
    amount: '',
    paymentType: PaymentType.A_VISTA as PaymentType,
    paymentMethod: '' as '' | PaymentMethod,
    isPaid: false,
    isRecurring: true,
    recurringUntil: '',
  };
}


function computePointStorageBytes(point?: Partial<MediaPoint> | null) {
  const pointBytes = parseBytes((point as any)?.storageUsedBytes);
  const unitsBytes = Array.isArray(point?.units)
    ? point.units.reduce((total, unit) => total + parseBytes(unit?.storageUsedBytes), 0)
    : 0;
  return pointBytes + unitsBytes;
}

interface MediaPointFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaPoint?: MediaPoint | null;
  initialData?: Partial<MediaPoint> | null;
  onSave: (data: Partial<MediaPoint>, imageFile?: File | null, videoFile?: File | null) => Promise<any> | void;
  onDeleteAsset?: (mediaPointId: string, assetId: string) => Promise<any> | void;
  onEnqueueUploads?: (args: { pointId: string; pointName: string; imageFiles: File[]; videoFiles: File[] }) => Promise<any> | void;
}

export function MediaPointFormDialog({ open, onOpenChange, mediaPoint, initialData, onSave, onDeleteAsset, onEnqueueUploads }: MediaPointFormDialogProps) {
  const { company, entitlements, refreshEntitlements } = useCompany() as any;
  const fileLimits = (entitlements as any)?.limits?.file;
  const [type, setType] = useState<MediaType>(mediaPoint?.type || MediaType.OOH);
  const [formData, setFormData] = useState<Partial<MediaPoint>>({
    type: MediaType.OOH,
    showInMediaKit: false,
    addressCountry: 'Brasil',
    socialClasses: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImageAssets, setExistingImageAssets] = useState<ExistingAssetPreview[]>([]);

  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [existingVideoAssets, setExistingVideoAssets] = useState<ExistingAssetPreview[]>([]);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
  const [pointSnapshot, setPointSnapshot] = useState<Partial<MediaPoint> | null>(null);

  // =====================
  // Mapa (Etapa 6)
  // =====================
  const [mapMode, setMapMode] = useState<'map' | 'satellite'>('map');
  const [defaultMapCenter, setDefaultMapCenter] = useState<LatLng>(BRAZILIA_CENTER);
  const [pinPos, setPinPos] = useState<LatLng | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const lastAutoRef = useRef<ReverseGeocodeAddress | null>(null);
  const formDataRef = useRef<Partial<MediaPoint>>({});
  const geoAbortRef = useRef<AbortController | null>(null);
  const geoTimerRef = useRef<number | null>(null);

    const { cities: metaCities, refetch: refetchMeta } = useMediaPointsMeta();

  const [addCityOpen, setAddCityOpen] = useState(false);
  const [addCityName, setAddCityName] = useState('');
  const [addCityState, setAddCityState] = useState('');
  const [addCityError, setAddCityError] = useState<string | null>(null);
  const [isAddingCity, setIsAddingCity] = useState(false);

  const { categories: transactionCategories, createCategory: createTransactionCategory } = useTransactionCategories();
  const pointFinancialMediaPointId = (mediaPoint?.id ?? (initialData as any)?.id) || undefined;
  const [pointTransactions, setPointTransactions] = useState<CashTransaction[]>([]);
  const [pointFinancialEnabled, setPointFinancialEnabled] = useState(false);
  const [pointFinancialForm, setPointFinancialForm] = useState(buildEmptyPointFinancialForm());
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addCategoryName, setAddCategoryName] = useState('');
  const [addCategoryError, setAddCategoryError] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const syncExistingAssets = (point?: Partial<MediaPoint> | null) => {
    const mediaAssets = Array.isArray((point as any)?.mediaAssets) ? (point as any).mediaAssets : [];

    const imageAssets = mediaAssets
      .filter((asset: any) => asset?.kind === 'IMAGE' && asset?.url)
      .map((asset: any) => ({ id: asset.id, src: resolveUploadsUrl(asset.url) || asset.url }))
      .filter((asset: ExistingAssetPreview) => !!asset.src);

    const videoAssets = mediaAssets
      .filter((asset: any) => asset?.kind === 'VIDEO' && asset?.url)
      .map((asset: any) => ({ id: asset.id, src: resolveUploadsUrl(asset.url) || asset.url }))
      .filter((asset: ExistingAssetPreview) => !!asset.src);

    setExistingImageAssets(
      imageAssets.length
        ? imageAssets
        : (resolveUploadsUrl((point as any)?.mainImageUrl) ? [{ src: resolveUploadsUrl((point as any)?.mainImageUrl)! }] : [])
    );
    setExistingVideoAssets(
      videoAssets.length
        ? videoAssets
        : (resolveUploadsUrl((point as any)?.mainVideoUrl) ? [{ src: resolveUploadsUrl((point as any)?.mainVideoUrl)! }] : [])
    );
  };

  const resolveExistingAssetId = (kind: 'image' | 'video', src: string, preferredId?: string) => {
    if (preferredId) return preferredId;

    const snapshot = pointSnapshot ?? mediaPoint ?? initialData ?? null;
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



  const linkedPointTransaction = useMemo(() => {
    const candidates = (pointTransactions ?? []).filter((tx) => !tx.billingInvoiceId);
    if (!candidates.length) return null;
    return [...candidates].sort((a, b) => {
      const inventoryWeight = Number(Boolean((b as any).inventoryLinked)) - Number(Boolean((a as any).inventoryLinked));
      if (inventoryWeight !== 0) return inventoryWeight;
      const recurringWeight = Number(Boolean(b.isRecurring)) - Number(Boolean(a.isRecurring));
      if (recurringWeight !== 0) return recurringWeight;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })[0] as CashTransaction;
  }, [pointTransactions]);

  const otherPointTransactionsCount = useMemo(() => {
    if (!linkedPointTransaction) return 0;
    return (pointTransactions ?? []).filter((tx) => tx.id !== linkedPointTransaction.id && !tx.billingInvoiceId).length;
  }, [pointTransactions, linkedPointTransaction]);

  useEffect(() => {
    let cancelled = false;
    const loadPointTransactions = async () => {
      if (!open || !pointFinancialMediaPointId) {
        setPointTransactions([]);
        return;
      }
      try {
        const response = await apiClient.get('/cash-transactions', { params: { mediaPointId: pointFinancialMediaPointId } });
        const data = Array.isArray(response.data) ? response.data : response.data?.data;
        if (!cancelled) setPointTransactions(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setPointTransactions([]);
      }
    };
    void loadPointTransactions();
    return () => {
      cancelled = true;
    };
  }, [open, pointFinancialMediaPointId]);

  useEffect(() => {
    if (!open) return;
    if (!linkedPointTransaction) {
      setPointFinancialEnabled(false);
      setPointFinancialForm(buildEmptyPointFinancialForm());
      return;
    }
    setPointFinancialEnabled(true);
    setPointFinancialForm({
      flowType: linkedPointTransaction.flowType || CashFlowType.DESPESA,
      date: transactionDateToHtml(linkedPointTransaction.date) || new Date().toISOString().slice(0, 10),
      dueDate: dateInputValue((linkedPointTransaction as any).dueDate),
      description: linkedPointTransaction.description || '',
      partnerName: linkedPointTransaction.partnerName || '',
      categoryId: linkedPointTransaction.categoryId || '',
      amount: linkedPointTransaction.amount !== undefined && linkedPointTransaction.amount !== null ? String(linkedPointTransaction.amount) : '',
      paymentType: linkedPointTransaction.paymentType || PaymentType.A_VISTA,
      paymentMethod: (linkedPointTransaction.paymentMethod as any) || '',
      isPaid: Boolean(linkedPointTransaction.isPaid),
      isRecurring: Boolean(linkedPointTransaction.isRecurring),
      recurringUntil: dateInputValue(linkedPointTransaction.recurringUntil),
    });
  }, [open, linkedPointTransaction]);

  const handleAddTransactionCategory = async () => {
    const name = addCategoryName.trim();
    if (!name) {
      setAddCategoryError('Informe o nome da categoria.');
      return;
    }
    try {
      setIsAddingCategory(true);
      setAddCategoryError(null);
      const created = await createTransactionCategory({ name });
      setPointFinancialForm((prev) => ({ ...prev, categoryId: created.id }));
      setAddCategoryOpen(false);
      setAddCategoryName('');
      toast.success('Categoria criada com sucesso.');
    } catch (err: any) {
      setAddCategoryError(err?.response?.data?.message || err?.message || 'Não foi possível criar a categoria.');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const syncPointFinancial = async (targetPointId: string) => {
    if (!targetPointId) return;

    if (!pointFinancialEnabled) {
      if (linkedPointTransaction?.id) {
        await apiClient.delete(`/cash-transactions/${linkedPointTransaction.id}`);
      }
      return;
    }

    if (!pointFinancialForm.description.trim()) {
      throw new Error('Informe a descrição do vínculo financeiro do ponto.');
    }

    const amount = Number(pointFinancialForm.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Informe um valor financeiro válido para o ponto.');
    }

    const payload: any = {
      date: `${pointFinancialForm.date || new Date().toISOString().slice(0, 10)}T12:00:00.000Z`,
      description: pointFinancialForm.description.trim(),
      partnerName: pointFinancialForm.partnerName.trim() || undefined,
      categoryId: pointFinancialForm.categoryId || undefined,
      amount,
      flowType: pointFinancialForm.flowType,
      paymentType: pointFinancialForm.paymentType,
      paymentMethod: pointFinancialForm.paymentMethod || undefined,
      isPaid: pointFinancialForm.isRecurring ? false : Boolean(pointFinancialForm.isPaid),
      mediaPointId: targetPointId,
      dueDate: pointFinancialForm.dueDate || undefined,
      isRecurring: Boolean(pointFinancialForm.isRecurring),
      recurringUntil: pointFinancialForm.isRecurring ? (pointFinancialForm.recurringUntil || undefined) : undefined,
      inventoryLinked: true,
    };

    if (linkedPointTransaction?.id) {
      await apiClient.put(`/cash-transactions/${linkedPointTransaction.id}`, payload);
    } else {
      await apiClient.post('/cash-transactions', payload);
    }
  };

  useEffect(() => {
    geoAbortRef.current?.abort();
    window.clearTimeout(geoTimerRef.current ?? undefined);
    setSubmitError(null);
    if (mediaPoint) {
      setFormData(mediaPoint);
      setPointSnapshot(mediaPoint);
      setType(mediaPoint.type);
      setImageFiles([]);
      setImagePreviews([]);
      setVideoFiles([]);
      setVideoPreviews([]);
      syncExistingAssets(mediaPoint);
      const lat = Number((mediaPoint as any)?.latitude);
      const lng = Number((mediaPoint as any)?.longitude);
      const nextPinPos = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
      setPinPos(nextPinPos);
      setDefaultMapCenter(nextPinPos ?? BRAZILIA_CENTER);
    } else {
      const merged: Partial<MediaPoint> = {
        type: MediaType.OOH,
        showInMediaKit: false,
        addressCountry: 'Brasil',
        socialClasses: [],
        ...(initialData ?? {}),
      };
      setFormData(merged);
      setPointSnapshot(merged);
      setType((merged.type as MediaType) || MediaType.OOH);
      setImageFiles([]);
      setImagePreviews([]);
      setExistingImageAssets([]);

      setVideoFiles([]);
      setVideoPreviews([]);
      setExistingVideoAssets([]);
      const lat = Number((merged as any)?.latitude);
      const lng = Number((merged as any)?.longitude);
      const nextPinPos = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
      setPinPos(nextPinPos);
      setDefaultMapCenter(nextPinPos ?? BRAZILIA_CENTER);
    }
    // Reset do auto-fill quando abrir
    lastAutoRef.current = null;
    setGeoError(null);
    setGeoLoading(false);
  }, [mediaPoint, open, initialData]);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    return () => {
      geoAbortRef.current?.abort();
      window.clearTimeout(geoTimerRef.current ?? undefined);
    };
  }, []);

  useEffect(() => {
    if (!open || !mediaPoint?.id) return;

    const handleUploadsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ pointId?: string }>).detail;
      if (detail?.pointId !== mediaPoint.id) return;
      void apiClient.get<MediaPoint>(`/media-points/${mediaPoint.id}`).then((response) => {
        setPointSnapshot(response.data);
        syncExistingAssets(response.data);
      }).catch(() => undefined);
    };

    window.addEventListener('inventory:uploads-updated', handleUploadsUpdated as EventListener);
    return () => {
      window.removeEventListener('inventory:uploads-updated', handleUploadsUpdated as EventListener);
    };
  }, [mediaPoint?.id, open]);

  // Sincroniza pin com lat/lng do form
  useEffect(() => {
    const lat = Number((formData as any)?.latitude);
    const lng = Number((formData as any)?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setPinPos(null);
      return;
    }
    setPinPos((prev) => {
      if (prev && Math.abs(prev.lat - lat) < 1e-8 && Math.abs(prev.lng - lng) < 1e-8) return prev;
      return { lat, lng };
    });
  }, [formData.latitude, formData.longitude]);

  const handleTypeChange = (newType: MediaType) => {
    setType(newType);
    setFormData(prev => ({ ...prev, type: newType, subcategory: undefined }));
  };

  useEffect(() => {
    if (!open) return;

    const lat = Number(formData.latitude);
    const lng = Number(formData.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setDefaultMapCenter({ lat, lng });
      return;
    }

    const addressCity = String(company?.addressCity || '').trim();
    const addressState = String(company?.addressState || '').trim();
    if (!addressCity && !addressState) {
      setDefaultMapCenter(BRAZILIA_CENTER);
      return;
    }

    let active = true;

    const resolveCompanyCenter = async () => {
      try {
        const query = [addressCity, addressState, 'Brasil'].filter(Boolean).join(', ');
        if (!query) {
          if (active) setDefaultMapCenter(BRAZILIA_CENTER);
          return;
        }

        const searchUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl, { headers: { Accept: 'application/json' } });
        if (!response.ok) {
          if (active) setDefaultMapCenter(BRAZILIA_CENTER);
          return;
        }

        const results = await response.json();
        const first = Array.isArray(results) ? results[0] : null;
        const resolvedLat = Number(first?.lat);
        const resolvedLng = Number(first?.lon);
        if (!active || !Number.isFinite(resolvedLat) || !Number.isFinite(resolvedLng)) {
          if (active) setDefaultMapCenter(BRAZILIA_CENTER);
          return;
        }

        setDefaultMapCenter({ lat: resolvedLat, lng: resolvedLng });
      } catch {
        if (active) setDefaultMapCenter(BRAZILIA_CENTER);
      }
    };

    void resolveCompanyCenter();

    return () => {
      active = false;
    };
  }, [open, company?.addressCity, company?.addressState, formData.latitude, formData.longitude]);


  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);

    if (!files.length) {
      setImageFiles([]);
      setImagePreviews([]);
      return;
    }

    const err = await validateUploadBatchAgainstEntitlements(
      [
        ...imageFiles.map((file) => ({ file, kind: 'image' as const })),
        ...files.map((file) => ({ file, kind: 'image' as const })),
        ...videoFiles.map((file) => ({ file, kind: 'video' as const })),
      ],
      entitlements
    );
    if (err) {
      toast.error(err);
      try {
        (e.target as any).value = '';
      } catch {}
      setImageFiles([]);
      return;
    }

    setImageFiles((prev) => [...prev, ...files]);
    setImagePreviews((prev) => [...prev, ...files.map((file) => URL.createObjectURL(file))]);
  };

  const handleVideoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);

    if (!files.length) {
      setVideoFiles([]);
      setVideoPreviews([]);
      return;
    }

    const err = await validateUploadBatchAgainstEntitlements(
      [
        ...imageFiles.map((file) => ({ file, kind: 'image' as const })),
        ...videoFiles.map((file) => ({ file, kind: 'video' as const })),
        ...files.map((file) => ({ file, kind: 'video' as const })),
      ],
      entitlements
    );
    if (err) {
      toast.error(err);
      try {
        (e.target as any).value = '';
      } catch {}
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
    if (!mediaPoint?.id || !assetId || !onDeleteAsset) return;

    try {
      setDeletingAssetId(assetId);
      const updated = await onDeleteAsset(mediaPoint.id, assetId);
      const nextPoint = (updated as MediaPoint) ?? mediaPoint;
      setPointSnapshot(nextPoint);
      syncExistingAssets(nextPoint);
      await refreshEntitlements?.();
      toast.success(kind === 'image' ? 'Imagem removida.' : 'Vídeo removido.');
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível remover a mídia.');
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

  const updateField = (field: keyof MediaPoint, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setPointSnapshot((prev) => ({ ...(prev ?? {}), [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const scheduleReverseGeocode = (lat: number, lng: number, force = false) => {
    window.clearTimeout(geoTimerRef.current ?? undefined);
    geoTimerRef.current = window.setTimeout(() => {
      void reverseGeocodeAndApply(lat, lng, { force });
    }, 450);
  };

  const applyAutoField = (field: keyof MediaPoint, value: string | undefined, previousAuto?: ReverseGeocodeAddress | null, force = false) => {
    const current = String((formDataRef.current as any)?.[field] ?? '').trim();
    const prevAuto = String((previousAuto as any)?.[field] ?? '').trim();
    const normalizedValue = String(value ?? '').trim();

    if (force || !current || current === prevAuto) {
      updateField(field, normalizedValue || '');
    }
  };

  const reverseGeocodeAndApply = async (lat: number, lng: number, options?: { force?: boolean }) => {
    try {
      setGeoError(null);
      setGeoLoading(true);
      geoAbortRef.current?.abort();
      const controller = new AbortController();
      geoAbortRef.current = controller;

      const addr = await reverseGeocodeOSM(lat, lng, controller.signal);
      if (!addr) return;

      const previousAuto = lastAutoRef.current ? { ...lastAutoRef.current } : null;
      lastAutoRef.current = {
        addressState: addr.addressState,
        addressCity: addr.addressCity,
        addressDistrict: addr.addressDistrict,
        addressStreet: addr.addressStreet,
        addressNumber: addr.addressNumber,
        addressZipcode: addr.addressZipcode,
        addressCountry: addr.addressCountry,
      };

      const force = options?.force === true;

      // Ordem importa (UF -> Cidade)
      applyAutoField('addressState', addr.addressState, previousAuto, force);

      setCitiesForUf((prev) => {
        const cityName = String(addr.addressCity ?? '').trim();
        if (!cityName) return prev;
        if (prev.includes(cityName)) return prev;
        return [...prev, cityName].sort((a, b) => a.localeCompare(b, 'pt-BR'));
      });
      applyAutoField('addressCity', addr.addressCity, previousAuto, force);

      applyAutoField('addressDistrict', addr.addressDistrict, previousAuto, force);
      applyAutoField('addressStreet', addr.addressStreet, previousAuto, force);
      applyAutoField('addressNumber', normalizeAddressNumberInput(addr.addressNumber ?? ''), previousAuto, force);
      applyAutoField('addressZipcode', normalizeZipcodeInput(addr.addressZipcode ?? ''), previousAuto, force);
      applyAutoField('addressCountry', addr.addressCountry, previousAuto, force);
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      if (msg.includes('abort')) return;
      setGeoError('Não foi possível preencher o endereço automaticamente.');
    } finally {
      setGeoLoading(false);
    }
  };

  const applyPinPosition = (p: LatLng, opts?: { autoFill?: boolean; forceAddressRefresh?: boolean }) => {
    setPinPos(p);
    setDefaultMapCenter(p);
    updateField('latitude', Number(p.lat.toFixed(6)));
    updateField('longitude', Number(p.lng.toFixed(6)));
    if (opts?.autoFill !== false) {
      scheduleReverseGeocode(p.lat, p.lng, opts?.forceAddressRefresh !== false);
    }
  };

  const handleManualLatLngLookup = async () => {
    const lat = Number(formData.latitude);
    const lng = Number(formData.longitude);

    if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
      setGeoError('Informe uma latitude e longitude válidas para pesquisar o endereço.');
      return;
    }

    setGeoError(null);
    const nextPin = { lat, lng };
    setPinPos(nextPin);
    setDefaultMapCenter(nextPin);
    await reverseGeocodeAndApply(lat, lng, { force: true });
  };

  const currentUf = String(formData.addressState ?? '').trim().toUpperCase();

  const [citiesForUf, setCitiesForUf] = useState<string[]>([]);
  const [citiesForUfLoading, setCitiesForUfLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fallback = Array.isArray(metaCities) ? metaCities : [];

    // Sem UF selecionada: usa fallback vindo do meta
    if (!currentUf) {
      setCitiesForUf(fallback);
      return;
    }

    const load = async () => {
      try {
        setCitiesForUfLoading(true);
        const res = await apiClient.get('/media-points/cities', { params: { state: currentUf } });

        // Aceita formatos: { cities: [...] } ou lista direta
        const data = (res as any)?.data;
        const list = Array.isArray(data) ? data : Array.isArray(data?.cities) ? data.cities : [];

        if (!cancelled) setCitiesForUf(list.length ? list : fallback);
      } catch {
        if (!cancelled) setCitiesForUf(fallback);
      } finally {
        if (!cancelled) setCitiesForUfLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [currentUf, metaCities]);

  const handleAddCity = async () => {
    const uf = String(addCityState || currentUf).trim().toUpperCase();
    const name = String(addCityName).trim();

    if (!uf || !name) {
      setAddCityError('Informe a UF e o nome da cidade.');
      return;
    }

    try {
      setIsAddingCity(true);
      setAddCityError(null);

      const response = await apiClient.post('/media-points/cities', { state: uf, name });
      const created = response.data as { name?: string; state?: string };

      updateField('addressState', created.state ?? uf);
      updateField('addressCity', created.name ?? name);

      await refetchMeta();
      setAddCityOpen(false);
      setAddCityName('');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Não foi possível adicionar a cidade.';
      setAddCityError(String(message));
    } finally {
      setIsAddingCity(false);
    }
  };

  const toggleSocialClass = (classValue: string) => {
    const current = formData.socialClasses || [];
    const updated = current.includes(classValue)
      ? current.filter(c => c !== classValue)
      : [...current, classValue];
    updateField('socialClasses', updated);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Nome do ponto é obrigatório';
    }
    if (!formData.addressCity?.trim()) {
      newErrors.addressCity = 'Cidade é obrigatória';
    }
    if (!formData.addressState?.trim()) {
      newErrors.addressState = 'Estado é obrigatório';
    }
    if (!Number.isFinite(Number(formData.latitude))) {
      newErrors.latitude = 'Latitude é obrigatória';
    }
    if (!Number.isFinite(Number(formData.longitude))) {
      newErrors.longitude = 'Longitude é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setSubmitError(null);

    // Remove campos que não devem ser enviados para a API
    const { id, companyId, createdAt, updatedAt, units, owners, ...payload } = (formData as any) || {};
    // Não usamos mais basePriceDay (Preço Diário) na UI.
    delete (payload as any).basePriceDay;

    try {
      const result = await onSave(
        {
          ...payload,
          type,
        },
        null,
        null
      );

      const targetId = result?.id ?? mediaPoint?.id;
      if (!targetId) {
        throw new Error('O ponto foi salvo, mas o retorno não trouxe o ID do ponto.');
      }

      await syncPointFinancial(targetId);

      if ((imageFiles.length || videoFiles.length) && !targetId) {
        throw new Error('O ponto foi salvo, mas o retorno não trouxe o ID para enviar as mídias.');
      }

      if ((imageFiles.length || videoFiles.length) && targetId) {
        await onEnqueueUploads?.({
          pointId: targetId,
          pointName: String(payload.name ?? mediaPoint?.name ?? result?.name ?? 'Ponto de mídia'),
          imageFiles: [...imageFiles],
          videoFiles: [...videoFiles],
        });
      }

      toast.success(
        imageFiles.length || videoFiles.length
          ? `${mediaPoint ? 'Ponto atualizado' : 'Ponto criado'}. Os uploads continuarão em segundo plano.`
          : mediaPoint
            ? 'Ponto de mídia atualizado com sucesso.'
            : 'Ponto de mídia criado com sucesso.',
      );

      // Só fecha se a operação foi concluída sem erro.
      onOpenChange(false);
    } catch (e: any) {
      // Exibe erro no próprio dialog (além de qualquer toast global).
      const msg = e?.message || 'Não foi possível salvar o ponto de mídia.';
      setSubmitError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      type: MediaType.OOH,
      showInMediaKit: false,
      addressCountry: 'Brasil',
      socialClasses: [],
    });
    setErrors({});
    setSubmitError(null);
    setImageFiles([]);
    setVideoFiles([]);
    setImagePreviews([]);
    setVideoPreviews([]);
    setExistingImageAssets([]);
    setExistingVideoAssets([]);
    setPointSnapshot(null);
    setPinPos(null);
    setDefaultMapCenter(BRAZILIA_CENTER);
    setPointFinancialEnabled(false);
    setPointFinancialForm(buildEmptyPointFinancialForm());
    onOpenChange(false);
  };

  const subcategories = type === MediaType.OOH ? OOH_SUBCATEGORIES : DOOH_SUBCATEGORIES;

  const storageLimitBytes = Math.max(0, Number(entitlements?.limits?.totalStorageGb ?? 0) * 1024 * 1024 * 1024);
  const currentPointStorageBytes = computePointStorageBytes(pointSnapshot ?? mediaPoint ?? initialData ?? null);
  const globalStorageUsedBytes = parseBytes((entitlements as any)?.usage?.storageUsedBytes);
  const globalStorageRemainingBytes = parseBytes((entitlements as any)?.remaining?.storageRemainingBytes);
  const pendingStorageBytes = [...imageFiles, ...videoFiles].reduce((total, file) => total + (file?.size ?? 0), 0);
  const projectedPointStorageBytes = currentPointStorageBytes + pendingStorageBytes;
  const projectedGlobalStorageUsedBytes = globalStorageUsedBytes + pendingStorageBytes;
  const projectedGlobalStorageRemainingBytes = Math.max(0, storageLimitBytes - projectedGlobalStorageUsedBytes);
  const storagePercent = storageLimitBytes > 0 ? Math.min(100, (projectedGlobalStorageUsedBytes / storageLimitBytes) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden p-0 gap-0"
        style={{
          width: 'min(1120px, calc(100vw - 2rem))',
          maxWidth: 'min(1120px, calc(100vw - 2rem))',
          height: 'min(82vh, 820px)',
          maxHeight: 'calc(100vh - 2rem)',
        }}
      >
        <DialogHeader className="shrink-0 border-b px-6 pt-6 pb-4">
          <DialogTitle>
            {mediaPoint ? 'Editar Ponto de Mídia' : 'Cadastrar Novo Ponto de Mídia (MediaPoint)'}
          </DialogTitle>
          <DialogDescription>
            {mediaPoint ? 'Atualize os detalhes do ponto de mídia.' : 'Preencha os campos para cadastrar um novo ponto de mídia.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <Tabs
  value={type}
  onValueChange={(v: string) => handleTypeChange(v as MediaType)}
>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value={MediaType.OOH}>OOH</TabsTrigger>
            <TabsTrigger value={MediaType.DOOH}>DOOH</TabsTrigger>
          </TabsList>

          <TabsContent value={type} className="space-y-6 mt-6">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-gray-900 border-b pb-2">Informações Básicas</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Ponto *</Label>
                  <Input
                    placeholder="Ex: Outdoor Av. Paulista 1000"
                    value={formData.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Subcategoria</Label>
                  <Select
  value={formData.subcategory || ''}
  onValueChange={(value: string) => updateField('subcategory', value)}
>

                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a subcategoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.map((sub) => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Imagens do ponto</Label>
                <Input type="file" accept="image/*" multiple onChange={handleImageChange} />
                {(existingImageAssets.length > 0 || imagePreviews.length > 0) && (
                  <div className="mt-2 space-y-2 w-full max-w-2xl">
                    <p className="text-xs font-medium text-gray-700">Imagens selecionadas/cadastradas</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {existingImageAssets.map((asset, idx) => {
                        const deleteAssetId = resolveExistingAssetId('image', asset.src, asset.id);
                        return (
                          <div key={`existing-img-${asset.id ?? idx}`} className="rounded-lg border bg-white p-2 space-y-2">
                            <div className="h-32 bg-gray-100 rounded overflow-hidden">
                              <img src={asset.src} alt={`Imagem cadastrada ${idx + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-gray-600">Imagem cadastrada {idx + 1}</span>
                              {deleteAssetId && onDeleteAsset ? (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  disabled={deletingAssetId === deleteAssetId || isSaving}
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
                          <div className="h-32 bg-gray-100 rounded overflow-hidden">
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
                  Selecione uma ou mais imagens. O upload será feito ao salvar. Máx. {fileLimits?.maxImageMb ?? 5}MB por arquivo e respeitando o armazenamento restante do plano.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Vídeos do ponto (opcional)</Label>
                <Input type="file" accept="video/*" multiple onChange={handleVideoChange} />
                {(existingVideoAssets.length > 0 || videoFiles.length > 0) && (
                  <div className="mt-2 space-y-2 w-full max-w-2xl">
                    <p className="text-xs font-medium text-gray-700">Vídeos selecionados/cadastrados</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {existingVideoAssets.map((asset, idx) => {
                        const deleteAssetId = resolveExistingAssetId('video', asset.src, asset.id);
                        return (
                          <div key={`existing-video-${asset.id ?? idx}`} className="rounded-lg border bg-white p-2 space-y-2">
                            <div className="h-32 bg-gray-100 rounded overflow-hidden">
                              <video src={asset.src} controls muted preload="none" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-gray-600">Vídeo cadastrado {idx + 1}</span>
                              {deleteAssetId && onDeleteAsset ? (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  disabled={deletingAssetId === deleteAssetId || isSaving}
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
                  Selecione um ou mais vídeos. O upload será feito ao salvar. Máx. {fileLimits?.maxVideoMb ?? 150}MB e {fileLimits?.maxVideoSeconds ?? 90}s por arquivo, respeitando o armazenamento restante do plano.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descreva o ponto de mídia..."
                  value={formData.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                />
              </div>

              {storageLimitBytes > 0 && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Armazenamento do plano</p>
                      <p className="text-xs text-slate-600">Uso global da assinatura. Deste ponto: {formatBytes(currentPointStorageBytes)}.</p>
                    </div>
                    <div className="text-right text-sm text-slate-700">
                      <div>{formatBytes(globalStorageUsedBytes)} / {formatBytes(storageLimitBytes)}</div>
                      <div className="text-xs text-slate-500">Disponível no plano: {formatBytes(globalStorageRemainingBytes)}</div>
                      {pendingStorageBytes > 0 ? <div className="text-xs text-amber-700">Após salvar: {formatBytes(projectedGlobalStorageUsedBytes)} usados · {formatBytes(projectedGlobalStorageRemainingBytes)} livres</div> : null}
                    </div>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${storagePercent}%` }} />
                  </div>
                  {pendingStorageBytes > 0 ? (
                    <p className="text-xs text-amber-700">
                      Seleção pendente: +{formatBytes(pendingStorageBytes)}. Após salvar, o ponto ficará com {formatBytes(projectedPointStorageBytes)}.
                    </p>
                  ) : null}
                </div>
              )}

              {/* Mapa (Etapa 6) */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Mapa (pin arrastável)
                  </Label>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={mapMode === 'map' ? 'default' : 'outline'}
                      className={mapMode === 'map' ? 'mm-indigo h-8' : 'h-8'}
                      onClick={() => setMapMode('map')}
                    >
                      Mapa
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={mapMode === 'satellite' ? 'default' : 'outline'}
                      className={mapMode === 'satellite' ? 'mm-indigo h-8' : 'h-8'}
                      onClick={() => setMapMode('satellite')}
                    >
                      Satélite
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-2 h-8"
                      disabled={!(Number.isFinite(Number(formData.latitude)) && Number.isFinite(Number(formData.longitude)))}
                      onClick={() => {
                        const lat = Number(formData.latitude);
                        const lng = Number(formData.longitude);
                        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <ExternalLink className="w-4 h-4" /> Street View
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-gray-600">
                  Clique no mapa ou arraste o pin para definir a posição. Ao soltar, tentamos preencher endereço automaticamente.
                </div>

                <div className="border rounded-2xl overflow-hidden" style={{ height: 320 }}>
                  <MapContainer
                    key={`media-point-map-${mediaPoint?.id ?? 'new'}-${open ? 'open' : 'closed'}`}
                    center={((pinPos ?? defaultMapCenter) ? [((pinPos ?? defaultMapCenter) as LatLng).lat, ((pinPos ?? defaultMapCenter) as LatLng).lng] : [BRAZILIA_CENTER.lat, BRAZILIA_CENTER.lng]) as any}
                    zoom={pinPos ? 17 : 12}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl
                  >
                    <MapViewportSync center={pinPos ?? defaultMapCenter} zoom={pinPos ? 17 : 12} open={open} />
                    <TileLayer
                      attribution={mapMode === 'satellite' ? 'Tiles &copy; Esri' : '&copy; OpenStreetMap contributors'}
                      url={
                        mapMode === 'satellite'
                          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                      }
                    />

                    <MapPickEvents enabled={true} onPick={(p) => applyPinPosition(p)} />

                    {pinPos ? (
                      <Marker
                        position={[pinPos.lat, pinPos.lng] as any}
                        icon={buildPinIcon()}
                        draggable
                        eventHandlers={{
                          dragend: (e: any) => {
                            const ll = e?.target?.getLatLng?.();
                            if (!ll) return;
                            applyPinPosition({ lat: ll.lat, lng: ll.lng });
                          },
                        }}
                      />
                    ) : null}
                  </MapContainer>
                </div>

                {geoLoading ? <div className="text-xs text-gray-600">Preenchendo endereço...</div> : null}
                {geoError ? <div className="text-xs text-amber-700">{geoError}</div> : null}
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="text-gray-900 border-b pb-2">Localização</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input
                    placeholder="00000-000"
                    value={formData.addressZipcode || ''}
                    onChange={(e) => updateField('addressZipcode', normalizeZipcodeInput(e.target.value))}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Rua/Avenida</Label>
                  <Input
                    placeholder="Ex: Avenida Paulista"
                    value={formData.addressStreet || ''}
                    onChange={(e) => updateField('addressStreet', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input
                    placeholder="1000"
                    value={formData.addressNumber || ''}
                    onChange={(e) => updateField('addressNumber', normalizeAddressNumberInput(e.target.value))}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Bairro</Label>
                  <Input
                    placeholder="Ex: Bela Vista"
                    value={formData.addressDistrict || ''}
                    onChange={(e) => updateField('addressDistrict', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Cidade *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        setAddCityState(currentUf || String(addCityState || '').trim().toUpperCase());
                        setAddCityOpen(true);
                        setAddCityError(null);
                      }}
                    >
                      + Adicionar
                    </Button>
                  </div>

                  <Select
                    disabled={citiesForUfLoading}
                    value={(formData.addressCity as string) || ''}
                    onValueChange={(value: string) => {
                      if (value === '__add__') {
                        setAddCityState(currentUf);
                        setAddCityName('');
                        setAddCityError(null);
                        setAddCityOpen(true);
                        return;
                      }
                      updateField('addressCity', value);
                    }}
                  >
                    <SelectTrigger className={errors.addressCity ? 'border-red-500' : ''}>
                      <SelectValue
                        placeholder={citiesForUfLoading ? 'Carregando...' : citiesForUf.length ? 'Selecione a cidade' : 'Nenhuma cidade cadastrada'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {citiesForUf.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                      <SelectItem value="__add__">+ Adicionar nova cidade</SelectItem>
                    </SelectContent>
                  </Select>

                  {errors.addressCity && <p className="text-xs text-red-600">{errors.addressCity}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Estado *</Label>
                  <Select
                    value={formData.addressState || ''}
                    onValueChange={(value: string) => {
                      updateField('addressState', value);
                      updateField('addressCity', '');
                    }}
                  >
                    <SelectTrigger className={errors.addressState ? 'border-red-500' : ''}>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.addressState && <p className="text-xs text-red-600">{errors.addressState}</p>}
                </div>
                <div className="space-y-2">
                  <Label>País</Label>
                  <Input
                    value={formData.addressCountry || 'Brasil'}
                    onChange={(e) => updateField('addressCountry', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Latitude *</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="-23.561414"
                    value={formData.latitude || ''}
                    onChange={(e) => updateField('latitude', e.target.value === '' ? undefined : Number(e.target.value))}
                    className={errors.latitude ? 'border-red-500' : ''}
                  />
                  {errors.latitude && <p className="text-xs text-red-600">{errors.latitude}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Longitude *</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="-46.655881"
                    value={formData.longitude || ''}
                    onChange={(e) => updateField('longitude', e.target.value === '' ? undefined : Number(e.target.value))}
                    className={errors.longitude ? 'border-red-500' : ''}
                  />
                  {errors.longitude && <p className="text-xs text-red-600">{errors.longitude}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={geoLoading || !isValidLatitude(formData.latitude) || !isValidLongitude(formData.longitude)}
                  onClick={() => {
                    void handleManualLatLngLookup();
                  }}
                >
                  <Search className="h-4 w-4" />
                  Buscar endereço por latitude/longitude
                </Button>
                <p className="text-xs text-gray-600">
                  Após informar latitude e longitude, clique para preencher automaticamente CEP, rua, bairro, cidade, estado e país.
                </p>
              </div>
            </div>

            {/* Dados Comerciais */}
            <div className="space-y-4">
              <h3 className="text-gray-900 border-b pb-2">Dados Comerciais e Audiência</h3>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Impactos Diários</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="85000"
                    value={formData.dailyImpressions || ''}
                    onChange={(e) => updateField('dailyImpressions', parseNonNegativeIntInput(e.target.value))}
                  />
                  {!formData.dailyImpressions && (
                    <p className="text-xs text-amber-600">⚠️ Recomendado preencher</p>
                  )}
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Ambiente</Label>
                  <Select
  value={formData.environment || ''}
  onValueChange={(value: string) => updateField('environment', value)}
>

                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ambiente" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENVIRONMENTS.map((env) => (
                        <SelectItem key={env} value={env}>{env}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Classes Sociais Atendidas (socialClasses)</Label>
                <div className="flex gap-2">
                  {SOCIAL_CLASSES.map((classValue) => (
                    <Badge
                      key={classValue}
                      variant={formData.socialClasses?.includes(classValue) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleSocialClass(classValue)}
                    >
                      {classValue}
                      {formData.socialClasses?.includes(classValue) && (
                        <X className="w-3 h-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço Mensal (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="8500.00"
                    value={formData.basePriceMonth || ''}
                    onChange={(e) => updateField('basePriceMonth', parseNonNegativeFloatInput(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço Bi-semana (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="2500.00"
                    value={formData.basePriceWeek || ''}
                    onChange={(e) => updateField('basePriceWeek', parseNonNegativeFloatInput(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Custos de Produção OOH (apenas para OOH) */}
            {type === MediaType.OOH && (
              <Collapsible defaultOpen={false}>
                <div className="space-y-4">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-orange-50/50 hover:bg-orange-100/50 border-orange-200"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-orange-600" />
                        <span className="text-gray-900">Custos de Produção OOH</span>
                      </div>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4">
                    <div className="p-4 bg-orange-50/30 rounded-lg border border-orange-100">
                      <p className="text-sm text-gray-600 mb-4">
                        Configure os custos padrão de produção para este ponto OOH. Estes valores
                        serão usados como referência para orçamentos e cálculos de custo.
                      </p>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Lona (R$)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="R$ 0,00"
                            value={formData.productionCosts?.lona || ''}
                            onChange={(e) =>
                              updateField('productionCosts', {
                                ...formData.productionCosts,
                                lona: parseNonNegativeFloatInput(e.target.value),
                              })
                            }
                          />
                          <p className="text-xs text-gray-500">Material de impressão (lona/tecido)</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Adesivo (R$)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="R$ 0,00"
                            value={formData.productionCosts?.adesivo || ''}
                            onChange={(e) =>
                              updateField('productionCosts', {
                                ...formData.productionCosts,
                                adesivo: parseNonNegativeFloatInput(e.target.value),
                              })
                            }
                          />
                          <p className="text-xs text-gray-500">Material adesivo</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Vinil (R$)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="R$ 0,00"
                            value={formData.productionCosts?.vinil || ''}
                            onChange={(e) =>
                              updateField('productionCosts', {
                                ...formData.productionCosts,
                                vinil: parseNonNegativeFloatInput(e.target.value),
                              })
                            }
                          />
                          <p className="text-xs text-gray-500">Material vinílico (opcional)</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Montagem/Instalação (R$)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="R$ 0,00"
                            value={formData.productionCosts?.montagem || ''}
                            onChange={(e) =>
                              updateField('productionCosts', {
                                ...formData.productionCosts,
                                montagem: parseNonNegativeFloatInput(e.target.value),
                              })
                            }
                          />
                          <p className="text-xs text-gray-500">Mão de obra para instalação</p>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}


            {/* Financeiro vinculado ao ponto */}
            <div className="space-y-4">
              <h3 className="text-gray-900 border-b pb-2">Financeiro vinculado ao ponto</h3>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pointFinancialEnabled"
                  checked={pointFinancialEnabled}
                  onChange={(e) => setPointFinancialEnabled(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="pointFinancialEnabled" className="cursor-pointer">
                  Criar/atualizar uma transação vinculada a este ponto no Financeiro
                </Label>
              </div>

              {pointFinancialEnabled ? (
                <div className="rounded-lg border bg-slate-50 p-4 space-y-4">
                  {otherPointTransactionsCount > 0 ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Existem {otherPointTransactionsCount} outra(s) transação(ões) vinculadas a este ponto no Financeiro. Esta edição controla apenas o vínculo principal exibido aqui.
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo da transação</Label>
                      <Select value={pointFinancialForm.flowType} onValueChange={(value: string) => setPointFinancialForm((prev) => ({ ...prev, flowType: value as CashFlowType }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={CashFlowType.RECEITA}>Receita</SelectItem>
                          <SelectItem value={CashFlowType.DESPESA}>Despesa</SelectItem>
                          <SelectItem value={CashFlowType.PESSOAS}>Pessoas</SelectItem>
                          <SelectItem value={CashFlowType.IMPOSTO}>Imposto</SelectItem>
                          <SelectItem value={CashFlowType.TRANSFERENCIA}>Transferência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Data base *</Label>
                      <Input type="date" value={pointFinancialForm.date} onChange={(e) => setPointFinancialForm((prev) => ({ ...prev, date: e.target.value }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Descrição *</Label>
                      <Input value={pointFinancialForm.description} onChange={(e) => setPointFinancialForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Ex.: Aluguel mensal do ponto" />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor (R$) *</Label>
                      <Input type="number" min="0" step="0.01" value={pointFinancialForm.amount} onChange={(e) => setPointFinancialForm((prev) => ({ ...prev, amount: e.target.value }))} placeholder="0,00" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label>Categoria</Label>
                        <Button type="button" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setAddCategoryError(null); setAddCategoryOpen(true); }}>
                          + Adicionar
                        </Button>
                      </div>
                      <Select value={pointFinancialForm.categoryId || undefined} onValueChange={(value: string) => { if (value === '__add__') { setAddCategoryError(null); setAddCategoryOpen(true); return; } setPointFinancialForm((prev) => ({ ...prev, categoryId: value })); }}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {transactionCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                          <SelectItem value="__add__">+ Adicionar nova categoria</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Parceiro</Label>
                      <Input value={pointFinancialForm.partnerName} onChange={(e) => setPointFinancialForm((prev) => ({ ...prev, partnerName: e.target.value }))} placeholder="Cliente ou fornecedor" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de pagamento</Label>
                      <Select value={pointFinancialForm.paymentType} onValueChange={(value: string) => setPointFinancialForm((prev) => ({ ...prev, paymentType: value as PaymentType }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={PaymentType.A_VISTA}>À vista</SelectItem>
                          <SelectItem value={PaymentType.PARCELADO}>Parcelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Modo de pagamento</Label>
                      <Select value={pointFinancialForm.paymentMethod || 'none'} onValueChange={(value: string) => setPointFinancialForm((prev) => ({ ...prev, paymentMethod: value === 'none' ? '' : (value as PaymentMethod) }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value={PaymentMethod.PIX}>PIX</SelectItem>
                          <SelectItem value={PaymentMethod.BOLETO}>Boleto</SelectItem>
                          <SelectItem value={PaymentMethod.CARTAO}>Cartão</SelectItem>
                          <SelectItem value={PaymentMethod.TRANSFERENCIA}>Transferência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Vencimento (opcional)</Label>
                      <Input type="date" value={pointFinancialForm.dueDate} onChange={(e) => setPointFinancialForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Recorrência até (opcional)</Label>
                      <Input type="date" value={pointFinancialForm.recurringUntil} onChange={(e) => setPointFinancialForm((prev) => ({ ...prev, recurringUntil: e.target.value }))} disabled={!pointFinancialForm.isRecurring} />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={pointFinancialForm.isRecurring} onChange={(e) => setPointFinancialForm((prev) => ({ ...prev, isRecurring: e.target.checked, isPaid: e.target.checked ? false : prev.isPaid, recurringUntil: e.target.checked ? prev.recurringUntil : '' }))} className="rounded" />
                      Recorrente (mensal)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={pointFinancialForm.isPaid} onChange={(e) => setPointFinancialForm((prev) => ({ ...prev, isPaid: e.target.checked }))} disabled={pointFinancialForm.isRecurring} className="rounded" />
                      Já pago
                    </label>
                  </div>

                  <p className="text-xs text-gray-500">
                    Este vínculo fica sincronizado com o módulo Financeiro. Alterações feitas aqui ou no Financeiro serão refletidas quando o ponto for reaberto para edição.
                  </p>
                </div>
              ) : linkedPointTransaction ? (
                <p className="text-xs text-gray-500">Ao salvar com a integração financeira desativada, a transação principal vinculada a este ponto será removida do Financeiro.</p>
              ) : null}
            </div>

            {/* Mídia Kit */}
            <div className="space-y-4">
              <h3 className="text-gray-900 border-b pb-2">Visibilidade</h3>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showInMediaKit"
                  checked={formData.showInMediaKit || false}
                  onChange={(e) => updateField('showInMediaKit', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="showInMediaKit" className="cursor-pointer">
                  Exibir este ponto no Mídia Kit público (showInMediaKit)
                </Label>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900 mb-2">💡 Próximo passo</p>
              <p className="text-sm text-blue-700">
                Após criar o ponto, você poderá adicionar <strong>unidades (MediaUnit)</strong> - 
                faces para OOH ou telas para DOOH - com preços e características específicas através da opção 
                "Gerenciar unidades" no menu do ponto.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {submitError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </div>
        )}
        </div>

        <div className="shrink-0 border-t px-6 py-4">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Salvando...' : mediaPoint ? 'Salvar Alterações' : 'Salvar Ponto'}
            </Button>
          </div>
        </div>

      <Dialog
        open={addCategoryOpen}
        onOpenChange={(v: boolean) => {
          setAddCategoryOpen(v);
          if (!v) setAddCategoryError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar categoria</DialogTitle>
            <DialogDescription>Cadastre uma nova categoria para aparecer na lista do Financeiro.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da categoria *</Label>
              <Input value={addCategoryName} onChange={(e) => setAddCategoryName(e.target.value)} placeholder="Ex.: Aluguel, Energia, DER" />
            </div>

            {addCategoryError && <p className="text-red-500 text-sm">{addCategoryError}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddCategoryOpen(false)} disabled={isAddingCategory}>Cancelar</Button>
              <Button type="button" onClick={handleAddTransactionCategory} disabled={isAddingCategory}>{isAddingCategory ? 'Salvando...' : 'Adicionar'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addCityOpen}
        onOpenChange={(v: boolean) => {
          setAddCityOpen(v);
          if (!v) setAddCityError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar cidade</DialogTitle>
            <DialogDescription>Cadastre uma nova cidade para aparecer na lista (por UF).</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>UF *</Label>
              <Select value={addCityState || currentUf} onValueChange={(v: string) => setAddCityState(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nome da cidade *</Label>
              <Input
                value={addCityName}
                onChange={(e) => setAddCityName(e.target.value)}
                placeholder="Ex.: São Paulo"
              />
            </div>

            {addCityError && <p className="text-red-500 text-sm">{addCityError}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddCityOpen(false)} disabled={isAddingCity}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleAddCity} disabled={isAddingCity}>
                {isAddingCity ? 'Salvando...' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
</DialogContent>
    </Dialog>
  );
}