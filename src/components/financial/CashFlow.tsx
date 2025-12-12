import { useState, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ChevronLeft, ChevronRight, Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Badge } from '../ui/badge';
import { CashFlowType, PaymentType, PaymentMethod, CashTransaction } from '../../types';
import { CashTransactionFormDialog } from './CashTransactionFormDialog';
import { useCashTransactions } from '../../hooks/useCashTransactions';
import { useTransactionCategories } from '../../hooks/useTransactionCategories';
import { toast } from 'sonner';

export function CashFlow() {
  // Filtros de período
  const [currentMonth, setCurrentMonth] = useState<number>(1); // 0-11, iniciando em fevereiro (1) = 2024
  const [currentYear, setCurrentYear] = useState<number>(2024);
  const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<CashTransaction | null>(null);

  // Calcular range de datas para o hook
  const { dateFrom, dateTo } = useMemo(() => {
    const start = new Date(currentYear, currentMonth, 1);
    const end = new Date(currentYear, currentMonth + 1, 0);
    const toIso = (d: Date) => d.toISOString().slice(0, 10);
    return { dateFrom: toIso(start), dateTo: toIso(end) };
  }, [currentMonth, currentYear]);

  const { transactions, loading, error, refetch, createTransaction, updateTransaction, deleteTransaction } = useCashTransactions({ dateFrom, dateTo });
  const { categories } = useTransactionCategories();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const previousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Filtrar transações pelo mês/ano atual
  const visibleTransactions = useMemo(() => transactions, [transactions]);

  // Calcular cards de resumo com base nas transações visíveis
  const summary = useMemo(() => {
    const receiptsTotal = visibleTransactions
      .filter(tx => tx.flowType === CashFlowType.RECEITA)
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const expensesTotal = visibleTransactions
      .filter(tx => 
        tx.flowType === CashFlowType.DESPESA ||
        tx.flowType === CashFlowType.PESSOAS ||
        tx.flowType === CashFlowType.IMPOSTO
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const transfersTotal = visibleTransactions
      .filter(tx => tx.flowType === CashFlowType.TRANSFERENCIA)
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const cashBalance = receiptsTotal - expensesTotal;

    return {
      receiptsTotal,
      expensesTotal,
      transfersTotal,
      cashBalance,
    };
  }, [visibleTransactions]);

  const handleSaveTransaction = async (payload: Partial<CashTransaction>) => {
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, payload);
        toast.success('Transação atualizada com sucesso');
        setEditingTransaction(null);
      } else {
        await createTransaction(payload);
        toast.success('Transação criada com sucesso');
      }
      setIsNewTransactionOpen(false);
      refetch();
    } catch (err) {
      toast.error('Falha ao salvar transação');
    }
  };

  const getFlowTypeLabel = (flowType: CashFlowType) => {
    switch (flowType) {
      case CashFlowType.RECEITA: return 'Receita';
      case CashFlowType.DESPESA: return 'Despesa';
      case CashFlowType.TRANSFERENCIA: return 'Transferência';
      case CashFlowType.IMPOSTO: return 'Imposto';
      case CashFlowType.PESSOAS: return 'Pessoas';
    }
  };

  const getPaymentTypeLabel = (type?: PaymentType) => {
    if (!type) return '-';
    switch (type) {
      case PaymentType.A_VISTA: return 'À vista';
      case PaymentType.PARCELADO: return 'Parcelado';
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

  return (
    <div className="space-y-6">
      {loading && <div>Carregando lançamentos...</div>}
      {!loading && error && <div>Erro ao carregar lançamentos.</div>}
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={previousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-gray-900">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <Button variant="ghost" size="sm" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button className="gap-2" onClick={() => { setEditingTransaction(null); setIsNewTransactionOpen(true); }}>
          <Plus className="w-4 h-4" />
          Nova Transação
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-50 text-green-600 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-gray-600 text-sm">Recebimentos</p>
            </div>
            <p className="text-gray-900">R$ {summary.receiptsTotal.toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-50 text-red-600 p-2 rounded-lg">
                <TrendingDown className="w-5 h-5" />
              </div>
              <p className="text-gray-600 text-sm">Despesas</p>
            </div>
            <p className="text-gray-900">R$ {summary.expensesTotal.toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`${summary.cashBalance >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'} p-2 rounded-lg`}>
                <Wallet className="w-5 h-5" />
              </div>
              <p className="text-gray-600 text-sm">Saldo em Caixa</p>
            </div>
            <p className={`${summary.cashBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              R$ {summary.cashBalance.toLocaleString('pt-BR')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Tabs */}
      <Tabs defaultValue="receita" className="space-y-4">
        <TabsList>
          <TabsTrigger value="receita">Receitas</TabsTrigger>
          <TabsTrigger value="despesa">Despesas</TabsTrigger>
          <TabsTrigger value="pessoas">Pessoas</TabsTrigger>
          <TabsTrigger value="imposto">Impostos</TabsTrigger>
          <TabsTrigger value="transferencia">Transferências</TabsTrigger>
        </TabsList>

        {[CashFlowType.RECEITA, CashFlowType.DESPESA, CashFlowType.PESSOAS, CashFlowType.IMPOSTO, CashFlowType.TRANSFERENCIA].map((flowType) => {
          const filteredTransactions = visibleTransactions.filter(t => t.flowType === flowType);

          return (
            <TabsContent key={flowType} value={flowType.toLowerCase()}>
              <Card>
                {filteredTransactions.length === 0 ? (
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500">
                      Nenhuma transação de {getFlowTypeLabel(flowType)} neste período
                    </p>
                  </CardContent>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-gray-600 text-sm">Data</th>
                          <th className="px-6 py-3 text-left text-gray-600 text-sm">Descrição</th>
                          <th className="px-6 py-3 text-left text-gray-600 text-sm">Parceiro</th>
                          <th className="px-6 py-3 text-left text-gray-600 text-sm">Categoria</th>
                          <th className="px-6 py-3 text-left text-gray-600 text-sm">Tags</th>
                          <th className="px-6 py-3 text-left text-gray-600 text-sm">Valor</th>
                          <th className="px-6 py-3 text-left text-gray-600 text-sm">Tipo</th>
                          <th className="px-6 py-3 text-left text-gray-600 text-sm">Modo</th>
                          <th className="px-6 py-3 text-left text-gray-600 text-sm">Status</th>
                          <th className="px-6 py-3 text-left text-gray-600 text-sm">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredTransactions.map((transaction) => {
                          const category = transaction.categoryId ? categories.find((c) => c.id === transaction.categoryId) : undefined;
                          
                          return (
                            <tr key={transaction.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-gray-600">
                                {new Date(transaction.date).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="px-6 py-4">
                                <div>
                                  <p className="text-gray-900">{transaction.description}</p>
                                  {transaction.billingInvoiceId && (
                                    <p className="text-xs text-gray-500">Invoice: {transaction.billingInvoiceId}</p>
                                  )}
                                  {transaction.mediaPointId && (
                                    <p className="text-xs text-gray-500">Ponto: {transaction.mediaPointId}</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-gray-600">{transaction.partnerName || '-'}</td>
                              <td className="px-6 py-4 text-gray-600">{category?.name || '-'}</td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                  {transaction.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={transaction.flowType === CashFlowType.RECEITA ? 'text-green-600' : 'text-red-600'}>
                                  R$ {transaction.amount.toLocaleString('pt-BR')}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-600">
                                {getPaymentTypeLabel(transaction.paymentType)}
                              </td>
                              <td className="px-6 py-4 text-gray-600">
                                {getPaymentMethodLabel(transaction.paymentMethod)}
                              </td>
                              <td className="px-6 py-4">
                                <Badge className={transaction.isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                  {transaction.isPaid ? 'Pago' : 'Pendente'}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => { setEditingTransaction(transaction); setIsNewTransactionOpen(true); }}
                                >
                                  Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await deleteTransaction(transaction.id);
                                      toast.success('Transação excluída');
                                      refetch();
                                    } catch (err) {
                                      toast.error('Falha ao excluir transação');
                                    }
                                  }}
                                >
                                  Excluir
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-900 mb-2">💡 CashTransaction (Fluxo de Caixa)</p>
        <p className="text-sm text-blue-700">
          Lançamentos financeiros da empresa. Campos: date, description, partnerName, categoryId, tags, amount, flowType, paymentType, paymentMethod, isPaid, billingInvoiceId, mediaPointId.
          flowType: <strong>RECEITA</strong> | <strong>DESPESA</strong> | <strong>TRANSFERENCIA</strong> | <strong>IMPOSTO</strong> | <strong>PESSOAS</strong>
        </p>
      </div>

      {/* Dialog de Nova Transação */}
      <CashTransactionFormDialog
        open={isNewTransactionOpen}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setIsNewTransactionOpen(false);
            setEditingTransaction(null);
          }
        }}
        transaction={editingTransaction}
        onSave={handleSaveTransaction}
      />
    </div>
  );
}