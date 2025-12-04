import { ArrowRight, Check } from 'lucide-react';
import { useNavigation } from '../../App';

export function Hero() {
  const navigate = useNavigation();

  const scrollToSolutions = () => {
    const element = document.querySelector('#solucoes');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="pt-32 pb-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text */}
          <div>
            <h1 className="text-gray-900 mb-6">
              Seu inventário de mídia organizado em minutos
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Centralize inventário, propostas, campanhas e cobranças em um só lugar. 
              Acabe com planilhas desatualizadas e ganhe tempo para vender mais.
            </p>

            {/* Primary CTA */}
            <div className="mb-3">
              <button
                onClick={() => navigate('/cadastro')}
                className="inline-flex items-center gap-2 bg-[#4F46E5] text-white px-8 py-4 rounded-lg hover:bg-[#4338CA] transition-colors text-lg"
              >
                Começar teste grátis de 30 dias
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Sem cartão de crédito • Cancele quando quiser
            </p>

            {/* Secondary CTA */}
            <button
              onClick={scrollToSolutions}
              className="text-[#4F46E5] hover:text-[#4338CA] transition-colors flex items-center gap-2"
            >
              Ver como funciona
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right Column - Mock */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              
              {/* Mock Dashboard */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#4F46E5]/10 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Pontos Ativos</div>
                    <div className="text-2xl text-gray-900">247</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Campanhas</div>
                    <div className="text-2xl text-gray-900">18</div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-3">Taxa de Ocupação</div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-[#4F46E5] h-3 rounded-full" style={{ width: '73%' }}></div>
                  </div>
                  <div className="text-sm text-gray-600 mt-2">73%</div>
                </div>

                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                      <div className="w-10 h-10 bg-gray-300 rounded"></div>
                      <div className="flex-1">
                        <div className="h-3 bg-gray-300 rounded w-3/4 mb-1"></div>
                        <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <Check className="w-5 h-5 text-green-500" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Band */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <div className="text-3xl text-[#4F46E5] mb-2">500+</div>
            <div className="text-gray-600">Veículos usando</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <div className="text-3xl text-[#4F46E5] mb-2">R$ 50M+</div>
            <div className="text-gray-600">Em campanhas gerenciadas</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <div className="text-3xl text-[#4F46E5] mb-2">Até 80%</div>
            <div className="text-gray-600">Menos tempo com planilhas</div>
          </div>
        </div>
      </div>
    </section>
  );
}
