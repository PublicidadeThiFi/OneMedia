import { useMemo } from 'react';

export type DisplayPlan = {
  id: string;
  name: string;
  strikePrice?: string;
  monthlyPrice: string;
  users: number;
  points: number;
  tag?: string;
  accent?: string;
  description: string;
};

export const displayPlans: DisplayPlan[] = [
  {
    id: 'solo',
    name: 'Solo',
    strikePrice: 'R$ 299,00',
    monthlyPrice: 'R$ 299,00/mês',
    users: 1,
    points: 50,
    tag: 'Para começar',
    accent: 'border-blue-500/70',
    description: 'Gestão completa para o dono do negócio. Todas as ferramentas de venda, financeiro e DOOH libertas para um utilizador. Ideal para quem gere a sua própria operação com profissionalismo e agilidade.',
  },
  {
    id: 'core',
    name: 'Core',
    strikePrice: 'R$ 399,00',
    monthlyPrice: 'R$ 399,00/mês',
    users: 3,
    points: 100,
    tag: 'Crescimento',
    accent: 'border-blue-500/70',
    description: 'Para pequenas equipes que querem escalar. Até 3 usuários com acesso completo às ferramentas de vendas, inventário e financeiro para crescer com organização e velocidade.',
  },
  {
    id: 'start',
    name: 'Start',
    strikePrice: 'R$ 499,00',
    monthlyPrice: 'R$ 499,00/mês',
    users: 10,
    points: 150,
    tag: 'Popular',
    accent: 'border-green-500/70',
    description: 'O plano escolhido pela maioria das operações em crescimento. Equipe de até 10 pessoas com todos os recursos para vender mais e gerir o inventário com eficiência.',
  },
  {
    id: 'pro',
    name: 'Pro',
    strikePrice: 'R$ 599,00',
    monthlyPrice: 'R$ 599,00/mês',
    users: 15,
    points: 200,
    tag: 'Operações',
    accent: 'border-blue-500/70',
    description: 'Para operações robustas com múltiplos usuários. Até 15 pessoas com acesso total, recursos avançados de inventário e relatórios para dominar o mercado OOH/DOOH.',
  },
];

export const sharedFeatures = [
  'Mídia Kit Ao vivo',
  'Mapa Interativo',
  'Propostas Comerciais',
  'Notificações de Leitura',
  'Gestão Simples do Inventário',
  'Gestão de Campanhas',
  'Fluxo de Caixa',
  'DRE por Ponto de Mídia',
  'Relatórios',
  'Cobranças',
  'Gestão Avançada do Inventário',
  'Sistema de Reservas',
  'Multi-Proprietários',
  'Assinatura Digital Nativa',
  'Emissão de Notas Fiscais (NF-e)',
];

export const proSliderConfig = {
  id: 'pro-2000',
  name: 'Pro 2.000',
  minPoints: 250,
  maxPoints: 2000,
  step: 50,
  basePoints: 250,
  basePrice: 699,
  pricePer100: 200,
  users: 20,
};

export function useProSliderPrice(points: number) {
  return useMemo(() => {
    const diff = Math.max(0, points - proSliderConfig.basePoints);
    const increments = diff / 100;
    const price = proSliderConfig.basePrice + increments * proSliderConfig.pricePer100;
    return Math.round(price);
  }, [points]);
}

export function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
