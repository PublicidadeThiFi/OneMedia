import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Plus,
  Share2,
  Globe,
  Copy,
  Check,
  X,
  Download,
  Filter,
  AlertTriangle,
  TrendingUp,
  PieChart,
  BarChart3,
  Wallet,
  Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Page } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { toast } from 'sonner';
import { useDashboardQuery, type DashboardDataMode } from '../hooks/useDashboardQuery';
import { dashboardGetJson } from '../services/dashboard';

/**
 * =========================
 *  DASHBOARD (NOVO) - ESQUELETO
 * =========================
 *
 * Objetivo (Etapa 1):
 * - Criar o novo layout do Dashboard (filtros globais + abas por persona + widgets + drill-down)
 * - 100% mockado DENTRO deste arquivo, para evoluirmos depois para hooks/services/rotas reais.
 *
 * Objetivo (Etapa 2):
 * - Padronizar widgets (WidgetCard/KpiCard) e estados (loading/empty/error)
 * - Exportação CSV mock (client-side) para listas/tabelas
 *
 * Objetivo (Etapa 3):
 * - Definir contratos (DTOs) por widget/aba
 * - Padronizar query params (filtros globais -> dateFrom/dateTo/q/city/mediaType)
 * - Mapear, no código, quais models do Prisma alimentam cada bloco (para a troca futura)
 *
 * Integração com backend (Etapa 4+):
 * - Substituir as funções de mock em "mockApi" por chamadas reais (services + hooks)
 * - Cada função mock tem um comentário "BACKEND:" indicando o ponto de troca.
 */

interface DashboardProps {
  onNavigate: (page: Page) => void;
}

type DashboardTab = 'executivo' | 'comercial' | 'operacoes' | 'financeiro' | 'inventario';

type DatePreset = '7d' | '30d' | '90d' | 'ytd';

type MediaTypeFilter = 'ALL' | 'OOH' | 'DOOH';

type DashboardFilters = {
  datePreset: DatePreset;
  query: string; // texto livre (cliente, campanha, proposta...)
  city: string;
  mediaType: MediaTypeFilter;
};

// Etapa 4: modo de dados. Padrão = mock.
// Para testar backend, defina VITE_DASHBOARD_DATA_MODE=backend (Vite).
const DASHBOARD_DATA_MODE: DashboardDataMode =
  (((import.meta as any)?.env?.VITE_DASHBOARD_DATA_MODE as string) === 'backend' ? 'backend' : 'mock');

// Drilldown (drawer): paginação padrão
const DRILLDOWN_PAGE_SIZE = 20;



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

// Sugestão de rotas (placeholders). Ajustar para as rotas reais do seu backend quando integrar.
const DASHBOARD_BACKEND_ROUTES = {
  overview: '/api/dashboard/overview',
  funnel: '/api/dashboard/funnel',
  alerts: '/api/dashboard/alerts',
  drilldown: '/api/dashboard/drilldown',

  // Comercial
  commercialSummary: '/api/dashboard/commercial/summary',
  stalledProposals: '/api/dashboard/proposals/stalled',
  sellerRanking: '/api/dashboard/commercial/sellers/ranking',

  // Extras (quando formos evoluir os widgets):
  revenueTimeseries: '/api/dashboard/revenue/timeseries',
  cashflowTimeseries: '/api/dashboard/cashflow/timeseries',
  topClients: '/api/dashboard/top/clients',
  receivablesAgingSummary: '/api/dashboard/receivables/aging/summary',
  oohOpsSummary: '/api/dashboard/ooh/ops/summary',
  doohProofOfPlaySummary: '/api/dashboard/dooh/proof-of-play/summary',
  inventoryMap: '/api/dashboard/inventory/map',
  inventoryRanking: '/api/dashboard/inventory/ranking',
} as const;

// Query params padronizados para o Dashboard (filtros globais).
// Observação: o backend pode preferir dateFrom/dateTo ao invés de "datePreset".
// Mantemos um helper para resolver o preset em intervalos ISO.
type DashboardBackendQuery = {
  dateFrom: string; // ISO datetime
  dateTo: string; // ISO datetime
  q?: string; // busca textual
  city?: string;
  mediaType?: Exclude<MediaTypeFilter, 'ALL'>;
};

function resolveDateRangeFromPreset(preset: DatePreset): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const from = new Date(now);

  if (preset === '7d') {
    from.setDate(from.getDate() - 7);
  } else if (preset === '30d') {
    from.setDate(from.getDate() - 30);
  } else if (preset === '90d') {
    from.setDate(from.getDate() - 90);
  } else if (preset === 'ytd') {
    from.setMonth(0, 1);
    from.setHours(0, 0, 0, 0);
  }

  return {
    dateFrom: from.toISOString(),
    dateTo: now.toISOString(),
  };
}

