import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus,
  SendHorizonal,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAssistant } from '../../contexts/AssistantContext';
import { getAssistantModuleLabel, getDataPointToneClasses } from '../../lib/assistant';
import type { AssistantActionSuggestion } from '../../types/assistant';
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
    setIsOpen,
    suggestedPrompts,
    proactivePrompts,
    memorySummary,
    history,
  } = useAssistant();
  const [draft, setDraft] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [pendingConfirmationAction, setPendingConfirmationAction] =
    useState<AssistantActionSuggestion | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);

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
    const trimmed = draft.trim();
    if (!trimmed || isSending) return;
    setDraft('');
    await sendMessage(trimmed);
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
      </button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          overlayClassName="bg-slate-950/30 backdrop-blur-[2px]"
          className="!right-2 !top-2 !bottom-2 !h-[calc(100dvh-1rem)] !w-[min(420px,calc(100vw-1rem))] max-w-none overflow-hidden rounded-[28px] border border-slate-200 bg-white p-0 shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
        >
          <div className="flex h-full min-h-0 flex-col bg-white">
            <div className="border-b border-slate-200 bg-white px-5 py-4 pr-12">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4F46E5]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-[17px] font-semibold text-slate-900">
                      Assistente OneMedia
                    </h2>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Tire dúvidas, peça resumos e execute ações com confirmação quando necessário.
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    <span>{currentModuleLabel}</span>
                  </div>
                </div>
              </div>
            </div>

            <div ref={messagesViewportRef} className="min-h-0 flex-1 overflow-y-auto bg-[#F8FAFC] px-4 py-4">
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

                              {!isUser && message.dataPoints?.length ? (
                                <div className="mt-3 grid grid-cols-1 gap-2">
                                  {message.dataPoints.slice(0, 3).map((dataPoint) => (
                                    <div
                                      key={dataPoint.id}
                                      className={`rounded-xl border px-3 py-2 ${getDataPointToneClasses(
                                        dataPoint.tone,
                                      )}`}
                                    >
                                      <div className="text-[11px] font-medium uppercase tracking-wide opacity-75">
                                        {dataPoint.label}
                                      </div>
                                      <div className="mt-1 text-sm font-semibold">{dataPoint.value}</div>
                                      {dataPoint.description ? (
                                        <div className="mt-1 text-[11px] leading-4 opacity-80">
                                          {dataPoint.description}
                                        </div>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              ) : null}

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

            <div className="border-t border-slate-200 bg-white px-4 py-4">
              {quickPrompts.length ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => {
                        void sendMessage(prompt);
                      }}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-2 shadow-sm">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Envie uma mensagem para o assistente"
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
                    <Button variant="ghost" size="sm" onClick={() => void resetConversation()}>
                      <MessageSquarePlus className="h-4 w-4" />
                      Nova
                    </Button>
                    <Button
                      className="rounded-full bg-[#4F46E5] px-4 text-white hover:bg-[#4338CA]"
                      onClick={() => void handleSubmit()}
                      disabled={isSending || !draft.trim()}
                    >
                      <SendHorizonal className="h-4 w-4" />
                      Enviar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
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
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
