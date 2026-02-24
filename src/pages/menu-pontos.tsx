import { useMemo, useState } from 'react';
import { ArrowLeft, Building2, RefreshCcw, ShoppingCart, SquareStack } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useNavigation } from '../contexts/NavigationContext';
import { applyAgencyMarkup, getAgencyMarkupPercent, getMenuQueryParams, isAgencyFlow } from '../lib/menuFlow';
import { usePublicMediaKit } from '../hooks/usePublicMediaKit';
import { formatPromotionBadge, pickBestPromoForPoint, pointHasAnyPromotion } from '../lib/menuPromotions';

function formatCurrency(v: number | null | undefined) {
  if (v === null || v === undefined) return '—';
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
  } catch {
    return `R$ ${Math.round(v)}`;
  }
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

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">
            Protótipo
          </Badge>
          <div className="text-sm text-gray-600">
            {uf || '—'} / {city || '—'} → Pontos
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => navigate(`/menu/cidades${buildQuery({ token, uf, flow, ownerCompanyId })}`)}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate(`/menu/carrinho${buildQuery({ token, flow, ownerCompanyId })}`)}
            >
              <ShoppingCart className="h-4 w-4" />
              Carrinho
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Selecione o Ponto</h1>
            <p className="mt-1 text-sm text-gray-600">Clique em um ponto para ver detalhes e faces disponíveis.</p>
          </div>

          <Button variant="outline" className="gap-2" onClick={reload} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        <div className="mt-5">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ponto, bairro, rua..." />
        </div>

        {error && (
          <Card className="mt-5 border-amber-200 bg-amber-50">
            <CardContent className="py-4">
              <div className="text-sm font-semibold text-amber-900">Não foi possível carregar</div>
              <div className="mt-1 text-sm text-amber-800">{error}</div>
            </CardContent>
          </Card>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {loading && points.length === 0
            ? Array.from({ length: 9 }).map((_, idx) => (
                <Card key={idx} className="animate-pulse">
                  <CardContent className="py-4">
                    <div className="h-4 w-48 rounded bg-gray-200" />
                    <div className="mt-2 h-3 w-40 rounded bg-gray-200" />
                    <div className="mt-4 h-10 w-full rounded bg-gray-200" />
                  </CardContent>
                </Card>
              ))
            : points.map((p) => {
                const isPromotions = flow === 'promotions';

                const promoMonth = isPromotions ? pickBestPromoForPoint(p as any, 'month') : null;
                const promoWeek = isPromotions ? pickBestPromoForPoint(p as any, 'week') : null;

                const priceMonth = isAgency ? applyAgencyMarkup(p.basePriceMonth, markupPct) : p.basePriceMonth;
                const priceWeek = isAgency ? applyAgencyMarkup(p.basePriceWeek, markupPct) : p.basePriceWeek;

                const promoMonthFrom = promoMonth ? applyAgencyMarkup(promoMonth.from, markupPct) : null;
                const promoMonthTo = promoMonth ? applyAgencyMarkup(promoMonth.to, markupPct) : null;
                const promoWeekFrom = promoWeek ? applyAgencyMarkup(promoWeek.from, markupPct) : null;
                const promoWeekTo = promoWeek ? applyAgencyMarkup(promoWeek.to, markupPct) : null;

                const badgeText =
                  formatPromotionBadge(promoMonth?.promotion || promoWeek?.promotion || (p as any).promotion) ||
                  (isPromotions ? 'Promoção' : null);

                return (
                  <Card
                    key={p.id}
                    className="cursor-pointer transition-shadow hover:shadow-sm"
                    onClick={() =>
                      navigate(
                        `/menu/detalhe${buildQuery({ token, pointId: p.id, flow, ownerCompanyId })}`
                      )
                    }
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <SquareStack className="h-5 w-5 text-gray-700" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                              <div className="mt-1 text-xs text-gray-600">
                                <span className="inline-flex items-center gap-1">
                                  <Building2 className="h-3.5 w-3.5" />
                                  {p.addressDistrict || '—'} • {p.addressStreet || '—'} {p.addressNumber || ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isPromotions && badgeText && (
                                <Badge variant="secondary" className="whitespace-nowrap">
                                  {badgeText}
                                </Badge>
                              )}
                              <Badge variant="outline" className="whitespace-nowrap">
                                {p.type}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">
                              Mês:{' '}
                              {isPromotions && promoMonth && promoMonthFrom !== null && promoMonthTo !== null ? (
                                <>
                                  <span className="line-through text-gray-500">{formatCurrency(promoMonthFrom)}</span>{' '}
                                  <b className="text-gray-900">{formatCurrency(promoMonthTo)}</b>
                                </>
                              ) : (
                                <b>{formatCurrency(priceMonth)}</b>
                              )}
                            </span>
                            <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">
                              Semana:{' '}
                              {isPromotions && promoWeek && promoWeekFrom !== null && promoWeekTo !== null ? (
                                <>
                                  <span className="line-through text-gray-500">{formatCurrency(promoWeekFrom)}</span>{' '}
                                  <b className="text-gray-900">{formatCurrency(promoWeekTo)}</b>
                                </>
                              ) : (
                                <b>{formatCurrency(priceWeek)}</b>
                              )}
                            </span>
                          </div>

                          {p.unitsCount !== undefined && (
                            <div className="mt-2 text-xs text-gray-500">
                              {p.unitsCount} face(s) • {p.availableUnitsCount ?? 0} disponível(is)
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        {!loading && !error && points.length === 0 && (
          <div className="mt-6 text-sm text-gray-600">Nenhum ponto encontrado.</div>
        )}
      </div>
    </div>
  );
}
