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

    case 'receivablesOverdue':
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

    case 'proofOfPlay':
      return {
        defaultSort: { by: 'uptimePercent', dir: 'desc' },
        rowAction: { label: 'Abrir Inventário', page: 'inventory' },
        columns: [
          { id: 'title', label: 'Tela', sortable: true, sortKey: 'title', get: (r) => r.title },
          { id: 'subtitle', label: 'Cidade', sortable: true, sortKey: 'subtitle', get: (r) => r.subtitle },
          {
            id: 'uptimePercent',
            label: 'Uptime',
            align: 'right',
            sortable: true,
            sortKey: 'uptimePercent',
            get: (r) => getRowField(r, 'uptimePercent'),
            render: (v) => <span className="tabular-nums">{formatCell(v, 'percent')}</span>,
          },
          {
            id: 'plays',
            label: 'Plays',
            align: 'right',
            sortable: true,
            sortKey: 'plays',
            get: (r) => getRowField(r, 'plays'),
            render: (v) => <span className="tabular-nums">{formatCell(v)}</span>,
          },
          {
            id: 'lastSeen',
            label: 'Última',
            sortable: true,
            sortKey: 'lastSeen',
            get: (r) => getRowField(r, 'lastSeen'),
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
