import type {
  DashboardKpiDefinition,
  DashboardKpiDefinitionKey,
  DashboardKpiDefinitionsDTO,
} from './contracts/kpis';

export type { DashboardKpiDefinition, DashboardKpiDefinitionKey, DashboardKpiDefinitionsDTO } from './contracts/kpis';

export function findDashboardKpiDefinition(
  dto: DashboardKpiDefinitionsDTO | undefined,
  key: DashboardKpiDefinitionKey,
): DashboardKpiDefinition | undefined {
  return dto?.definitions?.[key];
}
