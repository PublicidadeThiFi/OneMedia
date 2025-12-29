import { useMemo, useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { FileText, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { BillingStatus, CashFlowType, BillingInvoice, CashTransaction } from '../../types';
import { useBillingInvoices } from '../../hooks/useBillingInvoices';
import { useCashTransactions } from '../../hooks/useCashTransactions';
import { toNumber } from '../../lib/number';

function monthRange(monthValue: string) {
  // monthValue: YYYY-MM
  const [y, m] = monthValue.split('-').map((v) => parseInt(v, 10));
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  return { dateFrom: toIso(start), dateTo: toIso(end) };
}

export function FinancialReports() {
  const now = new Date();
  const [month, setMonth] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const { dateFrom, dateTo } = useMemo(() => monthRange(month), [month]);

  const { invoices, loading: invoicesLoading, error: invoicesError } = useBillingInvoices({
    dueDateFrom: dateFrom,
    dueDateTo: dateTo,
  });
  const { transactions, loading: txLoading, error: txError } = useCashTransactions({ dateFrom, dateTo });

  const invoiceSummary = useMemo(() => {
    const sumByStatus = (status: BillingStatus) =>
      invoices
        .filter((i: BillingInvoice) => i.status === status)
        .reduce((sum, i: BillingInvoice) => sum + toNumber(i.amount, 0), 0);

    const total = invoices.reduce((sum, i) => sum + toNumber(i.amount, 0), 0);

    return {
      total,
      abertas: sumByStatus(BillingStatus.ABERTA),
      vencidas: sumByStatus(BillingStatus.VENCIDA),
      pagas: sumByStatus(BillingStatus.PAGA),
      canceladas: sumByStatus(BillingStatus.CANCELADA),
    };
  }, [invoices]);

  const cashSummary = useMemo(() => {
    const sum = (types: CashFlowType[]) =>
      transactions
        .filter((t: CashTransaction) => types.includes(t.flowType))
        .reduce((acc, t: CashTransaction) => acc + toNumber(t.amount, 0), 0);

    const receipts = sum([CashFlowType.RECEITA]);
    const expenses = sum([CashFlowType.DESPESA, CashFlowType.IMPOSTO, CashFlowType.PESSOAS]);
    const transfers = sum([CashFlowType.TRANSFERENCIA]);
    return {
      receipts,
      expenses,
      transfers,
      net: receipts - expenses,
    };
  }, [transactions]);

  const topClients = useMemo(() => {
    const byClient = new Map<string, number>();
    for (const inv of invoices) {
      const name = inv.clientName || inv.client?.companyName || 'Cliente não informado';
      byClient.set(name, (byClient.get(name) || 0) + toNumber(inv.amount, 0));
    }
    return Array.from(byClient.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [invoices]);

  const formatMoney = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const anyLoading = invoicesLoading || txLoading;
  const anyError = invoicesError || txError;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-gray-900 text-lg">Relatórios</h2>
          <p className="text-gray-600 text-sm">Resumo por mês (cobranças por vencimento + fluxo de caixa por data).</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Mês:</span>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-[180px]" />
        </div>
      </div>

      {anyLoading && <div>Carregando relatório...</div>}
      {!anyLoading && anyError && <div className="text-red-600">Erro ao carregar relatório.</div>}

      {!anyLoading && !anyError && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-green-50 text-green-600 p-2 rounded-lg">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <p className="text-gray-600 text-sm">Receita no Caixa</p>
                </div>
                <p className="text-gray-900">{formatMoney(cashSummary.receipts)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-red-50 text-red-600 p-2 rounded-lg">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <p className="text-gray-600 text-sm">Despesas no Caixa</p>
                </div>
                <p className="text-gray-900">{formatMoney(cashSummary.expenses)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <p className="text-gray-600 text-sm">Saldo Líquido</p>
                </div>
                <p className="text-gray-900">{formatMoney(cashSummary.net)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-yellow-50 text-yellow-600 p-2 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <p className="text-gray-600 text-sm">Cobranças do Mês</p>
                </div>
                <p className="text-gray-900">{formatMoney(invoiceSummary.total)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-900">Cobranças por Status</h3>
                  <Badge variant="outline">{dateFrom} → {dateTo}</Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Abertas</span>
                    <span className="text-gray-900">{formatMoney(invoiceSummary.abertas)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Vencidas</span>
                    <span className="text-gray-900">{formatMoney(invoiceSummary.vencidas)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Pagas</span>
                    <span className="text-gray-900">{formatMoney(invoiceSummary.pagas)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Canceladas</span>
                    <span className="text-gray-900">{formatMoney(invoiceSummary.canceladas)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-900">Top Clientes (por Cobrança)</h3>
                  <Badge variant="outline">Top 5</Badge>
                </div>
                {topClients.length === 0 ? (
                  <p className="text-sm text-gray-600">Nenhuma cobrança no período.</p>
                ) : (
                  <div className="space-y-2">
                    {topClients.map(([name, value]) => (
                      <div key={name} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 truncate pr-3">{name}</span>
                        <span className="text-gray-900 whitespace-nowrap">{formatMoney(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
