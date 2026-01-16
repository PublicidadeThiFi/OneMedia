import type {
  AlertItem,
  CommercialFunnel,
  CommercialSummary,
  DashboardAlertsDTO,
  DashboardCommercialSummaryDTO,
  DashboardDoohProofOfPlaySummaryDTO,
  DashboardDrilldownDTO,
  DashboardFilters,
  DashboardInventoryMapDTO,
  DashboardInventoryRankingDTO,
  DashboardOohOpsSummaryDTO,
  DashboardReceivablesAgingSummaryDTO,
  AgingBucket,
  DashboardSellerRankingDTO,
  SellerRankingRow,
  DashboardStalledProposalsDTO,
  DashboardTimeseriesDTO,
  DashboardTopClientsDTO,
  DrilldownRow,
  FunnelStage,
  InventoryMapPin,
  InventoryRankingRow,
  OohOpsItem,
  OverviewKpis,
  ProofOfPlayRow,
  TimeseriesPoint,
  TopClientRow,
} from './types';
import { buildSpark, clamp, getRowField, includesNormalized, normalizeText, seedNumber, uniqById } from './utils';
import { DRILLDOWN_PAGE_SIZE } from './constants';

export const mockApi = {
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
    opts?: { cursor?: string; limit?: number; sortBy?: string; sortDir?: 'asc' | 'desc' },
  ): DashboardDrilldownDTO => {
    // BACKEND: GET /dashboard/drilldown/<key>?...
    const s = seedNumber(`${companyId}:drill:${key}:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);

    const total = 55 + (s % 25);
    const q = normalizeText(filters.query);    const allRows: DrilldownRow[] = Array.from({ length: total }).map((_, idx) => {
      const city = ['Brasília', 'Goiânia', 'São Paulo', 'Recife', 'Curitiba'][idx % 5];
      const base: DrilldownRow = {
        id: `${key}-${(s % 9000) + 1000 + idx}`,
        title: `${key.toUpperCase()} • Item ${(s % 90) + idx + 1}`,
        subtitle: city,
        amountCents: 80000 + ((s + idx * 1234) % 1400000),
        status: ['ATIVA', 'AGUARDANDO', 'VENCIDA', 'APROVADA'][idx % 4],
        fields: {},
      };

      // Ajustes por chave (Etapa 9): adiciona campos para colunas específicas
      if (key === 'topClients') {
        base.title = `Cliente ${(s % 70) + idx + 1}`;
        base.status = undefined;
        base.fields = {
          campaignsCount: 1 + ((s + idx) % 8),
          averageTicketCents: Math.floor((base.amountCents || 0) / Math.max(1, 1 + ((s + idx) % 8))),
        };
      }

      if (key === 'inventoryRanking' || key === 'occupancy') {
        const occ = clamp(35 + ((s + idx * 7) % 60), 0, 100);
        base.title = `Ponto ${String.fromCharCode(65 + (idx % 26))}-${(s % 90) + idx + 1}`;
        base.status = undefined;
        base.fields = {
          occupancyPercent: occ,
          activeCampaigns: (s + idx) % 6,
          revenueCents: base.amountCents,
        };
      }

      if (key === 'oohOps') {
        const due = new Date();
        due.setDate(due.getDate() + ((idx % 12) - 3));
        base.title = `Pendência OOH ${(s % 40) + idx + 1}`;
        base.status = ['OK', 'PENDING', 'LATE'][idx % 3];
        base.amountCents = undefined;
        base.fields = {
          dueDate: due.toISOString(),
        };
      }

      if (key === 'proofOfPlay') {
        const last = new Date();
        last.setMinutes(last.getMinutes() - ((idx % 180) + 5));
        base.title = `Tela ${(s % 300) + idx + 1}`;
        base.status = undefined;
        base.amountCents = undefined;
        base.fields = {
          uptimePercent: clamp(72 + ((s + idx * 9) % 28), 0, 100),
          plays: 1000 + ((s + idx * 17) % 9000),
          lastSeen: last.toISOString(),
        };
      }

      if (key === 'aging') {
        const labels = ['0-7', '8-15', '16-30', '31-60', '61+'];
        const label = labels[idx % labels.length];
        base.id = `aging-${label}-${idx}`;
        base.title = label;
        base.subtitle = undefined;
        base.status = undefined;
        base.amountCents = 20000 + ((s + idx * 999) % 2800000);
        base.fields = {};
      }

      return base;
    });

    const filtered = q
      ? allRows.filter((r) => includesNormalized(`${r.id} ${r.title} ${r.subtitle || ''} ${r.status || ''}`, q))
      : allRows;

    // Ordenação (Etapa 9): mock respeita sortBy/sortDir para simular server-side ordering
    const sortBy = opts?.sortBy;
    const sortDir: 'asc' | 'desc' = opts?.sortDir || 'desc';

    const sorted = sortBy
      ? [...filtered].sort((a, b) => {
          const av = getRowField(a, sortBy);
          const bv = getRowField(b, sortBy);

          const aNum = typeof av === 'number' ? av : Number.NaN;
          const bNum = typeof bv === 'number' ? bv : Number.NaN;

          let cmp = 0;
          if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
            cmp = aNum - bNum;
          } else {
            const aStr = av === null || av === undefined ? '' : String(av);
            const bStr = bv === null || bv === undefined ? '' : String(bv);

            // tenta ordenar por data quando possível
            const aMs = Date.parse(aStr);
            const bMs = Date.parse(bStr);
            if (Number.isFinite(aMs) && Number.isFinite(bMs)) {
              cmp = aMs - bMs;
            } else {
              cmp = aStr.localeCompare(bStr, 'pt-BR');
            }
          }

          return sortDir === 'asc' ? cmp : -cmp;
        })
      : filtered;

    const limit = Math.max(1, Math.min(opts?.limit ?? DRILLDOWN_PAGE_SIZE, 100));
    let offset = 0;
    if (opts?.cursor) {
      const parsed = Number.parseInt(String(opts.cursor), 10);
      offset = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }

    const pageRows = sorted.slice(offset, offset + limit);
    const nextOffset = offset + limit;
    const hasMore = nextOffset < sorted.length;
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
