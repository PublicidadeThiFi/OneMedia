import type { Page } from '../../App';

// ============================================================
// Shared contracts used across all dashboard modules
// ============================================================

export type DashboardTab = 'executivo' | 'comercial' | 'operacoes' | 'financeiro' | 'inventario';

export type DatePreset = '7d' | '30d' | '90d' | 'ytd';

export type MediaTypeFilter = 'ALL' | 'OOH' | 'DOOH';

export type DashboardFilters = {
  datePreset: DatePreset;
  query: string; // texto livre (cliente, campanha, proposta...)
  city: string;
  mediaType: MediaTypeFilter;
};

// Query params padronizados para o Dashboard (filtros globais).
// Observacao: o backend pode preferir dateFrom/dateTo ao inves de "datePreset".
export type DashboardBackendQuery = {
  dateFrom: string; // ISO datetime
  dateTo: string; // ISO datetime
  q?: string; // busca textual
  city?: string;
  mediaType?: Exclude<MediaTypeFilter, 'ALL'>;
};

export type KpiTrend = {
  deltaPercent: number; // variacao vs periodo anterior
  points: number[]; // serie curta para sparkline simples
};

export type TimeseriesPoint = {
  date: string; // ISO date/datetime
  valueCents: number; // valor em centavos (pode ser negativo para fluxo)
};

export type DashboardTimeseriesDTO = {
  points: TimeseriesPoint[];
};

// Alertas (aba Executivo/Operacoes/Financeiro)
export type AlertItem = {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  ctaLabel?: string;
  ctaPage?: Page;
};

export type DashboardAlertsDTO = AlertItem[];
