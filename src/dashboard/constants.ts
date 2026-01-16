import type { DashboardDataMode } from '../hooks/useDashboardQuery';

// Etapa 4: modo de dados. Padrão = mock.
// Para testar backend, defina VITE_DASHBOARD_DATA_MODE=backend (Vite).
export const DASHBOARD_DATA_MODE: DashboardDataMode =
  (((import.meta as any)?.env?.VITE_DASHBOARD_DATA_MODE as string) === 'backend' ? 'backend' : 'mock');

// Drilldown (drawer): paginação padrão
export const DRILLDOWN_PAGE_SIZE = 20;

// Sugestão de rotas (placeholders). Ajustar para as rotas reais do seu backend quando integrar.
export const DASHBOARD_BACKEND_ROUTES = {
  overview: '/api/dashboard/overview',
  funnel: '/api/dashboard/funnel',
  alerts: '/api/dashboard/alerts',
  drilldown: '/api/dashboard/drilldown',

  // Comercial
  commercialSummary: '/api/dashboard/commercial/summary',
  stalledProposals: '/api/dashboard/proposals/stalled',
  sellerRanking: '/api/dashboard/commercial/sellers/ranking',

  // Extras (quando formos evoluir os widgets):
  revenueTimeseries: '/api/dashboard/revenue/timeseries',
  cashflowTimeseries: '/api/dashboard/cashflow/timeseries',
  topClients: '/api/dashboard/top/clients',
  receivablesAgingSummary: '/api/dashboard/receivables/aging/summary',
  oohOpsSummary: '/api/dashboard/ooh/ops/summary',
  doohProofOfPlaySummary: '/api/dashboard/dooh/proof-of-play/summary',
  inventoryMap: '/api/dashboard/inventory/map',
  inventoryRanking: '/api/dashboard/inventory/ranking',
} as const;
