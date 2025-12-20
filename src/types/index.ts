// Types baseados no schema Prisma

export enum CompanySubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum TwoFactorType {
  TOTP = 'TOTP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export enum UserRoleType {
  ADMINISTRATIVO = 'ADMINISTRATIVO',
  FINANCEIRO = 'FINANCEIRO',
  COMERCIAL = 'COMERCIAL',
  TI = 'TI',
}

export enum MediaType {
  OOH = 'OOH',
  DOOH = 'DOOH',
}

export enum UnitType {
  FACE = 'FACE',
  SCREEN = 'SCREEN',
}

export enum Orientation {
  FLUXO = 'FLUXO',
  CONTRA_FLUXO = 'CONTRA_FLUXO',
}

export enum ClientStatus {
  LEAD = 'LEAD',
  PROSPECT = 'PROSPECT',
  CLIENTE = 'CLIENTE',
  INATIVO = 'INATIVO',
}

export enum ProductType {
  PRODUTO = 'PRODUTO',
  SERVICO = 'SERVICO',
}

export enum PriceType {
  UNITARIO = 'UNITARIO',
  A_PARTIR_DE = 'A_PARTIR_DE',
  PACOTE = 'PACOTE',
}

export enum ProposalStatus {
  RASCUNHO = 'RASCUNHO',
  ENVIADA = 'ENVIADA',
  APROVADA = 'APROVADA',
  REPROVADA = 'REPROVADA',
  EXPIRADA = 'EXPIRADA',
}
// NO SCHEMA.PRISMA FALTA CAMPOS DE CampaignStatus (RASCUNHO, APROVADA, AGUARDANDO_MATERIAL, ATIVA, CANCELADA)
export enum CampaignStatus {
  RASCUNHO = 'RASCUNHO',
  APROVADA = 'APROVADA',
  AGUARDANDO_MATERIAL = 'AGUARDANDO_MATERIAL',
  EM_INSTALACAO = 'EM_INSTALACAO',
  ATIVA = 'ATIVA',
  EM_VEICULACAO = 'EM_VEICULACAO',
  FINALIZADA = 'FINALIZADA',
  CANCELADA = 'CANCELADA',
}

export enum ReservationStatus {
  RESERVADA = 'RESERVADA',
  CONFIRMADA = 'CONFIRMADA',
  CANCELADA = 'CANCELADA',
}

export enum BillingStatus {
  ABERTA = 'ABERTA',
  PAGA = 'PAGA',
  VENCIDA = 'VENCIDA',
  CANCELADA = 'CANCELADA',
}

export enum PaymentMethod {
  PIX = 'PIX',
  BOLETO = 'BOLETO',
  CARTAO = 'CARTAO',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

export enum CashFlowType {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
  TRANSFERENCIA = 'TRANSFERENCIA',
  IMPOSTO = 'IMPOSTO',
  PESSOAS = 'PESSOAS',
}

export enum PaymentType {
  A_VISTA = 'A_VISTA',
  PARCELADO = 'PARCELADO',
}

export enum PlatformSubscriptionStatus {
  TESTE = 'TESTE',
  ATIVA = 'ATIVA',
  EM_ATRASO = 'EM_ATRASO',
  CANCELADA = 'CANCELADA',
}
// NO SCHEMA.PRISMA FALTA CAMPOS DE OwnerRegime (OUTRO)
export enum OwnerRegime {
  DER = 'DER',
  ADMIN_PUBLICA = 'ADMIN_PUBLICA',
  AREA_PARTICULAR = 'AREA_PARTICULAR',
  OUTRO = 'OUTRO',
}
// NO SCHEMA.PRISMA NÃO TEM RentPeriodicity
export enum RentPeriodicity {
  MENSAL = 'MENSAL',
  TRIMESTRAL = 'TRIMESTRAL',
  ANUAL = 'ANUAL',
  OUTRO = 'OUTRO',
}

export enum MessageDirection {
  IN = 'IN',
  OUT = 'OUT',
}

export enum MessageChannel {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  SYSTEM = 'SYSTEM',
}

export enum MessageSenderType {
  USER = 'USER',
  CLIENTE = 'CLIENTE',
}

export enum ActivityResourceType {
  CLIENTE = 'CLIENTE',
  PROPOSTA = 'PROPOSTA',
  MIDIA = 'MIDIA',
  USUARIO = 'USUARIO',
  ASSINATURA = 'ASSINATURA',
  NF = 'NF',
  INTEGRACAO = 'INTEGRACAO',
}

// Interfaces baseadas nos modelos Prisma

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  site?: string;
  logoUrl?: string;
  primaryColor?: string;
  addressZipcode?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressDistrict?: string;
  addressCity?: string;
  addressState?: string;
  addressCountry?: string;
  defaultProposalNotes?: string;
  notificationPrefs?: any;
  integrations?: any;
  planId?: string;
  pointsLimit?: number;
  storageLimitMb?: number;
  usersLimit?: number;
  subscriptionStatus?: CompanySubscriptionStatus;
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  companyId?: string;
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  isSuperAdmin: boolean;
  twoFactorEnabled: boolean;
  twoFactorType?: TwoFactorType;
  twoFactorSecret?: string;
  status: UserStatus;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  userId: string;
  role: UserRoleType;
}

