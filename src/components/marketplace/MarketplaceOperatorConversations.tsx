import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Building2,
  CalendarDays,
  LoaderCircle,
  MapPin,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { resolveUploadsUrl } from '../../lib/format';
import {
  fetchMarketplaceOperatorConversations,
  fetchMarketplaceOperatorMessages,
  sendMarketplaceOperatorMessage,
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

function errorMessage(error: unknown) {
  const responseMessage = (error as any)?.response?.data?.message;
  if (Array.isArray(responseMessage)) return responseMessage.join(' ');
  return String(responseMessage || 'Não foi possível concluir a ação.');
}

function requestedConversationId() {
  return new URLSearchParams(window.location.search).get('marketplaceConversation');
}

function OperatorMessage({ message }: { message: MarketplaceConversationMessage }) {
  if (message.senderKind === 'SYSTEM') {
    return (
      <div className="mx-auto max-w-xl rounded-lg bg-slate-100 px-4 py-2 text-center text-sm text-slate-600">
        <p className="whitespace-pre-wrap">{message.contentText}</p>
        <time className="mt-1 block text-xs text-slate-400">
          {dateTimeFormatter.format(new Date(message.createdAt))}
        </time>
      </div>
    );
  }
  const own = message.senderKind === 'BUSINESS';
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <article
        className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${
          own
            ? 'rounded-br-md bg-indigo-600 text-white'
            : 'rounded-bl-md border border-gray-200 bg-white text-gray-900'
        }`}
      >
        <strong className={`block text-xs ${own ? 'text-indigo-100' : 'text-gray-500'}`}>
          {message.senderName}
        </strong>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.contentText}</p>
        <time className={`mt-2 block text-right text-[11px] ${own ? 'text-indigo-100' : 'text-gray-400'}`}>
          {dateTimeFormatter.format(new Date(message.createdAt))}
        </time>
      </article>
    </div>
  );
}

export function MarketplaceOperatorConversations() {
  const [conversations, setConversations] = useState<MarketplaceConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MarketplaceConversationMessage[]>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [version, setVersion] = useState(0);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingList(true);
    fetchMarketplaceOperatorConversations(
      { q: debouncedQuery || undefined, page: 1, pageSize: 100 },
      controller.signal,
    )
      .then((response) => {
        setConversations(response.items);
        const requested = requestedConversationId();
        setSelectedId((current) => {
          if (requested && response.items.some((item) => item.id === requested)) {
            return requested;
          }
          if (current && response.items.some((item) => item.id === current)) return current;
          return response.items[0]?.id || null;
        });
      })
      .catch((error) => {
        if ((error as any)?.code === 'ERR_CANCELED') return;
        toast.error(errorMessage(error));
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
    fetchMarketplaceOperatorMessages(
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
      .catch((error) => {
        if ((error as any)?.code === 'ERR_CANCELED') return;
        toast.error(errorMessage(error));
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

  const selectConversation = (conversation: MarketplaceConversationSummary) => {
    setSelectedId(conversation.id);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'marketplace');
    params.set('marketplaceConversation', conversation.id);
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', next);
    window.dispatchEvent(new Event('app:navigation'));
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const contentText = draft.trim();
    if (!selected || !contentText || selected.closedAt) return;
    setSending(true);
    try {
      const created = await sendMarketplaceOperatorMessage(selected.id, contentText);
      setMessages((current) => [...current, created]);
      setDraft('');
      setConversations((current) =>
        current
          .map((item) =>
            item.id === selected.id
              ? { ...item, lastMessage: created, lastMessageAt: created.createdAt }
              : item,
          )
          .sort(
            (left, right) =>
              new Date(right.lastMessageAt || right.createdAt).getTime() -
              new Date(left.lastMessageAt || left.createdAt).getTime(),
          ),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50 p-4 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600">Marketplace OneMedia</p>
          <h2 className="mt-1 text-2xl font-semibold text-gray-950">Conversas com anunciantes</h2>
          <p className="mt-1 text-sm text-gray-600">
            Responda às mensagens vinculadas às solicitações recebidas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVersion((value) => value + 1)}
          disabled={loadingList}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar anunciante ou ponto"
                className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingList && !conversations.length ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Carregando…
              </div>
            ) : conversations.length ? (
              <div className="divide-y divide-gray-100">
                {conversations.map((conversation) => {
                  const active = conversation.id === selectedId;
                  const cover = resolveUploadsUrl(conversation.point.coverUrl) || conversation.point.coverUrl;
                  return (
                    <button
                      type="button"
                      key={conversation.id}
                      onClick={() => selectConversation(conversation)}
                      className={`flex w-full gap-3 p-4 text-left transition ${
                        active ? 'bg-indigo-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-xl bg-gray-100 text-gray-400">
                        {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <MapPin className="h-5 w-5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <strong className="truncate text-sm text-gray-950">
                            {conversation.customer?.name || 'Anunciante'}
                          </strong>
                          {conversation.unreadCount > 0 ? (
                            <b className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] text-white">
                              {conversation.unreadCount}
                            </b>
                          ) : null}
                        </span>
                        <small className="mt-0.5 block truncate text-xs text-gray-500">
                          {conversation.point.name}
                        </small>
                        <span className="mt-1 block truncate text-xs text-gray-600">
                          {conversation.lastMessage?.contentText || 'Conversa iniciada'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <MessageSquareText className="h-9 w-9 text-gray-300" />
                <h3 className="mt-3 font-semibold text-gray-900">Nenhuma conversa</h3>
                <p className="mt-1 text-sm text-gray-500">
                  As conversas aparecerão quando houver solicitações no Marketplace.
                </p>
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {selected ? (
            <>
              <header className="flex flex-col gap-3 border-b border-gray-200 p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-950">
                      {selected.customer?.name || 'Anunciante'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selected.point.name} · {selected.inquiry.statusLabel}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    {selected.inquiry.startDate && selected.inquiry.endDate
                      ? `${dateFormatter.format(new Date(selected.inquiry.startDate))} a ${dateFormatter.format(new Date(selected.inquiry.endDate))}`
                      : 'Período sob consulta'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-4 w-4" /> Marketplace
                  </span>
                </div>
              </header>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5">
                {loadingThread ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Carregando mensagens…
                  </div>
                ) : messages.length ? (
                  messages.map((message) => <OperatorMessage key={message.id} message={message} />)
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    Envie a primeira mensagem ao anunciante.
                  </div>
                )}
                <div ref={threadEndRef} />
              </div>

              <form onSubmit={send} className="border-t border-gray-200 p-4">
                {selected.closedAt ? (
                  <p className="rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
                    Esta conversa foi encerrada e está disponível somente para consulta.
                  </p>
                ) : (
                  <div className="flex items-end gap-3">
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Digite sua mensagem…"
                      rows={2}
                      maxLength={4000}
                      disabled={sending}
                      className="min-h-[54px] flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    <button
                      type="submit"
                      disabled={sending || !draft.trim()}
                      className="inline-flex h-[54px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Enviar
                    </button>
                  </div>
                )}
              </form>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <MessageSquareText className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">Selecione uma conversa.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
