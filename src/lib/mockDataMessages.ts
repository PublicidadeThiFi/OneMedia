/**
 * Mock Data para o módulo de Mensagens
 * 
 * Baseado no schema Prisma (model Message) e documento funcional v2.
 * Todas as datas são locais (sem conversão UTC) seguindo padrão do dateUtils.
 */

import { Message, MessageDirection, MessageChannel, MessageSenderType } from '../types';

/**
 * Mock de mensagens por Proposta/Campanha
 * Seguem exatamente os campos do model Message do Prisma:
 * - id, companyId
 * - proposalId?, campaignId?
 * - direction (IN/OUT), channel (EMAIL/WHATSAPP/SYSTEM), senderType (USER/CLIENTE)
 * - senderName, senderContact, contentText
 * - createdAt, updatedAt
 */
export const mockMessages: Message[] = [
  // ========== CONVERSA 1: Proposta p1 (Tech Solutions Ltda) ==========
  {
    id: 'msg1',
    companyId: 'c1',
    proposalId: 'pr1',
    direction: MessageDirection.OUT,
    channel: MessageChannel.EMAIL,
    senderType: MessageSenderType.USER,
    senderName: 'Carlos Mendes',
    senderContact: 'carlos@empresa.com',
    contentText: 'Olá! Segue proposta para campanha de lançamento do novo produto. Aguardo retorno.',
    createdAt: new Date(2024, 2, 15, 14, 30), // 15/03/2024 14:30
    updatedAt: new Date(2024, 2, 15, 14, 30),
  },
  {
    id: 'msg2',
    companyId: 'c1',
    proposalId: 'pr1',
    direction: MessageDirection.IN,
    channel: MessageChannel.EMAIL,
    senderType: MessageSenderType.CLIENTE,
    senderName: 'João Silva',
    senderContact: 'joao@techsolutions.com',
    contentText: 'Perfeito! Vamos revisar internamente e retornamos em breve. Obrigado pela agilidade!',
    createdAt: new Date(2024, 2, 15, 15, 45), // 15/03/2024 15:45
    updatedAt: new Date(2024, 2, 15, 15, 45),
  },
  {
    id: 'msg3',
    companyId: 'c1',
    proposalId: 'pr1',
    direction: MessageDirection.OUT,
    channel: MessageChannel.EMAIL,
    senderType: MessageSenderType.USER,
    senderName: 'Carlos Mendes',
    senderContact: 'carlos@empresa.com',
    contentText: 'Sem problemas! Fico à disposição para qualquer dúvida. A proposta é válida até 30/03.',
    createdAt: new Date(2024, 2, 15, 16, 10), // 15/03/2024 16:10
    updatedAt: new Date(2024, 2, 15, 16, 10),
  },
  {
    id: 'msg4',
    companyId: 'c1',
    proposalId: 'pr1',
    direction: MessageDirection.IN,
    channel: MessageChannel.EMAIL,
    senderType: MessageSenderType.CLIENTE,
    senderName: 'João Silva',
    senderContact: 'joao@techsolutions.com',
    contentText: 'Aprovamos a proposta! Pode enviar o contrato para assinatura?',
    createdAt: new Date(2024, 2, 18, 10, 20), // 18/03/2024 10:20
    updatedAt: new Date(2024, 2, 18, 10, 20),
  },

  // ========== CONVERSA 2: Proposta p2 (Marketing Pro) ==========
  {
    id: 'msg5',
    companyId: 'c1',
    proposalId: 'pr2',
    direction: MessageDirection.OUT,
    channel: MessageChannel.WHATSAPP,
    senderType: MessageSenderType.USER,
    senderName: 'Ana Costa',
    senderContact: '+5511987654321',
    contentText: 'Olá Maria! Preparei a proposta para os painéis digitais que você solicitou. Segue anexo.',
    createdAt: new Date(2024, 2, 16, 9, 15), // 16/03/2024 09:15
    updatedAt: new Date(2024, 2, 16, 9, 15),
  },
  {
    id: 'msg6',
    companyId: 'c1',
    proposalId: 'pr2',
    direction: MessageDirection.IN,
    channel: MessageChannel.WHATSAPP,
    senderType: MessageSenderType.CLIENTE,
    senderName: 'Maria Santos',
    senderContact: '+5511976543210',
    contentText: 'Recebi! Adorei os locais sugeridos. Podem enviar o contrato?',
    createdAt: new Date(2024, 2, 16, 10, 0), // 16/03/2024 10:00
    updatedAt: new Date(2024, 2, 16, 10, 0),
  },
  {
    id: 'msg7',
    companyId: 'c1',
    proposalId: 'pr2',
    direction: MessageDirection.OUT,
    channel: MessageChannel.WHATSAPP,
    senderType: MessageSenderType.USER,
    senderName: 'Ana Costa',
    senderContact: '+5511987654321',
    contentText: 'Claro! Envio o contrato por e-mail ainda hoje. Você prefere boleto ou PIX para pagamento?',
    createdAt: new Date(2024, 2, 16, 10, 30), // 16/03/2024 10:30
    updatedAt: new Date(2024, 2, 16, 10, 30),
  },

  // ========== CONVERSA 3: Proposta p3 (Cliente Novo - com 1 mensagem não respondida) ==========
  {
    id: 'msg8',
    companyId: 'c1',
    proposalId: 'pr3',
    direction: MessageDirection.IN,
    channel: MessageChannel.EMAIL,
    senderType: MessageSenderType.CLIENTE,
    senderName: 'Roberto Lima',
    senderContact: 'roberto@clientenovo.com',
    contentText: 'Olá! Recebi a proposta mas tenho algumas dúvidas sobre os locais disponíveis. Podemos conversar?',
    createdAt: new Date(2024, 2, 17, 14, 45), // 17/03/2024 14:45
    updatedAt: new Date(2024, 2, 17, 14, 45),
  },

  // ========== CONVERSA 4: Campanha c1 (Campanha em execução) ==========
  {
    id: 'msg9',
    companyId: 'c1',
    campaignId: 'ca1',
    direction: MessageDirection.OUT,
    channel: MessageChannel.SYSTEM,
    senderType: MessageSenderType.USER,
    senderName: 'Sistema',
    senderContact: 'sistema@empresa.com',
    contentText: 'Campanha iniciada com sucesso! Todas as inserções estão programadas.',
    createdAt: new Date(2024, 1, 1, 8, 0), // 01/02/2024 08:00
    updatedAt: new Date(2024, 1, 1, 8, 0),
  },
  {
    id: 'msg10',
    companyId: 'c1',
    campaignId: 'ca1',
    direction: MessageDirection.IN,
    channel: MessageChannel.WHATSAPP,
    senderType: MessageSenderType.CLIENTE,
    senderName: 'João Silva',
    senderContact: 'joao@techsolutions.com',
    contentText: 'Perfeito! Estamos monitorando os resultados. Parabéns pela instalação rápida!',
    createdAt: new Date(2024, 1, 2, 11, 30), // 02/02/2024 11:30
    updatedAt: new Date(2024, 1, 2, 11, 30),
  },

  // ========== CONVERSA 5: Proposta p4 (Vazia, para testar estado vazio) ==========
  // Nenhuma mensagem para pr4 - será útil para testar o estado vazio
];

