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
import { DOOH_SUBCATEGORIES, ENVIRONMENTS, OOH_SUBCATEGORIES } from '../lib/mockData';
import {
  getAssistantModuleLabel,
  getAssistantStarterPrompts,
  resolveAssistantActionPath,
} from '../lib/assistant';
import { useNavigation } from './NavigationContext';
import { useAuth } from './AuthContext';
import type {
  AssistantActionSuggestion,
  AssistantChatResponse,
  AssistantEnrichmentUnit,
  AssistantHistoryEntry,
  AssistantMessage,
  AssistantMissingField,
  AssistantPendingEnrichment,
  AssistantPendingClientEnrichment,
  AssistantPendingClientReview,
  AssistantScreenContext,
} from '../types/assistant';

export interface AssistantLoginBriefing {
  alertKey?: string;
  generatedAt?: string;
  shouldNotify?: boolean;
  severity?: 'info' | 'warning' | 'critical';
  headline?: string;
  summary?: string;
  dataPoints?: Array<{
    id?: string;
    label?: string;
    value?: string;
    description?: string;
    tone?: 'neutral' | 'info' | 'success' | 'warning' | 'error';
  }>;
  suggestedPrompts?: string[];
}

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
  loginBriefing: AssistantLoginBriefing | null;
  hasUnreadBriefing: boolean;
  pendingEnrichment: AssistantPendingEnrichment | null;
  pendingClientEnrichment: AssistantPendingClientEnrichment | null;
  pendingClientReview: AssistantPendingClientReview | null;
  setIsOpen: (open: boolean) => void;
  setScreenContext: (next: Partial<AssistantScreenContext>) => void;
  sendMessage: (message: string) => Promise<void>;
  sendFile: (file: File, caption?: string) => Promise<void>;
  consumeQuickReply: (messageId: string, value: string) => Promise<void>;
  performAction: (action: AssistantActionSuggestion) => void;
  executeAction: (action: AssistantActionSuggestion, confirmed?: boolean) => Promise<void>;
  confirmEnrichmentStep: (mainPhoto: File | null, unitFiles: Record<string, File>, fieldValues: Record<string, unknown>) => Promise<void>;
  skipEnrichmentStep: () => void;
  confirmClientEnrichmentStep: (fieldValues: Record<string, unknown>) => Promise<void>;
  skipClientEnrichmentStep: () => void;
  confirmClientReview: (fieldValues: Record<string, unknown>) => Promise<void>;
  skipClientReview: () => void;
  resetConversation: () => Promise<void>;
}

const AssistantContext = createContext<AssistantContextValue | undefined>(undefined);

function getStorageKey(userId?: string | null) {
  return userId ? `onemedia-assistant-state-v2:${userId}` : 'onemedia-assistant-state-v2:guest';
}

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
        ? `Oi! Já estou acompanhando ${moduleLabel}. Posso explicar esta tela, resumir dados ou te ajudar com uma ação.`
        : 'Oi! Sou o assistente da OneMedia. Posso explicar a tela, resumir dados e te ajudar com ações do sistema.',
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

function buildMissingFields(record: Record<string, unknown>, mediaType: string): AssistantMissingField[] {
  const hasMeaning = (v: unknown): boolean => {
    if (v === null || v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'number') return Number.isFinite(v) && v !== 0;
    return String(v).trim().length > 0;
  };
  const fields: AssistantMissingField[] = [];
  // Campos obrigatórios primeiro — sem eles o backend bloqueia o cadastro
  // Verifica aliases PT/EN pois o parser do PDF pode usar 'nome', 'cidade', 'estado'
  const nameVal = record.nome ?? record.name ?? record.label ?? record.title;
  if (!hasMeaning(nameVal))
    fields.push({ key: 'name', label: 'Nome do ponto', type: 'text' });
  const cityVal = record.addressCity ?? record.cidade ?? record.city;
  if (!hasMeaning(cityVal))
    fields.push({ key: 'addressCity', label: 'Cidade', type: 'text' });
  const stateVal = record.addressState ?? record.estado ?? record.state ?? record.uf;
  if (!hasMeaning(stateVal))
    fields.push({ key: 'addressState', label: 'Estado (UF)', type: 'text' });
  if (!hasMeaning(record.latitude))
    fields.push({ key: 'latitude', label: 'Latitude', type: 'number' });
  if (!hasMeaning(record.longitude))
    fields.push({ key: 'longitude', label: 'Longitude', type: 'number' });
  // Campos complementares
  const subcategoryOptions = mediaType === 'DOOH' ? DOOH_SUBCATEGORIES : OOH_SUBCATEGORIES;
  if (!hasMeaning(record.socialClasses))
    fields.push({ key: 'socialClasses', label: 'Classes sociais', type: 'multiselect', options: ['A', 'B', 'C', 'D', 'E'] });
  if (!hasMeaning(record.environment))
    fields.push({ key: 'environment', label: 'Ambiente', type: 'select', options: ENVIRONMENTS });
  if (!hasMeaning(record.subcategory ?? record.subcategoria))
    fields.push({ key: 'subcategory', label: 'Subcategoria', type: 'select', options: subcategoryOptions });
  if (!hasMeaning(record.basePriceWeek ?? record.precoSemanal))
    fields.push({ key: 'basePriceWeek', label: 'Preço bissemanal (R$)', type: 'number' });
  if (!hasMeaning(record.basePriceMonth ?? record.precoMensal))
    fields.push({ key: 'basePriceMonth', label: 'Preço mensal (R$)', type: 'number' });
  if (!hasMeaning(record.dailyImpressions ?? record.impactosDia))
    fields.push({ key: 'dailyImpressions', label: 'Impactos/dia', type: 'number' });
  return fields;
}

