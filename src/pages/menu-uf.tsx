import { useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useNavigation } from '../contexts/NavigationContext';
import { ArrowLeft, ArrowRight, MapPinned } from 'lucide-react';

type UFItem = { uf: string; nome: string };

const UFS: UFItem[] = [
  { uf: 'DF', nome: 'Distrito Federal' },
  { uf: 'GO', nome: 'Goiás' },
  { uf: 'SP', nome: 'São Paulo' },
  { uf: 'RJ', nome: 'Rio de Janeiro' },
  { uf: 'MG', nome: 'Minas Gerais' },
  { uf: 'PR', nome: 'Paraná' },
  { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'RS', nome: 'Rio Grande do Sul' },
];

function getTokenFromQuery() {
  const sp = new URLSearchParams(window.location.search);
  return sp.get('token') || sp.get('t') || '';
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

export default function MenuSelectUF() {
  const navigate = useNavigation();
  const [q, setQ] = useState('');

  const token = useMemo(() => getTokenFromQuery(), []);
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return UFS;
    return UFS.filter((x) => x.uf.toLowerCase().includes(query) || x.nome.toLowerCase().includes(query));
  }, [q]);

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          <div className="text-sm text-gray-600">UF → Cidade</div>
          <div className="ml-auto">
            <Button variant="ghost" className="gap-2" onClick={() => navigate(`/menu${buildQuery({ token })}`)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        <h1 className="mt-4 text-2xl font-bold text-gray-900">Selecione o Estado (UF)</h1>
        <p className="mt-1 text-sm text-gray-600">Escolha uma UF para ver as cidades disponíveis no cardápio.</p>

        <div className="mt-5">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar UF ou nome do estado..."
          />
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <Card key={item.uf} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <MapPinned className="h-5 w-5 text-gray-700" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">{item.uf}</div>
                    <div className="text-xs text-gray-600">{item.nome}</div>
                  </div>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => navigate(`/menu/cidades${buildQuery({ token, uf: item.uf })}`)}
                  >
                    Escolher
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-6 text-sm text-gray-600">Nenhuma UF encontrada.</div>
        )}
      </div>
    </div>
  );
}
