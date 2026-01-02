import { useEffect, useMemo, useRef, useState } from 'react';

type PublicProposal = {
  id: string;
  publicHash: string;
  status: string;
  title: string;
  clientName?: string | null;
  responsibleUserName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  totalAmount: number;
  discountAmount?: number | null;
  discountPercent?: number | null;
  conditionsText?: string | null;
  notes?: string | null;
  validUntil?: string | null;
  messagesCount?: number | null;
  itemsCount?: number | null;
  items?: Array<{
    id: string;
    description?: string | null;
    mediaUnitId?: string | null;
    productId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    quantity?: number | null;
    unitPrice?: number | null;
    totalPrice?: number | null;
    product?: { id: string; name?: string | null } | null;
    mediaUnit?: { id: string; label?: string | null; mediaPointId?: string | null } | null;
  }>;
  createdAt: string;
  updatedAt: string;
  client?: {
    companyName?: string | null;
    contactName?: string | null;
    email?: string | null;
  } | null;
};

function resolveApiBaseUrl() {
  // VITE_API_URL deve apontar para .../api
  const env = (import.meta as any).env || {};
  const base = (env.VITE_API_URL as string | undefined) || 'http://174.129.69.244:3333/api';
  return base.replace(/\/$/, '');
}

export default function PropostaPublica() {
  const publicHash = useMemo(() => {
    // rota: /p/:hash
    const parts = window.location.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p === 'p');
    return idx >= 0 ? parts[idx + 1] : parts[1];
  }, []);

  const apiBase = useMemo(() => resolveApiBaseUrl(), []);

  const messageToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('m');
  }, [publicHash]);

  const decisionToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('t');
  }, [publicHash]);

  const [proposal, setProposal] = useState<PublicProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [comment, setComment] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [messageSendError, setMessageSendError] = useState<string | null>(null);

  const [portalName, setPortalName] = useState('');
  const [portalContact, setPortalContact] = useState('');

  const messagesBoxRef = useRef<HTMLDivElement | null>(null);
  const latestMessagesRef = useRef<any[]>([]);
  latestMessagesRef.current = messages;
  const messagesInFlightRef = useRef(false);

  const canDecide = !!decisionToken;

  useEffect(() => {
    // Prefill do portal (se existir)
    try {
      const name = localStorage.getItem(`portal_name_${publicHash}`);
      const contact = localStorage.getItem(`portal_contact_${publicHash}`);
      if (name) setPortalName(name);
      if (contact) setPortalContact(contact);
    } catch {
      // ignore
    }
  }, [publicHash]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        if (!publicHash) throw new Error('Link inválido (hash ausente).');

        const res = await fetch(`${apiBase}/public/proposals/${encodeURIComponent(publicHash)}`);
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.message || 'Não foi possível carregar a proposta');
        }

        setProposal(json);
      } catch (e: any) {
        setLoadError(e?.message || 'Erro ao carregar proposta');
        setProposal(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [apiBase, publicHash]);

  const fetchPortalMessages = async (opts?: { silent?: boolean }) => {
    try {
      if (!publicHash) return;
      if (messagesInFlightRef.current) return;
      messagesInFlightRef.current = true;
      if (!opts?.silent) {
        setMessagesLoading(true);
        setMessagesError(null);
      }

      const box = messagesBoxRef.current;
      const wasNearBottom = box
        ? box.scrollHeight - box.scrollTop - box.clientHeight < 60
        : true;

      const res = await fetch(
        `${apiBase}/public/proposals/${encodeURIComponent(publicHash)}/messages`
      );
      const json = await res.json().catch(() => []);

      if (!res.ok) {
        throw new Error((json && (json.message || json.error)) || 'Erro ao carregar mensagens');
      }

      const next = Array.isArray(json) ? json : [];
      setMessages(next);

      // Mantém a conversa "ancorada" no final quando o usuário já está no fim.
      requestAnimationFrame(() => {
        const el = messagesBoxRef.current;
        if (el && wasNearBottom) {
          el.scrollTop = el.scrollHeight;
        }
      });
    } catch (e: any) {
      // Evita "piscar" erro durante polling quando já existe conteúdo
      if (!opts?.silent || latestMessagesRef.current.length === 0) {
        setMessagesError(e?.message || 'Erro ao carregar mensagens');
      }
    } finally {
      messagesInFlightRef.current = false;
      if (!opts?.silent) setMessagesLoading(false);
    }
  };

  // Primeira carga de mensagens
  useEffect(() => {
    fetchPortalMessages({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, publicHash]);

  // Polling para atualizar mensagens automaticamente (sem precisar dar refresh)
  useEffect(() => {
    if (!publicHash) return;
    const id = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      fetchPortalMessages({ silent: true });
    }, 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, publicHash]);

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);

      if (!decisionToken) throw new Error('Token ausente.');

      const res = await fetch(`${apiBase}/public/proposals/${encodeURIComponent(publicHash)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: decisionToken,
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          comment: comment.trim(),
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || 'Não foi possível aprovar');
      }

      setActionSuccess('Proposta aprovada com sucesso!');
      setProposal((prev) => (prev ? { ...prev, status: 'APROVADA' } : prev));
    } catch (e: any) {
      setActionError(e?.message || 'Erro ao aprovar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);

      if (!decisionToken) throw new Error('Token ausente.');

      const res = await fetch(`${apiBase}/public/proposals/${encodeURIComponent(publicHash)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: decisionToken,
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          comment: comment.trim(),
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || 'Não foi possível rejeitar');
      }

      setActionSuccess('Proposta rejeitada.');
      setProposal((prev) => (prev ? { ...prev, status: 'REPROVADA' } : prev));
    } catch (e: any) {
      setActionError(e?.message || 'Erro ao rejeitar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendPortalMessage = async () => {
    if (!messageToken) return;
    if (!publicHash) return;

    const name = (portalName || signerName).trim();
    const contact = (portalContact || signerEmail).trim();
    const text = messageText.trim();

    setMessageSendError(null);

    if (!name) {
      setMessageSendError('Informe seu nome para enviar a mensagem.');
      return;
    }
    if (!contact) {
      setMessageSendError('Informe seu e-mail (ou contato) para enviar a mensagem.');
      return;
    }
    if (!text) {
      setMessageSendError('Escreva uma mensagem.');
      return;
    }

    try {
      setMessageSending(true);

      try {
        localStorage.setItem(`portal_name_${publicHash}`, name);
        localStorage.setItem(`portal_contact_${publicHash}`, contact);
      } catch {
        // ignore
      }

      const res = await fetch(`${apiBase}/public/proposals/${encodeURIComponent(publicHash)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: messageToken,
          senderName: name,
          senderContact: contact,
          contentText: text,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || 'Não foi possível enviar a mensagem');
      }

      setMessageText('');

      // refresh (silencioso) — a página também faz polling
      fetchPortalMessages({ silent: true });
    } catch (e: any) {
      setMessageSendError(e?.message || 'Erro ao enviar mensagem');
    } finally {
      setMessageSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Carregando proposta...</div>
      </div>
    );
  }

  if (loadError || !proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm p-6">
          <h1 className="text-xl font-semibold text-gray-900">Proposta indisponível</h1>
          <p className="text-gray-600 mt-2">{loadError || 'Não foi possível carregar a proposta.'}</p>
        </div>
      </div>
    );
  }

  const fmtCurrency = (value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const fmtDate = (value?: string | null) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
  };

  const fmtDateTime = (value?: string | null) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR');
  };

  const items = Array.isArray(proposal.items) ? proposal.items : [];

  const clientName =
    proposal.clientName || proposal.client?.companyName || proposal.client?.contactName || 'Cliente';

  const fmtQuantity = (value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    return String(value);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{proposal.title || 'Proposta'}</h1>
            <p className="text-gray-600 mt-1">Para: {clientName}</p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              proposal.status === 'APROVADA'
                ? 'bg-green-100 text-green-800'
                : proposal.status === 'REPROVADA'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {proposal.status}
          </span>
        </div>

        {/* Detalhes */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Valor total</p>
              <p className="text-lg font-semibold text-gray-900">{fmtCurrency(proposal.totalAmount)}</p>
              {typeof proposal.discountAmount === 'number' && proposal.discountAmount > 0 ? (
                <p className="text-sm text-green-700">
                  Desconto: -{fmtCurrency(proposal.discountAmount)}
                  {proposal.discountPercent ? ` (${proposal.discountPercent}%)` : ''}
                </p>
              ) : proposal.discountPercent ? (
                <p className="text-sm text-green-700">Desconto: -{proposal.discountPercent}%</p>
              ) : null}
            </div>

            <div>
              <p className="text-xs text-gray-500">Validade</p>
              <p className="text-gray-900">{fmtDate(proposal.validUntil)}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Responsável</p>
              <p className="text-gray-900">{proposal.responsibleUserName || '—'}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Período</p>
              <p className="text-gray-900">
                {fmtDate(proposal.startDate)} {proposal.endDate ? `— ${fmtDate(proposal.endDate)}` : ''}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs text-gray-500">Condições</p>
              <p className="text-gray-900 whitespace-pre-wrap">{proposal.conditionsText || '—'}</p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs text-gray-500">Observações</p>
              <p className="text-gray-900 whitespace-pre-wrap">{proposal.notes || '—'}</p>
            </div>

            {items.length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-500">Itens</p>
                <div className="mt-2 divide-y divide-gray-200 rounded-xl border border-gray-100">
                  {items.map((it) => {
                    const title = it.product?.name || it.mediaUnit?.label || it.description || 'Item';
                    const subtitle =
                      it.description && (it.product?.name || it.mediaUnit?.label) ? it.description : null;
                    return (
                      <div key={it.id} className="p-3 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
                          {subtitle ? (
                            <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">{subtitle}</p>
                          ) : null}
                          <p className="text-[11px] text-gray-500 mt-1">
                            {fmtDate(it.startDate)} {it.endDate ? `— ${fmtDate(it.endDate)}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm text-gray-900">x{fmtQuantity(it.quantity ?? 1)}</p>
                          {typeof it.totalPrice === 'number' ? (
                            <p className="text-sm font-semibold text-gray-900">{fmtCurrency(it.totalPrice)}</p>
                          ) : null}
                          {typeof it.unitPrice === 'number' ? (
                            <p className="text-[11px] text-gray-500">{fmtCurrency(it.unitPrice)} / un</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Portal de mensagens */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Mensagens</h2>
              <p className="text-sm text-gray-600 mt-1">Converse com a equipe responsável por esta proposta.</p>
            </div>
            {!messageToken && (
              <div className="text-xs text-gray-500 text-right">
                Somente leitura
                <div>Peça à equipe o link com permissão de mensagens.</div>
              </div>
            )}
          </div>

          <div className="mt-4">
            {messagesLoading ? (
              <div className="text-sm text-gray-500">Carregando mensagens…</div>
            ) : messagesError ? (
              <div className="text-sm text-red-600">{messagesError}</div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-gray-500">Nenhuma mensagem ainda.</div>
            ) : (
              <div ref={messagesBoxRef} className="max-h-80 overflow-y-auto space-y-3 rounded-xl bg-gray-50 p-4">
                {messages.map((m: any) => {
                  const isClient = m?.senderType === 'CLIENTE' || m?.direction === 'IN';
                  return (
                    <div key={m.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                          isClient ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-900'
                        }`}
                      >
                        <div className="text-[11px] opacity-80 mb-1">
                          {m?.senderName || (isClient ? 'Cliente' : 'Equipe')}
                        </div>
                        <div className="whitespace-pre-wrap">{m.contentText}</div>
                        <div className="text-[10px] opacity-70 mt-1">
                          {m.createdAt ? new Date(m.createdAt).toLocaleString('pt-BR') : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {messageToken ? (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Seu nome</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    value={portalName}
                    onChange={(e) => setPortalName(e.target.value)}
                    placeholder="Ex.: João Silva"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Seu e-mail (ou contato)</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    value={portalContact}
                    onChange={(e) => setPortalContact(e.target.value)}
                    placeholder="Ex.: joao@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500">Mensagem</label>
                <textarea
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm min-h-[96px]"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Escreva sua mensagem…"
                />
              </div>

              {messageSendError && <div className="text-sm text-red-600">{messageSendError}</div>}

              <button
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={handleSendPortalMessage}
                disabled={messageSending}
              >
                {messageSending ? 'Enviando…' : 'Enviar mensagem'}
              </button>
            </div>
          ) : null}
        </div>

        {/* Decisão (aprovar/rejeitar) */}
        {canDecide && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900">Ação</h2>
            <p className="text-sm text-gray-600 mt-1">
              Você recebeu um link com permissão para <span className="font-medium">aprovar</span> ou <span className="font-medium">rejeitar</span> esta proposta.
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Seu nome</label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Ex.: João Silva"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Seu e-mail</label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="Ex.: joao@email.com"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs text-gray-500">Comentário (opcional)</label>
              <textarea
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm min-h-[96px]"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Deixe um comentário..."
              />
            </div>

            {actionError && <div className="mt-3 text-sm text-red-600">{actionError}</div>}
            {actionSuccess && <div className="mt-3 text-sm text-green-700">{actionSuccess}</div>}
            {proposal?.status === 'APROVADA' && (
              <a
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                // Use the shorter /pdf alias for maximum compatibility across proxies/rewrite setups.
                href={`${apiBase}/public/proposals/${publicHash}/pdf`}
                target="_blank"
                rel="noreferrer"
              >
                Baixar contrato (PDF)
              </a>
            )}

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                className="inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={handleApprove}
                disabled={actionLoading}
              >
                {actionLoading ? 'Enviando…' : 'Aprovar'}
              </button>
              <button
                className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={handleReject}
                disabled={actionLoading}
              >
                {actionLoading ? 'Enviando…' : 'Rejeitar'}
              </button>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500">
          ID: ...{proposal.id.slice(-6)} • Atualizado em {fmtDateTime(proposal.updatedAt)}
        </div>
      </div>
    </div>
  );
}
