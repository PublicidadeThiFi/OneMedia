// ============================================================
// Operations module contracts
// ============================================================

export type OohOpsPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type OohOpsItem = {
  id: string;
  title: string;
  status: 'OK' | 'PENDING' | 'LATE';
  city?: string;
  client?: string;
  dueDate?: string; // ISO date
  campaignStatus?: string;
  missingCheckinsCount?: number;
  priority?: OohOpsPriority;
  reason?: string;
  awaitingMaterial?: boolean;
  inInstallation?: boolean;
  overdue?: boolean;
};

export type DashboardOohOpsSummaryDTO = {
  items: OohOpsItem[];
  summary?: {
    campaignsActiveCount?: number;
    awaitingMaterialCount: number;
    installationCount: number;
    pendingCheckinsCount: number;
    overdueCheckinsCount: number;
  };
};

export type DoohSummaryRow = {
  id: string;
  screen: string;
  city?: string;
  healthScorePercent: number;
  activeCampaignsCount: number;
  lastActivityAt?: string; // ISO datetime
};

export type DashboardDoohSummaryDTO = {
  rows: DoohSummaryRow[];
  summary?: {
    screenCount: number;
    activeCampaignsCount: number;
    healthScoreAvg: number;
    lowActivityCount: number;
  };
};

export type OperationsLateRegionRow = {
  id: string;
  region: string;
  overdueCount: number;
  overdueInstallationsCount: number;
  overdueCheckinsCount: number;
  pendingCheckinsCount: number;
  awaitingMaterialCount: number;
  totalCriticalCount: number;
};

export type DashboardOperationsLateRegionsDTO = {
  rows: OperationsLateRegionRow[];
};

export type OperationsCityStatusRow = {
  id: string;
  city: string;
  totalCampaignsCount: number;
  awaitingMaterialCount: number;
  installationCount: number;
  pendingCheckinsCount: number;
  overdueCheckinsCount: number;
  okCount: number;
};

export type DashboardOperationsCityStatusDTO = {
  rows: OperationsCityStatusRow[];
};

