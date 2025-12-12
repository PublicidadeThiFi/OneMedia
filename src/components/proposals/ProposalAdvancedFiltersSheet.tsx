import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { ProposalStatus, CampaignStatus, BillingStatus } from '../../types';
import { mockUsers } from '../../lib/mockData';

export interface AdvancedFilters {
  proposalStatuses: ProposalStatus[];
  campaignStatus?: CampaignStatus;
  billingStatus?: BillingStatus;
  responsibleUserId?: string;
  createdFrom?: string;
  createdTo?: string;
}

interface ProposalAdvancedFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: AdvancedFilters;
  onApplyFilters: (filters: AdvancedFilters) => void;
}

export function ProposalAdvancedFiltersSheet({
  open,
  onOpenChange,
  filters,
  onApplyFilters,
}: ProposalAdvancedFiltersSheetProps) {
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    const clearedFilters: AdvancedFilters = {
      proposalStatuses: [],
      campaignStatus: undefined,
      billingStatus: undefined,
      responsibleUserId: undefined,
      createdFrom: undefined,
      createdTo: undefined,
    };
    setLocalFilters(clearedFilters);
    onApplyFilters(clearedFilters);
  };

  const toggleProposalStatus = (status: ProposalStatus) => {
    setLocalFilters(prev => {
      const statuses = prev.proposalStatuses.includes(status)
        ? prev.proposalStatuses.filter(s => s !== status)
        : [...prev.proposalStatuses, status];
      return { ...prev, proposalStatuses: statuses };
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Filtros Avançados</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status da Proposta */}
          <div className="space-y-3">
            <Label>Status da Proposta</Label>
            <div className="space-y-2">
              {Object.values(ProposalStatus).map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={localFilters.proposalStatuses.includes(status)}
                    onCheckedChange={() => toggleProposalStatus(status)}
                  />
                  <Label
                    htmlFor={`status-${status}`}
                    className="cursor-pointer"
                  >
                    {status === ProposalStatus.APROVADA && 'Aprovada'}
                    {status === ProposalStatus.ENVIADA && 'Enviada'}
                    {status === ProposalStatus.RASCUNHO && 'Rascunho'}
                    {status === ProposalStatus.REPROVADA && 'Reprovada'}
                    {status === ProposalStatus.EXPIRADA && 'Expirada'}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Status da Campanha */}
          <div className="space-y-2">
            <Label htmlFor="campaign-status">Status da Campanha</Label>
            <Select
              value={localFilters.campaignStatus || 'all'}
              onValueChange={(value: string) =>
                setLocalFilters({
                  ...localFilters,
                  campaignStatus: value === 'all' ? undefined : (value as CampaignStatus),
                })
              }
            >
              <SelectTrigger id="campaign-status">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value={CampaignStatus.EM_INSTALACAO}>Em Instalação</SelectItem>
                <SelectItem value={CampaignStatus.EM_VEICULACAO}>Em Veiculação</SelectItem>
                <SelectItem value={CampaignStatus.FINALIZADA}>Finalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Financeiro */}
          <div className="space-y-2">
            <Label htmlFor="billing-status">Status Financeiro</Label>
            <Select
              value={localFilters.billingStatus || 'all'}
              onValueChange={(value: string) =>
                setLocalFilters({
                  ...localFilters,
                  billingStatus: value === 'all' ? undefined : (value as BillingStatus),
                })
              }
            >
              <SelectTrigger id="billing-status">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value={BillingStatus.ABERTA}>Aberta</SelectItem>
                <SelectItem value={BillingStatus.PAGA}>Paga</SelectItem>
                <SelectItem value={BillingStatus.VENCIDA}>Vencida</SelectItem>
                <SelectItem value={BillingStatus.CANCELADA}>Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Usuário Responsável */}
          <div className="space-y-2">
            <Label htmlFor="responsible-user">Usuário Responsável</Label>
            <Select
              value={localFilters.responsibleUserId || 'all'}
              onValueChange={(value: string) =>
                setLocalFilters({
                  ...localFilters,
                  responsibleUserId: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger id="responsible-user">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {mockUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Período de Criação */}
          <div className="space-y-2">
            <Label>Período de Criação</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="created-from" className="text-xs text-gray-500">
                  De
                </Label>
                <Input
                  id="created-from"
                  type="date"
                  value={localFilters.createdFrom || ''}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, createdFrom: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="created-to" className="text-xs text-gray-500">
                  Até
                </Label>
                <Input
                  id="created-to"
                  type="date"
                  value={localFilters.createdTo || ''}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, createdTo: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3 mt-8 pt-6 border-t">
          <Button variant="outline" onClick={handleClear} className="flex-1">
            Limpar
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Aplicar Filtros
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
