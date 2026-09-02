/**
 * Presentation-only helpers for subscription/plan labels.
 *
 * Commercial plan IDs, prices and capacity rules must come from backend APIs
 * (Pricing Catalog V2 / billing summary). Keep this module free of catalog data.
 */

export interface PlanLabelSource {
  name?: string | null;
  publicName?: string | null;
  minPoints?: number | null;
  maxPoints?: number | null;
}

export function getFriendlyPlanName(plan: PlanLabelSource | null | undefined): string {
  if (!plan) return '—';
  const publicName = String(plan.publicName || '').trim();
  if (publicName) return publicName;
  const name = String(plan.name || '').trim();
  return name || 'Plano';
}

export function getFriendlyPlanLabel(plan: PlanLabelSource | null | undefined): string {
  if (!plan) return '—';

  const name = getFriendlyPlanName(plan);
  const minPoints = typeof plan.minPoints === 'number' ? plan.minPoints : null;
  const maxPoints = typeof plan.maxPoints === 'number' ? plan.maxPoints : null;

  if (minPoints === null && maxPoints === null) return name;
  if (maxPoints === null) return `${name} (a partir de ${minPoints ?? 0} pontos)`;
  if (minPoints === null || minPoints <= 0) return `${name} (até ${maxPoints} pontos)`;
  if (minPoints === maxPoints) return `${name} (${maxPoints} pontos)`;
  return `${name} (${minPoints}-${maxPoints} pontos)`;
}

export function getMultiOwnerPlanName(maxOwnersPerMediaPoint: number): string {
  if (maxOwnersPerMediaPoint <= 1) return '1 proprietário';
  return `${maxOwnersPerMediaPoint} proprietários`;
}

export function getMultiOwnerLabel(maxOwnersPerMediaPoint: number): string {
  if (maxOwnersPerMediaPoint <= 1) return '1 proprietário (incluso)';
  return `Até ${maxOwnersPerMediaPoint} proprietários por ponto`;
}
