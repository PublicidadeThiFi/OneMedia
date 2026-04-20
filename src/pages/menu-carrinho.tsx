import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { ArrowLeft, ChevronRight, Clock3, MapPin, ShoppingCart, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import {
  applyDurationToAllParts,
  clearCart,
  formatAddress,
  formatDurationParts,
  readCart,
  removeFromCart,
  updateItemDurationParts,
} from '../lib/menuCart';
import { usePublicMediaKit } from '../hooks/usePublicMediaKit';
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

export default function MenuCarrinho() {
  const navigate = useNavigation();

  const query = useMemo(() => getMenuCatalogQueryParams(), []);
  const { token, uf, city, flow, ownerCompanyId, source } = query;

  const { data } = usePublicMediaKit({ token, ownerCompanyId, flow });

  const isAgency = isAgencyFlow(flow);
  const markupPct = isAgency ? getAgencyMarkupPercent(data?.company) : 0;
  const isPromotions = flow === 'promotions';

  const [cartVersion, setCartVersion] = useState(0);
  const cart = useMemo(() => readCart(), [cartVersion]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'menu_cart') {
        setCartVersion((v) => v + 1);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const backUrl = useMemo(() => getMenuEntryUrl(query), [query]);
  const checkoutUrl = useMemo(() => buildMenuUrl('/menu/checkout', query), [query]);

  const [bulkYears, setBulkYears] = useState<string>('0');
  const [bulkMonths, setBulkMonths] = useState<string>('1');
  const [bulkDays, setBulkDays] = useState<string>('0');

  const onApplyAll = () => {
    const parts = {
      years: Math.max(0, Math.floor(Number(bulkYears) || 0)),
      months: Math.max(0, Math.floor(Number(bulkMonths) || 0)),
      days: Math.max(0, Math.floor(Number(bulkDays) || 0)),
    };
    applyDurationToAllParts(parts);
    setCartVersion((v) => v + 1);
    toast.success('Duração aplicada em todos os itens', { description: formatDurationParts(parts) });
  };

  const onRemove = (itemId: string) => {
    removeFromCart(itemId);
    setCartVersion((v) => v + 1);
    toast.success('Item removido');
  };

  const onClear = () => {
    clearCart();
    setCartVersion((v) => v + 1);
    toast.success('Carrinho limpo');
  };

  const onItemDurationChange = (itemId: string, key: 'years' | 'months' | 'days', value: string) => {
    const normalized = Math.max(0, Math.floor(Number(value) || 0));
    const current = cart.items.find((entry) => entry.id === itemId);
    updateItemDurationParts(itemId, {
      years: current?.duration?.years ?? 0,
      months: current?.duration?.months ?? 0,
      days: current?.duration?.days ?? 0,
      [key]: normalized,
    });
    setCartVersion((vv) => vv + 1);
  };

  const itemsEnriched = useMemo(() => {
    const points = data?.points ?? [];
    return cart.items.map((item) => {
      const p = points.find((pt) => pt.id === item.pointId) ?? null;
      const unit = p?.units?.find((u) => u.id === item.unitId) ?? null;

      const pointName = item.snapshot?.pointName || p?.name || 'Ponto';
      const unitLabel = item.snapshot?.unitLabel || unit?.label || '';
      const address = p ? formatAddress(p) : item.snapshot?.addressLine || '';
      const img = item.snapshot?.imageUrl || unit?.imageUrl || p?.mainImageUrl || '';
      const baseMonth = item.snapshot?.priceMonth ?? unit?.priceMonth ?? p?.basePriceMonth ?? null;
      const baseWeek = item.snapshot?.priceWeek ?? unit?.priceWeek ?? p?.basePriceWeek ?? null;

      const promo = isPromotions ? getEffectivePromotion(unit as any, p as any) : null;
      const promoMonthRaw = promo ? buildPromoPrice(baseMonth, promo) : null;
      const promoWeekRaw = promo ? buildPromoPrice(baseWeek, promo) : null;

      const priceMonth = isAgency ? applyAgencyMarkup(baseMonth, markupPct) : baseMonth;
      const priceWeek = isAgency ? applyAgencyMarkup(baseWeek, markupPct) : baseWeek;

      const promoMonthFrom = promoMonthRaw ? applyAgencyMarkup(promoMonthRaw.from, markupPct) : null;
      const promoMonthTo = promoMonthRaw ? applyAgencyMarkup(promoMonthRaw.to, markupPct) : null;
      const promoWeekFrom = promoWeekRaw ? applyAgencyMarkup(promoWeekRaw.from, markupPct) : null;
      const promoWeekTo = promoWeekRaw ? applyAgencyMarkup(promoWeekRaw.to, markupPct) : null;
      const promoMonthSavings = buildSavingsMeta(promoMonthFrom, promoMonthTo);
      const promoWeekSavings = buildSavingsMeta(promoWeekFrom, promoWeekTo);

      return {
        item,
        pointName,
        unitLabel,
        address,
        img,
        priceMonth,
        priceWeek,
        promo,
        promoMonthRaw,
        promoWeekRaw,
        promoMonthFrom,
        promoMonthTo,
        promoWeekFrom,
        promoWeekTo,
        promoMonthSavings,
        promoWeekSavings,
      };
    });
  }, [cart.items, data?.points, isAgency, markupPct, isPromotions]);

  const uniquePointsCount = useMemo(() => new Set(itemsEnriched.map((entry) => entry.item.pointId)).size, [itemsEnriched]);
  const withFacesCount = useMemo(() => itemsEnriched.filter((entry) => !!entry.unitLabel).length, [itemsEnriched]);

  const summaryTotals = useMemo(() => {
    return itemsEnriched.reduce(
      (acc, entry) => {
        const month =
          isPromotions && entry.promoMonthTo !== null && entry.promoMonthTo !== undefined
            ? entry.promoMonthTo
            : entry.priceMonth;
        const week =
          isPromotions && entry.promoWeekTo !== null && entry.promoWeekTo !== undefined
            ? entry.promoWeekTo
            : entry.priceWeek;
        const monthCompare =
          isPromotions && entry.promoMonthFrom !== null && entry.promoMonthFrom !== undefined
            ? entry.promoMonthFrom
            : null;
        const weekCompare =
          isPromotions && entry.promoWeekFrom !== null && entry.promoWeekFrom !== undefined
            ? entry.promoWeekFrom
            : null;
        acc.month += Number(month) || 0;
        acc.week += Number(week) || 0;
        acc.monthCompare += Number(monthCompare) || 0;
        acc.weekCompare += Number(weekCompare) || 0;
        return acc;
      },
      { month: 0, week: 0, monthCompare: 0, weekCompare: 0 },
    );
  }, [itemsEnriched, isPromotions]);

  const summaryMonthSavings = buildSavingsMeta(summaryTotals.monthCompare || null, summaryTotals.month || null);
  const summaryWeekSavings = buildSavingsMeta(summaryTotals.weekCompare || null, summaryTotals.week || null);
  const itemGridClass = itemsEnriched.length > 1 ? 'md:grid-cols-2' : '';

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eef2ff_28%,#f8fafc_58%,#f8fafc_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="rounded-full border border-white/70 bg-white/85 px-3 text-slate-700 shadow-sm backdrop-blur">
            Cardápio
          </Badge>
          {source === 'catalog' && (
            <Badge variant="outline" className="rounded-full border-slate-200 bg-white/85 px-3 text-slate-700 shadow-sm backdrop-blur">
              Novo catálogo
            </Badge>
          )}
          <div className="text-sm text-slate-600">Carrinho</div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" className="gap-2 rounded-2xl text-slate-700" onClick={() => navigate(backUrl)}>
              <ArrowLeft className="h-4 w-4" />
              {source === 'catalog' ? 'Voltar ao catálogo' : 'Voltar'}
            </Button>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[32px] border border-white/70 bg-white/85 shadow-[0_22px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8 lg:py-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                <ShoppingCart className="h-3.5 w-3.5" />
                Revise os itens antes do checkout
              </div>
              <h1 className="menu-soft-title mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Um carrinho mais claro para decidir duração, comparar valores e seguir com segurança.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Aqui a leitura fica mais parecida com um cardápio: imagem bem encaixada, preços destacados,
                período fácil de ajustar e um resumo lateral pronto para fechar o pedido.
              </p>
            </div>

            <Card className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-none">
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-[0.16em] text-white/60">Resumo rápido</div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    ['Itens', String(cart.items.length)],
                    ['Pontos', String(uniquePointsCount)],
                    ['Faces', String(withFacesCount)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-3 text-center backdrop-blur">
                      <div className="text-xl font-semibold text-white">{value}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/60">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm leading-6 text-white/75">
                  Ajuste os períodos dos itens e envie um pedido mais redondo para avaliação.
                </div>
                {cart.items.length > 0 && (
                  <Button
                    variant="outline"
                    className="mt-5 h-11 w-full gap-2 rounded-2xl border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                    onClick={onClear}
                  >
                    <Trash2 className="h-4 w-4" />
                    Limpar carrinho
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {cart.items.length === 0 ? (
          <Card className="mt-5 rounded-[30px] border border-white/70 bg-white/90 shadow-[0_16px_50px_rgba(15,23,42,0.06)] backdrop-blur">
            <CardContent className="py-10">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100">
                  <ShoppingCart className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-slate-900">Seu carrinho ainda está vazio</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">
                    Volte para a vitrine e escolha pelo menos um ponto ou face para montar o pedido.
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <Button className="rounded-2xl px-5" onClick={() => navigate(backUrl)}>
                  {source === 'catalog' ? 'Voltar ao catálogo' : 'Escolher pontos'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
            <div className="space-y-5">
              <Card className="rounded-[30px] border border-white/70 bg-white/90 shadow-[0_16px_50px_rgba(15,23,42,0.05)] backdrop-blur">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Aplicar duração em todos os itens</div>
                      <div className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                        Padronize o período para comparar o pacote inteiro de forma mais rápida antes do checkout.
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 xl:min-w-[420px]">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Anos</div>
                          <Input type="number" min={0} className="h-11 rounded-2xl border-slate-200 bg-white" value={bulkYears} onChange={(e) => setBulkYears(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Meses</div>
                          <Input type="number" min={0} className="h-11 rounded-2xl border-slate-200 bg-white" value={bulkMonths} onChange={(e) => setBulkMonths(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Dias</div>
                          <Input type="number" min={0} className="h-11 rounded-2xl border-slate-200 bg-white" value={bulkDays} onChange={(e) => setBulkDays(e.target.value)} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {formatDurationParts({ years: Number(bulkYears) || 0, months: Number(bulkMonths) || 0, days: Number(bulkDays) || 0 })}
                        </div>
                        <Button variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white px-5" onClick={onApplyAll}>
                          Aplicar em todos
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className={`grid grid-cols-1 gap-4 ${itemGridClass}`}>
                {itemsEnriched.map(
                  ({
                    item,
                    pointName,
                    unitLabel,
                    address,
                    img,
                    priceMonth,
                    priceWeek,
                    promo,
                    promoMonthRaw,
                    promoWeekRaw,
                    promoMonthFrom,
                    promoMonthTo,
                    promoWeekFrom,
                    promoWeekTo,
                    promoMonthSavings,
                    promoWeekSavings,
                  }) => (
                    <Card
                      key={item.id}
                      className="group overflow-hidden rounded-[30px] border border-white/70 bg-white/92 shadow-[0_16px_55px_rgba(15,23,42,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_72px_rgba(15,23,42,0.12)]"
                    >
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 text-slate-600">
                            {unitLabel ? 'Face/Tela' : 'Ponto'} no carrinho
                          </Badge>
                          <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 text-slate-600">
                            {item.durationDays >= 30 ? 'Período mensal' : 'Período curto'}
                          </Badge>
                          {isPromotions && promo && (
                            <Badge className="rounded-full border-0 bg-rose-500 text-white hover:bg-rose-500">
                              {formatPromotionBadge(promo)}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto rounded-2xl text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => onRemove(item.id)}
                            title="Remover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mt-4 space-y-4">
                          <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-indigo-50/70">
                            <div className="aspect-square w-full p-4">
                              <ImageWithFallback
                                src={img}
                                alt={pointName}
                                className="h-full w-full rounded-[20px] object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h2 className="menu-copy-wrap text-xl font-semibold leading-tight text-slate-950">{pointName}</h2>
                                {isPromotions && promo && (
                                  <Badge className="rounded-full border-0 bg-rose-500/10 text-rose-700 hover:bg-rose-500/10">
                                    {formatPromotionBadge(promo)}
                                  </Badge>
                                )}
                              </div>
                              {unitLabel && <div className="menu-copy-wrap mt-1 text-sm font-medium text-slate-700">{unitLabel}</div>}
                            </div>

                            {address && (
                              <div className="flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                                <span className="break-words">{address}</span>
                              </div>
                            )}

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Mensal</div>
                                  {promoMonthSavings && (
                                    <Badge className="rounded-full border-0 bg-emerald-500/10 px-2.5 text-emerald-700 hover:bg-emerald-500/10">
                                      -{promoMonthSavings.percent}%
                                    </Badge>
                                  )}
                                </div>
                                <div className="mt-2 text-sm text-slate-900">
                                  {isPromotions && promoMonthRaw && promoMonthFrom !== null && promoMonthTo !== null ? (
                                    <>
                                      <span className="mr-2 text-slate-400 line-through">{formatCurrencyBRL(promoMonthFrom)}</span>
                                      <span className="text-lg font-semibold">{formatCurrencyBRL(promoMonthTo)}</span>
                                      {promoMonthSavings && (
                                        <div className="mt-2 text-xs font-medium text-emerald-700">
                                          Economia de {formatCurrencyBRL(promoMonthSavings.amount)}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-lg font-semibold">{formatCurrencyBRL(priceMonth)}</span>
                                  )}
                                </div>
                              </div>

                              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Bi-semana</div>
                                  {promoWeekSavings && (
                                    <Badge className="rounded-full border-0 bg-emerald-500/10 px-2.5 text-emerald-700 hover:bg-emerald-500/10">
                                      -{promoWeekSavings.percent}%
                                    </Badge>
                                  )}
                                </div>
                                <div className="mt-2 text-sm text-slate-900">
                                  {isPromotions && promoWeekRaw && promoWeekFrom !== null && promoWeekTo !== null ? (
                                    <>
                                      <span className="mr-2 text-slate-400 line-through">{formatCurrencyBRL(promoWeekFrom)}</span>
                                      <span className="text-lg font-semibold">{formatCurrencyBRL(promoWeekTo)}</span>
                                      {promoWeekSavings && (
                                        <div className="mt-2 text-xs font-medium text-emerald-700">
                                          Economia de {formatCurrencyBRL(promoWeekSavings.amount)}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-lg font-semibold">{formatCurrencyBRL(priceWeek)}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="rounded-[26px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                  <Clock3 className="h-4 w-4 text-indigo-500" />
                                  Defina o tempo de ocupação
                                </div>
                                <div className="ml-auto rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                                  {formatDurationParts(item.duration)}
                                </div>
                              </div>
                              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="space-y-1.5">
                                  <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Anos</div>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-11 rounded-2xl border-slate-200 bg-white"
                                    value={String(item.duration?.years ?? 0)}
                                    onChange={(e) => onItemDurationChange(item.id, 'years', e.target.value)}
                                    placeholder="0"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Meses</div>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-11 rounded-2xl border-slate-200 bg-white"
                                    value={String(item.duration?.months ?? 0)}
                                    onChange={(e) => onItemDurationChange(item.id, 'months', e.target.value)}
                                    placeholder="0"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Dias</div>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-11 rounded-2xl border-slate-200 bg-white"
                                    value={String(item.duration?.days ?? 0)}
                                    onChange={(e) => onItemDurationChange(item.id, 'days', e.target.value)}
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>
            </div>

            <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
              <Card className="rounded-[30px] border border-white/70 bg-white/92 shadow-[0_16px_55px_rgba(15,23,42,0.07)] backdrop-blur">
                <CardContent className="space-y-5 p-6">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">Resumo do pedido</div>
                    <div className="mt-1 text-sm leading-6 text-slate-600">
                      Conferência rápida dos itens selecionados antes de avançar para o checkout.
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Mensal estimado</div>
                        {summaryMonthSavings && (
                          <Badge className="rounded-full border-0 bg-emerald-500/10 px-2 text-emerald-700 hover:bg-emerald-500/10">
                            -{summaryMonthSavings.percent}%
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">{formatCurrencyBRL(summaryTotals.month)}</div>
                      {summaryMonthSavings && (
                        <div className="mt-2 text-xs font-medium text-emerald-700">
                          Economia de {formatCurrencyBRL(summaryMonthSavings.amount)}
                        </div>
                      )}
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Bi-semana estimado</div>
                        {summaryWeekSavings && (
                          <Badge className="rounded-full border-0 bg-emerald-500/10 px-2 text-emerald-700 hover:bg-emerald-500/10">
                            -{summaryWeekSavings.percent}%
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">{formatCurrencyBRL(summaryTotals.week)}</div>
                      {summaryWeekSavings && (
                        <div className="mt-2 text-xs font-medium text-emerald-700">
                          Economia de {formatCurrencyBRL(summaryWeekSavings.amount)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/65 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                      Próximo passo
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      Com o carrinho revisado, avance para o checkout para enviar o pedido de proposta.
                    </div>
                    <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-white">
                      <span className="text-sm">Resumo pronto para envio</span>
                      <ChevronRight className="h-4 w-4 text-white/75" />
                    </div>
                  </div>

                  <div className="space-y-3 rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Checklist rápido</div>
                    <div className="space-y-2 text-sm text-slate-700">
                      <div>• Confira se todos os itens têm duração definida.</div>
                      <div>• Valide os preços comparando mensal e bi-semana.</div>
                      <div>• Avance apenas quando o pacote estiver fechado.</div>
                    </div>
                  </div>

                  <Button className="h-11 w-full rounded-2xl" onClick={() => navigate(checkoutUrl)}>
                    Ir para o checkout
                  </Button>
                  <Button variant="outline" className="h-11 w-full rounded-2xl border-slate-200 bg-white" onClick={() => navigate(backUrl)}>
                    Adicionar mais itens
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
