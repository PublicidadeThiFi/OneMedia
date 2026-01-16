import type { Page } from '../App';

export interface DashboardProps {
  onNavigate: (page: Page) => void;
}

export type DashboardTab = 'executivo' | 'comercial' | 'operacoes' | 'financeiro' | 'inventario';

export type DatePreset = '7d' | '30d' | '90d' | 'ytd';

export type MediaTypeFilter = 'ALL' | 'OOH' | 'DOOH';

export type DashboardFilters = {
  datePreset: DatePreset;
  query: string; // texto livre (cliente, campanha, proposta...)
  city: string;
  mediaType: MediaTypeFilter;
};

/**
 * =========================
 *  ETAPA 3 - CONTRATOS (DTO) + QUERY PARAMS
 * =========================
 *
 * A partir daqui, a ideia é que o FRONT trate o retorno do backend como DTOs estáveis,
 * e só depois (se necessário) mapeie para o formato usado nos componentes.
 *
 * IMPORTANTE: neste estágio ainda está tudo MOCKADO, mas os tipos e os endpoints
 * já ficam definidos para a troca futura (Etapa 4+).
 */
// Query params padronizados para o Dashboard (filtros globais).
// Observação: o backend pode preferir dateFrom/dateTo ao invés de "datePreset".
// Mantemos um helper para resolver o preset em intervalos ISO.
export type DashboardBackendQuery = {
  dateFrom: string; // ISO datetime
  dateTo: string; // ISO datetime
  q?: string; // busca textual
  city?: string;
  mediaType?: Exclude<MediaTypeFilter, 'ALL'>;
};

// --- DTOs (contratos) ---
// Neste arquivo, mantemos os DTOs equivalentes aos tipos internos usados pelos widgets.
// Na integração real, o service/hook deve retornar estes DTOs diretamente.

// Dashboard Overview (aba Executivo + KPIs gerais)
// Prisma (fontes típicas): Proposal, Campaign, BillingInvoice, CashTransaction, MediaUnit, Reservation, Client
// - proposalsTotal: Proposal.createdAt (ou Proposal.startDate) no range
// - approvalRatePercent: Proposal.status (APROVADA/REPROVADA/...)
// - campaignsActive*: Campaign.status (ATIVA/EM_VEICULACAO/...)
// - revenueRecognized: BillingInvoice.status=PAGA (paidAt no range) OU CashTransaction(flowType=RECEITA, isPaid=true)
// - revenueToInvoice/receivables: BillingInvoice.status=ABERTA/VENCIDA
// - occupancyPercent: Reservation (CONFIRMADA) ou CampaignItem no range vs total de MediaUnits

export type DashboardOverviewDTO = OverviewKpis;

// Funil Comercial (aba Comercial)
// Prisma: Proposal, Client, User (responsibleUserId), ProposalItem (para composição por mídia/produto)
export type DashboardFunnelDTO = CommercialFunnel;

// Comercial - KPIs e listas específicas
export type CommercialSummary = {
  proposalsTotal: number;
  approvalRatePercent: number;
  averageDaysToClose: number;
  activePipelineAmountCents: number;
  stalledProposalsCount: number;
};

export type DashboardCommercialSummaryDTO = CommercialSummary;

export type StalledProposalRow = {
  id: string;
  title: string;
  client: string;
  daysWithoutUpdate: number;
  amountCents: number;
};

export type DashboardStalledProposalsDTO = {
  rows: StalledProposalRow[];
};

export type SellerRankingRow = {
  id: string;
  name: string;
  city?: string;
  dealsWon: number;
  dealsInPipeline: number;
  amountWonCents: number;
  amountPipelineCents: number;
};

export type DashboardSellerRankingDTO = {
  rows: SellerRankingRow[];
};

// Alertas (aba Executivo/Operações/Financeiro)
// Prisma: BillingInvoice, Campaign, Reservation, MediaPoint/MediaUnit (e regras de negócio)
export type DashboardAlertsDTO = AlertItem[];

