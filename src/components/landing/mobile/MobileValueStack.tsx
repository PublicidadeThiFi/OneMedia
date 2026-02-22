import { ShieldCheck, Clock4, MessageCircle, Sparkles, CheckCircle2, Laptop, Smartphone } from 'lucide-react';
import imgRelatorios from 'figma:asset/midiakit.png';

const pillars = [
  {
    title: 'Seguro e confiável',
    description: 'Controle de acesso por papel, logs de ação e backups automáticos.',
    icon: ShieldCheck,
  },
  {
    title: 'Onboarding assistido',
    description: 'Migração guiada de planilhas e treinamento para seu time em 7 dias.',
    icon: MessageCircle,
  },
  {
    title: 'Rápido para usar',
    description: 'Interfaces claras no mobile e desktop, com os mesmos dados e permissões.',
    icon: Clock4,
  },
];

const useCases = [
  {
    title: 'Vendas',
    points: ['Propostas com fotos reais', 'Follow-up com tracking', 'Aprovação digital'],
  },
  {
    title: 'Operações',
    points: ['Checklists em campo', 'Disponibilidade em tempo real', 'Alertas de sobreposição'],
  },
  {
    title: 'Financeiro',
    points: ['Cobrança ligada à campanha', 'Recorrência automática', 'Dash de margem e impostos'],
  },
  {
    title: 'Marketing',
    points: ['Mídia kit interativo', 'Mapa com filtros', 'Links públicos com token'],
  },
];

export function MobileValueStack() {
  return (
    <section className="py-16 md:py-20 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 space-y-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Sempre simples, nunca básico</p>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Projetado para a rotina em campo</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">Modo offline para checklists, notificações rápidas e layouts claros no celular.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
              <Smartphone className="h-4 w-4" />
              Mobile primeiro
            </div>
            <img src={imgRelatorios} alt="Mídia kit" className="w-full rounded-xl" />
            <p className="text-sm text-gray-600 dark:text-gray-300">Mapa, fotos, reservas e cobranças em telas otimizadas para toque.</p>
          </div>
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-gray-800 dark:to-gray-900 p-4 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold text-sm">
              <Laptop className="h-4 w-4" />
              Desktop sincronizado
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-200">Nada de versões diferentes: a mesma base de dados em qualquer dispositivo.</p>
            <div className="rounded-xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 p-3 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
                <Sparkles className="h-4 w-4 text-blue-600" />
                Automação pronta para uso
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300">Reservas liberam cobrança, campanhas alimentam dashboards e mídia kit atualiza sozinho.</p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 shadow-sm space-y-2">
              <pillar.icon className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{pillar.title}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">{pillar.description}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Funciona para qualquer time</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {useCases.map((useCase) => (
              <div key={useCase.title} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  {useCase.title}
                </div>
                <ul className="mt-2 space-y-1">
                  {useCase.points.map((point) => (
                    <li key={point} className="text-xs text-gray-600 dark:text-gray-300">• {point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
