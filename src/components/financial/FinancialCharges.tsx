import { useState, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { DollarSign, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import { BillingStatus, PaymentMethod, BillingInvoice } from '../../types';
import { useBillingInvoices } from '../../hooks/useBillingInvoices';
import { BillingInvoiceEditDialog } from './BillingInvoiceEditDialog';
import { toast } from 'sonner';

export function FinancialCharges() {
  const { invoices: billingInvoices, loading, error, refetch, updateInvoice, markAsPaid } = useBillingInvoices({});
  const [editingInvoice, setEditingInvoice] = useState<BillingInvoice | null>(null);

  // Calcular cards de resumo com base no estado atual
  const summary = useMemo(() => {
    // Pendente = ABERTA + VENCIDA
    const pendingAmount = billingInvoices
      .filter((inv: BillingInvoice) => inv.status === BillingStatus.ABERTA || inv.status === BillingStatus.VENCIDA)
      .reduce((sum: number, inv: BillingInvoice) => sum + (inv.amount ?? (inv.amountCents ? inv.amountCents / 100 : 0)), 0);
    
    // Apenas ABERTA
    const openAmount = billingInvoices
      .filter((inv: BillingInvoice) => inv.status === BillingStatus.ABERTA)
      .reduce((sum: number, inv: BillingInvoice) => sum + (inv.amount ?? (inv.amountCents ? inv.amountCents / 100 : 0)), 0);
    
    // Receita confirmada = PAGA
    const confirmedAmount = billingInvoices
      .filter((inv: BillingInvoice) => inv.status === BillingStatus.PAGA)
      .reduce((sum: number, inv: BillingInvoice) => sum + (inv.amount ?? (inv.amountCents ? inv.amountCents / 100 : 0)), 0);
    
    // Alertas = VENCIDA
    const alertsCount = billingInvoices.filter((inv: BillingInvoice) => inv.status === BillingStatus.VENCIDA).length;

    return {
      pendingAmount,
      openAmount,
      confirmedAmount,
      alertsCount,
    };
  }, [billingInvoices]);

  const handleSaveInvoice = async (payload: Partial<BillingInvoice>) => {
    if (!editingInvoice) return;
    try {
      await updateInvoice(editingInvoice.id, payload);
      toast.success('Cobrança atualizada com sucesso');
      setEditingInvoice(null);
      refetch();
    } catch (err) {
      toast.error('Falha ao atualizar cobrança');
    }
  };

  const getChargeStatusColor = (status: BillingStatus) => {
    switch (status) {
      case BillingStatus.PAGA: return 'bg-green-100 text-green-800';
      case BillingStatus.ABERTA: return 'bg-yellow-100 text-yellow-800';
      case BillingStatus.VENCIDA: return 'bg-red-100 text-red-800';
      case BillingStatus.CANCELADA: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChargeStatusLabel = (status: BillingStatus) => {
    switch (status) {
      case BillingStatus.PAGA: return 'Paga';
      case BillingStatus.ABERTA: return 'Aberta';
      case BillingStatus.VENCIDA: return 'Vencida';
      case BillingStatus.CANCELADA: return 'Cancelada';
    }
  };

  const getPaymentMethodLabel = (method?: PaymentMethod) => {
    if (!method) return '-';
    switch (method) {
      case PaymentMethod.PIX: return 'PIX';
      case PaymentMethod.BOLETO: return 'Boleto';
      case PaymentMethod.CARTAO: return 'Cartão';
      case PaymentMethod.TRANSFERENCIA: return 'Transferência';
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await markAsPaid(id);
      toast.success('Cobrança marcada como paga');
      refetch();
    } catch (err) {
      toast.error('Falha ao marcar cobrança como paga');
    }
  };

  return (
    <div className="space-y-6">
      {loading && <div>Carregando cobranças...</div>}
      {!loading && error && <div>Erro ao carregar cobranças.</div>}
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-yellow-50 text-yellow-600 p-2 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-gray-600 text-sm">Pendentes de Cobrança</p>
            </div>
            <p className="text-gray-900">R$ {summary.pendingAmount.toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-orange-50 text-orange-600 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-gray-600 text-sm">Cobranças em Aberto</p>
            </div>
            <p className="text-gray-900">R$ {summary.openAmount.toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-50 text-green-600 p-2 rounded-lg">
                <CheckCircle className="w-5 h-5" />
              </div>
              <p className="text-gray-600 text-sm">Receita Confirmada</p>
            </div>
            <p className="text-gray-900">R$ {summary.confirmedAmount.toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-50 text-red-600 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-gray-600 text-sm">Alertas</p>
            </div>
            <p className="text-gray-900">{summary.alertsCount} cobranças</p>
          </CardContent>
        </Card>
      </div>

      {/* Charges Tabs */}
      <Tabs defaultValue="open" className="space-y-4">
        <TabsList>
          <TabsTrigger value="open">Abertas</TabsTrigger>
          <TabsTrigger value="paid">Pagas</TabsTrigger>
          <TabsTrigger value="overdue">Vencidas</TabsTrigger>
          <TabsTrigger value="canceled">Canceladas</TabsTrigger>
        </TabsList>

        <TabsContent value="open">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-gray-600 text-sm">Cliente</th>
                    <th className="px-6 py-3 text-left text-gray-600 text-sm">Proposta/Campanha</th>
                    <th className="px-6 py-3 text-left text-gray-600 text-sm">Valor</th>
                    <th className="px-6 py-3 text-left text-gray-600 text-sm">Vencimento</th>
                    <th className="px-6 py-3 text-left text-gray-600 text-sm">Método</th>
                    <th className="px-6 py-3 text-left text-gray-600 text-sm">NF?</th>
                    <th className="px-6 py-3 text-left text-gray-600 text-sm">Status</th>
                    <th className="px-6 py-3 text-left text-gray-600 text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {billingInvoices
                    .filter((c: BillingInvoice) => c.status === BillingStatus.ABERTA)
                    .map((charge) => (
                      <tr key={charge.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-900">
                          {charge.clientName || charge.client?.companyName || charge.client?.contactName || 'Cliente não identificado'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            {charge.proposalId && (
                              <p className="text-indigo-600">Prop: {charge.proposalTitle || charge.proposalId}</p>
                            )}
                            {charge.campaignId && (
                              <p className="text-gray-600">Camp: {charge.campaignName || charge.campaignId}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-900">
                          R$ {(charge.amount ?? (charge.amountCents ? charge.amountCents / 100 : 0)).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {new Date(charge.dueDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {getPaymentMethodLabel(charge.paymentMethod)}
                        </td>
                        <td className="px-6 py-4">
                          {charge.generateNf ? (
                            <Badge className="bg-blue-100 text-blue-800">Sim</Badge>
                          ) : (
                            <Badge variant="outline">Não</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getChargeStatusColor(charge.status)}>
                            {getChargeStatusLabel(charge.status)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => setEditingInvoice(charge)}
                          >
                            <DollarSign className="w-4 h-4" />
                            Editar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleMarkPaid(charge.id)}
                          >
                            Marcar como paga
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="paid">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-gray-600 text-sm">Cliente</th>
                    <th className="px-6 py-3 text-left text-gray-600 text-sm">Proposta</th>
                    <th className="px-6 py-3 text-left text-gray-600 text-sm">Valor</th>
                    <th className="px-6 py-3 text-left text-gray-600 text-sm">Data Pgto</th>
                    <th className="px-6 py-3 text-left text-gray-600 text-sm">Método</th>
                    <th className="px-6 py-3 text-left text-gray-600 text-sm">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {billingInvoices
                    .filter((c: BillingInvoice) => c.status === BillingStatus.PAGA)
                    .map((charge) => (
                      <tr key={charge.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-900">
                          {charge.clientName || charge.client?.companyName || charge.client?.contactName || 'Cliente não identificado'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-indigo-600">{charge.proposalTitle || charge.proposalId}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-900">
                          R$ {(charge.amount ?? (charge.amountCents ? charge.amountCents / 100 : 0)).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {charge.paidAt ? new Date(charge.paidAt).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {getPaymentMethodLabel(charge.paymentMethod)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getChargeStatusColor(charge.status)}>
                            {getChargeStatusLabel(charge.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card>
            {billingInvoices.filter((c: BillingInvoice) => c.status === BillingStatus.VENCIDA).length === 0 ? (
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma cobrança vencida</p>
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">Cliente</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">Proposta</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">Valor</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">Vencimento</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">Status</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {billingInvoices
                      .filter((c: BillingInvoice) => c.status === BillingStatus.VENCIDA)
                      .map((charge) => (
                        <tr key={charge.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-900">
                            {charge.clientName || charge.client?.companyName || charge.client?.contactName || 'Cliente não identificado'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-indigo-600">{charge.proposalTitle || charge.proposalId}</span>
                          </td>
                          <td className="px-6 py-4 text-gray-900">
                            R$ {(charge.amount ?? (charge.amountCents ? charge.amountCents / 100 : 0)).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 text-red-600">
                            {new Date(charge.dueDate).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={getChargeStatusColor(charge.status)}>
                              {getChargeStatusLabel(charge.status)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-2"
                              onClick={() => setEditingInvoice(charge)}
                            >
                              <DollarSign className="w-4 h-4" />
                              Editar
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleMarkPaid(charge.id)}
                            >
                              Marcar como paga
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="canceled">
          <Card>
            {billingInvoices.filter((c: BillingInvoice) => c.status === BillingStatus.CANCELADA).length === 0 ? (
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma cobrança cancelada</p>
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">Cliente</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">Proposta</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">Valor</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {billingInvoices
                      .filter((c: BillingInvoice) => c.status === BillingStatus.CANCELADA)
                      .map((charge) => (
                        <tr key={charge.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-900">
                            {charge.clientName || charge.client?.companyName || charge.client?.contactName || 'Cliente não identificado'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-indigo-600">{charge.proposalTitle || charge.proposalId}</span>
                          </td>
                          <td className="px-6 py-4 text-gray-900">
                            R$ {(charge.amount ?? (charge.amountCents ? charge.amountCents / 100 : 0)).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={getChargeStatusColor(charge.status)}>
                              {getChargeStatusLabel(charge.status)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-900 mb-2">💡 BillingInvoice (Cobranças para Clientes)</p>
        <p className="text-sm text-blue-700">
          Cobranças criadas a partir de Propostas aprovadas. Campos: clientId, proposalId/campaignId, amount, dueDate, status, paymentMethod, generateNf.
          Status: <strong>ABERTA</strong> → <strong>PAGA</strong> | <strong>VENCIDA</strong> | <strong>CANCELADA</strong>
        </p>
      </div>

      {/* Dialog de Edição */}
      <BillingInvoiceEditDialog
        open={!!editingInvoice}
        invoice={editingInvoice}
        onOpenChange={(open: boolean) => {
          if (!open) setEditingInvoice(null);
        }}
        onSave={handleSaveInvoice}
      />
    </div>
  );
}