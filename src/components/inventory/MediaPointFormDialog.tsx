import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { X, ChevronDown, Package, ExternalLink, MapPin } from 'lucide-react';
import { MediaPoint, MediaType, ProductionCosts } from '../../types';
import { useMediaPointsMeta } from '../../hooks/useMediaPointsMeta';
import apiClient from '../../lib/apiClient';
import { resolveUploadsUrl } from '../../lib/format';
import { OOH_SUBCATEGORIES, DOOH_SUBCATEGORIES, ENVIRONMENTS, BRAZILIAN_STATES, SOCIAL_CLASSES } from '../../lib/mockData';

import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { reverseGeocodeOSM, type ReverseGeocodeAddress } from '../../lib/geocode';

type LatLng = { lat: number; lng: number };

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

interface MediaPointFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaPoint?: MediaPoint | null;
  initialData?: Partial<MediaPoint> | null;
  onSave: (data: Partial<MediaPoint>, imageFile?: File | null) => Promise<any> | void;
}

export function MediaPointFormDialog({ open, onOpenChange, mediaPoint, initialData, onSave }: MediaPointFormDialogProps) {
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // =====================
  // Mapa (Etapa 6)
  // =====================
  const [mapMode, setMapMode] = useState<'map' | 'satellite'>('map');
  const [pinPos, setPinPos] = useState<LatLng | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const lastAutoRef = useRef<ReverseGeocodeAddress | null>(null);
  const geoAbortRef = useRef<AbortController | null>(null);
  const geoTimerRef = useRef<number | null>(null);

    const { cities: metaCities, refetch: refetchMeta } = useMediaPointsMeta();

  const [addCityOpen, setAddCityOpen] = useState(false);
  const [addCityName, setAddCityName] = useState('');
  const [addCityState, setAddCityState] = useState('');
  const [addCityError, setAddCityError] = useState<string | null>(null);
  const [isAddingCity, setIsAddingCity] = useState(false);


  useEffect(() => {
    setSubmitError(null);
    if (mediaPoint) {
      setFormData(mediaPoint);
      setType(mediaPoint.type);
      setImageFile(null);
      setImagePreview(resolveUploadsUrl(mediaPoint.mainImageUrl) || null);
    } else {
      const merged: Partial<MediaPoint> = {
        type: MediaType.OOH,
        showInMediaKit: false,
        addressCountry: 'Brasil',
        socialClasses: [],
        ...(initialData ?? {}),
      };
      setFormData(merged);
      setType(MediaType.OOH);
      setImageFile(null);
      setImagePreview(null);
    }
    // Reset do auto-fill quando abrir
    lastAutoRef.current = null;
    setGeoError(null);
    setGeoLoading(false);
  }, [mediaPoint, open, initialData]);

  // Sincroniza pin com lat/lng do form
  useEffect(() => {
    const lat = Number((formData as any)?.latitude);
    const lng = Number((formData as any)?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setPinPos((prev) => {
      if (prev && Math.abs(prev.lat - lat) < 1e-8 && Math.abs(prev.lng - lng) < 1e-8) return prev;
      return { lat, lng };
    });
  }, [formData.latitude, formData.longitude]);

  const handleTypeChange = (newType: MediaType) => {
    setType(newType);
    setFormData(prev => ({ ...prev, type: newType, subcategory: undefined }));
  };


  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);

    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      // Mantém o preview atual (ex.: imagem já salva) quando limpar o input.
      // Se quiser "remover imagem", isso deve ser uma ação explícita.
    }
  };

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const updateField = (field: keyof MediaPoint, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const scheduleReverseGeocode = (lat: number, lng: number) => {
    window.clearTimeout(geoTimerRef.current ?? undefined);
    geoTimerRef.current = window.setTimeout(() => {
      void reverseGeocodeAndApply(lat, lng);
    }, 450);
  };

  const applyAutoField = (field: keyof MediaPoint, value?: string) => {
    if (!value) return;
    const current = String((formData as any)?.[field] ?? '').trim();
    const prevAuto = String((lastAutoRef.current as any)?.[field] ?? '').trim();
    // Só sobrescreve se estiver vazio ou se for o valor auto anterior
    if (!current || current === prevAuto) {
      updateField(field, value);
    }
  };

  const reverseGeocodeAndApply = async (lat: number, lng: number) => {
    try {
      setGeoError(null);
      setGeoLoading(true);
      geoAbortRef.current?.abort();
      const controller = new AbortController();
      geoAbortRef.current = controller;

      const addr = await reverseGeocodeOSM(lat, lng, controller.signal);
      if (!addr) return;

      // Atualiza last auto (para não sobrescrever manual)
      lastAutoRef.current = { ...(lastAutoRef.current ?? {}), ...addr };

      // Ordem importa (UF -> Cidade)
      if (addr.addressState) {
        applyAutoField('addressState', addr.addressState);
      }

      if (addr.addressCity) {
        // Garante que a cidade apareça no Select atual
        setCitiesForUf((prev) => {
          const cityName = String(addr.addressCity ?? '').trim();
          if (!cityName) return prev;
          if (prev.includes(cityName)) return prev;
          return [...prev, cityName].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        });
        applyAutoField('addressCity', addr.addressCity);
      }

      applyAutoField('addressDistrict', addr.addressDistrict);
      applyAutoField('addressStreet', addr.addressStreet);
      applyAutoField('addressNumber', addr.addressNumber);
      applyAutoField('addressZipcode', addr.addressZipcode);
      applyAutoField('addressCountry', addr.addressCountry);
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      if (msg.includes('abort')) return;
      setGeoError('Não foi possível preencher o endereço automaticamente.');
    } finally {
      setGeoLoading(false);
    }
  };

  const applyPinPosition = (p: LatLng, opts?: { autoFill?: boolean }) => {
    setPinPos(p);
    updateField('latitude', Number(p.lat.toFixed(6)));
    updateField('longitude', Number(p.lng.toFixed(6)));
    if (opts?.autoFill !== false) {
      scheduleReverseGeocode(p.lat, p.lng);
    }
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
    if (formData.latitude === undefined || formData.latitude === null) {
      newErrors.latitude = 'Latitude é obrigatória';
    }
    if (formData.longitude === undefined || formData.longitude === null) {
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
      await onSave(
        {
          ...payload,
          type,
        },
        imageFile
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
    onOpenChange(false);
  };

  const subcategories = type === MediaType.OOH ? OOH_SUBCATEGORIES : DOOH_SUBCATEGORIES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mediaPoint ? 'Editar Ponto de Mídia' : 'Cadastrar Novo Ponto de Mídia (MediaPoint)'}
          </DialogTitle>
          <DialogDescription>
            {mediaPoint ? 'Atualize os detalhes do ponto de mídia.' : 'Preencha os campos para cadastrar um novo ponto de mídia.'}
          </DialogDescription>
        </DialogHeader>

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
                <Label>Imagem principal</Label>
                <Input type="file" accept="image/*" onChange={handleImageChange} />
                {imagePreview && (
                  <div className="mt-2 w-full max-w-sm h-40 bg-gray-100 rounded overflow-hidden">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Selecione uma imagem (PNG/JPG). O upload será feito ao salvar.
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
                    center={pinPos ? ([pinPos.lat, pinPos.lng] as any) : ([-23.55052, -46.633308] as any)}
                    zoom={pinPos ? 17 : 12}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl
                  >
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
                    onChange={(e) => updateField('addressZipcode', e.target.value)}
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
                    onChange={(e) => updateField('addressNumber', e.target.value)}
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
                    onChange={(e) => updateField('latitude', parseFloat(e.target.value))}
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
                    onChange={(e) => updateField('longitude', parseFloat(e.target.value))}
                    className={errors.longitude ? 'border-red-500' : ''}
                  />
                  {errors.longitude && <p className="text-xs text-red-600">{errors.longitude}</p>}
                </div>
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
                    placeholder="85000"
                    value={formData.dailyImpressions || ''}
                    onChange={(e) => updateField('dailyImpressions', parseInt(e.target.value) || null)}
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
                    step="0.01"
                    placeholder="8500.00"
                    value={formData.basePriceMonth || ''}
                    onChange={(e) => updateField('basePriceMonth', parseFloat(e.target.value) || null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço Quinzenal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="2500.00"
                    value={formData.basePriceWeek || ''}
                    onChange={(e) => updateField('basePriceWeek', parseFloat(e.target.value) || null)}
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
                            step="0.01"
                            placeholder="R$ 0,00"
                            value={formData.productionCosts?.lona || ''}
                            onChange={(e) =>
                              updateField('productionCosts', {
                                ...formData.productionCosts,
                                lona: parseFloat(e.target.value) || null,
                              })
                            }
                          />
                          <p className="text-xs text-gray-500">Material de impressão (lona/tecido)</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Adesivo (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="R$ 0,00"
                            value={formData.productionCosts?.adesivo || ''}
                            onChange={(e) =>
                              updateField('productionCosts', {
                                ...formData.productionCosts,
                                adesivo: parseFloat(e.target.value) || null,
                              })
                            }
                          />
                          <p className="text-xs text-gray-500">Material adesivo</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Vinil (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="R$ 0,00"
                            value={formData.productionCosts?.vinil || ''}
                            onChange={(e) =>
                              updateField('productionCosts', {
                                ...formData.productionCosts,
                                vinil: parseFloat(e.target.value) || null,
                              })
                            }
                          />
                          <p className="text-xs text-gray-500">Material vinílico (opcional)</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Montagem/Instalação (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="R$ 0,00"
                            value={formData.productionCosts?.montagem || ''}
                            onChange={(e) =>
                              updateField('productionCosts', {
                                ...formData.productionCosts,
                                montagem: parseFloat(e.target.value) || null,
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

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : mediaPoint ? 'Salvar Alterações' : 'Salvar Ponto'}
          </Button>
        </div>
      

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