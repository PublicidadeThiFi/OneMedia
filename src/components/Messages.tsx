import { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { ConversationsList } from './messages/ConversationsList';
import { MessageThread } from './messages/MessageThread';
import { MessageInputBar } from './messages/MessageInputBar';
import { toast } from 'sonner';
import {
  Message,
  MessageDirection,
  MessageChannel,
  MessageSenderType,
} from '../types';
import {
  mockMessages,
  getConversations,
  getMessagesByProposal,
  getMessagesByCampaign,
  ConversationSummary,
} from '../lib/mockDataMessages';

export function Messages() {
  // Estado local para gerenciar mensagens em memória
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(
    null
  );

  // Gerar lista de conversas a partir das mensagens atuais
  const conversations = useMemo(() => {
    // Reagrupar mensagens dinamicamente (para refletir novas mensagens enviadas)
    const groupedByProposal = new Map<string, Message[]>();
    const groupedByCampaign = new Map<string, Message[]>();

    messages.forEach((msg) => {
      if (msg.proposalId) {
        const existing = groupedByProposal.get(msg.proposalId) || [];
        groupedByProposal.set(msg.proposalId, [...existing, msg]);
      }
      if (msg.campaignId) {
        const existing = groupedByCampaign.get(msg.campaignId) || [];
        groupedByCampaign.set(msg.campaignId, [...existing, msg]);
      }
    });

    const conversationsList: ConversationSummary[] = [];

    // Mock de nomes de clientes (em produção, viria de Client via Proposal/Campaign)
    const clientNames: Record<string, string> = {
      pr1: 'Tech Solutions Ltda',
      pr2: 'Marketing Pro',
      pr3: 'Cliente Novo',
      pr4: 'Fashion Brands Brasil',
      ca1: 'Tech Solutions Ltda',
    };

    // Conversas por Proposta
    groupedByProposal.forEach((msgs, proposalId) => {
      const sortedMessages = msgs.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      const lastMsg = sortedMessages[0];

      // Mock de "não lidas": se última msg foi IN e tem menos de 2 dias
      const now = new Date();
      const hoursSinceLastMsg =
        (now.getTime() - lastMsg.createdAt.getTime()) / (1000 * 60 * 60);
      const unreadCount =
        lastMsg.direction === MessageDirection.IN && hoursSinceLastMsg < 48 ? 1 : 0;

      conversationsList.push({
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
    groupedByCampaign.forEach((msgs, campaignId) => {
      const sortedMessages = msgs.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      const lastMsg = sortedMessages[0];

      conversationsList.push({
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
    return conversationsList.sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    );
  }, [messages]);

  // Selecionar primeira conversa por padrão (se houver)
  useMemo(() => {
    if (!selectedConversation && conversations.length > 0) {
      setSelectedConversation(conversations[0]);
    }
  }, [conversations, selectedConversation]);

  // Mensagens da conversa selecionada
  const currentMessages = useMemo(() => {
    if (!selectedConversation) return [];

    const filtered = messages.filter((msg) => {
      if (selectedConversation.proposalId) {
        return msg.proposalId === selectedConversation.proposalId;
      }
      if (selectedConversation.campaignId) {
        return msg.campaignId === selectedConversation.campaignId;
      }
      return false;
    });

    // Ordenar cronologicamente (ascendente)
    return filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }, [messages, selectedConversation]);

  // Handler: troca de conversa
  const handleSelectConversation = (conversation: ConversationSummary) => {
    setSelectedConversation(conversation);

    // Marcar como lido (zerar contador de não lidas)
    // Em memória, isso é apenas visual - em produção, atualizaria backend
    conversation.unreadCount = 0;
  };

  // Handler: enviar nova mensagem
  const handleSendMessage = (messageText: string) => {
    if (!selectedConversation) {
      toast.error('Nenhuma conversa selecionada');
      return;
    }

    // Criar nova mensagem
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      companyId: 'c1', // Mock
      proposalId: selectedConversation.proposalId,
      campaignId: selectedConversation.campaignId,
      direction: MessageDirection.OUT,
      channel: MessageChannel.EMAIL, // Por padrão, Email (pode ser configurável no futuro)
      senderType: MessageSenderType.USER,
      senderName: 'Carlos Mendes', // Mock - em produção, viria do usuário logado
      senderContact: 'carlos@empresa.com', // Mock
      contentText: messageText,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Atualizar estado de mensagens
    setMessages((prev) => [...prev, newMessage]);

    // TODO: Integração futura com backend
    // - Enviar mensagem via API
    // - Se channel = EMAIL, chamar serviço de envio de e-mail
    // - Se channel = WHATSAPP, chamar WhatsApp API

    toast.success('Mensagem enviada com sucesso!');
  };

  // Handler: botão de anexar
  const handleAttach = (files: FileList) => {
    const fileCount = files.length;
    const fileNames = Array.from(files).map(f => f.name).join(', ');
    
    toast.info(
      `${fileCount} arquivo(s) selecionado(s): ${fileNames}. Upload real será implementado na integração com WhatsApp API / Email / Storage.`,
      { duration: 5000 }
    );

    // TODO: Integração futura
    // - Upload de arquivo para S3/Storage
    // - Criar Message com campo attachments/metadata
    // - Associar anexo à mensagem
    // - Enviar via email/WhatsApp com anexo
  };

  return (
    <div className="p-8 flex flex-col h-screen">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Mensagens</h1>
        <p className="text-gray-600">Central de conversas (Message) por Proposta/Campanha</p>
      </div>

      {/* Container principal do chat - altura fixa com scroll interno */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Coluna esquerda: Lista de conversas */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardContent className="pt-6 h-full">
              <ConversationsList
                conversations={conversations}
                selectedConversationId={selectedConversation?.id || null}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectConversation={handleSelectConversation}
              />
            </CardContent>
          </Card>
        </div>

        {/* Coluna direita: Thread de mensagens */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            {selectedConversation ? (
              <>
                {/* Header da conversa */}
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-gray-900">{selectedConversation.clientName}</h3>
                  {selectedConversation.proposalId && (
                    <p className="text-sm text-gray-600">
                      Proposta: {selectedConversation.proposalId}
                    </p>
                  )}
                  {selectedConversation.campaignId && (
                    <p className="text-sm text-gray-600">
                      Campanha: {selectedConversation.campaignId}
                    </p>
                  )}
                </div>

                {/* Thread de mensagens */}
                <CardContent className="flex-1 overflow-y-auto p-6">
                  <MessageThread messages={currentMessages} />
                </CardContent>

                {/* Input de mensagem */}
                <div className="p-6 border-t border-gray-200">
                  <MessageInputBar onSend={handleSendMessage} onAttach={handleAttach} />
                </div>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                <p className="text-gray-500">Selecione uma conversa</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Info box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-900 mb-2">💡 Message (Mensagens)</p>
        <p className="text-sm text-blue-700">
          Campos: proposalId/campaignId, direction (IN/OUT), channel (EMAIL/WHATSAPP/SYSTEM),
          senderType (USER/CLIENTE), senderName, senderContact, contentText. Integrações
          futuras: WhatsApp API, chatbot, upload de anexos.
        </p>
      </div>
    </div>
  );
}