function buildDashboardBackendQuery(filters: DashboardFilters): DashboardBackendQuery {
  const { dateFrom, dateTo } = resolveDateRangeFromPreset(filters.datePreset);

  return {
    dateFrom,
    dateTo,
    q: filters.query?.trim() ? filters.query.trim() : undefined,
    city: filters.city?.trim() ? filters.city.trim() : undefined,
    mediaType: filters.mediaType === 'ALL' ? undefined : filters.mediaType,
  };
}


function toQueryString(query: DashboardBackendQuery, extra?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  const merged: Record<string, string | undefined> = {
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    q: query.q,
    city: query.city,
    mediaType: query.mediaType,
    ...(extra || {}),
  };

  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === null) continue;
    const vv = String(v).trim();
    if (!vv) continue;
    params.set(k, vv);
  }

  return params.toString();
}

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

type DashboardOverviewDTO = OverviewKpis;

// Funil Comercial (aba Comercial)
// Prisma: Proposal, Client, User (responsibleUserId), ProposalItem (para composição por mídia/produto)
type DashboardFunnelDTO = CommercialFunnel;

// Comercial - KPIs e listas específicas
type CommercialSummary = {
  proposalsTotal: number;
  approvalRatePercent: number;
  averageDaysToClose: number;
  activePipelineAmountCents: number;
  stalledProposalsCount: number;
};

type DashboardCommercialSummaryDTO = CommercialSummary;

type StalledProposalRow = {
  id: string;
  title: string;
  client: string;
  daysWithoutUpdate: number;
  amountCents: number;
};

type DashboardStalledProposalsDTO = {
  rows: StalledProposalRow[];
};

type SellerRankingRow = {
  id: string;
  name: string;
  city?: string;
  dealsWon: number;
  dealsInPipeline: number;
  amountWonCents: number;
  amountPipelineCents: number;
};

type DashboardSellerRankingDTO = {
  rows: SellerRankingRow[];
};

// Alertas (aba Executivo/Operações/Financeiro)
// Prisma: BillingInvoice, Campaign, Reservation, MediaPoint/MediaUnit (e regras de negócio)
type DashboardAlertsDTO = AlertItem[];

// Drill-down (listas acionáveis ao clicar nos KPIs/widgets)
// Prisma: depende da chave (ex: receivablesOverdue -> BillingInvoice; occupancy -> Reservation/CampaignItem; etc.)
type DashboardDrilldownDTO = {
  rows: DrilldownRow[];
  paging?: {
    // cursor de paginação (próxima página).
    // Compatibilidade: se o backend ainda devolver 'cursor', a UI tenta ler também.
    nextCursor?: string;
    hasMore: boolean;
  };
};

type TimeseriesPoint = {
  date: string; // ISO date/datetime
  valueCents: number; // valor em centavos (pode ser negativo para fluxo)
};

type DashboardTimeseriesDTO = {
  points: TimeseriesPoint[];
};

type InventoryMapPin = {
  id: string;
  label: string;
  city?: string;
  occupancyPercent: number;
  lat?: number;
  lng?: number;
};

type DashboardInventoryMapDTO = {
  pins: InventoryMapPin[];
};

type InventoryRankingRow = {
  id: string;
  label: string;
  city?: string;
  occupancyPercent: number;
  activeCampaigns: number;
  revenueCents: number;
};

type DashboardInventoryRankingDTO = {
  rows: InventoryRankingRow[];
};

type TopClientRow = {
  id: string;
  name: string;
  city?: string;
  amountCents: number;
  campaignsCount: number;
  averageTicketCents?: number;
};

type DashboardTopClientsDTO = {
  rows: TopClientRow[];
};

type AgingBucket = {
  label: string;
  amountCents: number;
};

type DashboardReceivablesAgingSummaryDTO = {
  totalCents: number;
  buckets: AgingBucket[];
};

type OohOpsItem = {
  id: string;
  title: string;
  status: 'OK' | 'PENDING' | 'LATE';
  city?: string;
  dueDate?: string; // ISO date
};

type DashboardOohOpsSummaryDTO = {
  items: OohOpsItem[];
};

type ProofOfPlayRow = {
  id: string;
  screen: string;
  city?: string;
  uptimePercent: number;
  plays: number;
  lastSeen?: string; // ISO datetime
};

type DashboardDoohProofOfPlaySummaryDTO = {
  rows: ProofOfPlayRow[];
};

type KpiTrend = {
  deltaPercent: number; // variação vs período anterior
  points: number[]; // série curta para sparkline simples
};

