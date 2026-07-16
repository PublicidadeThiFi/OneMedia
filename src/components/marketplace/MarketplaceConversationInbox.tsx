import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Building2,
  CalendarDays,
  LoaderCircle,
  MapPin,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigation } from '../../contexts/NavigationContext';
import { resolveUploadsUrl } from '../../lib/format';
import { getApiError } from '../../lib/getApiError';
import {
  fetchMarketplaceCustomerConversations,
  fetchMarketplaceCustomerMessages,
  sendMarketplaceCustomerMessage,
} from '../../lib/marketplaceConversationsApi';
import type {
  MarketplaceConversationMessage,
  MarketplaceConversationSummary,
} from '../../types/marketplace';

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function requestedConversationId() {
  return new URLSearchParams(window.location.search).get('conversation');
}

function requestedPointSlug() {
  return new URLSearchParams(window.location.search).get('point');
}

function ConversationMessage({
  message,
}: {
  message: MarketplaceConversationMessage;
}) {
  const own = message.senderKind === 'CUSTOMER';
  const system = message.senderKind === 'SYSTEM';
  if (system) {
    return (
      <div className="marketplace-chat-message marketplace-chat-message--system">
        <p>{message.contentText}</p>
        <time>{dateTimeFormatter.format(new Date(message.createdAt))}</time>
      </div>
    );
  }
  return (
    <div
      className={`marketplace-chat-message ${
        own ? 'marketplace-chat-message--own' : 'marketplace-chat-message--other'
      }`}
    >
      <strong>{message.senderName}</strong>
      <p>{message.contentText}</p>
      <time>{dateTimeFormatter.format(new Date(message.createdAt))}</time>
    </div>
  );
}

