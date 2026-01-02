import { useState, useEffect, type ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { X, ChevronDown, Package } from 'lucide-react';
import { MediaPoint, MediaType, ProductionCosts } from '../../types';
import { OOH_SUBCATEGORIES, DOOH_SUBCATEGORIES, ENVIRONMENTS, BRAZILIAN_STATES, SOCIAL_CLASSES } from '../../lib/mockData';

interface MediaPointFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaPoint?: MediaPoint | null;
  onSave: (data: Partial<MediaPoint>, imageFile?: File | null) => Promise<any> | void;
}

export function MediaPointFormDialog({ open, onOpenChange, mediaPoint, onSave }: MediaPointFormDialogProps) {
  // Normaliza URLs antigas (absolutas) para caminho relativo em /uploads/...
  // (permite servir via proxy/rewrite, ex.: Vercel)
  const normalizeUploadsUrl = (value?: string | null) => {
    if (!value) return value ?? null;
    if (value.startsWith('/uploads/')) return value;
    const idx = value.indexOf('/uploads/');
    if (idx >= 0) return value.slice(idx);
    return value;
  };
  const [type, setType] = useState<MediaType>(mediaPoint?.type || MediaType.OOH);
  const [formData, setFormData] = useState<Partial<MediaPoint>>({
    type: MediaType.OOH,
    showInMediaKit: false,
    addressCountry: 'Brasil',
    socialClasses: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);


  useEffect(() => {
    setSubmitError(null);
    if (mediaPoint) {
      setFormData(mediaPoint);
      setType(mediaPoint.type);
      setImageFile(null);
      setImagePreview(normalizeUploadsUrl(mediaPoint.mainImageUrl) || null);
    } else {
      setFormData({
        type: MediaType.OOH,
        showInMediaKit: false,
        addressCountry: 'Brasil',
        socialClasses: [],
      });
      setType(MediaType.OOH);
      setImageFile(null);
      setImagePreview(null);
    }
  }, [mediaPoint, open]);

  const handleTypeChange = (newType: MediaType) => {
    setType(newType);
    setFormData(prev => ({ ...prev, type: newType, subcategory: undefined }));
  };


  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);

    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      // Mantém o preview atual (ex.: imagem já salva) quando limpar o input.
      // Se quiser "remover imagem", isso deve ser uma ação explícita.
    }
  };

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const updateField = (field: keyof MediaPoint, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleSocialClass = (classValue: string) => {
    const current = formData.socialClasses || [];
    const updated = current.includes(classValue)
      ? current.filter(c => c !== classValue)
      : [...current, classValue];
    updateField('socialClasses', updated);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Nome do ponto é obrigatório';
    }
    if (!formData.addressCity?.trim()) {
      newErrors.addressCity = 'Cidade é obrigatória';
    }
    if (!formData.addressState?.trim()) {
      newErrors.addressState = 'Estado é obrigatório';
    }
    if (formData.latitude === undefined || formData.latitude === null) {
      newErrors.latitude = 'Latitude é obrigatória';
    }
    if (formData.longitude === undefined || formData.longitude === null) {
      newErrors.longitude = 'Longitude é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setSubmitError(null);

    // Remove campos que não devem ser enviados para a API
    const { id, companyId, createdAt, updatedAt, units, owners, ...payload } = (formData as any) || {};

    try {
      await onSave(
        {
          ...payload,
          type,
        },
        imageFile
      );

      // Só fecha se a operação foi concluída sem erro.
      onOpenChange(false);
    } catch (e: any) {
      // Exibe erro no próprio dialog (além de qualquer toast global).
      const msg = e?.message || 'Não foi possível salvar o ponto de mídia.';
      setSubmitError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      type: MediaType.OOH,
      showInMediaKit: false,
      addressCountry: 'Brasil',
      socialClasses: [],
    });
    setErrors({});
    setSubmitError(null);
    onOpenChange(false);
  };

  const subcategories = type === MediaType.OOH ? OOH_SUBCATEGORIES : DOOH_SUBCATEGORIES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mediaPoint ? 'Editar Ponto de Mídia' : 'Cadastrar Novo Ponto de Mídia (MediaPoint)'}
          </DialogTitle>
          <DialogDescription>
            {mediaPoint ? 'Atualize os detalhes do ponto de mídia.' : 'Preencha os campos para cadastrar um novo ponto de mídia.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs
  value={type}
  onValueChange={(v: string) => handleTypeChange(v as MediaType)}
>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value={MediaType.OOH}>OOH</TabsTrigger>
            <TabsTrigger value={MediaType.DOOH}>DOOH</TabsTrigger>
          </TabsList>

          <TabsContent value={type} className="space-y-6 mt-6">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-gray-900 border-b pb-2">Informações Básicas</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Ponto *</Label>
                  <Input
                    placeholder="Ex: Outdoor Av. Paulista 1000"
                    value={formData.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Subcategoria</Label>
                  <Select
  value={formData.subcategory || ''}
  onValueChange={(value: string) => updateField('subcategory', value)}
>

                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a subcategoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.map((sub) => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Imagem principal</Label>
                <Input type="file" accept="image/*" onChange={handleImageChange} />
                {imagePreview && (
                  <div className="mt-2 w-full max-w-sm h-40 bg-gray-100 rounded overflow-hidden">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Selecione uma imagem (PNG/JPG). O upload será feito ao salvar.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descreva o ponto de mídia..."
                  value={formData.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="text-gray-900 border-b pb-2">Localização</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input
                    placeholder="00000-000"
                    value={formData.addressZipcode || ''}
                    onChange={(e) => updateField('addressZipcode', e.target.value)}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Rua/Avenida</Label>
                  <Input
                    placeholder="Ex: Avenida Paulista"
                    value={formData.addressStreet || ''}
                    onChange={(e) => updateField('addressStreet', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input
                    placeholder="1000"
                    value={formData.addressNumber || ''}
                    onChange={(e) => updateField('addressNumber', e.target.value)}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Bairro</Label>
                  <Input
                    placeholder="Ex: Bela Vista"
                    value={formData.addressDistrict || ''}
                    onChange={(e) => updateField('addressDistrict', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Cidade *</Label>
                  <Input
                    placeholder="São Paulo"
                    value={formData.addressCity || ''}
                    onChange={(e) => updateField('addressCity', e.target.value)}
                    className={errors.addressCity ? 'border-red-500' : ''}
                  />
                  {errors.addressCity && <p className="text-xs text-red-600">{errors.addressCity}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Estado *</Label>
                  <Select
  value={formData.addressState || ''}
  onValueChange={(value: string) => updateField('addressState', value)}
>

                    <SelectTrigger className={errors.addressState ? 'border-red-500' : ''}>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.addressState && <p className="text-xs text-red-600">{errors.addressState}</p>}
                </div>
                <div className="space-y-2">
                  <Label>País</Label>
                  <Input
                    value={formData.addressCountry || 'Brasil'}
                    onChange={(e) => updateField('addressCountry', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Latitude *</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="-23.561414"
                    value={formData.latitude || ''}
                    onChange={(e) => updateField('latitude', parseFloat(e.target.value))}
                    className={errors.latitude ? 'border-red-500' : ''}
                  />
                  {errors.latitude && <p className="text-xs text-red-600">{errors.latitude}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Longitude *</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="-46.655881"
                    value={formData.longitude || ''}
                    onChange={(e) => updateField('longitude', parseFloat(e.target.value))}
                    className={errors.longitude ? 'border-red-500' : ''}
                  />
                  {errors.longitude && <p className="text-xs text-red-600">{errors.longitude}</p>}
                </div>
              </div>
            </div>

            {/* Dados Comerciais */}
            <div className="space-y-4">
              <h3 className="text-gray-900 border-b pb-2">Dados Comerciais e Audiência</h3>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Impactos Diários</Label>
                  <Input
                    type="number"
                    placeholder="85000"
                    value={formData.dailyImpressions || ''}
                    onChange={(e) => updateField('dailyImpressions', parseInt(e.target.value) || null)}
                  />
                  {!formData.dailyImpressions && (
                    <p className="text-xs text-amber-600">⚠️ Recomendado preencher</p>
                  )}
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Ambiente</Label>
                  <Select
  value={formData.environment || ''}
  onValueChange={(value: string) => updateField('environment', value)}
>

                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ambiente" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENVIRONMENTS.map((env) => (
                        <SelectItem key={env} value={env}>{env}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Classes Sociais Atendidas (socialClasses)</Label>
                <div className="flex gap-2">
                  {SOCIAL_CLASSES.map((classValue) => (
                    <Badge
                      key={classValue}
                      variant={formData.socialClasses?.includes(classValue) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleSocialClass(classValue)}
                    >
                      {classValue}
                      {formData.socialClasses?.includes(classValue) && (
                        <X className="w-3 h-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Preço Mensal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="8500.00"
                    value={formData.basePriceMonth || ''}
                    onChange={(e) => updateField('basePriceMonth', parseFloat(e.target.value) || null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço Semanal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="2500.00"
                    value={formData.basePriceWeek || ''}
                    onChange={(e) => updateField('basePriceWeek', parseFloat(e.target.value) || null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço Diário (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="450.00"
                    value={formData.basePriceDay || ''}
                    onChange={(e) => updateField('basePriceDay', parseFloat(e.target.value) || null)}
                  />
                </div>
              </div>
            </div>

            {/* Custos de Produção OOH (apenas para OOH) */}
            {type === MediaType.OOH && (
              <Collapsible defaultOpen={false}>
                <div className="space-y-4">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-orange-50/50 hover:bg-orange-100/50 border-orange-200"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-orange-600" />
                        <span className="text-gray-900">Custos de Produção OOH</span>
                      </div>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4">
                    <div className="p-4 bg-orange-50/30 rounded-lg border border-orange-100">
                      <p className="text-sm text-gray-600 mb-4">
                        Configure os custos padrão de produção para este ponto OOH. Estes valores
                        serão usados como referência para orçamentos e cálculos de custo.
                      </p>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Lona (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="R$ 0,00"
                            value={formData.productionCosts?.lona || ''}
                            onChange={(e) =>
                              updateField('productionCosts', {
                                ...formData.productionCosts,
                                lona: parseFloat(e.target.value) || null,
                              })
                            }
                          />
                          <p className="text-xs text-gray-500">Material de impressão (lona/tecido)</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Adesivo (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="R$ 0,00"
                            value={formData.productionCosts?.adesivo || ''}
                            onChange={(e) =>
                              updateField('productionCosts', {
                                ...formData.productionCosts,
                                adesivo: parseFloat(e.target.value) || null,
                              })
                            }
                          />
                          <p className="text-xs text-gray-500">Material adesivo</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Vinil (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="R$ 0,00"
                            value={formData.productionCosts?.vinil || ''}
                            onChange={(e) =>
                              updateField('productionCosts', {
                                ...formData.productionCosts,
                                vinil: parseFloat(e.target.value) || null,
                              })
                            }
                          />
                          <p className="text-xs text-gray-500">Material vinílico (opcional)</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Montagem/Instalação (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="R$ 0,00"
                            value={formData.productionCosts?.montagem || ''}
                            onChange={(e) =>
                              updateField('productionCosts', {
                                ...formData.productionCosts,
                                montagem: parseFloat(e.target.value) || null,
                              })
                            }
                          />
                          <p className="text-xs text-gray-500">Mão de obra para instalação</p>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}

            {/* Mídia Kit */}
            <div className="space-y-4">
              <h3 className="text-gray-900 border-b pb-2">Visibilidade</h3>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showInMediaKit"
                  checked={formData.showInMediaKit || false}
                  onChange={(e) => updateField('showInMediaKit', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="showInMediaKit" className="cursor-pointer">
                  Exibir este ponto no Mídia Kit público (showInMediaKit)
                </Label>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900 mb-2">💡 Próximo passo</p>
              <p className="text-sm text-blue-700">
                Após criar o ponto, você poderá adicionar <strong>unidades (MediaUnit)</strong> - 
                faces para OOH ou telas para DOOH - com preços e características específicas através da opção 
                "Gerenciar unidades" no menu do ponto.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {submitError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : mediaPoint ? 'Salvar Alterações' : 'Salvar Ponto'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}