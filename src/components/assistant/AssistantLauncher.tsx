import { useMemo, useState } from 'react';
import { Bot, History, Lightbulb, MessageSquarePlus, SendHorizonal, ShieldCheck, Sparkles } from 'lucide-react';
import { useAssistant } from '../../contexts/AssistantContext';
import {
  getAssistantActionKindClasses,
  getAssistantActionKindLabel,
  getAssistantModuleLabel,
  getDataPointToneClasses,
} from '../../lib/assistant';
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
import { ScrollArea } from '../ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';
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
    providerName,
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
  const [pendingConfirmationAction, setPendingConfirmationAction] =
    useState<AssistantActionSuggestion | null>(null);

  const currentModuleLabel = useMemo(
    () => getAssistantModuleLabel(screenContext.currentModule),
    [screenContext.currentModule],
  );

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
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-3 rounded-full bg-[#4F46E5] px-4 py-3 text-sm font-medium text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:opacity-95"
        data-tour="assistant-launcher"
      >
        <Bot className="h-5 w-5" />
        <span className="hidden sm:inline">Assistente</span>
      </button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full max-w-full gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b px-6 py-5">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="space-y-2">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  Assistente OneMedia
                </SheetTitle>
                <SheetDescription className="text-sm text-gray-600">
                  Etapa 8 com ajuda contextual, navegação, consultas em leitura, criação segura, leitura analítica de Dashboard/Financeiro e agora também continuidade da conversa com memória própria, histórico auditável e sugestões proativas.
                </SheetDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-indigo-700">
                Módulo: {currentModuleLabel}
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                Provider: {providerName}
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800">
                Escrita protegida
              </span>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-700">
                Memória ativa
              </span>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-260px)] px-4 py-4 sm:h-[calc(100vh-280px)]">
            <div className="space-y-4 pr-2">
              {memorySummary ? (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  <div className="flex items-center gap-2 font-medium">
                    <History className="h-4 w-4" />
                    Continuidade da conversa
                  </div>
                  <p className="mt-2 leading-6">{memorySummary}</p>
                </div>
              ) : null}

              {history.length ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                    <History className="h-4 w-4" />
                    Histórico recente do assistente
                  </div>
                  <div className="mt-3 space-y-2">
                    {history.slice(0, 4).map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                        <div className="text-xs font-medium text-gray-700">{entry.summary}</div>
                        <div className="mt-1 text-[11px] text-gray-400">{formatTime(entry.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((message) => {
                const isUser = message.role === 'user';
                return (
                  <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm ${
                        isUser
                          ? 'bg-[#4F46E5] text-white'
                          : 'border border-gray-200 bg-white text-gray-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>

                      {!isUser && message.dataPoints?.length ? (
                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {message.dataPoints.map((dataPoint) => (
                            <div
                              key={dataPoint.id}
                              className={`rounded-xl border px-3 py-2 ${getDataPointToneClasses(dataPoint.tone)}`}
                            >
                              <div className="text-[11px] font-medium uppercase tracking-wide opacity-80">
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
                        <div className="mt-4 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {message.actions.map((action) => (
                              <button
                                key={action.id}
                                type="button"
                                onClick={() => handleActionClick(action)}
                                className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>

                          <div className="space-y-2">
                            {message.actions.map((action) => (
                              <div
                                key={`${action.id}-meta`}
                                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-medium text-gray-700">{action.label}</span>
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${getAssistantActionKindClasses(action.kind)}`}
                                  >
                                    {getAssistantActionKindLabel(action.kind)}
                                  </span>
                                  {action.requiresConfirmation ? (
                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                                      Confirmação obrigatória
                                    </span>
                                  ) : null}
                                </div>
                                {action.description ? (
                                  <p className="mt-1 text-xs leading-5 text-gray-600">{action.description}</p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className={`mt-2 text-[11px] ${isUser ? 'text-indigo-100' : 'text-gray-400'}`}>
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isSending ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
                    Pensando na sua solicitação…
                  </div>
                </div>
              ) : null}
            </div>
          </ScrollArea>

          <div className="border-t bg-white px-4 py-4">
            {proactivePrompts.length ? (
              <div className="mb-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-3">
                <div className="flex items-center gap-2 text-xs font-medium text-violet-800">
                  <Lightbulb className="h-4 w-4" />
                  Sugestões proativas
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {proactivePrompts.slice(0, 3).map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => {
                        void sendMessage(prompt);
                      }}
                      className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs text-violet-800 transition-colors hover:bg-violet-100"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mb-3 flex flex-wrap gap-2">
              {suggestedPrompts.slice(0, 3).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    void sendMessage(prompt);
                  }}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-100"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <ShieldCheck className="h-4 w-4" />
              Ações de escrita só avançam com confirmação explícita. Nesta etapa, o assistente também preserva continuidade com memória própria e trilha auditável das interações.
            </div>

            <div className="space-y-3">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Escreva sua dúvida, peça um resumo, navegue, peça uma análise ou retome algo da conversa anterior…"
                className="min-h-[96px]"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSubmit();
                  }
                }}
              />

              <div className="flex items-center justify-between gap-3">
                <Button variant="outline" size="sm" onClick={() => void resetConversation()}>
                  <MessageSquarePlus className="h-4 w-4" />
                  Nova conversa
                </Button>
                <Button onClick={() => void handleSubmit()} disabled={isSending || !draft.trim()}>
                  <SendHorizonal className="h-4 w-4" />
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!pendingConfirmationAction}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmationAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingConfirmationAction?.confirmationTitle || 'Confirmar ação do assistente'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingConfirmationAction?.confirmationMessage ||
                'Essa ação altera dados. Confirme apenas se quiser continuar.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSending || !pendingConfirmationAction}
              onClick={(event) => {
                event.preventDefault();
                const action = pendingConfirmationAction;
                if (!action) return;
                setPendingConfirmationAction(null);
                void executeAction(action, true);
              }}
            >
              Confirmar ação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
