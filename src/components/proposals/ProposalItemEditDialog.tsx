import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { ProposalItem } from '../../types';

interface ProposalItemEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ProposalItem | null;
  onSave: (item: ProposalItem) => void;
}

const OCCUPATION_MAX_DAYS = 360;

type OccupationMode = '15' | '30' | 'custom';

function formatPrice(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseLocalDate(yyyyMmDd: string) {
  return new Date(`${yyyyMmDd}T00:00:00`);
}

export function ProposalItemEditDialog({ open, onOpenChange, item, onSave }: ProposalItemEditDialogProps) {
  const isMedia = !!item?.mediaUnitId;

  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Produto/serviço (legado)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Mídia (novo fluxo)
  const [occupationMode, setOccupationMode] = useState<OccupationMode>('30');
  const [occupationDays, setOccupationDays] = useState<number>(30);
  const [clientProvidesBanner, setClientProvidesBanner] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !item) return;

    setDescription(item.description || '');
    setQuantity(Number(item.quantity) || 1);
    setDiscountPercent(Number(item.discountPercent) || 0);
    setDiscountAmount(Number(item.discountAmount) || 0);

    if (item.mediaUnitId) {
      const days = Number(item.occupationDays) || 30;
      setOccupationDays(days);
      setOccupationMode(days === 15 ? '15' : days === 30 ? '30' : 'custom');
      setClientProvidesBanner(!!item.clientProvidesBanner);
      // unitPrice será recalculado via useMemo
      setStartDate(undefined);
      setEndDate(undefined);
    } else {
      setStartDate(item.startDate ? new Date(item.startDate as any) : undefined);
      setEndDate(item.endDate ? new Date(item.endDate as any) : undefined);
      setClientProvidesBanner(false);
      setOccupationMode('30');
      setOccupationDays(30);
      setUnitPrice(Number(item.unitPrice) || 0);
    }
  }, [open, item]);

  const pricing = useMemo(() => {
    if (!item || !item.mediaUnitId) {
      return { priceMonth: 0, priceBiweekly: 0, rentPerUnit: 0, upfrontPerUnit: 0, perUnitTotal: unitPrice };
    }

    const days = Number.isFinite(occupationDays) ? occupationDays : 0;
    const clamped = Math.min(Math.max(0, days), OCCUPATION_MAX_DAYS);
    const isValid = clamped >= 15 && clamped % 15 == 0;

    const priceMonth = Number(item.priceMonthSnapshot) || 0;
    const priceBiweekly = Number(item.priceBiweeklySnapshot) || 0;

    const months = Math.floor(clamped / 30);
    const biweeks = Math.floor((clamped % 30) / 15);
    const rentPerUnit = (months * priceMonth) + (biweeks * priceBiweekly);

    const installation = Number(item.installationCostSnapshot) || 0;
    const production = clientProvidesBanner ? 0 : (Number(item.productionCostSnapshot) || 0);
    const upfrontPerUnit = installation + production;

    const perUnitTotal = isValid ? (rentPerUnit + upfrontPerUnit) : 0;

    return { priceMonth, priceBiweekly, rentPerUnit, upfrontPerUnit, perUnitTotal };
  }, [item, occupationDays, clientProvidesBanner, unitPrice]);

  // Mantém unitPrice sincronizado no modo mídia
  useEffect(() => {
    if (!open) return;
    if (item?.mediaUnitId) setUnitPrice(pricing.perUnitTotal);
  }, [open, item?.mediaUnitId, pricing.perUnitTotal]);

  const baseTotal = quantity * unitPrice;
  let discountedTotal = baseTotal;
  const pct = Number.isFinite(discountPercent) ? discountPercent : 0;
  const amt = Number.isFinite(discountAmount) ? discountAmount : 0;
  if (pct > 0) discountedTotal = discountedTotal * (1 - pct / 100);
  if (amt > 0) discountedTotal = discountedTotal - amt;
  discountedTotal = Math.max(0, discountedTotal);
  const computedDiscountValue = Math.max(0, baseTotal - discountedTotal);

  const isOccupationValid = !isMedia || (occupationDays >= 15 && occupationDays <= OCCUPATION_MAX_DAYS && occupationDays % 15 === 0);

  const handleSave = () => {
    if (!item) return;

    const updated: ProposalItem = {
      ...item,
      description,
      quantity,
      unitPrice,
      discountPercent: pct > 0 ? pct : undefined,
      discountAmount: amt > 0 ? amt : undefined,
      totalPrice: discountedTotal,
      updatedAt: new Date(),
    };

    if (item.mediaUnitId) {
      updated.occupationDays = occupationDays;
      updated.clientProvidesBanner = clientProvidesBanner;
      // No novo fluxo, datas não são relevantes para mídia
      updated.startDate = undefined;
      updated.endDate = undefined;
    } else {
      updated.startDate = startDate;
      updated.endDate = endDate;
    }

    onSave(updated);
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {isMedia ? (
            <>
              <div className="space-y-2">
                <Label>Tempo de ocupação</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={occupationMode === '15' ? 'default' : 'outline'}
                    onClick={() => {
                      setOccupationMode('15');
                      setOccupationDays(15);
                    }}
                  >
                    15 dias
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={occupationMode === '30' ? 'default' : 'outline'}
                    onClick={() => {
                      setOccupationMode('30');
                      setOccupationDays(30);
                    }}
                  >
                    30 dias
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={occupationMode === 'custom' ? 'default' : 'outline'}
                    onClick={() => {
                      setOccupationMode('custom');
                      setOccupationDays((prev) => (prev >= 15 ? prev : 15));
                    }}
                  >
                    Personalizado
                  </Button>
                </div>

                {occupationMode === 'custom' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setOccupationDays((d) => Math.min(OCCUPATION_MAX_DAYS, Math.max(0, d) + 15))}
                    >
                      +15 dias
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setOccupationDays((d) => Math.min(OCCUPATION_MAX_DAYS, Math.max(0, d) + 30))}
                    >
                      +30 dias
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setOccupationDays(0)}>
                      Limpar
                    </Button>
                    <span className="text-sm text-gray-700">
                      Total: <b>{occupationDays}</b> dias
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Total: {occupationDays} dias</p>
                )}

                {!isOccupationValid && (
                  <p className="text-xs text-red-600">
                    Selecione um tempo válido (múltiplo de 15, máximo {OCCUPATION_MAX_DAYS} dias).
                  </p>
                )}
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="clientProvidesBanner"
                  checked={clientProvidesBanner}
                  onCheckedChange={(v: boolean | 'indeterminate') => setClientProvidesBanner(v === true)}
                />
                <div>
                  <Label htmlFor="clientProvidesBanner">Cliente irá fornecer a lona</Label>
                  <p className="text-xs text-gray-500">
                    Se marcado, não contabiliza custo de produção (somente instalação/montagem).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Preço mensal</Label>
                  <Input value={formatPrice(pricing.priceMonth)} readOnly disabled />
                </div>
                <div>
                  <Label>Preço quinzenal</Label>
                  <Input value={formatPrice(pricing.priceBiweekly)} readOnly disabled />
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Aluguel por unidade</span>
                  <span className="text-gray-900">{formatPrice(pricing.rentPerUnit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Custos (produção/instalação)</span>
                  <span className="text-gray-900">{formatPrice(pricing.upfrontPerUnit)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t pt-2 mt-2">
                  <span className="text-gray-900">Total por unidade</span>
                  <span className="text-gray-900">{formatPrice(pricing.perUnitTotal)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de início</Label>
                <Input
                  type="date"
                  value={startDate ? startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setStartDate(e.target.value ? parseLocalDate(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label>Data de fim</Label>
                <Input
                  type="date"
                  value={endDate ? endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setEndDate(e.target.value ? parseLocalDate(e.target.value) : undefined)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            <div>
              <Label>Preço Unitário</Label>
              <Input
                type={isMedia ? 'text' : 'number'}
                min={0}
                step="0.01"
                value={isMedia ? formatPrice(unitPrice) : unitPrice}
                onChange={(e) => {
                  if (isMedia) return;
                  setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0));
                }}
                readOnly={isMedia}
                disabled={isMedia}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Desconto em %</Label>
              <Input
                type="number"
                min={0}
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
            <div>
              <Label>Desconto em R$</Label>
              <Input
                type="number"
                min={0}
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

          <p className="text-xs text-gray-500">
            💡 Preencha apenas um campo. O desconto será aplicado sobre o total do item.
          </p>

          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <div className="flex justify-between items-center">
              <span className="text-indigo-900">Total do Item:</span>
              <span className="text-indigo-900 font-medium">{formatPrice(discountedTotal)}</span>
            </div>
            <p className="text-sm text-indigo-700 mt-1">
              {quantity} x {isMedia ? formatPrice(unitPrice) : formatPrice(unitPrice)}
            </p>
            {computedDiscountValue > 0 && (
              <div className="mt-2 text-xs text-indigo-800">
                <div className="flex justify-between">
                  <span>Original:</span>
                  <span>{formatPrice(baseTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Desconto{discountPercent > 0 ? ` (${discountPercent}%)` : ''}:</span>
                  <span>-{formatPrice(computedDiscountValue)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isMedia && !isOccupationValid}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
