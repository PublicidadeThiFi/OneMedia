/**
 * Single source of truth for platform plans
 * Used across Landing, Signup, and Settings.
 */

export type PlanRange = string;

export interface PlanDefinition {
  id: string;
  range: PlanRange;
  name: string;
  description: string;
  minPoints: number;
  maxPoints: number | null;
  monthlyPrice: number; // cents for static/front-facing helpers
  priceLabel: string;
  isPopular?: boolean;
  publicName?: string;
}

const FIXED_PLANS: PlanDefinition[] = [
  {
    id: '9606a2fb-e7a9-4c77-b834-e566b87cdc0b',
    range: '1-50',
    name: 'Plano Solo',
    publicName: 'Solo',
    description: 'Ideal para operações menores que estão começando.',
    minPoints: 1,
    maxPoints: 50,
    monthlyPrice: 29900,
    priceLabel: 'R$ 299',
  },
  {
    id: '1be52bed-89e1-4543-b833-8195afadd3be',
    range: '51-100',
    name: 'Plano Core',
    publicName: 'Core',
    description: 'Para pequenas equipes que querem escalar.',
    minPoints: 51,
    maxPoints: 100,
    monthlyPrice: 39900,
    priceLabel: 'R$ 399',
  },
  {
    id: '890bdd79-075b-4ff0-9684-e2fdff6ac74f',
    range: '101-150',
    name: 'Plano Start',
    publicName: 'Start',
    description: 'Plano popular para operações estabelecidas.',
    minPoints: 101,
    maxPoints: 150,
    monthlyPrice: 49900,
    priceLabel: 'R$ 499',
    isPopular: true,
  },
  {
    id: '092ab0d7-0a88-49c5-a174-50633c37263d',
    range: '151-200',
    name: 'Plano Pro',
    publicName: 'Pro',
    description: 'Para empresas com inventário robusto.',
    minPoints: 151,
    maxPoints: 200,
    monthlyPrice: 59900,
    priceLabel: 'R$ 599',
  },
];

const PRO_2000_PLAN_IDS: Record<string, string> = {
  A: 'db9c2c5a-eb13-4c0c-8560-b99e204028c4',
  B: '6bf244fc-1d2c-4071-8d8f-9448e9a29c74',
  C: '3e7fd9bc-d171-4a96-a05d-a6e085cbc77d',
  D: 'b1e59d89-f5f0-49fb-8852-ee73b197dd6c',
  E: 'd52a9ada-6260-404e-ab03-ae2a708e7a00',
  F: 'a8ffbfa8-492d-426c-b733-75cd20b2d49b',
  G: '21c1cda9-a9d5-4299-8180-e6646aa5b588',
  H: '280dc17b-35f2-49a5-88fb-c7ccbd466773',
  I: '0e25b958-5998-46a1-a83c-8ada393c1560',
  J: '0acc369c-a7ae-4e30-bcbf-8a06c7bb54cf',
  K: '67cb22a7-bd47-4df0-96a5-9521d88732dc',
  L: 'f791d65d-f788-47a0-9416-54e984f52d3a',
  M: '89fa2a1a-167b-4283-a3ab-6eb658544351',
  N: '5982415e-2069-412f-89ba-ed20493ae013',
  O: 'd5b8d0d6-954a-454c-9bcc-b4bccf778d1f',
  P: '8f155086-63fb-459c-9f97-7b7fd2880861',
  Q: '3dc68f87-3951-4e69-88be-644a8a311c87',
  R: '461f796f-6625-41dc-a9b0-72d6aa17745c',
  S: '8e1fa1f8-dd2d-479e-99d1-de2624ee68f3',
  T: '052441cd-a2d7-49cc-91e5-d237e2d2f4f2',
  U: '910bdeac-c469-4502-ae93-816f798d45f7',
  V: '9aadfd55-d330-4e5a-8703-4b0f6d77dc14',
  W: '139feac0-afd1-4e07-aed1-c50530072bda',
  X: '98337700-c30c-435a-b419-9974961480d7',
  Y: '5355cc4b-0d01-444b-a97d-d910cd1d6b45',
  Z: 'd8d6a857-95a1-4cd6-96f2-ff68dffcd1ee',
  AA: 'a147288b-1666-4e23-b79d-8be799b5ce6b',
  AB: '8fd60472-3615-4ed3-8b70-4733e85fe318',
  AC: '060e04a8-cd57-41e4-857f-e108a22cda96',
  AD: '72d6ddd6-ec3b-460a-85f1-6fb169bb7f95',
  AE: '615f4202-86e6-47b5-b774-014e5a602f91',
  AF: 'e73e6bcb-4966-4fd7-ba64-b6a9a1d87013',
  AG: '4ef8d04e-5a56-47bb-a4fc-9583d70922ec',
  AH: '3ee99de3-4369-411f-9cb8-2a1a981ac7e4',
  AI: '26abc52a-ba21-4263-bad5-0dd03a6acc25',
  AJ: 'f00d5f95-2b1e-4ab1-af11-de63d136b671',
};

