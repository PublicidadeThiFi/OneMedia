import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, ExternalLink, MapPin, ShoppingCart, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { usePublicMediaKit } from '../hooks/usePublicMediaKit';
import { normalizeAvailability, normalizeMediaType, PublicMediaKitPoint } from '../lib/publicMediaKit';
import { addToCart, formatAddress, getCartCount } from '../lib/menuCart';

function buildQuery(params: Record<string, string | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    const val = String(v ?? '').trim();
    if (val) sp.set(k, val);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

function formatCurrencyBRL(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function parseCoord(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const s = String(value).trim();
  if (!s) return null;
  const normalized = s.replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function readCoords(point: PublicMediaKitPoint): { lat: number; lng: number } | null {
  const p: any = point as any;
  const lat = parseCoord(p.latitude ?? p.lat ?? p.location?.lat);
  const lng = parseCoord(p.longitude ?? p.lng ?? p.location?.lng ?? p.location?.lon);

  if (lat === null || lng === null) return null;

  // ranges válidos
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  // evita (0,0) quando temos endereço (sinal clássico de dado quebrado)
  const addr = formatAddress(point);
  if (addr && lat == 0 && lng == 0) return null;

  return { lat, lng };
}

function makeMapsUrl(point: PublicMediaKitPoint): string {
  const coords = readCoords(point);
  if (coords) {
    return `https://www.google.com/maps?q=${encodeURIComponent(`${coords.lat},${coords.lng}`)}`;
  }

  const addr = formatAddress(point);
  if (addr) return `https://www.google.com/maps?q=${encodeURIComponent(addr)}`;

  return 'https://www.google.com/maps';
}

function makeMapsEmbedUrl(point: PublicMediaKitPoint): string | null {
  const coords = readCoords(point);
  if (coords) {
    return `https://www.google.com/maps?q=${encodeURIComponent(`${coords.lat},${coords.lng}`)}&z=15&output=embed`;
  }

  const addr = formatAddress(point);
  if (addr) return `https://www.google.com/maps?q=${encodeURIComponent(addr)}&z=15&output=embed`;

  return null;
}

export default function MenuDetalhe() {
  const navigate = useNavigation();

  const { token, pointId, uf, city } = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return {
      token: sp.get('token') || sp.get('t') || '',
      pointId: sp.get('id') || sp.get('pointId') || '',
      uf: String(sp.get('uf') || '').trim().toUpperCase(),
      city: String(sp.get('city') || '').trim(),
    };
  }, []);

  const { data, loading, error } = usePublicMediaKit({ token });

  const point = useMemo(() => {
    const points = data?.points ?? [];
    return points.find((p) => String(p.id) === String(pointId)) ?? null;
  }, [data?.points, pointId]);

  const [cartCount, setCartCount] = useState<number>(() => {
    try {
      return getCartCount();
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    // Keep count in sync when returning to this screen via navigation
    try {
      setCartCount(getCartCount());
    } catch {
      setCartCount(0);
    }
    // Note: storage event only fires across tabs; we still listen for completeness
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'menu_cart') {
        try {
          setCartCount(getCartCount());
        } catch {
          setCartCount(0);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [pointId]);

  const backUrl = useMemo(() => {
    return `/menu/pontos${buildQuery({ token, uf, city })}`;
  }, [token, uf, city]);

  const onAdd = () => {
    if (!point) return;

    const units = Array.isArray(point.units) ? point.units.filter((u) => u?.isActive !== false) : [];
    if (units.length > 1) {
      navigate(`/menu/faces${buildQuery({ token, id: point.id, uf, city })}`);
      return;
    }

    const unit = units.length === 1 ? units[0] : null;
    const { added } = addToCart({ point, unit, duration: { years: 0, months: 1, days: 0 } });

    if (added) {
      toast.success('Adicionado ao carrinho', { description: point.name });
      try {
        setCartCount(getCartCount());
      } catch {
        // ignore
      }
    } else {
      toast.info('Este item já está no seu carrinho', { description: point.name });
    }
  };

  const availability = point ? normalizeAvailability(point) : null;
  const mediaType = point ? (normalizeMediaType(point.type) ?? (point.type as any)) : null;

  const units = useMemo(() => {
    const list = Array.isArray(point?.units) ? point!.units!.filter((u) => u?.isActive !== false) : [];
    return list;
  }, [point]);

  const gallery = useMemo(() => {
    const urls = [point?.mainImageUrl, ...units.map((u) => u.imageUrl || '')]
      .map((u) => String(u || '').trim())
      .filter(Boolean);
    return Array.from(new Set(urls));
  }, [point?.mainImageUrl, units]);

  const mapsUrl = point ? makeMapsUrl(point) : 'https://www.google.com/maps';
  const mapsEmbed = point ? makeMapsEmbedUrl(point) : null;

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          <div className="text-sm text-gray-600">Detalhe do ponto</div>

          <div className="ml-auto flex items-center gap-2">
            {cartCount > 0 && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate(`/menu/carrinho${buildQuery({ token, uf, city })}`)}
              >
                <ShoppingCart className="h-4 w-4" />
                Ver carrinho ({cartCount})
              </Button>
            )}

            <Button variant="ghost" className="gap-2" onClick={() => navigate(backUrl)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mt-5 border-amber-200 bg-amber-50">
            <CardContent className="py-4">
              <div className="text-sm font-semibold text-amber-900">Não foi possível carregar</div>
              <div className="mt-1 text-sm text-amber-800">{error}</div>
            </CardContent>
          </Card>
        )}

        {loading && !point && (
          <Card className="mt-5 animate-pulse">
            <CardContent className="py-6">
              <div className="h-5 w-56 bg-gray-200 rounded" />
              <div className="mt-3 h-3 w-80 bg-gray-200 rounded" />
              <div className="mt-6 h-40 w-full bg-gray-200 rounded" />
            </CardContent>
          </Card>
        )}

        {!loading && !error && !point && (
          <Card className="mt-5">
            <CardContent className="py-6">
              <div className="text-sm font-semibold text-gray-900">Ponto não encontrado</div>
              <div className="mt-1 text-sm text-gray-600">Volte para a lista e selecione outro ponto.</div>
              <div className="mt-4">
                <Button variant="outline" onClick={() => navigate(backUrl)}>
                  Voltar para a lista
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {point && (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="py-6">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl font-bold text-gray-900">{point.name}</h1>
                      <div className="mt-1 text-sm text-gray-600">{formatAddress(point) || 'Endereço não informado'}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {mediaType && <Badge variant="secondary" className="rounded-full">{mediaType}</Badge>}
                        {availability && (
                          <Badge
                            className={
                              availability === 'Disponível'
                                ? 'rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100'
                                : availability === 'Parcial'
                                  ? 'rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100'
                                  : 'rounded-full bg-rose-100 text-rose-900 hover:bg-rose-100'
                            }
                          >
                            {availability}
                          </Badge>
                        )}
                        {point.subcategory && <Badge variant="outline" className="rounded-full">{point.subcategory}</Badge>}
                        {point.environment && <Badge variant="outline" className="rounded-full">{point.environment}</Badge>}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:items-end">
                      <div className="text-sm text-gray-600">Preço base</div>
                      <div className="text-lg font-bold text-gray-900">{formatCurrencyBRL(point.basePriceMonth)}</div>
                      <div className="text-xs text-gray-600">Mensal • {formatCurrencyBRL(point.basePriceWeek)} semanal</div>
                    </div>
                  </div>

                  <Separator className="my-5" />

                  <div>
                    <div className="text-sm font-semibold text-gray-900">Galeria</div>
                    <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                      {gallery.length > 0 ? (
                        gallery.map((url) => (
                          <div key={url} className="h-40 w-64 flex-none overflow-hidden rounded-xl bg-gray-100">
                            <ImageWithFallback src={url} alt={point.name} className="h-full w-full object-cover" />
                          </div>
                        ))
                      ) : (
                        <div className="h-40 w-full rounded-xl bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                          Nenhuma imagem disponível
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator className="my-5" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Layers className="h-4 w-4" />
                        <span className="font-semibold">Faces/Telas</span>
                      </div>
                      <div className="mt-2 text-gray-600">
                        {units.length > 0 ? `${units.length} unidade(s) ativa(s)` : '—'}
                      </div>
                      {typeof point.dailyImpressions === 'number' && (
                        <div className="mt-2 text-gray-600">
                          <span className="font-semibold">Impacto/dia:</span> {point.dailyImpressions}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin className="h-4 w-4" />
                        <span className="font-semibold">Localização</span>
                      </div>
                      <div className="mt-2 text-gray-600">
                        {point.addressDistrict ? `${point.addressDistrict} • ` : ''}{point.addressCity || ''}{point.addressState ? `/${point.addressState}` : ''}
                      </div>
                      <div className="mt-3">
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
                        >
                          Abrir no Google Maps
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col sm:flex-row gap-3">
                    <Button className="gap-2" onClick={onAdd}>
                      <ShoppingCart className="h-4 w-4" />
                      {units.length > 1 ? 'Selecionar faces/telas' : 'Adicionar ao carrinho'}
                    </Button>
                    <Button variant="outline" onClick={() => navigate(backUrl)}>
                      Voltar para a lista
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardContent className="py-6">
                  <div className="text-sm font-semibold text-gray-900">Mapa (preview)</div>
                  <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                    {mapsEmbed ? (
                      <iframe
                        title="Mapa"
                        src={mapsEmbed}
                        className="h-64 w-full"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    ) : (
                      <div className="h-64 w-full flex items-center justify-center text-sm text-gray-600">
                        Coordenadas não informadas — use o botão “Abrir no Google Maps”.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardContent className="py-6">
                  <div className="text-sm font-semibold text-gray-900">Unidades</div>
                  <div className="mt-3 space-y-3">
                    {units.length > 0 ? (
                      units.map((u) => (
                        <div key={u.id} className="rounded-xl border border-gray-200 p-3">
                          <div className="text-sm font-semibold text-gray-900">
                            {u.unitType === 'SCREEN' ? 'Tela' : 'Face'} {u.label}
                          </div>
                          <div className="mt-1 text-xs text-gray-600">
                            {u.widthM && u.heightM ? `${u.widthM}m × ${u.heightM}m` : 'Dimensões não informadas'}
                            {u.orientation ? ` • ${u.orientation}` : ''}
                          </div>
                          <div className="mt-2 text-xs text-gray-700">
                            <span className="text-gray-500">Mensal:</span>{' '}
                            <span className="font-semibold">{formatCurrencyBRL(u.priceMonth ?? point.basePriceMonth)}</span>
                          </div>
                          <div className="mt-1 text-xs text-gray-700">
                            <span className="text-gray-500">Semanal:</span>{' '}
                            <span className="font-semibold">{formatCurrencyBRL(u.priceWeek ?? point.basePriceWeek)}</span>
                          </div>
                          {u.imageUrl && (
                            <div className="mt-3 h-28 w-full overflow-hidden rounded-lg bg-gray-100">
                              <ImageWithFallback src={u.imageUrl} alt={u.label} className="h-full w-full object-cover" />
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-600">Nenhuma face/tela cadastrada neste ponto.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
