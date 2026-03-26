import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Package, Plus, Search, ShoppingBag, Gift } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { ProposalItem, Product, ProductType } from '../../types';
import { useCompany } from '../../contexts/CompanyContext';
import { useProducts } from '../../hooks/useProducts';

interface ProductSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPeriod: {
    startDate?: Date;
    endDate?: Date;
  };
  existingProductIds?: string[];
  onAddItems: (items: ProposalItem[]) => void;
}

type ItemDraft = {
  expanded: boolean;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  startDate?: Date;
  endDate?: Date;
  isGift: boolean;
};

function parseLocalDate(yyyyMmDd: string) {
  return new Date(`${yyyyMmDd}T00:00:00`);
}

function formatCurrency(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ProductSelectionDialog({
  open,
  onOpenChange,
  defaultPeriod,
  existingProductIds = [],
  onAddItems,
}: ProductSelectionDialogProps) {
  const { company } = useCompany();
  const productsParams = useMemo(() => ({ page: 1, pageSize: 500 }), []);
  const { products, loading, error, refetch } = useProducts(productsParams);

  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<'ALL' | ProductType>('ALL' as const);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setSegment('ALL');
    setSelectedIds([]);
    setDrafts({});
    void refetch();
  }, [open, refetch]);

  const availableProducts = useMemo(() => {
    const existing = new Set((existingProductIds ?? []).map(String));
    return (products ?? []).filter((p) => !existing.has(String(p.id)));
  }, [products, existingProductIds]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return availableProducts.filter((p) => {
      if (segment !== 'ALL' && p.type !== segment) return false;
      if (!q) return true;
      return [
        p.name,
        p.description,
        p.category,
        p.type,
      ]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(q));
    });
  }, [availableProducts, search, segment]);

  const ensureDraft = (product: Product): ItemDraft => ({
    expanded: false,
    description: product.name,
    quantity: 1,
    unitPrice: Number(product.basePrice) || 0,
    discountPercent: 0,
    discountAmount: 0,
    startDate: defaultPeriod.startDate,
    endDate: defaultPeriod.endDate,
    isGift: false,
  });

  const toggleSelect = (product: Product) => {
    setSelectedIds((prev) => {
      const exists = prev.includes(product.id);
      if (exists) return prev.filter((id) => id !== product.id);
      return [...prev, product.id];
    });

    setDrafts((prev) => {
      if (prev[product.id]) {
        return {
          ...prev,
          [product.id]: {
            ...prev[product.id],
            expanded: true,
          },
        };
      }
      return {
        ...prev,
        [product.id]: {
          ...ensureDraft(product),
          expanded: true,
        },
      };
    });
  };

  const updateDraft = (productId: string, patch: Partial<ItemDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] ?? ensureDraft(availableProducts.find((p) => p.id === productId)!)),
        ...patch,
      },
    }));
  };

  const handleConfirm = () => {
    const now = new Date();
    const nextItems: ProposalItem[] = selectedIds
      .map((productId) => {
        const product = availableProducts.find((p) => p.id === productId);
        if (!product) return null;
        const draft = drafts[productId] ?? ensureDraft(product);

        const quantity = Math.max(1, Number(draft.quantity) || 1);
        const baseUnitPrice = Math.max(0, Number(draft.unitPrice) || 0);
        const baseTotal = quantity * baseUnitPrice;

        let total = baseTotal;
        if (draft.isGift) {
          total = 0;
        } else {
          if ((Number(draft.discountPercent) || 0) > 0) {
            total = total * (1 - (Number(draft.discountPercent) || 0) / 100);
          }
          if ((Number(draft.discountAmount) || 0) > 0) {
            total = total - (Number(draft.discountAmount) || 0);
          }
          total = Math.max(0, total);
        }

        const description = draft.isGift
          ? `${draft.description || product.name} (Brinde)`
          : (draft.description || product.name);

        return {
          id: `item${Date.now()}${Math.random()}`,
          companyId: company?.id || product.companyId || '',
          proposalId: '',
          mediaUnitId: undefined,
          productId: product.id,
          description,
          startDate: draft.startDate,
          endDate: draft.endDate,
          quantity,
          unitPrice: baseUnitPrice,
          discountPercent: !draft.isGift && (Number(draft.discountPercent) || 0) > 0 ? Number(draft.discountPercent) : undefined,
          discountAmount: !draft.isGift && (Number(draft.discountAmount) || 0) > 0 ? Number(draft.discountAmount) : undefined,
          totalPrice: total,
          isGift: draft.isGift,
          createdAt: now,
          updatedAt: now,
        } as ProposalItem;
      })
      .filter(Boolean) as ProposalItem[];

    onAddItems(nextItems);
    onOpenChange(false);
  };

  const selectedCount = selectedIds.length;

  return (
    <Dialog open={open} onOpenChange={(nextOpen: boolean) => onOpenChange(nextOpen)}>
      <DialogContent
        style={{ width: '96vw', maxWidth: 'min(1320px, 96vw)', height: '90vh', maxHeight: '90vh' }}
        className="flex flex-col p-0 gap-0 overflow-hidden"
      >
        <DialogHeader className="px-6 py-4 border-b bg-white">
          <DialogTitle>Adicionar Produto/Serviço</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 border-b bg-gray-50/60 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2">
              <Button type="button" variant={segment === 'ALL' ? 'default' : 'outline'} size="sm" onClick={() => setSegment('ALL' as const)}>
                Todos
              </Button>
              <Button type="button" variant={segment === ProductType.PRODUTO ? 'default' : 'outline'} size="sm" onClick={() => setSegment(ProductType.PRODUTO as ProductType)}>
                Produto
              </Button>
              <Button type="button" variant={segment === ProductType.SERVICO ? 'default' : 'outline'} size="sm" onClick={() => setSegment(ProductType.SERVICO as ProductType)}>
                Serviço
              </Button>
            </div>

            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                placeholder="Buscar produto ou serviço"
              />
            </div>
          </div>

          <div className="text-sm text-gray-500">
            {loading ? 'Carregando itens...' : `${filteredProducts.length} item(ns) disponíveis para adicionar`}
          </div>
          {error ? <div className="text-sm text-red-600">Erro ao carregar produtos/serviços.</div> : null}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredProducts.map((product) => {
              const selected = selectedIds.includes(product.id);
              const draft = drafts[product.id] ?? ensureDraft(product);
              const qty = Math.max(1, Number(draft.quantity) || 1);
              const price = Math.max(0, Number(draft.unitPrice) || 0);
              const subtotal = draft.isGift ? 0 : qty * price;
              let finalTotal = subtotal;
              if (!draft.isGift) {
                if ((Number(draft.discountPercent) || 0) > 0) finalTotal = finalTotal * (1 - (Number(draft.discountPercent) || 0) / 100);
                if ((Number(draft.discountAmount) || 0) > 0) finalTotal = finalTotal - (Number(draft.discountAmount) || 0);
                finalTotal = Math.max(0, finalTotal);
              }

              return (
                <div
                  key={product.id}
                  className={`rounded-xl border transition-all ${
                    selected ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-gray-200 bg-white'
                  }`}
                >
                  <button
                    type="button"
                    className="w-full p-4 text-left"
                    onClick={() => toggleSelect(product)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-xl p-2 ${product.type === 'PRODUTO' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {product.type === 'PRODUTO' ? <Package className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-gray-900">{product.name}</h3>
                            <Badge variant="outline">{product.type === 'PRODUTO' ? 'Produto' : 'Serviço'}</Badge>
                            {product.category ? <Badge variant="outline">{product.category}</Badge> : null}
                            {selected ? <Badge className="bg-indigo-600">Selecionado</Badge> : null}
                          </div>
                          {product.description ? (
                            <p className="line-clamp-2 text-sm text-gray-600">{product.description}</p>
                          ) : null}
                          <div className="text-sm font-medium text-indigo-700">{formatCurrency(Number(product.basePrice) || 0)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox checked={selected} />
                        {draft.expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </div>
                  </button>

                  {selected && draft.expanded ? (
                    <div className="border-t bg-white px-4 py-4 space-y-4">
                      <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <div className="flex items-center gap-2 text-sm text-amber-800">
                          <Gift className="h-4 w-4" />
                          Adicionar como brinde
                        </div>
                        <Checkbox
                          checked={draft.isGift}
                          onCheckedChange={(v: boolean | 'indeterminate') => updateDraft(product.id, { isGift: v === true })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Descrição na proposta</Label>
                        <Textarea
                          rows={2}
                          value={draft.description}
                          onChange={(e) => updateDraft(product.id, { description: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Data de início</Label>
                          <Input
                            type="date"
                            value={draft.startDate ? draft.startDate.toISOString().split('T')[0] : ''}
                            onChange={(e) => updateDraft(product.id, { startDate: e.target.value ? parseLocalDate(e.target.value) : undefined })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Data de término</Label>
                          <Input
                            type="date"
                            value={draft.endDate ? draft.endDate.toISOString().split('T')[0] : ''}
                            onChange={(e) => updateDraft(product.id, { endDate: e.target.value ? parseLocalDate(e.target.value) : undefined })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Quantidade</Label>
                          <Input
                            type="number"
                            min="1"
                            value={draft.quantity}
                            onChange={(e) => updateDraft(product.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Preço unitário</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft.unitPrice}
                            disabled={draft.isGift}
                            onChange={(e) => updateDraft(product.id, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Desconto em %</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={draft.isGift || !!draft.discountAmount}
                            value={draft.discountPercent || 0}
                            onChange={(e) => {
                              const next = Math.max(0, parseFloat(e.target.value) || 0);
                              updateDraft(product.id, { discountPercent: next, discountAmount: next > 0 ? 0 : draft.discountAmount });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Desconto em R$</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={draft.isGift || !!draft.discountPercent}
                            value={draft.discountAmount || 0}
                            onChange={(e) => {
                              const next = Math.max(0, parseFloat(e.target.value) || 0);
                              updateDraft(product.id, { discountAmount: next, discountPercent: next > 0 ? 0 : draft.discountPercent });
                            }}
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-indigo-900">Total do item</span>
                          <span className="font-medium text-indigo-900">{formatCurrency(finalTotal)}</span>
                        </div>
                        <div className="mt-1 text-xs text-indigo-700">
                          {draft.isGift ? 'Item marcado como brinde (R$ 0,00).' : `${qty} x ${formatCurrency(price)}`}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {!loading && !filteredProducts.length ? (
            <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500">
              Nenhum produto/serviço disponível para adicionar.
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-500">
              {selectedCount > 0 ? `${selectedCount} item(ns) selecionado(s)` : 'Selecione um ou mais itens'}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} disabled={!selectedCount}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar selecionados
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
