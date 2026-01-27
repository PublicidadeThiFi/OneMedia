import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  Campaign,
  BillingStatus,
  PaymentMethod,
  BillingInvoice,
  BillingInvoiceType,
  BillingInvoiceForecastItem,
} from '../../types';
import apiClient from '../../lib/apiClient';
import { toast } from 'sonner';
import { formatBRL, formatDateBR, safeDate } from '../../lib/format';

interface CampaignBillingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
}

export function CampaignBillingDrawer({ open, onOpenChange, campaign }: CampaignBillingDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [forecastInvoices, setForecastInvoices] = useState<BillingInvoiceForecastItem[]>([]);

  type CampaignDetailsResponse = {
    campaign?: any;
    invoices?: BillingInvoice[];
    forecastInvoices?: BillingInvoiceForecastItem[];
  };

  const loadData = async () => {
    if (!campaign) return;
    try {
      setLoading(true);
      // Preferencial: endpoint agregador (mesmo usado em "Ver Detalhes")
      try {
        const detailsRes = await apiClient.get<CampaignDetailsResponse>(`/campaigns/${campaign.id}/details`);
        const data: any = detailsRes?.data;
        if (data && typeof data === 'object') {
          if (Array.isArray(data.invoices)) setInvoices(data.invoices);
          else setInvoices([]);

          if (Array.isArray(data.forecastInvoices)) setForecastInvoices(data.forecastInvoices);
          else setForecastInvoices([]);
          return;
        }
      } catch {
        // fallback abaixo
      }

      const [resInvoices, resForecast] = await Promise.allSettled([
        apiClient.get<BillingInvoice[]>('/billing-invoices', {
          params: { campaignId: campaign.id, orderBy: 'dueDate', orderDirection: 'asc' },
        }),
        apiClient.get<BillingInvoiceForecastItem[]>('/billing-invoices/forecast', {
          params: { campaignId: campaign.id },
        }),
      ]);

      setInvoices(resInvoices.status === 'fulfilled' && Array.isArray(resInvoices.value.data) ? resInvoices.value.data : []);
      setForecastInvoices(
        resForecast.status === 'fulfilled' && Array.isArray(resForecast.value.data) ? resForecast.value.data : []
      );
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar faturas da campanha.');
      setInvoices([]);
      setForecastInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaign?.id]);

  const totals = useMemo(() => {
    const paid = invoices
      .filter((inv) => inv.status === BillingStatus.PAGA)
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    const openAmount = invoices
      .filter((inv) => inv.status === BillingStatus.ABERTA || inv.status === BillingStatus.VENCIDA)
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    const forecastAmount = forecastInvoices
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    return { paid, openAmount, forecastAmount };
  }, [invoices, forecastInvoices]);

  const paymentGate = useMemo(() => {
    const isPaid = (inv: BillingInvoice) => inv.status === BillingStatus.PAGA;
    const isCancelled = (inv: BillingInvoice) => inv.status === BillingStatus.CANCELADA;
    if (!invoices.length) return { ok: true, pending: [] as BillingInvoice[] };

    const upfront = invoices.filter((i) => i.type === BillingInvoiceType.UPFRONT && !isCancelled(i));
    const rent = invoices.filter((i) => i.type === BillingInvoiceType.RENT && !isCancelled(i));
    const firstRent = rent
      .slice()
      .sort((a, b) => {
        const sa = a.sequence ?? 9999;
        const sb = b.sequence ?? 9999;
        if (sa !== sb) return sa - sb;
        return new Date(a.dueDate as any).getTime() - new Date(b.dueDate as any).getTime();
      })[0];

    let required: BillingInvoice[] = [];
    if (upfront.length || rent.length) {
      required = [...upfront, ...(firstRent ? [firstRent] : [])];
    } else {
      const minDue = Math.min(...invoices.map((i) => new Date(i.dueDate as any).getTime()));
      required = invoices.filter((i) => new Date(i.dueDate as any).getTime() === minDue);
    }

    const pending = required.filter((i) => !isPaid(i));
    return { ok: pending.length === 0, pending };
  }, [invoices]);

  const anchorDay = useMemo(() => {
    if (!campaign) return null;
    if (campaign.approvedAt) return new Date(campaign.approvedAt as any).getDate();
    if (invoices.length) return new Date(invoices[0].dueDate as any).getDate();
    return null;
  }, [campaign, invoices]);

  const nextDue = useMemo(() => {
    const isPaid = (inv: BillingInvoice) => inv.status === BillingStatus.PAGA;
    const isCancelled = (inv: BillingInvoice) => inv.status === BillingStatus.CANCELADA;
    return (
      invoices
        .filter((i) => !isPaid(i) && !isCancelled(i))
        .slice()
        .sort((a, b) => new Date(a.dueDate as any).getTime() - new Date(b.dueDate as any).getTime())[0] || null
    );
  }, [invoices]);

  const hasConfirmationAlert = useMemo(() => {
    const fromInvoices = invoices.some(
      (i) => !!i.requiresConfirmation && i.status !== BillingStatus.PAGA && i.status !== BillingStatus.CANCELADA
    );
    const fromForecast = forecastInvoices.some((i) => !!i.requiresConfirmation);
    return fromInvoices || fromForecast;
  }, [invoices, forecastInvoices]);

  if (!campaign) return null;

  const getStatusLabel = (status: BillingStatus) => {
    switch (status) {
      case BillingStatus.PAGA:
        return 'Paga';
      case BillingStatus.VENCIDA:
        return 'Vencida';
      case BillingStatus.CANCELADA:
        return 'Cancelada';
      default:
        return 'Aberta';
    }
  };

  const getPaymentMethodLabel = (method?: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.PIX:
        return 'PIX';
      case PaymentMethod.BOLETO:
        return 'Boleto';
      case PaymentMethod.CARTAO:
        return 'Cartão';
      case PaymentMethod.TRANSFERENCIA:
        return 'Transferência';
      default:
        return '-';
    }
  };

  const handleViewFinancial = () => {
    // Mantemos stub (não existe tela Financeiro ainda nesta parte)
    toast.info('Integração com tela Financeiro será adicionada no módulo financeiro.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[1600px] h-[90vh] max-h-[90vh] p-0 overflow-hidden flex flex-col gap-0">
        <div className="h-full flex flex-col min-h-0">
          <div className="p-6 border-b">
            <DialogHeader>
              <DialogTitle>Faturamento — {campaign.name}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-500 mt-1">Faturas vinculadas a esta campanha</p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
            <div className="flex items-center justify-between">
              <h2 className="text-gray-900">Resumo Financeiro</h2>
              <Button variant="outline" onClick={handleViewFinancial}>
                Ver no Financeiro
              </Button>
            </div>

            {/* Avisos do novo fluxo (recorrência + bloqueio de check-in) */}
            <div className="space-y-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <span>
                    <b>Regra:</b> o primeiro pagamento deve estar <b>pago</b> para liberar o check-in.
                  </span>
                  {anchorDay ? <Badge className="bg-gray-100 text-gray-800">Recorrência: dia {anchorDay}</Badge> : null}
                </div>
                {nextDue ? (
                  <div className="mt-1 text-xs text-blue-800">
                    Próximo vencimento: <b>{formatDateBR(nextDue.dueDate as any)}</b>
                  </div>
                ) : null}
                {hasConfirmationAlert ? (
                  <div className="mt-1 text-xs text-blue-800">
                    <b>Atenção:</b> existe uma cobrança marcada como “requer confirmação” (regra de 30 dias antes do vencimento).
                  </div>
                ) : null}
              </div>

              {invoices.length > 0 ? (
                <div
                  className={`border rounded-lg p-4 text-sm ${paymentGate.ok ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`}
                >
                  {paymentGate.ok ? 'Pagamento inicial OK — check-in liberado' : 'Pagamento inicial pendente — check-in bloqueado'}

                  {!paymentGate.ok && paymentGate.pending.length > 0 ? (
                    <ul className="mt-2 list-disc pl-5 text-sm text-red-800 space-y-1">
                      {paymentGate.pending.map((inv) => (
                        <li key={inv.id}>
                          {inv.type === BillingInvoiceType.UPFRONT
                            ? 'Custos iniciais (produção/instalação)'
                            : inv.type === BillingInvoiceType.RENT
                            ? 'Aluguel (primeiro ciclo)'
                            : 'Fatura inicial'}{' '}
                          — venc. {formatDateBR(inv.dueDate as any)} — {formatBRL(Number(inv.amount || 0))}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Valor Pago</p>
                <p className="text-gray-900">{formatBRL(totals.paid)}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Valor em Aberto</p>
                <p className="text-gray-900">{formatBRL(totals.openAmount)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Faturas Futuras (previsto)</p>
                <p className="text-gray-900">{formatBRL(totals.forecastAmount)}</p>
              </div>
            </div>

            {/* Tabela */}
            <div>
              <h3 className="text-gray-900 mb-3">Faturas</h3>

              {loading ? (
                <div className="text-sm text-gray-500">Carregando faturas...</div>
              ) : invoices.length === 0 ? (
                <div className="text-sm text-gray-500">Nenhuma fatura encontrada para esta campanha.</div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Vencimento</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Valor</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Método</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Pagamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {formatDateBR(invoice.dueDate)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {formatBRL(Number(invoice.amount || 0))}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              className={
                                invoice.status === BillingStatus.PAGA
                                  ? 'bg-green-100 text-green-800'
                                  : invoice.status === BillingStatus.VENCIDA
                                  ? 'bg-red-100 text-red-800'
                                  : invoice.status === BillingStatus.CANCELADA
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }
                            >
                              {getStatusLabel(invoice.status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {getPaymentMethodLabel(invoice.paymentMethod)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {invoice.paidAt ? formatDateBR(invoice.paidAt) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Forecast */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-900">Faturas futuras (previsto)</h3>
                  <Badge className="bg-gray-100 text-gray-800">Forecast</Badge>
                </div>

                {loading ? (
                  <div className="text-sm text-gray-500">Carregando previsão...</div>
                ) : forecastInvoices.length === 0 ? (
                  <div className="text-sm text-gray-500">Não há faturas futuras previstas para esta campanha.</div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm text-gray-600">Seq.</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-600">Vencimento</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-600">Período</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-600">Valor</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-600">Atenção</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {forecastInvoices.map((inv) => {
                          const due = safeDate(inv.dueDate as any);
                          const ps = safeDate(inv.periodStart as any);
                          const pe = safeDate(inv.periodEnd as any);
                          return (
                            <tr key={inv.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-700">{inv.sequence ?? '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{formatDateBR(due)}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {formatDateBR(ps)} → {formatDateBR(pe)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {formatBRL(Number(inv.amount || 0))}
                              </td>
                              <td className="px-4 py-3">
                                {inv.requiresConfirmation ? (
                                  <Badge className="bg-blue-100 text-blue-800">Requer confirmação</Badge>
                                ) : (
                                  <span className="text-sm text-gray-500">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
