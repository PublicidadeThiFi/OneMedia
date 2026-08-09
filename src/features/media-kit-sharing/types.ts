export type ShareRegion = { state: string; city?: string };
export type ShareActor = { name: string; email: string };

export type ShareVisibility = {
  description: boolean; photos: boolean; videos: boolean;
  cityState: boolean; address: boolean; coordinates: boolean;
  audience: boolean; dimensions: boolean; faceDetails: boolean;
  prices: boolean; promotions: boolean; availability: boolean;
  commercialContact: boolean;
};

export const DEFAULT_SHARE_VISIBILITY: ShareVisibility = {
  description: true, photos: true, videos: true, cityState: true,
  address: true, coordinates: true, audience: true, dimensions: true,
  faceDetails: true, prices: true, promotions: true, availability: true,
  commercialContact: true,
};

export type MediaKitShare = {
  shareId: string; scopeType: 'ALL' | 'REGIONS'; regions: ShareRegion[];
  visibility: ShareVisibility; pointCount: number; url: string | null;
  status: 'ACTIVE' | 'REVOKED'; accessCount: number;
  lastAccessAt: string | null; revokedAt: string | null;
  regeneratedAt: string | null; createdAt: string;
  createdBy: ShareActor | null; revokedBy: ShareActor | null;
};

export type PublicMapPromotion = { discountType: string; discountValue: number; startsAt: string | null; endsAt: string | null };
export type PublicMapUnit = { reference: string; type: string; label: string; orientation?: string | null; dimensions?: { widthM: number | null; heightM: number | null }; resolution?: { widthPx: number | null; heightPx: number | null }; insertionsPerDay?: number | null; prices?: { month: number | null; week: number | null; day: number | null }; media?: Array<{ type: 'image' | 'video'; url: string }>; promotions?: PublicMapPromotion[] };
export type PublicMapPoint = { reference: string; name: string; type: string; subcategory: string | null; description?: string | null; location?: { street?: string | null; number?: string | null; district?: string | null; city?: string | null; state?: string | null; country?: string | null; latitude?: number | null; longitude?: number | null }; environment?: string | null; dailyImpressions?: number | null; socialClasses?: string[]; prices?: { month: number | null; week: number | null; day: number | null }; availability?: 'available' | 'partial' | 'unavailable'; media?: Array<{ type: 'image' | 'video'; url: string }>; promotions?: PublicMapPromotion[]; units: PublicMapUnit[] };
export type PublicMediaMap = { version: 1; generatedAt: string; visibility: ShareVisibility; company: { name: string; logoUrl: string | null; primaryColor: string | null; email?: string | null; phone?: string | null; site?: string | null; city?: string | null; state?: string | null }; scope: { type: 'ALL' | 'REGIONS'; regions: ShareRegion[] }; stats: { points: number; units: number }; points: PublicMapPoint[] };
