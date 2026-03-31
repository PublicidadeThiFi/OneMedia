import type {
  AlertItem,
  CommercialFunnel,
  CommercialSummary,
  DashboardAlertsDTO,
  DashboardCommercialSummaryDTO,
  DashboardDoohSummaryDTO,
  DashboardDrilldownDTO,
  DashboardFilters,
  DashboardInventoryMapDTO,
  DashboardInventorySummaryDTO,
  DashboardInventoryRankingDTO,
  DashboardInventoryRegionDistributionDTO,
  DashboardInventoryTypeDistributionDTO,
  DashboardInventorySubtypeDistributionDTO,
  DashboardInventoryOpportunitySummaryDTO,
  DashboardOohOpsSummaryDTO,
  DashboardOperationsLateRegionsDTO,
  DashboardOperationsCityStatusDTO,
  DashboardReceivablesAgingSummaryDTO,
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
  ClientTopCampaignRow,
  ClientOpenProposalRow,
  ClientInactiveRiskRow,
  ClientRegionDistributionRow,
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
  InventoryRegionDistributionRow,
  InventoryCategoryDistributionRow,
  InventoryOpportunityRow,
  OohOpsItem,
  OperationsLateRegionRow,
  OperationsCityStatusRow,
  OverviewKpis,
  DoohSummaryRow,
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
    const proposalsOpenCount = 6 + (s % 11);
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
      proposalsOpenCount,
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
    const proposalsOpenCount = funnel.stages.filter((stage) => ['sent'].includes(stage.key)).reduce((sum, stage) => sum + stage.count, 0) + (s % 4);
    const approvalRatePercent = 25 + (s % 55);
    const averageDaysToClose = funnel.averageDaysToClose;
    const averageCommercialTicketCents = 180000 + (s % 1400000);
    const activePipelineAmountCents = funnel.stages.reduce((acc, st) => acc + (st.amountCents || 0), 0);
    const stalledProposalsCount = funnel.stalledProposals.length;

    return {
      proposalsTotal,
      proposalsOpenCount,
      approvalRatePercent,
      averageDaysToClose,
      averageCommercialTicketCents,
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

  fetchCommercialProposalsTimeseries: (companyId: string, filters: DashboardFilters): DashboardTimeseriesDTO => {
    const s = seedNumber(`${companyId}:commercialPropsTs:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);
    const now = new Date();
    const len = filters.datePreset === '7d' ? 7 : filters.datePreset === '30d' ? 10 : 14;

    const points: TimeseriesPoint[] = Array.from({ length: len }).map((_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (len - 1 - i));
      const valueCents = 3 + ((s + i * 17) % 12);
      return { date: d.toISOString(), valueCents };
    });

    return { points };
  },

  fetchHighValueOpenProposals: (companyId: string, filters: DashboardFilters): DashboardStalledProposalsDTO => {
    const s = seedNumber(`${companyId}:highValueOpen:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);
    const names = ['Atlas', 'Brisa', 'Croma', 'Delta', 'Eixo', 'Faro'];
    const rows = Array.from({ length: 6 }).map((_, idx) => {
      const id = `PROP-HV-${(s % 8000) + idx + 1000}`;
      return {
        id,
        title: `Proposta ${id}`,
        client: names[idx % names.length],
        daysWithoutUpdate: 2 + ((s + idx * 13) % 18),
        amountCents: 650000 + ((s + idx * 1777) % 3600000),
        responsibleUser: ['Ana', 'Bruno', 'Carla', 'Diego'][idx % 4],
        status: 'ENVIADA',
      };
    });
    return { rows };
  },

  fetchAlerts: (companyId: string, filters: DashboardFilters): AlertItem[] => {
    // BACKEND: GET /dashboard/alerts?...
    const s = seedNumber(`${companyId}:alerts:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);

    const pick = <T,>(arr: T[]) => arr[s % arr.length];

    const all: AlertItem[] = [
      {
        id: `AL-${s % 1000}`,
        severity: 'HIGH',
        title: 'Faturas críticas nos próximos dias',
        description: `Você tem ${3 + (s % 8)} cobranças abertas que vencem dentro da próxima janela operacional.`,
        ctaLabel: 'Ver financeiro',
        ctaPage: 'financial',
      },
      {
        id: `AL-${(s + 1) % 1000}`,
        severity: 'MEDIUM',
        title: 'Propostas paradas no comercial',
        description: `Existem ${2 + (s % 5)} propostas sem atualização recente e exigindo retomada.`,
        ctaLabel: 'Ver propostas',
        ctaPage: 'proposals',
      },
      {
        id: `AL-${(s + 2) % 1000}`,
        severity: 'MEDIUM',
        title: 'Campanhas aguardando material',
        description: `Existem ${2 + (s % 4)} campanhas paradas aguardando envio de material.`,
        ctaLabel: 'Ver campanhas',
        ctaPage: 'campaigns',
      },
      {
        id: `AL-${(s + 3) % 1000}`,
        severity: pick(['HIGH', 'MEDIUM']),
        title: 'Check-ins pendentes',
        description: `Há ${1 + (s % 6)} pendências de check-in na operação OOH.`,
        ctaLabel: 'Ver campanhas',
        ctaPage: 'campaigns',
      },
      {
        id: `AL-${(s + 4) % 1000}`,
        severity: 'LOW',
        title: 'Pontos com baixa ocupação',
        description: 'Identificamos pontos com ocupação abaixo do esperado no período selecionado.',
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
    opts?: { cursor?: string; limit?: number; sortBy?: string; sortDir?: 'asc' | 'desc'; params?: Record<string, string> },
  ): DashboardDrilldownDTO => {
    // BACKEND: GET /dashboard/drilldown/<key>?...
    const paramsKey = opts?.params
      ? Object.entries(opts.params)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join('&')
      : '';

    const s = seedNumber(`${companyId}:drill:${key}:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}:${paramsKey}`);

    const total = 55 + (s % 25);
    const q = normalizeText(filters.query);
    const allRows: DrilldownRow[] = Array.from({ length: total }).map((_, idx) => {
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
      if (key === 'stalledProposals') {
        base.title = `Proposta ${(s % 700) + idx + 1}`;
        base.subtitle = ['Atlas', 'Brisa', 'Croma', 'Delta', 'Eixo'][idx % 5];
        base.status = 'ENVIADA';
        base.fields = {
          daysWithoutUpdate: 5 + ((s + idx * 3) % 21),
        };
      }

      if (key === 'sellerRanking' || key === 'pipelineBySeller') {
        base.title = ['Ana', 'Bruno', 'Carla', 'Diego', 'Eduarda', 'Felipe'][idx % 6];
        base.subtitle = ['Brasília', 'Goiânia', 'São Paulo', 'Recife'][idx % 4];
        base.status = undefined;
        const amountWonCents = 380000 + ((s + idx * 997) % 4200000);
        const amountPipelineCents = 220000 + ((s + idx * 733) % 3600000);
        base.amountCents = amountWonCents;
        base.fields = {
          dealsWon: 1 + ((s + idx) % 12),
          dealsInPipeline: 1 + ((s + idx * 2) % 14),
          amountWonCents,
          amountPipelineCents,
        };
      }

      if (key === 'highValueOpenProposals') {
        base.title = `Proposta high value ${(s % 500) + idx + 1}`;
        base.subtitle = ['Atlas', 'Brisa', 'Croma', 'Delta', 'Eixo'][idx % 5];
        base.status = 'ENVIADA';
        base.amountCents = 650000 + ((s + idx * 1777) % 3600000);
        base.fields = {
          daysWithoutUpdate: 2 + ((s + idx * 5) % 18),
          responsibleUser: ['Ana', 'Bruno', 'Carla', 'Diego'][idx % 4],
        };
      }

      if (key === 'topClients') {
        base.title = `Cliente ${(s % 70) + idx + 1}`;
        base.status = undefined;
        base.fields = {
          campaignsCount: 1 + ((s + idx) % 8),
          averageTicketCents: Math.floor((base.amountCents || 0) / Math.max(1, 1 + ((s + idx) % 8))),
        };
      }

      if (key === 'clientsTopCampaigns') {
        base.title = `Cliente ${(s % 70) + idx + 1}`;
        base.status = undefined;
        base.fields = {
          state: ['DF', 'GO', 'SP', 'PE', 'PR'][idx % 5],
          campaignsCount: 1 + ((s + idx) % 8),
          activeCampaignsCount: 1 + ((s + idx * 2) % 6),
          revenueCents: base.amountCents,
        };
      }

      if (key === 'clientsOpenProposals') {
        base.title = `Cliente ${(s % 70) + idx + 1}`;
        base.status = undefined;
        base.fields = {
          state: ['DF', 'GO', 'SP', 'PE', 'PR'][idx % 5],
          proposalsOpenCount: 1 + ((s + idx) % 4),
          proposalsOpenAmountCents: base.amountCents,
          hasActiveCampaign: idx % 3 !== 0,
        };
      }

      if (key === 'clientsInactiveRisk' || key === 'clientsWithoutRecentActivity' || key === 'clientsWithoutActiveCampaign') {
        base.title = `Cliente ${(s % 70) + idx + 1}`;
        base.amountCents = 50000 + ((s + idx * 777) % 800000);
        base.status = ['LOW', 'MEDIUM', 'HIGH'][idx % 3];
        base.fields = {
          state: ['DF', 'GO', 'SP', 'PE', 'PR'][idx % 5],
          daysWithoutActivity: 15 + idx * 7,
          hasActiveCampaign: idx % 3 !== 0,
          openProposalsCount: 1 + (idx % 3),
        };
      }

      if (key === 'clientsRegionDistribution') {
        base.title = ['Brasília / DF', 'Goiânia / GO', 'São Paulo / SP', 'Recife / PE', 'Curitiba / PR'][idx % 5];
        base.subtitle = ['Brasília', 'Goiânia', 'São Paulo', 'Recife', 'Curitiba'][idx % 5];
        base.status = undefined;
        base.fields = {
          state: ['DF', 'GO', 'SP', 'PE', 'PR'][idx % 5],
          clientsCount: 1 + ((s + idx) % 6),
          activeClientsCount: 1 + ((s + idx) % 4),
          openProposalsCount: idx % 4,
        };
      }

      if (key === 'clientsNew') {
        const created = new Date();
        created.setDate(created.getDate() - (idx % 30));
        base.title = `Cliente novo ${(s % 70) + idx + 1}`;
        base.status = 'ATIVO';
        base.fields = {
          state: ['DF', 'GO', 'SP', 'PE', 'PR'][idx % 5],
          createdAt: created.toISOString(),
          hasActiveCampaign: idx % 2 === 0,
          openProposalsCount: idx % 3,
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



      if (key === 'inventoryPin') {
        const pinId = opts?.params?.pinId || 'PIN';
        const starts = new Date();
        starts.setDate(starts.getDate() - ((idx % 20) + 1));
        const ends = new Date(starts);
        ends.setDate(ends.getDate() + ((idx % 40) + 7));

        base.title = `Ativo ${(s % 120) + idx + 1}`;
        base.subtitle = `Campanha ${(s % 60) + (idx % 20) + 1} • ${pinId}`;
        base.status = ['ATIVA', 'PAUSADA', 'AGENDADA'][idx % 3];
        base.fields = {
          region: opts?.params?.region,
          line: opts?.params?.line,
          startsAt: starts.toISOString(),
          endsAt: ends.toISOString(),
        };
      }

      if (key === 'inventoryRegionLine') {
        const occ = clamp(35 + ((s + idx * 7) % 60), 0, 100);
        base.title = `Ponto ${String.fromCharCode(65 + (idx % 26))}-${(s % 90) + idx + 1}`;
        base.status = undefined;
        base.subtitle = opts?.params?.region || base.subtitle;
        base.fields = {
          region: opts?.params?.region,
          line: opts?.params?.line,
          occupancyPercent: occ,
          activeCampaigns: (s + idx) % 6,
          revenueCents: base.amountCents,
        };
      }
      if (key === 'oohOps' || key === 'criticalCampaigns' || key === 'overdueInstallations' || key === 'missingCheckins') {
        const due = new Date();
        due.setDate(due.getDate() + ((idx % 12) - 3));
        base.title = `Campanha operacional ${(s % 40) + idx + 1}`;
        base.status = key === 'criticalCampaigns' ? ['HIGH', 'MEDIUM'][idx % 2] : key === 'overdueInstallations' ? 'HIGH' : key === 'missingCheckins' ? 'MEDIUM' : ['OK', 'PENDING', 'LATE'][idx % 3];
        base.amountCents = undefined;
        base.fields = {
          city: city,
          client: ['Atlas', 'Brisa', 'Croma', 'Delta', 'Eixo'][idx % 5],
          dueDate: due.toISOString(),
          campaignStatus: ['AGUARDANDO_MATERIAL', 'EM_INSTALACAO', 'ATIVA', 'EM_VEICULACAO'][idx % 4],
          missingCheckinsCount: key === 'overdueInstallations' ? 0 : 1 + (idx % 3),
          priority: key === 'oohOps' ? ['LOW', 'MEDIUM', 'HIGH'][idx % 3] : base.status,
          reason: key === 'overdueInstallations' ? 'Instalação vencida' : key === 'missingCheckins' ? 'Itens sem check-in' : key === 'criticalCampaigns' ? ['Check-in em atraso', 'Aguardando material'][idx % 2] : 'Operação em acompanhamento',
          overdue: key === 'overdueInstallations' || key === 'criticalCampaigns',
        };
      }

      if (key === 'operationsLateRegions') {
        base.title = ['Brasília', 'Goiânia', 'São Paulo', 'Recife', 'Curitiba'][idx % 5];
        base.subtitle = undefined;
        base.amountCents = undefined;
        base.status = idx % 2 === 0 ? 'ALTA' : 'MÉDIA';
        base.fields = {
          overdueCount: 1 + (idx % 5),
          overdueInstallationsCount: idx % 3,
          overdueCheckinsCount: 1 + (idx % 4),
          pendingCheckinsCount: idx % 4,
          awaitingMaterialCount: idx % 2,
          totalCriticalCount: 2 + (idx % 6),
        };
      }

      if (key === 'operationsCityStatus') {
        base.title = ['Brasília', 'Goiânia', 'São Paulo', 'Recife', 'Curitiba'][idx % 5];
        base.subtitle = undefined;
        base.amountCents = undefined;
        base.status = idx % 3 === 0 ? 'ATENÇÃO' : 'OK';
        base.fields = {
          totalCampaignsCount: 3 + (idx % 7),
          awaitingMaterialCount: idx % 3,
          installationCount: idx % 2,
          pendingCheckinsCount: idx % 4,
          overdueCheckinsCount: idx % 3,
          okCount: 1 + (idx % 5),
        };
      }

      if (key === 'doohSummary' || key === 'proofOfPlay') {
        const last = new Date();
        last.setMinutes(last.getMinutes() - ((idx % 180) + 5));
        base.title = `Tela ${(s % 300) + idx + 1}`;
        base.status = undefined;
        base.amountCents = undefined;
        const healthScorePercent = clamp(72 + ((s + idx * 9) % 28), 0, 100);
        const activeCampaignsCount = 1 + ((s + idx * 3) % 7);
        base.fields = {
          healthScorePercent,
          activeCampaignsCount,
          lastActivityAt: last.toISOString(),
          uptimePercent: healthScorePercent,
          plays: activeCampaignsCount,
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
      paging: {
        hasMore,
        nextCursor,
        totalCount: sorted.length,
        pageSize: limit,
        offset,
        sortBy,
        sortDir,
      },
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
    const states = ['DF', 'GO', 'SP', 'PE', 'PR'];
    const cities = city ? [city] : ['Brasília', 'Goiânia', 'São Paulo', 'Recife', 'Curitiba'];
    const types = filters.mediaType === 'ALL' ? ['OOH', 'DOOH'] : [filters.mediaType];
    const subcategories = ['Painel', 'Empena', 'Relógio', 'Totem', 'Outdoor'];
    const environments = ['Rua', 'Shopping', 'Terminal', 'Aeroporto'];

    const pins: InventoryMapPin[] = Array.from({ length: 18 }).map((_, i) => {
      const id = `MP-${(s % 9000) + 1000 + i}`;
      const occupancyPercent = clamp(28 + ((s + i * 13) % 64), 0, 100);
      const unitsCount = 1 + ((s + i * 11) % 4);
      const availableUnitsCount = Math.max(0, unitsCount - Math.round((occupancyPercent / 100) * unitsCount));
      const activeCampaigns = (s + i * 29) % 7;
      const revenueCents = 120000 + ((s + i * 997) % 1450000);
      const cityLabel = cities[i % cities.length];
      const state = states[i % states.length];
      const type = types[i % types.length];
      const subcategory = subcategories[i % subcategories.length];
      const environment = environments[i % environments.length];
      return {
        id,
        label: `Ponto ${String.fromCharCode(65 + (i % 26))}-${(s % 90) + i + 1}`,
        city: cityLabel,
        state,
        occupancyPercent,
        region: `${cityLabel} / ${state}`,
        line: subcategory,
        type,
        subcategory,
        environment,
        unitsCount,
        availableUnitsCount,
        activeCampaigns,
        revenueCents,
        lat: -15.78 + ((s + i * 5) % 240) / 1000,
        lng: -47.93 + ((s + i * 7) % 320) / 1000,
      };
    });

    const q = normalizeText(filters.query);
    const filtered = q
      ? pins.filter((p) => includesNormalized(`${p.id} ${p.label} ${p.city || ''} ${p.type || ''} ${p.subcategory || ''}`, q))
      : pins;

    return { pins: filtered };
  },

  fetchInventorySummary: (companyId: string, filters: DashboardFilters): DashboardInventorySummaryDTO => {
    const pins = mockApi.fetchInventoryMap(companyId, filters).pins;
    const totalUnits = pins.reduce((sum, pin) => sum + (pin.unitsCount || 0), 0);
    const totalAvailableUnits = pins.reduce((sum, pin) => sum + (pin.availableUnitsCount || 0), 0);
    const occupiedUnits = Math.max(0, totalUnits - totalAvailableUnits);
    const occupancyPercent = totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    const activeCitiesCount = new Set(pins.map((pin) => `${pin.city || ''}:${pin.state || ''}`).filter(Boolean)).size;
    return {
      totalPoints: pins.length,
      totalUnits,
      occupancyPercent,
      activeCitiesCount,
      pointsWithAvailabilityCount: pins.filter((pin) => (pin.availableUnitsCount || 0) > 0 || (pin.occupancyPercent || 0) < 100).length,
      activeCampaignsCount: pins.reduce((sum, pin) => sum + (pin.activeCampaigns || 0), 0),
    };
  },

  fetchInventoryRegionDistribution: (companyId: string, filters: DashboardFilters): DashboardInventoryRegionDistributionDTO => {
    const pins = mockApi.fetchInventoryMap(companyId, filters).pins;
    const grouped = new Map<string, InventoryRegionDistributionRow>();

    for (const pin of pins) {
      const key = pin.region || `${pin.city || 'Sem cidade'} / ${pin.state || '—'}`;
      const current = grouped.get(key) || {
        id: key,
        label: key,
        city: pin.city,
        state: pin.state,
        pointsCount: 0,
        unitsCount: 0,
        occupancyPercent: 0,
        availablePointsCount: 0,
        activeCampaigns: 0,
        revenueCents: 0,
      };
      current.pointsCount += 1;
      current.unitsCount += pin.unitsCount || 0;
      current.occupancyPercent += pin.occupancyPercent || 0;
      current.availablePointsCount += (pin.availableUnitsCount || 0) > 0 || (pin.occupancyPercent || 0) < 100 ? 1 : 0;
      current.activeCampaigns += pin.activeCampaigns || 0;
      current.revenueCents += pin.revenueCents || 0;
      grouped.set(key, current);
    }

    const rows = Array.from(grouped.values())
      .map((row) => ({ ...row, occupancyPercent: row.pointsCount ? Math.round(row.occupancyPercent / row.pointsCount) : 0 }))
      .sort((a, b) => {
        if (a.occupancyPercent !== b.occupancyPercent) return a.occupancyPercent - b.occupancyPercent;
        return b.pointsCount - a.pointsCount;
      });
    return { rows };
  },

  fetchInventoryTypeDistribution: (companyId: string, filters: DashboardFilters): DashboardInventoryTypeDistributionDTO => {
    const pins = mockApi.fetchInventoryMap(companyId, filters).pins;
    const grouped = new Map<string, InventoryCategoryDistributionRow>();
    for (const pin of pins) {
      const key = pin.type || 'OOH';
      const current = grouped.get(key) || {
        id: key,
        label: key,
        type: key,
        pointsCount: 0,
        unitsCount: 0,
        occupancyPercent: 0,
        activeCampaigns: 0,
        revenueCents: 0,
      };
      current.pointsCount += 1;
      current.unitsCount += pin.unitsCount || 0;
      current.occupancyPercent += pin.occupancyPercent || 0;
      current.activeCampaigns += pin.activeCampaigns || 0;
      current.revenueCents += pin.revenueCents || 0;
      grouped.set(key, current);
    }
    const rows = Array.from(grouped.values())
      .map((row) => ({ ...row, occupancyPercent: row.pointsCount ? Math.round(row.occupancyPercent / row.pointsCount) : 0 }))
      .sort((a, b) => b.pointsCount - a.pointsCount);
    return { rows };
  },

  fetchInventorySubtypeDistribution: (companyId: string, filters: DashboardFilters): DashboardInventorySubtypeDistributionDTO => {
    const pins = mockApi.fetchInventoryMap(companyId, filters).pins;
    const grouped = new Map<string, InventoryCategoryDistributionRow>();
    for (const pin of pins) {
      const label = [pin.subcategory, pin.environment].filter(Boolean).join(' • ') || pin.type || 'Inventário';
      const key = `${pin.subcategory || 'sem-subcategoria'}::${pin.environment || 'sem-ambiente'}`;
      const current = grouped.get(key) || {
        id: key,
        label,
        subcategory: pin.subcategory,
        environment: pin.environment,
        pointsCount: 0,
        unitsCount: 0,
        occupancyPercent: 0,
        activeCampaigns: 0,
        revenueCents: 0,
      };
      current.pointsCount += 1;
      current.unitsCount += pin.unitsCount || 0;
      current.occupancyPercent += pin.occupancyPercent || 0;
      current.activeCampaigns += pin.activeCampaigns || 0;
      current.revenueCents += pin.revenueCents || 0;
      grouped.set(key, current);
    }
    const rows = Array.from(grouped.values())
      .map((row) => ({ ...row, occupancyPercent: row.pointsCount ? Math.round(row.occupancyPercent / row.pointsCount) : 0 }))
      .sort((a, b) => b.pointsCount - a.pointsCount)
      .slice(0, 8);
    return { rows };
  },

  fetchInventoryOpportunitySummary: (companyId: string, filters: DashboardFilters): DashboardInventoryOpportunitySummaryDTO => {
    const pins = mockApi.fetchInventoryMap(companyId, filters).pins;
    const regionRows = mockApi.fetchInventoryRegionDistribution(companyId, filters).rows;
    const lowOcc = regionRows
      .filter((row) => row.occupancyPercent <= 45)
      .slice(0, 2)
      .map((row, index): InventoryOpportunityRow => ({
        id: `low-region:${row.id}`,
        kind: 'LOW_OCCUPANCY_REGION',
        severity: index === 0 ? 'HIGH' : 'MEDIUM',
        title: row.label,
        subtitle: `${row.availablePointsCount} ponto(s) com disponibilidade`,
        occupancyPercent: row.occupancyPercent,
        activeCampaigns: row.activeCampaigns,
        revenueCents: row.revenueCents,
        region: row.label,
      }));
    const premium = [...pins]
      .filter((pin) => (pin.availableUnitsCount || 0) > 0)
      .sort((a, b) => (a.occupancyPercent || 0) - (b.occupancyPercent || 0) || (a.revenueCents || 0) - (b.revenueCents || 0))
      .slice(0, 2)
      .map((pin, index): InventoryOpportunityRow => ({
        id: `premium:${pin.id}`,
        kind: 'PREMIUM_LOW_SALES',
        severity: index === 0 ? 'HIGH' : 'MEDIUM',
        title: pin.label,
        subtitle: `${pin.city || 'Sem cidade'} • ${pin.subcategory || pin.type || 'Inventário'}`,
        occupancyPercent: pin.occupancyPercent,
        activeCampaigns: pin.activeCampaigns,
        revenueCents: pin.revenueCents,
        pointId: pin.id,
        pointLabel: pin.label,
      }));
    const concentrated = [...regionRows]
      .sort((a, b) => b.activeCampaigns - a.activeCampaigns || b.revenueCents - a.revenueCents)
      .slice(0, 2)
      .map((row, index): InventoryOpportunityRow => ({
        id: `campaign-region:${row.id}`,
        kind: 'HIGH_CAMPAIGN_CONCENTRATION',
        severity: index === 0 ? 'MEDIUM' : 'LOW',
        title: row.label,
        subtitle: `${row.pointsCount} ponto(s) no recorte`,
        occupancyPercent: row.occupancyPercent,
        activeCampaigns: row.activeCampaigns,
        revenueCents: row.revenueCents,
        region: row.label,
      }));
    return { rows: [...lowOcc, ...premium, ...concentrated] };
  },

  fetchInventoryRanking: (companyId: string, filters: DashboardFilters): DashboardInventoryRankingDTO => {
    // BACKEND: GET /dashboard/inventory/ranking?...
    const pins = mockApi.fetchInventoryMap(companyId, filters).pins;
    const rows: InventoryRankingRow[] = pins.map((pin, i) => ({
      id: pin.id,
      label: pin.label,
      city: pin.city,
      state: pin.state,
      occupancyPercent: pin.occupancyPercent,
      activeCampaigns: pin.activeCampaigns || 0,
      revenueCents: pin.revenueCents || 0,
      type: pin.type,
      subcategory: pin.subcategory,
      environment: pin.environment,
      unitsCount: pin.unitsCount,
      availableUnitsCount: pin.availableUnitsCount,
    }));

    const q = normalizeText(filters.query);
    const filtered = q
      ? rows.filter((r) => includesNormalized(`${r.id} ${r.label} ${r.city || ''} ${r.type || ''} ${r.subcategory || ''}`, q))
      : rows;

    filtered.sort((a, b) => {
      if ((b.occupancyPercent ?? 0) !== (a.occupancyPercent ?? 0)) return (b.occupancyPercent ?? 0) - (a.occupancyPercent ?? 0);
      return (b.revenueCents ?? 0) - (a.revenueCents ?? 0);
    });

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

  fetchFinancialSummary: (companyId: string, filters: DashboardFilters): DashboardFinancialSummaryDTO => {
    const overview = mockApi.fetchOverviewKpis(companyId, filters);
    const topClients = mockApi.fetchTopClients(companyId, filters);
    const cashflow = mockApi.fetchCashflowTimeseries(companyId, filters);
    const lead = topClients.rows[0];
    const netCashflowCents = cashflow.points.reduce((sum, point) => sum + (point.valueCents || 0), 0);
    const averageBilledTicketCents = lead?.averageTicketCents || Math.max(0, Math.round(overview.revenueRecognizedCents / Math.max(1, topClients.rows.length || 1)));

    return {
      revenueRecognizedCents: overview.revenueRecognizedCents,
      receivablesOpenCents: overview.revenueToInvoiceCents + overview.receivablesOverdueCents,
      receivablesOverdueCents: overview.receivablesOverdueCents,
      netCashflowCents,
      averageBilledTicketCents,
      topClient: lead ? { id: lead.id, name: lead.name, city: lead.city, amountCents: lead.amountCents } : null,
    };
  },

  fetchReceivablesComposition: (companyId: string, filters: DashboardFilters): DashboardReceivablesCompositionDTO => {
    const financial = mockApi.fetchFinancialSummary(companyId, filters);
    const overdueCents = financial.receivablesOverdueCents;
    const openCents = Math.max(0, financial.receivablesOpenCents - overdueCents);
    return {
      receivedCents: financial.revenueRecognizedCents,
      openCents,
      overdueCents,
      totalCents: financial.revenueRecognizedCents + openCents + overdueCents,
    };
  },

  fetchCriticalInvoices: (companyId: string, filters: DashboardFilters): DashboardCriticalInvoicesDTO => {
    const s = seedNumber(`${companyId}:critical:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);
    const rows = Array.from({ length: 8 }).map((_, i) => {
      const due = new Date();
      due.setDate(due.getDate() + ((i % 4) - 3));
      const amountCents = 120000 + ((s + i * 131) % 1200000);
      const daysLate = Math.max(0, -((i % 4) - 3));
      return {
        id: `INV-CRIT-${i + 1}`,
        title: `Fatura crítica ${i + 1}`,
        client: `Cliente ${String.fromCharCode(65 + i)}`,
        city: filters.city || ['Brasília', 'Goiânia', 'São Paulo'][i % 3],
        dueDate: due.toISOString(),
        amountCents,
        daysLate,
        status: daysLate > 0 ? 'VENCIDA' : 'VENCE_EM_BREVE',
      };
    });
    return { rows };
  },

  fetchLateClients: (companyId: string, filters: DashboardFilters): DashboardLateClientsDTO => {
    const topClients = mockApi.fetchTopClients(companyId, filters);
    return {
      rows: topClients.rows.slice(0, 8).map((row, idx) => ({
        id: row.id,
        name: row.name,
        city: row.city,
        overdueInvoicesCount: 1 + (idx % 4),
        overdueAmountCents: Math.round(row.amountCents * (0.18 + (idx % 3) * 0.07)),
        maxDaysLate: 4 + idx * 3,
      })),
    };
  },

  fetchLargestOpenReceivables: (companyId: string, filters: DashboardFilters): DashboardLargestOpenReceivablesDTO => {
    const s = seedNumber(`${companyId}:open:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);
    return {
      rows: Array.from({ length: 8 }).map((_, i) => {
        const due = new Date();
        due.setDate(due.getDate() - (i + 1));
        return {
          id: `INV-OPEN-${i + 1}`,
          title: `Conta em aberto ${i + 1}`,
          client: `Cliente ${String.fromCharCode(65 + i)}`,
          city: filters.city || ['Brasília', 'Recife', 'Curitiba'][i % 3],
          dueDate: due.toISOString(),
          amountCents: 160000 + ((s + i * 173) % 1800000),
          daysLate: i + 1,
          status: 'VENCIDA',
        };
      }),
    };
  },

  fetchLargestExpenses: (companyId: string, filters: DashboardFilters): DashboardLargestExpensesDTO => {
    const s = seedNumber(`${companyId}:expenses:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);
    return {
      rows: Array.from({ length: 8 }).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i * 3);
        return {
          id: `EXP-${i + 1}`,
          description: ['Impressão', 'Instalação', 'Equipe', 'Tributos', 'Logística'][i % 5],
          partnerName: ['Parceiro A', 'Parceiro B', 'Fornecedor C'][i % 3],
          categoryName: ['Operação', 'Fiscal', 'Pessoas'][i % 3],
          date: date.toISOString(),
          amountCents: 90000 + ((s + i * 191) % 900000),
          flowType: ['DESPESA', 'IMPOSTO', 'PESSOAS'][i % 3],
        };
      }),
    };
  },



