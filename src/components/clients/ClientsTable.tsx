import { Eye, Edit, FileText, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Client, ClientStatus } from '../../types';
import { getUserById, getProposalsForClient } from '../../lib/mockData';

interface ClientsTableProps {
  clients: Client[];
  onViewDetails: (client: Client) => void;
  onEditClient: (client: Client) => void;
  onViewClientDocuments: (client: Client) => void;
  onDeleteClient?: (clientId: string) => void;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
}

export function ClientsTable({
  clients,
  onViewDetails,
  onEditClient,
  onViewClientDocuments,
  onDeleteClient,
  page,
  pageSize,
  total,
  onPageChange,
}: ClientsTableProps) {
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

  const totalPages =
    total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-gray-600 text-sm">Contato</th>
            <th className="px-6 py-3 text-left text-gray-600 text-sm">Empresa</th>
            <th className="px-6 py-3 text-left text-gray-600 text-sm">
              Email/Telefone
            </th>
            <th className="px-6 py-3 text-left text-gray-600 text-sm">Status</th>
            <th className="px-6 py-3 text-left text-gray-600 text-sm">
              Responsável
            </th>
            <th className="px-6 py-3 text-left text-gray-600 text-sm">Origem</th>
            <th className="px-6 py-3 text-left text-gray-600 text-sm">Propostas</th>
            <th className="px-6 py-3 text-left text-gray-600 text-sm">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {clients.map((client) => {
            const owner = client.ownerUserId
              ? getUserById(client.ownerUserId)
              : null;
            const proposalCount = getProposalsForClient(client.id).length;

            return (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      {client.contactName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-gray-900">{client.contactName}</span>
                      {client.role && (
                        <p className="text-gray-500 text-xs">{client.role}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    {client.companyName && (
                      <p className="text-gray-900">{client.companyName}</p>
                    )}
                    {client.cnpj && (
                      <p className="text-gray-500 text-xs">{client.cnpj}</p>
                    )}
                    {!client.companyName && !client.cnpj && (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    {client.email && (
                      <div className="text-gray-900">{client.email}</div>
                    )}
                    {client.phone && (
                      <div className="text-gray-500">{client.phone}</div>
                    )}
                    {!client.email && !client.phone && (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge className={getStatusColor(client.status)}>
                    {getStatusLabel(client.status)}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {owner?.name || '—'}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {client.origin || '—'}
                </td>
                <td className="px-6 py-4 text-gray-900">{proposalCount}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(client)}
                      title="Ver detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditClient(client)}
                      title="Editar cliente"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewClientDocuments(client)}
                      title="Ver documentos"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    {onDeleteClient && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteClient(client.id)}
                        title="Excluir cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {clients.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>Nenhum cliente encontrado</p>
        </div>
      )}

      {/* Paginação simples opcional */}
      {total !== undefined &&
        page !== undefined &&
        pageSize !== undefined &&
        onPageChange && (
          <div className="flex items-center justify-between px-6 py-4 text-sm text-gray-600 border-t border-gray-200">
            <span>
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
    </div>
  );
}
