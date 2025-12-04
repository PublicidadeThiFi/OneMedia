import { Eye, Edit, Send, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Proposal, ProposalStatus } from '../../types';
import { ProposalStatusBadge } from './ProposalStatusBadge';
import { getClientById, getUserById, getItemsForProposal } from '../../lib/mockData';

interface ProposalsTableProps {
  proposals: Proposal[];
  onViewDetails: (proposal: Proposal) => void;
  onEditProposal: (proposal: Proposal) => void;
  onSendProposal: (proposal: Proposal) => void;
}

export function ProposalsTable({
  proposals,
  onViewDetails,
  onEditProposal,
  onSendProposal,
}: ProposalsTableProps) {
  if (proposals.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Nenhuma proposta encontrada</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-gray-600 text-sm">Título</th>
            <th className="px-6 py-3 text-left text-gray-600 text-sm">Cliente</th>
            <th className="px-6 py-3 text-left text-gray-600 text-sm">Responsável</th>
            <th className="px-6 py-3 text-left text-gray-600 text-sm">Valor</th>
            <th className="px-6 py-3 text-left text-gray-600 text-sm">Itens</th>
            <th className="px-6 py-3 text-left text-gray-600 text-sm">Status</th>
            <th className="px-6 py-3 text-left text-gray-600 text-sm">Validade</th>
            <th className="px-6 py-3 text-left text-gray-600 text-sm">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {proposals.map((proposal) => {
            const client = getClientById(proposal.clientId);
            const user = getUserById(proposal.responsibleUserId);
            const items = getItemsForProposal(proposal.id);

            return (
              <tr key={proposal.id} className="hover:bg-gray-50">
                {/* Título */}
                <td className="px-6 py-4">
                  <div>
                    <p className="text-gray-900">{proposal.title || 'Sem título'}</p>
                    <p className="text-gray-500 text-sm">
                      ID: ...{proposal.id.slice(-6)}
                    </p>
                  </div>
                </td>

                {/* Cliente */}
                <td className="px-6 py-4">
                  <div>
                    <p className="text-gray-900">{client?.companyName || client?.contactName || '-'}</p>
                    {client?.companyName && (
                      <p className="text-gray-500 text-sm">{client.contactName}</p>
                    )}
                  </div>
                </td>

                {/* Responsável */}
                <td className="px-6 py-4 text-gray-600 text-sm">
                  {user?.name || '-'}
                </td>

                {/* Valor */}
                <td className="px-6 py-4">
                  <div>
                    <p className="text-gray-900">
                      R$ {proposal.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {proposal.discountPercent && proposal.discountPercent > 0 && (
                      <p className="text-green-600 text-xs">
                        -{proposal.discountPercent}% desconto
                      </p>
                    )}
                  </div>
                </td>

                {/* Itens */}
                <td className="px-6 py-4 text-gray-600">
                  {items.length} {items.length === 1 ? 'item' : 'itens'}
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <ProposalStatusBadge status={proposal.status} />
                </td>

                {/* Validade */}
                <td className="px-6 py-4 text-gray-600 text-sm">
                  {proposal.validUntil
                    ? new Date(proposal.validUntil).toLocaleDateString('pt-BR')
                    : '-'}
                </td>

                {/* Ações */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(proposal)}
                      aria-label="Ver detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    {proposal.status === ProposalStatus.RASCUNHO && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditProposal(proposal)}
                          aria-label="Editar proposta"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSendProposal(proposal)}
                          aria-label="Enviar proposta"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </>
                    )}

                    {proposal.publicHash && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title={`Link público: /p/${proposal.publicHash}`}
                        onClick={() => {
                          // TODO: copiar link ou abrir em nova aba
                          console.log('Link público:', `/p/${proposal.publicHash}`);
                        }}
                        aria-label="Link público"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
