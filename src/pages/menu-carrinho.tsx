import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { ArrowLeft, ChevronRight, Clock3, Layers3, MapPin, ShoppingCart, Sparkles, Trash2 } from 'lucide-react';
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
  const { token, flow, ownerCompanyId, source } = query;

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

  return (
    <div className="menu-app-shell">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="rounded-full border border-white/70 bg-white/85 px-3 text-slate-700 shadow-sm backdrop-blur">
            Cardápio
          </Badge>
          {isAgencyFlow(flow) && (
            <Badge variant="outline" className="rounded-full border-slate-200 bg-white/85 px-3 text-slate-700 shadow-sm backdrop-blur">
              Agência
            </Badge>
          )}
          <div className="text-sm text-slate-600">Carrinho</div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" className="w-full justify-center gap-2 rounded-2xl text-slate-700 sm:w-auto" onClick={() => navigate(backUrl)}>
              <ArrowLeft className="h-4 w-4" />
              {source === 'catalog' ? 'Voltar ao catálogo' : 'Voltar'}
            </Button>
          </div>
        </div>

        <div className="menu-glass-card mt-5 overflow-hidden rounded-[32px]">
          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8 lg:py-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                <ShoppingCart className="h-3.5 w-3.5" />
                Revise e ajuste seu pedido
              </div>
              <h1 className="menu-soft-title mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Um carrinho mais leve, visual e coerente com o novo cardápio.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Revise seus pontos e faces com leitura mais comercial, ajuste a duração de cada item e siga para o checkout sem perder nenhuma regra do fluxo atual.
              </p>
            </div>

            <Card className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-none">
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-[0.16em] text-white/60">Resumo rápido</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
                  Com tudo revisado, o checkout envia o pedido exatamente como o responsável precisa receber.
                </div>
                {cart.items.length > 0 ? (
                  <Button
                    variant="outline"
                    className="mt-5 h-11 w-full gap-2 rounded-2xl border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                    onClick={onClear}
                  >
                    <Trash2 className="h-4 w-4" />
                    Limpar carrinho
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>

        {cart.items.length === 0 ? (
          <Card className="menu-glass-card mt-5 rounded-[30px]">
            <CardContent className="py-10">
              <div className="flex flex-col items-start gap-4 text-left sm:flex-row sm:items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100">
                  <ShoppingCart className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-slate-900">Seu carrinho ainda está vazio</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">
                    Volte para a vitrine, escolha os itens desejados e monte um pedido antes de seguir para o checkout.
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
          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <div className="space-y-5">
              <Card className="menu-glass-card overflow-hidden rounded-[30px] border border-slate-200/90 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
                <CardContent className="p-0">
                  <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_430px]">
                    <div className="border-b border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-indigo-50/70 px-5 py-5 xl:border-b-0 xl:border-r xl:px-6 xl:py-6">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                        <Clock3 className="h-3.5 w-3.5" />
                        Duração padrão do pacote
                      </div>
                      <div className="mt-4 text-sm font-semibold text-slate-950">Aplicar o mesmo período em todos os itens</div>
                      <div className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                        Defina um período inicial para todo o carrinho e refine item por item apenas onde fizer sentido. Isso acelera a montagem do pedido sem alterar nenhuma regra do fluxo.
                      </div>
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[22px] border border-white/90 bg-white/95 p-3 shadow-sm">
                          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Anos</div>
                          <Input type="number" min={0} className="mt-2 h-11 rounded-2xl border-slate-200 bg-slate-50" value={bulkYears} onChange={(e) => setBulkYears(e.target.value)} />
                        </div>
                        <div className="rounded-[22px] border border-white/90 bg-white/95 p-3 shadow-sm">
                          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Meses</div>
                          <Input type="number" min={0} className="mt-2 h-11 rounded-2xl border-slate-200 bg-slate-50" value={bulkMonths} onChange={(e) => setBulkMonths(e.target.value)} />
                        </div>
                        <div className="rounded-[22px] border border-white/90 bg-white/95 p-3 shadow-sm">
                          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Dias</div>
                          <Input type="number" min={0} className="mt-2 h-11 rounded-2xl border-slate-200 bg-slate-50" value={bulkDays} onChange={(e) => setBulkDays(e.target.value)} />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950 px-5 py-5 text-white xl:px-6 xl:py-6">
                      <div className="text-xs uppercase tracking-[0.16em] text-white/60">Prévia do período</div>
                      <div className="mt-3 text-2xl font-semibold tracking-tight">
                        {formatDurationParts({ years: Number(bulkYears) || 0, months: Number(bulkMonths) || 0, days: Number(bulkDays) || 0 })}
                      </div>
                      <div className="mt-3 text-sm leading-6 text-white/70">
                        Esse período será aplicado a todos os itens do carrinho. Depois, você ainda pode ajustar cada ponto ou face individualmente logo abaixo.
                      </div>
                      <div className="mt-5 grid grid-cols-3 gap-3">
                        {[
                          ['Itens', String(cart.items.length)],
                          ['Pontos', String(uniquePointsCount)],
                          ['Faces', String(withFacesCount)],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-3 text-center backdrop-blur">
                            <div className="text-lg font-semibold text-white">{value}</div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/60">{label}</div>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" className="mt-5 h-11 w-full rounded-2xl border-white/15 bg-white/10 px-5 text-white hover:bg-white/15 hover:text-white" onClick={onApplyAll}>
                        Aplicar em todos
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
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
                    <Card key={item.id} className="menu-glass-card overflow-hidden rounded-[30px] border border-slate-200/90 shadow-[0_16px_50px_rgba(15,23,42,0.055)]">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 text-slate-600 shadow-sm">
                            {unitLabel ? 'Face/Tela selecionada' : 'Ponto selecionado'}
                          </Badge>
                          <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 text-slate-600 shadow-sm">
                            {item.durationDays >= 30 ? 'Leitura mensal' : 'Leitura curta'}
                          </Badge>
                          {isPromotions && promo ? (
                            <Badge className="rounded-full border-0 bg-rose-500 text-white hover:bg-rose-500">
                              {formatPromotionBadge(promo)}
                            </Badge>
                          ) : null}
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

                        <div className="mt-4 grid gap-4 2xl:grid-cols-[280px_minmax(0,1fr)_260px] 2xl:items-start">
                          <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-50">
                            <div className="aspect-[4/3] w-full p-3">
                              <ImageWithFallback src={img} alt={pointName} className="h-full w-full rounded-[20px] object-cover" />
                            </div>
                          </div>

                          <div className="min-w-0 space-y-4">
                            <div className="rounded-[26px] border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 px-5 py-5">
                              <div className="flex flex-wrap items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <h2 className="menu-copy-wrap text-xl font-semibold leading-tight text-slate-950">{pointName}</h2>
                                  {unitLabel ? <div className="menu-copy-wrap mt-1 text-sm font-medium text-slate-700">{unitLabel}</div> : null}
                                </div>
                                {isPromotions && promo ? (
                                  <Badge className="rounded-full border-0 bg-rose-500/10 text-rose-700 hover:bg-rose-500/10">
                                    {formatPromotionBadge(promo)}
                                  </Badge>
                                ) : null}
                              </div>
                              {address ? (
                                <div className="mt-3 flex items-start gap-2 text-sm leading-6 text-slate-600">
                                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                                  <span className="menu-copy-wrap">{address}</span>
                                </div>
                              ) : null}

                              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Valor mensal</div>
                                    {promoMonthSavings ? (
                                      <Badge className="rounded-full border-0 bg-emerald-500/10 px-2.5 text-emerald-700 hover:bg-emerald-500/10">
                                        -{promoMonthSavings.percent}%
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <div className="mt-2 text-sm text-slate-900">
                                    {isPromotions && promoMonthRaw && promoMonthFrom !== null && promoMonthTo !== null ? (
                                      <>
                                        <span className="mr-2 text-slate-400 line-through">{formatCurrencyBRL(promoMonthFrom)}</span>
                                        <span className="text-lg font-semibold">{formatCurrencyBRL(promoMonthTo)}</span>
                                        {promoMonthSavings ? (
                                          <div className="mt-2 text-xs font-medium text-emerald-700">Economia de {formatCurrencyBRL(promoMonthSavings.amount)}</div>
                                        ) : null}
                                      </>
                                    ) : (
                                      <span className="text-lg font-semibold">{formatCurrencyBRL(priceMonth)}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Valor bi-semana</div>
                                    {promoWeekSavings ? (
                                      <Badge className="rounded-full border-0 bg-emerald-500/10 px-2.5 text-emerald-700 hover:bg-emerald-500/10">
                                        -{promoWeekSavings.percent}%
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <div className="mt-2 text-sm text-slate-900">
                                    {isPromotions && promoWeekRaw && promoWeekFrom !== null && promoWeekTo !== null ? (
                                      <>
                                        <span className="mr-2 text-slate-400 line-through">{formatCurrencyBRL(promoWeekFrom)}</span>
                                        <span className="text-lg font-semibold">{formatCurrencyBRL(promoWeekTo)}</span>
                                        {promoWeekSavings ? (
                                          <div className="mt-2 text-xs font-medium text-emerald-700">Economia de {formatCurrencyBRL(promoWeekSavings.amount)}</div>
                                        ) : null}
                                      </>
                                    ) : (
                                      <span className="text-lg font-semibold">{formatCurrencyBRL(priceWeek)}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-[26px] border border-slate-200 bg-white px-4 py-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                  <Clock3 className="h-4 w-4 text-indigo-500" />
                                  Tempo de ocupação deste item
                                </div>
                                <div className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                  {formatDurationParts(item.duration)}
                                </div>
                              </div>
                              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
                                  <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Anos</div>
                                  <Input type="number" min={0} className="mt-2 h-11 rounded-2xl border-slate-200 bg-white" value={String(item.duration?.years ?? 0)} onChange={(e) => onItemDurationChange(item.id, 'years', e.target.value)} placeholder="0" />
                                </div>
                                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
                                  <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Meses</div>
                                  <Input type="number" min={0} className="mt-2 h-11 rounded-2xl border-slate-200 bg-white" value={String(item.duration?.months ?? 0)} onChange={(e) => onItemDurationChange(item.id, 'months', e.target.value)} placeholder="0" />
                                </div>
                                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
                                  <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Dias</div>
                                  <Input type="number" min={0} className="mt-2 h-11 rounded-2xl border-slate-200 bg-white" value={String(item.duration?.days ?? 0)} onChange={(e) => onItemDurationChange(item.id, 'days', e.target.value)} placeholder="0" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-3 2xl:grid-cols-1">
                            <div className="rounded-[26px] border border-slate-200 bg-slate-950 p-5 text-white">
                              <div className="text-[11px] uppercase tracking-[0.14em] text-white/60">No pacote</div>
                              <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-white">
                                <Layers3 className="h-4 w-4 text-indigo-300" />
                                {unitLabel ? 'Face/Tela' : 'Ponto'} pronto para envio
                              </div>
                              <div className="mt-2 text-sm leading-6 text-white/70">
                                Esse item já está organizado no carrinho e será levado do jeito que você ajustar a duração.
                              </div>
                            </div>
                            <div className="rounded-[26px] border border-slate-200 bg-white p-5">
                              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Período atual</div>
                              <div className="mt-2 text-lg font-semibold text-slate-950">{formatDurationParts(item.duration)}</div>
                              <div className="mt-2 text-sm leading-6 text-slate-600">
                                Revise esse período com calma. O resumo lateral vai refletir o pacote inteiro, mas sem alterar a lógica do carrinho.
                              </div>
                            </div>
                            <div className="rounded-[26px] border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-5">
                              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Ação rápida</div>
                              <div className="mt-2 text-sm font-semibold text-slate-950">Remover este item</div>
                              <div className="mt-2 text-sm leading-6 text-slate-600">
                                Use esta opção apenas se esse ponto ou face não fizer mais parte do pacote.
                              </div>
                              <Button variant="outline" className="mt-4 h-11 w-full rounded-2xl border-slate-200 bg-white" onClick={() => onRemove(item.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remover item
                              </Button>
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
              <Card className="overflow-hidden rounded-[30px] border border-slate-900/0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
                <CardContent className="space-y-5 p-6">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-white/60">Resumo do pedido</div>
                    <div className="mt-2 text-xl font-semibold tracking-tight text-white">Pacote pronto para revisão final</div>
                    <div className="mt-2 text-sm leading-6 text-white/70">
                      Confira os valores estimados e avance para o checkout quando a composição estiver redonda.
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] uppercase tracking-[0.12em] text-white/60">Mensal estimado</div>
                        {summaryMonthSavings ? (
                          <Badge className="rounded-full border-0 bg-emerald-500/15 px-2 text-emerald-200 hover:bg-emerald-500/15">
                            -{summaryMonthSavings.percent}%
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white">{formatCurrencyBRL(summaryTotals.month)}</div>
                      {summaryMonthSavings ? (
                        <div className="mt-2 text-xs font-medium text-emerald-200">Economia de {formatCurrencyBRL(summaryMonthSavings.amount)}</div>
                      ) : null}
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] uppercase tracking-[0.12em] text-white/60">Bi-semana estimado</div>
                        {summaryWeekSavings ? (
                          <Badge className="rounded-full border-0 bg-emerald-500/15 px-2 text-emerald-200 hover:bg-emerald-500/15">
                            -{summaryWeekSavings.percent}%
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white">{formatCurrencyBRL(summaryTotals.week)}</div>
                      {summaryWeekSavings ? (
                        <div className="mt-2 text-xs font-medium text-emerald-200">Economia de {formatCurrencyBRL(summaryWeekSavings.amount)}</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ['Itens', String(cart.items.length)],
                      ['Pontos', String(uniquePointsCount)],
                      ['Faces', String(withFacesCount)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-3 text-center">
                        <div className="text-lg font-semibold text-white">{value}</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/60">{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-white/10 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Sparkles className="h-4 w-4 text-indigo-300" />
                      Próximo passo
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/70">
                      Quando estiver tudo revisado, siga para o checkout para enviar seu pedido com o pacote já organizado.
                    </div>
                    <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-white">
                      <span className="text-sm">Resumo pronto para envio</span>
                      <ChevronRight className="h-4 w-4 text-white/75" />
                    </div>
                  </div>

                  <div className="space-y-3 rounded-[26px] border border-white/10 bg-white/5 p-4">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-white/60">Checklist rápido</div>
                    <div className="space-y-2 text-sm text-white/80">
                      <div>• Confira se todos os itens têm duração definida.</div>
                      <div>• Valide os preços comparando mensal e bi-semana.</div>
                      <div>• Avance apenas quando o pacote estiver fechado.</div>
                    </div>
                  </div>

                  <Button className="h-11 w-full rounded-2xl bg-white text-slate-950 hover:bg-white/90" onClick={() => navigate(checkoutUrl)}>
                    Ir para o checkout
                  </Button>
                  <Button variant="outline" className="h-11 w-full rounded-2xl border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={() => navigate(backUrl)}>
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
