import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, Polyline, Rectangle, useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';

import { Search, X, List, MapPin, Star, Copy, ExternalLink, Plus, Pencil, Square, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { cn } from './ui/utils';

import type {
  MediaMapDetails,
  MediaMapPoint,
  MediaMapSuggestion,
  MediaType,
  MediaUnitAvailabilityStatus,
} from '../types';
import {
  fetchMediaMapDetails,
  fetchMediaMapSuggestions,
  invalidateMediaMapCaches,
  setMediaPointFavorite,
  type MediaMapLayer,
  useMediaMapPoints,
} from '../hooks/useMediaMap';
import { useNavigation } from '../App';

type BboxArr = [number, number, number, number];


type LatLng = { lat: number; lng: number };

// Usado para passar seleção do Mídia Map -> Propostas (Etapa 4)
const MEDIA_MAP_SELECTION_STORAGE_KEY = 'ONE_MEDIA_MEDIAMAP_PRESELECT_POINT_IDS';

function pointInPolygon(pt: LatLng, polygon: LatLng[]) {
  // Ray casting (lng=x, lat=y)
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect = yi > pt.lat !== yj > pt.lat && pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function rectToPolygon(a: LatLng, b: LatLng): LatLng[] {
  const south = Math.min(a.lat, b.lat);
  const north = Math.max(a.lat, b.lat);
  const west = Math.min(a.lng, b.lng);
  const east = Math.max(a.lng, b.lng);
  return [
    { lat: south, lng: west },
    { lat: south, lng: east },
    { lat: north, lng: east },
    { lat: north, lng: west },
  ];
}

function boundsFromPolygon(poly: LatLng[]) {
  return L.latLngBounds(poly.map((p) => [p.lat, p.lng] as [number, number]));
}

function formatCoord(n: number) {
  // 6 casas é suficiente para bbox e reduz ruído em updates
  return Number(n.toFixed(6));
}

function getBboxFromMap(map: LeafletMap): { bboxStr: string; bboxArr: BboxArr; zoom: number } {
  const b = map.getBounds();
  const west = formatCoord(b.getWest());
  const south = formatCoord(b.getSouth());
  const east = formatCoord(b.getEast());
  const north = formatCoord(b.getNorth());
  const bboxArr: BboxArr = [west, south, east, north];
  const bboxStr = `${west},${south},${east},${north}`;
  const zoom = map.getZoom();
  return { bboxStr, bboxArr, zoom };
}

function buildClusterIcon(count: number) {
  const size = count < 10 ? 34 : count < 100 ? 38 : 44;
  return L.divIcon({
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:${size}px;
        background:rgba(79,70,229,0.92);
        color:white;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:12px;
        font-weight:600;
        border:2px solid rgba(255,255,255,0.9);
        box-shadow:0 6px 18px rgba(0,0,0,0.18);
      ">
        ${count}
      </div>
    `,
    className: 'one-media-cluster-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function pickPointColor(p: MediaMapPoint) {
  // heurística simples para MVP
  if (p.facesOccupiedCount > 0 && p.facesOccupiedCount === p.facesTotal) return 'rgba(239,68,68,0.95)'; // red
  if (p.facesOccupiedCount > 0) return 'rgba(245,158,11,0.95)'; // amber
  if (p.facesNegotiationCount > 0) return 'rgba(168,85,247,0.95)'; // purple
  return 'rgba(34,197,94,0.95)'; // green
}

function buildPointIcon(p: MediaMapPoint) {
  const bg = pickPointColor(p);
  const star = p.isFavorite
    ? `<div style="position:absolute; top:-6px; right:-6px; width:18px; height:18px; border-radius:18px; background:rgba(17,24,39,0.9); border:2px solid rgba(255,255,255,0.9); display:flex; align-items:center; justify-content:center; font-size:11px;">★</div>`
    : '';

  return L.divIcon({
    html: `
      <div style="position:relative;">
        <div style="
          width:22px;
          height:22px;
          border-radius:22px;
          background:${bg};
          border:2px solid rgba(255,255,255,0.95);
          box-shadow:0 6px 18px rgba(0,0,0,0.18);
        "></div>
        ${star}
      </div>
    `,
    className: 'one-media-point-icon',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function humanStatus(p: Pick<MediaMapPoint, 'facesTotal' | 'facesFreeCount' | 'facesOccupiedCount' | 'facesNegotiationCount'>) {
  if (p.facesTotal > 0 && p.facesOccupiedCount === p.facesTotal) return 'Totalmente ocupada';
  if (p.facesOccupiedCount > 0) return 'Parcialmente ocupada';
  if (p.facesNegotiationCount > 0) return 'Em negociação';
  return 'Livre';
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

function MapEvents({ mapRef, onViewportChange }: { mapRef: MutableRefObject<LeafletMap | null>; onViewportChange: (map: LeafletMap) => void }) {
  const map = useMapEvents({
    moveend() {
      onViewportChange(map);
    },
    zoomend() {
      onViewportChange(map);
    },
  });

  useEffect(() => {
    mapRef.current = map;
    // Leaflet pode inicializar com tamanho incorreto se o container ainda não
    // está “definido” no layout (ex.: rota dentro de um scroll container).
    // Forçamos um invalidateSize para garantir render do TileLayer.
    const t = window.setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // ignore
      }
    }, 0);
    onViewportChange(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => window.clearTimeout(t);
  }, []);

  return null;
}

function DrawEvents({
  drawMode,
  rectStart,
  onAddVertex,
  onRectStart,
  onRectEnd,
  onCompleteRectangle,
}: {
  drawMode: 'none' | 'polygon' | 'rectangle';
  rectStart: LatLng | null;
  onAddVertex: (p: LatLng) => void;
  onRectStart: (p: LatLng | null) => void;
  onRectEnd: (p: LatLng | null) => void;
  onCompleteRectangle: (a: LatLng, b: LatLng) => void;
}) {
  const map = useMapEvents({
    click(e) {
      if (drawMode === 'polygon') {
        onAddVertex({ lat: e.latlng.lat, lng: e.latlng.lng });
      }

      if (drawMode === 'rectangle') {
        const p = { lat: e.latlng.lat, lng: e.latlng.lng };
        if (!rectStart) {
          onRectStart(p);
          onRectEnd(p);
          return;
        }
        onCompleteRectangle(rectStart, p);
      }
    },
    mousemove(e) {
      if (drawMode === 'rectangle' && rectStart) {
        onRectEnd({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });

  useEffect(() => {
    // evita concluir desenho com double click zoom
    if (drawMode !== 'none') {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
    }

    return () => {
      map.doubleClickZoom.enable();
    };
  }, [map, drawMode]);

  return null;
}


export function MediaMap() {
  const navigate = useNavigation();

  const mapRef = useRef<LeafletMap | null>(null);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);

  const [bboxStr, setBboxStr] = useState<string | undefined>(undefined);
  const [bboxArr, setBboxArr] = useState<BboxArr | null>(null);
  const [zoom, setZoom] = useState<number>(12);
  const [mapReady, setMapReady] = useState(false);

  // =====================
  // Filtros + busca (Etapa 2)
  // =====================
  const [filterType, setFilterType] = useState<MediaType | 'ALL'>('ALL');
  const [availability, setAvailability] = useState<MediaUnitAvailabilityStatus | ''>('');
  const [city, setCity] = useState('');
  const [stateUf, setStateUf] = useState('');
  const [district, setDistrict] = useState('');
  const [onlyMediaKit, setOnlyMediaKit] = useState(false);

  // =====================
  // Camadas (Etapa 3)
  // =====================
  const [layers, setLayers] = useState<MediaMapLayer[]>([]); // vazio => TODOS (default)


  // =====================
  // Seleção por área (Etapa 4)
  // =====================
  const [drawMode, setDrawMode] = useState<'none' | 'polygon' | 'rectangle'>('none');
  const [drawVertices, setDrawVertices] = useState<LatLng[]>([]);
  const [rectStart, setRectStart] = useState<LatLng | null>(null);
  const [rectEnd, setRectEnd] = useState<LatLng | null>(null);
  const [selectionPolygon, setSelectionPolygon] = useState<LatLng[] | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<MediaMapPoint[]>([]);

  // Busca (autocomplete)
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<MediaMapSuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<'details' | 'cluster' | 'selected'>('details');
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [clusterPoints, setClusterPoints] = useState<MediaMapPoint[]>([]);

  const [details, setDetails] = useState<MediaMapDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const effectiveLayers = layers.length ? layers : undefined;

  const { points, loading, error, refetch } = useMediaMapPoints({
    bbox: bboxStr,
    zoom,
    type: filterType === 'ALL' ? undefined : (filterType as MediaType),
    city,
    state: stateUf,
    district,
    showInMediaKit: onlyMediaKit ? true : undefined,
    availability: availability || undefined,
    layers: effectiveLayers,
  });

  const pointsForMap = selectionPolygon ? selectedPoints : points;

  const features = useMemo(() => {
    return pointsForMap
      .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
      .map((p) => ({
        type: 'Feature' as const,
        properties: {
          cluster: false,
          pointId: p.id,
          ...p,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [p.longitude, p.latitude] as [number, number],
        },
      }));
  }, [pointsForMap]);

  const clusterIndex = useMemo(() => {
    const idx = new Supercluster<any>({
      radius: 60,
      maxZoom: 20,
    });
    idx.load(features as any);
    return idx;
  }, [features]);

  const clusters = useMemo(() => {
    if (!bboxArr) return [] as any[];
    return clusterIndex.getClusters(bboxArr as any, Math.round(zoom)) as any[];
  }, [clusterIndex, bboxArr, zoom]);


  // Recalcula seleção quando polygon/retângulo existe e os pontos mudam
  useEffect(() => {
    if (!selectionPolygon || selectionPolygon.length < 3) {
      setSelectedPoints([]);
      return;
    }

    const poly = selectionPolygon;
    const sel = (points ?? []).filter((p) => {
      if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) return false;
      return pointInPolygon({ lat: p.latitude, lng: p.longitude }, poly);
    });

    setSelectedPoints(sel);
  }, [selectionPolygon, points]);

  // =====================
  // Autocomplete (Etapa 2/3)
  // =====================

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!suggestOpen) return;
      const el = searchBoxRef.current;
      if (el && e.target && !el.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [suggestOpen]);

  useEffect(() => {
    const q = String(search || '').trim();
    setSuggestError(null);

    if (q.length < 2) {
      suggestAbortRef.current?.abort();
      setSuggestLoading(false);
      setSuggestions([]);
      return;
    }

    const t = window.setTimeout(async () => {
      try {
        suggestAbortRef.current?.abort();
        const controller = new AbortController();
        suggestAbortRef.current = controller;
        setSuggestLoading(true);

        const data = await fetchMediaMapSuggestions(
          {
            q,
            limit: 10,
            bbox: bboxStr,
            type: filterType === 'ALL' ? undefined : (filterType as any),
            city,
            state: stateUf,
            district,
            showInMediaKit: onlyMediaKit ? true : undefined,
            layers: effectiveLayers,
          },
          controller.signal
        );

        setSuggestions(data || []);
        setSuggestOpen(true);
      } catch (e: any) {
        const msg = String(e?.message ?? '');
        if (msg.includes('canceled') || msg.includes('abort')) return;
        setSuggestError('Erro ao buscar sugestões');
      } finally {
        setSuggestLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [search, bboxStr, filterType, city, stateUf, district, onlyMediaKit, effectiveLayers]);

  // =====================
  // Viewport updates
  // =====================

  const handleViewportChange = (map: LeafletMap) => {
    const { bboxStr: bb, bboxArr: arr, zoom: z } = getBboxFromMap(map);
    setBboxStr(bb);
    setBboxArr(arr);
    setZoom(z);
    setMapReady(true);
  };

  const startDrawing = (mode: 'polygon' | 'rectangle') => {
    setDrawMode(mode);
    setDrawVertices([]);
    setRectStart(null);
    setRectEnd(null);
    setSelectionPolygon(null);
    setSelectedPoints([]);
    toast.message(mode === 'polygon' ? 'Modo desenho: polígono' : 'Modo desenho: retângulo');
  };

  const cancelDrawing = () => {
    setDrawMode('none');
    setDrawVertices([]);
    setRectStart(null);
    setRectEnd(null);
  };

  const clearSelection = () => {
    cancelDrawing();
    setSelectionPolygon(null);
    setSelectedPoints([]);
  };

  const finishPolygon = () => {
    if (drawVertices.length < 3) {
      toast.error('Adicione pelo menos 3 pontos para formar um polígono');
      return;
    }

    const poly = [...drawVertices];
    setSelectionPolygon(poly);
    setDrawMode('none');
    setDrawVertices([]);

    const bounds = boundsFromPolygon(poly).pad(0.05);
    mapRef.current?.fitBounds(bounds as any, { animate: true } as any);

    // abre lista automaticamente se tiver muitos pontos
    setPanelMode('selected');
    setPanelOpen(true);
  };

  const completeRectangle = (a: LatLng, b: LatLng) => {
    const poly = rectToPolygon(a, b);
    setSelectionPolygon(poly);
    setDrawMode('none');
    setRectStart(null);
    setRectEnd(null);

    const bounds = boundsFromPolygon(poly).pad(0.05);
    mapRef.current?.fitBounds(bounds as any, { animate: true } as any);

    setPanelMode('selected');
    setPanelOpen(true);
  };

  const handleCreateProposalFromSelection = () => {
    const ids = (selectedPoints ?? []).map((p) => p.id).filter(Boolean);
    if (!ids.length) {
      toast.error('Nenhum ponto selecionado');
      return;
    }

    try {
      sessionStorage.setItem(MEDIA_MAP_SELECTION_STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // ignore
    }

    navigate('/app/proposals?new=1');
    setPanelOpen(false);
  };

  // ESC cancela desenho
  useEffect(() => {
    if (drawMode === 'none') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelDrawing();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawMode]);

  // =====================
  // Ações
  // =====================

  const openPointDetails = async (pointId: string, opts?: { center?: boolean }) => {
    setSelectedPointId(pointId);
    setPanelMode('details');
    setPanelOpen(true);
    setDetails(null);
    setDetailsError(null);
    setDetailsLoading(true);
    try {
      const d = await fetchMediaMapDetails(pointId);
      setDetails(d);
      if (opts?.center !== false && d?.point?.latitude && d?.point?.longitude) {
        const lat = Number((d.point as any).latitude);
        const lng = Number((d.point as any).longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          mapRef.current?.setView([lat, lng], Math.max(16, mapRef.current?.getZoom?.() ?? 16), { animate: true } as any);
        }
      }
    } catch (e) {
      setDetailsError('Erro ao carregar detalhes do ponto');
    } finally {
      setDetailsLoading(false);
    }
  };

  const openClusterList = (clusterId: number, clusterCount: number) => {
    if (!bboxArr) return;
    // supercluster usa "id" para pegar leaves
    const leaves = clusterIndex.getLeaves(clusterId, clusterCount);
    const pts: MediaMapPoint[] = leaves
      .map((l: any) => l?.properties as MediaMapPoint)
      .filter(Boolean);
    setClusterPoints(pts);
    setPanelMode('cluster');
    setPanelOpen(true);
  };

  const handleSelectSuggestion = (s: MediaMapSuggestion) => {
    setSearch(s.name);
    setSuggestOpen(false);
    if (mapRef.current) {
      mapRef.current.setView([s.latitude, s.longitude], Math.max(16, mapRef.current.getZoom() || 16), { animate: true } as any);
    }
    void openPointDetails(s.id, { center: false });
  };

  const handleToggleFavorite = async () => {
    if (!details?.point?.id) return;
    const pointId = details.point.id;
    const next = !Boolean((details.point as any).isFavorite);

    // otimista
    setDetails((prev) => (prev ? { ...prev, point: { ...prev.point, isFavorite: next } as any } : prev));

    try {
      await setMediaPointFavorite(pointId, next);
      invalidateMediaMapCaches();
      void refetch(true);
      toast.success(next ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
    } catch {
      // rollback
      setDetails((prev) => (prev ? { ...prev, point: { ...prev.point, isFavorite: !next } as any } : prev));
      toast.error('Não foi possível atualizar favorito');
    }
  };

  const handleCopyLink = async () => {
    if (!details?.point?.id) return;
    const url = `${window.location.origin}/app/mediamap?pointId=${details.point.id}`;
    const ok = await copyText(url);
    toast[ok ? 'success' : 'error'](ok ? 'Link copiado!' : 'Não foi possível copiar o link');
  };

  const handleCopyCoords = async () => {
    if (!details?.point) return;
    const lat = (details.point as any).latitude;
    const lng = (details.point as any).longitude;
    const ok = await copyText(`${lat},${lng}`);
    toast[ok ? 'success' : 'error'](ok ? 'Coordenadas copiadas!' : 'Não foi possível copiar');
  };

  const handleOpenInventory = () => {
    if (!details?.point?.id) return;
    navigate(`/app/inventory?pointId=${details.point.id}`);
    setPanelOpen(false);
  };

  const handleCreateProposal = () => {
    if (!details?.point?.id) return;
    navigate(`/app/proposals?new=1&mediaPointId=${details.point.id}`);
    setPanelOpen(false);
  };

  // Deep-link: /app/mediamap?pointId=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pointId = params.get('pointId');
    if (!pointId) return;
    if (!mapReady || !mapRef.current) return;

    void openPointDetails(pointId, { center: true });

    // limpa para não reabrir ao fechar (sem mexer na navegação do app)
    params.delete('pointId');
    const next = params.toString();
    const url = `${window.location.pathname}${next ? `?${next}` : ''}`;
    window.history.replaceState({}, '', url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  // =====================
  // Render
  // =====================

  return (
    // IMPORTANT: Evitar classes Tailwind com valores arbitrários aqui.
    // Seu build de CSS atual não está gerando essas classes, o que faz o mapa
    // ficar com altura 0 (e o Leaflet não renderiza).
    <div
      className="relative h-full w-full"
      // Garante que o mapa tenha altura “definida” mesmo quando o container pai
      // resolve height:100% de forma imprevisível (flex + overflow-y-auto).
      style={{ minHeight: 'calc(100vh - 64px)' }}
    >
      {/* Barra superior */}
      <div className="absolute z-[900] top-4 left-4 right-4 flex flex-col gap-3 max-w-[720px]">
        <div className="bg-white border rounded-xl shadow-sm p-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1" ref={searchBoxRef}>
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSuggestOpen(true)}
                  placeholder="Buscar ponto, endereço, cidade..."
                  className="flex-1 outline-none text-sm"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setSuggestions([]);
                      setSuggestOpen(false);
                    }}
                    className="p-1 rounded hover:bg-gray-100"
                    aria-label="Limpar"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                ) : null}
              </div>

              {suggestOpen && (suggestLoading || suggestions.length > 0 || suggestError) && (
                <div className="absolute mt-2 w-full bg-white border rounded-lg shadow-lg overflow-hidden">
                  <div className="max-h-[280px] overflow-auto">
                    {suggestLoading ? (
                      <div className="px-3 py-2 text-sm text-gray-600">Buscando...</div>
                    ) : null}
                    {suggestError ? (
                      <div className="px-3 py-2 text-sm text-red-600">{suggestError}</div>
                    ) : null}
                    {!suggestLoading && !suggestError && suggestions.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-600">Nenhum resultado</div>
                    ) : null}
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-start gap-2"
                        onClick={() => handleSelectSuggestion(s)}
                      >
                        <MapPin className="w-4 h-4 text-indigo-600 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-sm text-gray-900 truncate">{s.name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {[s.addressDistrict, s.addressCity, s.addressState].filter(Boolean).join(' • ')}
                          </div>
                        </div>
                        {s.isFavorite ? (
                          <Star className="w-4 h-4 text-amber-500 ml-auto mt-0.5" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Camadas */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={layers.length === 0 ? 'default' : 'outline'}
              size="sm"
              className={cn('h-8', layers.length === 0 ? 'bg-[#4F46E5] hover:opacity-95' : '')}
              onClick={() => setLayers([])}
            >
              Todos
            </Button>

            <ToggleGroup
              type="multiple"
              value={layers}
              onValueChange={(v: any) => setLayers((v ?? []) as MediaMapLayer[])}
              variant="outline"
              size="sm"
              className="h-8"
            >
              <ToggleGroupItem value="mine" aria-label="Meus">
                Meus
              </ToggleGroupItem>
              <ToggleGroupItem value="favorites" aria-label="Favoritos">
                Favoritos
              </ToggleGroupItem>
              <ToggleGroupItem value="campaign" aria-label="Em campanha">
                Em campanha
              </ToggleGroupItem>
              <ToggleGroupItem value="proposal" aria-label="Em proposta">
                Em proposta
              </ToggleGroupItem>
            </ToggleGroup>
          </div>



          {/* Seleção por área (Etapa 4) */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={drawMode === 'polygon' ? 'default' : 'outline'}
              size="sm"
              className={cn('h-8', drawMode === 'polygon' ? 'bg-[#4F46E5] hover:opacity-95' : '')}
              onClick={() => startDrawing('polygon')}
            >
              <Pencil className="w-4 h-4 mr-2" /> Polígono
            </Button>

            <Button
              type="button"
              variant={drawMode === 'rectangle' ? 'default' : 'outline'}
              size="sm"
              className={cn('h-8', drawMode === 'rectangle' ? 'bg-[#4F46E5] hover:opacity-95' : '')}
              onClick={() => startDrawing('rectangle')}
            >
              <Square className="w-4 h-4 mr-2" /> Retângulo
            </Button>

            {drawMode === 'polygon' ? (
              <Button
                type="button"
                size="sm"
                className="h-8 gap-2 bg-[#4F46E5] hover:opacity-95"
                disabled={drawVertices.length < 3}
                onClick={finishPolygon}
              >
                <Check className="w-4 h-4" /> Concluir
              </Button>
            ) : null}

            {drawMode !== 'none' ? (
              <Button type="button" variant="ghost" size="sm" className="h-8" onClick={cancelDrawing}>
                <X className="w-4 h-4 mr-2" /> Cancelar
              </Button>
            ) : selectionPolygon ? (
              <Button type="button" variant="ghost" size="sm" className="h-8" onClick={clearSelection}>
                <Trash2 className="w-4 h-4 mr-2" /> Limpar seleção
              </Button>
            ) : null}

            {selectionPolygon ? (
              <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-200">
                {selectedPoints.length} selecionado(s)
              </Badge>
            ) : null}

            {drawMode !== 'none' ? (
              <span className="text-xs text-gray-600">
                {drawMode === 'polygon'
                  ? 'Clique no mapa para adicionar pontos. Conclua para finalizar.'
                  : rectStart
                    ? 'Clique novamente para finalizar o retângulo.'
                    : 'Clique para marcar o 1º canto do retângulo.'}
              </span>
            ) : null}
          </div>
          {/* Filtros compactos */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={filterType}
              onChange={(e) => setFilterType((e.target.value as any) || 'ALL')}
            >
              <option value="ALL">Tipo: todos</option>
              <option value="OOH">OOH</option>
              <option value="DOOH">DOOH</option>
            </select>

            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={availability}
              onChange={(e) => setAvailability((e.target.value as any) || '')}
            >
              <option value="">Disponibilidade: todas</option>
              <option value="LIVRE">Somente livres</option>
              <option value="OCUPADA">Somente ocupadas</option>
              <option value="EM_NEGOCIACAO">Somente em negociação</option>
            </select>

            <input
              className="border rounded-lg px-3 py-2 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Cidade"
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              value={stateUf}
              onChange={(e) => setStateUf(e.target.value)}
              placeholder="UF"
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm sm:col-span-2"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="Bairro"
            />

            <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={onlyMediaKit}
                onChange={(e) => setOnlyMediaKit(e.target.checked)}
              />
              Somente no Mídia Kit
            </label>
          </div>

          {/* Legenda */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="bg-green-100 text-green-700 border border-green-200">Livre</Badge>
            <Badge className="bg-amber-100 text-amber-700 border border-amber-200">Misto</Badge>
            <Badge className="bg-red-100 text-red-700 border border-red-200">Ocupado</Badge>
            <Badge className="bg-purple-100 text-purple-700 border border-purple-200">Negociação</Badge>
          </div>
        </div>
      </div>

      {/* Mapa */}
      <MapContainer
        center={[-23.55052, -46.633308]}
        zoom={12}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEvents mapRef={mapRef} onViewportChange={handleViewportChange} />


        <DrawEvents
          drawMode={drawMode}
          rectStart={rectStart}
          onAddVertex={(p) => setDrawVertices((prev) => [...prev, p])}
          onRectStart={setRectStart}
          onRectEnd={setRectEnd}
          onCompleteRectangle={completeRectangle}
        />

        {/* Overlays de desenho/seleção */}
        {selectionPolygon && selectionPolygon.length >= 3 ? (
          <Polygon
            positions={selectionPolygon.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: '#4F46E5', weight: 2, fillOpacity: 0.12 }}
          />
        ) : null}

        {drawMode === 'polygon' && drawVertices.length ? (
          <>
            <Polyline
              positions={drawVertices.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: '#4F46E5', weight: 2, dashArray: '4 6' }}
            />
            {drawVertices.length >= 3 ? (
              <Polygon
                positions={drawVertices.map((p) => [p.lat, p.lng] as [number, number])}
                pathOptions={{ color: '#4F46E5', weight: 2, fillOpacity: 0.08, dashArray: '4 6' }}
              />
            ) : null}
          </>
        ) : null}

        {drawMode === 'rectangle' && rectStart && rectEnd ? (
          <Rectangle
            bounds={[
              [Math.min(rectStart.lat, rectEnd.lat), Math.min(rectStart.lng, rectEnd.lng)],
              [Math.max(rectStart.lat, rectEnd.lat), Math.max(rectStart.lng, rectEnd.lng)],
            ]}
            pathOptions={{ color: '#4F46E5', weight: 2, fillOpacity: 0.08, dashArray: '4 6' }}
          />
        ) : null}

        {clusters.map((c: any) => {
          const [lng, lat] = c.geometry.coordinates;
          const isCluster = c.properties.cluster;

          if (isCluster) {
            const count = c.properties.point_count as number;
            const clusterId = c.id as number;
            return (
              <Marker
                key={`cluster-${clusterId}`}
                position={[lat, lng]}
                icon={buildClusterIcon(count)}
                eventHandlers={{
                  click: () => {
                    openClusterList(clusterId, count);
                    // opção UX: aproximar no cluster
                    const expansionZoom = Math.min(clusterIndex.getClusterExpansionZoom(clusterId), 20);
                    mapRef.current?.setView([lat, lng], expansionZoom, { animate: true } as any);
                  },
                }}
              />
            );
          }

          const p = c.properties as MediaMapPoint;
          return (
            <Marker
              key={`p-${p.id}`}
              position={[p.latitude, p.longitude]}
              icon={buildPointIcon(p)}
              eventHandlers={{
                click: () => void openPointDetails(p.id, { center: false }),
              }}
            />
          );
        })}
      </MapContainer>

      {/* Loading/errors */}
      {loading ? (
        <div className="absolute bottom-4 left-4 bg-white border rounded-lg shadow px-3 py-2 text-sm text-gray-700">
          Carregando pontos...
        </div>
      ) : null}
      {!loading && error ? (
        <div className="absolute bottom-4 left-4 bg-white border border-red-200 rounded-lg shadow px-3 py-2 text-sm text-red-700">
          Erro ao carregar pontos.
        </div>
      ) : null}



      {/* Barra de seleção (Etapa 4) */}
      {selectionPolygon ? (
        <div className="absolute z-[900] bottom-4 left-4 right-4 sm:right-auto sm:w-[520px] bg-white border rounded-xl shadow-sm p-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="text-sm text-gray-800">
              <span className="font-medium">{selectedPoints.length}</span> ponto(s) selecionado(s) na área
            </div>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setPanelMode('selected');
                  setPanelOpen(true);
                }}
              >
                <List className="w-4 h-4" /> Ver lista
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-2 bg-[#4F46E5] hover:opacity-95"
                disabled={selectedPoints.length === 0}
                onClick={handleCreateProposalFromSelection}
              >
                <Plus className="w-4 h-4" /> Criar proposta
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                <Trash2 className="w-4 h-4 mr-2" /> Limpar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {/* Painel lateral */}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen} modal={false}>
        <SheetContent hideOverlay side="right" className="w-[420px] sm:w-[460px]">
          <SheetHeader>
            <SheetTitle>{panelMode === 'details' ? 'Detalhes do ponto' : panelMode === 'cluster' ? 'Pontos do cluster' : 'Selecionados'}</SheetTitle>
            <SheetDescription>
              {panelMode === 'details'
                ? 'Disponibilidade por face e ações rápidas.'
                : panelMode === 'cluster'
                  ? `${clusterPoints.length} ponto(s) neste agrupamento.`
                  : `${selectedPoints.length} ponto(s) selecionado(s) na área.`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4">
            {panelMode === 'cluster' ? (
              <ScrollArea className="h-[calc(100vh-160px)] pr-3">
                <div className="space-y-2">
                  {clusterPoints.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={cn(
                        'w-full text-left border rounded-lg p-3 hover:bg-gray-50',
                        selectedPointId === p.id && 'border-indigo-300'
                      )}
                      onClick={() => void openPointDetails(p.id)}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 truncate">{p.name}</div>
                          <div className="text-xs text-gray-600 truncate">
                            {[p.addressDistrict, p.addressCity, p.addressState].filter(Boolean).join(' • ')}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {humanStatus(p)} • {p.facesFreeCount}/{p.facesTotal} livres
                          </div>
                        </div>
                        {p.isFavorite ? <Star className="w-4 h-4 text-amber-500 mt-0.5" /> : null}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : panelMode === 'selected' ? (
              <ScrollArea className="h-[calc(100vh-200px)] pr-3">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2 bg-[#4F46E5] hover:opacity-95"
                    disabled={selectedPoints.length === 0}
                    onClick={handleCreateProposalFromSelection}
                  >
                    <Plus className="w-4 h-4" /> Criar proposta
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={clearSelection} className="gap-2">
                    <Trash2 className="w-4 h-4" /> Limpar seleção
                  </Button>
                </div>

                <div className="space-y-2">
                  {selectedPoints.length === 0 ? (
                    <div className="text-sm text-gray-600">Nenhum ponto dentro da área desenhada.</div>
                  ) : null}

                  {selectedPoints.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={cn('w-full text-left border rounded-lg p-3 hover:bg-gray-50')}
                      onClick={() => void openPointDetails(p.id)}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 truncate">{p.name}</div>
                          <div className="text-xs text-gray-600 truncate">
                            {[p.addressDistrict, p.addressCity, p.addressState].filter(Boolean).join(' • ')}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {humanStatus(p)} • {p.facesFreeCount}/{p.facesTotal} livres
                          </div>
                        </div>
                        {p.isFavorite ? <Star className="w-4 h-4 text-amber-500 mt-0.5" /> : null}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <>
                {detailsLoading ? (
                  <div className="text-sm text-gray-600">Carregando detalhes...</div>
                ) : null}
                {detailsError ? (
                  <div className="text-sm text-red-700">{detailsError}</div>
                ) : null}
                {!detailsLoading && !detailsError && details ? (
                  <>
                    <div className="border rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-gray-900 font-medium truncate">{details.point.name}</div>
                            {(details.point as any).isFavorite ? (
                              <Badge className="bg-amber-100 text-amber-800 border border-amber-200">Favorito</Badge>
                            ) : null}
                            {(details.point as any).isMine ? (
                              <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-200">Meu</Badge>
                            ) : null}
                            {(details.point as any).isInCampaign ? (
                              <Badge className="bg-red-100 text-red-800 border border-red-200">Em campanha</Badge>
                            ) : null}
                            {(details.point as any).isInProposal ? (
                              <Badge className="bg-purple-100 text-purple-800 border border-purple-200">Em proposta</Badge>
                            ) : null}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {[
                              (details.point as any).addressStreet,
                              (details.point as any).addressNumber,
                              (details.point as any).addressDistrict,
                              (details.point as any).addressCity,
                              (details.point as any).addressState,
                            ]
                              .filter(Boolean)
                              .join(', ')}
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            {humanStatus(details)} • {details.facesFreeCount}/{details.facesTotal} livres • {details.facesNegotiationCount} em negociação • {details.facesOccupiedCount} ocupadas
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" size="sm" className="gap-2 bg-[#4F46E5] hover:opacity-95" onClick={handleCreateProposal}>
                          <Plus className="w-4 h-4" /> Criar proposta
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="gap-2" onClick={handleOpenInventory}>
                          <ExternalLink className="w-4 h-4" /> Abrir no inventário
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="gap-2" onClick={handleToggleFavorite}>
                          <Star className="w-4 h-4" /> {(details.point as any).isFavorite ? 'Desfavoritar' : 'Favoritar'}
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="gap-2" onClick={handleCopyLink}>
                          <Copy className="w-4 h-4" /> Copiar link
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="gap-2" onClick={handleCopyCoords}>
                          <Copy className="w-4 h-4" /> Copiar coords
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-sm text-gray-900 font-medium mb-2">Faces</div>
                      <ScrollArea className="h-[calc(100vh-420px)] pr-3">
                        <div className="grid grid-cols-2 gap-2">
                          {details.faces.map((f) => {
                            const st = f.status;
                            const color =
                              st === 'LIVRE'
                                ? 'border-green-200 bg-green-50 text-green-700'
                                : st === 'OCUPADA'
                                  ? 'border-red-200 bg-red-50 text-red-700'
                                  : 'border-purple-200 bg-purple-50 text-purple-700';
                            return (
                              <div key={f.id} className={cn('border rounded-lg p-2 text-xs', color)}>
                                <div className="font-medium text-gray-900">{f.label}</div>
                                <div className="mt-1">{st === 'LIVRE' ? 'Livre' : st === 'OCUPADA' ? 'Ocupada' : 'Em negociação'}</div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  </>
                ) : null}
              </>

            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
