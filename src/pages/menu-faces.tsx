import { useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Layers,
  MapPin,
  ShoppingCart,
  Sparkles,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePublicMediaKit } from '../hooks/usePublicMediaKit';
import { computePointPriceSummary, PublicMediaKitPoint } from '../lib/publicMediaKit';
import { addToCart, formatAddress, getCartCount } from '../lib/menuCart';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { MediaUnit } from '../types';
import {
  applyAgencyMarkup,
  buildMenuUrl,
  getAgencyMarkupPercent,
  getMenuCatalogQueryParams,
  getMenuEntryUrl,
  isAgencyFlow,
} from '../lib/menuFlow';
import { buildPromoPrice, formatPromotionBadge, getEffectivePromotion } from '../lib/menuPromotions';
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
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(dt);
  } catch {
    return dt.toLocaleDateString('pt-BR');
  }
}

function getAvailabilityLabel(unit: any): string {
  const raw = String(unit?.availability || '').trim();
  if (raw) return raw;
  return isUnitSelectable(unit) ? 'Disponível' : 'Indisponível';
}

function getAvailabilityTone(unit: any) {
  if (isUnitSelectable(unit)) {
    return {
      chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      panel: 'border-emerald-100 bg-emerald-50/80 text-emerald-800',
      dot: 'bg-emerald-500',
    };
  }

  if (String(unit?.availability || '').trim() === 'Reservada') {
    return {
      chip: 'border-amber-200 bg-amber-50 text-amber-700',
      panel: 'border-amber-100 bg-amber-50/90 text-amber-900',
      dot: 'bg-amber-500',
    };
  }

  return {
    chip: 'border-rose-200 bg-rose-50 text-rose-700',
    panel: 'border-rose-100 bg-rose-50/90 text-rose-900',
    dot: 'bg-rose-500',
  };
}

