import { DASHBOARD_BACKEND_ROUTES } from './constants';

export type ParityItem = {
  id: string;
  title: string;
  description: string;
  route: string;
  // Lista de campos mais importantes para conferir na resposta
  fields: string[];
  tolerance?: number; // tolerancia absoluta (0 = igual)
};

// Checklist de paridade (Etapa 16)
//
// Intencao: quando integrar o backend, conferimos se os numeros do dashboard batem
// com os relatorios / consultas existentes.
export const DASHBOARD_PARITY_CHECKLIST: ParityItem[] = [
  {
    id: 'overview-kpis',
    title: 'KPIs principais (Executivo)',
    description: 'Comparar os KPIs do topo com a fonte oficial (relatorios/queries do backend).',
    route: DASHBOARD_BACKEND_ROUTES.overview,
    fields: [
      'inventoryTotalPoints',
      'proposalsTotal',
      'approvalRatePercent',
      'campaignsActiveCount',
      'revenueTotal',
      'revenueMtd',
      'revenueYtd',
      'receivablesOpen',
    ],
    tolerance: 0,
  },
  {
    id: 'commercial-funnel',
    title: 'Funil Comercial',
    description: 'Conferir volumes por etapa e totals.',
    route: DASHBOARD_BACKEND_ROUTES.funnel,
    fields: ['stages[].count', 'stages[].value', 'totalCount', 'totalValue'],
    tolerance: 0,
  },
  {
    id: 'inventory-map',
    title: 'Inventario / Mapa (pins)',
    description: 'Conferir contagem de pontos, ocupacao e coordenadas (lat/lng).',
    route: DASHBOARD_BACKEND_ROUTES.inventoryMap,
    fields: ['pins[].id', 'pins[].lat', 'pins[].lng', 'pins[].occupancy', 'pins[].region', 'pins[].line'],
  },
  {
    id: 'inventory-ranking',
    title: 'Inventario / Ranking',
    description: 'Conferir top pontos por performance.',
    route: DASHBOARD_BACKEND_ROUTES.inventoryRanking,
    fields: ['rows[].id', 'rows[].name', 'rows[].occupancy', 'rows[].impressions'],
  },
  {
    id: 'finance-aging',
    title: 'Financeiro / Aging',
    description: 'Conferir buckets (faixas) e totals.',
    route: DASHBOARD_BACKEND_ROUTES.receivablesAgingSummary,
    fields: ['buckets[].label', 'buckets[].amount', 'totalOpen'],
  },
  {
    id: 'ops-proof-of-play',
    title: 'Operacoes / Proof of Play',
    description: 'Conferir eventos POP no periodo do filtro.',
    route: DASHBOARD_BACKEND_ROUTES.doohProofOfPlaySummary,
    fields: ['rows[].mediaId', 'rows[].plays', 'rows[].lastPlayedAt'],
  },
];

type ParityMarks = Record<string, boolean>;

const MARKS_KEY_PREFIX = 'oneMedia.dashboard.parity.marks.v1';

function marksKey(companyId?: string, userId?: string) {
  const c = (companyId || 'na').trim();
  const u = (userId || 'na').trim();
  return `${MARKS_KEY_PREFIX}:${c}:${u}`;
}

export function loadParityMarks(companyId?: string, userId?: string): ParityMarks {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(marksKey(companyId, userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ParityMarks;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveParityMarks(companyId: string | undefined, userId: string | undefined, marks: ParityMarks) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(marksKey(companyId, userId), JSON.stringify(marks));
  } catch {
    // ignore
  }
}

export function toggleParityMark(
  companyId: string | undefined,
  userId: string | undefined,
  marks: ParityMarks,
  itemId: string,
) {
  const next: ParityMarks = { ...marks, [itemId]: !marks[itemId] };
  saveParityMarks(companyId, userId, next);
  return next;
}

export function resetParityMarks(companyId: string | undefined, userId: string | undefined) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(marksKey(companyId, userId));
  } catch {
    // ignore
  }
}

export function parityChecklistToText() {
  return DASHBOARD_PARITY_CHECKLIST.map((it) => `- [ ] ${it.title}  (${it.route})\n  Campos: ${it.fields.join(', ')}`).join(
    '\n',
  );
}
