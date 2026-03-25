import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, ExternalLink, GalleryHorizontal, Layers, MapPin, ShoppingCart, Sparkles, Tag, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { usePublicMediaKit } from '../hooks/usePublicMediaKit';
import { computePointPriceSummary, normalizeAvailability, normalizeMediaType, PublicMediaKitPoint } from '../lib/publicMediaKit';
import { addToCart, formatAddress, getCartCount } from '../lib/menuCart';
import { applyAgencyMarkup, getAgencyMarkupPercent, getMenuQueryParams, isAgencyFlow } from '../lib/menuFlow';
import { buildPromoPrice, formatPromotionBadge, getEffectivePromotion, pickBestPromoForPoint } from '../lib/menuPromotions';
import { formatBRL } from '../lib/format';

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

export default function MenuDetalhe() {
  const navigate = useNavigation();

  const { token, pointId, uf, city, flow, ownerCompanyId } = useMemo(() => {
    const qp = getMenuQueryParams();
    return {
      token: qp.token,
      pointId: qp.pointId,
      uf: qp.uf,
      city: qp.city,
      flow: qp.flow,
      ownerCompanyId: qp.ownerCompanyId,
    };
  }, []);

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

  const backUrl = useMemo(() => `/menu/pontos${buildQuery({ token, uf, city, flow, ownerCompanyId })}`,[token, uf, city, flow, ownerCompanyId]);

  const onAdd = () => {
    if (!point) return;

    const units = Array.isArray(point.units) ? point.units.filter((u: any) => u?.isActive !== false) : [];
    const selectableUnits = units.filter((u: any) => isUnitSelectable(u));
    if (selectableUnits.length > 1) {
      navigate(`/menu/faces${buildQuery({ token, pointId: point.id, uf, city, flow, ownerCompanyId })}`);
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

  const mapsUrl = point ? makeMapsUrl(point) : 'https://www.google.com/maps';
  const mapsEmbed = point ? makeMapsEmbedUrl(point) : null;

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_42%,#f8fafc_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="rounded-full bg-white px-3 text-slate-700 shadow-sm">Protótipo</Badge>
          <div className="text-sm text-slate-600">Detalhes do ponto</div>
          <div className="ml-auto flex items-center gap-2">
            {cartCount > 0 && (
              <Button variant="outline" className="gap-2 rounded-2xl border-slate-200 bg-white" onClick={() => navigate(`/menu/carrinho${buildQuery({ token, uf, city, flow, ownerCompanyId })}`)}>
                <ShoppingCart className="h-4 w-4" />
                Ver carrinho ({cartCount})
              </Button>
            )}
            <Button variant="ghost" className="gap-2 rounded-2xl" onClick={() => navigate(backUrl)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        {error && <Card className="mt-5 rounded-[28px] border-amber-200 bg-amber-50"><CardContent className="py-4"><div className="text-sm font-semibold text-amber-900">Não foi possível carregar</div><div className="mt-1 text-sm text-amber-800">{error}</div></CardContent></Card>}
        {loading && !point && <Card className="mt-5 animate-pulse rounded-[30px] border-slate-200 bg-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.05)]"><CardContent className="py-6"><div className="h-5 w-56 rounded bg-slate-200" /><div className="mt-3 h-3 w-80 rounded bg-slate-200" /><div className="mt-6 h-64 w-full rounded-[24px] bg-slate-200" /><div className="mt-4 grid grid-cols-3 gap-3"><div className="h-24 rounded-2xl bg-slate-200" /><div className="h-24 rounded-2xl bg-slate-200" /><div className="h-24 rounded-2xl bg-slate-200" /></div></CardContent></Card>}
        {!loading && !error && !point && <Card className="mt-5 rounded-[28px] border-slate-200 bg-white/90"><CardContent className="py-6"><div className="text-sm font-semibold text-slate-900">Não achei esse ponto</div><div className="mt-1 text-sm text-slate-600">Volte para a lista e escolha outro ponto.</div><div className="mt-4"><Button variant="outline" className="rounded-2xl" onClick={() => navigate(backUrl)}>Voltar para os pontos</Button></div></CardContent></Card>}

        {point && (
          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.95fr]">
            <div className="space-y-5">
              <Card className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_38px_rgba(15,23,42,0.06)]">
                <div className="relative h-[260px] bg-slate-100 sm:h-[310px]">
                  <ImageWithFallback src={gallery[0] || ''} alt={point.name} className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
                  <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                    {mediaType && <Badge className="rounded-full border border-white/20 bg-white/90 text-slate-800 hover:bg-white/90">{mediaType}</Badge>}
                    {isPromotions && (bestPromoPointMonth || bestPromoPointWeek || (point as any)?.promotion) && (
                      <Badge className="rounded-full border-0 bg-rose-500 text-white hover:bg-rose-500">{formatPromotionBadge((bestPromoPointMonth?.promotion || bestPromoPointWeek?.promotion || (point as any).promotion) as any) || 'Promoção'}</Badge>
                    )}
                    {availability && (
                      <Badge className={availability === 'Disponível' ? 'rounded-full border-0 bg-emerald-500 text-white hover:bg-emerald-500' : availability === 'Parcial' ? 'rounded-full border-0 bg-amber-400 text-amber-950 hover:bg-amber-400' : 'rounded-full border-0 bg-rose-400 text-rose-950 hover:bg-rose-400'}>
                        {availability}
                      </Badge>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="text-xl font-semibold tracking-tight">{point.name}</div>
                    <div className="mt-2 max-w-3xl text-sm text-white/80">{formatAddress(point) || 'Endereço não informado ainda'}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <div className="inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
                        <Sparkles className="h-3.5 w-3.5" />
                        Leitura comercial refinada
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
                        Veja galeria, mapa e unidades no mesmo fluxo
                      </div>
                    </div>
                  </div>
                </div>

                <CardContent className="p-5">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{priceLabel}</div>
                        {promoPointMonthSavings && <Badge className="rounded-full border-0 bg-emerald-500/10 px-2.5 text-emerald-700 hover:bg-emerald-500/10">-{promoPointMonthSavings.percent}%</Badge>}
                      </div>
                      <div className="mt-2 text-xl font-semibold text-slate-900">{isPromotions && bestPromoPointMonth ? formatCurrencyBRL(bestPromoPointMonth.to) : formatCurrencyBRL(displayMonth)}</div>
                      {isPromotions && bestPromoPointMonth ? <div className="mt-1 text-sm text-slate-500 line-through">{formatCurrencyBRL(bestPromoPointMonth.from)}</div> : showStartingFrom && baseMonth !== null && baseMonth !== undefined ? <div className="mt-1 text-sm text-slate-500">Padrão {formatCurrencyBRL(baseMonth)}</div> : null}
                      {promoPointMonthSavings && <div className="mt-3 text-xs font-medium text-emerald-700">Economia de {formatCurrencyBRL(promoPointMonthSavings.amount)}</div>}
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Bi-semana</div>
                        {promoPointWeekSavings && <Badge className="rounded-full border-0 bg-emerald-500/10 px-2.5 text-emerald-700 hover:bg-emerald-500/10">-{promoPointWeekSavings.percent}%</Badge>}
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{isPromotions && bestPromoPointWeek ? formatCurrencyBRL(bestPromoPointWeek.to) : formatCurrencyBRL(displayWeek)}</div>
                      {isPromotions && bestPromoPointWeek ? <div className="mt-1 text-sm text-slate-500 line-through">{formatCurrencyBRL(bestPromoPointWeek.from)}</div> : showStartingFrom && baseWeek !== null && baseWeek !== undefined ? <div className="mt-1 text-sm text-slate-500">Padrão {formatCurrencyBRL(baseWeek)}</div> : null}
                      {promoPointWeekSavings && <div className="mt-3 text-xs font-medium text-emerald-700">Economia de {formatCurrencyBRL(promoPointWeekSavings.amount)}</div>}
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Unidades ativas</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{units.length}</div>
                      <div className="mt-1 text-sm text-slate-500">{selectableUnitsCount} disponível(is)</div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-slate-900" style={{ width: `${units.length > 0 ? Math.max(8, Math.round((selectableUnitsCount / units.length) * 100)) : 8}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Button className="h-11 gap-2 rounded-2xl" onClick={onAdd} disabled={units.length > 0 && selectableUnitsCount === 0}>
                      <ShoppingCart className="h-4 w-4" />
                      {units.length > 1 ? 'Escolher faces/telas' : 'Adicionar no carrinho'}
                    </Button>
                    <Button variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white" onClick={() => navigate(backUrl)}>Voltar para os pontos</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-slate-900"><GalleryHorizontal className="h-4 w-4" /><span className="text-sm font-semibold">Galeria do ponto</span></div>
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Visual principal</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">Use esta galeria para validar o contexto visual do inventário antes de escolher faces ou adicionar ao carrinho.</div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {gallery.length > 0 ? gallery.slice(0, 6).map((url, idx) => (
                      <div key={`${url}-${idx}`} className="h-32 overflow-hidden rounded-[18px] bg-slate-100">
                        <ImageWithFallback src={url} alt={`${point.name} ${idx + 1}`} className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
                      </div>
                    )) : <div className="col-span-full flex h-32 items-center justify-center rounded-[18px] bg-slate-100 text-sm text-slate-500">Nenhuma imagem disponível</div>}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">Mapa</div>
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Localização do inventário</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">Confirme o entorno do ponto e utilize o atalho para o Maps quando precisar validar o endereço completo.</div>
                  <div className="mt-4 overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100">
                    {mapsEmbed ? <iframe title="Mapa" src={mapsEmbed} className="h-56 w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className="flex h-56 w-full items-center justify-center text-sm text-slate-600">Coordenadas não informadas — use o botão “Abrir no Maps”.</div>}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
              <Card className="rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                <CardContent className="space-y-4 p-6">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Resumo do ponto</div>
                    <div className="mt-1 text-sm text-slate-600">Bloco pensado para leitura rápida de disponibilidade, localização e impacto antes da decisão.</div>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center gap-2 text-slate-700"><Layers className="h-4 w-4" /><span className="font-semibold">Faces/Telas</span></div>
                      <div className="mt-2 text-sm text-slate-600">{units.length > 0 ? `${units.length} unidade(s) ativa(s)` : '—'}</div>
                      {typeof point.dailyImpressions === 'number' && <div className="mt-2 text-sm text-slate-600"><span className="font-semibold">Impacto/dia:</span> {point.dailyImpressions}</div>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 text-slate-600">{selectableUnitsCount} disponível(is)</Badge>
                        <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 text-slate-600">{isPromotions ? 'Condição promocional' : 'Tabela ativa'}</Badge>
                        {promoPointMonthSavings && <Badge className="rounded-full border-0 bg-emerald-500/10 px-3 text-emerald-700 hover:bg-emerald-500/10">Economia mensal {formatCurrencyBRL(promoPointMonthSavings.amount)}</Badge>}
                      </div>
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center gap-2 text-slate-700"><MapPin className="h-4 w-4" /><span className="font-semibold">Localização</span></div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">{point.addressDistrict ? `${point.addressDistrict} • ` : ''}{point.addressCity || ''}{point.addressState ? `/${point.addressState}` : ''}</div>
                      <div className="mt-3"><a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700">Abrir no Maps<ExternalLink className="h-4 w-4" /></a></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                <CardContent className="space-y-4 p-6">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Faces/telas cadastradas</div>
                    <div className="mt-1 text-sm text-slate-600">Cada unidade fica organizada como subcard para manter preço, status e imagem visíveis sem misturar informações.</div>
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
                      return (
                        <div key={u.id} className={`rounded-[18px] border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.07)] ${isUnavailable ? 'border-amber-200 bg-amber-50/80' : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'}`}>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-slate-900">{u.unitType === 'SCREEN' ? 'Tela' : 'Face'} {u.label}</div>
                            {isUnavailable && <Badge className="rounded-full border-0 bg-amber-100 text-amber-900 hover:bg-amber-100">{String(u.availability || '').trim() === 'Reservada' ? 'Reservada' : 'Ocupada'}</Badge>}
                            {isPromotions && promoBadge && <Badge className="rounded-full border-0 bg-rose-500 text-white hover:bg-rose-500">{promoBadge}</Badge>}
                          </div>
                          <div className="mt-1 text-xs text-slate-600">{u.widthM && u.heightM ? `${u.widthM}m × ${u.heightM}m` : 'Dimensões não informadas'}{u.orientation ? ` • ${u.orientation}` : ''}{!isUnitSelectable(u) ? ` • ${String(u.availability || '').trim() === 'Reservada' ? 'reservada' : 'indisponível no momento'}` : ''}</div>
                          {isUnavailable && formatAvailabilityDate((u as any).availableOn) && <div className="mt-2 text-xs text-amber-800">Livre para nova seleção em <span className="font-semibold">{formatAvailabilityDate((u as any).availableOn)}</span>.</div>}
                          <Separator className="my-3" />
                          <div className="grid grid-cols-2 gap-3 text-xs text-slate-700">
                            <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between gap-2"><div className="text-slate-500">Mensal</div>{promoMonthSavings && <Badge className="rounded-full border-0 bg-emerald-500/10 px-2 text-emerald-700 hover:bg-emerald-500/10">-{promoMonthSavings.percent}%</Badge>}</div><div className="mt-1 text-sm font-semibold text-slate-900">{promoMonth ? formatCurrencyBRL(promoMonth.to) : formatCurrencyBRL(baseMonthUnit)}</div>{promoMonth && <div className="text-slate-400 line-through">{formatCurrencyBRL(promoMonth.from)}</div>}{promoMonthSavings && <div className="mt-1 text-[11px] font-medium text-emerald-700">Economia {formatCurrencyBRL(promoMonthSavings.amount)}</div>}</div>
                            <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between gap-2"><div className="text-slate-500">Bi-semana</div>{promoWeekSavings && <Badge className="rounded-full border-0 bg-emerald-500/10 px-2 text-emerald-700 hover:bg-emerald-500/10">-{promoWeekSavings.percent}%</Badge>}</div><div className="mt-1 text-sm font-semibold text-slate-900">{promoWeek ? formatCurrencyBRL(promoWeek.to) : formatCurrencyBRL(baseWeekUnit)}</div>{promoWeek && <div className="text-slate-400 line-through">{formatCurrencyBRL(promoWeek.from)}</div>}{promoWeekSavings && <div className="mt-1 text-[11px] font-medium text-emerald-700">Economia {formatCurrencyBRL(promoWeekSavings.amount)}</div>}</div>
                          </div>
                          {u.imageUrl && <div className="mt-3 h-24 overflow-hidden rounded-[14px] bg-slate-100"><ImageWithFallback src={u.imageUrl} alt={u.label} className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" /></div>}
                        </div>
                      );
                    }) : <div className="text-sm text-slate-600">Nenhuma face/tela cadastrada neste ponto.</div>}
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
