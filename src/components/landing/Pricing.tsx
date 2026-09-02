import { CheckCircle2, ChevronLeft, ChevronRight, HelpCircle, MapPin, Star, Users } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { useWaitlist } from '../../contexts/WaitlistContext';
import { usePublicPricingCatalog } from '../../hooks/usePublicPricingCatalog';
import {
  formatCatalogLimit,
  formatCatalogMoney,
  formatCatalogPercentage,
  getCatalogAnnualPaymentTerms,
  getCatalogMonthlyTrialDays,
  getCatalogOffer,
} from '../../lib/publicPricingCatalog';
import type { PricingCatalogBillingPeriod, PublicPricingCatalogPlan } from '../../types/pricingCatalog';
import { sharedFeatures } from './pricingFeatures';

const CARD_W = 340;

function PlanCard({ children, featured = false }: { children: React.ReactNode; featured?: boolean }) {
  return (
    <div
      style={{ width: CARD_W, minWidth: CARD_W, maxWidth: CARD_W }}
      className={`relative flex-shrink-0 snap-start bg-white rounded-2xl flex flex-col shadow-sm hover:shadow-md transition-shadow duration-200 ${featured ? 'border-2 border-blue-600' : 'border border-gray-200'}`}
    >
      {children}
    </div>
  );
}

function PlanPrice({ plan, period }: { plan: PublicPricingCatalogPlan; period: PricingCatalogBillingPeriod }) {
  const offer = getCatalogOffer(plan, period);

  if (!offer) {
    return (
      <div>
        <p className="text-3xl font-extrabold text-gray-900">Sob consulta</p>
        <p className="text-xs text-gray-400 mt-1">Condições definidas com o time comercial.</p>
      </div>
    );
  }

  const annualTerms = getCatalogAnnualPaymentTerms(offer);

  return (
    <div>
      <p className="text-3xl font-extrabold text-gray-900">
        {formatCatalogMoney(offer.amount, offer.currency)}
      </p>
      <p className="text-sm text-gray-600">
        {period === 'MONTHLY' ? 'por mês' : 'pagamento integral à vista'}
      </p>
      <p className="text-xs text-gray-400 mt-1">
        {period === 'MONTHLY'
          ? offer.trialDays > 0
            ? `${offer.trialDays} dias de teste na oferta mensal`
            : `${offer.billingCycleMonths} mês de acesso`
          : annualTerms
            ? `${annualTerms.monthsAccess} meses pelo valor de ${annualTerms.monthsCharged} mensalidades • economia efetiva de ${formatCatalogPercentage(annualTerms.effectiveDiscountPercent)}`
            : `${offer.billingCycleMonths} meses de acesso • condições anuais no checkout`}
      </p>
    </div>
  );
}

export function Pricing() {
  const navigate = useNavigation();
  const { openWaitlist } = useWaitlist();
  const { plans, loading, error, refetch } = usePublicPricingCatalog();
  const [billingPeriod, setBillingPeriod] = useState<PricingCatalogBillingPeriod>('MONTHLY');
  const monthlyTrialDays = getCatalogMonthlyTrialDays(plans);
  const [showAddonTooltip, setShowAddonTooltip] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scroll = (dir: 'left' | 'right') => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollBy({ left: dir === 'left' ? -(CARD_W + 20) : CARD_W + 20, behavior: 'smooth' });
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
    <section id="planos" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 mb-2">Teste grátis</p>
          <h2 className="text-4xl font-semibold text-gray-900 mb-3">
            {monthlyTrialDays ? `Planos com ${monthlyTrialDays} dias de teste na oferta mensal` : 'Planos para cada fase da operação'}
          </h2>
          <p className="text-base text-gray-500 max-w-xl mx-auto">Condições de teste e cobrança conforme a oferta selecionada.</p>
        </div>

        <div className="flex justify-center mb-8">
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
          <div className="grid gap-5 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-[460px] animate-pulse rounded-2xl border border-gray-200 bg-white" />
            ))}
          </div>
        ) : error || plans.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
            <p className="font-semibold text-amber-950">Não foi possível carregar os preços atualizados.</p>
            <p className="mt-2 text-sm text-amber-800">
              Para evitar exibir valores antigos, os planos ficam indisponíveis até o catálogo oficial responder.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => void refetch().catch(() => undefined)}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={() => navigate('/contato')}
                className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Falar com vendas
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">Arraste ou use as setas para ver os planos</span>
              <div className="flex gap-2">
                <button aria-label="Anterior" onClick={() => scroll('left')} className="p-2 rounded-full border border-gray-200 bg-white hover:border-blue-500 hover:text-blue-600 transition-colors">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button aria-label="Próximo" onClick={() => scroll('right')} className="p-2 rounded-full border border-gray-200 bg-white hover:border-blue-500 hover:text-blue-600 transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-6" style={{ scrollbarWidth: 'none' }}>
              {plans.map((plan) => {
                const isEnterprise = plan.offers.length === 0;
                const isFeatured = plan.code === 'PRO';

                return (
                  <PlanCard key={plan.code} featured={isFeatured}>
                    {isFeatured && (
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                          <Star className="w-2.5 h-2.5" />Destaque
                        </span>
                      </div>
                    )}

                    <div className="p-5 flex flex-col flex-1 gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${isFeatured ? 'border-blue-500' : 'border-gray-300'}`} />
                        <h3 className="text-base font-bold text-gray-900">{plan.publicName}</h3>
                      </div>

                      <PlanPrice plan={plan} period={billingPeriod} />

                      <hr className="border-gray-100" />

                      <p className="text-xs text-gray-500 leading-relaxed">
                        {plan.description || 'Plano comercial OneMedia.'}
                      </p>

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
                          <span>Proprietários por ponto</span>
                          <span className="font-semibold text-gray-900">{formatCatalogLimit(plan.entitlements.maxOwnersPerMediaPoint)}</span>
                        </div>
                      </div>

                      <hr className="border-gray-100" />

                      {featureList()}

                      <button
                        onClick={() => isEnterprise ? navigate('/contato') : openWaitlist(`planos:catalog:${plan.code}:${billingPeriod.toLowerCase()}`)}
                        className="mt-auto w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
                      >
                        {isEnterprise ? 'Falar com vendas' : 'Começar grátis'}
                      </button>
                    </div>
                  </PlanCard>
                );
              })}
            </div>
          </>
        )}

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mt-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900 mb-1">Multi-Proprietários</h3>
              <p className="text-xs text-gray-500 mb-4">Os limites por plano acima vêm do catálogo oficial. As condições comerciais adicionais serão consolidadas nas próximas etapas da migração.</p>
            </div>
            <div className="relative">
              <button
                onMouseEnter={() => setShowAddonTooltip(true)}
                onMouseLeave={() => setShowAddonTooltip(false)}
                onClick={() => setShowAddonTooltip(!showAddonTooltip)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <HelpCircle className="w-5 h-5 text-gray-400" />
              </button>
              {showAddonTooltip && (
                <div className="absolute right-0 top-10 w-72 bg-white rounded-xl shadow-xl p-4 border border-gray-200 z-10 text-xs text-gray-600">
                  <p className="font-semibold text-gray-900 mb-1">Fonte dos limites</p>
                  Pontos, usuários e proprietários por ponto são carregados do Pricing Catalog V2 publicado pelo backend.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
