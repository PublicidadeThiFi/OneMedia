import { DASHBOARD_ENDPOINTS, type DashboardEndpointKey } from './endpoints';
import type { DashboardMetaDTO } from './types';

export const DASHBOARD_EXPECTED_CONTRACT_VERSION = 'stage-10';

export type DashboardContractValidationResult = {
  ok: boolean;
  issues: string[];
  warnings: string[];
};

function normalizeContractPath(path: string) {
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return withSlash.replace(/^\/api(?=\/|$)/i, '') || '/';
}

function normalizeQueryName(value: string) {
  return value.trim().toLowerCase();
}

function getFrontendQueryName(key: DashboardEndpointKey) {
  return normalizeQueryName(DASHBOARD_ENDPOINTS[key].query);
}

function getBackendQueryName(value: string) {
  return normalizeQueryName(value);
}

export function validateDashboardMetaContract(meta?: DashboardMetaDTO | null): DashboardContractValidationResult {
  if (!meta) {
    return {
      ok: false,
      issues: ['Catálogo de contratos do Dashboard indisponível.'],
      warnings: [],
    };
  }

  const issues: string[] = [];
  const warnings: string[] = [];

  if (meta.version !== DASHBOARD_EXPECTED_CONTRACT_VERSION) {
    issues.push(
      `Versão de contrato divergente: frontend espera ${DASHBOARD_EXPECTED_CONTRACT_VERSION}, backend informou ${meta.version}.`,
    );
  }

  const backendKeys = new Set(Object.keys(meta.endpoints));
  const frontendKeys = Object.keys(DASHBOARD_ENDPOINTS) as DashboardEndpointKey[];

  for (const key of frontendKeys) {
    const frontendEndpoint = DASHBOARD_ENDPOINTS[key];
    const backendEndpoint = meta.endpoints[key];

    if (!backendEndpoint) {
      issues.push(`Endpoint ausente no catálogo do backend: ${key}.`);
      continue;
    }

    const frontendPath = normalizeContractPath(frontendEndpoint.path);
    const backendPath = normalizeContractPath(backendEndpoint.path);
    if (frontendPath !== backendPath) {
      issues.push(`Path divergente em ${key}: frontend=${frontendPath}, backend=${backendPath}.`);
    }

    if (frontendEndpoint.method !== backendEndpoint.method) {
      issues.push(`Método divergente em ${key}: frontend=${frontendEndpoint.method}, backend=${backendEndpoint.method}.`);
    }

    if (getFrontendQueryName(key) !== getBackendQueryName(backendEndpoint.query)) {
      issues.push(`Query contract divergente em ${key}: frontend=${frontendEndpoint.query}, backend=${backendEndpoint.query}.`);
    }
  }

  for (const backendKey of backendKeys) {
    if (!frontendKeys.includes(backendKey as DashboardEndpointKey)) {
      warnings.push(`Endpoint extra informado pelo backend e ainda não mapeado no frontend: ${backendKey}.`);
    }
  }

  const cityFilter = meta.filters.find((filter) => filter.key === 'city');
  if (!cityFilter) {
    issues.push('Filtro global city não foi exposto no catálogo do backend.');
  } else if (!(cityFilter.aliases || []).includes('region')) {
    warnings.push('Catálogo do backend não informa o alias region para city.');
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings,
  };
}
