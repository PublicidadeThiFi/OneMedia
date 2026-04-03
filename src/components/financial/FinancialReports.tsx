import { useMemo, useState } from 'react';
import { CalendarRange, Download, FileSpreadsheet, FileText, Mail, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../lib/apiClient';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { BillingStatus, CashFlowType } from '../../types';
import { useFinancialReports } from '../../hooks/useFinancialReports';

type PeriodMode = 'monthly' | 'bimonthly' | 'custom';

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function toDateOnly(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseMonthValue(monthValue: string) {
  const [year, month] = monthValue.split('-').map((value) => parseInt(value, 10));
  return { year, month };
}

function monthRange(monthValue: string) {
  const { year, month } = parseMonthValue(monthValue);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { dateFrom: toDateOnly(start), dateTo: toDateOnly(end) };
}

function bimonthRange(monthValue: string) {
  const { year, month } = parseMonthValue(monthValue);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month + 1, 0);
  return { dateFrom: toDateOnly(start), dateTo: toDateOnly(end) };
}

function diffInDaysInclusive(dateFrom: string, dateTo: string) {
  const start = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBr(value?: string | Date | null) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}

function formatDateRange(dateFrom: string, dateTo: string) {
  return `${formatDateBr(dateFrom)} → ${formatDateBr(dateTo)}`;
}


function formatDateTimeBr(value?: string | Date | null) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR');
}

