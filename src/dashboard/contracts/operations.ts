// ============================================================
// Operations module contracts
// ============================================================

export type OohOpsItem = {
  id: string;
  title: string;
  status: 'OK' | 'PENDING' | 'LATE';
  city?: string;
  dueDate?: string; // ISO date
};

export type DashboardOohOpsSummaryDTO = {
  items: OohOpsItem[];
  summary?: {
    awaitingMaterialCount: number;
    installationCount: number;
    pendingCheckinsCount: number;
    overdueCheckinsCount: number;
  };
};

export type ProofOfPlayRow = {
  id: string;
  screen: string;
  city?: string;
  uptimePercent: number;
  plays: number;
  lastSeen?: string; // ISO datetime
};

export type DashboardDoohProofOfPlaySummaryDTO = {
  rows: ProofOfPlayRow[];
  summary?: {
    screenCount: number;
    activeCampaignsCount: number;
    healthScoreAvg: number;
    offlineCount: number;
  };
};
