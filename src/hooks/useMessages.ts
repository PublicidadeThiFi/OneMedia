import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { Message, MessageChannel } from '../types';

export interface UseMessagesParams {
  proposalId?: string;
  campaignId?: string;
  channel?: MessageChannel | string;
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

export function useMessages(params: UseMessagesParams = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<MessagesResponse>('/messages', { params });

      const responseData = response.data as MessagesResponse;

      const data: Message[] = Array.isArray(responseData)
        ? responseData
        : responseData.data;

      setMessages((Array.isArray(data) ? data : []).map(normalizeMessage));
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (payload: unknown) => {
    const response = await apiClient.post<Message>('/messages', payload);
    setMessages((prev: Message[]) => [...prev, normalizeMessage(response.data)]);
    return response.data;
  };

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.proposalId, params.campaignId, params.channel]);

  return {
    messages,
    loading,
    error,
    refetch: fetchMessages,
    sendMessage,
  };
}
