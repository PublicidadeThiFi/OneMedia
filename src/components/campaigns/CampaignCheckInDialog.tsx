import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import apiClient from '../../lib/apiClient';
import { toast } from 'sonner';
import { BillingInvoice, BillingInvoiceType, BillingStatus, Campaign } from '../../types';

type UnitRow = {
  mediaUnitId: string;
  label?: string;
};

type CheckInStatusResponse = {
  deadlineAt?: string;
  expectedUnits?: Array<{ mediaUnitId: string; label?: string; photoUrl?: string | null }>;
  photos?: Array<{ mediaUnitId: string; photoUrl: string }>;
  canConfirm?: boolean;
  blockingReasons?: string[];
};

interface CampaignCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
  onCheckInComplete?: (updatedCampaign?: Campaign) => void;
}

export function CampaignCheckInDialog({ open, onOpenChange, campaign, onCheckInComplete }: CampaignCheckInDialogProps) {
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [status, setStatus] = useState<CheckInStatusResponse | null>(null);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [filesByUnit, setFilesByUnit] = useState<Record<string, File | null>>({});
  const [photosByUnit, setPhotosByUnit] = useState<Record<string, string>>({});

  const units: UnitRow[] = useMemo(() => {
    if (!campaign) return [];

    // Preferir resposta do backend (quando existir)
    if (status?.expectedUnits?.length) {
      return status.expectedUnits.map((u) => ({ mediaUnitId: u.mediaUnitId, label: u.label }));
    }

    return (campaign.items || [])
      .filter((i) => !!i.mediaUnitId)
      .map((i) => ({ mediaUnitId: i.mediaUnitId, label: undefined }));
  }, [campaign, status?.expectedUnits]);

  const deadlineAt = useMemo(() => {
    if (!campaign) return null;
    const fromStatus = status?.deadlineAt ? new Date(status.deadlineAt) : null;
    const fromCampaign = campaign.checkInDeadlineAt ? new Date(campaign.checkInDeadlineAt as any) : null;
    return fromStatus || fromCampaign;
  }, [campaign, status?.deadlineAt]);

  const isDeadlineExpired = useMemo(() => {
    if (!deadlineAt) return false;
    return new Date().getTime() > deadlineAt.getTime();
  }, [deadlineAt]);

  const loadStatus = async () => {
    if (!campaign) return;
    try {
      setStatusLoading(true);
      const res = await apiClient.get<CheckInStatusResponse>(`/campaigns/${campaign.id}/checkin`);
      setStatus(res.data || null);

      // Fotos já enviadas
      const next: Record<string, string> = {};
      for (const p of res.data?.photos || []) {
        next[p.mediaUnitId] = p.photoUrl;
      }
      // alguns backends podem devolver a foto embutida em expectedUnits
      for (const u of res.data?.expectedUnits || []) {
        if (u.photoUrl) next[u.mediaUnitId] = u.photoUrl;
      }
      setPhotosByUnit(next);
    } catch (err) {
      // Endpoint pode não existir em ambientes antigos; seguimos com fallback.
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  };

  const loadInvoices = async () => {
    if (!campaign) return;
    try {
      setInvoicesLoading(true);
      const res = await apiClient.get<BillingInvoice[]>('/billing-invoices', {
        params: { campaignId: campaign.id, orderBy: 'dueDate', orderDirection: 'asc' },
      });
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      // Sem bloquear a UI; backend também valida no confirm.
      setInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const paymentGate = useMemo(() => {
    if (!campaign) return { ok: true, pending: [] as BillingInvoice[], nextDue: null as BillingInvoice | null };
    if (!invoices?.length) return { ok: true, pending: [] as BillingInvoice[], nextDue: null as BillingInvoice | null };

    const isPaid = (inv: BillingInvoice) => inv.status === BillingStatus.PAGA;
    const isCancelled = (inv: BillingInvoice) => inv.status === BillingStatus.CANCELADA;

    // 1) Preferir o novo modelo (type/sequence). Fallback para o mais antigo: usa a(s) fatura(s) de menor vencimento.
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
    const nextDue = invoices
      .filter((i) => !isPaid(i) && !isCancelled(i))
      .slice()
      .sort((a, b) => new Date(a.dueDate as any).getTime() - new Date(b.dueDate as any).getTime())[0] || null;

    return { ok: pending.length === 0, pending, nextDue };
  }, [campaign, invoices]);

  const billingAnchorDay = useMemo(() => {
    if (!campaign) return null;
    if (campaign.approvedAt) return new Date(campaign.approvedAt as any).getDate();
    if (paymentGate.nextDue) return new Date(paymentGate.nextDue.dueDate as any).getDate();
    if (invoices?.length) return new Date(invoices[0].dueDate as any).getDate();
    return null;
  }, [campaign, invoices, paymentGate.nextDue]);

  const hasConfirmationAlert = useMemo(() => {
    return invoices?.some(
      (i) =>
        !!i.requiresConfirmation &&
        i.status !== BillingStatus.PAGA &&
        i.status !== BillingStatus.CANCELADA
    );
  }, [invoices]);

  useEffect(() => {
    if (!open) return;
    // reset local
    setFilesByUnit({});
    setPhotosByUnit({});
    loadStatus();
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaign?.id]);

  if (!campaign) return null;

  const setFile = (mediaUnitId: string, file: File | null) => {
    setFilesByUnit((prev) => ({ ...prev, [mediaUnitId]: file }));
  };

  const validatePaymentGate = async (): Promise<boolean> => {
    try {
      const res = await apiClient.get<BillingInvoice[]>('/billing-invoices', {
        params: { campaignId: campaign.id, orderBy: 'dueDate', orderDirection: 'asc' },
      });
      const invoices = Array.isArray(res.data) ? res.data : [];
      setInvoices(invoices);
      if (invoices.length === 0) return true; // backend valida de verdade

      // Regra de UI: antes do check-in, o pagamento inicial deve estar quitado (aluguel + custos iniciais, se houver).
      const isPaid = (inv: BillingInvoice) => inv.status === BillingStatus.PAGA;
      const isCancelled = (inv: BillingInvoice) => inv.status === BillingStatus.CANCELADA;
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
      if (pending.length > 0) {
        toast.error('Check-in bloqueado: pagamento inicial pendente.');
        return false;
      }

      return true;
    } catch (err) {
      // Se falhar, backend ainda vai bloquear no confirm.
      return true;
    }
  };

  const handleConfirm = async () => {
    if (loading) return;

    if (campaign.status !== 'EM_INSTALACAO') {
      toast.error('Check-in só pode ser feito quando a campanha estiver em EM_INSTALACAO.');
      return;
    }

    if (isDeadlineExpired) {
      toast.error('Prazo de check-in expirado.');
      return;
    }

    const expected = units.map((u) => u.mediaUnitId);
    if (expected.length === 0) {
      toast.error('Nenhuma unidade encontrada para check-in.');
      return;
    }

    // Todas as unidades precisam de foto (já enviada ou selecionada)
    const missing = expected.filter((id) => !photosByUnit[id] && !filesByUnit[id]);
    if (missing.length > 0) {
      toast.error('Envie 1 foto para todas as faces/unidades para concluir o check-in.');
      return;
    }

    const paymentOk = await validatePaymentGate();
    if (!paymentOk) return;

    try {
      setLoading(true);

      // Upload de todas as fotos que ainda não foram enviadas
      for (const unitId of expected) {
        if (photosByUnit[unitId]) continue;
        const file = filesByUnit[unitId];
        if (!file) continue;

        const fd = new FormData();
        fd.append('file', file);
        const uploadRes = await apiClient.post<{ photoUrl?: string }>(
          `/campaigns/${campaign.id}/checkin/${unitId}/photo`,
          fd,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        if (uploadRes.data?.photoUrl) {
          setPhotosByUnit((prev) => ({ ...prev, [unitId]: uploadRes.data.photoUrl as string }));
        }
      }

      const confirmRes = await apiClient.post<Campaign>(`/campaigns/${campaign.id}/checkin/confirm`);
      toast.success('Check-in realizado com sucesso.');
      onOpenChange(false);
      onCheckInComplete?.(confirmRes.data);
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message || 'Erro ao confirmar check-in.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Check-in - {campaign.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1">
            <p className="text-sm text-blue-900">
              Envie 1 foto por face/unidade. O check-in só será concluído quando todas as fotos estiverem presentes.
            </p>
            {deadlineAt && (
              <p className="text-xs text-blue-800">
                Prazo limite: <b>{deadlineAt.toLocaleDateString('pt-BR')}</b>
                {isDeadlineExpired ? <span className="ml-2 text-red-700">(expirado)</span> : null}
              </p>
            )}
            <p className="text-xs text-blue-800">
              <b>Importante:</b> o pagamento inicial deve estar quitado para liberar o check-in.
            </p>
            {billingAnchorDay ? (
              <p className="text-xs text-blue-800">
                Cobrança recorrente: vencimento todo dia <b>{billingAnchorDay}</b>.
              </p>
            ) : null}
            {hasConfirmationAlert ? (
              <p className="text-xs text-blue-800">
                <b>Atenção:</b> existe uma cobrança que requer confirmação do cliente (regra de 30 dias antes do vencimento).
              </p>
            ) : null}
          </div>

          {/* Gate de pagamento (UI) */}
          {invoicesLoading ? (
            <div className="text-sm text-gray-500">Carregando status de pagamento...</div>
          ) : invoices.length > 0 ? (
            <div
              className={`border rounded-lg p-4 ${paymentGate.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-sm ${paymentGate.ok ? 'text-green-900' : 'text-red-900'}`}>
                  {paymentGate.ok ? 'Pagamento inicial OK — check-in liberado' : 'Pagamento inicial pendente — check-in bloqueado'}
                </p>
                {paymentGate.nextDue ? (
                  <Badge className="bg-gray-100 text-gray-800">
                    Próximo venc.: {new Date(paymentGate.nextDue.dueDate as any).toLocaleDateString('pt-BR')}
                  </Badge>
                ) : null}
              </div>

              {!paymentGate.ok && paymentGate.pending.length > 0 ? (
                <ul className="mt-2 list-disc pl-5 text-sm text-red-800 space-y-1">
                  {paymentGate.pending.map((inv) => (
                    <li key={inv.id}>
                      {inv.type === BillingInvoiceType.UPFRONT
                        ? 'Custos iniciais (produção/instalação)'
                        : inv.type === BillingInvoiceType.RENT
                        ? 'Aluguel (primeiro ciclo)'
                        : 'Fatura inicial'}{' '}
                      — venc. {new Date(inv.dueDate as any).toLocaleDateString('pt-BR')} — R$ {Number(inv.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </li>
                  ))}
                </ul>
              ) : null}

              {hasConfirmationAlert ? (
                <p className="mt-2 text-xs text-gray-700">
                  Atenção: há faturas marcadas como <b>necessita confirmação</b> (regra de 30 dias antes).
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gray-900">Unidades para check-in</h3>
            <Button variant="outline" size="sm" onClick={loadStatus} disabled={statusLoading}>
              {statusLoading ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>

          {units.length === 0 ? (
            <div className="text-sm text-gray-500">Nenhuma unidade encontrada.</div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm text-gray-600">Unidade</th>
                    <th className="px-4 py-3 text-left text-sm text-gray-600">Foto</th>
                    <th className="px-4 py-3 text-left text-sm text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {units.map((u) => {
                    const uploaded = photosByUnit[u.mediaUnitId];
                    const file = filesByUnit[u.mediaUnitId];
                    const ok = !!uploaded || !!file;
                    return (
                      <tr key={u.mediaUnitId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {u.label || `ID: ${u.mediaUnitId}`}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-600">Enviar foto</Label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setFile(u.mediaUnitId, e.target.files?.[0] || null)}
                            />
                            {uploaded ? (
                              <a
                                href={uploaded}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 underline"
                              >
                                Ver foto enviada
                              </a>
                            ) : file ? (
                              <div className="text-xs text-gray-600">{file.name}</div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={ok ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {ok ? 'OK' : 'Pendente'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {status?.blockingReasons?.length ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900 mb-2">Pendências</p>
              <ul className="list-disc pl-5 text-sm text-yellow-800 space-y-1">
                {status.blockingReasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={
                loading ||
                isDeadlineExpired ||
                (status?.canConfirm === false) ||
                (invoices.length > 0 && !paymentGate.ok)
              }
            >
              {loading ? 'Confirmando...' : 'Confirmar Check-in'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
