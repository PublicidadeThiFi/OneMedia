import { useState, useMemo } from 'react';
import { Plus, Search, Download, Upload, MapPin, Edit, Copy, MoreVertical, Layers, Building2, FileText, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Switch } from './ui/switch';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MediaPoint, MediaType } from '../types';
import { useMediaPoints } from '../hooks/useMediaPoints';
import apiClient from '../lib/apiClient';
import { toast } from 'sonner';
import { MediaPointFormDialog } from './inventory/MediaPointFormDialog';
import { MediaPointOwnersDialog } from './inventory/MediaPointOwnersDialog';
import { MediaPointContractsDialog } from './inventory/MediaPointContractsDialog';
import { MediaUnitsDialog } from './inventory/MediaUnitsDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

export function Inventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { mediaPoints, total, loading, error, refetch } = useMediaPoints({
    search: searchQuery || undefined,
    type: typeFilter === 'all' ? undefined : typeFilter,
    city: cityFilter === 'all' ? undefined : cityFilter,
    page,
    pageSize,
  });
  
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
  const cities = useMemo(() => {
    const uniqueCities = [...new Set(mediaPoints.map((p: MediaPoint) => p.addressCity).filter(Boolean))] as string[];
    return uniqueCities.sort();
  }, [mediaPoints]);

  const totalUnits = useMemo(() => {
    return mediaPoints.reduce((sum: number, p: MediaPoint) => sum + (p.units ? p.units.length : 0), 0);
  }, [mediaPoints]);

  // Server-side filters applied via hook; render current list
  const filteredPoints = mediaPoints;

  // Handlers
  const handleSavePoint = async (data: Partial<MediaPoint>) => {
    try {
      let saved: MediaPoint;
      if (editingPoint?.id) {
        const response = await apiClient.put<MediaPoint>(`/media-points/${editingPoint.id}`, data);
        saved = response.data;
        toast.success('Ponto de mídia atualizado!');
      } else {
        const response = await apiClient.post<MediaPoint>('/media-points', data);
        saved = response.data;
        toast.success('Ponto de mídia criado!');
      }
      setIsFormDialogOpen(false);
      setEditingPoint(null);
      refetch();
      return saved;
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Erro ao salvar ponto de mídia';
      toast.error(message);
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
            <p className="text-gray-900">{mediaPoints.length}</p>
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
            {filteredPoints.length} {filteredPoints.length === 1 ? 'ponto encontrado' : 'pontos encontrados'}
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
                  src={point.mainImageUrl || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800'}
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
      />
    </div>
  );
}

// Import Dialog Component
interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleImport = () => {
    if (!selectedFile) {
      alert('Selecione um arquivo');
      return;
    }

    // TODO: Implementar importação real de inventário via XLS/CSV
    console.log('Importando arquivo:', selectedFile.name);
    alert(`Funcionalidade em desenvolvimento\n\nArquivo selecionado: ${selectedFile.name}`);
    onOpenChange(false);
  };

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
              Importe múltiplos pontos de mídia através de arquivo Excel (.xlsx) ou CSV (.csv)
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-700">Selecione o arquivo</label>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            {selectedFile && (
              <p className="text-sm text-green-600">✓ {selectedFile.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                // TODO: Gerar template real baseado no schema
                alert('Download de modelo em desenvolvimento');
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar Modelo (Template)
            </Button>
          </div>

          <div className="p-3 bg-gray-50 rounded text-xs text-gray-600">
            <p className="mb-2"><strong>Colunas esperadas no arquivo:</strong></p>
            <p className="font-mono">
              name, type, subcategory, description, addressCity, addressState, latitude, longitude, 
              dailyImpressions, environment, basePriceMonth, showInMediaKit
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={!selectedFile}>
              Importar Pontos
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}