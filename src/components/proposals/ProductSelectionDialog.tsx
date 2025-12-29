import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ProposalItem, Product } from '../../types';
import { useCompany } from '../../contexts/CompanyContext';
import { useProducts } from '../../hooks/useProducts';

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
  const { products, loading, error, refetch } = useProducts();

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [startDate, setStartDate] = useState<Date | undefined>(defaultPeriod.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(defaultPeriod.endDate);

  useEffect(() => {
    if (!open) return;
    setStartDate(defaultPeriod.startDate);
    setEndDate(defaultPeriod.endDate);
    void refetch();
  }, [open, defaultPeriod.startDate, defaultPeriod.endDate, refetch]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId);
  }, [products, selectedProductId]);

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const product = products.find((p) => p.id === productId);
    if (product) {
      setDescription(product.name);
      setUnitPrice(Number(product.basePrice) || 0);
    }
  };

  const totalPrice = quantity * unitPrice;

  const handleConfirm = () => {
    if (!selectedProductId) return;

    const item: ProposalItem = {
      id: `item${Date.now()}${Math.random()}`,
      companyId: company?.id || selectedProduct?.companyId || '',
      proposalId: '',
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

  const isValid = !!selectedProductId && !!description && quantity > 0 && unitPrice >= 0;

  const formatCurrency = (value: number) =>
    (Number.isFinite(value) ? value : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        // ShadCN dispara onOpenChange tanto para abrir quanto para fechar.
        // Se fechou, resetamos; se abriu, delegamos para o estado do pai.
        if (!nextOpen) return handleClose();
        onOpenChange(true);
      }}

    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Produto/Serviço</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="product">Produto/Serviço *</Label>
            <Select value={selectedProductId} onValueChange={handleProductChange} disabled={loading}>
              <SelectTrigger id="product">
                <SelectValue
                  placeholder={
                    loading ? 'Carregando...' : error ? 'Erro ao carregar produtos' : 'Selecione um produto ou serviço'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {products.map((product: Product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - {formatCurrency(product.basePrice || 0)}
                    {product.category ? ` (${product.category})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
              Você pode personalizar a descrição que aparecerá na proposta.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate ? startDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data de Término</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate ? endDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Opcional. Use se o produto/serviço tiver período específico.
          </p>

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
