import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import {
  MapPin,
  Search,
  Share2,
  Eye,
  Building,
  Copy,
  MessageCircle,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';
import apiClient, { publicApiClient } from '../lib/apiClient';
import { MediaPoint, MediaType } from '../types';

// Map (Leaflet)
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

// Fix Leaflet default marker icons when bundling with Vite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

type Availability = 'Disponível' | 'Parcial' | 'Ocupado';

type MediaKitPoint = MediaPoint & {
  unitsCount?: number;
  occupiedUnitsCount?: number;
  availableUnitsCount?: number;
  availability?: Availability;
};

type MediaKitCompany = {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  email: string | null;
  phone: string | null;
  site: string | null;
  addressCity: string | null;
  addressState: string | null;
};

type MediaKitResponse = {
  ownerCompanies?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    site?: string | null;
    logoUrl?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    isPrimary: boolean;
  }[];
  selectedOwnerCompanyId?: string | null;
  company: MediaKitCompany;
  points: MediaKitPoint[];
  stats: {
    pointsCount: number;
    totalUnits: number;
    totalImpressions: number;
    totalImpressionsFormatted: string;
  };
  generatedAt: string;
};

type MediaKitProps = {
  mode?: 'internal' | 'public';
  token?: string;
};

const ONE_MEDIA_LOGO_SRC = '/figma-assets/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';
const OUTDOOR_BG_SRC = '/figma-assets/outdoor.png';

function getOneMediaUrl(): string {
  // Vite only exposes VITE_* by default, but this project uses URL_ONE_MEDIA in .env
  // so we attempt multiple fallbacks.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (import.meta as any).env ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const winEnv = typeof window !== 'undefined' ? (window as any).__ENV__ ?? {} : {};
  const url = String(env.URL_ONE_MEDIA ?? env.VITE_URL_ONE_MEDIA ?? winEnv.URL_ONE_MEDIA ?? '').trim();
  return url;
}

function normalizeWhatsAppPhone(phone?: string | null): string | null {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  // Expect E.164 digits only (55...)
  // If user stored phone without country code, we still allow it.
  return digits;
}

function formatCurrencyBRL(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function buildPointText(point: MediaKitPoint): string {
  const addr = [
    [point.addressStreet, point.addressNumber].filter(Boolean).join(', '),
    point.addressDistrict,
    [point.addressCity, point.addressState].filter(Boolean).join(' - '),
  ]
    .filter(Boolean)
    .join(' | ');

  const prices = [
    point.basePriceWeek != null ? `Semanal: ${formatCurrencyBRL(point.basePriceWeek)}` : null,
    point.basePriceMonth != null ? `Mensal: ${formatCurrencyBRL(point.basePriceMonth)}` : null,
    point.basePriceDay != null ? `Diária: ${formatCurrencyBRL(point.basePriceDay)}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const availability = point.availability ?? 'Disponível';
  const units =
    point.unitsCount != null
      ? `Faces/Telas: ${point.unitsCount} (Livres: ${point.availableUnitsCount ?? 0})`
      : null;

  const impacts = point.dailyImpressions ? `Impacto/dia: ${point.dailyImpressions}` : null;

  const map = point.latitude && point.longitude ? `Mapa: https://www.google.com/maps?q=${point.latitude},${point.longitude}` : null;

  return [
    `• ${point.name} (${point.type})`,
    addr ? `  - Endereço: ${addr}` : null,
    point.subcategory ? `  - Categoria: ${point.subcategory}` : null,
    point.environment ? `  - Ambiente: ${point.environment}` : null,
    `  - Status: ${availability}`,
    units ? `  - ${units}` : null,
    impacts ? `  - ${impacts}` : null,
    prices ? `  - ${prices}` : null,
    map ? `  - ${map}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function openWhatsApp(phoneDigits: string, message: string) {
  const url = `https://wa.me/${encodeURIComponent(phoneDigits)}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.setView([lat, lng], Math.max(map.getZoom(), 14), { animate: true });
  }, [lat, lng, map]);
  return null;
}

function InvalidateMapSize() {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => {
      map.invalidateSize();
    }, 0);
    return () => window.clearTimeout(t);
  }, [map]);

  useEffect(() => {
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [map]);

  return null;
}

