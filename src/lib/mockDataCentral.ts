/**
 * CENTRAL MOCK DATA - Single Source of Truth
 * 
 * All mock data for the application is defined here.
 * When integrating with API, replace these functions with API calls.
 * 
 * IMPORTANT: This file should be the ONLY place where mock data is created.
 * All components should import from here, never create their own mocks.
 */

import { 
  Company, 
  User, 
  UserRole,
  PlatformPlan,
  PlatformSubscription,
  MediaPoint,
  MediaUnit,
  Client,
  Proposal,
  Campaign,
  BillingInvoice,
  UserStatus,
  UserRoleType,
  PlatformSubscriptionStatus,
  CompanySubscriptionStatus,
  MediaType,
  UnitType,
  ClientStatus,
  ProposalStatus,
  CampaignStatus,
  BillingStatus,
} from '../types';

import { PLATFORM_PLANS } from './plans';

// ============================================================================
// CONSTANTS
// ============================================================================

export const CURRENT_COMPANY_ID = 'company-demo-001';
export const CURRENT_USER_ID = 'user-admin-001';

// ============================================================================
// COMPANY DATA
// ============================================================================

const MOCK_COMPANIES: Record<string, Company> = {
  [CURRENT_COMPANY_ID]: {
    id: CURRENT_COMPANY_ID,
    name: 'Outdoor Mídia Digital',
    cnpj: '12.345.678/0001-90',
    email: 'contato@outdoormidia.com.br',
    phone: '11987654321',
    site: 'https://outdoormidia.com.br',
    logoUrl: undefined,
    primaryColor: '#4F46E5',
    addressZipcode: '01310-100',
    addressStreet: 'Avenida Paulista',
    addressNumber: '1578',
    addressDistrict: 'Bela Vista',
    addressCity: 'São Paulo',
    addressState: 'SP',
    addressCountry: 'Brasil',
    defaultProposalNotes: 'Obrigado pela preferência!',
    notificationPrefs: {},
    integrations: {},
    planId: 'plan-003', // 101-150 pontos plan
    pointsLimit: 150,
    storageLimitMb: 5000,
    usersLimit: 10,
    subscriptionStatus: CompanySubscriptionStatus.TRIAL,
    trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    createdAt: new Date('2024-11-01'),
    updatedAt: new Date(),
  },
};

export function getCurrentCompany(companyId: string = CURRENT_COMPANY_ID): Company {
  return MOCK_COMPANIES[companyId] || MOCK_COMPANIES[CURRENT_COMPANY_ID];
}

export async function updateCompany(
  companyId: string, 
  updates: Partial<Company>
): Promise<Company> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const current = MOCK_COMPANIES[companyId];
  if (!current) throw new Error('Company not found');
  
  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date(),
  };
  
  MOCK_COMPANIES[companyId] = updated;
  return updated;
}

// ============================================================================
// USERS DATA
// ============================================================================

const MOCK_USERS: Record<string, User> = {
  [CURRENT_USER_ID]: {
    id: CURRENT_USER_ID,
    companyId: CURRENT_COMPANY_ID,
    name: 'Ana Silva',
    email: 'ana@outdoormidia.com.br',
    passwordHash: 'hashed_password_here',
    phone: '11999887766',
    isSuperAdmin: false,
    twoFactorEnabled: false,
    twoFactorType: undefined,
    twoFactorSecret: undefined,
    status: UserStatus.ACTIVE,
    lastLoginAt: new Date(),
    lastLoginIp: '192.168.1.1',
    createdAt: new Date('2024-11-01'),
    updatedAt: new Date(),
  },
  'user-admin-002': {
    id: 'user-admin-002',
    companyId: CURRENT_COMPANY_ID,
    name: 'Carlos Souza',
    email: 'carlos@outdoormidia.com.br',
    passwordHash: 'hashed_password_here',
    phone: '11988776655',
    isSuperAdmin: false,
    twoFactorEnabled: true,
    twoFactorType: 'TOTP',
    twoFactorSecret: 'secret_here',
    status: UserStatus.ACTIVE,
    lastLoginAt: new Date(),
    lastLoginIp: '192.168.1.2',
    createdAt: new Date('2024-11-05'),
    updatedAt: new Date(),
  },
};

const MOCK_USER_ROLES: Record<string, UserRole[]> = {
  [CURRENT_USER_ID]: [
    { userId: CURRENT_USER_ID, role: UserRoleType.ADMINISTRATIVO },
    { userId: CURRENT_USER_ID, role: UserRoleType.COMERCIAL },
  ],
  'user-admin-002': [
    { userId: 'user-admin-002', role: UserRoleType.FINANCEIRO },
  ],
};

export function getUserById(userId: string): User | null {
  return MOCK_USERS[userId] || null;
}

export function getUserRoles(userId: string): UserRole[] {
  return MOCK_USER_ROLES[userId] || [];
}

export function getAllUsersForCompany(companyId: string): User[] {
  return Object.values(MOCK_USERS).filter(u => u.companyId === companyId);
}

