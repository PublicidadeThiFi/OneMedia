import { publicApiClient } from './apiClient';
import { MediaPoint, MediaType } from '../types';
import { normalizeMenuFlow } from './menuFlow';

export type Availability = 'Disponível' | 'Parcial' | 'Ocupado';

export type PublicMediaKitPoint = MediaPoint & {
  unitsCount?: number;
  occupiedUnitsCount?: number;
  availableUnitsCount?: number;
  availability?: Availability;
};

export type PublicMediaKitCompany = {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  email: string | null;
  phone: string | null;
  site: string | null;
  addressCity: string | null;
  addressState: string | null;
  // Markup (%) aplicado no fluxo público "Sou Agência"
  agencyMarkupPercent: number | null;
};

export type PublicMediaKitResponse = {
  ownerCompanies?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    site?: string | null;
    logoUrl?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    isPrimary: boolean;
  }[];
  selectedOwnerCompanyId?: string | null;
  company: PublicMediaKitCompany;
  points: PublicMediaKitPoint[];
  stats: {
    pointsCount: number;
    totalUnits: number;
    totalImpressions: number;
    totalImpressionsFormatted: string;
  };
  generatedAt: string;
};

type CacheEntry = {
  data: PublicMediaKitResponse;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<PublicMediaKitResponse>>();

function makeKey(token: string, ownerCompanyId: string | null, flow: string) {
  return `${token}::${ownerCompanyId ?? ''}::${flow}`;
}

// Cache leve para navegação UF -> Cidade -> Pontos ficar instantânea.
// TTL baixo (protótipo); em produção podemos evoluir.
const TTL_MS = 60 * 1000; // 1 minuto

export async function fetchPublicMediaKit(params: {
  token: string;
  ownerCompanyId?: string | null;
  flow?: string | null;
  force?: boolean;
}): Promise<PublicMediaKitResponse> {
  const token = String(params.token ?? '').trim();
  const ownerCompanyId = params.ownerCompanyId ?? null;
  const flow = normalizeMenuFlow(params.flow);

  if (!token) {
    throw new Error('Token ausente. Abra o Cardápio a partir do link compartilhado.');
  }

  const key = makeKey(token, ownerCompanyId, flow);
  const now = Date.now();
  const cached = cache.get(key);

  if (!params.force && cached && now - cached.fetchedAt < TTL_MS) {
    return cached.data;
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  // Alguns projetos tipam o client como IPromise (sem .finally).
  // Usamos async/await para garantir compatibilidade e sempre limpar o inflight.
  const p: Promise<PublicMediaKitResponse> = (async () => {
    try {
      const resp = await publicApiClient.get<PublicMediaKitResponse>('/public/media-kit', {
        params: {
          token,
          ownerCompanyId: ownerCompanyId || undefined,
          // Não envia flow quando é padrão (mantém compatibilidade e evita ruído na URL)
          flow: flow === 'default' ? undefined : flow,
        },
      });
      cache.set(key, { data: resp.data, fetchedAt: Date.now() });
      return resp.data;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

export function normalizeAvailability(point: PublicMediaKitPoint): Availability {
  const avail = point.availability;
  if (avail === 'Disponível' || avail === 'Parcial' || avail === 'Ocupado') return avail;

  const units = point.unitsCount ?? point.units?.length ?? 0;
  const occupied = point.occupiedUnitsCount ?? 0;
  const free = point.availableUnitsCount ?? Math.max(units - occupied, 0);

  if (units <= 0) return 'Disponível';
  if (free <= 0) return 'Ocupado';
  if (occupied > 0) return 'Parcial';
  return 'Disponível';
}

export function normalizeMediaType(value?: string | null): MediaType | null {
  const t = String(value ?? '').trim().toUpperCase();
  if (t === MediaType.OOH) return MediaType.OOH;
  if (t === MediaType.DOOH) return MediaType.DOOH;
  return null;
}
