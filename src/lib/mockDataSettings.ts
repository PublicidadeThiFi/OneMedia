import {
  Company,
  User,
  UserRole,
  UserStatus,
  UserRoleType,
  TwoFactorType,
  CompanySubscriptionStatus,
  PlatformPlan,
  PlatformSubscription,
  PlatformSubscriptionStatus,
} from '../types';

// ========================================
// CONSTANTES
// ========================================

export const CURRENT_COMPANY_ID = 'c1';
export const CURRENT_USER_ID = 'u1';

// ========================================
// MOCK - Company
// ========================================

export const mockCurrentCompany: Company = {
  id: CURRENT_COMPANY_ID,
  name: 'OOH Mídia SP',
  cnpj: '12.345.678/0001-90',
  email: 'contato@oohmidiasp.com',
  phone: '(11) 3000-0000',
  site: 'https://www.oohmidiasp.com',
  logoUrl: null,
  primaryColor: '#4f46e5',
  addressZipcode: '01310-100',
  addressStreet: 'Av. Paulista',
  addressNumber: '1000',
  addressDistrict: 'Bela Vista',
  addressCity: 'São Paulo',
  addressState: 'SP',
  addressCountry: 'Brasil',
  defaultProposalNotes: 'Valores sujeitos a alteração sem aviso prévio. Validade da proposta: 15 dias.',
  notificationPrefs: {
    emailOnNewProposal: true,
    emailOnProposalApproved: true,
    emailOnPaymentReceived: true,
  },
  integrations: {
    whatsapp: { enabled: false },
    nfe: { enabled: false },
  },
  planId: null,
  pointsLimit: 50, // Limite do trial
  storageLimitMb: 1000,
  usersLimit: 3,
  subscriptionStatus: CompanySubscriptionStatus.TRIAL,
  trialEndsAt: new Date(2024, 3, 15), // 15 abril 2024 (15 dias a partir de hoje hipotético)
  createdAt: new Date(2024, 2, 1, 8, 0, 0),
  updatedAt: new Date(2024, 2, 1, 8, 0, 0),
};

// ========================================
// MOCK - Users
// ========================================

export const mockUsers: User[] = [
  // User with 2FA enabled (TOTP)
  {
    id: 'u1',
    companyId: CURRENT_COMPANY_ID,
    name: 'Carlos Mendes',
    email: 'carlos.mendes@outdoorbrasil.com.br',
    passwordHash: 'hashed_password_123', // Mock: actual password is 'senha123'
    phone: '11987654321', // 11 digits - stored without formatting
    isSuperAdmin: false,
    twoFactorEnabled: true,
    twoFactorType: TwoFactorType.TOTP,
    twoFactorSecret: 'secret_totp_u1',
    status: UserStatus.ACTIVE,
    lastLoginAt: new Date(2024, 2, 15, 14, 30, 0),
    lastLoginIp: '192.168.1.100',
    createdAt: new Date(2024, 2, 1, 8, 0, 0),
    updatedAt: new Date(2024, 2, 15, 14, 30, 0),
  },
  // User without 2FA (active)
  {
    id: 'u2',
    companyId: CURRENT_COMPANY_ID,
    name: 'Ana Silva',
    email: 'ana.silva@outdoorbrasil.com.br',
    passwordHash: 'hashed_password_456', // Mock: actual password is 'senha123'
    phone: '11999998888', // 11 digits - stored without formatting
    isSuperAdmin: false,
    twoFactorEnabled: false,
    twoFactorType: null,
    twoFactorSecret: null,
    status: UserStatus.ACTIVE,
    lastLoginAt: new Date(2024, 2, 14, 10, 0, 0),
    lastLoginIp: '192.168.1.101',
    createdAt: new Date(2024, 2, 5, 10, 0, 0),
    updatedAt: new Date(2024, 2, 14, 10, 0, 0),
  },
  // User without 2FA (active)
  {
    id: 'u3',
    companyId: CURRENT_COMPANY_ID,
    name: 'Roberto Lima',
    email: 'roberto.lima@outdoorbrasil.com.br',
    passwordHash: 'hashed_password_789', // Mock: actual password is 'senha123'
    phone: '11977776666', // 11 digits - stored without formatting
    isSuperAdmin: false,
    twoFactorEnabled: false,
    twoFactorType: null,
    twoFactorSecret: null,
    status: UserStatus.ACTIVE,
    lastLoginAt: new Date(2024, 2, 12, 16, 20, 0),
    lastLoginIp: '192.168.1.102',
    createdAt: new Date(2024, 2, 10, 11, 30, 0),
    updatedAt: new Date(2024, 2, 12, 16, 20, 0),
  },
  // Inactive user (invited but not yet activated)
  {
    id: 'u4',
    companyId: CURRENT_COMPANY_ID,
    name: 'Maria Santos',
    email: 'maria.santos@outdoorbrasil.com.br',
    passwordHash: 'hashed_password_000', // Mock: actual password is 'senha123'
    phone: null,
    isSuperAdmin: false,
    twoFactorEnabled: false,
    twoFactorType: null,
    twoFactorSecret: null,
    status: UserStatus.INACTIVE, // User invited but hasn't completed signup
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: new Date(2024, 2, 12, 9, 0, 0),
    updatedAt: new Date(2024, 2, 12, 9, 0, 0),
  },
];

