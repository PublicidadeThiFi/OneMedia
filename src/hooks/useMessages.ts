import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { Message, MessageChannel } from '../types';

export interface UseMessagesParams {
  proposalId?: string;
  campaignId?: string;
  channel?: MessageChannel | string;
}

export interface UseMessagesOptions {
  /**
   * Intervalo de polling em ms para buscar novas mensagens.
   * Se não informado, usa 3000ms quando há filtro (proposalId/campaignId) ou 5000ms caso contrário.
   */
  pollIntervalMs?: number;
  /** Habilita/desabilita o polling. Padrão: true */
  enabled?: boolean;
}

// Resposta pode ser um array direto ou um objeto com `data`
type MessagesResponse =
  | Message[]
  | {
      data: Message[];
      total?: number;
    };


function normalizeMessage(m: any): Message {
  const createdAt = m?.createdAt ? new Date(m.createdAt) : new Date();
  const updatedAt = m?.updatedAt ? new Date(m.updatedAt) : createdAt;
  return {
    ...m,
    proposalId: m?.proposalId ?? undefined,
    campaignId: m?.campaignId ?? undefined,
    createdAt,
    updatedAt,
  } as Message;
}

function mergeById(prev: Message[], incoming: Message[]) {
  const map = new Map<string, Message>();

  for (const m of prev) {
    if (m?.id) map.set(String(m.id), m);
  }

  for (const m of incoming) {
    if (m?.id) map.set(String(m.id), m);
  }

  return Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    if (ta !== tb) return ta - tb;
    return String(a.id).localeCompare(String(b.id));
  });
}

export function useMessages(params: UseMessagesParams = {}, options: UseMessagesOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const inFlightRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const latestMessagesRef = useRef<Message[]>([]);
  latestMessagesRef.current = messages;

  const pollingEnabled = options.enabled ?? true;
  const pollIntervalMs =
    options.pollIntervalMs ?? (params.proposalId || params.campaignId ? 3000 : 5000);

  const fetchMessages = async (opts?: { silent?: boolean }) => {
    try {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }

      const response = await apiClient.get<MessagesResponse>('/messages', { params });

      const responseData = response.data as MessagesResponse;

      const data: Message[] = Array.isArray(responseData)
        ? responseData
        : responseData.data;

      const normalized = (Array.isArray(data) ? data : []).map(normalizeMessage);
      setMessages((prev) => mergeById(prev, normalized));
      hasLoadedRef.current = true;
    } catch (err) {
      // Evita "piscar" erro durante polling quando já existe conteúdo.
      if (!opts?.silent || !hasLoadedRef.current || latestMessagesRef.current.length === 0) {
        setError(err as Error);
      }
    } finally {
      if (!opts?.silent) setLoading(false);
      inFlightRef.current = false;
    }
  };

  const sendMessage = async (payload: unknown) => {
    const response = await apiClient.post<Message>('/messages', payload);
    setMessages((prev: Message[]) => mergeById(prev, [normalizeMessage(response.data)]));
    return response.data;
  };

  useEffect(() => {
    fetchMessages({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.proposalId, params.campaignId, params.channel]);

  // Polling para atualizar mensagens automaticamente (sem precisar dar refresh)
  useEffect(() => {
    if (!pollingEnabled) return;

    const id = window.setInterval(() => {
      // Não faz polling quando a aba está em background
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      fetchMessages({ silent: true });
    }, pollIntervalMs);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingEnabled, pollIntervalMs, params.proposalId, params.campaignId, params.channel]);

  return {
    messages,
    loading,
    error,
    refetch: fetchMessages,
    sendMessage,
  };
}
