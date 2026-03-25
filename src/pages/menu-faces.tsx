import { useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { ArrowLeft, CheckCircle2, Layers, ShoppingCart, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { usePublicMediaKit } from '../hooks/usePublicMediaKit';
import { computePointPriceSummary, PublicMediaKitPoint } from '../lib/publicMediaKit';
import { addToCart, getCartCount, formatAddress } from '../lib/menuCart';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { MediaUnit } from '../types';
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
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const backUrl = useMemo(
    () => `/menu/detalhe${buildQuery({ token, pointId, uf, city, flow, ownerCompanyId })}`,
    [token, pointId, uf, city, flow, ownerCompanyId],
  );

  const onToggle = (unitId: string, next: boolean) => {
    setSelected((prev) => ({ ...prev, [unitId]: next }));
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

    navigate(`/menu/carrinho${buildQuery({ token, uf, city, flow, ownerCompanyId })}`);
  };

  const cartCount = useMemo(() => getCartCount(), [selectedCount, pointId]);

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_40%,#f8fafc_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="rounded-full bg-white px-3 text-slate-700 shadow-sm">Protótipo</Badge>
          <div className="text-sm text-slate-600">Seleção de faces/telas</div>
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

        {error && (
          <Card className="mt-5 rounded-[28px] border-amber-200 bg-amber-50 shadow-[0_16px_40px_rgba(245,158,11,0.08)]">
            <CardContent className="py-4">
              <div className="text-sm font-semibold text-amber-900">Não foi possível carregar</div>
              <div className="mt-1 text-sm text-amber-800">{error}</div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card className="mt-5 animate-pulse rounded-[28px] border-slate-200 bg-white/90">
            <CardContent className="py-6">
              <div className="h-5 w-56 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-80 rounded bg-slate-200" />
              <div className="mt-6 h-40 w-full rounded-[22px] bg-slate-200" />
            </CardContent>
          </Card>
        )}

        {!loading && !error && !point && (
          <Card className="mt-5 rounded-[28px] border-slate-200 bg-white/90">
            <CardContent className="py-6">
              <div className="text-sm font-semibold text-slate-900">Ponto não encontrado</div>
              <div className="mt-1 text-sm text-slate-600">Volte e selecione outro ponto.</div>
              <div className="mt-4">
                <Button variant="outline" className="rounded-2xl" onClick={() => navigate(`/menu/pontos${buildQuery({ token, uf, city, flow, ownerCompanyId })}`)}>
                  Voltar para a lista
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {point && (
          <>
            <Card className="mt-5 overflow-hidden rounded-[30px] border border-slate-200 bg-white/95 shadow-[0_18px_60px_rgba(15,23,42,0.07)]">
              <CardContent className="p-6">
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      <Layers className="h-3.5 w-3.5" />
                      Selecione uma ou mais faces/telas
                    </div>
                    <div className="mt-4 text-2xl font-semibold text-slate-900">{point.name}</div>
                    <div className="mt-2 text-sm text-slate-600">{formatAddress(point) || 'Endereço não informado'}</div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 text-slate-600">{units.length} unidade(s)</Badge>
                      <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 text-slate-600">{selectableUnits.length} disponíveis</Badge>
                      <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 text-slate-600">{selectedCount} selecionada(s)</Badge>
                      {hasStartingFrom && startingMonth !== null && startingMonth !== undefined && (
                        <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-3 text-emerald-700">
                          <Tag className="mr-1 h-3.5 w-3.5" />
                          A partir de {formatCurrencyBRL(startingMonth)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Card className="rounded-[28px] border-slate-200 bg-slate-50/80 shadow-none">
                    <CardContent className="space-y-4 p-5">
                      <div>
                        <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Resumo comercial</div>
                        <div className="mt-1 text-sm text-slate-600">Use este bloco para conferir preço-base, seleção atual e condição da oferta antes de enviar ao carrinho.</div>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Condição</div>
                            <div className="mt-1 text-sm font-medium text-slate-900">{isPromotions ? 'Condição promocional por face/tela' : isAgency ? 'Leitura com markup da agência' : 'Seleção em tabela padrão'}</div>
                          </div>
                          <Badge variant="secondary" className="rounded-full bg-slate-100 px-3 text-slate-700">{isPromotions ? 'Promoção' : isAgency ? 'Agência' : 'Padrão'}</Badge>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Mensal</div>
                          <div className="mt-2 text-lg font-semibold text-slate-900">{formatCurrencyBRL(baseMonth)}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Bi-semana</div>
                          <div className="mt-2 text-lg font-semibold text-slate-900">{formatCurrencyBRL(baseWeek)}</div>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Seleção atual</div>
                        <div className="mt-2 text-sm text-slate-700">{selectedCount > 0 ? `${selectedCount} face(s)/tela(s) pronta(s) para ir ao carrinho.` : 'Escolha uma ou mais faces para montar a proposta.'}</div>
                      </div>

                      <Button className="h-11 w-full gap-2 rounded-2xl" onClick={onAddSelected} disabled={selectableUnits.length === 0}>
                        <ShoppingCart className="h-4 w-4" />
                        Adicionar selecionadas
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedUnits.map((u) => {
                const checked = !!selected[u.id];
                const unitPromo = isPromotions ? getEffectivePromotion(u as any, point as any) : null;
                const promoBadge = unitPromo ? formatPromotionBadge(unitPromo) : null;
                const promoMonthRaw = unitPromo ? buildPromoPrice((u as any).priceMonth ?? (point as any).basePriceMonth, unitPromo) : null;
                const promoWeekRaw = unitPromo ? buildPromoPrice((u as any).priceWeek ?? (point as any).basePriceWeek, unitPromo) : null;
                const promoMonth = promoMonthRaw ? { from: applyAgencyMarkup(promoMonthRaw.from, markupPct), to: applyAgencyMarkup(promoMonthRaw.to, markupPct) } : null;
                const promoWeek = promoWeekRaw ? { from: applyAgencyMarkup(promoWeekRaw.from, markupPct), to: applyAgencyMarkup(promoWeekRaw.to, markupPct) } : null;
                const baseMonthUnit = applyAgencyMarkup((u as any).priceMonth ?? (point as any).basePriceMonth, markupPct);
                const baseWeekUnit = applyAgencyMarkup((u as any).priceWeek ?? (point as any).basePriceWeek, markupPct);
                const isUnavailable = !isUnitSelectable(u);

                return (
                  <Card key={u.id} className={`overflow-hidden rounded-[28px] border shadow-[0_16px_45px_rgba(15,23,42,0.06)] ${checked ? 'border-slate-900 bg-slate-900 text-white' : isUnavailable ? 'border-amber-200 bg-amber-50/80' : 'border-slate-200 bg-white/95'}`}>
                    <div className="relative h-48 overflow-hidden bg-slate-100">
                      <ImageWithFallback src={u.imageUrl || point.mainImageUrl || ''} alt={u.label} className="h-full w-full object-cover" />
                      <div className={`absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t ${checked ? 'from-slate-950/80' : 'from-slate-950/70'} to-transparent`} />
                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        {isUnavailable && (
                          <Badge className="rounded-full border-0 bg-amber-100 text-amber-900 hover:bg-amber-100">{String((u as any).availability || '').trim() === 'Reservada' ? 'Reservada' : 'Indisponível'}</Badge>
                        )}
                        {isPromotions && promoBadge && <Badge className="rounded-full border-0 bg-rose-500 text-white hover:bg-rose-500">{promoBadge}</Badge>}
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 text-white">
                        <div>
                          <div className="text-lg font-semibold">{u.unitType === 'SCREEN' ? 'Tela' : 'Face'} {u.label}</div>
                          <div className="mt-1 text-xs text-white/80">{u.widthM && u.heightM ? `${u.widthM}m × ${u.heightM}m` : 'Dimensões não informadas'}{u.orientation ? ` • ${u.orientation}` : ''}</div>
                        </div>
                        <Checkbox checked={checked} disabled={isUnavailable} onCheckedChange={(value) => onToggle(u.id, Boolean(value))} className="border-white/70 data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-slate-900" />
                      </div>
                    </div>

                    <CardContent className="space-y-4 p-5">
                      <div className={`rounded-[22px] border p-4 ${checked ? 'border-white/10 bg-white/10 text-white/90' : isUnavailable ? 'border-amber-200 bg-white text-amber-900' : 'border-slate-200 bg-slate-50/80 text-slate-700'}`}>
                        <div className={`text-[11px] uppercase tracking-[0.12em] ${checked ? 'text-white/65' : isUnavailable ? 'text-amber-700' : 'text-slate-500'}`}>Leitura rápida</div>
                        <div className="mt-2 text-sm font-medium">{isUnavailable ? 'Indisponível para seleção imediata' : checked ? 'Selecionada para a proposta' : 'Disponível para compor a proposta'}</div>
                      </div>

                      <div className={`grid grid-cols-2 gap-3 ${checked ? 'text-white/90' : 'text-slate-700'}`}>
                        <div className={`rounded-2xl border p-4 ${checked ? 'border-white/10 bg-white/10' : 'border-slate-200 bg-slate-50'}`}>
                          <div className={`text-[11px] uppercase tracking-[0.12em] ${checked ? 'text-white/65' : 'text-slate-500'}`}>Mensal</div>
                          <div className="mt-2 text-sm">
                            {isPromotions && promoMonth ? (
                              <>
                                <span className={`${checked ? 'text-white/55' : 'text-slate-400'} mr-2 line-through`}>{formatCurrencyBRL(promoMonth.from)}</span>
                                <span className="text-lg font-semibold">{formatCurrencyBRL(promoMonth.to)}</span>
                              </>
                            ) : (
                              <span className="text-lg font-semibold">{formatCurrencyBRL(baseMonthUnit)}</span>
                            )}
                          </div>
                        </div>
                        <div className={`rounded-2xl border p-4 ${checked ? 'border-white/10 bg-white/10' : 'border-slate-200 bg-slate-50'}`}>
                          <div className={`text-[11px] uppercase tracking-[0.12em] ${checked ? 'text-white/65' : 'text-slate-500'}`}>Bi-semana</div>
                          <div className="mt-2 text-sm">
                            {isPromotions && promoWeek ? (
                              <>
                                <span className={`${checked ? 'text-white/55' : 'text-slate-400'} mr-2 line-through`}>{formatCurrencyBRL(promoWeek.from)}</span>
                                <span className="text-lg font-semibold">{formatCurrencyBRL(promoWeek.to)}</span>
                              </>
                            ) : (
                              <span className="text-lg font-semibold">{formatCurrencyBRL(baseWeekUnit)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isUnavailable && formatAvailabilityDate((u as any).availableOn) && (
                        <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${checked ? 'bg-white/10 text-white/85' : 'bg-amber-100 text-amber-900'}`}>
                          Livre para nova seleção em <span className="font-semibold">{formatAvailabilityDate((u as any).availableOn)}</span>.
                        </div>
                      )}

                      {!isUnavailable && checked && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-white/85">
                          <CheckCircle2 className="h-4 w-4" />
                          Selecionada para o carrinho.
                        </div>
                      )}
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