export async function updateUser(
  userId: string,
  updates: Partial<User>
): Promise<User> {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const current = MOCK_USERS[userId];
  if (!current) throw new Error('User not found');
  
  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date(),
  };
  
  MOCK_USERS[userId] = updated;
  return updated;
}

// ============================================================================
// PLATFORM PLANS & SUBSCRIPTIONS
// ============================================================================

const MOCK_PLATFORM_SUBSCRIPTIONS: Record<string, PlatformSubscription> = {
  [`sub-${CURRENT_COMPANY_ID}`]: {
    id: `sub-${CURRENT_COMPANY_ID}`,
    companyId: CURRENT_COMPANY_ID,
    planId: 'plan-003', // 101-150 pontos
    maxOwnersPerMediaPoint: 2, // Permite até 2 proprietários por ponto
    addonExtraStorage: false,
    status: PlatformSubscriptionStatus.TESTE,
    startAt: new Date('2024-11-01'),
    endAt: undefined,
    currentPeriodStart: new Date('2024-11-01'),
    currentPeriodEnd: new Date('2024-11-16'), // 15 days trial
    gatewayCustomerId: undefined,
    createdAt: new Date('2024-11-01'),
    updatedAt: new Date(),
  },
};

export function getPlatformSubscriptionForCompany(
  companyId: string
): PlatformSubscription | null {
  return MOCK_PLATFORM_SUBSCRIPTIONS[`sub-${companyId}`] || null;
}

export function getPlatformPlanById(planId: string): PlatformPlan | null {
  const planDef = PLATFORM_PLANS.find(p => p.id === planId);
  if (!planDef) return null;
  
  // Convert PlanDefinition to PlatformPlan (Prisma model)
  return {
    id: planDef.id,
    name: planDef.name,
    minPoints: planDef.minPoints,
    maxPoints: planDef.maxPoints,
    monthlyPrice: planDef.monthlyPrice,
    isPopular: planDef.isPopular || false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
}

export async function updatePlatformSubscription(
  subscriptionId: string,
  updates: Partial<PlatformSubscription>
): Promise<PlatformSubscription> {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const current = Object.values(MOCK_PLATFORM_SUBSCRIPTIONS).find(
    s => s.id === subscriptionId
  );
  
  if (!current) throw new Error('Subscription not found');
  
  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date(),
  };
  
  MOCK_PLATFORM_SUBSCRIPTIONS[`sub-${current.companyId}`] = updated;
  return updated;
}

// ============================================================================
// MEDIA POINTS & UNITS
// ============================================================================

const MOCK_MEDIA_POINTS: MediaPoint[] = [
  {
    id: 'point-001',
    companyId: CURRENT_COMPANY_ID,
    type: MediaType.OOH,
    subcategory: 'Outdoor',
    name: 'Outdoor Paulista 1578',
    description: 'Ponto premium na Avenida Paulista',
    addressStreet: 'Avenida Paulista',
    addressNumber: '1578',
    addressDistrict: 'Bela Vista',
    addressCity: 'São Paulo',
    addressState: 'SP',
    addressCountry: 'Brasil',
    latitude: -23.561414,
    longitude: -46.655881,
    dailyImpressions: 50000,
    socialClasses: ['A', 'B'],
    environment: 'Urbano',
    showInMediaKit: true,
    basePriceMonth: 8000,
    basePriceWeek: 2500,
    basePriceDay: 500,
    mainImageUrl: undefined,
    createdAt: new Date('2024-11-01'),
    updatedAt: new Date(),
    units: [],
    owners: [],
  },
  // Add more mock points as needed
];

export function getMediaPointsForCompany(companyId: string): MediaPoint[] {
  return MOCK_MEDIA_POINTS.filter(p => p.companyId === companyId);
}

export function getMediaPointById(pointId: string): MediaPoint | null {
  return MOCK_MEDIA_POINTS.find(p => p.id === pointId) || null;
}

// ============================================================================
// CLIENTS
// ============================================================================

const MOCK_CLIENTS: Client[] = [
  {
    id: 'client-001',
    companyId: CURRENT_COMPANY_ID,
    contactName: 'João Pereira',
    email: 'joao@empresaxyz.com',
    phone: '11988887777',
    companyName: 'Empresa XYZ Ltda',
    cnpj: '98.765.432/0001-10',
    role: 'Diretor de Marketing',
    addressCity: 'São Paulo',
    addressState: 'SP',
    addressCountry: 'Brasil',
    status: ClientStatus.CLIENTE,
    origin: 'Indicação',
    notes: undefined,
    ownerUserId: CURRENT_USER_ID,
    createdAt: new Date('2024-11-05'),
    updatedAt: new Date(),
  },
  // Add more mock clients as needed
];

export function getClientsForCompany(companyId: string): Client[] {
  return MOCK_CLIENTS.filter(c => c.companyId === companyId);
}

// ============================================================================
// PROPOSALS
// ============================================================================

