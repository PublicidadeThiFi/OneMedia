// ============================================================
// Finance module contracts
// ============================================================

export type AgingBucket = {
  label: string;
  amountCents: number;
};

export type DashboardReceivablesAgingSummaryDTO = {
  totalCents: number;
  buckets: AgingBucket[];
};

export type DashboardFinancialSummaryDTO = {
  revenueRecognizedCents: number;
  receivablesOpenCents: number;
  receivablesOverdueCents: number;
  netCashflowCents: number;
  averageBilledTicketCents: number;
  topClient: {
    id: string;
    name: string;
    city?: string;
    amountCents: number;
  } | null;
};

export type DashboardReceivablesCompositionDTO = {
  receivedCents: number;
  openCents: number;
  overdueCents: number;
  totalCents: number;
};

export type CriticalInvoiceRow = {
  id: string;
  title: string;
  client: string;
  city?: string;
  dueDate: string;
  amountCents: number;
  daysLate: number;
  status: string;
};

export type DashboardCriticalInvoicesDTO = {
  rows: CriticalInvoiceRow[];
};

export type LateClientRow = {
  id: string;
  name: string;
  city?: string;
  overdueInvoicesCount: number;
  overdueAmountCents: number;
  maxDaysLate: number;
};

export type DashboardLateClientsDTO = {
  rows: LateClientRow[];
};

export type LargestOpenReceivableRow = {
  id: string;
  title: string;
  client: string;
  city?: string;
  dueDate: string;
  amountCents: number;
  daysLate: number;
  status: string;
};

export type DashboardLargestOpenReceivablesDTO = {
  rows: LargestOpenReceivableRow[];
};

export type LargestExpenseRow = {
  id: string;
  description: string;
  partnerName?: string;
  categoryName?: string;
  date: string;
  amountCents: number;
  flowType?: string;
};

export type DashboardLargestExpensesDTO = {
  rows: LargestExpenseRow[];
};
