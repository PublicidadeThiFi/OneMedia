import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { MapPin, Search, Share2, Eye, Building, Copy } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';
import apiClient, { publicApiClient } from '../lib/apiClient';
import { MediaPoint, MediaType } from '../types';

type Availability = 'Disponível' | 'Ocupado';

type MediaKitPoint = MediaPoint & {
  unitsCount?: number;
  availability?: Availability;
};

type MediaKitCompany = {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  email: string | null;
  phone: string | null;
  site: string | null;
  addressCity: string | null;
  addressState: string | null;
};

type MediaKitResponse = {
  company: MediaKitCompany;
  points: MediaKitPoint[];
  stats: {
    pointsCount: number;
    totalUnits: number;
    totalImpressions: number;
    totalImpressionsFormatted: string;
  };
  generatedAt: string;
};

type MediaKitProps = {
  mode?: 'internal' | 'public';
  token?: string;
};

export function MediaKit({ mode = 'internal', token }: MediaKitProps) {
  // Estados para filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | MediaType>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Availability>('all');

  // Estado para modal de compartilhamento (apenas no modo internal)
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Data
  const [data, setData] = useState<MediaKitResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const allMediaKitPoints = useMemo(() => data?.points ?? [], [data?.points]);

  const company = data?.company ?? null;

  const loadMediaKit = async () => {
    try {
      setLoading(true);
      setLoadError(null);

      if (mode === 'public') {
        const safeToken = (token || '').trim();
        if (!safeToken) {
          setLoadError('Link inválido: token ausente.');
          setData(null);
          return;
        }

        const resp = await publicApiClient.get<MediaKitResponse>('/public/media-kit', {
          params: { token: safeToken },
        });
        setData(resp.data);
        return;
      }

      const resp = await apiClient.get<MediaKitResponse>('/media-kit');
      setData(resp.data);
    } catch (err: any) {
      const msg =
        err?.response?.status === 401
          ? 'Você não tem permissão para acessar este Mídia Kit.'
          : 'Não foi possível carregar o Mídia Kit.';
      setLoadError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMediaKit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, token]);

  // Gerar lista de cidades únicas
  const availableCities = useMemo(() => {
    const cities = new Set(allMediaKitPoints.map((p) => p.addressCity).filter(Boolean) as string[]);
    return Array.from(cities).sort();
  }, [allMediaKitPoints]);

  // Aplicar filtros
  const filteredPoints = useMemo(() => {
    let filtered = [...allMediaKitPoints];

    // Filtro de tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter((p) => p.type === typeFilter);
    }

    // Filtro de cidade
    if (cityFilter !== 'all') {
      filtered = filtered.filter((p) => p.addressCity === cityFilter);
    }

    // Filtro de status (disponibilidade)
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => (p.availability ?? 'Disponível') === statusFilter);
    }

    // Filtro de busca (texto livre)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => {
        return (
          p.name.toLowerCase().includes(query) ||
          p.addressCity?.toLowerCase().includes(query) ||
          p.addressStreet?.toLowerCase().includes(query) ||
          p.addressDistrict?.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [allMediaKitPoints, typeFilter, cityFilter, statusFilter, searchQuery]);

  // Calcular "Nossos Números"
  const stats = useMemo(() => {
    if (data?.stats) return data.stats;

    const pointsCount = allMediaKitPoints.length;
    const totalUnits = allMediaKitPoints.reduce((sum, p) => sum + (p.unitsCount ?? 0), 0);
    const totalImpressions = allMediaKitPoints.reduce((sum, p) => sum + (p.dailyImpressions || 0), 0);

    const formatImpressions = (value: number): string => {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M+`;
      }
      if (value >= 1000) {
        return `${Math.floor(value / 1000)}k+`;
      }
      return value.toString();
    };

    return {
      pointsCount,
      totalUnits,
      totalImpressions,
      totalImpressionsFormatted: formatImpressions(totalImpressions),
    };
  }, [data?.stats, allMediaKitPoints]);

  // Handler: Ver no Mapa
  const handleViewOnMap = (point: MediaPoint) => {
    if (point.latitude && point.longitude) {
      const url = `https://www.google.com/maps?q=${point.latitude},${point.longitude}`;
      window.open(url, '_blank');
    } else {
      toast.info('Coordenadas GPS não cadastradas para este ponto de mídia.');
    }
  };

  const copyToClipboardFallback = (text: string): boolean => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (_err) {
      return false;
    }
  };

  const ensureShareUrl = async () => {
    if (shareUrl) return shareUrl;

    try {
      const resp = await apiClient.get<{ token: string; expiresAt: string }>('/media-kit/share-link');
      const url = `${window.location.origin}/mk?token=${encodeURIComponent(resp.data.token)}`;
      setShareUrl(url);
      return url;
    } catch {
      toast.error('Não foi possível gerar o link público do Mídia Kit.');
      return '';
    }
  };

  // Handler: Compartilhar
  const handleShare = async () => {
    setShareDialogOpen(true);
    await ensureShareUrl();
  };

  // Handler: Copiar link
  const handleCopyLink = async () => {
    const url = await ensureShareUrl();
    if (!url) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          toast.success('Link do Mídia Kit copiado para a área de transferência!');
          setShareDialogOpen(false);
        })
        .catch(() => {
          const success = copyToClipboardFallback(url);
          if (success) {
            toast.success('Link do Mídia Kit copiado para a área de transferência!');
            setShareDialogOpen(false);
          } else {
            toast.info('Selecione e copie o link manualmente (Ctrl+C ou Cmd+C)');
          }
        });
    } else {
      const success = copyToClipboardFallback(url);
      if (success) {
        toast.success('Link do Mídia Kit copiado para a área de transferência!');
        setShareDialogOpen(false);
      } else {
        toast.info('Selecione e copie o link manualmente (Ctrl+C ou Cmd+C)');
      }
    }
  };

  const headerTitle = company?.name || 'Mídia Kit';
  const headerSubtitle =
    company?.addressCity || company?.addressState
      ? `${company?.addressCity ?? ''}${company?.addressState ? `, ${company.addressState}` : ''}`
      : '—';

  const contactPhone = company?.phone || '(11) 3000-0000';
  const contactEmail = company?.email || 'contato@oohmanager.com';
  const contactSite = company?.site || '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-indigo-600 rounded-lg flex items-center justify-center overflow-hidden">
                {company?.logoUrl ? (
                  <ImageWithFallback
                    src={company.logoUrl}
                    alt={company.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-gray-900">{headerTitle}</h1>
                <p className="text-gray-600">{headerSubtitle}</p>
              </div>
            </div>

            {mode === 'internal' && (
              <Button className="gap-2" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
                Compartilhar
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
        {loading ? (
          <Card className="mb-12">
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-gray-600">Carregando Mídia Kit…</p>
            </CardContent>
          </Card>
        ) : loadError ? (
          <Card className="mb-12">
            <CardContent className="pt-12 pb-12 text-center space-y-4">
              <p className="text-gray-600">{loadError}</p>
              <Button variant="outline" onClick={loadMediaKit}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats - Nossos Números */}
            <div className="mb-12">
              <h2 className="text-gray-900 mb-6">Nossos Números</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-gray-900 mb-1">{stats.pointsCount}</p>
                    <p className="text-gray-600 text-sm">Pontos de Mídia</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-gray-900 mb-1">{stats.totalUnits}</p>
                    <p className="text-gray-600 text-sm">Faces/Telas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-gray-900 mb-1">{stats.totalImpressionsFormatted}</p>
                    <p className="text-gray-600 text-sm">Impactos/Dia</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-gray-900 mb-1">Desde 2015</p>
                    <p className="text-gray-600 text-sm">No Mercado</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Filters */}
            <Card className="mb-8">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar por nome, cidade ou endereço..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <Select
                    value={typeFilter}
                    onValueChange={(value: string) => setTypeFilter(value as 'all' | MediaType)}
                  >
                    <SelectTrigger className="w-full lg:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value={MediaType.OOH}>OOH</SelectItem>
                      <SelectItem value={MediaType.DOOH}>DOOH</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={cityFilter} onValueChange={(value: string) => setCityFilter(value)}>
                    <SelectTrigger className="w-full lg:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as cidades</SelectItem>
                      {availableCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={statusFilter}
                    onValueChange={(value: string) => setStatusFilter(value as 'all' | Availability)}
                  >
                    <SelectTrigger className="w-full lg:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Disponível">Disponível</SelectItem>
                      <SelectItem value="Ocupado">Ocupado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Media Points Grid */}
            {filteredPoints.length === 0 ? (
              <Card className="mb-12">
                <CardContent className="pt-12 pb-12 text-center">
                  <p className="text-gray-500">Nenhum ponto de mídia encontrado com os filtros selecionados.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {filteredPoints.map((point) => {
                  const unitsCount = point.unitsCount ?? point.units?.length ?? 0;
                  const availability = (point.availability ?? 'Disponível') as Availability;

                  return (
                    <Card key={point.id} className="overflow-hidden hover:shadow-xl transition-shadow">
                      <div className="aspect-video bg-gray-100 relative">
                        <ImageWithFallback
                          src={
                            point.mainImageUrl ||
                            'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800'
                          }
                          alt={point.name}
                          className="w-full h-full object-cover"
                        />
                        <Badge
                          className={`absolute top-3 right-3 ${
                            availability === 'Disponível' ? 'bg-green-500' : 'bg-orange-500'
                          }`}
                        >
                          {availability}
                        </Badge>
                        <Badge className="absolute top-3 left-3 bg-indigo-500">{point.type}</Badge>
                      </div>

                      <CardContent className="pt-4">
                        <h3 className="text-gray-900 mb-3">{point.name}</h3>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>
                              {point.addressCity}, {point.addressState}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Faces/Telas</span>
                            <span className="text-gray-900">{unitsCount}</span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Impacto/Dia</span>
                            <span className="text-gray-900">
                              {point.dailyImpressions ? `${Math.floor(point.dailyImpressions / 1000)}k` : '—'}
                            </span>
                          </div>

                          {point.environment && (
                            <Badge variant="outline" className="text-xs">
                              {point.environment}
                            </Badge>
                          )}
                        </div>

                        {/* Preços */}
                        <div className="border-t border-gray-100 pt-4 mb-4">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-gray-600 text-xs mb-1">Diária</p>
                              <p className="text-gray-900 text-sm">
                                {point.basePriceDay != null ? `R$ ${point.basePriceDay}` : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600 text-xs mb-1">Semanal</p>
                              <p className="text-gray-900 text-sm">
                                {point.basePriceWeek != null ? `R$ ${(point.basePriceWeek / 1000).toFixed(1)}k` : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600 text-xs mb-1">Mensal</p>
                              <p className="text-gray-900 text-sm">
                                {point.basePriceMonth != null ? `R$ ${(point.basePriceMonth / 1000).toFixed(1)}k` : '—'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <Button variant="outline" className="w-full gap-2" onClick={() => handleViewOnMap(point)}>
                          <Eye className="w-4 h-4" />
                          Ver no Mapa
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Contact Section */}
            <Card className="bg-indigo-600 text-white">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <h2 className="text-white mb-4">Entre em Contato</h2>
                  <p className="text-indigo-100 mb-6">Interessado em algum ponto de mídia? Fale conosco!</p>
                  <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                    {contactPhone && (
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-100">📞</span>
                        <span>{contactPhone}</span>
                      </div>
                    )}
                    {contactEmail && (
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-100">📧</span>
                        <span>{contactEmail}</span>
                      </div>
                    )}
                    {contactSite && (
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-100">🌐</span>
                        <span>{contactSite}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Dialog de Compartilhamento (somente modo internal) */}
      {mode === 'internal' && (
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Compartilhar Mídia Kit</DialogTitle>
              <DialogDescription>Compartilhe o link público do Mídia Kit com seus clientes.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input readOnly value={shareUrl || 'Gerando link...'} className="flex-1" />
                <Button onClick={handleCopyLink} className="gap-2" disabled={!shareUrl}>
                  <Copy className="w-4 h-4" />
                  Copiar
                </Button>
              </div>

              <p className="text-sm text-gray-500">
                Este link permite que qualquer pessoa visualize seu portfólio de pontos de mídia.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
