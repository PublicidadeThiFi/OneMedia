import { useState, useMemo } from 'react';
import { MapPin, FileText, Megaphone, Users, Plus, Share2, Globe, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Page } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import {
  getDashboardSummary,
  formatCurrency,
  getPublicMapUrl,
} from '../lib/mockDataDashboard';
import { toast } from 'sonner';

interface DashboardProps {
  onNavigate: (page: Page) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [shareMapOpen, setShareMapOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Use AuthContext for user info
  const { user } = useAuth();

  // Use CompanyContext for company data
  const { company } = useCompany();

  // Carrega o resumo do dashboard usando dados reais dos mocks
  const summary = useMemo(() => {
    if (!company) return null;
    return getDashboardSummary(company.id);
  }, [company]);

  // URL pública do mapa (mock)
  // TODO: Esta URL deverá vir do backend/Infra no futuro (ex: company.publicMapUrl)
  const publicMapUrl = useMemo(() => {
    if (!company) return '';
    return getPublicMapUrl(company.id);
  }, [company]);

  // Se ainda estiver carregando dados, mostrar loading
  if (!company || !summary || !user) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Carregando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Dados dos cards superiores (agora usando valores reais)
  const stats = [
    {
      title: 'Inventário Total',
      value: String(summary.inventory.totalPoints),
      subtitle: `${summary.inventory.totalOOH} OOH • ${summary.inventory.totalDOOH} DOOH`,
      icon: MapPin,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      page: 'inventory' as Page,
    },
    {
      title: 'Propostas',
      value: String(summary.proposals.total),
      subtitle: `Taxa de aprovação: ${summary.proposals.approvalRatePercent}%`,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      page: 'proposals' as Page,
    },
    {
      title: 'Campanhas Ativas',
      value: formatCurrency(summary.campaigns.activeAmountCents),
      subtitle: `${summary.campaigns.activeCount} campanhas em veiculação`,
      icon: Megaphone,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      page: 'campaigns' as Page,
    },
    {
      title: 'Clientes Ativos',
      value: String(summary.clients.activeCount),
      subtitle: `Ticket médio: ${formatCurrency(summary.clients.averageTicketCents)}`,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      page: 'clients' as Page,
    },
  ];

  // Resumo financeiro (agora usando valores reais)
  const financialSummary = [
    {
      label: 'Campanhas a Faturar',
      value: formatCurrency(summary.financialSummary.toInvoiceCents),
      color: 'text-yellow-600',
    },
    {
      label: 'A Vencer (7 dias)',
      value: formatCurrency(summary.financialSummary.dueNext7DaysCents),
      color: 'text-orange-600',
    },
    {
      label: 'Aguardando Pagamento',
      value: formatCurrency(summary.financialSummary.pendingPaymentCents),
      color: 'text-red-600',
    },
    {
      label: 'Recebido no Mês',
      value: formatCurrency(summary.financialSummary.receivedThisMonthCents),
      color: 'text-green-600',
    },
  ];

  // Status de campanhas (agora usando valores reais)
  const campaignStatus = [
    {
      label: 'Campanhas Ativas',
      value: String(summary.campaignStatusSummary.activeCount),
    },
    {
      label: 'Aprovadas no Mês',
      value: String(summary.campaignStatusSummary.approvedThisMonthCount),
    },
    {
      label: 'Aguardando Material',
      value: String(summary.campaignStatusSummary.awaitingMaterialCount),
    },
  ];

  /**
   * Copia o link do mapa público para a área de transferência
   * TODO: Reutilizar esta lógica em outras telas de compartilhamento quando necessário
   */
  const handleCopyMapLink = async () => {
    try {
      // Tenta usar a API Clipboard moderna
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(publicMapUrl);
        setCopied(true);
        toast.success('Link do mapa copiado para a área de transferência!');
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback para navegadores que não suportam clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = publicMapUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand('copy');
          if (successful) {
            setCopied(true);
            toast.success('Link do mapa copiado para a área de transferência!');
            setTimeout(() => setCopied(false), 2000);
          } else {
            toast.error('Não foi possível copiar. Por favor, copie manualmente.');
          }
        } catch (err) {
          toast.error('Não foi possível copiar. Por favor, copie manualmente.');
        }

        document.body.removeChild(textArea);
      }
    } catch (err) {
      toast.error('Não foi possível copiar. Por favor, copie manualmente.');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Visão geral da sua operação de mídia exterior</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onNavigate(stat.page)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-gray-600 text-sm mb-2">{stat.title}</p>
                    <p className="text-gray-900 mb-1">{stat.value}</p>
                    <p className="text-gray-500 text-sm">{stat.subtitle}</p>
                  </div>
                  <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <Button
          className="h-auto py-4 flex items-center gap-2"
          onClick={() => onNavigate('proposals')}
        >
          <Plus className="w-5 h-5" />
          Nova Proposta
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex items-center gap-2"
          onClick={() => onNavigate('inventory')}
        >
          <Plus className="w-5 h-5" />
          Nova Mídia
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex items-center gap-2"
          onClick={() => onNavigate('mediakit')}
        >
          <Globe className="w-5 h-5" />
          Mídia Kit
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex items-center gap-2"
          onClick={() => setShareMapOpen(true)}
        >
          <Share2 className="w-5 h-5" />
          Compartilhar Mapa
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {financialSummary.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-gray-600">{item.label}</span>
                  <span className={`${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-6"
              onClick={() => onNavigate('financial')}
            >
              Ver Detalhes Financeiros
            </Button>
          </CardContent>
        </Card>

        {/* Campaign Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status de Campanhas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaignStatus.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-6"
              onClick={() => onNavigate('campaigns')}
            >
              Ver Todas as Campanhas
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Compartilhar Mapa */}
      <Dialog open={shareMapOpen} onOpenChange={setShareMapOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Compartilhar mapa de pontos</DialogTitle>
            <DialogDescription>
              Compartilhe o link público do mapa de pontos de mídia da sua empresa.
              Qualquer pessoa com o link poderá visualizar os pontos disponíveis.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Input
                id="map-url"
                value={publicMapUrl}
                readOnly
                className="h-9"
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="px-3"
              onClick={handleCopyMapLink}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar link
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}