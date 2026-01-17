import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Filter,
  Globe,
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
import { useDashboardQuery } from '../hooks/useDashboardQuery';
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
import { deleteSavedView, loadSavedViews, makeSavedViewId, upsertSavedView, type SavedDashboardView } from './savedViews';
import type {
  DashboardAlertsDTO,
  DashboardCommercialSummaryDTO,
  DashboardDoohProofOfPlaySummaryDTO,
  DashboardDrilldownDTO,
  DashboardFilters,
  DashboardFunnelDTO,
  DashboardInventoryMapDTO,
  DashboardInventoryRankingDTO,
  DashboardOohOpsSummaryDTO,
  DashboardOverviewDTO,
  DashboardProps,
  DashboardReceivablesAgingSummaryDTO,
  DashboardSellerRankingDTO,
  DashboardStalledProposalsDTO,
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
import { InventoryMap, InventoryRegionLineHeatmap } from './components/InventoryMap';
export function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const { company } = useCompany();

  const [tab, setTab] = useState<DashboardTab>('executivo');
  const [filters, setFilters] = useState<DashboardFilters>({
    datePreset: '30d',
    query: '',
    city: '',
    mediaType: 'ALL',
  });

  // Etapa 12: permissoes + saved views (MVP: localStorage)
  const perms = useMemo(() => getDashboardPermissions(user, company), [user, company]);
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

  // Etapa 3: este objeto representa exatamente o que vira query params no backend.
  // Etapa 4: hooks/services adicionados (useDashboardQuery + services/dashboard). Modo padrão = mock; backend via env.
  const backendQuery = useMemo(() => buildDashboardBackendQuery(filters), [filters]);

  const backendQs = useMemo(() => toQueryString(backendQuery), [backendQuery]);

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
    search: '',
  });

  // BACKEND SWAP POINT (Etapa 4+): useDashboardOverview(company.id, backendQuery)
  const overviewQ = useDashboardQuery<DashboardOverviewDTO>({
    enabled: !!company,
    mode: DASHBOARD_DATA_MODE,
    deps: [company?.id, backendQs],
    computeMock: () => mockApi.fetchOverviewKpis(company!.id, filters),

    fetcher: (signal) =>
      dashboardGetJson<DashboardOverviewDTO>(DASHBOARD_BACKEND_ROUTES.overview, backendQs, { signal }),
  });

  // BACKEND SWAP POINT (Etapa 4+): useDashboardFunnel(company.id, backendQuery)
  const funnelQ = useDashboardQuery<DashboardFunnelDTO>({
    enabled: !!company,
    mode: DASHBOARD_DATA_MODE,
    deps: [company?.id, backendQs],
    computeMock: () => mockApi.fetchCommercialFunnel(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardFunnelDTO>(DASHBOARD_BACKEND_ROUTES.funnel, backendQs, { signal }),
  });

  // Comercial (Etapa 7): KPIs e listas dedicadas (mantendo a UI igual)
  const commercialSummaryQ = useDashboardQuery<DashboardCommercialSummaryDTO>({
    enabled: !!company && tab === 'comercial',
    mode: DASHBOARD_DATA_MODE,
    deps: [company?.id, backendQs],
    computeMock: () => mockApi.fetchCommercialSummary(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardCommercialSummaryDTO>(DASHBOARD_BACKEND_ROUTES.commercialSummary, backendQs, { signal }),
  });

  const stalledProposalsQ = useDashboardQuery<DashboardStalledProposalsDTO>({
    enabled: !!company && tab === 'comercial',
    mode: DASHBOARD_DATA_MODE,
    deps: [company?.id, backendQs],
    computeMock: () => mockApi.fetchStalledProposals(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardStalledProposalsDTO>(DASHBOARD_BACKEND_ROUTES.stalledProposals, backendQs, { signal }),
  });

  const sellerRankingQ = useDashboardQuery<DashboardSellerRankingDTO>({
    enabled: !!company && tab === 'comercial',
    mode: DASHBOARD_DATA_MODE,
    deps: [company?.id, backendQs],
    computeMock: () => mockApi.fetchSellerRanking(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardSellerRankingDTO>(DASHBOARD_BACKEND_ROUTES.sellerRanking, backendQs, { signal }),
  });

  // BACKEND SWAP POINT (Etapa 4+): useDashboardAlerts(company.id, backendQuery)
  const alertsQ = useDashboardQuery<DashboardAlertsDTO>({
    enabled: !!company,
    mode: DASHBOARD_DATA_MODE,
    deps: [company?.id, backendQs],
    computeMock: () => mockApi.fetchAlerts(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardAlertsDTO>(DASHBOARD_BACKEND_ROUTES.alerts, backendQs, { signal }),
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
    mode: DASHBOARD_DATA_MODE,
    deps: [company?.id, drilldown.key, drilldownQs],
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
        };
      });
    }
  }, [drilldown.open, drilldown.key, drilldownQ.status, drilldownQ.data, drilldownQ.errorMessage]);

  const revenueTsQ = useDashboardQuery<DashboardTimeseriesDTO>({
    enabled: !!company && tab === 'executivo',
    mode: DASHBOARD_DATA_MODE,
    deps: [company?.id, backendQs],
    computeMock: () => mockApi.fetchRevenueTimeseries(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardTimeseriesDTO>(DASHBOARD_BACKEND_ROUTES.revenueTimeseries, backendQs, { signal }),
  });

  const cashflowTsQ = useDashboardQuery<DashboardTimeseriesDTO>({
    enabled: !!company && tab === 'financeiro',
    mode: DASHBOARD_DATA_MODE,
    deps: [company?.id, backendQs],
    computeMock: () => mockApi.fetchCashflowTimeseries(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardTimeseriesDTO>(DASHBOARD_BACKEND_ROUTES.cashflowTimeseries, backendQs, { signal }),
  });

  const inventoryMapQ = useDashboardQuery<DashboardInventoryMapDTO>({
    enabled: !!company && tab === 'inventario',
    mode: DASHBOARD_DATA_MODE,
    deps: [company?.id, backendQs],
    computeMock: () => mockApi.fetchInventoryMap(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardInventoryMapDTO>(DASHBOARD_BACKEND_ROUTES.inventoryMap, backendQs, { signal }),
  });

  const inventoryRankingQ = useDashboardQuery<DashboardInventoryRankingDTO>({
    enabled: !!company && tab === 'inventario',
    mode: DASHBOARD_DATA_MODE,
    deps: [company?.id, backendQs],
    computeMock: () => mockApi.fetchInventoryRanking(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardInventoryRankingDTO>(DASHBOARD_BACKEND_ROUTES.inventoryRanking, backendQs, { signal }),
  });

  const topClientsQ = useDashboardQuery<DashboardTopClientsDTO>({
    enabled: !!company && tab === 'executivo',
    mode: DASHBOARD_DATA_MODE,
    deps: [company?.id, backendQs],
    computeMock: () => mockApi.fetchTopClients(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardTopClientsDTO>(DASHBOARD_BACKEND_ROUTES.topClients, backendQs, { signal }),
  });

  const agingQ = useDashboardQuery<DashboardReceivablesAgingSummaryDTO>({
    enabled: !!company && tab === 'financeiro',
    mode: DASHBOARD_DATA_MODE,
    deps: [company?.id, backendQs],
    computeMock: () => mockApi.fetchReceivablesAgingSummary(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardReceivablesAgingSummaryDTO>(DASHBOARD_BACKEND_ROUTES.receivablesAgingSummary, backendQs, { signal }),
  });

  const oohOpsQ = useDashboardQuery<DashboardOohOpsSummaryDTO>({
    enabled: !!company && tab === 'operacoes',
    mode: DASHBOARD_DATA_MODE,
    deps: [company?.id, backendQs],
    computeMock: () => mockApi.fetchOohOpsSummary(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardOohOpsSummaryDTO>(DASHBOARD_BACKEND_ROUTES.oohOpsSummary, backendQs, { signal }),
  });

  const popQ = useDashboardQuery<DashboardDoohProofOfPlaySummaryDTO>({
    enabled: !!company && tab === 'operacoes',
    mode: DASHBOARD_DATA_MODE,
    deps: [company?.id, backendQs],
    computeMock: () => mockApi.fetchDoohProofOfPlaySummary(company!.id, filters),
    fetcher: (signal) =>
      dashboardGetJson<DashboardDoohProofOfPlaySummaryDTO>(DASHBOARD_BACKEND_ROUTES.doohProofOfPlaySummary, backendQs, { signal }),
  });


  const overview = overviewQ.data;
  const funnel = funnelQ.data;
  const commercialSummary = commercialSummaryQ.data;
  const alerts = alertsQ.data || [];

  const revenueTs = revenueTsQ.data?.points || [];
  const cashflowTs = cashflowTsQ.data?.points || [];
  const inventoryPins = inventoryMapQ.data?.pins || [];
  const inventoryRankingRows = inventoryRankingQ.data?.rows || [];

  const topClientsRows = topClientsQ.data?.rows || [];
  const agingSummary = agingQ.data;
  const oohOpsItems = oohOpsQ.data?.items || [];
  const popRows = popQ.data?.rows || [];

  const stalledProposalsRows = stalledProposalsQ.data?.rows || [];
  const sellerRankingRows = sellerRankingQ.data?.rows || [];


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
    setSavedViews(loadSavedViews(companyKey, userKey));
  }, [companyKey, userKey, perms.canManageSavedViews]);

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

    const qs = toQueryString(backendQuery, {
      limit: String(DRILLDOWN_PAGE_SIZE),
      sortBy,
      sortDir,
      ...cleanParams,
    });
    const autoHint = `BACKEND: GET ${DASHBOARD_BACKEND_ROUTES.drilldown}/${key}?${qs}`;

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
      search: '',
    });
  };

  // Etapa 13: exportacoes reais
  const buildExportMeta = (extra?: Array<{ label: string; value: string }>) => {
    const name = String((company as any)?.name ?? (company as any)?.title ?? (company as any)?.label ?? company.id);
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

    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const title = kind === 'monthly' ? `Snapshot mensal — ${tabLabel(tab)}` : `Dashboard — ${tabLabel(tab)}`;
    const subtitle = String((company as any)?.name ?? (company as any)?.title ?? (company as any)?.label ?? company.id);
    const meta = buildExportMeta(kind === 'monthly' ? [{ label: 'Snapshot', value: month }] : undefined);
    printElementToPdf({ element: el, title, subtitle, meta });
  };

  const exportWidgetPdf = (widgetId: string, widgetTitle: string) => {
    const el = document.getElementById(widgetId);
    if (!el) {
      toast.error('Não foi possível exportar o widget: elemento não encontrado');
      return;
    }
    const subtitle = `${String((company as any)?.name ?? (company as any)?.title ?? company.id)} • ${tabLabel(tab)}`;
    printElementToPdf({ element: el, title: widgetTitle, subtitle, meta: buildExportMeta() });
  };

  const exportViewCsv = () => {
    const now = new Date();
    const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const safeTab = tabLabel(tab).toLowerCase().replace(/[^a-z0-9]+/gi, '_');
    const filename = `dashboard_${safeTab}_${stamp}.csv`;

    const rows: Array<[string, string]> = [];
    const companyName = String((company as any)?.name ?? (company as any)?.title ?? (company as any)?.label ?? company.id);
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
        add('Ocupação', `${overview.occupancyPercent}%`);
        add('Inadimplência', formatCurrency(overview.receivablesOverdueCents));
        add('Campanhas ativas', overview.campaignsActiveCount);
        add('Clientes ativos', overview.clientsActiveCount);
        add('Ticket médio', formatCurrency(overview.averageTicketCents));
      }
      const high = alerts.filter((a) => a.severity === 'HIGH').length;
      const med = alerts.filter((a) => a.severity === 'MEDIUM').length;
      const low = alerts.filter((a) => a.severity === 'LOW').length;
      add('Alertas HIGH', high);
      add('Alertas MEDIUM', med);
      add('Alertas LOW', low);
      topClientsRows.slice(0, 8).forEach((r, idx) => {
        add(`Top cliente ${idx + 1}`, `${r.name} — ${formatCurrency(r.amountCents)} (${r.campaignsCount} camp.)`);
      });
    } else if (tab === 'comercial') {
      if (commercialSummary) {
        add('Propostas (total)', commercialSummary.proposalsTotal);
        add('Taxa de aprovação', `${commercialSummary.approvalRatePercent}%`);
        add('Ciclo médio (dias)', commercialSummary.averageDaysToClose);
        add('Pipeline ativo', formatCurrency(commercialSummary.activePipelineAmountCents));
        add('Propostas paradas', commercialSummary.stalledProposalsCount);
      }
      funnel?.stages?.forEach((s) => {
        add(`Funil • ${s.label} (qtde)`, s.count);
        add(`Funil • ${s.label} (valor)`, formatCurrency(s.amountCents));
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
    } else if (tab === 'operacoes') {
      const ok = oohOpsItems.filter((i) => i.status === 'OK').length;
      const pend = oohOpsItems.filter((i) => i.status === 'PENDING').length;
      const late = oohOpsItems.filter((i) => i.status === 'LATE').length;
      add('OOH • itens OK', ok);
      add('OOH • pendências', pend);
      add('OOH • atrasos', late);
      const avgUptime = popRows.length ? Math.round(popRows.reduce((s, r) => s + r.uptimePercent, 0) / popRows.length) : 0;
      const totalPlays = popRows.reduce((s, r) => s + r.plays, 0);
      add('DOOH • telas', popRows.length);
      add('DOOH • uptime médio', `${avgUptime}%`);
      add('DOOH • plays', totalPlays);
    } else if (tab === 'financeiro') {
      if (cashflowTs.length) {
        add('Fluxo caixa (último)', formatCurrency(cashflowTs[cashflowTs.length - 1].valueCents));
      }
      if (agingSummary) {
        add('Recebíveis (total)', formatCurrency(agingSummary.totalCents));
        agingSummary.buckets.slice(0, 12).forEach((b) => {
          add(`Aging • ${b.label}`, formatCurrency(b.amountCents));
        });
      }
    } else if (tab === 'inventario') {
      add('Pins (mapa)', inventoryPins.length);
      const avgOcc = inventoryPins.length
        ? Math.round(inventoryPins.reduce((s, p) => s + (p.occupancyPercent || 0), 0) / inventoryPins.length)
        : 0;
      add('Ocupação média (mapa)', `${avgOcc}%`);
      inventoryRankingRows.slice(0, 10).forEach((r, idx) => {
        add(
          `Ranking ${idx + 1}`,
          `${r.label}${r.city ? ` (${r.city})` : ''} • occ: ${r.occupancyPercent}% • camp: ${r.activeCampaigns} • ${formatCurrency(r.revenueCents)}`,
        );
      });
    }

    const lines = ['key;value', ...rows.map(([k, v]) => [k, v].map(escapeCsvValue).join(';'))];
    downloadTextFile(filename, lines.join('\n'), 'text/csv;charset=utf-8');
    toast.success('CSV exportado', { description: filename });
  };

  const clearFilters = () => {
    setFilters({ datePreset: '30d', query: '', city: '', mediaType: 'ALL' });
    toast.success('Filtros limpos');
  };

  const tabLabel = (t: DashboardTab) => {
    if (t === 'executivo') return 'Executivo';
    if (t === 'comercial') return 'Comercial';
    if (t === 'operacoes') return 'Operações';
    if (t === 'financeiro') return 'Financeiro';
    if (t === 'inventario') return 'Inventário';
    return t;
  };

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
      description: `MVP (localStorage). BACKEND: futuramente /dashboard/views (por usuário/empresa).`,
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

  const executiveLoading = overviewQ.status !== 'ready';
  const commercialLoading = funnelQ.status !== 'ready';
  const commercialKpisLoading = commercialSummaryQ.status !== 'ready';

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-gray-900 mb-1">Dashboard</h1>
            <p className="text-gray-600">Visão geral • filtros globais • drill-down por widget (mock)</p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
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
            <Button variant="outline" className="h-9 flex items-center gap-2" onClick={() => setShareMapOpen(true)}>
              <Share2 className="w-4 h-4" />
              Compartilhar Mapa
            </Button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <Card>
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
                  Limpar
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
                  value={filters.datePreset}
                  onChange={(e) => setFilters((s) => ({ ...s, datePreset: e.target.value as DatePreset }))}
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
                  value={filters.query}
                  onChange={(e) => setFilters((s) => ({ ...s, query: e.target.value }))}
                  placeholder="cliente, campanha, proposta..."
                  className="h-9"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Cidade/Região</label>
                <Input
                  value={filters.city}
                  onChange={(e) => setFilters((s) => ({ ...s, city: e.target.value }))}
                  placeholder="ex: Brasília"
                  className="h-9"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                <select
                  className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm"
                  value={filters.mediaType}
                  onChange={(e) => setFilters((s) => ({ ...s, mediaType: e.target.value as MediaTypeFilter }))}
                >
                  <option value="ALL">OOH + DOOH</option>
                  <option value="OOH">OOH</option>
                  <option value="DOOH">DOOH</option>
                </select>
              </div>
            </div>

            {/* Active filter pills (informativo) */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <Pill label="Período" value={filters.datePreset.toUpperCase()} />
              {filters.query ? <Pill label="Busca" value={filters.query} /> : null}
              {filters.city ? <Pill label="Cidade" value={filters.city} /> : null}
              <Pill label="Tipo" value={filters.mediaType} />
            </div>
          </CardContent>
        </Card>

        {/* Tabs by persona */}
        <div className="flex items-center gap-2 flex-wrap">
          {perms.allowedTabs.includes('executivo') ? (
            <TabButton
              active={tab === 'executivo'}
              icon={<TrendingUp className="w-4 h-4" />}
              label="Executivo"
              onClick={() => setTab('executivo')}
            />
          ) : null}
          {perms.allowedTabs.includes('comercial') ? (
            <TabButton
              active={tab === 'comercial'}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Comercial"
              onClick={() => setTab('comercial')}
            />
          ) : null}
          {perms.allowedTabs.includes('operacoes') ? (
            <TabButton
              active={tab === 'operacoes'}
              icon={<PieChart className="w-4 h-4" />}
              label="Operações"
              onClick={() => setTab('operacoes')}
            />
          ) : null}
          {perms.allowedTabs.includes('financeiro') ? (
            <TabButton
              active={tab === 'financeiro'}
              icon={<Wallet className="w-4 h-4" />}
              label="Financeiro"
              onClick={() => setTab('financeiro')}
            />
          ) : null}
          {perms.allowedTabs.includes('inventario') ? (
            <TabButton
              active={tab === 'inventario'}
              icon={<Building2 className="w-4 h-4" />}
              label="Inventário"
              onClick={() => setTab('inventario')}
            />
          ) : null}
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'executivo' ? (
        <div id="dashboard-export-root" className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Receita reconhecida"
              value={overview ? formatCurrency(overview.revenueRecognizedCents) : undefined}
              delta={overview?.trends.revenue.deltaPercent}
              spark={overview?.trends.revenue.points}
              loading={executiveLoading}
              onClick={() => openDrilldown('Receita reconhecida', 'revenueRecognized', 'BACKEND: /dashboard/revenue/recognized')}
            />

            <KpiCard
              label="A faturar"
              value={overview ? formatCurrency(overview.revenueToInvoiceCents) : undefined}
              helper="Forecast simplificado (mock)"
              loading={executiveLoading}
              onClick={() => openDrilldown('A faturar', 'revenueToInvoice', 'BACKEND: /dashboard/revenue/to-invoice')}
            />

            <KpiCard
              label="Ocupação"
              value={overview ? `${overview.occupancyPercent}%` : undefined}
              delta={overview?.trends.occupancy.deltaPercent}
              spark={overview?.trends.occupancy.points}
              loading={executiveLoading}
              onClick={() => openDrilldown('Ocupação', 'occupancy', 'BACKEND: /dashboard/occupancy')}
            />

            <KpiCard
              label="Inadimplência"
              value={overview ? formatCurrency(overview.receivablesOverdueCents) : undefined}
              helper="Aging (mock)"
              loading={executiveLoading}
              onClick={() => openDrilldown('Inadimplência', 'receivablesOverdue', 'BACKEND: /dashboard/receivables/aging')}
            />
          </div>

          {/* Alerts */}
          <WidgetCard
            id="dash-widget-alerts"
            title="Atenção hoje"
            subtitle="Alertas inteligentes (mock) — filtrados pela busca"
            loading={alertsQ.status === 'loading' && !alertsQ.data}
            error={alertsQ.status === 'error' ? { title: 'Falha ao carregar alertas', description: alertsQ.errorMessage } : null}
            empty={alerts.length === 0 && alertsQ.status === 'ready'}
            emptyTitle="Sem alertas"
            emptyDescription={smartEmpty("Nada para destacar com os filtros atuais.")}
            actions={
              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-9" onClick={() => alertsQ.refetch()}>
                  Recarregar
                </Button>
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() => exportWidgetPdf('dash-widget-alerts', 'Atenção hoje')}
                >
                  Exportar PDF
                </Button>
              </div>
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {alerts.map((a) => (
                <div key={a.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-start gap-2">
                    <SeverityDot severity={a.severity} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{a.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{a.description}</p>
                    </div>
                    <AlertTriangle className="w-4 h-4 text-gray-400" />
                  </div>
                  {a.ctaLabel && a.ctaPage ? (
                    <Button variant="outline" className="w-full mt-3 h-9" onClick={() => onNavigate(a.ctaPage!)}>
                      {a.ctaLabel}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </WidgetCard>

          {/* Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WidgetCard
              id="dash-widget-revenue-trend"
              title="Tendência de Receita"
              subtitle={`Série (${revenueTsQ.source})`}
              loading={revenueTsQ.status === 'loading' && !revenueTsQ.data}
              error={
                revenueTsQ.status === 'error'
                  ? { title: 'Falha ao carregar série', description: revenueTsQ.errorMessage }
                  : null
              }
              empty={revenueTs.length === 0 && revenueTsQ.status === 'ready'}
              emptyTitle="Sem dados"
              emptyDescription={smartEmpty("Não há pontos para o período/filtros atuais.")}
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
                    onClick={() => exportWidgetPdf('dash-widget-revenue-trend', 'Tendência de Receita')}
                  >
                    Exportar PDF
                  </Button>
                </div>
              }
            >
              {revenueTs.length > 0 ? (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-900">{formatCurrency(revenueTs[revenueTs.length - 1].valueCents)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Último ponto: {formatShortDate(revenueTs[revenueTs.length - 1].date)}
                    </p>
                    <p className="text-xs text-gray-500 mt-3 backend-hint">
                      BACKEND: {DASHBOARD_BACKEND_ROUTES.revenueTimeseries}?{backendQs}
                    </p>
                  </div>
                  <Sparkline points={timeseriesToSpark(revenueTs)} />
                </div>
              ) : (
                <div className="h-40 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-500">
                  Série sem dados
                </div>
              )}
            </WidgetCard>

            <WidgetCard
              id="dash-widget-top-clients"
              title="Top Clientes"
              subtitle={`Ranking (${topClientsQ.source})`}
              loading={topClientsQ.status === 'loading' && !topClientsQ.data}
              error={
                topClientsQ.status === 'error'
                  ? { title: 'Falha ao carregar ranking', description: topClientsQ.errorMessage }
                  : null
              }
              empty={topClientsRows.length === 0 && topClientsQ.status === 'ready'}
              emptyTitle="Sem dados"
              emptyDescription={smartEmpty("Nenhum cliente encontrado com os filtros atuais.")}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => topClientsQ.refetch()}>
                    Recarregar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => {
                      const rows: DrilldownRow[] = topClientsRows.map((r) => ({
                        id: r.id,
                        title: r.name,
                        subtitle: `${r.city || ''} • Campanhas: ${r.campaignsCount}`.trim(),
                        status: '',
                        amountCents: r.amountCents,
                      }));
                      exportDrilldownCsv('top_clientes', rows);
                    }}
                  >
                    Exportar CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => exportWidgetPdf('dash-widget-top-clients', 'Top Clientes')}
                  >
                    Exportar PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => openDrilldown('Top Clientes', 'topClients', `BACKEND: ${DASHBOARD_BACKEND_ROUTES.topClients}`)}
                  >
                    Ver detalhes
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {topClientsRows.slice(0, 5).map((r, idx) => (
                  <div key={r.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900">
                        {idx + 1}. {r.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {r.city ? `${r.city} • ` : ''}Campanhas: {r.campaignsCount}
                        {typeof r.averageTicketCents === 'number' ? ` • Ticket: ${formatCurrency(r.averageTicketCents)}` : ''}
                      </p>
                    </div>
                    <span className="text-sm text-gray-700">{formatCurrency(r.amountCents)}</span>
                  </div>
                ))}
                <p className="text-xs text-gray-500 mt-3 backend-hint">
                  BACKEND: {DASHBOARD_BACKEND_ROUTES.topClients}?{backendQs}
                </p>
              </div>
            </WidgetCard>
          </div>
        </div>
      ) : null}

      {tab === 'comercial' ? (
        <div id="dashboard-export-root" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Propostas (período)"
              value={commercialSummary ? String(commercialSummary.proposalsTotal) : undefined}
              delta={overview?.trends.proposals.deltaPercent}
              spark={overview?.trends.proposals.points}
              loading={commercialKpisLoading}
              onClick={() => openDrilldown('Propostas', 'proposalsTotal', 'BACKEND: /dashboard/proposals')}
            />

            <KpiCard
              label="Taxa de aprovação"
              value={commercialSummary ? `${commercialSummary.approvalRatePercent}%` : undefined}
              helper={`BACKEND: ${DASHBOARD_BACKEND_ROUTES.commercialSummary}?${backendQs}`}
              loading={commercialKpisLoading}
            />

            <KpiCard
              label="Ciclo médio"
              value={commercialSummary ? `${commercialSummary.averageDaysToClose} dias` : funnel ? `${funnel.averageDaysToClose} dias` : undefined}
              helper={`BACKEND: ${DASHBOARD_BACKEND_ROUTES.commercialSummary}?${backendQs}`}
              loading={commercialKpisLoading && commercialLoading}
            />

            <KpiCard
              label="Campanhas ativas"
              value={overview ? String(overview.campaignsActiveCount) : undefined}
              helper={overview ? `Total: ${formatCurrency(overview.campaignsActiveAmountCents)}` : '—'}
              loading={executiveLoading}
              onClick={() => openDrilldown('Campanhas ativas', 'campaignsActive', 'BACKEND: /dashboard/campaigns/active')}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WidgetCard
              id="dash-widget-funnel"
              title="Funil comercial"
              subtitle={`Pipeline por etapa (${funnelQ.source})`}
              loading={commercialLoading}
              error={funnelQ.status === 'error' ? { title: 'Falha ao carregar funil', description: funnelQ.errorMessage } : null}
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
                    onClick={() => exportWidgetPdf('dash-widget-funnel', 'Funil comercial')}
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
                      <div key={s.key}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-700">{s.label}</p>
                          <p className="text-sm text-gray-900">{s.count}</p>
                        </div>
                        <div className="w-full h-2 rounded bg-gray-100 overflow-hidden">
                          <div className="h-2 bg-gray-300" style={{ width: `${w}%` }} />
                        </div>
                        {s.amountCents > 0 ? <p className="text-xs text-gray-500 mt-1">{formatCurrency(s.amountCents)}</p> : null}
                      </div>
                    );
                  })}
                  <p className="text-xs text-gray-500 mt-4 backend-hint">
                    BACKEND: {DASHBOARD_BACKEND_ROUTES.funnel}?{backendQs}
                  </p>
                </div>
              ) : null}
            </WidgetCard>

            <div className="space-y-6">
              <WidgetCard
                id="dash-widget-stalled-proposals"
                title="Propostas paradas"
                subtitle={`Ações rápidas (${stalledProposalsQ.source})`}
                loading={stalledProposalsQ.status === 'loading' && !stalledProposalsQ.data}
                error={
                  stalledProposalsQ.status === 'error'
                    ? { title: 'Falha ao carregar lista', description: stalledProposalsQ.errorMessage }
                    : null
                }
                empty={stalledProposalsRows.length === 0 && stalledProposalsQ.status === 'ready'}
                emptyTitle="Nada aqui"
                emptyDescription={smartEmpty("Nenhuma proposta parou com os filtros atuais.")}
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
                          subtitle: `${p.client} • ${p.daysWithoutUpdate} dias sem atualização`,
                          status: '',
                          amountCents: p.amountCents,
                        }));
                        exportDrilldownCsv('propostas_paradas', rows);
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
                          `BACKEND: ${DASHBOARD_BACKEND_ROUTES.stalledProposals}?${backendQs}`,
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
                          <p className="text-xs text-gray-500">
                            {p.client} • {p.daysWithoutUpdate} dias sem atualização
                          </p>
                        </div>
                        <p className="text-sm text-gray-700">{formatCurrency(p.amountCents)}</p>
                      </div>
                    </button>
                  ))}

                  <p className="text-xs text-gray-500 mt-3 backend-hint">
                    BACKEND: {DASHBOARD_BACKEND_ROUTES.stalledProposals}?{backendQs}
                  </p>
                </div>
              </WidgetCard>

              <WidgetCard
                id="dash-widget-seller-ranking"
                title="Ranking de vendedores"
                subtitle={`Performance (${sellerRankingQ.source})`}
                loading={sellerRankingQ.status === 'loading' && !sellerRankingQ.data}
                error={
                  sellerRankingQ.status === 'error'
                    ? { title: 'Falha ao carregar ranking', description: sellerRankingQ.errorMessage }
                    : null
                }
                empty={sellerRankingRows.length === 0 && sellerRankingQ.status === 'ready'}
                emptyTitle="Sem dados"
                emptyDescription={smartEmpty("Nenhum vendedor encontrado com os filtros atuais.")}
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
                        }));
                        exportDrilldownCsv('ranking_vendedores', rows);
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
                          `BACKEND: ${DASHBOARD_BACKEND_ROUTES.sellerRanking}?${backendQs}`,
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
                        <p className="text-sm text-gray-900">
                          {idx + 1}. {r.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {r.city ? `${r.city} • ` : ''}
                          Ganhas: {r.dealsWon} • Pipeline: {r.dealsInPipeline}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-700">{formatCurrency(r.amountWonCents)}</p>
                        <p className="text-xs text-gray-500">Pipeline: {formatCurrency(r.amountPipelineCents)}</p>
                      </div>
                    </div>
                  ))}

                  <p className="text-xs text-gray-500 mt-3 backend-hint">
                    BACKEND: {DASHBOARD_BACKEND_ROUTES.sellerRanking}?{backendQs}
                  </p>
                </div>
              </WidgetCard>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'operacoes' ? (
        <div id="dashboard-export-root" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Aguardando material"
              value={String(2 + (seedNumber(company.id) % 7))}
              helper="SLA (mock)"
              onClick={() => openDrilldown('Aguardando material', 'awaitingMaterial', 'BACKEND: /dashboard/campaigns/awaiting-material')}
            />
            <KpiCard label="Em instalação" value={String(1 + (seedNumber(company.id + 'inst') % 5))} helper="BACKEND: /dashboard/ops/installation" />
            <KpiCard label="DOOH Uptime" value={`${92 + (seedNumber(company.id + 'upt') % 7)}%`} helper="BACKEND: /dashboard/dooh/uptime" />
            <KpiCard label="Falhas / Offline" value={String(seedNumber(company.id + 'off') % 9)} helper="BACKEND: /dashboard/dooh/offline" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WidgetCard
              id="dash-widget-ooh-ops"
              title="Status operacional (OOH)"
              subtitle={`Checklist / SLA / pendências (${oohOpsQ.source})`}
              loading={oohOpsQ.status === 'loading' && !oohOpsQ.data}
              error={
                oohOpsQ.status === 'error'
                  ? { title: 'Falha ao carregar status operacional', description: oohOpsQ.errorMessage }
                  : null
              }
              empty={oohOpsItems.length === 0 && oohOpsQ.status === 'ready'}
              emptyTitle="Sem pendências"
              emptyDescription={smartEmpty("Nada em aberto com os filtros atuais.")}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => oohOpsQ.refetch()}>
                    Recarregar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => {
                      const rows: DrilldownRow[] = oohOpsItems.map((it) => ({
                        id: it.id,
                        title: it.title,
                        subtitle: `${it.city || ''}${it.dueDate ? ` • Até: ${formatShortDate(it.dueDate)}` : ''}`.trim(),
                        status: it.status,
                      }));
                      exportDrilldownCsv('ooh_status_operacional', rows);
                    }}
                  >
                    Exportar CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => exportWidgetPdf('dash-widget-ooh-ops', 'Status operacional (OOH)')}
                  >
                    Exportar PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => openDrilldown('Status operacional (OOH)', 'oohOps', `BACKEND: ${DASHBOARD_BACKEND_ROUTES.oohOpsSummary}`)}
                  >
                    Ver detalhes
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {oohOpsItems.slice(0, 6).map((it) => {
                  const pill =
                    it.status === 'OK'
                      ? 'bg-green-100 text-green-700'
                      : it.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-700';
                  return (
                    <div key={it.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                      <div>
                        <p className="text-sm text-gray-900">{it.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {it.city ? `${it.city} • ` : ''}
                          {it.dueDate ? `Até: ${formatShortDate(it.dueDate)}` : '—'}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${pill}`}>{it.status}</span>
                    </div>
                  );
                })}
                <p className="text-xs text-gray-500 mt-3 backend-hint">
                  BACKEND: {DASHBOARD_BACKEND_ROUTES.oohOpsSummary}?{backendQs}
                </p>
              </div>
            </WidgetCard>

            <WidgetCard
              id="dash-widget-pop"
              title="Proof-of-play (DOOH)"
              subtitle={`Relatório POP (${popQ.source})`}
              loading={popQ.status === 'loading' && !popQ.data}
              error={
                popQ.status === 'error'
                  ? { title: 'Falha ao carregar POP', description: popQ.errorMessage }
                  : null
              }
              empty={popRows.length === 0 && popQ.status === 'ready'}
              emptyTitle="Sem dados"
              emptyDescription={smartEmpty("Nenhum registro POP com os filtros atuais.")}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => popQ.refetch()}>
                    Recarregar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => {
                      const rows: DrilldownRow[] = popRows.map((r) => ({
                        id: r.id,
                        title: r.screen,
                        subtitle: `${r.city || ''}${r.lastSeen ? ` • ${formatShortDate(r.lastSeen)}` : ''}`.trim(),
                        status: `${r.uptimePercent}%`,
                      }));
                      exportDrilldownCsv('proof_of_play', rows);
                    }}
                  >
                    Exportar CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => exportWidgetPdf('dash-widget-pop', 'Proof-of-play (DOOH)')}
                  >
                    Exportar PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => openDrilldown('Proof-of-play (DOOH)', 'proofOfPlay', `BACKEND: ${DASHBOARD_BACKEND_ROUTES.doohProofOfPlaySummary}`)}
                  >
                    Ver detalhes
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {popRows.slice(0, 6).map((r) => (
                  <div key={r.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                    <div>
                      <p className="text-sm text-gray-900">{r.screen}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {r.city ? `${r.city} • ` : ''}Plays: {r.plays} • Último: {r.lastSeen ? formatShortDate(r.lastSeen) : '—'}
                      </p>
                    </div>
                    <span className="text-sm text-gray-700">{r.uptimePercent}%</span>
                  </div>
                ))}

                <p className="text-xs text-gray-500 mt-3 backend-hint">
                  BACKEND: {DASHBOARD_BACKEND_ROUTES.doohProofOfPlaySummary}?{backendQs}
                </p>
              </div>
            </WidgetCard>
          </div>
        </div>
      ) : null}

      {tab === 'financeiro' ? (
        <div id="dashboard-export-root" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Contas a receber"
              value={overview ? formatCurrency(overview.revenueToInvoiceCents + 900000) : undefined}
              helper="Forecast (mock)"
              loading={executiveLoading}
              onClick={() => openDrilldown('Contas a receber', 'receivablesOpen', 'BACKEND: /dashboard/receivables/open')}
            />
            <KpiCard
              label="A vencer (7 dias)"
              value={overview ? formatCurrency(overview.revenueToInvoiceCents * 0.35) : undefined}
              helper="BACKEND: /dashboard/receivables/due-7d"
              loading={executiveLoading}
            />
            <KpiCard
              label="Vencidas"
              value={overview ? formatCurrency(overview.receivablesOverdueCents) : undefined}
              helper="Aging (mock)"
              loading={executiveLoading}
              onClick={() => openDrilldown('Vencidas', 'receivablesOverdue', 'BACKEND: /dashboard/receivables/overdue')}
            />
            <KpiCard
              label="Recebido no mês"
              value={overview ? formatCurrency(overview.revenueRecognizedCents * 0.42) : undefined}
              helper="BACKEND: /dashboard/cashflow/received-this-month"
              loading={executiveLoading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WidgetCard
              id="dash-widget-cashflow"
              title="Fluxo de caixa"
              subtitle={`Série (${cashflowTsQ.source})`}
              loading={cashflowTsQ.status === 'loading' && !cashflowTsQ.data}
              error={
                cashflowTsQ.status === 'error'
                  ? { title: 'Falha ao carregar série', description: cashflowTsQ.errorMessage }
                  : null
              }
              empty={cashflowTs.length === 0 && cashflowTsQ.status === 'ready'}
              emptyTitle="Sem dados"
              emptyDescription={smartEmpty("Não há pontos para o período/filtros atuais.")}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => cashflowTsQ.refetch()}>
                    Recarregar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => exportTimeseriesCsv('fluxo_caixa', cashflowTs)}
                  >
                    Exportar CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => exportWidgetPdf('dash-widget-cashflow', 'Fluxo de caixa')}
                  >
                    Exportar PDF
                  </Button>
                </div>
              }
            >
              {cashflowTs.length > 0 ? (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-900">{formatCurrency(cashflowTs[cashflowTs.length - 1].valueCents)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Último ponto: {formatShortDate(cashflowTs[cashflowTs.length - 1].date)}
                    </p>
                    <p className="text-xs text-gray-500 mt-3 backend-hint">
                      BACKEND: {DASHBOARD_BACKEND_ROUTES.cashflowTimeseries}?{backendQs}
                    </p>
                  </div>
                  <Sparkline points={timeseriesToSpark(cashflowTs)} />
                </div>
              ) : (
                <div className="h-40 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-500">
                  Série sem dados
                </div>
              )}
            </WidgetCard>

            <WidgetCard
              id="dash-widget-aging"
              title="Aging"
              subtitle={`Distribuição por faixa (${agingQ.source})`}
              loading={agingQ.status === 'loading' && !agingQ.data}
              error={
                agingQ.status === 'error'
                  ? { title: 'Falha ao carregar aging', description: agingQ.errorMessage }
                  : null
              }
              empty={(agingSummary?.buckets?.length || 0) === 0 && agingQ.status === 'ready'}
              emptyTitle="Sem dados"
              emptyDescription={smartEmpty("Não há faixas de aging para o período/filtros atuais.")}
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
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => exportWidgetPdf('dash-widget-aging', 'Aging')}
                  >
                    Exportar PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => openDrilldown('Aging', 'aging', `BACKEND: ${DASHBOARD_BACKEND_ROUTES.receivablesAgingSummary}`)}
                  >
                    Ver lista
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {(agingSummary?.buckets || []).map((b) => {
                  const max = Math.max(...(agingSummary?.buckets || []).map((x) => x.amountCents), 1);
                  const w = Math.round((b.amountCents / max) * 100);
                  return (
                    <div key={b.label}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-gray-700">{b.label}</p>
                        <p className="text-sm text-gray-900">{formatCurrency(b.amountCents)}</p>
                      </div>
                      <div className="w-full h-2 rounded bg-gray-100 overflow-hidden">
                        <div className="h-2 bg-gray-300" style={{ width: `${w}%` }} />
                      </div>
                    </div>
                  );
                })}

                <p className="text-xs text-gray-500 mt-3 backend-hint">
                  BACKEND: {DASHBOARD_BACKEND_ROUTES.receivablesAgingSummary}?{backendQs}
                </p>
              </div>
            </WidgetCard>
          </div>
        </div>
      ) : null}

      {tab === 'inventario' ? (
        <div id="dashboard-export-root" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Inventário total"
              value={overview ? String(overview.inventoryTotalPoints) : undefined}
              helper="BACKEND: /dashboard/inventory/summary"
              loading={executiveLoading}
              onClick={() => onNavigate('inventory')}
            />
            <KpiCard
              label="Disponíveis"
              value={overview ? String(Math.round(overview.inventoryTotalPoints * (1 - overview.occupancyPercent / 100))) : undefined}
              helper={overview ? `Ocupação: ${overview.occupancyPercent}%` : '—'}
              loading={executiveLoading}
            />
            <KpiCard
              label="Clientes ativos"
              value={overview ? String(overview.clientsActiveCount) : undefined}
              helper={overview ? `Ticket médio: ${formatCurrency(overview.averageTicketCents)}` : '—'}
              loading={executiveLoading}
            />
            <KpiCard
              label="Campanhas ativas"
              value={overview ? String(overview.campaignsActiveCount) : undefined}
              helper={overview ? `Total: ${formatCurrency(overview.campaignsActiveAmountCents)}` : '—'}
              loading={executiveLoading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WidgetCard
              id="dash-widget-inventory-map"
              title="Mapa e ocupação"
              subtitle={`Pins (${inventoryMapQ.source})`}
              loading={inventoryMapQ.status === 'loading' && !inventoryMapQ.data}
              error={
                inventoryMapQ.status === 'error'
                  ? { title: 'Falha ao carregar mapa', description: inventoryMapQ.errorMessage }
                  : null
              }
              empty={inventoryPins.length === 0 && inventoryMapQ.status === 'ready'}
              emptyTitle="Sem pontos"
              emptyDescription={smartEmpty("Nenhum ponto encontrado para os filtros atuais.")}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => inventoryMapQ.refetch()}>
                    Recarregar
                  </Button>
                  <Button variant="outline" className="h-9" onClick={() => setShareMapOpen(true)}>
                    Compartilhar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => exportWidgetPdf('dash-widget-inventory-map', 'Mapa e ocupação')}
                  >
                    Exportar PDF
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                <p className="text-xs backend-hint">BACKEND: {DASHBOARD_BACKEND_ROUTES.inventoryMap}?{backendQs}</p>

                <InventoryMap
                  pins={inventoryPins}
                  height={320}
                  onPinClick={(pin) =>
                    openDrilldown(`Ponto — ${pin.label}`, 'inventoryPin', 'BACKEND: /dashboard/inventory/pin', {
                      pinId: pin.id,
                      region: pin.region || pin.city || undefined,
                      line: pin.line || undefined,
                    })
                  }
                />

                <InventoryRegionLineHeatmap
                  pins={inventoryPins}
                  onSelect={(region, line) =>
                    openDrilldown(`Ocupação — ${region} / ${line}`, 'inventoryRegionLine', 'BACKEND: /dashboard/inventory/map/heat', {
                      region,
                      line,
                    })
                  }
                />
              </div>
            </WidgetCard>

            <WidgetCard
              id="dash-widget-inventory-ranking"
              title="Ranking de pontos"
              subtitle={`Top 5 (${inventoryRankingQ.source})`}
              loading={inventoryRankingQ.status === 'loading' && !inventoryRankingQ.data}
              error={
                inventoryRankingQ.status === 'error'
                  ? { title: 'Falha ao carregar ranking', description: inventoryRankingQ.errorMessage }
                  : null
              }
              empty={inventoryRankingRows.length === 0 && inventoryRankingQ.status === 'ready'}
              emptyTitle="Sem dados"
              emptyDescription={smartEmpty("Nenhum ponto ranqueado para os filtros atuais.")}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => inventoryRankingQ.refetch()}>
                    Recarregar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => exportWidgetPdf('dash-widget-inventory-ranking', 'Ranking de pontos')}
                  >
                    Exportar PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => openDrilldown('Ranking de pontos', 'inventoryRanking', 'BACKEND: /dashboard/inventory/ranking')}
                  >
                    Ver lista
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {inventoryRankingRows.slice(0, 5).map((r, idx) => (
                  <div key={r.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900">
                        {idx + 1}. {r.label}
                      </p>
                      <p className="text-xs text-gray-500">
                        {r.city || '—'} • {r.activeCampaigns} campanhas • {formatCurrency(r.revenueCents)}
                      </p>
                    </div>
                    <span className="text-sm text-gray-700">{Math.round(r.occupancyPercent)}%</span>
                  </div>
                ))}
                <p className="text-xs text-gray-500 mt-3 backend-hint">
                  BACKEND: {DASHBOARD_BACKEND_ROUTES.inventoryRanking}?{backendQs}
                </p>
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
                            {visible.length} de {drilldown.rows.length} itens carregados
                            {drilldown.hasMore ? ' • mais disponível' : ''}
                          </p>
                          <p className="text-xs text-gray-500">Fonte: {drilldownQ.source}</p>
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
                          onClick={() => {
                            const spec = getDrilldownSpec(drilldown.key);
                            exportDrilldownCsv(drilldown.title, visible, spec.columns);
                          }}
                          disabled={visible.length === 0 || drilldown.status === 'loading'}
                        >
                          Exportar CSV (mock)
                        </Button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="p-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">Este drawer é mock. Na integração, ele abrirá listas reais filtradas (com paginação/ordenação).</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal: Salvar Visão */}
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
              <Pill label="Período" value={filters.datePreset.toUpperCase()} />
              {filters.city ? <Pill label="Cidade" value={filters.city} /> : null}
              {filters.query ? <Pill label="Busca" value={filters.query} /> : null}
              <Pill label="Tipo" value={filters.mediaType} />
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
  );
}
