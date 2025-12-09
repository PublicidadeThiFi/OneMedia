import { ArrowRight, Check } from 'lucide-react';
import { useNavigation } from '../../App';

export function FinalCTA() {
  const navigate = useNavigation();

  return (
    <section className="py-20 bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-white mb-4">
          Pronto para sair das planilhas?
        </h2>
        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          Comece agora seu teste gratuito de 30 dias e veja o OneMedia funcionando 
          com seus próprios pontos de mídia.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <button
            onClick={() => navigate('/cadastro')}
            className="inline-flex items-center gap-2 bg-white text-[#4F46E5] px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors text-lg shadow-lg"
          >
            Começar teste grátis agora
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-white/90 text-sm">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>30 dias grátis</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>Sem cartão de crédito</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>Cancele quando quiser</span>
          </div>
        </div>
      </div>
    </section>
  );
}