function periodModeLabel(mode: PeriodMode) {
  if (mode === 'monthly') return 'Visualização mensal';
  if (mode === 'bimonthly') return 'Visualização de 2 meses';
  return 'Visualização personalizada';
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map((value) => parseInt(value, 10));
  const date = new Date(year, monthNumber - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

const billingStatusLabels: Record<string, string> = {
  [BillingStatus.ABERTA]: 'Abertas',
  [BillingStatus.VENCIDA]: 'Vencidas',
  [BillingStatus.PAGA]: 'Pagas',
  [BillingStatus.CANCELADA]: 'Canceladas',
};

const cashFlowLabels: Record<string, string> = {
  [CashFlowType.RECEITA]: 'Receitas',
  [CashFlowType.DESPESA]: 'Despesas',
  [CashFlowType.TRANSFERENCIA]: 'Transferências',
  [CashFlowType.IMPOSTO]: 'Impostos',
  [CashFlowType.PESSOAS]: 'Pessoas',
};

function parseFilename(contentDisposition?: string): string | null {
  if (!contentDisposition) return null;
  const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  const raw = (match?.[1] || match?.[2])?.trim();
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function FinancialReports() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [month, setMonth] = useState(currentMonth);
  const [customDateFrom, setCustomDateFrom] = useState(() => monthRange(currentMonth).dateFrom);
  const [customDateTo, setCustomDateTo] = useState(() => monthRange(currentMonth).dateTo);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState('');
  const [sendPdfByEmail, setSendPdfByEmail] = useState(true);
  const [sendExcelByEmail, setSendExcelByEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const computedPeriod = useMemo(() => {
    if (periodMode === 'custom') {
      return {
        dateFrom: customDateFrom,
        dateTo: customDateTo,
      };
    }

    if (periodMode === 'bimonthly') {
      return bimonthRange(month);
    }

    return monthRange(month);
  }, [customDateFrom, customDateTo, month, periodMode]);

  const validationMessage = useMemo(() => {
    if (!computedPeriod.dateFrom || !computedPeriod.dateTo) {
      return 'Preencha a data inicial e a data final do período.';
    }
    if (computedPeriod.dateFrom > computedPeriod.dateTo) {
      return 'A data inicial deve ser anterior ou igual à data final.';
    }
    if (diffInDaysInclusive(computedPeriod.dateFrom, computedPeriod.dateTo) > 366) {
      return 'O período máximo permitido para o relatório é de 1 ano.';
    }
    return null;
  }, [computedPeriod.dateFrom, computedPeriod.dateTo]);

  const { report, loading, error, refetch } = useFinancialReports({
    dateFrom: computedPeriod.dateFrom,
    dateTo: computedPeriod.dateTo,
    enabled: !validationMessage,
  });

  const hasReportData = Boolean(
    report && (report.details.invoices.length > 0 || report.details.transactions.length > 0),
  );

  const handleDownloadPdf = async () => {
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      setDownloadingPdf(true);
      const response = await apiClient.get<Blob>('/financial-reports', {
        params: {
          dateFrom: computedPeriod.dateFrom,
          dateTo: computedPeriod.dateTo,
          format: 'pdf',
        },
        responseType: 'blob',
      });

      const contentType = response.headers['content-type'] || 'application/pdf';
      const filename =
        parseFilename(response.headers['content-disposition']) ||
        `relatorio-financeiro-${computedPeriod.dateFrom}-${computedPeriod.dateTo}.pdf`;

      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF do relatório baixado com sucesso.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Falha ao baixar o PDF do relatório.');
    } finally {
      setDownloadingPdf(false);
    }
  };




  const handleSendEmail = async () => {
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const recipients = emailRecipients
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const formats = [
      sendPdfByEmail ? 'pdf' : null,
      sendExcelByEmail ? 'excel' : null,
    ].filter(Boolean) as Array<'pdf' | 'excel'>;

    if (!recipients.length) {
      toast.error('Informe pelo menos um e-mail para envio.');
      return;
    }

    if (!formats.length) {
      toast.error('Selecione pelo menos um formato para enviar por e-mail.');
      return;
    }

    try {
      setSendingEmail(true);
      await apiClient.post('/financial-reports/send', {
        dateFrom: computedPeriod.dateFrom,
        dateTo: computedPeriod.dateTo,
        recipients,
        formats,
      });
      toast.success('Relatório enviado por e-mail com sucesso.');
      setEmailDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Falha ao enviar o relatório por e-mail.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      setDownloadingExcel(true);
      const response = await apiClient.get<Blob>('/financial-reports', {
        params: {
          dateFrom: computedPeriod.dateFrom,
          dateTo: computedPeriod.dateTo,
          format: 'excel',
        },
        responseType: 'blob',
      });

      const contentType = response.headers['content-type'] || 'application/vnd.ms-excel';
      const filename =
        parseFilename(response.headers['content-disposition']) ||
        `relatorio-financeiro-${computedPeriod.dateFrom}-${computedPeriod.dateTo}.xls`;

      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Relatório em Excel baixado com sucesso.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Falha ao baixar o relatório em Excel.');
    } finally {
      setDownloadingExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-gray-900 text-lg">Relatórios</h2>
          <p className="text-gray-600 text-sm">
            Consulte o consolidado financeiro por mês, 2 meses ou intervalo customizado de até 1 ano.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <div className="min-w-[180px]">
            <p className="mb-1 text-xs font-medium text-gray-600">Período</p>
            <Select value={periodMode} onValueChange={(value) => setPeriodMode(value as PeriodMode)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mês selecionado</SelectItem>
                <SelectItem value="bimonthly">2 meses</SelectItem>
                <SelectItem value="custom">Intervalo personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodMode === 'custom' ? (
            <>
              <div>
                <p className="mb-1 text-xs font-medium text-gray-600">Data inicial</p>
                <Input type="date" value={customDateFrom} onChange={(e) => setCustomDateFrom(e.target.value)} className="w-[180px]" />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-gray-600">Data final</p>
                <Input type="date" value={customDateTo} onChange={(e) => setCustomDateTo(e.target.value)} className="w-[180px]" />
              </div>
            </>
          ) : (
            <div>
              <p className="mb-1 text-xs font-medium text-gray-600">
                {periodMode === 'bimonthly' ? 'Mês inicial' : 'Mês'}
              </p>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-[180px]" />
            </div>
          )}

          <Button variant="outline" onClick={() => refetch()} disabled={!!validationMessage || loading}>
            Atualizar
          </Button>
          <Button
            variant="outline"
            onClick={() => setEmailDialogOpen(true)}
            disabled={!!validationMessage || loading}
          >
            <Mail className="mr-2 h-4 w-4" />
            Enviar por e-mail
          </Button>
          <Button variant="outline" onClick={handleDownloadExcel} disabled={!!validationMessage || loading || downloadingExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {downloadingExcel ? 'Baixando Excel...' : 'Baixar Excel'}
          </Button>
          <Button onClick={handleDownloadPdf} disabled={!!validationMessage || loading || downloadingPdf}>
            <Download className="mr-2 h-4 w-4" />
            {downloadingPdf ? 'Baixando PDF...' : 'Baixar PDF'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1">
          <CalendarRange className="h-3.5 w-3.5" />
          {formatDateRange(computedPeriod.dateFrom, computedPeriod.dateTo)}
        </Badge>
        <Badge variant="outline">{periodModeLabel(periodMode)}</Badge>
        {!validationMessage && report?.period ? (
          <>
            <Badge variant="outline">{report.period.totalDays} dias</Badge>
            <Badge variant="outline">{report.period.totalMonths} mês(es)</Badge>
          </>
        ) : null}
      </div>

      {validationMessage ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{validationMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">Gerando prévia do relatório...</p>
              <p className="text-sm text-gray-600">Estamos consolidando cobranças, fluxo de caixa e indicadores do período selecionado.</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar relatório por e-mail</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="financial-report-email">Destinatários</Label>
              <Input
                id="financial-report-email"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                placeholder="financeiro@empresa.com, diretoria@empresa.com"
              />
              <p className="text-xs text-muted-foreground">
                Você pode informar um ou mais e-mails, separados por vírgula.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Formatos enviados</Label>
              <div className="space-y-2 rounded-lg border p-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={sendPdfByEmail} onCheckedChange={(value) => setSendPdfByEmail(value === true)} />
                  <span>PDF</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={sendExcelByEmail} onCheckedChange={(value) => setSendExcelByEmail(value === true)} />
                  <span>Excel</span>
                </label>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <p><strong>Período:</strong> {formatDateRange(computedPeriod.dateFrom, computedPeriod.dateTo)}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)} disabled={sendingEmail}>
              Cancelar
            </Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail}>
              <Mail className="mr-2 h-4 w-4" />
              {sendingEmail ? 'Enviando...' : 'Enviar relatório'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {!loading && error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-700">Não foi possível carregar o relatório.</p>
              <p className="text-sm text-gray-600">Revise o período escolhido e tente atualizar novamente.</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!loading && !error && report && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div>
                    <h3 className="text-gray-900">Resumo executivo do período</h3>
                    <p className="text-sm text-gray-600">Use a prévia abaixo para conferir os tópicos principais antes de baixar ou enviar o relatório.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                    <Badge variant="secondary">Gerado em {formatDateTimeBr(report.generatedAt)}</Badge>
                    <Badge variant="secondary">{hasReportData ? 'Com dados para exportação' : 'Sem movimentações no período'}</Badge>
                  </div>
                </div>

                <div className="grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                  <div className="rounded-lg border bg-gray-50 px-4 py-3">
                    <p className="font-medium text-gray-900">Cobranças listadas</p>
                    <p>{report.details.invoices.length} registro(s)</p>
                  </div>
                  <div className="rounded-lg border bg-gray-50 px-4 py-3">
                    <p className="font-medium text-gray-900">Lançamentos listados</p>
                    <p>{report.details.transactions.length} registro(s)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {!hasReportData ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">Nenhuma movimentação encontrada no período.</p>
                  <p className="text-sm text-gray-600">Você ainda pode baixar ou enviar o relatório, mas ele será gerado com as seções vazias para esse intervalo.</p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="mb-2 flex items-center gap-3">
                  <div className="rounded-lg bg-green-50 p-2 text-green-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-gray-600">Receita no Caixa</p>
                </div>
                <p className="text-gray-900">{formatMoney(report.summary.receiptsInCash)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-2 flex items-center gap-3">
                  <div className="rounded-lg bg-red-50 p-2 text-red-600">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-gray-600">Despesas no Caixa</p>
                </div>
                <p className="text-gray-900">{formatMoney(report.summary.expensesInCash)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-2 flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-gray-600">Saldo Líquido</p>
                </div>
                <p className="text-gray-900">{formatMoney(report.summary.netCash)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-2 flex items-center gap-3">
                  <div className="rounded-lg bg-yellow-50 p-2 text-yellow-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-gray-600">Cobranças do Período</p>
                </div>
                <p className="text-gray-900">{formatMoney(report.summary.invoicesTotal)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-900">Resumo de Cobranças</h3>
                    <p className="text-sm text-gray-600">Valores consolidados por status no período.</p>
                  </div>
                  <Badge variant="outline">{report.summary.invoicesCount} cobrança(s)</Badge>
                </div>

                <div className="space-y-3 text-sm">
                  {report.sections.billingByStatus.some((item) => item.count > 0 || item.totalAmount > 0) ? report.sections.billingByStatus.map((item) => (
                    <div key={item.status} className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-gray-900">{billingStatusLabels[item.status] ?? item.status}</p>
                        <p className="text-xs text-gray-500">{item.count} ocorrência(s)</p>
                      </div>
                      <span className="text-gray-900">{formatMoney(item.totalAmount)}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500">Nenhuma cobrança encontrada para o período selecionado.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-900">Resumo de Fluxo de Caixa</h3>
                    <p className="text-sm text-gray-600">Entradas e saídas separadas por tipo.</p>
                  </div>
                  <Badge variant="outline">{report.details.transactions.length} lançamento(s)</Badge>
                </div>

                <div className="space-y-3 text-sm">
                  {report.sections.cashByFlowType.some((item) => item.count > 0 || item.totalAmount > 0) ? report.sections.cashByFlowType.map((item) => (
                    <div key={item.flowType} className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-gray-900">{cashFlowLabels[item.flowType] ?? item.flowType}</p>
                        <p className="text-xs text-gray-500">{item.count} ocorrência(s)</p>
                      </div>
                      <span className="text-gray-900">{formatMoney(item.totalAmount)}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500">Nenhum lançamento de fluxo de caixa encontrado para o período selecionado.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-900">Top Clientes</h3>
                    <p className="text-sm text-gray-600">Clientes com maior volume de cobrança no período.</p>
                  </div>
                  <Badge variant="outline">Top 5</Badge>
                </div>

                {report.sections.topClients.length === 0 ? (
                  <p className="text-sm text-gray-600">Nenhuma cobrança encontrada no período.</p>
                ) : (
                  <div className="space-y-3">
                    {report.sections.topClients.map((client) => (
                      <div key={client.clientName} className="flex items-center justify-between gap-4 text-sm">
                        <div>
                          <p className="text-gray-900">{client.clientName}</p>
                          <p className="text-xs text-gray-500">{client.count} cobrança(s)</p>
                        </div>
                        <span className="text-gray-900">{formatMoney(client.totalAmount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-900">Evolução Mensal</h3>
                    <p className="text-sm text-gray-600">Comparativo de cobranças e caixa por mês.</p>
                  </div>
                  <Badge variant="outline">{report.sections.monthly.length} mês(es)</Badge>
                </div>

                <div className="space-y-3">
                  {report.sections.monthly.map((item) => (
                    <div key={item.month} className="rounded-lg border border-gray-100 p-3">
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <p className="text-sm font-medium text-gray-900">{item.label || monthLabel(item.month)}</p>
                        <Badge variant="outline">{item.invoiceCount} cobrança(s)</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 md:grid-cols-4">
                        <div>
                          <p>Cobranças</p>
                          <p className="text-sm text-gray-900">{formatMoney(item.invoiceTotal)}</p>
                        </div>
                        <div>
                          <p>Receitas</p>
                          <p className="text-sm text-gray-900">{formatMoney(item.receipts)}</p>
                        </div>
                        <div>
                          <p>Despesas</p>
                          <p className="text-sm text-gray-900">{formatMoney(item.expenses)}</p>
                        </div>
                        <div>
                          <p>Saldo</p>
                          <p className="text-sm text-gray-900">{formatMoney(item.netCash)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="mb-4">
                <h3 className="text-gray-900">Detalhamento de Cobranças</h3>
                <p className="text-sm text-gray-600">Lista das cobranças consideradas no relatório do período.</p>
              </div>

              {report.details.invoices.length === 0 ? (
                <p className="text-sm text-gray-600">Nenhuma cobrança encontrada no período.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.details.invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="max-w-[280px] truncate">
                          {invoice.clientName || invoice.client?.companyName || invoice.client?.contactName || 'Cliente não informado'}
                        </TableCell>
                        <TableCell>{formatDateBr(invoice.dueDate)}</TableCell>
                        <TableCell>{billingStatusLabels[invoice.status] ?? invoice.status}</TableCell>
                        <TableCell className="text-right">{formatMoney(invoice.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="mb-4">
                <h3 className="text-gray-900">Detalhamento do Fluxo de Caixa</h3>
                <p className="text-sm text-gray-600">Lançamentos financeiros dentro do período selecionado.</p>
              </div>

              {report.details.transactions.length === 0 ? (
                <p className="text-sm text-gray-600">Nenhum lançamento encontrado no período.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Parceiro</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.details.transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{formatDateBr(transaction.date)}</TableCell>
                        <TableCell>{cashFlowLabels[transaction.flowType] ?? transaction.flowType}</TableCell>
                        <TableCell>{transaction.categoryName || '—'}</TableCell>
                        <TableCell>{transaction.partnerName || '—'}</TableCell>
                        <TableCell className="text-right">{formatMoney(transaction.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
