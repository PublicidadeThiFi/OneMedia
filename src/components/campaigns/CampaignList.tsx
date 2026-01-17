import { Campaign } from '../../types';
import { CampaignCard } from './CampaignCard';

interface CampaignListProps {
  campaigns: Campaign[];
  showAllActions?: boolean;
  onViewDetails: (campaign: Campaign) => void;
  onCheckIn?: (campaign: Campaign) => void;
  onGenerateReport: (campaign: Campaign) => void;
  onViewBilling?: (campaign: Campaign) => void;
}

export function CampaignList({
  campaigns,
  showAllActions = true,
  onViewDetails,
  onCheckIn,
  onGenerateReport,
  onViewBilling,
}: CampaignListProps) {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Nenhuma campanha encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <CampaignCard
          key={campaign.id}
          campaign={campaign}
          showAllActions={showAllActions}
          onViewDetails={onViewDetails}
          onCheckIn={onCheckIn}
          onGenerateReport={onGenerateReport}
          onViewBilling={onViewBilling}
        />
      ))}
    </div>
  );
}
