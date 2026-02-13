import { useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useNavigation } from '../contexts/NavigationContext';
import { ArrowLeft, Eye, RefreshCcw, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { MediaType } from '../types';
import { usePublicMediaKit } from '../hooks/usePublicMediaKit';
import { normalizeAvailability, normalizeMediaType, PublicMediaKitPoint } from '../lib/publicMediaKit';
import { getCartCount } from '../lib/menuCart';

function buildQuery(params: Record<string, string | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    const val = String(v ?? '').trim();
    if (val) sp.set(k, val);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

function formatCurrencyBRL(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function safeText(value?: string | null): string {
  return String(value ?? '').trim();
}

function getCartCountFromStorage(): number {
  try {
    return getCartCount();
  } catch {
    return 0;
  }
}

type StatusFilter = 'all' | 'Disponível' | 'Parcial' | 'Ocupado';
type TypeFilter = 'all' | MediaType;

export default function MenuPontos() {
  const navigate = useNavigation();
  const cartCount = useMemo(() => getCartCountFromStorage(), []);

  const { token, uf, city } = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return {
      token: sp.get('token') || sp.get('t') || '',
      uf: String(sp.get('uf') || '').trim().toUpperCase(),
      city: String(sp.get('city') || '').trim(),
    };
  }, []);

  const { data, loading, error, reload } = usePublicMediaKit({ token });

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    const points = data?.points ?? [];
    let list = points.filter((p) => {
      const pUf = safeText(p.addressState).toUpperCase();
      const pCity = safeText(p.addressCity);
      if (uf && pUf !== uf) return false;
      if (city && pCity !== city) return false;
      return true;
    });

    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((p) => {
        const text = [p.name, p.subcategory, p.environment, p.addressStreet, p.addressDistrict, p.addressCity]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return text.includes(query);
      });
    }

    if (typeFilter !== 'all') {
      list = list.filter((p) => normalizeMediaType(p.type) === typeFilter);
    }

    if (statusFilter !== 'all') {
      list = list.filter((p) => normalizeAvailability(p) === statusFilter);
    }

    return list.sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));
  }, [data?.points, uf, city, search, typeFilter, statusFilter]);

  const headerSubtitle = useMemo(() => {
    const parts = [uf ? `UF: ${uf}` : null, city ? `Cidade: ${city}` : null].filter(Boolean);
    return parts.join(' • ') || 'Selecione UF e cidade para ver os pontos.';
  }, [uf, city]);

  const onDetails = (point: PublicMediaKitPoint) => {
    if (!point?.id) {
      toast.error('Não foi possível abrir os detalhes deste ponto.');
      return;
    }
    navigate(`/menu/detalhe${buildQuery({ token, id: point.id, uf, city })}`);
  };

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          <div className="text-sm text-gray-600">UF → Cidade → Pontos</div>
          <div className="ml-auto flex items-center gap-2">
            {cartCount > 0 && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate(`/menu/carrinho${buildQuery({ token, uf, city })}`)}
              >
                <ShoppingCart className="h-4 w-4" />
                Ver carrinho ({cartCount})
              </Button>
            )}

            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => navigate(`/menu/cidades${buildQuery({ token, uf })}`)}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Pontos disponíveis</h1>
            <p className="mt-1 text-sm text-gray-600">{headerSubtitle}</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={reload} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, bairro, rua, categoria..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              value={typeFilter}
              onValueChange={(v: string) => {
                if (v === 'all') {
                  setTypeFilter('all');
                  return;
                }
                if (v === MediaType.OOH || v === MediaType.DOOH) {
                  setTypeFilter(v);
                  return;
                }
                setTypeFilter('all');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value={MediaType.OOH}>OOH</SelectItem>
                <SelectItem value={MediaType.DOOH}>DOOH</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(v: string) => {
                if (v === 'all') {
                  setStatusFilter('all');
                  return;
                }
                if (v === 'Disponível') {
                  setStatusFilter('Disponível');
                  return;
                }
                if (v === 'Parcial') {
                  setStatusFilter('Parcial');
                  return;
                }
                if (v === 'Ocupado') {
                  setStatusFilter('Ocupado');
                  return;
                }
                setStatusFilter('all');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Disponível">Disponível</SelectItem>
                <SelectItem value="Parcial">Parcial</SelectItem>
                <SelectItem value="Ocupado">Ocupado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <Card className="mt-5 border-amber-200 bg-amber-50">
            <CardContent className="py-4">
              <div className="text-sm font-semibold text-amber-900">Não foi possível carregar</div>
              <div className="mt-1 text-sm text-amber-800">{error}</div>
            </CardContent>
          </Card>
        )}

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {loading && filtered.length === 0
            ? Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx} className="animate-pulse">
                  <CardContent className="py-4">
                    <div className="flex gap-3">
                      <div className="h-24 w-32 rounded bg-gray-200" />
                      <div className="flex-1">
                        <div className="h-4 w-40 rounded bg-gray-200" />
                        <div className="mt-2 h-3 w-56 rounded bg-gray-200" />
                        <div className="mt-4 h-3 w-32 rounded bg-gray-200" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            : filtered.map((p) => {
                const availability = normalizeAvailability(p);
                const pType = normalizeMediaType(p.type) ?? (p.type as any);

                const address = [
                  [safeText(p.addressStreet), safeText(p.addressNumber)].filter(Boolean).join(', '),
                  safeText(p.addressDistrict),
                  [safeText(p.addressCity), safeText(p.addressState)].filter(Boolean).join(' - '),
                ]
                  .filter(Boolean)
                  .join(' • ');

                const faces = p.unitsCount ?? p.units?.length ?? undefined;
                const free = p.availableUnitsCount;
                const impressions = p.dailyImpressions;

                return (
                  <Card key={p.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="sm:w-40">
                          <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-100">
                            <ImageWithFallback
                              src={p.mainImageUrl || ''}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-base font-semibold text-gray-900 truncate">{p.name}</div>
                              {address && <div className="mt-1 text-xs text-gray-600 line-clamp-2">{address}</div>}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="secondary" className="rounded-full">{pType}</Badge>
                              <Badge
                                className={
                                  availability === 'Disponível'
                                    ? 'rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100'
                                    : availability === 'Parcial'
                                      ? 'rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100'
                                      : 'rounded-full bg-rose-100 text-rose-900 hover:bg-rose-100'
                                }
                              >
                                {availability}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-700">
                            <div>
                              <span className="text-gray-500">Mensal:</span>{' '}
                              <span className="font-semibold">{formatCurrencyBRL(p.basePriceMonth)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Semanal:</span>{' '}
                              <span className="font-semibold">{formatCurrencyBRL(p.basePriceWeek)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Faces/Telas:</span>{' '}
                              <span className="font-semibold">{faces ?? '—'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Livres:</span>{' '}
                              <span className="font-semibold">{free ?? '—'}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-500">Impacto/dia:</span>{' '}
                              <span className="font-semibold">{impressions ?? '—'}</span>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-col sm:flex-row gap-2">
                            <Button variant="outline" className="gap-2" onClick={() => onDetails(p)}>
                              <Eye className="h-4 w-4" />
                              Ver detalhes
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        {!loading && !error && filtered.length === 0 && (
          <div className="mt-6 text-sm text-gray-600">Nenhum ponto encontrado com os filtros atuais.</div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button onClick={() => navigate(`/menu/cidades${buildQuery({ token, uf })}`)} variant="outline">
            Trocar cidade
          </Button>
          <Button onClick={() => navigate(`/menu/uf${buildQuery({ token })}`)} variant="outline">
            Trocar UF
          </Button>
        </div>
      </div>
    </div>
  );
}