export function MediaKit({ mode = 'internal', token }: MediaKitProps) {
  // Estados para filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | MediaType>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Availability>('all');

  // Empresa responsável selecionada
  const [ownerCompanyId, setOwnerCompanyId] = useState<string>('');

  // Compartilhamento (modo internal)
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [publicTokenUrl, setPublicTokenUrl] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  // Solicitar proposta (bulk)
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);

  // Detalhes do ponto
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsPoint, setDetailsPoint] = useState<MediaKitPoint | null>(null);

  // Data
  const [data, setData] = useState<MediaKitResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Inicializa filtros via query params (serve para link compartilhado com filtros)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const q = (params.get('q') || '').trim();
    const type = (params.get('type') || '').trim();
    const city = (params.get('city') || '').trim();
    const uf = (params.get('state') || '').trim();
    const status = (params.get('status') || '').trim();
    const oc = (params.get('ownerCompanyId') || '').trim();

    if (q) setSearchQuery(q);

    if (type === MediaType.OOH || type === MediaType.DOOH) {
      setTypeFilter(type as MediaType);
    }

    if (city) setCityFilter(city);
    if (uf) setStateFilter(uf);

    if (status === 'Disponível' || status === 'Parcial' || status === 'Ocupado') {
      setStatusFilter(status as Availability);
    }

    if (oc) setOwnerCompanyId(oc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantém o ownerCompanyId na URL para permitir compartilhar/atualizar sem perder seleção
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (ownerCompanyId) params.set('ownerCompanyId', ownerCompanyId);
    else params.delete('ownerCompanyId');
    const qs = params.toString();
    const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', next);
  }, [ownerCompanyId]);

  const allMediaKitPoints = useMemo(() => data?.points ?? [], [data?.points]);
  const company = data?.company ?? null;
  const ownerCompanies = useMemo(() => data?.ownerCompanies ?? [], [data?.ownerCompanies]);

  const loadMediaKit = async () => {
    try {
      setLoading(true);
      setLoadError(null);

      if (mode === 'public') {
        const safeToken = (token || '').trim();
        if (!safeToken) {
          setLoadError('Link inválido: token ausente.');
          setData(null);
          return;
        }

        const resp = await publicApiClient.get<MediaKitResponse>('/public/media-kit', {
          params: {
            token: safeToken,
            ownerCompanyId: ownerCompanyId || undefined,
          },
        });
        setData(resp.data);
        const selected = resp.data.selectedOwnerCompanyId ?? '';
        if (selected && selected !== ownerCompanyId) setOwnerCompanyId(selected);
        return;
      }

      const resp = await apiClient.get<MediaKitResponse>('/media-kit', {
        params: { ownerCompanyId: ownerCompanyId || undefined },
      });
      setData(resp.data);
      const selected = resp.data.selectedOwnerCompanyId ?? '';
      if (selected && selected !== ownerCompanyId) setOwnerCompanyId(selected);
    } catch (err: any) {
      const msg =
        err?.response?.status === 401
          ? 'Você não tem permissão para acessar este Mídia Kit.'
          : 'Não foi possível carregar o Mídia Kit.';
      setLoadError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMediaKit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, token, ownerCompanyId]);

  const availableCities = useMemo(() => {
    const cities = new Set(allMediaKitPoints.map((p) => p.addressCity).filter(Boolean) as string[]);
    return Array.from(cities).sort();
  }, [allMediaKitPoints]);

  const availableStates = useMemo(() => {
    const states = new Set(allMediaKitPoints.map((p) => p.addressState).filter(Boolean) as string[]);
    return Array.from(states).sort();
  }, [allMediaKitPoints]);

  // Se o link vier com cidade/UF inválidos, reseta para não deixar o Select em branco
  useEffect(() => {
    if (cityFilter !== 'all' && availableCities.length > 0 && !availableCities.includes(cityFilter)) {
      setCityFilter('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableCities]);

  useEffect(() => {
    if (stateFilter !== 'all' && availableStates.length > 0 && !availableStates.includes(stateFilter)) {
      setStateFilter('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableStates]);

  // Aplicar filtros
  const filteredPoints = useMemo(() => {
    let filtered = [...allMediaKitPoints];

    if (typeFilter !== 'all') {
      filtered = filtered.filter((p) => p.type === typeFilter);
    }

    if (cityFilter !== 'all') {
      filtered = filtered.filter((p) => p.addressCity === cityFilter);
    }

    if (stateFilter !== 'all') {
      filtered = filtered.filter((p) => p.addressState === stateFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => {
        const av = (p.availability ?? 'Disponível') as Availability;
        if (statusFilter === 'Disponível') return av === 'Disponível' || av === 'Parcial';
        return av === statusFilter;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => {
        return (
          p.name.toLowerCase().includes(query) ||
          p.addressCity?.toLowerCase().includes(query) ||
          p.addressState?.toLowerCase().includes(query) ||
          p.addressStreet?.toLowerCase().includes(query) ||
          p.addressDistrict?.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [allMediaKitPoints, typeFilter, cityFilter, stateFilter, statusFilter, searchQuery]);

  // ===== Mapa preview (no modal de detalhes) =====
  const getStaticMapPreviewUrl = (point: MediaPoint): string | null => {
    if (!point.latitude || !point.longitude) return null;
    const lat = Number(point.latitude);
    const lng = Number(point.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const zoom = 16;
    const size = '600x300';
    const center = `${lat},${lng}`;
    const marker = `${lat},${lng},red-pushpin`;
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${encodeURIComponent(center)}&zoom=${zoom}&size=${size}&markers=${encodeURIComponent(
      marker,
    )}`;
  };

  const getOsmEmbedUrl = (point: MediaPoint): string | null => {
    if (!point.latitude || !point.longitude) return null;
    const lat = Number(point.latitude);
    const lng = Number(point.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const delta = 0.0045;
    const left = lng - delta;
    const right = lng + delta;
    const top = lat + delta;
    const bottom = lat - delta;

    const bbox = `${left},${bottom},${right},${top}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(
      `${lat},${lng}`,
    )}`;
  };

  function MediaKitMapPreview({ point }: { point: MediaPoint }) {
    const src = getStaticMapPreviewUrl(point);
    const embed = getOsmEmbedUrl(point);
    const [imgFailed, setImgFailed] = useState(false);

    if (!src || !embed) {
      return <div className="px-3 py-3 text-xs text-gray-500">Sem coordenadas para preview do mapa.</div>;
    }

    if (imgFailed) {
      return (
        <iframe
          title={`Mapa de ${point.name}`}
          src={embed}
          className="w-full h-full"
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{ border: 0 }}
        />
      );
    }

    return (
      <img
        src={src}
        alt={`Mapa de ${point.name}`}
        className="w-full h-full object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
      />
    );
  }

  // ===== Compartilhar (internal) =====
  const copyToClipboardFallback = (text: string): boolean => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (_err) {
      return false;
    }
  };

  const buildShareUrlWithFilters = (baseUrl: string) => {
    try {
      const u = new URL(baseUrl);
      const sp = u.searchParams;

      const q = searchQuery.trim();
      if (q) sp.set('q', q);
      else sp.delete('q');

      if (typeFilter !== 'all') sp.set('type', String(typeFilter));
      else sp.delete('type');

      if (cityFilter !== 'all') sp.set('city', cityFilter);
      else sp.delete('city');

      if (stateFilter !== 'all') sp.set('state', stateFilter);
      else sp.delete('state');

      if (statusFilter !== 'all') sp.set('status', String(statusFilter));
      else sp.delete('status');

      // Persist selected responsible company
      if (ownerSelectValue) sp.set('ownerCompanyId', ownerSelectValue);
      else sp.delete('ownerCompanyId');

      return u.toString();
    } catch {
      return baseUrl;
    }
  };

  const ensurePublicTokenUrl = async () => {
    if (publicTokenUrl) return publicTokenUrl;

    try {
      const resp = await apiClient.get<{ token: string; expiresAt: string }>('/media-kit/share-link');
      const url = `${window.location.origin}/mk?token=${encodeURIComponent(resp.data.token)}`;
      setPublicTokenUrl(url);
      return url;
    } catch {
      toast.error('Não foi possível gerar o link público do Mídia Kit.');
      return '';
    }
  };

  const handleShare = async () => {
    setShareDialogOpen(true);
    const base = await ensurePublicTokenUrl();
    if (!base) return;
    setShareUrl(buildShareUrlWithFilters(base));
  };

  const handleCopyLink = async () => {
    const base = await ensurePublicTokenUrl();
    if (!base) return;

    const url = buildShareUrlWithFilters(base);
    setShareUrl(url);
    if (!url) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          toast.success('Link do Mídia Kit copiado para a área de transferência!');
          setShareDialogOpen(false);
        })
        .catch(() => {
          const success = copyToClipboardFallback(url);
          if (success) {
            toast.success('Link do Mídia Kit copiado para a área de transferência!');
            setShareDialogOpen(false);
          } else {
            toast.info('Selecione e copie o link manualmente (Ctrl+C ou Cmd+C)');
          }
        });
    } else {
      const success = copyToClipboardFallback(url);
      if (success) {
        toast.success('Link do Mídia Kit copiado para a área de transferência!');
        setShareDialogOpen(false);
      } else {
        toast.info('Selecione e copie o link manualmente (Ctrl+C ou Cmd+C)');
      }
    }
  };

  // ===== Ações: detalhes / whatsapp =====
  const openDetails = (p: MediaKitPoint) => {
    setDetailsPoint(p);
    setDetailsOpen(true);
  };

  const handleRequestForPoints = (points: MediaKitPoint[]) => {
    const phoneDigits = normalizeWhatsAppPhone(company?.phone);
    if (!phoneDigits) {
      toast.error('Número de WhatsApp da empresa não cadastrado.');
      return;
    }
    if (!points.length) {
      toast.info('Selecione pelo menos um ponto.');
      return;
    }

    const companyName = company?.name ? ` (${company.name})` : '';
    const msg = [
      `Olá! Gostaria de solicitar uma proposta${companyName}.`,
      '',
      'Pontos selecionados:',
      ...points.map((p) => buildPointText(p)),
    ].join('\n');

    openWhatsApp(phoneDigits, msg);
  };

  const openBulkRequestDialog = () => {
    setSelectedPointIds([]);
    setRequestDialogOpen(true);
  };

  const selectedPoints = useMemo(() => {
    if (!selectedPointIds.length) return [] as MediaKitPoint[];
    const map = new Map(allMediaKitPoints.map((p) => [p.id, p]));
    return selectedPointIds.map((id) => map.get(id)).filter(Boolean) as MediaKitPoint[];
  }, [selectedPointIds, allMediaKitPoints]);

  const mapPointsWithCoords = useMemo(() => {
    return filteredPoints.filter((p) => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)));
  }, [filteredPoints]);

  const mapCenter = useMemo(() => {
    const first = mapPointsWithCoords[0];
    const lat = first?.latitude != null ? Number(first.latitude) : -23.5505;
    const lng = first?.longitude != null ? Number(first.longitude) : -46.6333;
    return { lat, lng };
  }, [mapPointsWithCoords]);

  const [selectedMapPointId, setSelectedMapPointId] = useState<string | null>(null);

  const headerSubtitle =
    company?.addressCity || company?.addressState
      ? `${company?.addressCity ?? ''}${company?.addressState ? `, ${company.addressState}` : ''}`
      : '';

  const oneMediaUrl = getOneMediaUrl();

  const ownerSelectValue = useMemo(() => {
    return ownerCompanyId || data?.selectedOwnerCompanyId || ownerCompanies[0]?.id || '';
  }, [ownerCompanyId, data?.selectedOwnerCompanyId, ownerCompanies]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* HERO */}
      <div
        className="relative bg-center bg-cover"
        style={{ backgroundImage: `url(${OUTDOOR_BG_SRC})` }}
      >
        <div className="absolute inset-0 bg-black/50" />

        <div className="relative max-w-7xl mx-auto px-8 md:px-10 py-20 md:py-28 min-h-[350px] md:min-h-[460px]">
          <div className="flex items-start justify-between gap-6">
            <img src={ONE_MEDIA_LOGO_SRC} alt="OneMedia" className="h-8 md:h-10" />

            <div className="flex items-center gap-2">
              {mode === 'internal' && (
                <Button variant="secondary" className="gap-2" onClick={handleShare}>
                  <Share2 className="w-4 h-4" />
                  Compartilhar
                </Button>
              )}
            </div>
          </div>

          <div className="mt-14 md:mt-20 max-w-2xl">
            <h1 className="text-white text-3xl md:text-4xl font-semibold">Mídia Kit Digital</h1>
            {company?.name && (
              <p className="text-white/80 mt-2">
                {company.name}{headerSubtitle ? ` — ${headerSubtitle}` : ''}
              </p>
            )}

            <Button className="mt-6 gap-2" onClick={openBulkRequestDialog}>
              <MessageCircle className="w-4 h-4" />
              Solicitar Proposta
            </Button>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3">
            <div className="flex-1 relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome, cidade ou endereço..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={typeFilter} onValueChange={(value: string) => setTypeFilter(value as 'all' | MediaType)}>
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value={MediaType.OOH}>OOH</SelectItem>
                <SelectItem value={MediaType.DOOH}>DOOH</SelectItem>
              </SelectContent>
            </Select>

            <Select value={cityFilter} onValueChange={(value: string) => setCityFilter(value)}>
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as cidades</SelectItem>
                {availableCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stateFilter} onValueChange={(value: string) => setStateFilter(value)}>
              <SelectTrigger className="w-full lg:w-32">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas UFs</SelectItem>
                {availableStates.map((uf) => (
                  <SelectItem key={uf} value={uf}>
                    {uf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value as 'all' | Availability)}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Disponível">Disponível</SelectItem>
                <SelectItem value="Parcial">Parcial</SelectItem>
                <SelectItem value="Ocupado">Ocupado</SelectItem>
              </SelectContent>
            </Select>

            {ownerCompanies.length > 1 && (
              <Select
                value={ownerSelectValue}
                onValueChange={(value: string) => {
                  setOwnerCompanyId(value);
                  setSelectedMapPointId(null);
                }}
              >
                <SelectTrigger className="w-full lg:w-64">
                  <SelectValue placeholder="Empresa responsável" />
                </SelectTrigger>
                <SelectContent>
                  {ownerCompanies.map((oc) => (
                    <SelectItem key={oc.id} value={oc.id}>
                      {oc.name}{oc.isPrimary ? ' (principal)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-6 w-full flex-1">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">Carregando Mídia Kit…</p>
            </CardContent>
          </Card>
        ) : loadError ? (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <p className="text-gray-600">{loadError}</p>
              <Button variant="outline" onClick={loadMediaKit}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LIST */}
            <div className="lg:col-span-2">
              {filteredPoints.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500">Nenhum ponto de mídia encontrado com os filtros selecionados.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredPoints.map((point) => {
                    const unitsCount = point.unitsCount ?? point.units?.length ?? 0;
                    const occupiedUnitsCount = point.occupiedUnitsCount ?? 0;
                    const availableUnitsCount = point.availableUnitsCount ?? Math.max(unitsCount - occupiedUnitsCount, 0);
                    const availability = (point.availability ?? (availableUnitsCount > 0 ? 'Disponível' : 'Ocupado')) as Availability;

                    return (
                      <Card key={point.id} className="overflow-hidden">
                        <div className="p-4 flex flex-col sm:flex-row gap-4">
                          <div className="relative flex-shrink-0 w-80 max-w-full h-60 mx-auto sm:mx-0 bg-gray-100 rounded-xl overflow-hidden">
                            <ImageWithFallback
                              src={
                                point.mainImageUrl ||
                                'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800'
                              }
                              alt={point.name}
                              className="w-full h-full object-cover"
                            />
                            <Badge className="absolute top-3 left-3 bg-indigo-500">{point.type}</Badge>
                            <Badge
                              className={`absolute top-3 right-3 ${
                                availability === 'Disponível'
                                  ? 'bg-green-500'
                                  : availability === 'Parcial'
                                    ? 'bg-amber-500'
                                    : 'bg-orange-500'
                              }`}
                            >
                              {availability}
                            </Badge>
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-4">
                            {/* INFO */}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-gray-900 font-semibold truncate">{point.name}</h3>

                              <div className="mt-2 text-sm text-gray-600 flex items-start gap-2">
                                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span className="truncate">
                                  {[point.addressStreet, point.addressNumber].filter(Boolean).join(', ') || '—'}
                                  {point.addressCity || point.addressState
                                    ? ` — ${[point.addressCity, point.addressState].filter(Boolean).join(' / ')}`
                                    : ''}
                                </span>
                              </div>

                              <div className="mt-3 space-y-1 text-sm text-gray-700">
                                <div>Faces/Telas: {unitsCount}</div>
                                <div>Livres: {availableUnitsCount}</div>
                                <div>
                                  Impacto/dia:{' '}
                                  {point.dailyImpressions ? `${Math.floor(Number(point.dailyImpressions) / 1000)}k` : '—'}
                                </div>
                              </div>
                            </div>

                            {/* PRICE + CTA */}
                            <div className="w-full sm:w-52 flex-shrink-0 flex flex-col sm:items-end justify-between gap-3">
                              <div className="space-y-1 text-right">
                                <div className="text-indigo-600 font-semibold whitespace-nowrap">
                                  {point.basePriceMonth != null ? `${formatCurrencyBRL(point.basePriceMonth)}/mês` : '—'}
                                </div>
                                <div className="text-indigo-600 font-semibold whitespace-nowrap">
                                  {point.basePriceWeek != null ? `${formatCurrencyBRL(point.basePriceWeek)}/semana` : '—'}
                                </div>
                              </div>

                              <Button
                                className="gap-2 self-start sm:self-end"
                                onClick={() => {
                                  setSelectedMapPointId(point.id);
                                  openDetails(point);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                                Ver Detalhes
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* MAP */}
            <div className="lg:col-span-1">
              <Card className="overflow-hidden lg:sticky lg:top-6">
                <CardContent className="p-0">
                  <div className="h-[420px] sm:h-[520px]">
                    {mapPointsWithCoords.length === 0 ? (
                      <div className="h-full w-full flex items-center justify-center bg-white text-sm text-gray-500">
                        Nenhum ponto com coordenadas para exibir no mapa.
                      </div>
                    ) : (
                      <MapContainer
  key={`mk-map-${ownerSelectValue}-${mapPointsWithCoords.length}`}
  center={[mapCenter.lat, mapCenter.lng]}
  zoom={12}
  scrollWheelZoom
  className="w-full h-full"
  style={{ height: '100%', width: '100%' }}
>
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      <InvalidateMapSize />

                      {selectedMapPointId && (() => {
                        const p = mapPointsWithCoords.find((x) => x.id === selectedMapPointId);
                        if (!p || p.latitude == null || p.longitude == null) return null;
                        return <FlyTo lat={Number(p.latitude)} lng={Number(p.longitude)} />;
                      })()}

                      {mapPointsWithCoords.map((p) => {
                        const lat = Number(p.latitude);
                        const lng = Number(p.longitude);
                        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                        return (
                          <Marker
                            key={p.id}
                            position={[lat, lng]}
                            eventHandlers={{
                              click: () => {
                                setSelectedMapPointId(p.id);
                                openDetails(p);
                              },
                            }}
                          >
                            <Popup>
                              <div className="space-y-2">
                                <div className="font-semibold">{p.name}</div>
                                <div className="text-xs text-gray-600">
                                  {[p.addressCity, p.addressState].filter(Boolean).join(' / ') || '—'}
                                </div>
                                <Button size="sm" className="w-full" onClick={() => openDetails(p)}>
                                  Ver Detalhes
                                </Button>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white mt-10">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">Empresa responsável pelos pontos</p>

              {company?.logoUrl ? (
                <div className="inline-flex items-center rounded-md bg-white/10 p-2">
                  <ImageWithFallback src={company.logoUrl} alt={company.name} className="h-10 w-auto" />
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm text-white/90">
                  <Building className="w-4 h-4" />
                  <span>{company?.name ?? '—'}</span>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-3">Contato &amp; Localização</h3>
              <div className="space-y-2 text-sm text-white/90">
                {(company?.addressCity || company?.addressState) && (
                  <div>
                    <div className="text-white/70 text-xs">Local</div>
                    <div>{[company?.addressCity, company?.addressState].filter(Boolean).join(' - ')}</div>
                  </div>
                )}
                {company?.email && (
                  <div>
                    <div className="text-white/70 text-xs">Email</div>
                    <div>{company.email}</div>
                  </div>
                )}
                {company?.phone && (
                  <div>
                    <div className="text-white/70 text-xs">Telefone</div>
                    <div>{company.phone}</div>
                  </div>
                )}
                {company?.site && (
                  <div>
                    <div className="text-white/70 text-xs">Site</div>
                    <div>{company.site}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="md:text-right">
              <h3 className="font-semibold mb-3">Redes Sociais</h3>
              <div className="flex md:justify-end gap-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10" aria-hidden>
                  <Linkedin className="w-4 h-4" />
                </div>
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10" aria-hidden>
                  <Instagram className="w-4 h-4" />
                </div>
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10" aria-hidden>
                  <Facebook className="w-4 h-4" />
                </div>
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10" aria-hidden>
                  <Twitter className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-4 text-center text-xs text-white/60">
            © 2026{' '}
            <a
              href={oneMediaUrl || '#'}
              target={oneMediaUrl ? '_blank' : undefined}
              rel={oneMediaUrl ? 'noreferrer noopener' : undefined}
              className="text-white/70 hover:text-white hover:underline"
            >
              OneMedia
            </a>
            . Todos os direitos reservados. |{' '}
            <a href="/privacidade" className="hover:underline">Política de Privacidade</a> |{' '}
            <a href="/termos" className="hover:underline">Termos de Uso</a>
          </div>
        </div>
      </footer>

      {/* Dialog: Solicitar Proposta (Seleção múltipla) */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Solicitar Proposta</DialogTitle>
            <DialogDescription>
              Selecione um ou mais pontos e clique em <b>Solicitar</b> para enviar uma mensagem no WhatsApp da empresa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-gray-600">
                {selectedPointIds.length} selecionado(s) • {filteredPoints.length} ponto(s) na lista
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  if (selectedPointIds.length === filteredPoints.length) {
                    setSelectedPointIds([]);
                  } else {
                    setSelectedPointIds(filteredPoints.map((p) => p.id));
                  }
                }}
              >
                {selectedPointIds.length === filteredPoints.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </Button>
            </div>

            <div className="rounded-md border border-gray-200">
              <ScrollArea className="h-[360px]">
                <div className="p-3 space-y-2">
                  {filteredPoints.map((p) => {
                    const checked = selectedPointIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPointIds((prev) =>
                            prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id],
                          );
                        }}
                        className="w-full text-left rounded-md hover:bg-gray-50 px-2 py-2 flex items-start gap-3"
                      >
                        <Checkbox checked={checked} className="mt-1" />
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{p.name}</div>
                          <div className="text-xs text-gray-600 truncate">
                            {[p.addressCity, p.addressState].filter(Boolean).join(' / ') || '—'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="gap-2"
                onClick={() => {
                  handleRequestForPoints(selectedPoints);
                  setRequestDialogOpen(false);
                }}
                disabled={selectedPointIds.length === 0}
              >
                <MessageCircle className="w-4 h-4" />
                Solicitar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes do ponto */}
      <Dialog
        open={detailsOpen}
        onOpenChange={(open: boolean) => {
          setDetailsOpen(open);
          if (!open) setDetailsPoint(null);
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes do ponto</DialogTitle>
            <DialogDescription>Informações completas do ponto e localização no mapa.</DialogDescription>
          </DialogHeader>

          {detailsPoint ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 space-y-3">
                <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  <div className="h-56">
                    <ImageWithFallback
                      src={
                        detailsPoint.mainImageUrl ||
                        'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800'
                      }
                      alt={detailsPoint.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  <div className="h-56">
                    <MediaKitMapPreview point={detailsPoint} />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 flex flex-col">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-500">{detailsPoint.type}</Badge>
                    <Badge
                      className={`${
                        (detailsPoint.availability ?? 'Disponível') === 'Disponível'
                          ? 'bg-green-500'
                          : (detailsPoint.availability ?? 'Disponível') === 'Parcial'
                            ? 'bg-amber-500'
                            : 'bg-orange-500'
                      }`}
                    >
                      {detailsPoint.availability ?? 'Disponível'}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900">{detailsPoint.name}</h3>

                  <div className="text-sm text-gray-700">
                    {[detailsPoint.addressStreet, detailsPoint.addressNumber].filter(Boolean).join(', ')}
                    {detailsPoint.addressDistrict ? ` — ${detailsPoint.addressDistrict}` : ''}
                    {(detailsPoint.addressCity || detailsPoint.addressState) && (
                      <> • {[detailsPoint.addressCity, detailsPoint.addressState].filter(Boolean).join(' / ')}</>
                    )}
                  </div>

                  {detailsPoint.description && (
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">{detailsPoint.description}</div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Faces/Telas</div>
                      <div className="text-gray-900">{detailsPoint.unitsCount ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Livres</div>
                      <div className="text-gray-900">{detailsPoint.availableUnitsCount ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Impacto/dia</div>
                      <div className="text-gray-900">{detailsPoint.dailyImpressions ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Categoria</div>
                      <div className="text-gray-900">{detailsPoint.subcategory ?? '—'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Semanal</div>
                      <div className="text-gray-900">{formatCurrencyBRL(detailsPoint.basePriceWeek)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Mensal</div>
                      <div className="text-gray-900">{formatCurrencyBRL(detailsPoint.basePriceMonth)}</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Button
                    className="gap-2"
                    onClick={() => {
                      handleRequestForPoints([detailsPoint]);
                    }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Solicitar proposta
                  </Button>

                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      if (detailsPoint.latitude && detailsPoint.longitude) {
                        window.open(
                          `https://www.google.com/maps?q=${detailsPoint.latitude},${detailsPoint.longitude}`,
                          '_blank',
                        );
                      } else {
                        toast.info('Coordenadas GPS não cadastradas para este ponto de mídia.');
                      }
                    }}
                  >
                    <MapPin className="w-4 h-4" />
                    Abrir no mapa
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-sm text-gray-600">Nenhum ponto selecionado.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Compartilhamento (somente modo internal) */}
      {mode === 'internal' && (
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Compartilhar Mídia Kit</DialogTitle>
              <DialogDescription>
                Compartilhe o link público do Mídia Kit com seus clientes. Se você tiver filtros ativos, o link já abre
                com esses filtros aplicados (mas quem receber pode alterá-los).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input readOnly value={shareUrl || 'Gerando link...'} className="flex-1" />
                <Button onClick={handleCopyLink} className="gap-2" disabled={!shareUrl}>
                  <Copy className="w-4 h-4" />
                  Copiar
                </Button>
              </div>

              <p className="text-sm text-gray-500">
                Qualquer pessoa com o link pode visualizar seu portfólio. Se o link incluir filtros, eles serão aplicados
                inicialmente — e depois podem ser alterados normalmente.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
