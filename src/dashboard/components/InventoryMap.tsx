import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layers3, Minus, Plus, RefreshCcw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { InventoryMapPin } from '../contracts/inventory';

type Point = InventoryMapPin & {
  x: number;
  y: number;
  regionSafe: string;
  lineSafe: string;
};

type Cluster = {
  id: string;
  x: number;
  y: number;
  count: number;
  occupancyAvg: number;
  pins: InventoryMapPin[];
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function occColor(occ: number) {
  // Occupancy: low = green, mid = yellow, high = red
  if (occ >= 75) return 'bg-red-500 border-red-600';
  if (occ >= 45) return 'bg-yellow-400 border-yellow-500';
  return 'bg-green-500 border-green-600';
}

function occBadge(occ: number) {
  if (occ >= 75) return { label: 'Alta', className: 'text-red-700 bg-red-50 border-red-200' };
  if (occ >= 45) return { label: 'Media', className: 'text-yellow-800 bg-yellow-50 border-yellow-200' };
  return { label: 'Baixa', className: 'text-green-700 bg-green-50 border-green-200' };
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const cr = entry.contentRect;
      setSize({ width: Math.round(cr.width), height: Math.round(cr.height) });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, ...size };
}

function normalizePins(pins: InventoryMapPin[]): Array<InventoryMapPin & { lat: number; lng: number; regionSafe: string; lineSafe: string }> {
  const fallbackLat0 = -15.78;
  const fallbackLng0 = -47.90;

  return pins.map((p, i) => {
    const lat = typeof p.lat === 'number' ? p.lat : fallbackLat0 + ((i % 9) - 4) * 0.01;
    const lng = typeof p.lng === 'number' ? p.lng : fallbackLng0 + ((i % 11) - 5) * 0.01;
    const regionSafe = String(p.region || p.city || 'Regiao').trim() || 'Regiao';
    const lineSafe = String(p.line || `Linha ${String.fromCharCode(65 + (i % 3))}`).trim() || 'Linha';
    return { ...p, lat, lng, regionSafe, lineSafe };
  });
}

function layoutPoints(pins: InventoryMapPin[], width: number, height: number): Point[] {
  const normalized = normalizePins(pins);

  const lats = normalized.map((p) => p.lat);
  const lngs = normalized.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const pad = 24;
  const w = Math.max(1, width - pad * 2);
  const h = Math.max(1, height - pad * 2);

  const latSpan = Math.max(1e-9, maxLat - minLat);
  const lngSpan = Math.max(1e-9, maxLng - minLng);

  return normalized.map((p) => {
    // linear mapping is enough for our small area ranges (MVP)
    const xNorm = (p.lng - minLng) / lngSpan;
    const yNorm = (p.lat - minLat) / latSpan;

    const x = pad + xNorm * w;
    const y = pad + (1 - yNorm) * h;

    return {
      ...p,
      x,
      y,
      regionSafe: p.regionSafe,
      lineSafe: p.lineSafe,
    };
  });
}

function clusterPoints(points: Point[], zoom: number): Cluster[] {
  // Keep clustering radius roughly constant in screen-space
  const radiusScreen = 34;
  const radiusWorld = radiusScreen / Math.max(0.6, zoom);

  const used = new Set<string>();
  const clusters: Cluster[] = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (used.has(p.id)) continue;

    const group: Point[] = [p];
    used.add(p.id);

    for (let j = i + 1; j < points.length; j++) {
      const q = points[j];
      if (used.has(q.id)) continue;

      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= radiusWorld) {
        group.push(q);
        used.add(q.id);
      }
    }

    if (group.length === 1) {
      clusters.push({
        id: `pin:${p.id}`,
        x: p.x,
        y: p.y,
        count: 1,
        occupancyAvg: p.occupancyPercent,
        pins: [p],
      });
      continue;
    }

    const x = Math.round(group.reduce((s, g) => s + g.x, 0) / group.length);
    const y = Math.round(group.reduce((s, g) => s + g.y, 0) / group.length);
    const occupancyAvg = group.reduce((s, g) => s + (g.occupancyPercent || 0), 0) / group.length;

    clusters.push({
      id: `cluster:${group[0].id}:${group.length}`,
      x,
      y,
      count: group.length,
      occupancyAvg,
      pins: group,
    });
  }

  return clusters;
}

