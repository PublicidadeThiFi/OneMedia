import { getCatalogMonthlyTrialDays } from '../lib/publicPricingCatalog';
import { usePublicPricingCatalog } from './usePublicPricingCatalog';

export function usePublicTrialDays(): number | null {
  const { plans } = usePublicPricingCatalog();
  return getCatalogMonthlyTrialDays(plans);
}
