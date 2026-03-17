import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { AlertCircle, CheckCircle2, Crown, Info, Loader2, HardDrive, Wifi } from 'lucide-react';
import {
  Company,
  PlatformPlan,
  PlatformSubscription,
  PlatformSubscriptionStatus,
  PlatformSubscriptionAddonCode,
  PlatformBillingProfile,
} from '../../types';
import { useCompany } from '../../contexts/CompanyContext';
import { getFriendlyPlanLabel, getMultiOwnerPlanPrice, getMultiOwnerPlanName, getMultiOwnerPriceCents } from '../../lib/plans';
import { buildMediaUsageSummary, formatBytes } from '../../lib/mediaValidation';
import { toast } from 'sonner';

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
  priceBrl: number;
  addStorageGb: number;
  addTrafficGb: number;
}> = [
  { code: 'MEDIA_P', title: 'Mídia extra P', subtitle: '+10 GB storage • +50 GB tráfego/mês', priceBrl: 99, addStorageGb: 10, addTrafficGb: 50 },
  { code: 'MEDIA_M', title: 'Mídia extra M', subtitle: '+25 GB storage • +125 GB tráfego/mês', priceBrl: 199, addStorageGb: 25, addTrafficGb: 125 },
  { code: 'MEDIA_G', title: 'Mídia extra G', subtitle: '+50 GB storage • +250 GB tráfego/mês', priceBrl: 349, addStorageGb: 50, addTrafficGb: 250 },
  { code: 'MEDIA_GG', title: 'Mídia extra GG', subtitle: '+100 GB storage • +500 GB tráfego/mês', priceBrl: 599, addStorageGb: 100, addTrafficGb: 500 },
];

function addonCount(addons: { code: PlatformSubscriptionAddonCode; quantity: number }[] | undefined, code: PlatformSubscriptionAddonCode): number {
  const line = (addons || []).find((a) => a.code === code);
  return Math.max(0, Math.floor(line?.quantity ?? 0));
}

