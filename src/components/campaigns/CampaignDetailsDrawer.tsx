import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import {
  Campaign,
  BillingInvoice,
  BillingInvoiceForecastItem,
  BillingStatus,
  BillingInvoiceType,
  Reservation,
} from '../../types';
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

type CampaignDetailsResponse = {
  campaign: Campaign;
  invoices: BillingInvoice[];
  forecastInvoices?: BillingInvoiceForecastItem[];
  reservations: Reservation[];
  checkIn?: any;
};

type CampaignCheckInInfoResponse = {
  campaignId: string;
  status: string;
  checkInAt?: string | Date | null;
  checkInDeadlineAt?: string | Date | null;
  deadlineAt?: string | Date | null;
  faces?: Array<{
    mediaUnitId: string;
    label?: string | null;
    imageUrl?: string | null;
    mediaPointId?: string | null;
    mediaPointName?: string | null;
    photo?: {
      id: string;
      mediaUnitId: string;
      photoUrl: string;
      createdAt?: string | Date;
      updatedAt?: string | Date;
    } | null;
  }>;
  expectedUnits?: Array<{ mediaUnitId: string; label?: string | null; photoUrl?: string | null }>;
  photos?: Array<{ mediaUnitId: string; photoUrl: string }>;
  missingPhotos?: string[];
  canConfirm?: boolean;
  blockers?: string[];
  blockingReasons?: string[];
  invoices?: any;
};

