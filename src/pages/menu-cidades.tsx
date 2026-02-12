import { useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useNavigation } from '../contexts/NavigationContext';
import { ArrowLeft, ArrowRight, Building2 } from 'lucide-react';

const CITIES_BY_UF: Record<string, string[]> = {
  DF: ['Brasília'],
  GO: ['Goiânia', 'Aparecida de Goiânia', 'Anápolis'],
  SP: ['São Paulo', 'Campinas', 'Santos'],
  RJ: ['Rio de Janeiro', 'Niterói', 'Duque de Caxias'],
  MG: ['Belo Horizonte', 'Contagem', 'Uberlândia'],
  PR: ['Curitiba', 'Londrina', 'Maringá'],
  SC: ['Florianópolis', 'Joinville', 'Blumenau'],
  RS: ['Porto Alegre', 'Caxias do Sul', 'Pelotas'],
};

function getQuery() {
  const sp = new URLSearchParams(window.location.search);
  return {
    token: sp.get('token') || sp.get('t') || '',
    uf: sp.get('uf') || '',
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

export default function MenuSelectCity() {
  const navigate = useNavigation();
  const [q, setQ] = useState('');

  const { token, uf } = useMemo(() => getQuery(), []);

  const cities = useMemo(() => {
    const list = CITIES_BY_UF[uf] || [];
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter((c) => c.toLowerCase().includes(query));
  }, [q, uf]);

  if (!uf) {
    return (
      <div className="min-h-screen w-full bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Selecione uma UF primeiro</h1>
          <p className="mt-2 text-sm text-gray-600">Para escolher uma cidade, volte e selecione um estado (UF).</p>
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
          <div className="ml-auto">
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

        <h1 className="mt-4 text-2xl font-bold text-gray-900">Selecione a Cidade</h1>
        <p className="mt-1 text-sm text-gray-600">UF selecionada: <span className="font-semibold">{uf}</span></p>

        <div className="mt-5">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cidade..."
          />
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cities.map((city) => (
            <Card key={city} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <Building2 className="h-5 w-5 text-gray-700" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">{city}</div>
                    <div className="text-xs text-gray-600">{uf}</div>
                  </div>

                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => navigate(`/menu/pontos${buildQuery({ token, uf, city })}`)}
                  >
                    Escolher
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {cities.length === 0 && (
          <div className="mt-6 text-sm text-gray-600">Nenhuma cidade encontrada para esta UF.</div>
        )}
      </div>
    </div>
  );
}