/**
 * Interface para conversa agregada (usada na lista lateral)
 */
export interface ConversationSummary {
  id: string; // proposalId ou campaignId
  type: 'proposal' | 'campaign';
  clientName: string;
  proposalId?: string;
  campaignId?: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

/**
 * Retorna mensagens de uma proposta específica
 */
export function getMessagesByProposal(proposalId: string): Message[] {
  return mockMessages
    .filter(m => m.proposalId === proposalId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/**
 * Retorna mensagens de uma campanha específica
 */
export function getMessagesByCampaign(campaignId: string): Message[] {
  return mockMessages
    .filter(m => m.campaignId === campaignId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/**
 * Gera lista de conversas agregadas para exibição na sidebar
 * Mock: unreadCount baseado em heurística simples (última msg é IN e recente)
 */
export function getConversations(): ConversationSummary[] {
  // Agrupar mensagens por proposalId/campaignId
  const groupedByProposal = new Map<string, Message[]>();
  const groupedByCampaign = new Map<string, Message[]>();

  mockMessages.forEach(msg => {
    if (msg.proposalId) {
      const existing = groupedByProposal.get(msg.proposalId) || [];
      groupedByProposal.set(msg.proposalId, [...existing, msg]);
    }
    if (msg.campaignId) {
      const existing = groupedByCampaign.get(msg.campaignId) || [];
      groupedByCampaign.set(msg.campaignId, [...existing, msg]);
    }
  });

  const conversations: ConversationSummary[] = [];

  // Mock de nomes de clientes (em produção, viria de Client via Proposal/Campaign)
  const clientNames: Record<string, string> = {
    pr1: 'Tech Solutions Ltda',
    pr2: 'Marketing Pro',
    pr3: 'Cliente Novo',
    pr4: 'Fashion Brands Brasil',
    ca1: 'Tech Solutions Ltda',
  };

  // Conversas por Proposta
  groupedByProposal.forEach((messages, proposalId) => {
    const sortedMessages = messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const lastMsg = sortedMessages[0];
    
    // Mock de "não lidas": se última msg foi IN e tem menos de 2 dias
    const now = new Date();
    const hoursSinceLastMsg = (now.getTime() - lastMsg.createdAt.getTime()) / (1000 * 60 * 60);
    const unreadCount = 
      lastMsg.direction === MessageDirection.IN && hoursSinceLastMsg < 48 ? 1 : 0;

    conversations.push({
      id: proposalId,
      type: 'proposal',
      clientName: clientNames[proposalId] || 'Cliente',
      proposalId,
      lastMessage: lastMsg.contentText,
      lastMessageAt: lastMsg.createdAt,
      unreadCount,
    });
  });

  // Conversas por Campanha
  groupedByCampaign.forEach((messages, campaignId) => {
    const sortedMessages = messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const lastMsg = sortedMessages[0];

    conversations.push({
      id: campaignId,
      type: 'campaign',
      clientName: clientNames[campaignId] || 'Cliente',
      campaignId,
      lastMessage: lastMsg.contentText,
      lastMessageAt: lastMsg.createdAt,
      unreadCount: 0, // Campanhas geralmente não têm "não lidas"
    });
  });

  // Ordenar por data da última mensagem (mais recente primeiro)
  return conversations.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
}
