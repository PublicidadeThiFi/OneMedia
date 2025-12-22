import { useEffect, useMemo, useState } from 'react';
import { X, Calendar, User, DollarSign, Package, Link as LinkIcon, Copy, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Proposal } from '../../types';
import { ProposalStatusBadge } from './ProposalStatusBadge';
import { useNavigation } from '../../App';
import { apiClient } from '../../lib/apiClient';
import {
  getClientById,
  getUserById,
  getItemsForProposal,
  getCampaignForProposal,
  getBillingStatusForProposal,
  getMediaUnitById,
  getProductById,
} from '../../lib/mockData';

interface ProposalDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Proposal | null;
}

async function safeCopy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
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

export function ProposalDetailsDrawer({ open, onOpenChange, proposal }: ProposalDetailsDrawerProps) {
  const navigate = useNavigation();
  const [publicHash, setPublicHash] = useState<string | null>(proposal?.publicHash ?? null);
  const [decisionToken, setDecisionToken] = useState<string | null>(null);
  const [messageToken, setMessageToken] = useState<string | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Sync when switching proposals
  useEffect(() => {
    if (!proposal) return;
    setPublicHash(proposal.publicHash ?? null);
    setDecisionToken(null);
    setMessageToken(null);
    setLinkMessage(null);
    setLinkError(null);
    setTokenLoading(false);
  }, [proposal?.id]);

  const viewUrl = useMemo(() => {
    if (!publicHash) return null;
    return `${window.location.origin}/p/${publicHash}`;
  }, [publicHash]);

  const messageUrl = useMemo(() => {
    if (!viewUrl || !messageToken) return null;
    return `${viewUrl}?m=${encodeURIComponent(messageToken)}`;
  }, [viewUrl, messageToken]);

  const decisionUrl = useMemo(() => {
    if (!viewUrl || !decisionToken) return null;
    return `${viewUrl}?t=${encodeURIComponent(decisionToken)}`;
  }, [viewUrl, decisionToken]);

  if (!proposal) return null;

  const client = getClientById(proposal.clientId);
  const user = getUserById(proposal.responsibleUserId);
  const items = getItemsForProposal(proposal.id);
  const campaign = getCampaignForProposal(proposal.id);
  const billingStatus = getBillingStatusForProposal(proposal.id);

  const handleCopyView = async () => {
    setLinkMessage(null);
    setLinkError(null);

    if (!viewUrl) {
      setLinkError('Esta proposta ainda não tem link público. Envie a proposta (status ENVIADA) e gere o link.');
      return;
    }

    const ok = await safeCopy(viewUrl);
    if (ok) setLinkMessage('Link de visualização copiado.');
    else setLinkError('Não foi possível copiar o link.');
  };

  const handleGenerateMessageLink = async () => {
    setLinkMessage(null);
    setLinkError(null);

    try {
      setMessageLoading(true);
      type PublicMessageTokenResponse = {
        token: string;
        publicHash: string | null;
      };

      const res = await apiClient.get<PublicMessageTokenResponse>(`/proposals/${proposal.id}/public-message-token`);

      const token = res.data.token;
      const hash = res.data.publicHash;
      if (!token) throw new Error('O backend não retornou o token de mensagens.');

      setMessageToken(token);
      if (hash) setPublicHash(hash);

      const finalHash = hash || publicHash;
      if (!finalHash) throw new Error('Não foi possível obter o publicHash da proposta.');

      const finalUrl = `${window.location.origin}/p/${finalHash}?m=${encodeURIComponent(token)}`;
      const ok = await safeCopy(finalUrl);
      setLinkMessage(ok ? 'Link de mensagens copiado.' : 'Token gerado, mas não foi possível copiar.');
    } catch (e: any) {
      setLinkError(e?.response?.data?.message || e?.message || 'Erro ao gerar link de mensagens');
    } finally {
      setMessageLoading(false);
    }
  };

  const handleGenerateDecisionLink = async () => {
    setLinkMessage(null);
    setLinkError(null);

    try {
      setTokenLoading(true);
      type PublicActionTokenResponse = {
        token: string;
        publicHash: string | null;
      };

      const res = await apiClient.get<PublicActionTokenResponse>(
        `/proposals/${proposal.id}/public-action-token`
      );

      const token = res.data.token;
      const hash = res.data.publicHash;


      if (!token) {
        throw new Error('O backend não retornou o token de decisão.');
      }

      setDecisionToken(token);
      if (hash) setPublicHash(hash);

      const finalHash = hash || publicHash;
      if (!finalHash) {
        throw new Error('Não foi possível obter o publicHash da proposta.');
      }

      const finalUrl = `${window.location.origin}/p/${finalHash}?t=${encodeURIComponent(token)}`;
      const ok = await safeCopy(finalUrl);
      setLinkMessage(ok ? 'Link de decisão copiado.' : 'Token gerado, mas não foi possível copiar.');
    } catch (e: any) {
      setLinkError(e?.response?.data?.message || e?.message || 'Erro ao gerar link de decisão');
    } finally {
      setTokenLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[90vh] max-w-3xl mx-auto">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>{proposal.title || 'Sem título'}</DrawerTitle>
              <p className="text-sm text-gray-500 mt-1">ID: ...{proposal.id.slice(-6)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Fechar">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <ProposalStatusBadge status={proposal.status} />
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Valor Total</p>
              <p className="text-gray-900">
                R$ {proposal.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {proposal.discountPercent && proposal.discountPercent > 0 && (
                <p className="text-green-600 text-sm">Desconto: -{proposal.discountPercent}%</p>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Cliente</p>
              <p className="text-gray-900">{client?.companyName || client?.contactName || '-'}</p>
              {client?.companyName && <p className="text-sm text-gray-600">{client.contactName}</p>}
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Responsável</p>
              <p className="text-gray-900">{user?.name || '-'}</p>
            </div>

            {proposal.validUntil && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Validade</p>
                <p className="text-gray-900">{new Date(proposal.validUntil).toLocaleDateString('pt-BR')}</p>
              </div>
            )}

            {proposal.approvedAt && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Data de Aprovação</p>
                <p className="text-gray-900">{new Date(proposal.approvedAt).toLocaleDateString('pt-BR')}</p>
              </div>
            )}
          </div>

          {/* Condições/Observações */}
          {proposal.conditionsText && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Condições / Observações</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">{proposal.conditionsText}</p>
              </div>
            </div>
          )}

          {/* Itens da Proposta */}
          <div>
            <h3 className="text-gray-900 mb-4">Itens da Proposta ({items.length})</h3>
            <div className="space-y-3">
              {items.map((item) => {
                const mediaUnit = item.mediaUnitId ? getMediaUnitById(item.mediaUnitId) : undefined;
                const product = item.productId ? getProductById(item.productId) : undefined;

                return (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-gray-900">{item.description}</p>
                        {mediaUnit && <p className="text-sm text-gray-500">Mídia: {mediaUnit.label}</p>}
                        {product && <p className="text-sm text-gray-500">Produto: {product.name}</p>}
                      </div>
                      <p className="text-gray-900">
                        R$ {item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
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
                        <p className="text-gray-700">{item.quantity}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Preço Unitário</p>
                        <p className="text-gray-700">
                          R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status da Campanha */}
          {campaign && (
            <div>
              <h3 className="text-gray-900 mb-3">Campanha</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-900 mb-1">{campaign.name}</p>
                <p className="text-sm text-gray-600">Status: {campaign.status}</p>
                <p className="text-sm text-gray-600">
                  {new Date(campaign.startDate).toLocaleDateString('pt-BR')} - {new Date(campaign.endDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          )}

          {/* Status Financeiro */}
          {billingStatus && (
            <div>
              <h3 className="text-gray-900 mb-3">Status Financeiro</h3>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-900">
                  Fatura: {billingStatus === 'PAGA' ? 'Paga' : billingStatus === 'ABERTA' ? 'Aberta' : billingStatus}
                </p>
              </div>
            </div>
          )}

          {/* Link Público + Token de Decisão (Nível 2) */}
          <div>
            <h3 className="text-gray-900 mb-3 flex items-center gap-2">
              <LinkIcon className="w-4 h-4" /> Link público
            </h3>

            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="text-sm text-gray-700">
                <div className="flex items-center gap-2 text-gray-900 font-medium">
                  <ShieldCheck className="w-4 h-4" /> Nível 2: token só para decisão
                </div>
                <div className="text-gray-600 mt-1">
                  Envie o link de <span className="font-medium">visualização</span> para leitura.
                  Para aprovar/recusar, envie o link de <span className="font-medium">decisão</span> (com token).
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Visualização</p>
                  <p className="text-sm text-gray-700 font-mono break-all">{viewUrl || '—'}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Mensagens (portal do cliente)</p>
                  <p className="text-sm text-gray-700 font-mono break-all">{messageUrl || '—'}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Decisão (aprovar/recusar)</p>
                  <p className="text-sm text-gray-700 font-mono break-all">{decisionUrl || '—'}</p>
                </div>
              </div>

              {linkError && <p className="text-sm text-red-600">{linkError}</p>}
              {linkMessage && <p className="text-sm text-green-700">{linkMessage}</p>}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/app/messages?proposalId=${proposal.id}`);
                  }}
                >
                  Abrir Mensagens (interno)
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleCopyView}>
                  <Copy className="w-4 h-4 mr-2" /> Copiar link (visualização)
                </Button>

                <Button variant="outline" className="flex-1" onClick={handleGenerateMessageLink} disabled={messageLoading}>
                  {messageLoading ? 'Gerando…' : 'Gerar + copiar link (mensagens)'}
                </Button>

                <Button className="flex-1" onClick={handleGenerateDecisionLink} disabled={tokenLoading}>
                  {tokenLoading ? 'Gerando…' : 'Gerar + copiar link (decisão)'}
                </Button>
              </div>

              <p className="text-xs text-gray-500">
                Observação: a decisão pública só funciona quando a proposta estiver com status <span className="font-medium">ENVIADA</span>.
              </p>
            </div>
          </div>

          {/* TODO: Timeline */}
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500">Criado em {new Date(proposal.createdAt).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
