import { useEffect, useMemo, useState } from 'react';
import { DollarSign, FileText, Info, RefreshCw } from 'lucide-react';

import apiClient from '../../lib/apiClient';
import { useNavigation } from '../../App';
import { BillingInvoice, BillingInvoiceForecastItem, BillingStatus, Reservation, UnitType } from '../../types';

import { Button } from '../ui/button';
import { Dialog, DialogContent } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

import { ReservationStatusBadge } from './ReservationStatusBadge';

interface ReservationDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: (Reservation & { estimatedAmount?: number }) | null;
  clientName?: string;
  unitLabel?: string;
  pointName?: string;
  amount?: number;
}

function daysBetweenInclusive(start: Date, end: Date): number | null {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const ms = end.getTime() - start.getTime();
  if (ms < 0) return null;
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

function estimateReservationAmount(r: Reservation | null | undefined): number | undefined {
  if (!r) return undefined;

  const rentTotalSnapshot = (r as any).rentTotalSnapshot as number | null | undefined;
  if (typeof rentTotalSnapshot === 'number' && Number.isFinite(rentTotalSnapshot) && rentTotalSnapshot > 0) {
    return rentTotalSnapshot;
  }

  const rentAmount = (r as any).rentAmount as number | null | undefined;
  const occupationDays = (r as any).occupationDays as number | null | undefined;

  if (typeof rentAmount === 'number' && Number.isFinite(rentAmount) && rentAmount > 0) {
    const occ = typeof occupationDays === 'number' && occupationDays > 0 ? occupationDays : undefined;
    const start = new Date(r.startDate);
    const end = new Date(r.endDate);
    const fallbackDays = daysBetweenInclusive(start, end);

    const days = occ ?? (fallbackDays || undefined);
    if (days) return rentAmount * days;

    // Melhor esforço.
    return rentAmount;
  }

  const unitDay = (r as any).mediaUnitPriceDay as number | null | undefined;
  const pointDay = (r as any).mediaPointBasePriceDay as number | null | undefined;
  const dayRate =
    typeof unitDay === 'number' && Number.isFinite(unitDay) && unitDay > 0
      ? unitDay
      : typeof pointDay === 'number' && Number.isFinite(pointDay) && pointDay > 0
        ? pointDay
        : undefined;

  if (typeof dayRate !== 'number') return undefined;

  const start = new Date(r.startDate);
  const end = new Date(r.endDate);
  const days = daysBetweenInclusive(start, end);
  if (!days) return undefined;

  return dayRate * days;
}

function formatBRL(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function formatDateBR(value?: any) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

function InvoiceStatusPill({ status }: { status: BillingStatus }) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
  switch (status) {
    case BillingStatus.PAGA:
      return <span className={`${base} bg-green-100 text-green-700`}>Paga</span>;
    case BillingStatus.ABERTA:
      return <span className={`${base} bg-yellow-100 text-yellow-800`}>Em aberto</span>;
    case BillingStatus.VENCIDA:
      return <span className={`${base} bg-red-100 text-red-700`}>Vencida</span>;
    case BillingStatus.CANCELADA:
      return <span className={`${base} bg-gray-100 text-gray-600`}>Cancelada</span>;
    default:
      return <span className={`${base} bg-gray-100 text-gray-700`}>{status}</span>;
  }
}

export function ReservationDetailsDrawer({ open, onOpenChange, reservation, clientName, unitLabel, pointName, amount }: ReservationDetailsDrawerProps) {
  const navigate = useNavigation();

  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [forecast, setForecast] = useState<BillingInvoiceForecastItem[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const unitType = (reservation as any)?.mediaUnitType as UnitType | undefined;

  const computedAmount = useMemo(() => {
    return amount ?? reservation?.estimatedAmount ?? estimateReservationAmount(reservation);
  }, [amount, reservation]);

  const totals = useMemo(() => {
    const paid = invoices
      .filter((i) => i.status === BillingStatus.PAGA)
      .reduce((sum, i) => sum + Number((i as any).amount ?? 0), 0);
    const openAmt = invoices
      .filter((i) => i.status === BillingStatus.ABERTA || i.status === BillingStatus.VENCIDA)
      .reduce((sum, i) => sum + Number((i as any).amount ?? 0), 0);
    return { paid, open: openAmt };
  }, [invoices]);

  const fetchInvoices = async () => {
    if (!reservation) return;

    const params: any = {
      orderBy: 'dueDate',
      orderDirection: 'asc',
    };

    if (reservation.campaignId) params.campaignId = reservation.campaignId;
    else if (reservation.proposalId) params.proposalId = reservation.proposalId;
    else {
      setInvoices([]);
      return;
    }

    setLoadingInvoices(true);
    setLoadError(null);

    try {
      const res = await apiClient.get('/billing-invoices', { params });
      const data = Array.isArray(res.data) ? res.data : [];
      // Normaliza amount para number (pode vir como Decimal/string)
      const normalized = data.map((i: any) => ({ ...i, amount: Number(i.amount) })) as BillingInvoice[];
      setInvoices(normalized);
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Não foi possível carregar as faturas.');
      setInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchForecast = async () => {
    if (!reservation?.campaignId) {
      setForecast([]);
      return;
    }

    setLoadingForecast(true);
    try {
      const res = await apiClient.get('/billing-invoices/forecast', { params: { campaignId: reservation.campaignId } });
      const data = Array.isArray(res.data) ? res.data : [];
      const normalized = data.map((i: any) => ({ ...i, amount: Number(i.amount) })) as BillingInvoiceForecastItem[];
      setForecast(normalized);
    } catch {
      setForecast([]);
    } finally {
      setLoadingForecast(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (!reservation) return;

    void fetchInvoices();
    void fetchForecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reservation?.id]);

  const titleId = reservation?.id ? reservation.id.slice(-6) : '';

  const goToProposal = () => {
    if (!reservation?.proposalId) return;
    onOpenChange(false);
    navigate(`/app/proposals?proposalId=${reservation.proposalId}`);
  };

  const goToCampaign = () => {
    if (!reservation?.campaignId) return;
    onOpenChange(false);
    navigate(`/app/campaigns?campaignId=${reservation.campaignId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 w-[96vw] max-w-5xl h-[90vh] overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-5 border-b">
            <div className="flex items-start justify-between gap-4 pr-10">
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-semibold text-gray-900">Reserva {titleId || ''}</h2>
                  {reservation?.status && <ReservationStatusBadge status={reservation.status as any} />}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {pointName || (reservation as any)?.mediaPointName || 'Ponto de Mídia'}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-500">Valor estimado</p>
                <p className="text-lg font-semibold text-gray-900">{formatBRL(computedAmount)}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Cliente</p>
                <p className="text-sm text-gray-900 truncate">{clientName || (reservation as any)?.clientName || '—'}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Unidade</p>
                <p className="text-sm text-gray-900 truncate">
                  {unitLabel || (reservation as any)?.mediaUnitLabel || '—'} •{' '}
                  {unitType === UnitType.FACE ? 'Face' : unitType === UnitType.SCREEN ? 'Tela' : '—'}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Período</p>
                <p className="text-sm text-gray-900">
                  {formatDateBR(reservation?.startDate)} - {formatDateBR(reservation?.endDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden px-6 py-5">
            <Tabs defaultValue="resumo" className="h-full">
              <TabsList className="w-full md:w-fit">
                <TabsTrigger value="resumo" className="gap-2">
                  <Info className="w-4 h-4" />
                  Resumo
                </TabsTrigger>
                <TabsTrigger value="origem" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Origem
                </TabsTrigger>
                <TabsTrigger value="financeiro" className="gap-2">
                  <DollarSign className="w-4 h-4" />
                  Financeiro
                </TabsTrigger>
              </TabsList>

              <TabsContent value="resumo" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">Detalhes</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Proposta</p>
                          <p className="text-sm text-gray-900">{(reservation as any)?.proposalTitle || (reservation?.proposalId ? `...${reservation.proposalId.slice(-6)}` : '—')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Campanha</p>
                          <p className="text-sm text-gray-900">{(reservation as any)?.campaignName || (reservation?.campaignId ? `...${reservation.campaignId.slice(-6)}` : '—')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Dias de ocupação</p>
                          <p className="text-sm text-gray-900">{(reservation as any)?.occupationDays ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Aluguel (snapshot)</p>
                          <p className="text-sm text-gray-900">{formatBRL((reservation as any)?.rentTotalSnapshot ?? null)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Custos iniciais (snapshot)</p>
                          <p className="text-sm text-gray-900">{formatBRL((reservation as any)?.upfrontTotalSnapshot ?? null)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4">
                      <p className="text-sm text-indigo-900">
                        No novo fluxo, as reservas são geradas automaticamente no check-in da campanha e ficam disponíveis aqui apenas para consulta.
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="origem" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">Origem da reserva</p>
                      <p className="text-sm text-gray-600">
                        Reservas são geradas automaticamente no check-in da campanha e ficam disponíveis aqui apenas para consulta.
                      </p>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Proposta</p>
                          <p className="text-sm text-gray-900 truncate">{(reservation as any)?.proposalTitle || '—'}</p>
                          <div className="mt-2">
                            <Button variant="outline" size="sm" onClick={goToProposal} disabled={!reservation?.proposalId}>
                              Ver Proposta
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Campanha</p>
                          <p className="text-sm text-gray-900 truncate">{(reservation as any)?.campaignName || '—'}</p>
                          <div className="mt-2">
                            <Button variant="outline" size="sm" onClick={goToCampaign} disabled={!reservation?.campaignId}>
                              Ver Campanha
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">Responsável (proprietário/empresa)</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Empresa</p>
                          <p className="text-sm text-gray-900">{(reservation as any)?.responsibleCompanyName || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Nome</p>
                          <p className="text-sm text-gray-900">{(reservation as any)?.responsibleOwnerName || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="financeiro" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Resumo financeiro</p>
                          <p className="text-xs text-gray-500">
                            Faturas vinculadas à campanha/proposta desta reserva.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            void fetchInvoices();
                            void fetchForecast();
                          }}
                          disabled={loadingInvoices || loadingForecast}
                          className="gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Atualizar
                        </Button>
                      </div>

                      {loadError && <p className="text-sm text-red-600 mt-3">{loadError}</p>}

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-lg bg-green-50 border border-green-100 p-3">
                          <p className="text-xs text-green-700">Valor pago</p>
                          <p className="text-lg font-semibold text-green-800">{formatBRL(totals.paid)}</p>
                        </div>
                        <div className="rounded-lg bg-yellow-50 border border-yellow-100 p-3">
                          <p className="text-xs text-yellow-800">Em aberto</p>
                          <p className="text-lg font-semibold text-yellow-900">{formatBRL(totals.open)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="text-sm font-medium text-gray-900 mb-3">Faturas</p>

                      {loadingInvoices ? (
                        <p className="text-sm text-gray-600">Carregando faturas...</p>
                      ) : invoices.length === 0 ? (
                        <p className="text-sm text-gray-600">Nenhuma fatura encontrada para esta reserva.</p>
                      ) : (
                        <div className="space-y-2">
                          {invoices.map((inv) => (
                            <div key={inv.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <InvoiceStatusPill status={inv.status} />
                                  <p className="text-sm font-medium text-gray-900">
                                    {inv.type === 'UPFRONT' ? 'Custos iniciais' : inv.type === 'RENT' ? `Aluguel ${inv.sequence ? `#${inv.sequence}` : ''}` : 'Fatura'}
                                  </p>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Venc.: {formatDateBR(inv.dueDate)}
                                  {inv.periodStart && inv.periodEnd ? ` • Período: ${formatDateBR(inv.periodStart)} - ${formatDateBR(inv.periodEnd)}` : ''}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-900">{formatBRL(Number((inv as any).amount))}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {reservation?.campaignId && (
                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="text-sm font-medium text-gray-900 mb-3">Faturas futuras (previsão)</p>
                        {loadingForecast ? (
                          <p className="text-sm text-gray-600">Carregando previsão...</p>
                        ) : forecast.length === 0 ? (
                          <p className="text-sm text-gray-600">Sem previsão de faturas futuras.</p>
                        ) : (
                          <div className="space-y-2">
                            {forecast.map((f) => (
                              <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {f.type === 'UPFRONT' ? 'Custos iniciais' : f.type === 'RENT' ? `Aluguel ${f.sequence ? `#${f.sequence}` : ''}` : 'Fatura'}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Venc.: {formatDateBR(f.dueDate)}
                                    {f.periodStart && f.periodEnd ? ` • Período: ${formatDateBR(f.periodStart)} - ${formatDateBR(f.periodEnd)}` : ''}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-gray-900">{formatBRL(Number((f as any).amount))}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
