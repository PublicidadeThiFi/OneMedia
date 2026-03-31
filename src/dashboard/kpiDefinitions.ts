import type {
  DashboardKpiDefinition,
  DashboardKpiDefinitionKey,
  DashboardKpiDefinitionsDTO,
} from './contracts/kpis';

export type { DashboardKpiDefinition, DashboardKpiDefinitionKey, DashboardKpiDefinitionsDTO } from './contracts/kpis';

export const DASHBOARD_KPI_DEFINITION_VERSION = 'stage-1';
export const DASHBOARD_KPI_DEFINITION_UPDATED_AT = '2026-03-31T00:00:00.000Z';

export const DASHBOARD_KPI_DEFINITION_ORDER: DashboardKpiDefinitionKey[] = [
  'revenueRecognized',
  'revenueToInvoice',
  'occupancy',
  'receivablesOverdue',
  'averageCommercialTicket',
  'averageBilledTicket',
  'clientsActiveCount',
  'stalledProposals',
  'campaignsActiveCount',
];

export const DASHBOARD_KPI_DEFINITIONS: Record<DashboardKpiDefinitionKey, DashboardKpiDefinition> = {
  revenueRecognized: {
    key: 'revenueRecognized',
    label: 'Receita reconhecida',
    shortDescription: 'Valor já reconhecido financeiramente no período.',
    calculation:
      'Somar billing_invoices.amount das faturas com status PAGA, paidAt dentro do período filtrado e cancelledAt nulo.',
    filtersApplied:
      'O período usa paidAt como data-base. Cidade, busca e tipo de mídia entram quando a fatura está vinculada a cliente, proposta, campanha ou inventário relacionado.',
    primarySources: ['billing_invoices'],
    notes: [
      'Cash transactions podem complementar análise de caixa, mas não substituem a regra de receita reconhecida.',
      'A métrica deve usar um único critério por vez para evitar mistura entre venda, faturamento e caixa.',
    ],
  },
  revenueToInvoice: {
    key: 'revenueToInvoice',
    label: 'A faturar',
    shortDescription: 'Valor aprovado ou ativo ainda não convertido em faturamento realizado.',
    calculation:
      'Somar propostas APROVADA e campanhas em status operacional ativo que cruzam o período. Para cada proposta, subtrair somente billing_invoices já liquidadas (status PAGA, paidAt até o fim do recorte) vinculadas à mesma proposta ou campanha. O saldo mínimo por proposta é zero.',
    filtersApplied:
      'Respeita período, cidade, busca e tipo de mídia. A leitura é posicional no fim do período filtrado, sem misturar faturamento apenas emitido com faturamento efetivamente realizado.',
    primarySources: ['proposals', 'campaigns', 'billing_invoices'],
    notes: ['A faturar não deve ser confundido com receita reconhecida nem com contas a receber já emitidas.'],
  },
  occupancy: {
    key: 'occupancy',
    label: 'Ocupação',
    shortDescription: 'Percentual médio do inventário comprometido no recorte selecionado.',
    calculation:
      'Percentual de ocupação calculado por unit-days: soma dos dias ocupados por reservations CONFIRMADA e campaign_items válidos sobrepostos ao período, dividida pela soma dos dias disponíveis das media_units ativas elegíveis no mesmo intervalo.',
    filtersApplied:
      'Entra apenas inventário ativo e filtrado por cidade/tipo. Reservas canceladas e unidades inativas ficam fora. A janela temporal sempre precisa ser respeitada.',
    primarySources: ['media_units', 'reservations', 'campaign_items', 'campaigns'],
    notes: ['A definição é temporal; não basta contar faces ocupadas em um único instante.'],
  },
  receivablesOverdue: {
    key: 'receivablesOverdue',
    label: 'Inadimplência',
    shortDescription: 'Valor total de faturas vencidas e não liquidadas.',
    calculation:
      'Somar billing_invoices.amount com status VENCIDA, ou ABERTA com dueDate expirado, desde que paidAt e cancelledAt permaneçam nulos.',
    filtersApplied:
      'Usa dueDate como referência operacional e respeita os filtros globais compatíveis com cliente, campanha, proposta e inventário relacionado.',
    primarySources: ['billing_invoices'],
    notes: ['Representa risco financeiro já vencido, e não o total geral em aberto.'],
  },
  averageCommercialTicket: {
    key: 'averageCommercialTicket',
    label: 'Ticket médio comercial',
    shortDescription: 'Valor médio das propostas aprovadas no período.',
    calculation:
      'Somar proposals.totalAmount das propostas com status APROVADA e approvedAt dentro do período; dividir pela quantidade de propostas aprovadas no mesmo recorte.',
    filtersApplied:
      'Considera apenas aprovações dentro do recorte selecionado e respeita filtros globais de busca, cidade e tipo quando houver vínculo com itens de mídia.',
    primarySources: ['proposals', 'proposal_items'],
    notes: ['Não confundir com ticket médio faturado.'],
  },
  averageBilledTicket: {
    key: 'averageBilledTicket',
    label: 'Ticket médio faturado',
    shortDescription: 'Valor médio das faturas reconhecidas no período.',
    calculation:
      'Somar billing_invoices.amount das faturas com status PAGA e paidAt dentro do período; dividir pela quantidade de faturas reconhecidas no mesmo recorte.',
    filtersApplied:
      'Usa o mesmo recorte da receita reconhecida, respeitando filtros compatíveis com cliente, campanha, proposta e tipo de mídia quando houver vínculo.',
    primarySources: ['billing_invoices'],
    notes: ['Enquanto a base financeira estiver centrada em invoices, a unidade média é por documento faturado reconhecido.'],
  },
  clientsActiveCount: {
    key: 'clientsActiveCount',
    label: 'Clientes ativos',
    shortDescription: 'Clientes com atividade comercial, operacional ou financeira relevante no período.',
    calculation:
      'Contar clientes distintos que tenham ao menos uma proposta relevante (status ENVIADA ou APROVADA no período), campanha ativa cruzando o recorte ou faturamento realizado no período.',
    filtersApplied:
      'A contagem é deduplicada por clientId e respeita filtros globais aplicáveis.',
    primarySources: ['clients', 'proposals', 'campaigns', 'billing_invoices'],
    notes: ['A noção de proposta relevante pode evoluir no futuro, mas nesta etapa fica congelada em ENVIADA ou APROVADA.'],
  },
  stalledProposals: {
    key: 'stalledProposals',
    label: 'Proposta parada',
    shortDescription: 'Proposta em status negociável sem atualização recente.',
    calculation: 'Proposta com status ENVIADA e updatedAt sem alteração há 7 dias ou mais até o fim do recorte.',
    filtersApplied:
      'A lista respeita filtros globais, ordena por maior tempo sem atualização e usa o fim do período filtrado como referência de corte.',
    primarySources: ['proposals'],
    notes: ['O limiar inicial fica em 7 dias até existir SLA configurável por etapa.'],
  },
  campaignsActiveCount: {
    key: 'campaignsActiveCount',
    label: 'Campanha ativa',
    shortDescription: 'Campanhas válidas para o período e em status operacional ativo.',
    calculation:
      'Contar campanhas com status APROVADA, AGUARDANDO_MATERIAL, EM_INSTALACAO, ATIVA ou EM_VEICULACAO e com intervalo [startDate, endDate] cruzando o período filtrado.',
    filtersApplied:
      'Campanhas FINALIZADA ou CANCELADA ficam fora. A contagem respeita cidade, busca e tipo de mídia quando houver vínculo com campaign_items ou media_units.',
    primarySources: ['campaigns', 'campaign_items', 'media_units'],
    notes: ['Campanha ativa depende de período e status operacional real; mera existência do registro não basta.'],
  },
};

export const DASHBOARD_FALLBACK_KPI_DEFINITIONS_DTO: DashboardKpiDefinitionsDTO = {
  version: DASHBOARD_KPI_DEFINITION_VERSION,
  updatedAt: DASHBOARD_KPI_DEFINITION_UPDATED_AT,
  order: DASHBOARD_KPI_DEFINITION_ORDER,
  definitions: DASHBOARD_KPI_DEFINITIONS,
};

export function getDashboardKpiDefinition(key: DashboardKpiDefinitionKey) {
  return DASHBOARD_KPI_DEFINITIONS[key];
}

export function getDashboardKpiDefinitionsDto(): DashboardKpiDefinitionsDTO {
  return DASHBOARD_FALLBACK_KPI_DEFINITIONS_DTO;
}
