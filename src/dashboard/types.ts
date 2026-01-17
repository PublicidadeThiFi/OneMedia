import type { Page } from '../App';
import type { DrilldownRow as DrilldownRowContract } from './contracts/drilldown';

// Props do componente (mantemos em types.ts pois depende do roteamento do app).
export interface DashboardProps {
  onNavigate: (page: Page) => void;
}

// ============================================================
// ETAPA 11 - Contratos por modulo
//
// A partir daqui, os DTOs do dashboard ficam separados por dominio em
// `src/dashboard/contracts/*`.
//
// Mantemos este arquivo como "barrel" para nao quebrar imports existentes
// (Dashboard.tsx, mockApi.ts, drilldownSpec.tsx, etc.).
// ============================================================

// Shared
export type {
  DashboardTab,
  DatePreset,
  MediaTypeFilter,
  DashboardFilters,
  DashboardBackendQuery,
  KpiTrend,
  TimeseriesPoint,
  DashboardTimeseriesDTO,
  AlertItem,
  DashboardAlertsDTO,
} from './contracts/shared';

// Executive
export type { OverviewKpis, DashboardOverviewDTO, TopClientRow, DashboardTopClientsDTO } from './contracts/executive';

// Commercial
export type {
  FunnelStage,
  CommercialFunnel,
  DashboardFunnelDTO,
  CommercialSummary,
  DashboardCommercialSummaryDTO,
  StalledProposalRow,
  DashboardStalledProposalsDTO,
  SellerRankingRow,
  DashboardSellerRankingDTO,
} from './contracts/commercial';

// Finance
export type { AgingBucket, DashboardReceivablesAgingSummaryDTO } from './contracts/finance';

// Operations
export type {
  OohOpsItem,
  DashboardOohOpsSummaryDTO,
  ProofOfPlayRow,
  DashboardDoohProofOfPlaySummaryDTO,
} from './contracts/operations';

// Inventory
export type {
  InventoryMapPin,
  DashboardInventoryMapDTO,
  InventoryRankingRow,
  DashboardInventoryRankingDTO,
} from './contracts/inventory';

// Drilldown
export type {
  DrilldownCellValue,
  DrilldownRow,
  DashboardDrilldownDTO,
  DashboardDrilldownQuery,
} from './contracts/drilldown';

// ------------------------------------------------------------
// UI-only state (nao eh contrato com backend)
// ------------------------------------------------------------

export type DrilldownState = {
  open: boolean;
  key?: string;
  params?: Record<string, string>;
  title: string;
  rows: DrilldownRowContract[];
  hint?: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  errorMessage?: string;

  // ordenacao (server-side no backend; mock respeita)
  sortBy?: string;
  sortDir?: 'asc' | 'desc';

  // paginacao (drawer)
  cursor?: string;
  nextCursor?: string;
  hasMore: boolean;

  // busca local no drawer (nao altera filtros globais)
  search: string;
};
