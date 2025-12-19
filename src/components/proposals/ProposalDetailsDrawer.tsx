import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Proposal } from '../../types';
import { ProposalStatusBadge } from './ProposalStatusBadge';

interface ProposalDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Proposal | null;
}

export function ProposalDetailsDrawer({
  open,
  onOpenChange,
  proposal,
}: ProposalDetailsDrawerProps) {
  if (!proposal) return null;

  const items = proposal.items || [];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[90vh] max-w-3xl mx-auto">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>{proposal.title || 'Sem título'}</DrawerTitle>
              <p className="text-sm text-gray-500 mt-1">ID: ...{proposal.id.slice(-6)}</p>
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
        </DrawerHeader>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <ProposalStatusBadge status={proposal.status} />
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Valor Total</p>
              <p className="text-gray-900">
                R${' '}
                {(proposal.totalAmount || 0).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              {proposal.discountPercent != null && proposal.discountPercent > 0 && (
                <p className="text-green-600 text-sm">Desconto: -{proposal.discountPercent}%</p>
              )}
              {proposal.discountPercent == null &&
                proposal.discountAmount != null &&
                proposal.discountAmount > 0 && (
                  <p className="text-green-600 text-sm">
                    Desconto: -R${' '}
                    {proposal.discountAmount.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                )}
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Cliente</p>
              <p className="text-gray-900">
                {proposal.client?.companyName ||
                  proposal.client?.contactName ||
                  (proposal as any).clientName ||
                  '-'}
              </p>
              {proposal.client?.companyName && proposal.client?.contactName && (
                <p className="text-sm text-gray-600">{proposal.client.contactName}</p>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Responsável</p>
              <p className="text-gray-900">{(proposal as any).responsibleUserName || '-'}</p>
            </div>

            {proposal.validUntil && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Validade</p>
                <p className="text-gray-900">
                  {new Date(proposal.validUntil as any).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}

            {proposal.approvedAt && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Aprovada em</p>
                <p className="text-gray-900">
                  {new Date(proposal.approvedAt as any).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>

          {/* Condições/Observações */}
          {proposal.conditionsText && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Condições / Observações</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-line">{proposal.conditionsText}</p>
              </div>
            </div>
          )}

          {/* Itens */}
          <div>
            <h3 className="text-gray-900 mb-4">Itens da Proposta ({items.length})</h3>

            {items.length === 0 ? (
              <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                Essa proposta não possui itens (ou os itens não foram carregados).
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <div className="flex-1">
                        <p className="text-gray-900">{item.description}</p>
                        {item.mediaUnitId && (
                          <p className="text-sm text-gray-500">Mídia (unidade): ...{item.mediaUnitId.slice(-6)}</p>
                        )}
                        {item.productId && (
                          <p className="text-sm text-gray-500">Produto: ...{item.productId.slice(-6)}</p>
                        )}
                      </div>
                      <p className="text-gray-900">
                        R${' '}
                        {(item.totalPrice || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Quantidade</p>
                        <p className="text-gray-700">{item.quantity}</p>
                      </div>

                      <div>
                        <p className="text-gray-500">Preço Unitário</p>
                        <p className="text-gray-700">
                          R${' '}
                          {(item.unitPrice || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>

                      {item.startDate && item.endDate ? (
                        <div>
                          <p className="text-gray-500">Período</p>
                          <p className="text-gray-700">
                            {new Date(item.startDate as any).toLocaleDateString('pt-BR')} -{' '}
                            {new Date(item.endDate as any).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-gray-500">Período</p>
                          <p className="text-gray-700">-</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Link Público */}
          {proposal.publicHash && (
            <div>
              <h3 className="text-gray-900 mb-3">Link Público</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 font-mono break-all">/p/{proposal.publicHash}</p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500">
              Criado em {new Date(proposal.createdAt as any).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
