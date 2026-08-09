import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  ImagePlus,
  MapPin,
  MessageSquarePlus,
  Paperclip,
  SendHorizonal,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useAssistant } from '../../contexts/AssistantContext';
import { getAssistantModuleLabel } from '../../lib/assistant';
import type { AssistantActionSuggestion } from '../../types/assistant';
import type { AssistantEntityType } from '../../types/assistant';
import { Button } from '../ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Sheet, SheetContent } from '../ui/sheet';
import { Textarea } from '../ui/textarea';
import { OperationalExceptionCard } from './OperationalExceptionCard';
import { AssistantFeedbackControls } from './AssistantFeedbackControls';
import { ImportReviewTable } from './ImportReviewTable';
import { ImportSummaryCard } from './ImportSummaryCard';
import { ImportExecutionProgress, ImportExecutionResultTable, ImportFailureDetails } from './ImportExecutionPanels';
import { ImportReprocessCard } from './ImportReprocessCard';
import { MediaPlanSummaryCard } from './MediaPlanSummaryCard';
import { MediaPlanVersionCard } from './MediaPlanVersionCard';
import { ProposalDraftChangePreviewCard } from './ProposalDraftChangePreviewCard';
import { ProposalPdfResultCard } from './ProposalPdfResultCard';
import { ProposalTrackingCard } from './ProposalTrackingCard';
import { ProposalSendErrorCard } from './ProposalSendErrorCard';
import { ReservationEligibilityCard } from './ReservationEligibilityCard';
import { ReservationItemCard } from './ReservationItemCard';
import { ExpiringReservationsCard } from './ExpiringReservationsCard';
import { CampaignOperationalSummaryCard } from './CampaignOperationalSummaryCard';
import { CampaignProgressCard } from './CampaignProgressCard';
import { CampaignPendingActionsCard } from './CampaignPendingActionsCard';
import { CampaignOperationalLimitationsCard } from './CampaignOperationalLimitationsCard';
import { CampaignItemCard } from './CampaignItemCard';
import { CampaignTimelineCard } from './CampaignTimelineCard';
import { AutomationPanel } from './AutomationPanel';
import { AssistantStructuredBlocks } from './renderers/AssistantBlockRenderer';
import { AssistantDataPointRenderer } from './renderers/AssistantDataPointRenderer';

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

const entityLabels: Partial<Record<AssistantEntityType, string>> = {
  client: 'cliente',
  city: 'cidade ou região',
  state: 'estado',
  budget: 'orçamento',
  period: 'período',
  start_date: 'data inicial',
  end_date: 'data final',
  media_quantity: 'quantidade de faces',
  media_type: 'tipo de mídia',
  objective: 'objetivo',
  audience: 'público',
};

