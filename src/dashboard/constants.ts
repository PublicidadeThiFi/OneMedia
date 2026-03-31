import type { DashboardDataMode } from '../hooks/useDashboardQuery';

// Etapa 3: por padrão já priorizamos backend para os widgets que têm integração real.
// Para forçar mock globalmente, defina VITE_DASHBOARD_DATA_MODE=mock.
const rawDashboardDataMode = String(((import.meta as any)?.env?.VITE_DASHBOARD_DATA_MODE as string) || '').toLowerCase();

export const DASHBOARD_DATA_MODE: DashboardDataMode = rawDashboardDataMode === 'mock' ? 'mock' : 'backend';

// Drilldown (drawer): paginação padrão
export const DRILLDOWN_PAGE_SIZE = 20;

// Sugestão de rotas (placeholders). Ajustar para as rotas reais do seu backend quando integrar.
export const DASHBOARD_BACKEND_ROUTES = {
  overview: '/api/dashboard/overview',
  funnel: '/api/dashboard/funnel',
  alerts: '/api/dashboard/alerts',
  drilldown: '/api/dashboard/drilldown',
  meta: '/api/dashboard/meta',
  kpiDefinitions: '/api/dashboard/kpis/definitions',

  // Comercial
  commercialSummary: '/api/dashboard/commercial/summary',
  stalledProposals: '/api/dashboard/proposals/stalled',
  sellerRanking: '/api/dashboard/commercial/sellers/ranking',
  commercialProposalsTimeseries: '/api/dashboard/commercial/proposals/timeseries',
  commercialHighValueOpen: '/api/dashboard/commercial/high-value-open',

  // Extras (quando formos evoluir os widgets):
  revenueTimeseries: '/api/dashboard/revenue/timeseries',
  cashflowTimeseries: '/api/dashboard/cashflow/timeseries',
  topClients: '/api/dashboard/top/clients',
  receivablesAgingSummary: '/api/dashboard/receivables/aging/summary',
  financialSummary: '/api/dashboard/finance/summary',
  receivablesComposition: '/api/dashboard/finance/receivables/composition',
  criticalInvoices: '/api/dashboard/finance/critical-invoices',
  lateClients: '/api/dashboard/finance/late-clients',
  largestOpenReceivables: '/api/dashboard/finance/largest-open-receivables',
  largestExpenses: '/api/dashboard/finance/largest-expenses',
  clientsSummary: '/api/dashboard/clients/summary',
  clientsTopCampaigns: '/api/dashboard/clients/top-campaigns',
  clientsOpenProposals: '/api/dashboard/clients/open-proposals',
  clientsInactiveRisk: '/api/dashboard/clients/inactive-risk',
  clientsRegionDistribution: '/api/dashboard/clients/regions',
  oohOpsSummary: '/api/dashboard/ooh/ops/summary',
  operationsLateRegions: '/api/dashboard/operations/regions/late',
  operationsCityStatus: '/api/dashboard/operations/cities/status',
  doohSummary: '/api/dashboard/dooh/summary',
  doohProofOfPlaySummary: '/api/dashboard/dooh/summary',
  inventorySummary: '/api/dashboard/inventory/summary',
  inventoryMap: '/api/dashboard/inventory/map',
  inventoryRegionDistribution: '/api/dashboard/inventory/distribution/regions',
  inventoryTypeDistribution: '/api/dashboard/inventory/distribution/types',
  inventorySubtypeDistribution: '/api/dashboard/inventory/distribution/subcategories',
  inventoryOpportunitySummary: '/api/dashboard/inventory/opportunities',
  inventoryRanking: '/api/dashboard/inventory/ranking',
} as const;