// ========================================
// MOCK - UserRoles
// ========================================

export const mockUserRoles: UserRole[] = [
  // u1 - Carlos (ADMINISTRATIVO + COMERCIAL)
  { userId: 'u1', role: UserRoleType.ADMINISTRATIVO },
  { userId: 'u1', role: UserRoleType.COMERCIAL },
  
  // u2 - Ana (COMERCIAL)
  { userId: 'u2', role: UserRoleType.COMERCIAL },
  
  // u3 - Roberto (FINANCEIRO)
  { userId: 'u3', role: UserRoleType.FINANCEIRO },
  
  // u4 - Mariana (TI) - ainda não ativada
  { userId: 'u4', role: UserRoleType.TI },
];

// ========================================
// MOCK - PlatformPlans
// Alinhado com doc v2 seção 3.1 - Planos por Volume de Pontos
// monthlyPrice em centavos (29900 = R$ 299,00)
// ========================================

export const mockPlatformPlans: PlatformPlan[] = [
  {
    id: 'plan-001',
    name: 'Até 50 pontos',
    minPoints: 0,
    maxPoints: 50,
    monthlyPrice: 29900, // R$ 299,00
    isPopular: false,
    createdAt: new Date(2024, 0, 1, 0, 0, 0),
    updatedAt: new Date(2024, 0, 1, 0, 0, 0),
  },
  {
    id: 'plan-002',
    name: '50 a 100 pontos',
    minPoints: 50,
    maxPoints: 100,
    monthlyPrice: 39900, // R$ 399,00
    isPopular: false,
    createdAt: new Date(2024, 0, 1, 0, 0, 0),
    updatedAt: new Date(2024, 0, 1, 0, 0, 0),
  },
  {
    id: 'plan-003',
    name: '101 a 150 pontos',
    minPoints: 101,
    maxPoints: 150,
    monthlyPrice: 49900, // R$ 499,00
    isPopular: true, // Plano mais popular
    createdAt: new Date(2024, 0, 1, 0, 0, 0),
    updatedAt: new Date(2024, 0, 1, 0, 0, 0),
  },
  {
    id: 'plan-004',
    name: '151 a 200 pontos',
    minPoints: 151,
    maxPoints: 200,
    monthlyPrice: 59900, // R$ 599,00
    isPopular: false,
    createdAt: new Date(2024, 0, 1, 0, 0, 0),
    updatedAt: new Date(2024, 0, 1, 0, 0, 0),
  },
  {
    id: 'plan-005',
    name: '201 a 250 pontos',
    minPoints: 201,
    maxPoints: 250,
    monthlyPrice: 69900, // R$ 699,00
    isPopular: false,
    createdAt: new Date(2024, 0, 1, 0, 0, 0),
    updatedAt: new Date(2024, 0, 1, 0, 0, 0),
  },
  {
    id: 'plan-006',
    name: '251 a 300 pontos',
    minPoints: 251,
    maxPoints: 300,
    monthlyPrice: 79900, // R$ 799,00
    isPopular: false,
    createdAt: new Date(2024, 0, 1, 0, 0, 0),
    updatedAt: new Date(2024, 0, 1, 0, 0, 0),
  },
  {
    id: 'plan-007',
    name: '301 a 350 pontos',
    minPoints: 301,
    maxPoints: 350,
    monthlyPrice: 89900, // R$ 899,00
    isPopular: false,
    createdAt: new Date(2024, 0, 1, 0, 0, 0),
    updatedAt: new Date(2024, 0, 1, 0, 0, 0),
  },
  {
    id: 'plan-008',
    name: '351 a 400 pontos',
    minPoints: 351,
    maxPoints: 400,
    monthlyPrice: 99900, // R$ 999,00
    isPopular: false,
    createdAt: new Date(2024, 0, 1, 0, 0, 0),
    updatedAt: new Date(2024, 0, 1, 0, 0, 0),
  },
  {
    id: 'plan-009',
    name: 'Mais de 400 pontos',
    minPoints: 401,
    maxPoints: null, // Ilimitado
    monthlyPrice: 0, // Sob consulta
    isPopular: false,
    createdAt: new Date(2024, 0, 1, 0, 0, 0),
    updatedAt: new Date(2024, 0, 1, 0, 0, 0),
  },
];

// ========================================
// MOCK - PlatformSubscription
// ========================================

