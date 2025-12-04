import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Campaign, MediaType, BillingStatus } from '../../types';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import {
  getClientById,
  getUserById,
  getProposalById,
  getItemsForProposal,
  getMediaUnitById,
  getMediaPointByMediaUnit,
  getBillingInvoicesForCampaign,
} from '../../lib/mockData';

interface CampaignDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
  defaultTab?: string;
}

export function CampaignDetailsDrawer({
  open,
  onOpenChange,
  campaign,
  defaultTab = 'summary',
}: CampaignDetailsDrawerProps) {
  if (!campaign) return null;

  const client = getClientById(campaign.clientId);
  const proposal = getProposalById(campaign.proposalId);
  const user = proposal ? getUserById(proposal.responsibleUserId) : undefined;
  const items = proposal ? getItemsForProposal(proposal.id) : [];
  const mediaItems = items.filter((item) => item.mediaUnitId);
  const invoices = getBillingInvoicesForCampaign(campaign.id);

  // Contar unidades OOH vs DOOH
  const oohCount = mediaItems.filter((item) => {
    const unit = item.mediaUnitId ? getMediaUnitById(item.mediaUnitId) : undefined;
    const point = unit ? getMediaPointByMediaUnit(unit.id) : undefined;
    return point?.type === MediaType.OOH;
  }).length;

  const doohCount = mediaItems.filter((item) => {
    const unit = item.mediaUnitId ? getMediaUnitById(item.mediaUnitId) : undefined;
    const point = unit ? getMediaPointByMediaUnit(unit.id) : undefined;
    return point?.type === MediaType.DOOH;
  }).length;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[90vh] max-w-4xl mx-auto">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <DrawerTitle>{campaign.name}</DrawerTitle>
                <CampaignStatusBadge status={campaign.status} />
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{client?.companyName || client?.contactName}</span>
                <span>•</span>
                <span>
                  {new Date(campaign.startDate).toLocaleDateString('pt-BR')} -{' '}
                  {new Date(campaign.endDate).toLocaleDateString('pt-BR')}
                </span>
                {proposal && (
                  <>
                    <span>•</span>
                    <span>
                      R${' '}
                      {proposal.totalAmount.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </>
                )}
              </div>
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

        <div className="overflow-y-auto p-6">
          <Tabs defaultValue={defaultTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="summary">Resumo</TabsTrigger>
              <TabsTrigger value="media">Veiculações</TabsTrigger>
              <TabsTrigger value="installations">Instalações OOH</TabsTrigger>
              <TabsTrigger value="billing">Financeiro</TabsTrigger>
              <TabsTrigger value="messages">Mensagens</TabsTrigger>
            </TabsList>

            {/* Aba: Resumo */}
            <TabsContent value="summary" className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Cliente</p>
                  <p className="text-gray-900">{client?.companyName || client?.contactName}</p>
                  {client?.companyName && (
                    <p className="text-sm text-gray-600">{client.contactName}</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Responsável</p>
                  <p className="text-gray-900">{user?.name || 'Responsável interno (mock)'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Unidades OOH</p>
                  <p className="text-gray-900">{oohCount}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Unidades DOOH</p>
                  <p className="text-gray-900">{doohCount}</p>
                </div>
              </div>

              {/* Lista resumida de unidades */}
              <div>
                <h4 className="text-sm text-gray-900 mb-3">Principais Unidades de Mídia</h4>
                <div className="space-y-2">
                  {mediaItems.slice(0, 5).map((item) => {
                    const unit = item.mediaUnitId ? getMediaUnitById(item.mediaUnitId) : undefined;
                    const point = unit ? getMediaPointByMediaUnit(unit.id) : undefined;

                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm text-gray-900">{point?.name || '-'}</p>
                          <p className="text-xs text-gray-600">
                            {unit?.label} • {point?.addressCity} • {point?.type}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {mediaItems.length > 5 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      + {mediaItems.length - 5} unidades adicionais
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Aba: Veiculações */}
            <TabsContent value="media" className="space-y-4">
              <div>
                <h4 className="text-gray-900 mb-3">Itens da Campanha ({mediaItems.length})</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-600">Ponto de Mídia</th>
                        <th className="px-4 py-3 text-left text-gray-600">Unidade</th>
                        <th className="px-4 py-3 text-left text-gray-600">Tipo</th>
                        <th className="px-4 py-3 text-left text-gray-600">Período</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {mediaItems.map((item) => {
                        const unit = item.mediaUnitId ? getMediaUnitById(item.mediaUnitId) : undefined;
                        const point = unit ? getMediaPointByMediaUnit(unit.id) : undefined;

                        const itemDifferent =
                          item.startDate &&
                          item.endDate &&
                          (new Date(item.startDate).getTime() !== new Date(campaign.startDate).getTime() ||
                            new Date(item.endDate).getTime() !== new Date(campaign.endDate).getTime());

                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-900">{point?.name || '-'}</td>
                            <td className="px-4 py-3 text-gray-700">{unit?.label || '-'}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">{point?.type || '-'}</Badge>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {item.startDate && item.endDate ? (
                                <>
                                  {new Date(item.startDate).toLocaleDateString('pt-BR')} -{' '}
                                  {new Date(item.endDate).toLocaleDateString('pt-BR')}
                                  {itemDifferent && (
                                    <span className="text-xs text-orange-600 ml-2">(período diferente)</span>
                                  )}
                                </>
                              ) : (
                                'Período da campanha'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Aba: Instalações OOH */}
            <TabsContent value="installations" className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-900 mb-2">📋 Instalações OOH</p>
                <p className="text-sm text-blue-700">
                  Esta campanha possui <strong>{oohCount}</strong> unidades OOH que requerem instalação física.
                  {/* TODO: Implementar lista de Reservation com status */}
                </p>
              </div>

              {/* Placeholder para reservas */}
              <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500 text-sm">
                  Reservas e checklists de instalação serão exibidos aqui
                </p>
                <p className="text-gray-400 text-xs mt-2">
                  (TODO: implementar lista de Reservation)
                </p>
              </div>
            </TabsContent>

            {/* Aba: Financeiro */}
            <TabsContent value="billing" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Valor da Proposta</p>
                  <p className="text-gray-900">
                    R${' '}
                    {(proposal?.totalAmount || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Valor Faturado</p>
                  <p className="text-gray-900">
                    R${' '}
                    {invoices
                      .reduce((sum, inv) => sum + inv.amount, 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {invoices.length > 0 ? (
                <div>
                  <h4 className="text-gray-900 mb-3">Faturas ({invoices.length})</h4>
                  <div className="space-y-2">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                        <div>
                          <p className="text-sm text-gray-900">
                            Vencimento: {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-gray-600">
                            R${' '}
                            {invoice.amount.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                        <Badge
                          className={
                            invoice.status === BillingStatus.PAGA
                              ? 'bg-green-100 text-green-800'
                              : invoice.status === BillingStatus.VENCIDA
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {invoice.status === BillingStatus.PAGA
                            ? 'Paga'
                            : invoice.status === BillingStatus.VENCIDA
                            ? 'Vencida'
                            : 'Aberta'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Nenhuma fatura vinculada</p>
                </div>
              )}
            </TabsContent>

            {/* Aba: Mensagens */}
            <TabsContent value="messages">
              <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500 text-sm mb-2">
                  💬 Mensagens (e-mail/WhatsApp) vinculadas à campanha
                </p>
                <p className="text-gray-400 text-xs">
                  Futuramente aqui ficarão mensagens (Message) vinculadas à campanha
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
