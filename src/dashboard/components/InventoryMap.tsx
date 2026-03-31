import { useEffect, useMemo } from 'react';
import { Layers3, MapPin, RefreshCcw } from 'lucide-react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '../../components/ui/button';
import type { InventoryMapPin } from '../contracts/inventory';

type NormalizedPin = InventoryMapPin & {
  lat: number;
  lng: number;
  regionSafe: string;
  lineSafe: string;
};

function normalizePins(pins: InventoryMapPin[]): NormalizedPin[] {
  const fallbackLat0 = -15.78;
  const fallbackLng0 = -47.9;

  return pins.map((p, i) => {
    const lat = typeof p.lat === 'number' ? p.lat : fallbackLat0 + ((i % 9) - 4) * 0.05;
    const lng = typeof p.lng === 'number' ? p.lng : fallbackLng0 + ((i % 11) - 5) * 0.05;
    const regionSafe = String(p.region || [p.city, p.state].filter(Boolean).join(' / ') || 'Sem região').trim() || 'Sem região';
    const lineSafe = String(p.line || p.subcategory || p.type || 'Inventário').trim() || 'Inventário';
    return { ...p, lat, lng, regionSafe, lineSafe };
  });
}

function markerColor(occ: number) {
  if (occ >= 75) return '#dc2626';
  if (occ >= 45) return '#d97706';
  return '#16a34a';
}

function markerFill(occ: number) {
  if (occ >= 75) return '#fecaca';
  if (occ >= 45) return '#fde68a';
  return '#bbf7d0';
}

function markerRadius(unitsCount?: number) {
  const units = Math.max(1, Number(unitsCount || 1));
  return Math.min(14, 7 + units * 1.1);
}

function occBadge(occ: number) {
  if (occ >= 75) return { label: 'Alta', className: 'text-red-700 bg-red-50 border-red-200' };
  if (occ >= 45) return { label: 'Média', className: 'text-amber-700 bg-amber-50 border-amber-200' };
  return { label: 'Baixa', className: 'text-green-700 bg-green-50 border-green-200' };
}

function MapViewport({ pins, selectedPinId }: { pins: NormalizedPin[]; selectedPinId?: string }) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (!pins.length) return;
    const selected = selectedPinId ? pins.find((pin) => pin.id === selectedPinId) : undefined;
    if (selected) {
      map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 13), { duration: 0.4 });
      return;
    }

    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 12, { animate: false });
      return;
    }

    const bounds = L.latLngBounds(pins.map((pin) => [pin.lat, pin.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 12, animate: false });
  }, [map, pins, selectedPinId]);

  return null;
}

