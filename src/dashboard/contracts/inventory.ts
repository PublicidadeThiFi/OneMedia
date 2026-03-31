// ============================================================
// Inventory module contracts
// ============================================================

export type InventoryMapPin = {
  id: string;
  label: string;
  city?: string;
  state?: string;
  occupancyPercent: number;

  // Coordenadas geográficas reais quando existirem. Em fallback/mock, mantemos
  // um espalhamento leve para não colapsar todos os pontos no mesmo local.
  lat?: number;
  lng?: number;

  region?: string;
  line?: string;
  type?: string;
  subcategory?: string;
  environment?: string;
  unitsCount?: number;
  availableUnitsCount?: number;
  activeCampaigns?: number;
  revenueCents?: number;
};

export type DashboardInventoryMapDTO = {
  pins: InventoryMapPin[];
};

export type DashboardInventorySummaryDTO = {
  totalPoints: number;
  totalUnits: number;
  occupancyPercent: number;
  activeCitiesCount: number;
  pointsWithAvailabilityCount: number;
  activeCampaignsCount: number;
};

export type InventoryRankingRow = {
  id: string;
  label: string;
  city?: string;
  state?: string;
  occupancyPercent: number;
  activeCampaigns: number;
  revenueCents: number;
  type?: string;
  subcategory?: string;
  environment?: string;
  unitsCount?: number;
  availableUnitsCount?: number;
};

export type DashboardInventoryRankingDTO = {
  rows: InventoryRankingRow[];
};

export type InventoryRegionDistributionRow = {
  id: string;
  label: string;
  city?: string;
  state?: string;
  pointsCount: number;
  unitsCount: number;
  occupancyPercent: number;
  availablePointsCount: number;
  activeCampaigns: number;
  revenueCents: number;
};

export type DashboardInventoryRegionDistributionDTO = {
  rows: InventoryRegionDistributionRow[];
};

export type InventoryCategoryDistributionRow = {
  id: string;
  label: string;
  type?: string;
  subcategory?: string;
  environment?: string;
  pointsCount: number;
  unitsCount: number;
  occupancyPercent: number;
  activeCampaigns: number;
  revenueCents: number;
};

export type DashboardInventoryTypeDistributionDTO = {
  rows: InventoryCategoryDistributionRow[];
};

export type DashboardInventorySubtypeDistributionDTO = {
  rows: InventoryCategoryDistributionRow[];
};

export type InventoryOpportunitySeverity = 'HIGH' | 'MEDIUM' | 'LOW';
export type InventoryOpportunityKind = 'LOW_OCCUPANCY_REGION' | 'PREMIUM_LOW_SALES' | 'HIGH_CAMPAIGN_CONCENTRATION';

export type InventoryOpportunityRow = {
  id: string;
  kind: InventoryOpportunityKind;
  severity: InventoryOpportunitySeverity;
  title: string;
  subtitle?: string;
  occupancyPercent?: number;
  activeCampaigns?: number;
  revenueCents?: number;
  region?: string;
  pointId?: string;
  pointLabel?: string;
};

export type DashboardInventoryOpportunitySummaryDTO = {
  rows: InventoryOpportunityRow[];
};
