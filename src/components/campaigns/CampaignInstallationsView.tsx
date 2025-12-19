import { AlertCircle } from 'lucide-react';
import { Campaign } from '../../types';

interface CampaignInstallationsViewProps {
  campaign: Campaign;
}

export function CampaignInstallationsView({ campaign }: CampaignInstallationsViewProps) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900">Integração de Instalações</p>
          <p className="text-sm text-blue-800 mt-1">
            O backend ainda não possui <b>campaign-items</b>. As instalações são controladas pelas <b>reservas</b> geradas
            no Booking.
          </p>
        </div>
      </div>

      <div className="text-sm text-gray-500">
        Campanha: <span className="text-gray-900">{campaign.name}</span>
      </div>
    </div>
  );
}