fetchClientsSummary: (companyId: string, filters: DashboardFilters): DashboardClientsSummaryDTO => {
  const topClients = mockApi.fetchTopClients(companyId, filters).rows;
  const lateClients = mockApi.fetchLateClients(companyId, filters).rows;
  const inactiveRisk = mockApi.fetchClientsInactiveRisk(companyId, filters).rows;
  const activeClientsCount = Math.max(1, topClients.length);
  const newClientsCount = Math.max(1, Math.min(6, Math.round(activeClientsCount * 0.25)));
  const revenueTotal = topClients.reduce((sum, row) => sum + row.amountCents, 0);
  const overdueTotal = lateClients.reduce((sum, row) => sum + row.overdueAmountCents, 0);
  return {
    activeClientsCount,
    newClientsCount,
    revenuePerClientCents: activeClientsCount ? Math.round(revenueTotal / activeClientsCount) : 0,
    overduePerClientCents: lateClients.length ? Math.round(overdueTotal / lateClients.length) : 0,
    averageTicketPerClientCents: activeClientsCount ? Math.round(revenueTotal / activeClientsCount) : 0,
    clientsWithoutRecentActivityCount: inactiveRisk.filter((row) => row.daysWithoutActivity > 30).length,
  };
},

fetchClientsTopCampaigns: (companyId: string, filters: DashboardFilters): DashboardClientsTopCampaignsDTO => {
  const topClients = mockApi.fetchTopClients(companyId, filters).rows;
  const rows: ClientTopCampaignRow[] = topClients.slice(0, 10).map((row, idx) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    state: ['DF', 'GO', 'SP', 'PE', 'PR'][idx % 5],
    campaignsCount: row.campaignsCount,
    activeCampaignsCount: Math.max(1, row.campaignsCount - (idx % 2)),
    revenueCents: row.amountCents,
  }));
  rows.sort((a, b) => (b.campaignsCount - a.campaignsCount) || (b.revenueCents - a.revenueCents));
  return { rows };
},

