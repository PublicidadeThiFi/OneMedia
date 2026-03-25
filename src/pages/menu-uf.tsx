import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, MapPinned, RefreshCcw, Search } from 'lucide-react';
import { Badge } from '../components/ui/badge';
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

type UfRow = {
  uf: string;
  name: string;
  pointsCount: number;
  citiesCount: number;
};

export default function MenuSelectUF() {
  const navigate = useNavigation();
  const [q, setQ] = useState('');

  const { token, flow, ownerCompanyId } = useMemo(() => getMenuQueryParams(), []);
  const { data, loading, error, reload } = usePublicMediaKit({ token, ownerCompanyId, flow });

  const ufs = useMemo<UfRow[]>(() => {
    const points = data?.points ?? [];
    const byUf = new Map<string, { points: number; cities: Set<string> }>();

    for (const p of points) {
      const uf = String(p.addressState ?? '').trim().toUpperCase();
      const city = String(p.addressCity ?? '').trim();
      if (!uf) continue;
      const entry = byUf.get(uf) ?? { points: 0, cities: new Set<string>() };
      entry.points += 1;
      if (city) entry.cities.add(city);
      byUf.set(uf, entry);
    }

    const rows = Array.from(byUf.entries())
      .map(([uf, meta]) => ({
        uf,
        name: getBrStateName(uf),
        pointsCount: meta.points,
        citiesCount: meta.cities.size,
      }))
      .sort((a, b) => a.uf.localeCompare(b.uf, 'pt-BR'));

    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((x) => x.uf.toLowerCase().includes(query) || x.name.toLowerCase().includes(query));
  }, [data?.points, q]);

  const totals = useMemo(() => {
    const points = ufs.reduce((sum, item) => sum + item.pointsCount, 0);
    const cities = ufs.reduce((sum, item) => sum + item.citiesCount, 0);
    return { states: ufs.length, points, cities };
  }, [ufs]);

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_40%,#f8fafc_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="rounded-full bg-white px-3 text-slate-700 shadow-sm">Protótipo</Badge>
          <div className="text-sm text-slate-600">Passo 1 de 2 • Estado</div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" className="gap-2 rounded-2xl" onClick={() => navigate(`/menu${buildQuery({ token, flow, ownerCompanyId })}`)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
          <div className="grid gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                <MapPinned className="h-3.5 w-3.5" />
                Selecione a região antes de explorar o inventário
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Escolha o estado onde você quer anunciar</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Organizamos o cardápio por região para a navegação ficar mais leve. No próximo passo você escolhe a cidade com pontos publicados.
              </p>
            </div>

            <Card className="rounded-[22px] border-slate-200 bg-slate-50/80 shadow-none">
              <CardContent className="p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Resumo do inventário</div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    ['UFs', String(totals.states)],
                    ['Cidades', String(totals.cities)],
                    ['Pontos', String(totals.points)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
                      <div className="text-base font-semibold text-slate-900">{value}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar estado (UF ou nome)"
                className="h-11 rounded-2xl border-slate-200 bg-white pl-11"
              />
            </div>
            <Button variant="outline" className="h-11 gap-2 rounded-2xl border-slate-200 bg-white px-4" onClick={reload} disabled={loading}>
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

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {loading && ufs.length === 0
            ? Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx} className="animate-pulse rounded-[28px] border-slate-200 bg-white/90">
                  <CardContent className="p-4">
                    <div className="h-5 w-16 rounded bg-slate-200" />
                    <div className="mt-3 h-3 w-36 rounded bg-slate-200" />
                    <div className="mt-5 h-11 w-full rounded-2xl bg-slate-200" />
                  </CardContent>
                </Card>
              ))
            : ufs.map((item) => (
                <Card
                  key={item.uf}
                  className="group rounded-[22px] border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.09)]"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15">
                        <MapPinned className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold text-slate-900">{item.uf}</div>
                            <div className="mt-1 text-sm text-slate-600">{item.name}</div>
                          </div>
                          <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 text-slate-600">
                            {item.pointsCount} pontos
                          </Badge>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-base font-semibold text-slate-900">{item.citiesCount}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">Cidades</div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-base font-semibold text-slate-900">{item.pointsCount}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">Pontos</div>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          className="mt-5 h-11 w-full gap-2 rounded-2xl"
                          onClick={() => navigate(`/menu/cidades${buildQuery({ token, uf: item.uf, flow, ownerCompanyId })}`)}
                        >
                          Escolher estado
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {!loading && !error && ufs.length === 0 && (
          <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-center text-sm text-slate-600">
            Não encontramos nenhum estado para este link. Confira se você abriu o link correto e se existem pontos publicados.
          </div>
        )}
      </div>
    </div>
  );
}
