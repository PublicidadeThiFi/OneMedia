import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';

type BillingByStatusItem = {
  status: string;
  count: number;
  totalAmount: number;
};

type CashByFlowTypeItem = {
  flowType: string;
  count: number;
  totalAmount: number;
};

type TopClientItem = {
  clientName: string;
  totalAmount: number;
  count: number;
};

type MonthlyReportItem = {
  month: string;
  label: string;
  invoiceTotal: number;
  invoiceCount: number;
  receipts: number;
  expenses: number;
  transfers: number;
  netCash: number;
  transactionCount: number;
};

type ReportInvoiceItem = {
  id: string;
  dueDate: string;
  amount: number;
  status: string;
  clientName?: string | null;
  client?: { companyName?: string | null; contactName?: string | null } | null;
};

type ReportTransactionItem = {
  id: string;
  date: string;
  amount: number;
  flowType: string;
  categoryName?: string | null;
  partnerName?: string | null;
};

export type FinancialReportResponse = {
  generatedAt: string;
  period: {
    dateFrom: string;
    dateTo: string;
    totalDays: number;
    totalMonths: number;
    maxPeriodDays: number;
  };
  summary: {
    invoicesTotal: number;
    invoicesCount: number;
    receiptsInCash: number;
    expensesInCash: number;
    transfersInCash: number;
    netCash: number;
    openInvoicesTotal: number;
    overdueInvoicesTotal: number;
    paidInvoicesTotal: number;
    cancelledInvoicesTotal: number;
  };
  sections: {
    billingByStatus: BillingByStatusItem[];
    cashByFlowType: CashByFlowTypeItem[];
    topClients: TopClientItem[];
    monthly: MonthlyReportItem[];
  };
  details: {
    invoices: ReportInvoiceItem[];
    transactions: ReportTransactionItem[];
  };
};

interface UseFinancialReportsParams {
  dateFrom: string;
  dateTo: string;
  enabled?: boolean;
}

export function useFinancialReports(params: UseFinancialReportsParams) {
  const { dateFrom, dateTo, enabled = true } = params;
  const [report, setReport] = useState<FinancialReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchReport = async () => {
    if (!enabled || !dateFrom || !dateTo) {
      setReport(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<FinancialReportResponse>('/financial-reports', {
        params: { dateFrom, dateTo },
      });
      setReport(response.data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, enabled]);

  return {
    report,
    loading,
    error,
    refetch: fetchReport,
  };
}
