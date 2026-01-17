import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Campaign, BillingInvoice, BillingStatus, Reservation } from '../../types';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import apiClient from '../../lib/apiClient';
import { toast } from 'sonner';
import { useNavigation } from '../../App';

interface CampaignDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
  defaultTab?: string;
  onRequestCheckIn?: (campaign: Campaign) => void;
}

export function CampaignDetailsDrawer({
  open,
  onOpenChange,
  campaign,
  defaultTab = 'summary',
  onRequestCheckIn,
}: CampaignDetailsDrawerProps) {
  const navigate = useNavigation();
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const loadExtras = async () => {
    if (!campaign) return;
    try {
      setLoading(true);
      const [invRes, resRes] = await Promise.all([
        apiClient.get<BillingInvoice[]>('/billing-invoices', {
          params: { campaignId: campaign.id, orderBy: 'dueDate', orderDirection: 'asc' },
        }),
        apiClient.get<Reservation[]>('/reservations', { params: { campaignId: campaign.id, orderBy: 'startDate' } }),
      ]);

      setInvoices(Array.isArray(invRes.data) ? invRes.data : []);
      setReservations(Array.isArray(resRes.data) ? resRes.data : []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados da campanha.');
      setInvoices([]);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadExtras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaign?.id]);

  // NOTE: este drawer é renderizado mesmo quando `campaign` ainda está null.
  // Não podemos adicionar hooks (useMemo/useEffect/etc) abaixo de um `return` condicional.
  // Caso contrário, o React acusa mudança na ordem de hooks e quebra a tela.

  const clientLabel =
    campaign?.client?.companyName || campaign?.client?.contactName || (campaign as any)?.clientName || '-';

  const hasCheckIn = !!campaign?.checkInAt;
  const checkInDeadlineAt = campaign?.checkInDeadlineAt ? new Date(campaign.checkInDeadlineAt as any) : null;

  const periodLabel = useMemo(() => {
    if (!campaign) return '-';
    const start = campaign.startDate ? new Date(campaign.startDate as any) : null;
    const end = campaign.endDate ? new Date(campaign.endDate as any) : null;
    if (hasCheckIn) {
      return `${start ? start.toLocaleDateString('pt-BR') : '-'} - ${end ? end.toLocaleDateString('pt-BR') : '-'}`;
    }
    if (checkInDeadlineAt) {
      return `Check-in até ${checkInDeadlineAt.toLocaleDateString('pt-BR')}`;
    }
    return `${start ? start.toLocaleDateString('pt-BR') : '-'} - ${end ? end.toLocaleDateString('pt-BR') : '-'}`;
  }, [campaign, hasCheckIn, checkInDeadlineAt]);

  const totals = useMemo(() => {
    const paid = invoices
      .filter((inv) => inv.status === BillingStatus.PAGA)
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    const openAmount = invoices
      .filter((inv) => inv.status === BillingStatus.ABERTA || inv.status === BillingStatus.VENCIDA)
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    return { paid, openAmount };
  }, [invoices]);

  if (!campaign) return null;

  

  const getReservationStatusBadge = (status: string) => {
    const base = 'bg-gray-100 text-gray-800';
    const cls =
      status === 'CONFIRMADA'
        ? 'bg-green-100 text-green-800'
        : status === 'CANCELADA'
        ? 'bg-gray-100 text-gray-800'
        : 'bg-yellow-100 text-yellow-800';
    return <Badge className={cls}>{status}</Badge>;
  };

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

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{clientLabel}</span>
                <span>•</span>
                <span>{periodLabel}</span>
                {campaign.totalAmountCents && (
                  <>
                    <span>•</span>
                    <span>
                      R${' '}
                      {(campaign.totalAmountCents / 100).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </>
                )}
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue={defaultTab} className="h-full flex flex-col">
            <TabsList className="w-full justify-start px-6 py-0 h-12 border-b rounded-none bg-transparent">
              <TabsTrigger value="summary">Resumo</TabsTrigger>
              <TabsTrigger value="media">Veiculações</TabsTrigger>
              <TabsTrigger value="installations">Instalações OOH</TabsTrigger>
              <TabsTrigger value="billing">Financeiro</TabsTrigger>
              <TabsTrigger value="messages">Mensagens</TabsTrigger>
            </TabsList>

            {/* Aba: Resumo */}
            <TabsContent value="summary" className="flex-1 overflow-y-auto p-6 space-y-6">
              {loading && <div className="text-sm text-gray-500">Carregando dados...</div>}

              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Unidades reservadas</p>
                  <p className="text-2xl font-semibold text-blue-900">{reservations.length}</p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Faturas</p>
                  <p className="text-2xl font-semibold text-purple-900">{invoices.length}</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Valor Pago</p>
                  <p className="text-2xl font-semibold text-green-900">
                    R$ {totals.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Em Aberto</p>
                  <p className="text-2xl font-semibold text-yellow-900">
                    R$ {totals.openAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Notas</p>
                <p className="text-sm text-gray-500">
                  No novo fluxo, as <b>reservas</b> são criadas automaticamente ao concluir o <b>check-in</b>
                  (1 foto por face). Antes do check-in, é normal a campanha não ter reservas.
                </p>
              </div>
            </TabsContent>

            {/* Aba: Veiculações */}
            <TabsContent value="media" className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-900">Reservas da campanha</h3>
                <Button variant="outline" size="sm" onClick={loadExtras} disabled={loading}>
                  Atualizar
                </Button>
              </div>

              {loading ? (
                <div className="text-sm text-gray-500">Carregando reservas...</div>
              ) : reservations.length === 0 ? (
                <div className="text-sm text-gray-500">
                  Nenhuma reserva encontrada. As reservas serão criadas automaticamente ao concluir o <b>check-in</b>.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Unidade</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Período</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reservations.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-700">{r.mediaUnitLabel || r.mediaUnitId}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {new Date(r.startDate).toLocaleDateString('pt-BR')} -{' '}
                            {new Date(r.endDate).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3">{getReservationStatusBadge(r.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Aba: Instalações OOH */}
            <TabsContent value="installations" className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2">
                <p className="text-sm text-blue-900">📸 Check-in de Instalação</p>
                <p className="text-sm text-blue-800">
                  Para iniciar a veiculação, realize o <b>check-in</b> enviando 1 foto por face/unidade.
                </p>

                {!hasCheckIn && checkInDeadlineAt && (
                  <p className="text-sm text-blue-800">
                    Prazo limite: <b>{checkInDeadlineAt.toLocaleDateString('pt-BR')}</b>
                  </p>
                )}

                {hasCheckIn && campaign.checkInAt && (
                  <p className="text-sm text-blue-800">
                    Check-in realizado em: <b>{new Date(campaign.checkInAt as any).toLocaleString('pt-BR')}</b>
                  </p>
                )}

                {!hasCheckIn && onRequestCheckIn && campaign.status === 'EM_INSTALACAO' && (
                  <div>
                    <Button onClick={() => onRequestCheckIn(campaign)}>Realizar check-in</Button>
                  </div>
                )}
              </div>

              {reservations.length === 0 ? (
                <div className="text-sm text-gray-500">
                  Nenhuma reserva encontrada. As reservas serão criadas ao concluir o <b>check-in</b>.
                </div>
              ) : (
                <div className="space-y-3">
                  {reservations.map((r) => (
                    <div key={r.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{r.mediaUnitLabel || r.mediaUnitId}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(r.startDate).toLocaleDateString('pt-BR')} -{' '}
                            {new Date(r.endDate).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        {getReservationStatusBadge(r.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Aba: Financeiro */}
            <TabsContent value="billing" className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-900">Faturas da campanha</h3>
                <Button variant="outline" size="sm" onClick={loadExtras} disabled={loading}>
                  Atualizar
                </Button>
              </div>

              {loading ? (
                <div className="text-sm text-gray-500">Carregando faturas...</div>
              ) : invoices.length === 0 ? (
                <div className="text-sm text-gray-500">Nenhuma fatura vinculada a esta campanha.</div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            Venc.: {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-sm text-gray-500">
                            Valor: R$ {Number(invoice.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <Badge
                          className={
                            invoice.status === BillingStatus.PAGA
                              ? 'bg-green-100 text-green-800'
                              : invoice.status === BillingStatus.VENCIDA
                              ? 'bg-red-100 text-red-800'
                              : invoice.status === BillingStatus.CANCELADA
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </div>

                      {invoice.paidAt && (
                        <p className="text-xs text-gray-500">
                          Pago em {new Date(invoice.paidAt).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Aba: Mensagens */}
            <TabsContent value="messages" className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  Abra o módulo <span className="font-medium">Mensagens</span> para conversar no contexto desta campanha.
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (!campaign) return;
                      onOpenChange(false);
                      navigate(`/app/messages?campaignId=${campaign.id}`);
                    }}
                  >
                    Abrir Mensagens
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
