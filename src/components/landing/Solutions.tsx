import { useState } from 'react';
import { Package, FileText, DollarSign, Globe, Check } from 'lucide-react';

export function Solutions() {
  const [activeTab, setActiveTab] = useState(0);

  const solutions = [
    {
      icon: Package,
      title: 'Inventário organizado',
      description: 'Cadastre pontos, telas e proprietários, com fotos, localização e status em tempo real.',
      features: [
        'Cadastro completo de pontos OOH/DOOH',
        'Upload de fotos e geolocalização',
        'Controle de status (livre, ocupado, manutenção)',
        'Gestão de proprietários por ponto',
      ],
    },
    {
      icon: FileText,
      title: 'Propostas e campanhas integradas',
      description: 'Crie propostas, converta em campanhas e acompanhe veiculações em um só painel.',
      features: [
        'Montagem de propostas em minutos',
        'Geração de PDF e links públicos',
        'Conversão automática para campanha',
        'Acompanhamento de aprovações',
      ],
    },
    {
      icon: DollarSign,
      title: 'Financeiro sob controle',
      description: 'Cobranças, fluxo de caixa, repasses e relatórios conectados às campanhas.',
      features: [
        'Cobranças por campanha/cliente',
        'Fluxo de caixa mensal',
        'Controle de recebimentos',
        'Relatórios de repasse para proprietários',
      ],
    },
    {
      icon: Globe,
      title: 'Mídia Kit e Mensagens',
      description: 'Divulgue o inventário em um mídia kit interativo e centralize conversas com clientes.',
      features: [
        'Mídia kit público com filtros',
        'Mapa interativo de pontos',
        'Central de mensagens',
        'Histórico de conversas por campanha',
      ],
    },
  ];

  const scrollToFeatures = () => {
    const element = document.querySelector('#funcionalidades');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="solucoes" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-gray-900 mb-4">
            A plataforma completa para gerir sua mídia OOH/DOOH
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Do cadastro do ponto até a cobrança final, o OneMedia conecta inventário, 
            propostas, campanhas, financeiro e mídia kit.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Tabs */}
          <div className="space-y-4">
            {solutions.map((solution, index) => (
              <button
                key={solution.title}
                onClick={() => setActiveTab(index)}
                className={`w-full text-left p-6 rounded-xl transition-all ${
                  activeTab === index
                    ? 'bg-[#4F46E5] text-white shadow-lg'
                    : 'bg-white text-gray-900 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  <solution.icon className={`w-6 h-6 flex-shrink-0 ${
                    activeTab === index ? 'text-white' : 'text-[#4F46E5]'
                  }`} />
                  <div className="flex-1">
                    <h3 className={`mb-2 ${
                      activeTab === index ? 'text-white' : 'text-gray-900'
                    }`}>
                      {solution.title}
                    </h3>
                    <p className={`text-sm ${
                      activeTab === index ? 'text-white/90' : 'text-gray-600'
                    }`}>
                      {solution.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl p-8 shadow-lg sticky top-24">
            <div className="flex items-center gap-3 mb-6">
              {(() => {
                const IconComponent = solutions[activeTab].icon;
                return <IconComponent className="w-8 h-8 text-[#4F46E5]" />;
              })()}
              <h3 className="text-gray-900">{solutions[activeTab].title}</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              {solutions[activeTab].description}
            </p>

            <ul className="space-y-3 mb-8">
              {solutions[activeTab].features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={scrollToFeatures}
              className="text-[#4F46E5] hover:text-[#4338CA] transition-colors"
            >
              Ver todas as funcionalidades →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