// Drill-down (listas acionáveis ao clicar nos KPIs/widgets)
// Prisma: depende da chave (ex: receivablesOverdue -> BillingInvoice; occupancy -> Reservation/CampaignItem; etc.)
export type DashboardDrilldownDTO = {
  rows: DrilldownRow[];
  paging?: {
    // cursor de paginação (próxima página).
    // Compatibilidade: se o backend ainda devolver 'cursor', a UI tenta ler também.
    nextCursor?: string;
    hasMore: boolean;
  };
};

export type TimeseriesPoint = {
  date: string; // ISO date/datetime
  valueCents: number; // valor em centavos (pode ser negativo para fluxo)
};

export type DashboardTimeseriesDTO = {
  points: TimeseriesPoint[];
};

export type InventoryMapPin = {
  id: string;
  label: string;
  city?: string;
  occupancyPercent: number;
  lat?: number;
  lng?: number;
};

export type DashboardInventoryMapDTO = {
  pins: InventoryMapPin[];
};

export type InventoryRankingRow = {
  id: string;
  label: string;
  city?: string;
  occupancyPercent: number;
  activeCampaigns: number;
  revenueCents: number;
};

export type DashboardInventoryRankingDTO = {
  rows: InventoryRankingRow[];
};

export type TopClientRow = {
  id: string;
  name: string;
  city?: string;
  amountCents: number;
  campaignsCount: number;
  averageTicketCents?: number;
};

export type DashboardTopClientsDTO = {
  rows: TopClientRow[];
};

export type AgingBucket = {
  label: string;
  amountCents: number;
};

export type DashboardReceivablesAgingSummaryDTO = {
  totalCents: number;
  buckets: AgingBucket[];
};

export type OohOpsItem = {
  id: string;
  title: string;
  status: 'OK' | 'PENDING' | 'LATE';
  city?: string;
  dueDate?: string; // ISO date
};

export type DashboardOohOpsSummaryDTO = {
  items: OohOpsItem[];
};

export type ProofOfPlayRow = {
  id: string;
  screen: string;
  city?: string;
  uptimePercent: number;
  plays: number;
  lastSeen?: string; // ISO datetime
};

export type DashboardDoohProofOfPlaySummaryDTO = {
  rows: ProofOfPlayRow[];
};

export type KpiTrend = {
  deltaPercent: number; // variação vs período anterior
  points: number[]; // série curta para sparkline simples
};

export type OverviewKpis = {
  inventoryTotalPoints: number;
  proposalsTotal: number;
  approvalRatePercent: number;
  campaignsActiveCount: number;
  campaignsActiveAmountCents: number;
  clientsActiveCount: number;
  averageTicketCents: number;

  revenueRecognizedCents: number;
  revenueToInvoiceCents: number;
  receivablesOverdueCents: number;
  occupancyPercent: number;

  trends: {
    revenue: KpiTrend;
    occupancy: KpiTrend;
    proposals: KpiTrend;
  };
};

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  amountCents: number;
};

export type CommercialFunnel = {
  stages: FunnelStage[];
  averageDaysToClose: number;
  stalledProposals: StalledProposalRow[];
};

export type AlertItem = {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  ctaLabel?: string;
  ctaPage?: Page;
};

export type DrilldownCellValue = string | number | boolean | null | undefined;

export type DrilldownRow = {
  id: string;
  title: string;
  subtitle?: string;
  amountCents?: number;
  status?: string;
  fields?: Record<string, DrilldownCellValue>;
};

export type DrilldownState = {
  open: boolean;
  key?: string;
  title: string;
  rows: DrilldownRow[];
  hint?: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  errorMessage?: string;

  // ordenação (server-side no backend; mock respeita)
  sortBy?: string;
  sortDir?: 'asc' | 'desc';

  // paginação (drawer)
  cursor?: string;
  nextCursor?: string;
  hasMore: boolean;

  // busca local no drawer (não altera filtros globais)
  search: string;
};
