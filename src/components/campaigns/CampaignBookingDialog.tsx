import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Campaign } from '../../types';
import { toast } from 'sonner';

interface CampaignBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
}

export function CampaignBookingDialog({
  open,
  onOpenChange,
  campaign,
}: CampaignBookingDialogProps) {
  const [options, setOptions] = useState({
    includeChecklist: true,
    includeImages: true,
    includeValues: false,
  });

  if (!campaign) return null;

  const client = campaign.client;
  const items = campaign.items || [];
  const unitsCount = items.filter(item => item.mediaUnitId).length;

  const handleGenerate = () => {
    // TODO: Integrar com backend para gerar booking real
    toast.success('Booking gerado com sucesso (mock)');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerar Booking - {campaign.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Resumo da Campanha */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
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
              <div>
                <p className="text-gray-500">Unidades</p>
                <p className="text-gray-900">{unitsCount}</p>
              </div>
              <div>
                <p className="text-gray-500">Valor</p>
                <p className="text-gray-900">
                  R$ {((campaign.totalAmountCents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Opções do Booking */}
          <div className="space-y-4">
            <Label>Incluir no Booking:</Label>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeChecklist"
                  checked={options.includeChecklist}
                  onCheckedChange={(checked: boolean | 'indeterminate') =>
                    setOptions({ ...options, includeChecklist: checked === true })
                  }
                />
                <Label htmlFor="includeChecklist" className="cursor-pointer">
                  Checklist de instalação
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeImages"
                  checked={options.includeImages}
                  onCheckedChange={(checked: boolean | 'indeterminate') =>
                    setOptions({ ...options, includeImages: checked === true })
                  }
                />
                <Label htmlFor="includeImages" className="cursor-pointer">
                  Imagens do ponto
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeValues"
                  checked={options.includeValues}
                  onCheckedChange={(checked: boolean | 'indeterminate') =>
                    setOptions({ ...options, includeValues: checked === true })
                  }
                />
                <Label htmlFor="includeValues" className="cursor-pointer">
                  Valores da campanha
                </Label>
              </div>
            </div>
          </div>

          {/* Nota */}
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
            <p>
              💡 O booking será gerado com todas as informações da campanha, pontos de mídia e
              cronograma de veiculação.
            </p>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate}>Gerar Booking (stub)</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
