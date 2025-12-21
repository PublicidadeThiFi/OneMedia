import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import {
  Message,
  MessageChannel,
  MessageDirection,
  MessageSenderType,
} from '../types';

export interface UseMessagesParams {
  proposalId?: string;
  campaignId?: string;
  direction?: MessageDirection;
  channel?: MessageChannel;
  senderType?: MessageSenderType;
  q?: string;
  orderBy?: 'createdAt';
  orderDirection?: 'asc' | 'desc';
}

export interface CreateMessagePayload {
  proposalId?: string;
  campaignId?: string;
  direction: MessageDirection;
  channel: MessageChannel;
  senderType: MessageSenderType;
  senderName: string;
  senderContact: string;
  contentText: string;
}

// Resposta pode ser um array direto ou um objeto com `data`
type MessagesResponse =
  | Message[]
  | {
      data: Message[];
      total?: number;
    };

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function normalizeMessage(raw: any): Message {
  return {
    ...raw,
    proposalId: raw?.proposalId ?? null,
    proposalTitle: raw?.proposalTitle ?? null,
    campaignId: raw?.campaignId ?? null,
    campaignName: raw?.campaignName ?? null,
    createdAt: toDate(raw?.createdAt) ?? new Date(),
    updatedAt: toDate(raw?.updatedAt) ?? new Date(),
  } as Message;
}

export function useMessages(params: UseMessagesParams = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<MessagesResponse>('/messages', {
        params,
      });

      const responseData = response.data as MessagesResponse;

      const raw: Message[] = Array.isArray(responseData)
        ? responseData
        : responseData.data;

      const data = (raw ?? []).map(normalizeMessage);

      setMessages(data);
      setTotal(Array.isArray(responseData) ? data.length : responseData.total ?? data.length);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (payload: CreateMessagePayload) => {
    const response = await apiClient.post<Message>('/messages', payload);
    const created = normalizeMessage(response.data);
    setMessages((prev) => [...prev, created]);
    setTotal((prev) => prev + 1);
    return created;
  };

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.proposalId,
    params.campaignId,
    params.direction,
    params.channel,
    params.senderType,
    params.q,
    params.orderBy,
    params.orderDirection,
  ]);

  return {
    messages,
    total,
    loading,
    error,
    refetch: fetchMessages,
    sendMessage,
  };
}
