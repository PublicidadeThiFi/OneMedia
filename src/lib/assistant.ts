import type { Page } from '../types/app-page';
import type { AssistantActionKind, AssistantActionSuggestion } from '../types/assistant';

export const ASSISTANT_MODULE_LABELS: Record<Page, string> = {
  home: 'Página Inicial',
  dashboard: 'Dashboard',
  inventory: 'Inventário',
  mediamap: 'Mídia Map',
  clients: 'Clientes',
  products: 'Produtos e Serviços',
  proposals: 'Propostas',
  campaigns: 'Campanhas',
  reservations: 'Reservas',
  financial: 'Financeiro',
  messages: 'Mensagens',
  mediakit: 'Mídia Kit',
  promotions: 'Promoções',
  activities: 'Atividades',
  settings: 'Configurações',
  superadmin: 'Super Admin',
};

export const ASSISTANT_MODULE_ROUTES: Record<Page, string> = {
  home: '/app/home',
  dashboard: '/app/dashboard',
  inventory: '/app/inventory',
  mediamap: '/app/mediamap',
  clients: '/app/clients',
  products: '/app/products',
  proposals: '/app/proposals',
  campaigns: '/app/campaigns',
  reservations: '/app/reservations',
  financial: '/app/financial',
  messages: '/app/messages',
  mediakit: '/app/mediakit',
  promotions: '/app/promotions',
  activities: '/app/activities',
  settings: '/app/settings',
  superadmin: '/app/superadmin',
};

export function getAssistantModuleLabel(module?: Page | string | null): string {
  if (!module) return 'Aplicativo';
  return ASSISTANT_MODULE_LABELS[module as Page] ?? 'Aplicativo';
}

export function getAssistantStarterPrompts(module?: Page | string | null): string[] {
  switch (module) {
    case 'proposals':
      return [
        'Resuma as propostas em modo leitura.',
        'Crie uma proposta para um cliente com 2 mídias por 30 dias.',
        'Abra propostas.',
      ];
    case 'clients':
      return [
        'Resuma a base de clientes.',
        'Cadastre um cliente usando CNPJ.',
        'Atualize o cliente ACME com telefone 11999999999.',
        'Abra clientes.',
      ];
    case 'products':
      return [
        'Resuma os produtos e serviços.',
        'Crie um serviço de instalação por R$ 500.',
        'Atualize o serviço Instalação para R$ 650.',
        'Abra produtos.',
      ];
    case 'inventory':
      return [
        'Resuma o inventário.',
        'Busque pontos em Macapá/AP.',
        'Cadastre um ponto DOOH em Macapá/AP.',
        'Cadastre uma face fluxo no ponto Painel Centro.',
      ];
    case 'financial':
      return [
        'Resuma o financeiro.',
        'Como estão as faturas abertas?',
        'Quais são as maiores pressões do caixa?',
        'Abra o dashboard.',
      ];
    case 'dashboard':
      return [
        'Resuma o dashboard para mim.',
        'Explique os alertas do dashboard.',
        'O que devo priorizar agora?',
        'Abra propostas.',
      ];
    case 'settings':
      return [
        'Explique o módulo de configurações.',
        'Quais ajustes são mais importantes aqui?',
        'Abra o financeiro.',
      ];
    case 'mediamap':
      return [
        'Explique o Mídia Map.',
        'Busque pontos DOOH no mapa.',
        'Abra o inventário.',
      ];
    case 'mediakit':
      return [
        'Explique o módulo de mídia kit.',
        'Busque pontos visíveis no mídia kit.',
        'Como ele usa os dados do inventário?',
      ];
    default:
      return [
        'Explique o módulo atual.',
        'Me dê um resumo em modo leitura.',
        'Resuma o dashboard para mim.',
        'Quais são as maiores pressões do caixa?',
        'O que devo priorizar agora?',
        'Retome do que paramos na última conversa.',
      ];
  }
}

export function getDataPointToneClasses(tone?: string) {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'info':
      return 'border-indigo-200 bg-indigo-50 text-indigo-700';
    default:
      return 'border-gray-200 bg-gray-50 text-gray-700';
  }
}

export function getAssistantActionKindClasses(kind?: AssistantActionKind) {
  if (kind === 'write') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

export function getAssistantActionKindLabel(kind?: AssistantActionKind) {
  return kind === 'write' ? 'Escrita' : 'Leitura';
}

export function resolveAssistantActionPath(action: AssistantActionSuggestion): string | null {
  if (action.targetPath) return action.targetPath;
  if (action.targetModule) return ASSISTANT_MODULE_ROUTES[action.targetModule];
  return null;
}
