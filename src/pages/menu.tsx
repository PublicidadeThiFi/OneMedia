import { useMemo } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useNavigation } from '../contexts/NavigationContext';
import { ArrowRight, Building2, Menu as MenuIcon, Tag } from 'lucide-react';
import { buildMenuUrl, buildQueryString, getMenuQueryParams, MenuFlow } from '../lib/menuFlow';

const ONE_MEDIA_LOGO_SRC = '/figma-assets/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';
const OUTDOOR_BG_SRC = '/figma-assets/outdoor.png';

export default function MenuHome() {
  const navigate = useNavigation();

  const { token, ownerCompanyId } = useMemo(() => {
    const q = getMenuQueryParams();
    return { token: q.token, ownerCompanyId: q.ownerCompanyId };
  }, []);

  const goToUF = (flow: MenuFlow) => {
    navigate(buildMenuUrl('/menu/uf', { token, flow, ownerCompanyId }));
  };

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
          <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-white/70 to-gray-50" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pt-10 pb-10">
          {/* Header */}
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

          {/* Intro */}
          <div className="mt-7">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Monte sua seleção do jeito certo
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-2xl">
              Escolha o modo de navegação e siga por UF → Cidade → Pontos até enviar sua solicitação.
            </p>
          </div>

          {/* Modes */}
          <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-gray-200/70 bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-gray-900/5 flex items-center justify-center">
                      <MenuIcon className="h-4 w-4 text-gray-800" />
                    </div>
                    <div className="text-sm font-semibold text-gray-900">Cardápio</div>
                  </div>
                  <Badge variant="secondary" className="rounded-full">Padrão</Badge>
                </div>

                <p className="mt-3 text-sm text-gray-600">
                  Explore todo o inventário e monte sua seleção sem filtros especiais.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full">UF → Cidade</Badge>
                  <Badge variant="outline" className="rounded-full">Pontos e faces</Badge>
                  <Badge variant="outline" className="rounded-full">Carrinho</Badge>
                </div>

                <Button className="mt-5 w-full gap-2" onClick={() => goToUF('default')}>
                  Começar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="border-gray-200/70 bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-gray-900/5 flex items-center justify-center">
                      <Tag className="h-4 w-4 text-gray-800" />
                    </div>
                    <div className="text-sm font-semibold text-gray-900">Promoções</div>
                  </div>
                  <Badge variant="secondary" className="rounded-full">Oferta</Badge>
                </div>

                <p className="mt-3 text-sm text-gray-600">
                  Navegue focado em oportunidades. Ideal para aproveitar condições promocionais.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full">Somente em oferta</Badge>
                  <Badge variant="outline" className="rounded-full">Face &amp; ponto</Badge>
                  <Badge variant="outline" className="rounded-full">Validade</Badge>
                </div>

                <Button className="mt-5 w-full gap-2" onClick={() => goToUF('promotions')}>
                  Ver promoções
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="border-gray-200/70 bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-gray-900/5 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-gray-800" />
                    </div>
                    <div className="text-sm font-semibold text-gray-900">Sou Agência</div>
                  </div>
                  <Badge variant="secondary" className="rounded-full">Markup</Badge>
                </div>

                <p className="mt-3 text-sm text-gray-600">
                  Use o fluxo com precificação de agência (markup configurável no Super Admin).
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full">Precificação agência</Badge>
                  <Badge variant="outline" className="rounded-full">Markup global</Badge>
                  <Badge variant="outline" className="rounded-full">Transparente</Badge>
                </div>

                <Button className="mt-5 w-full gap-2" onClick={() => goToUF('agency')}>
                  Entrar como agência
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Footer actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => navigate(`/mk${buildQueryString({ token, ownerCompanyId: ownerCompanyId ?? undefined })}`)}
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
