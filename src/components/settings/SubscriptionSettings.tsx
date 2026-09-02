import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import {
  AlertCircle,
  CheckCircle2,
  Crown,
  ExternalLink,
  HardDrive,
  Info,
  Loader2,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import {
  Company,
  PlatformBillingProfile,
  PlatformSubscription,
  PlatformSubscriptionAddonCode,
  PlatformSubscriptionStatus,
} from '../../types';
import { useCompany } from '../../contexts/CompanyContext';
import { buildMediaUsageSummary, formatBytes } from '../../lib/mediaValidation';
import {
  billingPeriodLabel,
  formatCatalogMoney,
  formatCatalogPercentage,
  getCatalogAnnualPaymentTerms,
  getCatalogOffer,
} from '../../lib/publicPricingCatalog';
import { startCaktoCheckout } from '../../lib/billingCheckout';
import type {
  PricingCatalogBillingPeriod,
  PublicPricingCatalogPlan,
  PublicPricingCatalogResponse,
} from '../../types/pricingCatalog';
import { toast } from 'sonner';

interface SubscriptionSettingsProps {
  company: Company;
  subscription: PlatformSubscription;
  pointsUsed: number;
  pricingCatalog: PublicPricingCatalogResponse | null;
  pricingCatalogLoading?: boolean;
  pricingCatalogError?: Error | null;
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

function billingMethodStatusVariant(status?: PlatformBillingProfile['paymentMethodStatus']): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'PRONTO_PARA_COBRANCA':
      return 'default';
    case 'AGUARDANDO_VINCULACAO':
      return 'secondary';
    case 'PENDENTE':
    default:
      return 'outline';
  }
}

const MEDIA_ADDONS: Array<{
  code: PlatformSubscriptionAddonCode;
  title: string;
  subtitle: string;
}> = [
  { code: 'MEDIA_P', title: 'Mídia extra P', subtitle: '+10 GB storage • +50 GB tráfego/mês' },
  { code: 'MEDIA_M', title: 'Mídia extra M', subtitle: '+25 GB storage • +125 GB tráfego/mês' },
  { code: 'MEDIA_G', title: 'Mídia extra G', subtitle: '+50 GB storage • +250 GB tráfego/mês' },
  { code: 'MEDIA_GG', title: 'Mídia extra GG', subtitle: '+100 GB storage • +500 GB tráfego/mês' },
];

function addonCount(
  addons: { code: PlatformSubscriptionAddonCode; quantity: number }[] | undefined,
  code: PlatformSubscriptionAddonCode,
): number {
  const line = (addons || []).find((addon) => addon.code === code);
  return Math.max(0, Math.floor(line?.quantity ?? 0));
}

function resolveCurrentCatalogPlan(
  pricingCatalog: PublicPricingCatalogResponse | null,
  company: Company,
  subscription: PlatformSubscription,
): PublicPricingCatalogPlan | null {
  if (!pricingCatalog) return null;

  const exact = pricingCatalog.plans.find((plan) => {
    const samePoints = (plan.entitlements.pointsLimit ?? null) === (company.pointsLimit ?? null);
    const expectedOwners = plan.entitlements.maxOwnersPerMediaPoint;
    const sameOwners = expectedOwners == null || expectedOwners === subscription.maxOwnersPerMediaPoint;
    return samePoints && sameOwners;
  });

  return exact ?? null;
}

