import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { ConversationsList, ConversationSummary } from './messages/ConversationsList';
import { MessageThread } from './messages/MessageThread';
import { MessageInputBar } from './messages/MessageInputBar';
import { toast } from 'sonner';
import apiClient from '../lib/apiClient';
import {
  Message,
  MessageDirection,
  MessageChannel,
  MessageSenderType,
} from '../types';
import { useMessages } from '../hooks/useMessages';
import { useAuth } from '../contexts/AuthContext';

type UrlTarget = { type: 'proposal' | 'campaign'; id: string } | null;

export function Messages() {
  const { user } = useAuth();
  const { messages, loading, error, refetch, sendMessage } = useMessages({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);

  const [urlTarget, setUrlTarget] = useState<UrlTarget>(null);
  const [targetLabel, setTargetLabel] = useState<string | null>(null);

  const parseUrlTarget = (): UrlTarget => {
    const params = new URLSearchParams(window.location.search);
    const campaignId = params.get('campaignId');
    const proposalId = params.get('proposalId');
    if (campaignId) return { type: 'campaign', id: campaignId };
    if (proposalId) return { type: 'proposal', id: proposalId };
    return null;
  };

  useEffect(() => {
    const update = () => setUrlTarget(parseUrlTarget());
    update();

    // Disparado pelo App.tsx quando navega via pushState
    window.addEventListener('app:navigation', update as any);

    // Fallback para back/forward
    window.addEventListener('popstate', update);

    return () => {
      window.removeEventListener('app:navigation', update as any);
      window.removeEventListener('popstate', update);
    };
  }, []);

  // Carrega um rótulo amigável (cliente + titulo) quando a conversa ainda está vazia
  useEffect(() => {
    const run = async () => {
      if (!urlTarget) {
        setTargetLabel(null);
        return;
      }
      try {
        if (urlTarget.type === 'proposal') {
          const res = await apiClient.get(`/proposals/${urlTarget.id}`);
          const p = res.data as any;
          const name =
            p?.clientName || p?.client?.companyName || p?.client?.contactName || 'Cliente';
          const title = p?.title || `Proposta ...${String(urlTarget.id).slice(-6)}`;
          setTargetLabel(`${name} • ${title}`);
        } else {
          const res = await apiClient.get(`/campaigns/${urlTarget.id}`);
          const c = res.data as any;
          const name =
            c?.clientName || c?.client?.companyName || c?.client?.contactName || 'Cliente';
          const title = c?.name || `Campanha ...${String(urlTarget.id).slice(-6)}`;
          setTargetLabel(`${name} • ${title}`);
        }
      } catch {
        setTargetLabel(null);
      }
    };
    run();
  }, [urlTarget?.type, urlTarget?.id]);

  // Gerar lista de conversas a partir das mensagens atuais
  const conversations = useMemo(() => {
    const groupedByProposal = new Map<string, Message[]>();
    const groupedByCampaign = new Map<string, Message[]>();

    messages.forEach((msg: Message) => {
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

    groupedByProposal.forEach((msgs, proposalId) => {
      const sortedMessages = msgs
        .slice()
        .sort((a: Message, b: Message) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const lastMsg = sortedMessages[0];

      const now = new Date();
      const hoursSinceLastMsg =
        (now.getTime() - new Date(lastMsg.createdAt).getTime()) / (1000 * 60 * 60);
      const unreadCount =
        lastMsg.direction === MessageDirection.IN && hoursSinceLastMsg < 48 ? 1 : 0;

      const clientLikeName =
        sortedMessages.find((m) => m.senderType === MessageSenderType.CLIENTE)?.senderName ||
        'Cliente';

      conversationsList.push({
        id: `proposal:${proposalId}`,
        type: 'proposal',
        clientName: clientLikeName,
        proposalId,
        lastMessage: lastMsg.contentText,
        lastMessageAt: new Date(lastMsg.createdAt),
        unreadCount,
      });
    });

    groupedByCampaign.forEach((msgs, campaignId) => {
      const sortedMessages = msgs
        .slice()
        .sort((a: Message, b: Message) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const lastMsg = sortedMessages[0];
      const clientLikeName =
        sortedMessages.find((m) => m.senderType === MessageSenderType.CLIENTE)?.senderName ||
        'Cliente';

      conversationsList.push({
        id: `campaign:${campaignId}`,
        type: 'campaign',
        clientName: clientLikeName,
        campaignId,
        lastMessage: lastMsg.contentText,
        lastMessageAt: new Date(lastMsg.createdAt),
        unreadCount: 0,
      });
    });

    // Se a tela foi aberta com ?proposalId ou ?campaignId e ainda não existe mensagem,
    // cria uma conversa vazia para permitir iniciar o chat.
    if (urlTarget) {
      const exists = conversationsList.some((c) =>
        urlTarget.type === 'proposal' ? c.proposalId === urlTarget.id : c.campaignId === urlTarget.id
      );

      if (!exists) {
        conversationsList.push({
          id: `${urlTarget.type}:${urlTarget.id}`,
          type: urlTarget.type,
          clientName: targetLabel || 'Nova conversa',
          proposalId: urlTarget.type === 'proposal' ? urlTarget.id : undefined,
          campaignId: urlTarget.type === 'campaign' ? urlTarget.id : undefined,
          lastMessage: 'Sem mensagens ainda',
          lastMessageAt: new Date(),
          unreadCount: 0,
        });
      }
    }

    return conversationsList.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }, [messages, urlTarget, targetLabel]);

  // Selecionar conversa pelo querystring (?proposalId / ?campaignId)
  useEffect(() => {
    if (!urlTarget) return;
    const found = conversations.find((c) =>
      urlTarget.type === 'proposal' ? c.proposalId === urlTarget.id : c.campaignId === urlTarget.id
    );
    if (found) setSelectedConversation(found);
  }, [urlTarget?.type, urlTarget?.id, conversations]);

  // Selecionar primeira conversa por padrão (se não houver target)
  useEffect(() => {
    if (urlTarget) return;
    if (!selectedConversation && conversations.length > 0) {
      setSelectedConversation(conversations[0]);
    }
  }, [urlTarget, conversations, selectedConversation]);

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

    return filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, selectedConversation]);

  const handleSelectConversation = (conversation: ConversationSummary) => {
    setSelectedConversation({ ...conversation, unreadCount: 0 });
  };

  const handleSendMessage = async (messageText: string) => {
    if (!selectedConversation) {
      toast.error('Nenhuma conversa selecionada');
      return;
    }
    try {
      await sendMessage({
        proposalId: selectedConversation.proposalId,
        campaignId: selectedConversation.campaignId,
        direction: MessageDirection.OUT,
        channel: MessageChannel.EMAIL,
        senderType: MessageSenderType.USER,
        senderName: user?.name || 'Usuário',
        senderContact: user?.email || '',
        contentText: messageText,
      });
      toast.success('Mensagem enviada com sucesso!');
      refetch();
    } catch (err) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  const handleAttach = (files: FileList) => {
    const fileCount = files.length;
    const fileNames = Array.from(files).map((f) => f.name).join(', ');

    toast.info(
      `${fileCount} arquivo(s) selecionado(s): ${fileNames}. Upload real será implementado na integração com WhatsApp API / Email / Storage.`,
      { duration: 5000 }
    );
  };

  return (
    <div className="p-8 flex flex-col h-screen">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Mensagens</h1>
        <p className="text-gray-600">Central de conversas (Message) por Proposta/Campanha</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardContent className="pt-6 h-full">
              <ConversationsList
                conversations={conversations}
                selectedConversationId={selectedConversation?.id || null}
                searchQuery={searchQuery}
                onSearchChange={(q: string) => setSearchQuery(q)}
                onSelectConversation={handleSelectConversation}
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            {selectedConversation ? (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-gray-900">{selectedConversation.clientName}</h3>
                  {selectedConversation.proposalId && (
                    <p className="text-sm text-gray-600">
                      Proposta: ...{selectedConversation.proposalId.slice(-6)}
                    </p>
                  )}
                  {selectedConversation.campaignId && (
                    <p className="text-sm text-gray-600">
                      Campanha: ...{selectedConversation.campaignId.slice(-6)}
                    </p>
                  )}
                </div>

                <CardContent className="flex-1 overflow-y-auto p-6">
                  <MessageThread messages={currentMessages} />
                </CardContent>

                <div className="p-6 border-t border-gray-200">
                  <MessageInputBar onSend={handleSendMessage} onAttach={handleAttach} disabled={loading} />
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

      {loading && (
        <div className="mt-4 p-3 rounded bg-gray-50 text-gray-700">Carregando mensagens...</div>
      )}
      {!loading && error && (
        <div className="mt-4 p-3 rounded bg-red-50 text-red-700">Erro ao carregar mensagens.</div>
      )}

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
