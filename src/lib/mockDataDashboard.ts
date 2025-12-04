import {
  MediaPoint,
  Proposal,
  Campaign,
  Client,
  BillingInvoice,
  MediaType,
  ProposalStatus,
  CampaignStatus,
  ClientStatus,
  BillingStatus,
} from '../types';
import {
  mockMediaPoints,
  mockProposals,
  mockCampaigns,
  mockClients,
  mockBillingInvoices,
  CURRENT_COMPANY_ID,
} from './mockData';

// Re-exporta CURRENT_COMPANY_ID para uso no Dashboard
export { CURRENT_COMPANY_ID };

// ========================================
// INTERFACES
// ========================================

export interface DashboardSummary {
  inventory: {
    totalPoints: number;
    totalOOH: number;
    totalDOOH: number;
  };
  proposals: {
    total: number;
    approvalRatePercent: number; // 0–100, inteiro arredondado
  };
  campaigns: {
    activeCount: number;
    activeAmountCents: number;
  };
  clients: {
    activeCount: number;
    averageTicketCents: number;
  };
  financialSummary: {
    toInvoiceCents: number;
    dueNext7DaysCents: number;
    pendingPaymentCents: number;
    receivedThisMonthCents: number;
  };
  campaignStatusSummary: {
    activeCount: number;
    approvedThisMonthCount: number;
    awaitingMaterialCount: number;
  };
}

export interface BillingDashboardSummary {
  toInvoiceCents: number; // Campanhas a faturar
  dueNext7DaysCents: number; // A vencer (7 dias)
  pendingPaymentCents: number; // Aguardando pagamento
  receivedThisMonthCents: number; // Recebido no mês
}

// ========================================
// HELPERS DE DATA
// ========================================

/**
 * Verifica se uma data está dentro dos últimos N meses
 */
function isWithinLastMonths(date: Date, months: number): boolean {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  return date >= cutoff && date <= now;
}

/**
 * Verifica se uma data está no mês corrente
 */
function isCurrentMonth(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

/**
 * Verifica se uma data está entre hoje e daqui a N dias
 */
function isWithinNextDays(date: Date, days: number): boolean {
  const now = new Date();
  const future = new Date(now);
  future.setDate(future.getDate() + days);
  return date >= now && date <= future;
}

// ========================================
// CÁLCULO DE INVENTÁRIO
// ========================================

function getInventorySummary(companyId: string) {
  const points = mockMediaPoints.filter((p) => p.companyId === companyId);

  return {
    totalPoints: points.length,
    totalOOH: points.filter((p) => p.type === MediaType.OOH).length,
    totalDOOH: points.filter((p) => p.type === MediaType.DOOH).length,
  };
}

// ========================================
// CÁLCULO DE PROPOSTAS
// ========================================

function getProposalsSummary(companyId: string) {
  const proposals = mockProposals.filter((p) => p.companyId === companyId);
  const total = proposals.length;

  // Considera apenas propostas não rascunho para a taxa de aprovação
  const considered = proposals.filter(
    (p) => p.status !== ProposalStatus.RASCUNHO
  );
  const approved = considered.filter(
    (p) => p.status === ProposalStatus.APROVADA
  );

  const approvalRatePercent =
    considered.length === 0
      ? 0
      : Math.round((approved.length / considered.length) * 100);

  return {
    total,
    approvalRatePercent,
  };
}

// ========================================
// CÁLCULO DE CAMPANHAS ATIVAS
// ========================================

function getCampaignsSummary(companyId: string) {
  const campaigns = mockCampaigns.filter((c) => c.companyId === companyId);
  const today = new Date();

  // Campanhas ativas (em veiculação)
  const active = campaigns.filter((c) => {
    if (c.status !== CampaignStatus.ATIVA) return false;
    // Opcionalmente, verifica se está no período de veiculação
    if (c.startDate && c.endDate) {
      return c.startDate <= today && today <= c.endDate;
    }
    return true;
  });

  const activeCount = active.length;
  const activeAmountCents = active.reduce(
    (sum, c) => sum + (c.totalAmountCents ?? 0),
    0
  );

  return {
    activeCount,
    activeAmountCents,
  };
}

// ========================================
// CÁLCULO DE CLIENTES ATIVOS
// ========================================

function getClientsSummary(companyId: string) {
  // Clientes ativos
  const clients = mockClients.filter(
    (c) => c.companyId === companyId && c.status === ClientStatus.ATIVO
  );
  const activeCount = clients.length;
  const activeClientIds = new Set(clients.map((c) => c.id));

  // Ticket médio baseado em faturas pagas dos últimos 12 meses
  const invoices = mockBillingInvoices.filter((inv) => {
    if (inv.companyId !== companyId) return false;
    if (inv.status !== BillingStatus.PAGA) return false;
    if (!activeClientIds.has(inv.clientId)) return false;

    // Filtro de 12 meses
    const paidAt = inv.paidAt ?? inv.dueDate;
    return isWithinLastMonths(paidAt, 12);
  });

  // Helper para converter valor para centavos
  const getAmountCents = (inv: BillingInvoice) => {
    if (inv.amountCents !== undefined) return inv.amountCents;
    return (inv.amount ?? 0) * 100; // Converte reais para centavos
  };

  // Agrupa por cliente
  const byClient = new Map<string, number>();
  for (const inv of invoices) {
    const amount = getAmountCents(inv);
    byClient.set(inv.clientId, (byClient.get(inv.clientId) ?? 0) + amount);
  }

  const totals = Array.from(byClient.values());
  const averageTicketCents =
    totals.length === 0
      ? 0
      : Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);

  return {
    activeCount,
    averageTicketCents,
  };
}

