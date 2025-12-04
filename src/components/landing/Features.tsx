import { Package, FileText, DollarSign, BarChart3, MessageSquare, ArrowRight } from 'lucide-react';

export function Features() {
  const featureGroups = [
    {
      icon: Package,
      title: 'Inventário & Reservas',
      features: [
        'Cadastro de pontos OOH/DOOH com fotos e coordenadas',
        'Suporte para múltiplos proprietários por ponto (1-4 proprietários)',
        'Controle de ocupação e reservas por período',
      ],
    },
    {
      icon: FileText,
      title: 'Propostas & Campanhas',
      features: [
        'Propostas com investimento, datas e mídia, prontas para PDF ou link público',
        'Links públicos de aprovação pelo cliente',
        'Conversão de proposta em campanha e booking automático',
      ],
    },
    {
      icon: DollarSign,
      title: 'Financeiro',
      features: [
        'Cobranças por campanha/cliente com status (aberta, enviada, vencida, paga, cancelada)',
        'Fluxo de caixa mensal com categorias de transação',
        'Relatórios de repasse para proprietários (futuro)',
      ],
    },
    {
      icon: BarChart3,
      title: 'Mídia Kit & Dashboard',
      features: [
        'Mídia kit público com filtros e mapa interativo',
        'Cards de desempenho no dashboard (inventário, propostas, campanhas, clientes)',
        'Analytics básicos de pontos mais vistos (futuro)',
      ],
    },
    {
      icon: MessageSquare,
      title: 'Mensagens & Integrações',
      features: [
        'Central de conversas por proposta/campanha (e-mail + WhatsApp via integração futura)',
        'Integração com emissão de NFs via APIs externas',
        'Webhooks e API (futuro) para outros sistemas',
      ],
    },
  ];

  return (
    <section id="funcionalidades" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-gray-900 mb-4">Funcionalidades por área</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Conheça os principais módulos que compõem a plataforma completa de gestão OOH/DOOH.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {featureGroups.map((group) => (
            <div
              key={group.title}
              className="bg-white rounded-xl p-8 border border-gray-200 hover:shadow-lg transition-all group"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#4F46E5]/10 rounded-lg flex items-center justify-center">
                  <group.icon className="w-6 h-6 text-[#4F46E5]" />
                </div>
                <h3 className="text-gray-900">{group.title}</h3>
              </div>

              <ul className="space-y-3 mb-6">
                {group.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="/cadastro"
                className="inline-flex items-center gap-2 text-[#4F46E5] hover:text-[#4338CA] transition-colors group-hover:gap-3"
              >
                Ver mais detalhes
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}