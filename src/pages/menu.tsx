import { useMemo } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useNavigation } from '../contexts/NavigationContext';
import { ArrowRight, Building2, Menu as MenuIcon, Sparkles, Tag } from 'lucide-react';
import { buildMenuUrl, buildQueryString, getMenuQueryParams, MenuFlow } from '../lib/menuFlow';

const ONE_MEDIA_LOGO_SRC = '/figma-assets/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';
const OUTDOOR_BG_SRC = '/figma-assets/outdoor.png';

const modeCards: Array<{
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  cta: string;
  flow: MenuFlow;
  badge: string;
  icon: typeof MenuIcon;
}> = [
  {
    title: 'Cardápio',
    subtitle: 'Fluxo padrão',
    description: 'Veja todos os pontos disponíveis, compare preços e avance até o carrinho com uma leitura mais simples.',
    tags: ['UF → Cidade', 'Pontos e faces', 'Carrinho'],
    cta: 'Ver tudo',
    flow: 'default',
    badge: 'Padrão',
    icon: MenuIcon,
  },
  {
    title: 'Promoções',
    subtitle: 'Itens com desconto ativo',
    description: 'Filtra automaticamente apenas as oportunidades promocionais para acelerar a decisão comercial.',
    tags: ['Somente em oferta', 'Face & ponto', 'Validade'],
    cta: 'Ver descontos',
    flow: 'promotions',
    badge: 'Oferta',
    icon: Tag,
  },
  {
    title: 'Sou Agência',
    subtitle: 'Markup aplicado',
    description: 'Mantém o mesmo fluxo, mas já exibe os valores com acréscimo de agência de forma transparente.',
    tags: ['Precificação agência', 'Markup global', 'Transparente'],
    cta: 'Continuar como agência',
    flow: 'agency',
    badge: 'Markup',
    icon: Building2,
  },
];

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
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_38%,#f8fafc_100%)]">
      <div className="relative overflow-hidden border-b border-white/40 bg-slate-950 text-white">
        <div className="absolute inset-0">
          <img src={OUTDOOR_BG_SRC} alt="" className="h-full w-full object-cover opacity-20" loading="lazy" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(15,23,42,0.78))]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm">
              <img src={ONE_MEDIA_LOGO_SRC} alt="OneMedia" className="h-7 w-7" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide text-white/90">Cardápio de Mídia</div>
              <div className="text-xs text-white/65">Fluxo guiado para montar sua proposta sem precisar de login</div>
            </div>
            <Badge className="ml-auto rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/10">Protótipo</Badge>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Navegação mais clara para decidir mais rápido
              </div>
              <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Escolha o fluxo ideal e monte sua proposta com leitura comercial e objetiva.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
                Você escolhe o caminho, avança por estado, cidade, ponto e face, e chega ao carrinho com tudo organizado visualmente para comparar melhor.
              </p>
            </div>

            <Card className="rounded-3xl border border-white/15 bg-white/10 text-white shadow-2xl shadow-slate-950/30 backdrop-blur-md">
              <CardContent className="p-6">
                <div className="text-xs uppercase tracking-[0.16em] text-white/60">Como funciona</div>
                <div className="mt-4 space-y-4">
                  {[
                    ['1', 'Escolha o modo de navegação', 'Cardápio, promoções ou agência.'],
                    ['2', 'Filtre por região', 'Selecione UF e cidade com poucos cliques.'],
                    ['3', 'Compare e envie', 'Veja detalhes, adicione ao carrinho e avance.'],
                  ].map(([step, title, desc]) => (
                    <div key={step} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-900">{step}</div>
                      <div>
                        <div className="text-sm font-semibold text-white">{title}</div>
                        <div className="mt-1 text-xs leading-5 text-white/65">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {modeCards.map((mode) => {
            const Icon = mode.icon;
            return (
              <Card
                key={mode.title}
                className="group rounded-[28px] border border-slate-200/70 bg-white/90 shadow-[0_16px_50px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_65px_rgba(15,23,42,0.12)]"
              >
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/20 transition-transform duration-200 group-hover:scale-105">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="rounded-full bg-slate-100 px-3 text-slate-700">{mode.badge}</Badge>
                  </div>

                  <div className="mt-6">
                    <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{mode.subtitle}</div>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">{mode.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{mode.description}</p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {mode.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-6 flex-1 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="text-sm font-semibold text-slate-800">Ideal para</div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      {mode.flow === 'default' && 'Quem quer comparar o inventário completo de forma organizada antes de escolher.'}
                      {mode.flow === 'promotions' && 'Quem deseja visualizar primeiro as melhores oportunidades comerciais ativas.'}
                      {mode.flow === 'agency' && 'Quem precisa enxergar o valor final com markup de agência já aplicado.'}
                    </div>
                  </div>

                  <Button className="mt-6 h-11 w-full gap-2 rounded-2xl" onClick={() => goToUF(mode.flow)}>
                    {mode.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur">
          <div>
            <div className="text-sm font-semibold text-slate-900">Quer voltar para o Mídia Kit?</div>
            <div className="mt-1 text-sm text-slate-600">Você pode sair agora e retornar depois pelo mesmo link de acesso.</div>
          </div>
          <Button
            variant="outline"
            className="rounded-2xl border-slate-200 bg-white px-5"
            onClick={() => navigate(`/mk${buildQueryString({ token, ownerCompanyId: ownerCompanyId ?? undefined })}`)}
          >
            Voltar ao Mídia Kit
          </Button>
        </div>

        {!token && (
          <Card className="mt-6 rounded-[28px] border-amber-200 bg-amber-50 shadow-[0_12px_35px_rgba(245,158,11,0.08)]">
            <CardContent className="p-5">
              <div className="text-sm font-semibold text-amber-950">Atenção</div>
              <div className="mt-1 text-sm leading-6 text-amber-900/80">
                Abra pelo link que você recebeu com a chave de acesso. Sem isso, alguns itens podem não aparecer corretamente.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
