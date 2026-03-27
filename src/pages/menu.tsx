import { useMemo } from 'react';
import { ArrowRight, Building2, Menu as MenuIcon, ShieldCheck, Sparkles, Tag } from 'lucide-react';
import oneMediaLogo from '../assets/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';
import outdoorBg from '../assets/outdoor.png';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useNavigation } from '../contexts/NavigationContext';
import { buildMenuUrl, buildQueryString, getMenuQueryParams, MenuFlow } from '../lib/menuFlow';

const modeCards: Array<{
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  cta: string;
  flow: MenuFlow;
  badge: string;
  icon: typeof MenuIcon;
  accent: string;
  glow: string;
  badgeClassName: string;
  iconWrapClassName: string;
  idealFor: string;
}> = [
  {
    title: 'Cardápio',
    subtitle: 'Fluxo padrão',
    description: 'Veja todo o inventário com leitura mais clara, destaque para preço e decisão guiada até o carrinho.',
    tags: ['UF + cidade', 'Pontos e faces', 'Comparação guiada'],
    cta: 'Ver todo o inventário',
    flow: 'default',
    badge: 'Padrão',
    icon: MenuIcon,
    accent: 'from-slate-950 via-slate-900 to-blue-900',
    glow: 'bg-blue-500/10',
    badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
    iconWrapClassName: 'bg-[linear-gradient(135deg,#0f172a,#1e3a8a)] text-white shadow-slate-900/25',
    idealFor: 'Quem quer comparar os pontos com calma antes de escolher o que entra na proposta.',
  },
  {
    title: 'Promoções',
    subtitle: 'Itens com desconto ativo',
    description: 'Prioriza as melhores oportunidades comerciais, mostrando primeiro o que já está em oferta.',
    tags: ['Somente ofertas', 'Validade ativa', 'Decisão rápida'],
    cta: 'Ver oportunidades',
    flow: 'promotions',
    badge: 'Oferta',
    icon: Tag,
    accent: 'from-amber-500 via-orange-500 to-rose-500',
    glow: 'bg-orange-500/10',
    badgeClassName: 'border-orange-200 bg-orange-50 text-orange-700',
    iconWrapClassName: 'bg-[linear-gradient(135deg,#f59e0b,#f97316)] text-white shadow-orange-500/25',
    idealFor: 'Quem quer visualizar primeiro os pontos com condição comercial mais agressiva.',
  },
  {
    title: 'Sou Agência',
    subtitle: 'Markup aplicado',
    description: 'Mantém o fluxo de navegação, mas já apresenta o valor com markup de agência de forma transparente.',
    tags: ['Markup global', 'Valor final visível', 'Leitura transparente'],
    cta: 'Entrar como agência',
    flow: 'agency',
    badge: 'Markup',
    icon: Building2,
    accent: 'from-emerald-500 via-teal-500 to-cyan-500',
    glow: 'bg-emerald-500/10',
    badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    iconWrapClassName: 'bg-[linear-gradient(135deg,#059669,#0891b2)] text-white shadow-emerald-500/25',
    idealFor: 'Quem precisa decidir já enxergando o valor final que será apresentado ao cliente.',
  },
];

