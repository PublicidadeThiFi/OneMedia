import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Proposal, ProposalStatus, ProposalItem } from '../../types';
import { ProposalStep1General } from './ProposalStep1General';
import { ProposalStep2Items } from './ProposalStep2Items';
import { Progress } from '../ui/progress';
import { Page } from '../MainApp';

interface ProposalFormWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Proposal | null;
  onSave: (proposalData: Partial<Proposal>) => void;
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
    campaignStartDate: undefined,
    campaignEndDate: undefined,
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
        campaignStartDate: undefined, // TODO: pegar do primeiro item se houver
        campaignEndDate: undefined,
        validUntil: proposal.validUntil ? new Date(proposal.validUntil) : undefined,
        conditionsText: proposal.conditionsText || '',
        discountPercent: proposal.discountPercent || 0,
        discountAmount: proposal.discountAmount || 0,
        items: proposal.items || [],
        subtotal: proposal.totalAmount || 0,
        totalAmount: proposal.totalAmount || 0,
      });
    } else if (!proposal && open) {
      // Reset para nova proposta
      setFormData({
        clientId: '',
        responsibleUserId: '',
        title: '',
        campaignStartDate: undefined,
        campaignEndDate: undefined,
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
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    let finalTotal = subtotal;
    if (formData.discountAmount && formData.discountAmount > 0) {
      finalTotal = subtotal - formData.discountAmount;
    } else if (formData.discountPercent && formData.discountPercent > 0) {
      finalTotal = subtotal - (subtotal * formData.discountPercent / 100);
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

  const handleSaveDraft = () => {
    const proposalData: Partial<Proposal> = {
      clientId: formData.clientId,
      responsibleUserId: formData.responsibleUserId,
      title: formData.title,
      status: ProposalStatus.RASCUNHO,
      validUntil: formData.validUntil,
      conditionsText: formData.conditionsText,
      discountPercent: formData.discountPercent || undefined,
      discountAmount: formData.discountAmount || undefined,
      totalAmount: formData.totalAmount,
      items: formData.items,
    };

    onSave(proposalData);
    handleClose();
  };

  const handleSaveAndSend = () => {
    const proposalData: Partial<Proposal> = {
      clientId: formData.clientId,
      responsibleUserId: formData.responsibleUserId,
      title: formData.title,
      status: ProposalStatus.ENVIADA,
      validUntil: formData.validUntil,
      conditionsText: formData.conditionsText,
      discountPercent: formData.discountPercent || undefined,
      discountAmount: formData.discountAmount || undefined,
      totalAmount: formData.totalAmount,
      items: formData.items,
    };

    onSave(proposalData);
    handleClose();
  };

  const progress = step === 1 ? 50 : 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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