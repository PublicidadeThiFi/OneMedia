import { useEffect, useMemo, useState } from 'react';
import { Copy, Link as LinkIcon, X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Button } from '../ui/button';
import apiClient from '../../lib/apiClient';
import { Proposal } from '../../types';
import { ProposalStatusBadge } from './ProposalStatusBadge';
import type { Page } from '../MainApp';

type PublicTokenResponse = { token: string; publicHash: string };


interface ProposalDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Proposal | null;
  onNavigate?: (page: Page) => void;
}

function toNumber(value: any, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(',', '.'));
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

async function safeCopy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  }
}

export function ProposalDetailsDrawer({ open, onOpenChange, proposal, onNavigate }: ProposalDetailsDrawerProps) {
  const p: any = proposal ?? {};

  const [client, setClient] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);

  const [publicHash, setPublicHash] = useState<string | null>(null);
  const [messageToken, setMessageToken] = useState<string | null>(null);
  const [decisionToken, setDecisionToken] = useState<string | null>(null);

  const [messageLoading, setMessageLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (!proposal || !open) return;

    setClient(null);
    setUser(null);
    setLinkError(null);
    setLinkMessage(null);
    setPdfError(null);

    setPublicHash(p.publicHash ?? p.public_hash ?? null);

    // carregar cliente / responsável (para exibir nome mesmo se backend não embutir)
    const load = async () => {
      try {
        if (proposal.clientId) {
          const res = await apiClient.get(`/clients/${proposal.clientId}`);
          setClient(res.data);
        }
      } catch {
        // silêncio: fallback para proposal.clientName
      }

      try {
        if (p.responsibleUserId) {
          const res = await apiClient.get(`/users/${p.responsibleUserId}`);
          setUser(res.data);
        }
      } catch {
        // silêncio: fallback para proposal.responsibleUserName
      }
    };

    load();
  }, [proposal?.id, open]);

  const items = useMemo<any[]>(() => {
    if (!proposal) return [];
    const raw = p.items ?? p.proposalItems ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [proposal]);

  const conditionsText = useMemo(() => {
    if (!proposal?.conditionsText) return '';
    return String(proposal.conditionsText).replace(/\\n/g, '\n');
  }, [proposal?.conditionsText]);

  const totalAmount = useMemo(() => toNumber(p.totalAmount, 0), [proposal]);

  const currency = (n: any) =>
    toNumber(n, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const viewUrl = useMemo(() => (publicHash ? `${window.location.origin}/p/${publicHash}` : null), [publicHash]);

  const messageUrl = useMemo(() => {
    if (!publicHash || !messageToken) return null;
    return `${window.location.origin}/p/${publicHash}?m=${encodeURIComponent(messageToken)}`;
  }, [publicHash, messageToken]);

  const decisionUrl = useMemo(() => {
    if (!publicHash || !decisionToken) return null;
    return `${window.location.origin}/p/${publicHash}?t=${encodeURIComponent(decisionToken)}`;
  }, [publicHash, decisionToken]);

  const parseFilename = (contentDisposition?: string | null) => {
    if (!contentDisposition) return null;

    // Examples:
    // content-disposition: attachment; filename="contrato.pdf"
    // content-disposition: attachment; filename*=UTF-8''contrato%20ok.pdf
    const cd = String(contentDisposition);

    const utf8 = cd.match(/filename\*=(?:UTF-8''|)([^;\n]+)/i);
    if (utf8?.[1]) {
      const raw = utf8[1].trim().replace(/^"|"$/g, '');
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }

    const basic = cd.match(/filename=([^;\n]+)/i);
    if (basic?.[1]) return basic[1].trim().replace(/^"|"$/g, '');
    return null;
  };

  const handleDownloadContract = async () => {
    if (!proposal) return;

    try {
      setPdfLoading(true);
      setPdfError(null);

      const res = await apiClient.get(`/proposals/${proposal.id}/pdf/file`, {
        responseType: 'blob',
      });

      const cd = (res.headers?.['content-disposition'] || res.headers?.['Content-Disposition']) as
        | string
        | undefined;
      const fileName =
        parseFilename(cd) || `contrato-${proposal.id}.pdf`;

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setPdfError(e?.response?.data?.message || e?.message || 'Não foi possível baixar o contrato');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCopy = async (url: string | null, okMsg: string) => {
    if (!url) return;
    const ok = await safeCopy(url);
    setLinkError(null);
    setLinkMessage(ok ? okMsg : 'Copie manualmente (não foi possível copiar automaticamente).');
  };

  const handleGenerateMessageLink = async () => {
    if (!proposal) return;
    setLinkMessage(null);
    setLinkError(null);

    try {
      setMessageLoading(true);
      const res = await apiClient.get<PublicTokenResponse>(`/proposals/${proposal.id}/public-message-token`);
      const token = res.data?.token;
      const hash = res.data?.publicHash;

      if (hash) setPublicHash(hash);
      if (token) setMessageToken(token);

      const finalHash = hash ?? publicHash;
      if (!finalHash || !token) throw new Error('Não foi possível gerar o link de mensagens.');

      await handleCopy(`${window.location.origin}/p/${finalHash}?m=${encodeURIComponent(token)}`, 'Link de mensagens copiado.');
    } catch (e: any) {
      setLinkError(e?.response?.data?.message || e?.message || 'Erro ao gerar link de mensagens');
    } finally {
      setMessageLoading(false);
    }
  };

  const handleGenerateDecisionLink = async () => {
    if (!proposal) return;
    setLinkMessage(null);
    setLinkError(null);

    try {
      setTokenLoading(true);
      const res = await apiClient.get<PublicTokenResponse>(`/proposals/${proposal.id}/public-action-token`);
      const token = res.data?.token;
      const hash = res.data?.publicHash;

      if (hash) setPublicHash(hash);
      if (token) setDecisionToken(token);

      const finalHash = hash ?? publicHash;
      if (!finalHash || !token) throw new Error('Não foi possível gerar o link de decisão.');

      await handleCopy(`${window.location.origin}/p/${finalHash}?t=${encodeURIComponent(token)}`, 'Link de decisão copiado.');
    } catch (e: any) {
      setLinkError(e?.response?.data?.message || e?.message || 'Erro ao gerar link de decisão');
    } finally {
      setTokenLoading(false);
    }
  };

  if (!proposal) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <DrawerTitle className="truncate">{proposal.title || 'Proposta'}</DrawerTitle>
            <ProposalStatusBadge status={p.status} />
          </div>

          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4" />
          </Button>
        </DrawerHeader>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Valor Total</p>
              <p className="text-gray-900">R$ {currency(totalAmount)}</p>
              {toNumber(p.discountPercent, 0) > 0 && (
                <p className="text-green-600 text-sm">Desconto: -{toNumber(p.discountPercent, 0)}%</p>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Cliente</p>
              <p className="text-gray-900">
                {client?.companyName ||
                  client?.contactName ||
                  p.clientName ||
                  (proposal as any)?.client?.companyName ||
                  (proposal as any)?.client?.contactName ||
                  '-'}
              </p>
              {client?.companyName && client?.contactName && <p className="text-sm text-gray-600">{client.contactName}</p>}
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Responsável</p>
              <p className="text-gray-900">{user?.name || p.responsibleUserName || '-'}</p>
            </div>

            {(p.startDate || p.endDate) && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Período</p>
                <p className="text-gray-900">
                  {p.startDate ? new Date(p.startDate).toLocaleDateString('pt-BR') : '—'}{' '}
                  até {p.endDate ? new Date(p.endDate).toLocaleDateString('pt-BR') : '—'}
                </p>
              </div>
            )}

            {proposal.validUntil && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Validade</p>
                <p className="text-gray-900">{new Date(proposal.validUntil).toLocaleDateString('pt-BR')}</p>
              </div>
            )}
          </div>

          {/* Condições/Observações */}
          {conditionsText && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Condições / Observações</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-line">{conditionsText}</p>
              </div>
            </div>
          )}

          {/* Itens */}
          <div>
            <h3 className="text-gray-900 mb-4">Itens da Proposta ({items.length})</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id ?? `${item.description}-${Math.random()}`} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-gray-900 flex-1">{item.description || 'Item'}</p>
                    <p className="text-gray-900 whitespace-nowrap">R$ {currency(item.totalPrice ?? item.total)}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    {item.startDate && item.endDate && (
                      <div>
                        <p className="text-gray-500">Período</p>
                        <p className="text-gray-700">
                          {new Date(item.startDate).toLocaleDateString('pt-BR')} - {new Date(item.endDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-gray-500">Quantidade</p>
                      <p className="text-gray-700">{item.quantity ?? 1}</p>
                    </div>

                    <div>
                      <p className="text-gray-500">Preço Unitário</p>
                      <p className="text-gray-700">R$ {currency(item.unitPrice)}</p>
                    </div>
                  </div>
                </div>
              ))}

              {!items.length && <p className="text-sm text-gray-500">Nenhum item adicionado.</p>}
            </div>
          </div>

          {/* Links públicos */}
          <div className="pt-4 border-t">
            <h3 className="text-gray-900 mb-3 flex items-center gap-2">
              <LinkIcon className="w-4 h-4" /> Links públicos
            </h3>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Visualização</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-700 font-mono break-all flex-1">{viewUrl || '—'}</p>
                  <Button size="icon" variant="outline" disabled={!viewUrl} onClick={() => handleCopy(viewUrl, 'Link de visualização copiado.')}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Mensagens (portal do cliente)</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-700 font-mono break-all flex-1">{messageUrl || '—'}</p>
                  <Button
                    size="icon"
                    variant="outline"
                    disabled={!messageUrl}
                    onClick={() => handleCopy(messageUrl, 'Link de mensagens copiado.')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="mt-2">
                  <Button variant="outline" onClick={handleGenerateMessageLink} disabled={messageLoading} className="w-full sm:w-auto">
                    {messageLoading ? 'Gerando…' : 'Gerar link de mensagens'}
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Decisão (aprovar/recusar)</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-700 font-mono break-all flex-1">{decisionUrl || '—'}</p>
                  <Button
                    size="icon"
                    variant="outline"
                    disabled={!decisionUrl}
                    onClick={() => handleCopy(decisionUrl, 'Link de decisão copiado.')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="mt-2">
                  <Button variant="outline" onClick={handleGenerateDecisionLink} disabled={tokenLoading} className="w-full sm:w-auto">
                    {tokenLoading ? 'Gerando…' : 'Gerar link de decisão'}
                  </Button>
                </div>
              </div>

              {linkError && <p className="text-sm text-red-600">{linkError}</p>}
              {linkMessage && <p className="text-sm text-green-700">{linkMessage}</p>}

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    onOpenChange(false);

                    // 1) Troca a tela interna do app para o módulo de Mensagens
                    onNavigate?.('messages');

                    // 2) Sinaliza no URL a proposta alvo (para pré-selecionar a conversa)
                    const url = new URL(window.location.href);
                    url.searchParams.set('proposalId', proposal.id);
                    url.searchParams.delete('campaignId');

                    // Mantém o mesmo pathname (evita depender de rotas /app/messages)
                    const next = `${url.pathname}?${url.searchParams.toString()}`;

                    try {
                      window.history.pushState({}, '', next);
                      window.dispatchEvent(new Event('app:navigation'));
                    } catch {
                      // ignore
                    }
                  }}
                >
                  Ir para Mensagens
                </Button>
              </div>
            </div>
          </div>

          {/* Contrato */}
          <div className="pt-4 border-t">
            <h3 className="text-gray-900 mb-3">Contrato (PDF)</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={p.status !== 'APROVADA' || pdfLoading}
                onClick={handleDownloadContract}
              >
                {pdfLoading ? 'Baixando…' : 'Baixar contrato (PDF)'}
              </Button>
            </div>
            {pdfError && <p className="mt-2 text-sm text-red-600">{pdfError}</p>}
            {p.status !== 'APROVADA' && (
              <p className="mt-2 text-xs text-gray-500">O contrato fica disponível quando a Proposta estiver aprovada.</p>
            )}
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500">Criado em {new Date(p.createdAt).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}