import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';

import { PromotionDiscountType } from '../types';
import {
  createPromotion,
  deletePromotion,
  fetchPromotions,
  fetchPromotionsMeta,
  updatePromotion,
  type PromotionRecord,
  type PromotionScope,
  type PromotionsMeta,
} from '../lib/promotionsApi';

type CheckedState = boolean | 'indeterminate';

function toMoney(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPromotion(p: PromotionRecord) {
  const val = Number(p.discountValue ?? 0);
  if (p.discountType === PromotionDiscountType.PERCENT) return `-${val}%`;
  return `-${toMoney(val)}`;
}

function dateToStartIso(dateStr: string) {
  // dateStr: YYYY-MM-DD
  return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
}
function dateToEndIso(dateStr: string) {
  return new Date(`${dateStr}T23:59:59.999Z`).toISOString();
}

function isoToDateInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // convert to YYYY-MM-DD
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function Promotions() {
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PromotionsMeta | null>(null);
  const [items, setItems] = useState<PromotionRecord[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionRecord | null>(null);

  const [scope, setScope] = useState<PromotionScope>('POINT');
  const [mediaPointId, setMediaPointId] = useState<string>('');
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [discountType, setDiscountType] = useState<PromotionDiscountType>(PromotionDiscountType.PERCENT);
  const [discountValue, setDiscountValue] = useState<string>('');
  const [startsAt, setStartsAt] = useState<string>('');
  const [endsAt, setEndsAt] = useState<string>('');
  const [showInMediaKit, setShowInMediaKit] = useState<boolean>(true);
  const [showInOutsideProposals, setShowInOutsideProposals] = useState<boolean>(false);

  const pointsById = useMemo(() => {
    const m = new Map<string, PromotionsMeta['points'][number]>();
    meta?.points?.forEach((p) => m.set(p.id, p));
    return m;
  }, [meta]);

  const currentPoint = mediaPointId ? pointsById.get(mediaPointId) : null;

  const grouped = useMemo(() => {
    const map = new Map<string, PromotionRecord[]>();
    for (const p of items) {
      const key = p.mediaPoint?.name ?? 'Sem ponto';
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const reload = async () => {
    setLoading(true);
    try {
      const [m, list] = await Promise.all([fetchPromotionsMeta(), fetchPromotions()]);
      setMeta(m);
      setItems(list);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(e);
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Erro ao carregar promoções');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditing(null);
    setScope('POINT');
    setMediaPointId('');
    setSelectedUnitIds([]);
    setDiscountType(PromotionDiscountType.PERCENT);
    setDiscountValue('');
    setStartsAt('');
    setEndsAt('');
    setShowInMediaKit(true);
    setShowInOutsideProposals(false);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (p: PromotionRecord) => {
    setEditing(p);
    setScope(p.mediaUnitId ? 'UNIT' : 'POINT');
    setMediaPointId(p.mediaPointId ?? p.mediaPoint?.id ?? '');
    setSelectedUnitIds(p.mediaUnitId ? [p.mediaUnitId] : []);
    setDiscountType(p.discountType);
    setDiscountValue(String(p.discountValue ?? ''));
    setStartsAt(isoToDateInput(p.startsAt));
    setEndsAt(isoToDateInput(p.endsAt));
    setShowInMediaKit(Boolean(p.showInMediaKit));
    setShowInOutsideProposals(Boolean(p.showInOutsideProposals));
    setOpen(true);
  };

  const onSubmit = async () => {
    try {
      const value = Number(String(discountValue).replace(',', '.'));
      if (!mediaPointId) {
        toast.error('Selecione um ponto');
        return;
      }
      if (!Number.isFinite(value) || value <= 0) {
        toast.error('Informe um valor de desconto válido');
        return;
      }
      if (discountType === PromotionDiscountType.PERCENT && value > 100) {
        toast.error('Percentual deve ser <= 100');
        return;
      }
      if (scope === 'UNIT' && selectedUnitIds.length === 0) {
        toast.error('Selecione ao menos 1 face');
        return;
      }

      const payload: any = {
        scope,
        mediaPointId,
        mediaUnitIds: scope === 'UNIT' ? selectedUnitIds : undefined,
        discountType,
        discountValue: value,
        startsAt: startsAt ? dateToStartIso(startsAt) : undefined,
        endsAt: endsAt ? dateToEndIso(endsAt) : undefined,
        showInMediaKit,
        showInOutsideProposals,
      };

      if (editing) {
        await updatePromotion(editing.id, {
          discountType,
          discountValue: value,
          startsAt: startsAt ? dateToStartIso(startsAt) : null,
          endsAt: endsAt ? dateToEndIso(endsAt) : null,
          showInMediaKit,
          showInOutsideProposals,
        });
        toast.success('Promoção atualizada');
      } else {
        const res = await createPromotion(payload);
        toast.success(res.created.length > 1 ? `Promoções criadas (${res.created.length})` : 'Promoção criada');
      }

      setOpen(false);
      resetForm();
      await reload();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(e);
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Erro ao salvar promoção');
    }
  };

  const onDelete = async (p: PromotionRecord) => {
    const ok = window.confirm('Excluir esta promoção?');
    if (!ok) return;

    try {
      await deletePromotion(p.id);
      toast.success('Promoção excluída');
      await reload();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(e);
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Erro ao excluir promoção');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Promoções</h1>
          <p className="text-sm text-gray-600 mt-1">Crie descontos por ponto ou por face (face sobrescreve o ponto).</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={reload} variant="outline">Atualizar</Button>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Nova promoção</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Carregando...</div>
      ) : (
        <div className="space-y-4">
          {grouped.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-gray-600">Nenhuma promoção cadastrada.</CardContent>
            </Card>
          ) : (
            grouped.map(([pointName, list]) => (
              <Card key={pointName} className="overflow-hidden">
                <CardHeader className="py-4">
                  <CardTitle className="text-base">{pointName}</CardTitle>
                </CardHeader>
                <CardContent className="pb-5">
                  <div className="space-y-3">
                    {list.map((p) => (
                      <div key={p.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border rounded-lg p-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{p.mediaUnitId ? `Face: ${p.mediaUnit?.label ?? p.mediaUnitId}` : 'Ponto inteiro'}</Badge>
                            <Badge>{formatPromotion(p)}</Badge>
                            {p.showInMediaKit && <Badge variant="outline">Mídia Kit</Badge>}
                            {p.showInOutsideProposals && <Badge variant="outline">Propostas fora do MK</Badge>}
                          </div>
                          <div className="mt-1 text-xs text-gray-600">
                            {p.startsAt || p.endsAt ? (
                              <>
                                {p.startsAt ? `De ${new Date(p.startsAt).toLocaleDateString('pt-BR')}` : 'Sem início'}
                                {p.endsAt ? ` até ${new Date(p.endsAt).toLocaleDateString('pt-BR')}` : ' (sem fim)'}
                              </>
                            ) : (
                              'Sem período (sempre ativa)'
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => onDelete(p)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v: boolean) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar promoção' : 'Nova promoção'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Aplicar em</Label>
              <Select value={scope} onValueChange={(v: string) => { setScope(v as PromotionScope); setSelectedUnitIds([]); }} disabled={!!editing}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POINT">Ponto inteiro</SelectItem>
                  <SelectItem value="UNIT">Faces específicas</SelectItem>
                </SelectContent>
              </Select>
              {editing && <p className="text-xs text-gray-500">(Alvo não pode ser alterado na edição)</p>}
            </div>

            <div className="space-y-2">
              <Label>Ponto</Label>
              <Select value={mediaPointId} onValueChange={(v: string) => { setMediaPointId(v); setSelectedUnitIds([]); }} disabled={!!editing}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um ponto" />
                </SelectTrigger>
                <SelectContent>
                  {(meta?.points ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.addressCity ? `— ${p.addressCity}/${p.addressState ?? ''}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {scope === 'UNIT' && (
              <div className="md:col-span-2 space-y-2">
                <Label>Faces</Label>
                <div className="border rounded-lg p-3 max-h-56 overflow-auto">
                  {currentPoint?.mediaUnits?.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {currentPoint.mediaUnits.map((u) => {
                        const checked = selectedUnitIds.includes(u.id);
                        return (
                          <label key={u.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v: CheckedState) => {
                                const next = Boolean(v);
                                setSelectedUnitIds((prev) =>
                                  next ? Array.from(new Set([...prev, u.id])) : prev.filter((id) => id !== u.id),
                                );
                              }}
                              disabled={!!editing}
                            />
                            <span className="truncate">{u.label}</span>
                            <span className="text-xs text-gray-500">({u.unitType})</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Selecione um ponto para listar as faces.</p>
                  )}
                </div>
                {editing && <p className="text-xs text-gray-500">(Faces não podem ser alteradas na edição)</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label>Tipo de desconto</Label>
              <Select value={discountType} onValueChange={(v: string) => setDiscountType(v as PromotionDiscountType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PromotionDiscountType.PERCENT}>Percentual (%)</SelectItem>
                  <SelectItem value={PromotionDiscountType.FIXED}>Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor</Label>
              <Input value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === PromotionDiscountType.PERCENT ? 'Ex.: 10' : 'Ex.: 200'} />
            </div>

            <div className="space-y-2">
              <Label>Início (opcional)</Label>
              <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Fim (opcional)</Label>
              <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={showInMediaKit} onCheckedChange={(v: CheckedState) => setShowInMediaKit(Boolean(v))} />
                <span>Aparecer como promoção no Mídia Kit</span>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={showInOutsideProposals} onCheckedChange={(v: CheckedState) => setShowInOutsideProposals(Boolean(v))} />
                <span>Aparecer como promoção ao criar proposta fora do Mídia Kit</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={onSubmit}>{editing ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
