import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Campaign, BillingStatus, PaymentMethod } from '../../types';
import { getBillingInvoicesForCampaign } from '../../lib/mockData';
import { toast } from 'sonner@2.0.3';

interface CampaignBillingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
}

export function CampaignBillingDrawer({
  open,
  onOpenChange,
  campaign,
}: CampaignBillingDrawerProps) {
  if (!campaign) return null;

  const invoices = getBillingInvoicesForCampaign(campaign.id);

  const getStatusColor = (status: BillingStatus) => {
    switch (status) {
      case BillingStatus.ABERTA:
        return 'bg-yellow-100 text-yellow-800';
      case BillingStatus.PAGA:
        return 'bg-green-100 text-green-800';
      case BillingStatus.VENCIDA:
        return 'bg-red-100 text-red-800';
      case BillingStatus.CANCELADA:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: BillingStatus) => {
    switch (status) {
      case BillingStatus.ABERTA:
        return 'Aberta';
      case BillingStatus.PAGA:
        return 'Paga';
      case BillingStatus.VENCIDA:
        return 'Vencida';
      case BillingStatus.CANCELADA:
        return 'Cancelada';
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod | null | undefined) => {
    if (!method) return '-';
    switch (method) {
      case PaymentMethod.PIX:
        return 'PIX';
      case PaymentMethod.BOLETO:
        return 'Boleto';
      case PaymentMethod.CARTAO:
        return 'Cartão';
      case PaymentMethod.TRANSFERENCIA:
        return 'Transferência';
    }
  };

  const handleViewFinancial = () => {
    // TODO: Navegar para o módulo financeiro
    toast.info('Redirecionamento para Financeiro (mock)');
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[90vh] max-w-3xl mx-auto">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>Faturamento - {campaign.name}</DrawerTitle>
              <p className="text-sm text-gray-500 mt-1">
                Faturas vinculadas a esta campanha
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto p-6 space-y-6">
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhuma fatura encontrada para esta campanha</p>
            </div>
          ) : (
            <>
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Total de Faturas</p>
                  <p className="text-gray-900">{invoices.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Valor Pago</p>
                  <p className="text-gray-900">
                    R${' '}
                    {invoices
                      .filter((inv) => inv.status === BillingStatus.PAGA)
                      .reduce((sum, inv) => sum + inv.amount, 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Valor em Aberto</p>
                  <p className="text-gray-900">
                    R${' '}
                    {invoices
                      .filter(
                        (inv) =>
                          inv.status === BillingStatus.ABERTA || inv.status === BillingStatus.VENCIDA
                      )
                      .reduce((sum, inv) => sum + inv.amount, 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Tabela de Faturas */}
              <div>
                <h3 className="text-gray-900 mb-3">Faturas</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Vencimento</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Valor</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Método</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Pago Em</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            R${' '}
                            {invoice.amount.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={getStatusColor(invoice.status)}>
                              {getStatusLabel(invoice.status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {getPaymentMethodLabel(invoice.paymentMethod)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {invoice.paidAt
                              ? new Date(invoice.paidAt).toLocaleDateString('pt-BR')
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Botão para ir ao Financeiro */}
          <div className="pt-4 border-t">
            <Button variant="outline" onClick={handleViewFinancial}>
              Ver no Módulo Financeiro
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
