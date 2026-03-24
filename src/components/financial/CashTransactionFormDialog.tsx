import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { CashTransaction, CashFlowType, PaymentType, PaymentMethod } from '../../types';
import { parseDateFromHtmlInput } from '../../lib/dateUtils';
import { useTransactionCategories } from '../../hooks/useTransactionCategories';
import { Dialog as InnerDialog, DialogContent as InnerDialogContent, DialogHeader as InnerDialogHeader, DialogTitle as InnerDialogTitle, DialogDescription as InnerDialogDescription } from '../ui/dialog';
import { toast } from 'sonner';
import { useMediaPoints } from '../../hooks/useMediaPoints';
import { Checkbox } from '../ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';

interface CashTransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: CashTransaction | null;
  onSave: (data: Partial<CashTransaction>) => void;
}

export function CashTransactionFormDialog({ open, onOpenChange, transaction, onSave }: CashTransactionFormDialogProps) {
  const { categories, loading: categoriesLoading, error: categoriesError, createCategory } = useTransactionCategories();
  const { mediaPoints } = useMediaPoints({});

  const isEditing = Boolean(transaction);
  const isRecurringInstance = Boolean(transaction?.isRecurringInstance);

  const [formData, setFormData] = useState({
    flowType: CashFlowType.RECEITA,
    date: new Date().toISOString().slice(0, 10),
    // Recorrência mensal
    isRecurring: false,
    recurringUntil: '',

    // Vencimento (quando usar 1 ponto no modo edição)
    dueDate: '',
    amount: '',
    description: '',
    partnerName: '',
    categoryId: '',
    tags: '',
    paymentType: PaymentType.A_VISTA,
    paymentMethod: undefined as PaymentMethod | undefined,
    isPaid: true,
    billingInvoiceId: '',
    mediaPointId: '', // Ponto de mídia vinculado (modo edição)
  });

  type MediaPointLink = { key: string; mediaPointId: string; dueDate: string };
  const [mediaLinks, setMediaLinks] = useState<MediaPointLink[]>([]);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addCategoryName, setAddCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [addCategoryError, setAddCategoryError] = useState<string | null>(null);

  const usedMediaPointIds = useMemo(() => {
    return new Set(mediaLinks.map((l) => l.mediaPointId).filter((id) => id && id !== 'none'));
  }, [mediaLinks]);

  useEffect(() => {
    if (transaction) {
      setFormData({
        flowType: transaction.flowType,
        date: new Date(transaction.date).toISOString().slice(0, 10),
        isRecurring: Boolean(transaction.isRecurring),
        recurringUntil: transaction.recurringUntil ? String(transaction.recurringUntil).slice(0, 10) : '',
        dueDate: transaction.dueDate ? String(transaction.dueDate).slice(0, 10) : '',
        amount: String(transaction.amount ?? ''),
        description: transaction.description,
        partnerName: transaction.partnerName || '',
        categoryId: transaction.categoryId || '',
        tags: transaction.tags?.join(', ') || '',
        paymentType: transaction.paymentType || PaymentType.A_VISTA,
        paymentMethod: transaction.paymentMethod,
        isPaid: transaction.isPaid,
        billingInvoiceId: transaction.billingInvoiceId || '',
        mediaPointId: transaction.mediaPointId || '',
      });

      // Para edição, mantemos 1 ponto; para criação, usamos a lista.
      if (transaction.mediaPointId) {
        setMediaLinks([{ key: '0', mediaPointId: transaction.mediaPointId, dueDate: transaction.dueDate ? String(transaction.dueDate).slice(0, 10) : '' }]);
      } else {
        setMediaLinks([]);
      }
    } else {
      setFormData({
        flowType: CashFlowType.RECEITA,
        date: '',
        isRecurring: false,
        recurringUntil: '',
        dueDate: '',
        amount: '',
        description: '',
        partnerName: '',
        categoryId: '',
        tags: '',
        paymentType: PaymentType.A_VISTA,
        paymentMethod: undefined,
        isPaid: true,
        billingInvoiceId: '',
        mediaPointId: '',
      });

      setMediaLinks([]);
    }
  }, [transaction]);

  const addMediaLink = () => {
    setMediaLinks((prev) => [...prev, { key: `${Date.now()}_${prev.length}`, mediaPointId: 'none', dueDate: '' }]);
  };

  const removeMediaLink = (key: string) => {
    setMediaLinks((prev) => prev.filter((l) => l.key !== key));
  };

  const updateMediaLink = (key: string, next: Partial<MediaPointLink>) => {
    setMediaLinks((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;

        if (next.mediaPointId && next.mediaPointId !== 'none' && usedMediaPointIds.has(next.mediaPointId) && next.mediaPointId !== l.mediaPointId) {
          return l; // evita duplicidade
        }
        return { ...l, ...next };
      }),
    );
  };

  const handleAddCategory = async () => {
    const name = addCategoryName.trim();
    if (!name) {
      setAddCategoryError('Informe o nome da categoria.');
      return;
    }
    try {
      setIsAddingCategory(true);
      setAddCategoryError(null);
      const created = await createCategory({ name });
      setFormData((prev) => ({ ...prev, categoryId: created.id }));
      setAddCategoryOpen(false);
      setAddCategoryName('');
      toast.success('Categoria criada com sucesso.');
    } catch (err: any) {
      setAddCategoryError(err?.response?.data?.message || err?.message || 'Não foi possível criar a categoria.');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleSave = () => {
    // Validação básica
    if (!formData.date) {
      alert('Data é obrigatória');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Valor deve ser maior que zero');
      return;
    }

    if (!formData.description.trim()) {
      alert('Descrição é obrigatória');
      return;
    }

    // Payload parcial para criação/edição
    const payload: Partial<CashTransaction> = {
      date: parseDateFromHtmlInput(formData.date),
      description: formData.description,
      partnerName: formData.partnerName || undefined,
      categoryId: formData.categoryId || undefined,
      tags: formData.tags ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      amount: parseFloat(formData.amount),
      flowType: formData.flowType,
      paymentType: formData.paymentType,
      paymentMethod: formData.paymentMethod,
      isPaid: formData.isRecurring ? false : Boolean(formData.isPaid),
      billingInvoiceId: formData.billingInvoiceId || undefined,
      isRecurring: formData.isRecurring,
      recurringUntil: formData.isRecurring && formData.recurringUntil ? formData.recurringUntil : undefined,
    };

    // Se for uma instância recorrente (virtual), não enviamos 'date' para evitar mudar a data inicial da série.
    if (isRecurringInstance) {
      delete (payload as any).date;
      delete (payload as any).isRecurring;
      delete (payload as any).recurringUntil;
    }

    // Media points:
    // - edição: suporta 1 ponto (mediaPointId + dueDate)
    // - criação: suporta múltiplos (mediaPoints[])
    if (isEditing) {
      payload.mediaPointId = formData.mediaPointId && formData.mediaPointId !== 'none' ? formData.mediaPointId : undefined;
      payload.dueDate = formData.dueDate ? formData.dueDate : undefined;
    } else {
      const links = mediaLinks
        .map((l) => ({ mediaPointId: l.mediaPointId, dueDate: l.dueDate }))
        .filter((l) => l.mediaPointId && l.mediaPointId !== 'none');

      if (links.length === 1) {
        payload.mediaPointId = links[0].mediaPointId;
        payload.dueDate = links[0].dueDate || undefined;
      } else if (links.length > 1) {
        (payload as any).mediaPoints = links.map((l) => ({ mediaPointId: l.mediaPointId, dueDate: l.dueDate || undefined }));
      }
    }

    onSave(payload);

    // Resetar formulário
    setFormData({
      flowType: CashFlowType.RECEITA,
      date: '',
      isRecurring: false,
      recurringUntil: '',
      dueDate: '',
      amount: '',
      description: '',
      partnerName: '',
      categoryId: '',
      tags: '',
      paymentType: PaymentType.A_VISTA,
      paymentMethod: undefined,
      isPaid: true,
      billingInvoiceId: '',
      mediaPointId: '',
    });

    setMediaLinks([]);
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Resetar formulário ao cancelar
    setFormData({
      flowType: CashFlowType.RECEITA,
      date: '',
      isRecurring: false,
      recurringUntil: '',
      dueDate: '',
      amount: '',
      description: '',
      partnerName: '',
      categoryId: '',
      tags: '',
      paymentType: PaymentType.A_VISTA,
      paymentMethod: undefined,
      isPaid: true,
      billingInvoiceId: '',
      mediaPointId: '',
    });

    setMediaLinks([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        FIX (scroll): when Radix Dialog is open, the body scroll is locked.
        If the dialog content grows beyond the viewport and doesn't have its own overflow,
        you end up with *no scroll at all*.
        
        We solve it by making DialogContent itself scrollable (max-h + overflow-y-auto)
        and keeping the footer sticky so action buttons remain accessible.
      */}
      <DialogContent
        className="overflow-hidden p-0 gap-0"
        style={{
          width: 'min(900px, calc(100vw - 2rem))',
          maxWidth: 'min(900px, calc(100vw - 2rem))',
          height: 'min(82vh, 820px)',
          maxHeight: 'calc(100vh - 2rem)',
        }}
      >
        <div className="shrink-0 border-b px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle>{transaction ? 'Editar Transação' : 'Nova Transação (CashTransaction)'}</DialogTitle>
            <DialogDescription>Insira os detalhes da transação financeira.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4 pb-4">
          <div className="space-y-2">
            <Label>Tipo de Transação (flowType) *</Label>
            <Select
              value={formData.flowType}
              onValueChange={(value: string) => setFormData({ ...formData, flowType: value as CashFlowType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CashFlowType.RECEITA}>Receita</SelectItem>
                <SelectItem value={CashFlowType.DESPESA}>Despesa</SelectItem>
                <SelectItem value={CashFlowType.PESSOAS}>Pessoas (Folha)</SelectItem>
                <SelectItem value={CashFlowType.IMPOSTO}>Imposto</SelectItem>
                <SelectItem value={CashFlowType.TRANSFERENCIA}>Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, date: e.target.value })}
                disabled={isRecurringInstance}
              />

              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  checked={formData.isRecurring}
                  onCheckedChange={(checked: boolean | 'indeterminate') => {
                    const on = Boolean(checked);
                    setFormData((prev) => ({
                      ...prev,
                      isRecurring: on,
                      // Recorrente sempre inicia como não pago
                      isPaid: on ? false : prev.isPaid,
                      recurringUntil: on ? prev.recurringUntil : '',
                    }));
                  }}
                  disabled={isRecurringInstance}
                />
                <Label className="cursor-pointer">Recorrente (mensal)</Label>
              </div>

              {formData.isRecurring && !isRecurringInstance && (
                <div className="pt-2 space-y-2">
                  <Label>Recorrente até (opcional)</Label>
                  <Input
                    type="date"
                    value={formData.recurringUntil}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, recurringUntil: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">Se vazio, repete indefinidamente.</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input
              placeholder="Ex: Pagamento de campanha"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Parceiro (partnerName)</Label>
            <Input
              placeholder="Nome do cliente ou fornecedor"
              value={formData.partnerName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, partnerName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Categoria (categoryId)</Label>
                <Button type="button" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setAddCategoryError(null); setAddCategoryOpen(true); }}>
                  + Adicionar
                </Button>
              </div>
              <Select
                value={formData.categoryId || undefined}
                onValueChange={(value: string) => { if (value === '__add__') { setAddCategoryError(null); setAddCategoryOpen(true); return; } setFormData({ ...formData, categoryId: value }); }}
              >

                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesLoading && (
                    <SelectItem value="__loading" disabled>
                      Carregando categorias...
                    </SelectItem>
                  )}

                  {!categoriesLoading && categories.length === 0 && (
                    <SelectItem value="__empty" disabled>
                      {categoriesError ? `Erro ao carregar: ${categoriesError}` : 'Nenhuma categoria cadastrada'}
                    </SelectItem>
                  )}
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__add__">+ Adicionar nova categoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                placeholder="Ex: campanha, março, urgente"
                value={formData.tags}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Pagamento (paymentType)</Label>
              <Select
                value={formData.paymentType}
                onValueChange={(value: string) => setFormData({ ...formData, paymentType: value as PaymentType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentType.A_VISTA}>À vista</SelectItem>
                  <SelectItem value={PaymentType.PARCELADO}>Parcelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modo de Pagamento (paymentMethod)</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value: string) => setFormData({ ...formData, paymentMethod: value as PaymentMethod })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentMethod.PIX}>PIX</SelectItem>
                  <SelectItem value={PaymentMethod.BOLETO}>Boleto</SelectItem>
                  <SelectItem value={PaymentMethod.CARTAO}>Cartão</SelectItem>
                  <SelectItem value={PaymentMethod.TRANSFERENCIA}>Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.isPaid}
              onCheckedChange={(checked: boolean | 'indeterminate') => setFormData({ ...formData, isPaid: Boolean(checked) })}
              disabled={formData.isRecurring || isRecurringInstance}
            />
            <Label className="cursor-pointer">
              Já foi pago (isPaid)
            </Label>
            {formData.isRecurring && (
              <span className="text-xs text-gray-500">(bloqueado para transações recorrentes)</span>
            )}
          </div>

          {/* NOVOS CAMPOS: Ponto de Mídia e Data de Vencimento */}
          <div className="p-3 bg-blue-50 rounded-lg space-y-3">
            <p className="text-sm text-blue-900">
              💡 Para despesas de pontos de mídia (energia, taxa DER, aluguel), vincule o ponto e defina o vencimento:
            </p>

            {isEditing ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ponto de Mídia (opcional)</Label>
                    <Select
                      value={formData.mediaPointId}
                      onValueChange={(value: string) => setFormData({ ...formData, mediaPointId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o ponto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {mediaPoints.map((point) => (
                          <SelectItem key={point.id} value={point.id}>
                            {point.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Use para despesas como energia, taxa DER, aluguel de área
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Data de Vencimento (opcional)</Label>
                    <Input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">Data de vencimento da taxa/despesa</p>
                  </div>
                </div>

                {!isRecurringInstance && (
                  <p className="text-xs text-gray-500">
                    Para vincular múltiplos pontos, crie uma nova transação.
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-3">
                {mediaLinks.length === 0 ? (
                  <p className="text-xs text-gray-500">Nenhum ponto de mídia vinculado.</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto pr-2">
                    <div className="space-y-3">
                      {mediaLinks.map((link, idx) => (
                        <div key={link.key} className="grid grid-cols-2 gap-4 items-end">
                          <div className="space-y-2">
                            <Label>{idx === 0 ? 'Ponto de Mídia (opcional)' : 'Ponto de Mídia'}</Label>
                            <Select
                              value={link.mediaPointId}
                              onValueChange={(value: string) => updateMediaLink(link.key, { mediaPointId: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o ponto" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                {mediaPoints.map((point) => (
                                  <SelectItem
                                    key={point.id}
                                    value={point.id}
                                    disabled={usedMediaPointIds.has(point.id) && point.id !== link.mediaPointId}
                                  >
                                    {point.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-end gap-2">
                            <div className="flex-1 space-y-2">
                              <Label>Data de Vencimento (opcional)</Label>
                              <Input
                                type="date"
                                value={link.dueDate}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMediaLink(link.key, { dueDate: e.target.value })}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeMediaLink(link.key)}
                              title="Remover ponto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addMediaLink}>
                    <Plus className="w-4 h-4" />
                    Adicionar ponto
                  </Button>
                  <p className="text-xs text-gray-500">
                    Você pode vincular múltiplos pontos, cada um com seu vencimento.
                  </p>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>

        <div className="shrink-0 border-t bg-background px-6 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
          <Button onClick={handleSave}>{transaction ? 'Salvar Alterações' : 'Salvar Transação'}</Button>
        </div>
      </DialogContent>

      <InnerDialog
        open={addCategoryOpen}
        onOpenChange={(v: boolean) => {
          setAddCategoryOpen(v);
          if (!v) setAddCategoryError(null);
        }}
      >
        <InnerDialogContent>
          <InnerDialogHeader>
            <InnerDialogTitle>Adicionar categoria</InnerDialogTitle>
            <InnerDialogDescription>Cadastre uma nova categoria para usar no Financeiro.</InnerDialogDescription>
          </InnerDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da categoria *</Label>
              <Input value={addCategoryName} onChange={(e) => setAddCategoryName(e.target.value)} placeholder="Ex.: Aluguel, Energia, DER" />
            </div>
            {addCategoryError && <p className="text-sm text-red-600">{addCategoryError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddCategoryOpen(false)} disabled={isAddingCategory}>Cancelar</Button>
              <Button type="button" onClick={handleAddCategory} disabled={isAddingCategory}>{isAddingCategory ? 'Salvando...' : 'Adicionar'}</Button>
            </div>
          </div>
        </InnerDialogContent>
      </InnerDialog>

    </Dialog>
  );
}