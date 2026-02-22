import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, Check, MapPin, FileText, Sparkles, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import imgInventario from 'figma:asset/6278c812688036c294627847a92c37d9fdd135d8.png';
import imgPropostas from 'figma:asset/8c102002d56706280ee26142532d5a1c15f2e0da.png';
import imgCampanhas from 'figma:asset/15a28e63418d28c9ec12a06d0df66c23e5e7edac.png';
import imgFinanceiro from 'figma:asset/ea092394ba26ae8e99aec4c2c652c109f797a8ef.png';
import imgRelatorios from 'figma:asset/24be53fa98cb70de89bcd6b3013fd88d5eff019e.png';

const featureList = [
  {
    key: 'inventario',
    title: 'Inventário e pontos',
    description: 'Cadastro geolocalizado de pontos, faces e donos com fotos e status em tempo real.',
    bullets: ['Geolocalização automática', 'Faces com checklist de qualidade', 'Versionamento e histórico'],
    stat: '−70% tempo operacional',
    image: imgInventario,
    icon: MapPin,
    accent: 'from-blue-500/10 to-blue-600/5',
  },
  {
    key: 'propostas',
    title: 'Propostas e reservas',
    description: 'Monte propostas com disponibilidade real, templates e assinatura digital.',
    bullets: ['Templates com fotos reais', 'Disponibilidade em tempo real', 'Envio com tracking'],
    stat: '+85% conversão',
    image: imgPropostas,
    icon: FileText,
    accent: 'from-purple-500/10 to-purple-600/5',
  },
  {
    key: 'campanhas',
    title: 'Campanhas e ativações',
    description: 'Planeje veiculações, controle ocupação e acompanhe SLA por cliente.',
    bullets: ['Calendário visual', 'Alertas de sobreposição', 'Paineis por cliente'],
    stat: '100% visibilidade de veiculação',
    image: imgCampanhas,
    icon: BarChart3,
    accent: 'from-amber-500/10 to-orange-500/5',
  },
  {
    key: 'financeiro',
    title: 'Financeiro automatizado',
    description: 'Cobrança ligada às campanhas, boletos e alertas de inadimplência.',
    bullets: ['Baixas automáticas', 'Emissão recorrente', 'Relatórios de margem'],
    stat: '−78% inadimplência',
    image: imgFinanceiro,
    icon: Wallet,
    accent: 'from-emerald-500/10 to-emerald-600/5',
  },
  {
    key: 'insights',
    title: 'Dashboard e mídia kit',
    description: 'Inteligência em tempo real e mídia kit digital com mapa interativo.',
    bullets: ['KPIs em tempo real', 'Mapa com filtros', 'Compartilhamento seguro'],
    stat: '+92% engajamento',
    image: imgRelatorios,
    icon: Sparkles,
    accent: 'from-indigo-500/10 to-indigo-600/5',
  },
];

export function MobileFeatureTabs() {
  const [activeKey, setActiveKey] = useState(featureList[0].key);
  const [slideIndex, setSlideIndex] = useState(0);

  const slides = useMemo(() => featureList.map((item) => ({ ...item })), []);
  const selected = slides.find((item) => item.key === activeKey) ?? slides[0];
  const Icon = selected.icon;

  const goTo = (key: string) => {
    setActiveKey(key);
    const idx = slides.findIndex((s) => s.key === key);
    if (idx >= 0) setSlideIndex(idx);
  };

  const nextSlide = () => {
    setSlideIndex((prev) => {
      const next = (prev + 1) % slides.length;
      setActiveKey(slides[next].key);
      return next;
    });
  };

  const prevSlide = () => {
    setSlideIndex((prev) => {
      const next = (prev - 1 + slides.length) % slides.length;
      setActiveKey(slides[next].key);
      return next;
    });
  };

  // Auto-play every 3s
  useEffect(() => {
    const id = window.setInterval(() => {
      nextSlide();
    }, 3000);
    return () => window.clearInterval(id);
  }, [slides.length]);

  return (
    <section id="mobile-modulos" className="py-16 md:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Fluxos na palma da mão</p>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Escolha o módulo e veja o fluxo mobile</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">Navegação simples, cartões claros e os mesmos dados do desktop, sem abrir mão da velocidade.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {featureList.map((item) => (
            <button
              key={item.key}
              onClick={() => goTo(item.key)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-sm font-semibold shadow-sm transition-colors ${
                item.key === activeKey
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:border-blue-200 dark:hover:border-blue-700'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </button>
          ))}
        </div>

        <div className={`relative rounded-2xl border border-gray-100 dark:border-gray-800 bg-gradient-to-br ${selected.accent} dark:from-gray-900 dark:to-gray-950 p-4 shadow-sm space-y-4`}>
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-300 shadow">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selected.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{selected.description}</p>
            </div>
          </div>

          <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-3 shadow-sm relative overflow-hidden">
            <img
              key={selected.key}
              src={selected.image}
              alt={selected.title}
              className="w-full rounded-lg transition-opacity duration-300"
            />

            <div className="absolute inset-y-0 left-2 flex items-center">
              <button
                aria-label="Anterior"
                onClick={prevSlide}
                className="rounded-full bg-white/80 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-700 p-2 shadow hover:bg-white dark:hover:bg-gray-900"
              >
                <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-200" />
              </button>
            </div>
            <div className="absolute inset-y-0 right-2 flex items-center">
              <button
                aria-label="Próximo"
                onClick={nextSlide}
                className="rounded-full bg-white/80 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-700 p-2 shadow hover:bg-white dark:hover:bg-gray-900"
              >
                <ChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-200" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {selected.bullets.map((bullet) => (
              <div key={bullet} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                <Check className="h-4 w-4 text-green-600" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-white dark:bg-gray-900 px-4 py-3 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <ArrowRight className="h-4 w-4 text-blue-600" />
              Resultado direto no app
            </div>
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-full">{selected.stat}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
