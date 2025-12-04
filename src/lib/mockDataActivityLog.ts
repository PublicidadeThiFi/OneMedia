import { ActivityLog, ActivityResourceType } from '../types';
import {
  mockClients,
  mockProposals,
  mockMediaPoints,
  mockUsers,
  mockCampaigns,
  CURRENT_COMPANY_ID,
  getClientById,
  getUserById,
  getProposalById,
} from './mockData';

// ========================================
// Mock data para ActivityLog
// ========================================

export const mockActivityLogs: ActivityLog[] = [
  // ============ CLIENTE ============
  {
    id: 'act1',
    companyId: CURRENT_COMPANY_ID,
    userId: 'u1',
    resourceType: ActivityResourceType.CLIENTE,
    resourceId: 'cl1',
    action: 'Cliente criado',
    details: {
      contactName: 'João Silva',
      companyName: 'Tech Solutions Ltda',
      status: 'CLIENTE',
      origin: 'Indicação',
    },
    createdAt: new Date(2024, 0, 15, 14, 30, 0), // 15 jan 2024, 14:30:00
    updatedAt: new Date(2024, 0, 15, 14, 30, 0),
  },
  {
    id: 'act2',
    companyId: CURRENT_COMPANY_ID,
    userId: 'u2',
    resourceType: ActivityResourceType.CLIENTE,
    resourceId: 'cl2',
    action: 'Cliente criado',
    details: {
      contactName: 'Maria Santos',
      companyName: 'Marketing Pro',
      status: 'PROSPECT',
      origin: 'Website',
    },
    createdAt: new Date(2024, 1, 10, 11, 20, 0), // 10 fev 2024, 11:20:00
    updatedAt: new Date(2024, 1, 10, 11, 20, 0),
  },
  {
    id: 'act3',
    companyId: CURRENT_COMPANY_ID,
    userId: 'u1',
    resourceType: ActivityResourceType.CLIENTE,
    resourceId: 'cl1',
    action: 'Cliente atualizado',
    details: {
      field: 'status',
      oldValue: 'PROSPECT',
      newValue: 'CLIENTE',
    },
    createdAt: new Date(2024, 2, 10, 9, 15, 0), // 10 mar 2024, 09:15:00
    updatedAt: new Date(2024, 2, 10, 9, 15, 0),
  },

  // ============ PROPOSTA ============
  {
    id: 'act4',
    companyId: CURRENT_COMPANY_ID,
    userId: 'u1',
    resourceType: ActivityResourceType.PROPOSTA,
    resourceId: 'pr1',
    action: 'Proposta criada',
    details: {
      title: 'Campanha OOH Av. Paulista - Q1 2024',
      status: 'RASCUNHO',
      totalAmount: 25500,
      clientId: 'cl1',
    },
    createdAt: new Date(2024, 0, 15, 15, 45, 0), // 15 jan 2024, 15:45:00
    updatedAt: new Date(2024, 0, 15, 15, 45, 0),
  },
  {
    id: 'act5',
    companyId: CURRENT_COMPANY_ID,
    userId: 'u1',
    resourceType: ActivityResourceType.PROPOSTA,
    resourceId: 'pr1',
    action: 'Proposta enviada',
    details: {
      status: 'ENVIADA',
      sentTo: 'joao@techsolutions.com',
      sentAt: new Date(2024, 0, 16, 10, 0, 0),
    },
    createdAt: new Date(2024, 0, 16, 10, 0, 0), // 16 jan 2024, 10:00:00
    updatedAt: new Date(2024, 0, 16, 10, 0, 0),
  },
  {
    id: 'act6',
    companyId: CURRENT_COMPANY_ID,
    userId: null,
    resourceType: ActivityResourceType.PROPOSTA,
    resourceId: 'pr1',
    action: 'Proposta aprovada via link público',
    details: {
      approvedBy: 'Cliente',
      publicHash: 'abc123xyz',
      approvedAt: new Date(2024, 0, 20, 14, 30, 0),
    },
    createdAt: new Date(2024, 0, 20, 14, 30, 0), // 20 jan 2024, 14:30:00
    updatedAt: new Date(2024, 0, 20, 14, 30, 0),
  },
  {
    id: 'act7',
    companyId: CURRENT_COMPANY_ID,
    userId: 'u2',
    resourceType: ActivityResourceType.PROPOSTA,
    resourceId: 'pr4',
    action: 'Proposta criada',
    details: {
      title: 'Campanha Verão Fashion Brands',
      status: 'RASCUNHO',
      totalAmount: 45000,
      clientId: 'cl4',
    },
    createdAt: new Date(2024, 1, 10, 16, 20, 0), // 10 fev 2024, 16:20:00
    updatedAt: new Date(2024, 1, 10, 16, 20, 0),
  },
  {
    id: 'act8',
    companyId: CURRENT_COMPANY_ID,
    userId: 'u2',
    resourceType: ActivityResourceType.PROPOSTA,
    resourceId: 'pr4',
    action: 'Proposta aprovada',
    details: {
      status: 'APROVADA',
      approvedAt: new Date(2024, 1, 20, 11, 0, 0),
      discountPercent: 10,
      discountAmount: 4500,
    },
    createdAt: new Date(2024, 1, 20, 11, 0, 0), // 20 fev 2024, 11:00:00
    updatedAt: new Date(2024, 1, 20, 11, 0, 0),
  },

  // ============ MIDIA ============
  {
    id: 'act9',
    companyId: CURRENT_COMPANY_ID,
    userId: 'u1',
    resourceType: ActivityResourceType.MIDIA,
    resourceId: 'mp1',
    action: 'Mídia criada',
    details: {
      name: 'Outdoor Av. Paulista 1000',
      type: 'OOH',
      subcategory: 'OUTDOOR',
      city: 'São Paulo',
      state: 'SP',
    },
    createdAt: new Date(2024, 0, 15, 9, 0, 0), // 15 jan 2024, 09:00:00
    updatedAt: new Date(2024, 0, 15, 9, 0, 0),
  },
  {
    id: 'act10',
    companyId: CURRENT_COMPANY_ID,
    userId: 'u1',
    resourceType: ActivityResourceType.MIDIA,
    resourceId: 'mp1',
    action: 'Mídia atualizada',
    details: {
      field: 'basePriceMonth',
      oldValue: 8000,
      newValue: 8500,
    },
    createdAt: new Date(2024, 2, 13, 16, 45, 0), // 13 mar 2024, 16:45:00
    updatedAt: new Date(2024, 2, 13, 16, 45, 0),
  },
  {
    id: 'act11',
    companyId: CURRENT_COMPANY_ID,
    userId: 'u1',
    resourceType: ActivityResourceType.MIDIA,
    resourceId: 'mp2',
    action: 'Mídia criada',
    details: {
      name: 'Painel Digital Shopping Iguatemi',
      type: 'DOOH',
      subcategory: 'PAINEL_LED',
      city: 'São Paulo',
      state: 'SP',
    },
    createdAt: new Date(2024, 0, 20, 10, 30, 0), // 20 jan 2024, 10:30:00
    updatedAt: new Date(2024, 0, 20, 10, 30, 0),
  },
  {
    id: 'act12',
    companyId: CURRENT_COMPANY_ID,
    userId: 'u1',
    resourceType: ActivityResourceType.MIDIA,
    resourceId: 'import-batch-001',
    action: 'Importação em massa de pontos',
    details: {
      totalPoints: 25,
      successCount: 25,
      errorCount: 0,
      fileName: 'pontos-midia-sp.xlsx',
    },
    createdAt: new Date(2024, 2, 10, 13, 0, 0), // 10 mar 2024, 13:00:00
    updatedAt: new Date(2024, 2, 10, 13, 0, 0),
  },
  {
    id: 'act13',
    companyId: CURRENT_COMPANY_ID,
    userId: 'u2',
    resourceType: ActivityResourceType.MIDIA,
    resourceId: 'mp3',
    action: 'Mídia atualizada',
    details: {
      field: 'showInMediaKit',
      oldValue: false,
      newValue: true,
    },
    createdAt: new Date(2024, 2, 15, 14, 20, 0), // 15 mar 2024, 14:20:00
    updatedAt: new Date(2024, 2, 15, 14, 20, 0),
  },

  // ============ USUARIO ============
  {
    id: 'act14',
    companyId: CURRENT_COMPANY_ID,
    userId: 'u1',
    resourceType: ActivityResourceType.USUARIO,
    resourceId: 'u2',
    action: 'Usuário criado',
    details: {
      name: 'Ana Paula Silva',
      email: 'ana@empresa.com',
      status: 'ACTIVE',
      isSuperAdmin: false,
    },
    createdAt: new Date(2024, 0, 5, 10, 0, 0), // 5 jan 2024, 10:00:00
    updatedAt: new Date(2024, 0, 5, 10, 0, 0),
  },
  {
    id: 'act15',
    companyId: CURRENT_COMPANY_ID,
    userId: 'u1',
    resourceType: ActivityResourceType.USUARIO,
    resourceId: 'u3',
    action: 'Usuário criado',
    details: {
      name: 'Roberto Costa',
      email: 'roberto@empresa.com',
      status: 'ACTIVE',
    },
    createdAt: new Date(2024, 0, 10, 11, 30, 0), // 10 jan 2024, 11:30:00
    updatedAt: new Date(2024, 0, 10, 11, 30, 0),
  },
  {
    id: 'act16',
    companyId: CURRENT_COMPANY_ID,
    userId: 'u1',
    resourceType: ActivityResourceType.USUARIO,
    resourceId: 'u2',
    action: 'Usuário atualizado',
    details: {
      field: 'twoFactorEnabled',
      oldValue: false,
      newValue: true,
      twoFactorType: 'TOTP',
    },
    createdAt: new Date(2024, 2, 5, 9, 45, 0), // 5 mar 2024, 09:45:00
    updatedAt: new Date(2024, 2, 5, 9, 45, 0),
  },

  // ============ ASSINATURA ============
  {
    id: 'act17',
    companyId: CURRENT_COMPANY_ID,
    userId: null, // Sistema
    resourceType: ActivityResourceType.ASSINATURA,
    resourceId: 'sub-c1',
    action: 'Assinatura criada',
    details: {
      companyName: 'OOH Mídia SP',
      planName: 'Básico',
      status: 'TRIAL',
      trialEndsAt: new Date(2024, 0, 28),
    },
    createdAt: new Date(2024, 0, 1, 8, 0, 0), // 1 jan 2024, 08:00:00
    updatedAt: new Date(2024, 0, 1, 8, 0, 0),
  },
  {
    id: 'act18',
    companyId: CURRENT_COMPANY_ID,
    userId: null, // Sistema
    resourceType: ActivityResourceType.ASSINATURA,
    resourceId: 'sub-c1',
    action: 'Plano alterado',
    details: {
      oldPlan: 'Básico',
      newPlan: 'Profissional',
      oldStatus: 'TRIAL',
      newStatus: 'ACTIVE',
      activatedAt: new Date(2024, 0, 25, 10, 0, 0),
    },
    createdAt: new Date(2024, 0, 25, 10, 0, 0), // 25 jan 2024, 10:00:00
    updatedAt: new Date(2024, 0, 25, 10, 0, 0),
  },
  {
    id: 'act19',
    companyId: CURRENT_COMPANY_ID,
    userId: null, // Sistema
    resourceType: ActivityResourceType.ASSINATURA,
    resourceId: 'sub-c1',
    action: 'Pagamento recebido',
    details: {
      planName: 'Profissional',
      amount: 299.90,
      paymentMethod: 'PIX',
      paidAt: new Date(2024, 1, 15, 14, 22, 0),
      nextBillingDate: new Date(2024, 2, 15),
    },
    createdAt: new Date(2024, 1, 15, 14, 22, 0), // 15 fev 2024, 14:22:00
    updatedAt: new Date(2024, 1, 15, 14, 22, 0),
  },

  // ============ NF (Nota Fiscal) ============
  {
    id: 'act20',
    companyId: CURRENT_COMPANY_ID,
    userId: null, // Sistema
    resourceType: ActivityResourceType.NF,
    resourceId: 'nf-001',
    action: 'NF emitida (Plataforma)',
    details: {
      nfNumber: '001',
      nfSerie: '1',
      issuedTo: 'OOH Mídia SP LTDA',
      cnpj: '12.345.678/0001-90',
      amount: 299.90,
      description: 'Assinatura Plano Profissional - Fev/2024',
      issuedAt: new Date(2024, 1, 15, 15, 0, 0),
    },
    createdAt: new Date(2024, 1, 15, 15, 0, 0), // 15 fev 2024, 15:00:00
    updatedAt: new Date(2024, 1, 15, 15, 0, 0),
  },
  {
    id: 'act21',
    companyId: CURRENT_COMPANY_ID,
    userId: 'u1',
    resourceType: ActivityResourceType.NF,
    resourceId: 'nf-client-001',
    action: 'NF emitida (Cliente)',
    details: {
      nfNumber: '1001',
      nfSerie: 'A',
      issuedTo: 'Tech Solutions Ltda',
      cnpj: '12.345.678/0001-90',
      amount: 25500,
      campaignId: 'camp1',
      proposalId: 'pr1',
      issuedAt: new Date(2024, 1, 10, 10, 30, 0),
    },
    createdAt: new Date(2024, 1, 10, 10, 30, 0), // 10 fev 2024, 10:30:00
    updatedAt: new Date(2024, 1, 10, 10, 30, 0),
  },
  {
    id: 'act22',
    companyId: CURRENT_COMPANY_ID,
    userId: null, // Sistema
    resourceType: ActivityResourceType.NF,
    resourceId: 'nf-client-001',
    action: 'Falha ao enviar NF por email',
    details: {
      nfNumber: '1001',
      recipient: 'joao@techsolutions.com',
      error: 'SMTP timeout',
      retryScheduled: true,
    },
    createdAt: new Date(2024, 1, 10, 10, 35, 0), // 10 fev 2024, 10:35:00
    updatedAt: new Date(2024, 1, 10, 10, 35, 0),
  },

  // ============ INTEGRACAO ============
  {
    id: 'act23',
    companyId: CURRENT_COMPANY_ID,
    userId: null, // Sistema
    resourceType: ActivityResourceType.INTEGRACAO,
    resourceId: 'integration-stripe-001',
    action: 'Falha na integração de pagamento',
    details: {
      service: 'Stripe',
      operation: 'charge.create',
      error: 'card_declined',
      errorMessage: 'Your card was declined',
      customerId: 'cl1',
      amount: 25500,
    },
    createdAt: new Date(2024, 2, 8, 16, 20, 0), // 8 mar 2024, 16:20:00
    updatedAt: new Date(2024, 2, 8, 16, 20, 0),
  },
  {
    id: 'act24',
    companyId: CURRENT_COMPANY_ID,
    userId: null, // Sistema
    resourceType: ActivityResourceType.INTEGRACAO,
    resourceId: 'integration-whatsapp-001',
    action: 'Falha no envio WhatsApp',
    details: {
      service: 'WhatsApp API',
      operation: 'send_message',
      recipient: '+5511999999999',
      error: 'rate_limit_exceeded',
      errorMessage: 'Too many messages sent in short period',
      messageTemplate: 'proposal_approved',
    },
    createdAt: new Date(2024, 2, 12, 9, 15, 0), // 12 mar 2024, 09:15:00
    updatedAt: new Date(2024, 2, 12, 9, 15, 0),
  },
  {
    id: 'act25',
    companyId: CURRENT_COMPANY_ID,
    userId: null, // Sistema
    resourceType: ActivityResourceType.INTEGRACAO,
    resourceId: 'integration-nf-001',
    action: 'Falha na emissão automática de NF',
    details: {
      service: 'NFe.io',
      operation: 'issue_invoice',
      error: 'invalid_cnpj',
      errorMessage: 'CNPJ do tomador inválido ou inexistente na Receita Federal',
      invoiceId: 'nf-client-002',
      clientId: 'cl2',
    },
    createdAt: new Date(2024, 2, 14, 11, 40, 0), // 14 mar 2024, 11:40:00
    updatedAt: new Date(2024, 2, 14, 11, 40, 0),
  },
  {
    id: 'act26',
    companyId: CURRENT_COMPANY_ID,
    userId: null, // Sistema
    resourceType: ActivityResourceType.INTEGRACAO,
    resourceId: 'integration-webhook-001',
    action: 'Webhook recebido com sucesso',
    details: {
      service: 'Stripe Webhook',
      event: 'payment_intent.succeeded',
      paymentIntentId: 'pi_abc123',
      amount: 25500,
      customerId: 'cl1',
    },
    createdAt: new Date(2024, 2, 16, 14, 10, 0), // 16 mar 2024, 14:10:00
    updatedAt: new Date(2024, 2, 16, 14, 10, 0),
  },
];

