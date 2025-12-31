import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { AlertCircle, CheckCircle2, Crown, Info, Loader2 } from 'lucide-react';
import { Company, PlatformPlan, PlatformSubscription, PlatformSubscriptionStatus } from '../../types';
import { getMultiOwnerPlanPrice, getMultiOwnerPlanName, getMultiOwnerPriceCents } from '../../lib/plans';

interface SubscriptionSettingsProps {
  company: Company;
  subscription: PlatformSubscription;
  plans: PlatformPlan[];
  plansLoading?: boolean;
  pointsUsed: number;
  onUpdateSubscription: (updates: { planId: string; maxOwnersPerMediaPoint: number }) => Promise<void>;
}

function formatCurrency(value: number, isCents = false) {
  const normalized = isCents ? value / 100 : value;
  return normalized.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusLabel(status: PlatformSubscriptionStatus) {
  switch (status) {
    case PlatformSubscriptionStatus.TESTE:
      return 'Teste';
    case PlatformSubscriptionStatus.ATIVA:
      return 'Ativa';
    case PlatformSubscriptionStatus.EM_ATRASO:
      return 'Em atraso';
    case PlatformSubscriptionStatus.CANCELADA:
      return 'Cancelada';
    default:
      return String(status);
  }
}

export function SubscriptionSettings({
  company,
  subscription,
  plans,
  plansLoading,
  pointsUsed,
  onUpdateSubscription,
}: SubscriptionSettingsProps) {
  const currentPlan = useMemo(
    () => plans.find((p) => p.id === subscription.planId) || null,
    [plans, subscription.planId]
  );

  const [selectedPlanId, setSelectedPlanId] = useState(subscription.planId);
  const [selectedMaxOwners, setSelectedMaxOwners] = useState(subscription.maxOwnersPerMediaPoint || 1);
  const [isUpdating, setIsUpdating] = useState(false);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );

  const maxPoints = selectedPlan?.maxPoints ?? null;
  const pointsLimitLabel = maxPoints == null ? 'Ilimitado' : String(maxPoints);
  const usagePercentage = maxPoints == null ? 0 : Math.min(100, Math.round((pointsUsed / maxPoints) * 100));

  const hasChanges = selectedPlanId !== subscription.planId || selectedMaxOwners !== subscription.maxOwnersPerMediaPoint;

  const canDowngradePoints = maxPoints == null ? true : pointsUsed <= maxPoints;

  const planMonthlyPrice = selectedPlan?.monthlyPrice ?? 0;
  // Alguns ambientes armazenam preços em centavos (ex.: 69900), outros em BRL (ex.: 699).
  const priceIsCents = planMonthlyPrice >= 10000;

  const multiOwnerPlanPrice = priceIsCents
    ? getMultiOwnerPriceCents(selectedMaxOwners)
    : getMultiOwnerPlanPrice(selectedMaxOwners);

  const baseMonthlyPrice = planMonthlyPrice + multiOwnerPlanPrice;

  const handleSave = async () => {
    if (!selectedPlan) {
      alert('Selecione um plano válido.');
      return;
    }

    if (!canDowngradePoints) {
      alert(
        `Você possui ${pointsUsed} pontos cadastrados. Para escolher este plano (${pointsLimitLabel}), exclua pontos ou selecione um plano maior.`
      );
      return;
    }

    try {
      setIsUpdating(true);
      await onUpdateSubscription({ planId: selectedPlanId, maxOwnersPerMediaPoint: selectedMaxOwners });
      alert('Assinatura atualizada com sucesso.');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erro ao atualizar assinatura.');
    } finally {
      setIsUpdating(false);
    }
  };

  const status = subscription.status;
  const isActive = status === PlatformSubscriptionStatus.ATIVA || status === PlatformSubscriptionStatus.TESTE;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Plano e Limites
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm text-gray-600">Status</div>
              <div className="flex items-center gap-2 mt-1">
                {isActive ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {statusLabel(status)}
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {statusLabel(status)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600">Plano atual</div>
              <div className="font-medium">
                {currentPlan?.name || '—'}
              </div>
            </div>
          </div>

          <Card className="border-gray-200">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Uso de pontos (limite por conta)</span>
                </div>
                <span className="text-sm text-gray-600">
                  {pointsUsed} / {pointsLimitLabel}
                </span>
              </div>
              {maxPoints != null && <Progress value={usagePercentage} />}
              <div className="text-xs text-gray-500">
                O limite de pontos é sempre da <b>conta</b>, independentemente da quantidade de proprietários.
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-4 space-y-2">
              <div className="text-sm font-medium">Selecione seu plano de pontos</div>

              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger disabled={!!plansLoading}>
                  <SelectValue placeholder={plansLoading ? 'Carregando planos...' : 'Selecione um plano'} />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => {
                    const label = plan.maxPoints == null ? plan.name : `${plan.name} (${plan.minPoints ?? 0}-${plan.maxPoints} pontos)`;
                    return (
                      <SelectItem key={plan.id} value={plan.id}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {!canDowngradePoints && (
                <div className="text-xs text-red-600">
                  Este plano é menor que a quantidade de pontos já cadastrados ({pointsUsed}).
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-4 space-y-2">
              <div className="text-sm font-medium">Assinatura multi-proprietários (limite por ponto)</div>

              <Select
                value={String(selectedMaxOwners)}
                onValueChange={(v: string) => setSelectedMaxOwners(parseInt(v, 10))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {getMultiOwnerPlanName(n)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="text-xs text-gray-500">
                Esse limite é aplicado em cada ponto de mídia (ex.: 2 proprietários por ponto).
                <br />
                Você pode cadastrar empresas proprietárias ilimitadas no Super Admin.
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 text-sm text-amber-900">
              <b>Pagamento ainda não integrado.</b> Este fluxo já está preparado para integração futura:
              ao salvar, o backend valida downgrade (pontos e proprietários por ponto) e persiste o plano.
              <br />
              <span className="text-xs">(TODO: integrar gateway e prorrateio)</span>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
            <div>
              <div className="text-sm text-gray-600">Total mensal (estimado)</div>
              <div className="text-lg font-semibold">{formatCurrency(baseMonthlyPrice, priceIsCents)}</div>
              <div className="text-xs text-gray-500">
                Plano de pontos + assinatura multi-proprietários.
              </div>
            </div>

            <Button onClick={handleSave} disabled={!hasChanges || isUpdating || !!plansLoading}>
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Atualizar assinatura'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}