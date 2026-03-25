import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, RefreshCcw, Search } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useNavigation } from '../contexts/NavigationContext';
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

type CityRow = {
  city: string;
  pointsCount: number;
};

export default function MenuSelectCity() {
  const navigate = useNavigation();
  const [q, setQ] = useState('');

  const { token, flow, ownerCompanyId, uf } = useMemo(() => getMenuQueryParams(), []);
  const { data, loading, error, reload } = usePublicMediaKit({ token, ownerCompanyId, flow });

  const cities = useMemo<CityRow[]>(() => {
    const points = data?.points ?? [];
    const byCity = new Map<string, number>();

    for (const p of points) {
      const pUf = String(p.addressState ?? '').trim().toUpperCase();
      if (!uf || pUf !== uf) continue;
      const city = String(p.addressCity ?? '').trim();
      if (!city) continue;
      byCity.set(city, (byCity.get(city) ?? 0) + 1);
    }

    const rows = Array.from(byCity.entries())
      .map(([city, pointsCount]) => ({ city, pointsCount }))
      .sort((a, b) => a.city.localeCompare(b.city, 'pt-BR'));

    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((x) => x.city.toLowerCase().includes(query));
  }, [data?.points, uf, q]);

  const totalPoints = useMemo(() => cities.reduce((sum, item) => sum + item.pointsCount, 0), [cities]);

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_40%,#f8fafc_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="rounded-full bg-white px-3 text-slate-700 shadow-sm">Protótipo</Badge>
          <div className="text-sm text-slate-600">Estado selecionado: <b>{uf || '—'}</b></div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" className="gap-2 rounded-2xl" onClick={() => navigate(`/menu/uf${buildQuery({ token, uf, flow, ownerCompanyId })}`)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        <div className="mt-5 rounded-[30px] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                <Building2 className="h-3.5 w-3.5" />
                Agora refine a busca pela cidade
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">Escolha a cidade para ver os pontos disponíveis</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Mostramos apenas as cidades com pontos publicados nesse estado. Assim a leitura fica enxuta e o próximo passo fica mais objetivo.
              </p>
            </div>

            <Card className="rounded-[28px] border-slate-200 bg-slate-50/80 shadow-none">
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Resumo da seleção</div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-2xl font-semibold text-slate-900">{cities.length}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">Cidades</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-2xl font-semibold text-slate-900">{totalPoints}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">Pontos</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cidade" className="h-12 rounded-2xl border-slate-200 bg-white pl-11" />
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

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {loading && cities.length === 0
            ? Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx} className="animate-pulse rounded-[28px] border-slate-200 bg-white/90">
                  <CardContent className="p-5">
                    <div className="h-5 w-24 rounded bg-slate-200" />
                    <div className="mt-3 h-3 w-32 rounded bg-slate-200" />
                    <div className="mt-5 h-11 w-full rounded-2xl bg-slate-200" />
                  </CardContent>
                </Card>
              ))
            : cities.map((item) => (
                <Card
                  key={item.city}
                  className="group rounded-[28px] border border-slate-200 bg-white/92 shadow-[0_16px_50px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_65px_rgba(15,23,42,0.12)]"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15">
                        <Building2 className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-lg font-semibold text-slate-900">{item.city}</div>
                        <div className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                          {item.pointsCount} ponto(s) publicado(s)
                        </div>

                        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                          Explore o inventário dessa cidade com foco nos pontos disponíveis para comparação e seleção.
                        </div>

                        <Button
                          size="sm"
                          className="mt-5 h-11 w-full gap-2 rounded-2xl"
                          onClick={() => navigate(`/menu/pontos${buildQuery({ token, uf, city: item.city, flow, ownerCompanyId })}`)}
                        >
                          Ver pontos da cidade
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {!loading && !error && cities.length === 0 && (
          <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-center text-sm text-slate-600">
            Não encontramos cidades para o estado <b>{uf || '—'}</b>. Volte e escolha outra região.
          </div>
        )}
      </div>
    </div>
  );
}