// ========================================
// CÁLCULO DE RESUMO FINANCEIRO
// ========================================

function getFinancialSummary(companyId: string): BillingDashboardSummary {
  const invoices = mockBillingInvoices.filter(
    (inv) => inv.companyId === companyId
  );
  const today = new Date();

  // Helper para converter valor para centavos
  const getAmountCents = (inv: BillingInvoice) => {
    if (inv.amountCents !== undefined) return inv.amountCents;
    return (inv.amount ?? 0) * 100; // Converte reais para centavos
  };

  // Campanhas a faturar (faturas abertas com vencimento futuro ou a vencer)
  // Aqui consideramos faturas ABERTA como "a faturar"
  const toInvoiceCents = invoices
    .filter((inv) => inv.status === BillingStatus.ABERTA && inv.dueDate >= today)
    .reduce((sum, inv) => sum + getAmountCents(inv), 0);

  // A vencer nos próximos 7 dias (faturas abertas)
  const dueNext7DaysCents = invoices
    .filter(
      (inv) =>
        inv.status === BillingStatus.ABERTA && isWithinNextDays(inv.dueDate, 7)
    )
    .reduce((sum, inv) => sum + getAmountCents(inv), 0);

  // Aguardando pagamento (faturas enviadas ou vencidas que ainda não foram pagas)
  const pendingPaymentCents = invoices
    .filter(
      (inv) =>
        (inv.status === BillingStatus.ENVIADA ||
          inv.status === BillingStatus.VENCIDA) &&
        !inv.paidAt
    )
    .reduce((sum, inv) => sum + getAmountCents(inv), 0);

  // Recebido no mês corrente (faturas pagas este mês)
  const receivedThisMonthCents = invoices
    .filter((inv) => inv.status === BillingStatus.PAGA && inv.paidAt && isCurrentMonth(inv.paidAt))
    .reduce((sum, inv) => sum + getAmountCents(inv), 0);

  return {
    toInvoiceCents,
    dueNext7DaysCents,
    pendingPaymentCents,
    receivedThisMonthCents,
  };
}

// ========================================
// CÁLCULO DE STATUS DE CAMPANHAS
// ========================================

function getCampaignStatusSummary(companyId: string) {
  const campaigns = mockCampaigns.filter((c) => c.companyId === companyId);
  const today = new Date();

  // Campanhas ativas (em veiculação)
  const active = campaigns.filter((c) => {
    if (c.status !== CampaignStatus.ATIVA) return false;
    if (c.startDate && c.endDate) {
      return c.startDate <= today && today <= c.endDate;
    }
    return true;
  });
  const activeCount = active.length;

  // Aprovadas no mês corrente
  const approvedThisMonth = campaigns.filter((c) => {
    if (c.status !== CampaignStatus.APROVADA) return false;
    // Se não houver approvedAt, usa updatedAt
    const referenceDate = c.approvedAt ?? c.updatedAt;
    return isCurrentMonth(referenceDate);
  });
  const approvedThisMonthCount = approvedThisMonth.length;

  // Aguardando material
  const awaitingMaterial = campaigns.filter(
    (c) => c.status === CampaignStatus.AGUARDANDO_MATERIAL
  );
  const awaitingMaterialCount = awaitingMaterial.length;

  return {
    activeCount,
    approvedThisMonthCount,
    awaitingMaterialCount,
  };
}

// ========================================
// FUNÇÃO PRINCIPAL
// ========================================

/**
 * Retorna o resumo completo do Dashboard para a empresa
 */
export function getDashboardSummary(companyId: string): DashboardSummary {
  return {
    inventory: getInventorySummary(companyId),
    proposals: getProposalsSummary(companyId),
    campaigns: getCampaignsSummary(companyId),
    clients: getClientsSummary(companyId),
    financialSummary: getFinancialSummary(companyId),
    campaignStatusSummary: getCampaignStatusSummary(companyId),
  };
}

// ========================================
// FORMATAÇÃO DE MOEDA
// ========================================

/**
 * Formata valores em centavos para BRL
 * - Valores < 10.000 reais: formato completo (R$ 2.345)
 * - Valores >= 10.000: formato com 'k' (R$ 185k, R$ 8,5k)
 */
export function formatCurrency(centavos: number): string {
  const reais = centavos / 100;

  if (reais >= 10000) {
    const k = reais / 1000;
    // Se for inteiro ou tiver apenas uma casa decimal significativa
    if (k % 1 === 0) {
      return `R$ ${k.toFixed(0)}k`;
    }
    return `R$ ${k.toFixed(1).replace('.', ',')}k`;
  }

  return reais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Retorna a URL pública do mapa da empresa
 * TODO: Esta URL deverá vir do backend/Infra no futuro (ex: company.publicMapUrl)
 */
export function getPublicMapUrl(companyId: string): string {
  // Mock: URL fictícia baseada no slug da empresa
  // Em produção, seria algo como:
  // return `https://midia.oohmanager.com/${company.slug}/mapa`;
  
  // Por enquanto, retorna URL mock
  return `https://midia.oohmanager.com/demo-company/mapa`;
}
