// ============================================================
// Commercial module contracts
// ============================================================

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  amountCents: number;
};

export type StalledProposalRow = {
  id: string;
  title: string;
  client: string;
  daysWithoutUpdate: number;
  amountCents: number;
};

export type CommercialFunnel = {
  stages: FunnelStage[];
  averageDaysToClose: number;
  stalledProposals: StalledProposalRow[];
};

export type DashboardFunnelDTO = CommercialFunnel;

export type CommercialSummary = {
  proposalsTotal: number;
  approvalRatePercent: number;
  averageDaysToClose: number;
  activePipelineAmountCents: number;
  stalledProposalsCount: number;
};

export type DashboardCommercialSummaryDTO = CommercialSummary;

export type DashboardStalledProposalsDTO = {
  rows: StalledProposalRow[];
};

export type SellerRankingRow = {
  id: string;
  name: string;
  city?: string;
  dealsWon: number;
  dealsInPipeline: number;
  amountWonCents: number;
  amountPipelineCents: number;
};

export type DashboardSellerRankingDTO = {
  rows: SellerRankingRow[];
};
