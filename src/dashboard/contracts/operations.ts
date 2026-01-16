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
};
