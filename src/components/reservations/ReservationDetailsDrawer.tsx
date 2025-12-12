import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Reservation } from '../../types';
import { ReservationStatusBadge } from './ReservationStatusBadge';
import { toast } from 'sonner';

interface ReservationDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: (Reservation & { estimatedAmount?: number }) | null;
  clientName?: string;
  unitLabel?: string;
  pointName?: string;
  amount?: number;
  onUpdateReservation?: (id: string, payload: Partial<Reservation>) => void;
  onDeleteReservation?: (id: string) => void;
}

export function ReservationDetailsDrawer({
  open,
  onOpenChange,
  reservation,
  clientName,
  unitLabel,
  pointName,
  amount,
  onUpdateReservation,
  onDeleteReservation,
}: ReservationDetailsDrawerProps) {
  if (!reservation) return null;
  // TODO: Enriquecer com dados de unidade/cliente via props quando disponíveis

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
              <p className="text-sm text-gray-600">{pointName || 'Unidade de Mídia'}</p>
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
                  <p className="text-gray-900">{clientName || '-'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <ReservationStatusBadge status={reservation.status as any} />
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Ponto de Mídia</p>
                  <p className="text-gray-900">{pointName || '-'}</p>
                  <p className="text-sm text-gray-600">{/* TODO: cidade/estado do ponto */}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Unidade</p>
                  <p className="text-gray-900">{unitLabel || '-'}</p>
                  <p className="text-sm text-gray-600">{/* TODO: Tipo Face/Tela */}</p>
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
                    {typeof amount === 'number'
                      ? `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : 'R$ -'}
                  </p>
                  <p className="text-xs text-gray-500">{/* TODO: calcular via ProposalItem */}</p>
                </div>
              </div>
            </TabsContent>

            {/* Aba: Origem */}
            <TabsContent value="origin" className="space-y-4">
              <div>
                <h4 className="text-gray-900 mb-3">Origem da Reserva</h4>

                {/* TODO: Exibir proposta vinculada quando dados agregados estiverem disponíveis */}
                {false && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Proposta</p>
                        <p className="text-gray-900">Proposta</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleNavigateToProposal}>
                        Ver Proposta
                      </Button>
                    </div>
                  </div>
                )}
                {/* TODO: Exibir campanha vinculada quando dados agregados estiverem disponíveis */}
                {false && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Campanha</p>
                        <p className="text-gray-900">Campanha</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleNavigateToCampaign}>
                        Ver Campanha
                      </Button>
                    </div>
                  </div>
                )}

                {/* Ações básicas */}
                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateReservation && reservation && onUpdateReservation(reservation.id, { status: reservation.status })}
                  >
                    Atualizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    onClick={() => onDeleteReservation && reservation && onDeleteReservation(reservation.id)}
                  >
                    Excluir
                  </Button>
                </div>

                {true && (
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
