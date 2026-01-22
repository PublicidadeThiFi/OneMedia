import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Campaign } from '../../types';
import { toast } from 'sonner';
import apiClient from '../../lib/apiClient';

interface CampaignReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
}

export function CampaignReportDialog({
  open,
  onOpenChange,
  campaign,
}: CampaignReportDialogProps) {
  const [reportType, setReportType] = useState<string>('usage');
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<any | null>(null);

  if (!campaign) return null;

  const resolveFileUrl = useMemo(() => {
    const base = String((apiClient.defaults as any)?.baseURL ?? '');
    const origin = base.startsWith('/') ? '' : base.replace(/\/?api\/?$/, '');
    return (url?: string | null) => {
      if (!url) return null;
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      if (!origin) return url;
      return `${origin}${url}`;
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!open || !campaign?.id) return;
      try {
        setLoading(true);
        const res = await apiClient.get(`/campaigns/${campaign.id}/details`);
        setDetails(res.data ?? null);
      } catch (err) {
        console.error(err);
        setDetails(null);
        toast.error('Não foi possível carregar os dados do relatório.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, campaign?.id]);

  const viewCampaign: any = details?.campaign ?? campaign;
  const client = viewCampaign?.client ?? campaign?.client;
  const checkInFaces: any[] = Array.isArray(details?.checkIn?.faces) ? details.checkIn.faces : [];
  const reservations: any[] = Array.isArray(details?.reservations) ? details.reservations : [];
  const invoices: any[] = Array.isArray(details?.invoices) ? details.invoices : [];
  const forecastInvoices: any[] = Array.isArray(details?.forecastInvoices) ? details.forecastInvoices : [];

  const getFilenameFromDisposition = (cd?: string) => {
    if (!cd) return null;
    const match = /filename\*=UTF-8''([^;]+)|filename="?([^;"]+)"?/i.exec(cd);
    const raw = decodeURIComponent(match?.[1] ?? match?.[2] ?? '');
    return raw || null;
  };

  const downloadReport = async (format: 'pdf' | 'csv') => {
    if (!campaign?.id) return;
    try {
      const res = await apiClient.get(`/campaigns/${campaign.id}/report`, {
        params: { type: reportType, format },
        responseType: 'blob',
      });

      const cd = (res.headers as any)?.['content-disposition'] as string | undefined;
      const filename = getFilenameFromDisposition(cd) || `relatorio-${campaign.id}.${format}`;

      const blob = new Blob([res.data as BlobPart], { type: (res.headers as any)?.['content-type'] ?? undefined });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Relatório baixado (${format.toUpperCase()}).`);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao baixar relatório.');
    }
  };

  const periodLabel = (() => {
    try {
      if (!viewCampaign?.startDate || !viewCampaign?.endDate) return '-';
      return `${new Date(viewCampaign.startDate).toLocaleDateString('pt-BR')} - ${new Date(viewCampaign.endDate).toLocaleDateString('pt-BR')}`;
    } catch {
      return '-';
    }
  })();

  const totalAmount = ((viewCampaign?.totalAmountCents ?? 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const unitsCount = viewCampaign?.reservedUnitsCount ?? viewCampaign?.campaignItemsCount ?? checkInFaces.length ?? 0;

  const usageRows = (() => {
    if (reservations.length > 0) {
      return reservations.map((r: any) => ({
        point: r.mediaPointName ?? '-',
        unit: r.mediaUnitLabel ?? r.mediaUnitId ?? '-',
        start: r.startDate ? new Date(r.startDate).toLocaleDateString('pt-BR') : '-',
        end: r.endDate ? new Date(r.endDate).toLocaleDateString('pt-BR') : '-',
        status: r.status ?? '-',
        photoUrl: null as string | null,
      }));
    }
    return checkInFaces.map((f: any) => ({
      point: f.mediaPointName ?? '-',
      unit: f.label ?? f.mediaUnitId ?? '-',
      start: viewCampaign?.startDate ? new Date(viewCampaign.startDate).toLocaleDateString('pt-BR') : '-',
      end: viewCampaign?.endDate ? new Date(viewCampaign.endDate).toLocaleDateString('pt-BR') : '-',
      status: viewCampaign?.status ?? '-',
      photoUrl: f?.photo?.photoUrl ?? null,
    }));
  })();

  const financialRows = (() => {
    const rows = [
      ...invoices.map((i: any) => ({ ...i, __forecast: false })),
      ...forecastInvoices.map((i: any) => ({ ...i, __forecast: true })),
    ];
    return rows.sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  })();

  const performance = (() => {
    const faces = checkInFaces;
    const total = faces.length || unitsCount || 0;
    const sent = faces.filter((f: any) => !!f?.photo?.photoUrl).length;
    const missing = Math.max(0, total - sent);
    return { total, sent, missing };
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório - {campaign.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Seletor de tipo de relatório */}
          <div className="space-y-2">
            <Label htmlFor="reportType">Tipo de Relatório</Label>
            <Select value={reportType} onValueChange={(value: string) => setReportType(value)}>
              <SelectTrigger id="reportType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usage">Uso de Painéis por Período</SelectItem>
                <SelectItem value="client">Relatório por Cliente</SelectItem>
                <SelectItem value="financial">Relatório Financeiro</SelectItem>
                <SelectItem value="performance">Performance de Campanha</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview do Relatório */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm text-gray-900 mb-3">Preview do Relatório</h4>

            {loading ? (
              <div className="text-sm text-gray-600">Carregando dados…</div>
            ) : (
              <div className="space-y-4">
                {/* Informações Gerais */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Cliente</p>
                    <p className="text-gray-900">{client?.companyName || client?.contactName || viewCampaign?.clientName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Período</p>
                    <p className="text-gray-900">{periodLabel}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="text-gray-900">{String(viewCampaign?.status ?? '-')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Unidades</p>
                    <p className="text-gray-900">{unitsCount}</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-sm text-gray-700">Valor Total da Campanha</p>
                  <p className="text-gray-900">R$ {totalAmount}</p>
                </div>

                {/* Conteúdo por tipo */}
                {reportType === 'usage' && (
                  <div>
                    <p className="text-sm text-gray-700 mb-2">Uso / Veiculações</p>
                    <div className="bg-gray-50 rounded overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-600">Ponto</th>
                            <th className="px-3 py-2 text-left text-gray-600">Unidade</th>
                            <th className="px-3 py-2 text-left text-gray-600">Início</th>
                            <th className="px-3 py-2 text-left text-gray-600">Fim</th>
                            <th className="px-3 py-2 text-left text-gray-600">Status</th>
                            <th className="px-3 py-2 text-left text-gray-600">Foto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usageRows.map((r: any, idx: number) => (
                            <tr key={`${r.unit}-${idx}`} className="border-t border-gray-200">
                              <td className="px-3 py-2 text-gray-900">{r.point}</td>
                              <td className="px-3 py-2 text-gray-700">{r.unit}</td>
                              <td className="px-3 py-2 text-gray-600">{r.start}</td>
                              <td className="px-3 py-2 text-gray-600">{r.end}</td>
                              <td className="px-3 py-2 text-gray-600">{r.status}</td>
                              <td className="px-3 py-2 text-gray-600">
                                {r.photoUrl ? (
                                  <a
                                    href={resolveFileUrl(r.photoUrl) ?? '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-700 hover:underline"
                                  >
                                    Ver
                                  </a>
                                ) : (
                                  '-'
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {reportType === 'client' && (
                  <div className="text-sm text-gray-700 space-y-2">
                    <p className="text-sm text-gray-700 mb-2">Relatório por Cliente</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-500">Cliente</p>
                        <p className="text-gray-900">{client?.companyName || client?.contactName || viewCampaign?.clientName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Campanha</p>
                        <p className="text-gray-900">{viewCampaign?.name || viewCampaign?.id}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Unidades</p>
                        <p className="text-gray-900">{unitsCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Valor total</p>
                        <p className="text-gray-900">R$ {totalAmount}</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      *Este relatório é gerado a partir da campanha selecionada.
                    </div>
                  </div>
                )}

                {reportType === 'financial' && (
                  <div>
                    <p className="text-sm text-gray-700 mb-2">Financeiro (faturas)</p>
                    <div className="bg-gray-50 rounded overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-600">Tipo</th>
                            <th className="px-3 py-2 text-left text-gray-600">Seq</th>
                            <th className="px-3 py-2 text-left text-gray-600">Venc.</th>
                            <th className="px-3 py-2 text-left text-gray-600">Período</th>
                            <th className="px-3 py-2 text-left text-gray-600">Status</th>
                            <th className="px-3 py-2 text-right text-gray-600">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financialRows.map((i: any, idx: number) => {
                            const amount = (Number(i.amountCents ?? i.amount ?? 0) / (i.amountCents != null ? 100 : 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                            const status = i.__forecast ? 'PREVISTA' : String(i.status ?? '-');
                            const period = i.periodStart && i.periodEnd ? `${new Date(i.periodStart).toLocaleDateString('pt-BR')} - ${new Date(i.periodEnd).toLocaleDateString('pt-BR')}` : '-';
                            return (
                              <tr key={`${i.id ?? i.dueDate ?? idx}`} className="border-t border-gray-200">
                                <td className="px-3 py-2 text-gray-900">{String(i.type ?? 'RENT')}</td>
                                <td className="px-3 py-2 text-gray-700">{i.sequence ?? '-'}</td>
                                <td className="px-3 py-2 text-gray-600">{i.dueDate ? new Date(i.dueDate).toLocaleDateString('pt-BR') : '-'}</td>
                                <td className="px-3 py-2 text-gray-600">{period}</td>
                                <td className="px-3 py-2 text-gray-600">{status}</td>
                                <td className="px-3 py-2 text-gray-900 text-right">R$ {amount}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      *Faturas “PREVISTA” vêm do forecast (ainda não persistidas).
                    </div>
                  </div>
                )}

                {reportType === 'performance' && (
                  <div>
                    <p className="text-sm text-gray-700 mb-2">Performance</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-gray-500">Unidades</p>
                        <p className="text-gray-900">{performance.total}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-gray-500">Fotos enviadas</p>
                        <p className="text-gray-900">{performance.sent}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-gray-500">Fotos pendentes</p>
                        <p className="text-gray-900">{performance.missing}</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      *A performance usa os dados de check-in (fotos por face/unidade).
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nota */}
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
            <p>💡 Você pode baixar o relatório em PDF ou CSV, conforme o tipo selecionado.</p>
          </div>
        </div>

        {/* Botões */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-3 pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => downloadReport('csv')} disabled={loading}>
              Baixar CSV
            </Button>
            <Button onClick={() => downloadReport('pdf')} disabled={loading}>
              Baixar PDF
            </Button>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
