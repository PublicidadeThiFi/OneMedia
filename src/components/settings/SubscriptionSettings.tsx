import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CreditCard, Check } from 'lucide-react';
import {
  Company,
  PlatformPlan,
  PlatformSubscription,
  CompanySubscriptionStatus,
  PlatformSubscriptionStatus,
} from '../../types';
import { getDaysRemainingInTrial, getSubscriptionStatusLabel } from '../../lib/mockDataSettings';
import { getMultiOwnerPriceCents, getMultiOwnerLabel } from '../../lib/plans';
import { toast } from 'sonner@2.0.3';

interface SubscriptionSettingsProps {
  company: Company;
  subscription: PlatformSubscription;
  plans: PlatformPlan[];
  pointsUsed: number;
  onUpdateSubscription: (
    updatedCompany: Company,
    updatedSubscription: PlatformSubscription
  ) => void;
}

export function SubscriptionSettings({
  company,
  subscription,
  plans,
  pointsUsed,
  onUpdateSubscription,
}: SubscriptionSettingsProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(subscription.planId);
  const [selectedMaxOwners, setSelectedMaxOwners] = useState<number>(
    subscription.maxOwnersPerMediaPoint
  );

  const currentPlan = useMemo(() => {
    if (!subscription.planId) return null;
    return plans.find((p) => p.id === subscription.planId);
  }, [subscription.planId, plans]);

  const selectedPlan = useMemo(() => {
    if (!selectedPlanId) return null;
    return plans.find((p) => p.id === selectedPlanId);
  }, [selectedPlanId, plans]);

  const daysRemaining = useMemo(() => {
    return getDaysRemainingInTrial(company);
  }, [company]);

  const isTrialOrTest =
    company.subscriptionStatus === CompanySubscriptionStatus.TRIAL ||
    subscription.status === PlatformSubscriptionStatus.TESTE;

  const usagePercentage = useMemo(() => {
    if (!company.pointsLimit) return 0;
    return Math.min(100, Math.round((pointsUsed / company.pointsLimit) * 100));
  }, [pointsUsed, company.pointsLimit]);

  const isOverLimit = pointsUsed > (company.pointsLimit || 0);

  /**
   * Formata preço de centavos para BRL
   * Ex: 29900 → "R$ 299,00"
   */
  const formatPrice = (centavos: number): string => {
    if (centavos === 0) return 'Sob consulta';
    const reais = centavos / 100;
    return reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  /**
   * Calcula o custo mensal total (plano + add-ons)
   */
  const calculateMonthlyTotal = (plan: PlatformPlan, maxOwners: number): number => {
    let total = plan.monthlyPrice;
    total += getMultiOwnerPriceCents(maxOwners);
    return total;
  };

  const handleActivatePaidSubscription = () => {
    if (!selectedPlanId) {
      toast.error('Selecione um plano antes de ativar a assinatura.');
      return;
    }

    const plan = plans.find((p) => p.id === selectedPlanId);
    if (!plan) {
      toast.error('Plano não encontrado.');
      return;
    }

    if (plan.monthlyPrice === 0) {
      toast.info(
        'Plano "Sob consulta" selecionado. Entre em contato com nossa equipe comercial para fechar a assinatura.'
      );
      return;
    }

    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const updatedCompany: Company = {
      ...company,
      planId: selectedPlanId,
      subscriptionStatus: CompanySubscriptionStatus.ACTIVE,
      pointsLimit: plan.maxPoints || 999999, // Se ilimitado, usar valor alto
      updatedAt: new Date(),
    };

    const updatedSubscription: PlatformSubscription = {
      ...subscription,
      planId: selectedPlanId,
      status: PlatformSubscriptionStatus.ATIVA,
      maxOwnersPerMediaPoint: selectedMaxOwners,
      startAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      updatedAt: new Date(),
    };

    onUpdateSubscription(updatedCompany, updatedSubscription);
    toast.success(
      `Assinatura paga ativada (simulação)! Plano: ${plan.name}. Limite de pontos: ${
        plan.maxPoints || 'Ilimitado'
      }. ${getMultiOwnerLabel(selectedMaxOwners)}.`
    );
  };

  const multiOwnerOptions = [
    { value: 1, label: '1 proprietário', description: 'Incluso no plano', price: 0 },
    { value: 2, label: '2 proprietários', description: 'Até 2 proprietários por ponto', price: 9900 },
    { value: 3, label: '3 proprietários', description: 'Até 3 proprietários por ponto', price: 11385 },
    { value: 4, label: '4 proprietários', description: 'Até 4 proprietários por ponto', price: 12870 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plano e Cobrança da Plataforma (PlatformSubscription)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status atual */}
        <div
          className={`p-6 rounded-lg ${
            isTrialOrTest ? 'bg-indigo-50' : 'bg-green-50'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                className={`mb-1 ${
                  isTrialOrTest ? 'text-indigo-900' : 'text-green-900'
                }`}
              >
                {getSubscriptionStatusLabel(company.subscriptionStatus || subscription.status)}
                {currentPlan && ` - ${currentPlan.name}`}
              </h3>
              {isTrialOrTest && daysRemaining !== null && (
                <p className="text-indigo-600">
                  {daysRemaining} dias restantes (trialEndsAt:{' '}
                  {company.trialEndsAt
                    ? new Date(company.trialEndsAt).toLocaleDateString('pt-BR')
                    : '-'}
                  )
                </p>
              )}
              {!isTrialOrTest && (
                <>
                  <p className="text-green-600">
                    Período atual:{' '}
                    {subscription.currentPeriodStart
                      ? new Date(subscription.currentPeriodStart).toLocaleDateString('pt-BR')
                      : '-'}{' '}
                    a{' '}
                    {subscription.currentPeriodEnd
                      ? new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')
                      : '-'}
                  </p>
                  <p className="text-green-600 text-sm mt-1">
                    {getMultiOwnerLabel(subscription.maxOwnersPerMediaPoint)}
                  </p>
                </>
              )}
            </div>
            <CreditCard
              className={`w-8 h-8 ${
                isTrialOrTest ? 'text-indigo-600' : 'text-green-600'
              }`}
            />
          </div>

          {/* Uso de pontos */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Pontos cadastrados</span>
              <span className="text-gray-900">
                {pointsUsed} / {company.pointsLimit || 0} (pointsLimit)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  isOverLimit ? 'bg-red-600' : 'bg-indigo-600'
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
            {isOverLimit && (
              <p className="text-red-600 text-xs">
                ⚠️ Limite excedido! Faça upgrade do plano.
              </p>
            )}
          </div>
        </div>

        {/* Planos disponíveis */}
        <div>
          <h3 className="text-gray-900 mb-4">
            Planos Disponíveis por Volume de Pontos (PlatformPlan)
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Selecione o plano ideal para o volume de pontos de mídia da sua empresa
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isPopular = plan.isPopular;
              const isSelected = selectedPlanId === plan.id;
              const isCurrent = currentPlan?.id === plan.id;
              const isSobConsulta = plan.monthlyPrice === 0;

              return (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'border-2 border-indigo-600 shadow-md' : ''
                  } ${isPopular && !isSelected ? 'border-2 border-indigo-200' : ''}`}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {/* Badges superiores */}
                      <div className="flex flex-wrap gap-2">
                        {isPopular && (
                          <Badge className="bg-indigo-100 text-indigo-800">
                            🔥 Mais Popular
                          </Badge>
                        )}
                        {isCurrent && (
                          <Badge className="bg-green-100 text-green-800">Plano Atual</Badge>
                        )}
                      </div>

                      {/* Nome do plano */}
                      <h4 className="text-gray-900">{plan.name}</h4>

                      {/* Faixa de pontos */}
                      <p className="text-gray-600 text-sm">
                        {plan.maxPoints
                          ? `${plan.minPoints} a ${plan.maxPoints} pontos`
                          : `A partir de ${plan.minPoints} pontos`}
                      </p>

                      {/* Preço */}
                      <div className="min-h-[60px]">
                        {isSobConsulta ? (
                          <div>
                            <p className="text-gray-900 mb-1">Sob consulta</p>
                            <p className="text-xs text-gray-500">
                              Entre em contato com nossa equipe comercial
                            </p>
                          </div>
                        ) : (
                          <p className="text-gray-900">
                            {formatPrice(plan.monthlyPrice)}
                            <span className="text-gray-600 text-sm">/mês</span>
                          </p>
                        )}
                      </div>

                      {/* Botão de seleção */}
                      <Button
                        variant={isSelected ? 'default' : 'outline'}
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlanId(plan.id);
                        }}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-4 h-4 mr-2" /> Selecionado
                          </>
                        ) : (
                          'Selecionar'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Multi-Proprietários */}
        <div>
          <h3 className="text-gray-900 mb-2">
            Multi-Proprietários (maxOwnersPerMediaPoint)
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Escolha quantos proprietários podem ser cadastrados por ponto de mídia. 
            O plano começa com 1 proprietário incluso.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {multiOwnerOptions.map((option) => {
              const isSelected = selectedMaxOwners === option.value;
              const priceCents = getMultiOwnerPriceCents(option.value);

              return (
                <Card
                  key={option.value}
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'border-2 border-indigo-600 bg-indigo-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedMaxOwners(option.value)}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-gray-900">{option.label}</h4>
                        {isSelected && (
                          <Check className="w-5 h-5 text-indigo-600" />
                        )}
                      </div>
                      <p className="text-gray-600 text-xs">
                        {option.description}
                      </p>
                      <p className="text-gray-900">
                        {priceCents === 0 ? (
                          <span className="text-green-600">R$ 0,00/mês</span>
                        ) : (
                          <>
                            {formatPrice(priceCents)}
                            <span className="text-gray-600 text-sm">/mês</span>
                          </>
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Resumo e ativação */}
        {selectedPlan && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="text-blue-900 mb-2">Resumo da Seleção</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>
                <strong>Plano:</strong> {selectedPlan.name} -{' '}
                {formatPrice(selectedPlan.monthlyPrice)}/mês
              </p>
              <p>
                <strong>Limite de pontos:</strong>{' '}
                {selectedPlan.maxPoints ? selectedPlan.maxPoints : 'Ilimitado'}
              </p>
              <p>
                <strong>Multi-Proprietários:</strong> {getMultiOwnerLabel(selectedMaxOwners)}
                {getMultiOwnerPriceCents(selectedMaxOwners) > 0 && (
                  <> - {formatPrice(getMultiOwnerPriceCents(selectedMaxOwners))}/mês</>
                )}
              </p>
              {selectedPlan.monthlyPrice > 0 && (
                <p className="pt-2 border-t border-blue-200">
                  <strong>Total mensal:</strong>{' '}
                  {formatPrice(calculateMonthlyTotal(selectedPlan, selectedMaxOwners))}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Botão de ativação */}
        <div className="text-center pt-6 border-t">
          <Button size="lg" onClick={handleActivatePaidSubscription}>
            {isTrialOrTest ? 'Ativar Assinatura Paga' : 'Atualizar Assinatura'}
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            Ao ativar, status muda para ACTIVE e gera cobranças mensais (simulação em memória)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
