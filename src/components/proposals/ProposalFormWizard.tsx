import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Proposal } from '../../types';

interface ProposalFormWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Proposal | null;
  onSave: (proposalData: Partial<Proposal>) => void;
}

export function ProposalFormWizard({
  open,
  onOpenChange,
  proposal,
  onSave,
}: ProposalFormWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);

  const handleClose = () => {
    setStep(1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {proposal ? 'Editar Proposta' : 'Nova Proposta'} - Passo {step} de 2
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {step === 1 && (
            <div className="space-y-6">
              <p className="text-center text-gray-500">
                {/* TODO: Implementar Passo 1 - Dados Gerais */}
                Passo 1: Dados Gerais (Cliente, Responsável, Título, Condições, Validade, Desconto)
              </p>
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button onClick={() => setStep(2)}>
                  Próximo
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <p className="text-center text-gray-500">
                {/* TODO: Implementar Passo 2 - Itens da Proposta */}
                Passo 2: Itens da Proposta (ProposalItemsEditor)
              </p>
              <div className="flex justify-between gap-3 pt-6 border-t">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // TODO: Salvar como rascunho
                      console.log('Salvar rascunho');
                      handleClose();
                    }}
                  >
                    Salvar Rascunho
                  </Button>
                  <Button
                    onClick={() => {
                      // TODO: Salvar e enviar
                      console.log('Salvar e enviar');
                      handleClose();
                    }}
                  >
                    Salvar e Enviar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
