import { DASHBOARD_BACKEND_ROUTES } from './constants';
import type * as C from './contracts';

/**
 * ETAPA 11
 * Endpoint -> contrato (query + response) em um unico lugar.
 *
 * - `DASHBOARD_BACKEND_ROUTES` continua sendo a fonte de verdade do PATH.
 * - Aqui ficam:
 *    1) um mapa tipado (Query/Response)
 *    2) um mapa de documentacao (strings) para guiar a integracao com backend
 */

export type DashboardEndpointKey =
  | 'overview'
  | 'funnel'
  | 'alerts'
  | 'drilldown'
  | 'commercialSummary'
  | 'stalledProposals'
  | 'sellerRanking'
  | 'revenueTimeseries'
  | 'cashflowTimeseries'
  | 'topClients'
  | 'receivablesAgingSummary'
  | 'oohOpsSummary'
  | 'doohProofOfPlaySummary'
  | 'inventoryMap'
  | 'inventoryRanking';

export type DashboardEndpointQueryMap = {
  overview: C.DashboardBackendQuery;
  funnel: C.DashboardBackendQuery;
  alerts: C.DashboardBackendQuery;
  drilldown: C.DashboardDrilldownQuery;

  commercialSummary: C.DashboardBackendQuery;
  stalledProposals: C.DashboardBackendQuery;
  sellerRanking: C.DashboardBackendQuery;

  revenueTimeseries: C.DashboardBackendQuery;
  cashflowTimeseries: C.DashboardBackendQuery;
  topClients: C.DashboardBackendQuery;
  receivablesAgingSummary: C.DashboardBackendQuery;
  oohOpsSummary: C.DashboardBackendQuery;
  doohProofOfPlaySummary: C.DashboardBackendQuery;
  inventoryMap: C.DashboardBackendQuery;
  inventoryRanking: C.DashboardBackendQuery;
};

export type DashboardEndpointResponseMap = {
  overview: C.DashboardOverviewDTO;
  funnel: C.DashboardFunnelDTO;
  alerts: C.DashboardAlertsDTO;
  drilldown: C.DashboardDrilldownDTO;

  commercialSummary: C.DashboardCommercialSummaryDTO;
  stalledProposals: C.DashboardStalledProposalsDTO;
  sellerRanking: C.DashboardSellerRankingDTO;

  revenueTimeseries: C.DashboardTimeseriesDTO;
  cashflowTimeseries: C.DashboardTimeseriesDTO;
  topClients: C.DashboardTopClientsDTO;
  receivablesAgingSummary: C.DashboardReceivablesAgingSummaryDTO;
  oohOpsSummary: C.DashboardOohOpsSummaryDTO;
  doohProofOfPlaySummary: C.DashboardDoohProofOfPlaySummaryDTO;
  inventoryMap: C.DashboardInventoryMapDTO;
  inventoryRanking: C.DashboardInventoryRankingDTO;
};

export type DashboardEndpointQuery<K extends DashboardEndpointKey> = DashboardEndpointQueryMap[K];
export type DashboardEndpointResponse<K extends DashboardEndpointKey> = DashboardEndpointResponseMap[K];

export type DashboardEndpointContract = {
  method: 'GET';
  path: string;
  description: string;
  query: 'DashboardBackendQuery' | 'DashboardDrilldownQuery';
  response:
    | 'DashboardOverviewDTO'
    | 'DashboardFunnelDTO'
    | 'DashboardAlertsDTO'
    | 'DashboardDrilldownDTO'
    | 'DashboardCommercialSummaryDTO'
    | 'DashboardStalledProposalsDTO'
    | 'DashboardSellerRankingDTO'
    | 'DashboardTimeseriesDTO'
    | 'DashboardTopClientsDTO'
    | 'DashboardReceivablesAgingSummaryDTO'
    | 'DashboardOohOpsSummaryDTO'
    | 'DashboardDoohProofOfPlaySummaryDTO'
    | 'DashboardInventoryMapDTO'
    | 'DashboardInventoryRankingDTO';
};

export const DASHBOARD_ENDPOINTS: Record<DashboardEndpointKey, DashboardEndpointContract> = {
  overview: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.overview,
    description: 'KPIs executivos + tendencias (cards do topo do dashboard)',
    query: 'DashboardBackendQuery',
    response: 'DashboardOverviewDTO',
  },
  funnel: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.funnel,
    description: 'Funil comercial (stages + medias de conversao)',
    query: 'DashboardBackendQuery',
    response: 'DashboardFunnelDTO',
  },
  alerts: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.alerts,
    description: 'Lista de alertas "Atencao hoje" (executivo/operacoes/financeiro)',
    query: 'DashboardBackendQuery',
    response: 'DashboardAlertsDTO',
  },
  drilldown: {
    method: 'GET',
    path: `${DASHBOARD_BACKEND_ROUTES.drilldown}/:key`,
    description: 'Listas acionaveis (drawer). Suporta cursor/limit/sortBy/sortDir',
    query: 'DashboardDrilldownQuery',
    response: 'DashboardDrilldownDTO',
  },

  commercialSummary: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.commercialSummary,
    description: 'KPIs da aba Comercial (propostas, approval rate, ciclo, pipeline, stalled)',
    query: 'DashboardBackendQuery',
    response: 'DashboardCommercialSummaryDTO',
  },
  stalledProposals: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.stalledProposals,
    description: 'Tabela "Propostas paradas" (acao rapida)',
    query: 'DashboardBackendQuery',
    response: 'DashboardStalledProposalsDTO',
  },
  sellerRanking: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.sellerRanking,
    description: 'Ranking de vendedores (won vs pipeline)',
    query: 'DashboardBackendQuery',
    response: 'DashboardSellerRankingDTO',
  },

  revenueTimeseries: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.revenueTimeseries,
    description: 'Serie temporal de receita (para grafico de tendencia)',
    query: 'DashboardBackendQuery',
    response: 'DashboardTimeseriesDTO',
  },
  cashflowTimeseries: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.cashflowTimeseries,
    description: 'Serie temporal de fluxo de caixa (pode ter valores negativos)',
    query: 'DashboardBackendQuery',
    response: 'DashboardTimeseriesDTO',
  },
  topClients: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.topClients,
    description: 'Top clientes por receita no periodo',
    query: 'DashboardBackendQuery',
    response: 'DashboardTopClientsDTO',
  },
  receivablesAgingSummary: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.receivablesAgingSummary,
    description: 'Aging/resumo de contas a receber por bucket',
    query: 'DashboardBackendQuery',
    response: 'DashboardReceivablesAgingSummaryDTO',
  },
  oohOpsSummary: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.oohOpsSummary,
    description: 'Resumo operacional OOH (pendencias/SLA)',
    query: 'DashboardBackendQuery',
    response: 'DashboardOohOpsSummaryDTO',
  },
  doohProofOfPlaySummary: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.doohProofOfPlaySummary,
    description: 'Resumo proof-of-play DOOH (uptime/plays/lastSeen)',
    query: 'DashboardBackendQuery',
    response: 'DashboardDoohProofOfPlaySummaryDTO',
  },
  inventoryMap: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.inventoryMap,
    description: 'Pins do mapa com ocupacao por ponto/regiao',
    query: 'DashboardBackendQuery',
    response: 'DashboardInventoryMapDTO',
  },
  inventoryRanking: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.inventoryRanking,
    description: 'Ranking de pontos (ocupacao, campanhas, receita)',
    query: 'DashboardBackendQuery',
    response: 'DashboardInventoryRankingDTO',
  },
};