export function CampaignDetailsDrawer({
  open,
  onOpenChange,
  campaign,
  defaultTab = 'summary',
  onRequestCheckIn,
}: CampaignDetailsDrawerProps) {
  const navigate = useNavigation();
  const [loading, setLoading] = useState(false);
  const [localCampaign, setLocalCampaign] = useState<Campaign | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [forecastInvoices, setForecastInvoices] = useState<BillingInvoiceForecastItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [checkInInfo, setCheckInInfo] = useState<CampaignCheckInInfoResponse | null>(null);

  const resolveFileUrl = useMemo(() => {
    const base = String((apiClient.defaults as any)?.baseURL ?? '');
    const origin = base.startsWith('/') ? '' : base.replace(/\/?api\/?$/, '');
    return (url?: string | null) => {
      if (!url) return null;
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      // Se base for relativa (/api), o /uploads já resolve no mesmo host
      if (!origin) return url;
      return `${origin}${url}`;
    };
  }, []);

  const loadExtras = async () => {
    if (!campaign) return;
    try {
      setLoading(true);
      // Preferencial: endpoint agregador (1 request)
      try {
        const detailsRes = await apiClient.get<CampaignDetailsResponse>(`/campaigns/${campaign.id}/details`);
        const data: any = detailsRes?.data;

        if (data && typeof data === 'object' && data.campaign) {
          setLocalCampaign(data.campaign as Campaign);
          setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
          setForecastInvoices(Array.isArray(data.forecastInvoices) ? data.forecastInvoices : []);
          setReservations(Array.isArray(data.reservations) ? data.reservations : []);
          setCheckInInfo((data.checkIn ?? null) as any);
          return;
        }
      } catch {
        // Fallback abaixo
      }

      const [invRes, forecastRes, resRes, checkRes] = await Promise.allSettled([
        apiClient.get<BillingInvoice[]>('/billing-invoices', {
          params: { campaignId: campaign.id, orderBy: 'dueDate', orderDirection: 'asc' },
        }),
        apiClient.get<BillingInvoiceForecastItem[]>('/billing-invoices/forecast', {
          params: { campaignId: campaign.id },
        }),
        apiClient.get<Reservation[]>('/reservations', { params: { campaignId: campaign.id, orderBy: 'startDate' } }),
        apiClient.get<CampaignCheckInInfoResponse>(`/campaigns/${campaign.id}/checkin`),
      ]);

      setLocalCampaign(null);
      setInvoices(invRes.status === 'fulfilled' && Array.isArray(invRes.value.data) ? invRes.value.data : []);
      setForecastInvoices(
        forecastRes.status === 'fulfilled' && Array.isArray(forecastRes.value.data) ? forecastRes.value.data : []
      );
      setReservations(resRes.status === 'fulfilled' && Array.isArray(resRes.value.data) ? resRes.value.data : []);
      setCheckInInfo(checkRes.status === 'fulfilled' ? (checkRes.value.data as any) : null);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados da campanha.');
      setLocalCampaign(null);
      setInvoices([]);
      setForecastInvoices([]);
      setReservations([]);
      setCheckInInfo(null);
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

  const c = localCampaign ?? campaign;

  const clientLabel = c?.client?.companyName || c?.client?.contactName || (c as any)?.clientName || '-';

  const hasCheckIn = !!c?.checkInAt;
  const checkInDeadlineAt = c?.checkInDeadlineAt ? new Date(c.checkInDeadlineAt as any) : null;

  const periodLabel = useMemo(() => {
    if (!c) return '-';
    const start = c.startDate ? new Date(c.startDate as any) : null;
    const end = c.endDate ? new Date(c.endDate as any) : null;
    if (hasCheckIn) {
      return `${start ? start.toLocaleDateString('pt-BR') : '-'} - ${end ? end.toLocaleDateString('pt-BR') : '-'}`;
    }
    if (checkInDeadlineAt) {
      return `Check-in até ${checkInDeadlineAt.toLocaleDateString('pt-BR')}`;
    }
    return `${start ? start.toLocaleDateString('pt-BR') : '-'} - ${end ? end.toLocaleDateString('pt-BR') : '-'}`;
  }, [c, hasCheckIn, checkInDeadlineAt]);

  const totals = useMemo(() => {
    const paid = invoices
      .filter((inv) => inv.status === BillingStatus.PAGA)
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    const openAmount = invoices
      .filter((inv) => inv.status === BillingStatus.ABERTA || inv.status === BillingStatus.VENCIDA)
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    return { paid, openAmount };
  }, [invoices]);

  const paymentGate = useMemo(() => {
    const isPaid = (inv: BillingInvoice) => inv.status === BillingStatus.PAGA;
    const isCancelled = (inv: BillingInvoice) => inv.status === BillingStatus.CANCELADA;
    if (!invoices.length) return { ok: true, pending: [] as BillingInvoice[] };

    const upfront = invoices.filter((i) => i.type === BillingInvoiceType.UPFRONT && !isCancelled(i));
    const rent = invoices.filter((i) => i.type === BillingInvoiceType.RENT && !isCancelled(i));
    const firstRent = rent
      .slice()
      .sort((a, b) => {
        const sa = a.sequence ?? 9999;
        const sb = b.sequence ?? 9999;
        if (sa !== sb) return sa - sb;
        return new Date(a.dueDate as any).getTime() - new Date(b.dueDate as any).getTime();
      })[0];

    let required: BillingInvoice[] = [];
    if (upfront.length || rent.length) {
      required = [...upfront, ...(firstRent ? [firstRent] : [])];
    } else {
      const minDue = Math.min(...invoices.map((i) => new Date(i.dueDate as any).getTime()));
      required = invoices.filter((i) => new Date(i.dueDate as any).getTime() === minDue);
    }

    const pending = required.filter((i) => !isPaid(i));
    return { ok: pending.length === 0, pending };
  }, [invoices]);

  const anchorDay = useMemo(() => {
    if (!c) return null;
    if (c.approvedAt) return new Date(c.approvedAt as any).getDate();
    if (invoices.length) return new Date(invoices[0].dueDate as any).getDate();
    return null;
  }, [c, invoices]);

  const nextDue = useMemo(() => {
    const isPaid = (inv: BillingInvoice) => inv.status === BillingStatus.PAGA;
    const isCancelled = (inv: BillingInvoice) => inv.status === BillingStatus.CANCELADA;
    return (
      invoices
        .filter((i) => !isPaid(i) && !isCancelled(i))
        .slice()
        .sort((a, b) => new Date(a.dueDate as any).getTime() - new Date(b.dueDate as any).getTime())[0] || null
    );
  }, [invoices]);

  const hasConfirmationAlert = useMemo(() => {
    const fromInvoices = invoices.some(
      (i) => !!i.requiresConfirmation && i.status !== BillingStatus.PAGA && i.status !== BillingStatus.CANCELADA
    );
    const fromForecast = forecastInvoices.some((i) => !!i.requiresConfirmation);
    return fromInvoices || fromForecast;
  }, [invoices, forecastInvoices]);

  const faces = (checkInInfo?.faces ?? []) as Array<any>;
  const photosDone = faces.filter((f) => !!f?.photo?.photoUrl).length;
  const photosTotal = faces.length;
  const plannedUnits =
    faces.length > 0
      ? faces.length
      : (c as any)?.reservedUnitsCount ?? (c as any)?.campaignItemsCount ?? reservations.length ?? 0;

  if (!c) return null;

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
      <DrawerContent className="h-[92vh] max-w-5xl mx-auto">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <DrawerTitle>{c.name}</DrawerTitle>
                <CampaignStatusBadge status={c.status} />
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{clientLabel}</span>
                <span>•</span>
                <span>{periodLabel}</span>
                {!!(c as any).totalAmountCents && (
                  <>
                    <span>•</span>
                    <span>
                      R${' '}
                      {(((c as any).totalAmountCents as number) / 100).toLocaleString('pt-BR', {
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
                  <p className="text-sm text-gray-500 mb-1">Unidades planejadas</p>
                  <p className="text-2xl font-semibold text-blue-900">{plannedUnits}</p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Check-in</p>
                  <p className="text-2xl font-semibold text-purple-900">
                    {hasCheckIn ? 'OK' : photosTotal > 0 ? `${photosDone}/${photosTotal}` : '—'}
                  </p>
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
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <p className="text-sm text-gray-600">
                    <b>Resumo rápido</b>
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-gray-100 text-gray-800">Reservas: {reservations.length}</Badge>
                    <Badge className="bg-gray-100 text-gray-800">Faturas: {invoices.length}</Badge>
                    {(c as any)?.proposalId ? (
                      <Badge className="bg-gray-100 text-gray-800">Proposta: {(c as any).proposalId.slice(0, 8)}…</Badge>
                    ) : null}
                  </div>
                </div>

                <p className="text-sm text-gray-500 mt-2">
                  No novo fluxo, as <b>reservas</b> são criadas automaticamente ao concluir o <b>check-in</b> (1 foto por
                  face). Antes do check-in, é normal a campanha não ter reservas.
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
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Ponto / Unidade</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600 hidden md:table-cell">Responsável</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600 hidden lg:table-cell">Ocupação</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Período</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Valor</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reservations.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="font-medium text-gray-900">{(r as any).mediaPointName || '-'}</div>
                            <div className="text-xs text-gray-600">{r.mediaUnitLabel || r.mediaUnitId}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell">
                            {(r as any).responsibleCompanyName || (r as any).responsibleOwnerName || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 hidden lg:table-cell">
                            {(r as any).occupationDays ? `${(r as any).occupationDays} dias` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {new Date(r.startDate).toLocaleDateString('pt-BR')} -{' '}
                            {new Date(r.endDate).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {typeof (r as any).rentAmount === 'number'
                              ? `R$ ${(r as any).rentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '-'}
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

                {hasCheckIn && c.checkInAt && (
                  <p className="text-sm text-blue-800">
                    Check-in realizado em: <b>{new Date(c.checkInAt as any).toLocaleString('pt-BR')}</b>
                  </p>
                )}

                {!hasCheckIn && checkInInfo?.blockingReasons?.length ? (
                  <div className="rounded-lg p-3 text-sm bg-yellow-50 border border-yellow-200 text-yellow-900">
                    <div className="font-medium">Pendências</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-yellow-800 space-y-1">
                      {checkInInfo.blockingReasons.slice(0, 6).map((b, idx) => (
                        <li key={`${b}-${idx}`}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {!hasCheckIn && invoices.length > 0 ? (
                  <div
                    className={`rounded-lg p-3 text-sm ${paymentGate.ok ? 'bg-green-50 border border-green-200 text-green-900' : 'bg-red-50 border border-red-200 text-red-900'}`}
                  >
                    {paymentGate.ok
                      ? 'Pagamento inicial OK — check-in liberado'
                      : 'Pagamento inicial pendente — check-in ficará bloqueado'}

                    {!paymentGate.ok && paymentGate.pending.length > 0 ? (
                      <ul className="mt-2 list-disc pl-5 text-sm text-red-800 space-y-1">
                        {paymentGate.pending.map((inv) => (
                          <li key={inv.id}>
                            {inv.type === BillingInvoiceType.UPFRONT
                              ? 'Custos iniciais (produção/instalação)'
                              : inv.type === BillingInvoiceType.RENT
                              ? 'Aluguel (primeiro ciclo)'
                              : 'Fatura inicial'}{' '}
                            — venc. {new Date(inv.dueDate as any).toLocaleDateString('pt-BR')}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                {!hasCheckIn && onRequestCheckIn && c.status === 'EM_INSTALACAO' && (
                  <div>
                    <Button onClick={() => onRequestCheckIn(c)} disabled={invoices.length > 0 && !paymentGate.ok}>
                      Realizar check-in
                    </Button>
                  </div>
                )}
              </div>

              {faces.length === 0 ? (
                <div className="text-sm text-gray-500">
                  Não foi possível listar as faces/unidades desta campanha. (Caso isso persista, verifique se existem
                  itens de campanha.)
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Face/Unidade</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600 hidden md:table-cell">Ponto</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Foto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {faces.map((f) => {
                        const photoUrl = resolveFileUrl(f?.photo?.photoUrl ?? null);
                        const ok = !!photoUrl;
                        return (
                          <tr key={f.mediaUnitId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <div className="font-medium text-gray-900">{f.label || f.mediaUnitId}</div>
                              <div className="text-xs text-gray-600">{f.mediaUnitId}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell">
                              {f.mediaPointName || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <div className="flex items-center gap-3">
                                <Badge className={ok ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                  {ok ? 'OK' : 'Pendente'}
                                </Badge>
                                {ok ? (
                                  <a
                                    href={photoUrl as any}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2"
                                  >
                                    <img
                                      src={photoUrl as any}
                                      alt="Foto do check-in"
                                      className="w-12 h-12 object-cover rounded-md border"
                                    />
                                    <span className="text-xs text-gray-600">abrir</span>
                                  </a>
                                ) : (
                                  <span className="text-xs text-gray-500">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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

              {/* Mensagens do novo fluxo (recorrência + bloqueio de check-in) */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <span>
                    <b>Regra:</b> o primeiro pagamento deve estar <b>pago</b> para liberar o check-in.
                  </span>
                  {anchorDay ? <Badge className="bg-gray-100 text-gray-800">Recorrência: dia {anchorDay}</Badge> : null}
                </div>
                {nextDue ? (
                  <div className="mt-1 text-xs text-blue-800">
                    Próximo vencimento: <b>{new Date(nextDue.dueDate as any).toLocaleDateString('pt-BR')}</b>
                  </div>
                ) : null}
                {hasConfirmationAlert ? (
                  <div className="mt-1 text-xs text-blue-800">
                    <b>Atenção:</b> existe uma cobrança marcada como “requer confirmação” (regra de 30 dias antes do vencimento).
                  </div>
                ) : null}
              </div>

              {invoices.length > 0 ? (
                <div
                  className={`border rounded-lg p-4 text-sm ${paymentGate.ok ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`}
                >
                  {paymentGate.ok ? 'Pagamento inicial OK — check-in liberado' : 'Pagamento inicial pendente — check-in bloqueado'}
                </div>
              ) : null}

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
                            {(invoice.type === BillingInvoiceType.UPFRONT
                              ? 'Custos iniciais'
                              : invoice.type === BillingInvoiceType.RENT
                              ? 'Aluguel'
                              : 'Fatura') + (invoice.sequence ? ` • ciclo ${invoice.sequence}` : '')}
                          </p>
                          <p className="text-sm text-gray-500">
                            Venc.: {new Date(invoice.dueDate).toLocaleDateString('pt-BR')} • Valor: R${' '}
                            {Number(invoice.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {invoice.periodStart && invoice.periodEnd ? (
                            <p className="text-xs text-gray-500">
                              Período: {new Date(invoice.periodStart as any).toLocaleDateString('pt-BR')} -{' '}
                              {new Date(invoice.periodEnd as any).toLocaleDateString('pt-BR')}
                            </p>
                          ) : null}
                          {invoice.requiresConfirmation ? (
                            <p className="text-xs text-blue-700">Requer confirmação (regra de 30 dias antes do vencimento)</p>
                          ) : null}
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

              {/* Forecast de faturas futuras (não existem no banco até entrarem na janela de 30 dias) */}
              {!loading ? (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-gray-900">Faturas futuras (previsto)</h4>
                    <Badge className="bg-gray-100 text-gray-800">Forecast</Badge>
                  </div>
                  {forecastInvoices.length === 0 ? (
                    <div className="text-sm text-gray-500">Não há faturas futuras previstas para esta campanha.</div>
                  ) : (
                    <div className="space-y-3">
                      {forecastInvoices.map((inv) => {
                        const due = new Date(inv.dueDate as any);
                        const ps = inv.periodStart ? new Date(inv.periodStart as any) : null;
                        const pe = inv.periodEnd ? new Date(inv.periodEnd as any) : null;
                        return (
                          <div key={inv.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-gray-900">
                                  Aluguel{inv.sequence ? ` • ciclo ${inv.sequence}` : ''}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Venc.: {due.toLocaleDateString('pt-BR')} • Valor: R${' '}
                                  {Number(inv.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                {ps && pe ? (
                                  <p className="text-xs text-gray-500">
                                    Período: {ps.toLocaleDateString('pt-BR')} - {pe.toLocaleDateString('pt-BR')}
                                  </p>
                                ) : null}
                                {inv.requiresConfirmation ? (
                                  <p className="text-xs text-blue-700">
                                    Requer confirmação (regra de 30 dias antes do vencimento)
                                  </p>
                                ) : null}
                              </div>
                              <Badge className="bg-gray-100 text-gray-800">Prevista</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
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
                      if (!c) return;
                      onOpenChange(false);
                      navigate(`/app/messages?campaignId=${c.id}`);
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
