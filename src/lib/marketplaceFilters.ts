import type {
  MarketplaceSearchParams,
  MarketplaceSearchSort,
} from "../types/marketplace";

const ALLOWED_SORTS = new Set<MarketplaceSearchSort>([
  "featured",
  "popular",
  "newest",
  "price_asc",
  "price_desc",
  "impact_desc",
  "distance",
]);

const SEARCH_KEYS = [
  "q",
  "state",
  "city",
  "type",
  "subcategory",
  "environment",
  "startDate",
  "endDate",
  "minPrice",
  "maxPrice",
  "bbox",
  "near",
  "radiusKm",
  "availability",
  "sort",
  "page",
] as const;

function clean(value: string | null) {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
}

function positiveNumber(value: string | null) {
  const normalized = clean(value);
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function positiveInteger(value: string | null) {
  const parsed = positiveNumber(value);
  if (parsed == null) return undefined;
  return Math.max(1, Math.floor(parsed));
}

export function parseMarketplaceSearchParams(
  search: string,
): MarketplaceSearchParams {
  const query = new URLSearchParams(search);
  const type = clean(query.get("type"));
  const availability = clean(query.get("availability"));
  const sort = clean(query.get("sort")) as MarketplaceSearchSort | undefined;

  const startDate = clean(query.get("startDate"));
  const endDate = clean(query.get("endDate"));

  return {
    q: clean(query.get("q")),
    state: clean(query.get("state")),
    city: clean(query.get("city")),
    type: type === "OOH" || type === "DOOH" ? type : undefined,
    subcategory: clean(query.get("subcategory")),
    environment: clean(query.get("environment")),
    startDate: startDate || endDate,
    endDate: endDate || startDate,
    minPrice: positiveNumber(query.get("minPrice")),
    maxPrice: positiveNumber(query.get("maxPrice")),
    bbox: clean(query.get("bbox")),
    near: clean(query.get("near")),
    radiusKm: positiveNumber(query.get("radiusKm")),
    availability:
      availability === "available" || availability === "occupied"
        ? availability
        : undefined,
    sort: sort && ALLOWED_SORTS.has(sort) ? sort : undefined,
    page: positiveInteger(query.get("page")),
    pageSize: 6,
  };
}

export function countMarketplaceAdvancedFilters(
  params: MarketplaceSearchParams,
) {
  return [
    params.state,
    params.city,
    params.subcategory,
    params.environment,
    params.minPrice,
    params.maxPrice,
    params.availability,
    params.sort && params.sort !== "featured" ? params.sort : undefined,
  ].filter((value) => value !== undefined && value !== null && value !== "")
    .length;
}

export function buildMarketplacePatchedSearchPath(
  currentSearch: string,
  patch: Record<string, string | number | null | undefined>,
  resetPage = true,
) {
  const query = new URLSearchParams(currentSearch);

  for (const key of SEARCH_KEYS) {
    if (!query.has(key)) continue;
    const value = query.get(key);
    query.delete(key);
    if (value != null && value !== "") query.set(key, value);
  }

  Object.entries(patch).forEach(([key, value]) => {
    query.delete(key);
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });

  if (resetPage && !Object.prototype.hasOwnProperty.call(patch, "page")) {
    query.delete("page");
  }

  const serialized = query.toString();
  return serialized ? `/buscar?${serialized}` : "/buscar";
}
