import { useEffect, useMemo, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import apiClient from '../../lib/apiClient';
import { ProposalStatus } from '../../types';

export interface AdvancedFilters {
  proposalStatuses: ProposalStatus[];
  campaignStatus?: string;
  billingStatus?: string;
  responsibleUserId?: string;
  createdFrom?: string;
  createdTo?: string;
}

interface ResponsibleUserOption {
  id: string;
  name: string | null;
  email: string | null;
}

interface ProposalAdvancedFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: AdvancedFilters;
  onApplyFilters: (filters: AdvancedFilters) => void;
}

const PROPOSAL_STATUSES: { value: ProposalStatus; label: string }[] = [
  { value: ProposalStatus.RASCUNHO, label: 'Rascunho' },
  { value: ProposalStatus.ENVIADA, label: 'Enviada' },
  { value: ProposalStatus.APROVADA, label: 'Aprovada' },
  { value: ProposalStatus.REPROVADA, label: 'Reprovada' },
  { value: ProposalStatus.EXPIRADA, label: 'Expirada' },
];

export function ProposalAdvancedFiltersSheet({
  open,
  onOpenChange,
  filters,
  onApplyFilters,
}: ProposalAdvancedFiltersSheetProps) {
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);
  const [responsibles, setResponsibles] = useState<ResponsibleUserOption[]>([]);
  const [loadingResp, setLoadingResp] = useState(false);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingResp(true);
        const res = await apiClient.get<ResponsibleUserOption[]>('/proposals/responsibles');
        setResponsibles(res.data || []);
      } catch {
        setResponsibles([]);
      } finally {
        setLoadingResp(false);
      }
    };

    if (open) load();
  }, [open]);

  const responsibleOptions = useMemo(() => {
    return responsibles.map((u) => ({
      id: u.id,
      label: u.name || u.email || u.id,
    }));
  }, [responsibles]);

  const toggleProposalStatus = (status: ProposalStatus) => {
    setLocalFilters((prev) => ({
      ...prev,
      proposalStatuses: prev.proposalStatuses.includes(status)
        ? prev.proposalStatuses.filter((s) => s !== status)
        : [...prev.proposalStatuses, status],
    }));
  };

  const handleClearFilters = () => {
    const cleared: AdvancedFilters = {
      proposalStatuses: [],
      campaignStatus: undefined,
      billingStatus: undefined,
      responsibleUserId: undefined,
      createdFrom: undefined,
      createdTo: undefined,
    };

    setLocalFilters(cleared);
    // Usuário espera que 'Limpar' remova os filtros já aplicados imediatamente.
    onApplyFilters(cleared);
    onOpenChange(false);
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <SheetTitle>Filtros Avançados</SheetTitle>
            </div>
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

        <div className="space-y-6">
          {/* Status da Proposta */}
          <div>
            <h3 className="text-gray-900 mb-3">Status da Proposta</h3>
            <div className="space-y-2">
              {PROPOSAL_STATUSES.map((status) => (
                <div key={status.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={localFilters.proposalStatuses.includes(status.value)}
                    onCheckedChange={() => toggleProposalStatus(status.value)}
                  />
                  <Label htmlFor={`status-${status.value}`} className="text-sm">
                    {status.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Responsável */}
          <div>
            <h3 className="text-gray-900 mb-3">Responsável</h3>
            <Select
              value={localFilters.responsibleUserId || 'all'}
              onValueChange={(value: string) =>
                setLocalFilters((prev) => ({
                  ...prev,
                  responsibleUserId: value === 'all' ? undefined : value,
                }))
              }

              disabled={loadingResp}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingResp ? 'Carregando...' : 'Selecione o responsável'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {responsibleOptions.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Período de Criação */}
          <div>
            <h3 className="text-gray-900 mb-3">Período de Criação</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="createdFrom" className="text-sm text-gray-600">
                  De
                </Label>
                <Input
                  id="createdFrom"
                  type="date"
                  value={localFilters.createdFrom || ''}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      createdFrom: e.target.value || undefined,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="createdTo" className="text-sm text-gray-600">
                  Até
                </Label>
                <Input
                  id="createdTo"
                  type="date"
                  value={localFilters.createdTo || ''}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      createdTo: e.target.value || undefined,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-6 border-t">
            <Button variant="outline" onClick={handleClearFilters} className="flex-1">
              Limpar
            </Button>
            <Button onClick={handleApply} className="flex-1">
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