export function InventoryRegionLineHeatmap(props: {
  pins: InventoryMapPin[];
  onSelect?: (region: string, line: string) => void;
}) {
  const points = useMemo(() => normalizePins(props.pins), [props.pins]);

  const regions = useMemo(() => {
    const set = new Set<string>();
    for (const p of points) set.add(p.regionSafe);
    return Array.from(set).slice(0, 6);
  }, [points]);

  const lines = useMemo(() => {
    const set = new Set<string>();
    for (const p of points) set.add(p.lineSafe);
    return Array.from(set).slice(0, 5);
  }, [points]);

  const grid = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    for (const p of points) {
      const key = `${p.regionSafe}::${p.lineSafe}`;
      const prev = map.get(key) || { sum: 0, count: 0 };
      map.set(key, { sum: prev.sum + (p.occupancyPercent || 0), count: prev.count + 1 });
    }
    return map;
  }, [points]);

  if (regions.length === 0 || lines.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Layers3 className="w-4 h-4 text-gray-700" />
        <p className="text-sm text-gray-900">Ocupação por região e linha</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left font-medium text-gray-700 px-2 py-2 border-b border-gray-200">Região</th>
              {lines.map((l) => (
                <th key={l} className="text-left font-medium text-gray-700 px-2 py-2 border-b border-gray-200">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {regions.map((r) => (
              <tr key={r}>
                <td className="px-2 py-2 border-b border-gray-100 text-gray-900 whitespace-nowrap">{r}</td>
                {lines.map((l) => {
                  const key = `${r}::${l}`;
                  const cell = grid.get(key);
                  const avg = cell && cell.count ? Math.round(cell.sum / cell.count) : 0;
                  const count = cell?.count || 0;
                  const badge = occBadge(avg);
                  return (
                    <td key={key} className="px-2 py-2 border-b border-gray-100">
                      <button
                        type="button"
                        className={`w-full border rounded-md px-2 py-1 text-left ${badge.className}`}
                        onClick={() => props.onSelect?.(r, l)}
                        disabled={count === 0}
                        title={count === 0 ? 'Sem pontos' : 'Abrir drilldown'}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="tabular-nums text-gray-900">{avg}%</span>
                          <span className="text-gray-600">{count}</span>
                        </div>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function InventoryMap(props: {
  pins: InventoryMapPin[];
  height?: number;
  onPinClick?: (pin: InventoryMapPin) => void;
  selectedPinId?: string;
}) {
  const height = props.height ?? 360;
  const pins = useMemo(() => normalizePins(props.pins), [props.pins]);

  const center = useMemo<[number, number]>(() => {
    if (!pins.length) return [-15.78, -47.9];
    const lat = pins.reduce((sum, pin) => sum + pin.lat, 0) / pins.length;
    const lng = pins.reduce((sum, pin) => sum + pin.lng, 0) / pins.length;
    return [lat, lng];
  }, [pins]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <MapPin className="w-4 h-4 text-gray-700" />
          <span>{pins.length} ponto(s) com leitura espacial real</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> baixa</span>
          <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> média</span>
          <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> alta</span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-gray-200" style={{ height }}>
        <MapContainer center={center} zoom={5} scrollWheelZoom className="h-full w-full z-0">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewport pins={pins} selectedPinId={props.selectedPinId} />

          {pins.map((pin) => {
            const occ = pin.occupancyPercent || 0;
            const border = markerColor(occ);
            const fill = markerFill(occ);
            return (
              <CircleMarker
                key={pin.id}
                center={[pin.lat, pin.lng]}
                radius={markerRadius(pin.unitsCount)}
                pathOptions={{ color: border, weight: pin.id === props.selectedPinId ? 3 : 2, fillColor: fill, fillOpacity: 0.95 }}
                eventHandlers={{ click: () => props.onPinClick?.(pin) }}
              >
                <Popup>
                  <div className="min-w-[220px] space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{pin.label}</p>
                      <p className="text-xs text-gray-500">{[pin.city, pin.state].filter(Boolean).join(' / ') || pin.regionSafe}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md border border-gray-200 px-2 py-1">
                        <p className="text-gray-500">Ocupação</p>
                        <p className="text-gray-900 font-medium tabular-nums">{Math.round(occ)}%</p>
                      </div>
                      <div className="rounded-md border border-gray-200 px-2 py-1">
                        <p className="text-gray-500">Campanhas</p>
                        <p className="text-gray-900 font-medium tabular-nums">{pin.activeCampaigns || 0}</p>
                      </div>
                      <div className="rounded-md border border-gray-200 px-2 py-1">
                        <p className="text-gray-500">Unidades</p>
                        <p className="text-gray-900 font-medium tabular-nums">{pin.unitsCount || 0}</p>
                      </div>
                      <div className="rounded-md border border-gray-200 px-2 py-1">
                        <p className="text-gray-500">Disponíveis</p>
                        <p className="text-gray-900 font-medium tabular-nums">{pin.availableUnitsCount || 0}</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      <p>{pin.subcategory || pin.type || 'Inventário'}{pin.environment ? ` • ${pin.environment}` : ''}</p>
                      <p>Receita: {typeof pin.revenueCents === 'number' ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pin.revenueCents / 100) : '—'}</p>
                    </div>
                    <Button className="h-8 w-full" variant="outline" onClick={() => props.onPinClick?.(pin)}>
                      Abrir detalhe
                    </Button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        <button
          type="button"
          className="absolute right-3 top-3 z-[400] inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white/95 px-3 py-1.5 text-xs text-gray-700 shadow-sm"
          onClick={() => window.dispatchEvent(new Event('resize'))}
          title="Recentrar mapa"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Reajustar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {pins.slice(0, 8).map((pin) => {
          const badge = occBadge(pin.occupancyPercent || 0);
          return (
            <button
              key={pin.id}
              type="button"
              className={`text-xs px-2 py-1 rounded-md border ${badge.className} hover:opacity-90`}
              onClick={() => props.onPinClick?.(pin)}
            >
              {pin.label} <span className="tabular-nums">{Math.round(pin.occupancyPercent || 0)}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
