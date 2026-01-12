import { Check, Star } from 'lucide-react';
import { SignupPlanStep, PLAN_DEFINITIONS, PlanRange } from '../../types/signup';

type Step1PlanProps = {
  data: SignupPlanStep;
  onChange: (data: SignupPlanStep) => void;
  onNext: () => void;
  error: string | null;
};

export function Step1Plan({ data, onChange, onNext, error }: Step1PlanProps) {
  const handlePlanSelect = (range: PlanRange) => {
    const plan = PLAN_DEFINITIONS.find(p => p.range === range);
    onChange({
      ...data,
      selectedPlanRange: range,
      selectedPlatformPlanId: plan?.id || null,
    });
  };

  return (
    <div>
      <div className="text-center mb-10">
        <h2 className="text-3xl font-semibold text-gray-900 mb-3">Comece seu teste grátis em 3 passos</h2>
        <p className="text-gray-600">
          Escolha o volume de pontos que você pretende gerenciar. Você pode mudar o plano depois.
        </p>
      </div>

      {/* Plan Cards Grid - Only selection method */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {PLAN_DEFINITIONS.map((plan) => (
          <button
            key={plan.range}
            onClick={() => handlePlanSelect(plan.range)}
            className={`relative text-left p-6 rounded-2xl border-2 transition-all ${
              data.selectedPlanRange === plan.range
                ? 'border-blue-600 shadow-xl bg-blue-50/50 scale-105'
                : 'border-gray-200 hover:border-blue-400 hover:shadow-lg'
            }`}
          >
            {plan.isPopular && (
              <div className="absolute -top-3 left-4">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1 rounded-full flex items-center gap-1 text-xs font-semibold shadow-lg shadow-blue-500/30">
                  <Star className="w-3 h-3 fill-white" />
                  Mais Popular
                </div>
              </div>
            )}

            {data.selectedPlanRange === plan.range && (
              <div className="absolute top-5 right-5">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-sm text-gray-600">{plan.description}</p>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-600 font-medium">
                {plan.maxPoints ? `Até ${plan.maxPoints} pontos` : 'Ilimitado'}
              </div>
            </div>

            <div className="text-3xl font-bold text-gray-900">
              {plan.priceLabel}
              {plan.monthlyPrice > 0 && <span className="text-sm font-normal text-gray-500">/mês</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Next Button */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-10 py-3.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 font-medium"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}