function heatCellBg(avgOcc: number) {
  // Slightly conservative shades to keep text readable
  if (avgOcc >= 75) return 'bg-red-100 border-red-200';
  if (avgOcc >= 45) return 'bg-yellow-100 border-yellow-200';
  return 'bg-green-100 border-green-200';
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
        <p className="text-sm text-gray-900">Ocupacao por regiao e linha</p>
        <p className="text-xs text-gray-500">(clique para abrir lista)</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left font-medium text-gray-700 px-2 py-2 border-b border-gray-200">Regiao</th>
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
                  const avg = cell && cell.count ? cell.sum / cell.count : 0;
                  const count = cell?.count || 0;

                  return (
                    <td key={key} className="px-2 py-2 border-b border-gray-100">
                      <button
                        type="button"
                        className={`w-full border rounded-md px-2 py-1 text-left ${heatCellBg(avg)}`}
                        onClick={() => props.onSelect?.(r, l)}
                        disabled={count === 0}
                        title={count === 0 ? 'Sem pontos' : 'Abrir drilldown'}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="tabular-nums text-gray-900">{Math.round(avg)}%</span>
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

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-green-200 border border-green-300" />
          baixa
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-yellow-200 border border-yellow-300" />
          media
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-red-200 border border-red-300" />
          alta
        </span>
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
  const height = props.height ?? 320;
  const { ref, width } = useElementSize<HTMLDivElement>();

  const points = useMemo(() => layoutPoints(props.pins, Math.max(1, width), height), [props.pins, width, height]);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const [clusterEnabled, setClusterEnabled] = useState(true);
  const [heatEnabled, setHeatEnabled] = useState(true);

  const [tooltip, setTooltip] = useState<
    | null
    | {
        x: number;
        y: number;
        title: string;
        subtitle?: string;
        occ: number;
      }
  >(null);

  const clusters = useMemo(() => {
    if (!clusterEnabled) {
      return points.map((p) => ({ id: `pin:${p.id}`, x: p.x, y: p.y, count: 1, occupancyAvg: p.occupancyPercent, pins: [p] }));
    }
    if (zoom >= 2.2) {
      return points.map((p) => ({ id: `pin:${p.id}`, x: p.x, y: p.y, count: 1, occupancyAvg: p.occupancyPercent, pins: [p] }));
    }
    return clusterPoints(points, zoom);
  }, [points, zoom, clusterEnabled]);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (!width) return;

      const delta = e.deltaY;
      const factor = delta > 0 ? 0.92 : 1.08;

      const nextZoom = clamp(zoom * factor, 0.8, 6);
      if (nextZoom == zoom) return;

      const bounds = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const cx = e.clientX - bounds.left;
      const cy = e.clientY - bounds.top;

      // keep cursor anchored
      const nextPanX = cx - (cx - pan.x) * (nextZoom / zoom);
      const nextPanY = cy - (cy - pan.y) * (nextZoom / zoom);

      setZoom(nextZoom);
      setPan({ x: nextPanX, y: nextPanY });
    },
    [zoom, pan.x, pan.y, width],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan.x, pan.y]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !dragStart.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
    },
    [dragging],
  );

  const onPointerUp = useCallback(() => {
    setDragging(false);
    dragStart.current = null;
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomTo = useCallback(
    (x: number, y: number, nextZoom: number) => {
      const container = ref.current;
      if (!container) {
        setZoom(nextZoom);
        return;
      }
      const rect = container.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      setZoom(nextZoom);
      setPan({ x: cx - x * nextZoom, y: cy - y * nextZoom });
    },
    [ref],
  );

  const zoomIn = useCallback(() => setZoom((z) => clamp(z * 1.25, 0.8, 6)), []);
  const zoomOut = useCallback(() => setZoom((z) => clamp(z * 0.8, 0.8, 6)), []);

  const legend = useMemo(() => {
    return [
      { label: '0-44% (baixa)', dot: 'bg-green-500 border-green-600' },
      { label: '45-74% (media)', dot: 'bg-yellow-400 border-yellow-500' },
      { label: '75-100% (alta)', dot: 'bg-red-500 border-red-600' },
    ];
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9" onClick={resetView} title="Reset view">
            <RefreshCcw className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="h-9" onClick={zoomOut} title="Zoom out">
            <Minus className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="h-9" onClick={zoomIn} title="Zoom in">
            <Plus className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            className="h-9"
            onClick={() => setClusterEnabled((s) => !s)}
            title="Clusters"
          >
            <Layers3 className="w-4 h-4" />
            <span className="ml-2 text-sm">{clusterEnabled ? 'Cluster' : 'Pins'}</span>
          </Button>

          <Button
            variant="outline"
            className="h-9"
            onClick={() => setHeatEnabled((s) => !s)}
            title="Heatmap"
          >
            <span className="text-sm">{heatEnabled ? 'Heat ON' : 'Heat OFF'}</span>
          </Button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
          <span className="tabular-nums">Zoom {zoom.toFixed(2)}x</span>
          <span>•</span>
          <span className="tabular-nums">{props.pins.length} pins</span>
        </div>
      </div>

      <div
        ref={ref}
        className="relative w-full rounded-lg border border-gray-200 overflow-hidden select-none"
        style={{ height }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* background grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0',
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <div className="relative" style={{ width: Math.max(1, width), height }}>
            {heatEnabled &&
              points.map((p) => (
                <div
                  key={`heat:${p.id}`}
                  className="absolute rounded-full blur-2xl opacity-40"
                  style={{
                    left: p.x - 28,
                    top: p.y - 28,
                    width: 56,
                    height: 56,
                  }}
                >
                  <div className={`w-full h-full rounded-full ${occColor(p.occupancyPercent).split(' ')[0]} opacity-30`} />
                </div>
              ))}

            {clusters.map((c) => {
              const isCluster = c.count > 1;
              const size = isCluster ? 30 : 16;
              const left = c.x - size / 2;
              const top = c.y - size / 2;

              const dot = occColor(c.occupancyAvg);
              const selected = !isCluster && c.pins[0] && c.pins[0].id === props.selectedPinId;

              return (
                <button
                  key={c.id}
                  type="button"
                  className={`absolute rounded-full border ${dot} flex items-center justify-center text-white shadow-sm ${selected ? 'ring-2 ring-gray-900 ring-offset-2' : ''}`}
                  style={{ left, top, width: size, height: size }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isCluster) {
                      zoomTo(c.x, c.y, clamp(zoom * 1.7, 0.8, 6));
                      return;
                    }
                    const pin = c.pins[0];
                    if (pin) props.onPinClick?.(pin);
                  }}
                  onMouseEnter={(e) => {
                    const pin = c.pins[0];
                    if (!pin) return;
                    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                    setTooltip({
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                      title: isCluster ? `${c.count} pins` : pin.label,
                      subtitle: isCluster ? 'Cluster' : (pin.city || pin.region),
                      occ: Math.round(c.occupancyAvg),
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  title={isCluster ? `${c.count} pontos` : c.pins[0]?.label}
                >
                  {isCluster ? <span className="text-xs font-semibold tabular-nums">{c.count}</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* legend */}
        <div className="absolute left-3 bottom-3 bg-white/90 backdrop-blur rounded-md border border-gray-200 px-2 py-2 space-y-1">
          {legend.map((l) => (
            <div key={l.label} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-sm border ${l.dot}`} />
              <span className="text-xs text-gray-700 whitespace-nowrap">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {props.pins.slice(0, 8).map((p) => {
          const badge = occBadge(p.occupancyPercent);
          return (
            <button
              key={p.id}
              type="button"
              className={`text-xs px-2 py-1 rounded-md border ${badge.className} hover:opacity-90`}
              onClick={() => props.onPinClick?.(p)}
            >
              {p.label} <span className="tabular-nums">{Math.round(p.occupancyPercent)}%</span>
            </button>
          );
        })}
      </div>

      {tooltip ? (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -8px)' }}
        >
          <div className="rounded-md border border-gray-200 bg-white shadow-lg px-3 py-2">
            <p className="text-xs text-gray-900 font-medium">{tooltip.title}</p>
            {tooltip.subtitle ? <p className="text-xs text-gray-500">{tooltip.subtitle}</p> : null}
            <p className="text-xs text-gray-700">Ocupacao: <span className="tabular-nums">{tooltip.occ}%</span></p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
