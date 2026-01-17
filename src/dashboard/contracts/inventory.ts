// ============================================================
// Inventory module contracts
// ============================================================

export type InventoryMapPin = {
  id: string;
  label: string;
  city?: string;
  occupancyPercent: number;

  // Coordenadas geograficas (quando existir). No mock usamos lat/lng proximos.
  lat?: number;
  lng?: number;

  // Metadados opcionais para agregacoes/heatmap.
  // No backend, isso pode vir de classificacoes como "regiao" e "linha".
  region?: string;
  line?: string;
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
