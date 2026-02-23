import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, RefreshCcw } from 'lucide-react';
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

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">
            Protótipo
          </Badge>
          <div className="text-sm text-gray-600">UF: <b>{uf || '—'}</b> → Cidade</div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => navigate(`/menu/uf${buildQuery({ token, uf, flow, ownerCompanyId })}`)}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Selecione a Cidade</h1>
            <p className="mt-1 text-sm text-gray-600">As cidades abaixo são derivadas do inventário real do Mídia Kit público.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={reload} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        <div className="mt-5">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cidade..." />
        </div>

        {error && (
          <Card className="mt-5 border-amber-200 bg-amber-50">
            <CardContent className="py-4">
              <div className="text-sm font-semibold text-amber-900">Não foi possível carregar</div>
              <div className="mt-1 text-sm text-amber-800">{error}</div>
            </CardContent>
          </Card>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loading && cities.length === 0
            ? Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx} className="animate-pulse">
                  <CardContent className="py-4">
                    <div className="h-4 w-24 rounded bg-gray-200" />
                    <div className="mt-2 h-3 w-32 rounded bg-gray-200" />
                    <div className="mt-3 h-8 w-full rounded bg-gray-200" />
                  </CardContent>
                </Card>
              ))
            : cities.map((item) => (
                <Card key={item.city} className="transition-shadow hover:shadow-sm">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Building2 className="h-5 w-5 text-gray-700" />
                      </div>

                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">{item.city}</div>
                        <div className="mt-2 text-xs text-gray-500">{item.pointsCount} ponto(s)</div>
                      </div>

                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() =>
                          navigate(
                            `/menu/pontos${buildQuery({ token, uf, city: item.city, flow, ownerCompanyId })}`
                          )
                        }
                      >
                        Ver pontos
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {!loading && !error && cities.length === 0 && (
          <div className="mt-6 text-sm text-gray-600">
            Nenhuma cidade encontrada para a UF <b>{uf || '—'}</b>.
          </div>
        )}
      </div>
    </div>
  );
}
