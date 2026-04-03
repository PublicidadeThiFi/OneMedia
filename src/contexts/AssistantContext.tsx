import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import apiClient from '../lib/apiClient';
import {
  getAssistantModuleLabel,
  getAssistantStarterPrompts,
  resolveAssistantActionPath,
} from '../lib/assistant';
import { useNavigation } from './NavigationContext';
import type {
  AssistantActionSuggestion,
  AssistantChatResponse,
  AssistantHistoryEntry,
  AssistantMessage,
  AssistantScreenContext,
} from '../types/assistant';

interface AssistantContextValue {
  isOpen: boolean;
  isSending: boolean;
  messages: AssistantMessage[];
  screenContext: AssistantScreenContext;
  providerName: string;
  suggestedPrompts: string[];
  proactivePrompts: string[];
  memorySummary: string | null;
  history: AssistantHistoryEntry[];
  setIsOpen: (open: boolean) => void;
  setScreenContext: (next: Partial<AssistantScreenContext>) => void;
  sendMessage: (message: string) => Promise<void>;
  performAction: (action: AssistantActionSuggestion) => void;
  executeAction: (action: AssistantActionSuggestion, confirmed?: boolean) => Promise<void>;
  resetConversation: () => Promise<void>;
}

const AssistantContext = createContext<AssistantContextValue | undefined>(undefined);
const ASSISTANT_STORAGE_KEY = 'onemedia-assistant-state-v1';

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildWelcomeMessage(module?: string | null): AssistantMessage {
  const moduleLabel = getAssistantModuleLabel(module);

  return {
    id: createMessageId(),
    role: 'assistant',
    createdAt: new Date().toISOString(),
    content:
      module && module !== 'home'
        ? `Olá! Já estou acompanhando o módulo ${moduleLabel}. Nesta Etapa 8 eu separo leitura e escrita, explico a tela atual, navego entre módulos, busco inventário por cidade/estado/tipo, contextualizo o Mídia Kit, crio rascunhos reais de proposta, cadastro clientes, produtos, pontos de mídia e faces/unidades por linguagem natural, faço leitura analítica de Dashboard e Financeiro e agora também mantenho continuidade da conversa com memória própria do assistente, trilha auditável e sugestões proativas, sempre com confirmação antes de qualquer escrita.`
        : 'Olá! Eu sou o assistente da plataforma. Nesta Etapa 8 eu separo leitura e escrita, explico a tela atual, navego entre módulos, busco inventário por cidade/estado/tipo, contextualizo o Mídia Kit, crio rascunhos reais de proposta, cadastro clientes, produtos, pontos de mídia e faces/unidades por linguagem natural, faço leitura analítica de Dashboard e Financeiro e agora também mantenho continuidade da conversa com memória própria do assistente, trilha auditável e sugestões proativas, sempre com confirmação antes de qualquer escrita.',
  };
}

function safeLocalStorageGet<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // noop
  }
}

