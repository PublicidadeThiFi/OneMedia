import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Image as ImageIcon,
  List,
  Map as MapIcon,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./media-map-share.css";
import { fetchPublicMediaMap, resolvePublicMediaAssetUrl } from "../features/media-kit-sharing/api";
import { getApiError } from "../lib/getApiError";
import type {
  PublicMediaMap,
  PublicMapPoint,
} from "../features/media-kit-sharing/types";
const markerIcon = new L.Icon({
  iconRetinaUrl: new URL(
    "leaflet/dist/images/marker-icon-2x.png",
    import.meta.url,
  ).href,
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).href,
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url)
    .href,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function pointImageSources(point: PublicMapPoint): string[] {
  const candidates = [
    ...(point.media || []).filter((item) => item.type === "image").map((item) => item.url),
    ...point.units.flatMap((unit) =>
      (unit.media || []).filter((item) => item.type === "image").map((item) => item.url),
    ),
  ]
    .map((url) => String(url || "").trim())
    .filter(Boolean);

  return [...new Set(candidates)];
}

function SafeImage({
  src,
  alt,
  className,
  fallbackClassName = "grid h-full w-full place-items-center bg-slate-100",
}: {
  src: string | string[] | null | undefined;
  alt: string;
  className: string;
  fallbackClassName?: string;
}) {
  const candidates = Array.isArray(src)
    ? src.map((value) => String(value || "").trim()).filter(Boolean)
    : [String(src || "").trim()].filter(Boolean);
  const candidatesKey = candidates.join("|");
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidatesKey]);

  const current = candidates[candidateIndex];
  const resolved = resolvePublicMediaAssetUrl(current);

  if (!resolved) {
    return (
      <div className={fallbackClassName} aria-label={alt}>
        <ImageIcon className="h-5 w-5 text-slate-400" />
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setCandidateIndex((index) => index + 1)}
    />
  );
}