export function MarketplaceConversationInbox() {
  const navigate = useNavigation();
  const [conversations, setConversations] = useState<
    MarketplaceConversationSummary[]
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MarketplaceConversationMessage[]>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingList(true);
    setError(null);
    fetchMarketplaceCustomerConversations(
      { q: debouncedQuery || undefined, page: 1, pageSize: 100 },
      controller.signal,
    )
      .then((response) => {
        setConversations(response.items);
        const requestedId = requestedConversationId();
        const pointSlug = requestedPointSlug();
        setSelectedId((current) => {
          if (requestedId && response.items.some((item) => item.id === requestedId)) {
            return requestedId;
          }
          if (pointSlug) {
            const byPoint = response.items.find((item) => item.point.slug === pointSlug);
            if (byPoint) return byPoint.id;
          }
          if (current && response.items.some((item) => item.id === current)) return current;
          return response.items[0]?.id || null;
        });
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setError(
          getApiError(
            requestError,
            'Não foi possível carregar suas conversas.',
          ).message,
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingList(false);
      });
    return () => controller.abort();
  }, [debouncedQuery, version]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    const controller = new AbortController();
    setLoadingThread(true);
    fetchMarketplaceCustomerMessages(
      selectedId,
      { page: 1, pageSize: 100 },
      controller.signal,
    )
      .then((response) => {
        setMessages(response.items);
        setConversations((current) =>
          current.map((item) =>
            item.id === selectedId ? { ...item, unreadCount: 0 } : item,
          ),
        );
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        toast.error(
          getApiError(
            requestError,
            'Não foi possível carregar as mensagens.',
          ).message,
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingThread(false);
      });
    return () => controller.abort();
  }, [selectedId, version]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, loadingThread]);

  const selected = useMemo(
    () => conversations.find((item) => item.id === selectedId) || null,
    [conversations, selectedId],
  );

  const chooseConversation = (conversation: MarketplaceConversationSummary) => {
    setSelectedId(conversation.id);
    navigate(
      `/marketplace/mensagens?conversation=${encodeURIComponent(conversation.id)}`,
    );
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const contentText = draft.trim();
    if (!selected || !contentText || selected.closedAt) return;
    setSending(true);
    try {
      const created = await sendMarketplaceCustomerMessage(
        selected.id,
        contentText,
      );
      setMessages((current) => [...current, created]);
      setDraft('');
      setConversations((current) =>
        current
          .map((item) =>
            item.id === selected.id
              ? {
                  ...item,
                  lastMessage: created,
                  lastMessageAt: created.createdAt,
                }
              : item,
          )
          .sort(
            (left, right) =>
              new Date(right.lastMessageAt || right.createdAt).getTime() -
              new Date(left.lastMessageAt || left.createdAt).getTime(),
          ),
      );
    } catch (requestError) {
      toast.error(
        getApiError(requestError, 'Não foi possível enviar a mensagem.').message,
      );
    } finally {
      setSending(false);
    }
  };

  if (loadingList && !conversations.length) {
    return (
      <div className="marketplace-account-state">
        <LoaderCircle className="is-spinning" aria-hidden="true" />
        <p>Carregando conversas…</p>
      </div>
    );
  }

  if (error && !conversations.length) {
    return (
      <div className="marketplace-account-state marketplace-account-state--error">
        <MessageCircle aria-hidden="true" />
        <p>{error}</p>
        <button type="button" onClick={() => setVersion((value) => value + 1)}>
          <RefreshCw aria-hidden="true" /> Tentar novamente
        </button>
      </div>
    );
  }

  if (!conversations.length) {
    const pointSlug = requestedPointSlug();
    return (
      <div className="marketplace-account-state">
        <MessageCircle aria-hidden="true" />
        <h2>Nenhuma conversa ainda</h2>
        <p>
          As conversas são abertas a partir de uma solicitação enviada para o
          responsável pelo ponto.
        </p>
        <button
          type="button"
          onClick={() => navigate(pointSlug ? `/pontos/${encodeURIComponent(pointSlug)}` : '/buscar')}
        >
          {pointSlug ? 'Voltar ao ponto' : 'Explorar pontos'}
        </button>
      </div>
    );
  }

  return (
    <div className="marketplace-chat-layout">
      <aside className="marketplace-chat-list">
        <div className="marketplace-chat-list__search">
          <Search aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por ponto ou empresa"
            aria-label="Buscar conversas"
          />
          <button
            type="button"
            onClick={() => setVersion((value) => value + 1)}
            aria-label="Atualizar conversas"
            title="Atualizar"
          >
            <RefreshCw className={loadingList ? 'is-spinning' : ''} aria-hidden="true" />
          </button>
        </div>
        <div className="marketplace-chat-list__items">
          {conversations.map((conversation) => {
            const cover =
              resolveUploadsUrl(conversation.point.coverUrl) ||
              conversation.point.coverUrl;
            return (
              <button
                type="button"
                key={conversation.id}
                className={selectedId === conversation.id ? 'is-active' : ''}
                onClick={() => chooseConversation(conversation)}
              >
                <span className="marketplace-chat-list__cover">
                  {cover ? (
                    <img src={cover} alt="" loading="lazy" />
                  ) : (
                    <MapPin aria-hidden="true" />
                  )}
                </span>
                <span className="marketplace-chat-list__copy">
                  <strong>{conversation.point.name}</strong>
                  <small>
                    {conversation.company?.name || 'Responsável pelo ponto'}
                  </small>
                  <span>
                    {conversation.lastMessage?.contentText ||
                      'Conversa iniciada pela solicitação'}
                  </span>
                </span>
                {conversation.unreadCount > 0 ? (
                  <b aria-label={`${conversation.unreadCount} mensagens não lidas`}>
                    {conversation.unreadCount}
                  </b>
                ) : null}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="marketplace-chat-thread">
        {selected ? (
          <>
            <header className="marketplace-chat-thread__header">
              <div className="marketplace-chat-thread__partner">
                <span>
                  {selected.company?.logoUrl ? (
                    <img
                      src={
                        resolveUploadsUrl(selected.company.logoUrl) ||
                        selected.company.logoUrl
                      }
                      alt=""
                    />
                  ) : (
                    <Building2 aria-hidden="true" />
                  )}
                </span>
                <div>
                  <strong>{selected.point.name}</strong>
                  <small>
                    {selected.company?.name || 'Responsável pelo ponto'} ·{' '}
                    {selected.inquiry.statusLabel}
                  </small>
                </div>
              </div>
              <div className="marketplace-chat-thread__period">
                <CalendarDays aria-hidden="true" />
                <span>
                  {selected.inquiry.startDate && selected.inquiry.endDate
                    ? `${dateFormatter.format(new Date(selected.inquiry.startDate))} a ${dateFormatter.format(new Date(selected.inquiry.endDate))}`
                    : 'Período sob consulta'}
                </span>
              </div>
            </header>

            <div className="marketplace-chat-thread__messages" aria-live="polite">
              {loadingThread ? (
                <div className="marketplace-chat-thread__loading">
                  <LoaderCircle className="is-spinning" aria-hidden="true" />
                  Carregando mensagens…
                </div>
              ) : messages.length ? (
                messages.map((message) => (
                  <ConversationMessage key={message.id} message={message} />
                ))
              ) : (
                <div className="marketplace-chat-thread__empty">
                  Envie a primeira mensagem ao responsável pelo ponto.
                </div>
              )}
              <div ref={threadEndRef} />
            </div>

            <form className="marketplace-chat-composer" onSubmit={sendMessage}>
              {selected.closedAt ? (
                <p>Esta conversa foi encerrada e está disponível somente para consulta.</p>
              ) : (
                <>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Digite sua mensagem…"
                    maxLength={4000}
                    rows={2}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    aria-label="Enviar mensagem"
                  >
                    {sending ? (
                      <LoaderCircle className="is-spinning" aria-hidden="true" />
                    ) : (
                      <Send aria-hidden="true" />
                    )}
                    Enviar
                  </button>
                </>
              )}
            </form>
          </>
        ) : null}
      </section>
    </div>
  );
}
