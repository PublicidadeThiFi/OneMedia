
// ============================================================
// Clients module contracts
// ============================================================

export type DashboardClientsSummaryDTO = {
  activeClientsCount: number;
  newClientsCount: number;
  revenuePerClientCents: number;
  overduePerClientCents: number;
  averageTicketPerClientCents: number;
  clientsWithoutRecentActivityCount: number;
};

export type ClientTopCampaignRow = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  campaignsCount: number;
  activeCampaignsCount: number;
  revenueCents: number;
};

export type DashboardClientsTopCampaignsDTO = {
  rows: ClientTopCampaignRow[];
};

export type ClientOpenProposalRow = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  proposalsOpenCount: number;
  proposalsOpenAmountCents: number;
  hasActiveCampaign: boolean;
};

export type DashboardClientsOpenProposalsDTO = {
  rows: ClientOpenProposalRow[];
};

export type ClientInactiveRiskRow = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  daysWithoutActivity: number;
  hasActiveCampaign: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  overdueAmountCents: number;
  openProposalsCount: number;
};

export type DashboardClientsInactiveRiskDTO = {
  rows: ClientInactiveRiskRow[];
};

export type ClientRegionDistributionRow = {
  id: string;
  label: string;
  city?: string;
  state?: string;
  clientsCount: number;
  activeClientsCount: number;
  openProposalsCount: number;
  revenueCents: number;
};

export type DashboardClientsRegionDistributionDTO = {
  rows: ClientRegionDistributionRow[];
};
