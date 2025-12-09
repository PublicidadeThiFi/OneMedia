import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ProposalItem, Product } from '../../types';
import { useCompany } from '../../contexts/CompanyContext';
import { getAllProductsForCompany } from '../../lib/mockData';

interface ProductSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPeriod: {
    startDate?: Date;
    endDate?: Date;
  };
  onAddItem: (item: ProposalItem) => void;
}

export function ProductSelectionDialog({
  open,
  onOpenChange,
  defaultPeriod,
  onAddItem,
}: ProductSelectionDialogProps) {
  const { company } = useCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [startDate, setStartDate] = useState<Date | undefined>(defaultPeriod.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(defaultPeriod.endDate);

  // Carregar produtos da empresa
  useEffect(() => {
    if (company) {
      const companyProducts = getAllProductsForCompany(company.id);
      setProducts(companyProducts);
    }
  }, [company]);

  // Resetar período padrão quando abre
  useEffect(() => {
    if (open) {
      setStartDate(defaultPeriod.startDate);
      setEndDate(defaultPeriod.endDate);
    }
  }, [open, defaultPeriod]);

  // Atualizar campos ao selecionar produto
  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const product = products.find(p => p.id === productId);
    if (product) {
      setDescription(product.name);
      setUnitPrice(product.basePrice);
    }
  };

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  const totalPrice = quantity * unitPrice;

  const handleConfirm = () => {
    if (!company || !selectedProductId) return;

    const item: ProposalItem = {
      id: `item${Date.now()}${Math.random()}`,
      companyId: company.id,
      proposalId: '', // será preenchido ao salvar a proposta
      mediaUnitId: undefined,
      productId: selectedProductId,
      description,
      startDate,
      endDate,
      quantity,
      unitPrice,
      totalPrice,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    onAddItem(item);
    handleClose();
  };

  const handleClose = () => {
    setSelectedProductId('');
    setDescription('');
    setQuantity(1);
    setUnitPrice(0);
    setStartDate(defaultPeriod.startDate);
    setEndDate(defaultPeriod.endDate);
    onOpenChange(false);
  };

  const isValid = selectedProductId && description && quantity > 0 && unitPrice >= 0;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Produto/Serviço</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selecionar produto */}
          <div className="space-y-2">
            <Label htmlFor="product">Produto/Serviço *</Label>
            <Select value={selectedProductId} onValueChange={handleProductChange}>
              <SelectTrigger id="product">
                <SelectValue placeholder="Selecione um produto ou serviço" />
              </SelectTrigger>
              <SelectContent>
                {products.map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - {formatCurrency(product.basePrice)}
                    {product.category && ` (${product.category})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedProductId && (
              <p className="text-sm text-gray-500">
                Selecione um produto/serviço cadastrado
              </p>
            )}
            {selectedProduct && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                <p>
                  <strong>Tipo:</strong> {selectedProduct.type}
                </p>
                {selectedProduct.description && (
                  <p>
                    <strong>Descrição:</strong> {selectedProduct.description}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Descrição customizada */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição para a Proposta *</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Descreva como este item aparecerá na proposta"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-sm text-gray-500">
              Você pode personalizar a descrição que aparecerá na proposta
            </p>
          </div>

          {/* Período (opcional para produtos) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate ? startDate.toISOString().split('T')[0] : ''}
                onChange={(e) =>
                  setStartDate(e.target.value ? new Date(e.target.value) : undefined)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data de Término</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate ? endDate.toISOString().split('T')[0] : ''}
                onChange={(e) =>
                  setEndDate(e.target.value ? new Date(e.target.value) : undefined)
                }
              />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Opcional. Use se o produto/serviço tiver período específico
          </p>

          {/* Quantidade e preço */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Preço Unitário (R$) *</Label>
              <Input
                id="unitPrice"
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <div className="flex justify-between items-center">
              <span className="text-indigo-900">Total do Item:</span>
              <span className="text-indigo-900">{formatCurrency(totalPrice)}</span>
            </div>
            <p className="text-sm text-indigo-700 mt-1">
              {quantity} x {formatCurrency(unitPrice)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Adicionar Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