export function AssistantLauncher() {
  const {
    isOpen,
    isSending,
    messages,
    performAction,
    executeAction,
    resetConversation,
    screenContext,
    sendMessage,
    sendFile,
    consumeQuickReply,
    setIsOpen,
    suggestedPrompts,
    proactivePrompts,
    memorySummary,
    history,
    hasUnreadBriefing,
    pendingEnrichment,
    confirmEnrichmentStep,
    skipEnrichmentStep,
    pendingClientEnrichment,
    confirmClientEnrichmentStep,
    skipClientEnrichmentStep,
    pendingClientReview,
    confirmClientReview,
    skipClientReview,
    importSession, editImportRow, selectImportRows, removeImportRow, confirmImport, cancelImport, retryImport,
  } = useAssistant();
  const [draft, setDraft] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingConfirmationAction, setPendingConfirmationAction] =
    useState<AssistantActionSuggestion | null>(null);
  type FileEntry = { file: File; preview: string };
  const [enrichmentFiles, setEnrichmentFiles] = useState<{
    main: FileEntry | null;
    units: Record<string, FileEntry>;
  }>({ main: null, units: {} });
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [clientFieldValues, setClientFieldValues] = useState<Record<string, unknown>>({});
  const [clientReviewValues, setClientReviewValues] = useState<Record<string, unknown>>({});
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);

  // Limpa form de enriquecimento quando o card fecha
  useEffect(() => {
    if (!pendingEnrichment) {
      setEnrichmentFiles((prev) => {
        if (prev.main) URL.revokeObjectURL(prev.main.preview);
        Object.values(prev.units).forEach((u) => URL.revokeObjectURL(u.preview));
        return { main: null, units: {} };
      });
      setFieldValues({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEnrichment]);

  // Limpa form de enriquecimento de cliente quando o card fecha
  useEffect(() => {
    if (!pendingClientEnrichment) {
      setClientFieldValues({});
    }
  }, [pendingClientEnrichment]);

  // Inicializa form de revisão de cliente com campos extraídos do arquivo
  useEffect(() => {
    if (pendingClientReview) {
      const rec = pendingClientReview.extractedRecord;
      const str = (v: unknown) => (v != null && String(v).trim() ? String(v).trim() : '');
      setClientReviewValues({
        contactName: str(rec.contactName),
        companyName: str(rec.companyName),
        cnpj: str(rec.cnpj),
        email: str(rec.email),
        phone: str(rec.phone),
        role: str(rec.role),
        status: str(rec.status) || 'LEAD',
        addressCity: str(rec.addressCity),
        addressState: str(rec.addressState),
      });
    } else {
      setClientReviewValues({});
    }
  }, [pendingClientReview]);

  const currentModuleLabel = useMemo(
    () => getAssistantModuleLabel(screenContext.currentModule),
    [screenContext.currentModule],
  );

  const visibleHistory = history.slice(0, 4);
  const userMessagesCount = messages.filter((message) => message.role === 'user').length;
  const quickPrompts = (proactivePrompts.length ? proactivePrompts : suggestedPrompts).slice(0, 3);

  useEffect(() => {
    const element = messagesViewportRef.current;
    if (!element) return;
    const raf = window.requestAnimationFrame(() => {
      element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isOpen, isSending, messages.length, showHistory]);

  const handleSubmit = async () => {
    if (isSending) return;
    if (attachedFile) {
      const caption = draft.trim();
      setDraft('');
      setAttachedFile(null);
      await sendFile(attachedFile, caption || undefined);
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed) return;
    setDraft('');
    await sendMessage(trimmed);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setAttachedFile(file);
    // Reset input so same file can be re-selected
    event.target.value = '';
  };

  const handleActionClick = (action: AssistantActionSuggestion) => {
    if (action.requiresConfirmation) {
      setPendingConfirmationAction(action);
      return;
    }

    if (action.type === 'navigate') {
      performAction(action);
      return;
    }

    void executeAction(action, false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed z-[120] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#4F46E5] text-white shadow-[0_18px_40px_rgba(79,70,229,0.30)] transition-transform hover:-translate-y-0.5 hover:bg-[#4338CA] focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2"
        style={{
          right: 'max(1rem, env(safe-area-inset-right))',
          bottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
        aria-label="Abrir assistente OneMedia"
        data-tour="assistant-launcher"
      >
        <Bot className="h-5 w-5" />
        {hasUnreadBriefing && !isOpen && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-[9px] font-bold text-white"
            style={{ animation: 'notification-pulse 2s ease-in-out infinite' }}
          >
            !
          </span>
        )}
      </button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          overlayClassName="bg-slate-950/30 backdrop-blur-[2px]"
          className="!right-2 !top-2 !bottom-2 !h-[calc(100dvh-1rem)] !w-[min(420px,calc(100vw-1rem))] max-w-none overflow-hidden rounded-[28px] border border-slate-200 bg-white p-0 shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
        >
          <div className="flex h-full min-h-0 flex-col bg-white">
            <div className="border-b border-slate-200 bg-white px-5 py-3 pr-12">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4F46E5]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-[15px] font-semibold text-slate-900">
                      Assistente OneMedia
                    </h2>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <span className="truncate rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                      {currentModuleLabel}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs leading-4 text-slate-400">
                    Tire dúvidas, peça resumos e execute ações.
                  </p>
                </div>
              </div>
            </div>

            <div ref={messagesViewportRef} className="min-h-0 flex-1 overflow-y-auto bg-[#F8FAFC] px-4 py-4">
              <AutomationPanel />
              <div className="space-y-4">
                {userMessagesCount === 0 ? (
                  <div className="overflow-hidden rounded-[24px] bg-[#1557D5] text-white shadow-sm">
                    <div className="px-5 py-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
                          <Bot className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-[28px] font-semibold leading-tight">
                            Precisando de ajuda?
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-white/90">
                            Posso explicar a tela atual, resumir dados e ajudar você a agir no sistema.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl bg-white p-3 text-slate-500 shadow-sm">
                        <button
                          type="button"
                          onClick={() => {
                            const prompt = quickPrompts[0] || 'Explique o módulo atual.';
                            void sendMessage(prompt);
                          }}
                          className="flex w-full items-center justify-between gap-3 text-left text-sm"
                        >
                          <span>Pergunte algo sobre a plataforma</span>
                          <ArrowRight className="h-4 w-4 text-slate-300" />
                        </button>
                      </div>

                      {quickPrompts.length ? (
                        <div className="mt-4 space-y-2">
                          {quickPrompts.map((prompt) => (
                            <button
                              key={prompt}
                              type="button"
                              onClick={() => {
                                void sendMessage(prompt);
                              }}
                              className="w-full rounded-xl border border-white/40 px-4 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-white/10"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {memorySummary ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setShowHistory((current) => !current)}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-800">Continuar conversa</div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {memorySummary}
                        </p>
                      </div>
                      {showHistory ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </button>

                    {showHistory && visibleHistory.length ? (
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                        {visibleHistory.map((entry) => (
                          <div key={entry.id} className="rounded-xl bg-slate-50 px-3 py-2">
                            <div className="text-sm text-slate-600">{entry.summary}</div>
                            <div className="mt-1 text-[11px] text-slate-400">
                              {formatTime(entry.createdAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-3 pb-1">
                  {importSession ? <div className="rounded-2xl border border-indigo-200 bg-white p-3 shadow-sm"><ImportSummaryCard session={importSession}/><ImportReviewTable session={importSession} onSelect={selectImportRows} onEdit={editImportRow} onRemove={removeImportRow}/><ImportExecutionProgress session={importSession}/><ImportExecutionResultTable session={importSession}/><ImportFailureDetails session={importSession}/><div className="mt-3 flex flex-wrap gap-2 text-xs">{!['completed','cancelled','executing'].includes(importSession.status)&&<button className="rounded bg-indigo-600 px-3 py-2 text-white disabled:opacity-50" disabled={!importSession.summary.selected} onClick={()=>void confirmImport()}>Confirmar importação</button>}{!['completed','cancelled'].includes(importSession.status)&&<button className="rounded border px-3 py-2" onClick={()=>void cancelImport()}>Cancelar importação</button>}{importSession.rows.some(r=>r.status==='failed')&&<button className="rounded border border-red-200 px-3 py-2 text-red-600" onClick={()=>void retryImport()}>Reprocessar falhas</button>}</div><AssistantFeedbackControls messageId={`import-${importSession.sessionId}-${importSession.version}`}/></div>:null}
                  {importSession ? <ImportReprocessCard session={importSession} onRetry={() => void retryImport()} /> : null}
                  {messages.map((message) => {
                    const isUser = message.role === 'user';
                    return (
                      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[88%] items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                          {!isUser ? (
                            <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4F46E5]">
                              <Bot className="h-4 w-4" />
                            </div>
                          ) : null}

                          <div>
                            <div
                              className={`rounded-2xl px-4 py-3 shadow-sm ${
                                isUser
                                  ? 'rounded-br-md bg-[#4F46E5] text-white'
                                  : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                              }`}
                            >
                              <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                              {!isUser ? <AssistantStructuredBlocks blocks={message.blocks} /> : null}
                              {!isUser && message.mediaPlan ? <MediaPlanSummaryCard plan={message.mediaPlan} /> : null}
                              {!isUser && message.mediaPlanState ? <MediaPlanVersionCard state={message.mediaPlanState} /> : null}
                              {!isUser && message.operationalExceptions?.map((item) => <OperationalExceptionCard key={item.key} item={item} onAsk={(prompt) => void sendMessage(prompt)} />)}

                              {!isUser && message.interpretation?.requiresClarification ? (
                                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-900">
                                  <div className="flex items-center gap-2 text-xs font-semibold">
                                    <AlertTriangle className="h-4 w-4" />
                                    Preciso confirmar alguns dados
                                  </div>
                                  {message.interpretation.missingFields.length ? (
                                    <p className="mt-1.5 text-xs leading-5">
                                      Informe: {message.interpretation.missingFields
                                        .map((field) => entityLabels[field] || field)
                                        .join(', ')}.
                                    </p>
                                  ) : null}
                                  {message.interpretation.ambiguities.map((ambiguity) => (
                                    <div key={`${ambiguity.entityType}-${ambiguity.message}`} className="mt-2">
                                      <p className="text-xs leading-5">{ambiguity.message}</p>
                                      {ambiguity.entityType === 'client' && ambiguity.candidates?.length ? (
                                        <div className="mt-2 space-y-2">
                                          {ambiguity.candidates.map((candidate, candidateIndex) => (
                                            <button
                                              key={candidate.id}
                                              type="button"
                                              disabled={isSending}
                                              onClick={() => void sendMessage(candidateIndex === 0 ? 'A primeira.' : candidateIndex === 1 ? 'A segunda.' : `Seleciono a opção ${candidateIndex + 1}.`)}
                                              className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-left transition-colors hover:border-amber-300 hover:bg-amber-100 disabled:opacity-50"
                                            >
                                              <span className="block text-xs font-semibold text-slate-900">{candidate.label}</span>
                                              {candidate.secondaryLabel ? (
                                                <span className="block text-[11px] text-slate-600">{candidate.secondaryLabel}</span>
                                              ) : null}
                                              <span className="mt-1 block text-[11px] text-slate-500">
                                                {[candidate.city && candidate.state ? `${candidate.city}/${candidate.state}` : candidate.city || candidate.state, candidate.maskedDocument, candidate.status]
                                                  .filter(Boolean)
                                                  .join(' • ')}
                                              </span>
                                            </button>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  ))}
                                  <div className="mt-2 border-t border-amber-200 pt-2 text-[11px] text-amber-700">
                                    <div>Confiança da interpretação: {Math.round(message.interpretation.confidence * 100)}%</div>
                                    {message.interpretation.resolution ? (
                                      <>
                                        <div>
                                          Confiança da resolução: {Math.round(
                                            Math.max(0, ...message.interpretation.resolution.entities.map((entity) => entity.confidence)) * 100,
                                          )}%
                                        </div>
                                        <div>Próxima etapa: {message.interpretation.resolution.nextStep}</div>
                                      </>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 text-[11px] text-amber-700">
                                    Nenhuma ação de escrita será executada até o esclarecimento.
                                  </p>
                                </div>
                              ) : null}

                              {!isUser && message.dataPoints?.length ? <AssistantDataPointRenderer points={message.dataPoints} /> : null}
                              {!isUser ? <AssistantFeedbackControls messageId={message.id} /> : null}

                              {!isUser && message.actions?.length ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {message.actions.slice(0, 3).map((action) => (
                                    <button
                                      key={action.id}
                                      type="button"
                                      onClick={() => handleActionClick(action)}
                                      className={`rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors ${
                                        action.requiresConfirmation
                                          ? 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                          : 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                      }`}
                                    >
                                      {action.label}
                                    </button>
                                  ))}
                                </div>
                              ) : null}

                              {!isUser && message.quickReplies?.length ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {message.quickReplies.map((qr) => (
                                    <button
                                      key={qr.value}
                                      type="button"
                                      disabled={isSending}
                                      onClick={() => void consumeQuickReply(message.id, qr.value)}
                                      className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
                                    >
                                      {qr.label}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>

                            <div
                              className={`mt-1 px-1 text-[11px] ${
                                isUser ? 'text-right text-slate-400' : 'text-slate-400'
                              }`}
                            >
                              {formatTime(message.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isSending ? (
                    <div className="flex justify-start">
                      <div className="flex items-end gap-2">
                        <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4F46E5]">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                          Pensando…
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* ── Área inferior: form de enriquecimento OU barra de input normal ── */}
            {pendingEnrichment ? (
              (() => {
                const isRequired = pendingEnrichment.entityId === '';

                /* helper: renderiza um campo (text, number, select, multiselect) */
                const renderField = (field: (typeof pendingEnrichment.missingFields)[number]) => {
                  if (field.type === 'multiselect' && field.options) {
                    return (
                      <div className="flex flex-wrap gap-1.5">
                        {field.options.map((opt) => {
                          const selected = Array.isArray(fieldValues[field.key])
                            ? (fieldValues[field.key] as string[]).includes(opt)
                            : false;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                setFieldValues((prev) => {
                                  const cur = Array.isArray(prev[field.key]) ? (prev[field.key] as string[]) : [];
                                  return { ...prev, [field.key]: selected ? cur.filter((v) => v !== opt) : [...cur, opt] };
                                })
                              }
                              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                                selected ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    );
                  }
                  if (field.type === 'select' && field.options) {
                    return (
                      <div className="flex flex-wrap gap-1.5">
                        {field.options.map((opt) => {
                          const selected = fieldValues[field.key] === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setFieldValues((prev) => ({ ...prev, [field.key]: selected ? '' : opt }))}
                              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                                selected ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    );
                  }
                  return (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      min={field.type === 'number' ? undefined : undefined}
                      step={field.type === 'number' ? 'any' : undefined}
                      placeholder={field.type === 'number' ? 'ex: -23.5505' : `Informe ${field.label.toLowerCase()}`}
                      value={String(fieldValues[field.key] ?? '')}
                      onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className={`w-full rounded-xl border px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-1 ${
                        isRequired
                          ? 'border-amber-200 focus:border-amber-400 focus:ring-amber-400'
                          : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-400'
                      } bg-white`}
                    />
                  );
                };

                /* valida se todos os campos obrigatórios foram preenchidos */
                const allRequiredFilled = isRequired
                  ? pendingEnrichment.missingFields.every((f) => {
                      const v = fieldValues[f.key];
                      if (v === undefined || v === '' || v === null) return false;
                      if (Array.isArray(v)) return v.length > 0;
                      if (f.type === 'number') return !isNaN(parseFloat(String(v)));
                      return String(v).trim().length > 0;
                    })
                  : true;

                return (
                  <div className={`shrink-0 border-t ${ isRequired ? 'border-amber-100' : 'border-indigo-100'} bg-white`}>
                    {/* Cabeçalho de progresso */}
                    <div className={`flex items-center gap-2 px-4 pt-3 pb-2 ${ isRequired ? 'bg-amber-50/60' : ''}`}>
                      {isRequired && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />}
                      <div className="min-w-0 flex-1">
                        <p className={`text-[10px] font-semibold uppercase tracking-wider ${ isRequired ? 'text-amber-500' : 'text-indigo-400'}`}>
                          {isRequired
                            ? `Dados faltando — ${pendingEnrichment.queuePosition} de ${pendingEnrichment.totalItems}`
                            : `Enriquecer — ${pendingEnrichment.queuePosition} de ${pendingEnrichment.totalItems}`}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                          {pendingEnrichment.entityName}
                        </p>
                      </div>
                      <div className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ isRequired ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {Math.round((pendingEnrichment.queuePosition / pendingEnrichment.totalItems) * 100)}%
                      </div>
                    </div>
                    <div className="mx-4 mb-2 h-1 rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-[width] ${ isRequired ? 'bg-amber-400' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.round((pendingEnrichment.queuePosition / pendingEnrichment.totalItems) * 100)}%` }}
                      />
                    </div>

                    {/* Alerta explicativo quando campos obrigatórios faltam */}
                    {isRequired && (
                      <div className="mx-4 mb-3 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <p className="text-[11px] leading-snug text-amber-700">
                          O PDF não trouxe todos os dados necessários. Preencha os campos abaixo para que o ponto possa ser cadastrado.
                        </p>
                      </div>
                    )}

                    {/* Área scrollável */}
                    <div className="max-h-[260px] overflow-y-auto px-4 pb-1 [scrollbar-width:thin]">

                      {/* ── Modo obrigatório: campos organizados (lat/lon e cidade/estado lado a lado) ── */}
                      {isRequired ? (
                        <div className="space-y-3">
                          {/* Nome do ponto */}
                          {pendingEnrichment.missingFields.find((f) => f.key === 'name') && (() => {
                            const f = pendingEnrichment.missingFields.find((f) => f.key === 'name')!;
                            return (
                              <div>
                                <p className="mb-1 text-xs font-medium text-slate-700">
                                  {f.label} <span className="text-amber-500">*</span>
                                </p>
                                {renderField(f)}
                              </div>
                            );
                          })()}

                          {/* Cidade + Estado lado a lado */}
                          {(pendingEnrichment.missingFields.find((f) => f.key === 'addressCity') ||
                            pendingEnrichment.missingFields.find((f) => f.key === 'addressState')) && (
                            <div className="grid grid-cols-2 gap-2">
                              {pendingEnrichment.missingFields.find((f) => f.key === 'addressCity') && (() => {
                                const f = pendingEnrichment.missingFields.find((f) => f.key === 'addressCity')!;
                                return (
                                  <div>
                                    <p className="mb-1 text-xs font-medium text-slate-700">
                                      {f.label} <span className="text-amber-500">*</span>
                                    </p>
                                    {renderField(f)}
                                  </div>
                                );
                              })()}
                              {pendingEnrichment.missingFields.find((f) => f.key === 'addressState') && (() => {
                                const f = pendingEnrichment.missingFields.find((f) => f.key === 'addressState')!;
                                return (
                                  <div>
                                    <p className="mb-1 text-xs font-medium text-slate-700">
                                      {f.label} <span className="text-amber-500">*</span>
                                    </p>
                                    {renderField(f)}
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {/* Latitude + Longitude lado a lado */}
                          {(pendingEnrichment.missingFields.find((f) => f.key === 'latitude') ||
                            pendingEnrichment.missingFields.find((f) => f.key === 'longitude')) && (
                            <div className="grid grid-cols-2 gap-2">
                              {pendingEnrichment.missingFields.find((f) => f.key === 'latitude') && (() => {
                                const f = pendingEnrichment.missingFields.find((f) => f.key === 'latitude')!;
                                return (
                                  <div>
                                    <p className="mb-1 text-xs font-medium text-slate-700">
                                      {f.label} <span className="text-amber-500">*</span>
                                    </p>
                                    {renderField(f)}
                                  </div>
                                );
                              })()}
                              {pendingEnrichment.missingFields.find((f) => f.key === 'longitude') && (() => {
                                const f = pendingEnrichment.missingFields.find((f) => f.key === 'longitude')!;
                                return (
                                  <div>
                                    <p className="mb-1 text-xs font-medium text-slate-700">
                                      {f.label} <span className="text-amber-500">*</span>
                                    </p>
                                    {renderField(f)}
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {/* Quaisquer outros campos obrigatórios não listados acima */}
                          {pendingEnrichment.missingFields
                            .filter((f) => !['name', 'addressCity', 'addressState', 'latitude', 'longitude'].includes(f.key))
                            .map((field) => (
                              <div key={field.key}>
                                <p className="mb-1 text-xs font-medium text-slate-700">
                                  {field.label} <span className="text-amber-500">*</span>
                                </p>
                                {renderField(field)}
                              </div>
                            ))}
                        </div>
                      ) : (
                        /* ── Modo complementar (pós-criação): fotos + campos opcionais ── */
                        <>
                          {/* Slots de imagem */}
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Fotos</p>
                          <div className="grid grid-cols-3 gap-2">
                            {/* Foto principal */}
                            {(() => {
                              const entry = enrichmentFiles.main;
                              return (
                                <label className="group relative cursor-pointer">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (!f) return;
                                      const preview = URL.createObjectURL(f);
                                      setEnrichmentFiles((prev) => {
                                        if (prev.main) URL.revokeObjectURL(prev.main.preview);
                                        return { ...prev, main: { file: f, preview } };
                                      });
                                      e.target.value = '';
                                    }}
                                  />
                                  <div className="flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition-colors group-hover:border-indigo-400 group-hover:bg-indigo-50">
                                    {entry ? (
                                      <>
                                        <img src={entry.preview} alt="" className="h-full w-full object-cover" />
                                        <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                                          <Check className="h-3 w-3" />
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <Camera className="h-5 w-5 text-slate-300 group-hover:text-indigo-400" />
                                        <span className="mt-1 text-[10px] font-medium text-slate-400 group-hover:text-indigo-500">Foto</span>
                                      </>
                                    )}
                                  </div>
                                </label>
                              );
                            })()}

                            {/* Slots de unidades (faces/telas) */}
                            {pendingEnrichment.units.map((unit) => {
                              const entry = enrichmentFiles.units[unit.actionId];
                              const shortLabel = unit.label.replace(/^cadastrar\s+/i, '');
                              return (
                                <label key={unit.actionId} className="group relative cursor-pointer">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (!f) return;
                                      const preview = URL.createObjectURL(f);
                                      setEnrichmentFiles((prev) => {
                                        if (prev.units[unit.actionId]) URL.revokeObjectURL(prev.units[unit.actionId].preview);
                                        return { ...prev, units: { ...prev.units, [unit.actionId]: { file: f, preview } } };
                                      });
                                      e.target.value = '';
                                    }}
                                  />
                                  <div className="flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition-colors group-hover:border-indigo-400 group-hover:bg-indigo-50">
                                    {entry ? (
                                      <>
                                        <img src={entry.preview} alt="" className="h-full w-full object-cover" />
                                        <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                                          <Check className="h-3 w-3" />
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <ImagePlus className="h-5 w-5 text-slate-300 group-hover:text-indigo-400" />
                                        <span className="mt-1 line-clamp-2 px-1 text-center text-[10px] font-medium leading-tight text-slate-400 group-hover:text-indigo-500">
                                          {shortLabel}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>

                          {/* Campos complementares */}
                          {pendingEnrichment.missingFields.length > 0 && (
                            <div className="mt-3 space-y-2.5">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Dados complementares</p>
                              {pendingEnrichment.missingFields.map((field) => (
                                <div key={field.key}>
                                  <p className="mb-1 text-xs font-medium text-slate-600">{field.label}</p>
                                  {renderField(field)}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      <div className="h-2" />
                    </div>

                    {/* Botões de ação */}
                    <div className="flex gap-2 px-4 py-3 border-t border-slate-100">
                      {!isRequired && (
                        <button
                          type="button"
                          disabled={isSending}
                          onClick={() => skipEnrichmentStep()}
                          className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
                        >
                          Pular
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isSending || (isRequired && !allRequiredFilled)}
                        onClick={() => {
                          void confirmEnrichmentStep(
                            enrichmentFiles.main?.file ?? null,
                            Object.fromEntries(Object.entries(enrichmentFiles.units).map(([k, v]) => [k, v.file])),
                            fieldValues,
                          );
                        }}
                        className={`${
                          isRequired ? 'flex-1' : 'flex-[2]'
                        } rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                          isRequired
                            ? 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        {isSending
                          ? 'Processando…'
                          : isRequired
                          ? 'Preencher e cadastrar →'
                          : 'Confirmar e avançar →'}
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : pendingClientReview ? (
              /* ── Card de revisão de cliente (pré-criação) ── */
              <div className="shrink-0 border-t border-emerald-100 bg-white">
                {/* Cabeçalho de progresso */}
                <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                      Revisar cliente — {pendingClientReview.queuePosition} de {pendingClientReview.totalItems}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                      {String(clientReviewValues.contactName || clientReviewValues.companyName || '(sem nome)')}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                    {Math.round((pendingClientReview.queuePosition / pendingClientReview.totalItems) * 100)}%
                  </div>
                </div>
                <div className="mx-4 mb-2 h-1 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-[width]"
                    style={{
                      width: `${Math.round((pendingClientReview.queuePosition / pendingClientReview.totalItems) * 100)}%`,
                    }}
                  />
                </div>

                {/* Campos do cliente */}
                <div className="max-h-[260px] overflow-y-auto px-4 pb-1 [scrollbar-width:thin]">
                  <div className="space-y-2.5">
                    {/* Nome do Contato (obrigatório) */}
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-600">
                        Nome do Contato <span className="text-rose-500">*</span>
                      </p>
                      <input
                        type="text"
                        value={String(clientReviewValues.contactName ?? '')}
                        onChange={(e) => setClientReviewValues((prev) => ({ ...prev, contactName: e.target.value }))}
                        placeholder="Nome completo do contato"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                    {/* Empresa */}
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-600">Empresa</p>
                      <input
                        type="text"
                        value={String(clientReviewValues.companyName ?? '')}
                        onChange={(e) => setClientReviewValues((prev) => ({ ...prev, companyName: e.target.value }))}
                        placeholder="Razão social ou nome fantasia"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                    {/* CNPJ */}
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-600">CNPJ</p>
                      <input
                        type="text"
                        value={String(clientReviewValues.cnpj ?? '')}
                        onChange={(e) => setClientReviewValues((prev) => ({ ...prev, cnpj: e.target.value }))}
                        placeholder="00.000.000/0000-00"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                    {/* Email */}
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-600">Email</p>
                      <input
                        type="text"
                        value={String(clientReviewValues.email ?? '')}
                        onChange={(e) => setClientReviewValues((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="email@empresa.com"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                    {/* Telefone */}
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-600">Telefone</p>
                      <input
                        type="text"
                        value={String(clientReviewValues.phone ?? '')}
                        onChange={(e) => setClientReviewValues((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="(00) 00000-0000"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                    {/* Cargo */}
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-600">Cargo</p>
                      <input
                        type="text"
                        value={String(clientReviewValues.role ?? '')}
                        onChange={(e) => setClientReviewValues((prev) => ({ ...prev, role: e.target.value }))}
                        placeholder="Diretor, Gerente, etc."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                    {/* Status */}
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-600">Status</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(['LEAD', 'PROSPECT', 'CLIENTE', 'INATIVO'] as const).map((opt) => {
                          const selected = String(clientReviewValues.status ?? 'LEAD') === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setClientReviewValues((prev) => ({ ...prev, status: opt }))}
                              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                                selected
                                  ? 'bg-emerald-600 text-white'
                                  : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-600'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {/* Cidade / Estado */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="mb-1 text-xs font-medium text-slate-600">Cidade</p>
                        <input
                          type="text"
                          value={String(clientReviewValues.addressCity ?? '')}
                          onChange={(e) => setClientReviewValues((prev) => ({ ...prev, addressCity: e.target.value }))}
                          placeholder="São Paulo"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium text-slate-600">Estado (UF)</p>
                        <input
                          type="text"
                          maxLength={2}
                          value={String(clientReviewValues.addressState ?? '')}
                          onChange={(e) => setClientReviewValues((prev) => ({ ...prev, addressState: e.target.value.toUpperCase() }))}
                          placeholder="SP"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="h-2" />
                </div>

                {/* Botões */}
                <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => skipClientReview()}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    Pular
                  </button>
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => void confirmClientReview(clientReviewValues)}
                    className="flex-[2] rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isSending ? 'Criando…' : 'Confirmar e avançar →'}
                  </button>
                </div>
              </div>
            ) : pendingClientEnrichment ? (
              /* ── Card de enriquecimento de cliente (legado) ── */
              <div className="shrink-0 border-t border-emerald-100 bg-white">
                {/* Cabeçalho de progresso */}
                <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                      Complementar cliente — {pendingClientEnrichment.queuePosition} de {pendingClientEnrichment.totalItems}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                      {pendingClientEnrichment.entityName}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                    {Math.round((pendingClientEnrichment.queuePosition / pendingClientEnrichment.totalItems) * 100)}%
                  </div>
                </div>
                <div className="mx-4 mb-2 h-1 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-[width]"
                    style={{
                      width: `${Math.round((pendingClientEnrichment.queuePosition / pendingClientEnrichment.totalItems) * 100)}%`,
                    }}
                  />
                </div>

                {/* Campos faltantes */}
                {pendingClientEnrichment.missingFields.length > 0 ? (
                  <div className="max-h-[220px] overflow-y-auto px-4 pb-1 [scrollbar-width:thin]">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Dados complementares</p>
                    <div className="space-y-2.5">
                      {pendingClientEnrichment.missingFields.map((field) => (
                        <div key={field.key}>
                          <p className="mb-1 text-xs font-medium text-slate-600">{field.label}</p>
                          {field.type === 'select' && field.options ? (
                            <div className="flex flex-wrap gap-1.5">
                              {field.options.map((opt) => {
                                const selected = clientFieldValues[field.key] === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() =>
                                      setClientFieldValues((prev) => ({
                                        ...prev,
                                        [field.key]: selected ? '' : opt,
                                      }))
                                    }
                                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                                      selected
                                        ? 'bg-emerald-600 text-white'
                                        : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-600'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <input
                              type="text"
                              placeholder={`Informe ${field.label.toLowerCase()}`}
                              value={String(clientFieldValues[field.key] ?? '')}
                              onChange={(e) =>
                                setClientFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="h-2" />
                  </div>
                ) : (
                  <div className="px-4 pb-3">
                    <p className="text-xs text-slate-400">Todos os dados extraídos do arquivo. Confirme para avançar.</p>
                  </div>
                )}

                {/* Botões */}
                <div className="flex gap-2 px-4 py-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => skipClientEnrichmentStep()}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    Pular
                  </button>
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => void confirmClientEnrichmentStep(clientFieldValues)}
                    className="flex-[2] rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isSending ? 'Salvando…' : 'Confirmar e avançar →'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-slate-200 bg-white px-4 py-4">
                {quickPrompts.length && userMessagesCount > 0 ? (
                <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => {
                        void sendMessage(prompt);
                      }}
                      className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-2 shadow-sm">
                {/* Preview do arquivo anexado */}
                {attachedFile && (
                  <div className="mb-2 flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
                    <FileText className="h-4 w-4 shrink-0 text-indigo-500" />
                    <span className="flex-1 truncate text-xs font-medium text-indigo-700">{attachedFile.name}</span>
                    <button
                      type="button"
                      aria-label="Remover arquivo"
                      onClick={() => setAttachedFile(null)}
                      className="shrink-0 rounded-full p-0.5 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={attachedFile ? 'Adicione uma legenda (opcional)…' : 'Envie uma mensagem para o assistente'}
                  className="min-h-[72px] resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSubmit();
                    }
                  }}
                />

                <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-2 pt-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Escritas pedem sua confirmação.
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Input de arquivo oculto */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.heic,.heif,.docx,.doc,.txt,.json"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <button
                      type="button"
                      aria-label="Anexar arquivo"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => void resetConversation()}>
                      <MessageSquarePlus className="h-4 w-4" />
                      Nova
                    </Button>
                    <Button
                      className="rounded-full bg-[#4F46E5] px-4 text-white hover:bg-[#4338CA]"
                      onClick={() => void handleSubmit()}
                      disabled={isSending || (!draft.trim() && !attachedFile)}
                    >
                      <SendHorizonal className="h-4 w-4" />
                      Enviar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(pendingConfirmationAction)}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmationAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingConfirmationAction?.confirmationTitle || 'Confirmar ação'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingConfirmationAction?.confirmationMessage ||
                'Essa ação pode alterar dados do sistema. Deseja continuar?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {['create_proposal_draft', 'update_proposal_draft', 'apply_proposal_discount'].includes(pendingConfirmationAction?.key || '') ? (
              <button type="button" onClick={() => { setPendingConfirmationAction(null); setDraft('Quero ajustar o plano antes de criar o rascunho.'); }} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Voltar e editar
              </button>
            ) : null}
            <AlertDialogCancel onClick={() => setPendingConfirmationAction(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingConfirmationAction) return;
                void executeAction(pendingConfirmationAction, true);
                setPendingConfirmationAction(null);
              }}
            >
              {pendingConfirmationAction?.key === 'create_proposal_draft' ? 'Confirmar criação do rascunho' : ['update_proposal_draft', 'apply_proposal_discount'].includes(pendingConfirmationAction?.key || '') ? 'Confirmar atualização' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
