import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  Building2,
  Check,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Filter,
  Globe,
  Info,
  PieChart,
  Plus,
  Share2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { toast } from 'sonner';
import { useDashboardQuery, type DashboardDataMode, type DashboardQuerySource } from '../hooks/useDashboardQuery';
import { dashboardGetJson } from '../services/dashboard';

import { DASHBOARD_BACKEND_ROUTES, DASHBOARD_DATA_MODE, DRILLDOWN_PAGE_SIZE } from './constants';
import {
  downloadTextFile,
  escapeCsvValue,
  exportAgingBucketsCsv,
  exportDrilldownCsv,
  exportTimeseriesCsv,
} from './csv';
import { printElementToPdf } from './pdf';
import { getDrilldownSpec, type DrilldownColumnSpec, type DrilldownSortDir } from './drilldownSpec';
import { mockApi } from './mockApi';
import { buildDashboardBackendQuery, toQueryString } from './query';
import { getDashboardPermissions } from './permissions';
import { deleteSavedView, loadActiveSavedViewId, loadSavedViews, makeSavedViewId, persistActiveSavedViewId, upsertSavedView, type SavedDashboardView } from './savedViews';
import { useCachedQueryData } from './cache';
import { useWidgetMetrics } from './metrics';
import { runDashboardQaChecksOnce } from './qa';
import { DashboardErrorBoundary } from './DashboardErrorBoundary';
import { getDashboardRolloutState, setForcedDashboardVariant, type DashboardUiVariant } from './rollout';
import {
  DASHBOARD_PARITY_CHECKLIST,
  loadParityMarks,
  parityChecklistToText,
  resetParityMarks,
  toggleParityMark,
} from './parity';
import type {
  DashboardAlertsDTO,
  DashboardCommercialSummaryDTO,
  DashboardDoohSummaryDTO,
  DashboardKpiDefinitionsDTO,
  DashboardDrilldownDTO,
  DashboardFilters,
  DashboardFunnelDTO,
  DashboardInventorySummaryDTO,
  DashboardInventoryMapDTO,
  DashboardInventoryRegionDistributionDTO,
  DashboardInventoryTypeDistributionDTO,
  DashboardInventorySubtypeDistributionDTO,
  DashboardInventoryOpportunitySummaryDTO,
  DashboardInventoryRankingDTO,
  DashboardOohOpsSummaryDTO,
  DashboardOperationsLateRegionsDTO,
  DashboardOperationsCityStatusDTO,
  DashboardOverviewDTO,
  DashboardProps,
  DashboardReceivablesAgingSummaryDTO,
  DashboardSellerRankingDTO,
  DashboardStalledProposalsDTO,
  DashboardCommercialProposalsTimeseriesDTO,
  DashboardHighValueOpenProposalsDTO,
  DashboardFinancialSummaryDTO,
  DashboardReceivablesCompositionDTO,
  DashboardCriticalInvoicesDTO,
  DashboardLateClientsDTO,
  DashboardLargestOpenReceivablesDTO,
  DashboardLargestExpensesDTO,
  DashboardClientsSummaryDTO,
  DashboardClientsTopCampaignsDTO,
  DashboardClientsOpenProposalsDTO,
  DashboardClientsInactiveRiskDTO,
  DashboardClientsRegionDistributionDTO,
  DashboardDrilldownQuery,
  DashboardTab,
  DashboardTimeseriesDTO,
  DashboardTopClientsDTO,
  DatePreset,
  DrilldownRow,
  DrilldownState,
  MediaTypeFilter,
} from './types';
import {
  formatCell,
  formatCurrency,
  formatShortDate,
  includesNormalized,
  normalizeText,
  seedNumber,
  smartEmptyDescription,
  timeseriesToSpark,
  uniqById,
} from './utils';
import { EmptyState, ErrorState, KpiCard, Pill, SeverityDot, Skeleton, Sparkline, TabButton, WidgetCard } from './ui';
import { InventoryMap } from './components/InventoryMap';
import {
  DASHBOARD_FALLBACK_KPI_DEFINITIONS_DTO,
  type DashboardKpiDefinitionKey,
} from './kpiDefinitions';

const STAGE6_BACKEND_WIDGETS = new Set([
  'overview',
  'alerts',
  'funnel',
  'commercialSummary',
  'stalledProposals',
  'sellerRanking',
  'commercialProposalsTimeseries',
  'commercialHighValueOpen',
  'revenueTimeseries',
  'cashflowTimeseries',
  'topClients',
  'receivablesAgingSummary',
  'financialSummary',
  'receivablesComposition',
  'criticalInvoices',
  'lateClients',
  'largestOpenReceivables',
  'largestExpenses',
  'clientsSummary',
  'clientsTopCampaigns',
  'clientsOpenProposals',
  'clientsInactiveRisk',
  'clientsRegionDistribution',
  'inventorySummary',
  'inventoryMap',
  'inventoryRegionDistribution',
  'inventoryTypeDistribution',
  'inventorySubtypeDistribution',
  'inventoryOpportunitySummary',
  'inventoryRanking',
  'oohOpsSummary',
  'operationsLateRegions',
  'operationsCityStatus',
  'doohSummary',
  'drilldown',
]);

function resolveWidgetMode(baseMode: DashboardDataMode, widgetKey: string): DashboardDataMode {
  return baseMode === 'backend' && STAGE6_BACKEND_WIDGETS.has(widgetKey) ? 'backend' : 'mock';
}

function describeQuerySource(source?: DashboardQuerySource) {
  if (source === 'backend') return 'Dados reais do sistema';
  if (source === 'mock-fallback') return 'Prévia local de segurança';
  return 'Prévia local';
}

function describeDashboardDataMode(mode: DashboardDataMode) {
  return mode === 'backend'
    ? 'Visão Geral, Comercial, Financeiro, Inventário, Operações e Clientes com dados reais'
    : 'Prévia local em todas as áreas';
}

function describeDrilldownHint(title: string) {
  return `${title} com os mesmos filtros globais aplicados.`;
}

const TAB_META: Record<DashboardTab, { label: string; subtitle: string }> = {
  executivo: {
    label: 'Visão Geral',
    subtitle: 'Resumo executivo do recorte atual, com foco em decisão, risco e ação imediata.',
  },
  comercial: {
    label: 'Comercial',
    subtitle: 'Pipeline, conversão, performance e gargalos da operação comercial.',
  },
  financeiro: {
    label: 'Financeiro',
    subtitle: 'Receita, caixa, aging, risco e prioridades financeiras do período.',
  },
  operacoes: {
    label: 'Operações',
    subtitle: 'Execução, instalação, check-ins e pendências operacionais por prioridade.',
  },
  inventario: {
    label: 'Inventário',
    subtitle: 'Disponibilidade, ocupação, concentração e oportunidades do inventário.',
  },
  clientes: {
    label: 'Clientes',
    subtitle: 'Valor, recorrência, risco e sinais de inatividade da carteira.',
  },
};

function formatDateTimeLabel(iso?: string) {
  if (!iso) return 'Aguardando dados';
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toLocaleString('pt-BR');
}

function getDatePresetLabel(preset: DatePreset) {
  if (preset === '7d') return 'Últimos 7 dias';
  if (preset === '30d') return 'Últimos 30 dias';
  if (preset === '90d') return 'Últimos 90 dias';
  return 'Ano (YTD)';
}

function getMediaTypeLabel(mediaType: MediaTypeFilter) {
  if (mediaType === 'OOH') return 'OOH';
  if (mediaType === 'DOOH') return 'DOOH';
  return 'OOH + DOOH';
}

function buildAppliedFiltersSummary(filters: DashboardFilters) {
  const parts = [getDatePresetLabel(filters.datePreset)];
  if (filters.city) parts.push(filters.city);
  if (filters.query) parts.push(`Busca: ${filters.query}`);
  parts.push(getMediaTypeLabel(filters.mediaType));
  return parts.join(' • ');
}

