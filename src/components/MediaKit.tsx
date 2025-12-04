import { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { MapPin, Search, Share2, Eye, Building, Copy } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';
import {
  getMediaPointsForMediaKit,
  getMediaUnitsForPoint,
  checkMediaPointAvailability,
  CURRENT_COMPANY_ID,
} from '../lib/mockData';
import { MediaPoint, MediaType } from '../types';

export function MediaKit() {
  // Estados para filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | MediaType>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Disponível' | 'Ocupado'>('all');
  
  // Estado para modal de compartilhamento
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Carregar pontos de mídia do Mídia Kit
  const allMediaKitPoints = useMemo(() => {
    return getMediaPointsForMediaKit(CURRENT_COMPANY_ID);
  }, []);

  // Gerar lista de cidades únicas
  const availableCities = useMemo(() => {
    const cities = new Set(allMediaKitPoints.map(p => p.addressCity).filter(Boolean));
    return Array.from(cities).sort();
  }, [allMediaKitPoints]);

  // Aplicar filtros
  const filteredPoints = useMemo(() => {
    let filtered = [...allMediaKitPoints];

    // Filtro de tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.type === typeFilter);
    }

    // Filtro de cidade
    if (cityFilter !== 'all') {
      filtered = filtered.filter(p => p.addressCity === cityFilter);
    }

    // Filtro de status (disponibilidade)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => {
        const availability = checkMediaPointAvailability(p.id);
        return availability === statusFilter;
      });
    }

    // Filtro de busca (texto livre)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
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
    const pointsCount = allMediaKitPoints.length;
    
    // Contar total de faces/telas
    let totalUnits = 0;
    allMediaKitPoints.forEach(point => {
      const units = getMediaUnitsForPoint(point.id);
      totalUnits += units.length;
    });

    // Somar impactos/dia
    const totalImpressions = allMediaKitPoints.reduce((sum, p) => {
      return sum + (p.dailyImpressions || 0);
    }, 0);

    // Formatar impactos (ex.: 355000 → 355k, 2500000 → 2.5M)
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
  }, [allMediaKitPoints]);

  // Handler: Ver no Mapa
  const handleViewOnMap = (point: MediaPoint) => {
    if (point.latitude && point.longitude) {
      const url = `https://www.google.com/maps?q=${point.latitude},${point.longitude}`;
      window.open(url, '_blank');
    } else {
      toast.info('Coordenadas GPS não cadastradas para este ponto de mídia.');
    }
    // TODO: substituir pelo mapa público da Infra quando estiver implementado
  };

  // Handler: Compartilhar
  const handleShare = () => {
    setShareDialogOpen(true);
  };

  // Handler: Copiar link
  const handleCopyLink = () => {
    // Mock de URL pública do Mídia Kit
    // TODO: URL real virá do backend/Infra no futuro
    const companySlug = 'demo-company'; // Derivar de company.name ou vir do backend
    const mediaKitUrl = `https://midia.oohmanager.com/${companySlug}/midia-kit`;

    // Fallback: criar elemento temporário para copiar
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
      } catch (err) {
        return false;
      }
    };

    // Tentar usar a API moderna primeiro, depois fallback
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(mediaKitUrl)
        .then(() => {
          toast.success('Link do Mídia Kit copiado para a área de transferência!');
          setShareDialogOpen(false);
        })
        .catch(() => {
          // Se a API moderna falhar, tentar fallback
          const success = copyToClipboardFallback(mediaKitUrl);
          if (success) {
            toast.success('Link do Mídia Kit copiado para a área de transferência!');
            setShareDialogOpen(false);
          } else {
            toast.info('Selecione e copie o link manualmente (Ctrl+C ou Cmd+C)');
          }
        });
    } else {
      // API moderna não disponível, usar fallback direto
      const success = copyToClipboardFallback(mediaKitUrl);
      if (success) {
        toast.success('Link do Mídia Kit copiado para a área de transferência!');
        setShareDialogOpen(false);
      } else {
        toast.info('Selecione e copie o link manualmente (Ctrl+C ou Cmd+C)');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Building className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-gray-900">OOH Manager</h1>
                <p className="text-gray-600">São Paulo, Brasil</p>
              </div>
            </div>
            
            <Button className="gap-2" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
              Compartilhar
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
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
                onValueChange={(value) => setTypeFilter(value as 'all' | MediaType)}
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
              
              <Select
                value={cityFilter}
                onValueChange={(value) => setCityFilter(value)}
              >
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as cidades</SelectItem>
                  {availableCities.map(city => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as 'all' | 'Disponível' | 'Ocupado')}
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
              const units = getMediaUnitsForPoint(point.id);
              const availability = checkMediaPointAvailability(point.id);

              return (
                <Card key={point.id} className="overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="aspect-video bg-gray-100 relative">
                    <ImageWithFallback
                      src={point.mainImageUrl || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800'}
                      alt={point.name}
                      className="w-full h-full object-cover"
                    />
                    <Badge 
                      className={`absolute top-3 right-3 ${
                        availability === 'Disponível' 
                          ? 'bg-green-500' 
                          : 'bg-orange-500'
                      }`}
                    >
                      {availability}
                    </Badge>
                    <Badge className="absolute top-3 left-3 bg-indigo-500">
                      {point.type}
                    </Badge>
                  </div>
                  
                  <CardContent className="pt-4">
                    <h3 className="text-gray-900 mb-3">{point.name}</h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{point.addressCity}, {point.addressState}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Faces/Telas</span>
                        <span className="text-gray-900">{units.length}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Impacto/Dia</span>
                        <span className="text-gray-900">
                          {point.dailyImpressions 
                            ? `${Math.floor(point.dailyImpressions / 1000)}k`
                            : '—'
                          }
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
                            {point.basePriceDay 
                              ? `R$ ${point.basePriceDay}`
                              : '—'
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-xs mb-1">Semanal</p>
                          <p className="text-gray-900 text-sm">
                            {point.basePriceWeek
                              ? `R$ ${(point.basePriceWeek / 1000).toFixed(1)}k`
                              : '—'
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-xs mb-1">Mensal</p>
                          <p className="text-gray-900 text-sm">
                            {point.basePriceMonth
                              ? `R$ ${(point.basePriceMonth / 1000).toFixed(1)}k`
                              : '—'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => handleViewOnMap(point)}
                    >
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
              <p className="text-indigo-100 mb-6">
                Interessado em algum ponto de mídia? Fale conosco!
              </p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-100">📞</span>
                  <span>(11) 3000-0000</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-100">📧</span>
                  <span>contato@oohmanager.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-100">💬</span>
                  <span>(11) 99999-9999</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Compartilhamento */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar Mídia Kit</DialogTitle>
            <DialogDescription>
              Compartilhe o link público do Mídia Kit com seus clientes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value="https://midia.oohmanager.com/demo-company/midia-kit"
                className="flex-1"
              />
              <Button onClick={handleCopyLink} className="gap-2">
                <Copy className="w-4 h-4" />
                Copiar
              </Button>
            </div>

            <p className="text-sm text-gray-500">
              Este link permite que qualquer pessoa visualize seu portfólio de pontos de mídia.
            </p>

            {/* TODO: URL real virá do backend/Infra quando implementado */}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}