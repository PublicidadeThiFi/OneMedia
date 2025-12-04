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
      <div className="text-center mb-8">
        <h2 className="text-gray-900 mb-2">Comece seu teste grátis em 3 passos</h2>
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
            className={`relative text-left p-5 rounded-xl border-2 transition-all ${
              data.selectedPlanRange === plan.range
                ? 'border-[#4F46E5] shadow-lg bg-[#4F46E5]/5'
                : 'border-gray-200 hover:border-[#4F46E5] hover:shadow-md'
            }`}
          >
            {plan.isPopular && (
              <div className="absolute -top-3 left-4">
                <div className="bg-[#4F46E5] text-white px-3 py-1 rounded-full flex items-center gap-1 text-xs">
                  <Star className="w-3 h-3" />
                  Mais Popular
                </div>
              </div>
            )}

            {data.selectedPlanRange === plan.range && (
              <div className="absolute top-4 right-4">
                <div className="w-6 h-6 bg-[#4F46E5] rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}

            <div className="mb-3">
              <h3 className="text-gray-900 mb-1">{plan.name}</h3>
              <p className="text-sm text-gray-500">{plan.description}</p>
            </div>

            <div className="mb-3">
              <div className="text-sm text-gray-600">
                {plan.maxPoints ? `Até ${plan.maxPoints} pontos` : 'Ilimitado'}
              </div>
            </div>

            <div className="text-2xl text-gray-900">
              {plan.priceLabel}
              {plan.monthlyPrice > 0 && <span className="text-sm text-gray-500">/mês</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Next Button */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="bg-[#4F46E5] text-white px-8 py-3 rounded-lg hover:bg-[#4338CA] transition-colors"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}