export function SubscriptionSettings({
  company,
  subscription,
  plans,
  plansLoading,
  pointsUsed,
  onUpdateSubscription,
}: SubscriptionSettingsProps) {
  const {
    entitlements,
    billingSummary,
    purchaseMediaAddon,
    removeMediaAddon,
    updateBillingProfile,
    refreshEntitlements,
    refreshBillingSummary,
    blockReason,
  } = useCompany();

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => (a.minPoints ?? 0) - (b.minPoints ?? 0)),
    [plans]
  );

  const currentPlan = useMemo(
    () => sortedPlans.find((p) => p.id === subscription.planId) || null,
    [sortedPlans, subscription.planId]
  );

  const [selectedPlanId, setSelectedPlanId] = useState(subscription.planId);
  const [selectedMaxOwners, setSelectedMaxOwners] = useState(subscription.maxOwnersPerMediaPoint || 1);
  const [isUpdating, setIsUpdating] = useState(false);

  const [addonLoading, setAddonLoading] = useState<PlatformSubscriptionAddonCode | null>(null);
  const [addonRemoving, setAddonRemoving] = useState<PlatformSubscriptionAddonCode | null>(null);
  const [isSavingBilling, setIsSavingBilling] = useState(false);
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
    paymentMethodStatusLabel: 'Dados financeiros pendentes',
    autoChargeReady: false,
  });

  useEffect(() => {
    if (!billingSummary?.billingProfile) return;
    setBillingForm(billingSummary.billingProfile);
  }, [billingSummary]);

  const selectedPlan = useMemo(
    () => sortedPlans.find((p) => p.id === selectedPlanId) || null,
    [sortedPlans, selectedPlanId]
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

  const normalizedPlanMonthlyPrice = priceIsCents ? planMonthlyPrice / 100 : planMonthlyPrice;
  const normalizedMultiOwnerPrice = priceIsCents ? multiOwnerPlanPrice / 100 : multiOwnerPlanPrice;
  const baseMonthlyPrice = normalizedPlanMonthlyPrice + normalizedMultiOwnerPrice;
  const addonMonthlyTotal = billingSummary?.totals?.addonsMonthly ?? 0;
  const totalMonthlyEstimate = baseMonthlyPrice + addonMonthlyTotal;

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
      await refreshEntitlements();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erro ao atualizar assinatura.');
    } finally {
      setIsUpdating(false);
    }
  };

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
    const y = entitlements?.usage?.year;
    const m = entitlements?.usage?.month;
    if (!y || !m) return null;
    const mm = String(m).padStart(2, '0');
    return `${mm}/${y}`;
  }, [entitlements?.usage?.year, entitlements?.usage?.month]);

  const buyAddon = async (code: PlatformSubscriptionAddonCode) => {
    const addon = MEDIA_ADDONS.find((a) => a.code === code);
    if (!addon) return;

    const ok = window.confirm(
      `Adicionar ${addon.title}?\n\nInclui: ${addon.subtitle}\nValor: ${formatCurrency(addon.priceBrl)} / mês\n\n(Fluxo de pagamento ainda não integrado — isto apenas registra o add-on no sistema.)`
    );
    if (!ok) return;

    try {
      setAddonLoading(code);
      await purchaseMediaAddon(code, 1);
      toast.success('Add-on registrado com sucesso.');
      await refreshEntitlements();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao adicionar add-on.');
    } finally {
      setAddonLoading(null);
    }
  };

  const handleRemoveAddon = async (code: PlatformSubscriptionAddonCode) => {
    const addon = MEDIA_ADDONS.find((a) => a.code === code);
    if (!addon) return;

    const ok = window.confirm(`Remover 1 unidade de ${addon.title} da sua assinatura mensal?`);
    if (!ok) return;

    try {
      setAddonRemoving(code);
      await removeMediaAddon(code, 1);
      toast.success('Add-on removido com sucesso.');
      await refreshEntitlements();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao remover add-on.');
    } finally {
      setAddonRemoving(null);
    }
  };

  const handleBillingField = (field: keyof PlatformBillingProfile, value: string) => {
    setBillingForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveBilling = async () => {
    if (!billingForm.contactName?.trim()) {
      toast.error('Informe o responsável financeiro.');
      return;
    }
    if (!billingForm.legalName?.trim()) {
      toast.error('Informe o nome ou razão social para cobrança.');
      return;
    }
    if (!billingForm.email?.trim()) {
      toast.error('Informe o e-mail financeiro.');
      return;
    }
    if (!billingForm.document?.trim()) {
      toast.error('Informe o CPF ou CNPJ financeiro.');
      return;
    }
    if (!billingForm.addressZipcode?.trim()) {
      toast.error('Informe o CEP de cobrança.');
      return;
    }
    if (!billingForm.addressStreet?.trim()) {
      toast.error('Informe o logradouro de cobrança.');
      return;
    }
    if (!billingForm.addressNumber?.trim()) {
      toast.error('Informe o número do endereço de cobrança.');
      return;
    }
    if (!billingForm.addressDistrict?.trim()) {
      toast.error('Informe o bairro de cobrança.');
      return;
    }
    if (!billingForm.addressCity?.trim()) {
      toast.error('Informe a cidade de cobrança.');
      return;
    }
    if (!billingForm.addressState?.trim()) {
      toast.error('Informe o estado/UF de cobrança.');
      return;
    }
    if (!billingForm.addressCountry?.trim()) {
      toast.error('Informe o país de cobrança.');
      return;
    }

    try {
      setIsSavingBilling(true);
      await updateBillingProfile(billingForm);
      await refreshBillingSummary();
      toast.success('Dados financeiros atualizados.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao salvar dados financeiros.');
    } finally {
      setIsSavingBilling(false);
    }
  };

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
              <div className="font-medium">{getFriendlyPlanLabel(currentPlan as any)}</div>
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

          {/* Media quotas */}
          <Card className={(blockReason === 'STORAGE_EXCEEDED' || blockReason === 'TRAFFIC_EXCEEDED') ? 'border-red-200 bg-red-50' : 'border-gray-200'}>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium">Mídia (Storage + Tráfego)</span>
                </div>
                <Button variant="outline" size="sm" onClick={refreshEntitlements}>
                  Atualizar
                </Button>
              </div>

              {!entitlements ? (
                <div className="text-sm text-gray-600">
                  Não foi possível carregar os limites de mídia. Clique em <b>Atualizar</b>.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Storage */}
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
                    <div className="text-xs text-gray-500">
                      Se atingir 100%, novos uploads serão bloqueados.
                    </div>
                  </div>

                  {/* Traffic */}
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
                    <div className="text-xs text-gray-500">
                      Se atingir 100%, o acesso a mídias (uploads/downloads) pode ser bloqueado até comprar Mídia extra.
                    </div>
                  </div>

                  {/* File limits */}
                  <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                    <div className="text-sm font-medium">Limites por arquivo (seu plano)</div>
                    <div className="text-xs text-gray-600 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <b>Vídeo:</b> até {entitlements.limits.file.maxVideoMb}MB e {entitlements.limits.file.maxVideoSeconds}s
                      </div>
                      <div>
                        <b>Imagem:</b> até {entitlements.limits.file.maxImageMb}MB
                      </div>
                      <div>
                        <b>PDF:</b> até {entitlements.limits.file.maxPdfMb}MB
                      </div>
                    </div>
                  </div>

                  {/* Current addons */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Add-ons ativos</div>
                    <div className="flex flex-wrap gap-2">
                      {MEDIA_ADDONS.map((a) => {
                        const qty = addonCount(entitlements.addons, a.code);
                        if (!qty) return null;
                        return (
                          <div key={a.code} className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-800">
                            <span className="text-xs font-medium">{a.title} ×{qty}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAddon(a.code)}
                              disabled={addonRemoving != null}
                              className="text-[11px] font-semibold hover:underline disabled:opacity-50"
                            >
                              {addonRemoving === a.code ? 'Removendo...' : 'Remover 1'}
                            </button>
                          </div>
                        );
                      })}
                      {(!entitlements.addons || entitlements.addons.length === 0) && (
                        <span className="text-xs text-gray-500">Nenhum add-on ativo.</span>
                      )}
                    </div>
                  </div>

                  {/* Buy addons */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Comprar Mídia extra</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {MEDIA_ADDONS.map((a) => (
                        <div key={a.code} className="rounded-lg border border-gray-200 bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium">{a.title}</div>
                              <div className="text-xs text-gray-600">{a.subtitle}</div>
                              <div className="text-sm font-semibold mt-1">{formatCurrency(a.priceBrl)}</div>
                            </div>
                            <Button
                              onClick={() => buyAddon(a.code)}
                              disabled={addonLoading != null}
                              className={blockReason === 'STORAGE_EXCEEDED' || blockReason === 'TRAFFIC_EXCEEDED' ? 'bg-red-600 hover:opacity-95' : undefined}
                            >
                              {addonLoading === a.code ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Processando...
                                </>
                              ) : (
                                'Adicionar'
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500">
                      O add-on aumenta seu <b>storage</b> e automaticamente aumenta o <b>tráfego mensal</b> (k=5).
                    </div>
                  </div>
                </div>
              )}
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
                  {sortedPlans.map((plan) => {
                    const label = getFriendlyPlanLabel(plan as any);
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
              <b>Pagamento automático ainda depende do gateway.</b> Nesta etapa o sistema já salva os dados financeiros,
              consolida o total mensal e controla assinatura, mídia extra e multi-proprietários.
              <br />
              <span className="text-xs">A tokenização real do meio de pagamento (cartão/PIX/boleto) entra na integração do gateway.</span>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">Dados financeiros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                <div>
                  <div className="text-sm font-medium text-gray-900">Status do método de pagamento</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {billingSummary?.billingProfile?.paymentMethodStatusLabel || 'Aguardando configuração do Mercado Pago'}
                  </div>
                </div>
                <Badge variant={billingMethodStatusVariant(billingSummary?.billingProfile?.paymentMethodStatus)}>
                  {billingSummary?.billingProfile?.paymentMethodStatus === 'PRONTO_PARA_COBRANCA'
                    ? 'Pronto para cobrança'
                    : billingSummary?.billingProfile?.paymentMethodStatus === 'AGUARDANDO_VINCULACAO'
                      ? 'Aguardando vínculo'
                      : 'Pendente'}
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-2">Responsável financeiro</div>
                  <input
                    type="text"
                    value={billingForm.contactName || ''}
                    onChange={(e) => handleBillingField('contactName', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Nome / razão social para cobrança</div>
                  <input
                    type="text"
                    value={billingForm.legalName || ''}
                    onChange={(e) => handleBillingField('legalName', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">E-mail financeiro</div>
                  <input
                    type="email"
                    value={billingForm.email || ''}
                    onChange={(e) => handleBillingField('email', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Telefone</div>
                  <input
                    type="text"
                    value={billingForm.phone || ''}
                    onChange={(e) => handleBillingField('phone', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">CPF ou CNPJ</div>
                  <input
                    type="text"
                    value={billingForm.document || ''}
                    onChange={(e) => handleBillingField('document', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Forma preferida de cobrança</div>
                  <Select
                    value={String(billingForm.preferredMethod || 'CARTAO')}
                    onValueChange={(value: string) => handleBillingField('preferredMethod', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CARTAO">Cartão recorrente</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="BOLETO">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                <div className="text-sm font-medium text-gray-900">Endereço de cobrança</div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm font-medium mb-2">CEP</div>
                    <input
                      type="text"
                      value={billingForm.addressZipcode || ''}
                      onChange={(e) => handleBillingField('addressZipcode', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm font-medium mb-2">Logradouro</div>
                    <input
                      type="text"
                      value={billingForm.addressStreet || ''}
                      onChange={(e) => handleBillingField('addressStreet', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">Número</div>
                    <input
                      type="text"
                      value={billingForm.addressNumber || ''}
                      onChange={(e) => handleBillingField('addressNumber', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm font-medium mb-2">Complemento</div>
                    <input
                      type="text"
                      value={billingForm.addressComplement || ''}
                      onChange={(e) => handleBillingField('addressComplement', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">Bairro</div>
                    <input
                      type="text"
                      value={billingForm.addressDistrict || ''}
                      onChange={(e) => handleBillingField('addressDistrict', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">Cidade</div>
                    <input
                      type="text"
                      value={billingForm.addressCity || ''}
                      onChange={(e) => handleBillingField('addressCity', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">Estado / UF</div>
                    <input
                      type="text"
                      value={billingForm.addressState || ''}
                      onChange={(e) => handleBillingField('addressState', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <div className="text-sm font-medium mb-2">País</div>
                    <input
                      type="text"
                      value={billingForm.addressCountry || ''}
                      onChange={(e) => handleBillingField('addressCountry', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
                {billingSummary?.billingProfile?.autoChargeReady ? (
                  <span>Meio de pagamento tokenizado e pronto para cobrança automática.</span>
                ) : (
                  <span>Os dados financeiros já estão prontos. A tokenização do cartão e a ativação automática entram na próxima etapa com o Mercado Pago.</span>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveBilling} disabled={isSavingBilling}>
                  {isSavingBilling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar dados financeiros'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">Resumo mensal da cobrança</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Plano de pontos</span>
                  <span>{formatCurrency(normalizedPlanMonthlyPrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Multi-proprietários</span>
                  <span>{formatCurrency(normalizedMultiOwnerPrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Mídia extra</span>
                  <span>{formatCurrency(addonMonthlyTotal)}</span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between font-semibold text-base">
                  <span>Total mensal</span>
                  <span>{formatCurrency(totalMonthlyEstimate)}</span>
                </div>
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

          <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
            <div>
              <div className="text-sm text-gray-600">Total mensal consolidado</div>
              <div className="text-lg font-semibold">{formatCurrency(totalMonthlyEstimate)}</div>
              <div className="text-xs text-gray-500">Plano + multi-proprietários + mídia extra.</div>
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
