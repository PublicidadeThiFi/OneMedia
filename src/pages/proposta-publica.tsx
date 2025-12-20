import { useEffect, useMemo, useState } from 'react';

type PublicProposalItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  startDate?: string | null;
  endDate?: string | null;
};

type PublicProposalResponse = {
  id: string;
  title: string | null;
  status: string;
  totalAmount: number;
  discountAmount: number | null;
  discountPercent: number | null;
  conditionsText: string | null;
  validUntil: string | null;
  publicHash: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  client: {
    id: string;
    name: string | null;
    contactName: string | null;
    companyName: string | null;
    email: string | null;
  };
  items: PublicProposalItem[];
  createdAt: string;
  updatedAt: string;
};

function resolveApiBaseUrl() {
  const env = (import.meta as any).env || {};
  let base: string =
    env.VITE_API_URL ||
    env.VITE_API_BASE_URL ||
    env.VITE_BACKEND_URL ||
    env.VITE_SERVER_URL ||
    'http://localhost:3333';

  base = String(base).trim();
  base = base.replace(/\/$/, '');

  // Allow either "http://host:3333" or "http://host:3333/api"
  if (!/\/api$/.test(base)) {
    base = `${base}/api`;
  }

  return base;
}

async function safeCopy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }
}

export default function PropostaPublica({ publicHash }: { publicHash: string }) {
  const [proposal, setProposal] = useState<PublicProposalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [reason, setReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const apiBase = useMemo(() => resolveApiBaseUrl(), []);
  const decisionToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('t');
  }, [publicHash]);

  const canDecide = !!decisionToken;

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!publicHash) {
          setError('Link inválido');
          return;
        }

        const res = await fetch(`${apiBase}/public/proposals/${encodeURIComponent(publicHash)}`);
        if (!res.ok) {
          const msg = res.status === 404 ? 'Proposta não encontrada' : 'Erro ao carregar proposta';
          throw new Error(msg);
        }
        const data = (await res.json()) as PublicProposalResponse;
        setProposal(data);
      } catch (e: any) {
        setError(e?.message || 'Erro ao carregar proposta');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [apiBase, publicHash]);

  const handleApprove = async () => {
    if (!decisionToken) return;

    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch(`${apiBase}/public/proposals/${encodeURIComponent(publicHash)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: decisionToken,
          signerName: signerName.trim() || undefined,
          signerEmail: signerEmail.trim() || undefined,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.message || 'Não foi possível aprovar a proposta');
      }

      setActionSuccess('Proposta aprovada com sucesso.');
      // refresh
      const refreshed = await fetch(`${apiBase}/public/proposals/${encodeURIComponent(publicHash)}`);
      if (refreshed.ok) setProposal(await refreshed.json());
    } catch (e: any) {
      setActionError(e?.message || 'Erro ao aprovar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!decisionToken) return;

    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch(`${apiBase}/public/proposals/${encodeURIComponent(publicHash)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: decisionToken,
          reason: reason.trim() || undefined,
          signerName: signerName.trim() || undefined,
          signerEmail: signerEmail.trim() || undefined,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.message || 'Não foi possível recusar a proposta');
      }

      setActionSuccess('Proposta recusada.');
      // refresh
      const refreshed = await fetch(`${apiBase}/public/proposals/${encodeURIComponent(publicHash)}`);
      if (refreshed.ok) setProposal(await refreshed.json());
    } catch (e: any) {
      setActionError(e?.message || 'Erro ao recusar');
    } finally {
      setActionLoading(false);
    }
  };

  const viewOnlyLink = useMemo(() => `${window.location.origin}/p/${publicHash}`, [publicHash]);

  const sumItems = useMemo(() => {
    if (!proposal?.items) return 0;
    return proposal.items.reduce((acc, it) => acc + (Number(it.totalPrice) || 0), 0);
  }, [proposal]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl w-full">
          <div className="text-xl font-semibold">Carregando proposta…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl w-full space-y-3">
          <div className="text-xl font-semibold">Não foi possível abrir a proposta</div>
          <div className="text-sm text-muted-foreground">{error}</div>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return null;
  }

  const statusLabel = proposal.status;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm text-gray-500">Proposta</div>
              <h1 className="text-2xl font-semibold">{proposal.title || '—'}</h1>
              <div className="text-sm text-gray-600 mt-1">
                Cliente: <span className="font-medium">{proposal.client?.name || '—'}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium">
                {statusLabel}
              </div>
              {proposal.validUntil && (
                <div className="text-xs text-gray-500 mt-2">
                  Válida até: {new Date(proposal.validUntil).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-xs text-gray-500">Total</div>
              <div className="text-lg font-semibold">
                {Number(proposal.totalAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-xs text-gray-500">Itens (soma)</div>
              <div className="text-lg font-semibold">
                {Number(sumItems).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-xs text-gray-500">Desconto</div>
              <div className="text-lg font-semibold">
                {proposal.discountAmount
                  ? Number(proposal.discountAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : proposal.discountPercent
                    ? `${proposal.discountPercent}%`
                    : '—'}
              </div>
            </div>
          </div>

          {proposal.conditionsText && (
            <div className="mt-6">
              <div className="text-sm font-medium">Condições</div>
              <div className="text-sm text-gray-700 whitespace-pre-line mt-2">{proposal.conditionsText}</div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Itens</div>
              <div className="text-sm text-gray-500">{proposal.items?.length || 0} item(ns)</div>
            </div>
          </div>

          <div className="mt-4 divide-y">
            {proposal.items?.map((item) => (
              <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="font-medium">{item.description}</div>
                  <div className="text-sm text-gray-500">
                    Qtd: {item.quantity} • Unit.:{' '}
                    {Number(item.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
                <div className="font-semibold">
                  {Number(item.totalPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">Decisão</div>
              <div className="text-sm text-gray-500">
                {canDecide
                  ? 'Este link permite aprovar ou recusar.'
                  : 'Este link é apenas para visualização. Para aprovar/recusar, use o link com token.'}
              </div>
            </div>

            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:opacity-90"
              onClick={async () => {
                const ok = await safeCopy(viewOnlyLink);
                setActionSuccess(ok ? 'Link de visualização copiado.' : 'Não foi possível copiar.');
              }}
            >
              Copiar link (visualização)
            </button>
          </div>

          {canDecide && proposal.status === 'ENVIADA' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                className="border rounded-xl px-3 py-2 text-sm"
                placeholder="Seu nome (opcional)"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
              <input
                className="border rounded-xl px-3 py-2 text-sm"
                placeholder="Seu e-mail (opcional)"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
              />
              <input
                className="border rounded-xl px-3 py-2 text-sm"
                placeholder="Motivo da recusa (opcional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}

          {actionError && <div className="text-sm text-red-600">{actionError}</div>}
          {actionSuccess && <div className="text-sm text-green-700">{actionSuccess}</div>}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              disabled={!canDecide || actionLoading || proposal.status !== 'ENVIADA'}
              className="flex-1 px-4 py-3 rounded-xl bg-green-600 text-white font-medium disabled:opacity-50"
              onClick={handleApprove}
            >
              {actionLoading ? 'Processando…' : 'Aprovar'}
            </button>
            <button
              type="button"
              disabled={!canDecide || actionLoading || proposal.status !== 'ENVIADA'}
              className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium disabled:opacity-50"
              onClick={handleReject}
            >
              {actionLoading ? 'Processando…' : 'Recusar'}
            </button>
          </div>

          {!canDecide && (
            <div className="text-xs text-gray-500">
              Dica: se você recebeu apenas o link de visualização, peça o link de decisão (com token).
            </div>
          )}

          {proposal.status !== 'ENVIADA' && (
            <div className="text-xs text-gray-500">
              Status atual: {proposal.status}. A decisão pública está habilitada apenas enquanto a proposta estiver ENVIADA.
            </div>
          )}
        </div>

        <div className="text-xs text-gray-400 text-center pb-4">
          Este é um link público. Não compartilhe o link de decisão (com token) com pessoas não autorizadas.
        </div>
      </div>
    </div>
  );
}
