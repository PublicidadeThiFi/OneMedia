import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Campaign, BillingStatus, PaymentMethod, BillingInvoice } from '../../types';
import apiClient from '../../lib/apiClient';
import { toast } from 'sonner';

interface CampaignBillingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
}

export function CampaignBillingDrawer({ open, onOpenChange, campaign }: CampaignBillingDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);

  const loadInvoices = async () => {
    if (!campaign) return;
    try {
      setLoading(true);
      const res = await apiClient.get<BillingInvoice[]>('/billing-invoices', {
        params: { campaignId: campaign.id, orderBy: 'dueDate', orderDirection: 'asc' },
      });
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar faturas da campanha.');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaign?.id]);

  const totals = useMemo(() => {
    const paid = invoices
      .filter((inv) => inv.status === BillingStatus.PAGA)
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    const openAmount = invoices
      .filter((inv) => inv.status === BillingStatus.ABERTA || inv.status === BillingStatus.VENCIDA)
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    return { paid, openAmount };
  }, [invoices]);

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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-4xl">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle>Faturamento - {campaign.name}</DrawerTitle>
                <p className="text-sm text-gray-500 mt-1">Faturas vinculadas a esta campanha</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Fechar">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DrawerHeader>

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-gray-900">Resumo Financeiro</h2>
              <Button variant="outline" onClick={handleViewFinancial}>
                Ver no Financeiro
              </Button>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Valor Pago</p>
                <p className="text-gray-900">
                  R$ {totals.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Valor em Aberto</p>
                <p className="text-gray-900">
                  R$ {totals.openAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
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
                <div className="border border-gray-200 rounded-lg overflow-hidden">
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
                            {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            R$ {Number(invoice.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                            {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('pt-BR') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
