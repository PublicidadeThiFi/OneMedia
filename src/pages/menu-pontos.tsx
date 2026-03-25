import { useMemo, useState } from 'react';
import { ArrowLeft, Building2, ChevronRight, MapPin, RefreshCcw, Search, ShoppingCart, Sparkles, SquareStack, Tag } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { useNavigation } from '../contexts/NavigationContext';
import { applyAgencyMarkup, getAgencyMarkupPercent, getMenuQueryParams, isAgencyFlow } from '../lib/menuFlow';
import { usePublicMediaKit } from '../hooks/usePublicMediaKit';
import { formatPromotionBadge, pickBestPromoForPoint, pointHasAnyPromotion } from '../lib/menuPromotions';
import { formatBRL } from '../lib/format';

function formatCurrency(v: number | null | undefined) {
  return formatBRL(v, '—');
}

function buildSavingsMeta(from: number | null | undefined, to: number | null | undefined) {
  if (typeof from !== 'number' || typeof to !== 'number') return null;
  if (!Number.isFinite(from) || !Number.isFinite(to) || from <= to || from <= 0) return null;
  const amount = from - to;
  const percent = Math.max(1, Math.round((amount / from) * 100));
  return { amount, percent };
}

function buildQuery(params: Record<string, string | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    const val = String(v ?? '').trim();
    if (val) sp.set(k, val);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export default function MenuSelectPoints() {
  const navigate = useNavigation();
  const [q, setQ] = useState('');

  const { token, flow, ownerCompanyId, uf, city } = useMemo(() => getMenuQueryParams(), []);
  const { data, loading, error, reload } = usePublicMediaKit({ token, ownerCompanyId, flow });

  const isAgency = isAgencyFlow(flow);
  const markupPct = isAgency ? getAgencyMarkupPercent(data?.company) : 0;
  const isPromotions = flow === 'promotions';

  const points = useMemo(() => {
    const pts = data?.points ?? [];
    const filtered = pts.filter((p) => {
      const pUf = String(p.addressState ?? '').trim().toUpperCase();
      const pCity = String(p.addressCity ?? '').trim();
      if (uf && pUf !== uf) return false;
      if (city && pCity !== city) return false;

      if (flow === 'promotions' && !pointHasAnyPromotion(p as any)) return false;

      const query = q.trim().toLowerCase();
      if (!query) return true;
      return (
        String(p.name ?? '').toLowerCase().includes(query) ||
        String(p.subcategory ?? '').toLowerCase().includes(query) ||
        String(p.addressDistrict ?? '').toLowerCase().includes(query) ||
        String(p.addressStreet ?? '').toLowerCase().includes(query)
      );
    });

    return filtered.sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));
  }, [data?.points, uf, city, q, flow]);

  const totalFaces = useMemo(
    () => points.reduce((sum, p) => sum + Number((p as any).unitsCount ?? ((p as any).units?.length ?? 0) ?? 0), 0),
    [points],
  );

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_40%,#f8fafc_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="rounded-full bg-white px-3 text-slate-700 shadow-sm">Protótipo</Badge>
          <div className="text-sm text-slate-600">{uf || '—'} / {city || '—'} • Pontos</div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" className="gap-2 rounded-2xl" onClick={() => navigate(`/menu/cidades${buildQuery({ token, uf, flow, ownerCompanyId })}`)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button variant="outline" className="gap-2 rounded-2xl border-slate-200 bg-white" onClick={() => navigate(`/menu/carrinho${buildQuery({ token, flow, ownerCompanyId })}`)}>
              <ShoppingCart className="h-4 w-4" />
              Carrinho
            </Button>
          </div>
        </div>

        <div className="mt-5 rounded-[30px] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                <SquareStack className="h-3.5 w-3.5" />
                Compare os pontos antes de abrir os detalhes
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">Escolha o ponto que mais combina com a proposta</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Reforçamos a leitura comercial com destaque para imagem, preço e disponibilidade. Toque em um ponto para ver fotos, mapa e faces.
              </p>
            </div>

            <Card className="rounded-[28px] border-slate-200 bg-slate-50/80 shadow-none">
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Resumo desta cidade</div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    ['Pontos', String(points.length)],
                    ['Faces', String(totalFaces)],
                    ['Modo', isPromotions ? 'Promo' : isAgency ? 'Agência' : 'Padrão'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
                      <div className="text-lg font-semibold text-slate-900">{value}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, bairro ou rua" className="h-12 rounded-2xl border-slate-200 bg-white pl-11" />
            </div>
            <Button variant="outline" className="h-12 gap-2 rounded-2xl border-slate-200 bg-white px-5" onClick={reload} disabled={loading}>
              <RefreshCcw className="h-4 w-4" />
              Atualizar lista
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mt-5 rounded-[28px] border-amber-200 bg-amber-50 shadow-[0_16px_40px_rgba(245,158,11,0.08)]">
            <CardContent className="py-4">
              <div className="text-sm font-semibold text-amber-900">Ops! Não consegui carregar agora</div>
              <div className="mt-1 text-sm text-amber-800">{error}</div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {loading && points.length === 0
            ? Array.from({ length: 9 }).map((_, idx) => (
                <Card key={idx} className="animate-pulse rounded-[30px] border-slate-200 bg-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                  <CardContent className="p-5">
                    <div className="h-48 w-full rounded-[24px] bg-slate-200" />
                    <div className="mt-4 flex gap-2">
                      <div className="h-7 w-20 rounded-full bg-slate-200" />
                      <div className="h-7 w-24 rounded-full bg-slate-200" />
                    </div>
                    <div className="mt-4 h-5 w-40 rounded bg-slate-200" />
                    <div className="mt-3 h-3 w-44 rounded bg-slate-200" />
                    <div className="mt-5 h-20 rounded-[24px] bg-slate-100" />
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="h-24 rounded-2xl bg-slate-200" />
                      <div className="h-24 rounded-2xl bg-slate-200" />
                    </div>
                    <div className="mt-4 h-16 rounded-[24px] bg-slate-100" />
                  </CardContent>
                </Card>
              ))
            : points.map((p) => {
                const promoMonth = isPromotions ? pickBestPromoForPoint(p as any, 'month') : null;
                const promoWeek = isPromotions ? pickBestPromoForPoint(p as any, 'week') : null;

                const baseMonthRaw = (p as any)?.basePriceMonth ?? null;
                const baseWeekRaw = (p as any)?.basePriceWeek ?? null;

                const units: any[] = Array.isArray((p as any)?.units) ? (p as any).units : [];
                const activeUnits = units.filter((u) => u && u.isActive !== false);

                const minUnitMonthRaw = activeUnits.reduce((min: number | null, u: any) => {
                  const val = u?.priceMonth;
                  if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) return min;
                  if (min === null) return val;
                  return Math.min(min, val);
                }, null);

                const minUnitWeekRaw = activeUnits.reduce((min: number | null, u: any) => {
                  const val = u?.priceWeek;
                  if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) return min;
                  if (min === null) return val;
                  return Math.min(min, val);
                }, null);

                const startingFromMonthRaw = minUnitMonthRaw !== null && (baseMonthRaw === null || minUnitMonthRaw < baseMonthRaw);
                const startingFromWeekRaw = minUnitWeekRaw !== null && (baseWeekRaw === null || minUnitWeekRaw < baseWeekRaw);

                const displayMonthRaw = startingFromMonthRaw ? minUnitMonthRaw : baseMonthRaw ?? minUnitMonthRaw;
                const displayWeekRaw = startingFromWeekRaw ? minUnitWeekRaw : baseWeekRaw ?? minUnitWeekRaw;

                const showStartingFromMonth = Boolean(startingFromMonthRaw && displayMonthRaw !== null);
                const showStartingFromWeek = Boolean(startingFromWeekRaw && displayWeekRaw !== null);

                const baseMonth = baseMonthRaw !== null ? applyAgencyMarkup(baseMonthRaw, markupPct) : null;
                const baseWeek = baseWeekRaw !== null ? applyAgencyMarkup(baseWeekRaw, markupPct) : null;
                const displayMonth = displayMonthRaw !== null ? applyAgencyMarkup(displayMonthRaw, markupPct) : null;
                const displayWeek = displayWeekRaw !== null ? applyAgencyMarkup(displayWeekRaw, markupPct) : null;

                const promoMonthFrom = promoMonth ? applyAgencyMarkup(promoMonth.from, markupPct) : null;
                const promoMonthTo = promoMonth ? applyAgencyMarkup(promoMonth.to, markupPct) : null;
                const promoWeekFrom = promoWeek ? applyAgencyMarkup(promoWeek.from, markupPct) : null;
                const promoWeekTo = promoWeek ? applyAgencyMarkup(promoWeek.to, markupPct) : null;
                const promoMonthSavings = buildSavingsMeta(promoMonthFrom, promoMonthTo);
                const promoWeekSavings = buildSavingsMeta(promoWeekFrom, promoWeekTo);

                const badgeText =
                  formatPromotionBadge(promoMonth?.promotion || promoWeek?.promotion || (p as any).promotion) ||
                  (isPromotions ? 'Promoção' : null);

                return (
                  <Card
                    key={p.id}
                    className="group cursor-pointer overflow-hidden rounded-[30px] border border-slate-200 bg-white/95 shadow-[0_16px_55px_rgba(15,23,42,0.07)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_75px_rgba(15,23,42,0.12)]"
                    onClick={() => navigate(`/menu/detalhe${buildQuery({ token, pointId: p.id, flow, ownerCompanyId })}`)}
                  >
                    <div className="relative h-52 overflow-hidden bg-slate-100">
                      <ImageWithFallback src={(p as any).mainImageUrl || ''} alt={p.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/70 to-transparent" />
                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        <Badge className="rounded-full border border-white/20 bg-white/90 text-slate-800 hover:bg-white/90">{p.type}</Badge>
                        {isPromotions && badgeText && (
                          <Badge className="rounded-full border-0 bg-rose-500/95 text-white hover:bg-rose-500/95">{badgeText}</Badge>
                        )}
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <div className="min-w-0">
                          <div className="truncate text-xl font-semibold">{p.name}</div>
                          <div className="mt-1 flex items-center gap-1 text-sm text-white/80">
                            <Building2 className="h-3.5 w-3.5" />
                            <span className="truncate">{p.addressDistrict || '—'} • {p.addressStreet || '—'} {p.addressNumber || ''}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <CardContent className="space-y-4 p-5">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 text-slate-600">
                          <MapPin className="mr-1 h-3.5 w-3.5" />
                          {p.addressDistrict || p.addressCity || 'Localização não informada'}
                        </Badge>
                        <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 text-slate-600">
                          <SquareStack className="mr-1 h-3.5 w-3.5" />
                          {p.unitsCount ?? 0} face(s)
                        </Badge>
                        {showStartingFromMonth && (
                          <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-3 text-emerald-700">
                            <Tag className="mr-1 h-3.5 w-3.5" />
                            A partir de
                          </Badge>
                        )}
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 p-4 transition-colors duration-300 group-hover:border-indigo-200">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Condição comercial</div>
                            <div className="mt-1 text-sm font-medium text-slate-900">
                              {isPromotions ? 'Oferta promocional disponível' : isAgency ? 'Leitura com markup de agência aplicado' : 'Leitura padrão do ponto'}
                            </div>
                          </div>
                          <Badge variant="secondary" className="rounded-full bg-white px-3 text-slate-700 shadow-sm">
                            {isPromotions ? 'Promoção' : isAgency ? 'Agência' : 'Tabela'}
                          </Badge>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <div className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
                            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                            Visual mais comercial
                          </div>
                          <div className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
                            Toque para ver faces, mapa e galeria
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 transition-all duration-300 group-hover:border-slate-300 group-hover:bg-white">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Mensal</div>
                            {promoMonthSavings && <Badge className="rounded-full border-0 bg-emerald-500/10 px-2.5 text-emerald-700 hover:bg-emerald-500/10">-{promoMonthSavings.percent}%</Badge>}
                          </div>
                          <div className="mt-3 text-sm text-slate-700">
                            {isPromotions && promoMonth && promoMonthFrom !== null && promoMonthTo !== null ? (
                              <>
                                <span className="mr-2 text-slate-400 line-through">{formatCurrency(promoMonthFrom)}</span>
                                <span className="text-xl font-semibold text-slate-900">{formatCurrency(promoMonthTo)}</span>
                                {promoMonthSavings && <div className="mt-2 text-xs font-medium text-emerald-700">Economia de {formatCurrency(promoMonthSavings.amount)}</div>}
                              </>
                            ) : (
                              <>
                                <div className="text-xl font-semibold text-slate-900">{formatCurrency(displayMonth)}</div>
                                {showStartingFromMonth && baseMonth !== null && baseMonth !== undefined && (
                                  <div className="mt-2 text-xs text-slate-500">Padrão {formatCurrency(baseMonth)}</div>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 transition-all duration-300 group-hover:border-slate-300 group-hover:bg-white">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Bi-semana</div>
                            {promoWeekSavings && <Badge className="rounded-full border-0 bg-emerald-500/10 px-2.5 text-emerald-700 hover:bg-emerald-500/10">-{promoWeekSavings.percent}%</Badge>}
                          </div>
                          <div className="mt-3 text-sm text-slate-700">
                            {isPromotions && promoWeek && promoWeekFrom !== null && promoWeekTo !== null ? (
                              <>
                                <span className="mr-2 text-slate-400 line-through">{formatCurrency(promoWeekFrom)}</span>
                                <span className="text-xl font-semibold text-slate-900">{formatCurrency(promoWeekTo)}</span>
                                {promoWeekSavings && <div className="mt-2 text-xs font-medium text-emerald-700">Economia de {formatCurrency(promoWeekSavings.amount)}</div>}
                              </>
                            ) : (
                              <>
                                <div className="text-xl font-semibold text-slate-900">{formatCurrency(displayWeek)}</div>
                                {showStartingFromWeek && baseWeek !== null && baseWeek !== undefined && (
                                  <div className="mt-2 text-xs text-slate-500">Padrão {formatCurrency(baseWeek)}</div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-white p-4 transition-all duration-300 group-hover:border-slate-300 sm:grid-cols-[1fr_auto] sm:items-center">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Leitura rápida do ponto</div>
                          <div className="mt-1 text-xs leading-5 text-slate-500">Abra o detalhe para ver galeria, mapa, faces e toda a condição comercial deste inventário.</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:min-w-[220px]">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                            <div className="text-lg font-semibold text-slate-900">{p.unitsCount ?? 0}</div>
                            <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Faces</div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                            <div className="text-lg font-semibold text-slate-900">{p.availableUnitsCount ?? 0}</div>
                            <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Disponíveis</div>
                          </div>
                        </div>
                        <div className="sm:col-span-2 flex items-center justify-between rounded-[20px] bg-slate-950 px-4 py-3 text-white">
                          <div>
                            <div className="text-sm font-semibold">Abrir detalhe completo</div>
                            <div className="text-xs text-white/70">Veja mapa, galeria e todas as faces sem perder o contexto comercial.</div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-white/80 transition-transform duration-300 group-hover:translate-x-1" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        {!loading && !error && points.length === 0 && (
          <div className="mt-6 rounded-[30px] border border-dashed border-slate-300 bg-white/80 px-5 py-10 text-center shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <Search className="h-5 w-5 text-slate-500" />
            </div>
            <div className="mt-4 text-base font-semibold text-slate-900">Nenhum ponto encontrado</div>
            <div className="mt-2 text-sm text-slate-600">Ajuste a busca ou volte para escolher outra cidade.</div>
          </div>
        )}
      </div>
    </div>
  );
}
