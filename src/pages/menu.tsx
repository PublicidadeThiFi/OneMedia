import { useMemo } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useNavigation } from '../contexts/NavigationContext';
import { ArrowRight, Menu as MenuIcon } from 'lucide-react';

const ONE_MEDIA_LOGO_SRC = '/figma-assets/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';
const OUTDOOR_BG_SRC = '/figma-assets/outdoor.png';

function buildQuery(params: Record<string, string | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    const val = String(v ?? '').trim();
    if (val) sp.set(k, val);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export default function MenuHome() {
  const navigate = useNavigation();

  const token = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return sp.get('token') || sp.get('t') || '';
  }, []);

  const nextUrl = `/menu/uf${buildQuery({ token })}`;

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={OUTDOOR_BG_SRC}
            alt=""
            className="h-full w-full object-cover opacity-25"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/70 to-gray-50" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pt-10 pb-8">
          <div className="flex items-center gap-3">
            <img src={ONE_MEDIA_LOGO_SRC} alt="OneMedia" className="h-9 w-9" />
            <div className="flex flex-col">
              <div className="text-sm font-semibold text-gray-900">Cardápio de Outdoor</div>
              <div className="text-xs text-gray-600">Protótipo (sem login)</div>
            </div>
            <div className="ml-auto">
              <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
            </div>
          </div>

          <div className="mt-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Escolha sua praça e monte sua seleção
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-2xl">
              Navegue por UF → Cidade e avance no fluxo do Cardápio até a solicitação de proposta.
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button className="gap-2" onClick={() => navigate(nextUrl)}>
              <MenuIcon className="h-4 w-4" />
              Ver Cardápio
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate(`/mk${buildQuery({ token })}`)}
            >
              Voltar para o Mídia Kit
            </Button>
          </div>

          {!token && (
            <Card className="mt-6 border-amber-200 bg-amber-50">
              <CardContent className="py-4">
                <div className="text-sm font-semibold text-amber-900">Atenção</div>
                <div className="mt-1 text-sm text-amber-800">
                  Este protótipo funciona melhor quando aberto a partir do link compartilhado (com token).
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
