import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Reservation, UnitType } from '../../types';
import { ReservationStatusBadge } from './ReservationStatusBadge';
import {
  getClientById,
  getProposalById,
  getCampaignForProposal,
  getMediaUnitById,
  getMediaPointByMediaUnit,
  getAmountForReservation,
} from '../../lib/mockData';
import { toast } from 'sonner@2.0.3';

interface ReservationDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: (Reservation & { estimatedAmount?: number }) | null;
}

export function ReservationDetailsDrawer({
  open,
  onOpenChange,
  reservation,
}: ReservationDetailsDrawerProps) {
  if (!reservation) return null;

  const unit = getMediaUnitById(reservation.mediaUnitId);
  const point = unit ? getMediaPointByMediaUnit(unit.id) : undefined;
  const proposal = reservation.proposalId ? getProposalById(reservation.proposalId) : undefined;
  const campaign = reservation.campaignId || (proposal ? getCampaignForProposal(proposal.id) : undefined);
  const client = proposal ? getClientById(proposal.clientId) : undefined;

  const handleNavigateToProposal = () => {
    // TODO: Navegar para módulo de Propostas
    toast.info('Navegação para Propostas (TODO: implementar)');
  };

  const handleNavigateToCampaign = () => {
    // TODO: Navegar para módulo de Campanhas
    toast.info('Navegação para Campanhas (TODO: implementar)');
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[90vh] max-w-3xl mx-auto">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <DrawerTitle>Reserva {reservation.id.slice(-6)}</DrawerTitle>
                <ReservationStatusBadge status={reservation.status as any} />
              </div>
              <p className="text-sm text-gray-600">
                {point?.name || 'Ponto não encontrado'} • {unit?.label}
              </p>
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
          <Tabs defaultValue="summary" className="space-y-6">
            <TabsList>
              <TabsTrigger value="summary">Resumo</TabsTrigger>
              <TabsTrigger value="origin">Origem</TabsTrigger>
              <TabsTrigger value="billing">Financeiro</TabsTrigger>
            </TabsList>

            {/* Aba: Resumo */}
            <TabsContent value="summary" className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Cliente</p>
                  <p className="text-gray-900">{client?.companyName || client?.contactName || '-'}</p>
                  {client?.companyName && (
                    <p className="text-sm text-gray-600">{client.contactName}</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <ReservationStatusBadge status={reservation.status as any} />
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Ponto de Mídia</p>
                  <p className="text-gray-900">{point?.name || '-'}</p>
                  <p className="text-sm text-gray-600">
                    {point?.addressCity}, {point?.addressState}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Unidade</p>
                  <p className="text-gray-900">{unit?.label || '-'}</p>
                  <p className="text-sm text-gray-600">
                    Tipo: {unit?.unitType === UnitType.FACE ? 'Face' : 'Tela'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Período</p>
                  <p className="text-gray-900">
                    {new Date(reservation.startDate).toLocaleDateString('pt-BR')} -{' '}
                    {new Date(reservation.endDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Valor Estimado</p>
                  <p className="text-gray-900">
                    R${' '}
                    {getAmountForReservation(reservation).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {/* TODO: Calcular valor real baseado em ProposalItem */}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Aba: Origem */}
            <TabsContent value="origin" className="space-y-4">
              <div>
                <h4 className="text-gray-900 mb-3">Origem da Reserva</h4>

                {proposal && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Proposta</p>
                        <p className="text-gray-900">{proposal.title || `Proposta ${proposal.id.slice(-6)}`}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleNavigateToProposal}>
                        Ver Proposta
                      </Button>
                    </div>
                  </div>
                )}

                {campaign && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Campanha</p>
                        <p className="text-gray-900">{campaign.name}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleNavigateToCampaign}>
                        Ver Campanha
                      </Button>
                    </div>
                  </div>
                )}

                {!proposal && !campaign && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    Reserva sem proposta ou campanha vinculada
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Aba: Financeiro */}
            <TabsContent value="billing">
              <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500 text-sm mb-2">💰 Informações Financeiras</p>
                <p className="text-gray-400 text-xs">
                  Futuramente aqui serão exibidas as faturas (BillingInvoice) vinculadas à reserva
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
