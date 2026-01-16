import type { DashboardBackendQuery } from './shared';

export type DrilldownCellValue = string | number | boolean | null | undefined;

export type DrilldownRow = {
  id: string;
  title: string;
  subtitle?: string;
  amountCents?: number;
  status?: string;
  fields?: Record<string, DrilldownCellValue>;
};

export type DashboardDrilldownDTO = {
  rows: DrilldownRow[];
  paging?: {
    // cursor de paginacao (proxima pagina).
    // Compatibilidade: se o backend ainda devolver 'cursor', a UI tenta ler tambem.
    nextCursor?: string;
    hasMore: boolean;
  };
};

// Query params do drilldown (além dos filtros globais, suporta paginacao e sort).
export type DashboardDrilldownQuery = DashboardBackendQuery & {
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
};
