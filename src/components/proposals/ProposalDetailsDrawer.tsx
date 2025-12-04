import { X, Calendar, User, DollarSign, Package } from 'lucide-react';
import { Button } from '../ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Proposal } from '../../types';
import { ProposalStatusBadge } from './ProposalStatusBadge';
import {
  getClientById,
  getUserById,
  getItemsForProposal,
  getCampaignForProposal,
  getBillingStatusForProposal,
  getMediaUnitById,
  getProductById,
} from '../../lib/mockData';

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

  const client = getClientById(proposal.clientId);
  const user = getUserById(proposal.responsibleUserId);
  const items = getItemsForProposal(proposal.id);
  const campaign = getCampaignForProposal(proposal.id);
  const billingStatus = getBillingStatusForProposal(proposal.id);

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
                R$ {proposal.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {proposal.discountPercent && proposal.discountPercent > 0 && (
                <p className="text-green-600 text-sm">
                  Desconto: -{proposal.discountPercent}%
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Cliente</p>
              <p className="text-gray-900">{client?.companyName || client?.contactName || '-'}</p>
              {client?.companyName && (
                <p className="text-sm text-gray-600">{client.contactName}</p>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Responsável</p>
              <p className="text-gray-900">{user?.name || '-'}</p>
            </div>

            {proposal.validUntil && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Validade</p>
                <p className="text-gray-900">
                  {new Date(proposal.validUntil).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}

            {proposal.approvedAt && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Data de Aprovação</p>
                <p className="text-gray-900">
                  {new Date(proposal.approvedAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>

          {/* Condições/Observações */}
          {proposal.conditionsText && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Condições / Observações</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">{proposal.conditionsText}</p>
              </div>
            </div>
          )}

          {/* Itens da Proposta */}
          <div>
            <h3 className="text-gray-900 mb-4">Itens da Proposta ({items.length})</h3>
            <div className="space-y-3">
              {items.map((item) => {
                const mediaUnit = item.mediaUnitId ? getMediaUnitById(item.mediaUnitId) : undefined;
                const product = item.productId ? getProductById(item.productId) : undefined;

                return (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-gray-900">{item.description}</p>
                        {mediaUnit && (
                          <p className="text-sm text-gray-500">Mídia: {mediaUnit.label}</p>
                        )}
                        {product && (
                          <p className="text-sm text-gray-500">Produto: {product.name}</p>
                        )}
                      </div>
                      <p className="text-gray-900">
                        R$ {item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      {item.startDate && item.endDate && (
                        <div>
                          <p className="text-gray-500">Período</p>
                          <p className="text-gray-700">
                            {new Date(item.startDate).toLocaleDateString('pt-BR')} -{' '}
                            {new Date(item.endDate).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-500">Quantidade</p>
                        <p className="text-gray-700">{item.quantity}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Preço Unitário</p>
                        <p className="text-gray-700">
                          R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status da Campanha */}
          {campaign && (
            <div>
              <h3 className="text-gray-900 mb-3">Campanha</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-900 mb-1">{campaign.name}</p>
                <p className="text-sm text-gray-600">Status: {campaign.status}</p>
                <p className="text-sm text-gray-600">
                  {new Date(campaign.startDate).toLocaleDateString('pt-BR')} -{' '}
                  {new Date(campaign.endDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          )}

          {/* Status Financeiro */}
          {billingStatus && (
            <div>
              <h3 className="text-gray-900 mb-3">Status Financeiro</h3>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-900">
                  Fatura: {billingStatus === 'PAGA' ? 'Paga' : billingStatus === 'ABERTA' ? 'Aberta' : billingStatus}
                </p>
              </div>
            </div>
          )}

          {/* Link Público */}
          {proposal.publicHash && (
            <div>
              <h3 className="text-gray-900 mb-3">Link Público</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 font-mono break-all">
                  /p/{proposal.publicHash}
                </p>
              </div>
            </div>
          )}

          {/* TODO: Timeline */}
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500">
              {/* TODO: Implementar timeline de status (Rascunho → Enviada → Aprovada/Reprovada) */}
              Criado em {new Date(proposal.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
