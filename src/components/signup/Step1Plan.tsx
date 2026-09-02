import { CheckCircle2, ChevronLeft, ChevronRight, MapPin, Star, Users } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { sharedFeatures } from '../landing/pricingFeatures';
import { SignupPlanStep } from '../../types/signup';
import { usePublicPricingCatalog } from '../../hooks/usePublicPricingCatalog';
import {
  formatCatalogLimit,
  formatCatalogMoney,
  formatCatalogPercentage,
  getCatalogAnnualPaymentTerms,
  getCatalogOffer,
} from '../../lib/publicPricingCatalog';
import type { PricingCatalogBillingPeriod, PublicPricingCatalogPlan } from '../../types/pricingCatalog';

const CARD_W = 300;
const CARD_STYLE: React.CSSProperties = {
  width: 'min(300px, calc(100vw - 48px))',
  minWidth: 'min(300px, calc(100vw - 48px))',
  maxWidth: CARD_W,
};

type Step1PlanProps = {
  data: SignupPlanStep;
  onChange: (data: SignupPlanStep) => void;
  onNext: () => void;
  error: string | null;
};

function CatalogPrice({ plan, period }: { plan: PublicPricingCatalogPlan; period: PricingCatalogBillingPeriod }) {
  const offer = getCatalogOffer(plan, period);

  if (!offer) {
    return (
      <div>
        <p className="text-2xl font-extrabold text-gray-900">Sob consulta</p>
        <p className="text-xs text-gray-400 mt-1">Não disponível no cadastro self-service.</p>
      </div>
    );
  }

  const annualTerms = getCatalogAnnualPaymentTerms(offer);

  return (
    <div>
      <p className="text-3xl font-extrabold text-gray-900">{formatCatalogMoney(offer.amount, offer.currency)}</p>
      <p className="text-sm text-gray-600">
        {period === 'MONTHLY' ? 'por mês' : 'pagamento integral à vista'}
      </p>
      <p className="text-xs text-gray-400 mt-1">
        {period === 'MONTHLY'
          ? offer.trialDays > 0
            ? `${offer.trialDays} dias de teste`
            : `${offer.billingCycleMonths} mês de acesso`
          : annualTerms
            ? `${annualTerms.monthsAccess} meses pelo valor de ${annualTerms.monthsCharged} mensalidades • economia efetiva de ${formatCatalogPercentage(annualTerms.effectiveDiscountPercent)}`
            : `${offer.billingCycleMonths} meses de acesso • condições anuais no checkout`}
      </p>
    </div>
  );
}

