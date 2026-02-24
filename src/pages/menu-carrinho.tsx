import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Trash2, ShoppingCart } from 'lucide-react';
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

  const backUrl = useMemo(() => {
    return `/menu/pontos${buildQuery({ token, uf, city, flow, ownerCompanyId })}`;
  }, [token, uf, city, flow, ownerCompanyId]);

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
    toast.success('Duração aplicada para todos os itens', { description: formatDurationParts(parts) });
  };

  const onRemove = (itemId: string) => {
    removeFromCart(itemId);
    setCartVersion((v) => v + 1);
    toast.success('Item removido do carrinho');
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
      };
    });
  }, [cart.items, data?.points, isAgency, markupPct]);

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          <div className="text-sm text-gray-600">Carrinho</div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" className="gap-2" onClick={() => navigate(backUrl)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Sua seleção</h1>
            <p className="mt-1 text-sm text-gray-600">
              Itens salvos neste navegador. Na próxima etapa, este carrinho vira uma solicitação de proposta.
            </p>
          </div>

          {cart.items.length > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={onClear}>
                <Trash2 className="h-4 w-4" />
                Limpar
              </Button>
            </div>
          )}
        </div>

        {cart.items.length === 0 ? (
          <Card className="mt-5">
            <CardContent className="py-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Seu carrinho está vazio</div>
                  <div className="mt-1 text-sm text-gray-600">Volte para a lista de pontos e adicione itens.</div>
                </div>
              </div>
              <div className="mt-5">
                <Button onClick={() => navigate(backUrl)}>
                  Ver pontos
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mt-5">
              <CardContent className="py-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="text-sm text-gray-700">
                    <span className="font-semibold">{cart.items.length}</span> item(ns)
                  </div>

                  <div className="sm:ml-auto flex flex-col sm:flex-row gap-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <div className="text-[11px] text-gray-500">Anos</div>
                        <Input type="number" min={0} value={bulkYears} onChange={(e) => setBulkYears(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] text-gray-500">Meses</div>
                        <Input type="number" min={0} value={bulkMonths} onChange={(e) => setBulkMonths(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] text-gray-500">Dias</div>
                        <Input type="number" min={0} value={bulkDays} onChange={(e) => setBulkDays(e.target.value)} />
                      </div>
                    </div>

                    <Button variant="outline" onClick={onApplyAll}>
                      Aplicar para todos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
              {itemsEnriched.map(({ item, pointName, unitLabel, address, img, priceMonth, priceWeek, promo, promoMonthRaw, promoWeekRaw, promoMonthFrom, promoMonthTo, promoWeekFrom, promoWeekTo }) => (
                <Card key={item.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="w-full sm:w-40 shrink-0">
                        <div className="aspect-[16/10] w-full overflow-hidden rounded-xl bg-gray-100">
                          <ImageWithFallback src={img} alt={pointName} className="h-full w-full object-cover" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-base font-semibold text-gray-900 break-words">{pointName}</div>
                              {isPromotions && promo && (
                                <Badge variant="secondary" className="rounded-full whitespace-nowrap">
                                  {formatPromotionBadge(promo) || 'Promoção'}
                                </Badge>
                              )}
                            </div>

                            {unitLabel && <div className="mt-1 text-xs text-gray-700">{unitLabel}</div>}
                            {address && <div className="mt-1 text-xs text-gray-600 break-words">{address}</div>}
                          </div>

                          <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)} title="Remover">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="rounded-lg bg-gray-50 px-3 py-2">
                            <div className="text-[11px] text-gray-500">Mensal</div>
                            <div className="mt-0.5 text-sm text-gray-900">
                              {isPromotions && promoMonthRaw && promoMonthFrom !== null && promoMonthTo !== null ? (
                                <>
                                  <span className="mr-2 text-gray-500 line-through">{formatCurrencyBRL(promoMonthFrom)}</span>
                                  <span className="font-semibold">{formatCurrencyBRL(promoMonthTo)}</span>
                                </>
                              ) : (
                                <span className="font-semibold">{formatCurrencyBRL(priceMonth)}</span>
                              )}
                            </div>
                          </div>

                          <div className="rounded-lg bg-gray-50 px-3 py-2">
                            <div className="text-[11px] text-gray-500">Semanal</div>
                            <div className="mt-0.5 text-sm text-gray-900">
                              {isPromotions && promoWeekRaw && promoWeekFrom !== null && promoWeekTo !== null ? (
                                <>
                                  <span className="mr-2 text-gray-500 line-through">{formatCurrencyBRL(promoWeekFrom)}</span>
                                  <span className="font-semibold">{formatCurrencyBRL(promoWeekTo)}</span>
                                </>
                              ) : (
                                <span className="font-semibold">{formatCurrencyBRL(priceWeek)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <Separator className="my-3" />

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="text-xs text-gray-600 shrink-0">Duração</div>

                          <div className="grid grid-cols-3 gap-2 w-full sm:max-w-[420px]">
                            <Input
                              type="number"
                              min={0}
                              value={String(item.duration?.years ?? 0)}
                              onChange={(e) => {
                                updateItemDurationParts(item.id, { ...item.duration, years: Number(e.target.value || 0) });
                                setCartVersion((vv) => vv + 1);
                              }}
                              placeholder="Anos"
                            />
                            <Input
                              type="number"
                              min={0}
                              value={String(item.duration?.months ?? 0)}
                              onChange={(e) => {
                                updateItemDurationParts(item.id, { ...item.duration, months: Number(e.target.value || 0) });
                                setCartVersion((vv) => vv + 1);
                              }}
                              placeholder="Meses"
                            />
                            <Input
                              type="number"
                              min={0}
                              value={String(item.duration?.days ?? 0)}
                              onChange={(e) => {
                                updateItemDurationParts(item.id, { ...item.duration, days: Number(e.target.value || 0) });
                                setCartVersion((vv) => vv + 1);
                              }}
                              placeholder="Dias"
                            />
                          </div>

                          <div className="sm:ml-auto text-xs text-gray-600">
                            {formatDurationParts(item.duration)}
                            {item.durationDays >= 30 ? ' • Mensal' : ' • Período curto'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
))}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button onClick={() => navigate(backUrl)} variant="outline">
                Adicionar mais pontos
              </Button>
              <Button
                onClick={() => navigate(`/menu/checkout${buildQuery({ token, uf, city, flow, ownerCompanyId })}`)}
                className="gap-2"
              >
                Continuar
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
