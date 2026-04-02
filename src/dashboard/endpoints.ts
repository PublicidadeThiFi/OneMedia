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
  | 'meta'
  | 'kpiDefinitions'
  | 'commercialSummary'
  | 'stalledProposals'
  | 'sellerRanking'
  | 'commercialProposalsTimeseries'
  | 'commercialHighValueOpen'
  | 'revenueTimeseries'
  | 'cashflowTimeseries'
  | 'topClients'
  | 'receivablesAgingSummary'
  | 'financialSummary'
  | 'receivablesComposition'
  | 'criticalInvoices'
  | 'lateClients'
  | 'largestOpenReceivables'
  | 'largestExpenses'
  | 'clientsSummary'
  | 'clientsTopCampaigns'
  | 'clientsOpenProposals'
  | 'clientsInactiveRisk'
  | 'clientsRegionDistribution'
  | 'oohOpsSummary'
  | 'operationsLateRegions'
  | 'operationsCityStatus'
  | 'doohSummary'
  | 'inventorySummary'
  | 'inventoryMap'
  | 'inventoryRegionDistribution'
  | 'inventoryTypeDistribution'
  | 'inventorySubtypeDistribution'
  | 'inventoryOpportunitySummary'
  | 'inventoryRanking';

export type DashboardEndpointQueryMap = {
  overview: C.DashboardBackendQuery;
  funnel: C.DashboardBackendQuery;
  alerts: C.DashboardBackendQuery;
  drilldown: C.DashboardDrilldownQuery;
  meta: never;
  kpiDefinitions: never;

  commercialSummary: C.DashboardBackendQuery;
  stalledProposals: C.DashboardBackendQuery;
  sellerRanking: C.DashboardBackendQuery;
  commercialProposalsTimeseries: C.DashboardBackendQuery;
  commercialHighValueOpen: C.DashboardBackendQuery;

  revenueTimeseries: C.DashboardBackendQuery;
  cashflowTimeseries: C.DashboardBackendQuery;
  topClients: C.DashboardBackendQuery;
  receivablesAgingSummary: C.DashboardBackendQuery;
  financialSummary: C.DashboardBackendQuery;
  receivablesComposition: C.DashboardBackendQuery;
  criticalInvoices: C.DashboardBackendQuery;
  lateClients: C.DashboardBackendQuery;
  largestOpenReceivables: C.DashboardBackendQuery;
  largestExpenses: C.DashboardBackendQuery;
  clientsSummary: C.DashboardBackendQuery;
  clientsTopCampaigns: C.DashboardBackendQuery;
  clientsOpenProposals: C.DashboardBackendQuery;
  clientsInactiveRisk: C.DashboardBackendQuery;
  clientsRegionDistribution: C.DashboardBackendQuery;
  oohOpsSummary: C.DashboardBackendQuery;
  operationsLateRegions: C.DashboardBackendQuery;
  operationsCityStatus: C.DashboardBackendQuery;
  doohSummary: C.DashboardBackendQuery;
  inventorySummary: C.DashboardBackendQuery;
  inventoryMap: C.DashboardBackendQuery;
  inventoryRegionDistribution: C.DashboardBackendQuery;
  inventoryTypeDistribution: C.DashboardBackendQuery;
  inventorySubtypeDistribution: C.DashboardBackendQuery;
  inventoryOpportunitySummary: C.DashboardBackendQuery;
  inventoryRanking: C.DashboardBackendQuery;
};

export type DashboardEndpointResponseMap = {
  overview: C.DashboardOverviewDTO;
  funnel: C.DashboardFunnelDTO;
  alerts: C.DashboardAlertsDTO;
  drilldown: C.DashboardDrilldownDTO;
  meta: C.DashboardMetaDTO;
  kpiDefinitions: C.DashboardKpiDefinitionsDTO;

  commercialSummary: C.DashboardCommercialSummaryDTO;
  stalledProposals: C.DashboardStalledProposalsDTO;
  sellerRanking: C.DashboardSellerRankingDTO;
  commercialProposalsTimeseries: C.DashboardCommercialProposalsTimeseriesDTO;
  commercialHighValueOpen: C.DashboardHighValueOpenProposalsDTO;

  revenueTimeseries: C.DashboardTimeseriesDTO;
  cashflowTimeseries: C.DashboardTimeseriesDTO;
  topClients: C.DashboardTopClientsDTO;
  receivablesAgingSummary: C.DashboardReceivablesAgingSummaryDTO;
  financialSummary: C.DashboardFinancialSummaryDTO;
  receivablesComposition: C.DashboardReceivablesCompositionDTO;
  criticalInvoices: C.DashboardCriticalInvoicesDTO;
  lateClients: C.DashboardLateClientsDTO;
  largestOpenReceivables: C.DashboardLargestOpenReceivablesDTO;
  largestExpenses: C.DashboardLargestExpensesDTO;
  clientsSummary: C.DashboardClientsSummaryDTO;
  clientsTopCampaigns: C.DashboardClientsTopCampaignsDTO;
  clientsOpenProposals: C.DashboardClientsOpenProposalsDTO;
  clientsInactiveRisk: C.DashboardClientsInactiveRiskDTO;
  clientsRegionDistribution: C.DashboardClientsRegionDistributionDTO;
  oohOpsSummary: C.DashboardOohOpsSummaryDTO;
  operationsLateRegions: C.DashboardOperationsLateRegionsDTO;
  operationsCityStatus: C.DashboardOperationsCityStatusDTO;
  doohSummary: C.DashboardDoohSummaryDTO;
  inventorySummary: C.DashboardInventorySummaryDTO;
  inventoryMap: C.DashboardInventoryMapDTO;
  inventoryRegionDistribution: C.DashboardInventoryRegionDistributionDTO;
  inventoryTypeDistribution: C.DashboardInventoryTypeDistributionDTO;
  inventorySubtypeDistribution: C.DashboardInventorySubtypeDistributionDTO;
  inventoryOpportunitySummary: C.DashboardInventoryOpportunitySummaryDTO;
  inventoryRanking: C.DashboardInventoryRankingDTO;
};

