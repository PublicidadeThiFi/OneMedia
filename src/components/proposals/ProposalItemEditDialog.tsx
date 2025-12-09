import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ProposalItem } from '../../types';

interface ProposalItemEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ProposalItem | null;
  onSave: (item: ProposalItem) => void;
}

export function ProposalItemEditDialog({
  open,
  onOpenChange,
  item,
  onSave,
}: ProposalItemEditDialogProps) {
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (item && open) {
      setDescription(item.description);
      setQuantity(item.quantity);
      setUnitPrice(item.unitPrice);
      setStartDate(item.startDate ? new Date(item.startDate) : undefined);
      setEndDate(item.endDate ? new Date(item.endDate) : undefined);
    }
  }, [item, open]);

  const handleSave = () => {
    if (!item) return;

    const updatedItem: ProposalItem = {
      ...item,
      description,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
      startDate,
      endDate,
      updatedAt: new Date(),
    };

    onSave(updatedItem);
    handleClose();
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const totalPrice = quantity * unitPrice;
  const isValid = description && quantity > 0 && unitPrice >= 0;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Item da Proposta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição *</Label>
            <Textarea
              id="edit-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Período */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-startDate">Data de Início</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={startDate ? startDate.toISOString().split('T')[0] : ''}
                onChange={(e) =>
                  setStartDate(e.target.value ? new Date(e.target.value) : undefined)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endDate">Data de Término</Label>
              <Input
                id="edit-endDate"
                type="date"
                value={endDate ? endDate.toISOString().split('T')[0] : ''}
                onChange={(e) =>
                  setEndDate(e.target.value ? new Date(e.target.value) : undefined)
                }
              />
            </div>
          </div>

          {/* Quantidade e preço */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantidade *</Label>
              <Input
                id="edit-quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-unitPrice">Preço Unitário (R$) *</Label>
              <Input
                id="edit-unitPrice"
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
          <Button onClick={handleSave} disabled={!isValid}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