type OverviewKpis = {
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

type FunnelStage = {
  key: string;
  label: string;
  count: number;
  amountCents: number;
};

type CommercialFunnel = {
  stages: FunnelStage[];
  averageDaysToClose: number;
  stalledProposals: StalledProposalRow[];
};

type AlertItem = {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  ctaLabel?: string;
  ctaPage?: Page;
};

type DrilldownRow = {
  id: string;
  title: string;
  subtitle?: string;
  amountCents?: number;
  status?: string;
};

type DrilldownState = {
  open: boolean;
  key?: string;
  title: string;
  rows: DrilldownRow[];
  hint?: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  errorMessage?: string;

  // paginação (drawer)
  cursor?: string;
  nextCursor?: string;
  hasMore: boolean;

  // busca local no drawer (não altera filtros globais)
  search: string;
};

function formatCurrency(cents: number) {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function seedNumber(seed: string) {
  // tiny deterministic hash -> number
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function buildSpark(seed: number, len = 10) {
  const pts: number[] = [];
  let v = (seed % 40) + 20;
  for (let i = 0; i < len; i++) {
    const step = ((seed + i * 97) % 11) - 5;
    v = clamp(v + step, 5, 95);
    pts.push(v);
  }
  return pts;
}

function normalizeText(v: string) {
  return (v || '').trim().toLowerCase();
}

function includesNormalized(haystack: string, needle: string) {
  const h = normalizeText(haystack);
  const n = normalizeText(needle);
  if (!n) return true;
  return h.includes(n);
}

function uniqById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}


/**
 * MOCK API (Etapa 1-3)
 *
 * BACKEND INTEGRATION POINTS (Etapa 4+):
 * - Trocar cada função por um service/hook (ex: services/dashboard.ts + hooks/useDashboardOverview.ts)
 * - Usar buildDashboardBackendQuery(filters) para montar dateFrom/dateTo/q/city/mediaType
 *
 * Mapa (alto nível) de blocos -> Prisma:
 * - Overview/KPIs: Proposal, Campaign, BillingInvoice, CashTransaction, MediaUnit, Reservation, Client
 * - Funil Comercial: Proposal (+responsibleUserId), Client, User
 * - Alertas: BillingInvoice, Campaign, Reservation, MediaPoint/MediaUnit
 * - Drilldowns: variam por chave (ex: receivablesOverdue -> BillingInvoice; stalledProposals -> Proposal)
 */
const mockApi = {
  fetchOverviewKpis: (companyId: string, filters: DashboardFilters): OverviewKpis => {
    // BACKEND: GET /dashboard/overview?datePreset=&query=&city=&mediaType=
    const s = seedNumber(`${companyId}:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);

    const inventoryTotalPoints = 120 + (s % 90);
    const proposalsTotal = 18 + (s % 22);
    const approvalRatePercent = 28 + (s % 42);
    const campaignsActiveCount = 6 + (s % 12);
    const campaignsActiveAmountCents = (2500000 + (s % 8000000)) * 1;
    const clientsActiveCount = 14 + (s % 30);
    const averageTicketCents = Math.floor(campaignsActiveAmountCents / Math.max(1, campaignsActiveCount));

    const revenueRecognizedCents = 1800000 + (s % 7000000);
    const revenueToInvoiceCents = 600000 + (s % 3500000);
    const receivablesOverdueCents = 80000 + (s % 900000);
    const occupancyPercent = 46 + (s % 42);

    return {
      inventoryTotalPoints,
      proposalsTotal,
      approvalRatePercent,
      campaignsActiveCount,
      campaignsActiveAmountCents,
      clientsActiveCount,
      averageTicketCents,
      revenueRecognizedCents,
      revenueToInvoiceCents,
      receivablesOverdueCents,
      occupancyPercent,
      trends: {
        revenue: { deltaPercent: ((s % 19) - 7), points: buildSpark(s + 11) },
        occupancy: { deltaPercent: ((s % 13) - 4), points: buildSpark(s + 29) },
        proposals: { deltaPercent: ((s % 21) - 8), points: buildSpark(s + 53) },
      },
    };
  },

  fetchCommercialFunnel: (companyId: string, filters: DashboardFilters): CommercialFunnel => {
    // BACKEND: GET /dashboard/funnel?...
    const s = seedNumber(`${companyId}:funnel:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);

    const stages: FunnelStage[] = [
      { key: 'lead', label: 'Leads', count: 22 + (s % 20), amountCents: 0 },
      { key: 'prospect', label: 'Prospects', count: 14 + (s % 16), amountCents: 0 },
      { key: 'sent', label: 'Propostas Enviadas', count: 9 + (s % 10), amountCents: 900000 + (s % 2200000) },
      { key: 'approved', label: 'Aprovadas', count: 4 + (s % 6), amountCents: 700000 + (s % 1800000) },
      { key: 'active', label: 'Em Veiculação', count: 3 + (s % 5), amountCents: 650000 + (s % 1500000) },
    ];

    const stalled = Array.from({ length: 6 }).map((_, idx) => {
      const id = `PROP-${(s % 9000) + 1000 + idx}`;
      return {
        id,
        title: `Proposta ${id}`,
        client: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'][idx % 6],
        daysWithoutUpdate: 6 + ((s + idx * 17) % 23),
        amountCents: 120000 + ((s + idx * 777) % 900000),
      };
    });

    const q = normalizeText(filters.query);
    const stalledProposals = q
      ? stalled.filter((p) => includesNormalized(`${p.id} ${p.title} ${p.client}`, q))
      : stalled;

    return {
      stages,
      averageDaysToClose: 9 + (s % 17),
      stalledProposals,
    };
  },

  fetchCommercialSummary: (companyId: string, filters: DashboardFilters): CommercialSummary => {
    // BACKEND: GET /dashboard/commercial/summary?...
    // Prisma: Proposal, ProposalItem, Client, User
    const s = seedNumber(
      `${companyId}:commercialSummary:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`,
    );

    // Reaproveita o mesmo "universo" do funil para manter coerência visual
    const funnel = mockApi.fetchCommercialFunnel(companyId, filters);
    const proposalsTotal = 18 + (s % 28);
    const approvalRatePercent = 25 + (s % 55);
    const averageDaysToClose = funnel.averageDaysToClose;
    const activePipelineAmountCents = funnel.stages.reduce((acc, st) => acc + (st.amountCents || 0), 0);
    const stalledProposalsCount = funnel.stalledProposals.length;

    return {
      proposalsTotal,
      approvalRatePercent,
      averageDaysToClose,
      activePipelineAmountCents,
      stalledProposalsCount,
    };
  },

  fetchStalledProposals: (companyId: string, filters: DashboardFilters): DashboardStalledProposalsDTO => {
    // BACKEND: GET /dashboard/proposals/stalled?...
    const funnel = mockApi.fetchCommercialFunnel(companyId, filters);
    return { rows: funnel.stalledProposals };
  },

  fetchSellerRanking: (companyId: string, filters: DashboardFilters): DashboardSellerRankingDTO => {
    // BACKEND: GET /dashboard/commercial/sellers/ranking?...
    // Prisma: User (sales), Proposal (responsibleUserId, status), Campaign (opcional)
    const s = seedNumber(
      `${companyId}:sellerRanking:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`,
    );
    const city = filters.city?.trim() || undefined;

    const names = ['Ana', 'Bruno', 'Carla', 'Diego', 'Eduarda', 'Felipe', 'Giovana', 'Henrique'];

    const rows: SellerRankingRow[] = Array.from({ length: 8 }).map((_, i) => {
      const id = `USR-${(s % 7000) + 2000 + i}`;
      const dealsWon = 1 + ((s + i * 11) % 12);
      const dealsInPipeline = 1 + ((s + i * 19) % 16);
      const amountWonCents = 380000 + ((s + i * 997) % 4200000);
      const amountPipelineCents = 220000 + ((s + i * 733) % 3600000);
      return {
        id,
        name: names[i % names.length],
        city: city || ['Brasília', 'Goiânia', 'São Paulo', 'Recife', 'Curitiba'][i % 5],
        dealsWon,
        dealsInPipeline,
        amountWonCents,
        amountPipelineCents,
      };
    });

    const q = normalizeText(filters.query);
    const filtered = q
      ? rows.filter((r) => includesNormalized(`${r.id} ${r.name} ${r.city || ''}`, q))
      : rows;

    // Ordena por valor ganho desc
    filtered.sort((a, b) => (b.amountWonCents ?? 0) - (a.amountWonCents ?? 0));
    return { rows: filtered };
  },

  fetchAlerts: (companyId: string, filters: DashboardFilters): AlertItem[] => {
    // BACKEND: GET /dashboard/alerts?...
    const s = seedNumber(`${companyId}:alerts:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);

    const pick = <T,>(arr: T[]) => arr[s % arr.length];

    const all: AlertItem[] = [
      {
        id: `AL-${s % 1000}`,
        severity: 'HIGH',
        title: 'Faturas vencendo em 7 dias',
        description: `Você tem ${3 + (s % 8)} cobranças perto do vencimento.`,
        ctaLabel: 'Ver financeiro',
        ctaPage: 'financial',
      },
      {
        id: `AL-${(s + 1) % 1000}`,
        severity: 'MEDIUM',
        title: 'Campanhas aguardando material',
        description: `Existem ${2 + (s % 4)} campanhas paradas aguardando envio de material.`,
        ctaLabel: 'Ver campanhas',
        ctaPage: 'campaigns',
      },
      {
        id: `AL-${(s + 2) % 1000}`,
        severity: pick(['LOW', 'MEDIUM']),
        title: 'Ocupação abaixo do esperado em uma região',
        description: 'Identificamos pontos com baixa ocupação no período selecionado.',
        ctaLabel: 'Ver inventário',
        ctaPage: 'inventory',
      },
    ];

    const q = normalizeText(filters.query);
    if (!q) return all;

    return all.filter((a) => includesNormalized(`${a.title} ${a.description}`, q));
  },

  fetchDrilldown: (
    companyId: string,
    key: string,
    filters: DashboardFilters,
    opts?: { cursor?: string; limit?: number },
  ): DashboardDrilldownDTO => {
    // BACKEND: GET /dashboard/drilldown/<key>?...
    const s = seedNumber(`${companyId}:drill:${key}:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);

    const total = 55 + (s % 25);
    const q = normalizeText(filters.query);

    const allRows: DrilldownRow[] = Array.from({ length: total }).map((_, idx) => ({
      id: `${key}-${(s % 9000) + 1000 + idx}`,
      title: `${key.toUpperCase()} • Item ${(s % 90) + idx + 1}`,
      subtitle: ['Brasília', 'Goiânia', 'São Paulo', 'Recife', 'Curitiba'][idx % 5],
      amountCents: 80000 + ((s + idx * 1234) % 1400000),
      status: ['ATIVA', 'AGUARDANDO', 'VENCIDA', 'APROVADA'][idx % 4],
    }));

    const filtered = q
      ? allRows.filter((r) => includesNormalized(`${r.id} ${r.title} ${r.subtitle || ''} ${r.status || ''}`, q))
      : allRows;

    const limit = Math.max(1, Math.min(opts?.limit ?? DRILLDOWN_PAGE_SIZE, 100));
    let offset = 0;
    if (opts?.cursor) {
      const parsed = Number.parseInt(String(opts.cursor), 10);
      offset = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }

    const pageRows = filtered.slice(offset, offset + limit);
    const nextOffset = offset + limit;
    const hasMore = nextOffset < filtered.length;
    const nextCursor = hasMore ? String(nextOffset) : undefined;

    return {
      rows: pageRows,
      paging: { hasMore, nextCursor },
    };
  },

  fetchRevenueTimeseries: (companyId: string, filters: DashboardFilters): DashboardTimeseriesDTO => {
    // BACKEND: GET /dashboard/revenue/timeseries?...
    const s = seedNumber(`${companyId}:revts:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);
    const now = new Date();
    const len = filters.datePreset === '7d' ? 7 : filters.datePreset === '30d' ? 14 : 18;

    const points: TimeseriesPoint[] = Array.from({ length: len }).map((_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (len - 1 - i));
      const base = 350000 + (s % 900000);
      const wave = ((s + i * 131) % 17) - 8;
      const valueCents = base + wave * 42000 + (i % 3) * 15000;
      return { date: d.toISOString(), valueCents };
    });

    return { points };
  },

  fetchCashflowTimeseries: (companyId: string, filters: DashboardFilters): DashboardTimeseriesDTO => {
    // BACKEND: GET /dashboard/cashflow/timeseries?...
    const s = seedNumber(`${companyId}:cashts:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);
    const now = new Date();
    const len = filters.datePreset === '7d' ? 7 : filters.datePreset === '30d' ? 14 : 18;

    const points: TimeseriesPoint[] = Array.from({ length: len }).map((_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (len - 1 - i));
      const base = 180000 + (s % 650000);
      const wave = ((s + i * 97) % 21) - 10;
      // cashflow pode oscilar e até ficar negativo
      const valueCents = base + wave * 38000 + ((i % 4) - 1) * 12000;
      return { date: d.toISOString(), valueCents };
    });

    return { points };
  },

  fetchInventoryMap: (companyId: string, filters: DashboardFilters): DashboardInventoryMapDTO => {
    // BACKEND: GET /dashboard/inventory/map?...
    const s = seedNumber(`${companyId}:invmap:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);
    const city = filters.city?.trim() || undefined;

    const pins: InventoryMapPin[] = Array.from({ length: 18 }).map((_, i) => {
      const id = `MP-${(s % 9000) + 1000 + i}`;
      const occ = clamp(35 + ((s + i * 13) % 60), 0, 100);
      return {
        id,
        label: `Ponto ${String.fromCharCode(65 + (i % 26))}-${(s % 90) + i + 1}`,
        city: city || ['Brasília', 'Goiânia', 'São Paulo', 'Recife', 'Curitiba'][i % 5],
        occupancyPercent: occ,
        // Coordenadas fictícias (só para referência visual futura)
        lat: -15.7 + ((s + i * 3) % 100) / 1000,
        lng: -47.9 + ((s + i * 7) % 100) / 1000,
      };
    });

    const q = normalizeText(filters.query);
    const filtered = q
      ? pins.filter((p) => includesNormalized(`${p.id} ${p.label} ${p.city || ''}`, q))
      : pins;

    return { pins: filtered };
  },

  fetchInventoryRanking: (companyId: string, filters: DashboardFilters): DashboardInventoryRankingDTO => {
    // BACKEND: GET /dashboard/inventory/ranking?...
    const s = seedNumber(`${companyId}:invrank:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);
    const city = filters.city?.trim() || undefined;

    const rows: InventoryRankingRow[] = Array.from({ length: 12 }).map((_, i) => {
      const id = `UNIT-${(s % 8000) + 2000 + i}`;
      const occ = clamp(40 + ((s + i * 17) % 55), 0, 100);
      const revenueCents = 140000 + ((s + i * 999) % 1200000);
      const activeCampaigns = 1 + ((s + i * 29) % 6);
      return {
        id,
        label: ['Painel', 'Empena', 'Relógio', 'Totem', 'Outdoor'][i % 5] + ` ${String.fromCharCode(65 + (i % 26))}`,
        city: city || ['Brasília', 'Goiânia', 'São Paulo', 'Recife', 'Curitiba'][i % 5],
        occupancyPercent: occ,
        activeCampaigns,
        revenueCents,
      };
    });

    const q = normalizeText(filters.query);
    const filtered = q
      ? rows.filter((r) => includesNormalized(`${r.id} ${r.label} ${r.city || ''}`, q))
      : rows;

    // ordena por ocupação desc
    filtered.sort((a, b) => (b.occupancyPercent ?? 0) - (a.occupancyPercent ?? 0));

    return { rows: filtered };
  },

  fetchTopClients: (companyId: string, filters: DashboardFilters): DashboardTopClientsDTO => {
    // BACKEND: GET /dashboard/top/clients?...
    // Prisma: Client, Proposal, Campaign, BillingInvoice/CashTransaction (para receita)
    const s = seedNumber(`${companyId}:topclients:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);
    const city = filters.city?.trim() || undefined;

    const baseNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Omega', 'Sigma', 'Kappa', 'Lambda'];

    const rows: TopClientRow[] = Array.from({ length: 10 }).map((_, i) => {
      const id = `CL-${(s % 6000) + 3000 + i}`;
      const amountCents = 350000 + ((s + i * 997) % 3800000);
      const campaignsCount = 1 + ((s + i * 37) % 6);
      const averageTicketCents = Math.floor(amountCents / Math.max(1, campaignsCount));
      return {
        id,
        name: baseNames[i % baseNames.length] + (i < 5 ? '' : ` ${String.fromCharCode(65 + (i % 26))}`),
        city: city || ['Brasília', 'Goiânia', 'São Paulo', 'Recife', 'Curitiba'][i % 5],
        amountCents,
        campaignsCount,
        averageTicketCents,
      };
    });

    const q = normalizeText(filters.query);
    const filtered = q
      ? rows.filter((r) => includesNormalized(`${r.id} ${r.name} ${r.city || ''}`, q))
      : rows;

    filtered.sort((a, b) => (b.amountCents ?? 0) - (a.amountCents ?? 0));
    return { rows: filtered };
  },

  fetchReceivablesAgingSummary: (companyId: string, filters: DashboardFilters): DashboardReceivablesAgingSummaryDTO => {
    // BACKEND: GET /dashboard/receivables/aging/summary?...
    // Prisma: BillingInvoice (status OPEN/OVERDUE + dueDate), CashTransaction (recebidos)
    const s = seedNumber(`${companyId}:aging:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);
    const totalCents = 900000 + (s % 5500000);
    const ratios = [0.22, 0.18, 0.27, 0.33];
    const labels = ['0-7 dias', '8-15 dias', '16-30 dias', '31+ dias'];

    const buckets: AgingBucket[] = labels.map((label, idx) => {
      const wiggle = ((s + idx * 31) % 11) - 5; // -5..+5
      const ratio = clamp(ratios[idx] + wiggle * 0.005, 0.08, 0.6);
      const amountCents = Math.round(totalCents * ratio);
      return { label, amountCents };
    });

    return { totalCents, buckets };
  },

  fetchOohOpsSummary: (companyId: string, filters: DashboardFilters): DashboardOohOpsSummaryDTO => {
    // BACKEND: GET /dashboard/ooh/ops/summary?...
    // Prisma: Campaign (status/etapas), Reservation (instalação), MediaUnit/MediaPoint (pendências)
    const s = seedNumber(`${companyId}:oohops:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);
    const city = filters.city?.trim() || undefined;
    const statuses: Array<OohOpsItem['status']> = ['OK', 'PENDING', 'LATE'];
    const titles = ['Aguardando material', 'Agendar instalação', 'Revisar arte', 'Pendência de foto', 'Recolher prova', 'Confirmar local'];

    const items: OohOpsItem[] = Array.from({ length: 10 }).map((_, i) => {
      const id = `OPS-${(s % 7000) + 1000 + i}`;
      const due = new Date();
      due.setDate(due.getDate() + ((s + i * 7) % 12) - 4);
      const status = statuses[(s + i * 13) % statuses.length];
      return {
        id,
        title: titles[i % titles.length],
        status,
        city: city || ['Brasília', 'Goiânia', 'São Paulo', 'Recife', 'Curitiba'][i % 5],
        dueDate: due.toISOString(),
      };
    });

    const q = normalizeText(filters.query);
    const filtered = q
      ? items.filter((it) => includesNormalized(`${it.id} ${it.title} ${it.city || ''} ${it.status}`, q))
      : items;

    // Ordena por urgência: LATE > PENDING > OK
    const rank = (st: OohOpsItem['status']) => (st === 'LATE' ? 2 : st === 'PENDING' ? 1 : 0);
    filtered.sort((a, b) => rank(b.status) - rank(a.status));
    return { items: filtered };
  },

  fetchDoohProofOfPlaySummary: (companyId: string, filters: DashboardFilters): DashboardDoohProofOfPlaySummaryDTO => {
    // BACKEND: GET /dashboard/dooh/proof-of-play/summary?...
    // Prisma: Screen/Device (DOOH), logs de exibição (proofOfPlay), falhas/offline
    const s = seedNumber(`${companyId}:pop:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);
    const city = filters.city?.trim() || undefined;

    const rows: ProofOfPlayRow[] = Array.from({ length: 10 }).map((_, i) => {
      const id = `SCR-${(s % 9000) + 1000 + i}`;
      const uptimePercent = clamp(88 + ((s + i * 9) % 15), 0, 100);
      const plays = 1200 + ((s + i * 77) % 6200);
      const lastSeen = new Date();
      lastSeen.setMinutes(lastSeen.getMinutes() - ((s + i * 23) % 600));
      return {
        id,
        screen: `Tela ${String.fromCharCode(65 + (i % 26))}-${(s % 90) + i + 1}`,
        city: city || ['Brasília', 'Goiânia', 'São Paulo', 'Recife', 'Curitiba'][i % 5],
        uptimePercent,
        plays,
        lastSeen: lastSeen.toISOString(),
      };
    });

    const q = normalizeText(filters.query);
    const filtered = q
      ? rows.filter((r) => includesNormalized(`${r.id} ${r.screen} ${r.city || ''}`, q))
      : rows;

    filtered.sort((a, b) => (b.uptimePercent ?? 0) - (a.uptimePercent ?? 0));
    return { rows: filtered };
  },

  getPublicMapUrl: (companyId: string) => {
    // BACKEND: company.publicMapUrl (ou service de infra)
    const s = seedNumber(companyId);
    return `https://onemedia.app/public/map/${companyId}?t=${s % 100000}`;
  },
};

// ---------------------------
// UI helpers (Etapa 2)
// ---------------------------

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="py-10 flex flex-col items-center justify-center text-center">
      <p className="text-sm text-gray-900">{title}</p>
      {description ? <p className="text-xs text-gray-500 mt-1 max-w-sm">{description}</p> : null}
    </div>
  );
}

