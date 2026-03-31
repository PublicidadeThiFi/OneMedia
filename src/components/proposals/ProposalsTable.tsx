import { Download, Edit, Eye, Send } from 'lucide-react';
import type { MouseEvent } from 'react';
import { Button } from '../ui/button';
import { Proposal, ProposalStatus } from '../../types';
import apiClient from '../../lib/apiClient';
import { ProposalStatusBadge } from './ProposalStatusBadge';
import { toNumber } from '../../lib/number';

function formatDateBR(value: any): string {
  if (!value) return '-';
  const d = new Date(value as any);
  if (Number.isNaN(d.getTime())) return '-';
  // Usa a parte YYYY-MM-DD (UTC) para evitar o bug de "-1 dia" por timezone.
  const [y, m, dd] = d.toISOString().split('T')[0].split('-');
  return `${dd}/${m}/${y}`;
}

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

  const parseFilename = (contentDisposition?: string | null) => {
    if (!contentDisposition) return null;

    const cd = String(contentDisposition);
    const utf8 = cd.match(/filename\*=(?:UTF-8''|)([^;\n]+)/i);
    if (utf8?.[1]) {
      const raw = utf8[1].trim().replace(/^"|"$/g, '');
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }

    const basic = cd.match(/filename=([^;\n]+)/i);
    return basic?.[1] ? basic[1].trim().replace(/^"|"$/g, '') : null;
  };

  const downloadProposalPdf = async (proposal: Proposal) => {
    const hash = proposal.publicHash || (proposal as any).public_hash || null;
    const endpoint = hash
      ? `/public/proposals/${encodeURIComponent(hash)}/pdf`
      : `/proposals/${proposal.id}/pdf/file`;

    const res = await apiClient.get<Blob>(endpoint, { responseType: 'blob' });
    const contentDisposition =
      (res.headers?.['content-disposition'] || res.headers?.['Content-Disposition']) as
        | string
        | undefined;

    const fileName = parseFilename(contentDisposition) || `proposta-${proposal.id}.pdf`;
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
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
                  {formatDateBR(proposal.validUntil)}
                </td>

                {/* Ações */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Button type="button"
                      variant="ghost"
                      size="sm"
                      data-tour="proposals-details"
                      onClick={(e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); onViewDetails(proposal); }}
                      aria-label="Ver detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    {proposal.status === ProposalStatus.RASCUNHO && (
                      <>
                        <Button type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); onEditProposal(proposal); }}
                          aria-label="Editar proposta"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <Button type="button"
                          variant="ghost"
                          size="sm"
                          data-tour="proposals-sharing"
                          onClick={(e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); onSendProposal(proposal); }}
                          aria-label="Enviar proposta"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </>
                    )}

                    <Button type="button"
                      variant="ghost"
                      size="sm"
                      data-tour="proposals-sharing"
                      title="Baixar proposta (PDF)"
                      onClick={async (e: MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          await downloadProposalPdf(proposal);
                        } catch (error) {
                          console.error('Erro ao baixar proposta:', error);
                        }
                      }}
                      aria-label="Baixar proposta"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
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
