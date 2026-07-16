import { useEffect, useMemo, useRef, useState } from 'react';
import L, { type LatLngBoundsExpression, type Map as LeafletMap } from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import Supercluster from 'supercluster';
import { MapPin } from 'lucide-react';
import type { MarketplaceMapPoint } from '../../types/marketplace';

type MarketplaceMapProps = {
  points: MarketplaceMapPoint[];
  activeSlug?: string | null;
  height?: number;
  visibilityToken?: string;
  onPointActivate?: (slug: string) => void;
  onPointDeactivate?: (slug: string) => void;
  onPointOpen?: (slug: string) => void;
};

type MapViewport = {
  bounds: [number, number, number, number];
  zoom: number;
};

const BRAZIL_CENTER: [number, number] = [-14.235, -51.9253];
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

function formatPrice(value: number) {
  const compact = currencyFormatter.format(value).replace(/\s/g, ' ');
  return compact;
}

function buildClusterIcon(count: number, active: boolean) {
  const size = count < 10 ? 42 : count < 100 ? 48 : 54;
  return L.divIcon({
    className: 'marketplace-map-cluster-wrap',
    html: `<span class="marketplace-map-cluster${active ? ' is-active' : ''}" style="width:${size}px;height:${size}px">${count}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function buildPriceIcon(point: MarketplaceMapPoint, active: boolean) {
  const statusClass = point.availability.status.toLowerCase();
  return L.divIcon({
    className: 'marketplace-map-price-wrap',
    html: `<span class="marketplace-map-price marketplace-map-price--${statusClass}${active ? ' is-active' : ''}">${formatPrice(point.priceBiweekly)}</span>`,
    iconSize: [92, 36],
    iconAnchor: [46, 18],
  });
}

function MapViewportObserver({ onChange }: { onChange: (viewport: MapViewport) => void }) {
  const map = useMapEvents({
    moveend() {
      const bounds = map.getBounds();
      onChange({
        bounds: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
        zoom: map.getZoom(),
      });
    },
    zoomend() {
      const bounds = map.getBounds();
      onChange({
        bounds: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
        zoom: map.getZoom(),
      });
    },
  });

  useEffect(() => {
    const bounds = map.getBounds();
    onChange({
      bounds: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      zoom: map.getZoom(),
    });
  }, [map, onChange]);

  return null;
}

function FitMarketplacePoints({ points }: { points: MarketplaceMapPoint[] }) {
  const map = useMap();
  const signature = points.map((point) => `${point.id}:${point.latitude}:${point.longitude}`).join('|');
  const previousSignature = useRef('');

  useEffect(() => {
    if (!points.length || previousSignature.current === signature) return;
    previousSignature.current = signature;

    const validPoints = points.filter(
      (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
    );
    if (!validPoints.length) return;

    const timer = window.setTimeout(() => {
      map.invalidateSize();
      if (validPoints.length === 1) {
        map.setView([validPoints[0].latitude, validPoints[0].longitude], 14, { animate: false });
        return;
      }
      const bounds = L.latLngBounds(
        validPoints.map((point) => [point.latitude, point.longitude] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [54, 54], maxZoom: 15, animate: false });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [map, points, signature]);

  return null;
}

function ResizeMarketplaceMap({ height, visibilityToken }: { height?: number; visibilityToken?: string }) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 20);
    return () => window.clearTimeout(timer);
  }, [height, map, visibilityToken]);

  return null;
}

export function MarketplaceMap({
  points,
  activeSlug,
  height,
  visibilityToken,
  onPointActivate,
  onPointDeactivate,
  onPointOpen,
}: MarketplaceMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const [viewport, setViewport] = useState<MapViewport>({
    bounds: [-180, -85, 180, 85],
    zoom: 4,
  });

  const geoPoints = useMemo(
    () => points
      .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
      .map((point) => ({
        type: 'Feature' as const,
        properties: point,
        geometry: {
          type: 'Point' as const,
          coordinates: [point.longitude, point.latitude],
        },
      })),
    [points],
  );

  const clusterIndex = useMemo(() => {
    const index = new Supercluster<MarketplaceMapPoint, { pointCount?: number }>({
      radius: 58,
      maxZoom: 18,
      minPoints: 2,
    });
    index.load(geoPoints);
    return index;
  }, [geoPoints]);

  const clusters = useMemo(
    () => clusterIndex.getClusters(viewport.bounds, Math.round(viewport.zoom)),
    [clusterIndex, viewport],
  );

  const hasPoints = geoPoints.length > 0;

  return (
    <div className="marketplace-map" style={height ? { height } : undefined} role="region" aria-label={`Mapa interativo com ${points.length} ${points.length === 1 ? 'ponto de mídia' : 'pontos de mídia'}`}>
      <p className="marketplace-visually-hidden">Use os controles do mapa para mover e ampliar. Os marcadores com preço abrem os detalhes do ponto.</p>
      <MapContainer
        center={BRAZIL_CENTER}
        zoom={4}
        minZoom={3}
        maxZoom={19}
        scrollWheelZoom
        className="marketplace-map__canvas"
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewportObserver onChange={setViewport} />
        <FitMarketplacePoints points={points} />
        <ResizeMarketplaceMap height={height} visibilityToken={visibilityToken} />

        {clusters.map((feature) => {
          const [longitude, latitude] = feature.geometry.coordinates;
          const properties = feature.properties as MarketplaceMapPoint & {
            cluster?: boolean;
            cluster_id?: number;
            point_count?: number;
          };

          if (properties.cluster && properties.cluster_id != null) {
            const count = Number(properties.point_count || 0);
            const leaves = clusterIndex.getLeaves(properties.cluster_id, 1000);
            const active = leaves.some((leaf) => leaf.properties.slug === activeSlug);
            return (
              <Marker
                key={`cluster-${properties.cluster_id}`}
                position={[latitude, longitude]}
                icon={buildClusterIcon(count, active)}
                eventHandlers={{
                  click: () => {
                    const expansionZoom = Math.min(
                      clusterIndex.getClusterExpansionZoom(properties.cluster_id as number),
                      18,
                    );
                    mapRef.current?.setView([latitude, longitude], expansionZoom, { animate: true });
                  },
                }}
              />
            );
          }

          const point = properties as MarketplaceMapPoint;
          return (
            <Marker
              key={point.id}
              position={[latitude, longitude]}
              icon={buildPriceIcon(point, point.slug === activeSlug)}
              keyboard
              title={point.name || 'Ponto de mídia'}
              eventHandlers={{
                mouseover: () => onPointActivate?.(point.slug),
                mouseout: () => onPointDeactivate?.(point.slug),
                click: () => onPointOpen?.(point.slug),
              }}
            />
          );
        })}
      </MapContainer>

      {!hasPoints && (
        <div className="marketplace-map__empty" role="status">
          <MapPin aria-hidden="true" />
          <strong>Nenhum ponto no mapa</strong>
          <span>Ajuste os filtros para ampliar a busca.</span>
        </div>
      )}
    </div>
  );
}
