import type { MediaPoint, MediaUnit } from "../types";

export type MediaPointPayload = Partial<Pick<MediaPoint,
  | "name"
  | "type"
  | "addressStreet"
  | "addressNumber"
  | "addressDistrict"
  | "addressCity"
  | "addressState"
  | "addressZipcode"
  | "addressCountry"
  | "latitude"
  | "longitude"
  | "subcategory"
  | "description"
  | "dailyImpressions"
  | "socialClasses"
  | "environment"
  | "showInMediaKit"
  | "basePriceMonth"
  | "basePriceWeek"
  | "basePriceDay"
  | "productionCosts"
>>;

export type MediaUnitPayload = Partial<Pick<MediaUnit,
  | "unitType"
  | "label"
  | "orientation"
  | "widthM"
  | "heightM"
  | "insertionsPerDay"
  | "resolutionWidthPx"
  | "resolutionHeightPx"
  | "priceMonth"
  | "priceWeek"
  | "priceDay"
>>;

function cleanObject<T extends Record<string, any>>(payload: T): T {
  const clean = {} as T;
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    clean[key as keyof T] = value as T[keyof T];
  }
  return clean;
}

export function sanitizeMediaPointPayload(source?: Partial<MediaPoint> | null): MediaPointPayload {
  const payload: MediaPointPayload = {
    name: source?.name,
    type: source?.type,
    addressStreet: source?.addressStreet,
    addressNumber: source?.addressNumber,
    addressDistrict: source?.addressDistrict,
    addressCity: source?.addressCity,
    addressState: source?.addressState,
    addressZipcode: source?.addressZipcode,
    addressCountry: source?.addressCountry,
    latitude: source?.latitude,
    longitude: source?.longitude,
    subcategory: source?.subcategory,
    description: source?.description,
    dailyImpressions: source?.dailyImpressions,
    socialClasses: Array.isArray(source?.socialClasses) ? [...source!.socialClasses] : undefined,
    environment: source?.environment,
    showInMediaKit: source?.showInMediaKit,
    basePriceMonth: source?.basePriceMonth,
    basePriceWeek: source?.basePriceWeek,
    basePriceDay: source?.basePriceDay,
    productionCosts: source?.productionCosts
      ? {
          lona: source.productionCosts.lona,
          adesivo: source.productionCosts.adesivo,
          vinil: source.productionCosts.vinil,
          montagem: source.productionCosts.montagem,
        }
      : undefined,
  };

  const clean = cleanObject(payload);
  if (clean.productionCosts) {
    clean.productionCosts = cleanObject(clean.productionCosts as Record<string, any>) as any;
    if (!Object.keys(clean.productionCosts as Record<string, any>).length) {
      delete clean.productionCosts;
    }
  }
  return clean;
}

export function sanitizeMediaUnitPayload(source?: Partial<MediaUnit> | null): MediaUnitPayload {
  const payload: MediaUnitPayload = {
    unitType: source?.unitType,
    label: source?.label,
    orientation: source?.orientation,
    widthM: source?.widthM,
    heightM: source?.heightM,
    insertionsPerDay: source?.insertionsPerDay,
    resolutionWidthPx: source?.resolutionWidthPx,
    resolutionHeightPx: source?.resolutionHeightPx,
    priceMonth: source?.priceMonth,
    priceWeek: source?.priceWeek,
    priceDay: source?.priceDay,
  };
  return cleanObject(payload);
}