function safeLocalStorageRemove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // noop
  }
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [providerName, setProviderName] = useState('foundation-mock');
  const [memorySummary, setMemorySummary] = useState<string | null>(null);
  const [history, setHistory] = useState<AssistantHistoryEntry[]>([]);
  const [screenContext, setScreenContextState] = useState<AssistantScreenContext>({
    currentModule: 'home',
    currentPath: '/app',
    currentTitle: 'Página Inicial',
    selectedEntityType: null,
    selectedEntityId: null,
    selectedEntityLabel: null,
  });
  const screenContextRef = useRef<AssistantScreenContext>(screenContext);
  const [messages, setMessages] = useState<AssistantMessage[]>([buildWelcomeMessage('home')]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>(getAssistantStarterPrompts('home'));
  const [proactivePrompts, setProactivePrompts] = useState<string[]>([]);

  useEffect(() => {
    const stored = safeLocalStorageGet<{
      messages?: AssistantMessage[];
      suggestedPrompts?: string[];
      proactivePrompts?: string[];
      providerName?: string;
      memorySummary?: string | null;
      history?: AssistantHistoryEntry[];
    }>(ASSISTANT_STORAGE_KEY);

    if (!stored) return;
    if (Array.isArray(stored.messages) && stored.messages.length > 0) {
      setMessages(stored.messages.slice(-30));
    }
    if (Array.isArray(stored.suggestedPrompts) && stored.suggestedPrompts.length > 0) {
      setSuggestedPrompts(stored.suggestedPrompts.slice(0, 5));
    }
    if (Array.isArray(stored.proactivePrompts) && stored.proactivePrompts.length > 0) {
      setProactivePrompts(stored.proactivePrompts.slice(0, 5));
    }
    if (typeof stored.providerName === 'string' && stored.providerName.trim()) {
      setProviderName(stored.providerName);
    }
    if (typeof stored.memorySummary === 'string') {
      setMemorySummary(stored.memorySummary);
    }
    if (Array.isArray(stored.history)) {
      setHistory(stored.history.slice(0, 10));
    }
  }, []);

  useEffect(() => {
    safeLocalStorageSet(ASSISTANT_STORAGE_KEY, {
      messages: messages.slice(-30),
      suggestedPrompts: suggestedPrompts.slice(0, 5),
      proactivePrompts: proactivePrompts.slice(0, 5),
      providerName,
      memorySummary,
      history: history.slice(0, 10),
    });
  }, [history, memorySummary, messages, proactivePrompts, providerName, suggestedPrompts]);

  const setScreenContext = useCallback((next: Partial<AssistantScreenContext>) => {
    setScreenContextState((prev) => {
      const merged = { ...prev, ...next };
      screenContextRef.current = merged;
      return merged;
    });

    if (next.currentModule) {
      setSuggestedPrompts(getAssistantStarterPrompts(next.currentModule));
    }
  }, []);

  const fetchAssistantHistory = useCallback(async () => {
    try {
      const response = await apiClient.get<{
        history?: AssistantHistoryEntry[];
        memorySummary?: string | null;
        proactivePrompts?: string[];
      }>('/assistant/history', {
        params: {
          currentModule: screenContextRef.current.currentModule,
        },
      });

      setHistory(Array.isArray(response.data?.history) ? response.data.history : []);
      setMemorySummary(response.data?.memorySummary || null);
      setProactivePrompts(Array.isArray(response.data?.proactivePrompts) ? response.data.proactivePrompts : []);
    } catch (error) {
      console.error('[Assistant] failed to fetch history', error);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void fetchAssistantHistory();
  }, [fetchAssistantHistory, isOpen]);

  const performAction = useCallback(
    (action: AssistantActionSuggestion) => {
      if (action.type !== 'navigate') return;

      const targetPath = resolveAssistantActionPath(action);
      if (!targetPath) return;

      navigate(targetPath);
      toast.success(action.label);
    },
    [navigate],
  );

  const applyAssistantResponse = useCallback(
    (response: AssistantChatResponse) => {
      setMessages((prev) => [...prev, response.reply]);
      setProviderName(response.provider?.name || 'foundation-mock');
      setSuggestedPrompts(
        response.suggestedPrompts?.length
          ? response.suggestedPrompts
          : getAssistantStarterPrompts(screenContextRef.current.currentModule),
      );
      setProactivePrompts(response.proactivePrompts?.length ? response.proactivePrompts : []);
      setMemorySummary(response.memorySummary || null);
      setHistory(Array.isArray(response.history) ? response.history : []);

      const autoNavigationAction = response.reply.actions?.find(
        (action) => action.autoExecute && action.type === 'navigate',
      );
      if (autoNavigationAction) {
        performAction(autoNavigationAction);
      }
    },
    [performAction],
  );

  const executeAction = useCallback(
    async (action: AssistantActionSuggestion, confirmed = false) => {
      if (isSending) return;
      if (action.type === 'navigate') {
        performAction(action);
        return;
      }

      setIsSending(true);
      try {
        const response = await apiClient.post<AssistantChatResponse>('/assistant/actions/execute', {
          action,
          confirmed,
          screenContext: screenContextRef.current,
        });

        applyAssistantResponse(response.data);
      } catch (error: any) {
        console.error('[Assistant] failed to execute action', error);
        const fallbackReply: AssistantMessage = {
          id: createMessageId(),
          role: 'assistant',
          createdAt: new Date().toISOString(),
          content:
            action.kind === 'write'
              ? 'Não consegui validar essa ação de escrita agora. A estrutura segura da Etapa 8 continua ativa, mas houve uma falha momentânea ao consultar o backend.'
              : 'Não consegui executar essa ação de leitura agora. Tente novamente em instantes.',
        };
        setMessages((prev) => [...prev, fallbackReply]);
        toast.error('Não foi possível executar a ação do assistente agora.');
      } finally {
        setIsSending(false);
      }
    },
    [applyAssistantResponse, isSending, performAction],
  );

  const resetConversation = useCallback(async () => {
    const module = screenContextRef.current.currentModule ?? 'home';
    setMessages([buildWelcomeMessage(module)]);
    setSuggestedPrompts(getAssistantStarterPrompts(module));
    setMemorySummary(null);
    setHistory([]);
    safeLocalStorageRemove(ASSISTANT_STORAGE_KEY);

    try {
      const response = await apiClient.post<{
        proactivePrompts?: string[];
      }>('/assistant/history/reset', {
        currentModule: module,
      });
      setProactivePrompts(Array.isArray(response.data?.proactivePrompts) ? response.data.proactivePrompts : []);
    } catch (error) {
      console.error('[Assistant] failed to reset history', error);
      setProactivePrompts([]);
    }
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      const trimmed = String(message || '').trim();
      if (!trimmed || isSending) return;

      const userMessage: AssistantMessage = {
        id: createMessageId(),
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);

      try {
        const response = await apiClient.post<AssistantChatResponse>('/assistant/chat', {
          message: trimmed,
          screenContext: screenContextRef.current,
          conversationHistory: [...messages, userMessage]
            .filter((item) => item.role === 'assistant' || item.role === 'user')
            .slice(-8)
            .map((item) => ({
              role: item.role,
              content: item.content,
              createdAt: item.createdAt,
            })),
        });

        applyAssistantResponse(response.data);
      } catch (error: any) {
        console.error('[Assistant] failed to send message', error);
        const fallbackReply: AssistantMessage = {
          id: createMessageId(),
          role: 'assistant',
          createdAt: new Date().toISOString(),
          content:
            'Não consegui falar com o serviço do assistente agora. A estrutura da Etapa 8 já está pronta, mas houve uma falha momentânea ao consultar o backend.',
        };
        setMessages((prev) => [...prev, fallbackReply]);
        setSuggestedPrompts(getAssistantStarterPrompts(screenContextRef.current.currentModule));
        toast.error('Não foi possível consultar o assistente agora.');
      } finally {
        setIsSending(false);
      }
    },
    [applyAssistantResponse, isSending, messages],
  );

  const value = useMemo<AssistantContextValue>(
    () => ({
      isOpen,
      isSending,
      messages,
      screenContext,
      providerName,
      suggestedPrompts,
      proactivePrompts,
      memorySummary,
      history,
      setIsOpen,
      setScreenContext,
      sendMessage,
      performAction,
      executeAction,
      resetConversation,
    }),
    [
      executeAction,
      history,
      isOpen,
      isSending,
      memorySummary,
      messages,
      performAction,
      proactivePrompts,
      providerName,
      resetConversation,
      screenContext,
      sendMessage,
      setScreenContext,
      suggestedPrompts,
    ],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within AssistantProvider');
  }
  return context;
}
