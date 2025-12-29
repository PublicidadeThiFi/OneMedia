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
  onSave: (proposalData: Partial<Proposal>) => Promise<boolean>;
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
    endDate: formData.campaignEndDate?.toISOString(),
    validUntil: formData.validUntil?.toISOString(),
    discountPercent: Number(formData.discountPercent || 0),
    discountAmount: Number(formData.discountAmount || 0),
    conditionsText: formData.conditionsText,
    items: formData.items.map(item => ({
      mediaUnitId: item.mediaUnitId,
      productId: item.productId,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      // Datas dos itens também devem ser strings ISO
      startDate: item.startDate ? new Date(item.startDate).toISOString() : undefined,
      endDate: item.endDate ? new Date(item.endDate).toISOString() : undefined,
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
