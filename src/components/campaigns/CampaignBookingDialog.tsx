import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Campaign, Proposal, Reservation } from '../../types';
import apiClient from '../../lib/apiClient';
import { toast } from 'sonner';

interface CampaignBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
}

type UnitToReserve = {
  mediaUnitId: string;
  description?: string;
  startDate?: string;
  endDate?: string;
};

export function CampaignBookingDialog({ open, onOpenChange, campaign }: CampaignBookingDialogProps) {
  const [options, setOptions] = useState({
    includeChecklist: true,
    includeImages: true,
    includeValues: false,
  });

  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<UnitToReserve[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const clientLabel =
    campaign?.client?.companyName ||
    campaign?.client?.contactName ||
    (campaign as any)?.clientName ||
    '-';

  const campaignPeriodLabel = campaign
    ? `${new Date(campaign.startDate).toLocaleDateString('pt-BR')} - ${new Date(campaign.endDate).toLocaleDateString('pt-BR')}`
    : '-';

  const reservedUnitIds = useMemo(() => new Set(reservations.map((r) => r.mediaUnitId)), [reservations]);

  const unitsToCreate = useMemo(
    () => units.filter((u) => !reservedUnitIds.has(u.mediaUnitId)),
    [units, reservedUnitIds]
  );

  const loadData = async () => {
    if (!campaign) return;

    try {
      setLoading(true);

      const [proposalRes, reservationsRes] = await Promise.all([
        apiClient.get<Proposal>(`/proposals/${campaign.proposalId}`),
        apiClient.get<Reservation[]>('/reservations', { params: { campaignId: campaign.id, orderBy: 'startDate' } }),
      ]);

      const proposal = proposalRes.data;
      const proposalItems = proposal.items || [];
      const rawUnits = proposalItems
        .filter((it) => !!it.mediaUnitId)
        .map((it) => ({
          mediaUnitId: it.mediaUnitId as string,
          description: it.description,
          startDate: it.startDate ? new Date(it.startDate).toISOString() : undefined,
          endDate: it.endDate ? new Date(it.endDate).toISOString() : undefined,
        }));

      // dedupe por mediaUnitId
      const deduped = Array.from(
        rawUnits.reduce((map, u) => map.set(u.mediaUnitId, u), new Map<string, UnitToReserve>()).values()
      );

      setUnits(deduped);
      setReservations(Array.isArray(reservationsRes.data) ? reservationsRes.data : []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados do booking.');
      setUnits([]);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaign?.id]);

  const handleGenerate = async () => {
    if (!campaign) return;

    try {
      setLoading(true);

      if (units.length === 0) {
        toast.error('Esta campanha não possui itens de mídia vinculados na proposta.');
        return;
      }

      if (unitsToCreate.length === 0) {
        toast.info('As reservas desta campanha já foram geradas.');
        onOpenChange(false);
        return;
      }

      const defaultStart = new Date(campaign.startDate).toISOString();
      const defaultEnd = new Date(campaign.endDate).toISOString();

      const results = await Promise.allSettled(
        unitsToCreate.map((u) =>
          apiClient.post('/reservations', {
            mediaUnitId: u.mediaUnitId,
            campaignId: campaign.id,
            proposalId: campaign.proposalId,
            startDate: u.startDate || defaultStart,
            endDate: u.endDate || defaultEnd,
          })
        )
      );

      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const fail = results.length - ok;

      if (ok > 0 && fail === 0) {
        toast.success(`Booking gerado: ${ok} reserva(s) criada(s).`);
      } else if (ok > 0) {
        toast.warning(`Booking parcial: ${ok} criada(s), ${fail} falharam.`);
      } else {
        toast.error('Não foi possível criar as reservas do booking.');
      }

      await loadData();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Erro ao gerar booking.');
    } finally {
      setLoading(false);
    }
  };

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerar Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info da campanha */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Cliente</p>
                <p className="text-gray-900">{clientLabel}</p>
              </div>
              <div>
                <p className="text-gray-500">Período</p>
                <p className="text-gray-900">{campaignPeriodLabel}</p>
              </div>
              <div>
                <p className="text-gray-500">Unidades (na proposta)</p>
                <p className="text-gray-900">{units.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Reservas já criadas</p>
                <p className="text-gray-900">{reservations.length}</p>
              </div>
            </div>

            {unitsToCreate.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Serão criadas {unitsToCreate.length} nova(s) reserva(s) com status <b>RESERVADA</b>.
              </p>
            )}
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
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? 'Gerando...' : 'Gerar Booking'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