function onlyDigitsValue(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

export function SubscriptionSettings({
  company,
  subscription,
  pointsUsed,
  pricingCatalog,
  pricingCatalogLoading,
  pricingCatalogError,
}: SubscriptionSettingsProps) {
  const {
    entitlements,
    billingSummary,
    updateBillingProfile,
    refreshEntitlements,
    refreshBillingSummary,
    refreshCompanyData,
    blockReason,
  } = useCompany();

  const currentCatalogPlan = useMemo(
    () => resolveCurrentCatalogPlan(pricingCatalog, company, subscription),
    [pricingCatalog, company, subscription],
  );

  const gatewayBilling = useMemo(() => {
    const integrations = company.integrations && typeof company.integrations === 'object' ? company.integrations : {};
    const billing = (integrations as any)?.billing;
    return billing && typeof billing === 'object' ? billing : {};
  }, [company.integrations]);

  const initialBillingPeriod: PricingCatalogBillingPeriod =
    gatewayBilling.billingPeriod === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';

  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('');
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<PricingCatalogBillingPeriod>(initialBillingPeriod);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [isSavingBilling, setIsSavingBilling] = useState(false);
  const [isRefreshingBillingStatus, setIsRefreshingBillingStatus] = useState(false);
  const [billingForm, setBillingForm] = useState<PlatformBillingProfile>({
    contactName: '',
    legalName: '',
    email: '',
    phone: '',
    document: '',
    preferredMethod: 'CARTAO',
    addressZipcode: '',
    addressStreet: '',
    addressNumber: '',
    addressComplement: '',
    addressDistrict: '',
    addressCity: '',
    addressState: '',
    addressCountry: 'Brasil',
    paymentMethodStatus: 'PENDENTE',
    paymentMethodStatusLabel: 'Checkout pendente',
    autoChargeReady: false,
  });

  useEffect(() => {
    if (!billingSummary?.billingProfile) return;
    setBillingForm(billingSummary.billingProfile);
  }, [billingSummary]);

  useEffect(() => {
    if (!pricingCatalog?.plans?.length) return;
    if (selectedPlanCode && pricingCatalog.plans.some((plan) => plan.code === selectedPlanCode)) return;

    const firstCheckoutPlan = pricingCatalog.plans.find((plan) => plan.offers.length > 0);
    setSelectedPlanCode(currentCatalogPlan?.code || firstCheckoutPlan?.code || pricingCatalog.plans[0].code);
  }, [pricingCatalog, currentCatalogPlan, selectedPlanCode]);

  const selectedCatalogPlan = useMemo(
    () => pricingCatalog?.plans.find((plan) => plan.code === selectedPlanCode) ?? null,
    [pricingCatalog, selectedPlanCode],
  );

  const selectedOffer = useMemo(
    () => (selectedCatalogPlan ? getCatalogOffer(selectedCatalogPlan, selectedBillingPeriod) : null),
    [selectedCatalogPlan, selectedBillingPeriod],
  );
  const selectedAnnualTerms = useMemo(
    () => getCatalogAnnualPaymentTerms(selectedOffer),
    [selectedOffer],
  );

  const currentPointsLimit = company.pointsLimit ?? null;
  const pointsLimitLabel = currentPointsLimit == null ? 'Ilimitado' : currentPointsLimit.toLocaleString('pt-BR');
  const usagePercentage = currentPointsLimit == null || currentPointsLimit <= 0
    ? 0
    : Math.min(100, Math.round((pointsUsed / currentPointsLimit) * 100));

  const status = subscription.status;
  const isActive = status === PlatformSubscriptionStatus.ATIVA || status === PlatformSubscriptionStatus.TESTE;
  const mediaSummary = useMemo(() => buildMediaUsageSummary(entitlements), [entitlements]);

  const storagePct = useMemo(() => {
    if (!mediaSummary || mediaSummary.storageLimitBytes <= 0) return 0;
    return Math.min(100, Math.round((mediaSummary.storageUsedBytes / mediaSummary.storageLimitBytes) * 100));
  }, [mediaSummary]);

  const trafficPct = useMemo(() => {
    if (!mediaSummary || mediaSummary.trafficLimitBytes <= 0) return 0;
    return Math.min(100, Math.round((mediaSummary.trafficUsedBytes / mediaSummary.trafficLimitBytes) * 100));
  }, [mediaSummary]);

  const monthLabel = useMemo(() => {
    const year = entitlements?.usage?.year;
    const month = entitlements?.usage?.month;
    if (!year || !month) return null;
    return `${String(month).padStart(2, '0')}/${year}`;
  }, [entitlements?.usage?.year, entitlements?.usage?.month]);

  const normalizedPlanMonthlyPrice = billingSummary?.totals?.planMonthly ?? 0;
  const normalizedMultiOwnerPrice = billingSummary?.totals?.multiOwnerMonthly ?? 0;
  const addonMonthlyTotal = billingSummary?.totals?.addonsMonthly ?? 0;
  const totalMonthlyEstimate = billingSummary?.totals?.totalMonthly ?? 0;

  const handleRefreshBillingStatus = async () => {
    try {
      setIsRefreshingBillingStatus(true);
      await Promise.all([refreshBillingSummary(), refreshCompanyData()]);
      toast.success('Status de cobrança atualizado.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Não foi possível atualizar o status de cobrança.');
    } finally {
      setIsRefreshingBillingStatus(false);
    }
  };

  const handleBillingField = (field: keyof PlatformBillingProfile, value: string) => {
    setBillingForm((previous) => ({ ...previous, [field]: value }));
  };

  const validateBillingForm = (profile: PlatformBillingProfile) => {
    if (!profile.contactName?.trim()) return 'Informe o responsável financeiro.';
    if (!profile.legalName?.trim()) return 'Informe o nome ou razão social para cobrança.';
    if (!profile.email?.trim()) return 'Informe o e-mail financeiro.';
    if (!profile.document?.trim()) return 'Informe o CPF ou CNPJ financeiro.';
    if (!profile.addressZipcode?.trim()) return 'Informe o CEP de cobrança.';
    if (!profile.addressStreet?.trim()) return 'Informe o logradouro de cobrança.';
    if (!profile.addressNumber?.trim()) return 'Informe o número do endereço de cobrança.';
    if (!profile.addressDistrict?.trim()) return 'Informe o bairro de cobrança.';
    if (!profile.addressCity?.trim()) return 'Informe a cidade de cobrança.';
    if (!profile.addressState?.trim()) return 'Informe o estado/UF de cobrança.';
    if (!profile.addressCountry?.trim()) return 'Informe o país de cobrança.';
    return null;
  };

  const handleSaveBilling = async () => {
    const billingError = validateBillingForm(billingForm);
    if (billingError) {
      toast.error(billingError);
      return;
    }

    try {
      setIsSavingBilling(true);
      await updateBillingProfile(billingForm);
      await refreshBillingSummary();
      toast.success('Dados financeiros atualizados.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao salvar dados financeiros.');
    } finally {
      setIsSavingBilling(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedCatalogPlan || !selectedOffer) {
      toast.error('A oferta selecionada ainda não possui checkout disponível.');
      return;
    }

    if (selectedCatalogPlan.entitlements.pointsLimit != null && pointsUsed > selectedCatalogPlan.entitlements.pointsLimit) {
      toast.error(
        `Você possui ${pointsUsed} pontos cadastrados. Reduza o uso antes de contratar um plano com limite de ${selectedCatalogPlan.entitlements.pointsLimit.toLocaleString('pt-BR')} pontos.`,
      );
      return;
    }

    try {
      setCheckoutLoading(selectedOffer.code);
      await startCaktoCheckout(selectedOffer.code);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Não foi possível abrir o checkout seguro da Cakto.',
      );
      setCheckoutLoading(null);
    }
  };

  const gatewayProvider = String(
    gatewayBilling.gatewayProvider || billingSummary?.billingProfile?.gatewayProvider || '',
  ).trim().toUpperCase();

  const gatewayStatusLabel = billingSummary?.billingProfile?.autoChargeReady
    ? 'Cobrança recorrente ativa'
    : gatewayProvider === 'CAKTO'
      ? 'Checkout Cakto ainda não conciliado'
      : 'Aguardando checkout Cakto';

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
              <div className="font-medium">{currentCatalogPlan?.publicName || 'Plano contratado'}</div>
              <div className="text-xs text-gray-500 mt-1">
                {currentPointsLimit == null ? 'Limite sob consulta' : `${currentPointsLimit.toLocaleString('pt-BR')} pontos`}
                {' • '}
                {subscription.maxOwnersPerMediaPoint} proprietário(s) por ponto
              </div>
            </div>
          </div>

          <Card className="border-blue-100 bg-blue-50/40">
            <CardContent className="p-4 space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">Alterar ou contratar plano</div>
                <div className="text-xs text-gray-500 mt-1">
                  O catálogo vem do backend e o pagamento acontece no checkout hospedado da Cakto. Nenhum dado de cartão passa pelo OneMedia.
                </div>
              </div>

              {pricingCatalogLoading ? (
                <div className="text-sm text-gray-500">Carregando catálogo oficial...</div>
              ) : pricingCatalogError || !pricingCatalog ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Catálogo oficial indisponível. O checkout fica bloqueado para evitar contratação com informação comercial desatualizada.
                </div>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    {pricingCatalog.plans.map((catalogPlan) => {
                      const monthly = getCatalogOffer(catalogPlan, 'MONTHLY');
                      const annual = getCatalogOffer(catalogPlan, 'ANNUAL');
                      const annualTerms = getCatalogAnnualPaymentTerms(annual);
                      const selected = catalogPlan.code === selectedPlanCode;

                      return (
                        <button
                          key={catalogPlan.code}
                          type="button"
                          onClick={() => setSelectedPlanCode(catalogPlan.code)}
                          className={`text-left rounded-xl border p-3 transition-colors ${
                            selected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-blue-100 bg-white hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-gray-900">{catalogPlan.publicName}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {catalogPlan.entitlements.pointsLimit == null
                                  ? 'Pontos sob consulta'
                                  : `${catalogPlan.entitlements.pointsLimit.toLocaleString('pt-BR')} pontos`}
                                {' • '}
                                {catalogPlan.entitlements.usersLimit == null
                                  ? 'usuários sob consulta'
                                  : `${catalogPlan.entitlements.usersLimit} usuários`}
                                {' • '}
                                {catalogPlan.entitlements.maxOwnersPerMediaPoint == null
                                  ? 'proprietários sob consulta'
                                  : `${catalogPlan.entitlements.maxOwnersPerMediaPoint} proprietário(s)/ponto`}
                              </div>
                            </div>
                            <Badge variant="outline">{catalogPlan.code}</Badge>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg bg-gray-50 p-2">
                              <div className="text-gray-500">Mensal</div>
                              <div className="font-semibold text-gray-900 mt-1">
                                {monthly ? formatCatalogMoney(monthly.amount, monthly.currency) : 'Sob consulta'}
                              </div>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-2">
                              <div className="text-gray-500">Anual</div>
                              <div className="font-semibold text-gray-900 mt-1">
                                {annual ? formatCatalogMoney(annual.amount, annual.currency) : 'Sob consulta'}
                              </div>
                              {annualTerms && (
                                <div className="mt-1 text-[11px] leading-tight text-gray-500">
                                  {annualTerms.monthsAccess} meses pelo valor de {annualTerms.monthsCharged}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid gap-3 md:grid-cols-[220px_1fr] items-end">
                    <div>
                      <div className="text-sm font-medium mb-2">Cobrança</div>
                      <Select
                        value={selectedBillingPeriod}
                        onValueChange={(value: string) => setSelectedBillingPeriod(value === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTHLY">Mensal</SelectItem>
                          <SelectItem value="ANNUAL">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white p-3 flex-wrap">
                      <div>
                        <div className="text-sm text-gray-500">
                          {selectedCatalogPlan?.publicName || 'Plano'} • {billingPeriodLabel(selectedBillingPeriod)}
                        </div>
                        <div className="font-semibold text-gray-900 mt-1">
                          {selectedOffer
                            ? formatCatalogMoney(selectedOffer.amount, selectedOffer.currency)
                            : 'Oferta sob consulta'}
                        </div>
                        {selectedBillingPeriod === 'ANNUAL' && selectedOffer && (
                          <div className="mt-1 text-xs text-gray-500">
                            {selectedAnnualTerms
                              ? `${selectedAnnualTerms.monthsAccess} meses pelo valor de ${selectedAnnualTerms.monthsCharged} mensalidades • economia efetiva de ${formatCatalogPercentage(selectedAnnualTerms.effectiveDiscountPercent)} • cobrança integral à vista`
                              : `${selectedOffer.billingCycleMonths} meses de acesso • condições anuais no checkout Cakto`}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={handleCheckout}
                        disabled={!selectedOffer || checkoutLoading != null}
                      >
                        {checkoutLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Abrindo checkout...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Ir para checkout Cakto
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Uso de pontos (limite atual da conta)</span>
                </div>
                <span className="text-sm text-gray-600">{pointsUsed} / {pointsLimitLabel}</span>
              </div>
              {currentPointsLimit != null && <Progress value={usagePercentage} />}
            </CardContent>
          </Card>

          <Card className={(blockReason === 'STORAGE_EXCEEDED' || blockReason === 'TRAFFIC_EXCEEDED') ? 'border-red-200 bg-red-50' : 'border-gray-200'}>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium">Mídia (Storage + Tráfego)</span>
                </div>
                <Button variant="outline" size="sm" onClick={refreshEntitlements}>Atualizar</Button>
              </div>

              {!entitlements ? (
                <div className="text-sm text-gray-600">Não foi possível carregar os limites de mídia. Clique em <b>Atualizar</b>.</div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">Armazenamento</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {formatBytes(mediaSummary?.storageUsedBytes ?? 0)} / {entitlements.limits.totalStorageGb} GB
                      </span>
                    </div>
                    <Progress value={storagePct} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">Tráfego mensal</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {formatBytes(mediaSummary?.trafficUsedBytes ?? 0)} / {entitlements.limits.totalTrafficGbPerMonth} GB
                        {monthLabel ? ` • ${monthLabel}` : ''}
                      </span>
                    </div>
                    <Progress value={trafficPct} />
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                    <div className="text-sm font-medium">Limites por arquivo (seu plano)</div>
                    <div className="text-xs text-gray-600 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div><b>Vídeo:</b> até {entitlements.limits.file.maxVideoMb}MB e {entitlements.limits.file.maxVideoSeconds}s</div>
                      <div><b>Imagem:</b> até {entitlements.limits.file.maxImageMb}MB</div>
                      <div><b>PDF:</b> até {entitlements.limits.file.maxPdfMb}MB</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Add-ons ativos</div>
                    <div className="flex flex-wrap gap-2">
                      {MEDIA_ADDONS.map((addon) => {
                        const quantity = addonCount(entitlements.addons, addon.code);
                        if (!quantity) return null;
                        return (
                          <div key={addon.code} className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800">
                            {addon.title} ×{quantity}
                          </div>
                        );
                      })}
                      {(!entitlements.addons || entitlements.addons.length === 0) && (
                        <span className="text-xs text-gray-500">Nenhum add-on ativo.</span>
                      )}
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Compra e remoção de Mídia Extra ficam indisponíveis no browser até existirem ofertas oficiais desses add-ons no gateway. Nenhuma mutação direta de entitlement é enviada ao backend.
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-4 text-sm text-emerald-900 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <b>Checkout hospedado pela Cakto.</b> O OneMedia não carrega SDK de cartão, não tokeniza cartão no navegador e não recebe número, validade ou CVV.
                <div className="text-xs mt-1 text-emerald-800">A ativação do plano ocorre somente após webhook autenticado e reconciliação no backend.</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">Dados financeiros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                <div>
                  <div className="text-sm font-medium text-gray-900">Gateway de cobrança</div>
                  <div className="text-sm text-gray-600 mt-1">{gatewayStatusLabel}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    {gatewayProvider === 'CAKTO' ? 'Provider conciliado: Cakto.' : 'O provider passa a ser definido após o checkout e webhook conciliado.'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={billingMethodStatusVariant(billingSummary?.billingProfile?.paymentMethodStatus)}>
                    {billingSummary?.billingProfile?.autoChargeReady ? 'Recorrência ativa' : 'Checkout pendente'}
                  </Badge>
                  <Button type="button" variant="outline" size="sm" onClick={handleRefreshBillingStatus} disabled={isRefreshingBillingStatus}>
                    {isRefreshingBillingStatus ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Atualizando...</>
                    ) : (
                      'Atualizar status'
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-2">Responsável financeiro</div>
                  <input type="text" value={billingForm.contactName || ''} onChange={(event) => handleBillingField('contactName', event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Nome / razão social para cobrança</div>
                  <input type="text" value={billingForm.legalName || ''} onChange={(event) => handleBillingField('legalName', event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">E-mail financeiro</div>
                  <input type="email" value={billingForm.email || ''} onChange={(event) => handleBillingField('email', event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Telefone</div>
                  <input type="text" value={billingForm.phone || ''} onChange={(event) => handleBillingField('phone', event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">CPF/CNPJ</div>
                  <input type="text" value={billingForm.document || ''} onChange={(event) => handleBillingField('document', onlyDigitsValue(event.target.value))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Preferência de pagamento</div>
                  <Select value={String(billingForm.preferredMethod || 'CARTAO')} onValueChange={(value: string) => handleBillingField('preferredMethod', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CARTAO">Cartão</SelectItem>
                      <SelectItem value="PIX">Pix</SelectItem>
                      <SelectItem value="BOLETO">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-gray-500 mt-1">É apenas uma preferência cadastral. O meio disponível é confirmado no checkout Cakto.</div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">CEP</div>
                  <input type="text" value={billingForm.addressZipcode || ''} onChange={(event) => handleBillingField('addressZipcode', onlyDigitsValue(event.target.value))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Logradouro</div>
                  <input type="text" value={billingForm.addressStreet || ''} onChange={(event) => handleBillingField('addressStreet', event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Número</div>
                  <input type="text" value={billingForm.addressNumber || ''} onChange={(event) => handleBillingField('addressNumber', event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Complemento</div>
                  <input type="text" value={billingForm.addressComplement || ''} onChange={(event) => handleBillingField('addressComplement', event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Bairro</div>
                  <input type="text" value={billingForm.addressDistrict || ''} onChange={(event) => handleBillingField('addressDistrict', event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Cidade</div>
                  <input type="text" value={billingForm.addressCity || ''} onChange={(event) => handleBillingField('addressCity', event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Estado/UF</div>
                  <input type="text" value={billingForm.addressState || ''} onChange={(event) => handleBillingField('addressState', event.target.value.toUpperCase())} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">País</div>
                  <input type="text" value={billingForm.addressCountry || ''} onChange={(event) => handleBillingField('addressCountry', event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveBilling} disabled={isSavingBilling}>
                  {isSavingBilling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Salvar dados financeiros'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader><CardTitle className="text-base">Resumo mensal da cobrança</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span>Plano de pontos</span><span>{formatCurrency(normalizedPlanMonthlyPrice)}</span></div>
                <div className="flex items-center justify-between"><span>Multi-proprietários</span><span>{formatCurrency(normalizedMultiOwnerPrice)}</span></div>
                <div className="flex items-center justify-between"><span>Mídia extra</span><span>{formatCurrency(addonMonthlyTotal)}</span></div>
                <div className="border-t pt-2 flex items-center justify-between font-semibold text-base"><span>Total mensal</span><span>{formatCurrency(totalMonthlyEstimate)}</span></div>
              </div>

              {!!billingSummary?.invoices?.length && (
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <div className="text-sm font-medium">Faturas registradas</div>
                  <div className="space-y-2">
                    {billingSummary.invoices.slice(0, 4).map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
                        <span>{String(invoice.competenceMonth).padStart(2, '0')}/{invoice.competenceYear}</span>
                        <span>{formatCurrency(invoice.amount)}</span>
                        <Badge variant="outline">{invoice.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
