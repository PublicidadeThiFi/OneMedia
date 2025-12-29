import { Edit, ExternalLink, Eye, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Proposal, ProposalStatus } from '../../types';
import { ProposalStatusBadge } from './ProposalStatusBadge';
import { toNumber } from '../../lib/number';

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

  const openPublicLink = async (publicHash: string) => {
    const url = `${window.location.origin}/p/${publicHash}`;
    // Abre em nova aba (comportamento esperado para o ícone de link)
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // ignore
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback silencioso
      console.log('Link público:', url);
    }
  };

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
            const clientName =
              proposal.client?.companyName ||
              proposal.client?.contactName ||
              (proposal as any).clientName ||
              '-';

            const clientContact =
              proposal.client?.companyName ? proposal.client?.contactName : undefined;

            const responsibleName =
              proposal.responsibleUser?.name || (proposal as any).responsibleUserName || '-';

            const itemsCount =
              (proposal as any).itemsCount ??
              proposal.items?.length ??
              undefined;

            return (
              <tr key={proposal.id} className="hover:bg-gray-50">
                {/* Título */}
                <td className="px-6 py-4">
                  <div>
                    <p className="text-gray-900">{proposal.title || 'Sem título'}</p>
                    <p className="text-gray-500 text-sm">ID: ...{proposal.id.slice(-6)}</p>
                  </div>
                </td>

                {/* Cliente */}
                <td className="px-6 py-4">
                  <div>
                    <p className="text-gray-900">{clientName}</p>
                    {clientContact && (
                      <p className="text-gray-500 text-sm">{clientContact}</p>
                    )}
                  </div>
                </td>

                {/* Responsável */}
                <td className="px-6 py-4 text-gray-600 text-sm">
                  {responsibleName}
                </td>

                {/* Valor */}
                <td className="px-6 py-4">
                  <div>
                    <p className="text-gray-900">
                      R${' '}
                      {toNumber(proposal.totalAmount, 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    {proposal.discountPercent != null && proposal.discountPercent > 0 && (
                      <p className="text-green-600 text-xs">
                        -{proposal.discountPercent}% desconto
                      </p>
                    )}
                    {proposal.discountPercent == null &&
                      proposal.discountAmount != null &&
                      proposal.discountAmount > 0 && (
                        <p className="text-green-600 text-xs">
                          -R${' '}
                          {toNumber(proposal.discountAmount, 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      )}
                  </div>
                </td>

                {/* Itens */}
                <td className="px-6 py-4 text-gray-600">
                  {typeof itemsCount === 'number'
                    ? `${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'}`
                    : '-'}
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <ProposalStatusBadge status={proposal.status} />
                </td>

                {/* Validade */}
                <td className="px-6 py-4 text-gray-600 text-sm">
                  {proposal.validUntil
                    ? new Date(proposal.validUntil as any).toLocaleDateString('pt-BR')
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
                        title={`Copiar link público: /p/${proposal.publicHash}`}
                        onClick={() => openPublicLink(proposal.publicHash!)}
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
