import type { KpiTrend } from './shared';

// ============================================================
// Executive module contracts
// ============================================================

export type OverviewKpis = {
  inventoryTotalPoints: number;
  proposalsTotal: number;
  approvalRatePercent: number;
  campaignsActiveCount: number;
  campaignsActiveAmountCents: number;
  clientsActiveCount: number;
  averageTicketCents: number;

  revenueRecognizedCents: number;
  revenueToInvoiceCents: number;
  receivablesOverdueCents: number;
  occupancyPercent: number;

  trends: {
    revenue: KpiTrend;
    occupancy: KpiTrend;
    proposals: KpiTrend;
  };
};

export type DashboardOverviewDTO = OverviewKpis;

export type TopClientRow = {
  id: string;
  name: string;
  city?: string;
  amountCents: number;
  campaignsCount: number;
  averageTicketCents?: number;
};

export type DashboardTopClientsDTO = {
  rows: TopClientRow[];
};