const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 'proposal-001',
    companyId: CURRENT_COMPANY_ID,
    clientId: 'client-001',
    responsibleUserId: CURRENT_USER_ID,
    title: 'Campanha Verão 2024',
    status: ProposalStatus.ENVIADA,
    totalAmount: 25000,
    discountAmount: 0,
    discountPercent: 0,
    conditionsText: 'Pagamento em 3x',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    publicHash: 'abc123def456',
    approvedAt: undefined,
    rejectedAt: undefined,
    createdAt: new Date('2024-11-10'),
    updatedAt: new Date(),
    items: [],
  },
  // Add more mock proposals as needed
];

export function getProposalsForCompany(companyId: string): Proposal[] {
  return MOCK_PROPOSALS.filter(p => p.companyId === companyId);
}

// ============================================================================
// CAMPAIGNS
// ============================================================================

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 'campaign-001',
    companyId: CURRENT_COMPANY_ID,
    proposalId: 'proposal-001',
    clientId: 'client-001',
    name: 'Campanha Verão 2024',
    startDate: new Date('2024-12-01'),
    endDate: new Date('2024-12-31'),
    status: CampaignStatus.ATIVA,
    totalAmountCents: 2500000, // R$ 25.000,00
    approvedAt: new Date('2024-11-15'),
    createdAt: new Date('2024-11-10'),
    updatedAt: new Date(),
    items: [],
  },
  // Add more mock campaigns as needed
];

export function getCampaignsForCompany(companyId: string): Campaign[] {
  return MOCK_CAMPAIGNS.filter(c => c.companyId === companyId);
}

// ============================================================================
// BILLING / INVOICES
// ============================================================================

const MOCK_BILLING_INVOICES: BillingInvoice[] = [
  {
    id: 'invoice-001',
    companyId: CURRENT_COMPANY_ID,
    clientId: 'client-001',
    proposalId: 'proposal-001',
    campaignId: 'campaign-001',
    dueDate: new Date('2024-12-15'),
    amount: 8333.33,
    amountCents: 833333,
    status: BillingStatus.ABERTA,
    paymentMethod: undefined,
    gatewayInvoiceId: undefined,
    generateNf: true,
    paidAt: undefined,
    createdAt: new Date('2024-11-15'),
    updatedAt: new Date(),
  },
  {
    id: 'invoice-002',
    companyId: CURRENT_COMPANY_ID,
    clientId: 'client-001',
    proposalId: 'proposal-001',
    campaignId: 'campaign-001',
    dueDate: new Date('2024-11-20'),
    amount: 8333.33,
    amountCents: 833333,
    status: BillingStatus.PAGA,
    paymentMethod: 'PIX',
    gatewayInvoiceId: undefined,
    generateNf: true,
    paidAt: new Date('2024-11-18'),
    createdAt: new Date('2024-11-15'),
    updatedAt: new Date('2024-11-18'),
  },
  // Add more mock invoices as needed
];

export function getBillingInvoicesForCompany(companyId: string): BillingInvoice[] {
  return MOCK_BILLING_INVOICES.filter(i => i.companyId === companyId);
}

// ============================================================================
// DASHBOARD SUMMARY (computed from mock data)
// ============================================================================

export interface DashboardSummary {
  inventoryCount: number;
  activeProposals: number;
  activeCampaigns: number;
  pendingInvoicesAmount: number;
  pendingInvoicesCount: number;
  recentActivity: string[];
}

export function getDashboardSummary(companyId: string): DashboardSummary {
  const points = getMediaPointsForCompany(companyId);
  const proposals = getProposalsForCompany(companyId);
  const campaigns = getCampaignsForCompany(companyId);
  const invoices = getBillingInvoicesForCompany(companyId);
  
  const activeProposals = proposals.filter(
    p => p.status === ProposalStatus.ENVIADA || p.status === ProposalStatus.APROVADA
  );
  
  const activeCampaigns = campaigns.filter(
    c => c.status === CampaignStatus.ATIVA || c.status === CampaignStatus.EM_VEICULACAO
  );
  
  const pendingInvoices = invoices.filter(
    i => i.status === BillingStatus.ABERTA
  );
  
  const pendingInvoicesAmount = pendingInvoices.reduce(
    (sum, inv) => sum + (inv.amountCents || inv.amount * 100),
    0
  ) / 100;
  
  return {
    inventoryCount: points.length,
    activeProposals: activeProposals.length,
    activeCampaigns: activeCampaigns.length,
    pendingInvoicesAmount,
    pendingInvoicesCount: pendingInvoices.length,
    recentActivity: [
      'Nova campanha criada',
      'Proposta enviada ao cliente',
      'Pagamento recebido',
    ],
  };
}

// ============================================================================
// HELPER: Get days remaining in trial
// ============================================================================

export function getDaysRemainingInTrial(company: Company): number | null {
  if (company.subscriptionStatus !== CompanySubscriptionStatus.TRIAL) {
    return null;
  }
  
  if (!company.trialEndsAt) {
    return null;
  }
  
  const now = new Date();
  const trialEnd = new Date(company.trialEndsAt);
  const diffTime = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}