const heroHighlights = [
  { label: 'Fluxos disponíveis', value: '3 modos' },
  { label: 'Leitura comercial', value: 'mais objetiva' },
  { label: 'Acesso', value: 'sem login' },
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
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f7f9fc_0%,#eef4ff_38%,#f8fafc_100%)] text-slate-900">
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-slate-950 text-white">
        <div className="absolute inset-0">
          <img src={outdoorBg} alt="" className="h-full w-full object-cover opacity-35" loading="lazy" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(2,6,23,0.94)_8%,rgba(15,23,42,0.88)_34%,rgba(15,23,42,0.54)_62%,rgba(15,23,42,0.72)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-[linear-gradient(180deg,transparent,rgba(2,6,23,0.46))]" />
          <div className="absolute -left-20 top-10 h-52 w-52 rounded-full bg-cyan-400/18 blur-3xl" />
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-violet-500/18 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pb-14">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-sm">
              <div className="rounded-2xl bg-white px-3 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.16)]">
                <img src={oneMediaLogo} alt="OneMedia Gestão de Mídia" className="h-8 w-auto sm:h-9" />
              </div>
              <div>
                <div className="text-sm font-semibold tracking-wide text-white/95">Cardápio de Mídia</div>
                <div className="text-xs text-white/70">Fluxo guiado para montar a proposta com leitura comercial mais clara</div>
              </div>
            </div>
            <Badge className="ml-auto rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-white hover:bg-white/10">
              Protótipo
            </Badge>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Navegação redesenhada para decidir mais rápido
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[3.15rem] lg:leading-[1.05]">
                Escolha o fluxo ideal e monte sua proposta com mais contraste, foco e leitura comercial.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 sm:text-[15px]">
                Você entra pelo mesmo link, escolhe o caminho certo para a negociação e avança por região, ponto e face com tudo organizado para comparar melhor antes do carrinho.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {heroHighlights.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 shadow-[0_16px_34px_rgba(2,6,23,0.18)] backdrop-blur-sm"
                  >
                    <div className="text-xs uppercase tracking-[0.16em] text-white/55">{item.label}</div>
                    <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <Card className="overflow-hidden rounded-[28px] border border-white/12 bg-white/10 text-white shadow-[0_24px_60px_rgba(2,6,23,0.28)] backdrop-blur-md">
                <CardContent className="p-0">
                  <div className="relative h-48 overflow-hidden border-b border-white/10 sm:h-52">
                    <img src={outdoorBg} alt="Visual do cardápio OneMedia" className="h-full w-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(2,6,23,0.10),rgba(2,6,23,0.58))]" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/50 px-3 py-1 text-xs text-white/85 backdrop-blur-sm">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Cardápio visual para comparar antes de decidir
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-white/55">Como funciona</div>
                      <div className="mt-3 space-y-3">
                        {[
                          ['1', 'Escolha o modo de navegação', 'Cardápio, promoções ou agência.'],
                          ['2', 'Filtre por região', 'Selecione UF e cidade com poucos cliques.'],
                          ['3', 'Compare e envie', 'Veja detalhes, adicione ao carrinho e avance.'],
                        ].map(([step, title, desc]) => (
                          <div key={step} className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-white/5 px-3 py-3.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-900">
                              {step}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white">{title}</div>
                              <div className="mt-1 text-xs leading-5 text-white/65">{desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-slate-950/35 px-4 py-4 sm:w-44">
                      <div className="text-xs uppercase tracking-[0.16em] text-white/50">Resultado</div>
                      <div className="mt-2 text-lg font-semibold text-white">Mais leitura e menos ruído visual</div>
                      <div className="mt-2 text-xs leading-5 text-white/65">
                        Imagem, valor, disponibilidade e CTA aparecem com mais clareza desde o primeiro clique.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Escolha seu caminho</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Três formas de entrar no mesmo inventário com leitura adequada para o contexto.</h2>
          </div>
          <div className="max-w-md text-sm leading-6 text-slate-600">
            O fluxo muda a forma de leitura do catálogo, mas mantém o objetivo: ajudar você a comparar rápido e chegar ao carrinho com segurança.
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {modeCards.map((mode) => {
            const Icon = mode.icon;
            return (
              <Card
                key={mode.title}
                className={`group relative overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.07)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(15,23,42,0.10)]`}
              >
                <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${mode.accent}`} />
                <div className={`absolute right-5 top-4 h-24 w-24 rounded-full blur-2xl ${mode.glow}`} />
                <CardContent className="relative flex h-full flex-col p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-[20px] shadow-lg ${mode.iconWrapClassName}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant="outline" className={`rounded-full px-3 py-1 ${mode.badgeClassName}`}>
                      {mode.badge}
                    </Badge>
                  </div>

                  <div className="mt-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{mode.subtitle}</div>
                    <h3 className="mt-2 text-[1.7rem] font-semibold tracking-tight text-slate-950">{mode.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{mode.description}</p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {mode.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-5 rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ideal para</div>
                    <div className="mt-2 text-sm leading-6 text-slate-700">{mode.idealFor}</div>
                  </div>

                  <Button className="mt-6 h-12 w-full gap-2 rounded-2xl px-5" onClick={() => goToUF(mode.flow)}>
                    {mode.cta}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-7 rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_55%,#eef4ff_100%)] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Quer voltar para o Mídia Kit?</div>
              <div className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                Você pode sair agora e retornar depois pelo mesmo link de acesso sem perder a continuidade da navegação.
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-2xl border-slate-200 bg-white px-5 text-slate-800 shadow-sm"
              onClick={() => navigate(`/mk${buildQueryString({ token, ownerCompanyId: ownerCompanyId ?? undefined })}`)}
            >
              Voltar ao Mídia Kit
            </Button>
          </div>
        </div>

        {!token && (
          <Card className="mt-6 rounded-[28px] border-amber-200 bg-amber-50 shadow-[0_12px_35px_rgba(245,158,11,0.08)]">
            <CardContent className="p-5">
              <div className="text-sm font-semibold text-amber-950">Atenção</div>
              <div className="mt-1 text-sm leading-6 text-amber-900/80">
                Abra pelo link que você recebeu para manter a navegação vinculada ao cardápio correto. Sem o token de acesso, algumas ações do fluxo podem ficar indisponíveis.
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
