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
  onSave: (proposalData: Partial<Proposal>) => Promise<void> | void;
  onNavigate: (page: Page) => void;
}

export interface ProposalFormData {
  // Passo 1
  clientId: string;
  responsibleUserId: string;
  title?: string;
  campaignStartDate?: Date;
  campaignEndDate?: Date;
  validUntil?: Date;
  conditionsText?: string;
  discountPercent?: number;
  discountAmount?: number;
  
  // Passo 2
  items: ProposalItem[];
  
  // Calculados
  subtotal: number;
  totalAmount: number;
}

export function ProposalFormWizard({
  open,
  onOpenChange,
  proposal,
  onSave,
  onNavigate,
}: ProposalFormWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProposalFormData>({
    clientId: '',
    responsibleUserId: '',
    title: '',
    validUntil: undefined,
    conditionsText: '',
    discountPercent: 0,
    discountAmount: 0,
    items: [],
    subtotal: 0,
    totalAmount: 0,
  });

  const [step1Valid, setStep1Valid] = useState(false);

  // Carregar dados da proposta ao editar
  useEffect(() => {
    if (proposal && open) {
      setFormData({
        clientId: proposal.clientId,
        responsibleUserId: proposal.responsibleUserId,
        title: proposal.title || '',
        campaignStartDate: (proposal as any).startDate ? new Date((proposal as any).startDate) : undefined,
        campaignEndDate: (proposal as any).endDate ? new Date((proposal as any).endDate) : undefined,
        validUntil: proposal.validUntil ? new Date(proposal.validUntil) : undefined,
        conditionsText: (proposal.conditionsText || '').replace(/\\n/g, '\n'),
        discountPercent: proposal.discountPercent || 0,
        discountAmount: proposal.discountAmount || 0,
        items: proposal.items || [],
        subtotal: toNumber(proposal.totalAmount, 0),
        totalAmount: toNumber(proposal.totalAmount, 0),
      });
    } else if (!proposal && open) {
      // Reset para nova proposta
      setFormData({
        clientId: '',
        responsibleUserId: '',
        title: '',
        validUntil: undefined,
        conditionsText: '',
        discountPercent: 0,
        discountAmount: 0,
        items: [],
        subtotal: 0,
        totalAmount: 0,
      });
      setStep(1);
    }
  }, [proposal, open]);

  // Atualizar dados do Passo 1
  const handleStep1Change = (data: Partial<ProposalFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  // Atualizar dados do Passo 2
  const handleStep2Change = (items: ProposalItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + toNumber(item.totalPrice, 0), 0);
    
    let finalTotal = subtotal;
    const discountAmount = toNumber(formData.discountAmount, 0);
    const discountPercent = toNumber(formData.discountPercent, 0);
    if (discountAmount > 0) {
      finalTotal = subtotal - discountAmount;
    } else if (discountPercent > 0) {
      finalTotal = subtotal - (subtotal * discountPercent / 100);
    }

    setFormData(prev => ({
      ...prev,
      items,
      subtotal,
      totalAmount: Math.max(0, finalTotal),
    }));
  };

  const handleClose = () => {
    // Evita fechar enquanto estiver salvando (pra não parecer que salvou quando falhou)
    if (saving) return;
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

  const handleSaveDraft = async () => {
    const proposalData: Partial<Proposal> = {
      clientId: formData.clientId,
      responsibleUserId: formData.responsibleUserId,
      title: formData.title,
      startDate: formData.campaignStartDate,
      endDate: formData.campaignEndDate,
      status: ProposalStatus.RASCUNHO,
      validUntil: formData.validUntil,
      conditionsText: formData.conditionsText,
      // Não envia 0 para evitar constraints no BD (0 = “sem desconto”)
      discountPercent: formData.discountPercent && formData.discountPercent > 0 ? formData.discountPercent : undefined,
      discountAmount: formData.discountAmount && formData.discountAmount > 0 ? formData.discountAmount : undefined,
      items: formData.items,
    };

    try {
      setSaving(true);
      await Promise.resolve(onSave(proposalData));
      // Fechamento é controlado pelo componente pai em caso de sucesso.
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndSend = async () => {
    const proposalData: Partial<Proposal> = {
      clientId: formData.clientId,
      responsibleUserId: formData.responsibleUserId,
      title: formData.title,
      startDate: formData.campaignStartDate,
      endDate: formData.campaignEndDate,
      status: ProposalStatus.ENVIADA,
      validUntil: formData.validUntil,
      conditionsText: formData.conditionsText,
      discountPercent: formData.discountPercent && formData.discountPercent > 0 ? formData.discountPercent : undefined,
      discountAmount: formData.discountAmount && formData.discountAmount > 0 ? formData.discountAmount : undefined,
      items: formData.items,
    };

    try {
      setSaving(true);
      await Promise.resolve(onSave(proposalData));
    } finally {
      setSaving(false);
    }
  };

  const progress = step === 1 ? 50 : 100;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) handleClose();
        else onOpenChange(true);
      }}
    >
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
            />
          )}
        </div>

        {/* Rodapé com botões */}
        <div className="border-t px-6 py-4 bg-gray-50">
          {step === 1 && (
            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={handleClose} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleNext} disabled={!step1Valid || saving}>
                Próximo
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="flex justify-between gap-3">
              <Button variant="ghost" onClick={handleBack} disabled={saving}>
                Voltar
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
                  Salvar Rascunho
                </Button>
                <Button onClick={handleSaveAndSend} disabled={saving || formData.items.length === 0}>
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
