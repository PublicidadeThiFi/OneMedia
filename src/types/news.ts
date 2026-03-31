import type {
  AdminNewsLoginPayload,
  AdminNewsLoginResponse,
  AdminNewsMeResponse,
  AdminNewsUser,
} from './admin-news-auth';

export type { AdminNewsLoginPayload, AdminNewsLoginResponse, AdminNewsMeResponse, AdminNewsUser };

export const NEWS_ARTICLE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type NewsArticleStatus = (typeof NEWS_ARTICLE_STATUSES)[number];

export const NEWS_BLOCK_TYPES = [
  'heading',
  'subheading',
  'paragraph',
  'image',
  'gallery',
  'quote',
  'callout',
  'divider',
  'source-list',
  'button',
] as const;
export type NewsBlockType = (typeof NEWS_BLOCK_TYPES)[number];

export const NEWS_TEXT_ALIGNMENTS = ['left', 'center', 'right'] as const;
export type NewsTextAlignment = (typeof NEWS_TEXT_ALIGNMENTS)[number];

export const NEWS_HEADING_LEVELS = [1, 2, 3] as const;
export type NewsHeadingLevel = (typeof NEWS_HEADING_LEVELS)[number];

export const NEWS_CALLOUT_TONES = ['neutral', 'info', 'success', 'warning', 'danger'] as const;
export type NewsCalloutTone = (typeof NEWS_CALLOUT_TONES)[number];

export const NEWS_DIVIDER_SPACINGS = ['sm', 'md', 'lg'] as const;
export type NewsDividerSpacing = (typeof NEWS_DIVIDER_SPACINGS)[number];

export const NEWS_BUTTON_VARIANTS = ['primary', 'secondary', 'link'] as const;
export type NewsButtonVariant = (typeof NEWS_BUTTON_VARIANTS)[number];

export interface NewsBlockStyle {
  textColor?: string | null;
  backgroundColor?: string | null;
  accentColor?: string | null;
  fontFamily?: string | null;
  textAlign?: NewsTextAlignment | null;
}

export interface NewsImageItem {
  url: string;
  alt?: string | null;
  caption?: string | null;
}

export interface NewsSourceItem {
  label: string;
  url?: string | null;
  note?: string | null;
}

interface NewsBlockBase<TType extends NewsBlockType, TData> {
  id: string;
  type: TType;
  data: TData;
  style?: NewsBlockStyle | null;
}

export type NewsHeadingBlock = NewsBlockBase<'heading', {
  text: string;
  level?: NewsHeadingLevel;
}>;

export type NewsSubheadingBlock = NewsBlockBase<'subheading', {
  text: string;
}>;

export type NewsParagraphBlock = NewsBlockBase<'paragraph', {
  text: string;
}>;

export type NewsImageBlock = NewsBlockBase<'image', NewsImageItem>;

export type NewsGalleryBlock = NewsBlockBase<'gallery', {
  images: NewsImageItem[];
}>;

export type NewsQuoteBlock = NewsBlockBase<'quote', {
  text: string;
  author?: string | null;
}>;

export type NewsCalloutBlock = NewsBlockBase<'callout', {
  title?: string | null;
  text: string;
  tone?: NewsCalloutTone;
}>;

export type NewsDividerBlock = NewsBlockBase<'divider', {
  spacing?: NewsDividerSpacing;
}>;

export type NewsSourceListBlock = NewsBlockBase<'source-list', {
  title?: string | null;
  items: NewsSourceItem[];
}>;

export type NewsButtonBlock = NewsBlockBase<'button', {
  label: string;
  url: string;
  variant?: NewsButtonVariant;
  openInNewTab?: boolean;
}>;

export type NewsArticleBlock =
  | NewsHeadingBlock
  | NewsSubheadingBlock
  | NewsParagraphBlock
  | NewsImageBlock
  | NewsGalleryBlock
  | NewsQuoteBlock
  | NewsCalloutBlock
  | NewsDividerBlock
  | NewsSourceListBlock
  | NewsButtonBlock;

export interface NewsArticleUpsertInput {
  title: string;
  slug: string;
  summary?: string | null;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  status?: NewsArticleStatus;
  content: NewsArticleBlock[];
  sources?: NewsSourceItem[];
  publishedAt?: string | null;
}

export interface NewsArticleRecord extends NewsArticleUpsertInput {
  id: string;
  status: NewsArticleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NewsEditorSchema {
  statuses: NewsArticleStatus[];
  blockTypes: NewsBlockType[];
  textAlignments: NewsTextAlignment[];
  headingLevels: NewsHeadingLevel[];
  calloutTones: NewsCalloutTone[];
  dividerSpacings: NewsDividerSpacing[];
  buttonVariants: NewsButtonVariant[];
}


export interface PublishedNewsListItem {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  publishedAt?: string | null;
  updatedAt: string;
}

export interface PublishedNewsListResponse {
  data: PublishedNewsListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminNewsListResponse {
  data: NewsArticleRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}


export interface AdminNewsUploadResponse {
  url: string;
  kind: 'cover' | 'content' | 'gallery';
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
}
