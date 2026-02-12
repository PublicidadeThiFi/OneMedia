import { useMemo } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useNavigation } from '../contexts/NavigationContext';
import { ArrowLeft, Construction } from 'lucide-react';

function buildQuery(params: Record<string, string | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    const val = String(v ?? '').trim();
    if (val) sp.set(k, val);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export default function MenuPontosPlaceholder() {
  const navigate = useNavigation();

  const { token, uf, city } = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return {
      token: sp.get('token') || sp.get('t') || '',
      uf: sp.get('uf') || '',
      city: sp.get('city') || '',
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          <div className="text-sm text-gray-600">UF → Cidade → Pontos</div>
          <div className="ml-auto">
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => navigate(`/menu/cidades${buildQuery({ token, uf })}`)}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        <Card className="mt-6">
          <CardContent className="py-8">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gray-100 p-2">
                <Construction className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">Lista de Pontos (Etapa 2)</div>
                <div className="text-sm text-gray-600">
                  Esta tela é um placeholder do protótipo. Na próxima etapa vamos listar os pontos reais.
                </div>
              </div>
            </div>

            <div className="mt-5 text-sm text-gray-700">
              <div><span className="font-semibold">UF:</span> {uf || '—'}</div>
              <div><span className="font-semibold">Cidade:</span> {city || '—'}</div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button onClick={() => navigate(`/menu/cidades${buildQuery({ token, uf })}`)} variant="outline">
                Trocar cidade
              </Button>
              <Button onClick={() => navigate(`/menu/uf${buildQuery({ token })}`)} variant="outline">
                Trocar UF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
