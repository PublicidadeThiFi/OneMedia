import { useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useNavigation } from '../contexts/NavigationContext';
import { ArrowLeft, ArrowRight, Building2, RefreshCcw } from 'lucide-react';
import { usePublicMediaKit } from '../hooks/usePublicMediaKit';

function getQuery() {
  const sp = new URLSearchParams(window.location.search);
  return {
    token: sp.get('token') || sp.get('t') || '',
    uf: String(sp.get('uf') || '').trim().toUpperCase(),
  };
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

type CityRow = { city: string; pointsCount: number };

export default function MenuSelectCity() {
  const navigate = useNavigation();
  const [q, setQ] = useState('');

  const { token, uf } = useMemo(() => getQuery(), []);
  const { data, loading, error, reload } = usePublicMediaKit({ token });

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

  if (!uf) {
    return (
      <div className="min-h-screen w-full bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Selecione uma UF primeiro</h1>
          <p className="mt-2 text-sm text-gray-600">
            Para escolher uma cidade, volte e selecione um estado (UF).
          </p>
          <div className="mt-6">
            <Button onClick={() => navigate(`/menu/uf${buildQuery({ token })}`)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Ir para UFs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          <div className="text-sm text-gray-600">UF → Cidade</div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => navigate(`/menu/uf${buildQuery({ token })}`)}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Selecione a Cidade</h1>
            <p className="mt-1 text-sm text-gray-600">
              UF selecionada: <span className="font-semibold">{uf}</span>
            </p>
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

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading && cities.length === 0
            ? Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx} className="animate-pulse">
                  <CardContent className="py-4">
                    <div className="h-4 w-32 rounded bg-gray-200" />
                    <div className="mt-2 h-3 w-20 rounded bg-gray-200" />
                    <div className="mt-3 h-8 w-full rounded bg-gray-200" />
                  </CardContent>
                </Card>
              ))
            : cities.map((row) => (
                <Card key={row.city} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Building2 className="h-5 w-5 text-gray-700" />
                      </div>

                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">{row.city}</div>
                        <div className="text-xs text-gray-600">{uf}</div>
                        <div className="mt-2 text-xs text-gray-500">{row.pointsCount} ponto(s)</div>
                      </div>

                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => navigate(`/menu/pontos${buildQuery({ token, uf, city: row.city })}`)}
                      >
                        Escolher
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {!loading && !error && cities.length === 0 && (
          <div className="mt-6 text-sm text-gray-600">Nenhuma cidade encontrada para esta UF.</div>
        )}
      </div>
    </div>
  );
}
