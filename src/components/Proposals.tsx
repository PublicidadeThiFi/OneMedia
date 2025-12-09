import { useState, useMemo } from 'react';
import { Plus, CheckCircle, Send, Edit, PlayCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Proposal, ProposalStatus } from '../types';
import {
  mockProposals as initialMockProposals,
  getCampaignForProposal,
  getBillingStatusForProposal,
  getClientById,
} from '../lib/mockData';
import { ProposalFiltersBar } from './proposals/ProposalFiltersBar';
import { ProposalsTable } from './proposals/ProposalsTable';
import { ProposalAdvancedFiltersSheet, AdvancedFilters } from './proposals/ProposalAdvancedFiltersSheet';
import { ProposalDetailsDrawer } from './proposals/ProposalDetailsDrawer';
import { ProposalFormWizard } from './proposals/ProposalFormWizard';
import { toast } from 'sonner@2.0.3';
import { Page } from './MainApp';

interface ProposalsProps {
  onNavigate: (page: Page) => void;
}

export function Proposals({ onNavigate }: ProposalsProps) {
  // TODO: Integrar com API real
  const [proposals, setProposals] = useState<Proposal[]>(initialMockProposals);

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

  // Dialogs e Drawers
  const [isFormWizardOpen, setIsFormWizardOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [detailsDrawerProposal, setDetailsDrawerProposal] = useState<Proposal | null>(null);

  // Cards de estatísticas
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const approved = proposals.filter(p => p.status === ProposalStatus.APROVADA);
    const totalNonDraft = proposals.filter(p => p.status !== ProposalStatus.RASCUNHO);
    const approvalRate = totalNonDraft.length > 0
      ? Math.round((approved.length / totalNonDraft.length) * 100)
      : 0;

    const approvedThisMonth = approved.filter(p => {
      if (!p.approvedAt) return false;
      const date = new Date(p.approvedAt);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const totalApprovedAmount = approvedThisMonth.reduce((sum, p) => sum + p.totalAmount, 0);

    const sent = proposals.filter(p => p.status === ProposalStatus.ENVIADA);
    const drafts = proposals.filter(p => p.status === ProposalStatus.RASCUNHO);

    return {
      approved: approved.length,
      approvalRate,
      totalApprovedAmount,
      sent: sent.length,
      drafts: drafts.length,
    };
  }, [proposals]);

  // Filtros aplicados
  const filteredProposals = useMemo(() => {
    return proposals.filter((proposal) => {
      // Busca textual (título ou cliente)
      const client = getClientById(proposal.clientId);
      const searchText = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        (proposal.title?.toLowerCase().includes(searchText) ?? false) ||
        (client?.companyName?.toLowerCase().includes(searchText) ?? false) ||
        (client?.contactName?.toLowerCase().includes(searchText) ?? false);

      // Filtro de status básico
      const matchesStatusFilter =
        statusFilter === 'all' || proposal.status === statusFilter;

      // Filtros avançados - Status da proposta
      const matchesProposalStatuses =
        advancedFilters.proposalStatuses.length === 0 ||
        advancedFilters.proposalStatuses.includes(proposal.status);

      // Filtros avançados - Status da campanha
      const matchesCampaignStatus = !advancedFilters.campaignStatus || (() => {
        const campaign = getCampaignForProposal(proposal.id);
        return campaign?.status === advancedFilters.campaignStatus;
      })();

      // Filtros avançados - Status financeiro
      const matchesBillingStatus = !advancedFilters.billingStatus || (() => {
        const billingStatus = getBillingStatusForProposal(proposal.id);
        return billingStatus === advancedFilters.billingStatus;
      })();

      // Filtros avançados - Responsável
      const matchesResponsible =
        !advancedFilters.responsibleUserId ||
        proposal.responsibleUserId === advancedFilters.responsibleUserId;

      // Filtros avançados - Período de criação
      const matchesCreatedFrom = !advancedFilters.createdFrom || (() => {
        const createdDate = new Date(proposal.createdAt);
        const fromDate = new Date(advancedFilters.createdFrom);
        return createdDate >= fromDate;
      })();

      const matchesCreatedTo = !advancedFilters.createdTo || (() => {
        const createdDate = new Date(proposal.createdAt);
        const toDate = new Date(advancedFilters.createdTo);
        toDate.setHours(23, 59, 59, 999);
        return createdDate <= toDate;
      })();

      return (
        matchesSearch &&
        matchesStatusFilter &&
        matchesProposalStatuses &&
        matchesCampaignStatus &&
        matchesBillingStatus &&
        matchesResponsible &&
        matchesCreatedFrom &&
        matchesCreatedTo
      );
    });
  }, [proposals, searchQuery, statusFilter, advancedFilters]);

  // Handlers
  const handleNewProposal = () => {
    setEditingProposal(null);
    setIsFormWizardOpen(true);
  };

  const handleEditProposal = (proposal: Proposal) => {
    setEditingProposal(proposal);
    setIsFormWizardOpen(true);
  };

  const handleViewDetails = (proposal: Proposal) => {
    setDetailsDrawerProposal(proposal);
  };

  const handleSendProposal = (proposal: Proposal) => {
    // Mudar status para ENVIADA e gerar publicHash
    const updatedProposal: Proposal = {
      ...proposal,
      status: ProposalStatus.ENVIADA,
      publicHash: proposal.publicHash || generatePublicHash(),
      updatedAt: new Date(),
    };

    setProposals(prev => prev.map(p => p.id === proposal.id ? updatedProposal : p));
    toast.success(`Proposta enviada. Link público: /p/${updatedProposal.publicHash}`);
  };

  const handleSaveProposal = (proposalData: Partial<Proposal>) => {
    if (editingProposal) {
      // Atualizar proposta existente
      setProposals(prev =>
        prev.map(p =>
          p.id === editingProposal.id
            ? {
                ...p,
                ...proposalData,
                updatedAt: new Date(),
              } as Proposal
            : p
        )
      );
      toast.success('Proposta atualizada com sucesso!');
    } else {
      // Criar nova proposta
      const newProposal: Proposal = {
        id: `pr${Date.now()}`,
        companyId: 'c1',
        ...proposalData,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Proposal;

      setProposals(prev => [...prev, newProposal]);
      toast.success('Proposta criada com sucesso!');
    }

    setIsFormWizardOpen(false);
    setEditingProposal(null);
  };

  const handleApplyAdvancedFilters = (filters: AdvancedFilters) => {
    setAdvancedFilters(filters);
  };

  // Helper para gerar hash público mock
  const generatePublicHash = () => {
    return Math.random().toString(36).substring(2, 15);
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

        <Button className="gap-2" onClick={handleNewProposal}>
          <Plus className="w-4 h-4" />
          Nova Proposta
        </Button>
      </div>

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
              R$ {stats.totalApprovedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            onStatusChange={setStatusFilter}
            onOpenAdvancedFilters={() => setIsAdvancedFiltersOpen(true)}
          />
        </CardContent>
      </Card>

      {/* Contador de resultados */}
      {(searchQuery || statusFilter !== 'all' || advancedFilters.proposalStatuses.length > 0) && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {filteredProposals.length}{' '}
            {filteredProposals.length === 1 ? 'proposta encontrada' : 'propostas encontradas'}
          </p>
        </div>
      )}

      {/* Tabela de Propostas */}
      <Card>
        <ProposalsTable
          proposals={filteredProposals}
          onViewDetails={handleViewDetails}
          onEditProposal={handleEditProposal}
          onSendProposal={handleSendProposal}
        />
      </Card>

      {/* Info do Fluxo */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-900 mb-2">💡 Fluxo de Propostas</p>
        <p className="text-sm text-blue-700">
          <strong>RASCUNHO</strong> → editar itens (ProposalItem) → <strong>ENVIADA</strong> (gera
          publicHash) → Cliente aprova via link público → <strong>APROVADA</strong> (TODO: criar
          Campaign + Reservations + BillingInvoice)
        </p>
      </div>

      {/* Dialogs e Drawers */}
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