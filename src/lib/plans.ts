/**
 * Single source of truth for platform plans
 * Used across Landing, Signup, and Settings
 */

export type PlanRange = 
  | '0-50' 
  | '50-100' 
  | '101-150' 
  | '151-200' 
  | '201-250' 
  | '251-300' 
  | '301-350' 
  | '351-400' 
  | '401-plus';

export interface PlanDefinition {
  id: string;
  range: PlanRange;
  name: string;
  description: string;
  minPoints: number;
  maxPoints: number | null; // null for unlimited
  monthlyPrice: number; // in cents (29900 = R$ 299,00)
  priceLabel: string;
  isPopular?: boolean;
}

/**
 * Official platform plans aligned with v2 documentation
 * Prices in BRL (cents):
 * - Até 50 pontos → R$ 299,00
 * - 50–100 pontos → R$ 399,00
 * - 101–150 pontos → R$ 499,00
 * - 151–200 pontos → R$ 599,00
 * - 201–250 pontos → R$ 699,00
 * - 251–300 pontos → R$ 799,00
 * - 301–350 pontos → R$ 899,00
 * - 351–400 pontos → R$ 999,00
 * - Mais de 400 pontos → Sob consulta (0 = no numeric price)
 */
export const PLATFORM_PLANS: PlanDefinition[] = [
  {
    id: 'plan-001',
    range: '0-50',
    name: 'Até 50 pontos',
    description: 'Ideal para operações menores que estão começando',
    minPoints: 0,
    maxPoints: 50,
    monthlyPrice: 29900, // R$ 299,00
    priceLabel: 'R$ 299',
    isPopular: false,
  },
  {
    id: 'plan-002',
    range: '50-100',
    name: '50 a 100 pontos',
    description: 'Para empresas em crescimento com inventário moderado',
    minPoints: 50,
    maxPoints: 100,
    monthlyPrice: 39900, // R$ 399,00
    priceLabel: 'R$ 399',
    isPopular: false,
  },
  {
    id: 'plan-003',
    range: '101-150',
    name: '101 a 150 pontos',
    description: 'Plano popular para operações estabelecidas',
    minPoints: 101,
    maxPoints: 150,
    monthlyPrice: 49900, // R$ 499,00
    priceLabel: 'R$ 499',
    isPopular: true, // Most popular plan
  },
  {
    id: 'plan-004',
    range: '151-200',
    name: '151 a 200 pontos',
    description: 'Para empresas com inventário robusto',
    minPoints: 151,
    maxPoints: 200,
    monthlyPrice: 59900, // R$ 599,00
    priceLabel: 'R$ 599',
    isPopular: false,
  },
  {
    id: 'plan-005',
    range: '201-250',
    name: '201 a 250 pontos',
    description: 'Operações de médio a grande porte',
    minPoints: 201,
    maxPoints: 250,
    monthlyPrice: 69900, // R$ 699,00
    priceLabel: 'R$ 699',
    isPopular: false,
  },
  {
    id: 'plan-006',
    range: '251-300',
    name: '251 a 300 pontos',
    description: 'Para grandes veículos regionais',
    minPoints: 251,
    maxPoints: 300,
    monthlyPrice: 79900, // R$ 799,00
    priceLabel: 'R$ 799',
    isPopular: false,
  },
  {
    id: 'plan-007',
    range: '301-350',
    name: '301 a 350 pontos',
    description: 'Operações de grande escala',
    minPoints: 301,
    maxPoints: 350,
    monthlyPrice: 89900, // R$ 899,00
    priceLabel: 'R$ 899',
    isPopular: false,
  },
  {
    id: 'plan-008',
    range: '351-400',
    name: '351 a 400 pontos',
    description: 'Para grandes redes nacionais',
    minPoints: 351,
    maxPoints: 400,
    monthlyPrice: 99900, // R$ 999,00
    priceLabel: 'R$ 999',
    isPopular: false,
  },
  {
    id: 'plan-009',
    range: '401-plus',
    name: 'Mais de 400 pontos',
    description: 'Plano enterprise customizado para sua operação',
    minPoints: 401,
    maxPoints: null, // Unlimited
    monthlyPrice: 0, // Sob consulta (no numeric price)
    priceLabel: 'Sob consulta',
    isPopular: false,
  },
];

/**
 * Get plan by range
 */
export function getPlanByRange(range: PlanRange): PlanDefinition | undefined {
  return PLATFORM_PLANS.find(p => p.range === range);
}

/**
 * Get plan by ID
 */
export function getPlanById(id: string): PlanDefinition | undefined {
  return PLATFORM_PLANS.find(p => p.id === id);
}

/**
 * Suggests the ideal plan based on number of points
 */
export function getSuggestedPlanForPoints(pointsCount: number): PlanDefinition | null {
  for (const plan of PLATFORM_PLANS) {
    if (plan.maxPoints === null) {
      // Unlimited plan (400+)
      if (pointsCount >= plan.minPoints) {
        return plan;
      }
    } else {
      // Plan with defined limit
      if (pointsCount >= plan.minPoints && pointsCount <= plan.maxPoints) {
        return plan;
      }
    }
  }
  
  return null;
}

/**
 * Format price in cents to BRL currency
 */
export function formatPlanPrice(priceInCents: number): string {
  if (priceInCents === 0) {
    return 'Sob consulta';
  }
  
  const priceInReais = priceInCents / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(priceInReais);
}

/**
 * Multi-Owners Add-on Pricing
 * Base price: R$ 99,00/month for 2 owners
 * Progressive pricing:
 * - 1 owner: R$ 0 (included)
 * - 2 owners: R$ 99,00
 * - 3 owners: R$ 113,85 (99 + 15%)
 * - 4 owners: R$ 128,70 (99 + 30%)
 */
const BASE_MULTI_OWNER_PRICE_CENTS = 9900; // R$ 99,00

export function getMultiOwnerPriceCents(maxOwnersPerMediaPoint: number): number {
  if (maxOwnersPerMediaPoint <= 1) return 0;
  if (maxOwnersPerMediaPoint === 2) return BASE_MULTI_OWNER_PRICE_CENTS;
  if (maxOwnersPerMediaPoint === 3) return Math.round(BASE_MULTI_OWNER_PRICE_CENTS * 1.15);
  if (maxOwnersPerMediaPoint === 4) return Math.round(BASE_MULTI_OWNER_PRICE_CENTS * 1.30);
  return 0;
}

/**
 * Get multi-owner label text
 */
export function getMultiOwnerLabel(maxOwnersPerMediaPoint: number): string {
  if (maxOwnersPerMediaPoint <= 1) return '1 proprietário (incluso)';
  return `Até ${maxOwnersPerMediaPoint} proprietários por ponto`;
}