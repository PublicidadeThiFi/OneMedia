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

type MessageUrlTarget =
  | { type: 'proposal'; id: string }
  | { type: 'campaign'; id: string }
  | null;

function getMessageTargetFromUrl(): MessageUrlTarget {
  const sp = new URLSearchParams(window.location.search);
  const campaignId = (sp.get('campaignId') || '').trim();
  const proposalId = (sp.get('proposalId') || '').trim();

  // Preferência: se vier campaignId, ela define a conversa (campanhas são mais específicas)
  if (campaignId) return { type: 'campaign', id: campaignId };
  if (proposalId) return { type: 'proposal', id: proposalId };
  return null;
}

export function Messages() {
  const { user } = useAuth();
  const { messages, loading, error, sendMessage } = useMessages({});

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
  const [readConversations, setReadConversations] = useState<Record<string, boolean>>({});

  const [urlTarget, setUrlTarget] = useState<MessageUrlTarget>(() => getMessageTargetFromUrl());
  const [forcedConversation, setForcedConversation] = useState<ConversationSummary | null>(null);

  // Reagir a mudanças de querystring (ex.: /app/messages?proposalId=... vindo de outra tela)
  useEffect(() => {
    const syncFromUrl = () => setUrlTarget(getMessageTargetFromUrl());

    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('app:navigation', syncFromUrl as any);

    // 1ª sincronização
    syncFromUrl();

    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('app:navigation', syncFromUrl as any);
    };
  }, []);

  // Se veio ?proposalId / ?campaignId e ainda não existe nenhuma mensagem, cria uma conversa "vazia"
  useEffect(() => {
    if (!urlTarget) {
      setForcedConversation(null);
      return;
    }

    const id = urlTarget.id;

    // Lembrando: se a mensagem tem campaignId, ela vai para a conversa da campanha (não da proposta).
    const hasTargetMessages =
      urlTarget.type === 'campaign'
        ? messages.some((m) => m.campaignId === id)
        : messages.some((m) => !m.campaignId && m.proposalId === id);

    if (hasTargetMessages) {
      setForcedConversation(null);
      return;
    }

    const key = `${urlTarget.type}:${id}`;

    setForcedConversation((prev) => {
      if (prev?.key === key) return prev;

      return {
        key,
        id,
        type: urlTarget.type,
        clientName: 'Cliente',
        proposalId: urlTarget.type === 'proposal' ? id : undefined,
        proposalTitle: null,
        campaignId: urlTarget.type === 'campaign' ? id : undefined,
        campaignName: null,
        lastMessage: 'Inicie uma conversa',
        lastMessageAt: new Date(),
        unreadCount: 0,
      };
    });
  }, [urlTarget, messages]);

  // Carregar dados do cabeçalho (título/nome e clientName) para a conversa vazia
  useEffect(() => {
    if (!forcedConversation) return;

    let cancelled = false;

    const load = async () => {
      try {
        if (forcedConversation.type === 'proposal' && forcedConversation.proposalId) {
          const res = await apiClient.get(`/proposals/${forcedConversation.proposalId}`);
          const data = res.data as any;

          if (cancelled) return;

          setForcedConversation((prev) => {
            if (!prev || prev.key !== forcedConversation.key) return prev;
            return {
              ...prev,
              clientName: data?.clientName ?? prev.clientName,
              proposalTitle: data?.title ?? prev.proposalTitle ?? null,
            };
          });

          return;
        }

        if (forcedConversation.type === 'campaign' && forcedConversation.campaignId) {
          const res = await apiClient.get(`/campaigns/${forcedConversation.campaignId}`);
          const data = res.data as any;

          if (cancelled) return;

          setForcedConversation((prev) => {
            if (!prev || prev.key !== forcedConversation.key) return prev;
            return {
              ...prev,
              clientName: data?.clientName ?? prev.clientName,
              campaignName: data?.name ?? prev.campaignName ?? null,
            };
          });

          return;
        }
      } catch {
        // Não bloqueia a UI: apenas mantém IDs no header.
        toast.error('Não foi possível carregar dados da Proposta/Campanha para o cabeçalho.');
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [forcedConversation?.key]);

  // Gerar lista de conversas a partir das mensagens atuais (+ conversa vazia se aplicável)
  const conversations = useMemo(() => {
    // Preferência: se a mensagem está vinculada a uma Campanha, ela entra na conversa da Campanha;
    // caso contrário, entra na conversa da Proposta.
    const groupedByProposal = new Map<string, Message[]>();
    const groupedByCampaign = new Map<string, Message[]>();

    messages.forEach((msg: Message) => {
      if (msg.campaignId) {
        const existing = groupedByCampaign.get(msg.campaignId) || [];
        groupedByCampaign.set(msg.campaignId, [...existing, msg]);
        return;
      }
      if (msg.proposalId) {
        const existing = groupedByProposal.get(msg.proposalId) || [];
        groupedByProposal.set(msg.proposalId, [...existing, msg]);
      }
    });

    const conversationsList: ConversationSummary[] = [];

    // Conversas por Proposta
    groupedByProposal.forEach((msgs, proposalId) => {
      const sorted = msgs
        .slice()
        .sort((a: Message, b: Message) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const lastMsg = sorted[0];
      const key = `proposal:${proposalId}`;

      // Mock de "não lidas": se última msg foi IN e tem menos de 2 dias (e não foi marcada como lida)
      const now = new Date();
      const hoursSinceLastMsg =
        (now.getTime() - new Date(lastMsg.createdAt).getTime()) / (1000 * 60 * 60);

      const heuristicUnread =
        lastMsg.direction === MessageDirection.IN && hoursSinceLastMsg < 48 ? 1 : 0;

      const unreadCount = readConversations[key] ? 0 : heuristicUnread;

      const clientLikeName =
        sorted.find((m) => m.senderType === MessageSenderType.CLIENTE)?.senderName ||
        'Cliente';

      const proposalTitle =
        sorted.find((m) => m.proposalTitle)?.proposalTitle ?? null;

      conversationsList.push({
        key,
        id: proposalId,
        type: 'proposal',
        clientName: clientLikeName,
        proposalId,
        proposalTitle,
        lastMessage: lastMsg.contentText,
        lastMessageAt: new Date(lastMsg.createdAt),
        unreadCount,
      });
    });

    // Conversas por Campanha
    groupedByCampaign.forEach((msgs, campaignId) => {
      const sorted = msgs
        .slice()
        .sort((a: Message, b: Message) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const lastMsg = sorted[0];
      const key = `campaign:${campaignId}`;

      const clientLikeName =
        sorted.find((m) => m.senderType === MessageSenderType.CLIENTE)?.senderName ||
        'Cliente';

      const campaignName =
        sorted.find((m) => m.campaignName)?.campaignName ?? null;

      // Campanhas geralmente não têm "não lidas" nesta UI, mas mantemos a marcação manual
      const unreadCount = readConversations[key] ? 0 : 0;

      conversationsList.push({
        key,
        id: campaignId,
        type: 'campaign',
        clientName: clientLikeName,
        campaignId,
        campaignName,
        lastMessage: lastMsg.contentText,
        lastMessageAt: new Date(lastMsg.createdAt),
        unreadCount,
      });
    });

    // Ordenar por data da última mensagem (mais recente primeiro)
    const sorted = conversationsList.sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    );

    // Se existe conversa "vazia", adiciona (somente se ainda não existe no histórico)
    if (forcedConversation) {
      const exists = sorted.some((c) => c.key === forcedConversation.key);
      if (!exists) {
        // Queremos que ela apareça logo no topo quando acessada via link/rota.
        sorted.unshift(forcedConversation);
      }
    }

    return sorted;
  }, [messages, readConversations, forcedConversation]);

  // Quando vier ?proposalId/?campaignId, selecionar a conversa correspondente automaticamente
  useEffect(() => {
    if (!urlTarget) return;

    const key = `${urlTarget.type}:${urlTarget.id}`;
    const match = conversations.find((c) => c.key === key);

    if (!match) return;
    if (selectedConversation?.key === key) return;

    setSelectedConversation(match);
    setReadConversations((prev) => ({ ...prev, [key]: true }));
  }, [urlTarget, conversations, selectedConversation?.key]);

  // Selecionar primeira conversa por padrão (se houver) e manter a conversa selecionada atualizada
  useEffect(() => {
    if (!selectedConversation && conversations.length > 0) {
      setSelectedConversation(conversations[0]);
      return;
    }

    if (selectedConversation) {
      const updated = conversations.find(
        (c) => c.key === selectedConversation.key
      );
      if (updated) setSelectedConversation(updated);
    }
  }, [conversations, selectedConversation]);

  // Mensagens da conversa selecionada
  const currentMessages = useMemo(() => {
    if (!selectedConversation) return [];

    const filtered = messages.filter((msg) => {
      if (selectedConversation.type === 'proposal' && selectedConversation.proposalId) {
        return msg.proposalId === selectedConversation.proposalId && !msg.campaignId;
      }
      if (selectedConversation.type === 'campaign' && selectedConversation.campaignId) {
        return msg.campaignId === selectedConversation.campaignId;
      }
      return false;
    });

    // Ordenar cronologicamente (ascendente)
    return filtered.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages, selectedConversation]);

  // Handler: troca de conversa
  const handleSelectConversation = (conversation: ConversationSummary) => {
    setSelectedConversation(conversation);

    // Marcar como lido (zerar contador de não lidas)
    setReadConversations((prev) => ({
      ...prev,
      [conversation.key]: true,
    }));
  };

  // Handler: enviar nova mensagem
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
    } catch {
      toast.error('Erro ao enviar mensagem');
    }
  };

  // Handler: botão de anexar
  const handleAttach = (files: FileList) => {
    const fileCount = files.length;
    const fileNames = Array.from(files)
      .map((f) => f.name)
      .join(', ');

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
                selectedConversationKey={selectedConversation?.key || null}
                searchQuery={searchQuery}
                onSearchChange={(q: string) => setSearchQuery(q)}
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

                  {selectedConversation.type === 'proposal' && selectedConversation.proposalId && (
                    <p className="text-sm text-gray-600">
                      Proposta: {selectedConversation.proposalTitle || selectedConversation.proposalId}
                      {selectedConversation.proposalTitle && (
                        <span className="text-xs text-gray-500"> · {selectedConversation.proposalId}</span>
                      )}
                    </p>
                  )}

                  {selectedConversation.type === 'campaign' && selectedConversation.campaignId && (
                    <p className="text-sm text-gray-600">
                      Campanha: {selectedConversation.campaignName || selectedConversation.campaignId}
                      {selectedConversation.campaignName && (
                        <span className="text-xs text-gray-500"> · {selectedConversation.campaignId}</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Thread de mensagens */}
                <CardContent className="flex-1 overflow-y-auto p-6">
                  <MessageThread messages={currentMessages} />
                </CardContent>

                {/* Input de mensagem */}
                <div className="p-6 border-t border-gray-200">
                  <MessageInputBar
                    onSend={handleSendMessage}
                    onAttach={handleAttach}
                    disabled={loading}
                  />
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

      {/* Loading / Error banners */}
      {loading && (
        <div className="mt-4 p-3 rounded bg-gray-50 text-gray-700">Carregando mensagens...</div>
      )}
      {!loading && error && (
        <div className="mt-4 p-3 rounded bg-red-50 text-red-700">Erro ao carregar mensagens.</div>
      )}

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
