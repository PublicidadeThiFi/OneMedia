import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Client, ClientStatus, ProposalStatus } from '../../types';
import { useClientOwners } from '../../hooks/useClientOwners';
import { useProposals } from '../../hooks/useProposals';
import { ProposalStatusBadge } from '../proposals/ProposalStatusBadge';
import { ClientDocumentsSection } from './ClientDocumentsSection';
import { MapPin, Mail, Phone, Building2, User, FileText, Calendar } from 'lucide-react';

interface ClientDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  activeTab?: 'resumo' | 'documentos' | 'propostas' | 'atividades';
  onActiveTabChange?: (tab: 'resumo' | 'documentos' | 'propostas' | 'atividades') => void;
}

export function ClientDetailsDrawer(props: ClientDetailsDrawerProps) {
  if (!props.client) return null;
  return <ClientDetailsDrawerInner {...props} client={props.client} />;
}

function ClientDetailsDrawerInner({
  open,
  onOpenChange,
  client,
  activeTab = 'resumo',
  onActiveTabChange,
}: Omit<ClientDetailsDrawerProps, 'client'> & { client: Client }) {
  const { ownersById } = useClientOwners();
  const owner = client.ownerUserId ? ownersById.get(client.ownerUserId) : null;

  const {
    proposals,
    loading: proposalsLoading,
    error: proposalsError,
    refetch: refetchProposals,
  } = useProposals({
    clientId: client.id,
    pageSize: 50,
  });

  const getStatusColor = (status: ClientStatus) => {
    switch (status) {
      case ClientStatus.CLIENTE:
        return 'bg-green-100 text-green-800';
      case ClientStatus.PROSPECT:
        return 'bg-blue-100 text-blue-800';
      case ClientStatus.LEAD:
        return 'bg-yellow-100 text-yellow-800';
      case ClientStatus.INATIVO:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: ClientStatus) => {
    switch (status) {
      case ClientStatus.CLIENTE:
        return 'Cliente';
      case ClientStatus.PROSPECT:
        return 'Prospect';
      case ClientStatus.LEAD:
        return 'Lead';
      case ClientStatus.INATIVO:
        return 'Inativo';
    }
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: unknown) => {
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(n)) return '-';
    return n.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const proposalsApprovedCount = proposals.filter(
    (p) => p.status === ProposalStatus.APROVADA,
  ).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalhes do Cliente</SheetTitle>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value: 'resumo' | 'documentos' | 'propostas' | 'atividades') =>
            onActiveTabChange?.(value)
          }
          className="mt-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="propostas">Propostas</TabsTrigger>
            <TabsTrigger value="atividades">Atividades</TabsTrigger>
          </TabsList>

          {/* Aba Resumo */}
          <TabsContent value="resumo" className="space-y-6 mt-6">
            {/* Header com nome e status */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl">
                  {client.contactName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-gray-900 mb-1">{client.contactName}</h2>
                  {client.role && <p className="text-gray-600 text-sm">{client.role}</p>}
                  {client.companyName && (
                    <p className="text-gray-900 text-sm mt-1">{client.companyName}</p>
                  )}
                </div>
              </div>
              <Badge className={getStatusColor(client.status)}>
                {getStatusLabel(client.status)}
              </Badge>
            </div>

            {/* Informações de Contato */}
            <div className="space-y-3">
              <h3 className="text-gray-900 mb-3">Informações de Contato</h3>

              {client.email && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{client.email}</span>
                </div>
              )}

              {client.phone && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">{client.phone}</span>
                </div>
              )}

              {client.cnpj && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm">CNPJ: {client.cnpj}</span>
                </div>
              )}
            </div>

            {/* Endereço */}
            {(client.addressStreet || client.addressCity || client.addressState) && (
              <div className="space-y-3">
                <h3 className="text-gray-900 mb-3">Endereço</h3>
                <div className="flex items-start gap-3 text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <div className="text-sm">
                    {client.addressStreet && client.addressNumber && (
                      <div>
                        {client.addressStreet}, {client.addressNumber}
                      </div>
                    )}
                    {client.addressDistrict && <div>{client.addressDistrict}</div>}
                    {client.addressCity && client.addressState && (
                      <div>
                        {client.addressCity} - {client.addressState}
                      </div>
                    )}
                    {client.addressZipcode && <div>CEP: {client.addressZipcode}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Gestão */}
            <div className="space-y-3">
              <h3 className="text-gray-900 mb-3">Gestão e Origem</h3>

              {owner && (
                <div className="flex items-center gap-3 text-gray-600">
                  <User className="w-4 h-4" />
                  <div className="text-sm">
                    <span className="text-gray-500">Responsável: </span>
                    <span>{owner.name}</span>
                  </div>
                </div>
              )}

              {client.origin && (
                <div className="flex items-center gap-3 text-gray-600">
                  <FileText className="w-4 h-4" />
                  <div className="text-sm">
                    <span className="text-gray-500">Origem: </span>
                    <span>{client.origin}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="w-4 h-4" />
                <div className="text-sm">
                  <span className="text-gray-500">Cliente desde: </span>
                  <span>{formatDate(client.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Observações */}
            {client.notes && (
              <div className="space-y-3">
                <h3 className="text-gray-900 mb-3">Observações Internas</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
                </div>
              </div>
            )}

            {/* Métricas Rápidas */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-indigo-600 text-sm mb-1">Propostas</p>
                <p className="text-gray-900">
                  {proposalsLoading ? '...' : proposals.length}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-600 text-sm mb-1">Propostas Aprovadas</p>
                <p className="text-gray-900">
                  {proposalsLoading ? '...' : proposalsApprovedCount}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Aba Documentos */}
          <TabsContent value="documentos" className="mt-6">
            <ClientDocumentsSection clientId={client.id} />
          </TabsContent>

          {/* Aba Propostas */}
          <TabsContent value="propostas" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-900">Propostas do Cliente</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchProposals()}
                  disabled={proposalsLoading}
                >
                  Recarregar
                </Button>
              </div>

              {proposalsError && (
                <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-4 text-sm">
                  Erro ao carregar propostas.
                </div>
              )}

              {proposalsLoading ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Carregando propostas...</p>
                </div>
              ) : proposals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhuma proposta cadastrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {proposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-gray-900">
                            {proposal.title || `Proposta ${proposal.id.slice(0, 6)}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            Criada em {formatDate(proposal.createdAt)}
                          </p>
                        </div>
                        <ProposalStatusBadge status={proposal.status} />
                      </div>
                      <p className="text-gray-900">R$ {formatCurrency(proposal.totalAmount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Aba Atividades */}
          <TabsContent value="atividades" className="mt-6">
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="mb-2">Atividades e Histórico</p>
              <p className="text-sm">TODO: Implementar integração com ActivityLog</p>
              <p className="text-xs mt-2 text-gray-400">
                Logs de ações realizadas neste cliente (edições, propostas criadas, etc.)
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
