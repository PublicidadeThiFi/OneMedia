import type { ReactNode } from 'react';
import type { Page } from '../App';
import type { DrilldownCellValue, DrilldownRow } from './types';
import { formatCell, getRowField } from './utils';

export type DrilldownSortDir = 'asc' | 'desc';

export type DrilldownColumnSpec = {
  id: string;
  label: string;
  align?: 'left' | 'right';
  sortable?: boolean;
  sortKey?: string;
  csv?: boolean;
  get: (row: DrilldownRow) => DrilldownCellValue;
  render?: (value: DrilldownCellValue, row: DrilldownRow) => ReactNode;
};

export type DrilldownKeySpec = {
  defaultSort?: { by: string; dir: DrilldownSortDir };
  columns: DrilldownColumnSpec[];
  rowAction?: { label: string; page: Page };
};

export function getDrilldownSpec(key?: string): DrilldownKeySpec {
  const commonMoney: DrilldownColumnSpec = {
    id: 'amountCents',
    label: 'Valor',
    align: 'right',
    sortable: true,
    sortKey: 'amountCents',
    get: (r) => r.amountCents,
    render: (v) => <span className="tabular-nums">{formatCell(v, 'currency')}</span>,
  };

  // NOTE: We'll build specs per key below; for unknown keys, show base columns.
  const base: DrilldownKeySpec = {
    defaultSort: { by: 'amountCents', dir: 'desc' },
    columns: [
      { id: 'id', label: 'ID', sortable: true, sortKey: 'id', get: (r) => r.id },
      { id: 'title', label: 'Item', sortable: true, sortKey: 'title', get: (r) => r.title },
      { id: 'subtitle', label: 'Cidade', sortable: true, sortKey: 'subtitle', get: (r) => r.subtitle },
      { id: 'status', label: 'Status', sortable: true, sortKey: 'status', get: (r) => r.status },
      commonMoney,
    ],
  };

  if (!key) return base;

  switch (key) {
    case 'topClients':
      return {
        defaultSort: { by: 'amountCents', dir: 'desc' },
        rowAction: { label: 'Abrir Comercial', page: 'proposals' },
        columns: [
          { id: 'title', label: 'Cliente', sortable: true, sortKey: 'title', get: (r) => r.title },
          {
            id: 'campaignsCount',
            label: 'Campanhas',
            align: 'right',
            sortable: true,
            sortKey: 'campaignsCount',
            get: (r) => getRowField(r, 'campaignsCount'),
            render: (v) => <span className="tabular-nums">{formatCell(v)}</span>,
          },
          commonMoney,
        ],
      };


case 'clientsTopCampaigns':
  return {
    defaultSort: { by: 'campaignsCount', dir: 'desc' },
    rowAction: { label: 'Abrir Clientes', page: 'clients' },
    columns: [
      { id: 'title', label: 'Cliente', sortable: true, sortKey: 'title', get: (r) => r.title },
      { id: 'subtitle', label: 'Cidade', sortable: true, sortKey: 'subtitle', get: (r) => r.subtitle },
      { id: 'state', label: 'UF', sortable: true, sortKey: 'state', get: (r) => getRowField(r, 'state') },
      { id: 'campaignsCount', label: 'Campanhas', align: 'right', sortable: true, sortKey: 'campaignsCount', get: (r) => getRowField(r, 'campaignsCount') },
      { id: 'activeCampaignsCount', label: 'Ativas', align: 'right', sortable: true, sortKey: 'activeCampaignsCount', get: (r) => getRowField(r, 'activeCampaignsCount') },
      { id: 'revenueCents', label: 'Receita', align: 'right', sortable: true, sortKey: 'revenueCents', get: (r) => getRowField(r, 'revenueCents') ?? r.amountCents, render: (v) => <span className="tabular-nums">{formatCell(v, 'currency')}</span> },
    ],
  };

case 'clientsOpenProposals':
  return {
    defaultSort: { by: 'proposalsOpenAmountCents', dir: 'desc' },
    rowAction: { label: 'Abrir Clientes', page: 'clients' },
    columns: [
      { id: 'title', label: 'Cliente', sortable: true, sortKey: 'title', get: (r) => r.title },
      { id: 'subtitle', label: 'Cidade', sortable: true, sortKey: 'subtitle', get: (r) => r.subtitle },
      { id: 'proposalsOpenCount', label: 'Propostas', align: 'right', sortable: true, sortKey: 'proposalsOpenCount', get: (r) => getRowField(r, 'proposalsOpenCount') },
      { id: 'hasActiveCampaign', label: 'Campanha ativa', sortable: true, sortKey: 'hasActiveCampaign', get: (r) => getRowField(r, 'hasActiveCampaign') },
      { id: 'proposalsOpenAmountCents', label: 'Pipeline', align: 'right', sortable: true, sortKey: 'proposalsOpenAmountCents', get: (r) => getRowField(r, 'proposalsOpenAmountCents') ?? r.amountCents, render: (v) => <span className="tabular-nums">{formatCell(v, 'currency')}</span> },
    ],
  };

case 'clientsInactiveRisk':
case 'clientsWithoutRecentActivity':
case 'clientsWithoutActiveCampaign':
  return {
    defaultSort: { by: 'daysWithoutActivity', dir: 'desc' },
    rowAction: { label: 'Abrir Clientes', page: 'clients' },
    columns: [
      { id: 'title', label: 'Cliente', sortable: true, sortKey: 'title', get: (r) => r.title },
      { id: 'subtitle', label: 'Cidade', sortable: true, sortKey: 'subtitle', get: (r) => r.subtitle },
      { id: 'status', label: 'Risco', sortable: true, sortKey: 'status', get: (r) => r.status },
      { id: 'daysWithoutActivity', label: 'Dias sem atividade', align: 'right', sortable: true, sortKey: 'daysWithoutActivity', get: (r) => getRowField(r, 'daysWithoutActivity') },
      { id: 'hasActiveCampaign', label: 'Campanha ativa', sortable: true, sortKey: 'hasActiveCampaign', get: (r) => getRowField(r, 'hasActiveCampaign') },
      commonMoney,
    ],
  };

case 'clientsRegionDistribution':
  return {
    defaultSort: { by: 'amountCents', dir: 'desc' },
    rowAction: { label: 'Abrir Clientes', page: 'clients' },
    columns: [
      { id: 'title', label: 'Região', sortable: true, sortKey: 'title', get: (r) => r.title },
      { id: 'clientsCount', label: 'Clientes', align: 'right', sortable: true, sortKey: 'clientsCount', get: (r) => getRowField(r, 'clientsCount') },
      { id: 'activeClientsCount', label: 'Ativos', align: 'right', sortable: true, sortKey: 'activeClientsCount', get: (r) => getRowField(r, 'activeClientsCount') },
      { id: 'openProposalsCount', label: 'Propostas abertas', align: 'right', sortable: true, sortKey: 'openProposalsCount', get: (r) => getRowField(r, 'openProposalsCount') },
      commonMoney,
    ],
  };

case 'clientsNew':
  return {
    defaultSort: { by: 'createdAt', dir: 'desc' },
    rowAction: { label: 'Abrir Clientes', page: 'clients' },
    columns: [
      { id: 'title', label: 'Cliente', sortable: true, sortKey: 'title', get: (r) => r.title },
      { id: 'subtitle', label: 'Cidade', sortable: true, sortKey: 'subtitle', get: (r) => r.subtitle },
      { id: 'status', label: 'Status', sortable: true, sortKey: 'status', get: (r) => r.status },
      { id: 'createdAt', label: 'Criação', sortable: true, sortKey: 'createdAt', get: (r) => getRowField(r, 'createdAt'), render: (v) => <span className="tabular-nums">{formatCell(v, 'date')}</span> },
      commonMoney,
    ],
  };

    case 'inventoryRanking':
      return {
        defaultSort: { by: 'occupancyPercent', dir: 'desc' },
        rowAction: { label: 'Abrir Inventário', page: 'inventory' },
        columns: [
          { id: 'title', label: 'Ponto', sortable: true, sortKey: 'title', get: (r) => r.title },
          { id: 'subtitle', label: 'Cidade', sortable: true, sortKey: 'subtitle', get: (r) => r.subtitle },
          {
            id: 'occupancyPercent',
            label: 'Ocupação',
            align: 'right',
            sortable: true,
            sortKey: 'occupancyPercent',
            get: (r) => getRowField(r, 'occupancyPercent'),
            render: (v) => <span className="tabular-nums">{formatCell(v, 'percent')}</span>,
          },
          {
            id: 'activeCampaigns',
            label: 'Campanhas',
            align: 'right',
            sortable: true,
            sortKey: 'activeCampaigns',
            get: (r) => getRowField(r, 'activeCampaigns'),
            render: (v) => <span className="tabular-nums">{formatCell(v)}</span>,
          },
          {
            id: 'revenueCents',
            label: 'Receita',
            align: 'right',
            sortable: true,
            sortKey: 'revenueCents',
            get: (r) => getRowField(r, 'revenueCents') ?? r.amountCents,
            render: (v) => <span className="tabular-nums">{formatCell(v, 'currency')}</span>,
          },
        ],
      };



    case 'inventoryPin':
      return {
        defaultSort: { by: 'endsAt', dir: 'desc' },
        rowAction: { label: 'Abrir Inventário', page: 'inventory' },
        columns: [
          { id: 'title', label: 'Ativo', sortable: true, sortKey: 'title', get: (r) => r.title },
          { id: 'subtitle', label: 'Campanha', sortable: true, sortKey: 'subtitle', get: (r) => r.subtitle },
          {
            id: 'region',
            label: 'Região',
            sortable: true,
            sortKey: 'region',
            get: (r) => getRowField(r, 'region'),
          },
          {
            id: 'line',
            label: 'Linha',
            sortable: true,
            sortKey: 'line',
            get: (r) => getRowField(r, 'line'),
          },
          {
            id: 'startsAt',
            label: 'Início',
            sortable: true,
            sortKey: 'startsAt',
            get: (r) => getRowField(r, 'startsAt'),
            render: (v) => <span className="tabular-nums">{formatCell(v, 'date')}</span>,
          },
          {
            id: 'endsAt',
            label: 'Fim',
            sortable: true,
            sortKey: 'endsAt',
            get: (r) => getRowField(r, 'endsAt'),
            render: (v) => <span className="tabular-nums">{formatCell(v, 'date')}</span>,
          },
          { id: 'status', label: 'Status', sortable: true, sortKey: 'status', get: (r) => r.status },
          commonMoney,
        ],
      };

    case 'inventoryRegionLine':
      return {
        defaultSort: { by: 'occupancyPercent', dir: 'desc' },
        rowAction: { label: 'Abrir Inventário', page: 'inventory' },
        columns: [
          { id: 'title', label: 'Ponto', sortable: true, sortKey: 'title', get: (r) => r.title },
          { id: 'subtitle', label: 'Cidade', sortable: true, sortKey: 'subtitle', get: (r) => r.subtitle },
          {
            id: 'region',
            label: 'Região',
            sortable: true,
            sortKey: 'region',
            get: (r) => getRowField(r, 'region'),
          },
          {
            id: 'line',
            label: 'Linha',
            sortable: true,
            sortKey: 'line',
            get: (r) => getRowField(r, 'line'),
          },
          {
            id: 'occupancyPercent',
            label: 'Ocupação',
            align: 'right',
            sortable: true,
            sortKey: 'occupancyPercent',
            get: (r) => getRowField(r, 'occupancyPercent'),
            render: (v) => <span className="tabular-nums">{formatCell(v, 'percent')}</span>,
          },
          {
            id: 'activeCampaigns',
            label: 'Campanhas',
            align: 'right',
            sortable: true,
            sortKey: 'activeCampaigns',
            get: (r) => getRowField(r, 'activeCampaigns'),
            render: (v) => <span className="tabular-nums">{formatCell(v)}</span>,
          },
          {
            id: 'revenueCents',
            label: 'Receita',
            align: 'right',
            sortable: true,
            sortKey: 'revenueCents',
            get: (r) => getRowField(r, 'revenueCents') ?? r.amountCents,
            render: (v) => <span className="tabular-nums">{formatCell(v, 'currency')}</span>,
          },
        ],
      };
    case 'inventoryRegionDistribution':
    case 'inventoryTypeDistribution':
    case 'inventorySubtypeDistribution':
      return {
        defaultSort: { by: 'occupancyPercent', dir: 'desc' },
        rowAction: { label: 'Abrir Inventário', page: 'inventory' },
        columns: [
          { id: 'title', label: 'Ponto', sortable: true, sortKey: 'title', get: (r) => r.title },
          { id: 'subtitle', label: 'Cidade', sortable: true, sortKey: 'subtitle', get: (r) => r.subtitle },
          {
            id: 'type',
            label: 'Tipo',
            sortable: true,
            sortKey: 'type',
            get: (r) => getRowField(r, 'type'),
          },
          {
            id: 'subcategory',
            label: 'Subcategoria',
            sortable: true,
            sortKey: 'subcategory',
            get: (r) => getRowField(r, 'subcategory'),
          },
          {
            id: 'occupancyPercent',
            label: 'Ocupação',
            align: 'right',
            sortable: true,
            sortKey: 'occupancyPercent',
            get: (r) => getRowField(r, 'occupancyPercent'),
            render: (v) => <span className="tabular-nums">{formatCell(v, 'percent')}</span>,
          },
          {
            id: 'activeCampaigns',
            label: 'Campanhas',
            align: 'right',
            sortable: true,
            sortKey: 'activeCampaigns',
            get: (r) => getRowField(r, 'activeCampaigns'),
            render: (v) => <span className="tabular-nums">{formatCell(v)}</span>,
          },
          {
            id: 'revenueCents',
            label: 'Receita',
            align: 'right',
            sortable: true,
            sortKey: 'revenueCents',
            get: (r) => getRowField(r, 'revenueCents') ?? r.amountCents,
            render: (v) => <span className="tabular-nums">{formatCell(v, 'currency')}</span>,
          },
        ],
      };
    case 'receivablesOpen':
    case 'receivablesOverdue':
    case 'criticalInvoices':
    case 'largestOpenReceivables':
      return {
        defaultSort: { by: 'dueDate', dir: 'asc' },
        rowAction: { label: 'Abrir Financeiro', page: 'financial' },
        columns: [
          { id: 'title', label: 'Fatura', sortable: true, sortKey: 'title', get: (r) => r.title },
          { id: 'subtitle', label: 'Cliente', sortable: true, sortKey: 'subtitle', get: (r) => r.subtitle },
          {
            id: 'dueDate',
            label: 'Vencimento',
            sortable: true,
            sortKey: 'dueDate',
            get: (r) => getRowField(r, 'dueDate'),
            render: (v) => <span className="tabular-nums">{formatCell(v, 'date')}</span>,
          },
          commonMoney,
        ],
      };

    case 'lateClients':
      return {
        defaultSort: { by: 'amountCents', dir: 'desc' },
        rowAction: { label: 'Abrir Financeiro', page: 'financial' },
        columns: [
          { id: 'title', label: 'Cliente', sortable: true, sortKey: 'title', get: (r) => r.title },
          { id: 'subtitle', label: 'Cidade', sortable: true, sortKey: 'subtitle', get: (r) => r.subtitle },
          {
            id: 'overdueInvoicesCount',
            label: 'Faturas',
            align: 'right',
            sortable: true,
            sortKey: 'overdueInvoicesCount',
            get: (r) => getRowField(r, 'overdueInvoicesCount'),
            render: (v) => <span className="tabular-nums">{formatCell(v)}</span>,
          },
          {
            id: 'maxDaysLate',
            label: 'Maior atraso',
            align: 'right',
            sortable: true,
            sortKey: 'maxDaysLate',
            get: (r) => getRowField(r, 'maxDaysLate'),
            render: (v) => <span className="tabular-nums">{formatCell(v)} dias</span>,
          },
          commonMoney,
        ],
      };

    case 'largestExpenses':
      return {
        defaultSort: { by: 'amountCents', dir: 'desc' },
        rowAction: { label: 'Abrir Financeiro', page: 'financial' },
        columns: [
          { id: 'title', label: 'Despesa', sortable: true, sortKey: 'title', get: (r) => r.title },
          { id: 'subtitle', label: 'Parceiro / categoria', sortable: true, sortKey: 'subtitle', get: (r) => r.subtitle },
          { id: 'status', label: 'Tipo', sortable: true, sortKey: 'status', get: (r) => r.status },
          {
            id: 'date',
            label: 'Data',
            sortable: true,
            sortKey: 'date',
            get: (r) => getRowField(r, 'date'),
            render: (v) => <span className="tabular-nums">{formatCell(v, 'date')}</span>,
          },
          commonMoney,
        ],
      };

    case 'proposalsOpen':
    case 'proposalsTotal':
      return {
        defaultSort: { by: 'amountCents', dir: 'desc' },
        rowAction: { label: 'Abrir Comercial', page: 'proposals' },
        columns: [
          { id: 'title', label: 'Proposta', sortable: true, sortKey: 'title', get: (r) => r.title },
          { id: 'subtitle', label: 'Cliente', sortable: true, sortKey: 'subtitle', get: (r) => r.subtitle },
          { id: 'status', label: 'Status', sortable: true, sortKey: 'status', get: (r) => r.status },
          {
            id: 'updatedAt',
            label: 'Atualizada em',
            sortable: true,
            sortKey: 'updatedAt',
            get: (r) => getRowField(r, 'updatedAt'),
            render: (v) => <span className="tabular-nums">{formatCell(v, 'datetime')}</span>,
          },
          commonMoney,
        ],
      };

    case 'oohOps':
    case 'criticalCampaigns':
    case 'overdueInstallations':
    case 'missingCheckins':
      return {
        defaultSort: { by: 'dueDate', dir: 'asc' },
        rowAction: { label: 'Abrir Campanhas', page: 'campaigns' },
        columns: [
          { id: 'title', label: 'Campanha', sortable: true, sortKey: 'title', get: (r) => r.title },
          {
            id: 'client',
            label: 'Cliente',
            sortable: true,
            sortKey: 'client',
            get: (r) => getRowField(r, 'client') ?? r.subtitle,
          },
          {
            id: 'city',
            label: 'Cidade',
            sortable: true,
            sortKey: 'city',
            get: (r) => getRowField(r, 'city') ?? r.subtitle,
          },
          {
            id: 'campaignStatus',
            label: 'Status da campanha',
            sortable: true,
            sortKey: 'campaignStatus',
            get: (r) => getRowField(r, 'campaignStatus') ?? r.status,
          },
          {
            id: 'reason',
            label: 'Motivo',
            sortable: true,
            sortKey: 'reason',
            get: (r) => getRowField(r, 'reason'),
          },
          {
            id: 'missingCheckinsCount',
            label: 'Itens sem check-in',
            align: 'right',
            sortable: true,
            sortKey: 'missingCheckinsCount',
            get: (r) => getRowField(r, 'missingCheckinsCount'),
            render: (v) => <span className="tabular-nums">{formatCell(v)}</span>,
          },
          {
            id: 'dueDate',
            label: 'Prazo',
            sortable: true,
            sortKey: 'dueDate',
            get: (r) => getRowField(r, 'dueDate'),
            render: (v) => <span className="tabular-nums">{formatCell(v, 'date')}</span>,
          },
        ],
      };

    case 'operationsLateRegions':
      return {
        defaultSort: { by: 'overdueCount', dir: 'desc' },
        rowAction: { label: 'Abrir Campanhas', page: 'campaigns' },
        columns: [
          { id: 'title', label: 'Região / cidade', sortable: true, sortKey: 'title', get: (r) => r.title },
          {
            id: 'overdueCount',
            label: 'Atrasos',
            align: 'right',
            sortable: true,
            sortKey: 'overdueCount',
            get: (r) => getRowField(r, 'overdueCount'),
            render: (v) => <span className="tabular-nums">{formatCell(v)}</span>,
          },
          {
            id: 'overdueInstallationsCount',
            label: 'Instalações vencidas',
            align: 'right',
            sortable: true,
            sortKey: 'overdueInstallationsCount',
            get: (r) => getRowField(r, 'overdueInstallationsCount'),
            render: (v) => <span className="tabular-nums">{formatCell(v)}</span>,
          },
          {
            id: 'overdueCheckinsCount',
            label: 'Check-ins em atraso',
            align: 'right',
            sortable: true,
            sortKey: 'overdueCheckinsCount',
            get: (r) => getRowField(r, 'overdueCheckinsCount'),
            render: (v) => <span className="tabular-nums">{formatCell(v)}</span>,
          },
          {
            id: 'totalCriticalCount',
            label: 'Total crítico',
            align: 'right',
            sortable: true,
            sortKey: 'totalCriticalCount',
            get: (r) => getRowField(r, 'totalCriticalCount'),
            render: (v) => <span className="tabular-nums">{formatCell(v)}</span>,
          },
        ],
      };

    case 'operationsCityStatus':
      return {
        defaultSort: { by: 'totalCampaignsCount', dir: 'desc' },
        rowAction: { label: 'Abrir Campanhas', page: 'campaigns' },
        columns: [
          { id: 'title', label: 'Cidade', sortable: true, sortKey: 'title', get: (r) => r.title },
          {
            id: 'totalCampaignsCount',
            label: 'Campanhas',
            align: 'right',
            sortable: true,
            sortKey: 'totalCampaignsCount',
            get: (r) => getRowField(r, 'totalCampaignsCount'),
            render: (v) => <span className="tabular-nums">{formatCell(v)}</span>,
          },
          {
            id: 'awaitingMaterialCount',
            label: 'Aguardando material',
            align: 'right',
            sortable: true,
            sortKey: 'awaitingMaterialCount',
            get: (r) => getRowField(r, 'awaitingMaterialCount'),
            render: (v) => <span className="tabular-nums">{formatCell(v)}</span>,
          },
          {
            id: 'installationCount',
            label: 'Em instalação',
            align: 'right',
            sortable: true,
            sortKey: 'installationCount',
            get: (r) => getRowField(r, 'installationCount'),
            render: (v) => <span className="tabular-nums">{formatCell(v)}</span>,
          },
          {
            id: 'pendingCheckinsCount',
            label: 'Check-in pendente',
            align: 'right',
            sortable: true,
            sortKey: 'pendingCheckinsCount',
            get: (r) => getRowField(r, 'pendingCheckinsCount'),
            render: (v) => <span className="tabular-nums">{formatCell(v)}</span>,
          },
          {
            id: 'overdueCheckinsCount',
            label: 'Check-in em atraso',
            align: 'right',
            sortable: true,
            sortKey: 'overdueCheckinsCount',
            get: (r) => getRowField(r, 'overdueCheckinsCount'),
            render: (v) => <span className="tabular-nums">{formatCell(v)}</span>,
          },
        ],
      };


    case 'doohSummary':
      return {
        defaultSort: { by: 'healthScorePercent', dir: 'asc' },
        rowAction: { label: 'Abrir Inventário', page: 'inventory' },
        columns: [
          { id: 'title', label: 'Tela', sortable: true, sortKey: 'title', get: (r) => r.title },
          { id: 'subtitle', label: 'Cidade', sortable: true, sortKey: 'subtitle', get: (r) => r.subtitle },
          {
            id: 'healthScorePercent',
            label: 'Saúde',
            align: 'right',
            sortable: true,
            sortKey: 'healthScorePercent',
            get: (r) => getRowField(r, 'healthScorePercent'),
            render: (v) => <span className="tabular-nums">{formatCell(v, 'percent')}</span>,
          },
          {
            id: 'activeCampaignsCount',
            label: 'Campanhas',
            align: 'right',
            sortable: true,
            sortKey: 'activeCampaignsCount',
            get: (r) => getRowField(r, 'activeCampaignsCount'),
            render: (v) => <span className="tabular-nums">{formatCell(v)}</span>,
          },
          {
            id: 'lastActivityAt',
            label: 'Última atividade',
            sortable: true,
            sortKey: 'lastActivityAt',
            get: (r) => getRowField(r, 'lastActivityAt'),
            render: (v) => <span className="tabular-nums">{formatCell(v, 'datetime')}</span>,
          },
        ],
      };

    case 'aging':
      return {
        defaultSort: { by: 'amountCents', dir: 'desc' },
        rowAction: { label: 'Abrir Financeiro', page: 'financial' },
        columns: [
          { id: 'title', label: 'Faixa', sortable: true, sortKey: 'title', get: (r) => r.title },
          commonMoney,
        ],
      };

    default:
      return base;
  }
}
