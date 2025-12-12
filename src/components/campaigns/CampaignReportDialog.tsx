import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Campaign } from '../../types';
import { toast } from 'sonner';

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

  if (!campaign) return null;

  const client = campaign.client;
  const mediaItems = (campaign.items || []).filter(item => item.mediaUnitId);

  const handleGenerate = () => {
    // TODO: Integrar com backend para gerar relatório real
    toast.success('Relatório gerado com sucesso (mock)');
    onOpenChange(false);
  };

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

          {/* Preview do Relatório (stub) */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm text-gray-900 mb-3">Preview do Relatório</h4>

            <div className="space-y-4">
              {/* Informações Gerais */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Cliente</p>
                  <p className="text-gray-900">{client?.companyName || client?.contactName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Período</p>
                  <p className="text-gray-900">
                    {new Date(campaign.startDate).toLocaleDateString('pt-BR')} -{' '}
                    {new Date(campaign.endDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Tabela de Unidades */}
              {reportType === 'usage' && (
                <div>
                  <p className="text-sm text-gray-700 mb-2">Unidades de Mídia:</p>
                  <div className="bg-gray-50 rounded overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-600">Ponto</th>
                          <th className="px-3 py-2 text-left text-gray-600">Unidade</th>
                          <th className="px-3 py-2 text-left text-gray-600">Tipo</th>
                          <th className="px-3 py-2 text-left text-gray-600">Cidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mediaItems.map((item) => (
                          <tr key={item.id} className="border-t border-gray-200">
                            <td className="px-3 py-2 text-gray-900">Unidade de Mídia</td>
                            <td className="px-3 py-2 text-gray-700">ID: {item.mediaUnitId || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">-</td>
                            <td className="px-3 py-2 text-gray-600">-</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Valor Total */}
              {reportType === 'financial' && (
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-sm text-gray-700">Valor Total da Campanha:</p>
                  <p className="text-gray-900">
                    R$ {((campaign.totalAmountCents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Nota */}
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
            <p>
              💡 O relatório completo será gerado em formato PDF com todos os detalhes e gráficos da
              campanha.
            </p>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate}>Gerar Relatório (stub)</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
