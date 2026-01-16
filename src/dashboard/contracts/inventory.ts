// ============================================================
// Inventory module contracts
// ============================================================

export type InventoryMapPin = {
  id: string;
  label: string;
  city?: string;
  occupancyPercent: number;
  lat?: number;
  lng?: number;
};

export type DashboardInventoryMapDTO = {
  pins: InventoryMapPin[];
};

export type InventoryRankingRow = {
  id: string;
  label: string;
  city?: string;
  occupancyPercent: number;
  activeCampaigns: number;
  revenueCents: number;
};

export type DashboardInventoryRankingDTO = {
  rows: InventoryRankingRow[];
};