function ErrorState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="py-10 flex flex-col items-center justify-center text-center">
      <p className="text-sm text-red-700">{title}</p>
      {description ? <p className="text-xs text-red-700/80 mt-1 max-w-sm">{description}</p> : null}
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(1, max - min);

  return (
    <div className="flex items-end gap-0.5 h-6">
      {points.map((p, idx) => {
        const h = Math.round(((p - min) / range) * 22) + 2;
        return <div key={idx} className="w-1 rounded-sm bg-gray-200" style={{ height: `${h}px` }} />;
      })}
    </div>
  );
}

function Delta({ value }: { value: number }) {
  const sign = value > 0 ? '+' : '';
  const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-500';
  return (
    <span className={`text-xs ${color}`}>
      {sign}
      {value}%
    </span>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border ${
        active
          ? 'bg-white text-gray-900 border-gray-200 shadow-sm'
          : 'bg-transparent text-gray-600 border-transparent hover:bg-white/60'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs whitespace-nowrap">
      <span className="text-gray-500">{label}:</span> {value}
    </div>
  );
}

function SeverityDot({ severity }: { severity: AlertItem['severity'] }) {
  const cls = severity === 'HIGH' ? 'bg-red-500' : severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls}`} />;
}

function WidgetCard({
  title,
  subtitle,
  actions,
  loading,
  error,
  empty,
  emptyTitle,
  emptyDescription,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  loading?: boolean;
  error?: { title: string; description?: string } | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            {subtitle ? <p className="text-xs text-gray-500 mt-1">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <ErrorState title={error.title} description={error.description} />
        ) : empty ? (
          <EmptyState title={emptyTitle || 'Sem dados'} description={emptyDescription} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function KpiCard({
  label,
  value,
  helper,
  delta,
  spark,
  onClick,
  loading,
}: {
  label: string;
  value?: string;
  helper?: string;
  delta?: number;
  spark?: number[];
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <Card className={onClick ? 'cursor-pointer hover:shadow-sm' : ''} onClick={onClick}>
      <CardContent className="pt-5">
        <p className="text-xs text-gray-500">{label}</p>
        {loading ? (
          <div className="mt-2">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </div>
        ) : (
          <>
            <p className="text-gray-900 mt-1">{value || '—'}</p>
            {helper ? <p className="text-xs text-gray-500 mt-2">{helper}</p> : null}
            {typeof delta === 'number' && spark ? (
              <div className="mt-2 flex items-center justify-between">
                <Delta value={delta} />
                <Sparkline points={spark} />
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function escapeCsvValue(value: unknown) {
  const s = String(value ?? '');
  if (/[\n\r";,]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportDrilldownCsv(label: string, rows: DrilldownRow[]) {
  const header = ['id', 'title', 'subtitle', 'status', 'amount'];
  const lines = [header.join(';')];

  for (const r of rows) {
    const line = [
      escapeCsvValue(r.id),
      escapeCsvValue(r.title),
      escapeCsvValue(r.subtitle || ''),
      escapeCsvValue(r.status || ''),
      escapeCsvValue(typeof r.amountCents === 'number' ? formatCurrency(r.amountCents) : ''),
    ];
    lines.push(line.join(';'));
  }

  const safe = label.replace(/[^a-z0-9\-\_]+/gi, '_').slice(0, 40);
  const filename = `export_${safe || 'dashboard'}.csv`;
  downloadTextFile(filename, lines.join('\n'), 'text/csv;charset=utf-8');
  toast.success('CSV exportado (mock)', { description: filename });
}

function exportAgingBucketsCsv(label: string, buckets: AgingBucket[], totalCents?: number) {
  const header = ['bucket', 'amount', 'total'];
  const lines = [header.join(';')];

  for (const b of buckets) {
    lines.push([
      escapeCsvValue(b.label),
      escapeCsvValue(formatCurrency(b.amountCents)),
      escapeCsvValue(typeof totalCents === 'number' ? formatCurrency(totalCents) : ''),
    ].join(';'));
  }

  const safe = label.replace(/[^a-z0-9\-\_]+/gi, '_').slice(0, 40);
  const filename = `export_${safe || 'dashboard'}_aging.csv`;
  downloadTextFile(filename, lines.join('\n'), 'text/csv;charset=utf-8');
  toast.success('CSV exportado (mock)', { description: filename });
}

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}

function timeseriesToSpark(points: TimeseriesPoint[]) {
  const values = points.map((p) => (p?.valueCents ?? 0) / 100);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);
  return values.map((v) => {
    const n = ((v - min) / range) * 90 + 5;
    return Math.round(clamp(n, 5, 95));
  });
}

function exportTimeseriesCsv(label: string, points: TimeseriesPoint[]) {
  const header = ['date', 'value'];
  const lines = [header.join(';')];

  for (const p of points) {
    lines.push([escapeCsvValue(p.date), escapeCsvValue(formatCurrency(p.valueCents))].join(';'));
  }

  const safe = label.replace(/[^a-z0-9\-\_]+/gi, '_').slice(0, 40);
  const filename = `export_${safe || 'dashboard'}.csv`;
  downloadTextFile(filename, lines.join('\n'), 'text/csv;charset=utf-8');
  toast.success('CSV exportado', { description: filename });
}


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
    });
  }, [backendQuery, backendQs, drilldown.key, drilldown.cursor]);

  const drilldownQ = useDashboardQuery<DashboardDrilldownDTO>({
    enabled: !!company && drilldown.open && !!drilldown.key,
    mode: DASHBOARD_DATA_MODE,
    deps: [company?.id, drilldown.key, drilldownQs],
    computeMock: () => mockApi.fetchDrilldown(company!.id, drilldown.key!, filters, {
      cursor: drilldown.cursor,
      limit: DRILLDOWN_PAGE_SIZE,
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
    const qs = toQueryString(backendQuery, {
      limit: String(DRILLDOWN_PAGE_SIZE),
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

                        {visible.map((r) => (
                          <div key={r.id} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm text-gray-900">{r.title}</p>
                                {r.subtitle ? <p className="text-xs text-gray-500">{r.subtitle}</p> : null}
                                {r.status ? <p className="text-xs text-gray-500 mt-1">Status: {r.status}</p> : null}
                              </div>
                              {typeof r.amountCents === 'number' ? (
                                <p className="text-sm text-gray-700">{formatCurrency(r.amountCents)}</p>
                              ) : null}
                            </div>
                          </div>
                        ))}

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
                          onClick={() => exportDrilldownCsv(drilldown.title, visible)}
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