// ========================================
// Helper functions
// ========================================

/**
 * Retorna ActivityLogs filtrados por companyId
 */
export function getActivityLogsForCompany(companyId: string): ActivityLog[] {
  return mockActivityLogs.filter(log => log.companyId === companyId);
}

/**
 * Interface para view model enriquecido (apenas para exibição)
 */
export interface ActivityLogViewModel extends ActivityLog {
  resourceLabel: string;
  resourceName: string;
  userName: string;
}

/**
 * Enriquece os logs com informações derivadas dos mocks
 * (resourceName, userName, resourceLabel)
 */
export function getActivityLogViewModels(companyId: string): ActivityLogViewModel[] {
  const logs = getActivityLogsForCompany(companyId);

  return logs.map(log => {
    let resourceName = 'Desconhecido';
    let userName = 'Sistema';

    // Resolver userName
    if (log.userId) {
      const user = getUserById(log.userId);
      userName = user?.name || 'Usuário desconhecido';
    }

    // Resolver resourceName baseado no resourceType
    switch (log.resourceType) {
      case ActivityResourceType.CLIENTE: {
        const client = getClientById(log.resourceId);
        resourceName = client?.companyName || client?.contactName || log.resourceId;
        break;
      }
      case ActivityResourceType.PROPOSTA: {
        const proposal = getProposalById(log.resourceId);
        resourceName = proposal?.title || log.resourceId;
        break;
      }
      case ActivityResourceType.MIDIA: {
        // Para mídia, procurar no array de pontos
        const mediaPoint = mockMediaPoints.find(mp => mp.id === log.resourceId);
        if (mediaPoint) {
          resourceName = mediaPoint.name;
        } else if (log.details?.name) {
          // Caso seja um log de criação, pegar do details
          resourceName = log.details.name;
        } else if (log.details?.fileName) {
          // Caso seja importação em massa
          resourceName = `${log.details.totalPoints || 0} pontos (${log.details.fileName})`;
        } else {
          resourceName = log.resourceId;
        }
        break;
      }
      case ActivityResourceType.USUARIO: {
        const user = getUserById(log.resourceId);
        resourceName = user?.name || log.resourceId;
        break;
      }
      case ActivityResourceType.ASSINATURA: {
        // Para assinatura, podemos usar o nome da empresa ou detalhes
        resourceName = log.details?.companyName || 'OOH Mídia SP';
        break;
      }
      case ActivityResourceType.NF: {
        // Para NF, usar número e série
        if (log.details?.nfNumber && log.details?.nfSerie) {
          resourceName = `NF ${log.details.nfNumber}/${log.details.nfSerie}`;
        } else {
          resourceName = log.resourceId;
        }
        break;
      }
      case ActivityResourceType.INTEGRACAO: {
        // Para integração, usar o serviço
        resourceName = log.details?.service || log.resourceId;
        break;
      }
    }

    // Definir resourceLabel
    const resourceLabel = getResourceLabel(log.resourceType);

    return {
      ...log,
      resourceLabel,
      resourceName,
      userName,
    };
  });
}

/**
 * Retorna o label amigável do tipo de recurso
 */
function getResourceLabel(resourceType: ActivityResourceType): string {
  switch (resourceType) {
    case ActivityResourceType.CLIENTE:
      return 'Cliente';
    case ActivityResourceType.PROPOSTA:
      return 'Proposta';
    case ActivityResourceType.MIDIA:
      return 'Mídia';
    case ActivityResourceType.USUARIO:
      return 'Usuário';
    case ActivityResourceType.ASSINATURA:
      return 'Assinatura';
    case ActivityResourceType.NF:
      return 'NF';
    case ActivityResourceType.INTEGRACAO:
      return 'Integração';
  }
}

/**
 * Retorna lista de actions distintas presentes nos logs
 */
export function getDistinctActions(logs: ActivityLog[]): string[] {
  const actions = new Set(logs.map(log => log.action));
  return Array.from(actions).sort();
}

/**
 * Retorna lista de resourceTypes distintos presentes nos logs
 */
export function getDistinctResourceTypes(logs: ActivityLog[]): ActivityResourceType[] {
  const types = new Set(logs.map(log => log.resourceType));
  return Array.from(types).sort();
}