function uniqueSources(sources: Array<DashboardQuerySource | undefined>) {
  return Array.from(new Set(sources.filter(Boolean))) as DashboardQuerySource[];
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const { company } = useCompany();

  const [tab, setTab] = useState<DashboardTab>('executivo');
  const initialFilters: DashboardFilters = {
    datePreset: '30d',
    query: '',
    city: '',
    mediaType: 'ALL',
  };

  // Etapa 15: drafts (UX) + debounce para evitar refetch a cada tecla
  const [filtersDraft, setFiltersDraft] = useState<DashboardFilters>(initialFilters);
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  useEffect(() => {
    const needsDebounce = filtersDraft.query !== filters.query || filtersDraft.city !== filters.city;
    if (!needsDebounce) {
      setIsApplyingFilters(false);
      return;
    }

    setIsApplyingFilters(true);
    const debounceTimer = window.setTimeout(() => {
      setFilters((s) => ({ ...s, query: filtersDraft.query, city: filtersDraft.city }));
      setIsApplyingFilters(false);
    }, 350);

    return () => window.clearTimeout(debounceTimer);
  }, [filtersDraft.query, filtersDraft.city, filters.query, filters.city]);



  // Etapa 12: permissoes + saved views (MVP: localStorage)
  const perms = useMemo(() => getDashboardPermissions(user, company), [user, company]);

  // Etapa 16: rollout seguro (feature-flag por empresa/usuario + overrides)
  const rollout = useMemo(
    () =>
      getDashboardRolloutState({
        companyId: company?.id,
        userId: (user as any)?.id,
        userEmail: (user as any)?.email,
        canOverride: perms.canManageSavedViews,
      }),
    [company?.id, (user as any)?.id, (user as any)?.email, perms.canManageSavedViews],
  );

  // Data mode pode ser forçado via URL (?dashboardData=backend|mock). Em modo compact, mantemos mock para reduzir risco.
  const [dataMode, setDataMode] = useState(() => {
    const base = rollout.dataModeOverride ?? DASHBOARD_DATA_MODE;
    return rollout.variant === 'compact' ? 'mock' : base;
  });

  useEffect(() => {
    const base = rollout.dataModeOverride ?? DASHBOARD_DATA_MODE;
    setDataMode(rollout.variant === 'compact' ? 'mock' : base);
  }, [rollout.dataModeOverride, rollout.variant]);

  // Rollback automatico: se o backend falhar (quando habilitado), cai para mock na sessao.
  useEffect(() => {
    if (dataMode !== 'backend') return;
    try {
      const raw = sessionStorage.getItem('oneMedia.dashboard.dataMode.session');
      if (raw === 'mock') {
        setDataMode('mock');
      }
    } catch {
      // ignore
    }
  }, [dataMode]);

  const applyVariantOverride = (variant: DashboardUiVariant) => {
    if (!rollout.canOverride) return;
    setForcedDashboardVariant({
      companyId: company?.id,
      userId: (user as any)?.id || (user as any)?.email,
      variant,
      ttlMs: 24 * 60 * 60 * 1000,
      reason: 'Override manual (Etapa 16)',
    });
    window.location.reload();
  };

  // Etapa 16: checklist de paridade (MVP: localStorage)
  const [parityOpen, setParityOpen] = useState(false);
  const [parityMarks, setParityMarks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setParityMarks(loadParityMarks(company?.id, (user as any)?.id || (user as any)?.email));
  }, [company?.id, (user as any)?.id, (user as any)?.email]);
  const companyKey = useMemo(() => String((company as any)?.id ?? ''), [company]);
  const userKey = useMemo(() => {
    const u: any = user as any;
    return String(u?.id ?? u?.uid ?? u?.userId ?? u?.email ?? '');
  }, [user]);

  const [savedViews, setSavedViews] = useState<SavedDashboardView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string>('');
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [saveViewMode, setSaveViewMode] = useState<'create' | 'update'>('create');
  const [saveViewName, setSaveViewName] = useState('');

  const allowedTabsKey = useMemo(() => (perms.allowedTabs || []).join('|'), [perms.allowedTabs]);

  const [shareMapOpen, setShareMapOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [kpiRulesOpen, setKpiRulesOpen] = useState(false);

  // Etapa 3: este objeto representa exatamente o que vira query params no backend.
  // Etapa 4: hooks/services adicionados (useDashboardQuery + services/dashboard). Modo padrão = mock; backend via env.
  const backendQuery = useMemo(() => buildDashboardBackendQuery(filters), [filters]);

  const backendQs = useMemo(() => toQueryString(backendQuery), [backendQuery]);

  const dataModeSummary = describeDashboardDataMode(dataMode);

  const overviewMode = resolveWidgetMode(dataMode, 'overview');
  const alertsMode = resolveWidgetMode(dataMode, 'alerts');
  const funnelMode = resolveWidgetMode(dataMode, 'funnel');
  const commercialSummaryMode = resolveWidgetMode(dataMode, 'commercialSummary');
  const stalledProposalsMode = resolveWidgetMode(dataMode, 'stalledProposals');
  const sellerRankingMode = resolveWidgetMode(dataMode, 'sellerRanking');
  const commercialProposalsTimeseriesMode = resolveWidgetMode(dataMode, 'commercialProposalsTimeseries');
  const commercialHighValueOpenMode = resolveWidgetMode(dataMode, 'commercialHighValueOpen');
  const revenueTimeseriesMode = resolveWidgetMode(dataMode, 'revenueTimeseries');
  const cashflowTimeseriesMode = resolveWidgetMode(dataMode, 'cashflowTimeseries');
  const inventorySummaryMode = resolveWidgetMode(dataMode, 'inventorySummary');
  const inventoryMapMode = resolveWidgetMode(dataMode, 'inventoryMap');
  const inventoryRegionDistributionMode = resolveWidgetMode(dataMode, 'inventoryRegionDistribution');
  const inventoryTypeDistributionMode = resolveWidgetMode(dataMode, 'inventoryTypeDistribution');
  const inventorySubtypeDistributionMode = resolveWidgetMode(dataMode, 'inventorySubtypeDistribution');
  const inventoryOpportunitySummaryMode = resolveWidgetMode(dataMode, 'inventoryOpportunitySummary');
  const inventoryRankingMode = resolveWidgetMode(dataMode, 'inventoryRanking');
  const topClientsMode = resolveWidgetMode(dataMode, 'topClients');
  const agingMode = resolveWidgetMode(dataMode, 'receivablesAgingSummary');
  const financialSummaryMode = resolveWidgetMode(dataMode, 'financialSummary');
  const receivablesCompositionMode = resolveWidgetMode(dataMode, 'receivablesComposition');
  const criticalInvoicesMode = resolveWidgetMode(dataMode, 'criticalInvoices');
  const lateClientsMode = resolveWidgetMode(dataMode, 'lateClients');
  const largestOpenReceivablesMode = resolveWidgetMode(dataMode, 'largestOpenReceivables');
  const largestExpensesMode = resolveWidgetMode(dataMode, 'largestExpenses');
  const clientsSummaryMode = resolveWidgetMode(dataMode, 'clientsSummary');
  const clientsTopCampaignsMode = resolveWidgetMode(dataMode, 'clientsTopCampaigns');
  const clientsOpenProposalsMode = resolveWidgetMode(dataMode, 'clientsOpenProposals');
  const clientsInactiveRiskMode = resolveWidgetMode(dataMode, 'clientsInactiveRisk');
  const clientsRegionDistributionMode = resolveWidgetMode(dataMode, 'clientsRegionDistribution');
  const oohOpsMode = resolveWidgetMode(dataMode, 'oohOpsSummary');
  const operationsLateRegionsMode = resolveWidgetMode(dataMode, 'operationsLateRegions');
  const operationsCityStatusMode = resolveWidgetMode(dataMode, 'operationsCityStatus');
  const doohSummaryMode = resolveWidgetMode(dataMode, 'doohSummary');
  const drilldownMode = resolveWidgetMode(dataMode, 'drilldown');

  const kpiDefinitionsQ = useDashboardQuery<DashboardKpiDefinitionsDTO>({
    enabled: !!user,
    mode: 'backend',
    deps: [company?.id, (user as any)?.id, (user as any)?.email],
    computeMock: () => DASHBOARD_FALLBACK_KPI_DEFINITIONS_DTO,
    fetcher: (signal) =>
      dashboardGetJson<DashboardKpiDefinitionsDTO>(DASHBOARD_BACKEND_ROUTES.kpiDefinitions, undefined, { signal }),
  });

  const kpiDefinitionsDto = kpiDefinitionsQ.data ?? DASHBOARD_FALLBACK_KPI_DEFINITIONS_DTO;
  const kpiDefinitionOrder = kpiDefinitionsDto.order;
  const kpiDefinitions = kpiDefinitionsDto.definitions;
  const kpiDefinitionsSourceLabel = kpiDefinitionsQ.source === 'backend' ? 'Sincronizado com backend' : 'Fallback local';
  const kpiDefinitionsUpdatedAtLabel = formatShortDate(kpiDefinitionsDto.updatedAt);
  const kpiDefinition = (key: DashboardKpiDefinitionKey) => kpiDefinitions[key] ?? DASHBOARD_FALLBACK_KPI_DEFINITIONS_DTO.definitions[key];

  const [drilldown, setDrilldown] = useState<DrilldownState>({
    open: false,
    key: undefined,
    title: '',
    rows: [],
    hint: undefined,
    status: 'idle',
    errorMessage: undefined,
    sortBy: undefined,
    sortDir: undefined,
    cursor: undefined,
    nextCursor: undefined,
    hasMore: false,
    totalCount: undefined,
    pageSize: undefined,
    search: '',
  });
  const [isExportingDrilldown, setIsExportingDrilldown] = useState(false);

  // BACKEND SWAP POINT (Etapa 4+): useDashboardOverview(company.id, backendQuery)
  const overviewQ = useDashboardQuery<DashboardOverviewDTO>({
    enabled: !!company,
    mode: overviewMode,
    deps: [company?.id, backendQs, tab, overviewMode],
    computeMock: () => mockApi.fetchOverviewKpis(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardOverviewDTO>(DASHBOARD_BACKEND_ROUTES.overview, backendQs, { signal }),
    fallbackToMock: false,
  });

  // BACKEND SWAP POINT (Etapa 4+): useDashboardFunnel(company.id, backendQuery)
  const funnelQ = useDashboardQuery<DashboardFunnelDTO>({
    enabled: !!company && (tab === 'executivo' || tab === 'comercial'),
    mode: funnelMode,
    deps: [company?.id, backendQs, funnelMode],
    computeMock: () => mockApi.fetchCommercialFunnel(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardFunnelDTO>(DASHBOARD_BACKEND_ROUTES.funnel, backendQs, { signal }),
    fallbackToMock: false,
  });

  // Comercial (Etapa 7): KPIs e listas dedicadas (mantendo a UI igual)
  const commercialSummaryQ = useDashboardQuery<DashboardCommercialSummaryDTO>({
    enabled: !!company && tab === 'comercial',
    mode: commercialSummaryMode,
    deps: [company?.id, backendQs, commercialSummaryMode],
    computeMock: () => mockApi.fetchCommercialSummary(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardCommercialSummaryDTO>(DASHBOARD_BACKEND_ROUTES.commercialSummary, backendQs, { signal }),
    fallbackToMock: false,
  });

  const stalledProposalsQ = useDashboardQuery<DashboardStalledProposalsDTO>({
    enabled: !!company && tab === 'comercial',
    mode: stalledProposalsMode,
    deps: [company?.id, backendQs, stalledProposalsMode],
    computeMock: () => mockApi.fetchStalledProposals(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardStalledProposalsDTO>(DASHBOARD_BACKEND_ROUTES.stalledProposals, backendQs, { signal }),
    fallbackToMock: false,
  });

  const sellerRankingQ = useDashboardQuery<DashboardSellerRankingDTO>({
    enabled: !!company && tab === 'comercial',
    mode: sellerRankingMode,
    deps: [company?.id, backendQs, sellerRankingMode],
    computeMock: () => mockApi.fetchSellerRanking(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardSellerRankingDTO>(DASHBOARD_BACKEND_ROUTES.sellerRanking, backendQs, { signal }),
    fallbackToMock: false,
  });

  const commercialProposalsTimeseriesQ = useDashboardQuery<DashboardCommercialProposalsTimeseriesDTO>({
    enabled: !!company && tab === 'comercial',
    mode: commercialProposalsTimeseriesMode,
    deps: [company?.id, backendQs, commercialProposalsTimeseriesMode],
    computeMock: () => mockApi.fetchCommercialProposalsTimeseries(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardCommercialProposalsTimeseriesDTO>(DASHBOARD_BACKEND_ROUTES.commercialProposalsTimeseries, backendQs, { signal }),
    fallbackToMock: false,
  });

  const commercialHighValueOpenQ = useDashboardQuery<DashboardHighValueOpenProposalsDTO>({
    enabled: !!company && tab === 'comercial',
    mode: commercialHighValueOpenMode,
    deps: [company?.id, backendQs, commercialHighValueOpenMode],
    computeMock: () => mockApi.fetchHighValueOpenProposals(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardHighValueOpenProposalsDTO>(DASHBOARD_BACKEND_ROUTES.commercialHighValueOpen, backendQs, { signal }),
    fallbackToMock: false,
  });

  // BACKEND SWAP POINT (Etapa 4+): useDashboardAlerts(company.id, backendQuery)
  const alertsQ = useDashboardQuery<DashboardAlertsDTO>({
    enabled: !!company && (tab === 'executivo' || tab === 'financeiro'),
    mode: alertsMode,
    deps: [company?.id, backendQs, alertsMode],
    computeMock: () => mockApi.fetchAlerts(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardAlertsDTO>(DASHBOARD_BACKEND_ROUTES.alerts, backendQs, { signal }),
    fallbackToMock: false,
  });

  // Drilldown (Etapa 8): agora usa useDashboardQuery + paginação (cursor)
  const drilldownQs = useMemo(() => {
    if (!drilldown.key) return backendQs;
    return toQueryString(backendQuery, {
      cursor: drilldown.cursor,
      limit: String(DRILLDOWN_PAGE_SIZE),
      sortBy: drilldown.sortBy,
      sortDir: drilldown.sortDir,
      ...(drilldown.params || {}),
    });
  }, [backendQuery, backendQs, drilldown.key, drilldown.cursor, drilldown.sortBy, drilldown.sortDir, drilldown.params]);

  const drilldownQ = useDashboardQuery<DashboardDrilldownDTO>({
    enabled: !!company && drilldown.open && !!drilldown.key,
    mode: drilldownMode,
    deps: [company?.id, drilldown.key, drilldownQs, drilldownMode],
    computeMock: () =>
      mockApi.fetchDrilldown(company!.id, drilldown.key!, filters, {
        cursor: drilldown.cursor,
        limit: DRILLDOWN_PAGE_SIZE,
        sortBy: drilldown.sortBy,
        sortDir: drilldown.sortDir,
        params: drilldown.params,
      }),
    fetcher: (signal) =>
      dashboardGetJson<DashboardDrilldownDTO>(`${DASHBOARD_BACKEND_ROUTES.drilldown}/${drilldown.key}`, drilldownQs, {
        signal,
      }),
  });

  // Reaplica drilldown quando filtros globais mudam (evita misturar páginas de recortes diferentes)
  useEffect(() => {
    if (!drilldown.open) return;
    setDrilldown((s) => ({
      ...s,
      cursor: undefined,
      nextCursor: undefined,
      hasMore: false,
      totalCount: undefined,
      pageSize: undefined,
      rows: [],
      status: s.key ? 'loading' : s.status,
      errorMessage: undefined,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendQs]);

  // Sincroniza estado do drawer com a query do drilldown (append no load-more)
  useEffect(() => {
    if (!drilldown.open || !drilldown.key) return;

    if (drilldownQ.status === 'loading') {
      setDrilldown((s) => ({ ...s, status: 'loading', errorMessage: undefined }));
      return;
    }

    if (drilldownQ.status === 'error') {
      setDrilldown((s) => ({
        ...s,
        status: 'error',
        errorMessage: drilldownQ.errorMessage || 'Erro inesperado ao carregar detalhes',
      }));
      return;
    }

    if (drilldownQ.status === 'ready') {
      const dto = drilldownQ.data;
      const paging: any = dto?.paging || {};
      const nextCursor: string | undefined = paging.nextCursor ?? paging.cursor;
      const hasMore = Boolean(paging.hasMore && nextCursor);
      const incoming = dto?.rows || [];
      const totalCount = typeof paging.totalCount === 'number' ? paging.totalCount : undefined;
      const pageSize = typeof paging.pageSize === 'number' ? paging.pageSize : undefined;

      setDrilldown((prev) => {
        const append = Boolean(prev.cursor && prev.rows.length > 0);
        const merged = append ? uniqById([...(prev.rows || []), ...incoming]) : incoming;
        return {
          ...prev,
          rows: merged,
          status: 'ready',
          errorMessage: undefined,
          hasMore,
          nextCursor,
          totalCount: totalCount ?? merged.length,
          pageSize,
        };
      });
    }
  }, [drilldown.open, drilldown.key, drilldownQ.status, drilldownQ.data, drilldownQ.errorMessage]);

  const revenueTsQ = useDashboardQuery<DashboardTimeseriesDTO>({
    enabled: !!company && (tab === 'executivo' || tab === 'financeiro'),
    mode: revenueTimeseriesMode,
    deps: [company?.id, backendQs, revenueTimeseriesMode],
    computeMock: () => mockApi.fetchRevenueTimeseries(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardTimeseriesDTO>(DASHBOARD_BACKEND_ROUTES.revenueTimeseries, backendQs, { signal }),
  });

  const cashflowTsQ = useDashboardQuery<DashboardTimeseriesDTO>({
    enabled: !!company && (tab === 'executivo' || tab === 'financeiro'),
    mode: cashflowTimeseriesMode,
    deps: [company?.id, backendQs, cashflowTimeseriesMode],
    computeMock: () => mockApi.fetchCashflowTimeseries(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardTimeseriesDTO>(DASHBOARD_BACKEND_ROUTES.cashflowTimeseries, backendQs, { signal }),
  });

  const inventorySummaryQ = useDashboardQuery<DashboardInventorySummaryDTO>({
    enabled: !!company && tab === 'inventario',
    mode: inventorySummaryMode,
    deps: [company?.id, backendQs, inventorySummaryMode],
    computeMock: () => mockApi.fetchInventorySummary(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardInventorySummaryDTO>(DASHBOARD_BACKEND_ROUTES.inventorySummary, backendQs, { signal }),
    fallbackToMock: false,
  });

  const inventoryMapQ = useDashboardQuery<DashboardInventoryMapDTO>({
    enabled: !!company && (tab === 'executivo' || tab === 'inventario'),
    mode: inventoryMapMode,
    deps: [company?.id, backendQs, inventoryMapMode],
    computeMock: () => mockApi.fetchInventoryMap(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardInventoryMapDTO>(DASHBOARD_BACKEND_ROUTES.inventoryMap, backendQs, { signal }),
    fallbackToMock: false,
  });

  const inventoryRegionDistributionQ = useDashboardQuery<DashboardInventoryRegionDistributionDTO>({
    enabled: !!company && tab === 'inventario',
    mode: inventoryRegionDistributionMode,
    deps: [company?.id, backendQs, inventoryRegionDistributionMode],
    computeMock: () => mockApi.fetchInventoryRegionDistribution(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardInventoryRegionDistributionDTO>(DASHBOARD_BACKEND_ROUTES.inventoryRegionDistribution, backendQs, { signal }),
    fallbackToMock: false,
  });

  const inventoryTypeDistributionQ = useDashboardQuery<DashboardInventoryTypeDistributionDTO>({
    enabled: !!company && tab === 'inventario',
    mode: inventoryTypeDistributionMode,
    deps: [company?.id, backendQs, inventoryTypeDistributionMode],
    computeMock: () => mockApi.fetchInventoryTypeDistribution(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardInventoryTypeDistributionDTO>(DASHBOARD_BACKEND_ROUTES.inventoryTypeDistribution, backendQs, { signal }),
    fallbackToMock: false,
  });

  const inventorySubtypeDistributionQ = useDashboardQuery<DashboardInventorySubtypeDistributionDTO>({
    enabled: !!company && tab === 'inventario',
    mode: inventorySubtypeDistributionMode,
    deps: [company?.id, backendQs, inventorySubtypeDistributionMode],
    computeMock: () => mockApi.fetchInventorySubtypeDistribution(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardInventorySubtypeDistributionDTO>(DASHBOARD_BACKEND_ROUTES.inventorySubtypeDistribution, backendQs, { signal }),
    fallbackToMock: false,
  });

  const inventoryOpportunitySummaryQ = useDashboardQuery<DashboardInventoryOpportunitySummaryDTO>({
    enabled: !!company && tab === 'inventario',
    mode: inventoryOpportunitySummaryMode,
    deps: [company?.id, backendQs, inventoryOpportunitySummaryMode],
    computeMock: () => mockApi.fetchInventoryOpportunitySummary(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardInventoryOpportunitySummaryDTO>(DASHBOARD_BACKEND_ROUTES.inventoryOpportunitySummary, backendQs, { signal }),
    fallbackToMock: false,
  });

  const inventoryRankingQ = useDashboardQuery<DashboardInventoryRankingDTO>({
    enabled: !!company && tab === 'inventario',
    mode: inventoryRankingMode,
    deps: [company?.id, backendQs, inventoryRankingMode],
    computeMock: () => mockApi.fetchInventoryRanking(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardInventoryRankingDTO>(DASHBOARD_BACKEND_ROUTES.inventoryRanking, backendQs, { signal }),
  });

  const topClientsQ = useDashboardQuery<DashboardTopClientsDTO>({
    enabled: !!company && (tab === 'executivo' || tab === 'financeiro' || tab === 'clientes'),
    mode: topClientsMode,
    deps: [company?.id, backendQs, topClientsMode],
    computeMock: () => mockApi.fetchTopClients(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardTopClientsDTO>(DASHBOARD_BACKEND_ROUTES.topClients, backendQs, { signal }),
  });

  const agingQ = useDashboardQuery<DashboardReceivablesAgingSummaryDTO>({
    enabled: !!company && tab === 'financeiro',
    mode: agingMode,
    deps: [company?.id, backendQs, agingMode],
    computeMock: () => mockApi.fetchReceivablesAgingSummary(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardReceivablesAgingSummaryDTO>(DASHBOARD_BACKEND_ROUTES.receivablesAgingSummary, backendQs, { signal }),
  });

  const financialSummaryQ = useDashboardQuery<DashboardFinancialSummaryDTO>({
    enabled: !!company && tab === 'financeiro',
    mode: financialSummaryMode,
    deps: [company?.id, backendQs, financialSummaryMode],
    computeMock: () => mockApi.fetchFinancialSummary(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardFinancialSummaryDTO>(DASHBOARD_BACKEND_ROUTES.financialSummary, backendQs, { signal }),
  });

  const receivablesCompositionQ = useDashboardQuery<DashboardReceivablesCompositionDTO>({
    enabled: !!company && tab === 'financeiro',
    mode: receivablesCompositionMode,
    deps: [company?.id, backendQs, receivablesCompositionMode],
    computeMock: () => mockApi.fetchReceivablesComposition(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardReceivablesCompositionDTO>(DASHBOARD_BACKEND_ROUTES.receivablesComposition, backendQs, { signal }),
  });

  const criticalInvoicesQ = useDashboardQuery<DashboardCriticalInvoicesDTO>({
    enabled: !!company && tab === 'financeiro',
    mode: criticalInvoicesMode,
    deps: [company?.id, backendQs, criticalInvoicesMode],
    computeMock: () => mockApi.fetchCriticalInvoices(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardCriticalInvoicesDTO>(DASHBOARD_BACKEND_ROUTES.criticalInvoices, backendQs, { signal }),
  });

  const lateClientsQ = useDashboardQuery<DashboardLateClientsDTO>({
    enabled: !!company && (tab === 'financeiro' || tab === 'clientes'),
    mode: lateClientsMode,
    deps: [company?.id, backendQs, lateClientsMode],
    computeMock: () => mockApi.fetchLateClients(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardLateClientsDTO>(DASHBOARD_BACKEND_ROUTES.lateClients, backendQs, { signal }),
  });

  const largestOpenReceivablesQ = useDashboardQuery<DashboardLargestOpenReceivablesDTO>({
    enabled: !!company && tab === 'financeiro',
    mode: largestOpenReceivablesMode,
    deps: [company?.id, backendQs, largestOpenReceivablesMode],
    computeMock: () => mockApi.fetchLargestOpenReceivables(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardLargestOpenReceivablesDTO>(DASHBOARD_BACKEND_ROUTES.largestOpenReceivables, backendQs, { signal }),
  });

  const largestExpensesQ = useDashboardQuery<DashboardLargestExpensesDTO>({
    enabled: !!company && tab === 'financeiro',
    mode: largestExpensesMode,
    deps: [company?.id, backendQs, largestExpensesMode],
    computeMock: () => mockApi.fetchLargestExpenses(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardLargestExpensesDTO>(DASHBOARD_BACKEND_ROUTES.largestExpenses, backendQs, { signal }),
  });

  const clientsSummaryQ = useDashboardQuery<DashboardClientsSummaryDTO>({
    enabled: !!company && tab === 'clientes',
    mode: clientsSummaryMode,
    deps: [company?.id, backendQs, clientsSummaryMode],
    computeMock: () => mockApi.fetchClientsSummary(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardClientsSummaryDTO>(DASHBOARD_BACKEND_ROUTES.clientsSummary, backendQs, { signal }),
    fallbackToMock: false,
  });

  const clientsTopCampaignsQ = useDashboardQuery<DashboardClientsTopCampaignsDTO>({
    enabled: !!company && tab === 'clientes',
    mode: clientsTopCampaignsMode,
    deps: [company?.id, backendQs, clientsTopCampaignsMode],
    computeMock: () => mockApi.fetchClientsTopCampaigns(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardClientsTopCampaignsDTO>(DASHBOARD_BACKEND_ROUTES.clientsTopCampaigns, backendQs, { signal }),
    fallbackToMock: false,
  });

  const clientsOpenProposalsQ = useDashboardQuery<DashboardClientsOpenProposalsDTO>({
    enabled: !!company && tab === 'clientes',
    mode: clientsOpenProposalsMode,
    deps: [company?.id, backendQs, clientsOpenProposalsMode],
    computeMock: () => mockApi.fetchClientsOpenProposals(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardClientsOpenProposalsDTO>(DASHBOARD_BACKEND_ROUTES.clientsOpenProposals, backendQs, { signal }),
    fallbackToMock: false,
  });

  const clientsInactiveRiskQ = useDashboardQuery<DashboardClientsInactiveRiskDTO>({
    enabled: !!company && tab === 'clientes',
    mode: clientsInactiveRiskMode,
    deps: [company?.id, backendQs, clientsInactiveRiskMode],
    computeMock: () => mockApi.fetchClientsInactiveRisk(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardClientsInactiveRiskDTO>(DASHBOARD_BACKEND_ROUTES.clientsInactiveRisk, backendQs, { signal }),
    fallbackToMock: false,
  });

  const clientsRegionDistributionQ = useDashboardQuery<DashboardClientsRegionDistributionDTO>({
    enabled: !!company && tab === 'clientes',
    mode: clientsRegionDistributionMode,
    deps: [company?.id, backendQs, clientsRegionDistributionMode],
    computeMock: () => mockApi.fetchClientsRegionDistribution(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardClientsRegionDistributionDTO>(DASHBOARD_BACKEND_ROUTES.clientsRegionDistribution, backendQs, { signal }),
    fallbackToMock: false,
  });

  const oohOpsQ = useDashboardQuery<DashboardOohOpsSummaryDTO>({
    enabled: !!company && (tab === 'executivo' || tab === 'operacoes'),
    mode: oohOpsMode,
    deps: [company?.id, backendQs, oohOpsMode],
    computeMock: () => mockApi.fetchOohOpsSummary(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardOohOpsSummaryDTO>(DASHBOARD_BACKEND_ROUTES.oohOpsSummary, backendQs, { signal }),
  });

  const operationsLateRegionsQ = useDashboardQuery<DashboardOperationsLateRegionsDTO>({
    enabled: !!company && tab === 'operacoes',
    mode: operationsLateRegionsMode,
    deps: [company?.id, backendQs, operationsLateRegionsMode],
    computeMock: () => mockApi.fetchOperationsLateRegions(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardOperationsLateRegionsDTO>(DASHBOARD_BACKEND_ROUTES.operationsLateRegions, backendQs, { signal }),
  });

  const operationsCityStatusQ = useDashboardQuery<DashboardOperationsCityStatusDTO>({
    enabled: !!company && tab === 'operacoes',
    mode: operationsCityStatusMode,
    deps: [company?.id, backendQs, operationsCityStatusMode],
    computeMock: () => mockApi.fetchOperationsCityStatus(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardOperationsCityStatusDTO>(DASHBOARD_BACKEND_ROUTES.operationsCityStatus, backendQs, { signal }),
  });

  const doohSummaryQ = useDashboardQuery<DashboardDoohSummaryDTO>({
    enabled: !!company && tab === 'operacoes',
    mode: doohSummaryMode,
    deps: [company?.id, backendQs, doohSummaryMode],
    computeMock: () => mockApi.fetchDoohSummary(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardDoohSummaryDTO>(DASHBOARD_BACKEND_ROUTES.doohSummary, backendQs, { signal }),
  });

  // Etapa 15: cache local por (empresa + filtros) para evitar flicker em refetch
  const overview = useCachedQueryData<DashboardOverviewDTO>(`overview:${company?.id || ''}:${backendQs}`, overviewQ);
  const funnel = useCachedQueryData<DashboardFunnelDTO>(`funnel:${company?.id || ''}:${backendQs}`, funnelQ);
  const commercialSummary = useCachedQueryData<DashboardCommercialSummaryDTO>(
    `commercialSummary:${company?.id || ''}:${backendQs}`,
    commercialSummaryQ,
  );
  const alertsDto = useCachedQueryData<DashboardAlertsDTO>(`alerts:${company?.id || ''}:${backendQs}`, alertsQ);
  const alerts = alertsDto || [];

  const revenueTsDto = useCachedQueryData<DashboardTimeseriesDTO>(`revenueTs:${company?.id || ''}:${backendQs}`, revenueTsQ);
  const cashflowTsDto = useCachedQueryData<DashboardTimeseriesDTO>(`cashflowTs:${company?.id || ''}:${backendQs}`, cashflowTsQ);
  const inventorySummaryDto = useCachedQueryData<DashboardInventorySummaryDTO>(
    `inventorySummary:${company?.id || ''}:${backendQs}`,
    inventorySummaryQ,
  );
  const inventoryMapDto = useCachedQueryData<DashboardInventoryMapDTO>(`inventoryMap:${company?.id || ''}:${backendQs}`, inventoryMapQ);
  const inventoryRegionDistributionDto = useCachedQueryData<DashboardInventoryRegionDistributionDTO>(
    `inventoryRegionDistribution:${company?.id || ''}:${backendQs}`,
    inventoryRegionDistributionQ,
  );
  const inventoryTypeDistributionDto = useCachedQueryData<DashboardInventoryTypeDistributionDTO>(
    `inventoryTypeDistribution:${company?.id || ''}:${backendQs}`,
    inventoryTypeDistributionQ,
  );
  const inventorySubtypeDistributionDto = useCachedQueryData<DashboardInventorySubtypeDistributionDTO>(
    `inventorySubtypeDistribution:${company?.id || ''}:${backendQs}`,
    inventorySubtypeDistributionQ,
  );
  const inventoryOpportunitySummaryDto = useCachedQueryData<DashboardInventoryOpportunitySummaryDTO>(
    `inventoryOpportunitySummary:${company?.id || ''}:${backendQs}`,
    inventoryOpportunitySummaryQ,
  );
  const inventoryRankingDto = useCachedQueryData<DashboardInventoryRankingDTO>(
    `inventoryRanking:${company?.id || ''}:${backendQs}`,
    inventoryRankingQ,
  );

  const topClientsDto = useCachedQueryData<DashboardTopClientsDTO>(`topClients:${company?.id || ''}:${backendQs}`, topClientsQ);
  const agingSummary = useCachedQueryData<DashboardReceivablesAgingSummaryDTO>(`aging:${company?.id || ''}:${backendQs}`, agingQ);
  const financialSummary = useCachedQueryData<DashboardFinancialSummaryDTO>(`financialSummary:${company?.id || ''}:${backendQs}`, financialSummaryQ);
  const receivablesComposition = useCachedQueryData<DashboardReceivablesCompositionDTO>(`receivablesComposition:${company?.id || ''}:${backendQs}`, receivablesCompositionQ);
  const criticalInvoicesDto = useCachedQueryData<DashboardCriticalInvoicesDTO>(`criticalInvoices:${company?.id || ''}:${backendQs}`, criticalInvoicesQ);
  const lateClientsDto = useCachedQueryData<DashboardLateClientsDTO>(`lateClients:${company?.id || ''}:${backendQs}`, lateClientsQ);
  const largestOpenReceivablesDto = useCachedQueryData<DashboardLargestOpenReceivablesDTO>(`largestOpenReceivables:${company?.id || ''}:${backendQs}`, largestOpenReceivablesQ);
  const largestExpensesDto = useCachedQueryData<DashboardLargestExpensesDTO>(`largestExpenses:${company?.id || ''}:${backendQs}`, largestExpensesQ);
  const clientsSummaryDto = useCachedQueryData<DashboardClientsSummaryDTO>(`clientsSummary:${company?.id || ''}:${backendQs}`, clientsSummaryQ);
  const clientsTopCampaignsDto = useCachedQueryData<DashboardClientsTopCampaignsDTO>(`clientsTopCampaigns:${company?.id || ''}:${backendQs}`, clientsTopCampaignsQ);
  const clientsOpenProposalsDto = useCachedQueryData<DashboardClientsOpenProposalsDTO>(`clientsOpenProposals:${company?.id || ''}:${backendQs}`, clientsOpenProposalsQ);
  const clientsInactiveRiskDto = useCachedQueryData<DashboardClientsInactiveRiskDTO>(`clientsInactiveRisk:${company?.id || ''}:${backendQs}`, clientsInactiveRiskQ);
  const clientsRegionDistributionDto = useCachedQueryData<DashboardClientsRegionDistributionDTO>(`clientsRegionDistribution:${company?.id || ''}:${backendQs}`, clientsRegionDistributionQ);
  const oohOpsDto = useCachedQueryData<DashboardOohOpsSummaryDTO>(`oohOps:${company?.id || ''}:${backendQs}`, oohOpsQ);
  const operationsLateRegionsDto = useCachedQueryData<DashboardOperationsLateRegionsDTO>(
    `operationsLateRegions:${company?.id || ''}:${backendQs}`,
    operationsLateRegionsQ,
  );
  const operationsCityStatusDto = useCachedQueryData<DashboardOperationsCityStatusDTO>(
    `operationsCityStatus:${company?.id || ''}:${backendQs}`,
    operationsCityStatusQ,
  );
  const doohSummaryDto = useCachedQueryData<DashboardDoohSummaryDTO>(`doohSummary:${company?.id || ''}:${backendQs}`, doohSummaryQ);

  const stalledProposalsDto = useCachedQueryData<DashboardStalledProposalsDTO>(
    `stalledProposals:${company?.id || ''}:${backendQs}`,
    stalledProposalsQ,
  );
  const sellerRankingDto = useCachedQueryData<DashboardSellerRankingDTO>(
    `sellerRanking:${company?.id || ''}:${backendQs}`,
    sellerRankingQ,
  );
  const commercialProposalsTimeseriesDto = useCachedQueryData<DashboardCommercialProposalsTimeseriesDTO>(
    `commercialProposalsTimeseries:${company?.id || ''}:${backendQs}`,
    commercialProposalsTimeseriesQ,
  );
  const commercialHighValueOpenDto = useCachedQueryData<DashboardHighValueOpenProposalsDTO>(
    `commercialHighValueOpen:${company?.id || ''}:${backendQs}`,
    commercialHighValueOpenQ,
  );

  const revenueTs = revenueTsDto?.points || [];
  const cashflowTs = cashflowTsDto?.points || [];
  const inventoryPins = inventoryMapDto?.pins || [];
  const inventoryRegionRows = inventoryRegionDistributionDto?.rows || [];
  const inventoryTypeRows = inventoryTypeDistributionDto?.rows || [];
  const inventorySubtypeRows = inventorySubtypeDistributionDto?.rows || [];
  const inventoryOpportunityRows = inventoryOpportunitySummaryDto?.rows || [];
  const inventoryRankingRows = inventoryRankingDto?.rows || [];
  const inventoryFallbackSummary = useMemo(() => {
    const totalUnits = inventoryPins.reduce((sum, pin) => sum + (pin.unitsCount || 0), 0);
    const availableUnits = inventoryPins.reduce((sum, pin) => sum + (pin.availableUnitsCount || 0), 0);
    const occupiedUnits = Math.max(0, totalUnits - availableUnits);
    return {
      totalPoints: inventoryPins.length,
      totalUnits,
      occupancyPercent: totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : inventoryPins.length
        ? Math.round(inventoryPins.reduce((sum, pin) => sum + (pin.occupancyPercent || 0), 0) / inventoryPins.length)
        : overview?.occupancyPercent ?? 0,
      activeCitiesCount: new Set(inventoryPins.map((pin) => `${pin.city || ''}:${pin.state || ''}`).filter(Boolean)).size,
      pointsWithAvailabilityCount: inventoryPins.filter((pin) => (pin.availableUnitsCount || 0) > 0 || (pin.occupancyPercent || 0) < 100).length,
      activeCampaignsCount: inventoryPins.reduce((sum, pin) => sum + (pin.activeCampaigns || 0), 0),
    };
  }, [inventoryPins, overview?.occupancyPercent]);
  const inventorySummary = inventorySummaryDto ?? inventoryFallbackSummary;

  const topClientsRows = topClientsDto?.rows || [];
  const criticalInvoicesRows = criticalInvoicesDto?.rows || [];
  const lateClientsRows = lateClientsDto?.rows || [];
  const largestOpenReceivablesRows = largestOpenReceivablesDto?.rows || [];
  const largestExpensesRows = largestExpensesDto?.rows || [];
  const clientsSummary = clientsSummaryDto || undefined;
  const clientsTopCampaignRows = clientsTopCampaignsDto?.rows || [];
  const clientsOpenProposalRows = clientsOpenProposalsDto?.rows || [];
  const clientsInactiveRiskRows = clientsInactiveRiskDto?.rows || [];
  const clientsWithoutCampaignRows = useMemo(() => clientsInactiveRiskRows.filter((row) => !row.hasActiveCampaign), [clientsInactiveRiskRows]);
  const clientsRegionRows = clientsRegionDistributionDto?.rows || [];
  const oohOpsItems = oohOpsDto?.items || [];
  const operationsLateRegionRows = operationsLateRegionsDto?.rows || [];
  const operationsCityStatusRows = operationsCityStatusDto?.rows || [];
  const doohSummaryRows = doohSummaryDto?.rows || [];
  const stalledProposalsRows = stalledProposalsDto?.rows || [];
  const sellerRankingRows = sellerRankingDto?.rows || [];
  const commercialProposalsSeries = commercialProposalsTimeseriesDto?.points || [];
  const highValueOpenRows = commercialHighValueOpenDto?.rows || [];
  const pipelineBySellerRows = useMemo(
    () => [...sellerRankingRows].sort((a, b) => (b.amountPipelineCents || 0) - (a.amountPipelineCents || 0)),
    [sellerRankingRows],
  );

  const oohOpsSummary = useMemo(() => {
    if (oohOpsDto?.summary) return oohOpsDto.summary;
    const companySeed = String(company?.id || 'dashboard');
    if (oohOpsQ.source === 'mock' || oohOpsQ.source === 'mock-fallback') {
      return {
        campaignsActiveCount: oohOpsItems.length,
        awaitingMaterialCount: oohOpsItems.filter((item) => item.awaitingMaterial).length,
        installationCount: oohOpsItems.filter((item) => item.inInstallation).length,
        pendingCheckinsCount: oohOpsItems.filter((item) => (item.missingCheckinsCount || 0) > 0 && !item.overdue).length,
        overdueCheckinsCount: oohOpsItems.filter((item) => (item.missingCheckinsCount || 0) > 0 && !!item.overdue).length,
      };
    }
    return {
      campaignsActiveCount: oohOpsItems.length,
      awaitingMaterialCount: oohOpsItems.filter((item) => item.awaitingMaterial).length,
      installationCount: oohOpsItems.filter((item) => item.inInstallation).length,
      pendingCheckinsCount: oohOpsItems.filter((item) => (item.missingCheckinsCount || 0) > 0 && !item.overdue).length,
      overdueCheckinsCount: oohOpsItems.filter((item) => (item.missingCheckinsCount || 0) > 0 && !!item.overdue).length,
    };
  }, [company?.id, oohOpsDto?.summary, oohOpsItems, oohOpsQ.source]);

  const doohOpsSummary = useMemo(() => {
    if (doohSummaryDto?.summary) return doohSummaryDto.summary;
    const companySeed = String(company?.id || 'dashboard');
    if (doohSummaryQ.source === 'mock' || doohSummaryQ.source === 'mock-fallback') {
      return {
        screenCount: doohSummaryRows.length,
        activeCampaignsCount: doohSummaryRows.reduce((sum, row) => sum + (row.activeCampaignsCount || row.plays || 0), 0),
        healthScoreAvg: 92 + (seedNumber(`${companySeed}:upt`) % 7),
        lowActivityCount: seedNumber(`${companySeed}:off`) % 9,
        offlineCount: seedNumber(`${companySeed}:off`) % 9,
      };
    }
    return {
      screenCount: doohSummaryRows.length,
      activeCampaignsCount: doohSummaryRows.reduce((sum, row) => sum + (row.activeCampaignsCount || row.plays || 0), 0),
      healthScoreAvg: doohSummaryRows.length
        ? Math.round(doohSummaryRows.reduce((sum, row) => sum + (row.healthScorePercent || row.uptimePercent || 0), 0) / doohSummaryRows.length)
        : 0,
      lowActivityCount: doohSummaryRows.filter((row) => (row.healthScorePercent || row.uptimePercent || 0) < 80).length,
      offlineCount: doohSummaryRows.filter((row) => (row.healthScorePercent || row.uptimePercent || 0) < 80).length,
    };
  }, [company?.id, doohSummaryDto?.summary, doohSummaryQ.source, doohSummaryRows]);

  const criticalCampaignRows = useMemo(
    () => oohOpsItems.filter((item) => (item.priority || 'LOW') !== 'LOW'),
    [oohOpsItems],
  );
  const overdueInstallationRows = useMemo(
    () => oohOpsItems.filter((item) => !!item.inInstallation && !!item.overdue),
    [oohOpsItems],
  );
  const missingCheckinRows = useMemo(
    () => oohOpsItems.filter((item) => (item.missingCheckinsCount || 0) > 0),
    [oohOpsItems],
  );

  const [tabRefreshState, setTabRefreshState] = useState<
    Partial<Record<DashboardTab, { marker: string; at: string }>>
  >({});

  const currentTabDataContext = useMemo(() => {
    switch (tab) {
      case 'executivo': {
        const sources = uniqueSources([
          overviewQ.source,
          alertsQ.source,
          revenueTsQ.source,
          cashflowTsQ.source,
          funnelQ.source,
          inventoryMapQ.source,
          oohOpsQ.source,
        ]);
        const ready =
          !!overview &&
          alertsQ.status === 'ready' &&
          revenueTsQ.status === 'ready' &&
          cashflowTsQ.status === 'ready' &&
          funnelQ.status === 'ready' &&
          inventoryMapQ.status === 'ready' &&
          oohOpsQ.status === 'ready';
        return {
          ready,
          sources,
          marker: ready
            ? `${backendQs}|executivo|${sources.join('|')}|${overview?.revenueRecognizedCents ?? 0}|${alerts.length}|${revenueTs.length}|${cashflowTs.length}`
            : '',
        };
      }
      case 'comercial': {
        const sources = uniqueSources([
          commercialSummaryQ.source,
          funnelQ.source,
          sellerRankingQ.source,
          stalledProposalsQ.source,
          commercialProposalsTimeseriesQ.source,
          commercialHighValueOpenQ.source,
        ]);
        const ready =
          !!commercialSummary &&
          funnelQ.status === 'ready' &&
          sellerRankingQ.status === 'ready' &&
          stalledProposalsQ.status === 'ready' &&
          commercialProposalsTimeseriesQ.status === 'ready' &&
          commercialHighValueOpenQ.status === 'ready';
        return {
          ready,
          sources,
          marker: ready
            ? `${backendQs}|comercial|${sources.join('|')}|${commercialSummary?.proposalsCreatedCount ?? 0}|${sellerRankingRows.length}|${stalledProposalsRows.length}|${highValueOpenRows.length}`
            : '',
        };
      }
      case 'financeiro': {
        const sources = uniqueSources([
          financialSummaryQ.source,
          revenueTsQ.source,
          agingQ.source,
          cashflowTsQ.source,
          receivablesCompositionQ.source,
          criticalInvoicesQ.source,
          lateClientsQ.source,
          largestOpenReceivablesQ.source,
          largestExpensesQ.source,
          topClientsQ.source,
        ]);
        const ready =
          !!financialSummary &&
          revenueTsQ.status === 'ready' &&
          agingQ.status === 'ready' &&
          cashflowTsQ.status === 'ready' &&
          receivablesCompositionQ.status === 'ready' &&
          criticalInvoicesQ.status === 'ready' &&
          lateClientsQ.status === 'ready' &&
          largestOpenReceivablesQ.status === 'ready' &&
          largestExpensesQ.status === 'ready' &&
          topClientsQ.status === 'ready';
        return {
          ready,
          sources,
          marker: ready
            ? `${backendQs}|financeiro|${sources.join('|')}|${financialSummary?.revenueRecognizedCents ?? 0}|${criticalInvoicesRows.length}|${lateClientsRows.length}`
            : '',
        };
      }
      case 'operacoes': {
        const sources = uniqueSources([
          oohOpsQ.source,
          doohSummaryQ.source,
          operationsLateRegionsQ.source,
          operationsCityStatusQ.source,
        ]);
        const ready =
          oohOpsQ.status === 'ready' &&
          doohSummaryQ.status === 'ready' &&
          operationsLateRegionsQ.status === 'ready' &&
          operationsCityStatusQ.status === 'ready';
        return {
          ready,
          sources,
          marker: ready
            ? `${backendQs}|operacoes|${sources.join('|')}|${oohOpsItems.length}|${doohSummaryRows.length}|${operationsLateRegionRows.length}|${operationsCityStatusRows.length}`
            : '',
        };
      }
      case 'inventario': {
        const sources = uniqueSources([
          inventorySummaryQ.source,
          inventoryMapQ.source,
          inventoryRankingQ.source,
          inventoryRegionDistributionQ.source,
          inventoryTypeDistributionQ.source,
          inventorySubtypeDistributionQ.source,
          inventoryOpportunitySummaryQ.source,
        ]);
        const ready =
          inventorySummaryQ.status === 'ready' &&
          inventoryMapQ.status === 'ready' &&
          inventoryRankingQ.status === 'ready' &&
          inventoryRegionDistributionQ.status === 'ready' &&
          inventoryTypeDistributionQ.status === 'ready' &&
          inventorySubtypeDistributionQ.status === 'ready' &&
          inventoryOpportunitySummaryQ.status === 'ready';
        return {
          ready,
          sources,
          marker: ready
            ? `${backendQs}|inventario|${sources.join('|')}|${inventoryPins.length}|${inventoryRankingRows.length}|${inventoryOpportunityRows.length}`
            : '',
        };
      }
      case 'clientes': {
        const sources = uniqueSources([
          clientsSummaryQ.source,
          topClientsQ.source,
          clientsTopCampaignsQ.source,
          lateClientsQ.source,
          clientsOpenProposalsQ.source,
          clientsInactiveRiskQ.source,
          clientsRegionDistributionQ.source,
        ]);
        const ready =
          clientsSummaryQ.status === 'ready' &&
          topClientsQ.status === 'ready' &&
          clientsTopCampaignsQ.status === 'ready' &&
          lateClientsQ.status === 'ready' &&
          clientsOpenProposalsQ.status === 'ready' &&
          clientsInactiveRiskQ.status === 'ready' &&
          clientsRegionDistributionQ.status === 'ready';
        return {
          ready,
          sources,
          marker: ready
            ? `${backendQs}|clientes|${sources.join('|')}|${clientsSummary?.activeClientsCount ?? 0}|${topClientsRows.length}|${clientsInactiveRiskRows.length}`
            : '',
        };
      }
      default:
        return { ready: false, sources: [], marker: '' };
    }
  }, [
    tab,
    backendQs,
    overview,
    alerts.length,
    revenueTs.length,
    cashflowTs.length,
    commercialSummary,
    sellerRankingRows.length,
    stalledProposalsRows.length,
    highValueOpenRows.length,
    financialSummary,
    criticalInvoicesRows.length,
    lateClientsRows.length,
    oohOpsItems.length,
    doohSummaryRows.length,
    operationsLateRegionRows.length,
    operationsCityStatusRows.length,
    inventoryPins.length,
    inventoryRankingRows.length,
    inventoryOpportunityRows.length,
    clientsSummary,
    topClientsRows.length,
    clientsInactiveRiskRows.length,
    overviewQ.source,
    alertsQ.source,
    revenueTsQ.source,
    cashflowTsQ.source,
    funnelQ.source,
    inventoryMapQ.source,
    oohOpsQ.source,
    commercialSummaryQ.source,
    sellerRankingQ.source,
    stalledProposalsQ.source,
    commercialProposalsTimeseriesQ.source,
    commercialHighValueOpenQ.source,
    financialSummaryQ.source,
    agingQ.source,
    receivablesCompositionQ.source,
    criticalInvoicesQ.source,
    lateClientsQ.source,
    largestOpenReceivablesQ.source,
    largestExpensesQ.source,
    topClientsQ.source,
    doohSummaryQ.source,
    operationsLateRegionsQ.source,
    operationsCityStatusQ.source,
    inventorySummaryQ.source,
    inventoryRankingQ.source,
    inventoryRegionDistributionQ.source,
    inventoryTypeDistributionQ.source,
    inventorySubtypeDistributionQ.source,
    inventoryOpportunitySummaryQ.source,
    clientsSummaryQ.source,
    clientsTopCampaignsQ.source,
    clientsOpenProposalsQ.source,
    clientsInactiveRiskQ.source,
    clientsRegionDistributionQ.source,
    alertsQ.status,
    revenueTsQ.status,
    cashflowTsQ.status,
    funnelQ.status,
    inventoryMapQ.status,
    oohOpsQ.status,
    commercialSummaryQ.status,
    sellerRankingQ.status,
    stalledProposalsQ.status,
    commercialProposalsTimeseriesQ.status,
    commercialHighValueOpenQ.status,
    financialSummaryQ.status,
    agingQ.status,
    receivablesCompositionQ.status,
    criticalInvoicesQ.status,
    lateClientsQ.status,
    largestOpenReceivablesQ.status,
    largestExpensesQ.status,
    topClientsQ.status,
    doohSummaryQ.status,
    operationsLateRegionsQ.status,
    operationsCityStatusQ.status,
    inventorySummaryQ.status,
    inventoryRankingQ.status,
    inventoryRegionDistributionQ.status,
    inventoryTypeDistributionQ.status,
    inventorySubtypeDistributionQ.status,
    inventoryOpportunitySummaryQ.status,
    clientsSummaryQ.status,
    clientsTopCampaignsQ.status,
    clientsOpenProposalsQ.status,
    clientsInactiveRiskQ.status,
    clientsRegionDistributionQ.status,
  ]);

  useEffect(() => {
    if (!currentTabDataContext.ready || !currentTabDataContext.marker) return;
    setTabRefreshState((prev) => {
      const current = prev[tab];
      if (current?.marker === currentTabDataContext.marker) return prev;
      return {
        ...prev,
        [tab]: { marker: currentTabDataContext.marker, at: new Date().toISOString() },
      };
    });
  }, [tab, currentTabDataContext]);

  const currentTabLastUpdated = tabRefreshState[tab]?.at;

  const executiveRegionRows = useMemo(() => {
    const grouped = new Map<string, { region: string; points: number; occupancySum: number }>();

    for (const pin of inventoryPins) {
      const region = String(pin.region || pin.city || 'Sem região').trim() || 'Sem região';
      const current = grouped.get(region) ?? { region, points: 0, occupancySum: 0 };
      current.points += 1;
      current.occupancySum += pin.occupancyPercent || 0;
      grouped.set(region, current);
    }

    return Array.from(grouped.values())
      .map((row) => ({
        region: row.region,
        points: row.points,
        occupancyPercent: row.points ? Math.round(row.occupancySum / row.points) : 0,
      }))
      .sort((a, b) => {
        if (a.occupancyPercent !== b.occupancyPercent) return a.occupancyPercent - b.occupancyPercent;
        return b.points - a.points;
      });
  }, [inventoryPins]);

  const lowestOccupancyRegion = executiveRegionRows[0];
  const highestOccupancyRegion = executiveRegionRows.length ? executiveRegionRows[executiveRegionRows.length - 1] : undefined;

  const executiveClientConcentration = useMemo(() => {
    const total = topClientsRows.reduce((sum, row) => sum + (row.amountCents || 0), 0);
    const lead = topClientsRows[0];
    if (!lead || total <= 0) return 0;
    return Math.round((lead.amountCents / total) * 100);
  }, [topClientsRows]);

  const executivePriorityCount =
    (oohOpsSummary.pendingCheckinsCount || 0) +
    (oohOpsSummary.overdueCheckinsCount || 0) +
    (oohOpsSummary.awaitingMaterialCount || 0);

  const metricsCtx = useMemo(
    () => ({ companyId: company?.id ? String(company.id) : undefined, tab, backendQs }),
    [company?.id, tab, backendQs],
  );

  useWidgetMetrics('overview', overviewQ, metricsCtx);
  useWidgetMetrics('alerts', alertsQ, metricsCtx);
  useWidgetMetrics('funnel', funnelQ, metricsCtx);
  useWidgetMetrics('commercialSummary', commercialSummaryQ, metricsCtx);
  useWidgetMetrics('stalledProposals', stalledProposalsQ, metricsCtx);
  useWidgetMetrics('sellerRanking', sellerRankingQ, metricsCtx);
  useWidgetMetrics('commercialProposalsTimeseries', commercialProposalsTimeseriesQ, metricsCtx);
  useWidgetMetrics('commercialHighValueOpen', commercialHighValueOpenQ, metricsCtx);
  useWidgetMetrics('revenueTs', revenueTsQ, metricsCtx);
  useWidgetMetrics('cashflowTs', cashflowTsQ, metricsCtx);
  useWidgetMetrics('topClients', topClientsQ, metricsCtx);
  useWidgetMetrics('aging', agingQ, metricsCtx);
  useWidgetMetrics('financialSummary', financialSummaryQ, metricsCtx);
  useWidgetMetrics('receivablesComposition', receivablesCompositionQ, metricsCtx);
  useWidgetMetrics('criticalInvoices', criticalInvoicesQ, metricsCtx);
  useWidgetMetrics('lateClients', lateClientsQ, metricsCtx);
  useWidgetMetrics('largestOpenReceivables', largestOpenReceivablesQ, metricsCtx);
  useWidgetMetrics('largestExpenses', largestExpensesQ, metricsCtx);
  useWidgetMetrics('clientsSummary', clientsSummaryQ, metricsCtx);
  useWidgetMetrics('clientsTopCampaigns', clientsTopCampaignsQ, metricsCtx);
  useWidgetMetrics('clientsOpenProposals', clientsOpenProposalsQ, metricsCtx);
  useWidgetMetrics('clientsInactiveRisk', clientsInactiveRiskQ, metricsCtx);
  useWidgetMetrics('clientsRegionDistribution', clientsRegionDistributionQ, metricsCtx);
  useWidgetMetrics('oohOps', oohOpsQ, metricsCtx);
  useWidgetMetrics('operationsLateRegions', operationsLateRegionsQ, metricsCtx);
  useWidgetMetrics('operationsCityStatus', operationsCityStatusQ, metricsCtx);
  useWidgetMetrics('doohSummary', doohSummaryQ, metricsCtx);
  useWidgetMetrics('inventoryMap', inventoryMapQ, metricsCtx);
  useWidgetMetrics('inventoryRanking', inventoryRankingQ, metricsCtx);
  useWidgetMetrics('drilldown', drilldownQ, metricsCtx);

  useEffect(() => {
    runDashboardQaChecksOnce();
  }, []);

  // Etapa 16: em modo compact, forca apenas a aba Executivo (menos risco / menos complexidade).
  useEffect(() => {
    if (rollout.variant !== 'compact') return;
    if (tab !== 'executivo') setTab('executivo');
  }, [rollout.variant, tab]);

  // Etapa 16: fallback/rollback de dados — se estivermos em backend e cair em erro/fallback,
  // trocamos para mock na sessao (para nao travar o dashboard em producao).
  useEffect(() => {
    if (dataMode !== 'backend') return;
    const critical = [overviewQ, alertsQ].some((q) => {
      const src = String((q as any)?.source || '');
      return q.status === 'error' || src.includes('fallback');
    });
    if (!critical) return;

    setDataMode('mock');
    try {
      sessionStorage.setItem('oneMedia.dashboard.dataMode.session', 'mock');
    } catch {
      // ignore
    }

    toast.error('Dashboard em prévia local', {
      description: 'Alguns widgets não responderam no backend. Mantivemos a leitura estável enquanto a integração é revisada.',
    });
  }, [dataMode, overviewQ.status, alertsQ.status, (overviewQ as any).source, (alertsQ as any).source]);


  // URL pública do mapa (mock)
  const publicMapUrl = useMemo(() => {
    if (!company) return '';
    return mockApi.getPublicMapUrl(company.id);
  }, [company]);

  // Reset drilldown when tab changes (evita confusão)
  useEffect(() => {
    setDrilldown(() => ({
      open: false,
      key: undefined,
      title: '',
      rows: [],
      hint: undefined,
      status: 'idle',
      errorMessage: undefined,
      sortBy: undefined,
      sortDir: undefined,
      cursor: undefined,
      nextCursor: undefined,
      hasMore: false,
      totalCount: undefined,
      pageSize: undefined,
      search: '',
    }));
  }, [tab]);

  // Etapa 12: aplica permissoes - garante que a aba atual eh permitida
  useEffect(() => {
    if (!perms.allowedTabs.includes(tab)) {
      setTab(perms.allowedTabs[0] || 'executivo');
    }
  }, [allowedTabsKey, tab]);

  // Etapa 12: carrega visoes salvas do localStorage (por usuario/empresa)
  useEffect(() => {
    if (!perms.canManageSavedViews) return;
    if (!companyKey || !userKey) return;
    const nextViews = loadSavedViews(companyKey, userKey);
    setSavedViews(nextViews);
    const persistedId = loadActiveSavedViewId(companyKey, userKey);
    if (persistedId && nextViews.some((view) => view.id === persistedId)) {
      setActiveViewId(persistedId);
    }
  }, [companyKey, userKey, perms.canManageSavedViews]);

  useEffect(() => {
    if (!perms.canManageSavedViews) return;
    if (!companyKey || !userKey) return;
    persistActiveSavedViewId(companyKey, userKey, activeViewId);
  }, [activeViewId, companyKey, userKey, perms.canManageSavedViews]);

  // Se a visao ativa sumir (ex: foi deletada em outra aba), limpa selecao
  useEffect(() => {
    if (!activeViewId) return;
    if (!savedViews.some((v) => v.id === activeViewId)) setActiveViewId('');
  }, [activeViewId, savedViews]);

  const smartEmpty = (base: string) => smartEmptyDescription(filters, base);

  if (!company || !user) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Carregando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Copia o link do mapa público para a área de transferência
   */
  const handleCopyMapLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(publicMapUrl);
        setCopied(true);
        toast.success('Link do mapa copiado para a área de transferência!');
        setTimeout(() => setCopied(false), 2000);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = publicMapUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand('copy');
          if (successful) {
            setCopied(true);
            toast.success('Link do mapa copiado para a área de transferência!');
            setTimeout(() => setCopied(false), 2000);
          } else {
            toast.error('Não foi possível copiar. Por favor, copie manualmente.');
          }
        } catch {
          toast.error('Não foi possível copiar. Por favor, copie manualmente.');
        }

        document.body.removeChild(textArea);
      }
    } catch {
      toast.error('Não foi possível copiar. Por favor, copie manualmente.');
    }
  };

  const handleCopyParityChecklist = async () => {
    try {
      const text = parityChecklistToText();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success('Checklist de paridade copiado!');
        return;
      }
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (ok) toast.success('Checklist de paridade copiado!');
      else toast.error('Não foi possível copiar.');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  const openDrilldown = (title: string, key: string, hint?: string, params?: Record<string, string | undefined>) => {
    const cleanParams: Record<string, string> = {};
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (typeof v === 'string' && v.length > 0) cleanParams[k] = v;
      }
    }

    const spec = getDrilldownSpec(key);
    const sortBy = spec.defaultSort?.by;
    const sortDir = spec.defaultSort?.dir;

    const autoHint = 'Detalhamento com paginação, ordenação e os filtros atuais aplicados.';

    setDrilldown({
      open: true,
      key,
      params: Object.keys(cleanParams).length ? cleanParams : undefined,
      title,
      rows: [],
      hint: hint ? `${hint} • ${autoHint}` : autoHint,
      status: 'loading',
      errorMessage: undefined,
      sortBy,
      sortDir,
      cursor: undefined,
      nextCursor: undefined,
      hasMore: false,
      totalCount: undefined,
      pageSize: undefined,
      search: '',
    });
  };

  // Etapa 13: exportacoes reais
  const buildExportMeta = (extra?: Array<{ label: string; value: string }>) => {
    const name = String((company as any)?.name ?? (company as any)?.title ?? (company as any)?.label ?? (company as any)?.id ?? 'Empresa');
    const period = `${formatShortDate(backendQuery.dateFrom)} - ${formatShortDate(backendQuery.dateTo)}`;
    const base: Array<{ label: string; value: string }> = [
      { label: 'Empresa', value: name },
      { label: 'Aba', value: tabLabel(tab) },
      { label: 'Período', value: period },
      { label: 'Tipo', value: String(filters.mediaType) },
    ];
    if (filters.query) base.push({ label: 'Busca', value: String(filters.query) });
    if (filters.city) base.push({ label: 'Cidade', value: String(filters.city) });
    return [...(extra || []), ...base];
  };

  const exportViewPdf = (kind: 'view' | 'monthly') => {
    const el = document.getElementById('dashboard-export-root');
    if (!el) {
      toast.error('Não foi possível exportar PDF: área do dashboard não encontrada');
      return;
    }

    const month = String(backendQuery.dateTo).slice(0, 7);
    const title = kind === 'monthly' ? `Snapshot mensal — ${tabLabel(tab)}` : `Dashboard — ${tabLabel(tab)}`;
    const subtitle = String((company as any)?.name ?? (company as any)?.title ?? (company as any)?.label ?? (company as any)?.id ?? 'Empresa');
    const meta = buildExportMeta(kind === 'monthly' ? [{ label: 'Snapshot', value: month }] : undefined);
    printElementToPdf({ element: el, title, subtitle, meta });
  };

  const exportWidgetPdf = (widgetId: string, widgetTitle: string) => {
    const el = document.getElementById(widgetId);
    if (!el) {
      toast.error('Não foi possível exportar o widget: elemento não encontrado');
      return;
    }
    const subtitle = `${String((company as any)?.name ?? (company as any)?.title ?? (company as any)?.label ?? (company as any)?.id ?? 'Empresa')} • ${tabLabel(tab)}`;
    printElementToPdf({ element: el, title: widgetTitle, subtitle, meta: buildExportMeta() });
  };

  const exportViewCsv = () => {
    const now = new Date();
    const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const safeTab = tabLabel(tab).toLowerCase().replace(/[^a-z0-9]+/gi, '_');
    const filename = `dashboard_${safeTab}_${stamp}.csv`;

    const rows: Array<[string, string]> = [];
    const companyName = String((company as any)?.name ?? (company as any)?.title ?? (company as any)?.label ?? (company as any)?.id ?? 'Empresa');
    rows.push(['Empresa', companyName]);
    rows.push(['Aba', tabLabel(tab)]);
    rows.push(['Período', `${formatShortDate(backendQuery.dateFrom)} - ${formatShortDate(backendQuery.dateTo)}`]);
    rows.push(['Tipo', String(filters.mediaType)]);
    if (filters.city) rows.push(['Cidade', String(filters.city)]);
    if (filters.query) rows.push(['Busca', String(filters.query)]);

    const add = (k: string, v: unknown) => rows.push([k, v == null ? '' : String(v)]);

    if (tab === 'executivo') {
      if (overview) {
        add('Receita reconhecida', formatCurrency(overview.revenueRecognizedCents));
        add('A faturar', formatCurrency(overview.revenueToInvoiceCents));
        add('Ocupação média', `${overview.occupancyPercent}%`);
        add('Campanhas ativas', overview.campaignsActiveCount);
        add('Propostas em aberto', overview.proposalsOpenCount ?? 0);
        add('Inadimplência', formatCurrency(overview.receivablesOverdueCents));
      }
      const high = alerts.filter((a) => a.severity === 'HIGH').length;
      const med = alerts.filter((a) => a.severity === 'MEDIUM').length;
      const low = alerts.filter((a) => a.severity === 'LOW').length;
      add('Alertas HIGH', high);
      add('Alertas MEDIUM', med);
      add('Alertas LOW', low);
      if (lowestOccupancyRegion) {
        add('Região com menor ocupação', `${lowestOccupancyRegion.region} • ${lowestOccupancyRegion.occupancyPercent}%`);
      }
      if (highestOccupancyRegion) {
        add('Região com maior ocupação', `${highestOccupancyRegion.region} • ${highestOccupancyRegion.occupancyPercent}%`);
      }
      add('Pressão operacional', executivePriorityCount);
      topClientsRows.slice(0, 5).forEach((r, idx) => {
        add(`Top cliente ${idx + 1}`, `${r.name} — ${formatCurrency(r.amountCents)} (${r.campaignsCount} camp.)`);
      });
    } else if (tab === 'comercial') {
      if (commercialSummary) {
        add('Propostas geradas', commercialSummary.proposalsTotal);
        add('Propostas em aberto', commercialSummary.proposalsOpenCount);
        add('Taxa de aprovação', `${commercialSummary.approvalRatePercent}%`);
        add('Tempo médio de fechamento (dias)', commercialSummary.averageDaysToClose);
        add('Ticket médio comercial', formatCurrency(commercialSummary.averageCommercialTicketCents));
        add('Pipeline aberto', formatCurrency(commercialSummary.activePipelineAmountCents));
        add('Propostas paradas', commercialSummary.stalledProposalsCount);
      }
      funnel?.stages?.forEach((s) => {
        add(`Funil • ${s.label} (qtde)`, s.count);
        add(`Funil • ${s.label} (valor)`, formatCurrency(s.amountCents));
      });
      commercialProposalsSeries.slice(0, 12).forEach((point, idx) => {
        add(`Evolução ${idx + 1}`, `${formatShortDate(point.date)} • ${point.valueCents} proposta(s)`);
      });
      stalledProposalsRows.slice(0, 8).forEach((r, idx) => {
        add(`Parada ${idx + 1}`, `${r.title} • ${r.client} • ${r.daysWithoutUpdate}d • ${formatCurrency(r.amountCents)}`);
      });
      sellerRankingRows.slice(0, 8).forEach((r, idx) => {
        add(
          `Vendedor ${idx + 1}`,
          `${r.name} • ganhos: ${r.dealsWon} (${formatCurrency(r.amountWonCents)}) • pipeline: ${r.dealsInPipeline}`,
        );
      });
      highValueOpenRows.slice(0, 6).forEach((r, idx) => {
        add(`High value ${idx + 1}`, `${r.title} • ${r.client} • ${formatCurrency(r.amountCents)}`);
      });
    } else if (tab === 'operacoes') {
      const ok = oohOpsItems.filter((i) => i.status === 'OK').length;
      const pend = oohOpsItems.filter((i) => i.status === 'PENDING').length;
      const late = oohOpsItems.filter((i) => i.status === 'LATE').length;
      add('OOH • itens OK', ok);
      add('OOH • pendências', pend);
      add('OOH • atrasos', late);
      add('OOH • aguardando material', oohOpsSummary.awaitingMaterialCount);
      add('OOH • em instalação', oohOpsSummary.installationCount);
      add('DOOH • telas', doohOpsSummary.screenCount);
      add('DOOH • saúde média', `${doohOpsSummary.healthScoreAvg}%`);
      add('DOOH • campanhas ativas', doohOpsSummary.activeCampaignsCount);
      add('DOOH • sem atividade recente', doohOpsSummary.lowActivityCount ?? doohOpsSummary.offlineCount);
    } else if (tab === 'financeiro') {
      if (financialSummary) {
        add('Receita reconhecida', formatCurrency(financialSummary.revenueRecognizedCents));
        add('Contas a receber', formatCurrency(financialSummary.receivablesOpenCents));
        add('Contas vencidas', formatCurrency(financialSummary.receivablesOverdueCents));
        add('Fluxo líquido', formatCurrency(financialSummary.netCashflowCents));
        add('Ticket médio faturado', formatCurrency(financialSummary.averageBilledTicketCents));
        if (financialSummary.topClient) {
          add('Top cliente', `${financialSummary.topClient.name} • ${formatCurrency(financialSummary.topClient.amountCents)}`);
        }
      }
      if (agingSummary) {
        agingSummary.buckets.slice(0, 12).forEach((b) => {
          add(`Aging • ${b.label}`, formatCurrency(b.amountCents));
        });
      }
      criticalInvoicesRows.slice(0, 5).forEach((row, idx) => {
        add(`Fatura crítica ${idx + 1}`, `${row.client} • ${formatCurrency(row.amountCents)} • ${row.status}`);
      });
      largestExpensesRows.slice(0, 5).forEach((row, idx) => {
        add(`Despesa ${idx + 1}`, `${row.description} • ${formatCurrency(row.amountCents)}`);
      });
    } else if (tab === 'inventario') {
      add('Total de pontos', inventorySummary.totalPoints);
      add('Total de faces/telas', inventorySummary.totalUnits);
      add('Ocupação média', `${inventorySummary.occupancyPercent}%`);
      add('Cidades ativas', inventorySummary.activeCitiesCount);
      add('Pontos com disponibilidade', inventorySummary.pointsWithAvailabilityCount);
      add('Campanhas ativas por inventário', inventorySummary.activeCampaignsCount);
      inventoryOpportunityRows.slice(0, 6).forEach((row, idx) => {
        add(`Oportunidade ${idx + 1}`, `${row.title} • ${row.kind} • ${row.occupancyPercent ?? 0}% • ${row.activeCampaigns ?? 0} campanhas`);
      });
      inventoryRegionRows.slice(0, 8).forEach((row, idx) => {
        add(`Região ${idx + 1}`, `${row.label} • ${row.pointsCount} pontos • ${row.occupancyPercent}% • ${formatCurrency(row.revenueCents)}`);
      });
      inventoryRankingRows.slice(0, 10).forEach((r, idx) => {
        add(
          `Ranking ${idx + 1}`,
          `${r.label}${r.city ? ` (${r.city})` : ''} • occ: ${r.occupancyPercent}% • camp: ${r.activeCampaigns} • ${formatCurrency(r.revenueCents)}`,
        );
      });
    }
    else if (tab === 'clientes') {
      if (clientsSummary) {
        add('Clientes ativos', clientsSummary.activeClientsCount);
        add('Novos clientes no período', clientsSummary.newClientsCount);
        add('Receita por cliente', formatCurrency(clientsSummary.revenuePerClientCents));
        add('Inadimplência por cliente', formatCurrency(clientsSummary.overduePerClientCents));
        add('Ticket médio por cliente', formatCurrency(clientsSummary.averageTicketPerClientCents));
        add('Clientes sem atividade recente', clientsSummary.clientsWithoutRecentActivityCount);
      }
      topClientsRows.slice(0, 6).forEach((row, idx) => {
        add(`Top receita ${idx + 1}`, `${row.name} • ${formatCurrency(row.amountCents)} • ${row.campaignsCount} campanha(s)`);
      });
      clientsTopCampaignRows.slice(0, 6).forEach((row, idx) => {
        add(`Top campanhas ${idx + 1}`, `${row.name} • ${row.activeCampaignsCount}/${row.campaignsCount} ativas • ${formatCurrency(row.revenueCents)}`);
      });
      clientsInactiveRiskRows.slice(0, 6).forEach((row, idx) => {
        add(`Risco ${idx + 1}`, `${row.name} • ${row.riskLevel} • ${row.daysWithoutActivity}d`);
      });
    }

    const lines = ['key;value', ...rows.map(([k, v]) => [k, v].map(escapeCsvValue).join(';'))];
    downloadTextFile(filename, lines.join('\n'), 'text/csv;charset=utf-8');
    toast.success('CSV exportado', { description: filename });
  };

  const fetchDrilldownPage = async (
    key: string,
    query: DashboardDrilldownQuery,
    source: DashboardQuerySource | undefined,
  ): Promise<DashboardDrilldownDTO> => {
    if (!company) return { rows: [], paging: { hasMore: false } };

    const params = Object.fromEntries(
      Object.entries(query).filter(
        ([k, v]) =>
          !['dateFrom', 'dateTo', 'q', 'city', 'state', 'mediaType', 'cursor', 'limit', 'sortBy', 'sortDir'].includes(k) &&
          typeof v === 'string' &&
          v.length > 0,
      ),
    ) as Record<string, string>;

    if (source === 'mock' || source === 'mock-fallback' || drilldownMode !== 'backend') {
      return mockApi.fetchDrilldown(company.id, key, filters, {
        cursor: query.cursor,
        limit: query.limit,
        sortBy: query.sortBy,
        sortDir: query.sortDir,
        params,
      });
    }

    return dashboardGetJson<DashboardDrilldownDTO>(`${DASHBOARD_BACKEND_ROUTES.drilldown}/${key}`, toQueryString(query));
  };

  const handleExportDrilldownDetails = async () => {
    if (!drilldown.key) return;

    const spec = getDrilldownSpec(drilldown.key);
    const queryBase: DashboardDrilldownQuery = {
      ...backendQuery,
      limit: 100,
      sortBy: drilldown.sortBy,
      sortDir: drilldown.sortDir,
      ...(drilldown.params || {}),
    };

    setIsExportingDrilldown(true);
    try {
      const aggregated: DrilldownRow[] = [];
      let cursor: string | undefined = undefined;
      let page = 0;
      const maxPages = 50;

      while (page < maxPages) {
        const dto = await fetchDrilldownPage(
          drilldown.key,
          {
            ...queryBase,
            cursor,
          },
          drilldownQ.source,
        );

        aggregated.push(...(dto.rows || []));
        const paging: any = dto.paging || {};
        const nextCursor: string | undefined = paging.nextCursor ?? paging.cursor;
        const hasMore = Boolean(paging.hasMore && nextCursor);
        if (!hasMore) break;
        cursor = nextCursor;
        page += 1;
      }

      const merged = uniqById(aggregated);
      const q = normalizeText(drilldown.search);
      const visible = q
        ? merged.filter((r) => includesNormalized(`${r.id} ${r.title} ${r.subtitle || ''} ${r.status || ''}`, q))
        : merged;

      exportDrilldownCsv(drilldown.title, visible, spec.columns);
      if (merged.length > drilldown.rows.length) {
        toast.success('Detalhe exportado', {
          description: `${visible.length} registro(s) exportados com paginação completa.`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível exportar o detalhamento.';
      toast.error('Falha ao exportar detalhe', { description: message });
    } finally {
      setIsExportingDrilldown(false);
    }
  };

  const clearFilters = () => {
    setFiltersDraft(initialFilters);
    setFilters(initialFilters);
    toast.success('Filtros limpos');
  };

  const tabLabel = (t: DashboardTab) => {
    if (t === 'executivo') return 'Visão Geral';
    if (t === 'comercial') return 'Comercial';
    if (t === 'operacoes') return 'Operações';
    if (t === 'financeiro') return 'Financeiro';
    if (t === 'inventario') return 'Inventário';
    if (t === 'clientes') return 'Clientes';
    return t;
  };

  const currentTabMeta = TAB_META[tab];
  const appliedFilterSummary = buildAppliedFiltersSummary(filters);
  const activeFilterPills = [
    { label: 'Período', value: getDatePresetLabel(filters.datePreset) },
    ...(filters.query ? [{ label: 'Busca', value: filters.query }] : []),
    ...(filters.city ? [{ label: 'Cidade', value: filters.city }] : []),
    { label: 'Tipo', value: getMediaTypeLabel(filters.mediaType) },
  ];
  const activeFilterCount = activeFilterPills.length;
  const currentTabSourceSummary = currentTabDataContext.sources.length
    ? currentTabDataContext.sources.map((source) => describeQuerySource(source)).join(' + ')
    : describeDashboardDataMode(dataMode);
  const currentTabLastUpdatedLabel = formatDateTimeLabel(currentTabLastUpdated);

  const applySavedView = (view: SavedDashboardView) => {
    const desiredTab = perms.allowedTabs.includes(view.tab) ? view.tab : perms.allowedTabs[0] || 'executivo';
    if (desiredTab != view.tab) {
      toast.message('Visão aplicada com ajustes', {
        description: `A aba "${tabLabel(view.tab)}" não está liberada para seu perfil. Abrimos "${tabLabel(desiredTab)}".`,
      });
    } else {
      toast.success(`Visão aplicada: ${view.name}`);
    }

    setTab(desiredTab);
    setFiltersDraft(view.filters);
    setFilters(view.filters);
  };

  const handleSelectSavedView = (id: string) => {
    setActiveViewId(id);
    if (!id) return;
    const view = savedViews.find((v) => v.id === id);
    if (!view) return;
    applySavedView(view);
  };

  const openSaveViewDialog = (mode: 'create' | 'update') => {
    if (!perms.canManageSavedViews) return;
    setSaveViewMode(mode);

    if (mode === 'update' && activeViewId) {
      const current = savedViews.find((v) => v.id === activeViewId);
      setSaveViewName(current?.name || '');
    } else {
      // sugestao baseada no contexto atual
      setSaveViewName(`Minha visão - ${tabLabel(tab)}`);
    }

    setSaveViewOpen(true);
  };

  const confirmSaveView = () => {
    if (!perms.canManageSavedViews) return;
    if (!companyKey || !userKey) {
      toast.error('Não foi possível salvar a visão: faltam dados de usuário/empresa');
      return;
    }

    const name = (saveViewName || '').trim();
    if (!name) {
      toast.error('Informe um nome para a visão');
      return;
    }

    const now = new Date().toISOString();
    const layout = { version: 1 as const };

    const existing = saveViewMode === 'update' ? savedViews.find((v) => v.id === activeViewId) : undefined;
    const id = existing?.id || makeSavedViewId();

    const nextView: SavedDashboardView = {
      id,
      name,
      tab,
      filters,
      layout,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    const next = upsertSavedView(companyKey, userKey, nextView);
    setSavedViews(next);
    setActiveViewId(id);
    setSaveViewOpen(false);

    toast.success(saveViewMode === 'update' ? 'Visão atualizada' : 'Visão salva', {
      description: 'A visão ficou salva localmente para este usuário e esta empresa.',
    });
  };

  const handleDeleteActiveView = () => {
    if (!perms.canManageSavedViews) return;
    if (!companyKey || !userKey || !activeViewId) return;

    const view = savedViews.find((v) => v.id === activeViewId);
    const ok = window.confirm(`Excluir a visão "${view?.name || 'Sem nome'}"?`);
    if (!ok) return;

    const next = deleteSavedView(companyKey, userKey, activeViewId);
    setSavedViews(next);
    setActiveViewId('');
    toast.success('Visão excluída');
  };

  // Etapa 15: tratamento de erro padronizado por widget
  const widgetError = (title: string, q: { status?: string; errorMessage?: string }) =>
    q.status === 'error'
      ? { title, description: q.errorMessage || 'Tente novamente.' }
      : null;

  const executiveLoading = overviewQ.status === 'loading' && !overview;
  const commercialLoading = funnelQ.status === 'loading' && !funnel;
  const commercialKpisLoading =
    (commercialSummaryQ.status === 'loading' && !commercialSummary) || (overviewQ.status === 'loading' && !overview);
  const commercialTimeseriesLoading = commercialProposalsTimeseriesQ.status === 'loading' && !commercialProposalsTimeseriesDto;
  const commercialHighValueLoading = commercialHighValueOpenQ.status === 'loading' && !commercialHighValueOpenDto;
  const financialKpisLoading = financialSummaryQ.status === 'loading' && !financialSummary;
  const financialCompositionLoading = receivablesCompositionQ.status === 'loading' && !receivablesComposition;
  const clientsKpisLoading = clientsSummaryQ.status === 'loading' && !clientsSummary;

  const executiveOverviewError = !overview && overviewQ.status === 'error'
    ? { title: 'Falha ao carregar indicadores da visão geral', description: overviewQ.errorMessage || 'Tente novamente.' }
    : null;

  const commercialOverviewError = !commercialSummary && commercialSummaryQ.status === 'error'
    ? { title: 'Falha ao carregar indicadores comerciais', description: commercialSummaryQ.errorMessage || 'Tente novamente.' }
    : null;
  const commercialTimeseriesError = widgetError('Falha ao carregar evolução das propostas', commercialProposalsTimeseriesQ);
  const commercialHighValueError = widgetError('Falha ao carregar negociações prioritárias', commercialHighValueOpenQ);

  // Etapa 16: fallback/rollback global - se a tela quebrar por erro de runtime,
  // mostramos um modo seguro (compact) e gravamos override temporario (localStorage).
  const handleRuntimeError = () => {
    try {
      setForcedDashboardVariant({
        companyId: company?.id,
        userId: (user as any)?.id || (user as any)?.email,
        variant: 'compact',
        ttlMs: 60 * 60 * 1000,
        reason: 'Rollback automático: erro de runtime',
      });
    } catch {
      // ignore
    }
  };

  const shouldShowRolloutBanner =
    rollout.variant === 'compact' || rollout.source !== 'default' || dataMode !== DASHBOARD_DATA_MODE;

  const runtimeFallback = (
    <div className="p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard em modo seguro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Ocorreu um erro ao renderizar o dashboard. Para evitar impacto em produção, mantivemos a tela em modo
            compacto (menor risco).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button className="h-9" onClick={() => window.location.reload()}>
              Recarregar
            </Button>
            {rollout.canOverride ? (
              <Button variant="outline" className="h-9" onClick={() => applyVariantOverride('v2')}>
                Tentar v2
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-gray-500">
            Rollout: <span className="font-medium">{rollout.variant}</span> ({rollout.source}) • dados:{' '}
            <span className="font-medium">{dataModeSummary}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <DashboardErrorBoundary fallback={runtimeFallback} onError={handleRuntimeError}>
      <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4" data-tour="dashboard-overview">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-gray-900 mb-1">Dashboard</h1>
            <p className="text-gray-600">Visão geral • filtros globais • leituras acionáveis por área do negócio</p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap" data-tour="dashboard-sections">
            <Button className="h-9 flex items-center gap-2" onClick={() => onNavigate('proposals')}>
              <Plus className="w-4 h-4" />
              Nova Proposta
            </Button>
            <Button variant="outline" className="h-9 flex items-center gap-2" onClick={() => onNavigate('inventory')}>
              <Plus className="w-4 h-4" />
              Nova Mídia
            </Button>
            <Button variant="outline" className="h-9 flex items-center gap-2" onClick={() => onNavigate('mediakit')}>
              <Globe className="w-4 h-4" />
              Mídia Kit
            </Button>
            {rollout.canOverride ? (
              <Button variant="outline" className="h-9 flex items-center gap-2" onClick={() => setParityOpen(true)}>
                <ClipboardCheck className="w-4 h-4" />
                Paridade
              </Button>
            ) : null}
            {rollout.variant !== 'compact' ? (
              <Button variant="outline" className="h-9 flex items-center gap-2" onClick={() => setShareMapOpen(true)}>
                <Share2 className="w-4 h-4" />
                Compartilhar Mapa
              </Button>
            ) : null}
          </div>
        </div>

        {shouldShowRolloutBanner ? (
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Rollout:</span> {rollout.variant} ({rollout.source}) — {rollout.reason}
                  <span className="mx-2">•</span>
                  <span className="font-medium">Dados:</span> {dataModeSummary}
                </div>
                {rollout.canOverride ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-8 text-xs" onClick={() => applyVariantOverride('v2')}>
                      Forçar v2
                    </Button>
                    <Button variant="outline" className="h-8 text-xs" onClick={() => applyVariantOverride('compact')}>
                      Rollback
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Global Filter Bar */}
        <Card data-tour="dashboard-filters">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Filter className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-900">Filtros globais</p>
                  <p className="text-xs text-gray-500">Todos os widgets reagem a estes filtros</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {perms.canManageSavedViews ? (
                  <>
                    <div className="flex items-center gap-2">
                      <select
                        className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm min-w-[180px]"
                        value={activeViewId}
                        onChange={(e) => handleSelectSavedView(e.target.value)}
                      >
                        <option value="">Visões salvas</option>
                        {savedViews.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>

                      {activeViewId ? (
                        <Button
                          variant="ghost"
                          className="h-9 px-2"
                          onClick={() => setActiveViewId('')}
                          title="Desselecionar"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      ) : null}
                    </div>

                    <Button
                      variant="outline"
                      className="h-9 flex items-center gap-2"
                      onClick={() => openSaveViewDialog('create')}
                    >
                      <Plus className="w-4 h-4" />
                      Salvar visão
                    </Button>

                    {activeViewId ? (
                      <>
                        <Button
                          variant="outline"
                          className="h-9 flex items-center gap-2"
                          onClick={() => openSaveViewDialog('update')}
                        >
                          <Check className="w-4 h-4" />
                          Atualizar
                        </Button>
                        <Button
                          variant="outline"
                          className="h-9 flex items-center gap-2"
                          onClick={handleDeleteActiveView}
                        >
                          <X className="w-4 h-4" />
                          Excluir
                        </Button>
                      </>
                    ) : null}
                  </>
                ) : null}

                <Button variant="outline" className="h-9" onClick={clearFilters}>
                  Limpar filtros
                </Button>

                <Button variant="outline" className="h-9 flex items-center gap-2" onClick={exportViewCsv}>
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </Button>
                <Button
                  variant="outline"
                  className="h-9 flex items-center gap-2"
                  onClick={() => exportViewPdf('view')}
                >
                  <Download className="w-4 h-4" />
                  Exportar PDF
                </Button>
                <Button
                  variant="outline"
                  className="h-9 flex items-center gap-2"
                  onClick={() => exportViewPdf('monthly')}
                >
                  <Download className="w-4 h-4" />
                  Snapshot mensal
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Período</label>
                <select
                  className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm"
                  value={filtersDraft.datePreset}
                  onChange={(e) => {
                    const next = e.target.value as DatePreset;
                    setFiltersDraft((s) => ({ ...s, datePreset: next }));
                    setFilters((s) => ({ ...s, datePreset: next }));
                  }}
                >
                  <option value="7d">Últimos 7 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                  <option value="90d">Últimos 90 dias</option>
                  <option value="ytd">Ano (YTD)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Buscar</label>
                <Input
                  value={filtersDraft.query}
                  onChange={(e) => setFiltersDraft((s) => ({ ...s, query: e.target.value }))}
                  placeholder="cliente, campanha, proposta..."
                  className="h-9"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Cidade/Região</label>
                <Input
                  value={filtersDraft.city}
                  onChange={(e) => setFiltersDraft((s) => ({ ...s, city: e.target.value }))}
                  placeholder="ex: Brasília"
                  className="h-9"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                <select
                  className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm"
                  value={filtersDraft.mediaType}
                  onChange={(e) => {
                    const next = e.target.value as MediaTypeFilter;
                    setFiltersDraft((s) => ({ ...s, mediaType: next }));
                    setFilters((s) => ({ ...s, mediaType: next }));
                  }}
                >
                  <option value="ALL">OOH + DOOH</option>
                  <option value="OOH">OOH</option>
                  <option value="DOOH">DOOH</option>
                </select>
              </div>
            </div>

            {isApplyingFilters ? (
              <div className="mt-3 text-xs text-gray-500">Aplicando filtros digitados ao recorte atual…</div>
            ) : null}

            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Recorte aplicado</p>
                  <p className="mt-1 text-sm text-gray-900">{appliedFilterSummary}</p>
                </div>
                <p className="text-xs text-gray-500">{activeFilterCount} filtro(s) visíveis no resumo abaixo.</p>
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {activeFilterPills.map((pill) => (
                  <Pill key={`${pill.label}:${pill.value}`} label={pill.label} value={pill.value} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs by persona */}
        <div className="flex items-center gap-2 flex-wrap">
          {perms.allowedTabs.includes('executivo') ? (
            <TabButton
              active={tab === 'executivo'}
              icon={<TrendingUp className="w-4 h-4" />}
              label="Visão Geral"
              onClick={() => setTab('executivo')}
            />
          ) : null}
          {rollout.variant !== 'compact' && perms.allowedTabs.includes('comercial') ? (
            <TabButton
              active={tab === 'comercial'}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Comercial"
              onClick={() => setTab('comercial')}
            />
          ) : null}
          {rollout.variant !== 'compact' && perms.allowedTabs.includes('operacoes') ? (
            <TabButton
              active={tab === 'operacoes'}
              icon={<PieChart className="w-4 h-4" />}
              label="Operações"
              onClick={() => setTab('operacoes')}
            />
          ) : null}
          {rollout.variant !== 'compact' && perms.allowedTabs.includes('financeiro') ? (
            <TabButton
              active={tab === 'financeiro'}
              icon={<Wallet className="w-4 h-4" />}
              label="Financeiro"
              onClick={() => setTab('financeiro')}
            />
          ) : null}
          {rollout.variant !== 'compact' && perms.allowedTabs.includes('inventario') ? (
            <TabButton
              active={tab === 'inventario'}
              icon={<Building2 className="w-4 h-4" />}
              label="Inventário"
              onClick={() => setTab('inventario')}
            />
          ) : null}
          {rollout.variant !== 'compact' && perms.allowedTabs.includes('clientes') ? (
            <TabButton
              active={tab === 'clientes'}
              icon={<Globe className="w-4 h-4" />}
              label="Clientes"
              onClick={() => setTab('clientes')}
            />
          ) : null}
        </div>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-gray-900">{currentTabMeta.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{currentTabMeta.subtitle}</p>
              </div>
              <div className="grid gap-2 text-xs text-gray-500 sm:grid-cols-3">
                <div>
                  <p className="font-medium text-gray-700">Recorte</p>
                  <p>{formatShortDate(backendQuery.dateFrom)} — {formatShortDate(backendQuery.dateTo)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Fonte dos dados</p>
                  <p>{currentTabSourceSummary}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Última atualização</p>
                  <p>{currentTabLastUpdatedLabel}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Content */}
      {tab === 'executivo' ? (
        <div id="dashboard-export-root" className="space-y-6" data-tour="dashboard-reading">
          {executiveOverviewError ? (
            <Card>
              <CardContent className="pt-5">
                <ErrorState title={executiveOverviewError.title} description={executiveOverviewError.description} />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm text-gray-900">Leitura executiva</p>
                  <p className="mt-1 text-xs text-gray-500">
                    A primeira dobra resume receita, ocupação, pressão comercial e riscos que exigem ação imediata.
                  </p>
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  <p>Fonte: {currentTabSourceSummary}</p>
                  <p>Itens prioritários agora: {executivePriorityCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm text-gray-900">KPIs prioritários</p>
              <p className="text-xs text-gray-500 mt-1">
                Os critérios destes KPIs foram consolidados na Etapa 1 e sustentam a primeira dobra da Visão Geral.
              </p>
            </div>
            <Button variant="outline" className="h-9 flex items-center gap-2" onClick={() => setKpiRulesOpen(true)}>
              <Info className="w-4 h-4" />
              Critérios dos KPIs
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4" data-tour="dashboard-kpis">
            <KpiCard
              label="Receita reconhecida"
              value={overview ? formatCurrency(overview.revenueRecognizedCents) : undefined}
              helper={kpiDefinition('revenueRecognized').shortDescription}
              delta={overview?.trends.revenue.deltaPercent}
              spark={overview?.trends.revenue.points}
              loading={executiveLoading}
              onClick={() => openDrilldown('Receita reconhecida', 'revenueRecognized', describeDrilldownHint('Receita reconhecida'))}
            />

            <KpiCard
              label="A faturar"
              value={overview ? formatCurrency(overview.revenueToInvoiceCents) : undefined}
              helper={kpiDefinition('revenueToInvoice').shortDescription}
              loading={executiveLoading}
              onClick={() => openDrilldown('A faturar', 'revenueToInvoice', describeDrilldownHint('A faturar'))}
            />

            <KpiCard
              label="Ocupação média"
              value={overview ? `${overview.occupancyPercent}%` : undefined}
              helper={kpiDefinition('occupancy').shortDescription}
              delta={overview?.trends.occupancy.deltaPercent}
              spark={overview?.trends.occupancy.points}
              loading={executiveLoading}
              onClick={() => openDrilldown('Ocupação', 'occupancy', describeDrilldownHint('Ocupação'))}
            />

            <KpiCard
              label="Campanhas ativas"
              value={overview ? String(overview.campaignsActiveCount) : undefined}
              helper={kpiDefinition('campaignsActiveCount').shortDescription}
              loading={executiveLoading}
              onClick={() => openDrilldown('Campanhas ativas', 'campaignsActive', describeDrilldownHint('Campanhas ativas'))}
            />

            <KpiCard
              label="Propostas em aberto"
              value={overview ? String(overview.proposalsOpenCount ?? 0) : undefined}
              helper="Propostas em status aberto ou negociável até o fim do recorte."
              loading={executiveLoading}
              onClick={() => openDrilldown('Propostas em aberto', 'proposalsOpen', describeDrilldownHint('Propostas em aberto'))}
            />

            <KpiCard
              label="Inadimplência"
              value={overview ? formatCurrency(overview.receivablesOverdueCents) : undefined}
              helper={kpiDefinition('receivablesOverdue').shortDescription}
              loading={executiveLoading}
              onClick={() => openDrilldown('Inadimplência', 'receivablesOverdue', describeDrilldownHint('Inadimplência'))}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8">
              <WidgetCard
                id="dash-widget-revenue-trend"
                title="Tendência de receita"
                subtitle={`Série principal da Visão Geral • ${describeQuerySource(revenueTsQ.source)}`}
                loading={revenueTsQ.status === 'loading' && !revenueTsDto}
                error={widgetError('Falha ao carregar série', revenueTsQ)}
                empty={revenueTs.length === 0 && revenueTsQ.status === 'ready'}
                emptyTitle="Sem dados"
                emptyDescription={smartEmpty('Não há pontos suficientes para exibir a tendência de receita neste recorte.')}
                actions={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9" onClick={() => revenueTsQ.refetch()}>
                      Recarregar
                    </Button>
                    <Button variant="outline" className="h-9" onClick={() => exportTimeseriesCsv('tendencia_receita', revenueTs)}>
                      Exportar CSV
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => exportWidgetPdf('dash-widget-revenue-trend', 'Tendência de receita')}
                    >
                      Exportar PDF
                    </Button>
                  </div>
                }
              >
                {revenueTs.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-2xl text-gray-900">{formatCurrency(revenueTs[revenueTs.length - 1].valueCents)}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Último ponto em {formatShortDate(revenueTs[revenueTs.length - 1].date)}
                        </p>
                      </div>
                      <div className="min-w-[160px]">
                        <Sparkline points={timeseriesToSpark(revenueTs)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {revenueTs.slice(-4).map((point) => (
                        <div key={point.date} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">{formatShortDate(point.date)}</p>
                          <p className="text-sm text-gray-900 mt-1">{formatCurrency(point.valueCents)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-40 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-500">
                    Série sem dados
                  </div>
                )}
              </WidgetCard>
            </div>

            <div className="xl:col-span-4">
              <WidgetCard
                id="dash-widget-attention-immediate"
                title="Atenção imediata"
                subtitle={`Pendências mais urgentes com os filtros aplicados • ${describeQuerySource(alertsQ.source)}`}
                loading={alertsQ.status === 'loading' && !alertsDto}
                error={widgetError('Falha ao carregar alertas', alertsQ)}
                empty={alerts.length === 0 && alertsQ.status === 'ready'}
                emptyTitle="Sem alertas"
                emptyDescription={smartEmpty('Nada crítico para destacar no recorte atual.')}
                actions={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9" onClick={() => alertsQ.refetch()}>
                      Recarregar
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => exportWidgetPdf('dash-widget-attention-immediate', 'Atenção imediata')}
                    >
                      Exportar PDF
                    </Button>
                  </div>
                }
              >
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="rounded-lg border border-gray-200 p-4 bg-white">
                      <div className="flex items-start gap-2">
                        <SeverityDot severity={alert.severity} />
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{alert.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{alert.description}</p>
                        </div>
                      </div>
                      {alert.ctaLabel && alert.ctaPage ? (
                        <Button variant="outline" className="w-full mt-3 h-9" onClick={() => onNavigate(alert.ctaPage!)}>
                          {alert.ctaLabel}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </WidgetCard>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <WidgetCard
              id="dash-widget-cashflow-overview"
              title="Tendência de fluxo de caixa"
              subtitle={`Leitura complementar do período • ${describeQuerySource(cashflowTsQ.source)}`}
              loading={cashflowTsQ.status === 'loading' && !cashflowTsDto}
              error={widgetError('Falha ao carregar série', cashflowTsQ)}
              empty={cashflowTs.length === 0 && cashflowTsQ.status === 'ready'}
              emptyTitle="Sem dados"
              emptyDescription={smartEmpty('Ainda não há movimentos suficientes para compor a leitura de caixa.')}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => cashflowTsQ.refetch()}>
                    Recarregar
                  </Button>
                  <Button variant="outline" className="h-9" onClick={() => exportTimeseriesCsv('fluxo_caixa', cashflowTs)}>
                    Exportar CSV
                  </Button>
                </div>
              }
            >
              {cashflowTs.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-2xl text-gray-900">{formatCurrency(cashflowTs[cashflowTs.length - 1].valueCents)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Último ponto em {formatShortDate(cashflowTs[cashflowTs.length - 1].date)}
                      </p>
                    </div>
                    <div className="min-w-[160px]">
                      <Sparkline points={timeseriesToSpark(cashflowTs)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {cashflowTs.slice(-4).map((point) => (
                      <div key={point.date} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">{formatShortDate(point.date)}</p>
                        <p className="text-sm text-gray-900 mt-1">{formatCurrency(point.valueCents)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-40 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-500">
                  Série sem dados
                </div>
              )}
            </WidgetCard>

            <WidgetCard
              id="dash-widget-funnel-overview"
              title="Funil comercial resumido"
              subtitle={`Leitura rápida de conversão no recorte • ${describeQuerySource(funnelQ.source)}`}
              loading={funnelQ.status === 'loading' && !funnel}
              error={widgetError('Falha ao carregar funil', funnelQ)}
              empty={(!funnel?.stages?.length) && funnelQ.status === 'ready'}
              emptyTitle="Sem dados"
              emptyDescription={smartEmpty('O funil não retornou etapas no recorte selecionado.')}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => funnelQ.refetch()}>
                    Recarregar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => openDrilldown('Funil comercial', 'proposalsTotal', describeDrilldownHint('Funil comercial'))}
                  >
                    Ver propostas
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {(funnel?.stages || []).map((stage) => (
                  <div key={stage.key} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-900">{stage.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{stage.count} registro(s)</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-900">{formatCurrency(stage.amountCents)}</p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-500">
                  Tempo médio de fechamento: <span className="text-gray-900">{funnel?.averageDaysToClose ?? 0} dias</span>
                </div>
              </div>
            </WidgetCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-7">
              <WidgetCard
                id="dash-widget-occupancy-region"
                title="Ocupação por região"
                subtitle={`Resumo espacial da oferta no recorte • ${describeQuerySource(inventoryMapQ.source)}`}
                loading={inventoryMapQ.status === 'loading' && !inventoryMapDto}
                error={widgetError('Falha ao carregar ocupação por região', inventoryMapQ)}
                empty={executiveRegionRows.length === 0 && inventoryMapQ.status === 'ready'}
                emptyTitle="Sem dados"
                emptyDescription={smartEmpty('Ainda não há pontos suficientes para resumir a ocupação por região.')}
                actions={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9" onClick={() => inventoryMapQ.refetch()}>
                      Recarregar
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => onNavigate('inventory')}
                    >
                      Abrir inventário
                    </Button>
                  </div>
                }
              >
                <div className="space-y-3">
                  {executiveRegionRows.slice(0, 5).map((row) => (
                    <button
                      key={row.region}
                      type="button"
                      className="w-full rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50"
                      onClick={() =>
                        openDrilldown(
                          `Ocupação • ${row.region}`,
                          'inventoryRegionLine',
                          describeDrilldownHint(`Ocupação da região ${row.region}`),
                          { region: row.region },
                        )
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-gray-900">{row.region}</p>
                          <p className="text-xs text-gray-500 mt-1">{row.points} ponto(s) mapeados</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-900">{row.occupancyPercent}%</p>
                          <p className="text-xs text-gray-500">ocupação média</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            row.occupancyPercent >= 75
                              ? 'bg-red-500'
                              : row.occupancyPercent >= 45
                              ? 'bg-yellow-400'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.max(4, row.occupancyPercent)}%` }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </WidgetCard>
            </div>

            <div className="xl:col-span-5">
              <WidgetCard
                id="dash-widget-opportunities-risks"
                title="Oportunidades e riscos"
                subtitle="Leituras acionáveis para priorização rápida"
                loading={executiveLoading}
                error={null}
                empty={false}
              >
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Oportunidades</p>
                    <div className="mt-3 space-y-3">
                      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                        <p className="text-sm text-gray-900">Região com menor ocupação</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {lowestOccupancyRegion
                            ? `${lowestOccupancyRegion.region} está em ${lowestOccupancyRegion.occupancyPercent}% de ocupação média.`
                            : 'Ainda não há regiões suficientes para comparação.'}
                        </p>
                        {lowestOccupancyRegion ? (
                          <Button
                            variant="outline"
                            className="mt-3 h-8"
                            onClick={() =>
                              openDrilldown(
                                `Ocupação • ${lowestOccupancyRegion.region}`,
                                'inventoryRegionLine',
                                describeDrilldownHint(`Ocupação da região ${lowestOccupancyRegion.region}`),
                                { region: lowestOccupancyRegion.region },
                              )
                            }
                          >
                            Ver pontos
                          </Button>
                        ) : null}
                      </div>

                      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                        <p className="text-sm text-gray-900">Pipeline em aberto</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {overview
                            ? `${overview.proposalsOpenCount ?? 0} proposta(s) em aberto sustentam ${formatCurrency(overview.revenueToInvoiceCents)} ainda a faturar.`
                            : 'Aguardando leitura do pipeline.'}
                        </p>
                        {overview ? (
                          <Button
                            variant="outline"
                            className="mt-3 h-8"
                            onClick={() =>
                              openDrilldown(
                                'Propostas em aberto',
                                'proposalsOpen',
                                describeDrilldownHint('Propostas em aberto'),
                              )
                            }
                          >
                            Abrir pipeline
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Riscos</p>
                    <div className="mt-3 space-y-3">
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="text-sm text-gray-900">Inadimplência no recorte</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {overview
                            ? `${formatCurrency(overview.receivablesOverdueCents)} seguem vencidos e não liquidados.`
                            : 'Aguardando leitura financeira.'}
                        </p>
                        {overview?.receivablesOverdueCents ? (
                          <Button
                            variant="outline"
                            className="mt-3 h-8"
                            onClick={() =>
                              openDrilldown(
                                'Inadimplência',
                                'receivablesOverdue',
                                describeDrilldownHint('Inadimplência'),
                              )
                            }
                          >
                            Ver faturas
                          </Button>
                        ) : null}
                      </div>

                      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="text-sm text-gray-900">Pressão operacional</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {executivePriorityCount > 0
                            ? `${executivePriorityCount} pendência(s) combinando check-ins e campanhas aguardando material.`
                            : 'Sem pressão operacional relevante no recorte atual.'}
                        </p>
                        {executivePriorityCount > 0 ? (
                          <Button
                            variant="outline"
                            className="mt-3 h-8"
                            onClick={() => openDrilldown('Operações OOH', 'oohOps', describeDrilldownHint('Operações OOH'))}
                          >
                            Ver pendências
                          </Button>
                        ) : null}
                      </div>

                      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="text-sm text-gray-900">Concentração de receita</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {topClientsRows.length > 0
                            ? `${topClientsRows[0].name} concentra ${executiveClientConcentration}% da receita visível no top clientes carregado.`
                            : 'Sem dados de clientes suficientes para leitura de concentração.'}
                        </p>
                        {topClientsRows.length > 0 ? (
                          <Button
                            variant="outline"
                            className="mt-3 h-8"
                            onClick={() => openDrilldown('Top Clientes', 'topClients', describeDrilldownHint('Top clientes'))}
                          >
                            Ver clientes
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </WidgetCard>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'comercial' ? (
        <div id="dashboard-export-root" className="space-y-6">
          {commercialOverviewError ? (
            <Card>
              <CardContent className="pt-5">
                <ErrorState title={commercialOverviewError.title} description={commercialOverviewError.description} />
              </CardContent>
            </Card>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
            <KpiCard
              label="Propostas geradas"
              value={commercialSummary ? String(commercialSummary.proposalsTotal) : undefined}
              delta={overview?.trends.proposals.deltaPercent}
              spark={overview?.trends.proposals.points}
              helper="Volume total de propostas criadas dentro do recorte atual."
              loading={commercialKpisLoading}
              onClick={() => openDrilldown('Propostas geradas', 'proposalsTotal', describeDrilldownHint('Propostas geradas'))}
            />

            <KpiCard
              label="Propostas em aberto"
              value={commercialSummary ? String(commercialSummary.proposalsOpenCount) : undefined}
              helper="Propostas ainda negociáveis no recorte atual."
              loading={commercialKpisLoading}
              onClick={() => openDrilldown('Propostas em aberto', 'proposalsOpen', describeDrilldownHint('Propostas em aberto'))}
            />

            <KpiCard
              label="Taxa de aprovação"
              value={commercialSummary ? `${commercialSummary.approvalRatePercent}%` : undefined}
              helper="Aprovadas ÷ propostas fechadas dentro do período filtrado."
              loading={commercialKpisLoading}
            />

            <KpiCard
              label="Pipeline aberto"
              value={commercialSummary ? formatCurrency(commercialSummary.activePipelineAmountCents) : undefined}
              helper="Soma das propostas em negociação e rascunho no recorte atual."
              loading={commercialKpisLoading}
            />

            <KpiCard
              label="Ticket médio comercial"
              value={commercialSummary ? formatCurrency(commercialSummary.averageCommercialTicketCents) : undefined}
              helper={kpiDefinition('averageCommercialTicket').shortDescription}
              loading={commercialKpisLoading}
            />

            <KpiCard
              label="Tempo médio de fechamento"
              value={commercialSummary ? `${commercialSummary.averageDaysToClose} dias` : funnel ? `${funnel.averageDaysToClose} dias` : undefined}
              helper="Dias médios entre criação e aprovação das propostas ganhas."
              loading={commercialKpisLoading && commercialLoading}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-5">
              <WidgetCard
                id="dash-widget-funnel"
                title="Funil por status"
                subtitle={`Pipeline por etapa • ${describeQuerySource(funnelQ.source)}`}
                loading={commercialLoading}
                error={widgetError('Falha ao carregar funil', funnelQ)}
                actions={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9" onClick={() => funnelQ.refetch()}>
                      Recarregar
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => {
                        if (!funnel) return;
                        const rows = funnel.stages.map((s) => ({
                          id: s.key,
                          title: s.label,
                          subtitle: `Qtd: ${s.count}`,
                          status: '',
                          amountCents: s.amountCents,
                        }));
                        exportDrilldownCsv('funil_comercial', rows);
                      }}
                    >
                      Exportar CSV
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => exportWidgetPdf('dash-widget-funnel', 'Funil por status')}
                    >
                      Exportar PDF
                    </Button>
                  </div>
                }
              >
                {funnel ? (
                  <div className="space-y-4">
                    {funnel.stages.map((s) => {
                      const maxCount = Math.max(...funnel.stages.map((x) => x.count), 1);
                      const w = Math.round((s.count / maxCount) * 100);
                      return (
                        <div key={s.key} className="rounded-lg border border-gray-200 p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <p className="text-sm text-gray-900">{s.label}</p>
                              <p className="text-xs text-gray-500 mt-1">{s.amountCents > 0 ? formatCurrency(s.amountCents) : 'Sem valor agregado nesta etapa'}</p>
                            </div>
                            <p className="text-sm text-gray-900 tabular-nums">{s.count}</p>
                          </div>
                          <div className="w-full h-2 rounded bg-gray-100 overflow-hidden">
                            <div className="h-2 bg-gray-300" style={{ width: `${w}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </WidgetCard>
            </div>

            <div className="xl:col-span-7">
              <WidgetCard
                id="dash-widget-commercial-proposals-timeseries"
                title="Evolução das propostas"
                subtitle={`Volume gerado ao longo do período • ${describeQuerySource(commercialProposalsTimeseriesQ.source)}`}
                loading={commercialTimeseriesLoading}
                error={commercialTimeseriesError}
                empty={commercialProposalsSeries.length === 0 && commercialProposalsTimeseriesQ.status === 'ready'}
                emptyTitle="Sem evolução visível"
                emptyDescription={smartEmpty('Nenhuma proposta foi gerada no recorte atual.')}
                actions={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9" onClick={() => commercialProposalsTimeseriesQ.refetch()}>
                      Recarregar
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => {
                        const lines = [
                          'date;propostas',
                          ...commercialProposalsSeries.map((point) => `${escapeCsvValue(point.date)};${escapeCsvValue(point.valueCents)}`),
                        ];
                        downloadTextFile('export_evolucao_propostas.csv', lines.join('\n'), 'text/csv;charset=utf-8');
                        toast.success('CSV exportado', { description: 'export_evolucao_propostas.csv' });
                      }}
                    >
                      Exportar CSV
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => exportWidgetPdf('dash-widget-commercial-proposals-timeseries', 'Evolução das propostas')}
                    >
                      Exportar PDF
                    </Button>
                  </div>
                }
              >
                {commercialProposalsSeries.length > 0 ? (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="text-xs text-gray-500">Total no período</p>
                        <p className="text-sm text-gray-900 mt-1">{commercialProposalsSeries.reduce((sum, point) => sum + (point.valueCents || 0), 0)} propostas</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="text-xs text-gray-500">Pico do recorte</p>
                        <p className="text-sm text-gray-900 mt-1">{Math.max(...commercialProposalsSeries.map((point) => point.valueCents || 0), 0)} propostas</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="text-xs text-gray-500">Último ponto</p>
                        <p className="text-sm text-gray-900 mt-1">{commercialProposalsSeries[commercialProposalsSeries.length - 1]?.valueCents || 0} propostas</p>
                      </div>
                    </div>

                    <div className="flex items-end gap-2 h-48">
                      {commercialProposalsSeries.map((point, index) => {
                        const maxValue = Math.max(...commercialProposalsSeries.map((entry) => entry.valueCents || 0), 1);
                        const height = Math.max(10, Math.round(((point.valueCents || 0) / maxValue) * 100));
                        return (
                          <div key={`${point.date}-${index}`} className="flex-1 min-w-0">
                            <div className="h-40 flex items-end">
                              <div className="w-full rounded-t-md bg-gray-300 hover:bg-gray-400 transition-colors" style={{ height: `${height}%` }} />
                            </div>
                            <p className="text-[11px] text-gray-500 mt-2 truncate">{formatShortDate(point.date)}</p>
                            <p className="text-[11px] text-gray-700 mt-1 tabular-nums">{point.valueCents}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </WidgetCard>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-7">
              <WidgetCard
                id="dash-widget-seller-ranking"
                title="Ranking de vendedores"
                subtitle={`Resultados por responsável • ${describeQuerySource(sellerRankingQ.source)}`}
                loading={sellerRankingQ.status === 'loading' && !sellerRankingDto}
                error={widgetError('Falha ao carregar ranking', sellerRankingQ)}
                empty={sellerRankingRows.length === 0 && sellerRankingQ.status === 'ready'}
                emptyTitle="Sem dados"
                emptyDescription={smartEmpty('Nenhum vendedor encontrado com os filtros atuais.')}
                actions={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9" onClick={() => sellerRankingQ.refetch()}>
                      Recarregar
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => {
                        const rows: DrilldownRow[] = sellerRankingRows.map((r) => ({
                          id: r.id,
                          title: r.name,
                          subtitle: `${r.city || ''} • Ganhas: ${r.dealsWon} • Pipeline: ${r.dealsInPipeline}`.trim(),
                          status: '',
                          amountCents: r.amountWonCents,
                          fields: {
                            dealsWon: r.dealsWon,
                            dealsInPipeline: r.dealsInPipeline,
                            amountWonCents: r.amountWonCents,
                            amountPipelineCents: r.amountPipelineCents,
                          },
                        }));
                        exportDrilldownCsv('ranking_vendedores', rows, getDrilldownSpec('sellerRanking').columns);
                      }}
                    >
                      Exportar CSV
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => exportWidgetPdf('dash-widget-seller-ranking', 'Ranking de vendedores')}
                    >
                      Exportar PDF
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() =>
                        openDrilldown(
                          'Ranking de vendedores',
                          'sellerRanking',
                          describeDrilldownHint('Ranking de vendedores'),
                        )
                      }
                    >
                      Ver detalhes
                    </Button>
                  </div>
                }
              >
                <div className="space-y-3">
                  {sellerRankingRows.slice(0, 6).map((r, idx) => (
                    <div key={r.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                      <div>
                        <p className="text-sm text-gray-900">{idx + 1}. {r.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{r.city ? `${r.city} • ` : ''}Ganhos: {r.dealsWon} • Pipeline: {r.dealsInPipeline}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-700">{formatCurrency(r.amountWonCents)}</p>
                        <p className="text-xs text-gray-500">Pipeline: {formatCurrency(r.amountPipelineCents)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </WidgetCard>
            </div>

            <div className="xl:col-span-5">
              <WidgetCard
                id="dash-widget-pipeline-by-seller"
                title="Pipeline por responsável"
                subtitle={`Foco no valor ainda em negociação • ${describeQuerySource(sellerRankingQ.source)}`}
                loading={sellerRankingQ.status === 'loading' && !sellerRankingDto}
                error={widgetError('Falha ao carregar pipeline por responsável', sellerRankingQ)}
                empty={pipelineBySellerRows.length === 0 && sellerRankingQ.status === 'ready'}
                emptyTitle="Sem pipeline aberto"
                emptyDescription={smartEmpty('Nenhum responsável tem pipeline aberto no recorte atual.')}
                actions={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9" onClick={() => sellerRankingQ.refetch()}>
                      Recarregar
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() =>
                        openDrilldown(
                          'Pipeline por responsável',
                          'pipelineBySeller',
                          describeDrilldownHint('Pipeline por responsável'),
                        )
                      }
                    >
                      Ver detalhes
                    </Button>
                  </div>
                }
              >
                <div className="space-y-4">
                  {pipelineBySellerRows.slice(0, 6).map((row) => {
                    const maxPipeline = Math.max(...pipelineBySellerRows.map((entry) => entry.amountPipelineCents || 0), 1);
                    const width = Math.max(8, Math.round(((row.amountPipelineCents || 0) / maxPipeline) * 100));
                    return (
                      <div key={row.id} className="rounded-lg border border-gray-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm text-gray-900">{row.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{row.dealsInPipeline} proposta(s) em pipeline</p>
                          </div>
                          <p className="text-sm text-gray-700">{formatCurrency(row.amountPipelineCents)}</p>
                        </div>
                        <div className="mt-3 w-full h-2 rounded bg-gray-100 overflow-hidden">
                          <div className="h-2 bg-gray-300" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </WidgetCard>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <WidgetCard
              id="dash-widget-stalled-proposals"
              title="Propostas paradas"
              subtitle={`Maior tempo sem avanço • ${describeQuerySource(stalledProposalsQ.source)}`}
              loading={stalledProposalsQ.status === 'loading' && !stalledProposalsDto}
              error={widgetError('Falha ao carregar lista', stalledProposalsQ)}
              empty={stalledProposalsRows.length === 0 && stalledProposalsQ.status === 'ready'}
              emptyTitle="Nada aqui"
              emptyDescription={smartEmpty('Nenhuma proposta parou com os filtros atuais.')}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => stalledProposalsQ.refetch()}>
                    Recarregar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => {
                      const rows: DrilldownRow[] = stalledProposalsRows.map((p) => ({
                        id: p.id,
                        title: p.title,
                        subtitle: p.client,
                        status: '',
                        amountCents: p.amountCents,
                        fields: { daysWithoutUpdate: p.daysWithoutUpdate },
                      }));
                      exportDrilldownCsv('propostas_paradas', rows, getDrilldownSpec('stalledProposals').columns);
                    }}
                  >
                    Exportar CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => exportWidgetPdf('dash-widget-stalled-proposals', 'Propostas paradas')}
                  >
                    Exportar PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() =>
                      openDrilldown(
                        'Propostas paradas',
                        'stalledProposals',
                        describeDrilldownHint('Propostas paradas'),
                      )
                    }
                  >
                    Ver todas
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {stalledProposalsRows.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                    onClick={() => onNavigate('proposals')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-900">{p.title}</p>
                        <p className="text-xs text-gray-500">{p.client} • {p.daysWithoutUpdate} dias sem atualização</p>
                      </div>
                      <p className="text-sm text-gray-700">{formatCurrency(p.amountCents)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </WidgetCard>

            <WidgetCard
              id="dash-widget-high-value-open-proposals"
              title="Alto valor em negociação"
              subtitle={`Prioridades do pipeline aberto • ${describeQuerySource(commercialHighValueOpenQ.source)}`}
              loading={commercialHighValueLoading}
              error={commercialHighValueError}
              empty={highValueOpenRows.length === 0 && commercialHighValueOpenQ.status === 'ready'}
              emptyTitle="Sem negociações prioritárias"
              emptyDescription={smartEmpty('Nenhuma proposta de alto valor apareceu no recorte atual.')}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => commercialHighValueOpenQ.refetch()}>
                    Recarregar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => {
                      const rows: DrilldownRow[] = highValueOpenRows.map((p) => ({
                        id: p.id,
                        title: p.title,
                        subtitle: p.client,
                        status: p.status,
                        amountCents: p.amountCents,
                        fields: {
                          daysWithoutUpdate: p.daysWithoutUpdate,
                          responsibleUser: p.responsibleUser,
                        },
                      }));
                      exportDrilldownCsv('alto_valor_negociacao', rows, getDrilldownSpec('highValueOpenProposals').columns);
                    }}
                  >
                    Exportar CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => exportWidgetPdf('dash-widget-high-value-open-proposals', 'Alto valor em negociação')}
                  >
                    Exportar PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() =>
                      openDrilldown(
                        'Alto valor em negociação',
                        'highValueOpenProposals',
                        describeDrilldownHint('Alto valor em negociação'),
                      )
                    }
                  >
                    Ver detalhes
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {highValueOpenRows.slice(0, 5).map((proposal) => (
                  <div key={proposal.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-900">{proposal.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{proposal.client}{proposal.responsibleUser ? ` • ${proposal.responsibleUser}` : ''}</p>
                        <p className="text-xs text-gray-500 mt-1">{proposal.daysWithoutUpdate} dias sem atualização{proposal.status ? ` • ${proposal.status}` : ''}</p>
                      </div>
                      <p className="text-sm text-gray-700">{formatCurrency(proposal.amountCents)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </WidgetCard>
          </div>
        </div>
      ) : null}

      {tab === 'operacoes' ? (
        <div id="dashboard-export-root" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <KpiCard
              label="Campanhas ativas"
              value={String(oohOpsSummary.campaignsActiveCount ?? oohOpsItems.length)}
              helper="Campanhas OOH válidas para o período e com sinal operacional ativo."
              loading={oohOpsQ.status === 'loading' && !oohOpsDto}
              onClick={() => openDrilldown('Campanhas ativas', 'campaignsActive', describeDrilldownHint('Campanhas ativas'))}
            />
            <KpiCard
              label="Aguardando material"
              value={String(oohOpsSummary.awaitingMaterialCount)}
              helper="Campanhas que dependem de material para avançar na operação."
              loading={oohOpsQ.status === 'loading' && !oohOpsDto}
              onClick={() => openDrilldown('Aguardando material', 'awaitingMaterial', describeDrilldownHint('Campanhas aguardando material'))}
            />
            <KpiCard
              label="Em instalação"
              value={String(oohOpsSummary.installationCount)}
              helper="Campanhas em implantação no recorte operacional atual."
              loading={oohOpsQ.status === 'loading' && !oohOpsDto}
              onClick={() => openDrilldown('Instalações vencidas', 'overdueInstallations', describeDrilldownHint('Instalações vencidas'))}
            />
            <KpiCard
              label="Check-in pendente"
              value={String(oohOpsSummary.pendingCheckinsCount)}
              helper="Itens ainda sem comprovação, mas dentro do prazo operacional."
              loading={oohOpsQ.status === 'loading' && !oohOpsDto}
              onClick={() => openDrilldown('Itens sem check-in', 'missingCheckins', describeDrilldownHint('Itens sem check-in'))}
            />
            <KpiCard
              label="Check-in em atraso"
              value={String(oohOpsSummary.overdueCheckinsCount)}
              helper="Itens sem check-in já vencidos e que exigem ação imediata."
              loading={oohOpsQ.status === 'loading' && !oohOpsDto}
              onClick={() => openDrilldown('Campanhas críticas', 'criticalCampaigns', describeDrilldownHint('Campanhas críticas'))}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-7">
              <WidgetCard
                id="dash-widget-ooh-ops"
                title="Status operacional (OOH)"
                subtitle={`Execução, SLA e criticidade • ${describeQuerySource(oohOpsQ.source)}`}
                loading={oohOpsQ.status === 'loading' && !oohOpsDto}
                error={widgetError('Falha ao carregar status operacional', oohOpsQ)}
                empty={oohOpsItems.length === 0 && oohOpsQ.status === 'ready'}
                emptyTitle="Sem campanhas operacionais"
                emptyDescription={smartEmpty('Nenhuma campanha OOH operacional foi encontrada para o recorte atual.')}
                actions={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9" onClick={() => oohOpsQ.refetch()}>
                      Recarregar
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() =>
                        exportDrilldownCsv(
                          'status_operacional_ooh',
                          oohOpsItems.map((item) => ({
                            id: item.id,
                            title: item.title,
                            subtitle: item.client || item.city,
                            status: item.status,
                            fields: {
                              city: item.city,
                              client: item.client,
                              dueDate: item.dueDate,
                              campaignStatus: item.campaignStatus,
                              missingCheckinsCount: item.missingCheckinsCount,
                              priority: item.priority,
                              reason: item.reason,
                            },
                          })),
                        )
                      }
                    >
                      Exportar CSV
                    </Button>
                    <Button variant="outline" className="h-9" onClick={() => exportWidgetPdf('dash-widget-ooh-ops', 'Status operacional OOH')}>
                      Exportar PDF
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => openDrilldown('Status operacional (OOH)', 'oohOps', describeDrilldownHint('Status operacional OOH'))}
                    >
                      Ver detalhes
                    </Button>
                  </div>
                }
              >
                <div className="space-y-3">
                  {oohOpsItems.slice(0, 6).map((item) => {
                    const pill =
                      item.status === 'OK'
                        ? 'bg-green-100 text-green-700'
                        : item.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-700';
                    return (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm text-gray-900">{item.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{item.client || 'Cliente sem nome'}{item.city ? ` • ${item.city}` : ''}</p>
                            <p className="text-xs text-gray-500 mt-1">{item.reason || 'Sem motivo registrado'}{item.dueDate ? ` • Prazo: ${formatShortDate(item.dueDate)}` : ''}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${pill}`}>{item.status}</span>
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-xs text-gray-500 mt-3">OOH usa sinais operacionais reais de campanhas, instalação e check-ins, sempre respeitando o recorte global atual.</p>
                </div>
              </WidgetCard>
            </div>

            <div className="xl:col-span-5">
              <WidgetCard
                id="dash-widget-dooh-summary"
                title="Resumo operacional (DOOH)"
                subtitle={`Telas, campanhas vinculadas e atividade recente • ${describeQuerySource(doohSummaryQ.source)}`}
                loading={doohSummaryQ.status === 'loading' && !doohSummaryDto}
                error={widgetError('Falha ao carregar resumo operacional DOOH', doohSummaryQ)}
                empty={doohSummaryRows.length === 0 && doohSummaryQ.status === 'ready'}
                emptyTitle="Sem telas DOOH"
                emptyDescription={smartEmpty('Nenhuma tela DOOH encontrada com os filtros atuais.')}
                actions={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9" onClick={() => doohSummaryQ.refetch()}>
                      Recarregar
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => {
                        const rows: DrilldownRow[] = doohSummaryRows.map((row) => ({
                          id: row.id,
                          title: row.screen,
                          subtitle: row.city,
                          fields: {
                            healthScorePercent: row.healthScorePercent || row.uptimePercent || 0,
                            activeCampaignsCount: row.activeCampaignsCount || row.plays || 0,
                            lastActivityAt: row.lastActivityAt || row.lastSeen,
                          },
                        }));
                        exportDrilldownCsv('dooh_resumo_operacional', rows);
                      }}
                    >
                      Exportar CSV
                    </Button>
                    <Button variant="outline" className="h-9" onClick={() => exportWidgetPdf('dash-widget-dooh-summary', 'Resumo operacional DOOH')}>
                      Exportar PDF
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => openDrilldown('Resumo operacional (DOOH)', 'doohSummary', describeDrilldownHint('Resumo operacional DOOH'))}
                    >
                      Ver detalhes
                    </Button>
                  </div>
                }
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Telas ativas</p>
                      <p className="text-lg text-gray-900 mt-1">{doohOpsSummary.screenCount}</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Campanhas DOOH ativas</p>
                      <p className="text-lg text-gray-900 mt-1">{doohOpsSummary.activeCampaignsCount}</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Saúde média</p>
                      <p className="text-lg text-gray-900 mt-1">{doohOpsSummary.healthScoreAvg}%</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Sem atividade recente</p>
                      <p className="text-lg text-gray-900 mt-1">{doohOpsSummary.lowActivityCount ?? doohOpsSummary.offlineCount ?? 0}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {doohSummaryRows.slice(0, 4).map((row) => (
                      <div key={row.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm text-gray-900">{row.screen}</p>
                            <p className="text-xs text-gray-500 mt-1">{row.city || 'Sem cidade'} • Campanhas ativas: {row.activeCampaignsCount || row.plays || 0}</p>
                            <p className="text-xs text-gray-500 mt-1">Última atividade: {(row.lastActivityAt || row.lastSeen) ? formatShortDate(row.lastActivityAt || row.lastSeen || '') : '—'}</p>
                          </div>
                          <p className="text-sm text-gray-700">{row.healthScorePercent || row.uptimePercent || 0}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">DOOH permanece como resumo operacional. Não exibimos proof-of-play técnico real sem telemetria adequada.</p>
                </div>
              </WidgetCard>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <WidgetCard
              id="dash-widget-critical-campaigns"
              title="Campanhas críticas"
              subtitle={`Ação imediata • ${describeQuerySource(oohOpsQ.source)}`}
              loading={oohOpsQ.status === 'loading' && !oohOpsDto}
              error={widgetError('Falha ao carregar campanhas críticas', oohOpsQ)}
              empty={criticalCampaignRows.length === 0 && oohOpsQ.status === 'ready'}
              emptyTitle="Sem campanhas críticas"
              emptyDescription={smartEmpty('Nenhuma campanha crítica encontrada para o recorte atual.')}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => exportDrilldownCsv('campanhas_criticas', criticalCampaignRows.map((item) => ({ id: item.id, title: item.title, subtitle: item.client || item.city, status: item.priority, fields: { reason: item.reason, dueDate: item.dueDate, missingCheckinsCount: item.missingCheckinsCount } })))}>
                    Exportar CSV
                  </Button>
                  <Button variant="outline" className="h-9" onClick={() => openDrilldown('Campanhas críticas', 'criticalCampaigns', describeDrilldownHint('Campanhas críticas'))}>
                    Ver detalhes
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {criticalCampaignRows.slice(0, 5).map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.client || 'Cliente sem nome'}{item.city ? ` • ${item.city}` : ''}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.reason || 'Operação crítica'}{item.dueDate ? ` • Prazo: ${formatShortDate(item.dueDate)}` : ''}</p>
                  </div>
                ))}
                {criticalCampaignRows.length > 5 ? <p className="text-xs text-gray-500">+{criticalCampaignRows.length - 5} item(ns)</p> : null}
              </div>
            </WidgetCard>

            <WidgetCard
              id="dash-widget-overdue-installations"
              title="Instalações vencidas"
              subtitle={`Prazo estourado • ${describeQuerySource(oohOpsQ.source)}`}
              loading={oohOpsQ.status === 'loading' && !oohOpsDto}
              error={widgetError('Falha ao carregar instalações vencidas', oohOpsQ)}
              empty={overdueInstallationRows.length === 0 && oohOpsQ.status === 'ready'}
              emptyTitle="Sem instalações vencidas"
              emptyDescription={smartEmpty('Nenhuma instalação vencida encontrada para o recorte atual.')}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => exportDrilldownCsv('instalacoes_vencidas', overdueInstallationRows.map((item) => ({ id: item.id, title: item.title, subtitle: item.client || item.city, status: item.priority, fields: { reason: item.reason, dueDate: item.dueDate } })))}>
                    Exportar CSV
                  </Button>
                  <Button variant="outline" className="h-9" onClick={() => openDrilldown('Instalações vencidas', 'overdueInstallations', describeDrilldownHint('Instalações vencidas'))}>
                    Ver detalhes
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {overdueInstallationRows.slice(0, 5).map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.client || 'Cliente sem nome'}{item.city ? ` • ${item.city}` : ''}</p>
                    <p className="text-xs text-gray-500 mt-1">Prazo: {item.dueDate ? formatShortDate(item.dueDate) : '—'}</p>
                  </div>
                ))}
              </div>
            </WidgetCard>

            <WidgetCard
              id="dash-widget-missing-checkins"
              title="Itens sem check-in"
              subtitle={`Comprovação pendente • ${describeQuerySource(oohOpsQ.source)}`}
              loading={oohOpsQ.status === 'loading' && !oohOpsDto}
              error={widgetError('Falha ao carregar itens sem check-in', oohOpsQ)}
              empty={missingCheckinRows.length === 0 && oohOpsQ.status === 'ready'}
              emptyTitle="Sem itens pendentes"
              emptyDescription={smartEmpty('Nenhum item sem check-in encontrado para o recorte atual.')}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => exportDrilldownCsv('itens_sem_checkin', missingCheckinRows.map((item) => ({ id: item.id, title: item.title, subtitle: item.client || item.city, status: item.priority, fields: { missingCheckinsCount: item.missingCheckinsCount, dueDate: item.dueDate, overdue: item.overdue } })))}>
                    Exportar CSV
                  </Button>
                  <Button variant="outline" className="h-9" onClick={() => openDrilldown('Itens sem check-in', 'missingCheckins', describeDrilldownHint('Itens sem check-in'))}>
                    Ver detalhes
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {missingCheckinRows.slice(0, 5).map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.client || 'Cliente sem nome'}{item.city ? ` • ${item.city}` : ''}</p>
                    <p className="text-xs text-gray-500 mt-1">Itens pendentes: {item.missingCheckinsCount || 0}{item.dueDate ? ` • Prazo: ${formatShortDate(item.dueDate)}` : ''}</p>
                  </div>
                ))}
              </div>
            </WidgetCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-6">
              <WidgetCard
                id="dash-widget-operations-regions"
                title="Regiões com maior atraso"
                subtitle={`Leitura territorial OOH • ${describeQuerySource(operationsLateRegionsQ.source)}`}
                loading={operationsLateRegionsQ.status === 'loading' && !operationsLateRegionsDto}
                error={widgetError('Falha ao carregar regiões com atraso', operationsLateRegionsQ)}
                empty={operationsLateRegionRows.length === 0 && operationsLateRegionsQ.status === 'ready'}
                emptyTitle="Sem regiões críticas"
                emptyDescription={smartEmpty('Nenhuma região com atraso operacional encontrada para o recorte atual.')}
                actions={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9" onClick={() => operationsLateRegionsQ.refetch()}>
                      Recarregar
                    </Button>
                    <Button variant="outline" className="h-9" onClick={() => exportDrilldownCsv('regioes_com_atraso', operationsLateRegionRows.map((row) => ({ id: row.id, title: row.region, fields: { overdueCount: row.overdueCount, overdueInstallationsCount: row.overdueInstallationsCount, overdueCheckinsCount: row.overdueCheckinsCount, totalCriticalCount: row.totalCriticalCount } })))}>
                      Exportar CSV
                    </Button>
                    <Button variant="outline" className="h-9" onClick={() => openDrilldown('Regiões com maior atraso', 'operationsLateRegions', describeDrilldownHint('Regiões com maior atraso'))}>
                      Ver detalhes
                    </Button>
                  </div>
                }
              >
                <div className="space-y-3">
                  {operationsLateRegionRows.slice(0, 6).map((row) => (
                    <div key={row.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-gray-900">{row.region}</p>
                          <p className="text-xs text-gray-500 mt-1">Instalações vencidas: {row.overdueInstallationsCount} • Check-ins em atraso: {row.overdueCheckinsCount}</p>
                        </div>
                        <p className="text-sm text-gray-700">{row.overdueCount} atraso(s)</p>
                      </div>
                    </div>
                  ))}
                </div>
              </WidgetCard>
            </div>

            <div className="xl:col-span-6">
              <WidgetCard
                id="dash-widget-operations-city-status"
                title="Campanhas por cidade/status"
                subtitle={`Distribuição operacional por cidade • ${describeQuerySource(operationsCityStatusQ.source)}`}
                loading={operationsCityStatusQ.status === 'loading' && !operationsCityStatusDto}
                error={widgetError('Falha ao carregar campanhas por cidade/status', operationsCityStatusQ)}
                empty={operationsCityStatusRows.length === 0 && operationsCityStatusQ.status === 'ready'}
                emptyTitle="Sem distribuição operacional"
                emptyDescription={smartEmpty('Nenhuma cidade com campanhas operacionais encontrada para o recorte atual.')}
                actions={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9" onClick={() => operationsCityStatusQ.refetch()}>
                      Recarregar
                    </Button>
                    <Button variant="outline" className="h-9" onClick={() => exportDrilldownCsv('campanhas_por_cidade_status', operationsCityStatusRows.map((row) => ({ id: row.id, title: row.city, fields: { totalCampaignsCount: row.totalCampaignsCount, awaitingMaterialCount: row.awaitingMaterialCount, installationCount: row.installationCount, pendingCheckinsCount: row.pendingCheckinsCount, overdueCheckinsCount: row.overdueCheckinsCount, okCount: row.okCount } })))}>
                      Exportar CSV
                    </Button>
                    <Button variant="outline" className="h-9" onClick={() => openDrilldown('Campanhas por cidade/status', 'operationsCityStatus', describeDrilldownHint('Campanhas por cidade/status'))}>
                      Ver detalhes
                    </Button>
                  </div>
                }
              >
                <div className="space-y-3">
                  {operationsCityStatusRows.slice(0, 6).map((row) => (
                    <div key={row.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-gray-900">{row.city}</p>
                          <p className="text-xs text-gray-500 mt-1">Aguardando material: {row.awaitingMaterialCount} • Em instalação: {row.installationCount}</p>
                          <p className="text-xs text-gray-500 mt-1">Check-in pendente: {row.pendingCheckinsCount} • Em atraso: {row.overdueCheckinsCount}</p>
                        </div>
                        <p className="text-sm text-gray-700">{row.totalCampaignsCount} campanha(s)</p>
                      </div>
                    </div>
                  ))}
                </div>
              </WidgetCard>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'financeiro' ? (
        <div id="dashboard-export-root" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
            <KpiCard
              label="Receita reconhecida"
              value={financialSummary ? formatCurrency(financialSummary.revenueRecognizedCents) : undefined}
              helper="Valor já reconhecido financeiramente no período filtrado."
              loading={financialKpisLoading}
              onClick={() => openDrilldown('Receita reconhecida', 'revenueRecognized', describeDrilldownHint('Receita reconhecida'))}
            />
            <KpiCard
              label="Contas a receber"
              value={financialSummary ? formatCurrency(financialSummary.receivablesOpenCents) : undefined}
              helper="Títulos em aberto e vencidos ainda não liquidados."
              loading={financialKpisLoading}
              onClick={() => openDrilldown('Contas a receber', 'receivablesOpen', describeDrilldownHint('Contas a receber'))}
            />
            <KpiCard
              label="Contas vencidas"
              value={financialSummary ? formatCurrency(financialSummary.receivablesOverdueCents) : undefined}
              helper="Valor total em atraso no recorte atual."
              loading={financialKpisLoading}
              onClick={() => openDrilldown('Contas vencidas', 'receivablesOverdue', describeDrilldownHint('Contas vencidas'))}
            />
            <KpiCard
              label="Fluxo líquido do período"
              value={financialSummary ? formatCurrency(financialSummary.netCashflowCents) : undefined}
              helper="Entradas menos saídas pagas no período selecionado."
              loading={financialKpisLoading}
            />
            <KpiCard
              label="Ticket médio faturado"
              value={financialSummary ? formatCurrency(financialSummary.averageBilledTicketCents) : undefined}
              helper="Valor médio das faturas reconhecidas no período."
              loading={financialKpisLoading}
            />
            <KpiCard
              label="Top cliente do período"
              value={financialSummary?.topClient ? formatCurrency(financialSummary.topClient.amountCents) : undefined}
              helper={financialSummary?.topClient ? `${financialSummary.topClient.name}${financialSummary.topClient.city ? ` • ${financialSummary.topClient.city}` : ''}` : 'Cliente com maior receita reconhecida no período.'}
              loading={financialKpisLoading}
              onClick={() => openDrilldown('Top clientes', 'topClients', describeDrilldownHint('Top clientes por faturamento'))}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-7">
              <WidgetCard
                id="dash-widget-finance-revenue"
                title="Revenue timeseries"
                subtitle={`Receita reconhecida no período • ${describeQuerySource(revenueTsQ.source)}`}
                loading={revenueTsQ.status === 'loading' && !revenueTsDto}
                error={widgetError('Falha ao carregar receita reconhecida', revenueTsQ)}
                empty={revenueTs.length === 0 && revenueTsQ.status === 'ready'}
                emptyTitle="Sem dados"
                emptyDescription={smartEmpty('Não há receita reconhecida para o período/filtros atuais.')}
                actions={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9" onClick={() => revenueTsQ.refetch()}>
                      Recarregar
                    </Button>
                    <Button variant="outline" className="h-9" onClick={() => exportTimeseriesCsv('revenue_timeseries', revenueTs)}>
                      Exportar CSV
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => exportWidgetPdf('dash-widget-finance-revenue', 'Revenue timeseries')}
                    >
                      Exportar PDF
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => openDrilldown('Receita reconhecida', 'revenueRecognized', describeDrilldownHint('Receita reconhecida'))}
                    >
                      Ver detalhes
                    </Button>
                  </div>
                }
              >
                <div className="space-y-4">
                  {revenueTs.length > 0 ? (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-gray-900">{formatCurrency(revenueTs.reduce((sum, point) => sum + (point.valueCents || 0), 0))}</p>
                        <p className="text-xs text-gray-500 mt-1">Período consolidado • {revenueTs.length} ponto(s)</p>
                      </div>
                      <Sparkline points={timeseriesToSpark(revenueTs)} />
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {revenueTs.slice(-8).map((point) => {
                      const max = Math.max(...revenueTs.map((entry) => Math.abs(entry.valueCents || 0)), 1);
                      const width = Math.max(6, Math.round((Math.abs(point.valueCents || 0) / max) * 100));
                      return (
                        <div key={point.date}>
                          <div className="flex items-center justify-between mb-1 gap-3">
                            <p className="text-sm text-gray-700">{formatShortDate(point.date)}</p>
                            <p className="text-sm text-gray-900">{formatCurrency(point.valueCents)}</p>
                          </div>
                          <div className="w-full h-2 rounded bg-gray-100 overflow-hidden">
                            <div className="h-2 bg-gray-300" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </WidgetCard>
            </div>

            <div className="xl:col-span-5">
              <WidgetCard
                id="dash-widget-aging"
                title="Aging de recebíveis"
                subtitle={`Distribuição por faixa • ${describeQuerySource(agingQ.source)}`}
                loading={agingQ.status === 'loading' && !agingSummary}
                error={widgetError('Falha ao carregar aging', agingQ)}
                empty={(agingSummary?.buckets?.length || 0) === 0 && agingQ.status === 'ready'}
                emptyTitle="Sem dados"
                emptyDescription={smartEmpty('Não há faixas de aging para o período/filtros atuais.')}
                actions={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9" onClick={() => agingQ.refetch()}>
                      Recarregar
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => exportAgingBucketsCsv('aging', agingSummary?.buckets || [], agingSummary?.totalCents)}
                    >
                      Exportar CSV
                    </Button>
                    <Button variant="outline" className="h-9" onClick={() => exportWidgetPdf('dash-widget-aging', 'Aging de recebíveis')}>
                      Exportar PDF
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => openDrilldown('Aging', 'aging', describeDrilldownHint('Aging de contas a receber'))}
                    >
                      Ver lista
                    </Button>
                  </div>
                }
              >
                <div className="space-y-3">
                  {(agingSummary?.buckets || []).map((bucket) => {
                    const max = Math.max(...(agingSummary?.buckets || []).map((entry) => entry.amountCents), 1);
                    const width = Math.round((bucket.amountCents / max) * 100);
                    return (
                      <div key={bucket.label}>
                        <div className="flex items-center justify-between mb-1 gap-3">
                          <p className="text-sm text-gray-700">{bucket.label}</p>
                          <p className="text-sm text-gray-900">{formatCurrency(bucket.amountCents)}</p>
                        </div>
                        <div className="w-full h-2 rounded bg-gray-100 overflow-hidden">
                          <div className="h-2 bg-gray-300" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </WidgetCard>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-7">
              <WidgetCard
                id="dash-widget-cashflow"
                title="Cashflow timeseries"
                subtitle={`Fluxo de caixa líquido • ${describeQuerySource(cashflowTsQ.source)}`}
                loading={cashflowTsQ.status === 'loading' && !cashflowTsDto}
                error={widgetError('Falha ao carregar fluxo de caixa', cashflowTsQ)}
                empty={cashflowTs.length === 0 && cashflowTsQ.status === 'ready'}
                emptyTitle="Sem dados"
                emptyDescription={smartEmpty('Não há movimentações para o período/filtros atuais.')}
                actions={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9" onClick={() => cashflowTsQ.refetch()}>
                      Recarregar
                    </Button>
                    <Button variant="outline" className="h-9" onClick={() => exportTimeseriesCsv('cashflow_timeseries', cashflowTs)}>
                      Exportar CSV
                    </Button>
                    <Button variant="outline" className="h-9" onClick={() => exportWidgetPdf('dash-widget-cashflow', 'Cashflow timeseries')}>
                      Exportar PDF
                    </Button>
                  </div>
                }
              >
                {cashflowTs.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-gray-900">{formatCurrency(cashflowTs.reduce((sum, point) => sum + (point.valueCents || 0), 0))}</p>
                        <p className="text-xs text-gray-500 mt-1">Saldo líquido do período filtrado</p>
                      </div>
                      <Sparkline points={timeseriesToSpark(cashflowTs)} />
                    </div>

                    <div className="space-y-3">
                      {cashflowTs.slice(-8).map((point) => {
                        const max = Math.max(...cashflowTs.map((entry) => Math.abs(entry.valueCents || 0)), 1);
                        const width = Math.max(6, Math.round((Math.abs(point.valueCents || 0) / max) * 100));
                        return (
                          <div key={point.date}>
                            <div className="flex items-center justify-between mb-1 gap-3">
                              <p className="text-sm text-gray-700">{formatShortDate(point.date)}</p>
                              <p className="text-sm text-gray-900">{formatCurrency(point.valueCents)}</p>
                            </div>
                            <div className="w-full h-2 rounded bg-gray-100 overflow-hidden">
                              <div className="h-2 bg-gray-300" style={{ width: `${width}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-40 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-500">
                    Série sem dados
                  </div>
                )}
              </WidgetCard>
            </div>

            <div className="xl:col-span-5">
              <WidgetCard
                id="dash-widget-receivables-composition"
                title="Composição recebido vs aberto vs vencido"
                subtitle={`Leitura simples de liquidez e risco • ${describeQuerySource(receivablesCompositionQ.source)}`}
                loading={financialCompositionLoading}
                error={widgetError('Falha ao carregar composição financeira', receivablesCompositionQ)}
                empty={!receivablesComposition?.totalCents && receivablesCompositionQ.status === 'ready'}
                emptyTitle="Sem dados"
                emptyDescription={smartEmpty('Não há composição financeira para o período/filtros atuais.')}
                actions={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9" onClick={() => receivablesCompositionQ.refetch()}>
                      Recarregar
                    </Button>
                    <Button variant="outline" className="h-9" onClick={() => exportWidgetPdf('dash-widget-receivables-composition', 'Composição financeiro')}>
                      Exportar PDF
                    </Button>
                  </div>
                }
              >
                <div className="space-y-4">
                  {[
                    { label: 'Recebido', value: receivablesComposition?.receivedCents || 0 },
                    { label: 'Em aberto', value: receivablesComposition?.openCents || 0 },
                    { label: 'Vencido', value: receivablesComposition?.overdueCents || 0 },
                  ].map((item) => {
                    const total = Math.max(1, receivablesComposition?.totalCents || 0);
                    const share = Math.round((item.value / total) * 100);
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1 gap-3">
                          <p className="text-sm text-gray-700">{item.label}</p>
                          <div className="text-right">
                            <p className="text-sm text-gray-900">{formatCurrency(item.value)}</p>
                            <p className="text-xs text-gray-500">{share}%</p>
                          </div>
                        </div>
                        <div className="w-full h-2 rounded bg-gray-100 overflow-hidden">
                          <div className="h-2 bg-gray-300" style={{ width: `${Math.max(6, share)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </WidgetCard>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <WidgetCard
              id="dash-widget-critical-invoices"
              title="Faturas críticas"
              subtitle={`Ação financeira imediata • ${describeQuerySource(criticalInvoicesQ.source)}`}
              loading={criticalInvoicesQ.status === 'loading' && !criticalInvoicesDto}
              error={widgetError('Falha ao carregar faturas críticas', criticalInvoicesQ)}
              empty={criticalInvoicesRows.length === 0 && criticalInvoicesQ.status === 'ready'}
              emptyTitle="Sem faturas críticas"
              emptyDescription={smartEmpty('Nenhuma fatura crítica encontrada para o recorte atual.')}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => criticalInvoicesQ.refetch()}>
                    Recarregar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => exportDrilldownCsv('faturas_criticas', criticalInvoicesRows.map((row) => ({ id: row.id, title: row.title, subtitle: row.client, amountCents: row.amountCents, status: row.status, fields: { dueDate: row.dueDate, daysLate: row.daysLate } })))}
                  >
                    Exportar CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => openDrilldown('Faturas críticas', 'criticalInvoices', describeDrilldownHint('Faturas críticas'))}
                  >
                    Ver detalhes
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {criticalInvoicesRows.slice(0, 5).map((row) => (
                  <div key={row.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-900">{row.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{row.client} • Vencimento: {formatShortDate(row.dueDate)}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${row.status === 'VENCIDA' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'}`}>{row.status}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-sm">
                      <span className="text-gray-500">{row.daysLate > 0 ? `${row.daysLate} dias de atraso` : 'Vence em breve'}</span>
                      <span className="text-gray-900">{formatCurrency(row.amountCents)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </WidgetCard>

            <WidgetCard
              id="dash-widget-late-clients"
              title="Clientes com maior atraso"
              subtitle={`Concentração de risco por cliente • ${describeQuerySource(lateClientsQ.source)}`}
              loading={lateClientsQ.status === 'loading' && !lateClientsDto}
              error={widgetError('Falha ao carregar clientes em atraso', lateClientsQ)}
              empty={lateClientsRows.length === 0 && lateClientsQ.status === 'ready'}
              emptyTitle="Sem clientes em atraso"
              emptyDescription={smartEmpty('Nenhum cliente em atraso encontrado para o recorte atual.')}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => lateClientsQ.refetch()}>
                    Recarregar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => exportDrilldownCsv('clientes_em_atraso', lateClientsRows.map((row) => ({ id: row.id, title: row.name, subtitle: row.city, amountCents: row.overdueAmountCents, fields: { overdueInvoicesCount: row.overdueInvoicesCount, maxDaysLate: row.maxDaysLate } })))}
                  >
                    Exportar CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => openDrilldown('Clientes com maior atraso', 'lateClients', describeDrilldownHint('Clientes com maior atraso'))}
                  >
                    Ver detalhes
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {lateClientsRows.slice(0, 5).map((row) => (
                  <div key={row.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-900">{row.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{row.city || 'Sem cidade'} • {row.overdueInvoicesCount} fatura(s)</p>
                      </div>
                      <span className="text-sm text-gray-900">{formatCurrency(row.overdueAmountCents)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">Maior atraso: {row.maxDaysLate} dias</p>
                  </div>
                ))}
              </div>
            </WidgetCard>

            <WidgetCard
              id="dash-widget-largest-open"
              title="Maiores contas em aberto"
              subtitle={`Maiores títulos pendentes • ${describeQuerySource(largestOpenReceivablesQ.source)}`}
              loading={largestOpenReceivablesQ.status === 'loading' && !largestOpenReceivablesDto}
              error={widgetError('Falha ao carregar contas em aberto', largestOpenReceivablesQ)}
              empty={largestOpenReceivablesRows.length === 0 && largestOpenReceivablesQ.status === 'ready'}
              emptyTitle="Sem contas em aberto"
              emptyDescription={smartEmpty('Nenhuma conta em aberto encontrada para o recorte atual.')}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => largestOpenReceivablesQ.refetch()}>
                    Recarregar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => exportDrilldownCsv('maiores_contas_abertas', largestOpenReceivablesRows.map((row) => ({ id: row.id, title: row.title, subtitle: row.client, amountCents: row.amountCents, status: row.status, fields: { dueDate: row.dueDate, daysLate: row.daysLate } })))}
                  >
                    Exportar CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => openDrilldown('Maiores contas em aberto', 'largestOpenReceivables', describeDrilldownHint('Maiores contas em aberto'))}
                  >
                    Ver detalhes
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {largestOpenReceivablesRows.slice(0, 5).map((row) => (
                  <div key={row.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-900">{row.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{row.client} • {formatShortDate(row.dueDate)}</p>
                      </div>
                      <span className="text-sm text-gray-900">{formatCurrency(row.amountCents)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">{row.status === 'VENCIDA' ? `${row.daysLate} dias de atraso` : 'Ainda no prazo'}</p>
                  </div>
                ))}
              </div>
            </WidgetCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <WidgetCard
              id="dash-widget-finance-top-clients"
              title="Top clientes por faturamento"
              subtitle={`Receita reconhecida por cliente • ${describeQuerySource(topClientsQ.source)}`}
              loading={topClientsQ.status === 'loading' && !topClientsDto}
              error={widgetError('Falha ao carregar top clientes', topClientsQ)}
              empty={topClientsRows.length === 0 && topClientsQ.status === 'ready'}
              emptyTitle="Sem clientes"
              emptyDescription={smartEmpty('Nenhum cliente encontrado para o recorte atual.')}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => topClientsQ.refetch()}>
                    Recarregar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => exportDrilldownCsv('top_clientes_faturamento', topClientsRows.map((row) => ({ id: row.id, title: row.name, subtitle: row.city, amountCents: row.amountCents, fields: { campaignsCount: row.campaignsCount, averageTicketCents: row.averageTicketCents } })))}
                  >
                    Exportar CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => openDrilldown('Top clientes', 'topClients', describeDrilldownHint('Top clientes por faturamento'))}
                  >
                    Ver detalhes
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {topClientsRows.slice(0, 6).map((row) => (
                  <div key={row.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-900">{row.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{row.city || 'Sem cidade'} • {row.campaignsCount} campanha(s)</p>
                      </div>
                      <span className="text-sm text-gray-900">{formatCurrency(row.amountCents)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </WidgetCard>

            <WidgetCard
              id="dash-widget-largest-expenses"
              title="Maiores despesas do período"
              subtitle={`Saídas pagas com maior peso no caixa • ${describeQuerySource(largestExpensesQ.source)}`}
              loading={largestExpensesQ.status === 'loading' && !largestExpensesDto}
              error={widgetError('Falha ao carregar despesas do período', largestExpensesQ)}
              empty={largestExpensesRows.length === 0 && largestExpensesQ.status === 'ready'}
              emptyTitle="Sem despesas relevantes"
              emptyDescription={smartEmpty('Nenhuma despesa relevante encontrada para o recorte atual.')}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => largestExpensesQ.refetch()}>
                    Recarregar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => exportDrilldownCsv('maiores_despesas', largestExpensesRows.map((row) => ({ id: row.id, title: row.description, subtitle: row.partnerName || row.categoryName, amountCents: row.amountCents, status: row.flowType, fields: { date: row.date, categoryName: row.categoryName } })))}
                  >
                    Exportar CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => openDrilldown('Maiores despesas do período', 'largestExpenses', describeDrilldownHint('Maiores despesas do período'))}
                  >
                    Ver detalhes
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {largestExpensesRows.slice(0, 6).map((row) => (
                  <div key={row.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-900">{row.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{row.partnerName || row.categoryName || 'Sem parceiro'} • {formatShortDate(row.date)}</p>
                      </div>
                      <span className="text-sm text-gray-900">{formatCurrency(row.amountCents)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">{row.flowType || 'Despesa'}</p>
                  </div>
                ))}
              </div>
            </WidgetCard>
          </div>
        </div>
      ) : null}

      {tab === 'inventario' ? (
        <div id="dashboard-export-root" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
            <KpiCard
              label="Total de pontos"
              value={String(inventorySummary.totalPoints || 0)}
              helper="Pontos do inventário no recorte atual."
              loading={inventorySummaryQ.status === 'loading' && !inventorySummaryDto && inventoryPins.length === 0}
              onClick={() => onNavigate('inventory')}
            />
            <KpiCard
              label="Total de faces/telas"
              value={String(inventorySummary.totalUnits || 0)}
              helper="Unidades ativas ligadas aos pontos filtrados."
              loading={inventorySummaryQ.status === 'loading' && !inventorySummaryDto && inventoryPins.length === 0}
            />
            <KpiCard
              label="Ocupação média"
              value={`${inventorySummary.occupancyPercent || 0}%`}
              helper="Percentual médio comprometido no período selecionado."
              loading={inventorySummaryQ.status === 'loading' && !inventorySummaryDto && inventoryPins.length === 0}
              onClick={() => openDrilldown('Inventário — ocupação', 'occupancy', describeDrilldownHint('Inventário — ocupação'))}
            />
            <KpiCard
              label="Cidades ativas"
              value={String(inventorySummary.activeCitiesCount || 0)}
              helper="Praças com pontos ativos no recorte aplicado."
              loading={inventorySummaryQ.status === 'loading' && !inventorySummaryDto && inventoryPins.length === 0}
            />
            <KpiCard
              label="Pontos com disponibilidade"
              value={String(inventorySummary.pointsWithAvailabilityCount || 0)}
              helper="Pontos com ao menos uma unidade ainda disponível."
              loading={inventorySummaryQ.status === 'loading' && !inventorySummaryDto && inventoryPins.length === 0}
            />
            <KpiCard
              label="Campanhas ativas por inventário"
              value={String(inventorySummary.activeCampaignsCount || 0)}
              helper="Campanhas ativas vinculadas ao inventário filtrado."
              loading={inventorySummaryQ.status === 'loading' && !inventorySummaryDto && inventoryPins.length === 0}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8">
              <WidgetCard
                id="dash-widget-inventory-map"
                title="Mapa real do inventário"
                subtitle={`Leitura espacial alinhada ao Mídia Map • ${describeQuerySource(inventoryMapQ.source)}`}
                loading={inventoryMapQ.status === 'loading' && !inventoryMapDto}
                error={widgetError('Falha ao carregar mapa do inventário', inventoryMapQ)}
                empty={inventoryPins.length === 0 && inventoryMapQ.status === 'ready'}
                emptyTitle="Sem pontos"
                emptyDescription={smartEmpty('Nenhum ponto encontrado para os filtros atuais.')}
                actions={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9" onClick={() => inventoryMapQ.refetch()}>
                      Recarregar
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => exportWidgetPdf('dash-widget-inventory-map', 'Mapa real do inventário')}
                    >
                      Exportar PDF
                    </Button>
                  </div>
                }
              >
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Cada pin resume ocupação, campanhas ativas, unidades disponíveis e receita do período no ponto.
                  </p>
                  <InventoryMap
                    pins={inventoryPins}
                    height={360}
                    onPinClick={(pin) =>
                      openDrilldown(`Ponto — ${pin.label}`, 'inventoryPin', describeDrilldownHint(`Ponto — ${pin.label}`), {
                        pinId: pin.id,
                        region: pin.region || [pin.city, pin.state].filter(Boolean).join(' / ') || undefined,
                        line: pin.line || undefined,
                      })
                    }
                  />
                </div>
              </WidgetCard>
            </div>

            <div className="xl:col-span-4">
              <WidgetCard
                id="dash-widget-inventory-opportunities"
                title="Resumo de oportunidade"
                subtitle={`Ociosidade, concentração e pontos premium subutilizados • ${describeQuerySource(inventoryOpportunitySummaryQ.source)}`}
                loading={inventoryOpportunitySummaryQ.status === 'loading' && !inventoryOpportunitySummaryDto}
                error={widgetError('Falha ao carregar oportunidades', inventoryOpportunitySummaryQ)}
                empty={inventoryOpportunityRows.length === 0 && inventoryOpportunitySummaryQ.status === 'ready'}
                emptyTitle="Sem oportunidades destacadas"
                emptyDescription={smartEmpty('O recorte atual não gerou alertas de oportunidade relevantes.')}
                actions={
                  <Button variant="outline" className="h-9" onClick={() => inventoryOpportunitySummaryQ.refetch()}>
                    Recarregar
                  </Button>
                }
              >
                <div className="space-y-3">
                  {inventoryOpportunityRows.slice(0, 6).map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      className="w-full rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50"
                      onClick={() => {
                        if (row.pointId) {
                          openDrilldown(`Ponto — ${row.pointLabel || row.title}`, 'inventoryPin', describeDrilldownHint(`Ponto — ${row.pointLabel || row.title}`), {
                            pinId: row.pointId,
                          });
                          return;
                        }
                        if (row.region) {
                          openDrilldown(`Inventário — ${row.region}`, 'inventoryRegionDistribution', describeDrilldownHint(`Inventário — ${row.region}`), {
                            region: row.region,
                          });
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <SeverityDot severity={row.severity} />
                            <p className="text-sm text-gray-900">{row.title}</p>
                          </div>
                          {row.subtitle ? <p className="text-xs text-gray-500 mt-1">{row.subtitle}</p> : null}
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">{row.kind === 'PREMIUM_LOW_SALES' ? 'premium' : row.kind === 'LOW_OCCUPANCY_REGION' ? 'baixa ocupação' : 'concentração'}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-md border border-gray-200 px-2 py-1">
                          <p className="text-gray-500">Ocupação</p>
                          <p className="text-gray-900 tabular-nums">{row.occupancyPercent ?? 0}%</p>
                        </div>
                        <div className="rounded-md border border-gray-200 px-2 py-1">
                          <p className="text-gray-500">Campanhas</p>
                          <p className="text-gray-900 tabular-nums">{row.activeCampaigns ?? 0}</p>
                        </div>
                        <div className="rounded-md border border-gray-200 px-2 py-1">
                          <p className="text-gray-500">Receita</p>
                          <p className="text-gray-900 tabular-nums">{formatCurrency(row.revenueCents || 0)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </WidgetCard>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-7">
              <WidgetCard
                id="dash-widget-inventory-ranking"
                title="Ranking dos pontos"
                subtitle={`Pontos com melhor combinação de ocupação, campanhas e receita • ${describeQuerySource(inventoryRankingQ.source)}`}
                loading={inventoryRankingQ.status === 'loading' && !inventoryRankingDto}
                error={widgetError('Falha ao carregar ranking do inventário', inventoryRankingQ)}
                empty={inventoryRankingRows.length === 0 && inventoryRankingQ.status === 'ready'}
                emptyTitle="Sem ranking"
                emptyDescription={smartEmpty('Ainda não há pontos ranqueados no recorte atual.')}
                actions={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9" onClick={() => inventoryRankingQ.refetch()}>
                      Recarregar
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => openDrilldown('Ranking de pontos', 'inventoryRanking', describeDrilldownHint('Ranking de pontos'))}
                    >
                      Ver lista
                    </Button>
                  </div>
                }
              >
                <div className="space-y-3">
                  {inventoryRankingRows.slice(0, 6).map((row, idx) => (
                    <button
                      key={row.id}
                      type="button"
                      className="w-full rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50"
                      onClick={() => openDrilldown(`Ponto — ${row.label}`, 'inventoryPin', describeDrilldownHint(`Ponto — ${row.label}`), { pinId: row.id })}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-gray-900">{idx + 1}. {row.label}</p>
                          <p className="text-xs text-gray-500 mt-1">{[row.city, row.state].filter(Boolean).join(' / ') || 'Sem praça'} • {row.type || 'Inventário'}{row.subcategory ? ` • ${row.subcategory}` : ''}</p>
                        </div>
                        <span className="text-sm text-gray-900 tabular-nums">{Math.round(row.occupancyPercent)}%</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span>{row.activeCampaigns} campanha(s)</span>
                        <span>{row.unitsCount || 0} unidade(s)</span>
                        <span>{formatCurrency(row.revenueCents)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </WidgetCard>
            </div>

            <div className="xl:col-span-5">
              <WidgetCard
                id="dash-widget-inventory-region-distribution"
                title="Distribuição por cidade/estado"
                subtitle={`Concentração territorial e disponibilidade por praça • ${describeQuerySource(inventoryRegionDistributionQ.source)}`}
                loading={inventoryRegionDistributionQ.status === 'loading' && !inventoryRegionDistributionDto}
                error={widgetError('Falha ao carregar distribuição regional', inventoryRegionDistributionQ)}
                empty={inventoryRegionRows.length === 0 && inventoryRegionDistributionQ.status === 'ready'}
                emptyTitle="Sem distribuição"
                emptyDescription={smartEmpty('Ainda não há regiões suficientes para compor a distribuição.')}
                actions={
                  <Button variant="outline" className="h-9" onClick={() => inventoryRegionDistributionQ.refetch()}>
                    Recarregar
                  </Button>
                }
              >
                <div className="space-y-3">
                  {inventoryRegionRows.slice(0, 6).map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      className="w-full rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50"
                      onClick={() => openDrilldown(`Inventário — ${row.label}`, 'inventoryRegionDistribution', describeDrilldownHint(`Inventário — ${row.label}`), { region: row.label })}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-gray-900">{row.label}</p>
                          <p className="text-xs text-gray-500 mt-1">{row.pointsCount} ponto(s) • {row.unitsCount} unidade(s) • {row.availablePointsCount} com disponibilidade</p>
                        </div>
                        <span className="text-sm text-gray-900 tabular-nums">{row.occupancyPercent}%</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span>{row.activeCampaigns} campanha(s)</span>
                        <span>{formatCurrency(row.revenueCents)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </WidgetCard>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <WidgetCard
              id="dash-widget-inventory-type-distribution"
              title="Distribuição por tipo"
              subtitle={`Composição do inventário por OOH/DOOH • ${describeQuerySource(inventoryTypeDistributionQ.source)}`}
              loading={inventoryTypeDistributionQ.status === 'loading' && !inventoryTypeDistributionDto}
              error={widgetError('Falha ao carregar distribuição por tipo', inventoryTypeDistributionQ)}
              empty={inventoryTypeRows.length === 0 && inventoryTypeDistributionQ.status === 'ready'}
              emptyTitle="Sem composição"
              emptyDescription={smartEmpty('Ainda não há dados para distribuir o inventário por tipo.')}
              actions={
                <Button variant="outline" className="h-9" onClick={() => inventoryTypeDistributionQ.refetch()}>
                  Recarregar
                </Button>
              }
            >
              <div className="space-y-3">
                {inventoryTypeRows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className="w-full rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50"
                    onClick={() => openDrilldown(`Inventário — ${row.label}`, 'inventoryTypeDistribution', describeDrilldownHint(`Inventário — ${row.label}`), { type: row.type || row.label })}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-900">{row.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{row.pointsCount} ponto(s) • {row.unitsCount} unidade(s)</p>
                      </div>
                      <span className="text-sm text-gray-900 tabular-nums">{row.occupancyPercent}%</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>{row.activeCampaigns} campanha(s)</span>
                      <span>{formatCurrency(row.revenueCents)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </WidgetCard>

            <WidgetCard
              id="dash-widget-inventory-subtype-distribution"
              title="Distribuição por subcategoria/ambiente"
              subtitle={`Leitura da composição e especialização do inventário • ${describeQuerySource(inventorySubtypeDistributionQ.source)}`}
              loading={inventorySubtypeDistributionQ.status === 'loading' && !inventorySubtypeDistributionDto}
              error={widgetError('Falha ao carregar distribuição por subcategoria', inventorySubtypeDistributionQ)}
              empty={inventorySubtypeRows.length === 0 && inventorySubtypeDistributionQ.status === 'ready'}
              emptyTitle="Sem composição"
              emptyDescription={smartEmpty('Ainda não há dados para distribuir o inventário por subcategoria e ambiente.')}
              actions={
                <Button variant="outline" className="h-9" onClick={() => inventorySubtypeDistributionQ.refetch()}>
                  Recarregar
                </Button>
              }
            >
              <div className="space-y-3">
                {inventorySubtypeRows.slice(0, 8).map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className="w-full rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50"
                    onClick={() =>
                      openDrilldown(`Inventário — ${row.label}`, 'inventorySubtypeDistribution', describeDrilldownHint(`Inventário — ${row.label}`), {
                        subcategory: row.subcategory,
                        environment: row.environment,
                      })
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-900">{row.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{row.pointsCount} ponto(s) • {row.unitsCount} unidade(s)</p>
                      </div>
                      <span className="text-sm text-gray-900 tabular-nums">{row.occupancyPercent}%</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>{row.activeCampaigns} campanha(s)</span>
                      <span>{formatCurrency(row.revenueCents)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </WidgetCard>
          </div>
        </div>
      ) : null}



{tab === 'clientes' ? (
  <div id="dashboard-export-root" className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
      <KpiCard
        label="Clientes ativos"
        value={clientsSummary ? String(clientsSummary.activeClientsCount) : undefined}
        helper={kpiDefinition('clientsActiveCount').shortDescription}
        loading={clientsKpisLoading}
        onClick={() => openDrilldown('Clientes ativos', 'topClients', describeDrilldownHint('Clientes ativos'))}
      />
      <KpiCard
        label="Novos clientes no período"
        value={clientsSummary ? String(clientsSummary.newClientsCount) : undefined}
        helper="Clientes criados dentro do recorte atual."
        loading={clientsKpisLoading}
        onClick={() => openDrilldown('Novos clientes', 'clientsNew', describeDrilldownHint('Novos clientes no período'))}
      />
      <KpiCard
        label="Receita por cliente"
        value={clientsSummary ? formatCurrency(clientsSummary.revenuePerClientCents) : undefined}
        helper="Receita reconhecida média por cliente com faturamento no período."
        loading={clientsKpisLoading}
        onClick={() => openDrilldown('Top clientes por receita', 'topClients', describeDrilldownHint('Receita por cliente'))}
      />
      <KpiCard
        label="Inadimplência por cliente"
        value={clientsSummary ? formatCurrency(clientsSummary.overduePerClientCents) : undefined}
        helper="Valor médio em atraso entre clientes com inadimplência."
        loading={clientsKpisLoading}
        onClick={() => openDrilldown('Clientes em atraso', 'lateClients', describeDrilldownHint('Clientes em atraso'))}
      />
      <KpiCard
        label="Ticket médio por cliente"
        value={clientsSummary ? formatCurrency(clientsSummary.averageTicketPerClientCents) : undefined}
        helper="Receita média distribuída pela carteira ativa no recorte."
        loading={clientsKpisLoading}
        onClick={() => openDrilldown('Top clientes', 'topClients', describeDrilldownHint('Ticket médio por cliente'))}
      />
      <KpiCard
        label="Clientes sem atividade recente"
        value={clientsSummary ? String(clientsSummary.clientsWithoutRecentActivityCount) : undefined}
        helper="Clientes sem proposta, campanha ou faturamento recente no recorte atual."
        loading={clientsKpisLoading}
        onClick={() => openDrilldown('Clientes sem atividade recente', 'clientsWithoutRecentActivity', describeDrilldownHint('Clientes sem atividade recente'))}
      />
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-7">
        <WidgetCard
          id="dash-widget-clients-top-revenue"
          title="Top clientes por receita"
          subtitle={`Receita reconhecida por cliente • ${describeQuerySource(topClientsQ.source)}`}
          loading={topClientsQ.status === 'loading' && !topClientsDto}
          error={widgetError('Falha ao carregar top clientes por receita', topClientsQ)}
          empty={topClientsRows.length === 0 && topClientsQ.status === 'ready'}
          emptyTitle="Sem clientes"
          emptyDescription={smartEmpty('Nenhum cliente com receita foi encontrado para o recorte atual.')}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-9" onClick={() => topClientsQ.refetch()}>
                Recarregar
              </Button>
              <Button variant="outline" className="h-9" onClick={() => openDrilldown('Top clientes por receita', 'topClients', describeDrilldownHint('Top clientes por receita'))}>
                Ver detalhes
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            {topClientsRows.slice(0, 6).map((row) => (
              <div key={row.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-900">{row.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{row.city || 'Sem cidade'} • {row.campaignsCount} campanha(s)</p>
                  </div>
                  <span className="text-sm text-gray-900">{formatCurrency(row.amountCents)}</span>
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>

      <div className="xl:col-span-5">
        <WidgetCard
          id="dash-widget-clients-top-campaigns"
          title="Top clientes por campanhas"
          subtitle={`Concentração de campanhas válidas • ${describeQuerySource(clientsTopCampaignsQ.source)}`}
          loading={clientsTopCampaignsQ.status === 'loading' && !clientsTopCampaignsDto}
          error={widgetError('Falha ao carregar clientes por campanhas', clientsTopCampaignsQ)}
          empty={clientsTopCampaignRows.length === 0 && clientsTopCampaignsQ.status === 'ready'}
          emptyTitle="Sem campanhas"
          emptyDescription={smartEmpty('Nenhum cliente com campanhas válidas foi encontrado para o recorte atual.')}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-9" onClick={() => clientsTopCampaignsQ.refetch()}>
                Recarregar
              </Button>
              <Button variant="outline" className="h-9" onClick={() => openDrilldown('Top clientes por campanhas', 'clientsTopCampaigns', describeDrilldownHint('Top clientes por campanhas'))}>
                Ver detalhes
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            {clientsTopCampaignRows.slice(0, 6).map((row) => (
              <div key={row.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-900">{row.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{row.city || 'Sem cidade'} • {row.activeCampaignsCount}/{row.campaignsCount} ativas</p>
                  </div>
                  <span className="text-sm text-gray-900">{formatCurrency(row.revenueCents)}</span>
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-5">
        <WidgetCard
          id="dash-widget-clients-late"
          title="Clientes em atraso"
          subtitle={`Risco financeiro da carteira • ${describeQuerySource(lateClientsQ.source)}`}
          loading={lateClientsQ.status === 'loading' && !lateClientsDto}
          error={widgetError('Falha ao carregar clientes em atraso', lateClientsQ)}
          empty={lateClientsRows.length === 0 && lateClientsQ.status === 'ready'}
          emptyTitle="Sem clientes em atraso"
          emptyDescription={smartEmpty('Nenhum cliente em atraso encontrado para o recorte atual.')}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-9" onClick={() => lateClientsQ.refetch()}>
                Recarregar
              </Button>
              <Button variant="outline" className="h-9" onClick={() => openDrilldown('Clientes em atraso', 'lateClients', describeDrilldownHint('Clientes em atraso'))}>
                Ver detalhes
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            {lateClientsRows.slice(0, 5).map((row) => (
              <div key={row.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-900">{row.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{row.city || 'Sem cidade'} • {row.overdueInvoicesCount} fatura(s)</p>
                  </div>
                  <span className="text-sm text-gray-900">{formatCurrency(row.overdueAmountCents)}</span>
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>

      <div className="xl:col-span-7">
        <WidgetCard
          id="dash-widget-clients-open-proposals"
          title="Clientes com propostas em aberto"
          subtitle={`Pressão comercial e pipeline por cliente • ${describeQuerySource(clientsOpenProposalsQ.source)}`}
          loading={clientsOpenProposalsQ.status === 'loading' && !clientsOpenProposalsDto}
          error={widgetError('Falha ao carregar clientes com propostas em aberto', clientsOpenProposalsQ)}
          empty={clientsOpenProposalRows.length === 0 && clientsOpenProposalsQ.status === 'ready'}
          emptyTitle="Sem pipeline aberto"
          emptyDescription={smartEmpty('Nenhum cliente com propostas em aberto foi encontrado para o recorte atual.')}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-9" onClick={() => clientsOpenProposalsQ.refetch()}>
                Recarregar
              </Button>
              <Button variant="outline" className="h-9" onClick={() => openDrilldown('Clientes com propostas em aberto', 'clientsOpenProposals', describeDrilldownHint('Clientes com propostas em aberto'))}>
                Ver detalhes
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            {clientsOpenProposalRows.slice(0, 6).map((row) => (
              <div key={row.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-900">{row.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{row.city || 'Sem cidade'} • {row.proposalsOpenCount} proposta(s) • {row.hasActiveCampaign ? 'com campanha ativa' : 'sem campanha ativa'}</p>
                  </div>
                  <span className="text-sm text-gray-900">{formatCurrency(row.proposalsOpenAmountCents)}</span>
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <WidgetCard
        id="dash-widget-clients-without-campaign"
        title="Clientes sem campanha ativa"
        subtitle={`Carteira sem operação em curso • ${describeQuerySource(clientsInactiveRiskQ.source)}`}
        loading={clientsInactiveRiskQ.status === 'loading' && !clientsInactiveRiskDto}
        error={widgetError('Falha ao carregar clientes sem campanha ativa', clientsInactiveRiskQ)}
        empty={clientsWithoutCampaignRows.length === 0 && clientsInactiveRiskQ.status === 'ready'}
        emptyTitle="Sem clientes sem campanha ativa"
        emptyDescription={smartEmpty('A carteira carregada possui campanha ativa para todos os clientes visíveis.')}
        actions={<Button variant="outline" className="h-9" onClick={() => openDrilldown('Clientes sem campanha ativa', 'clientsWithoutActiveCampaign', describeDrilldownHint('Clientes sem campanha ativa'))}>Ver detalhes</Button>}
      >
        <div className="space-y-3">
          {clientsWithoutCampaignRows.slice(0, 5).map((row) => (
            <div key={row.id} className="rounded-lg border border-gray-200 p-3">
              <p className="text-sm text-gray-900">{row.name}</p>
              <p className="text-xs text-gray-500 mt-1">{row.city || 'Sem cidade'} • {row.daysWithoutActivity} dias sem atividade</p>
            </div>
          ))}
        </div>
      </WidgetCard>

      <WidgetCard
        id="dash-widget-clients-inactive-risk"
        title="Clientes com risco de inatividade"
        subtitle={`Sinais de esfriamento da carteira • ${describeQuerySource(clientsInactiveRiskQ.source)}`}
        loading={clientsInactiveRiskQ.status === 'loading' && !clientsInactiveRiskDto}
        error={widgetError('Falha ao carregar risco de inatividade', clientsInactiveRiskQ)}
        empty={clientsInactiveRiskRows.length === 0 && clientsInactiveRiskQ.status === 'ready'}
        emptyTitle="Sem risco relevante"
        emptyDescription={smartEmpty('Nenhum cliente com sinal relevante de inatividade foi encontrado no recorte atual.')}
        actions={<Button variant="outline" className="h-9" onClick={() => openDrilldown('Clientes com risco de inatividade', 'clientsInactiveRisk', describeDrilldownHint('Clientes com risco de inatividade'))}>Ver detalhes</Button>}
      >
        <div className="space-y-3">
          {clientsInactiveRiskRows.slice(0, 5).map((row) => (
            <div key={row.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-900">{row.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{row.city || 'Sem cidade'} • {row.daysWithoutActivity} dias • {row.hasActiveCampaign ? 'com campanha ativa' : 'sem campanha ativa'}</p>
                </div>
                <span className="text-xs rounded-full bg-gray-100 px-2 py-1 text-gray-700">{row.riskLevel}</span>
              </div>
            </div>
          ))}
        </div>
      </WidgetCard>

      <WidgetCard
        id="dash-widget-clients-region-distribution"
        title="Distribuição de clientes por região"
        subtitle={`Concentração territorial da carteira • ${describeQuerySource(clientsRegionDistributionQ.source)}`}
        loading={clientsRegionDistributionQ.status === 'loading' && !clientsRegionDistributionDto}
        error={widgetError('Falha ao carregar distribuição regional da carteira', clientsRegionDistributionQ)}
        empty={clientsRegionRows.length === 0 && clientsRegionDistributionQ.status === 'ready'}
        emptyTitle="Sem distribuição regional"
        emptyDescription={smartEmpty('Ainda não há regiões suficientes para compor a leitura da carteira.')}
        actions={<Button variant="outline" className="h-9" onClick={() => openDrilldown('Distribuição regional da carteira', 'clientsRegionDistribution', describeDrilldownHint('Distribuição regional da carteira'))}>Ver detalhes</Button>}
      >
        <div className="space-y-3">
          {clientsRegionRows.slice(0, 5).map((row) => (
            <div key={row.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-900">{row.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{row.clientsCount} cliente(s) • {row.activeClientsCount} ativo(s) • {row.openProposalsCount} proposta(s) abertas</p>
                </div>
                <span className="text-sm text-gray-900">{formatCurrency(row.revenueCents)}</span>
              </div>
            </div>
          ))}
        </div>
      </WidgetCard>
    </div>
  </div>
) : null}

      {/* Drill-down Drawer (custom) */}
      {drilldown.open ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrilldown((s) => ({ ...s, open: false }))} />

          <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-xl flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-start justify-between gap-3">
              <div>
                <p className="text-gray-900">{drilldown.title}</p>
                {drilldown.hint ? (
                  <p className="text-xs text-gray-500 mt-1 backend-hint">{drilldown.hint}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setDrilldown((s) => ({ ...s, open: false }))}
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {/* Busca local no drawer (não altera filtros globais) */}
              <div className="mb-3 flex items-center gap-2">
                <Input
                  value={drilldown.search}
                  onChange={(e) => setDrilldown((s) => ({ ...s, search: e.target.value }))}
                  placeholder="Filtrar itens..."
                  className="h-9"
                />
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() => {
                    // recomeça do zero
                    setDrilldown((s) => ({
                      ...s,
                      cursor: undefined,
                      nextCursor: undefined,
                      hasMore: false,
                      totalCount: undefined,
                      pageSize: undefined,
                      rows: [],
                      status: 'loading',
                      errorMessage: undefined,
                    }));
                    drilldownQ.refetch();
                  }}
                  disabled={!drilldown.key || drilldown.status === 'loading'}
                >
                  Recarregar
                </Button>
              </div>

              {(() => {
                const q = normalizeText(drilldown.search);
                const visible = q
                  ? drilldown.rows.filter((r) =>
                      includesNormalized(`${r.id} ${r.title} ${r.subtitle || ''} ${r.status || ''}`, q),
                    )
                  : drilldown.rows;

                const isInitialLoading = drilldown.status === 'loading' && drilldown.rows.length === 0;
                const isLoadingMore = drilldown.status === 'loading' && drilldown.rows.length > 0;

                return (
                  <>
                    {isInitialLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                      </div>
                    ) : drilldown.status === 'error' ? (
                      <ErrorState title="Falha ao carregar detalhes" description={drilldown.errorMessage} />
                    ) : visible.length === 0 ? (
                      <EmptyState title="Sem itens" description="Nada encontrado para este recorte (ou filtro local)." />
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            {visible.length} de {drilldown.totalCount ?? drilldown.rows.length} itens
                            {drilldown.hasMore ? ' • mais disponível' : ''}
                            {drilldown.pageSize ? ` • página ${drilldown.pageSize}` : ''}
                          </p>
                          <p className="text-xs text-gray-500">Fonte: {describeQuerySource(drilldownQ.source)}</p>
                        </div>

                        {(() => {
                          const spec = getDrilldownSpec(drilldown.key);
                          const cols = spec.columns;
                          const currentSortBy = drilldown.sortBy;
                          const currentSortDir = drilldown.sortDir;

                          const onToggleSort = (col: DrilldownColumnSpec) => {
                            if (!col.sortable) return;
                            const nextBy = col.sortKey || col.id;
                            const nextDir: DrilldownSortDir =
                              currentSortBy === nextBy ? (currentSortDir === 'asc' ? 'desc' : 'asc') : 'asc';

                            setDrilldown((s) => ({
                              ...s,
                              sortBy: nextBy,
                              sortDir: nextDir,
                              cursor: undefined,
                              nextCursor: undefined,
                              hasMore: false,
                              totalCount: undefined,
                              pageSize: undefined,
                              rows: [],
                              status: 'loading',
                              errorMessage: undefined,
                            }));
                          };

                          return (
                            <div className="border border-gray-200 rounded-lg overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    {cols.map((c) => {
                                      const active = (currentSortBy || '') === (c.sortKey || c.id);
                                      const icon = !c.sortable ? null : active ? (
                                        currentSortDir === 'asc' ? (
                                          <ChevronUp className="w-4 h-4" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4" />
                                        )
                                      ) : (
                                        <ArrowUpDown className="w-4 h-4 opacity-60" />
                                      );

                                      const content = (
                                        <span className="inline-flex items-center gap-1">
                                          {c.label}
                                          {icon}
                                        </span>
                                      );

                                      return (
                                        <th
                                          key={c.id}
                                          className={[
                                            'px-3 py-2 text-xs font-medium text-gray-600 whitespace-nowrap',
                                            c.align === 'right' ? 'text-right' : 'text-left',
                                          ].join(' ')}
                                        >
                                          {c.sortable ? (
                                            <button
                                              type="button"
                                              className="hover:text-gray-900"
                                              onClick={() => onToggleSort(c)}
                                            >
                                              {content}
                                            </button>
                                          ) : (
                                            content
                                          )}
                                        </th>
                                      );
                                    })}
                                    {spec.rowAction ? (
                                      <th className="px-3 py-2 text-xs font-medium text-gray-600 text-right whitespace-nowrap">Ações</th>
                                    ) : null}
                                  </tr>
                                </thead>
                                <tbody>
                                  {visible.map((r) => (
                                    <tr key={r.id} className="border-t border-gray-200">
                                      {cols.map((c) => {
                                        const v = c.get(r);
                                        const rendered = c.render ? c.render(v, r) : <span>{formatCell(v)}</span>;
                                        return (
                                          <td
                                            key={c.id}
                                            className={[
                                              'px-3 py-2 text-sm text-gray-800 whitespace-nowrap',
                                              c.align === 'right' ? 'text-right' : 'text-left',
                                            ].join(' ')}
                                          >
                                            {rendered}
                                          </td>
                                        );
                                      })}
                                      {spec.rowAction ? (
                                        <td className="px-3 py-2 text-right">
                                          <Button
                                            variant="outline"
                                            className="h-8"
                                            onClick={() => onNavigate(spec.rowAction!.page)}
                                          >
                                            {spec.rowAction.label}
                                          </Button>
                                        </td>
                                      ) : null}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}

                        {drilldown.hasMore && drilldown.nextCursor ? (
                          <Button
                            variant="outline"
                            className="w-full h-9"
                            onClick={() =>
                              setDrilldown((s) => ({
                                ...s,
                                cursor: s.nextCursor,
                                status: 'loading',
                                errorMessage: undefined,
                              }))
                            }
                            disabled={drilldown.status === 'loading'}
                          >
                            {isLoadingMore ? 'Carregando...' : 'Carregar mais'}
                          </Button>
                        ) : null}

                        <Button
                          variant="outline"
                          className="w-full h-9"
                          onClick={handleExportDrilldownDetails}
                          disabled={visible.length === 0 || drilldown.status === 'loading' || isExportingDrilldown}
                        >
                          {isExportingDrilldown ? 'Exportando detalhe...' : 'Exportar detalhe CSV'}
                        </Button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="p-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">O detalhamento exporta o recorte ativo com filtros, ordenação e paginação preservados.</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal: Salvar Visão */}
      <Dialog open={kpiRulesOpen} onOpenChange={setKpiRulesOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Critérios dos KPIs do Dashboard</DialogTitle>
            <DialogDescription>
              Esta etapa congela as regras de negócio dos KPIs principais para evitar números bonitos, mas inconsistentes, nas próximas integrações do Dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <span>{kpiDefinitionsSourceLabel} • versão {kpiDefinitionsDto.version}</span>
            <span>Atualizado em {kpiDefinitionsUpdatedAtLabel}</span>
          </div>

          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kpiDefinitionOrder.map((key) => {
                const definition = kpiDefinition(key);
                return (
                  <div key={definition.key} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                    <div>
                      <p className="text-sm text-gray-900">{definition.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{definition.shortDescription}</p>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Regra</p>
                        <p className="text-xs text-gray-700 mt-1">{definition.calculation}</p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Filtros aplicados</p>
                        <p className="text-xs text-gray-700 mt-1">{definition.filtersApplied}</p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Fontes primárias</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {definition.primarySources.map((source) => (
                            <span key={source} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-700">
                              {source}
                            </span>
                          ))}
                        </div>
                      </div>

                      {definition.notes?.length ? (
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-gray-400">Observações</p>
                          <div className="mt-1 space-y-1">
                            {definition.notes.map((note) => (
                              <p key={note} className="text-xs text-gray-700">• {note}</p>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={saveViewOpen} onOpenChange={setSaveViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{saveViewMode === 'update' ? 'Atualizar visão' : 'Salvar visão'}</DialogTitle>
            <DialogDescription>
              Salva a aba atual, filtros globais e um layout (MVP) como um preset. No MVP fica no localStorage; depois
              será persistido no backend.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome da visão</label>
              <Input value={saveViewName} onChange={(e) => setSaveViewName(e.target.value)} className="h-9" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill label="Aba" value={tabLabel(tab)} />
              <Pill label="Período" value={filtersDraft.datePreset.toUpperCase()} />
              {filtersDraft.city ? <Pill label="Cidade" value={filtersDraft.city} /> : null}
              {filtersDraft.query ? <Pill label="Busca" value={filtersDraft.query} /> : null}
              <Pill label="Tipo" value={filtersDraft.mediaType} />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" className="h-9" onClick={() => setSaveViewOpen(false)}>
                Cancelar
              </Button>
              <Button className="h-9" onClick={confirmSaveView}>
                {saveViewMode === 'update' ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              MVP: localStorage. BACKEND SWAP POINT: GET/POST/DELETE /dashboard/views (por usuário/empresa).
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Paridade (Etapa 16) */}
      <Dialog open={parityOpen} onOpenChange={setParityOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Checklist de paridade com o backend</DialogTitle>
            <DialogDescription>
              Use esta lista para validar se os números do Dashboard batem com o backend antes do rollout completo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-gray-500">
                Dica: execute por empresa e compare os KPIs com relatórios/queries oficiais. Marque os itens conforme
                aprovar.
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-8 text-xs" onClick={handleCopyParityChecklist}>
                  Copiar checklist
                </Button>
                <Button
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => {
                    resetParityMarks(companyKey, userKey);
                    setParityMarks({});
                    toast.success('Checklist resetado');
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-md divide-y">
              {DASHBOARD_PARITY_CHECKLIST.map((it) => (
                <div key={it.id} className="p-3 flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={!!parityMarks[it.id]}
                    onChange={() => setParityMarks((m) => toggleParityMark(companyKey, userKey, m, it.id))}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-medium">{it.title}</p>
                    <p className="text-xs text-gray-500">{it.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Rota: <span className="font-medium">{it.route}</span> • Campos: {it.fields.join(', ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Compartilhar Mapa */}
      <Dialog open={shareMapOpen} onOpenChange={setShareMapOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Compartilhar mapa de pontos</DialogTitle>
            <DialogDescription>
              Compartilhe o link público do mapa de pontos de mídia da sua empresa. Qualquer pessoa com o link poderá
              visualizar os pontos disponíveis.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Input id="map-url" value={publicMapUrl} readOnly className="h-9" />
            </div>
            <Button type="button" size="sm" className="px-3" onClick={handleCopyMapLink}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar link
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardErrorBoundary>
  );
}
