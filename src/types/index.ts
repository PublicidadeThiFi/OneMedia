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

// Novo fluxo: faturas podem ser de aluguel recorrente ou custos iniciais (produção/instalação)
export enum BillingInvoiceType {
  RENT = 'RENT',
  UPFRONT = 'UPFRONT',
}

// Novo fluxo (propostas): onde aplicar o desconto do item
export enum ProposalItemDiscountApplyTo {
  RENT = 'RENT',
  COSTS = 'COSTS',
  TOTAL = 'TOTAL',
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
  CAMPANHA = 'CAMPANHA',
  RESERVA = 'RESERVA',
  FINANCEIRO = 'FINANCEIRO',
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

// =====================
// Mídia Map (MVP)
// =====================

export type MediaUnitAvailabilityStatus = 'LIVRE' | 'EM_NEGOCIACAO' | 'OCUPADA';

export interface MediaMapSuggestion {
  id: string;
  name: string;
  type?: 'OOH' | 'DOOH';
  latitude: number;
  longitude: number;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressDistrict?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZipcode?: string | null;
  showInMediaKit?: boolean;
  updatedAt?: string;
  // flags (quando o backend devolver)
  isMine?: boolean;
  isFavorite?: boolean;
  isInCampaign?: boolean;
  isInProposal?: boolean;
}

export interface MediaMapPoint {
  id: string;
  name: string;
  type: 'OOH' | 'DOOH';
  latitude: number;
  longitude: number;
  addressCity?: string | null;
  addressState?: string | null;
  addressDistrict?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  facesTotal: number;
  facesFreeCount: number;
  facesNegotiationCount: number;
  facesOccupiedCount: number;
  // flags (Etapa 3)
  isMine?: boolean;
  isFavorite?: boolean;
  isInCampaign?: boolean;
  isInProposal?: boolean;
  updatedAt: string;
}

export interface MediaMapFace {
  id: string;
  label: string;
  unitType: UnitType;
  imageUrl?: string | null;
  isActive: boolean;
  status: MediaUnitAvailabilityStatus;
}

export interface MediaMapDetails {
  point: MediaPoint & {
    isMine?: boolean;
    isFavorite?: boolean;
    isInCampaign?: boolean;
    isInProposal?: boolean;
  };
  faces: MediaMapFace[];
  facesTotal: number;
  facesFreeCount: number;
  facesNegotiationCount: number;
  facesOccupiedCount: number;
  statusAsOf: Date;
}


export interface OwnerCompany {
  id: string;
  companyId: string;
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  site?: string | null;
  logoUrl?: string | null;
  addressZipcode?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressDistrict?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressCountry?: string | null;
  defaultProposalNotes?: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaPointOwner {
  id: string;
  companyId: string;
  mediaPointId: string;
  ownerCompanyId?: string | null;
  ownerCompany?: OwnerCompany | null;
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

  /** Contagem de propostas do cliente (calculado no backend) */
  proposalsCount?: number;

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

  /** Link direto (quando o backend fornece) */
  url?: string;
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
  // campos auxiliares (podem vir de includes/joins no backend)
  clientName?: string | null;
  responsibleUserName?: string | null;
  responsibleUser?: User;
  itemsCount?: number;
  startDate?: Date;
  // Legacy: propostas antigas podem ter endDate; novo fluxo nao depende disso
  endDate?: Date;

  // Novo fluxo: prazo maximo (dias) para realizar check-in apos aprovacao
  assemblyMaxDays?: number;

  client?: Client;
  items?: ProposalItem[];
}

export interface ProposalItem {
  id: string;
  companyId: string;
  proposalId: string;
  mediaUnitId?: string;
  productId?: string;
  mediaPointOwnerId?: string | null;
  description: string;
  startDate?: Date;
  endDate?: Date;
  // Novo fluxo (midia): tempo de ocupacao total (multiplo de 15)
  occupationDays?: number;
  // Novo fluxo (midia): se o cliente fornecera a lona
  clientProvidesBanner?: boolean;

