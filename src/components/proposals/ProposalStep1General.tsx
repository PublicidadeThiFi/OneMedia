import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Plus } from 'lucide-react';
import { ProposalFormData } from './ProposalFormWizard';
import { ClientSelect } from './ClientSelect';
import type { Page } from '../MainApp';

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
  const { company } = useCompany();

  // Pré-preencher responsável com usuário logado
  useEffect(() => {
    if (user && !formData.responsibleUserId) {
      onChange({ responsibleUserId: user.id });
    }
  }, [user, formData.responsibleUserId, onChange]);

  // Pré-preencher validade (7 dias a partir de hoje)
  useEffect(() => {
    if (!formData.validUntil) {
      const defaultValidUntil = new Date();
      defaultValidUntil.setDate(defaultValidUntil.getDate() + 7);
      onChange({ validUntil: defaultValidUntil });
    }
  }, [formData.validUntil, onChange]);

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

  const handleDiscountPercentChange = (value: string) => {
    const percent = parseFloat(value) || 0;
    onChange({ discountPercent: percent, discountAmount: 0 });
  };

  const handleDiscountAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0;
    onChange({ discountAmount: amount, discountPercent: 0 });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div className="space-y-6">
      {/* Cliente */}
      <div className="space-y-2">
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

      {/* Período geral da campanha */}
      <div className="grid grid-cols-2 gap-4">
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
                campaignStartDate: e.target.value ? new Date(e.target.value) : undefined,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaignEndDate">Data de Término</Label>
          <Input
            id="campaignEndDate"
            type="date"
            value={
              formData.campaignEndDate
                ? formData.campaignEndDate.toISOString().split('T')[0]
                : ''
            }
            onChange={(e) =>
              onChange({
                campaignEndDate: e.target.value ? new Date(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>
      <p className="text-sm text-gray-500">
        💡 Esse período será usado como padrão ao adicionar itens no próximo passo
      </p>

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
              validUntil: e.target.value ? new Date(e.target.value) : undefined,
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
        <div className="flex justify-end">
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => {
              // TODO: Puxar texto padrão das configurações da empresa
              onChange({
                conditionsText:
                  (company?.defaultProposalNotes ||
                  'Pagamento em até 30 dias após aprovação.\nReajuste anual conforme IGP-M.\nObrigado pela preferência!').replace(/\\n/g, '\n'),
              });
            }}
          >
            Inserir texto padrão
          </Button>
        </div>
      </div>

      {/* Descontos */}
      <div className="border-t pt-6">
        <h3 className="text-gray-900 mb-4">Descontos</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="discountPercent">Desconto em %</Label>
            <Input
              id="discountPercent"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="0"
              value={formData.discountPercent || ''}
              onChange={(e) => handleDiscountPercentChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="discountAmount">Desconto em R$</Label>
            <Input
              id="discountAmount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={formData.discountAmount || ''}
              onChange={(e) => handleDiscountAmountChange(e.target.value)}
            />
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          💡 Preencha apenas um campo. O desconto será aplicado sobre o subtotal dos itens.
        </p>
      </div>

      {/* Resumo financeiro (preview) */}
      <div className="border-t pt-6">
        <h3 className="text-gray-900 mb-4">Resumo Financeiro</h3>
        <div className="bg-gray-50 p-4 rounded-md space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal dos itens:</span>
            <span className="text-gray-900">{formatCurrency(formData.subtotal)}</span>
          </div>
          {(formData.discountPercent || formData.discountAmount) && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Desconto
                {formData.discountPercent
                  ? ` (${formData.discountPercent}%)`
                  : ''}
                :
              </span>
              <span className="text-red-600">
                -{' '}
                {formatCurrency(
                  formData.discountAmount ||
                    (formData.subtotal * (formData.discountPercent || 0)) / 100
                )}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2">
            <span className="text-gray-900">Total da Proposta:</span>
            <span className="text-gray-900">
              {formatCurrency(formData.totalAmount)}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          O subtotal será calculado automaticamente no próximo passo
        </p>
      </div>
    </div>
  );
}
