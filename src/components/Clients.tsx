import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Client, ClientStatus } from '../types';
import { useClients } from '../hooks/useClients';
import apiClient from '../lib/apiClient';
import { ClientFormDialog } from './clients/ClientFormDialog';
import { ClientDetailsDrawer } from './clients/ClientDetailsDrawer';
import { ClientsTable } from './clients/ClientsTable';
import { ClientFiltersBar } from './clients/ClientFiltersBar';
import { toast } from 'sonner';

export function Clients() {
  // Filtros e paginação
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { clients, total, loading, error, refetch } = useClients({
    search: searchQuery || undefined,
    status: statusFilter === 'all' ? undefined : (statusFilter as ClientStatus | string),
    ownerUserId: ownerFilter === 'all' ? undefined : ownerFilter,
    page,
    pageSize,
  });
  
  // Dialogs e Drawers
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [detailsDrawerClient, setDetailsDrawerClient] = useState<Client | null>(null);
  const [detailsTab, setDetailsTab] = useState<'resumo' | 'documentos' | 'propostas' | 'atividades'>('resumo');

  // Estatísticas baseadas em ClientStatus (do resultado atual)
  const stats = {
    total: total || clients.length,
    ativos: clients.filter(c => c.status === ClientStatus.CLIENTE).length,
    prospects: clients.filter(c => c.status === ClientStatus.PROSPECT).length,
    leads: clients.filter(c => c.status === ClientStatus.LEAD).length,
  };

  // Handlers
  const handleClientSaved = () => {
    refetch();
    setIsFormDialogOpen(false);
    setEditingClient(null);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Deseja realmente excluir este cliente?')) return;

    try {
      await apiClient.delete(`/clients/${clientId}`);
      toast.success('Cliente excluído!');
      refetch();
    } catch (error) {
      toast.error('Erro ao excluir cliente');
    }
  };

  const handleNewClient = () => {
    setEditingClient(null);
    setIsFormDialogOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsFormDialogOpen(true);
  };

  const handleViewDetails = (client: Client) => {
    setDetailsDrawerClient(client);
    setDetailsTab('resumo');
  };

  const handleViewClientDocuments = (client: Client) => {
    setDetailsDrawerClient(client);
    setDetailsTab('documentos');
  };

  const handleCreateProposal = (client: Client) => {
    // TODO: Implementar navegação para módulo de Propostas com clientId pré-selecionado
    console.log('Criar proposta para cliente:', client.id);
    toast.info(`Criação de proposta para ${client.contactName}`, {
      description: 'Navegação para módulo de Propostas será implementada',
    });
  };

  return (
    <div className="p-8">
      {loading && <div>Carregando clientes...</div>}
      {!loading && error && <div>Erro ao carregar clientes.</div>}
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-gray-900 mb-2">Clientes</h1>
          <p className="text-gray-600">Gerencie clientes e anunciantes (Client)</p>
        </div>
        
        <Button className="gap-2" onClick={handleNewClient}>
          <Plus className="w-4 h-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Total de Clientes</p>
            <p className="text-gray-900">{stats.total}</p>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setStatusFilter(ClientStatus.CLIENTE)}
        >
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Clientes Ativos</p>
            <p className="text-gray-900">{stats.ativos}</p>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setStatusFilter(ClientStatus.PROSPECT)}
        >
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Prospects</p>
            <p className="text-gray-900">{stats.prospects}</p>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setStatusFilter(ClientStatus.LEAD)}
        >
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Leads</p>
            <p className="text-gray-900">{stats.leads}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="mb-6">
        <ClientFiltersBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          ownerFilter={ownerFilter}
          onOwnerChange={setOwnerFilter}
        />
      </div>

      {/* Contador de resultados */}
      {(searchQuery || statusFilter !== 'all' || ownerFilter !== 'all') && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {clients.length} {clients.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
          </p>
        </div>
      )}

      {/* Tabela de Clientes */}
      <Card>
        <ClientsTable
          clients={clients}
          onViewDetails={handleViewDetails}
          onEditClient={handleEditClient}
          onViewClientDocuments={handleViewClientDocuments}
          onDeleteClient={handleDeleteClient}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
        />
      </Card>

      {/* Dialogs e Drawers */}
      <ClientFormDialog
        open={isFormDialogOpen}
        onOpenChange={(open) => {
          setIsFormDialogOpen(open);
          if (!open) setEditingClient(null);
        }}
        client={editingClient}
        onSave={handleClientSaved}
      />

      <ClientDetailsDrawer
        open={!!detailsDrawerClient}
        onOpenChange={(open) => {
          if (!open) setDetailsDrawerClient(null);
        }}
        client={detailsDrawerClient}
        activeTab={detailsTab}
        onActiveTabChange={setDetailsTab}
      />
    </div>
  );
}