export function Step1Plan({ data, onChange, onNext, error }: Step1PlanProps) {
  const { plans, loading, error: catalogError, refetch } = usePublicPricingCatalog();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<PricingCatalogBillingPeriod>(
    data.selectedBillingPeriod || 'MONTHLY',
  );

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.code === data.selectedPlanCode) ?? null,
    [data.selectedPlanCode, plans],
  );

  useEffect(() => {
    if (!selectedPlan) return;
    const offer = getCatalogOffer(selectedPlan, billingPeriod);

    onChange({
      ...data,
      selectedBillingPeriod: billingPeriod,
      selectedOfferCode: offer?.code ?? null,
    });
    // Keep selection synchronized when the user switches monthly/annual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingPeriod, selectedPlan?.code]);

  const selectPlan = (plan: PublicPricingCatalogPlan) => {
    const offer = getCatalogOffer(plan, billingPeriod);
    if (!offer) return;

    onChange({
      ...data,
      estimatedPoints: plan.entitlements.pointsLimit,
      selectedPlanCode: plan.code,
      selectedOfferCode: offer.code,
      selectedBillingPeriod: billingPeriod,
    });
  };

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({
      left: dir === 'left' ? -(CARD_W + 20) : CARD_W + 20,
      behavior: 'smooth',
    });
  };

  const featureList = () => (
    <>
      <p className="text-xs font-semibold text-gray-700">Todos os Recursos no Marketplace e mais:</p>
      <ul className="space-y-1.5 text-xs text-gray-600 flex-1">
        {sharedFeatures.map((item) => (
          <li key={item} className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </>
  );

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-semibold text-gray-900 mb-3">Escolha seu plano em 3 passos</h2>
        <p className="text-gray-600">Escolha um plano publicado no catálogo oficial da OneMedia.</p>
      </div>

      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm" aria-label="Período de cobrança">
          {(['MONTHLY', 'ANNUAL'] as PricingCatalogBillingPeriod[]).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setBillingPeriod(period)}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                billingPeriod === period ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {period === 'MONTHLY' ? 'Mensal' : 'Anual'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-[420px] animate-pulse rounded-2xl border border-gray-200 bg-white" />
          ))}
        </div>
      ) : catalogError || plans.length === 0 ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
          <p className="font-semibold text-amber-950">Não foi possível carregar os planos atualizados.</p>
          <p className="mt-2 text-sm text-amber-800">O cadastro fica bloqueado para evitar selecionar um preço ou limite antigo.</p>
          <button
            type="button"
            onClick={() => void refetch().catch(() => undefined)}
            className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">Arraste ou use as setas para ver os planos</span>
            <div className="flex gap-2">
              <button type="button" aria-label="Plano anterior" onClick={() => scroll('left')} className="p-2 rounded-full border border-gray-200 bg-white hover:border-blue-500 hover:text-blue-600 transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" aria-label="Próximo plano" onClick={() => scroll('right')} className="p-2 rounded-full border border-gray-200 bg-white hover:border-blue-500 hover:text-blue-600 transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-6" style={{ scrollbarWidth: 'none' }}>
            {plans.map((plan) => {
              const offer = getCatalogOffer(plan, billingPeriod);
              const isEnterprise = plan.offers.length === 0;
              const isSelected = data.selectedPlanCode === plan.code && data.selectedOfferCode === offer?.code;
              const isFeatured = plan.code === 'PRO';

              return (
                <button
                  key={plan.code}
                  type="button"
                  onClick={() => selectPlan(plan)}
                  disabled={!offer}
                  style={CARD_STYLE}
                  className={`relative text-left flex-shrink-0 snap-start bg-white rounded-2xl flex flex-col transition-all duration-200 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'border-2 border-blue-600 shadow-lg'
                      : isFeatured
                        ? 'border-2 border-blue-200 shadow-sm hover:border-blue-400 hover:shadow-md'
                        : 'border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md'
                  } ${isEnterprise ? 'opacity-80' : ''}`}
                >
                  {isFeatured && (
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                        <Star className="w-2.5 h-2.5" />Destaque
                      </span>
                    </div>
                  )}

                  <div className="p-5 flex flex-col flex-1 gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 bg-white"
                        style={{ border: isSelected ? '5px solid #2563eb' : '2px solid #d1d5db' }}
                      />
                      <h3 className="text-base font-bold text-gray-900">{plan.publicName}</h3>
                    </div>

                    <CatalogPrice plan={plan} period={billingPeriod} />

                    <hr className="border-gray-100" />
                    <p className="text-xs text-gray-500 leading-relaxed">{plan.description || 'Plano comercial OneMedia.'}</p>
                    <hr className="border-gray-100" />

                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Limites</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-gray-700">
                        <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" />Pontos</span>
                        <span className="font-semibold text-gray-900">{formatCatalogLimit(plan.entitlements.pointsLimit)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-700">
                        <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-gray-400" />Usuários</span>
                        <span className="font-semibold text-gray-900">{formatCatalogLimit(plan.entitlements.usersLimit)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-700">
                        <span>Proprietários/ponto</span>
                        <span className="font-semibold text-gray-900">{formatCatalogLimit(plan.entitlements.maxOwnersPerMediaPoint)}</span>
                      </div>
                    </div>

                    <hr className="border-gray-100" />
                    {featureList()}

                    <div className={`mt-auto w-full py-2.5 rounded-xl text-center text-sm font-semibold transition-colors ${
                      isEnterprise
                        ? 'bg-gray-100 text-gray-500'
                        : isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isEnterprise ? 'Sob consulta' : isSelected ? 'Selecionado ✓' : 'Selecionar plano'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={!data.selectedPlanCode || !data.selectedOfferCode || loading || !!catalogError}
          className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
