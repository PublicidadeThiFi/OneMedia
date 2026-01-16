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
