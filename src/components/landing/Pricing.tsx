import { Check, Star, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigation } from '../../App';
import { PLATFORM_PLANS } from '../../lib/plans';

export function Pricing() {
  const navigate = useNavigation();
  const [showAddonTooltip, setShowAddonTooltip] = useState(false);

  const includes = [
    'Todos os módulos do OneMedia',
    'Multiusuário',
    'Suporte por e-mail/WhatsApp',
    'Teste grátis de 30 dias (sem cartão)',
  ];

  return (
    <section id="planos" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-gray-900 mb-4">
            Escolha o plano ideal pelo volume de pontos
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Planos flexíveis que crescem com o seu negócio. Sem surpresas, sem taxas escondidas.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {PLATFORM_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-xl p-6 border-2 transition-all hover:shadow-lg ${
                plan.isPopular
                  ? 'border-[#4F46E5] shadow-lg'
                  : 'border-gray-200 hover:border-[#4F46E5]'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-[#4F46E5] text-white px-4 py-1 rounded-full flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4" />
                    Mais Popular
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-gray-900 mb-2">{plan.name}</h3>
                <div className="text-sm text-gray-500 mb-4">
                  {plan.maxPoints ? `Até ${plan.maxPoints} pontos` : 'Ilimitado'}
                </div>
                <div className="text-3xl text-gray-900 mb-1">{plan.priceLabel}</div>
                {plan.monthlyPrice > 0 && <div className="text-sm text-gray-500">/mês</div>}
              </div>

              <ul className="space-y-3 mb-6">
                {includes.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>

              {plan.monthlyPrice === 0 ? (
                <button
                  onClick={() => navigate('/contato')}
                  className="block w-full text-center bg-white border-2 border-[#4F46E5] text-[#4F46E5] px-6 py-3 rounded-lg hover:bg-[#4F46E5] hover:text-white transition-colors"
                >
                  Falar com vendas
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/signup?planRange=${plan.range}`)}
                  className={`block w-full text-center px-6 py-3 rounded-lg transition-colors ${
                    plan.isPopular
                      ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Começar teste neste plano
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Multi-Proprietários */}
        <div className="bg-gradient-to-r from-[#4F46E5]/10 to-purple-100 rounded-xl p-6 sm:p-8 border-2 border-[#4F46E5]/30">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h3 className="text-gray-900 mb-2">Multi-Proprietários</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Permite cadastrar até 4 proprietários por ponto de mídia. 
                Por padrão, todos os planos incluem 1 proprietário por ponto. Selecione o plano que precisa:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white rounded-lg px-4 py-3 border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">1 proprietário</div>
                  <div className="text-lg text-green-600">Incluso</div>
                </div>
                <div className="bg-white rounded-lg px-4 py-3 border border-[#4F46E5]">
                  <div className="text-sm text-gray-600 mb-1">2 proprietários</div>
                  <div className="text-lg text-[#4F46E5]">R$ 99/mês</div>
                </div>
                <div className="bg-white rounded-lg px-4 py-3 border border-[#4F46E5]">
                  <div className="text-sm text-gray-600 mb-1">3 proprietários</div>
                  <div className="text-lg text-[#4F46E5]">R$ 113,85/mês</div>
                </div>
                <div className="bg-white rounded-lg px-4 py-3 border border-[#4F46E5]">
                  <div className="text-sm text-gray-600 mb-1">4 proprietários</div>
                  <div className="text-lg text-[#4F46E5]">R$ 128,70/mês</div>
                </div>
              </div>
            </div>
            
            <div className="relative self-start">
              <button
                onMouseEnter={() => setShowAddonTooltip(true)}
                onMouseLeave={() => setShowAddonTooltip(false)}
                onClick={() => setShowAddonTooltip(!showAddonTooltip)}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <HelpCircle className="w-6 h-6 text-[#4F46E5]" />
              </button>
              
              {showAddonTooltip && (
                <div className="absolute right-0 sm:right-0 top-10 w-72 sm:w-80 bg-white rounded-lg shadow-xl p-4 border border-gray-200 z-10">
                  <h4 className="text-sm text-gray-900 mb-2">Quando preciso de múltiplos proprietários?</h4>
                  <p className="text-sm text-gray-600">
                    Se você gerencia pontos que pertencem a vários proprietários diferentes, 
                    ou precisa dividir repasses entre múltiplas empresas por ponto. 
                    Ideal para veículos que trabalham com consórcios ou parcerias múltiplas.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}