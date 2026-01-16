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
import { exportAgingBucketsCsv, exportDrilldownCsv, exportTimeseriesCsv } from './csv';
import { getDrilldownSpec } from './drilldownSpec';
import { mockApi } from './mockApi';
import { buildDashboardBackendQuery, toQueryString } from './query';
import type { DashboardFilters, DashboardProps, DashboardTab, DatePreset, DrilldownState } from './types';
import {
  formatCell,
  formatCurrency,
  formatShortDate,
  includesNormalized,
  normalizeText,
  timeseriesToSpark,
  uniqById,
} from './utils';
import { EmptyState, ErrorState, KpiCard, Pill, SeverityDot, Skeleton, Sparkline, TabButton, WidgetCard } from './ui';
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
    });
  }, [backendQuery, backendQs, drilldown.key, drilldown.cursor, drilldown.sortBy, drilldown.sortDir]);

  const drilldownQ = useDashboardQuery<DashboardDrilldownDTO>({
    enabled: !!company && drilldown.open && !!drilldown.key,
    mode: DASHBOARD_DATA_MODE,
    deps: [company?.id, drilldown.key, drilldownQs],
    computeMock: () => mockApi.fetchDrilldown(company!.id, drilldown.key!, filters, {
      cursor: drilldown.cursor,
      limit: DRILLDOWN_PAGE_SIZE,
      sortBy: drilldown.sortBy,
      sortDir: drilldown.sortDir,
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

  const openDrilldown = (title: string, key: string, hint?: string) => {
    const spec = getDrilldownSpec(key);
    const sortBy = spec.defaultSort?.by;
    const sortDir = spec.defaultSort?.dir;

    const qs = toQueryString(backendQuery, {
      limit: String(DRILLDOWN_PAGE_SIZE),
      sortBy,
      sortDir,
    });
    const autoHint = `BACKEND: GET ${DASHBOARD_BACKEND_ROUTES.drilldown}/${key}?${qs}`;

    setDrilldown({
      open: true,
      key,
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

  const exportCsvMock = (label: string) => {
    const qs = backendQs;
    toast.message(`Export (mock): ${label}`, {
      description: `Na integração, isso vai gerar CSV/PDF do recorte atual de filtros.\n${DASHBOARD_BACKEND_ROUTES.overview}?${qs}`,
    });
  };

  const clearFilters = () => {
    setFilters({ datePreset: '30d', query: '', city: '', mediaType: 'ALL' });
    toast.success('Filtros limpos');
  };

  const saveViewMock = () => {
    // BACKEND: persistir preset de visão do usuário (ex: /dashboard/views)
    toast.success('Visão salva (mock)', {
      description: 'Depois vamos salvar no backend como preset do usuário/empresa.',
    });
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
                <Button variant="outline" className="h-9" onClick={clearFilters}>
                  Limpar
                </Button>
                <Button variant="outline" className="h-9 flex items-center gap-2" onClick={saveViewMock}>
                  Salvar visão
                </Button>
                <Button
                  variant="outline"
                  className="h-9 flex items-center gap-2"
                  onClick={() => exportCsvMock('Dashboard (recorte atual)')}
                >
                  <Download className="w-4 h-4" />
                  Exportar
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
          <TabButton
            active={tab === 'executivo'}
            icon={<TrendingUp className="w-4 h-4" />}
            label="Executivo"
            onClick={() => setTab('executivo')}
          />
          <TabButton
            active={tab === 'comercial'}
            icon={<BarChart3 className="w-4 h-4" />}
            label="Comercial"
            onClick={() => setTab('comercial')}
          />
          <TabButton
            active={tab === 'operacoes'}
            icon={<PieChart className="w-4 h-4" />}
            label="Operações"
            onClick={() => setTab('operacoes')}
          />
          <TabButton
            active={tab === 'financeiro'}
            icon={<Wallet className="w-4 h-4" />}
            label="Financeiro"
            onClick={() => setTab('financeiro')}
          />
          <TabButton
            active={tab === 'inventario'}
            icon={<Building2 className="w-4 h-4" />}
            label="Inventário"
            onClick={() => setTab('inventario')}
          />
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'executivo' ? (
        <div className="space-y-6">
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
            title="Atenção hoje"
            subtitle="Alertas inteligentes (mock) — filtrados pela busca"
            loading={alertsQ.status === 'loading' && !alertsQ.data}
            error={alertsQ.status === 'error' ? { title: 'Falha ao carregar alertas', description: alertsQ.errorMessage } : null}
            empty={alerts.length === 0 && alertsQ.status === 'ready'}
            emptyTitle="Sem alertas"
            emptyDescription="Nada para destacar com os filtros atuais."
            actions={
              <Button variant="outline" className="h-9" onClick={() => alertsQ.refetch()}>
                Recarregar
              </Button>
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
              emptyDescription="Não há pontos para o período/filtros atuais."
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => revenueTsQ.refetch()}>
                    Recarregar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => exportTimeseriesCsv('tendencia_receita', revenueTs)}
                  >
                    Exportar CSV
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
                    <p className="text-xs text-gray-500 mt-3">
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
              emptyDescription="Nenhum cliente encontrado com os filtros atuais."
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
                <p className="text-xs text-gray-500 mt-3">
                  BACKEND: {DASHBOARD_BACKEND_ROUTES.topClients}?{backendQs}
                </p>
              </div>
            </WidgetCard>
          </div>
        </div>
      ) : null}

      {tab === 'comercial' ? (
        <div className="space-y-6">
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
                  <p className="text-xs text-gray-500 mt-4">
                    BACKEND: {DASHBOARD_BACKEND_ROUTES.funnel}?{backendQs}
                  </p>
                </div>
              ) : null}
            </WidgetCard>

            <div className="space-y-6">
              <WidgetCard
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
                emptyDescription="Nenhuma proposta parou com os filtros atuais."
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

                  <p className="text-xs text-gray-500 mt-3">
                    BACKEND: {DASHBOARD_BACKEND_ROUTES.stalledProposals}?{backendQs}
                  </p>
                </div>
              </WidgetCard>

              <WidgetCard
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
                emptyDescription="Nenhum vendedor encontrado com os filtros atuais."
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

                  <p className="text-xs text-gray-500 mt-3">
                    BACKEND: {DASHBOARD_BACKEND_ROUTES.sellerRanking}?{backendQs}
                  </p>
                </div>
              </WidgetCard>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'operacoes' ? (
        <div className="space-y-6">
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
              emptyDescription="Nada em aberto com os filtros atuais."
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
                <p className="text-xs text-gray-500 mt-3">
                  BACKEND: {DASHBOARD_BACKEND_ROUTES.oohOpsSummary}?{backendQs}
                </p>
              </div>
            </WidgetCard>

            <WidgetCard
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
              emptyDescription="Nenhum registro POP com os filtros atuais."
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

                <p className="text-xs text-gray-500 mt-3">
                  BACKEND: {DASHBOARD_BACKEND_ROUTES.doohProofOfPlaySummary}?{backendQs}
                </p>
              </div>
            </WidgetCard>
          </div>
        </div>
      ) : null}

      {tab === 'financeiro' ? (
        <div className="space-y-6">
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
              emptyDescription="Não há pontos para o período/filtros atuais."
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
                    <p className="text-xs text-gray-500 mt-3">
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
              emptyDescription="Não há faixas de aging para o período/filtros atuais."
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

                <p className="text-xs text-gray-500 mt-3">
                  BACKEND: {DASHBOARD_BACKEND_ROUTES.receivablesAgingSummary}?{backendQs}
                </p>
              </div>
            </WidgetCard>
          </div>
        </div>
      ) : null}

      {tab === 'inventario' ? (
        <div className="space-y-6">
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
              emptyDescription="Nenhum ponto encontrado para os filtros atuais."
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => inventoryMapQ.refetch()}>
                    Recarregar
                  </Button>
                  <Button variant="outline" className="h-9" onClick={() => setShareMapOpen(true)}>
                    Compartilhar
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                <div className="h-28 border border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-sm text-gray-500 gap-1">
                  <p>Mapa (placeholder)</p>
                  <p className="text-xs">BACKEND: {DASHBOARD_BACKEND_ROUTES.inventoryMap}?{backendQs}</p>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-900">{inventoryPins.length} pontos</p>
                  <p className="text-xs text-gray-500">exibindo 5</p>
                </div>

                <div className="space-y-2">
                  {inventoryPins.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-900">{p.label}</p>
                        <p className="text-xs text-gray-500">{p.city || '—'}</p>
                      </div>
                      <span className="text-sm text-gray-700">{Math.round(p.occupancyPercent)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </WidgetCard>

            <WidgetCard
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
              emptyDescription="Nenhum ponto ranqueado para os filtros atuais."
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => inventoryRankingQ.refetch()}>
                    Recarregar
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
                <p className="text-xs text-gray-500 mt-3">
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
                {drilldown.hint ? <p className="text-xs text-gray-500 mt-1">{drilldown.hint}</p> : null}
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