fetchClientsOpenProposals: (companyId: string, filters: DashboardFilters): DashboardClientsOpenProposalsDTO => {
  const topClients = mockApi.fetchTopClients(companyId, filters).rows;
  const rows: ClientOpenProposalRow[] = topClients.slice(0, 10).map((row, idx) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    state: ['DF', 'GO', 'SP', 'PE', 'PR'][idx % 5],
    proposalsOpenCount: 1 + (idx % 4),
    proposalsOpenAmountCents: Math.round(row.amountCents * (0.35 + (idx % 3) * 0.12)),
    hasActiveCampaign: idx % 3 !== 0,
  }));
  rows.sort((a, b) => (b.proposalsOpenAmountCents - a.proposalsOpenAmountCents) || (b.proposalsOpenCount - a.proposalsOpenCount));
  return { rows };
},

fetchClientsInactiveRisk: (companyId: string, filters: DashboardFilters): DashboardClientsInactiveRiskDTO => {
  const topClients = mockApi.fetchTopClients(companyId, filters).rows;
  const lateClients = mockApi.fetchLateClients(companyId, filters).rows;
  const rows: ClientInactiveRiskRow[] = topClients.slice(0, 10).map((row, idx) => {
    const daysWithoutActivity = 18 + idx * 11;
    const hasActiveCampaign = idx % 3 !== 0;
    const riskLevel: ClientInactiveRiskRow['riskLevel'] = !hasActiveCampaign && daysWithoutActivity >= 60 ? 'HIGH' : daysWithoutActivity >= 45 || !hasActiveCampaign ? 'MEDIUM' : 'LOW';
    const late = lateClients.find((item) => item.id === row.id);
    return {
      id: row.id,
      name: row.name,
      city: row.city,
      state: ['DF', 'GO', 'SP', 'PE', 'PR'][idx % 5],
      daysWithoutActivity,
      hasActiveCampaign,
      riskLevel,
      overdueAmountCents: late?.overdueAmountCents || 0,
      openProposalsCount: 1 + (idx % 3),
    };
  });
  rows.sort((a, b) => ({ HIGH: 3, MEDIUM: 2, LOW: 1 }[b.riskLevel] - { HIGH: 3, MEDIUM: 2, LOW: 1 }[a.riskLevel]) || (b.daysWithoutActivity - a.daysWithoutActivity));
  return { rows };
},

