export interface ReverseGeocodeAddress {
  addressZipcode?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressDistrict?: string;
  addressCity?: string;
  addressState?: string; // UF (ex: SP)
  addressCountry?: string;
}

const STATE_NAME_TO_UF: Record<string, string> = {
  'acre': 'AC',
  'alagoas': 'AL',
  'amapá': 'AP',
  'amapa': 'AP',
  'amazonas': 'AM',
  'bahia': 'BA',
  'ceará': 'CE',
  'ceara': 'CE',
  'distrito federal': 'DF',
  'espírito santo': 'ES',
  'espirito santo': 'ES',
  'goiás': 'GO',
  'goias': 'GO',
  'maranhão': 'MA',
  'maranhao': 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  'pará': 'PA',
  'para': 'PA',
  'paraíba': 'PB',
  'paraiba': 'PB',
  'paraná': 'PR',
  'parana': 'PR',
  'pernambuco': 'PE',
  'piauí': 'PI',
  'piaui': 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  'rondônia': 'RO',
  'rondonia': 'RO',
  'roraima': 'RR',
  'santa catarina': 'SC',
  'são paulo': 'SP',
  'sao paulo': 'SP',
  'sergipe': 'SE',
  'tocantins': 'TO',
};

function normKey(v?: string | null) {
  return String(v ?? '')
    .trim()
    .toLowerCase();
}

export function normalizeBrazilStateToUF(v?: string | null): string | undefined {
  const raw = String(v ?? '').trim();
  if (!raw) return undefined;

  const up = raw.toUpperCase();
  if (up.length === 2) return up;

  return STATE_NAME_TO_UF[normKey(raw)];
}

export async function reverseGeocodeOSM(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<ReverseGeocodeAddress | null> {
  // Nominatim (OpenStreetMap) — sem chave, best-effort.
  // Se falhar (CORS/rate-limit), retornamos null e a UI segue sem auto-preenchimento.
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(
    String(lat)
  )}&lon=${encodeURIComponent(String(lng))}&accept-language=pt-BR`;

  const res = await fetch(url, {
    method: 'GET',
    signal,
    headers: {
      // Alguns browsers/CDNs ignoram, mas ajuda quando disponível.
      'Accept': 'application/json',
    },
  });

  if (!res.ok) return null;
  const json: any = await res.json();
  const a = json?.address ?? {};

  const stateUf = normalizeBrazilStateToUF(a.state ?? a.state_code);

  const city =
    a.city ||
    a.town ||
    a.village ||
    a.municipality ||
    a.county ||
    a.city_district;

  const district = a.suburb || a.neighbourhood || a.neighborhood || a.city_district;
  const street = a.road || a.pedestrian || a.footway || a.residential;
  const number = a.house_number;
  const zipcode = a.postcode;
  const country = a.country || 'Brasil';

  const out: ReverseGeocodeAddress = {
    addressZipcode: zipcode ? String(zipcode) : undefined,
    addressStreet: street ? String(street) : undefined,
    addressNumber: number ? String(number) : undefined,
    addressDistrict: district ? String(district) : undefined,
    addressCity: city ? String(city) : undefined,
    addressState: stateUf,
    addressCountry: country ? String(country) : undefined,
  };

  // Se não veio nada útil, devolve null
  const hasAny = Object.values(out).some((v) => String(v ?? '').trim().length);
  return hasAny ? out : null;
}
