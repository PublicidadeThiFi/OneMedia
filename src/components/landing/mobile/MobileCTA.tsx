import { ArrowRight, MessageCircle, Headphones } from 'lucide-react';
import { useNavigation } from '../../../App';
import { useWaitlist } from '../../../contexts/WaitlistContext';

export function MobileCTA() {
  const navigate = useNavigation();
  const { openWaitlist } = useWaitlist();

  return (
    <section className="py-16 md:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 space-y-6">
        <div className="rounded-3xl border border-blue-100 dark:border-blue-900/60 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 p-6 shadow-sm space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Pronto para usar</p>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Coloque seu inventário, propostas e financeiro no celular da equipe em dias, não meses.
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Teste com dados reais, convide seu time e mantenha tudo sincronizado com o desktop. Sem cartão e com suporte humano.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => openWaitlist('mobile-landing:cta:trial-30-days')}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-white font-semibold shadow-md hover:bg-blue-700"
            >
              Criar conta grátis
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => openWaitlist('mobile-landing:cta:talk')}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 dark:border-gray-700 px-5 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 hover:border-blue-200 dark:hover:border-blue-700"
            >
              Falar com especialista
              <Headphones className="h-4 w-4" />
            </button>
          </div>

            <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
              <span className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-gray-900 px-3 py-1 border border-gray-200 dark:border-gray-700 shadow-sm">
              <MessageCircle className="h-4 w-4 text-blue-600" />
              Onboarding assistido
            </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-gray-900 px-3 py-1 border border-gray-200 dark:border-gray-700 shadow-sm">
              Suporte em português
            </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-gray-900 px-3 py-1 border border-gray-200 dark:border-gray-700 shadow-sm">
              Cancelamento a qualquer momento
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
