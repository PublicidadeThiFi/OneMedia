export type DashboardMetaFilterKey =
  | 'dateFrom'
  | 'dateTo'
  | 'q'
  | 'city'
  | 'state'
  | 'mediaType';

export type DashboardMetaFilterDescriptor = {
  key: DashboardMetaFilterKey;
  label: string;
  type: 'datetime' | 'string' | 'enum';
  required: boolean;
  description: string;
  stable: boolean;
  aliases?: string[];
  enumValues?: string[];
};

export type DashboardMetaEndpointKey =
  | 'meta'
  | 'kpiDefinitions'
  | 'overview'
  | 'alerts'
  | 'funnel'
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
  | 'inventorySummary'
  | 'inventoryMap'
  | 'inventoryRegionDistribution'
  | 'inventoryTypeDistribution'
  | 'inventorySubtypeDistribution'
  | 'inventoryOpportunitySummary'
  | 'inventoryRanking'
  | 'oohOpsSummary'
  | 'operationsLateRegions'
  | 'operationsCityStatus'
  | 'doohSummary'
  | 'drilldown';

export type DashboardMetaEndpointDescriptor = {
  key: DashboardMetaEndpointKey;
  method: 'GET';
  path: string;
  query: 'DashboardQueryDto' | 'DashboardDrilldownQueryDto' | 'none';
  response: string;
  description: string;
  stable: boolean;
  legacyAliases?: string[];
};

export type DashboardMetaDTO = {
  version: string;
  updatedAt: string;
  tabs: Array<{ key: string; label: string }>;
  filters: DashboardMetaFilterDescriptor[];
  endpoints: Record<DashboardMetaEndpointKey, DashboardMetaEndpointDescriptor>;
  notes: string[];
};
