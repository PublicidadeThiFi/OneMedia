import { useEffect, useMemo, useState } from 'react';
import { Copy, Link as LinkIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent } from '../ui/dialog';
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

function formatDateBR(value: any): string {
  if (!value) return '—';
  const d = new Date(value as any);
  if (Number.isNaN(d.getTime())) return '—';
  // Usa a parte YYYY-MM-DD (UTC) para evitar o bug de "-1 dia" por timezone.
  const [y, m, dd] = d.toISOString().split('T')[0].split('-');
  return `${dd}/${m}/${y}`;
}

function formatDateTimeBR(value: any): string {
  if (!value) return '—';
  const d = new Date(value as any);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return d.toLocaleString('pt-BR');
  } catch {
    return '—';
  }
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

  useEffect(() => {
    // Debug: log when the drawer receives a proposal
    // eslint-disable-next-line no-console
    console.debug('ProposalDetailsDrawer mounted/render, proposal=', proposal, 'open=', open);
  }, [proposal?.id, open]);

  // IMPORTANT: This component is used as an in-page view (not a modal).
  // It must NEVER fire extra authenticated requests on open just to resolve names.
  // Those extra calls (/clients/:id, /users/:id) were causing 401 refresh flows and
  // blank screens. We only render what we already have in the proposal payload.

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
    setLinkError(null);
    setLinkMessage(null);
    setPdfError(null);

    setPublicHash(p.publicHash ?? p.public_hash ?? null);

  }, [proposal?.id, open]);

  const clientName = useMemo(() => {
    return (
      p.clientName ||
      proposal?.client?.companyName ||
      proposal?.client?.contactName ||
      (proposal as any)?.client?.companyName ||
      (proposal as any)?.client?.contactName ||
      '-'
    );
  }, [proposal, p.clientName]);

  const clientContact = useMemo(() => {
    // If we have both company and contact, show contact on a second line.
    const company = proposal?.client?.companyName ?? (proposal as any)?.client?.companyName;
    const contact = proposal?.client?.contactName ?? (proposal as any)?.client?.contactName;
    if (company && contact) return contact;
    return null;
  }, [proposal]);

  const responsibleName = useMemo(() => {
    return (
      p.responsibleUserName ||
      proposal?.responsibleUser?.name ||
      (proposal as any)?.responsibleUser?.name ||
      '-'
    );
  }, [proposal, p.responsibleUserName]);

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

  // Guard against environments where `window` does not exist (e.g. SSR builds).
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const viewUrl = useMemo(() => (publicHash && origin ? `${origin}/p/${publicHash}` : null), [publicHash, origin]);

  const messageUrl = useMemo(() => {
    if (!publicHash || !messageToken || !origin) return null;
    return `${origin}/p/${publicHash}?m=${encodeURIComponent(messageToken)}`;
  }, [publicHash, messageToken, origin]);

  const decisionUrl = useMemo(() => {
    if (!publicHash || !decisionToken || !origin) return null;
    return `${origin}/p/${publicHash}?t=${encodeURIComponent(decisionToken)}`;
  }, [publicHash, decisionToken, origin]);

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

      const hash = publicHash || (proposal as any).publicHash || (proposal as any).public_hash || null;
      const endpoint = hash ? `/public/proposals/${hash}/pdf` : `/proposals/${proposal.id}/pdf/file`;

      const res = await apiClient.get<Blob>(endpoint, {
        responseType: 'blob',
      });

      const cd = (res.headers?.['content-disposition'] || res.headers?.['Content-Disposition']) as
        | string
        | undefined;
      const fileName =
        parseFilename(cd) || `proposta-${proposal.id}.pdf`;

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
      setPdfError(e?.response?.data?.message || e?.message || 'Não foi possível baixar o PDF da proposta');
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

      if (!origin) throw new Error('Não foi possível determinar a URL do site.');
      await handleCopy(`${origin}/p/${finalHash}?m=${encodeURIComponent(token)}`, 'Link de mensagens copiado.');
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

      if (!origin) throw new Error('Não foi possível determinar a URL do site.');
      await handleCopy(`${origin}/p/${finalHash}?t=${encodeURIComponent(token)}`, 'Link de decisão copiado.');
    } catch (e: any) {
      setLinkError(e?.response?.data?.message || e?.message || 'Erro ao gerar link de decisão');
    } finally {
      setTokenLoading(false);
    }
  };

  // Keep this component mounted only when open to avoid rendering overhead.
  // The Radix Dialog portal already handles mount/unmount of content, but we
  // additionally guard to keep the parent tree clean.
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 !w-[96vw] !max-w-[1400px] sm:!max-w-[1400px] h-[90vh] overflow-hidden">
        {!proposal ? (
          <div className="p-6">
            <p className="text-gray-600">Sem detalhes disponíveis.</p>
          </div>
        ) : (
          <div className="flex flex-col h-full min-h-0">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center gap-3 min-w-0">
                <h2 className="text-gray-900 truncate">{proposal.title || 'Proposta'}</h2>
                <ProposalStatusBadge status={p.status} />
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
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
                {clientName}
              </p>
              {clientContact && <p className="text-sm text-gray-600">{clientContact}</p>}
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Responsável</p>
              <p className="text-gray-900">{responsibleName}</p>
            </div>

            {p.startDate && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Data de início</p>
                <p className="text-gray-900">{formatDateBR(p.startDate)}</p>
              </div>
            )}

            {typeof proposal.assemblyMaxDays === 'number' && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Período máximo de montagem</p>
                <p className="text-gray-900">{proposal.assemblyMaxDays} dias</p>
              </div>
            )}

            {proposal.validUntil && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Validade</p>
                <p className="text-gray-900">{formatDateBR(proposal.validUntil)}</p>
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
              {items.map((item, idx) => (
                <div key={item.id ?? `${item.description ?? 'item'}-${idx}`} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-gray-900 flex-1">{item.description || 'Item'}</p>
                    {(() => {
                      const qty = Math.max(1, toNumber(item.quantity, 1));
                      const dp = toNumber((item as any).discountPercent, 0);
                      const da = toNumber((item as any).discountAmount, 0);
                      const applyTo = ((item as any).discountApplyTo ?? 'TOTAL') as string;

                      const applyToLabel =
                        applyTo === 'RENT' ? 'no aluguel' : applyTo === 'COSTS' ? 'nos custos' : 'no total';

                      const rawUnitPrice = toNumber(item.unitPrice, 0);
                      let rawTotal = qty * rawUnitPrice;

                      let rawRentTotal = 0;
                      let rawUpfrontTotal = 0;

                      const finalTotal = toNumber((item as any).totalPrice ?? (item as any).total ?? rawTotal, 0);

                      // Media items: recompute "orig" usando snapshots (aluguel + custos).
                      if ((item as any).mediaUnitId) {
                        const occDays = toNumber((item as any).occupationDays, 0);
                        const blocks30 = Math.floor(occDays / 30);
                        const blocks15 = Math.round((occDays % 30) / 15);

                        const priceMonth = toNumber((item as any).priceMonthSnapshot, 0);
                        const priceBiweekly = toNumber((item as any).priceBiweeklySnapshot, 0);

                        const prod = toNumber((item as any).productionCostSnapshot, 0);
                        const inst = toNumber((item as any).installationCostSnapshot, 0);
                        const clientProvidesBanner = !!(item as any).clientProvidesBanner;

                        const rentPerUnit = blocks30 * priceMonth + blocks15 * priceBiweekly;
                        const upfrontPerUnit = inst + (clientProvidesBanner ? 0 : prod);

                        rawRentTotal = rentPerUnit * qty;
                        rawUpfrontTotal = upfrontPerUnit * qty;
                        rawTotal = rawRentTotal + rawUpfrontTotal;
                      }

                      const discountValue = Math.max(0, rawTotal - finalTotal);

                      const discountLabel = dp > 0 ? `${dp}%` : da > 0 ? `R$ ${currency(da)}` : null;

                      return (
                        <div className="text-right">
                          <p className="text-gray-900 whitespace-nowrap">R$ {currency(finalTotal)}</p>
                          {discountValue > 0 && rawTotal > 0 ? (
                            <div className="mt-0.5 space-y-0.5">
                              <p className="text-[11px] text-gray-500 whitespace-nowrap">Orig: R$ {currency(rawTotal)}</p>
                              <p className="text-[11px] text-red-600 whitespace-nowrap">
                                Desc{discountLabel ? ` (${discountLabel} ${applyToLabel})` : ` (${applyToLabel})`}: - R$ {currency(discountValue)}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
                    {item.mediaUnitId ? (
                      <>
                        <div>
                          <p className="text-gray-500">Tempo de ocupação</p>
                          <p className="text-gray-700">{item.occupationDays ? `${item.occupationDays} dias` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Cliente fornece lona</p>
                          <p className="text-gray-700">{item.clientProvidesBanner ? 'Sim' : 'Não'}</p>
                        </div>
                      </>
                    ) : (
                      item.startDate && item.endDate && (
                        <div>
                          <p className="text-gray-500">Período</p>
                          <p className="text-gray-700">
                            {formatDateBR(item.startDate)} - {formatDateBR(item.endDate)}
                          </p>
                        </div>
                      )
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

                  {item.mediaUnitId ? (() => {
                    const qty = Math.max(1, toNumber(item.quantity, 1));
                    const occDays = toNumber(item.occupationDays, 0);
                    const blocks30 = Math.floor(occDays / 30);
                    const blocks15 = Math.round((occDays % 30) / 15);

                    const priceMonth = toNumber((item as any).priceMonthSnapshot, 0);
                    const priceBiweekly = toNumber((item as any).priceBiweeklySnapshot, 0);

                    const prod = toNumber((item as any).productionCostSnapshot, 0);
                    const inst = toNumber((item as any).installationCostSnapshot, 0);
                    const clientProvidesBanner = !!(item as any).clientProvidesBanner;

                    const rawRentTotal = (blocks30 * priceMonth + blocks15 * priceBiweekly) * qty;
                    const rawUpfrontTotal = (inst + (clientProvidesBanner ? 0 : prod)) * qty;

                    const dp = toNumber((item as any).discountPercent, 0);
                    const da = toNumber((item as any).discountAmount, 0);
                    const applyTo = ((item as any).discountApplyTo ?? 'TOTAL') as string;

                    const applyDiscount = (base: number) => {
                      let v = base;
                      if (dp > 0) v = v * (1 - dp / 100);
                      if (da > 0) v = v - da;
                      if (!Number.isFinite(v)) v = 0;
                      return Math.max(0, v);
                    };

                    let rentAfter = (item as any).rentTotalSnapshot != null ? toNumber((item as any).rentTotalSnapshot, 0) : null;
                    let upfrontAfter = (item as any).upfrontTotalSnapshot != null ? toNumber((item as any).upfrontTotalSnapshot, 0) : null;

                    if (rentAfter == null || upfrontAfter == null) {
                      if (applyTo === 'TOTAL') {
                        const rawTotal = rawRentTotal + rawUpfrontTotal;
                        const totalAfter = applyDiscount(rawTotal);
                        const factor = rawTotal > 0 ? totalAfter / rawTotal : 0;
                        rentAfter = rawRentTotal * factor;
                        upfrontAfter = rawUpfrontTotal * factor;
                      } else if (applyTo === 'RENT') {
                        rentAfter = applyDiscount(rawRentTotal);
                        upfrontAfter = rawUpfrontTotal;
                      } else if (applyTo === 'COSTS') {
                        upfrontAfter = applyDiscount(rawUpfrontTotal);
                        rentAfter = rawRentTotal;
                      }
                    }

                    const showArrowRent = Math.abs(rawRentTotal - (rentAfter ?? 0)) > 0.009;
                    const showArrowUpfront = Math.abs(rawUpfrontTotal - (upfrontAfter ?? 0)) > 0.009;

                    if (rawRentTotal <= 0 && rawUpfrontTotal <= 0) return null;

                    return (
                      <div className="mt-3 rounded-md bg-gray-50 p-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Aluguel</p>
                            <p className="text-gray-700 whitespace-nowrap">
                              R$ {currency(rawRentTotal)}
                              {showArrowRent ? ` → R$ ${currency(rentAfter)}` : ''}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Custos (produção/instalação)</p>
                            <p className="text-gray-700 whitespace-nowrap">
                              R$ {currency(rawUpfrontTotal)}
                              {showArrowUpfront ? ` → R$ ${currency(upfrontAfter)}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })() : null}
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

          {/* Proposta */}
          <div className="pt-4 border-t">
            <h3 className="text-gray-900 mb-3">Proposta (PDF)</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={pdfLoading}
                onClick={handleDownloadContract}
              >
                {pdfLoading ? 'Baixando…' : 'Baixar proposta (PDF)'}
              </Button>
            </div>
            {pdfError && <p className="mt-2 text-sm text-red-600">{pdfError}</p>}
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500">Criado em {formatDateTimeBR(p.createdAt)}</p>
          </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
