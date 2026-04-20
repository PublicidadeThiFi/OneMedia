import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  ArrowLeft,
  ExternalLink,
  GalleryHorizontal,
  Layers,
  MapPin,
  ShoppingCart,
  Sparkles,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { usePublicMediaKit } from '../hooks/usePublicMediaKit';
import { computePointPriceSummary, normalizeAvailability, normalizeMediaType, PublicMediaKitPoint } from '../lib/publicMediaKit';
import { addToCart, formatAddress, getCartCount } from '../lib/menuCart';
import {
  applyAgencyMarkup,
  buildMenuUrl,
  getAgencyMarkupPercent,
  getMenuCatalogQueryParams,
  getMenuEntryUrl,
  isAgencyFlow,
} from '../lib/menuFlow';
import { buildPromoPrice, formatPromotionBadge, getEffectivePromotion, pickBestPromoForPoint } from '../lib/menuPromotions';
import { formatBRL } from '../lib/format';

function formatCurrencyBRL(value?: number | null): string {
  return formatBRL(value, '—');
}

function buildSavingsMeta(from: number | null | undefined, to: number | null | undefined) {
  if (typeof from !== 'number' || typeof to !== 'number') return null;
  if (!Number.isFinite(from) || !Number.isFinite(to) || from <= to || from <= 0) return null;
  const amount = from - to;
  const percent = Math.max(1, Math.round((amount / from) * 100));
  return { amount, percent };
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
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

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

function isUnitSelectable(unit: any): boolean {
  if (!unit) return false;
  if (unit.isActive === false) return false;
  if (unit.isAvailable === false) return false;
  if (unit.isOccupied === true) return false;
  const availability = String(unit.availability || '').trim();
  if (availability && availability !== 'Disponível') return false;
  return true;
}

function formatAvailabilityDate(value?: string | null): string | null {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(dt);
  } catch {
    return dt.toLocaleDateString('pt-BR');
  }
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

function getAvailabilityTone(status: string | null) {
  if (status === 'Disponível') {
    return {
      badge: 'border-emerald-200/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-50',
      card: 'from-emerald-500/12 to-teal-400/12 border-emerald-100',
    };
  }
  if (status === 'Parcial') {
    return {
      badge: 'border-amber-200/80 bg-amber-50 text-amber-700 hover:bg-amber-50',
      card: 'from-amber-500/12 to-orange-400/12 border-amber-100',
    };
  }
  return {
    badge: 'border-rose-200/80 bg-rose-50 text-rose-700 hover:bg-rose-50',
    card: 'from-rose-500/12 to-orange-400/12 border-rose-100',
  };
}

function GalleryFrame({ src, alt, className = '', imageClassName = '' }: { src?: string | null; alt: string; className?: string; imageClassName?: string }) {
  if (!src) {
    return (
      <div className={`relative overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top,#eff6ff_0%,#dbeafe_42%,#f8fafc_100%)] ${className}`}>
        <div className="absolute inset-x-0 top-0 h-24 bg-white/40 blur-2xl" />
        <div className="relative flex h-full min-h-[160px] items-center justify-center px-6 py-8 text-center">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sem imagem</div>
            <div className="mt-2 text-sm text-slate-700">A visualização da mídia aparecerá aqui.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top,#eff6ff_0%,#dbeafe_42%,#f8fafc_100%)] ${className}`}>
      <div className="absolute inset-x-0 top-0 h-24 bg-white/40 blur-2xl" />
      <ImageWithFallback
        src={src}
        alt={alt}
        className={`relative h-full w-full object-contain p-4 ${imageClassName}`}
      />
    </div>
  );
}

export default function MenuDetalhe() {
  const navigate = useNavigation();

  const query = useMemo(() => getMenuCatalogQueryParams(), []);

  const { token, pointId, uf, city, flow, ownerCompanyId, source } = query;

  const { data, loading, error } = usePublicMediaKit({ token, ownerCompanyId, flow });
  const point = useMemo(() => {
    const points = data?.points ?? [];
    return points.find((p) => String(p.id) === String(pointId)) ?? null;
  }, [data?.points, pointId]);

  const isAgency = isAgencyFlow(flow);
  const markupPct = isAgency ? getAgencyMarkupPercent(data?.company) : 0;
  const isPromotions = flow === 'promotions';

  const bestPromoPointMonth = useMemo(() => {
    if (!point || !isPromotions) return null;
    const promo = pickBestPromoForPoint(point as any, 'month');
    if (!promo) return null;
    const from = applyAgencyMarkup(promo.from, markupPct);
    const to = applyAgencyMarkup(promo.to, markupPct);
    if (from === null || to === null) return null;
    return { from, to, promotion: promo.promotion };
  }, [point, isPromotions, markupPct]);

  const bestPromoPointWeek = useMemo(() => {
    if (!point || !isPromotions) return null;
    const promo = pickBestPromoForPoint(point as any, 'week');
    if (!promo) return null;
    const from = applyAgencyMarkup(promo.from, markupPct);
    const to = applyAgencyMarkup(promo.to, markupPct);
    if (from === null || to === null) return null;
    return { from, to, promotion: promo.promotion };
  }, [point, isPromotions, markupPct]);

  const priceMonthSummary = useMemo(() => (point ? computePointPriceSummary(point as any, 'month') : null), [point]);
  const priceWeekSummary = useMemo(() => (point ? computePointPriceSummary(point as any, 'week') : null), [point]);
  const promoPointMonthSavings = buildSavingsMeta(bestPromoPointMonth?.from, bestPromoPointMonth?.to);
  const promoPointWeekSavings = buildSavingsMeta(bestPromoPointWeek?.from, bestPromoPointWeek?.to);

  const showStartingFrom = !!priceMonthSummary?.isStartingFrom && !isPromotions;
  const priceLabel = (isPromotions || showStartingFrom) ? 'A partir de' : 'Preço';

  const displayMonthRaw = priceMonthSummary ? (priceMonthSummary.isStartingFrom ? priceMonthSummary.startingFrom : priceMonthSummary.base) : null;
  const displayWeekRaw = priceWeekSummary ? (priceWeekSummary.isStartingFrom ? priceWeekSummary.startingFrom : priceWeekSummary.base) : null;

  const displayMonth = applyAgencyMarkup(displayMonthRaw, markupPct);
  const displayWeek = applyAgencyMarkup(displayWeekRaw, markupPct);

  const baseMonth = applyAgencyMarkup(priceMonthSummary?.base, markupPct);
  const baseWeek = applyAgencyMarkup(priceWeekSummary?.base, markupPct);

  const [cartCount, setCartCount] = useState<number>(() => {
    try {
      return getCartCount();
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    try {
      setCartCount(getCartCount());
    } catch {
      setCartCount(0);
    }
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

  const backUrl = useMemo(() => getMenuEntryUrl(query), [query]);
  const cartUrl = useMemo(() => buildMenuUrl('/menu/carrinho', query), [query]);

  const onAdd = () => {
    if (!point) return;

    const units = Array.isArray(point.units) ? point.units.filter((u: any) => u?.isActive !== false) : [];
    const selectableUnits = units.filter((u: any) => isUnitSelectable(u));
    if (selectableUnits.length > 1) {
      navigate(buildMenuUrl('/menu/faces', query, { pointId: point.id }));
      return;
    }

    const unit = selectableUnits.length === 1 ? selectableUnits[0] : null;
    if (!unit && units.length > 0) {
      toast.error('Este ponto está indisponível no momento.');
      return;
    }
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
  const availabilityTone = getAvailabilityTone(availability);
  const mediaType = point ? (normalizeMediaType(point.type) ?? (point.type as any)) : null;

  const units = useMemo(() => {
    const list = Array.isArray(point?.units) ? point!.units!.filter((u: any) => u?.isActive !== false) : [];
    return list;
  }, [point]);

  const selectableUnitsCount = useMemo(() => units.filter((u: any) => isUnitSelectable(u)).length, [units]);

  const gallery = useMemo(() => {
    const urls = [point?.mainImageUrl, ...units.map((u) => u.imageUrl || '')]
      .map((u) => String(u || '').trim())
      .filter(Boolean);
    return Array.from(new Set(urls));
  }, [point?.mainImageUrl, units]);

  const [selectedImage, setSelectedImage] = useState<string>('');

  useEffect(() => {
    setSelectedImage(gallery[0] || '');
  }, [gallery]);

  const mapsUrl = point ? makeMapsUrl(point) : 'https://www.google.com/maps';
  const mapsEmbed = point ? makeMapsEmbedUrl(point) : null;

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f6f8fc_0%,#edf3ff_28%,#f8fafc_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="rounded-full border border-white/60 bg-white/90 px-3 text-slate-700 shadow-sm backdrop-blur-sm">Protótipo</Badge>
          {source === 'catalog' && (
            <Badge variant="outline" className="rounded-full border-slate-200 bg-white/90 px-3 text-slate-700 shadow-sm backdrop-blur-sm">
              Novo catálogo
            </Badge>
          )}
          <div className="text-sm text-slate-600">Detalhes do ponto</div>
          <div className="ml-auto flex items-center gap-2">
            {cartCount > 0 && (
              <Button variant="outline" className="gap-2 rounded-2xl border-slate-200 bg-white/90 shadow-sm" onClick={() => navigate(cartUrl)}>
                <ShoppingCart className="h-4 w-4" />
                Ver carrinho ({cartCount})
              </Button>
            )}
            <Button variant="ghost" className="gap-2 rounded-2xl" onClick={() => navigate(backUrl)}>
              <ArrowLeft className="h-4 w-4" />
              {source === 'catalog' ? 'Voltar ao catálogo' : 'Voltar'}
            </Button>
          </div>
        </div>

        {error && <Card className="mt-5 rounded-[28px] border-amber-200 bg-amber-50"><CardContent className="py-4"><div className="text-sm font-semibold text-amber-900">Não foi possível carregar</div><div className="mt-1 text-sm text-amber-800">{error}</div></CardContent></Card>}
        {loading && !point && <Card className="mt-5 animate-pulse rounded-[30px] border-slate-200 bg-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.05)]"><CardContent className="py-6"><div className="h-5 w-56 rounded bg-slate-200" /><div className="mt-3 h-3 w-80 rounded bg-slate-200" /><div className="mt-6 aspect-[1/1] max-w-xl rounded-[24px] bg-slate-200" /><div className="mt-4 grid grid-cols-3 gap-3"><div className="aspect-square rounded-2xl bg-slate-200" /><div className="aspect-square rounded-2xl bg-slate-200" /><div className="aspect-square rounded-2xl bg-slate-200" /></div></CardContent></Card>}
        {!loading && !error && !point && <Card className="mt-5 rounded-[28px] border-slate-200 bg-white/90"><CardContent className="py-6"><div className="text-sm font-semibold text-slate-900">Não achei esse ponto</div><div className="mt-1 text-sm text-slate-600">Volte para a lista e escolha outro ponto.</div><div className="mt-4"><Button variant="outline" className="rounded-2xl" onClick={() => navigate(backUrl)}>{source === 'catalog' ? 'Voltar ao catálogo' : 'Voltar para os pontos'}</Button></div></CardContent></Card>}

        {point && (
          <div className="mt-5 space-y-5">
            <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f6f9ff_50%,#ebf2ff_100%)] p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)] sm:p-6 lg:p-7">
              <div className="absolute -left-14 top-0 h-48 w-48 rounded-full bg-indigo-200/35 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-sky-200/35 blur-3xl" />
              <div className="relative grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
                <div className="space-y-3">
                  <GalleryFrame src={selectedImage || gallery[0] || ''} alt={point.name} className="aspect-square shadow-[0_16px_42px_rgba(15,23,42,0.08)]" imageClassName="transition-transform duration-300 hover:scale-[1.02]" />
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {(gallery.length > 0 ? gallery : ['']).slice(0, 10).map((url, idx) => {
                      const isActive = (selectedImage || gallery[0] || '') === url;
                      return (
                        <button
                          key={`${url || 'fallback'}-${idx}`}
                          type="button"
                          onClick={() => setSelectedImage(url)}
                          className={`overflow-hidden rounded-[20px] border text-left transition-all duration-200 ${isActive ? 'border-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.16)]' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
                        >
                          <GalleryFrame src={url} alt={`${point.name} ${idx + 1}`} className="aspect-square rounded-[20px] border-0" imageClassName="p-2" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    {mediaType && <Badge className="rounded-full border border-slate-200 bg-white/90 text-slate-700 hover:bg-white">{mediaType}</Badge>}
                    {availability && (
                      <Badge className={`rounded-full border ${availabilityTone.badge}`}>
                        {availability}
                      </Badge>
                    )}
                    {isPromotions && (bestPromoPointMonth || bestPromoPointWeek || (point as any)?.promotion) && (
                      <Badge className="rounded-full border-0 bg-rose-500 text-white hover:bg-rose-500">
                        {formatPromotionBadge((bestPromoPointMonth?.promotion || bestPromoPointWeek?.promotion || (point as any).promotion) as any) || 'Promoção'}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.25rem] sm:leading-[1.08]">
                      {point.name}
                    </h1>
                    <div className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                      Catálogo visual com foco em leitura rápida: imagem da mídia, preço, disponibilidade, mapa e faces organizadas para uma decisão mais intuitiva.
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/70 bg-white/75 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)] backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-2xl bg-slate-900 p-2 text-white shadow-sm"><MapPin className="h-4 w-4" /></div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Endereço</div>
                        <div className="mt-2 text-sm leading-6 text-slate-700">{formatAddress(point) || 'Endereço não informado ainda'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[24px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 px-4 py-4 text-white shadow-[0_14px_36px_rgba(15,23,42,0.1)]">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-white/70">{priceLabel}</div>
                      <div className="mt-2 text-[1.65rem] font-semibold leading-none">{isPromotions && bestPromoPointMonth ? formatCurrencyBRL(bestPromoPointMonth.to) : formatCurrencyBRL(displayMonth)}</div>
                      {isPromotions && bestPromoPointMonth ? (
                        <div className="mt-2 text-sm text-white/60 line-through">{formatCurrencyBRL(bestPromoPointMonth.from)}</div>
                      ) : showStartingFrom && baseMonth !== null && baseMonth !== undefined ? (
                        <div className="mt-2 text-sm text-white/65">Padrão {formatCurrencyBRL(baseMonth)}</div>
                      ) : null}
                      {promoPointMonthSavings && <div className="mt-3 text-xs font-medium text-emerald-200">Economia de {formatCurrencyBRL(promoPointMonthSavings.amount)}</div>}
                    </div>

                    <div className="rounded-[24px] bg-gradient-to-br from-sky-500 to-cyan-400 px-4 py-4 text-slate-950 shadow-[0_14px_36px_rgba(56,189,248,0.18)]">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-900/60">Bi-semana</div>
                      <div className="mt-2 text-[1.65rem] font-semibold leading-none">{isPromotions && bestPromoPointWeek ? formatCurrencyBRL(bestPromoPointWeek.to) : formatCurrencyBRL(displayWeek)}</div>
                      {isPromotions && bestPromoPointWeek ? (
                        <div className="mt-2 text-sm text-slate-900/45 line-through">{formatCurrencyBRL(bestPromoPointWeek.from)}</div>
                      ) : showStartingFrom && baseWeek !== null && baseWeek !== undefined ? (
                        <div className="mt-2 text-sm text-slate-900/60">Padrão {formatCurrencyBRL(baseWeek)}</div>
                      ) : null}
                      {promoPointWeekSavings && <div className="mt-3 text-xs font-medium text-slate-900/80">Economia de {formatCurrencyBRL(promoPointWeekSavings.amount)}</div>}
                    </div>

                    <div className={`rounded-[24px] border bg-gradient-to-br px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)] ${availabilityTone.card}`}>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Unidades</div>
                      <div className="mt-2 text-[1.65rem] font-semibold leading-none text-slate-950">{units.length}</div>
                      <div className="mt-2 text-sm text-slate-600">{selectableUnitsCount} disponível(is) no momento</div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
                        <div className="h-full rounded-full bg-slate-900" style={{ width: `${units.length > 0 ? Math.max(8, Math.round((selectableUnitsCount / units.length) * 100)) : 8}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                      <div className="flex items-center gap-2 text-slate-900"><ShieldCheck className="h-4 w-4" /><span className="text-sm font-semibold">Resumo comercial</span></div>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600">
                        <div className="flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2.5"><Sparkles className="mt-0.5 h-4 w-4 text-indigo-600" /><span>{showStartingFrom ? 'Preços exibidos como ponto de partida para acomodar variações entre faces.' : 'Valores apresentados para leitura rápida da oportunidade.'}</span></div>
                        <div className="flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2.5"><Layers className="mt-0.5 h-4 w-4 text-slate-700" /><span>{units.length > 1 ? 'Este ponto possui múltiplas faces/telas para seleção.' : 'Este ponto pode ser adicionado direto ao carrinho quando houver disponibilidade.'}</span></div>
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                      <div className="flex items-center gap-2 text-slate-900"><Tag className="h-4 w-4" /><span className="text-sm font-semibold">Dados úteis</span></div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Cidade</div>
                          <div className="mt-1 font-semibold text-slate-900">{point.addressCity || city || '—'}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">UF</div>
                          <div className="mt-1 font-semibold text-slate-900">{point.addressState || uf || '—'}</div>
                        </div>
                        <div className="col-span-2 rounded-2xl bg-slate-50 px-3 py-3">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Impacto diário</div>
                          <div className="mt-1 font-semibold text-slate-900">{typeof point.dailyImpressions === 'number' ? `${point.dailyImpressions} impactos/dia` : 'Não informado'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button className="h-12 gap-2 rounded-2xl shadow-sm" onClick={onAdd} disabled={units.length > 0 && selectableUnitsCount === 0}>
                      <ShoppingCart className="h-4 w-4" />
                      {units.length > 1 ? 'Escolher faces/telas' : 'Adicionar no carrinho'}
                    </Button>
                    <Button variant="outline" className="h-12 rounded-2xl border-slate-200 bg-white/90 shadow-sm" onClick={() => navigate(backUrl)}>
                      {source === 'catalog' ? 'Voltar ao catálogo' : 'Voltar para os pontos'}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-5">
                <Card className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur-sm">
                  <div className="h-1.5 bg-gradient-to-r from-slate-950 via-indigo-600 to-sky-400" />
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-slate-900"><GalleryHorizontal className="h-4 w-4" /><span className="text-sm font-semibold">Visuais do ponto</span></div>
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Formato quadrado</div>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      As imagens ficam em blocos mais equilibrados para facilitar a leitura do inventário sem cortes agressivos.
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {gallery.length > 0 ? gallery.slice(0, 6).map((url, idx) => (
                        <button key={`${url}-${idx}`} type="button" onClick={() => setSelectedImage(url)} className="text-left">
                          <GalleryFrame src={url} alt={`${point.name} ${idx + 1}`} className="aspect-square transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,0.09)]" imageClassName="p-3" />
                        </button>
                      )) : <div className="col-span-full flex h-40 items-center justify-center rounded-[22px] border border-slate-200 bg-slate-50 text-sm text-slate-500">Nenhuma imagem disponível</div>}
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur-sm">
                  <div className="h-1.5 bg-gradient-to-r from-slate-950 via-indigo-600 to-sky-400" />
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">Localização</div>
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Mapa do inventário</div>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      Confirme o entorno do ponto e use o atalho para abrir o endereço no Google Maps quando precisar validar o local exato.
                    </div>
                    <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-100 shadow-inner">
                      {mapsEmbed ? (
                        <iframe title="Mapa" src={mapsEmbed} className="h-64 w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                      ) : (
                        <div className="flex h-64 w-full items-center justify-center px-6 text-center text-sm text-slate-600">Coordenadas não informadas — use o botão abaixo para abrir o endereço no Maps.</div>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50">
                        Abrir no Maps
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <div className="text-sm text-slate-600">{point.addressDistrict ? `${point.addressDistrict} • ` : ''}{point.addressCity || ''}{point.addressState ? `/${point.addressState}` : ''}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-[28px] border border-slate-200 bg-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur-sm xl:sticky xl:top-6 xl:self-start">
                <div className="h-1.5 bg-gradient-to-r from-slate-950 via-indigo-600 to-sky-400" />
                <CardContent className="space-y-4 p-5 sm:p-6">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Faces/telas cadastradas</div>
                    <div className="mt-1 text-sm leading-6 text-slate-600">Cada unidade aparece como subcard mais compacto, com miniatura quadrada, status e preços visíveis sem exagero de tamanho.</div>
                  </div>
                  <div className="space-y-3">
                    {units.length > 0 ? units.map((u) => {
                      const unitPromo = isPromotions ? getEffectivePromotion(u as any, point as any) : null;
                      const promoBadge = unitPromo ? formatPromotionBadge(unitPromo) : null;
                      const promoMonthRaw = unitPromo ? buildPromoPrice((u as any).priceMonth ?? (point as any).basePriceMonth, unitPromo) : null;
                      const promoWeekRaw = unitPromo ? buildPromoPrice((u as any).priceWeek ?? (point as any).basePriceWeek, unitPromo) : null;
                      const promoMonth = promoMonthRaw ? { from: applyAgencyMarkup(promoMonthRaw.from, markupPct), to: applyAgencyMarkup(promoMonthRaw.to, markupPct) } : null;
                      const promoWeek = promoWeekRaw ? { from: applyAgencyMarkup(promoWeekRaw.from, markupPct), to: applyAgencyMarkup(promoWeekRaw.to, markupPct) } : null;
                      const promoMonthSavings = buildSavingsMeta(promoMonth?.from, promoMonth?.to);
                      const promoWeekSavings = buildSavingsMeta(promoWeek?.from, promoWeek?.to);
                      const baseMonthUnit = applyAgencyMarkup((u as any).priceMonth ?? (point as any).basePriceMonth, markupPct);
                      const baseWeekUnit = applyAgencyMarkup((u as any).priceWeek ?? (point as any).basePriceWeek, markupPct);
                      const isUnavailable = !isUnitSelectable(u);
                      const unitStatusLabel = String(u.availability || '').trim() || (isUnavailable ? 'Indisponível' : 'Disponível');
                      return (
                        <div key={u.id} className={`rounded-[24px] border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,0.07)] ${isUnavailable ? 'border-amber-200 bg-amber-50/75' : 'border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] hover:border-slate-300'}`}>
                          <div className="flex flex-col gap-4 sm:flex-row">
                            <GalleryFrame src={u.imageUrl || point.mainImageUrl || ''} alt={u.label} className="aspect-square w-full max-w-[120px] shrink-0 rounded-[22px]" imageClassName="p-3" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-semibold text-slate-900">{u.unitType === 'SCREEN' ? 'Tela' : 'Face'} {u.label}</div>
                                <Badge className={`rounded-full border ${isUnavailable ? 'border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50'}`}>{isUnavailable ? unitStatusLabel : 'Disponível'}</Badge>
                                {isPromotions && promoBadge && <Badge className="rounded-full border-0 bg-rose-500 text-white hover:bg-rose-500">{promoBadge}</Badge>}
                              </div>
                              <div className="mt-2 text-sm leading-6 text-slate-600">{u.widthM && u.heightM ? `${u.widthM}m × ${u.heightM}m` : 'Dimensões não informadas'}{u.orientation ? ` • ${u.orientation}` : ''}</div>
                              {isUnavailable && formatAvailabilityDate((u as any).availableOn) && <div className="mt-2 text-xs font-medium text-amber-800">Livre para nova seleção em {formatAvailabilityDate((u as any).availableOn)}.</div>}
                              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-700">
                                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3"><div className="flex items-center justify-between gap-2"><div className="text-slate-500">Mensal</div>{promoMonthSavings && <Badge className="rounded-full border-0 bg-emerald-500/10 px-2 text-emerald-700 hover:bg-emerald-500/10">-{promoMonthSavings.percent}%</Badge>}</div><div className="mt-1 text-sm font-semibold text-slate-900">{promoMonth ? formatCurrencyBRL(promoMonth.to) : formatCurrencyBRL(baseMonthUnit)}</div>{promoMonth && <div className="text-slate-400 line-through">{formatCurrencyBRL(promoMonth.from)}</div>}</div>
                                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3"><div className="flex items-center justify-between gap-2"><div className="text-slate-500">Bi-semana</div>{promoWeekSavings && <Badge className="rounded-full border-0 bg-emerald-500/10 px-2 text-emerald-700 hover:bg-emerald-500/10">-{promoWeekSavings.percent}%</Badge>}</div><div className="mt-1 text-sm font-semibold text-slate-900">{promoWeek ? formatCurrencyBRL(promoWeek.to) : formatCurrencyBRL(baseWeekUnit)}</div>{promoWeek && <div className="text-slate-400 line-through">{formatCurrencyBRL(promoWeek.from)}</div>}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }) : <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">Nenhuma face/tela cadastrada neste ponto.</div>}
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
