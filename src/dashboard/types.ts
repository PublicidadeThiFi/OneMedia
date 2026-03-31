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
// (Dashboard.tsx e drilldownSpec.tsx).
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


// KPI definitions
export type { DashboardKpiDefinitionKey, DashboardKpiDefinition, DashboardKpiDefinitionsDTO } from './contracts/kpis';

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
  DashboardCommercialProposalsTimeseriesDTO,
  HighValueOpenProposalRow,
  DashboardHighValueOpenProposalsDTO,
} from './contracts/commercial';

// Finance
export type {
  AgingBucket,
  DashboardReceivablesAgingSummaryDTO,
  DashboardFinancialSummaryDTO,
  DashboardReceivablesCompositionDTO,
  CriticalInvoiceRow,
  DashboardCriticalInvoicesDTO,
  LateClientRow,
  DashboardLateClientsDTO,
  LargestOpenReceivableRow,
  DashboardLargestOpenReceivablesDTO,
  LargestExpenseRow,
  DashboardLargestExpensesDTO,
} from './contracts/finance';

// Operations
export type {
  OohOpsPriority,
  OohOpsItem,
  DashboardOohOpsSummaryDTO,
  DoohSummaryRow,
  DashboardDoohSummaryDTO,
  OperationsLateRegionRow,
  DashboardOperationsLateRegionsDTO,
  OperationsCityStatusRow,
  DashboardOperationsCityStatusDTO,
} from './contracts/operations';

// Inventory
export type {
  InventoryMapPin,
  DashboardInventoryMapDTO,
  DashboardInventorySummaryDTO,
  InventoryRankingRow,
  DashboardInventoryRankingDTO,
  InventoryRegionDistributionRow,
  DashboardInventoryRegionDistributionDTO,
  InventoryCategoryDistributionRow,
  DashboardInventoryTypeDistributionDTO,
  DashboardInventorySubtypeDistributionDTO,
  InventoryOpportunitySeverity,
  InventoryOpportunityKind,
  InventoryOpportunityRow,
  DashboardInventoryOpportunitySummaryDTO,
} from './contracts/inventory';

// Clients
export type {
  DashboardClientsSummaryDTO,
  ClientTopCampaignRow,
  DashboardClientsTopCampaignsDTO,
  ClientOpenProposalRow,
  DashboardClientsOpenProposalsDTO,
  ClientInactiveRiskRow,
  DashboardClientsInactiveRiskDTO,
  ClientRegionDistributionRow,
  DashboardClientsRegionDistributionDTO,
} from './contracts/clients';

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

  // ordenacao server-side no backend
  sortBy?: string;
  sortDir?: 'asc' | 'desc';

  // paginacao (drawer)
  cursor?: string;
  nextCursor?: string;
  hasMore: boolean;
  totalCount?: number;
  pageSize?: number;

  // busca local no drawer (nao altera filtros globais)
  search: string;
};