function buildClientMissingFields(record: Record<string, unknown>): AssistantMissingField[] {
  const hasMeaning = (v: unknown): boolean => {
    if (v === null || v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    return String(v).trim().length > 0;
  };
  const fields: AssistantMissingField[] = [];
  if (!hasMeaning(record.email))
    fields.push({ key: 'email', label: 'Email', type: 'text' });
  if (!hasMeaning(record.phone))
    fields.push({ key: 'phone', label: 'Telefone', type: 'text' });
  if (!hasMeaning(record.companyName))
    fields.push({ key: 'companyName', label: 'Empresa', type: 'text' });
  if (!hasMeaning(record.role))
    fields.push({ key: 'role', label: 'Cargo', type: 'text' });
  if (!hasMeaning(record.status))
    fields.push({ key: 'status', label: 'Status', type: 'select', options: ['LEAD', 'PROSPECT', 'CLIENTE', 'INATIVO'] });
  return fields;
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigation();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [isOpen, setIsOpenState] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [providerName, setProviderName] = useState('foundation-mock');
  const [memorySummary, setMemorySummary] = useState<string | null>(null);
  const [history, setHistory] = useState<AssistantHistoryEntry[]>([]);
  const [loginBriefing, setLoginBriefing] = useState<AssistantLoginBriefing | null>(null);
  const hasUnreadBriefingRef = useRef(false);
  const [hasUnreadBriefing, setHasUnreadBriefing] = useState(false);
  const dedupeKeysRef = useRef(new Set<string>());

  // ── Estado de upload pendente (pontos de mídia extraídos do arquivo) ──────
  const pendingOutdoorsRef = useRef<Record<string, unknown>[]>([]);
  const pendingSourceTypeRef = useRef<string | null>(null);
  const pendingTotalCountRef = useRef(0);
  const uploadModeRef = useRef<'one-by-one' | 'bulk' | null>(null);
  const [pendingEnrichment, setPendingEnrichment] = useState<AssistantPendingEnrichment | null>(null);
  const [pendingClientEnrichment, setPendingClientEnrichment] = useState<AssistantPendingClientEnrichment | null>(null);
  const [pendingClientReview, setPendingClientReview] = useState<AssistantPendingClientReview | null>(null);
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
    const key = getStorageKey(userId);
    const stored = safeLocalStorageGet<{
      messages?: AssistantMessage[];
      suggestedPrompts?: string[];
      proactivePrompts?: string[];
      providerName?: string;
      memorySummary?: string | null;
      history?: AssistantHistoryEntry[];
    }>(key);

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
  }, [userId]);

  useEffect(() => {
    safeLocalStorageSet(getStorageKey(userId), {
      messages: messages.slice(-30),
      suggestedPrompts: suggestedPrompts.slice(0, 5),
      proactivePrompts: proactivePrompts.slice(0, 5),
      providerName,
      memorySummary,
      history: history.slice(0, 10),
    });
  }, [history, memorySummary, messages, proactivePrompts, providerName, suggestedPrompts, userId]);

  const setIsOpen = useCallback((open: boolean) => {
    setIsOpenState(open);
    if (open) {
      hasUnreadBriefingRef.current = false;
      setHasUnreadBriefing(false);
    }
  }, []);

  // Ouve evento de push de mensagem (login briefing)
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        source?: string;
        content?: string;
        dataPoints?: AssistantLoginBriefing['dataPoints'];
        dedupeKey?: string;
        briefing?: AssistantLoginBriefing;
      };

      const dedupeKey = detail?.dedupeKey;
      if (dedupeKey) {
        if (dedupeKeysRef.current.has(dedupeKey)) return;
        dedupeKeysRef.current.add(dedupeKey);
      }

      if (detail?.briefing) {
        setLoginBriefing(detail.briefing);
      }

      const content = String(detail?.content || '').trim();
      if (!content) return;

      const pushMsg: AssistantMessage = {
        id: createMessageId(),
        role: 'assistant',
        content,
        createdAt: new Date().toISOString(),
        dataPoints: Array.isArray(detail?.dataPoints) ? (detail.dataPoints as any) : undefined,
      };

      setMessages((prev) => [...prev, pushMsg]);
      hasUnreadBriefingRef.current = true;
      setHasUnreadBriefing(true);
    };

    window.addEventListener('assistant:push-message', handler);
    return () => window.removeEventListener('assistant:push-message', handler);
  }, []);

  // Login briefing fetch — executa apenas uma vez por dia por usuário
  useEffect(() => {
    if (!userId) return;

    const today = new Date().toISOString().slice(0, 10);
    const dailyShownKey = `onemedia-briefing-shown:${userId}:${today}`;

    // Já exibiu o briefing hoje: não busca nem empurra novamente
    if (safeLocalStorageGet<boolean>(dailyShownKey)) return;

    let cancelled = false;

    const fetchBriefing = async () => {
      try {
        const { data } = await apiClient.get('/assistant/login-briefing');
        if (cancelled) return;
        if (!data?.shouldNotify) { setLoginBriefing(null); return; }

        const briefing: AssistantLoginBriefing = {
          alertKey: String(data?.alertKey || '').trim() || undefined,
          generatedAt: String(data?.generatedAt || '').trim() || undefined,
          shouldNotify: true,
          severity: data?.severity,
          headline: String(data?.headline || '').trim() || undefined,
          summary: String(data?.summary || '').trim() || undefined,
          dataPoints: Array.isArray(data?.dataPoints) ? data.dataPoints : [],
          suggestedPrompts: Array.isArray(data?.suggestedPrompts) ? data.suggestedPrompts : [],
        };

        setLoginBriefing(briefing);

        const messageContent = [briefing.headline, briefing.summary].filter(Boolean).join('\n\n').trim();
        if (messageContent) {
          // Marca no localStorage antes de empurrar — garante que re-renders/remounts não dupliquem
          safeLocalStorageSet(dailyShownKey, true);

          const pushMsg: AssistantMessage = {
            id: createMessageId(),
            role: 'assistant',
            content: messageContent,
            createdAt: new Date().toISOString(),
            dataPoints: briefing.dataPoints as any,
          };
          setMessages((prev) => [...prev, pushMsg]);
          setHasUnreadBriefing(true);
          hasUnreadBriefingRef.current = true;
          if (Array.isArray(briefing.suggestedPrompts) && briefing.suggestedPrompts.length) {
            setProactivePrompts(briefing.suggestedPrompts.slice(0, 5));
          }

          // Auto-abrir o chat na primeira visita do dia
          setTimeout(() => setIsOpenState(true), 1500);
        }
      } catch {
        if (!cancelled) setLoginBriefing(null);
      }
    };

    void fetchBriefing();
    return () => { cancelled = true; };
  }, [userId]);

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

        // Determina status de criação ANTES de aplicar resposta (para filtrar ações)
        const exec = (response.data as any)?.actionExecution;
        const wasCreated =
          String(exec?.status || '').toLowerCase() === 'completed' &&
          (exec?.key === 'create_media_point' || exec?.key === 'create_client') &&
          (exec?.meta?.created === true || exec?.meta?.reused === true);

        const hasPending = pendingOutdoorsRef.current.length > 0;
        const isOneByOne = uploadModeRef.current === 'one-by-one';

        if (wasCreated && hasPending && isOneByOne && exec?.key === 'create_media_point') {
          // Modo um-por-um: filtra ações de criar unidade da reply (vão pro card de enriquecimento)
          const unitActions: AssistantActionSuggestion[] = (response.data.reply?.actions ?? []).filter(
            (a) => a.key === 'create_media_unit',
          );
          const filteredReply: AssistantMessage = {
            ...response.data.reply,
            actions: (response.data.reply?.actions ?? []).filter(
              (a) => a.key !== 'create_media_unit',
            ),
          };
          applyAssistantResponse({ ...response.data, reply: filteredReply });

          // Captura campos pendentes do registro atual ANTES de avançar a fila
          const mediaType = String((action.payload as any)?.createDto?.type || 'OOH');
          const activeRecord = pendingOutdoorsRef.current[0] ?? {};
          const missingFields = buildMissingFields(activeRecord, mediaType);

          // Avança fila
          const totalCount = pendingTotalCountRef.current;
          const remaining = pendingOutdoorsRef.current.slice(1);
          pendingOutdoorsRef.current = remaining;
          const consumed = totalCount - remaining.length;

          if (remaining.length === 0) {
            pendingSourceTypeRef.current = null;
            pendingTotalCountRef.current = 0;
          }

          // Exibe card de enriquecimento
          setPendingEnrichment({
            entityId: String(exec?.meta?.entityId || '').trim(),
            entityName: String(exec?.meta?.entityName || 'Ponto de mídia').trim(),
            mediaType,
            queuePosition: consumed,
            totalItems: totalCount,
            units: unitActions.map((a) => ({
              actionId: a.id,
              label: a.label,
              action: a,
            } satisfies AssistantEnrichmentUnit)),
            missingFields,
          });

          window.dispatchEvent(new Event('inventory:refresh'));
        } else if (wasCreated && hasPending && exec?.key === 'create_client') {
          // Modo clientes: card de enriquecimento de cliente (sem fotos)
          const activeRecord = pendingOutdoorsRef.current[0] ?? {};
          const missingFields = buildClientMissingFields(activeRecord);

          const totalCount = pendingTotalCountRef.current;
          const remaining = pendingOutdoorsRef.current.slice(1);
          pendingOutdoorsRef.current = remaining;
          const consumed = totalCount - remaining.length;

          if (remaining.length === 0) {
            pendingSourceTypeRef.current = null;
            pendingTotalCountRef.current = 0;
          }

          applyAssistantResponse(response.data);

          setPendingClientEnrichment({
            entityId: String(exec?.meta?.entityId || '').trim(),
            entityName: String(exec?.meta?.entityName || 'Cliente').trim(),
            queuePosition: consumed,
            totalItems: totalCount,
            missingFields,
          });

          window.dispatchEvent(new Event('clients:refresh'));
        } else {
          // Padrão: aplica resposta normalmente
          applyAssistantResponse(response.data);

          if (wasCreated && hasPending) {
            const sourceType = pendingSourceTypeRef.current;
            const remaining = pendingOutdoorsRef.current.slice(1);
            pendingOutdoorsRef.current = remaining;

            window.dispatchEvent(new Event(sourceType === 'clients' ? 'clients:refresh' : 'inventory:refresh'));

            if (remaining.length > 0) {
              setTimeout(() => {
                void sendMessageRef.current('quero');
              }, 600);
            } else {
              pendingSourceTypeRef.current = null;
              pendingTotalCountRef.current = 0;
            }
          }
        }
      } catch (error: any) {
        console.error('[Assistant] failed to execute action', error);
        const fallbackReply: AssistantMessage = {
          id: createMessageId(),
          role: 'assistant',
          createdAt: new Date().toISOString(),
          content:
            action.kind === 'write'
              ? 'Não consegui executar essa ação agora. Tente novamente em instantes.'
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
    setLoginBriefing(null);
    setHasUnreadBriefing(false);
    hasUnreadBriefingRef.current = false;
    pendingOutdoorsRef.current = [];
    pendingSourceTypeRef.current = null;
    pendingTotalCountRef.current = 0;
    uploadModeRef.current = null;
    setPendingEnrichment(null);
    setPendingClientReview(null);
    safeLocalStorageRemove(getStorageKey(userId));

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
  }, [userId]);

  const sendMessageRef = useRef<(msg: string) => Promise<void>>(async () => {});
  const executeActionRef = useRef<(action: AssistantActionSuggestion, confirmed?: boolean) => Promise<void>>(async () => {});

  const consumeQuickReply = useCallback(
    async (messageId: string, value: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, quickReplies: [] } : m)),
      );
      await sendMessageRef.current(value);
    },
    [],
  );

  const sendFile = useCallback(
    async (file: File, caption?: string) => {
      if (isSending) return;

      // Mostra só o arquivo no bubble — a legenda/instrução será enviada como mensagem
      // separada após o upload, quando o contexto (pendingOutdoorsRef) já estiver pronto
      const userMessage: AssistantMessage = {
        id: createMessageId(),
        role: 'user',
        content: caption?.trim() ? `📎 ${file.name} — "${caption.trim()}"` : `📎 ${file.name}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);

      try {
        const formData = new FormData();
        formData.append('file', file);
        if (caption?.trim()) {
          formData.append('textoExtraido', caption.trim());
        }

        const { data } = await apiClient.post('/ai/upload', formData);

        let replyContent = '';
        if (data?.domain === 'clients') {
          const clients: Array<{ contactName?: string; companyName?: string; email?: string; phone?: string; cnpj?: string }> =
            Array.isArray(data?.clients) ? data.clients : [];
          replyContent =
            clients.length > 0
              ? `Encontrei **${clients.length} cliente(s)** no arquivo.\n\nAmostra:\n${clients
                  .slice(0, 3)
                  .map((c, i) => `${i + 1}. ${c.contactName || c.companyName || '(sem nome)'} — ${c.email || c.phone || c.cnpj || ''}`)
                  .join('\n')}\n\nClique em **Iniciar cadastro** para revisar e confirmar cada cliente antes de criar.`
              : 'Recebi o arquivo de clientes, mas não consegui extrair registros. Tente um CSV com colunas Nome, Email, CNPJ, Telefone, Empresa.';
          if (data?.warning) replyContent += `\n\n⚠️ ${data.warning}`;
          // Clientes: guarda na ref para fluxo de cadastro — só quando há registros
          if (clients.length > 0) {
            pendingOutdoorsRef.current = clients as unknown as Record<string, unknown>[];
            pendingSourceTypeRef.current = 'clients';
            pendingTotalCountRef.current = clients.length;
          } else {
            // Sem registros: limpa qualquer estado residual
            pendingOutdoorsRef.current = [];
            pendingSourceTypeRef.current = null;
            pendingTotalCountRef.current = 0;
          }
        } else {
          const outdoors: Record<string, unknown>[] = Array.isArray(data) ? data : Array.isArray(data?.outdoors) ? data.outdoors : [];
          const analysis = data?.analysis as { totalPoints?: number; overview?: string } | undefined;
          const total = analysis?.totalPoints ?? outdoors.length;
          const warning = data?.warning ? `\n\n⚠️ ${data.warning}` : '';
          const overview = analysis?.overview ?? '';
          const isSpreadsheetSource = String(data?.sourceType || '') === 'spreadsheet';
          const fileTypeName = isSpreadsheetSource ? 'planilha/CSV' : 'arquivo';
          const registerHint = isSpreadsheetSource
            ? `Clique em **Um por um** para revisar cada item, ou **Tudo de uma vez** para cadastrar em lote.`
            : `Diga "quero cadastrar" para iniciar o cadastro assistido, ou "resumo" para ver o que foi extraído.`;
          replyContent =
            total > 0
              ? `Encontrei **${total} ponto(s) de mídia** na ${fileTypeName}.${overview ? `\n\n${overview}` : ''}\n\n${registerHint}${warning}`
              : `Recebi o ${fileTypeName}, mas não encontrei pontos de mídia para cadastrar. Verifique se as colunas seguem o padrão (Nome, Tipo, Cidade, Estado, Preço Mensal…).${warning}`;
          // Salva os registros nas refs para uso no sendMessage
          pendingOutdoorsRef.current = outdoors;
          pendingSourceTypeRef.current = String(data?.sourceType || 'pdf');
          pendingTotalCountRef.current = total > 0 ? total : outdoors.length;
        }

        const isClientsUpload = data?.domain === 'clients';
        const hasClientRecords = isClientsUpload && pendingOutdoorsRef.current.length > 0;
        const recordsFound = pendingOutdoorsRef.current.length;

        const assistantMessage: AssistantMessage = {
          id: createMessageId(),
          role: 'assistant',
          content: replyContent,
          createdAt: new Date().toISOString(),
          quickReplies: hasClientRecords
            ? [
                { label: 'Iniciar cadastro', value: 'iniciar cadastro' },
                { label: 'Ver resumo', value: 'resumo do arquivo' },
                { label: 'Cancelar', value: 'cancelar' },
              ]
            : isClientsUpload
              ? [{ label: 'Cancelar', value: 'cancelar' }]
              : recordsFound > 0
              ? [
                  { label: 'Um por um', value: 'um por um' },
                  { label: 'Tudo de uma vez', value: 'tudo de uma vez' },
                  { label: 'Ver resumo', value: 'resumo do arquivo' },
                ]
              : [],
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setSuggestedPrompts(['Quero cadastrar', 'Mostrar resumo', 'Cancelar']);
      } catch (error: unknown) {
        console.error('[Assistant] failed to upload file', error);
        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            role: 'assistant',
            createdAt: new Date().toISOString(),
            content: 'Não consegui processar o arquivo agora. Tente novamente em instantes.',
          },
        ]);
        toast.error('Não foi possível processar o arquivo.');
      } finally {
        setIsSending(false);
      }
    },
    [isSending],
  );

  const sendMessage = useCallback(
    async (message: string) => {
      const trimmed = String(message || '').trim();
      if (!trimmed || isSending) return;

      // Intercepta seleção de modo antes de enviar ao backend
      if (pendingOutdoorsRef.current.length > 0 && !uploadModeRef.current) {
        const normalized = trimmed
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();

        if (normalized === 'um por um' || normalized === 'um a um') {
          uploadModeRef.current = 'one-by-one';
          const userMsg: AssistantMessage = {
            id: createMessageId(),
            role: 'user',
            content: trimmed,
            createdAt: new Date().toISOString(),
          };
          const sysMsg: AssistantMessage = {
            id: createMessageId(),
            role: 'assistant',
            content: `Modo **um por um** ativo. Vou apresentar cada item para você revisar e adicionar fotos antes de avançar. Começando com o primeiro item…`,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, userMsg, sysMsg]);
          setTimeout(() => void sendMessageRef.current('quero cadastrar'), 300);
          return;
        }

        if (
          normalized === 'tudo de uma vez' ||
          normalized === 'em lote' ||
          normalized === 'todos de uma vez'
        ) {
          uploadModeRef.current = 'bulk';
          const userMsg: AssistantMessage = {
            id: createMessageId(),
            role: 'user',
            content: trimmed,
            createdAt: new Date().toISOString(),
          };
          const sysMsg: AssistantMessage = {
            id: createMessageId(),
            role: 'assistant',
            content: `Modo **tudo de uma vez** ativo. Vou cadastrar todos os ${pendingOutdoorsRef.current.length} itens automaticamente em sequência.`,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, userMsg, sysMsg]);
          setTimeout(() => void sendMessageRef.current('quero cadastrar'), 300);
          return;
        }
      }

      // ── Intercepta fluxo de cadastro de inventário: abre card de campos faltantes se necessário ──
      if (
        pendingSourceTypeRef.current !== 'clients' &&
        pendingOutdoorsRef.current.length > 0 &&
        (uploadModeRef.current === 'one-by-one' || uploadModeRef.current === 'bulk')
      ) {
        const normalized = trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const isRegisterCmd = ['quero cadastrar', 'cadastrar', 'confirmar', 'proximo', 'sim', 'ok'].some(
          (w) => normalized.includes(w),
        );
        if (isRegisterCmd) {
          const activeRecord = pendingOutdoorsRef.current[0] ?? {};
          const mediaType = String(activeRecord.type || 'OOH');
          const missing = buildMissingFields(activeRecord, mediaType);
          // Campos obrigatórios são os primeiros 5 (name, city, state, lat, lon),
          // exceto para planilhas/CSV onde lat/lon são opcionais (DB permite null).
          const isSpreadsheetUpload = pendingSourceTypeRef.current === 'spreadsheet';
          const requiredKeys = isSpreadsheetUpload
            ? ['name', 'addressCity', 'addressState']
            : ['name', 'addressCity', 'addressState', 'latitude', 'longitude'];
          const missingRequired = missing.filter((f) => requiredKeys.includes(f.key));
          if (missingRequired.length > 0) {
            // Mostra mensagem do usuário e abre card com campos faltantes sem chamar o backend
            const userMsg: AssistantMessage = {
              id: createMessageId(),
              role: 'user',
              content: trimmed,
              createdAt: new Date().toISOString(),
            };
            const sysMsg: AssistantMessage = {
              id: createMessageId(),
              role: 'assistant',
              content: `Preciso de mais ${missingRequired.length} dado(s) para completar esse cadastro. Preencha os campos abaixo:`,
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, userMsg, sysMsg]);
            const totalCount = pendingTotalCountRef.current;
            const queuePosition = totalCount - pendingOutdoorsRef.current.length + 1;
            setPendingEnrichment({
              entityId: '',
              entityName: String(activeRecord.name || 'Ponto de mídia').trim(),
              mediaType,
              queuePosition,
              totalItems: totalCount,
              units: [],
              missingFields: missingRequired, // apenas obrigatórios; complementares virão após criação
            });
            return;
          }
        }
      }

      // ── Intercepta fluxo de revisão de clientes: mostra card sem chamar backend ──
      if (pendingSourceTypeRef.current === 'clients' && pendingOutdoorsRef.current.length > 0) {
        const normalizedForClient = trimmed
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();
        const isClientStartCmd = [
          'quero', 'cadastr', 'iniciar', 'comecar', 'sim', 'ok', 'proximo', 'confirmar', 'avancar',
        ].some((w) => normalizedForClient.includes(w));
        if (isClientStartCmd) {
          const userMsg: AssistantMessage = {
            id: createMessageId(),
            role: 'user',
            content: trimmed,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, userMsg]);
          const totalCount = pendingTotalCountRef.current;
          const remaining = pendingOutdoorsRef.current;
          const activeRecord = remaining[0] ?? {};
          pendingOutdoorsRef.current = remaining.slice(1);
          if (pendingOutdoorsRef.current.length === 0) pendingSourceTypeRef.current = null;
          const queuePosition = totalCount - pendingOutdoorsRef.current.length;
          setPendingClientReview({ queuePosition, totalItems: totalCount, extractedRecord: activeRecord });
          return;
        }
      }

      const userMessage: AssistantMessage = {
        id: createMessageId(),
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);

      try {
        // Constrói documentContext se houver registros de upload pendentes
        const pendingOutdoors = pendingOutdoorsRef.current;
        const hasPendingOutdoors = pendingOutdoors.length > 0;
        const documentContext = hasPendingOutdoors
          ? {
              sourceType: pendingSourceTypeRef.current || 'pdf',
              totalRecords: pendingTotalCountRef.current || pendingOutdoors.length,
              remainingRecords: pendingOutdoors.length,
              activeRecord: pendingOutdoors[0] ?? {},
            }
          : null;

        // Se o documentContext está presente, força o módulo correto
        const forcedModule = hasPendingOutdoors
          ? (pendingSourceTypeRef.current === 'clients' ? 'clients' : 'inventory')
          : null;
        const effectiveScreenContext = forcedModule
          ? { ...screenContextRef.current, currentModule: forcedModule as string }
          : screenContextRef.current;

        const conversationHistory = [...messages, userMessage]
          .filter((item) => item.role === 'assistant' || item.role === 'user')
          .slice(-8)
          .map((item) => ({ role: item.role, content: item.content, createdAt: item.createdAt }));

        let response: { data: AssistantChatResponse };
        try {
          response = await apiClient.post<AssistantChatResponse>('/assistant/chat', {
            message: trimmed,
            screenContext: effectiveScreenContext,
            conversationHistory,
            ...(documentContext ? { documentContext } : {}),
          });
        } catch (err: any) {
          // Fallback: backend mais antigo pode rejeitar documentContext — tenta sem ele
          const msg = String(err?.response?.data?.message || '').toLowerCase();
          if (documentContext && msg.includes('documentcontext')) {
            const legacyLines = [
              'Quero cadastrar automaticamente o item atual do arquivo.',
              '',
              `Origem do arquivo: ${documentContext.sourceType}`,
              `Total de registros no arquivo: ${documentContext.totalRecords}`,
              `Registros restantes na fila: ${documentContext.remainingRecords}`,
              ...Object.entries(documentContext.activeRecord)
                .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
                .map(([k, v]) => `${k}: ${String(v)}`),
            ].join('\n');
            response = await apiClient.post<AssistantChatResponse>('/assistant/chat', {
              message: legacyLines,
              screenContext: effectiveScreenContext,
              conversationHistory,
            });
          } else {
            throw err;
          }
        }

        // Se o backend criou um ponto diretamente via chat (raro mas possível), avança fila
        const replyActions = response.data.reply?.actions ?? [];
        const executedDirectly =
          String((response.data as any)?.actionExecution?.status || '').toLowerCase() === 'completed' &&
          ((response.data as any)?.actionExecution?.meta?.created === true);

        if (hasPendingOutdoors && executedDirectly) {
          const sourceType = pendingSourceTypeRef.current;
          pendingOutdoorsRef.current = pendingOutdoors.slice(1);
          if (pendingOutdoorsRef.current.length === 0) {
            pendingSourceTypeRef.current = null;
            pendingTotalCountRef.current = 0;
          }
          window.dispatchEvent(new Event(sourceType === 'clients' ? 'clients:refresh' : 'inventory:refresh'));
        }

        // Auto-confirma ação de cadastro quando há contexto de upload ativo
        const autoConfirmAction = hasPendingOutdoors && replyActions.find(
          (a) => a.kind === 'write' &&
            (a.key === 'create_media_point' || a.key === 'create_client') &&
            !!a.requiresConfirmation,
        );
        if (autoConfirmAction) {
          applyAssistantResponse(response.data);
          // Executa automaticamente sem pedir confirmação
          setTimeout(() => {
            void executeActionRef.current(autoConfirmAction, true);
          }, 200);
        } else {
          applyAssistantResponse(response.data);
        }
      } catch (error: any) {
        console.error('[Assistant] failed to send message', error);
        const fallbackReply: AssistantMessage = {
          id: createMessageId(),
          role: 'assistant',
          createdAt: new Date().toISOString(),
          content: 'Não consegui falar com o serviço do assistente agora. Tente novamente em instantes.',
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

  const confirmEnrichmentStep = useCallback(
    async (mainPhoto: File | null, unitFiles: Record<string, File>, fieldValues: Record<string, unknown>) => {
      if (!pendingEnrichment) return;
      setIsSending(true);
      try {
        const { entityId, units, totalItems } = pendingEnrichment;

        // entityId vazio = ponto ainda não criado (campos obrigatórios faltavam)
        // Mescla os valores preenchidos no activeRecord e dispara o cadastro via chat
        if (!entityId) {
          const activeRecord = pendingOutdoorsRef.current[0] ?? {};
          const merged: Record<string, unknown> = { ...activeRecord };
          for (const field of pendingEnrichment.missingFields) {
            const val = fieldValues[field.key];
            if (val === undefined || val === '' || val === null) continue;
            if (Array.isArray(val) && val.length === 0) continue;
            if (field.type === 'number') {
              const num = parseFloat(String(val));
              if (!isNaN(num)) merged[field.key] = num;
            } else {
              merged[field.key] = val;
              // Para o campo 'name', também sobrescreve 'nome' (chave PT usada pelo parser do PDF)
              // Isso garante que o backend use o valor digitado pelo usuário em vez da extração da IA
              if (field.key === 'name') merged['nome'] = val;
              // Para 'addressCity', também sobrescreve 'cidade'
              if (field.key === 'addressCity') merged['cidade'] = val;
              // Para 'addressState', também sobrescreve 'estado'
              if (field.key === 'addressState') merged['estado'] = val;
            }
          }
          // Substitui o activeRecord com os dados completos
          pendingOutdoorsRef.current = [merged, ...pendingOutdoorsRef.current.slice(1)];
          setPendingEnrichment(null);
          setIsSending(false);
          // Dispara o cadastro agora que os campos obrigatórios foram preenchidos
          setTimeout(() => void sendMessageRef.current('quero cadastrar'), 200);
          return;
        }

        // 1. Upload da foto principal do ponto
        if (mainPhoto && entityId) {
          const fd = new FormData();
          fd.append('file', mainPhoto);
          await apiClient.post(`/media-points/${entityId}/image`, fd);
        }

        // 2. PATCH de campos complementares não extraídos
        if (entityId) {
          const patchData: Record<string, unknown> = {};
          for (const field of pendingEnrichment.missingFields) {
            const val = fieldValues[field.key];
            if (val === undefined || val === '' || val === null) continue;
            if (Array.isArray(val) && val.length === 0) continue;
            if (field.type === 'number') {
              const num = parseFloat(String(val));
              if (!isNaN(num) && num > 0) patchData[field.key] = num;
            } else {
              patchData[field.key] = val;
            }
          }
          if (Object.keys(patchData).length > 0) {
            try {
              await apiClient.put(`/media-points/${entityId}`, patchData);
            } catch {
              // Não-crítico: segue o fluxo mesmo se o patch falhar
            }
          }
        }

        // 3. Cria cada unidade de mídia e envia imagem da face/tela
        for (const unit of units) {
          let createdUnitId: string | null = null;
          try {
            const resp = await apiClient.post('/assistant/actions/execute', {
              action: unit.action,
              confirmed: true,
              screenContext: screenContextRef.current,
            });
            createdUnitId =
              String((resp.data as any)?.actionExecution?.meta?.entityId || '').trim() || null;
          } catch {
            // Segue mesmo se criação da unidade falhar
          }

          const file = unitFiles[unit.actionId];
          if (createdUnitId && file) {
            try {
              const fd = new FormData();
              fd.append('file', file);
              await apiClient.post(`/media-units/${createdUnitId}/image`, fd);
            } catch {
              // Segue mesmo se upload da imagem falhar
            }
          }
        }

        // 4. Limpa enriquecimento e avança fila
        setPendingEnrichment(null);
        window.dispatchEvent(new Event('inventory:refresh'));

        const remaining = pendingOutdoorsRef.current;
        if (remaining.length > 0) {
          setTimeout(() => void sendMessageRef.current('quero cadastrar'), 400);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: createMessageId(),
              role: 'assistant',
              content: `✅ Cadastro concluído! ${totalItems > 1 ? `Todos os ${totalItems} itens foram criados` : 'O item foi criado'} no Inventário com sucesso.`,
              createdAt: new Date().toISOString(),
            },
          ]);
          setSuggestedPrompts(['Abrir Inventário', 'Cadastrar mais pontos', 'Ver Mídia Kit']);
          uploadModeRef.current = null;
        }
      } catch (err) {
        console.error('[Enrichment] confirmEnrichmentStep failed', err);
        toast.error('Erro ao salvar enriquecimento. Tente novamente.');
      } finally {
        setIsSending(false);
      }
    },
    [pendingEnrichment],
  );

  const skipEnrichmentStep = useCallback(() => {
    setPendingEnrichment(null);

    const remaining = pendingOutdoorsRef.current;
    if (remaining.length > 0) {
      setTimeout(() => void sendMessageRef.current('quero cadastrar'), 200);
    } else {
      const total = pendingTotalCountRef.current;
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'assistant',
          content: `Cadastro concluído. ${total > 1 ? `${total} pontos foram criados` : 'O ponto foi criado'} no Inventário. Você pode adicionar imagens e faces pelo Inventário a qualquer momento.`,
          createdAt: new Date().toISOString(),
        },
      ]);
      setSuggestedPrompts(['Abrir Inventário', 'Cadastrar mais pontos']);
      pendingSourceTypeRef.current = null;
      pendingTotalCountRef.current = 0;
      uploadModeRef.current = null;
    }
  }, []);

  const confirmClientEnrichmentStep = useCallback(
    async (fieldValues: Record<string, unknown>) => {
      if (!pendingClientEnrichment) return;
      setIsSending(true);
      try {
        const { entityId } = pendingClientEnrichment;

        if (!entityId) {
          toast.warning('ID do cliente não localizado — dados complementares precisarão ser adicionados manualmente em Clientes.');
        }

        // PATCH dos campos complementares
        if (entityId) {
          const patchData: Record<string, unknown> = {};
          for (const field of pendingClientEnrichment.missingFields) {
            const val = fieldValues[field.key];
            if (val === undefined || val === '' || val === null) continue;
            patchData[field.key] = val;
          }
          if (Object.keys(patchData).length > 0) {
            await apiClient.put(`/clients/${entityId}`, patchData);
          }
        }

        setPendingClientEnrichment(null);

        const remaining = pendingOutdoorsRef.current;
        if (remaining.length > 0) {
          setTimeout(() => void sendMessageRef.current('quero cadastrar'), 200);
        } else {
          const total = pendingTotalCountRef.current;
          setMessages((prev) => [
            ...prev,
            {
              id: createMessageId(),
              role: 'assistant',
              content: `Importação concluída! ${total > 1 ? `${total} clientes foram criados` : 'O cliente foi criado'} na base. Você pode complementar os dados a qualquer momento em Clientes.`,
              createdAt: new Date().toISOString(),
              quickReplies: [
                { label: 'Abrir Clientes', value: 'abrir clientes' },
                { label: 'Resumir base', value: 'resumo de clientes' },
              ],
            },
          ]);
          setSuggestedPrompts(['Abrir Clientes', 'Resumir base de clientes']);
          pendingSourceTypeRef.current = null;
          pendingTotalCountRef.current = 0;
          uploadModeRef.current = null;
        }
      } catch (err) {
        console.error('[Enrichment] confirmClientEnrichmentStep failed', err);
        toast.error('Não foi possível salvar os dados complementares agora.');
      } finally {
        setIsSending(false);
      }
    },
    [pendingClientEnrichment],
  );

  const skipClientEnrichmentStep = useCallback(() => {
    setPendingClientEnrichment(null);

    const remaining = pendingOutdoorsRef.current;
    if (remaining.length > 0) {
      setTimeout(() => void sendMessageRef.current('quero cadastrar'), 200);
    } else {
      const total = pendingTotalCountRef.current;
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'assistant',
          content: `Cadastro concluído. ${total > 1 ? `${total} clientes foram criados` : 'O cliente foi criado'} na base de Clientes.`,
          createdAt: new Date().toISOString(),
        },
      ]);
      setSuggestedPrompts(['Abrir Clientes', 'Resumir base de clientes']);
      pendingSourceTypeRef.current = null;
      pendingTotalCountRef.current = 0;
      uploadModeRef.current = null;
    }
  }, []);

  const confirmClientReview = useCallback(
    async (fieldValues: Record<string, unknown>) => {
      if (!pendingClientReview) return;
      setIsSending(true);
      try {
        const toStr = (v: unknown): string | null => {
          const s = String(v ?? '').trim();
          return s || null;
        };

        const contactName = toStr(fieldValues.contactName) || toStr(fieldValues.companyName) || null;
        if (!contactName) {
          toast.error('Informe pelo menos o nome do contato ou da empresa.');
          return;
        }

        const createDto: Record<string, unknown> = {
          contactName,
          origin: 'Assistente',
        };
        const optionals: (keyof typeof fieldValues)[] = [
          'companyName', 'cnpj', 'email', 'phone', 'role', 'addressCity', 'addressState',
        ];
        for (const k of optionals) {
          const v = toStr(fieldValues[k]);
          if (v) createDto[k] = v;
        }
        const status = toStr(fieldValues.status);
        createDto.status = status || 'LEAD';

        await apiClient.post('/clients', createDto);
        window.dispatchEvent(new Event('clients:refresh'));

        setPendingClientReview(null);

        const remaining = pendingOutdoorsRef.current;
        if (remaining.length > 0) {
          const totalCount = pendingTotalCountRef.current;
          const activeRecord = remaining[0] ?? {};
          pendingOutdoorsRef.current = remaining.slice(1);
          if (pendingOutdoorsRef.current.length === 0) pendingSourceTypeRef.current = null;
          const queuePosition = totalCount - pendingOutdoorsRef.current.length;
          setPendingClientReview({ queuePosition, totalItems: totalCount, extractedRecord: activeRecord });
        } else {
          const total = pendingTotalCountRef.current;
          setMessages((prev) => [
            ...prev,
            {
              id: createMessageId(),
              role: 'assistant',
              content: `✅ Importação concluída! ${total > 1 ? `${total} clientes foram criados` : 'O cliente foi criado'} na base. Você pode complementar os dados a qualquer momento em **Clientes**.`,
              createdAt: new Date().toISOString(),
              quickReplies: [
                { label: 'Abrir Clientes', value: 'abrir clientes' },
                { label: 'Resumir base', value: 'resumo de clientes' },
              ],
            },
          ]);
          setSuggestedPrompts(['Abrir Clientes', 'Resumir base de clientes']);
          pendingTotalCountRef.current = 0;
          uploadModeRef.current = null;
        }
      } catch (err) {
        console.error('[ClientReview] confirmClientReview failed', err);
        toast.error('Não foi possível criar o cliente agora. Tente novamente.');
      } finally {
        setIsSending(false);
      }
    },
    [pendingClientReview],
  );

  const skipClientReview = useCallback(() => {
    if (!pendingClientReview) return;
    setPendingClientReview(null);

    const remaining = pendingOutdoorsRef.current;
    if (remaining.length > 0) {
      const totalCount = pendingTotalCountRef.current;
      const activeRecord = remaining[0] ?? {};
      pendingOutdoorsRef.current = remaining.slice(1);
      if (pendingOutdoorsRef.current.length === 0) pendingSourceTypeRef.current = null;
      const queuePosition = totalCount - pendingOutdoorsRef.current.length;
      setPendingClientReview({ queuePosition, totalItems: totalCount, extractedRecord: activeRecord });
    } else {
      const total = pendingTotalCountRef.current;
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'assistant',
          content: `Cadastro encerrado. ${total > 1 ? `${total} clientes processados` : 'Cliente processado'} na importação.`,
          createdAt: new Date().toISOString(),
        },
      ]);
      setSuggestedPrompts(['Abrir Clientes', 'Resumir base de clientes']);
      pendingTotalCountRef.current = 0;
      uploadModeRef.current = null;
    }
  }, [pendingClientReview]);

  // Mantém as refs sempre atualizadas para evitar dependências circulares
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    executeActionRef.current = executeAction;
  }, [executeAction]);

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
      loginBriefing,
      hasUnreadBriefing,
      pendingEnrichment,
      pendingClientEnrichment,
      pendingClientReview,
      setIsOpen,
      setScreenContext,
      sendMessage,
      sendFile,
      consumeQuickReply,
      performAction,
      executeAction,
      confirmEnrichmentStep,
      skipEnrichmentStep,
      confirmClientEnrichmentStep,
      skipClientEnrichmentStep,
      confirmClientReview,
      skipClientReview,
      resetConversation,
    }),
    [
      confirmEnrichmentStep,
      confirmClientEnrichmentStep,
      executeAction,
      hasUnreadBriefing,
      history,
      isOpen,
      isSending,
      loginBriefing,
      memorySummary,
      messages,
      pendingEnrichment,
      pendingClientEnrichment,
      pendingClientReview,
      performAction,
      proactivePrompts,
      providerName,
      resetConversation,
      screenContext,
      sendFile,
      sendMessage,
      consumeQuickReply,
      setScreenContext,
      setIsOpen,
      skipEnrichmentStep,
      skipClientEnrichmentStep,
      confirmClientReview,
      skipClientReview,
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
