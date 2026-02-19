import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, MapPinned, RefreshCcw } from 'lucide-react';
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
  const { data, loading, error, reload } = usePublicMediaKit({ token, ownerCompanyId });

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

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">
            Protótipo
          </Badge>
          <div className="text-sm text-gray-600">UF → Cidade</div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => navigate(`/menu${buildQuery({ token, flow, ownerCompanyId })}`)}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Selecione o Estado (UF)</h1>
            <p className="mt-1 text-sm text-gray-600">As UFs abaixo são derivadas do inventário real do Mídia Kit público.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={reload} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        <div className="mt-5">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar UF ou nome do estado..." />
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
          {loading && ufs.length === 0
            ? Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx} className="animate-pulse">
                  <CardContent className="py-4">
                    <div className="h-4 w-16 rounded bg-gray-200" />
                    <div className="mt-2 h-3 w-32 rounded bg-gray-200" />
                    <div className="mt-3 h-8 w-full rounded bg-gray-200" />
                  </CardContent>
                </Card>
              ))
            : ufs.map((item) => (
                <Card key={item.uf} className="transition-shadow hover:shadow-sm">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <MapPinned className="h-5 w-5 text-gray-700" />
                      </div>

                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">{item.uf}</div>
                        <div className="text-xs text-gray-600">{item.name}</div>
                        <div className="mt-2 text-xs text-gray-500">
                          {item.pointsCount} ponto(s) • {item.citiesCount} cidade(s)
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() =>
                          navigate(
                            `/menu/cidades${buildQuery({ token, uf: item.uf, flow, ownerCompanyId })}`
                          )
                        }
                      >
                        Escolher
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {!loading && !error && ufs.length === 0 && (
          <div className="mt-6 text-sm text-gray-600">
            Nenhuma UF encontrada. Verifique se o token é válido e se há pontos publicados no Mídia Kit.
          </div>
        )}
      </div>
    </div>
  );
}
