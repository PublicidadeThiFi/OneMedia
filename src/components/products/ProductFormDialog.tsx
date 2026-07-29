import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Product, ProductType, PriceType, ProductWritePayload } from '../../types';
import { useTutorial } from '../../contexts/TutorialContext';

function parseCurrencyInput(value: string): number | null {
  const cleaned = value.trim().replace(/\s/g, '').replace(/[^0-9.,]/g, '');
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let decimalSeparatorIndex = -1;

  if (lastComma >= 0 && lastDot >= 0) {
    // Quando os dois separadores existem, o último é o decimal.
    // Ex.: 1.000,00 ou 1,000.00.
    decimalSeparatorIndex = Math.max(lastComma, lastDot);
  } else if (lastComma >= 0) {
    // No locale pt-BR, vírgula é sempre tratada como separador decimal.
    decimalSeparatorIndex = lastComma;
  } else if (lastDot >= 0) {
    const dotCount = (cleaned.match(/\./g) || []).length;
    const decimalDigits = cleaned.length - lastDot - 1;

    // Mantém compatibilidade com valores digitados com ponto decimal (234.56),
    // mas interpreta 1.000 como mil, não como um real.
    if (dotCount === 1 && decimalDigits > 0 && decimalDigits <= 2) {
      decimalSeparatorIndex = lastDot;
    }
  }

  const integerPart = (
    decimalSeparatorIndex >= 0 ? cleaned.slice(0, decimalSeparatorIndex) : cleaned
  ).replace(/[.,]/g, '');
  const fractionPart =
    decimalSeparatorIndex >= 0
      ? cleaned.slice(decimalSeparatorIndex + 1).replace(/[.,]/g, '')
      : '';

  if (!integerPart || !/^\d+$/.test(integerPart) || (fractionPart && !/^\d+$/.test(fractionPart))) {
    return null;
  }

  const parsed = Number(`${integerPart}${fractionPart ? `.${fractionPart}` : ''}`);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrencyInput(value: number): string {
  return Number.isFinite(value)
    ? value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '';
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSave: (productData: ProductWritePayload) => void;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSave,
}: ProductFormDialogProps) {
  const { openModuleTutorial } = useTutorial();
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
        basePrice: formatCurrencyInput(product.basePrice),
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

    const parsedBasePrice = parseCurrencyInput(formData.basePrice);
    if (parsedBasePrice === null || parsedBasePrice <= 0) {
      newErrors.basePrice = 'Informe um preço válido maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const parsedBasePrice = parseCurrencyInput(formData.basePrice);
    if (parsedBasePrice === null) {
      setErrors((current) => ({
        ...current,
        basePrice: 'Informe um preço válido maior que zero',
      }));
      return;
    }

    const productData: ProductWritePayload = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      category: formData.category.trim() || undefined,
      type: formData.type,
      priceType: formData.priceType,
      basePrice: parsedBasePrice,
      isAdditional: formData.isAdditional,
    };

    onSave(productData);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-tour="products-create-dialog"
        className="overflow-hidden p-0 gap-0"
        style={{
          width: 'min(760px, calc(100vw - 2rem))',
          maxWidth: 'min(760px, calc(100vw - 2rem))',
          height: 'min(82vh, 720px)',
          maxHeight: 'calc(100vh - 2rem)',
        }}
      >
        <DialogHeader className="shrink-0 border-b px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle>
              {product ? 'Editar Produto/Serviço' : 'Cadastrar Produto/Serviço'}
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => openModuleTutorial('products-create-flow', { trackProgress: false })}
              className="text-indigo-600 hover:text-indigo-700"
            >
              Tutorial rápido deste fluxo
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Tipo */}
          <div className="space-y-2" data-tour="products-create-identity">
            <Label htmlFor="type">
              Tipo <span className="text-red-500">*</span>
            </Label>
                      <Select 
            value={formData.type} 
            onValueChange={(value: string) =>
              setFormData({ ...formData, type: value as ProductType })
            }
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
          <div className="space-y-2" data-tour="products-create-description">
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
          <div className="grid grid-cols-2 gap-4" data-tour="products-create-pricing">
            <div className="space-y-2">
              <Label htmlFor="priceType">
                Tipo de Preço <span className="text-red-500">*</span>
              </Label>
                        <Select 
            value={formData.priceType} 
            onValueChange={(value: string) =>
              setFormData({ ...formData, priceType: value as PriceType })
            }
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
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,00"
                value={formData.basePrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    basePrice: e.target.value.replace(/[^0-9.,]/g, ''),
                  })
                }
              />
              {errors.basePrice && (
                <p className="text-red-500 text-sm">{errors.basePrice}</p>
              )}
            </div>
          </div>

          {/* Checkbox Adicional */}
          <div className="flex items-center gap-2" data-tour="products-create-additional">
                      <Checkbox
            id="isAdditional"
            checked={formData.isAdditional}
            onCheckedChange={(checked: boolean | 'indeterminate') =>
              setFormData({ ...formData, isAdditional: checked === true })
            }
          />

            <Label htmlFor="isAdditional" className="cursor-pointer">
              Este é um item adicional (pode ser incluído em propostas)
            </Label>
          </div>

          </div>

          {/* Botões */}
          <div className="shrink-0 border-t bg-background px-6 py-4">
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button type="submit">
                {product ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
