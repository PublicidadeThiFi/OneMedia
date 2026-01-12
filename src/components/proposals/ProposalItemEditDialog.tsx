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
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const parseApiDateToLocalMidnight = (value: any): Date | undefined => {
    if (!value) return undefined;
    const d = new Date(value as any);
    if (Number.isNaN(d.getTime())) return undefined;
    const datePart = d.toISOString().split('T')[0];
    const local = new Date(`${datePart}T00:00:00`);
    return Number.isNaN(local.getTime()) ? undefined : local;
  };

  useEffect(() => {
    if (item && open) {
      setDescription(item.description);
      setQuantity(item.quantity);
      setUnitPrice(item.unitPrice);
      setDiscountPercent(Number((item as any).discountPercent) || 0);
      setDiscountAmount(Number((item as any).discountAmount) || 0);
      setStartDate(parseApiDateToLocalMidnight(item.startDate));
      setEndDate(parseApiDateToLocalMidnight(item.endDate));
    }
  }, [item, open]);

  const baseTotal = quantity * unitPrice;
  let discountedTotal = baseTotal;
  if (discountPercent > 0) discountedTotal = discountedTotal * (1 - discountPercent / 100);
  if (discountAmount > 0) discountedTotal = discountedTotal - discountAmount;
  if (!Number.isFinite(discountedTotal)) discountedTotal = 0;
  discountedTotal = Math.max(0, discountedTotal);
  const computedDiscountValue = Math.max(0, baseTotal - discountedTotal);

  const handleSave = () => {
    if (!item) return;

    const updatedItem: ProposalItem = {
      ...item,
      description,
      quantity,
      unitPrice,
      discountPercent: discountPercent > 0 ? discountPercent : undefined,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
      totalPrice: discountedTotal,
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

  const totalPrice = discountedTotal;
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
                  setStartDate(
                    e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined
                  )
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
                  setEndDate(
                    e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined
                  )
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

          {/* Desconto (opcional) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-discountPercent">Desconto em %</Label>
              <Input
                id="edit-discountPercent"
                type="number"
                min="0"
                step="0.01"
                value={discountPercent || 0}
                onChange={(e) => {
                  const v = Math.max(0, parseFloat(e.target.value) || 0);
                  setDiscountPercent(v);
                  if (v > 0) setDiscountAmount(0);
                }}
                disabled={!!discountAmount}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-discountAmount">Desconto em R$</Label>
              <Input
                id="edit-discountAmount"
                type="number"
                min="0"
                step="0.01"
                value={discountAmount || 0}
                onChange={(e) => {
                  const v = Math.max(0, parseFloat(e.target.value) || 0);
                  setDiscountAmount(v);
                  if (v > 0) setDiscountPercent(0);
                }}
                disabled={!!discountPercent}
              />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            💡 Preencha apenas um campo. O desconto é aplicado somente neste item.
          </p>

          {/* Resumo */}
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <div className="flex justify-between items-center">
              <span className="text-indigo-900">Total do Item:</span>
              <span className="text-indigo-900">{formatCurrency(totalPrice)}</span>
            </div>
            <p className="text-sm text-indigo-700 mt-1">
              {quantity} x {formatCurrency(unitPrice)}
            </p>
            {(discountPercent > 0 || discountAmount > 0) && (
              <div className="mt-2 text-sm text-indigo-800 space-y-1">
                <div className="flex justify-between">
                  <span>Original:</span>
                  <span>{formatCurrency(baseTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Desconto{discountPercent > 0 ? ` (${discountPercent}%)` : ''}:</span>
                  <span>-{formatCurrency(computedDiscountValue)}</span>
                </div>
              </div>
            )}
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
