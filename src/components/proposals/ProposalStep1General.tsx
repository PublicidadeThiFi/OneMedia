import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Plus } from 'lucide-react';
import type { ProposalFormData } from './proposal-form-types';
import { useTutorial } from '../../contexts/TutorialContext';
import { ClientSelect } from './ClientSelect';
import type { Page } from '../../types/app-page';

interface ProposalStep1GeneralProps {
  formData: ProposalFormData;
  onChange: (data: Partial<ProposalFormData>) => void;
  onValidChange: (valid: boolean) => void;
  onClose?: () => void;
  onNavigate?: (page: Page) => void;
}

export function ProposalStep1General({
  formData,
  onChange,
  onValidChange,
  onClose,
  onNavigate,
}: ProposalStep1GeneralProps) {
  const { user } = useAuth();
  const { openModuleTutorial } = useTutorial();

  // Pré-preencher responsável com usuário logado
  useEffect(() => {
    if (user && !formData.responsibleUserId) {
      onChange({ responsibleUserId: user.id });
    }
  }, [user, formData.responsibleUserId, onChange]);

  // Validar formulário
  useEffect(() => {
    const isValid = !!formData.clientId && !!formData.responsibleUserId;
    onValidChange(isValid);
  }, [formData.clientId, formData.responsibleUserId, onValidChange]);

  const handleClientChange = (value: string) => {
    onChange({ clientId: value });
  };

  const handleNavigateToClients = () => {
    // Fecha o modal da proposta antes de navegar
    if (onClose) {
      onClose();
    }
    // Navega para o módulo de Clientes usando o mesmo mecanismo da Sidebar
    if (onNavigate) {
      onNavigate('clients');
    }
  };

  const parseLocalDate = (yyyyMmDd: string) => {
    // Evita o bug de timezone do `new Date('YYYY-MM-DD')` (interpreta como UTC e pode virar -1 dia no Brasil)
    return new Date(`${yyyyMmDd}T00:00:00`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => openModuleTutorial('proposals-create-flow', { trackProgress: false })} className="text-indigo-600 hover:text-indigo-700">
          Tutorial rápido deste fluxo
        </Button>
      </div>
      {/* Cliente */}
      <div className="space-y-2" data-tour="proposal-flow-client">
        <Label htmlFor="clientId" className="required">
          Cliente *
        </Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <ClientSelect
              value={formData.clientId}
              onChange={handleClientChange}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleNavigateToClients}
            title="Ir para módulo de Clientes"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {!formData.clientId && (
          <p className="text-sm text-red-600">Selecione um cliente para continuar</p>
        )}
        <p className="text-sm text-gray-500">
          💡 Precisa cadastrar um cliente novo? Clique no botão + para abrir o módulo de
          Clientes.
        </p>
      </div>

      {/* Título da proposta */}
      <div className="space-y-2">
        <Label htmlFor="title">Título da Proposta</Label>
        <Input
          id="title"
          placeholder="Ex: Campanha OOH Av. Paulista – Q2 2025"
          value={formData.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <p className="text-sm text-gray-500">
          Opcional. Dê um nome descritivo para identificar facilmente esta proposta.
        </p>
      </div>

      {/* Data de início da campanha (referência) */}
      <div className="space-y-2">
        <Label htmlFor="campaignStartDate">Data de Início</Label>
        <Input
          id="campaignStartDate"
          type="date"
          value={
            formData.campaignStartDate
              ? formData.campaignStartDate.toISOString().split('T')[0]
              : ''
          }
          onChange={(e) =>
            onChange({
              campaignStartDate: e.target.value ? parseLocalDate(e.target.value) : undefined,
            })
          }
        />
        <p className="text-sm text-gray-500">
          Opcional. Serve como referência/padrão; a duração real será definida por item no próximo passo.
        </p>
      </div>

      {/* Validade da proposta */}
      <div className="space-y-2">
        <Label htmlFor="validUntil">Validade da Proposta</Label>
        <Input
          id="validUntil"
          type="date"
          value={
            formData.validUntil
              ? formData.validUntil.toISOString().split('T')[0]
              : ''
          }
          onChange={(e) =>
            onChange({
              validUntil: e.target.value ? parseLocalDate(e.target.value) : undefined,
            })
          }
        />
        <p className="text-sm text-gray-500">
          Data até a qual esta proposta é válida (padrão: 7 dias)
        </p>
      </div>

      {/* Condições comerciais gerais */}
      <div className="space-y-2">
        <Label htmlFor="conditionsText">Condições Comerciais</Label>
        <Textarea
          id="conditionsText"
          rows={4}
          placeholder="Descreva as condições de pagamento, prazos, garantias, etc."
          value={formData.conditionsText || ''}
          onChange={(e) => onChange({ conditionsText: e.target.value })}
        />
      </div>

    </div>
  );
}