export const mockPlatformSubscription: PlatformSubscription = {
  id: 'sub-c1',
  companyId: CURRENT_COMPANY_ID,
  planId: null, // Ainda em trial, sem plano pago
  maxOwnersPerMediaPoint: 1, // Valor padrão: 1 proprietário por ponto
  addonExtraStorage: false,
  status: PlatformSubscriptionStatus.TESTE,
  startAt: new Date(2024, 2, 1, 8, 0, 0), // Início do trial
  endAt: null,
  currentPeriodStart: new Date(2024, 2, 1, 8, 0, 0),
  currentPeriodEnd: new Date(2024, 3, 15, 23, 59, 59), // Fim do trial
  gatewayCustomerId: null,
  createdAt: new Date(2024, 2, 1, 8, 0, 0),
  updatedAt: new Date(2024, 2, 1, 8, 0, 0),
};

// ========================================
// Helper Types
// ========================================

export interface CompanyUserWithRoles {
  user: User;
  roles: UserRoleType[];
}

// ========================================
// Helper Functions
// ========================================

/**
 * Retorna a empresa atual
 */
export function getCurrentCompany(): Company {
  return { ...mockCurrentCompany };
}

/**
 * Retorna o usuário logado atual
 */
export function getCurrentUser(): User {
  const user = mockUsers.find(u => u.id === CURRENT_USER_ID);
  if (!user) throw new Error('Current user not found');
  return { ...user };
}

/**
 * Retorna as roles do usuário logado
 */
export function getCurrentUserRoles(): UserRoleType[] {
  return mockUserRoles
    .filter(ur => ur.userId === CURRENT_USER_ID)
    .map(ur => ur.role);
}

/**
 * Retorna o usuário atual com suas roles
 */
export function getCurrentUserWithRoles(): CompanyUserWithRoles {
  const user = getCurrentUser();
  const roles = getCurrentUserRoles();
  return { user, roles };
}

/**
 * Retorna todos os usuários da empresa com suas roles
 */
export function getCompanyUsersWithRoles(companyId: string): CompanyUserWithRoles[] {
  const companyUsers = mockUsers.filter(u => u.companyId === companyId);
  
  return companyUsers.map(user => {
    const roles = mockUserRoles
      .filter(ur => ur.userId === user.id)
      .map(ur => ur.role);
    
    return { user, roles };
  });
}

/**
 * Retorna a assinatura da plataforma da empresa
 */
export function getPlatformSubscriptionForCompany(companyId: string): PlatformSubscription {
  // Na prática, filtraria por companyId
  if (companyId !== CURRENT_COMPANY_ID) {
    throw new Error('Subscription not found for company');
  }
  return { ...mockPlatformSubscription };
}

/**
 * Retorna todos os planos disponíveis
 */
export function getPlatformPlans(): PlatformPlan[] {
  return [...mockPlatformPlans];
}

/**
 * Retorna um plano específico por ID
 */
export function getPlatformPlanById(planId: string): PlatformPlan | undefined {
  return mockPlatformPlans.find(p => p.id === planId);
}

/**
 * Retorna um usuário por ID
 */
export function getUserById(userId: string): User | undefined {
  return mockUsers.find(u => u.id === userId);
}

/**
 * Retorna roles de um usuário específico
 */
export function getUserRoles(userId: string): UserRoleType[] {
  return mockUserRoles
    .filter(ur => ur.userId === userId)
    .map(ur => ur.role);
}

/**
 * Calcula dias restantes de trial
 */
export function getDaysRemainingInTrial(company: Company): number | null {
  if (company.subscriptionStatus !== CompanySubscriptionStatus.TRIAL || !company.trialEndsAt) {
    return null;
  }
  
  const now = new Date();
  const trialEnd = new Date(company.trialEndsAt);
  const diffTime = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Retorna label amigável para status de assinatura
 */
export function getSubscriptionStatusLabel(status: CompanySubscriptionStatus | PlatformSubscriptionStatus): string {
  switch (status) {
    case CompanySubscriptionStatus.TRIAL:
    case PlatformSubscriptionStatus.TESTE:
      return 'Teste Gratuito';
    case CompanySubscriptionStatus.ACTIVE:
    case PlatformSubscriptionStatus.ATIVA:
      return 'Assinatura Ativa';
    case CompanySubscriptionStatus.PAST_DUE:
    case PlatformSubscriptionStatus.EM_ATRASO:
      return 'Em Atraso';
    case CompanySubscriptionStatus.CANCELED:
    case PlatformSubscriptionStatus.CANCELADA:
      return 'Cancelada';
    default:
      return 'Desconhecido';
  }
}

/**
 * Sugere o plano ideal com base no número de pontos cadastrados
 */
export function getSuggestedPlanForPoints(pointsCount: number): PlatformPlan | null {
  // Ordena os planos do menor para o maior
  const sortedPlans = [...mockPlatformPlans].sort((a, b) => a.minPoints - b.minPoints);
  
  // Encontra o primeiro plano que suporta esse número de pontos
  for (const plan of sortedPlans) {
    if (plan.maxPoints === null) {
      // Plano ilimitado (mais de 400 pontos)
      if (pointsCount >= plan.minPoints) {
        return plan;
      }
    } else {
      // Plano com limite definido
      if (pointsCount >= plan.minPoints && pointsCount <= plan.maxPoints) {
        return plan;
      }
    }
  }
  
  return null;
}