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
  stalledProposals: { id: string; title: string; client: string; daysWithoutUpdate: number; amountCents: number }[];
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
  title: string;
  rows: DrilldownRow[];
  hint?: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  errorMessage?: string;
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

/**
 * MOCK API (Etapa 1-3)
 *
 * BACKEND INTEGRATION POINTS:
 * - Trocar cada função por um service/hook (ex: services/dashboard.ts + hooks/useDashboardKpis.ts)
 * - Padrão de filtros: mapear DashboardFilters -> query params
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

  fetchDrilldownRows: (companyId: string, key: string, filters: DashboardFilters): DrilldownRow[] => {
    // BACKEND: GET /dashboard/drilldown/<key>?...
    const s = seedNumber(`${companyId}:drill:${key}:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);

    return Array.from({ length: 12 }).map((_, idx) => ({
      id: `${key}-${(s % 9000) + 1000 + idx}`,
      title: `${key.toUpperCase()} • Item ${(s % 90) + idx + 1}`,
      subtitle: ['Brasília', 'Goiânia', 'São Paulo', 'Recife', 'Curitiba'][idx % 5],
      amountCents: 80000 + ((s + idx * 1234) % 1400000),
      status: ['ATIVA', 'AGUARDANDO', 'VENCIDA', 'APROVADA'][idx % 4],
    }));
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

type MockQueryState<T> = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data?: T;
  errorMessage?: string;
  refetch: () => void;
};

function useMockQuery<T>(opts: {
  enabled: boolean;
  deps: unknown[];
  delayMs?: number;
  compute: () => T;
}): MockQueryState<T> {
  const { enabled, deps, delayMs = 220, compute } = opts;
  const [state, setState] = useState<Omit<MockQueryState<T>, 'refetch'>>({
    status: enabled ? 'loading' : 'idle',
    data: undefined,
    errorMessage: undefined,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle', data: undefined, errorMessage: undefined });
      return;
    }

    setState((s) => ({ ...s, status: 'loading', errorMessage: undefined }));

    const timer = window.setTimeout(() => {
      try {
        const data = compute();
        setState({ status: 'ready', data, errorMessage: undefined });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro inesperado';
        setState({ status: 'error', data: undefined, errorMessage: msg });
      }
    }, delayMs);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, ...deps]);

  return {
    ...state,
    refetch: () => setNonce((n) => n + 1),
  };
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

  const [drilldown, setDrilldown] = useState<DrilldownState>({
    open: false,
    title: '',
    rows: [],
    hint: undefined,
    status: 'idle',
    errorMessage: undefined,
  });

  const overviewQ = useMockQuery<OverviewKpis>({
    enabled: !!company,
    deps: [company?.id, filters.datePreset, filters.query, filters.city, filters.mediaType],
    compute: () => mockApi.fetchOverviewKpis(company!.id, filters),
  });

  const funnelQ = useMockQuery<CommercialFunnel>({
    enabled: !!company,
    deps: [company?.id, filters.datePreset, filters.query, filters.city, filters.mediaType],
    compute: () => mockApi.fetchCommercialFunnel(company!.id, filters),
  });

  const alertsQ = useMockQuery<AlertItem[]>({
    enabled: !!company,
    deps: [company?.id, filters.datePreset, filters.query, filters.city, filters.mediaType],
    compute: () => mockApi.fetchAlerts(company!.id, filters),
  });

  const overview = overviewQ.data;
  const funnel = funnelQ.data;
  const alerts = alertsQ.data || [];

  // URL pública do mapa (mock)
  const publicMapUrl = useMemo(() => {
    if (!company) return '';
    return mockApi.getPublicMapUrl(company.id);
  }, [company]);

  // Reset drilldown when tab changes (evita confusão)
  useEffect(() => {
    setDrilldown((s) => ({ ...s, open: false, status: 'idle', rows: [] }));
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
    setDrilldown({
      open: true,
      title,
      rows: [],
      hint,
      status: 'loading',
      errorMessage: undefined,
    });

    // Mock async: simula carregamento por clique
    window.setTimeout(() => {
      try {
        const rows = mockApi.fetchDrilldownRows(company.id, key, filters);
        setDrilldown((s) => ({ ...s, rows, status: 'ready', errorMessage: undefined }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro inesperado ao carregar detalhes';
        setDrilldown((s) => ({ ...s, status: 'error', errorMessage: msg }));
      }
    }, 220);
  };

  const exportCsvMock = (label: string) => {
    toast.message(`Export (mock): ${label}`, {
      description: 'Na integração, isso vai gerar CSV/PDF do recorte atual de filtros.',
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
              subtitle="Gráfico (mock)"
              loading={executiveLoading}
              actions={
                <Button variant="outline" className="h-9" onClick={() => exportCsvMock('Tendência de Receita')}>
                  Exportar
                </Button>
              }
            >
              <div className="h-52 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-500">
                Gráfico (mock) • BACKEND: /dashboard/revenue/timeseries
              </div>
            </WidgetCard>

            <WidgetCard
              title="Top Clientes"
              subtitle="Ranking (mock)"
              loading={executiveLoading}
              actions={
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() => openDrilldown('Top Clientes', 'topClients', 'BACKEND: /dashboard/clients/top')}
                >
                  Ver detalhes
                </Button>
              }
            >
              <div className="space-y-3">
                {['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'].map((name, idx) => (
                  <div key={name} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900">
                        {idx + 1}. {name}
                      </p>
                      <p className="text-xs text-gray-500">Ticket médio: {overview ? formatCurrency(overview.averageTicketCents) : '—'}</p>
                    </div>
                    <span className="text-sm text-gray-700">
                      {overview ? formatCurrency(overview.averageTicketCents + idx * 70000) : '—'}
                    </span>
                  </div>
                ))}
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
              value={overview ? String(overview.proposalsTotal) : undefined}
              delta={overview?.trends.proposals.deltaPercent}
              spark={overview?.trends.proposals.points}
              loading={executiveLoading}
              onClick={() => openDrilldown('Propostas', 'proposalsTotal', 'BACKEND: /dashboard/proposals')}
            />

            <KpiCard
              label="Taxa de aprovação"
              value={overview ? `${overview.approvalRatePercent}%` : undefined}
              helper="BACKEND: /dashboard/proposals/approval-rate"
              loading={executiveLoading}
            />

            <KpiCard
              label="Ciclo médio"
              value={funnel ? `${funnel.averageDaysToClose} dias` : undefined}
              helper="BACKEND: /dashboard/proposals/time-to-close"
              loading={commercialLoading}
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
              subtitle="Pipeline por etapa (mock)"
              loading={commercialLoading}
              error={funnelQ.status === 'error' ? { title: 'Falha ao carregar funil', description: funnelQ.errorMessage } : null}
              actions={
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
                  <p className="text-xs text-gray-500 mt-4">BACKEND: /dashboard/funnel</p>
                </div>
              ) : null}
            </WidgetCard>

            <WidgetCard
              title="Propostas paradas"
              subtitle="Ações rápidas (mock)"
              loading={commercialLoading}
              error={funnelQ.status === 'error' ? { title: 'Falha ao carregar lista', description: funnelQ.errorMessage } : null}
              empty={!!funnel && funnel.stalledProposals.length === 0 && funnelQ.status === 'ready'}
              emptyTitle="Nada aqui"
              emptyDescription="Nenhuma proposta parou com os filtros atuais."
              actions={
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() => openDrilldown('Propostas paradas', 'stalledProposals', 'BACKEND: /dashboard/proposals/stalled')}
                >
                  Ver todas
                </Button>
              }
            >
              <div className="space-y-3">
                {funnel?.stalledProposals.slice(0, 5).map((p) => (
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
              </div>
            </WidgetCard>
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
            <WidgetCard title="Status operacional (OOH)" subtitle="Checklist / SLA / pendências (mock)" actions={
              <Button variant="outline" className="h-9" onClick={() => exportCsvMock('Status operacional (OOH)')}>Exportar</Button>
            }>
              <div className="h-52 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-500">
                BACKEND: /dashboard/ooh/ops
              </div>
            </WidgetCard>

            <WidgetCard title="Proof-of-play (DOOH)" subtitle="Relatório POP (mock)" actions={
              <Button variant="outline" className="h-9" onClick={() => exportCsvMock('Proof-of-play (DOOH)')}>Exportar</Button>
            }>
              <div className="h-52 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-500">
                BACKEND: /dashboard/dooh/proof-of-play
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
              subtitle="Série por dia/semana (mock)"
              loading={executiveLoading}
              actions={
                <Button variant="outline" className="h-9" onClick={() => exportCsvMock('Fluxo de caixa')}>
                  Exportar
                </Button>
              }
            >
              <div className="h-52 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-500">
                BACKEND: /dashboard/cashflow/timeseries
              </div>
            </WidgetCard>

            <WidgetCard
              title="Aging (mock)"
              subtitle="Distribuição por faixa"
              loading={executiveLoading}
              actions={
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() => openDrilldown('Aging', 'aging', 'BACKEND: /dashboard/receivables/aging')}
                >
                  Ver lista
                </Button>
              }
            >
              <div className="space-y-3">
                {overview
                  ? [
                      ['0-7 dias', 0.22],
                      ['8-15 dias', 0.18],
                      ['16-30 dias', 0.27],
                      ['31+ dias', 0.33],
                    ].map(([label, ratio]) => (
                      <div key={label as string}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-700">{label as string}</p>
                          <p className="text-sm text-gray-900">{formatCurrency(overview.revenueToInvoiceCents * (ratio as number))}</p>
                        </div>
                        <div className="w-full h-2 rounded bg-gray-100 overflow-hidden">
                          <div className="h-2 bg-gray-300" style={{ width: `${Math.round((ratio as number) * 100)}%` }} />
                        </div>
                      </div>
                    ))
                  : null}
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
              subtitle="Mapa (mock) • pins por ocupação"
              loading={executiveLoading}
              actions={
                <Button variant="outline" className="h-9" onClick={() => setShareMapOpen(true)}>
                  Compartilhar
                </Button>
              }
            >
              <div className="h-52 border border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-sm text-gray-500 gap-2">
                <p>Mapa (mock)</p>
                <p className="text-xs">BACKEND: /dashboard/inventory/map</p>
              </div>
            </WidgetCard>

            <WidgetCard
              title="Ranking de pontos"
              subtitle="Top 5 (mock)"
              loading={executiveLoading}
              actions={
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() => openDrilldown('Ranking de pontos', 'inventoryRanking', 'BACKEND: /dashboard/inventory/ranking')}
                >
                  Ver lista
                </Button>
              }
            >
              <div className="space-y-3">
                {['Painel A', 'Painel B', 'Painel C', 'Painel D', 'Painel E'].map((name, idx) => (
                  <div key={name} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900">
                        {idx + 1}. {name}
                      </p>
                      <p className="text-xs text-gray-500">Cidade: {filters.city || '—'}</p>
                    </div>
                    <span className="text-sm text-gray-700">{overview ? `${Math.round(overview.occupancyPercent - idx * 3)}%` : '—'}</span>
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
              {drilldown.status === 'loading' ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : drilldown.status === 'error' ? (
                <ErrorState title="Falha ao carregar detalhes" description={drilldown.errorMessage} />
              ) : drilldown.rows.length === 0 ? (
                <EmptyState title="Sem itens" description="Nada encontrado para este recorte de filtros." />
              ) : (
                <div className="space-y-3">
                  {drilldown.rows.map((r) => (
                    <div key={r.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-gray-900">{r.title}</p>
                          {r.subtitle ? <p className="text-xs text-gray-500">{r.subtitle}</p> : null}
                          {r.status ? <p className="text-xs text-gray-500 mt-1">Status: {r.status}</p> : null}
                        </div>
                        {typeof r.amountCents === 'number' ? <p className="text-sm text-gray-700">{formatCurrency(r.amountCents)}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full h-9"
                  onClick={() => exportDrilldownCsv(drilldown.title, drilldown.rows)}
                  disabled={drilldown.rows.length === 0 || drilldown.status !== 'ready'}
                >
                  Exportar CSV (mock)
                </Button>
              </div>
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
