export type DashboardKpiDefinitionKey =
  | 'revenueRecognized'
  | 'revenueToInvoice'
  | 'occupancy'
  | 'receivablesOverdue'
  | 'averageCommercialTicket'
  | 'averageBilledTicket'
  | 'clientsActiveCount'
  | 'stalledProposals'
  | 'campaignsActiveCount';

export type DashboardKpiDefinition = {
  key: DashboardKpiDefinitionKey;
  label: string;
  shortDescription: string;
  calculation: string;
  filtersApplied: string;
  primarySources: string[];
  notes?: string[];
};

export type DashboardKpiDefinitionsDTO = {
  version: string;
  updatedAt: string;
  order: DashboardKpiDefinitionKey[];
  definitions: Record<DashboardKpiDefinitionKey, DashboardKpiDefinition>;
};
