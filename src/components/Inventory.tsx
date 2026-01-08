import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Download, Upload, MapPin, Edit, Copy, MoreVertical, Layers, Building2, FileText, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Switch } from './ui/switch';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MediaPoint, MediaType } from '../types';
import { useMediaPoints } from '../hooks/useMediaPoints';
import { useMediaPointsMeta } from '../hooks/useMediaPointsMeta';
import { useCompany } from '../contexts/CompanyContext';
import apiClient from '../lib/apiClient';
import { toast } from 'sonner';
import { MediaPointFormDialog } from './inventory/MediaPointFormDialog';
import { MediaPointOwnersDialog } from './inventory/MediaPointOwnersDialog';
import { MediaPointContractsDialog } from './inventory/MediaPointContractsDialog';
import { MediaUnitsDialog } from './inventory/MediaUnitsDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

export function Inventory() {
  const { refreshPointsUsed } = useCompany();
  // Normaliza URLs antigas (absolutas) para caminho relativo em /uploads/...
  // Isso permite servir os arquivos via rewrite/proxy (ex.: Vercel) sem depender de HTTPS/porta no backend.
    const normalizeUploadsUrl = (value?: string | null) => {
    if (!value) return value ?? '';
    // ✅ valores antigos podem ter sido salvos como "uploads/..." (sem a barra inicial)
    if (value.startsWith('uploads/')) return `/${value}`;
    if (value.startsWith('/uploads/')) return value;
    const idx = value.indexOf('/uploads/');
    if (idx >= 0) return value.slice(idx);
    return value;
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 40;

  useEffect(() => {
    setPage(1);
  }, [searchQuery, typeFilter, cityFilter]);

  const { mediaPoints, total, loading, error, refetch, uploadMediaPointImage } = useMediaPoints({
    search: searchQuery || undefined,
    type: typeFilter === 'all' ? undefined : typeFilter,
    city: cityFilter === 'all' ? undefined : cityFilter,
    page,
    pageSize,
  });
  
  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / pageSize)), [total, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Dialogs state
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<MediaPoint | null>(null);
  const [ownersDialog, setOwnersDialog] = useState<{ open: boolean; point: MediaPoint | null }>({ 
    open: false, 
    point: null 
  });
  const [contractsDialog, setContractsDialog] = useState<{ open: boolean; point: MediaPoint | null }>({ 
    open: false, 
    point: null 
  });
  const [unitsDialog, setUnitsDialog] = useState<{ open: boolean; point: MediaPoint | null }>({ 
    open: false, 
    point: null 
  });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  // Computed values
  const { cities: citiesFromMeta } = useMediaPointsMeta();
  const cities = citiesFromMeta;

  const totalUnits = useMemo(() => {
    return mediaPoints.reduce((sum: number, p: MediaPoint) => sum + (p.units ? p.units.length : 0), 0);
  }, [mediaPoints]);

  // Server-side filters applied via hook; render current list
  const filteredPoints = mediaPoints;

  // Handlers
  const handleSavePoint = async (data: Partial<MediaPoint>, imageFile?: File | null) => {
    try {
      // Remove campos não aceitos/necessários pela API
      const { id, companyId, createdAt, updatedAt, units, owners, ...payload } = (data as any) || {};

      let saved: MediaPoint;
      if (editingPoint?.id) {
        const response = await apiClient.put<MediaPoint>(`/media-points/${editingPoint.id}`, payload);
        saved = response.data;
        toast.success('Ponto de mídia atualizado!');
      } else {
        const response = await apiClient.post<MediaPoint>('/media-points', payload);
        saved = response.data;
        toast.success('Ponto de mídia criado!');
      }

      if (imageFile && saved?.id) {
        try {
          await uploadMediaPointImage(saved.id, imageFile);
          toast.success('Imagem do ponto enviada!');
        } catch (e: any) {
          const message = e?.response?.data?.message || 'Erro ao enviar imagem do ponto';
          toast.error(message);
        }
      }

      setIsFormDialogOpen(false);
      setEditingPoint(null);
      refetch();
      // Mantém o valor de pontos usados sincronizado em Configurações (Sem precisar dar F5)
      await refreshPointsUsed();
      return saved;
    } catch (err: any) {
      const rawMessage = err?.response?.data?.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(', ')
        : rawMessage || 'Erro ao salvar ponto de mídia';
      toast.error(message);

      // Importante: propaga o erro para o dialog não fechar silenciosamente.
      throw new Error(message);
    }
  };

  const handleEditPoint = (point: MediaPoint) => {
    setEditingPoint(point);
    setIsFormDialogOpen(true);
  };

  const handleDuplicatePoint = async (point: MediaPoint) => {
    const payload: Partial<MediaPoint> = { ...point };
    delete (payload as any).id;
    payload.name = `${point.name} (cópia)`;
    try {
      const response = await apiClient.post<MediaPoint>('/media-points', payload);
      toast.success('Ponto duplicado!');
      refetch();
      await refreshPointsUsed();
      return response.data;
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Erro ao duplicar ponto';
      toast.error(message);
    }
  };

  const handleToggleMediaKit = async (pointId: string, newValue: boolean) => {
    try {
      await apiClient.put<MediaPoint>(`/media-points/${pointId}`, { showInMediaKit: newValue });
      refetch();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Erro ao atualizar mídia kit';
      toast.error(message);
    }
  };

  const handleDeleteMediaPoint = async (id: string) => {
    if (!confirm('Deseja realmente excluir este ponto de mídia?')) return;
    try {
      await apiClient.delete(`/media-points/${id}`);
      toast.success('Ponto de mídia excluído!');
      refetch();
      await refreshPointsUsed();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Erro ao excluir ponto de mídia';
      toast.error(message);
    }
  };

  const handleExportInventory = () => {
    // TODO: Implementar exportação real para CSV/XLSX
    const csvContent = [
      ['ID', 'Nome', 'Tipo', 'Subcategoria', 'Cidade', 'Estado', 'Impactos/Dia', 'Preço Mensal', 'Mídia Kit'].join(','),
      ...mediaPoints.map(p => [
        p.id,
        p.name,
        p.type,
        p.subcategory || '',
        p.addressCity || '',
        p.addressState || '',
        p.dailyImpressions || 0,
        p.basePriceMonth || 0,
        p.showInMediaKit ? 'Sim' : 'Não',
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventario_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getUnitStats = (point: MediaPoint) => {
    const units = point.units || [];
    const activeUnits = units.filter((u) => u.isActive);
    return {
      total: units.length,
      active: activeUnits.length,
    };
  };

  return (
    <div className="p-8">
      {loading && <div>Carregando inventário...</div>}
      {!loading && error && <div>Erro ao carregar inventário.</div>}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-gray-900 mb-2">Inventário</h1>
          <p className="text-gray-600">Gerencie pontos de mídia (MediaPoint) e unidades (MediaUnit)</p>
        </div>
        
        <Button 
          className="gap-2"
          onClick={() => {
            setEditingPoint(null);
            setIsFormDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Novo Ponto
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Total de Pontos</p>
            {/* Usa o total do backend (paginação), evitando travar em 50 quando pageSize=50 */}
            <p className="text-gray-900">{total}</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setTypeFilter(MediaType.OOH)}
        >
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Pontos OOH</p>
            <p className="text-gray-900">
              {mediaPoints.filter(p => p.type === MediaType.OOH).length}
            </p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setTypeFilter(MediaType.DOOH)}
        >
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Pontos DOOH</p>
            <p className="text-gray-900">
              {mediaPoints.filter(p => p.type === MediaType.DOOH).length}
            </p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Unidades (Faces/Telas)</p>
            <p className="text-gray-900">{totalUnits}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome, cidade, bairro ou subcategoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={typeFilter} onValueChange={(value: string) => setTypeFilter(value)}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value={MediaType.OOH}>OOH</SelectItem>
                <SelectItem value={MediaType.DOOH}>DOOH</SelectItem>
              </SelectContent>
            </Select>

            {cities.length > 0 && (
              <Select value={cityFilter} onValueChange={(value: string) => setCityFilter(value)}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Cidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as cidades</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setImportDialogOpen(true)}
            >
              <Upload className="w-4 h-4" />
              Importar
            </Button>
            
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleExportInventory}
            >
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      {searchQuery || typeFilter !== 'all' || cityFilter !== 'all' ? (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {total} {total === 1 ? 'ponto encontrado' : 'pontos encontrados'}
          </p>
        </div>
      ) : null}

      {/* Media Points Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPoints.map((point: MediaPoint) => {
          const unitStats = getUnitStats(point);
          const unitLabel = point.type === MediaType.OOH ? 'Faces' : 'Telas';

          return (
            <Card key={point.id} className="hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-gray-100 relative overflow-hidden rounded-t-xl">
                <ImageWithFallback
                  src={
                    normalizeUploadsUrl(point.mainImageUrl) ||
                    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800'
                  }
                  alt={point.name}
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-3 left-3 bg-indigo-500">
                  {point.type}
                </Badge>
                {point.subcategory && (
                  <Badge variant="outline" className="absolute top-3 right-3 bg-white">
                    {point.subcategory}
                  </Badge>
                )}
              </div>
              
              <CardContent className="pt-4">
                <h3 className="text-gray-900 mb-3">{point.name}</h3>
                
                <div className="space-y-2 mb-4">
                  {point.addressCity && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {point.addressDistrict && `${point.addressDistrict}, `}
                        {point.addressCity}{point.addressState && ` - ${point.addressState}`}
                      </span>
                    </div>
                  )}
                  
                  {point.units && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{unitLabel}</span>
                      <span className="text-gray-900">
                        {unitStats.active} / {unitStats.total} ativas
                      </span>
                    </div>
                  )}
                  
                  {point.dailyImpressions && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Impactos/dia</span>
                      <span className="text-gray-900">
                        {(point.dailyImpressions / 1000).toFixed(0)}k
                      </span>
                    </div>
                  )}
                  
                  {point.basePriceMonth && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Preço base</span>
                      <span className="text-gray-900">
                        R$ {point.basePriceMonth.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}

                  {point.environment && (
                    <Badge variant="outline" className="text-xs">
                      {point.environment}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={point.showInMediaKit}
                      onCheckedChange={(checked: boolean) => handleToggleMediaKit(point.id, checked)}
                    />
                    <span className="text-sm text-gray-600">Mídia Kit</span>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditPoint(point)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar ponto
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setUnitsDialog({ open: true, point })}>
                        <Layers className="w-4 h-4 mr-2" />
                        Gerenciar unidades ({unitLabel.toLowerCase()})
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setOwnersDialog({ open: true, point })}>
                        <Building2 className="w-4 h-4 mr-2" />
                        Proprietários / Empresas vinculadas
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setContractsDialog({ open: true, point })}>
                        <FileText className="w-4 h-4 mr-2" />
                        Contratos do ponto
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicatePoint(point)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicar ponto
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteMediaPoint(point.id)}>
                        <X className="w-4 h-4 mr-2" />
                        Excluir ponto
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

{totalPages > 1 && filteredPoints.length > 0 && (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6">
    <p className="text-sm text-gray-600">
      Página {page} de {totalPages} • Mostrando {filteredPoints.length} de {total}
    </p>
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
      >
        Anterior
      </Button>

      {(() => {
        const items: Array<number | '...'> = [];
        if (totalPages <= 7) {
          for (let i = 1; i <= totalPages; i++) items.push(i);
        } else {
          items.push(1);
          if (page > 3) items.push('...');
          const start = Math.max(2, page - 1);
          const end = Math.min(totalPages - 1, page + 1);
          for (let i = start; i <= end; i++) items.push(i);
          if (page < totalPages - 2) items.push('...');
          items.push(totalPages);
        }

        return items.map((it, idx) => {
          if (it === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">
                …
              </span>
            );
          }
          const n = it as number;
          return (
            <Button
              key={n}
              variant={n === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPage(n)}
            >
              {n}
            </Button>
          );
        });
      })()}

      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
      >
        Próxima
      </Button>
    </div>
  </div>
)}

      {filteredPoints.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">
              Nenhum ponto encontrado com os filtros selecionados
            </p>
            <Button 
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setCityFilter('all');
              }}
            >
              Limpar Filtros
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <MediaPointFormDialog
        open={isFormDialogOpen}
        onOpenChange={(open) => {
          setIsFormDialogOpen(open);
          if (!open) setEditingPoint(null);
        }}
        mediaPoint={editingPoint}
        onSave={handleSavePoint}
      />

      {ownersDialog.point && (
        <MediaPointOwnersDialog
          open={ownersDialog.open}
          onOpenChange={(open) => setOwnersDialog({ open, point: open ? ownersDialog.point : null })}
          mediaPointId={ownersDialog.point.id}
          mediaPointName={ownersDialog.point.name}
        />
      )}

      {contractsDialog.point && (
        <MediaPointContractsDialog
          open={contractsDialog.open}
          onOpenChange={(open) => setContractsDialog({ open, point: open ? contractsDialog.point : null })}
          mediaPointId={contractsDialog.point.id}
          mediaPointName={contractsDialog.point.name}
        />
      )}

      {unitsDialog.point && (
        <MediaUnitsDialog
          open={unitsDialog.open}
          onOpenChange={(open) => setUnitsDialog({ open, point: open ? unitsDialog.point : null })}
          mediaPointId={unitsDialog.point.id}
          mediaPointName={unitsDialog.point.name}
          mediaPointType={unitsDialog.point.type}
        />
      )}

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImported={async () => {
          setPage(1);
          refetch();
          await refreshPointsUsed();
        }}
      />
    </div>
  );
}

// Import Dialog Component
interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void | Promise<void>;
}

function ImportDialog({ open, onOpenChange, onImported }: ImportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<MediaType>(MediaType.OOH);
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [isBusy, setIsBusy] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const reset = () => {
    setSelectedFile(null);
    setImportErrors([]);
    setIsBusy(false);
    setImportType(MediaType.OOH);
    setFormat('xlsx');
  };

  // Reseta o estado interno sempre que fechar
  useEffect(() => {
    if (!open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const downloadTemplate = async (type: MediaType, fmt: 'xlsx' | 'csv') => {
    try {
      setIsBusy(true);
      const res = await apiClient.get<Blob>('/media-points/import-template', {
        params: { type, format: fmt },
        responseType: 'blob',
      });

      const blobUrl = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `template_inventario_${String(type).toLowerCase()}.${fmt}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);

      toast.success('Modelo baixado!');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Erro ao baixar modelo';
      toast.error(msg);
    } finally {
      setIsBusy(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo .xlsx ou .csv');
      return;
    }

    const name = selectedFile.name.toLowerCase();
    const isCsv = name.endsWith('.csv');
    const isXlsx = name.endsWith('.xlsx');
    if (!isCsv && !isXlsx) {
      toast.error('Formato inválido. Envie um arquivo .xlsx ou .csv');
      return;
    }

    // Segurança básica de tamanho (failsafe no front; backend também valida)
    const maxBytes = 10 * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      toast.error('Arquivo muito grande (máx. 10MB).');
      return;
    }

    setIsBusy(true);
    setImportErrors([]);

    try {
      const form = new FormData();
      form.append('file', selectedFile);

      const res = await apiClient.post<{ created: number; skipped?: number }>(
        '/media-points/import',
        form,
        {
          params: { defaultType: importType },
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      toast.success(`Importação concluída! ${res.data?.created ?? 0} ponto(s) criado(s).`);
      await onImported?.();
      onOpenChange(false);
    } catch (e: any) {
      const data = e?.response?.data;
      const msg =
        data?.message ||
        e?.message ||
        'Erro ao importar. Verifique o arquivo e tente novamente.';

      // Se vier uma lista de erros estruturada do backend, exibimos no modal
      const errs: string[] = Array.isArray(data?.errors)
        ? data.errors.map((x: any) => String(x))
        : [];

      setImportErrors(errs);
      toast.error(typeof msg === 'string' ? msg : 'Erro ao importar');
    } finally {
      setIsBusy(false);
    }
  };

  const REQUIRED_COMMON = [
    'name',
    'addressCity',
    'addressState',
    'latitude',
    'longitude',
  ];

  const OPTIONAL_COMMON = [
    'addressStreet',
    'addressNumber',
    'addressDistrict',
    'addressZipcode',
    'addressCountry',
    'subcategory',
    'description',
    'dailyImpressions',
    'environment',
    'socialClasses',
    'showInMediaKit',
    'basePriceMonth',
    'basePriceWeek (Preço Quinzenal)',
  ];

  const OPTIONAL_OOH = [
    'productionCosts_lona',
    'productionCosts_adesivo',
    'productionCosts_vinil',
    'productionCosts_montagem',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Inventário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900 mb-2">📋 Importação em Lote</p>
            <p className="text-sm text-blue-700">
              Importe múltiplos pontos de mídia via Excel (.xlsx) ou CSV (.csv). Imagens não fazem parte do template (devem ser enviadas manualmente no sistema).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo do Template</Label>
              <Select
                value={importType}
                onValueChange={(v: string) => setImportType(v as MediaType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MediaType.OOH}>OOH</SelectItem>
                  <SelectItem value={MediaType.DOOH}>DOOH</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Formato</Label>
              <Select
                value={format}
                onValueChange={(v: string) => setFormat(v as 'xlsx' | 'csv')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Baixar Modelo</Label>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => downloadTemplate(importType, format)}
              disabled={isBusy}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar Modelo {importType} ({format.toUpperCase()})
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Selecione o arquivo</Label>
            <Input
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              disabled={isBusy}
            />
            {selectedFile && (
              <p className="text-sm text-green-600">✓ {selectedFile.name}</p>
            )}
          </div>

          <div className="p-3 bg-gray-50 rounded text-xs text-gray-600 space-y-2">
            <div>
              <p className="mb-1">
                <strong>Colunas obrigatórias (OOH e DOOH):</strong>
              </p>
              <p className="font-mono break-words">{REQUIRED_COMMON.join(', ')}</p>
            </div>

            <div>
              <p className="mb-1">
                <strong>Colunas opcionais (OOH e DOOH):</strong>
              </p>
              <p className="font-mono break-words">{OPTIONAL_COMMON.join(', ')}</p>
            </div>

            {importType === MediaType.OOH && (
              <div>
                <p className="mb-1">
                  <strong>Colunas opcionais adicionais (somente OOH):</strong>
                </p>
                <p className="font-mono break-words">{OPTIONAL_OOH.join(', ')}</p>
              </div>
            )}
          </div>

          {importErrors.length > 0 && (
            <div className="p-3 bg-red-50 rounded text-xs text-red-700">
              <p className="font-semibold mb-2">Erros encontrados:</p>
              <ul className="list-disc ml-5 space-y-1 max-h-40 overflow-auto">
                {importErrors.slice(0, 50).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
              {importErrors.length > 50 && (
                <p className="mt-2 text-red-600">Mostrando os primeiros 50 erros.</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={!selectedFile || isBusy}>
              Importar Pontos
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
