import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import apiClient from '../../lib/apiClient';
import { toast } from 'sonner';
import { Campaign } from '../../types';
import { formatDateBR, resolveUploadsUrl, safeDate } from '../../lib/format';

type CampaignReportType = 'usage' | 'checkin' | 'media' | 'billing';

type CampaignReportApiResponse = {
  downloadUrl?: string | null;
  preview?: any;
  details?: any;
};

interface CampaignReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
}

/**
 * Mantido como Dialog (não Drawer) conforme solicitado.
 * Gera relatórios da campanha. O backend decide o conteúdo e o link/stream de download.
 */
export default function CampaignReportDialog({ open, onOpenChange, campaign }: CampaignReportDialogProps) {
  const [reportType, setReportType] = useState<CampaignReportType>('usage');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [details, setDetails] = useState<any>(null);

  const campaignId = campaign?.id ?? null;

  const title = useMemo(() => {
    const base = campaign?.name || (campaign as any)?.proposalTitle || 'Campanha';
    return `Relatório — ${base}`;
  }, [campaign?.name, campaignId]);

  const loadReport = async () => {
    if (!campaignId) return;
    try {
      setLoading(true);
      setDetails(null);

      const res = await apiClient.get<CampaignReportApiResponse>(`/campaigns/${campaignId}/report`, {
        params: { type: reportType, mode: 'preview' },
      });

      const data = res.data;
      setDetails(data?.preview ?? data?.details ?? null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Falha ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    if (!campaignId) {
      setDetails(null);
      return;
    }

    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaignId, reportType]);

  const parseFilename = (contentDisposition?: string): string | null => {
    if (!contentDisposition) return null;
    // attachment; filename="..."
    const m = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const raw = (m?.[1] || m?.[2])?.trim();
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  };

  const handleDownload = async (format: 'pdf' | 'csv') => {
    if (!campaignId) return;
    try {
      setDownloading(true);

      const res = await apiClient.get<Blob>(`/campaigns/${campaignId}/report`, {
        params: { type: reportType, format, mode: 'download' },
        responseType: 'blob',
      });

      const contentType = (res.headers as any)?.['content-type'] || (format === 'pdf' ? 'application/pdf' : 'text/csv');
      const contentDisposition = (res.headers as any)?.['content-disposition'];
      const filename = parseFilename(contentDisposition) || `relatorio-${campaignId}.${format}`;

      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Falha ao baixar relatório');
    } finally {
      setDownloading(false);
    }
  };

  const cover = details?.cover || null;
  const photos: Array<any> = Array.isArray(details?.photos) ? details.photos : [];
  const summary = details?.summary || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[1600px] h-[90vh] max-h-[90vh] p-0 overflow-hidden flex flex-col gap-0">
        <div className="h-full flex flex-col min-h-0">
          <div className="p-6 border-b border-gray-200">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2 md:max-w-sm">
              <Label>Tipo de relatório</Label>
              <Select value={reportType} onValueChange={(v: string) => setReportType(v as CampaignReportType)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha o relatório" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usage">Veiculação (geral)</SelectItem>
                  <SelectItem value="checkin">Check-in (fotos)</SelectItem>
                  <SelectItem value="media">Mídias / Unidades</SelectItem>
                  <SelectItem value="billing">Faturamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center justify-start md:justify-end gap-2">
              <Button variant="outline" onClick={loadReport} disabled={!campaignId || loading}>
                {loading ? 'Gerando...' : 'Atualizar'}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDownload('csv')}
                disabled={!campaignId || loading || downloading}
              >
                {downloading ? 'Baixando...' : 'Baixar CSV'}
              </Button>
              <Button onClick={() => handleDownload('pdf')} disabled={!campaignId || loading || downloading}>
                {downloading ? 'Baixando...' : 'Baixar PDF'}
              </Button>
            </div>
          </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
          {!campaignId ? (
            <div className="text-sm text-gray-600">Selecione uma campanha para gerar o relatório.</div>
          ) : loading ? (
            <div className="text-sm text-gray-600">Gerando prévia...</div>
          ) : !details ? (
            <div className="text-sm text-gray-600">Nenhuma prévia disponível.</div>
          ) : (
            <>
              {cover ? (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Capa</div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-500">Campanha</div>
                      <div className="text-sm text-gray-900 font-medium">
                        {cover.title || campaign?.name || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Cliente</div>
                      <div className="text-sm text-gray-900">{cover.clientName || (campaign as any)?.clientName || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Período</div>
                      <div className="text-sm text-gray-900">
                        {cover.startDate || cover.endDate
                          ? `${formatDateBR(cover.startDate)} – ${formatDateBR(cover.endDate)}`
                          : (campaign as any)?.startDate || (campaign as any)?.endDate
                          ? `${formatDateBR((campaign as any)?.startDate)} – ${formatDateBR((campaign as any)?.endDate)}`
                          : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Gerado em</div>
                      <div className="text-sm text-gray-900">
                        {formatDateBR(safeDate(cover.generatedAt) || new Date())}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {summary ? (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Resumo</div>
                  <div className="mt-2 text-sm text-gray-900 whitespace-pre-wrap">{summary.text || summary}</div>
                </div>
              ) : null}

              {photos.length > 0 ? (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Fotos</div>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                    {photos.slice(0, 24).map((p, idx) => {
                      const raw = p.photoUrl || p.url || null;
                      const url = resolveUploadsUrl(raw);

                      return (
                        <a
                          key={`${p.mediaUnitId || idx}-${idx}`}
                          href={url || undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="block"
                        >
                          <div className="border rounded-lg overflow-hidden">
                            {url ? (
                              <img src={url} alt="Foto" className="w-full h-28 object-cover" />
                            ) : (
                              <div className="w-full h-28 bg-gray-50 flex items-center justify-center text-xs text-gray-500">
                                sem foto
                              </div>
                            )}
                            <div className="p-2">
                              <div className="text-xs text-gray-600 truncate">
                                {p.label || p.mediaUnitLabel || p.mediaUnitId || '-'}
                              </div>
                            </div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                  {photos.length > 24 ? (
                    <div className="mt-2 text-xs text-gray-500">Mostrando 24 de {photos.length} fotos.</div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
