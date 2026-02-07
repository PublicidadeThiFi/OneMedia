import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Proposal, ProposalStatus, ProposalItem } from '../../types';
import { ProposalStep1General } from './ProposalStep1General';
import { ProposalStep2Items } from './ProposalStep2Items';
import { Progress } from '../ui/progress';
import type { Page } from '../MainApp';
import { toNumber } from '../../lib/number';

interface ProposalFormWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Proposal | null;
  initialMediaPointId?: string | null;
  initialMediaPointIds?: string[] | null;
  onSave: (proposalData: Partial<Proposal>) => Promise<boolean>;
  onNavigate: (page: Page) => void;
}

export interface ProposalFormData {
  // Passo 1
  clientId: string;
  responsibleUserId: string;
  title?: string;
  campaignStartDate?: Date;
  validUntil?: Date;
  conditionsText?: string;
  discountPercent?: number;
  discountAmount?: number;

  // Passo 2 (novo fluxo)
  assemblyMaxDays?: number;
  
  // Passo 2
  items: ProposalItem[];
  
  // Calculados
  subtotal: number;
  totalAmount: number;
}

function parseApiDateToLocalMidnight(value: any): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value as any);
  if (Number.isNaN(d.getTime())) return undefined;
  // Pegamos apenas a parte YYYY-MM-DD (UTC) e forçamos meia-noite LOCAL.
  // Assim evitamos o bug de "-1 dia" em timezones negativos.
  const datePart = d.toISOString().split('T')[0];
  const local = new Date(`${datePart}T00:00:00`);
  return Number.isNaN(local.getTime()) ? undefined : local;
}

