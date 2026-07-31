import {
  addMarketplaceDays,
  type MarketplaceDateRangeValue,
} from "./marketplaceDates";

export type MarketplaceCampaignType =
  | "BIWEEKLY"
  | "MONTHLY"
  | "ON_REQUEST"
  | "";

const FIXED_CAMPAIGN_DURATIONS: Partial<
  Record<MarketplaceCampaignType, number>
> = {
  BIWEEKLY: 15,
  MONTHLY: 30,
};

export function getMarketplaceCampaignDurationDays(
  campaignType: MarketplaceCampaignType,
): number | null {
  return FIXED_CAMPAIGN_DURATIONS[campaignType] ?? null;
}

export function normalizeMarketplaceCampaignRange(
  range: MarketplaceDateRangeValue,
  campaignType: MarketplaceCampaignType,
): MarketplaceDateRangeValue {
  const durationDays = getMarketplaceCampaignDurationDays(campaignType);
  if (!range.from || durationDays === null) return range;

  return {
    from: range.from,
    to: addMarketplaceDays(range.from, durationDays - 1),
  };
}