  // Snapshots (para auditoria e consistencia)
  priceMonthSnapshot?: number;
  priceBiweeklySnapshot?: number;
  productionCostSnapshot?: number;
  installationCostSnapshot?: number;
  rentTotalSnapshot?: number;
  upfrontTotalSnapshot?: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discountAmount?: number;
  discountPercent?: number;
  /** Base do desconto do item (aluguel, custos ou total). Default: TOTAL */
  discountApplyTo?: ProposalItemDiscountApplyTo;
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
  /** Data/hora real do check-in (quando a instalação foi concluída) */
  checkInAt?: Date | null;
  /** Prazo limite para concluir check-in (approvedAt + assemblyMaxDays) */
  checkInDeadlineAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  client?: Partial<Client> | null;
  clientName?: string | null;
  proposalTitle?: string | null;
  reservedUnitsCount?: number;
  campaignItemsCount?: number;
  reservationsCount?: number;
  proposal?: Partial<Proposal> | null;
  items?: CampaignItem[];
}

/** Foto obrigatória por unidade/face no check-in */
export interface CampaignCheckInPhoto {
  id: string;
  companyId: string;
  campaignId: string;
  mediaUnitId: string;
  photoUrl: string;
  createdAt: string | Date;
  updatedAt: string | Date;
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

  /** Dados de origem (novo fluxo / auditoria) */
  proposalItemId?: string | null;
  mediaPointOwnerId?: string | null;
  responsibleCompanyName?: string | null;
  responsibleOwnerName?: string | null;
  rentAmount?: number | null;
  occupationDays?: number | null;
  rentTotalSnapshot?: number | null;
  upfrontTotalSnapshot?: number | null;

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

  /** Tipo da cobrança (aluguel recorrente ou custos iniciais) */
  type?: BillingInvoiceType;
  /** Período que está sendo pago (quando aplicável) */
  periodStart?: Date;
  periodEnd?: Date;
  /** Sequência do ciclo (1, 2, 3...) */
  sequence?: number;
  /** Cancelamento lógico (quando backend materializa inadimplência/cancelamento) */
  cancelledAt?: Date | null;
  /** Regra de 30 dias antes do vencimento: requer confirmação do cliente (MVP) */
  requiresConfirmation?: boolean;

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

export interface BillingInvoiceForecastItem {
  id: string;
  isForecast: true;
  type?: BillingInvoiceType | null;
  sequence?: number | null;
  dueDate: Date | string;
  amount: number;
  periodStart?: Date | string | null;
  periodEnd?: Date | string | null;
  requiresConfirmation?: boolean;
}

export interface CashTransaction {
  id: string;
  /** Para transações recorrentes geradas no backend (instâncias virtuais), aponta para o ID da série/base */
  seriesId?: string;
  companyId: string;
  date: Date;
  description: string;
  partnerName?: string;
  categoryId?: string;
  categoryName?: string | null;
  tags: string[];
  /** Vencimento (YYYY-MM-DD) - opcional */
  dueDate?: string | null;
  /**
   * Vínculo de múltiplos pontos de mídia (apenas para criação via formulário).
   * O backend cria 1 transação por item deste array.
   */
  mediaPoints?: Array<{ mediaPointId: string; dueDate?: string }>;
  amount: number;
  flowType: CashFlowType;
  paymentType?: PaymentType;
  paymentMethod?: PaymentMethod;
  isPaid: boolean;
  billingInvoiceId?: string;
  mediaPointId?: string;
  mediaPointName?: string | null;
  /** Recorrência mensal */
  isRecurring?: boolean;
  /** Data final da recorrência (YYYY-MM-DD) */
  recurringUntil?: string | null;
  /** Indica se esta linha é uma instância recorrente “virtual” (não existe como registro separado no DB) */
  isRecurringInstance?: boolean;
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
  minPoints?: number | null;
  maxPoints?: number | null;
  monthlyPrice: number;
  isPopular?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
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
  plan?: PlatformPlan | null;
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
  userName?: string | null;
  userEmail?: string | null;
  resourceType: ActivityResourceType;
  resourceId: string;
  resourceName?: string | null;
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
