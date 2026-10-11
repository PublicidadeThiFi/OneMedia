import { useEffect, useState } from 'react';
import apiClient from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { useProductAccess } from '../../contexts/ProductAccessContext';
import { Button } from '../ui/button';
import { DoohCampaignDraftPanel } from './DoohCampaignDraftPanel';

type EligibleCampaign = { id: string; name: string; status: string; proposalId: string };

/** Small D12 operator entry point for companies with only the DOOH module. */
export function DoohMarketplaceCampaignSelection() {
  const { user } = useAuth();
  const { canWriteModule } = useProductAccess();
  const hasRole = Boolean(user?.roles?.some((role) => String(role) === 'ADMINISTRATIVO' || String(role) === 'TI'));
  const canCreate = hasRole && canWriteModule('DOOH');
  const [campaigns, setCampaigns] = useState<EligibleCampaign[]>([]);
  const [campaignId, setCampaignId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<EligibleCampaign[]>('/dooh/marketplace/campaigns/eligible');
      const rows = Array.isArray(response.data) ? response.data : [];
      setCampaigns(rows);
      setCampaignId((previous) => rows.some((row) => row.id === previous) ? previous : (rows[0]?.id ?? ''));
    } catch {
      setCampaigns([]);
      setCampaignId('');
      setError('Não foi possível listar as campanhas DOOH elegíveis. Verifique permissões e a aprovação da proposta.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canCreate) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canCreate, user?.companyId]);

  if (!canCreate) return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
      A programação manual requer módulo DOOH com permissão FULL e um operador com função ADMINISTRATIVO ou TI.
    </div>
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
      <div>
        <h3 className="font-semibold text-gray-900">Campanhas aprovadas do Marketplace</h3>
        <p className="text-sm text-gray-600 mt-1">Escolha uma campanha com tela digital aprovada para vincular manualmente uma versão publicada de playlist. Nenhuma agenda será publicada automaticamente.</p>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-3 items-end">
        <label className="block text-sm text-gray-700 space-y-2 flex-1 min-w-56">
          <span className="block font-medium">Campanha</span>
          <select value={campaignId} onChange={(event) => setCampaignId(event.target.value)} className="w-full border rounded-md p-2 bg-white" disabled={loading || !campaigns.length}>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.status}</option>)}
          </select>
        </label>
        <Button type="button" variant="outline" disabled={loading} onClick={() => void load()}>{loading ? 'Carregando...' : 'Atualizar'}</Button>
      </div>
      {!loading && !campaigns.length && !error && <p className="text-sm text-gray-600">Nenhuma campanha elegível. Uma solicitação Marketplace precisa ser convertida em proposta aprovada com tela DOOH.</p>}
      {campaignId && <DoohCampaignDraftPanel key={campaignId} campaignId={campaignId} />}
    </div>
  );
}
