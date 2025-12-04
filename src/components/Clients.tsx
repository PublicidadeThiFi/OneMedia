import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Client, ClientStatus } from '../types';
import { mockClients } from '../lib/mockData';
import { ClientFormDialog } from './clients/ClientFormDialog';
import { ClientDetailsDrawer } from './clients/ClientDetailsDrawer';
import { ClientsTable } from './clients/ClientsTable';
import { ClientFiltersBar } from './clients/ClientFiltersBar';
import { toast } from 'sonner@2.0.3';

export function Clients() {
  // TODO: Integrar com API real
  const [clients, setClients] = useState<Client[]>(mockClients);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');

  // Dialogs e Drawers
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [detailsDrawerClient, setDetailsDrawerClient] = useState<Client | null>(null);
  const [detailsTab, setDetailsTab] = useState<'resumo' | 'documentos' | 'propostas' | 'atividades'>('resumo');

  // Estatísticas baseadas em ClientStatus
  const stats = useMemo(() => {
    return {
      total: clients.length,
      ativos: clients.filter(c => c.status === ClientStatus.CLIENTE).length,
      prospects: clients.filter(c => c.status === ClientStatus.PROSPECT).length,
      leads: clients.filter(c => c.status === ClientStatus.LEAD).length,
    };
  }, [clients]);

  // Clientes filtrados
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Busca livre
      const matchesSearch = 
        client.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (client.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (client.cnpj?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      
      // Filtro de status
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      
      // Filtro de responsável
      const matchesOwner = ownerFilter === 'all' || client.ownerUserId === ownerFilter;
      
      return matchesSearch && matchesStatus && matchesOwner;
    });
  }, [clients, searchQuery, statusFilter, ownerFilter]);

  // Handlers
  const handleSaveClient = (clientData: Partial<Client>) => {
    if (editingClient) {
      // Atualizar cliente existente
      setClients(prev => prev.map(c => 
        c.id === editingClient.id ? { ...c, ...clientData } as Client : c
      ));
      toast.success('Cliente atualizado com sucesso!');
    } else {
      // Criar novo cliente
      setClients(prev => [...prev, clientData as Client]);
      toast.success('Cliente cadastrado com sucesso!', {
        action: {
          label: 'Criar Proposta',
          onClick: () => handleCreateProposal(clientData as Client),
        },
      });
    }
    setEditingClient(null);
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
            {filteredClients.length} {filteredClients.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
          </p>
        </div>
      )}

      {/* Tabela de Clientes */}
      <Card>
        <ClientsTable
          clients={filteredClients}
          onViewDetails={handleViewDetails}
          onEditClient={handleEditClient}
          onViewClientDocuments={handleViewClientDocuments}
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
        onSave={handleSaveClient}
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