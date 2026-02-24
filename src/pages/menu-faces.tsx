import { useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { usePublicMediaKit } from '../hooks/usePublicMediaKit';
import { PublicMediaKitPoint } from '../lib/publicMediaKit';
import { addToCart, getCartCount, formatAddress } from '../lib/menuCart';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { MediaUnit } from '../types';
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

export default function MenuFaces() {
  const navigate = useNavigation();

  const { token, pointId, uf, city, flow, ownerCompanyId } = useMemo(() => {
    const qp = getMenuQueryParams();
    return {
      token: qp.token,
      pointId: qp.pointId || '',
      uf: qp.uf || '',
      city: qp.city || '',
      flow: qp.flow,
      ownerCompanyId: qp.ownerCompanyId,
    };
  }, []);

  const { data, loading, error } = usePublicMediaKit({ token, ownerCompanyId, flow });

  const isAgency = isAgencyFlow(flow);
  const markupPct = isAgency ? getAgencyMarkupPercent(data?.company) : 0;
  const isPromotions = flow === 'promotions';


  const point: PublicMediaKitPoint | null = useMemo(() => {
    const points = data?.points ?? [];
    return points.find((p) => String(p.id) === String(pointId)) ?? null;
  }, [data?.points, pointId]);

  const units: MediaUnit[] = useMemo(() => {
    const list = Array.isArray(point?.units) ? point!.units!.filter((u) => u?.isActive !== false) : [];
    return list;
  }, [point]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const backUrl = useMemo(
    () => `/menu/detalhe${buildQuery({ token, id: pointId, uf, city, flow, ownerCompanyId })}`,
    [token, pointId, uf, city, flow, ownerCompanyId],
  );

  const onToggle = (unitId: string, next: boolean) => {
    setSelected((prev) => ({ ...prev, [unitId]: next }));
  };

  const onAddSelected = () => {
    if (!point) return;
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (ids.length === 0) {
      toast.info('Selecione pelo menos uma face/tela.');
      return;
    }

    let addedCount = 0;
    ids.forEach((id) => {
      const unit = units.find((u) => u.id === id) ?? null;
      const res = addToCart({ point, unit, duration: { years: 0, months: 1, days: 0 } });
      if (res.added) addedCount += 1;
    });

    if (addedCount > 0) {
      toast.success('Adicionado ao carrinho', {
        description: `${addedCount} item(ns) adicionado(s).`,
      });
    } else {
      toast.info('Esses itens já estavam no carrinho.');
    }

    navigate(`/menu/carrinho${buildQuery({ token, uf, city, flow, ownerCompanyId })}`);
  };

  const cartCount = useMemo(() => getCartCount(), [selectedCount, pointId]);

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          {isAgency && markupPct > 0 && (
            <Badge variant="outline" className="rounded-full">
              Agência +{markupPct}%
            </Badge>
          )}
          <div className="text-sm text-gray-600">Seleção de faces/telas</div>

          <div className="ml-auto flex items-center gap-2">
            {cartCount > 0 && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate(`/menu/carrinho${buildQuery({ token, uf, city, flow, ownerCompanyId })}`)}
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

        {loading && (
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
              <div className="mt-1 text-sm text-gray-600">Volte e selecione outro ponto.</div>
              <div className="mt-4">
                <Button variant="outline" onClick={() => navigate(`/menu/pontos${buildQuery({ token, uf, city, flow, ownerCompanyId })}`)}>
                  Voltar para a lista
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {point && (
          <>
            <Card className="mt-5">
              <CardContent className="py-6">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold text-gray-900">{point.name}</div>
                    <div className="mt-1 text-sm text-gray-600">{formatAddress(point) || 'Endereço não informado'}</div>
                    <div className="mt-3 text-xs text-gray-600">
                      Selecione as faces/telas que deseja incluir no carrinho.
                    </div>
                  </div>

                  <Button className="gap-2" onClick={onAddSelected} disabled={units.length === 0}>
                    <ShoppingCart className="h-4 w-4" />
                    Adicionar selecionadas ({selectedCount})
                  </Button>
                </div>

                <Separator className="my-5" />

                <div className="space-y-3">
                  {units.length > 0 ? (
                    units.map((u) => {
                      const checked = !!selected[u.id];

                      const baseMonthRaw = u.priceMonth ?? point.basePriceMonth;
                      const baseWeekRaw = u.priceWeek ?? point.basePriceWeek;

                      const promo = isPromotions ? getEffectivePromotion(u as any, point as any) : null;
                      const promoMonthRaw = promo ? buildPromoPrice(baseMonthRaw, promo) : null;
                      const promoWeekRaw = promo ? buildPromoPrice(baseWeekRaw, promo) : null;

                      const priceMonth = applyAgencyMarkup(baseMonthRaw, markupPct);
                      const priceWeek = applyAgencyMarkup(baseWeekRaw, markupPct);

                      const promoMonthFrom = promoMonthRaw ? applyAgencyMarkup(promoMonthRaw.from, markupPct) : null;
                      const promoMonthTo = promoMonthRaw ? applyAgencyMarkup(promoMonthRaw.to, markupPct) : null;
                      const promoWeekFrom = promoWeekRaw ? applyAgencyMarkup(promoWeekRaw.from, markupPct) : null;
                      const promoWeekTo = promoWeekRaw ? applyAgencyMarkup(promoWeekRaw.to, markupPct) : null;

                      const promoBadge = formatPromotionBadge(promo);
                      return (
                        <div key={u.id} className="rounded-xl border border-gray-200 p-3">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v: boolean | 'indeterminate') => onToggle(u.id, v === true)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-semibold text-gray-900">
                                  {u.unitType === 'SCREEN' ? 'Tela' : 'Face'} {u.label}
                                </div>
                                {isPromotions && promo && (
                                  <Badge variant="secondary" className="rounded-full">{promoBadge || 'Promoção'}</Badge>
                                )}
                              </div>
                              <div className="mt-1 text-xs text-gray-600">
                                {u.widthM && u.heightM ? `${u.widthM}m × ${u.heightM}m` : 'Dimensões não informadas'}
                                {u.orientation ? ` • ${u.orientation}` : ''}
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-700">
                                <div>
                                  <span className="text-gray-500">Mensal:</span>{' '}
                                  {isPromotions && promoMonthRaw && promoMonthFrom !== null && promoMonthTo !== null ? (
                                    <>
                                      <span className="mr-2 text-gray-500 line-through">{formatCurrencyBRL(promoMonthFrom)}</span>
                                      <span className="font-semibold">{formatCurrencyBRL(promoMonthTo)}</span>
                                    </>
                                  ) : (
                                    <span className="font-semibold">{formatCurrencyBRL(priceMonth)}</span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-gray-500">Semanal:</span>{' '}
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
                            <div className="h-20 w-28 overflow-hidden rounded-lg bg-gray-100">
                              <ImageWithFallback
                                src={(u.imageUrl || point.mainImageUrl || '') as string}
                                alt={u.label}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-gray-600">Nenhuma face/tela ativa cadastrada neste ponto.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