const PRO_2000_LETTERS = Object.keys(PRO_2000_PLAN_IDS);

function buildPro2000Plans(): PlanDefinition[] {
  return PRO_2000_LETTERS.map((letter, index) => {
    const maxPoints = 250 + index * 50;
    const minPoints = maxPoints - 49;
    const monthlyPrice = 69900 + index * 10000;

    return {
      id: PRO_2000_PLAN_IDS[letter],
      range: `${minPoints}-${maxPoints}`,
      name: `Plano Pro 2000 ${letter}`,
      publicName: 'Pro 2.000',
      description: 'Plano escalável para operações em expansão.',
      minPoints,
      maxPoints,
      monthlyPrice,
      priceLabel: formatPlanPrice(monthlyPrice),
    };
  });
}

export const PLATFORM_PLANS: PlanDefinition[] = [...FIXED_PLANS, ...buildPro2000Plans()].sort(
  (a, b) => a.minPoints - b.minPoints,
);

export const FIXED_PLAN_IDS = {
  solo: FIXED_PLANS[0].id,
  core: FIXED_PLANS[1].id,
  start: FIXED_PLANS[2].id,
  pro: FIXED_PLANS[3].id,
} as const;

export function getPlanByRange(range: PlanRange): PlanDefinition | undefined {
  return PLATFORM_PLANS.find((p) => p.range === range);
}

export function getPlanById(id: string): PlanDefinition | undefined {
  return PLATFORM_PLANS.find((p) => p.id === id);
}

export function isPro2000PlanId(planId: string | null | undefined): boolean {
  if (!planId) return false;
  return Object.values(PRO_2000_PLAN_IDS).includes(planId);
}

export function getPro2000PlanForPoints(pointsCount: number): PlanDefinition | null {
  const normalizedPoints = Math.max(201, Math.min(2000, pointsCount));
  return (
    PLATFORM_PLANS.find(
      (plan) =>
        isPro2000PlanId(plan.id) &&
        normalizedPoints >= plan.minPoints &&
        normalizedPoints <= (plan.maxPoints ?? Number.MAX_SAFE_INTEGER),
    ) ?? null
  );
}

export function getSuggestedPlanForPoints(pointsCount: number): PlanDefinition | null {
  return (
    PLATFORM_PLANS.find(
      (plan) => pointsCount >= plan.minPoints && pointsCount <= (plan.maxPoints ?? Number.MAX_SAFE_INTEGER),
    ) ?? null
  );
}

export function getFriendlyPlanName(plan: Pick<PlanDefinition, 'id' | 'name'> | null | undefined): string {
  if (!plan) return '—';
  if (plan.id === FIXED_PLAN_IDS.solo) return 'Solo';
  if (plan.id === FIXED_PLAN_IDS.core) return 'Core';
  if (plan.id === FIXED_PLAN_IDS.start) return 'Start';
  if (plan.id === FIXED_PLAN_IDS.pro) return 'Pro';
  if (isPro2000PlanId(plan.id)) return 'Pro 2.000';
  return plan.name;
}

export function getFriendlyPlanLabel(
  plan: Pick<PlanDefinition, 'id' | 'name' | 'minPoints' | 'maxPoints'> | null | undefined,
): string {
  if (!plan) return '—';
  const baseName = getFriendlyPlanName(plan);
  const maxPoints = plan.maxPoints ?? null;
  const minPoints = plan.minPoints ?? null;

  if (maxPoints == null) return baseName;
  if (baseName === 'Pro 2.000') return `${baseName} (${maxPoints} pontos)`;
  return `${baseName} (${minPoints ?? 0}-${maxPoints} pontos)`;
}

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

const BASE_MULTI_OWNER_PRICE_CENTS = 9900;

export function getMultiOwnerPriceCents(maxOwnersPerMediaPoint: number): number {
  if (maxOwnersPerMediaPoint <= 1) return 0;
  if (maxOwnersPerMediaPoint === 2) return BASE_MULTI_OWNER_PRICE_CENTS;
  if (maxOwnersPerMediaPoint === 3) return Math.round(BASE_MULTI_OWNER_PRICE_CENTS * 1.15);
  if (maxOwnersPerMediaPoint === 4) return Math.round(BASE_MULTI_OWNER_PRICE_CENTS * 1.3);
  return 0;
}

export function getMultiOwnerPlanPrice(maxOwnersPerMediaPoint: number): number {
  return getMultiOwnerPriceCents(maxOwnersPerMediaPoint) / 100;
}

export function getMultiOwnerPlanName(maxOwnersPerMediaPoint: number): string {
  if (maxOwnersPerMediaPoint <= 1) return '1 proprietário';
  return `${maxOwnersPerMediaPoint} proprietários`;
}

export function getMultiOwnerLabel(maxOwnersPerMediaPoint: number): string {
  if (maxOwnersPerMediaPoint <= 1) return '1 proprietário (incluso)';
  return `Até ${maxOwnersPerMediaPoint} proprietários por ponto`;
}
