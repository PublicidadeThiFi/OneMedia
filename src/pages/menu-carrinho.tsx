import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, ChevronRight, ShoppingCart, Sparkles, Tag, Trash2 } from 'lucide-react';
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
import { applyAgencyMarkup, getAgencyMarkupPercent, getMenuQueryParams, isAgencyFlow } from '../lib/menuFlow';
import { buildPromoPrice, formatPromotionBadge, getEffectivePromotion } from '../lib/menuPromotions';
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

export default function MenuCarrinho() {
  const navigate = useNavigation();

  const { token, uf, city, flow, ownerCompanyId } = useMemo(() => {
    const qp = getMenuQueryParams();
    return {
      token: qp.token,
      uf: qp.uf || '',
      city: qp.city || '',
      flow: qp.flow,
      ownerCompanyId: qp.ownerCompanyId,
    };
  }, []);

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

  const backUrl = useMemo(() => `/menu/pontos${buildQuery({ token, uf, city, flow, ownerCompanyId })}`,[token, uf, city, flow, ownerCompanyId]);

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
    return itemsEnriched.reduce((acc, entry) => {
      const month = isPromotions && entry.promoMonthTo !== null && entry.promoMonthTo !== undefined ? entry.promoMonthTo : entry.priceMonth;
      const week = isPromotions && entry.promoWeekTo !== null && entry.promoWeekTo !== undefined ? entry.promoWeekTo : entry.priceWeek;
      const monthCompare = isPromotions && entry.promoMonthFrom !== null && entry.promoMonthFrom !== undefined ? entry.promoMonthFrom : null;
      const weekCompare = isPromotions && entry.promoWeekFrom !== null && entry.promoWeekFrom !== undefined ? entry.promoWeekFrom : null;
      acc.month += Number(month) || 0;
      acc.week += Number(week) || 0;
      acc.monthCompare += Number(monthCompare) || 0;
      acc.weekCompare += Number(weekCompare) || 0;
      return acc;
    }, { month: 0, week: 0, monthCompare: 0, weekCompare: 0 });
  }, [itemsEnriched, isPromotions]);

  const summaryMonthSavings = buildSavingsMeta(summaryTotals.monthCompare || null, summaryTotals.month || null);
  const summaryWeekSavings = buildSavingsMeta(summaryTotals.weekCompare || null, summaryTotals.week || null);

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_40%,#f8fafc_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="rounded-full bg-white px-3 text-slate-700 shadow-sm">Protótipo</Badge>
          <div className="text-sm text-slate-600">Carrinho</div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" className="gap-2 rounded-2xl" onClick={() => navigate(backUrl)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        <div className="mt-5 rounded-[30px] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                <ShoppingCart className="h-3.5 w-3.5" />
                Revise os itens antes do checkout
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">Seu carrinho está mais organizado para conferência final</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Ajuste a duração, confira os itens selecionados e avance para o checkout quando estiver tudo certo.
              </p>
            </div>

            <Card className="rounded-[28px] border-slate-200 bg-slate-50/80 shadow-none">
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Resumo rápido</div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    ['Itens', String(cart.items.length)],
                    ['Pontos', String(uniquePointsCount)],
                    ['Faces', String(withFacesCount)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
                      <div className="text-lg font-semibold text-slate-900">{value}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</div>
                    </div>
                  ))}
                </div>
                {cart.items.length > 0 && (
                  <Button variant="outline" className="mt-5 h-11 w-full gap-2 rounded-2xl border-slate-200 bg-white" onClick={onClear}>
                    <Trash2 className="h-4 w-4" />
                    Limpar carrinho
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {cart.items.length === 0 ? (
          <Card className="mt-5 rounded-[28px] border-slate-200 bg-white/92 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
            <CardContent className="py-10">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                  <ShoppingCart className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <div className="text-base font-semibold text-slate-900">Seu carrinho está vazio</div>
                  <div className="mt-1 text-sm text-slate-600">Volte para a lista e escolha pelo menos um item.</div>
                </div>
              </div>
              <div className="mt-6">
                <Button className="rounded-2xl" onClick={() => navigate(backUrl)}>Escolher pontos</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mt-5 rounded-[28px] border-slate-200 bg-white/92 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Aplicar duração em todos</div>
                    <div className="mt-1 text-sm text-slate-600">Padronize o período antes de avançar.</div>
                  </div>
                  <div className="xl:ml-auto flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1"><div className="text-[11px] text-slate-500">Anos</div><Input type="number" min={0} className="h-11 rounded-2xl border-slate-200" value={bulkYears} onChange={(e) => setBulkYears(e.target.value)} /></div>
                      <div className="space-y-1"><div className="text-[11px] text-slate-500">Meses</div><Input type="number" min={0} className="h-11 rounded-2xl border-slate-200" value={bulkMonths} onChange={(e) => setBulkMonths(e.target.value)} /></div>
                      <div className="space-y-1"><div className="text-[11px] text-slate-500">Dias</div><Input type="number" min={0} className="h-11 rounded-2xl border-slate-200" value={bulkDays} onChange={(e) => setBulkDays(e.target.value)} /></div>
                    </div>
                    <Button variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white px-5" onClick={onApplyAll}>Aplicar em todos</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.7fr]">
              <div className="space-y-4">
                {itemsEnriched.map(({ item, pointName, unitLabel, address, img, priceMonth, priceWeek, promo, promoMonthRaw, promoWeekRaw, promoMonthFrom, promoMonthTo, promoWeekFrom, promoWeekTo, promoMonthSavings, promoWeekSavings }) => (
                  <Card key={item.id} className="group overflow-hidden rounded-[30px] border border-slate-200 bg-white/95 shadow-[0_16px_55px_rgba(15,23,42,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 text-slate-600">{unitLabel ? 'Face/Tela selecionada' : 'Ponto selecionado'}</Badge>
                        <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 text-slate-600">{item.durationDays >= 30 ? 'Período mensal' : 'Período curto'}</Badge>
                        {isPromotions && promo && <Badge className="rounded-full border-0 bg-rose-500 text-white hover:bg-rose-500">{formatPromotionBadge(promo)}</Badge>}
                      </div>

                      <div className="flex flex-col gap-4 lg:flex-row">
                        <div className="w-full lg:w-72 lg:shrink-0">
                          <div className="aspect-[16/10] w-full overflow-hidden rounded-[24px] bg-slate-100">
                            <ImageWithFallback src={img} alt={pointName} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-lg font-semibold text-slate-900 break-words">{pointName}</div>
                                {isPromotions && promo && <Badge className="rounded-full border-0 bg-rose-500 text-white hover:bg-rose-500">{formatPromotionBadge(promo)}</Badge>}
                              </div>
                              {unitLabel && <div className="mt-1 text-sm text-slate-700">{unitLabel}</div>}
                              {address && <div className="mt-1 text-sm text-slate-600 break-words">{address}</div>}
                            </div>

                            <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => onRemove(item.id)} title="Remover">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/70 p-4">
                            <div className="flex items-center gap-2 text-slate-700"><Tag className="h-4 w-4" /><span className="text-sm font-semibold">Condição comercial</span></div>
                            <div className="mt-2 text-sm text-slate-600">{isPromotions && promo ? 'A condição promocional já aparece refletida nos preços do item.' : isAgency ? 'Este item está sendo exibido com markup de agência aplicado.' : 'Este item segue a tabela padrão do inventário.'}</div>
                            <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
                              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                              Releitura comercial pronta para aprovação
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                              <div className="flex items-center justify-between gap-2"><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Mensal</div>{promoMonthSavings && <Badge className="rounded-full border-0 bg-emerald-500/10 px-2.5 text-emerald-700 hover:bg-emerald-500/10">-{promoMonthSavings.percent}%</Badge>}</div>
                              <div className="mt-2 text-sm text-slate-900">
                                {isPromotions && promoMonthRaw && promoMonthFrom !== null && promoMonthTo !== null ? (
                                  <>
                                    <span className="mr-2 text-slate-400 line-through">{formatCurrencyBRL(promoMonthFrom)}</span>
                                    <span className="text-lg font-semibold">{formatCurrencyBRL(promoMonthTo)}</span>
                                    {promoMonthSavings && <div className="mt-2 text-xs font-medium text-emerald-700">Economia de {formatCurrencyBRL(promoMonthSavings.amount)}</div>}
                                  </>
                                ) : (
                                  <span className="text-lg font-semibold">{formatCurrencyBRL(priceMonth)}</span>
                                )}
                              </div>
                            </div>
                            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                              <div className="flex items-center justify-between gap-2"><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Bi-semana</div>{promoWeekSavings && <Badge className="rounded-full border-0 bg-emerald-500/10 px-2.5 text-emerald-700 hover:bg-emerald-500/10">-{promoWeekSavings.percent}%</Badge>}</div>
                              <div className="mt-2 text-sm text-slate-900">
                                {isPromotions && promoWeekRaw && promoWeekFrom !== null && promoWeekTo !== null ? (
                                  <>
                                    <span className="mr-2 text-slate-400 line-through">{formatCurrencyBRL(promoWeekFrom)}</span>
                                    <span className="text-lg font-semibold">{formatCurrencyBRL(promoWeekTo)}</span>
                                    {promoWeekSavings && <div className="mt-2 text-xs font-medium text-emerald-700">Economia de {formatCurrencyBRL(promoWeekSavings.amount)}</div>}
                                  </>
                                ) : (
                                  <span className="text-lg font-semibold">{formatCurrencyBRL(priceWeek)}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <Separator className="my-4" />

                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                            <div className="text-sm font-semibold text-slate-700">Duração</div>
                            <div className="grid w-full grid-cols-3 gap-2 lg:max-w-[420px]">
                              <Input type="number" min={0} className="h-11 rounded-2xl border-slate-200" value={String(item.duration?.years ?? 0)} onChange={(e) => { updateItemDurationParts(item.id, { ...item.duration, years: Number(e.target.value || 0) }); setCartVersion((vv) => vv + 1); }} placeholder="Anos" />
                              <Input type="number" min={0} className="h-11 rounded-2xl border-slate-200" value={String(item.duration?.months ?? 0)} onChange={(e) => { updateItemDurationParts(item.id, { ...item.duration, months: Number(e.target.value || 0) }); setCartVersion((vv) => vv + 1); }} placeholder="Meses" />
                              <Input type="number" min={0} className="h-11 rounded-2xl border-slate-200" value={String(item.duration?.days ?? 0)} onChange={(e) => { updateItemDurationParts(item.id, { ...item.duration, days: Number(e.target.value || 0) }); setCartVersion((vv) => vv + 1); }} placeholder="Dias" />
                            </div>
                            <div className="lg:ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{formatDurationParts(item.duration)}{item.durationDays >= 30 ? ' • Mensal' : ' • Período curto'}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                <Card className="rounded-[30px] border border-slate-200 bg-white/95 shadow-[0_16px_55px_rgba(15,23,42,0.07)]">
                  <CardContent className="space-y-4 p-6">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Resumo do pedido</div>
                      <div className="mt-1 text-sm leading-6 text-slate-600">Conferência rápida dos itens selecionados antes de avançar para o checkout.</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-2"><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Mensal estimado</div>{summaryMonthSavings && <Badge className="rounded-full border-0 bg-emerald-500/10 px-2 text-emerald-700 hover:bg-emerald-500/10">-{summaryMonthSavings.percent}%</Badge>}</div>
                        <div className="mt-2 text-lg font-semibold text-slate-900">{formatCurrencyBRL(summaryTotals.month)}</div>
                        {summaryMonthSavings && <div className="mt-2 text-xs font-medium text-emerald-700">Economia de {formatCurrencyBRL(summaryMonthSavings.amount)}</div>}
                      </div>
                      <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-2"><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Bi-semana estimado</div>{summaryWeekSavings && <Badge className="rounded-full border-0 bg-emerald-500/10 px-2 text-emerald-700 hover:bg-emerald-500/10">-{summaryWeekSavings.percent}%</Badge>}</div>
                        <div className="mt-2 text-lg font-semibold text-slate-900">{formatCurrencyBRL(summaryTotals.week)}</div>
                        {summaryWeekSavings && <div className="mt-2 text-xs font-medium text-emerald-700">Economia de {formatCurrencyBRL(summaryWeekSavings.amount)}</div>}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Sparkles className="h-4 w-4 text-indigo-500" />Próximo passo</div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">Com o carrinho revisado, avance para o checkout para enviar o pedido de proposta.</div>
                      <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-white">
                        <span className="text-sm">Resumo pronto para envio</span>
                        <ChevronRight className="h-4 w-4 text-white/75" />
                      </div>
                    </div>

                    <Button className="h-11 w-full rounded-2xl" onClick={() => navigate(`/menu/checkout${buildQuery({ token, uf, city, flow, ownerCompanyId })}`)}>Ir para o checkout</Button>
                    <Button variant="outline" className="h-11 w-full rounded-2xl border-slate-200 bg-white" onClick={() => navigate(backUrl)}>Adicionar mais itens</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