export type DashboardEndpointQuery<K extends DashboardEndpointKey> = DashboardEndpointQueryMap[K];
export type DashboardEndpointResponse<K extends DashboardEndpointKey> = DashboardEndpointResponseMap[K];

export type DashboardEndpointContract = {
  method: 'GET';
  path: string;
  description: string;
  query: 'DashboardBackendQuery' | 'DashboardDrilldownQuery' | 'None';
  response:
    | 'DashboardOverviewDTO'
    | 'DashboardFunnelDTO'
    | 'DashboardAlertsDTO'
    | 'DashboardDrilldownDTO'
    | 'DashboardMetaResponse'
    | 'DashboardKpiDefinitionsDTO'
    | 'DashboardCommercialSummaryDTO'
    | 'DashboardStalledProposalsDTO'
    | 'DashboardSellerRankingDTO'
    | 'DashboardCommercialProposalsTimeseriesDTO'
    | 'DashboardHighValueOpenProposalsDTO'
    | 'DashboardTimeseriesDTO'
    | 'DashboardTopClientsDTO'
    | 'DashboardReceivablesAgingSummaryDTO'
    | 'DashboardFinancialSummaryDTO'
    | 'DashboardReceivablesCompositionDTO'
    | 'DashboardCriticalInvoicesDTO'
    | 'DashboardLateClientsDTO'
    | 'DashboardLargestOpenReceivablesDTO'
    | 'DashboardLargestExpensesDTO'
    | 'DashboardClientsSummaryDTO'
    | 'DashboardClientsTopCampaignsDTO'
    | 'DashboardClientsOpenProposalsDTO'
    | 'DashboardClientsInactiveRiskDTO'
    | 'DashboardClientsRegionDistributionDTO'
    | 'DashboardOohOpsSummaryDTO'
    | 'DashboardOperationsLateRegionsDTO'
    | 'DashboardOperationsCityStatusDTO'
    | 'DashboardDoohSummaryDTO'
    | 'DashboardInventorySummaryDTO'
    | 'DashboardInventoryMapDTO'
    | 'DashboardInventoryRegionDistributionDTO'
    | 'DashboardInventoryTypeDistributionDTO'
    | 'DashboardInventorySubtypeDistributionDTO'
    | 'DashboardInventoryOpportunitySummaryDTO'
    | 'DashboardInventoryRankingDTO';
};