export interface MediaPoint {
  id: string;
  companyId: string;
  type: MediaType;
  subcategory?: string;
  name: string;
  description?: string;
  addressZipcode?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressDistrict?: string;
  addressCity?: string;
  addressState?: string;
  addressCountry?: string;
  latitude?: number;
  longitude?: number;
  dailyImpressions?: number;
  socialClasses: string[];
  environment?: string;
  showInMediaKit: boolean;
  basePriceMonth?: number;
  basePriceWeek?: number;
  basePriceDay?: number;
  mainImageUrl?: string;
  productionCosts?: ProductionCosts; // custos de produção OOH
  createdAt: Date;
  updatedAt: Date;
  units?: MediaUnit[];
  owners?: MediaPointOwner[];
}

export interface ProductionCosts {
  lona?: number | null;
  adesivo?: number | null;
  vinil?: number | null;
  montagem?: number | null;
}

export interface MediaUnit {
  id: string;
  companyId: string;
  mediaPointId: string;
  unitType: UnitType;
  label: string;
  orientation?: Orientation;
  widthM?: number;
  heightM?: number;
  insertionsPerDay?: number;
  resolutionWidthPx?: number;
  resolutionHeightPx?: number;
  priceMonth?: number;
  priceWeek?: number;
  priceDay?: number;
  imageUrl?: string | null; // imagem específica da face/tela
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaPointOwner {
  id: string;
  companyId: string;
  mediaPointId: string;
  ownerName: string;
  ownerDocument?: string;
  ownerPhone?: string | null; // contato do locador
  regime?: OwnerRegime;
  derMonthlyFee?: number;
  rentValue?: number;
  rentPeriodicity?: RentPeriodicity | null; // periodicidade do aluguel
  fixedExpenseDueDay?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaPointContract {
  id: string;
  companyId: string;
  mediaPointId: string;
  fileName: string;
  s3Key: string;
  signedAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  companyId: string;
  contactName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  cnpj?: string;
  role?: string;
  addressZipcode?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressDistrict?: string;
  addressCity?: string;
  addressState?: string;
  addressCountry?: string;
  status: ClientStatus;
  origin?: string;
  notes?: string;
  ownerUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ClientDocument - model client_documents do schema
 */
export interface ClientDocument {
  id: string;
  companyId: string;
  clientId: string;
  fileName: string;
  s3Key: string;
  documentType: string;
  uploadedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  category?: string;
  type: ProductType;
  priceType: PriceType;
  basePrice: number;
  isAdditional: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Proposal {
  id: string;
  companyId: string;
  clientId: string;
  responsibleUserId: string;
  title?: string;
  status: ProposalStatus;
  totalAmount: number;
  discountAmount?: number;
  discountPercent?: number;
  conditionsText?: string;
  validUntil?: Date;
  publicHash?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  client?: Client;
  items?: ProposalItem[];
}

export interface ProposalItem {
  id: string;
  companyId: string;
  proposalId: string;
  mediaUnitId?: string;
  productId?: string;
  description: string;
  startDate?: Date;
  endDate?: Date;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign {
  id: string;
  companyId: string;
  proposalId: string;
  clientId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: CampaignStatus;
  totalAmountCents?: number;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  client?: Partial<Client> | null;
  clientName?: string | null;
  proposalTitle?: string | null;
  reservedUnitsCount?: number;
  proposal?: Partial<Proposal> | null;
  items?: CampaignItem[];
}
export interface CampaignItem {
  id: string;
  companyId: string;
  campaignId: string;
  mediaUnitId: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reservation {
  id: string;
  companyId: string;
  mediaUnitId: string;
  // Campos base
  campaignId?: string;
  proposalId?: string;

  // Campos enriquecidos pelo backend (para evitar múltiplas chamadas no frontend)
  mediaUnitLabel?: string | null;
  mediaUnitType?: UnitType | null;
  mediaPointId?: string | null;
  mediaPointName?: string | null;
  mediaPointType?: MediaType | null;

  mediaUnitPriceDay?: number | null;
  mediaPointBasePriceDay?: number | null;

  clientName?: string | null;
  campaignName?: string | null;
  proposalTitle?: string | null;
  reservedUnitsCount?: number;

  // Datas (a API retorna string ISO, mas vários lugares usam Date)
  startDate: string | Date;
  endDate: string | Date;
  status: ReservationStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
}
export interface BillingInvoice {
  id: string;
  companyId: string;
  clientId: string;
  proposalId?: string;
  campaignId?: string;

  // campos derivados para UI
  clientName?: string | null;
  proposalTitle?: string | null;
  reservedUnitsCount?: number;
  campaignName?: string | null;
  dueDate: Date;
  amount: number; // em reais (compatibilidade)
  amountCents?: number; // em centavos (novo padrão)
  status: BillingStatus;
  paymentMethod?: PaymentMethod;
  gatewayInvoiceId?: string;
  generateNf: boolean;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  client?: Client;
}

export interface CashTransaction {
  id: string;
  companyId: string;
  date: Date;
  description: string;
  partnerName?: string;
  categoryId?: string;
  tags: string[];
  amount: number;
  flowType: CashFlowType;
  paymentType?: PaymentType;
  paymentMethod?: PaymentMethod;
  isPaid: boolean;
  billingInvoiceId?: string;
  mediaPointId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionCategory {
  id: string;
  companyId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformPlan {
  id: string;
  name: string;
  minPoints: number;
  maxPoints?: number;
  monthlyPrice: number;
  isPopular: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformSubscription {
  id: string;
  companyId: string;
  planId: string;
  maxOwnersPerMediaPoint: number; // 1, 2, 3 ou 4 proprietários por ponto
  addonExtraStorage: boolean;
  status: PlatformSubscriptionStatus;
  startAt?: Date;
  endAt?: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  gatewayCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * PlatformInvoice - model platform_invoices do schema
 */
export interface PlatformInvoice {
  id: string;
  subscriptionId: string;
  companyId: string;
  competenceMonth: number;
  competenceYear: number;
  amount: number;
  status: BillingStatus;
  gatewayInvoiceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * PlatformNf - model platform_nf do schema
 */
export interface PlatformNf {
  id: string;
  companyId: string;
  platformInvoiceId: string;
  number: string;
  series: string;
  accessKey: string;
  emittedAt?: Date;
  amount: number;
  xmlUrl: string;
  pdfUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityLog {
  id: string;
  companyId?: string;
  userId?: string;
  resourceType: ActivityResourceType;
  resourceId: string;
  action: string;
  details?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  companyId: string;
  proposalId?: string;
  campaignId?: string;
  direction: MessageDirection;
  channel: MessageChannel;
  senderType: MessageSenderType;
  senderName: string;
  senderContact: string;
  contentText: string;
  createdAt: Date;
  updatedAt: Date;
}