fetchClientsRegionDistribution: (companyId: string, filters: DashboardFilters): DashboardClientsRegionDistributionDTO => {
  const topClients = mockApi.fetchTopClients(companyId, filters).rows;
  const rowsMap = new Map<string, ClientRegionDistributionRow>();
  topClients.forEach((row, idx) => {
    const city = row.city || ['Brasília', 'Goiânia', 'São Paulo', 'Recife', 'Curitiba'][idx % 5];
    const state = ['DF', 'GO', 'SP', 'PE', 'PR'][idx % 5];
    const label = `${city} / ${state}`;
    const current = rowsMap.get(label) || {
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      label,
      city,
      state,
      clientsCount: 0,
      activeClientsCount: 0,
      openProposalsCount: 0,
      revenueCents: 0,
    };
    current.clientsCount += 1;
    current.activeClientsCount += idx % 4 === 0 ? 0 : 1;
    current.openProposalsCount += 1 + (idx % 2);
    current.revenueCents += row.amountCents;
    rowsMap.set(label, current);
  });
  return { rows: Array.from(rowsMap.values()).sort((a, b) => b.revenueCents - a.revenueCents) };
},

  fetchOohOpsSummary: (companyId: string, filters: DashboardFilters): DashboardOohOpsSummaryDTO => {
    // BACKEND: GET /dashboard/ooh/ops/summary?...
    const s = seedNumber(`${companyId}:oohops:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);
    const city = filters.city?.trim() || undefined;
    const cities = city ? [city] : ['Brasília', 'Goiânia', 'São Paulo', 'Recife', 'Curitiba'];
    const items: OohOpsItem[] = Array.from({ length: 12 }).map((_, i) => {
      const due = new Date();
      due.setDate(due.getDate() + ((s + i * 5) % 12) - 4);
      const bucket = i % 5;
      const awaitingMaterial = bucket === 0;
      const inInstallation = bucket === 1 || bucket === 4;
      const missingCheckinsCount = bucket === 2 ? 1 + ((s + i) % 3) : bucket === 3 ? 1 + ((s + i) % 2) : 0;
      const overdue = bucket === 3 || bucket === 4;
      const priority = overdue ? 'HIGH' : awaitingMaterial || inInstallation || missingCheckinsCount > 0 ? 'MEDIUM' : 'LOW';
      const status: OohOpsItem['status'] = overdue ? 'LATE' : priority === 'LOW' ? 'OK' : 'PENDING';
      const reason = bucket === 0 ? 'Aguardando material' : bucket === 1 ? 'Em instalação' : bucket === 2 ? 'Itens sem check-in' : bucket === 3 ? 'Check-in em atraso' : 'Instalação vencida';
      return {
        id: `OPS-${(s % 7000) + 1000 + i}`,
        title: `Campanha operacional ${(s % 90) + i + 1}`,
        status,
        city: cities[i % cities.length],
        client: ['Atlas', 'Brisa', 'Croma', 'Delta', 'Eixo'][i % 5],
        dueDate: due.toISOString(),
        campaignStatus: awaitingMaterial ? 'AGUARDANDO_MATERIAL' : inInstallation ? 'EM_INSTALACAO' : overdue ? 'ATIVA' : 'EM_VEICULACAO',
        missingCheckinsCount,
        priority,
        reason,
        awaitingMaterial,
        inInstallation,
        overdue,
      };
    });

    const q = normalizeText(filters.query);
    const filtered = q
      ? items.filter((it) => includesNormalized(`${it.id} ${it.title} ${it.city || ''} ${it.client || ''} ${it.reason || ''}`, q))
      : items;

    const rank = (it: OohOpsItem) => ((it.priority === 'HIGH' ? 2 : it.priority === 'MEDIUM' ? 1 : 0) * 10) + (it.status === 'LATE' ? 1 : 0);
    filtered.sort((a, b) => rank(b) - rank(a));

    return {
      items: filtered,
      summary: {
        campaignsActiveCount: filtered.length,
        awaitingMaterialCount: filtered.filter((item) => item.awaitingMaterial).length,
        installationCount: filtered.filter((item) => item.inInstallation).length,
        pendingCheckinsCount: filtered.filter((item) => (item.missingCheckinsCount || 0) > 0 && !item.overdue).length,
        overdueCheckinsCount: filtered.filter((item) => (item.missingCheckinsCount || 0) > 0 && !!item.overdue).length,
      },
    };
  },

  fetchOperationsLateRegions: (companyId: string, filters: DashboardFilters): DashboardOperationsLateRegionsDTO => {
    const items = mockApi.fetchOohOpsSummary(companyId, filters).items || [];
    const grouped = new Map<string, OperationsLateRegionRow>();
    for (const item of items) {
      if (item.priority === 'LOW') continue;
      const region = item.city || 'Sem cidade';
      const current = grouped.get(region) || {
        id: region,
        region,
        overdueCount: 0,
        overdueInstallationsCount: 0,
        overdueCheckinsCount: 0,
        pendingCheckinsCount: 0,
        awaitingMaterialCount: 0,
        totalCriticalCount: 0,
      };
      current.totalCriticalCount += 1;
      if (item.overdue) current.overdueCount += 1;
      if (item.inInstallation && item.overdue) current.overdueInstallationsCount += 1;
      if ((item.missingCheckinsCount || 0) > 0 && item.overdue) current.overdueCheckinsCount += 1;
      if ((item.missingCheckinsCount || 0) > 0 && !item.overdue) current.pendingCheckinsCount += 1;
      if (item.awaitingMaterial) current.awaitingMaterialCount += 1;
      grouped.set(region, current);
    }
    return {
      rows: Array.from(grouped.values()).sort((a, b) => {
        if (b.overdueCount !== a.overdueCount) return b.overdueCount - a.overdueCount;
        return b.totalCriticalCount - a.totalCriticalCount;
      }),
    };
  },

  fetchOperationsCityStatus: (companyId: string, filters: DashboardFilters): DashboardOperationsCityStatusDTO => {
    const items = mockApi.fetchOohOpsSummary(companyId, filters).items || [];
    const grouped = new Map<string, OperationsCityStatusRow>();
    for (const item of items) {
      const city = item.city || 'Sem cidade';
      const current = grouped.get(city) || {
        id: city,
        city,
        totalCampaignsCount: 0,
        awaitingMaterialCount: 0,
        installationCount: 0,
        pendingCheckinsCount: 0,
        overdueCheckinsCount: 0,
        okCount: 0,
      };
      current.totalCampaignsCount += 1;
      if (item.awaitingMaterial) current.awaitingMaterialCount += 1;
      if (item.inInstallation) current.installationCount += 1;
      if ((item.missingCheckinsCount || 0) > 0 && !item.overdue) current.pendingCheckinsCount += 1;
      if ((item.missingCheckinsCount || 0) > 0 && item.overdue) current.overdueCheckinsCount += 1;
      if (item.priority === 'LOW') current.okCount += 1;
      grouped.set(city, current);
    }
    return {
      rows: Array.from(grouped.values()).sort((a, b) => {
        const aPressure = a.awaitingMaterialCount + a.installationCount + a.pendingCheckinsCount + a.overdueCheckinsCount;
        const bPressure = b.awaitingMaterialCount + b.installationCount + b.pendingCheckinsCount + b.overdueCheckinsCount;
        if (bPressure !== aPressure) return bPressure - aPressure;
        return b.totalCampaignsCount - a.totalCampaignsCount;
      }),
    };
  },

  fetchDoohSummary: (companyId: string, filters: DashboardFilters): DashboardDoohSummaryDTO => {
    // BACKEND: GET /dashboard/dooh/summary?...
    // Resumo operacional DOOH: telas, campanhas vinculadas e atividade recente
    const s = seedNumber(`${companyId}:pop:${filters.datePreset}:${filters.query}:${filters.city}:${filters.mediaType}`);
    const city = filters.city?.trim() || undefined;

    const rows: DoohSummaryRow[] = Array.from({ length: 10 }).map((_, i) => {
      const id = `SCR-${(s % 9000) + 1000 + i}`;
      const healthScorePercent = clamp(88 + ((s + i * 9) % 15), 0, 100);
      const activeCampaignsCount = 1 + ((s + i * 7) % 6);
      const lastActivityAt = new Date();
      lastActivityAt.setMinutes(lastActivityAt.getMinutes() - ((s + i * 23) % 600));
      return {
        id,
        screen: `Tela ${String.fromCharCode(65 + (i % 26))}-${(s % 90) + i + 1}`,
        city: city || ['Brasília', 'Goiânia', 'São Paulo', 'Recife', 'Curitiba'][i % 5],
        healthScorePercent,
        activeCampaignsCount,
        lastActivityAt: lastActivityAt.toISOString(),
        uptimePercent: healthScorePercent,
        plays: activeCampaignsCount,
        lastSeen: lastActivityAt.toISOString(),
      };
    });

    const q = normalizeText(filters.query);
    const filtered = q
      ? rows.filter((r) => includesNormalized(`${r.id} ${r.screen} ${r.city || ''}`, q))
      : rows;

    filtered.sort((a, b) => (b.healthScorePercent ?? 0) - (a.healthScorePercent ?? 0));
    return {
      rows: filtered,
      summary: {
        screenCount: filtered.length,
        activeCampaignsCount: filtered.reduce((sum, row) => sum + (row.activeCampaignsCount || row.plays || 0), 0),
        healthScoreAvg: filtered.length
          ? Math.round(filtered.reduce((sum, row) => sum + (row.healthScorePercent || row.uptimePercent || 0), 0) / filtered.length)
          : 0,
        lowActivityCount: filtered.filter((row) => (row.healthScorePercent || row.uptimePercent || 0) < 80).length,
        offlineCount: filtered.filter((row) => (row.healthScorePercent || row.uptimePercent || 0) < 80).length,
      },
    };
  },

  fetchDoohProofOfPlaySummary: (companyId: string, filters: DashboardFilters): DashboardDoohSummaryDTO =>
    mockApi.fetchDoohSummary(companyId, filters),

  getPublicMapUrl: (companyId: string) => {
    // BACKEND: company.publicMapUrl (ou service de infra)
    const s = seedNumber(companyId);
    return `https://onemedia.app/public/map/${companyId}?t=${s % 100000}`;
  },
};