export const DASHBOARD_ENDPOINTS: Record<DashboardEndpointKey, DashboardEndpointContract> = {
  meta: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.meta,
    description: 'Catalogo do modulo agregador do Dashboard (rotas, filtros e compatibilidade)',
    query: 'None',
    response: 'DashboardMetaResponse',
  },
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

  kpiDefinitions: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.kpiDefinitions,
    description: 'Fonte verdade das definições de KPI consolidadas na Etapa 1',
    query: 'None',
    response: 'DashboardKpiDefinitionsDTO',
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
  commercialProposalsTimeseries: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.commercialProposalsTimeseries,
    description: 'Evolução temporal do volume de propostas geradas no período',
    query: 'DashboardBackendQuery',
    response: 'DashboardCommercialProposalsTimeseriesDTO',
  },
  commercialHighValueOpen: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.commercialHighValueOpen,
    description: 'Lista de propostas de alto valor ainda em negociação',
    query: 'DashboardBackendQuery',
    response: 'DashboardHighValueOpenProposalsDTO',
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
  financialSummary: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.financialSummary,
    description: 'KPIs principais da aba Financeiro',
    query: 'DashboardBackendQuery',
    response: 'DashboardFinancialSummaryDTO',
  },
  receivablesComposition: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.receivablesComposition,
    description: 'Composição entre recebido, aberto e vencido',
    query: 'DashboardBackendQuery',
    response: 'DashboardReceivablesCompositionDTO',
  },
  criticalInvoices: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.criticalInvoices,
    description: 'Lista de faturas críticas para ação rápida',
    query: 'DashboardBackendQuery',
    response: 'DashboardCriticalInvoicesDTO',
  },
  lateClients: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.lateClients,
    description: 'Clientes com maior atraso agregado no período',
    query: 'DashboardBackendQuery',
    response: 'DashboardLateClientsDTO',
  },
  largestOpenReceivables: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.largestOpenReceivables,
    description: 'Maiores contas em aberto e vencidas',
    query: 'DashboardBackendQuery',
    response: 'DashboardLargestOpenReceivablesDTO',
  },
  largestExpenses: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.largestExpenses,
    description: 'Maiores despesas pagas no período',
    query: 'DashboardBackendQuery',
    response: 'DashboardLargestExpensesDTO',
  },
  clientsSummary: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.clientsSummary,
    description: 'KPIs principais da aba Clientes',
    query: 'DashboardBackendQuery',
    response: 'DashboardClientsSummaryDTO',
  },
  clientsTopCampaigns: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.clientsTopCampaigns,
    description: 'Top clientes por campanhas válidas',
    query: 'DashboardBackendQuery',
    response: 'DashboardClientsTopCampaignsDTO',
  },
  clientsOpenProposals: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.clientsOpenProposals,
    description: 'Clientes com propostas em aberto',
    query: 'DashboardBackendQuery',
    response: 'DashboardClientsOpenProposalsDTO',
  },
  clientsInactiveRisk: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.clientsInactiveRisk,
    description: 'Clientes com risco de inatividade ou sem campanha ativa',
    query: 'DashboardBackendQuery',
    response: 'DashboardClientsInactiveRiskDTO',
  },
  clientsRegionDistribution: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.clientsRegionDistribution,
    description: 'Distribuição regional da carteira',
    query: 'DashboardBackendQuery',
    response: 'DashboardClientsRegionDistributionDTO',
  },
  oohOpsSummary: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.oohOpsSummary,
    description: 'Resumo operacional OOH (campanhas, SLA, pendências e criticidade)',
    query: 'DashboardBackendQuery',
    response: 'DashboardOohOpsSummaryDTO',
  },
  operationsLateRegions: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.operationsLateRegions,
    description: 'Regiões/cidades com maior atraso operacional no recorte atual',
    query: 'DashboardBackendQuery',
    response: 'DashboardOperationsLateRegionsDTO',
  },
  operationsCityStatus: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.operationsCityStatus,
    description: 'Resumo por cidade/status operacional de campanhas OOH',
    query: 'DashboardBackendQuery',
    response: 'DashboardOperationsCityStatusDTO',
  },
  doohSummary: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.doohSummary,
    description: 'Resumo operacional DOOH (saude, campanhas vinculadas e atividade recente)',
    query: 'DashboardBackendQuery',
    response: 'DashboardDoohSummaryDTO',
  },
  inventorySummary: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.inventorySummary,
    description: 'KPIs principais da aba Inventário',
    query: 'DashboardBackendQuery',
    response: 'DashboardInventorySummaryDTO',
  },
  inventoryMap: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.inventoryMap,
    description: 'Mapa real do inventário com ocupação, campanhas e receita por pin',
    query: 'DashboardBackendQuery',
    response: 'DashboardInventoryMapDTO',
  },
  inventoryRegionDistribution: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.inventoryRegionDistribution,
    description: 'Distribuição do inventário por cidade/UF',
    query: 'DashboardBackendQuery',
    response: 'DashboardInventoryRegionDistributionDTO',
  },
  inventoryTypeDistribution: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.inventoryTypeDistribution,
    description: 'Distribuição do inventário por tipo de mídia',
    query: 'DashboardBackendQuery',
    response: 'DashboardInventoryTypeDistributionDTO',
  },
  inventorySubtypeDistribution: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.inventorySubtypeDistribution,
    description: 'Distribuição do inventário por subcategoria/ambiente',
    query: 'DashboardBackendQuery',
    response: 'DashboardInventorySubtypeDistributionDTO',
  },
  inventoryOpportunitySummary: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.inventoryOpportunitySummary,
    description: 'Resumo analítico de oportunidades do inventário',
    query: 'DashboardBackendQuery',
    response: 'DashboardInventoryOpportunitySummaryDTO',
  },
  inventoryRanking: {
    method: 'GET',
    path: DASHBOARD_BACKEND_ROUTES.inventoryRanking,
    description: 'Ranking de pontos do inventário (ocupação, campanhas, receita)',
    query: 'DashboardBackendQuery',
    response: 'DashboardInventoryRankingDTO',
  },
};
