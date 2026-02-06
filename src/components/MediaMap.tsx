import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';

import 'leaflet/dist/leaflet.css';

import { Badge } from './ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { cn } from './ui/utils';

import type {
  MediaMapDetails,
  MediaMapPoint,
  MediaMapSuggestion,
  MediaType,
  MediaUnitAvailabilityStatus,
} from '../types';
import { fetchMediaMapDetails, fetchMediaMapSuggestions, useMediaMapPoints } from '../hooks/useMediaMap';

type BboxArr = [number, number, number, number];

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
  return L.divIcon({
    html: `
      <div style="
        width:14px;
        height:14px;
        border-radius:999px;
        background:${bg};
        border:2px solid rgba(255,255,255,0.95);
        box-shadow:0 6px 18px rgba(0,0,0,0.18);
      "></div>
    `,
    className: 'one-media-point-icon',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function statusBadgeVariant(status: MediaUnitAvailabilityStatus) {
  if (status === 'OCUPADA') return { variant: 'destructive' as const, label: 'Ocupada' };
  if (status === 'EM_NEGOCIACAO') return { variant: 'secondary' as const, label: 'Negociação' };
  return { variant: 'outline' as const, label: 'Livre' };
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-600">
      <span
        style={{ width: 10, height: 10, borderRadius: 999, background: color, border: '2px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 14px rgba(0,0,0,0.16)' }}
      />
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
}

function MapEvents({ onViewportChange, mapRef }: { onViewportChange: (map: LeafletMap) => void; mapRef: MutableRefObject<LeafletMap | null> }) {
  const map = useMapEvents({
    moveend: () => onViewportChange(map),
    zoomend: () => onViewportChange(map),
  });

  useEffect(() => {
    mapRef.current = map;
    onViewportChange(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export function MediaMap() {
  const mapRef = useRef<LeafletMap | null>(null);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);

  const [bboxStr, setBboxStr] = useState<string | undefined>(undefined);
  const [bboxArr, setBboxArr] = useState<BboxArr | null>(null);
  const [zoom, setZoom] = useState<number>(12);

  // =====================
  // Filtros + busca (Etapa 2)
  // =====================
  const [filterType, setFilterType] = useState<MediaType | 'ALL'>('ALL');
  const [availability, setAvailability] = useState<MediaUnitAvailabilityStatus | ''>('');
  const [city, setCity] = useState('');
  const [stateUf, setStateUf] = useState('');
  const [district, setDistrict] = useState('');
  const [onlyMediaKit, setOnlyMediaKit] = useState(false);

  // Busca (autocomplete)
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<MediaMapSuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<'details' | 'cluster'>('details');
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [clusterPoints, setClusterPoints] = useState<MediaMapPoint[]>([]);

  const [details, setDetails] = useState<MediaMapDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const { points, loading, error } = useMediaMapPoints({
    bbox: bboxStr,
    zoom,
    type: filterType === 'ALL' ? undefined : (filterType as MediaType),
    city,
    state: stateUf,
    district,
    showInMediaKit: onlyMediaKit ? true : undefined,
    availability: availability || undefined,
  });

  const features = useMemo(() => {
    return points
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
  }, [points]);

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

  // =====================
  // Autocomplete (Etapa 2)
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
            limit: 8,
            type: filterType === 'ALL' ? undefined : (filterType as MediaType),
            showInMediaKit: onlyMediaKit ? true : undefined,
          },
          controller.signal
        );

        if (controller.signal.aborted) return;
        setSuggestions(data);
        setSuggestOpen(true);
      } catch (err: any) {
        const msg = String(err?.message ?? '');
        if (msg.includes('canceled') || msg.includes('abort')) return;
        setSuggestError('Falha ao buscar pontos');
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [search, filterType, onlyMediaKit]);

  const onViewportChange = (map: LeafletMap) => {
    const { bboxStr: nextStr, bboxArr: nextArr, zoom: nextZoom } = getBboxFromMap(map);
    setBboxStr(nextStr);
    setBboxArr(nextArr);
    setZoom(nextZoom);
  };

  const openPointDetails = async (id: string) => {
    try {
      setPanelOpen(true);
      setPanelMode('details');
      setSelectedPointId(id);
      setDetails(null);
      setDetailsError(null);
      setDetailsLoading(true);
      const data = await fetchMediaMapDetails(id);
      setDetails(data);
    } catch (e: any) {
      setDetailsError(e?.response?.data?.message ?? 'Não foi possível carregar os detalhes do ponto');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSuggestionSelect = (s: MediaMapSuggestion) => {
    setSuggestOpen(false);
    setSearch(s.name ?? '');

    const lat = s.latitude;
    const lng = s.longitude;
    const map = mapRef.current;
    if (map && typeof lat === 'number' && typeof lng === 'number') {
      const nextZoom = Math.max(map.getZoom(), 17);
      map.setView([lat, lng], nextZoom, { animate: true } as any);
    }

    // abre painel de detalhes
    void openPointDetails(s.id);
  };

  const clearFilters = () => {
    setFilterType('ALL');
    setAvailability('');
    setCity('');
    setStateUf('');
    setDistrict('');
    setOnlyMediaKit(false);
  };

  const openClusterList = (clusterId: number) => {
    const leaves = clusterIndex.getLeaves(clusterId, 1000) as any[];
    const pts = (leaves ?? []).map((l) => l.properties as MediaMapPoint);
    pts.sort((a, b) => String(a.name).localeCompare(String(b.name)));

    setClusterPoints(pts);
    setPanelMode('cluster');
    setPanelOpen(true);
    setSelectedPointId(null);
    setDetails(null);
    setDetailsError(null);

    // opcional: encaixa cluster na tela (melhora UX sem ser obrigatório)
    const map = mapRef.current;
    if (map && pts.length > 1) {
      const latLngs = pts.map((p) => L.latLng(p.latitude, p.longitude));
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds.pad(0.2));
    }
  };

  const initialCenter: [number, number] = useMemo(() => {
    // São Paulo como fallback
    return [-23.5505, -46.6333];
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-4 border-b border-gray-200 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg text-gray-900">Mídia Map</h2>
            <p className="text-sm text-gray-600">
              Visualize todos os pontos do inventário no mapa. Aproximar/afastar agrupa automaticamente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loading && <span className="text-xs text-gray-500">Carregando pontos…</span>}
            {error && <span className="text-xs text-red-600">Erro ao carregar pontos</span>}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-end flex-wrap gap-2">
            <div ref={searchBoxRef} className="relative w-full sm:w-[360px]">
              <label className="block text-xs text-gray-600 mb-1">Buscar ponto</label>
              <input
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Nome, rua, cidade…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSuggestOpen(true);
                }}
                onFocus={() => {
                  if (suggestions.length) setSuggestOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && suggestions.length) {
                    e.preventDefault();
                    handleSuggestionSelect(suggestions[0]);
                  }
                }}
              />

              {suggestOpen && (suggestions.length > 0 || suggestLoading || suggestError) && (
                <div className="absolute z-[1000] mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                  <div className="max-h-72 overflow-auto">
                    {suggestLoading && <div className="px-3 py-2 text-xs text-gray-500">Buscando…</div>}
                    {suggestError && <div className="px-3 py-2 text-xs text-red-600">{suggestError}</div>}
                    {!suggestLoading && !suggestError && suggestions.length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-500">Nenhum resultado</div>
                    )}
                    {suggestions.map((s) => {
                      const addr = [
                        s.addressStreet ? `${s.addressStreet}${s.addressNumber ? `, ${s.addressNumber}` : ''}` : '',
                        s.addressDistrict || '',
                        s.addressCity || '',
                      ]
                        .filter(Boolean)
                        .join(' • ');

                      return (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-gray-50"
                          onClick={() => handleSuggestionSelect(s)}
                        >
                          <div className="text-sm text-gray-900">{s.name}</div>
                          <div className="text-xs text-gray-600">
                            {addr}{s.addressState ? `/${s.addressState}` : ''}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="w-full sm:w-auto">
              <label className="block text-xs text-gray-600 mb-1">Tipo</label>
              <select
                className="h-10 w-full sm:w-[140px] rounded-md border border-gray-300 px-3 text-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <option value="ALL">Todos</option>
                <option value="OOH">OOH</option>
                <option value="DOOH">DOOH</option>
              </select>
            </div>

            <div className="w-full sm:w-auto">
              <label className="block text-xs text-gray-600 mb-1">Disponibilidade</label>
              <select
                className="h-10 w-full sm:w-[190px] rounded-md border border-gray-300 px-3 text-sm"
                value={availability}
                onChange={(e) => setAvailability(e.target.value as any)}
              >
                <option value="">Todos</option>
                <option value="LIVRE">Com face livre</option>
                <option value="EM_NEGOCIACAO">Em negociação</option>
                <option value="OCUPADA">Somente ocupadas</option>
              </select>
            </div>

            <div className="w-full sm:w-auto">
              <label className="block text-xs text-gray-600 mb-1">Cidade</label>
              <input
                className="h-10 w-full sm:w-[180px] rounded-md border border-gray-300 px-3 text-sm"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-auto">
              <label className="block text-xs text-gray-600 mb-1">UF</label>
              <input
                className="h-10 w-full sm:w-[72px] rounded-md border border-gray-300 px-3 text-sm uppercase"
                value={stateUf}
                onChange={(e) => setStateUf(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-auto">
              <label className="block text-xs text-gray-600 mb-1">Bairro</label>
              <input
                className="h-10 w-full sm:w-[180px] rounded-md border border-gray-300 px-3 text-sm"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
            </div>

            <div className="flex h-10 items-center gap-2 rounded-md border border-gray-300 px-3">
              <input
                type="checkbox"
                checked={onlyMediaKit}
                onChange={(e) => setOnlyMediaKit(e.target.checked)}
              />
              <span className="text-sm text-gray-700 whitespace-nowrap">Somente no Media Kit</span>
            </div>

            <button
              type="button"
              className="h-10 rounded-md border border-gray-300 px-3 text-sm hover:bg-gray-50"
              onClick={clearFilters}
            >
              Limpar
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <LegendItem color="#22c55e" label="Livre" />
            <LegendItem color="#a855f7" label="Negociação" />
            <LegendItem color="#f59e0b" label="Ocupação parcial" />
            <LegendItem color="#ef4444" label="Ocupado" />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[520px]">
        <MapContainer
          center={initialCenter}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapEvents onViewportChange={onViewportChange} mapRef={mapRef} />

          {clusters.map((feature) => {
            const [lng, lat] = feature.geometry.coordinates as [number, number];

            const isCluster = !!feature.properties.cluster;
            if (isCluster) {
              const clusterId = feature.properties.cluster_id as number;
              const pointCount = feature.properties.point_count as number;

              return (
                <Marker
                  key={`cluster-${clusterId}`}
                  position={[lat, lng]}
                  icon={buildClusterIcon(pointCount)}
                  eventHandlers={{
                    click: () => openClusterList(clusterId),
                  }}
                />
              );
            }

            const pointId = feature.properties.pointId as string;
            const p = feature.properties as MediaMapPoint;

            return (
              <Marker
                key={`point-${pointId}`}
                position={[lat, lng]}
                icon={buildPointIcon(p)}
                eventHandlers={{
                  click: () => openPointDetails(pointId),
                }}
              />
            );
          })}
        </MapContainer>
      </div>

      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent className="sm:max-w-lg">
          {panelMode === 'details' ? (
            <>
              <SheetHeader>
                <SheetTitle>{details?.point?.name ?? 'Detalhes do ponto'}</SheetTitle>
                <SheetDescription>
                  {details?.point?.addressCity ? (
                    <span>
                      {details.point.addressCity}
                      {details.point.addressState ? `/${details.point.addressState}` : ''}
                    </span>
                  ) : (
                    <span>Selecione um ponto no mapa</span>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="px-4 pb-4">
                {detailsLoading && <div className="text-sm text-gray-600">Carregando…</div>}
                {detailsError && <div className="text-sm text-red-600">{detailsError}</div>}

                {details && !detailsLoading && (
                  <>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline" className="border-gray-200 text-gray-700">
                        {details.facesTotal} face(s)
                      </Badge>
                      <Badge variant="outline" className="border-green-200 text-green-700">
                        {details.facesFreeCount} livre(s)
                      </Badge>
                      <Badge variant="outline" className="border-purple-200 text-purple-700">
                        {details.facesNegotiationCount} em negociação
                      </Badge>
                      <Badge variant="outline" className="border-red-200 text-red-700">
                        {details.facesOccupiedCount} ocupada(s)
                      </Badge>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 border-b text-sm text-gray-700">
                        Faces
                      </div>
                      <ScrollArea className="h-[50vh]">
                        <div className="divide-y">
                          {details.faces.map((f) => {
                            const badge = statusBadgeVariant(f.status);
                            return (
                              <div key={f.id} className="px-3 py-2 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm text-gray-900 truncate">{f.label}</div>
                                  <div className="text-xs text-gray-500">
                                    {String(f.unitType) === 'FACE' ? 'Face' : 'Tela'}
                                  </div>
                                </div>
                                <Badge
                                  variant={badge.variant}
                                  className={cn(
                                    badge.variant === 'secondary' && 'bg-purple-100 text-purple-700 border-purple-200',
                                    badge.variant === 'outline' && 'bg-green-50 text-green-700 border-green-200'
                                  )}
                                >
                                  {badge.label}
                                </Badge>
                              </div>
                            );
                          })}

                          {details.faces.length === 0 && (
                            <div className="px-3 py-3 text-sm text-gray-600">Nenhuma face ativa encontrada.</div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </>
                )}

                {!details && !detailsLoading && !detailsError && (
                  <div className="text-sm text-gray-600">Clique em um pin para ver os detalhes.</div>
                )}
              </div>
            </>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>Pontos neste agrupamento</SheetTitle>
                <SheetDescription>
                  {clusterPoints.length} ponto(s). Clique em um item para abrir detalhes.
                </SheetDescription>
              </SheetHeader>

              <div className="px-4 pb-4">
                <div className="border rounded-lg overflow-hidden">
                  <ScrollArea className="h-[70vh]">
                    <div className="divide-y">
                      {clusterPoints.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => openPointDetails(p.id)}
                          className="w-full text-left px-3 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm text-gray-900 truncate">{p.name}</div>
                              <div className="text-xs text-gray-500">
                                {p.addressCity ? `${p.addressCity}${p.addressState ? `/${p.addressState}` : ''}` : '—'}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1 justify-end">
                              <Badge variant="outline" className="border-green-200 text-green-700">
                                {p.facesFreeCount} L
                              </Badge>
                              <Badge variant="outline" className="border-purple-200 text-purple-700">
                                {p.facesNegotiationCount} N
                              </Badge>
                              <Badge variant="outline" className="border-red-200 text-red-700">
                                {p.facesOccupiedCount} O
                              </Badge>
                            </div>
                          </div>
                        </button>
                      ))}

                      {clusterPoints.length === 0 && (
                        <div className="px-3 py-3 text-sm text-gray-600">Nenhum ponto encontrado.</div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
