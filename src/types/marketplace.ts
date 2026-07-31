export type MarketplaceAvailabilityStatus =
  | "AVAILABLE"
  | "PARTIAL"
  | "OCCUPIED";

export type MarketplaceMediaItem = {
  id: string;
  kind: "image" | "video";
  url: string;
  mimeType?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
  source?: "point" | "unit";
  sourceId?: string;
  unitId?: string | null;
  label?: string | null;
  createdAt?: string | null;
};

export type MarketplaceAvailabilitySummary = {
  status: MarketplaceAvailabilityStatus;
  label: "Disponível" | "Parcialmente disponível" | "Ocupado";
  isAvailable: boolean;
  unitsCount: number;
  availableUnitsCount: number;
  occupiedUnitsCount: number;
  nextAvailableAt: string | null;
  startDate: string;
  endDate: string;
  timezone: "America/Sao_Paulo";
};

export type MarketplacePointCardData = {
  id: string;
  slug: string;
  name: string | null;
  type: string;
  subcategory: string | null;
  environment: string | null;
  shortDescription: string | null;
  location: {
    district: string | null;
    city: string | null;
    state: string | null;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  cover: MarketplaceMediaItem | null;
  price: {
    label: "A partir de";
    amount: number;
    cycle: "BIWEEKLY";
    currency: "BRL";
  };
  availability: MarketplaceAvailabilitySummary;
  dailyImpressions: number | null;
  distanceKm: number | null;
};

export type MarketplaceMapPoint = {
  id: string;
  slug: string;
  name: string | null;
  type: string;
  latitude: number;
  longitude: number;
  priceBiweekly: number;
  availability: {
    status: MarketplaceAvailabilityStatus;
    isAvailable: boolean;
    nextAvailableAt: string | null;
  };
  distanceKm: number | null;
};

export type MarketplaceHomeSectionKey =
  | "most-searched"
  | "high-impact"
  | "available-next-month"
  | "brand-highlights"
  | string;

export type MarketplaceHomeSection = {
  key: MarketplaceHomeSectionKey;
  title: string;
  viewMoreQuery: Record<string, string | number | boolean | null | undefined>;
  items: MarketplacePointCardData[];
};

export type MarketplaceFilterMetadata = {
  types: string[];
  states: string[];
  cities: string[];
  citiesByState: Array<{ state: string; cities: string[] }>;
  subcategories: string[];
  environments: string[];
  priceRange: { min: number | null; max: number | null };
};

export type MarketplaceHomeResponse = {
  generatedAt: string;
  availabilityRange: {
    startDate: string;
    endDate: string;
    timezone: "America/Sao_Paulo";
  };
  filters: MarketplaceFilterMetadata;
  sections: MarketplaceHomeSection[];
};

export type MarketplaceSearchSort =
  | "featured"
  | "popular"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "impact_desc"
  | "distance";

export type MarketplaceSearchParams = {
  q?: string;
  state?: string;
  city?: string;
  type?: string;
  subcategory?: string;
  environment?: string;
  startDate?: string;
  endDate?: string;
  minPrice?: number;
  maxPrice?: number;
  bbox?: string;
  near?: string;
  radiusKm?: number;
  availability?: "available" | "occupied";
  sort?: MarketplaceSearchSort;
  page?: number;
  pageSize?: 6;
};

export type MarketplacePagination = {
  page: number;
  pageSize: 6;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type MarketplaceAppliedFilters = {
  q: string | null;
  state: string | null;
  city: string | null;
  type: string | null;
  subcategory: string | null;
  environment: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  availability: "available" | "occupied" | null;
  bbox: [number, number, number, number] | null;
  near: {
    latitude: number;
    longitude: number;
    radiusKm: number | null;
  } | null;
  sort: MarketplaceSearchSort;
  startDate: string;
  endDate: string;
  timezone: "America/Sao_Paulo";
};

export type MarketplaceSearchResponse = {
  items: MarketplacePointCardData[];
  mapPoints: MarketplaceMapPoint[];
  pagination: MarketplacePagination;
  filters: MarketplaceFilterMetadata;
  appliedFilters: MarketplaceAppliedFilters;
};

export type MarketplacePointHighlight = {
  title: string;
  description: string | null;
  icon: string | null;
};

export type MarketplacePointUnit = {
  id: string;
  label: string | null;
  type: string;
  orientation: string | null;
  widthM: number | null;
  heightM: number | null;
  insertionsPerDay: number | null;
  resolution: {
    widthPx: number;
    heightPx: number;
  } | null;
  priceBiweekly: number | null;
  priceMonthly: number | null;
};

export type MarketplacePointPartner = {
  id: string;
  name: string;
  logoUrl: string | null;
  verified: boolean;
  averageResponseTime: string;
  responseHours: number;
  pointsCount: number;
};

export type MarketplacePointDetail = Omit<MarketplacePointCardData, "price"> & {
  price: MarketplacePointCardData["price"] & {
    monthlyAmount: number | null;
  };
  description: {
    short: string | null;
    long: string | null;
  };
  address: {
    zipcode: string | null;
    street: string | null;
    number: string | null;
    district: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  };
  socialClasses: string[];
  gallery: MarketplaceMediaItem[];
  units: MarketplacePointUnit[];
  highlights: MarketplacePointHighlight[];
  campaignUseCases: string[];
  partner: MarketplacePointPartner;
  seo: {
    title: string;
    description: string;
    canonicalUrl: string;
    imageUrl: string | null;
    openGraph: {
      type: string;
      title: string;
      description: string;
      url: string;
      image: string | null;
    };
  };
  publishedAt: string | null;
  verifiedAt: string | null;
  updatedAt: string | null;
};

export type MarketplaceAvailabilityDay = {
  date: string;
  status: MarketplaceAvailabilityStatus;
  label: MarketplaceAvailabilitySummary["label"];
  isAvailable: boolean;
  availableUnitsCount: number;
  occupiedUnitsCount: number;
};

export type MarketplaceAvailabilityResponse = MarketplaceAvailabilitySummary & {
  pointId: string;
  slug: string;
  days: MarketplaceAvailabilityDay[];
  blockedRanges: Array<{
    mediaUnitId: string;
    startDate: string;
    endDate: string;
  }>;
};

export type MarketplaceNearbyResponse = {
  items: MarketplacePointCardData[];
  total: number;
  radiusKm: number;
  origin: {
    latitude: number;
    longitude: number;
  };
};

export type MarketplaceInquiryStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CONTACTED"
  | "CONVERTED"
  | "REJECTED"
  | "CANCELED"
  | "CLOSED";

export type MarketplaceInquiryCampaignType = "BIWEEKLY" | "MONTHLY" | "CUSTOM";

export type MarketplaceInquiryOperatorItem = {
  id: string;
  status: MarketplaceInquiryStatus;
  statusLabel: string;
  campaignType: MarketplaceInquiryCampaignType;
  startDate: string;
  endDate: string;
  notes: string | null;
  source: string | null;
  selectedUnitIds: string[];
  createdAt: string;
  updatedAt: string;
  point: {
    id: string;
    slug: string | null;
    name: string;
    type: string | null;
    subcategory: string | null;
    city: string | null;
    state: string | null;
    coverUrl: string | null;
  };
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  conversion: {
    convertedAt: string | null;
    client: {
      id: string;
      contactName: string;
      email: string | null;
      status: string;
    } | null;
    proposal: {
      id: string;
      title: string | null;
      status: string;
      publicHash: string | null;
    } | null;
    campaign: { id: string; name: string; status: string } | null;
  };
  conversation: {
    id: string;
    lastMessageAt: string | null;
    closedAt: string | null;
  } | null;
  internalLinks: {
    client: string | null;
    proposal: string | null;
    campaign: string | null;
  };
};

export type MarketplaceInquiryOperatorResponse = {
  items: MarketplaceInquiryOperatorItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type PendingMarketplaceInquiry = {
  version: 1;
  slug: string;
  startDate: string;
  endDate: string;
  campaignType: MarketplaceInquiryCampaignType;
  returnUrl: string;
  createdAt: string;
};

export type MarketplaceAccount = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "DELETED";
  emailVerifiedAt: string | null;
  termsVersion: string | null;
  termsAcceptedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  counts?: {
    inquiries: number;
    conversations: number;
  };
};

export type MarketplaceAccountAuthResponse = {
  account: MarketplaceAccount;
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessExpiresInSeconds?: number;
  };
};

export type MarketplaceCustomerInquiry = {
  id: string;
  status: MarketplaceInquiryStatus;
  statusLabel: string;
  campaignType: MarketplaceInquiryCampaignType;
  startDate: string;
  endDate: string;
  notes: string | null;
  source: string | null;
  selectedUnitIds: string[];
  createdAt: string;
  updatedAt: string;
  point: MarketplaceInquiryOperatorItem["point"];
  conversion: MarketplaceInquiryOperatorItem["conversion"];
  conversation: MarketplaceInquiryOperatorItem["conversation"];
  company: {
    name: string;
    logoUrl: string | null;
  };
};

export type MarketplaceCustomerInquiryResponse = {
  items: MarketplaceCustomerInquiry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type MarketplaceConversationMessageSender =
  | "CUSTOMER"
  | "BUSINESS"
  | "SYSTEM";

export type MarketplaceConversationMessage = {
  id: string;
  conversationId: string;
  senderKind: MarketplaceConversationMessageSender;
  senderName: string;
  contentText: string;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketplaceConversationSummary = {
  id: string;
  inquiryId: string;
  lastMessageAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  inquiry: {
    id: string;
    status: MarketplaceInquiryStatus;
    statusLabel: string;
    campaignType: MarketplaceInquiryCampaignType;
    startDate: string | null;
    endDate: string | null;
  };
  point: {
    id: string;
    slug: string | null;
    name: string;
    coverUrl: string | null;
    city: string | null;
    state: string | null;
  };
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  company: {
    id: string;
    name: string;
    logoUrl: string | null;
  } | null;
  lastMessage: MarketplaceConversationMessage | null;
};

export type MarketplaceConversationListResponse = {
  items: MarketplaceConversationSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type MarketplaceConversationMessagesResponse = {
  conversation: MarketplaceConversationSummary;
  items: MarketplaceConversationMessage[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type MarketplacePublicEventType = "DETAIL_VIEW" | "FAVORITE" | "SHARE";

export type MarketplaceReportReason =
  | "INACCURATE_INFORMATION"
  | "UNAVAILABLE"
  | "DUPLICATE"
  | "INAPPROPRIATE_CONTENT"
  | "FRAUD_OR_SCAM"
  | "OTHER";

export type MarketplaceReportStatus =
  | "OPEN"
  | "REVIEWING"
  | "RESOLVED"
  | "DISMISSED";

export type MarketplacePointPublicationStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "SUSPENDED";

export type MarketplaceModerationProfileItem = {
  mediaPointId: string;
  point: {
    name: string;
    type: string;
    city: string | null;
    state: string | null;
    mainImageUrl: string | null;
  };
  profile: {
    id: string;
    slug: string;
    status: MarketplacePointPublicationStatus;
    shortDescription: string | null;
    longDescription: string | null;
    highlights: MarketplacePointHighlight[];
    campaignUseCases: string[];
    featuredRank: number;
    publishedAt: string | null;
    verifiedAt: string | null;
  } | null;
  readiness: { isReady: boolean; missing: string[] };
  metrics: { popularityScore: number; openReports: number; windowDays: number };
};

export type MarketplaceModerationProfilesResponse = {
  items: MarketplaceModerationProfileItem[];
  company: { marketplaceEnabled: boolean };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type MarketplaceReportModerationAction =
  | "ANALYSIS_STARTED"
  | "ANALYSIS_REOPENED"
  | "RETURNED_TO_OPEN"
  | "RESOLVED"
  | "DISMISSED"
  | "POINT_SUSPENDED";

export type MarketplaceReportModerationEvent = {
  id: string;
  action: MarketplaceReportModerationAction;
  fromStatus: MarketplaceReportStatus;
  toStatus: MarketplaceReportStatus;
  note: string | null;
  pointSuspended: boolean;
  createdAt: string;
  performedBy: { id: string; name: string } | null;
};

export type MarketplaceModerationReportItem = {
  id: string;
  reason: MarketplaceReportReason;
  status: MarketplaceReportStatus;
  details: string | null;
  /** Compatibilidade temporária com a API anterior à Fase 4. */
  resolutionNote: string | null;
  notes: {
    analysis: string | null;
    resolution: string | null;
    dismissal: string | null;
    suspension: string | null;
  };
  moderationHistory: MarketplaceReportModerationEvent[];
  allowedTransitions: MarketplaceReportStatus[];
  canSuspendPoint: boolean;
  email: string | null;
  reporterName: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: { id: string; name: string } | null;
  point: {
    id: string;
    name: string;
    imageUrl: string | null;
    city: string | null;
    state: string | null;
    slug: string | null;
    status: MarketplacePointPublicationStatus;
  };
};

export type MarketplaceModerationReportsResponse = {
  items: MarketplaceModerationReportItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
