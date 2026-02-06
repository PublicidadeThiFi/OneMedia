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

import type { MediaMapDetails, MediaMapPoint, MediaUnitAvailabilityStatus } from '../types';
import { fetchMediaMapDetails, useMediaMapPoints } from '../hooks/useMediaMap';

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

  const [bboxStr, setBboxStr] = useState<string | undefined>(undefined);
  const [bboxArr, setBboxArr] = useState<BboxArr | null>(null);
  const [zoom, setZoom] = useState<number>(12);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<'details' | 'cluster'>('details');
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [clusterPoints, setClusterPoints] = useState<MediaMapPoint[]>([]);

  const [details, setDetails] = useState<MediaMapDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const { points, loading, error } = useMediaMapPoints({ bbox: bboxStr, zoom });

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
