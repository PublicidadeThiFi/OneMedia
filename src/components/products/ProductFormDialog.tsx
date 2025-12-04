import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Product, ProductType, PriceType } from '../../types';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSave: (productData: Partial<Product>) => void;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSave,
}: ProductFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    type: ProductType.PRODUTO,
    priceType: PriceType.UNITARIO,
    basePrice: '',
    isAdditional: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Preencher formulário quando editando
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        category: product.category || '',
        type: product.type,
        priceType: product.priceType,
        basePrice: product.basePrice.toString(),
        isAdditional: product.isAdditional,
      });
    } else {
      // Reset ao criar novo
      setFormData({
        name: '',
        description: '',
        category: '',
        type: ProductType.PRODUTO,
        priceType: PriceType.UNITARIO,
        basePrice: '',
        isAdditional: false,
      });
    }
    setErrors({});
  }, [product, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.basePrice || parseFloat(formData.basePrice) <= 0) {
      newErrors.basePrice = 'Preço deve ser maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const productData: Partial<Product> = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      category: formData.category.trim() || undefined,
      type: formData.type,
      priceType: formData.priceType,
      basePrice: parseFloat(formData.basePrice),
      isAdditional: formData.isAdditional,
    };

    if (product) {
      // Edição
      productData.id = product.id;
      productData.updatedAt = new Date();
    }

    onSave(productData);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Editar Produto/Serviço' : 'Cadastrar Produto/Serviço'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="type">
              Tipo <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData({ ...formData, type: value as ProductType })}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ProductType.PRODUTO}>Produto</SelectItem>
                <SelectItem value={ProductType.SERVICO}>Serviço</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nome e Categoria */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ex: Impressão de Lona"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {errors.name && (
                <p className="text-red-500 text-sm">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                placeholder="Ex: Material"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva o produto ou serviço..."
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Tipo de Preço e Preço Base */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priceType">
                Tipo de Preço <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.priceType} 
                onValueChange={(value) => setFormData({ ...formData, priceType: value as PriceType })}
              >
                <SelectTrigger id="priceType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PriceType.UNITARIO}>Unitário</SelectItem>
                  <SelectItem value={PriceType.A_PARTIR_DE}>A partir de</SelectItem>
                  <SelectItem value={PriceType.PACOTE}>Pacote</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="basePrice">
                Preço Base (R$) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="basePrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
              />
              {errors.basePrice && (
                <p className="text-red-500 text-sm">{errors.basePrice}</p>
              )}
            </div>
          </div>

          {/* Checkbox Adicional */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="isAdditional"
              checked={formData.isAdditional}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, isAdditional: checked === true })
              }
            />
            <Label htmlFor="isAdditional" className="cursor-pointer">
              Este é um item adicional (pode ser incluído em propostas)
            </Label>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              {product ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