function UnitPreview({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-[22px] border border-slate-200 bg-[radial-gradient(circle_at_top,#eff6ff_0%,#dbeafe_42%,#f8fafc_100%)]">
        <div className="absolute inset-x-0 top-0 h-20 bg-white/50 blur-2xl" />
        <div className="relative flex h-full items-center justify-center px-5 text-center">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sem imagem</div>
            <div className="mt-2 text-sm text-slate-600">A visualização desta face aparecerá aqui.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-square overflow-hidden rounded-[22px] border border-slate-200 bg-[radial-gradient(circle_at_top,#eff6ff_0%,#dbeafe_42%,#f8fafc_100%)]">
      <div className="absolute inset-x-0 top-0 h-20 bg-white/50 blur-2xl" />
      <ImageWithFallback src={src} alt={alt} className="relative h-full w-full object-contain p-3" />
    </div>
  );
}

export default function MenuFaces() {
  const navigate = useNavigation();

  const query = useMemo(() => getMenuCatalogQueryParams(), []);
  const { token, pointId, uf, city, flow, ownerCompanyId, source } = query;

  const { data, loading, error } = usePublicMediaKit({ token, ownerCompanyId, flow });

  const isAgency = isAgencyFlow(flow);
  const markupPct = isAgency ? getAgencyMarkupPercent(data?.company) : 0;
  const isPromotions = flow === 'promotions';

  const point: PublicMediaKitPoint | null = useMemo(() => {
    const points = data?.points ?? [];
    return points.find((p) => String(p.id) === String(pointId)) ?? null;
  }, [data?.points, pointId]);

  const units: MediaUnit[] = useMemo(() => {
    const list = Array.isArray(point?.units) ? point!.units!.filter((u: any) => u?.isActive !== false) : [];
    return list as MediaUnit[];
  }, [point]);

  const selectableUnits = useMemo(() => units.filter((u: any) => isUnitSelectable(u)), [units]);
  const sortedUnits = useMemo(() => [...units].sort((a: any, b: any) => Number(isUnitSelectable(b)) - Number(isUnitSelectable(a))), [units]);

  const monthSummary = useMemo(() => (point ? computePointPriceSummary(point as any, 'month') : null), [point]);
  const weekSummary = useMemo(() => (point ? computePointPriceSummary(point as any, 'week') : null), [point]);

  const baseMonth = applyAgencyMarkup(monthSummary?.base, markupPct);
  const baseWeek = applyAgencyMarkup(weekSummary?.base, markupPct);
  const startingMonth = applyAgencyMarkup(monthSummary?.startingFrom, markupPct);
  const startingWeek = applyAgencyMarkup(weekSummary?.startingFrom, markupPct);

  const hasStartingFrom = !!monthSummary?.isStartingFrom;

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const selectedCount = selectedIds.length;
  const selectionProgress = selectableUnits.length > 0 ? Math.min(100, Math.round((selectedCount / selectableUnits.length) * 100)) : 0;

  const backUrl = useMemo(() => buildMenuUrl('/menu/detalhe', query, { pointId }), [query, pointId]);
  const cartUrl = useMemo(() => buildMenuUrl('/menu/carrinho', query), [query]);
  const entryUrl = useMemo(() => getMenuEntryUrl(query), [query]);

  const onToggle = (unitId: string, next: boolean) => {
    setSelected((prev) => ({ ...prev, [unitId]: next }));
  };

  const toggleUnitSelection = (unit: MediaUnit) => {
    if (!isUnitSelectable(unit)) return;
    const current = !!selected[unit.id];
    onToggle(unit.id, !current);
  };

  const onAddSelected = () => {
    if (!point) return;
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (ids.length === 0) {
      toast.info('Escolha pelo menos uma face/tela para continuar.');
      return;
    }

    let addedCount = 0;
    ids.forEach((id) => {
      const unit = units.find((u: any) => u.id === id) ?? null;
      if (!isUnitSelectable(unit)) return;
      const res = addToCart({ point, unit, duration: { years: 0, months: 1, days: 0 } });
      if (res.added) addedCount += 1;
    });

    if (addedCount > 0) {
      toast.success('Adicionado no carrinho', {
        description: `${addedCount} item(ns) adicionado(s).`,
      });
    } else {
      toast.info('Esses itens já estavam no seu carrinho.');
    }

    navigate(cartUrl);
  };

  const cartCount = useMemo(() => getCartCount(), [selectedCount, pointId]);

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_32%,#f8fafc_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-slate-700 shadow-sm backdrop-blur">
            Seleção de faces/telas
          </Badge>
          {source === 'catalog' && (
            <Badge variant="outline" className="rounded-full border-slate-200 bg-white/85 px-3 py-1 text-slate-700 shadow-sm backdrop-blur">
              Novo catálogo
            </Badge>
          )}
          {city && <div className="text-sm text-slate-600">{city}{uf ? ` • ${uf}` : ''}</div>}
          <div className="ml-auto flex items-center gap-2">
            {cartCount > 0 && (
              <Button
                variant="outline"
                className="gap-2 rounded-2xl border-slate-200 bg-white/90 shadow-sm"
                onClick={() => navigate(cartUrl)}
              >
                <ShoppingCart className="h-4 w-4" />
                Ver carrinho ({cartCount})
              </Button>
            )}
            <Button variant="ghost" className="gap-2 rounded-2xl text-slate-700" onClick={() => navigate(backUrl)}>
              <ArrowLeft className="h-4 w-4" />
              {source === 'catalog' ? 'Voltar ao detalhe do catálogo' : 'Voltar'}
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mt-5 rounded-[28px] border-amber-200 bg-amber-50 shadow-[0_16px_40px_rgba(245,158,11,0.08)]">
            <CardContent className="py-4">
              <div className="text-sm font-semibold text-amber-900">Não foi possível carregar</div>
              <div className="mt-1 text-sm text-amber-800">{error}</div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card className="mt-5 animate-pulse rounded-[30px] border-slate-200 bg-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
            <CardContent className="py-6">
              <div className="h-5 w-56 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-80 rounded bg-slate-200" />
              <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="h-56 rounded-[24px] bg-slate-200" />
                <div className="h-56 rounded-[24px] bg-slate-100" />
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && !point && (
          <Card className="mt-5 rounded-[28px] border-slate-200 bg-white/90">
            <CardContent className="py-6">
              <div className="text-sm font-semibold text-slate-900">Ponto não encontrado</div>
              <div className="mt-1 text-sm text-slate-600">Volte e selecione outro ponto.</div>
              <div className="mt-4">
                <Button variant="outline" className="rounded-2xl" onClick={() => navigate(entryUrl)}>
                  {source === 'catalog' ? 'Voltar ao catálogo' : 'Voltar para a lista'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {point && (
          <>
            <Card className="mt-5 overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/90 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur">
              <CardContent className="p-5 sm:p-6">
                <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
                  <div className="grid gap-4 md:grid-cols-[240px_1fr]">
                    <UnitPreview src={point.mainImageUrl || point.images?.[0] || ''} alt={point.name} />

                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-indigo-700 hover:bg-indigo-50">
                          <Layers className="mr-1.5 h-3.5 w-3.5" />
                          Escolha uma ou mais unidades
                        </Badge>
                        {isPromotions && (
                          <Badge className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-rose-700 hover:bg-rose-50">
                            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                            Tabela promocional
                          </Badge>
                        )}
                        {isAgency && !isPromotions && (
                          <Badge className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-violet-700 hover:bg-violet-50">
                            Agência + markup
                          </Badge>
                        )}
                      </div>

                      <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">{point.name}</h1>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            {formatAddress(point) || 'Endereço não informado'}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-slate-500">
                            <Layers className="h-4 w-4 text-slate-400" />
                            {units.length} unidade(s)
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Disponíveis</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-950">{selectableUnits.length}</div>
                          <div className="mt-1 text-xs text-slate-500">Unidades prontas para seleção imediata.</div>
                        </div>
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Mensal</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrencyBRL(baseMonth)}</div>
                          <div className="mt-1 text-xs text-slate-500">{hasStartingFrom && startingMonth !== null && startingMonth !== undefined ? `A partir de ${formatCurrencyBRL(startingMonth)}` : 'Base comercial do ponto.'}</div>
                        </div>
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Bi-semana</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrencyBRL(baseWeek)}</div>
                          <div className="mt-1 text-xs text-slate-500">{hasStartingFrom && startingWeek !== null && startingWeek !== undefined ? `A partir de ${formatCurrencyBRL(startingWeek)}` : 'Leitura rápida do período curto.'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Resumo comercial</div>
                        <div className="mt-2 text-lg font-semibold text-slate-950">Monte sua seleção final</div>
                      </div>
                      <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                        {selectedCount}/{selectableUnits.length || 0}
                      </div>
                    </div>

                    <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Seleção atual</div>
                          <div className="mt-1 text-sm text-slate-600">
                            {selectedCount > 0
                              ? `${selectedCount} unidade(s) pronta(s) para seguir ao carrinho.`
                              : 'Clique em uma ou mais faces/telas para montar o pedido.'}
                          </div>
                        </div>
                        <CheckCircle2 className={`h-5 w-5 ${selectedCount > 0 ? 'text-emerald-500' : 'text-slate-300'}`} />
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-slate-900 transition-all duration-300" style={{ width: `${selectionProgress}%` }} />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          <CalendarRange className="h-3.5 w-3.5" />
                          Período
                        </div>
                        <div className="mt-2 text-sm font-medium text-slate-900">Mensal ou bi-semana</div>
                        <div className="mt-1 text-xs text-slate-500">Os dois ciclos já aparecem em cada card para comparação.</div>
                      </div>
                      <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          Disponibilidade
                        </div>
                        <div className="mt-2 text-sm font-medium text-slate-900">Visual direto</div>
                        <div className="mt-1 text-xs text-slate-500">Disponível, reservada ou data da próxima liberação.</div>
                      </div>
                    </div>

                    <Button className="mt-5 h-11 w-full gap-2 rounded-2xl" onClick={onAddSelected} disabled={selectedCount === 0}>
                      <ShoppingCart className="h-4 w-4" />
                      Adicionar selecionadas ao carrinho
                    </Button>
                    <div className="mt-3 text-xs text-slate-500">Revise os cards abaixo e avance quando a seleção estiver fechada.</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="sticky top-3 z-20 mt-5 rounded-[22px] border border-slate-200/90 bg-white/95 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-950">Seleção atual</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {selectedCount > 0
                      ? `${selectedCount} unidade(s) escolhida(s). Você já pode enviar ao carrinho.`
                      : 'Toque em um card ou use o botão “Selecionar” para compor a proposta.'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    {selectedCount}/{selectableUnits.length || 0} selecionadas
                  </div>
                  <Button className="h-11 gap-2 rounded-2xl" onClick={onAddSelected} disabled={selectedCount === 0}>
                    <ShoppingCart className="h-4 w-4" />
                    Adicionar ao carrinho
                  </Button>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-slate-900 transition-all duration-300" style={{ width: `${selectionProgress}%` }} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {sortedUnits.map((u) => {
                const checked = !!selected[u.id];
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
                const tone = getAvailabilityTone(u);
                const availabilityDate = formatAvailabilityDate((u as any).availableOn);

                return (
                  <Card
                    key={u.id}
                    onClick={() => toggleUnitSelection(u as MediaUnit)}
                    className={`group overflow-hidden rounded-[28px] border transition-all duration-200 shadow-[0_14px_36px_rgba(15,23,42,0.06)] ${
                      checked
                        ? 'cursor-pointer border-slate-900 bg-slate-900 text-white shadow-[0_22px_46px_rgba(15,23,42,0.18)]'
                        : isUnavailable
                          ? 'cursor-not-allowed border-slate-200 bg-white/90'
                          : 'cursor-pointer border-slate-200 bg-white/95 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_22px_44px_rgba(15,23,42,0.10)]'
                    }`}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={`rounded-full border px-3 py-1 text-xs font-medium ${checked ? 'border-white/15 bg-white/10 text-white hover:bg-white/10' : tone.chip}`}>
                              <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${checked ? 'bg-emerald-300' : tone.dot}`} />
                              {getAvailabilityLabel(u as any)}
                            </Badge>
                            {isPromotions && promoBadge && (
                              <Badge className={`rounded-full border-0 px-3 py-1 text-xs ${checked ? 'bg-rose-400 text-white hover:bg-rose-400' : 'bg-rose-500 text-white hover:bg-rose-500'}`}>
                                {promoBadge}
                              </Badge>
                            )}
                            {checked && (
                              <Badge className="rounded-full border-0 bg-white text-slate-900 hover:bg-white">
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                Selecionada
                              </Badge>
                            )}
                          </div>
                          <div className="mt-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className={`menu-copy-wrap text-lg font-semibold ${checked ? 'text-white' : 'text-slate-950'}`}>
                                {u.unitType === 'SCREEN' ? 'Tela' : 'Face'} {u.label}
                              </div>
                              <div className={`mt-1 text-sm ${checked ? 'text-white/72' : 'text-slate-600'}`}>
                                {u.widthM && u.heightM ? `${u.widthM}m × ${u.heightM}m` : 'Dimensões não informadas'}
                                {u.orientation ? ` • ${u.orientation}` : ''}
                              </div>
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={checked}
                                disabled={isUnavailable}
                                onCheckedChange={(value) => onToggle(u.id, Boolean(value))}
                                className="border-slate-300 bg-white data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-slate-900"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <UnitPreview src={u.imageUrl || point.mainImageUrl || ''} alt={u.label} />
                      </div>

                      <div className={`mt-4 rounded-[22px] border p-4 ${checked ? 'border-white/12 bg-white/8 text-white' : tone.panel}`}>
                        <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${checked ? 'text-white/60' : ''}`}>Disponibilidade</div>
                        <div className="mt-2 text-sm font-medium">
                          {isUnavailable
                            ? availabilityDate
                              ? `Livre para nova seleção em ${availabilityDate}.`
                              : 'Esta unidade não está disponível para seleção imediata.'
                            : 'Pronta para compor a proposta agora.'}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className={`rounded-[22px] border p-4 ${checked ? 'border-white/12 bg-white/8 text-white' : 'border-slate-200 bg-slate-50/90 text-slate-900'}`}>
                          <div className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${checked ? 'text-white/60' : 'text-slate-500'}`}>
                            <CalendarRange className="h-3.5 w-3.5" />
                            Mensal
                          </div>
                          <div className="mt-3 text-lg font-semibold leading-none">
                            {isPromotions && promoMonth ? formatCurrencyBRL(promoMonth.to) : formatCurrencyBRL(baseMonthUnit)}
                          </div>
                          {isPromotions && promoMonth ? (
                            <div className={`mt-2 text-xs ${checked ? 'text-white/68' : 'text-slate-500'}`}>
                              De <span className="line-through">{formatCurrencyBRL(promoMonth.from)}</span>
                              {promoMonthSavings ? ` • economia de ${formatCurrencyBRL(promoMonthSavings.amount)}` : ''}
                            </div>
                          ) : (
                            <div className={`mt-2 text-xs ${checked ? 'text-white/68' : 'text-slate-500'}`}>Período padrão mensal.</div>
                          )}
                        </div>

                        <div className={`rounded-[22px] border p-4 ${checked ? 'border-white/12 bg-white/8 text-white' : 'border-slate-200 bg-slate-50/90 text-slate-900'}`}>
                          <div className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${checked ? 'text-white/60' : 'text-slate-500'}`}>
                            <Clock3 className="h-3.5 w-3.5" />
                            Bi-semana
                          </div>
                          <div className="mt-3 text-lg font-semibold leading-none">
                            {isPromotions && promoWeek ? formatCurrencyBRL(promoWeek.to) : formatCurrencyBRL(baseWeekUnit)}
                          </div>
                          {isPromotions && promoWeek ? (
                            <div className={`mt-2 text-xs ${checked ? 'text-white/68' : 'text-slate-500'}`}>
                              De <span className="line-through">{formatCurrencyBRL(promoWeek.from)}</span>
                              {promoWeekSavings ? ` • economia de ${formatCurrencyBRL(promoWeekSavings.amount)}` : ''}
                            </div>
                          ) : (
                            <div className={`mt-2 text-xs ${checked ? 'text-white/68' : 'text-slate-500'}`}>Período curto para campanhas rápidas.</div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className={`text-sm ${checked ? 'text-white/80' : 'text-slate-600'}`}>
                          {checked
                            ? 'Selecionada para envio ao carrinho.'
                            : isUnavailable
                              ? 'Indisponível para este momento.'
                              : 'Clique no card ou no botão para selecionar.'}
                        </div>
                        <Button
                          type="button"
                          variant={checked ? 'secondary' : 'outline'}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleUnitSelection(u as MediaUnit);
                          }}
                          disabled={isUnavailable}
                          className={`h-10 min-w-[160px] rounded-2xl ${checked ? 'border-0 bg-white text-slate-900 hover:bg-white/95' : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'}`}
                        >
                          {checked ? 'Remover seleção' : 'Selecionar unidade'}
                          {!checked && <ChevronRight className="ml-2 h-4 w-4" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