function DetailPointMap({ point }: { point: PublicMapPoint }) {
  const lat = Number(point.location?.latitude);
  const lng = Number(point.location?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border bg-slate-100">
      <div className="border-b bg-white px-3 py-2 text-xs font-semibold text-slate-700">
        Localização no mapa
      </div>
      <div className="h-56 w-full">
        <MapContainer
          key={`detail-map-${point.reference}`}
          center={[lat, lng]}
          zoom={16}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%", background: "#e2e8f0" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ResizeMap />
          <Marker position={[lat, lng]} icon={markerIcon}>
            <Popup>{point.name}</Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
function Fit({ points }: { points: PublicMapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    const coords = points.flatMap((p) => {
      const lat = Number(p.location?.latitude);
      const lng = Number(p.location?.longitude);
      return Number.isFinite(lat) && Number.isFinite(lng)
        ? [[lat, lng] as [number, number]]
        : [];
    });
    if (coords.length)
      map.fitBounds(coords, { padding: [40, 40], maxZoom: 14 });
  }, [map, points]);
  return null;
}

function ResizeMap() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const resize = () => map.invalidateSize({ pan: false });
    const observer = new ResizeObserver(resize);
    const timer = window.setTimeout(resize, 100);

    observer.observe(container);
    resize();

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [map]);

  return null;
}
function Markers({
  points,
  onSelect,
}: {
  points: PublicMapPoint[];
  onSelect: (p: PublicMapPoint) => void;
}) {
  const [zoom, setZoom] = useState(6);
  useMapEvents({ zoomend: (event) => setZoom(event.target.getZoom()) });
  const groups = useMemo(() => {
    const precision = zoom >= 13 ? 1000 : zoom >= 10 ? 100 : zoom >= 7 ? 20 : 5;
    const map = new Map<string, PublicMapPoint[]>();
    for (const point of points) {
      const lat = Number(point.location?.latitude);
      const lng = Number(point.location?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const key = `${Math.round(lat * precision)}:${Math.round(lng * precision)}`;
      map.set(key, [...(map.get(key) || []), point]);
    }
    return [...map.values()];
  }, [points, zoom]);
  return (
    <>
      {groups.map((group) => {
        const first = group[0];
        const position: [number, number] = [
          Number(first.location!.latitude),
          Number(first.location!.longitude),
        ];
        if (group.length === 1)
          return (
            <Marker
              key={first.reference}
              position={position}
              icon={markerIcon}
              eventHandlers={{ click: () => onSelect(first) }}
            >
              <Popup>{first.name}</Popup>
            </Marker>
          );
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:38px;height:38px;border-radius:999px;background:#4f46e5;color:white;display:grid;place-items:center;font-weight:700;border:3px solid white;box-shadow:0 2px 8px #0004">${group.length}</div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });
        return (
          <Marker
            key={group.map((x) => x.reference).join("-")}
            position={position}
            icon={icon}
          >
            <Popup>
              <button type="button">
                {group.length} pontos próximos — aproxime o mapa
              </button>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
const money = (value: number | null) =>
  value == null
    ? "Sob consulta"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(value);
export default function MediaMapSharePage() {
  const token = decodeURIComponent(
    window.location.pathname.split("/").filter(Boolean).pop() || "",
  );
  const [data, setData] = useState<PublicMediaMap | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(""),
    [type, setType] = useState("ALL"),
    [state, setState] = useState("ALL"),
    [mobileView, setMobileView] = useState<"map" | "list">("map"),
    [selected, setSelected] = useState<PublicMapPoint | null>(null);
  useEffect(() => {
    document.title = "Mapa de mídia compartilhado";
    let robots = document.querySelector(
      'meta[name="robots"]',
    ) as HTMLMetaElement | null;
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex,nofollow,noarchive";
    void fetchPublicMediaMap(token)
      .then(setData)
      .catch((requestError: unknown) =>
        setError(
          getApiError(
            requestError,
            "Este link é inválido, foi revogado ou está indisponível.",
          ).message,
        ),
      )
      .finally(() => setLoading(false));
  }, [token]);
  const states = useMemo(
    () =>
      [
        ...new Set(
          (data?.points || []).map((p) => p.location?.state).filter(Boolean),
        ),
      ].sort(),
    [data],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return (data?.points || []).filter(
      (p) =>
        (type === "ALL" || p.type === type) &&
        (state === "ALL" || p.location?.state === state) &&
        (!q ||
          [
            p.name,
            p.description,
            p.location?.street,
            p.location?.district,
            p.location?.city,
            p.location?.state,
            p.subcategory,
          ].some((v) =>
            String(v || "")
              .toLocaleLowerCase("pt-BR")
              .includes(q),
          )),
    );
  }, [data, query, type, state]);
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-600">
        Carregando mapa seguro…
      </div>
    );
  if (error || !data)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-4 text-xl font-semibold">Link indisponível</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
        </div>
      </main>
    );
  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-4 lg:px-6">
          <div className="flex h-12 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white p-1.5">
            {data.company.logoUrl ? (
              <SafeImage
                src={data.company.logoUrl}
                alt={`Logo de ${data.company.name}`}
                className="h-full w-full object-contain"
                fallbackClassName="grid h-full w-full place-items-center bg-white"
              />
            ) : (
              <Building2 className="h-6 w-6 text-slate-400" />
            )}
          </div>
          <div>
            <h1 className="font-semibold text-slate-900">
              {data.company.name}
            </h1>
            <p className="text-xs text-slate-500">
              Mapa comercial · {data.stats.points} pontos · {data.stats.units}{" "}
              faces
            </p>
          </div>
          {data.company.email || data.company.phone ? (
            <div className="ml-auto hidden text-right text-xs text-slate-500 sm:block">
              {data.company.email}
              {data.company.email && data.company.phone ? <br /> : null}
              {data.company.phone}
            </div>
          ) : null}
        </div>
      </header>
      <nav className="media-map-mobile-toolbar" aria-label="Visualização do catálogo">
        <div className="media-map-mobile-tabs">
          <button type="button" aria-pressed={mobileView === "map"} onClick={() => setMobileView("map")}>
            <MapIcon className="h-4 w-4" /> Mapa
          </button>
          <button type="button" aria-pressed={mobileView === "list"} onClick={() => setMobileView("list")}>
            <List className="h-4 w-4" /> Lista <span>{filtered.length}</span>
          </button>
        </div>
        <button type="button" className="media-map-filter-shortcut" onClick={() => setMobileView("list")}>
          <SlidersHorizontal className="h-4 w-4" /> Filtrar
        </button>
      </nav>
      <div className="media-map-share-layout" data-mobile-view={mobileView}>
        <aside className="media-map-share-list overflow-y-auto border-r bg-white">
          <div className="media-map-share-filters sticky top-0 z-10 space-y-3 border-b bg-white p-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome, endereço, cidade ou região"
                className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                <option value="ALL">Todos os tipos</option>
                <option value="OOH">OOH</option>
                <option value="DOOH">DOOH</option>
              </select>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                <option value="ALL">Todos os estados</option>
                {states.map((s) => (
                  <option key={s!} value={s!}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500">
              {filtered.length} resultado(s)
            </p>
          </div>
          <div className="space-y-2 p-3">
            {filtered.map((point) => (
              <button
                key={point.reference}
                onClick={() => setSelected(point)}
                className="media-map-result-card flex w-full gap-3 rounded-xl border p-3 text-left hover:border-indigo-300 hover:bg-indigo-50"
              >
                <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  <SafeImage
                    src={pointImageSources(point)}
                    alt={point.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {point.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {[point.location?.city, point.location?.state]
                      .filter(Boolean)
                      .join("/") || "Localização não divulgada"} · {point.type}
                  </div>
                  {point.prices || point.units.some((unit) => unit.prices) ? <div className="mt-1 text-xs font-medium text-indigo-700">
                    A partir de{" "}
                    {money(
                      point.prices?.month ??
                        point.units.find((unit) => unit.prices)?.prices?.month ??
                        null,
                    )}
                  </div> : null}
                </div>
              </button>
            ))}
          </div>
        </aside>
        <section className="media-map-share-canvas">
          {filtered.some((point) => {
            const lat = Number(point.location?.latitude);
            const lng = Number(point.location?.longitude);
            return Number.isFinite(lat) && Number.isFinite(lng);
          }) ? <MapContainer
            center={[-14.2, -51.9]}
            zoom={4}
            style={{ height: "100%", width: "100%", background: "#e2e8f0" }}
            scrollWheelZoom
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ResizeMap />
            <Fit points={filtered} />
            <Markers points={filtered} onSelect={setSelected} />
          </MapContainer> : (
            <div className="grid h-full place-items-center p-8 text-center text-slate-600">
              <div>
                <MapPin className="mx-auto h-9 w-9 text-slate-400" />
                <p className="mt-3 font-medium">Mapa geográfico não disponível</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  As coordenadas não foram liberadas neste compartilhamento. Consulte os pontos pela lista.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
      {selected ? (
        <div
          className="fixed inset-0 z-[1000] bg-black/40"
          onClick={() => setSelected(null)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="media-map-detail-sheet absolute inset-y-0 right-0 w-full max-w-lg overflow-y-auto bg-white p-5 shadow-2xl"
          >
            <button
              onClick={() => setSelected(null)}
              aria-label="Fechar"
              className="absolute right-4 top-4 rounded-full bg-white p-2 shadow"
            >
              <X className="h-5 w-5" />
            </button>
            {pointImageSources(selected).length ? (
              <div className="h-60 w-full overflow-hidden rounded-2xl bg-slate-100">
                <SafeImage
                  src={pointImageSources(selected)}
                  alt={selected.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
            <h2 className="mt-5 text-2xl font-semibold">{selected.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              <MapPin className="mr-1 inline h-4 w-4" />
              {[
                selected.location?.street,
                selected.location?.number,
                selected.location?.city,
                selected.location?.state,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            {selected.description ? (
              <p className="mt-4 text-sm leading-6 text-slate-700">
                {selected.description}
              </p>
            ) : null}
            <DetailPointMap point={selected} />
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="text-xs text-slate-500">Tipo</span>
                <div className="font-medium">
                  {selected.type} · {selected.subcategory || "—"}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="text-xs text-slate-500">Impactos/dia</span>
                <div className="font-medium">
                  {selected.dailyImpressions?.toLocaleString("pt-BR") ||
                    "Sob consulta"}
                </div>
              </div>
            </div>
            <h3 className="mt-6 font-semibold">Faces e características</h3>
            <div className="mt-2 space-y-2">
              {selected.units.map((unit) => (
                <div
                  key={unit.reference}
                  className="rounded-xl border p-3 text-sm"
                >
                  <div className="font-medium">{unit.label}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {unit.type} ·{" "}
                    {unit.orientation || "orientação não informada"} ·{" "}
                    {unit.dimensions?.widthM || "—"} ×{" "}
                    {unit.dimensions?.heightM || "—"} m
                  </div>
                  <div className="mt-2 font-medium text-indigo-700">
                    {money(unit.prices?.month ?? null)}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
