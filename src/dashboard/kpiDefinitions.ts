export type DashboardKpiDefinitionKey =
  | 'revenueRecognized'
  | 'revenueToInvoice'
  | 'occupancy'
  | 'receivablesOverdue'
  | 'averageTicket'
  | 'clientsActiveCount'
  | 'stalledProposals'
  | 'campaignsActiveCount';

export type DashboardKpiDefinition = {
  key: DashboardKpiDefinitionKey;
  label: string;
  shortDescription: string;
  calculation: string;
  filtersApplied: string;
  primarySources: string[];
  notes?: string[];
};

export const DASHBOARD_KPI_DEFINITION_ORDER: DashboardKpiDefinitionKey[] = [
  'revenueRecognized',
  'revenueToInvoice',
  'occupancy',
  'receivablesOverdue',
  'averageTicket',
  'clientsActiveCount',
  'stalledProposals',
  'campaignsActiveCount',
];

export const DASHBOARD_KPI_DEFINITIONS: Record<DashboardKpiDefinitionKey, DashboardKpiDefinition> = {
  revenueRecognized: {
    key: 'revenueRecognized',
    label: 'Receita reconhecida',
    shortDescription: 'Faturas pagas no período, sem canceladas.',
    calculation:
      'Soma de billing_invoices.amount com status PAGA e paidAt dentro do período filtrado. Faturas canceladas não entram no cálculo.',
    filtersApplied:
      'Respeita período global pelo paidAt, além de cidade, busca e tipo de mídia quando houver vínculo com campanha, proposta, cliente ou inventário relacionado.',
    primarySources: ['billing_invoices'],
    notes: [
      'A métrica fica ancorada em faturamento efetivamente pago para evitar dupla contagem com cash_transactions.',
    ],
  },
  revenueToInvoice: {
    key: 'revenueToInvoice',
    label: 'A faturar',
    shortDescription: 'Saldo aprovado/ativo ainda sem fatura emitida.',
    calculation:
      'Para propostas aprovadas e campanhas em andamento, calcula-se o saldo remanescente como valor aprovado menos soma das billing_invoices já geradas para a mesma proposta/campanha. O resultado é limitado a zero quando o faturamento emitido já cobrir todo o valor.',
    filtersApplied:
      'Considera apenas propostas APROVADA e campanhas APROVADA, AGUARDANDO_MATERIAL, EM_INSTALACAO, ATIVA ou EM_VEICULACAO que cruzam o período filtrado.',
    primarySources: ['proposals', 'campaigns', 'billing_invoices'],
    notes: [
      'O objetivo é mostrar backlog comercial/operacional ainda não transformado em cobrança.',
    ],
  },
  occupancy: {
    key: 'occupancy',
    label: 'Ocupação',
    shortDescription: 'Dias ocupados ÷ dias disponíveis das unidades ativas.',
    calculation:
      'Percentual de ocupação calculado por unit-days: soma dos dias ocupados por reservations CONFIRMADA e campaign_items sobrepostos ao período, dividida pela soma dos dias disponíveis das media_units ativas elegíveis no mesmo intervalo.',
    filtersApplied:
      'Entra apenas inventário ativo e filtrado por cidade/tipo. Reservas canceladas e unidades inativas ficam fora.',
    primarySources: ['media_units', 'reservations', 'campaign_items', 'campaigns'],
    notes: [
      'A definição é temporal, e não apenas por quantidade de faces ocupadas em um único instante.',
    ],
  },
  receivablesOverdue: {
    key: 'receivablesOverdue',
    label: 'Inadimplência',
    shortDescription: 'Faturas em aberto com vencimento expirado.',
    calculation:
      'Soma de billing_invoices.amount com status VENCIDA ou status ABERTA cujo dueDate já passou e que ainda não possuem paidAt nem cancelledAt.',
    filtersApplied:
      'Usa a data de vencimento como referência operacional e respeita os filtros globais compatíveis com cliente, campanha e proposta.',
    primarySources: ['billing_invoices'],
    notes: ['A métrica representa contas vencidas ainda pendentes de recebimento.'],
  },
  averageTicket: {
    key: 'averageTicket',
    label: 'Ticket médio',
    shortDescription: 'Valor médio por proposta aprovada no período.',
    calculation:
      'Soma de proposals.totalAmount das propostas APROVADA dividida pela quantidade de propostas aprovadas no mesmo período. A data-base da aprovação é approvedAt.',
    filtersApplied:
      'Considera apenas aprovações que ocorreram dentro do recorte selecionado e respeita filtros globais de busca, cidade e tipo quando houver vínculo com itens de mídia.',
    primarySources: ['proposals', 'proposal_items'],
  },
  clientsActiveCount: {
    key: 'clientsActiveCount',
    label: 'Clientes ativos',
    shortDescription: 'Clientes com operação comercial ou faturamento vigente no período.',
    calculation:
      'Conta clientes distintos que tenham ao menos uma proposta APROVADA no período, campanha ativa/em andamento cruzando o período ou billing_invoice emitida/paga no período.',
    filtersApplied:
      'Deduplicação por clientId e respeito aos filtros globais aplicáveis.',
    primarySources: ['clients', 'proposals', 'campaigns', 'billing_invoices'],
  },
  stalledProposals: {
    key: 'stalledProposals',
    label: 'Proposta parada',
    shortDescription: 'Proposta enviada sem avanço recente.',
    calculation:
      'Proposta com status ENVIADA cujo updatedAt esteja há 7 dias ou mais sem alteração e que não tenha sido aprovada, reprovada ou expirada.',
    filtersApplied:
      'A lista respeita filtros globais e ordena por maior tempo sem atualização.',
    primarySources: ['proposals'],
  },
  campaignsActiveCount: {
    key: 'campaignsActiveCount',
    label: 'Campanha ativa',
    shortDescription: 'Campanhas operacionais que ainda demandam acompanhamento.',
    calculation:
      'Conta campanhas com status APROVADA, AGUARDANDO_MATERIAL, EM_INSTALACAO, ATIVA ou EM_VEICULACAO e com intervalo [startDate, endDate] cruzando o período filtrado.',
    filtersApplied:
      'Campanhas FINALIZADA ou CANCELADA ficam fora. A contagem respeita cidade, busca e tipo de mídia quando houver vínculo com campaign_items/media_units.',
    primarySources: ['campaigns', 'campaign_items', 'media_units'],
  },
};

export function getDashboardKpiDefinition(key: DashboardKpiDefinitionKey) {
  return DASHBOARD_KPI_DEFINITIONS[key];
}
