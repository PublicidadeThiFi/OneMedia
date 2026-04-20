import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Layers3,
  MapPinned,
  RefreshCcw,
  Search,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useNavigation } from '../contexts/NavigationContext';
import { getBrStateName } from '../lib/brStates';
import { getMenuQueryParams } from '../lib/menuFlow';
import { usePublicMediaKit } from '../hooks/usePublicMediaKit';

function buildQuery(params: Record<string, string | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    const val = String(v ?? '').trim();
    if (val) sp.set(k, val);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

function getPointAvailabilityMeta(point: any) {
  const units = Array.isArray(point?.units) ? point.units.filter((u: any) => u?.isActive !== false) : [];
  const unitsCountRaw = Number(point?.unitsCount ?? units.length ?? 0);
  const unitsCount = Number.isFinite(unitsCountRaw) ? Math.max(0, unitsCountRaw) : 0;

  const availableUnitsFromPoint = Number(point?.availableUnitsCount);
  const availableUnitsFromUnits = units.filter((u: any) => {
    const availability = String(u?.availability ?? '').trim().toLowerCase();
    if (!availability) return true;
    return availability === 'disponível' || availability === 'disponivel' || availability === 'livre';
  }).length;

  const availableUnits = Math.max(
    0,
    Math.min(unitsCount, Number.isFinite(availableUnitsFromPoint) ? availableUnitsFromPoint : availableUnitsFromUnits),
  );

  return {
    unitsCount,
    availableUnits,
    occupiedUnits: Math.max(0, unitsCount - availableUnits),
    availablePoints: availableUnits > 0 ? 1 : 0,
    occupiedPoints: unitsCount > 0 && availableUnits <= 0 ? 1 : 0,
  };
}

type UfRow = {
  uf: string;
  name: string;
  pointsCount: number;
  citiesCount: number;
  availablePoints: number;
  occupiedPoints: number;
  availableUnits: number;
  occupiedUnits: number;
};

export default function MenuSelectUF() {
  const navigate = useNavigation();
  const [q, setQ] = useState('');

  const { token, flow, ownerCompanyId } = useMemo(() => getMenuQueryParams(), []);
  const { data, loading, error, reload } = usePublicMediaKit({ token, ownerCompanyId, flow });

  const ufs = useMemo<UfRow[]>(() => {
    const points = data?.points ?? [];
    const byUf = new Map<
      string,
      {
        points: number;
        cities: Set<string>;
        availablePoints: number;
        occupiedPoints: number;
        availableUnits: number;
        occupiedUnits: number;
      }
    >();

    for (const p of points) {
      const uf = String((p as any)?.addressState ?? '').trim().toUpperCase();
      const city = String((p as any)?.addressCity ?? '').trim();
      if (!uf) continue;

      const meta = getPointAvailabilityMeta(p);
      const entry = byUf.get(uf) ?? {
        points: 0,
        cities: new Set<string>(),
        availablePoints: 0,
        occupiedPoints: 0,
        availableUnits: 0,
        occupiedUnits: 0,
      };

      entry.points += 1;
      entry.availablePoints += meta.availablePoints;
      entry.occupiedPoints += meta.occupiedPoints;
      entry.availableUnits += meta.availableUnits;
      entry.occupiedUnits += meta.occupiedUnits;
      if (city) entry.cities.add(city);
      byUf.set(uf, entry);
    }

    const rows = Array.from(byUf.entries())
      .map(([uf, meta]) => ({
        uf,
        name: getBrStateName(uf),
        pointsCount: meta.points,
        citiesCount: meta.cities.size,
        availablePoints: meta.availablePoints,
        occupiedPoints: meta.occupiedPoints,
        availableUnits: meta.availableUnits,
        occupiedUnits: meta.occupiedUnits,
      }))
      .sort((a, b) => a.uf.localeCompare(b.uf, 'pt-BR'));

    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((x) => x.uf.toLowerCase().includes(query) || x.name.toLowerCase().includes(query));
  }, [data?.points, q]);

  const totals = useMemo(() => {
    const points = ufs.reduce((sum, item) => sum + item.pointsCount, 0);
    const cities = ufs.reduce((sum, item) => sum + item.citiesCount, 0);
    const availablePoints = ufs.reduce((sum, item) => sum + item.availablePoints, 0);
    const occupiedPoints = ufs.reduce((sum, item) => sum + item.occupiedPoints, 0);
    return { states: ufs.length, points, cities, availablePoints, occupiedPoints };
  }, [ufs]);

  const featuredState = ufs[0] ?? null;
  const resultLabel = q.trim() ? `${ufs.length} estado(s) encontrado(s)` : `${ufs.length} estado(s) publicado(s)`;

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_32%,#f8fafc_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-slate-600">Passo 1 de 2 • Estado</div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" className="gap-2 rounded-2xl" onClick={() => navigate(`/menu${buildQuery({ token, flow, ownerCompanyId })}`)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        <section className="relative mt-5 overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_55%,#eef4ff_100%)] p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)] sm:p-6 lg:p-7">
          <div className="absolute -right-10 top-0 h-44 w-44 rounded-full bg-indigo-200/35 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-sky-200/30 blur-3xl" />

          <div className="relative grid gap-5 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm">
                <MapPinned className="h-3.5 w-3.5 text-indigo-600" />
                Selecione a região antes de explorar o inventário
              </div>

              <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.15rem] sm:leading-[1.08]">
                Escolha o estado com a leitura regional mais clara para começar a montar a proposta.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                Nesta etapa o foco é reduzir ruído: primeiro você escolhe a UF, depois refina por cidade com visão mais objetiva de pontos publicados e disponibilidade.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'UFs publicadas', value: String(totals.states), tone: 'from-slate-900 to-slate-700 text-white' },
                  { label: 'Pontos com disponibilidade', value: String(totals.availablePoints), tone: 'from-emerald-500 to-teal-500 text-white' },
                  { label: 'Pontos ocupados', value: String(totals.occupiedPoints), tone: 'from-amber-400 to-orange-400 text-amber-950' },
                ].map((item) => (
                  <div key={item.label} className={`rounded-[22px] bg-gradient-to-br px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] ${item.tone}`}>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-current/70">{item.label}</div>
                    <div className="mt-2 text-2xl font-semibold">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <Card className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm">
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-sky-400 to-cyan-400" />
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Resumo do inventário</div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">Números rápidos para orientar a próxima decisão sem sobrecarregar a leitura.</div>
                  </div>
                  <div className="rounded-2xl bg-slate-950 px-3 py-2 text-right text-white shadow-lg shadow-slate-900/10">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white/60">Regiões</div>
                    <div className="mt-1 text-lg font-semibold">{totals.states}</div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    { label: 'Cidades', value: String(totals.cities), icon: Layers3 },
                    { label: 'Pontos', value: String(totals.points), icon: MapPinned },
                    { label: 'Disponíveis', value: String(totals.availablePoints), icon: CheckCircle2 },
                    { label: 'Ocupados', value: String(totals.occupiedPoints), icon: AlertCircle },
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

                {featuredState && (
                  <div className="mt-5 rounded-[24px] border border-indigo-100 bg-[linear-gradient(135deg,#eef4ff_0%,#ffffff_100%)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700/70">Leitura destacada</div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">{featuredState.name}</div>
                        <div className="mt-1 text-sm text-slate-600">{featuredState.availablePoints} ponto(s) com disponibilidade para seguir no fluxo.</div>
                      </div>
                      <Badge className="rounded-full border-0 bg-white text-slate-700 shadow-sm hover:bg-white">{featuredState.uf}</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="relative mt-6 rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-sm sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Filtro regional</div>
                <div className="mt-2 flex items-center gap-3 rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar estado por UF ou nome"
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

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading && ufs.length === 0
            ? Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx} className="animate-pulse overflow-hidden rounded-[26px] border-slate-200 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                  <div className="h-1.5 bg-slate-200" />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="h-11 w-11 rounded-[18px] bg-slate-200" />
                      <div className="h-7 w-24 rounded-full bg-slate-200" />
                    </div>
                    <div className="mt-4 h-6 w-20 rounded bg-slate-200" />
                    <div className="mt-2 h-4 w-32 rounded bg-slate-200" />
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="h-20 rounded-[18px] bg-slate-100" />
                      <div className="h-20 rounded-[18px] bg-slate-100" />
                    </div>
                    <div className="mt-3 h-16 rounded-[18px] bg-slate-100" />
                    <div className="mt-4 h-11 rounded-2xl bg-slate-200" />
                  </CardContent>
                </Card>
              ))
            : ufs.map((item) => {
                const availabilityRatio = item.pointsCount > 0 ? Math.round((item.availablePoints / item.pointsCount) * 100) : 0;

                return (
                  <Card
                    key={item.uf}
                    className="group overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_44px_rgba(15,23,42,0.10)]"
                  >
                    <div className="h-1.5 bg-gradient-to-r from-slate-950 via-indigo-600 to-sky-400" />
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-slate-900 text-white shadow-lg shadow-slate-900/15">
                          <MapPinned className="h-5 w-5" />
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 text-slate-600">{item.uf}</Badge>
                          <Badge className="rounded-full border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{item.availablePoints} disponíveis</Badge>
                        </div>
                      </div>

                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xl font-semibold tracking-tight text-slate-950">{item.name}</div>
                          <div className="mt-1 text-sm text-slate-600">Navegação regional com foco em cidade, pontos ativos e disponibilidade real.</div>
                        </div>
                        <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Pontos</div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">{item.pointsCount}</div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-[18px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Cidades</div>
                          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{item.citiesCount}</div>
                          <div className="mt-2 text-xs text-slate-500">Refino da próxima etapa</div>
                        </div>
                        <div className="rounded-[18px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Ocupados</div>
                          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{item.occupiedPoints}</div>
                          <div className="mt-2 text-xs text-slate-500">Sem disponibilidade imediata</div>
                        </div>
                      </div>

                      <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50/85 p-4">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <div>
                            <div className="font-medium text-slate-900">Disponibilidade da UF</div>
                            <div className="mt-1 text-xs leading-5 text-slate-500">{item.availableUnits} face(s)/tela(s) livres para seguir no cardápio agora.</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-slate-950">{availabilityRatio}%</div>
                            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">pontos livres</div>
                          </div>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${Math.min(100, Math.max(8, availabilityRatio || 0))}%` }} />
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="mt-5 h-11 w-full gap-2 rounded-2xl"
                        onClick={() => navigate(`/menu/cidades${buildQuery({ token, uf: item.uf, flow, ownerCompanyId })}`)}
                      >
                        Escolher estado
                        <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        {!loading && !error && ufs.length === 0 && (
          <div className="mt-6 rounded-[30px] border border-dashed border-slate-300 bg-white/80 px-5 py-10 text-center shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <Sparkles className="h-5 w-5 text-slate-500" />
            </div>
            <div className="mt-4 text-base font-semibold text-slate-900">Nenhum estado disponível agora</div>
            <div className="mt-2 text-sm text-slate-600">Confira se o link está correto ou se existem pontos publicados nesse cardápio.</div>
          </div>
        )}
      </div>
    </div>
  );
}