function defaultValidUntil(days = 7): Date {
  // Usa meia-noite LOCAL para o campo do input.
  // Importante: isso é só UX (preenchimento inicial). O backend continua sendo a fonte de verdade.
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function calculateTotals(
  items: ProposalItem[],
  discountAmountRaw: any,
  discountPercentRaw: any,
) {
  const subtotal = (items ?? []).reduce((sum, item) => sum + toNumber((item as any).totalPrice, 0), 0);

  const discountAmount = toNumber(discountAmountRaw, 0);
  const discountPercent = toNumber(discountPercentRaw, 0);

  let finalTotal = subtotal;
  if (discountAmount > 0) {
    finalTotal = subtotal - discountAmount;
  } else if (discountPercent > 0) {
    finalTotal = subtotal - (subtotal * discountPercent) / 100;
  }

  return {
    subtotal,
    totalAmount: Math.max(0, finalTotal),
  };
}

export function ProposalFormWizard({
  open,
  onOpenChange,
  proposal,
  initialMediaPointId,
  initialMediaPointIds,
  onSave,
  onNavigate,
}: ProposalFormWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [prefillMediaPointId, setPrefillMediaPointId] = useState<string | null>(null);
  const [prefillMediaPointIds, setPrefillMediaPointIds] = useState<string[] | null>(null);
  const [formData, setFormData] = useState<ProposalFormData>({
    clientId: '',
    responsibleUserId: '',
    title: '',
    validUntil: undefined,
    conditionsText: '',
    discountPercent: 0,
    discountAmount: 0,
    assemblyMaxDays: undefined,
    items: [],
    subtotal: 0,
    totalAmount: 0,
  });

  const [step1Valid, setStep1Valid] = useState(false);

  // Carregar dados da proposta ao editar
  useEffect(() => {
    if (proposal && open) {
      const rawItems = ((proposal as any).items ?? []) as any[];
      const items: ProposalItem[] = rawItems.map((it: any) => ({
        ...it,
        quantity: toNumber(it.quantity, 1),
        unitPrice: toNumber(it.unitPrice, 0),
        totalPrice: toNumber(it.totalPrice, 0),
        occupationDays: it.occupationDays ?? undefined,
        clientProvidesBanner: it.clientProvidesBanner ?? undefined,
        priceMonthSnapshot: it.priceMonthSnapshot ?? undefined,
        priceBiweeklySnapshot: it.priceBiweeklySnapshot ?? undefined,
        productionCostSnapshot: it.productionCostSnapshot ?? undefined,
        installationCostSnapshot: it.installationCostSnapshot ?? undefined,
        rentTotalSnapshot: it.rentTotalSnapshot ?? undefined,
        upfrontTotalSnapshot: it.upfrontTotalSnapshot ?? undefined,
        startDate: parseApiDateToLocalMidnight(it.startDate),
        endDate: parseApiDateToLocalMidnight(it.endDate),
      }));

      const discountPercent = toNumber((proposal as any).discountPercent, 0);
      const discountAmount = toNumber((proposal as any).discountAmount, 0);
      const totals = calculateTotals(items, discountAmount, discountPercent);

      setFormData({
        clientId: proposal.clientId,
        responsibleUserId: proposal.responsibleUserId,
        title: proposal.title || '',
        campaignStartDate: parseApiDateToLocalMidnight((proposal as any).startDate),
        validUntil: parseApiDateToLocalMidnight((proposal as any).validUntil),
        conditionsText: (proposal.conditionsText || '').replace(/\\n/g, '\n'),
        discountPercent,
        discountAmount,
        assemblyMaxDays: (proposal as any).assemblyMaxDays ?? undefined,
        items,
        subtotal: totals.subtotal,
        totalAmount: totals.totalAmount,
      });
    } else if (!proposal && open) {      // Reset para nova proposta
      const ids = (initialMediaPointIds && initialMediaPointIds.length)
        ? initialMediaPointIds
        : (initialMediaPointId ? [initialMediaPointId] : []);
      setPrefillMediaPointIds(ids.length ? ids : null);
      setPrefillMediaPointId(ids[0] ?? null);
      setFormData({
        clientId: '',
        responsibleUserId: '',
        title: '',
        validUntil: defaultValidUntil(7),
        conditionsText: '',
        discountPercent: 0,
        discountAmount: 0,
        assemblyMaxDays: undefined,
        items: [],
        subtotal: 0,
        totalAmount: 0,
      });
      setStep(1);
    }
  }, [proposal, open, initialMediaPointId, initialMediaPointIds]);

  // Atualizar dados do Passo 1
  const handleStep1Change = (data: Partial<ProposalFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  // Atualizar dados do Passo 2
  const handleStep2Change = (items: ProposalItem[]) => {
    setFormData((prev) => {
      const totals = calculateTotals(items, prev.discountAmount, prev.discountPercent);
      return {
        ...prev,
        items,
        subtotal: totals.subtotal,
        totalAmount: totals.totalAmount,
      };
    });
  };

  const handleStep2MetaChange = (data: Partial<ProposalFormData>) => {
    setFormData((prev) => {
      const nextDiscountPercent = data.discountPercent ?? prev.discountPercent;
      const nextDiscountAmount = data.discountAmount ?? prev.discountAmount;
      const totals = calculateTotals(prev.items, nextDiscountAmount, nextDiscountPercent);

      return {
        ...prev,
        ...data,
        subtotal: totals.subtotal,
        totalAmount: totals.totalAmount,
      };
    });
  };

  const handleClose = () => {
    setStep(1);
    onOpenChange(false);
  };

  const handleNext = () => {
    if (step === 1 && step1Valid) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

const preparePayload = (status: ProposalStatus) => {
  return {
    clientId: formData.clientId,
    responsibleUserId: formData.responsibleUserId,
    title: formData.title,
    status: status,
    // Convertemos para string para o JSON, o 'any' evita o erro de tipagem no onSave
    startDate: formData.campaignStartDate?.toISOString(),
    validUntil: formData.validUntil?.toISOString(),
    assemblyMaxDays: formData.assemblyMaxDays ? Number(formData.assemblyMaxDays) : undefined,
    discountPercent: Number(formData.discountPercent || 0),
    discountAmount: Number(formData.discountAmount || 0),
    conditionsText: formData.conditionsText,
    items: formData.items.map(item => ({
      mediaUnitId: item.mediaUnitId,
      mediaPointOwnerId: item.mediaPointOwnerId ?? undefined,
      productId: item.productId,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountPercent: Number((item as any).discountPercent || 0),
      discountAmount: Number((item as any).discountAmount || 0),
      discountApplyTo: (item as any).discountApplyTo ?? "TOTAL",
      // Novo fluxo (midia)
      occupationDays: (item as any).occupationDays ?? undefined,
      clientProvidesBanner: (item as any).clientProvidesBanner ?? undefined,
      priceMonthSnapshot: (item as any).priceMonthSnapshot ?? undefined,
      priceBiweeklySnapshot: (item as any).priceBiweeklySnapshot ?? undefined,
      productionCostSnapshot: (item as any).productionCostSnapshot ?? undefined,
      installationCostSnapshot: (item as any).installationCostSnapshot ?? undefined,
      rentTotalSnapshot: (item as any).rentTotalSnapshot ?? undefined,
      upfrontTotalSnapshot: (item as any).upfrontTotalSnapshot ?? undefined,
      // Datas dos itens continuam apenas para produtos/servicos (ou modo legado)
      startDate:
        item.productId || !(item as any).occupationDays
          ? (item.startDate ? new Date(item.startDate).toISOString() : undefined)
          : undefined,
      endDate:
        item.productId || !(item as any).occupationDays
          ? (item.endDate ? new Date(item.endDate).toISOString() : undefined)
          : undefined,
    }))
  };
};

const handleSaveDraft = async () => {
  const payload = preparePayload('RASCUNHO' as ProposalStatus);
  // Usamos as any aqui para ignorar a restrição de 'Date' vs 'string' no momento do envio
  const success = await onSave(payload as any);
  if (success) onOpenChange(false);
};

const handleSaveAndSend = async () => {
  const payload = preparePayload('ENVIADA' as ProposalStatus);
  const success = await onSave(payload as any);
  if (success) onOpenChange(false);
};

  const progress = step === 1 ? 50 : 100;

  return (
    <Dialog open={open} onOpenChange={(nextOpen: boolean) => { if (!nextOpen) handleClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {proposal ? 'Editar Proposta' : 'Nova Proposta'}
          </DialogTitle>
          <DialogDescription>
            Passo {step} de 2 - {step === 1 ? 'Dados Gerais' : 'Itens da Proposta'}
          </DialogDescription>
        </DialogHeader>

        {/* Barra de progresso */}
        <div className="px-6">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 1 && (
            <ProposalStep1General
              formData={formData}
              onChange={handleStep1Change}
              onValidChange={setStep1Valid}
              onClose={handleClose}
              onNavigate={onNavigate}
            />
          )}

          {step === 2 && (
            <ProposalStep2Items
              formData={formData}
              onItemsChange={handleStep2Change}
              onMetaChange={handleStep2MetaChange}
              initialMediaPointId={prefillMediaPointId}
              initialMediaPointIds={prefillMediaPointIds}
            />
          )}
        </div>

        {/* Rodapé com botões */}
        <div className="border-t px-6 py-4 bg-gray-50">
          {step === 1 && (
            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleNext} disabled={!step1Valid}>
                Próximo
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="flex justify-between gap-3">
              <Button variant="ghost" onClick={handleBack}>
                Voltar
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleSaveDraft}>
                  Salvar Rascunho
                </Button>
                <Button onClick={handleSaveAndSend} disabled={formData.items.length === 0}>
                  Salvar e Enviar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
