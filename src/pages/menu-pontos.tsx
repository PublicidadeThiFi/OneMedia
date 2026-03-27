import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  Compass,
  MapPin,
  RefreshCcw,
  Search,
  ShoppingCart,
  Sparkles,
  SquareStack,
  Tag,
} from 'lucide-react';
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
import { normalizeAvailability } from '../lib/publicMediaKit';

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

function getAvailabilityMeta(status: string) {
  if (status === 'Disponível') {
    return {
      label: 'Disponível',
      badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      statClass: 'border-emerald-100 bg-emerald-50/70 text-emerald-800',
      accentClass: 'from-emerald-500/10 to-teal-400/10',
    };
  }

  if (status === 'Parcial') {
    return {
      label: 'Disponibilidade parcial',
      badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
      statClass: 'border-amber-100 bg-amber-50/80 text-amber-800',
      accentClass: 'from-amber-500/10 to-orange-400/10',
    };
  }

  return {
    label: 'Ocupado',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-700',
    statClass: 'border-rose-100 bg-rose-50/80 text-rose-800',
    accentClass: 'from-rose-500/10 to-orange-400/10',
  };
}

function PointImage({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#eef4ff_0%,#dbeafe_38%,#e2e8f0_100%)]">
        <div className="rounded-[24px] border border-white/70 bg-white/70 px-4 py-3 text-center shadow-sm backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sem imagem</div>
          <div className="mt-1 text-sm text-slate-700">Prévia do ponto será exibida aqui</div>
        </div>
      </div>
    );
  }

  return <ImageWithFallback src={src} alt={alt} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />;
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

  const totals = useMemo(() => {
    return points.reduce(
      (acc, point) => {
        const unitsCount = Number((point as any).unitsCount ?? ((point as any).units?.length ?? 0) ?? 0);
        const availableUnits = Number((point as any).availableUnitsCount ?? 0);
        const availability = normalizeAvailability(point as any);

        acc.faces += unitsCount;
        acc.availableFaces += Math.max(availableUnits, 0);
        if (availability === 'Disponível') acc.availablePoints += 1;
        else if (availability === 'Ocupado') acc.occupiedPoints += 1;
        else acc.partialPoints += 1;
        return acc;
      },
      { faces: 0, availableFaces: 0, availablePoints: 0, occupiedPoints: 0, partialPoints: 0 },
    );
  }, [points]);

  const resultLabel = useMemo(() => {
    if (!q.trim()) {
      return `${points.length} ${points.length === 1 ? 'ponto exibido' : 'pontos exibidos'}`;
    }
    return `${points.length} ${points.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}`;
  }, [points.length, q]);

  const featuredPointName = useMemo(() => {
    const point = [...points].sort((a, b) => {
      const aAvailable = Number((a as any).availableUnitsCount ?? 0);
      const bAvailable = Number((b as any).availableUnitsCount ?? 0);
      return bAvailable - aAvailable;
    })[0];

    return point?.name ?? null;
  }, [points]);

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f6f8fc_0%,#eef3ff_30%,#f8fafc_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="rounded-full border border-white/60 bg-white/90 px-3 text-slate-700 shadow-sm backdrop-blur-sm">
            Protótipo
          </Badge>
          <div className="text-sm text-slate-600">{uf || '—'} / {city || '—'} • Pontos</div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" className="gap-2 rounded-2xl" onClick={() => navigate(`/menu/cidades${buildQuery({ token, uf, flow, ownerCompanyId })}`)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button variant="outline" className="gap-2 rounded-2xl border-slate-200 bg-white/90 shadow-sm" onClick={() => navigate(`/menu/carrinho${buildQuery({ token, flow, ownerCompanyId })}`)}>
              <ShoppingCart className="h-4 w-4" />
              Carrinho
            </Button>
          </div>
        </div>

        <section className="relative mt-5 overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f7faff_52%,#ebf2ff_100%)] p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)] sm:p-6 lg:p-7">
          <div className="absolute -left-14 top-0 h-48 w-48 rounded-full bg-indigo-200/30 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-sky-200/30 blur-3xl" />

          <div className="relative grid gap-5 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm">
                <Compass className="h-3.5 w-3.5 text-indigo-600" />
                Vitrine de pontos da cidade selecionada
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.2rem] sm:leading-[1.08]">
                Escolha o ponto com melhor encaixe para a campanha.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                Nesta etapa o foco é deixar a decisão mais objetiva: imagem, localização, quantidade de faces, disponibilidade e preço ficam visíveis antes do detalhe completo.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-4">
                {[
                  { label: 'Pontos', value: String(points.length), tone: 'from-slate-950 via-slate-900 to-slate-700 text-white' },
                  { label: 'Disponíveis', value: String(totals.availablePoints), tone: 'from-emerald-500 to-teal-500 text-white' },
                  { label: 'Parciais', value: String(totals.partialPoints), tone: 'from-amber-400 to-orange-400 text-slate-950' },
                  { label: 'Faces livres', value: String(totals.availableFaces), tone: 'from-sky-400 to-cyan-400 text-slate-950' },
                ].map((item) => (
                  <div key={item.label} className={`rounded-[22px] bg-gradient-to-br px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] ${item.tone}`}>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-current/70">{item.label}</div>
                    <div className="mt-2 text-2xl font-semibold">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <Card className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm">
              <div className="h-1.5 bg-gradient-to-r from-slate-950 via-indigo-600 to-sky-400" />
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Resumo da vitrine</div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      A cidade foi organizada para facilitar comparação rápida entre preço, disponibilidade e volume de faces.
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-950 px-3 py-2 text-right text-white shadow-lg shadow-slate-900/10">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white/60">Cidade</div>
                    <div className="mt-1 text-lg font-semibold">{city || '—'}</div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    { label: 'Faces cadastradas', value: String(totals.faces), icon: SquareStack },
                    { label: 'Faces livres', value: String(totals.availableFaces), icon: CheckCircle2 },
                    { label: 'Pontos ocupados', value: String(totals.occupiedPoints), icon: AlertCircle },
                    { label: 'Modo atual', value: isPromotions ? 'Promo' : isAgency ? 'Agência' : 'Padrão', icon: Sparkles },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</div>
                        <Icon className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
                    </div>
                  ))}
                </div>

                {featuredPointName && (
                  <div className="mt-5 rounded-[24px] border border-indigo-100 bg-[linear-gradient(135deg,#eef4ff_0%,#ffffff_100%)] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700/70">Destaque da cidade</div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">{featuredPointName}</div>
                    <div className="mt-1 text-sm text-slate-600">Abra o detalhe para ver a galeria, o mapa e escolher as faces com mais contexto comercial.</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="relative mt-6 rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-sm sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Filtro por ponto</div>
                <div className="mt-2 flex items-center gap-3 rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar por nome, bairro ou rua"
                    className="h-12 border-0 bg-transparent px-0 text-sm text-slate-700 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:pt-6">
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-600">{resultLabel}</div>
                <Button variant="outline" className="h-12 gap-2 rounded-2xl border-slate-200 bg-white px-4" onClick={reload} disabled={loading}>
                  <RefreshCcw className="h-4 w-4" />
                  Atualizar lista
                </Button>
              </div>
            </div>
          </div>
        </section>

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
                <Card key={idx} className="animate-pulse overflow-hidden rounded-[28px] border-slate-200 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                  <div className="aspect-[4/3] w-full bg-slate-200" />
                  <CardContent className="p-5">
                    <div className="flex gap-2">
                      <div className="h-7 w-20 rounded-full bg-slate-200" />
                      <div className="h-7 w-24 rounded-full bg-slate-200" />
                    </div>
                    <div className="mt-4 h-6 w-2/3 rounded bg-slate-200" />
                    <div className="mt-3 h-4 w-4/5 rounded bg-slate-200" />
                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="h-20 rounded-[18px] bg-slate-100" />
                      <div className="h-20 rounded-[18px] bg-slate-100" />
                      <div className="h-20 rounded-[18px] bg-slate-100" />
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="h-28 rounded-[20px] bg-slate-100" />
                      <div className="h-28 rounded-[20px] bg-slate-100" />
                    </div>
                    <div className="mt-5 h-12 rounded-2xl bg-slate-200" />
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

                const unitsCount = Number((p as any).unitsCount ?? activeUnits.length ?? 0);
                const availableUnits = Number((p as any).availableUnitsCount ?? 0);
                const availability = normalizeAvailability(p as any);
                const availabilityMeta = getAvailabilityMeta(availability);
                const addressLabel = [p.addressDistrict, p.addressStreet].filter(Boolean).join(' • ') || p.addressCity || 'Localização não informada';
                const detailUrl = `/menu/detalhe${buildQuery({ token, pointId: p.id, uf, city, flow, ownerCompanyId })}`;

                return (
                  <Card
                    key={p.id}
                    className="group overflow-hidden rounded-[28px] border border-slate-200/90 bg-white/95 shadow-[0_14px_38px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(15,23,42,0.10)]"
                  >
                    <button type="button" className="block w-full text-left" onClick={() => navigate(detailUrl)}>
                      <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_top,#eef4ff_0%,#dbeafe_38%,#e2e8f0_100%)]">
                        <PointImage src={(p as any).mainImageUrl || ''} alt={p.name} />
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/80 to-transparent" />
                        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                          <Badge className="rounded-full border border-white/30 bg-white/90 text-slate-800 hover:bg-white/90">
                            {p.type}
                          </Badge>
                          <Badge className={`rounded-full border ${availabilityMeta.badgeClass}`}>
                            {availabilityMeta.label}
                          </Badge>
                          {isPromotions && badgeText && (
                            <Badge className="rounded-full border-0 bg-rose-500/95 text-white hover:bg-rose-500/95">{badgeText}</Badge>
                          )}
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 text-white">
                          <div className="truncate text-xl font-semibold">{p.name}</div>
                          <div className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{addressLabel}</span>
                          </div>
                        </div>
                      </div>

                      <CardContent className="p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 text-slate-600">
                            <MapPin className="mr-1 h-3.5 w-3.5" />
                            {p.addressDistrict || p.addressCity || 'Localização'}
                          </Badge>
                          {(showStartingFromMonth || showStartingFromWeek) && !isPromotions && (
                            <Badge variant="outline" className="rounded-full border-indigo-200 bg-indigo-50 px-3 text-indigo-700">
                              <Tag className="mr-1 h-3.5 w-3.5" />
                              A partir de
                            </Badge>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div className="rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3">
                            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Faces</div>
                            <div className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{unitsCount}</div>
                          </div>
                          <div className="rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3">
                            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Disponíveis</div>
                            <div className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{availableUnits}</div>
                          </div>
                          <div className={`rounded-[20px] border bg-gradient-to-br p-3 ${availabilityMeta.statClass} ${availabilityMeta.accentClass}`}>
                            <div className="text-[11px] uppercase tracking-[0.14em] text-current/70">Status</div>
                            <div className="mt-2 text-sm font-semibold leading-5">{availabilityMeta.label}</div>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Mensal</div>
                              {promoMonthSavings && (
                                <Badge className="rounded-full border-0 bg-emerald-500/10 px-2.5 text-emerald-700 hover:bg-emerald-500/10">
                                  -{promoMonthSavings.percent}%
                                </Badge>
                              )}
                            </div>
                            <div className="mt-3 text-sm text-slate-700">
                              {isPromotions && promoMonth && promoMonthFrom !== null && promoMonthTo !== null ? (
                                <>
                                  <span className="mr-2 text-slate-400 line-through">{formatCurrency(promoMonthFrom)}</span>
                                  <span className="text-2xl font-semibold tracking-tight text-slate-950">{formatCurrency(promoMonthTo)}</span>
                                  {promoMonthSavings && <div className="mt-2 text-xs font-medium text-emerald-700">Economia de {formatCurrency(promoMonthSavings.amount)}</div>}
                                </>
                              ) : (
                                <>
                                  <div className="text-2xl font-semibold tracking-tight text-slate-950">{formatCurrency(displayMonth)}</div>
                                  {showStartingFromMonth && baseMonth !== null && baseMonth !== undefined && (
                                    <div className="mt-2 text-xs text-slate-500">Tabela padrão {formatCurrency(baseMonth)}</div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Bi-semana</div>
                              {promoWeekSavings && (
                                <Badge className="rounded-full border-0 bg-emerald-500/10 px-2.5 text-emerald-700 hover:bg-emerald-500/10">
                                  -{promoWeekSavings.percent}%
                                </Badge>
                              )}
                            </div>
                            <div className="mt-3 text-sm text-slate-700">
                              {isPromotions && promoWeek && promoWeekFrom !== null && promoWeekTo !== null ? (
                                <>
                                  <span className="mr-2 text-slate-400 line-through">{formatCurrency(promoWeekFrom)}</span>
                                  <span className="text-2xl font-semibold tracking-tight text-slate-950">{formatCurrency(promoWeekTo)}</span>
                                  {promoWeekSavings && <div className="mt-2 text-xs font-medium text-emerald-700">Economia de {formatCurrency(promoWeekSavings.amount)}</div>}
                                </>
                              ) : (
                                <>
                                  <div className="text-2xl font-semibold tracking-tight text-slate-950">{formatCurrency(displayWeek)}</div>
                                  {showStartingFromWeek && baseWeek !== null && baseWeek !== undefined && (
                                    <div className="mt-2 text-xs text-slate-500">Tabela padrão {formatCurrency(baseWeek)}</div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-4 rounded-[22px] bg-slate-950 px-4 py-3 text-white shadow-lg shadow-slate-900/10">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold">Abrir detalhe do ponto</div>
                            <div className="mt-1 text-xs text-white/70">Veja galeria, mapa e escolha as faces com mais contexto visual.</div>
                          </div>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                            <ChevronRight className="h-5 w-5 text-white/85 transition-transform duration-300 group-hover:translate-x-1" />
                          </div>
                        </div>
                      </CardContent>
                    </button>
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
