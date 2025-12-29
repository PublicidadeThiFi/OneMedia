import { useMemo, useState } from 'react';
import { CheckCircle, Edit, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Proposal, ProposalStatus } from '../types';
import { useProposals } from '../hooks/useProposals';
import { ProposalAdvancedFiltersSheet, AdvancedFilters } from './proposals/ProposalAdvancedFiltersSheet';
import { ProposalDetailsDrawer } from './proposals/ProposalDetailsDrawer';
import { ProposalFiltersBar } from './proposals/ProposalFiltersBar';
import { ProposalFormWizard } from './proposals/ProposalFormWizard';
import { ProposalsTable } from './proposals/ProposalsTable';
import type { Page } from './MainApp';

interface ProposalsProps {
  onNavigate: (page: Page) => void;
}

export function Proposals({ onNavigate }: ProposalsProps) {
  // Filtros básicos
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filtros avançados
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    proposalStatuses: [],
    campaignStatus: undefined,
    billingStatus: undefined,
    responsibleUserId: undefined,
    createdFrom: undefined,
    createdTo: undefined,
  });
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

  const effectiveStatus = useMemo(() => {
    if (statusFilter !== 'all') return statusFilter as ProposalStatus;
    if (advancedFilters.proposalStatuses.length) return advancedFilters.proposalStatuses;
    return undefined;
  }, [statusFilter, advancedFilters.proposalStatuses]);

  const {
    proposals,
    total,
    loading,
    error,
    refetch,
    createProposal,
    updateProposal,
    updateProposalStatus,
    getProposalById,
  } = useProposals({
    search: searchQuery || undefined,
    status: effectiveStatus,
    responsibleUserId: advancedFilters.responsibleUserId,
    createdFrom: advancedFilters.createdFrom,
    createdTo: advancedFilters.createdTo,
    orderBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Dialogs e Drawers
  const [isFormWizardOpen, setIsFormWizardOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [detailsDrawerProposal, setDetailsDrawerProposal] = useState<Proposal | null>(null);
  const [loadingSingle, setLoadingSingle] = useState(false);

  // Cards de estatísticas (baseado na lista carregada)
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const approved = proposals.filter((p) => p.status === ProposalStatus.APROVADA);
    const totalNonDraft = proposals.filter((p) => p.status !== ProposalStatus.RASCUNHO);
    const approvalRate =
      totalNonDraft.length > 0
        ? Math.round((approved.length / totalNonDraft.length) * 100)
        : 0;

    const approvedThisMonth = approved.filter((p) => {
      if (!p.approvedAt) return false;
      const date = new Date(p.approvedAt as any);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const totalApprovedAmount = approvedThisMonth.reduce(
      (sum, p) => sum + Number((p as any).totalAmount ?? 0) ,
      0
    );

    const sent = proposals.filter((p) => p.status === ProposalStatus.ENVIADA);
    const drafts = proposals.filter((p) => p.status === ProposalStatus.RASCUNHO);

    return {
      approved: approved.length,
      approvalRate,
      totalApprovedAmount,
      sent: sent.length,
      drafts: drafts.length,
    };
  }, [proposals]);

  const handleNewProposal = () => {
    setEditingProposal(null);
    setIsFormWizardOpen(true);
  };

  const handleEditProposal = async (proposal: Proposal) => {
    try {
      setLoadingSingle(true);
      const full = await getProposalById(proposal.id);
      setEditingProposal(full);
      setIsFormWizardOpen(true);
    } catch {
      toast.error('Erro ao carregar proposta para edição');
    } finally {
      setLoadingSingle(false);
    }
  };

  const handleViewDetails = async (proposal: Proposal) => {
    try {
      setLoadingSingle(true);
      const full = await getProposalById(proposal.id);
      setDetailsDrawerProposal(full);
    } catch {
      toast.error('Erro ao carregar detalhes da proposta');
    } finally {
      setLoadingSingle(false);
    }
  };

  const handleSendProposal = async (proposal: Proposal) => {
    try {
      await updateProposalStatus(proposal.id, ProposalStatus.ENVIADA);
      toast.success('Proposta enviada.');
      refetch();
    } catch {
      toast.error('Erro ao enviar proposta');
    }
  };

  const handleSaveProposal = async (proposalData: Partial<Proposal>): Promise<boolean> => {
    try {
      const desiredStatus = proposalData.status;

      // Mantém o update (PUT) somente para campos/itens. Status sempre via PATCH /status.
      const { status, ...payload } = proposalData;

      let saved: Proposal;

      if (editingProposal?.id) {
        saved = await updateProposal(editingProposal.id, payload);
        toast.success('Proposta atualizada com sucesso!');
      } else {
        saved = await createProposal(payload);
        toast.success('Proposta criada com sucesso!');
      }

      if (desiredStatus && desiredStatus !== saved.status) {
        await updateProposalStatus(saved.id, desiredStatus);
      }

      setIsFormWizardOpen(false);
      setEditingProposal(null);
      await refetch();

      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao salvar proposta';
      toast.error(msg);
      return false;
    }
  };

  const handleApplyAdvancedFilters = (filters: AdvancedFilters) => {
    setAdvancedFilters(filters);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-gray-900 mb-2">Propostas</h1>
          <p className="text-gray-600">
            Gerencie propostas comerciais (Proposal + ProposalItem)
          </p>
        </div>

        <Button className="gap-2" onClick={handleNewProposal} disabled={loadingSingle}>
          <Plus className="w-4 h-4" />
          Nova Proposta
        </Button>
      </div>

      {loading && <div>Carregando propostas...</div>}
      {!loading && error && <div>Erro ao carregar propostas.</div>}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setStatusFilter(ProposalStatus.APROVADA)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Aprovadas</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-gray-900 mb-1">{stats.approved}</p>
            <p className="text-green-600 text-sm">Taxa: {stats.approvalRate}%</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Valor Aprovado</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-gray-900 mb-1">
              R${' '}
              {stats.totalApprovedAmount.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-gray-600 text-sm">No mês</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setStatusFilter(ProposalStatus.ENVIADA)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Enviadas</p>
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-gray-900 mb-1">{stats.sent}</p>
            <p className="text-gray-600 text-sm">Aguardando retorno</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setStatusFilter(ProposalStatus.RASCUNHO)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Rascunhos</p>
              <Edit className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-gray-900 mb-1">{stats.drafts}</p>
            <p className="text-gray-600 text-sm">Em elaboração</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <ProposalFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={(value: string) => setStatusFilter(value)}
            onOpenAdvancedFilters={() => setIsAdvancedFiltersOpen(true)}
          />
        </CardContent>
      </Card>

      {/* Contador de resultados */}
      {(searchQuery || statusFilter !== 'all' || advancedFilters.proposalStatuses.length > 0) && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {proposals.length}{' '}
            {proposals.length === 1 ? 'proposta encontrada' : 'propostas encontradas'}
            {total > proposals.length ? ` (de ${total})` : ''}
          </p>
        </div>
      )}

      {/* Tabela */}
      <Card>
        <ProposalsTable
          proposals={proposals}
          onViewDetails={handleViewDetails}
          onEditProposal={handleEditProposal}
          onSendProposal={handleSendProposal}
        />
      </Card>

      {/* Dialogs */}
      <ProposalAdvancedFiltersSheet
        open={isAdvancedFiltersOpen}
        onOpenChange={setIsAdvancedFiltersOpen}
        filters={advancedFilters}
        onApplyFilters={handleApplyAdvancedFilters}
      />

      <ProposalDetailsDrawer
        open={!!detailsDrawerProposal}
        onOpenChange={(open) => !open && setDetailsDrawerProposal(null)}
        proposal={detailsDrawerProposal}
        onNavigate={onNavigate}
      />

      <ProposalFormWizard
        open={isFormWizardOpen}
        onOpenChange={(open) => {
          setIsFormWizardOpen(open);
          if (!open) setEditingProposal(null);
        }}
        proposal={editingProposal}
        onSave={handleSaveProposal}
        onNavigate={onNavigate}
      />
    </div>
  );
}
