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
import { useAuth } from '../hooks/useAuth';
import { getTutorialProgress, updateTutorialProgress } from '../lib/tutorialProgress';
import { buildTutorialSession, getTutorialDefinition, hasTutorialDefinition, listTutorialDefinitions } from '../tutorials/moduleTutorials';
import type {
  OpenModuleTutorialOptions,
  TutorialDefinition,
  TutorialModuleKey,
  TutorialProgress,
  TutorialProgressStatus,
  TutorialSession,
  TutorialStep,
} from '../tutorials/types';

interface TutorialContextValue {
  currentModule: TutorialModuleKey | null;
  activeTutorial: TutorialSession | null;
  tutorialDefinitions: TutorialDefinition[];
  tutorialProgressByModule: Partial<Record<TutorialModuleKey, TutorialProgress>>;
  isOpen: boolean;
  currentStepIndex: number;
  currentStep: TutorialStep | null;
  totalSteps: number;
  hasPreviousStep: boolean;
  hasNextStep: boolean;
  setCurrentModule: (moduleKey: TutorialModuleKey | null) => void;
  openTutorial: (session: TutorialSession) => void;
  openModuleTutorial: (moduleKey: TutorialModuleKey | string, options?: OpenModuleTutorialOptions) => boolean;
  closeTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  restartTutorial: () => void;
  getTutorialForModule: (moduleKey: TutorialModuleKey | string | null | undefined) => TutorialDefinition | null;
  hasTutorialForModule: (moduleKey: TutorialModuleKey | string | null | undefined) => boolean;
  refreshTutorialProgress: (moduleKey: TutorialModuleKey | string, force?: boolean) => Promise<TutorialProgress | null>;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

function clampStepIndex(stepIndex: number | undefined, totalSteps: number): number {
  if (totalSteps <= 0) return 0;
  return Math.min(Math.max(stepIndex ?? 0, 0), totalSteps - 1);
}

function normalizeSession(session: TutorialSession): TutorialSession | null {
  const normalizedSteps = [...session.steps].sort((a, b) => a.order - b.order);
  if (normalizedSteps.length === 0) return null;

  return {
    ...session,
    steps: normalizedSteps,
    initialStepIndex: clampStepIndex(session.initialStepIndex, normalizedSteps.length),
  };
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { authReady, user } = useAuth();
  const [currentModule, setCurrentModule] = useState<TutorialModuleKey | null>(null);
  const [activeTutorial, setActiveTutorial] = useState<TutorialSession | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tutorialProgressByModule, setTutorialProgressByModule] = useState<
    Partial<Record<TutorialModuleKey, TutorialProgress>>
  >({});

  const lastTutorialRef = useRef<TutorialSession | null>(null);
  const currentStepIndexRef = useRef(0);
  const progressCacheRef = useRef<Partial<Record<TutorialModuleKey, TutorialProgress>>>({});
  const autoOpenRequestRef = useRef(0);
  const lastStepSyncSignatureRef = useRef('');
  const sessionHandledRef = useRef(false);

  const tutorialDefinitions = useMemo(() => listTutorialDefinitions(), []);
  const isOpen = Boolean(activeTutorial && activeTutorial.steps.length > 0);
  const totalSteps = activeTutorial?.steps.length ?? 0;
  const currentStep = activeTutorial?.steps[currentStepIndex] ?? null;
  const hasPreviousStep = currentStepIndex > 0;
  const hasNextStep = currentStepIndex < totalSteps - 1;

  const upsertTutorialProgress = useCallback((progress: TutorialProgress | null) => {
    if (!progress?.moduleKey) return;
    const moduleKey = progress.moduleKey as TutorialModuleKey;

    setTutorialProgressByModule((current) => {
      const next = {
        ...current,
        [moduleKey]: progress,
      };
      progressCacheRef.current = next;
      return next;
    });
  }, []);

  const getTutorialForModule = useCallback((moduleKey: TutorialModuleKey | string | null | undefined) => {
    return getTutorialDefinition(moduleKey);
  }, []);

  const hasTutorialForModule = useCallback((moduleKey: TutorialModuleKey | string | null | undefined) => {
    return hasTutorialDefinition(moduleKey);
  }, []);

  const buildOptimisticProgress = useCallback(
    (
      moduleKey: TutorialModuleKey | string,
      payload: {
        status: TutorialProgressStatus;
        currentStep: number;
        tutorialVersion: number;
      },
    ): TutorialProgress => {
      const normalizedModuleKey = String(moduleKey) as TutorialModuleKey;
      const existing = progressCacheRef.current[normalizedModuleKey];
      const now = new Date().toISOString();

      return {
        id: existing?.id ?? null,
        userId: existing?.userId ?? user?.id ?? '',
        moduleKey: normalizedModuleKey,
        tutorialVersion: payload.tutorialVersion,
        status: payload.status,
        currentStep: payload.currentStep,
        startedAt:
          payload.status === 'NOT_STARTED'
            ? null
            : existing?.startedAt ?? now,
        completedAt: payload.status === 'COMPLETED' ? now : null,
        skippedAt: payload.status === 'SKIPPED' ? now : null,
        lastSeenAt: now,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
    },
    [user?.id],
  );

  const refreshTutorialProgress = useCallback(
    async (moduleKey: TutorialModuleKey | string, force = false) => {
      if (!authReady || !user?.id) return null;

      const normalizedModuleKey = String(moduleKey) as TutorialModuleKey;
      if (!hasTutorialDefinition(normalizedModuleKey)) return null;

      if (!force) {
        const cached = progressCacheRef.current[normalizedModuleKey];
        if (cached) return cached;
      }

      try {
        const progress = await getTutorialProgress(normalizedModuleKey);
        upsertTutorialProgress(progress);
        return progress;
      } catch (error) {
        console.error('Falha ao carregar progresso do tutorial:', error);
        return null;
      }
    },
    [authReady, upsertTutorialProgress, user?.id],
  );

  const persistTutorialProgress = useCallback(
    async (
      moduleKey: TutorialModuleKey | string,
      payload: {
        status: TutorialProgressStatus;
        currentStep: number;
        tutorialVersion: number;
      },
    ) => {
      if (!authReady || !user?.id) return null;

      const optimisticProgress = buildOptimisticProgress(moduleKey, payload);
      upsertTutorialProgress(optimisticProgress);

      try {
        const progress = await updateTutorialProgress(moduleKey, payload);
        upsertTutorialProgress(progress);
        return progress;
      } catch (error) {
        console.error('Falha ao salvar progresso do tutorial:', error);
        return optimisticProgress;
      }
    },
    [authReady, buildOptimisticProgress, upsertTutorialProgress, user?.id],
  );

  const openTutorial = useCallback((session: TutorialSession) => {
    const normalizedSession = normalizeSession(session);
    if (!normalizedSession) {
      setActiveTutorial(null);
      setCurrentStepIndex(0);
      return;
    }

    sessionHandledRef.current = false;
    lastTutorialRef.current = normalizedSession;
    setCurrentStepIndex(normalizedSession.initialStepIndex ?? 0);
    setActiveTutorial(normalizedSession);
  }, []);

  const openModuleTutorial = useCallback(
    (moduleKey: TutorialModuleKey | string, options?: OpenModuleTutorialOptions) => {
      const definition = getTutorialDefinition(moduleKey);
      const session = buildTutorialSession(moduleKey, {
        onClose: undefined,
        onComplete: undefined,
      });

      if (!definition || !session) return false;

      const initialStepIndex = clampStepIndex(options?.initialStepIndex, session.steps.length);

      const trackedSession: TutorialSession = {
        ...session,
        initialStepIndex,
        onClose: () => {
          if (!sessionHandledRef.current) {
            sessionHandledRef.current = true;
            void persistTutorialProgress(definition.moduleKey, {
              status: 'SKIPPED',
              currentStep: clampStepIndex(currentStepIndexRef.current, session.steps.length),
              tutorialVersion: definition.version,
            });
          }
          options?.onClose?.();
        },
        onComplete: () => {
          if (!sessionHandledRef.current) {
            sessionHandledRef.current = true;
            void persistTutorialProgress(definition.moduleKey, {
              status: 'COMPLETED',
              currentStep: Math.max(session.steps.length - 1, 0),
              tutorialVersion: definition.version,
            });
          }
          options?.onComplete?.();
        },
      };

      openTutorial(trackedSession);
      return true;
    },
    [openTutorial, persistTutorialProgress],
  );

  useEffect(() => {
    currentStepIndexRef.current = currentStepIndex;
  }, [currentStepIndex]);

  const closeTutorial = useCallback(() => {
    setActiveTutorial((current) => {
      current?.onClose?.();
      return null;
    });
    setCurrentStepIndex(0);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((currentIndex) => {
      if (!activeTutorial) return currentIndex;

      const isLastStep = currentIndex >= activeTutorial.steps.length - 1;
      if (isLastStep) {
        activeTutorial.onComplete?.();
        setActiveTutorial(null);
        return 0;
      }

      return currentIndex + 1;
    });
  }, [activeTutorial]);

  const previousStep = useCallback(() => {
    setCurrentStepIndex((currentIndex) => Math.max(0, currentIndex - 1));
  }, []);

  const restartTutorial = useCallback(() => {
    const tutorialToRestart = activeTutorial ?? lastTutorialRef.current;
    if (!tutorialToRestart) return;

    sessionHandledRef.current = false;
    const restartedTutorial = normalizeSession({
      ...tutorialToRestart,
      initialStepIndex: 0,
    });

    if (!restartedTutorial) return;

    lastTutorialRef.current = restartedTutorial;
    setCurrentStepIndex(0);
    setActiveTutorial(restartedTutorial);
  }, [activeTutorial]);

  useEffect(() => {
    if (!activeTutorial || !currentModule) return;
    if (activeTutorial.moduleKey === currentModule) return;

    setActiveTutorial((current) => {
      current?.onClose?.();
      return null;
    });
    setCurrentStepIndex(0);
  }, [activeTutorial, currentModule]);

  useEffect(() => {
    setTutorialProgressByModule({});
    progressCacheRef.current = {};
    autoOpenRequestRef.current = 0;
    lastStepSyncSignatureRef.current = '';
    lastTutorialRef.current = null;
    sessionHandledRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (!authReady || !user?.id || !currentModule) return;
    if (!hasTutorialDefinition(currentModule)) return;
    if (isOpen && activeTutorial?.moduleKey === currentModule) return;

    const definition = getTutorialDefinition(currentModule);
    if (!definition) return;

    let cancelled = false;
    const requestId = ++autoOpenRequestRef.current;

    const evaluateAutoOpen = async () => {
      const progress = await refreshTutorialProgress(currentModule);
      if (cancelled || autoOpenRequestRef.current !== requestId) return;

      const shouldReopenForVersion = !progress || progress.tutorialVersion < definition.version;
      const currentStatus = progress?.status ?? 'NOT_STARTED';

      if (shouldReopenForVersion || currentStatus === 'NOT_STARTED') {
        openModuleTutorial(currentModule, { initialStepIndex: 0 });
        return;
      }

      if (currentStatus === 'IN_PROGRESS') {
        openModuleTutorial(currentModule, {
          initialStepIndex: clampStepIndex(progress?.currentStep ?? 0, definition.steps.length),
        });
      }
    };

    void evaluateAutoOpen();

    return () => {
      cancelled = true;
    };
  }, [activeTutorial?.moduleKey, authReady, currentModule, isOpen, openModuleTutorial, refreshTutorialProgress, user?.id]);

  useEffect(() => {
    if (!activeTutorial || !isOpen || !authReady || !user?.id) return;

    const signature = `${activeTutorial.moduleKey}:${activeTutorial.version}:${currentStepIndex}`;
    if (lastStepSyncSignatureRef.current === signature) return;
    lastStepSyncSignatureRef.current = signature;

    void persistTutorialProgress(activeTutorial.moduleKey, {
      status: 'IN_PROGRESS',
      currentStep: currentStepIndex,
      tutorialVersion: activeTutorial.version,
    });
  }, [activeTutorial, authReady, currentStepIndex, isOpen, persistTutorialProgress, user?.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeTutorial();
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault();
        nextStep();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previousStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeTutorial, isOpen, nextStep, previousStep]);

  const value = useMemo<TutorialContextValue>(
    () => ({
      currentModule,
      activeTutorial,
      tutorialDefinitions,
      tutorialProgressByModule,
      isOpen,
      currentStepIndex,
      currentStep,
      totalSteps,
      hasPreviousStep,
      hasNextStep,
      setCurrentModule,
      openTutorial,
      openModuleTutorial,
      closeTutorial,
      nextStep,
      previousStep,
      restartTutorial,
      getTutorialForModule,
      hasTutorialForModule,
      refreshTutorialProgress,
    }),
    [
      activeTutorial,
      closeTutorial,
      currentModule,
      currentStep,
      currentStepIndex,
      getTutorialForModule,
      hasNextStep,
      hasPreviousStep,
      hasTutorialForModule,
      isOpen,
      nextStep,
      openModuleTutorial,
      openTutorial,
      previousStep,
      refreshTutorialProgress,
      restartTutorial,
      totalSteps,
      tutorialDefinitions,
      tutorialProgressByModule,
    ],
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }

  return context;
}

export type {
  OpenModuleTutorialOptions,
  TutorialDefinition,
  TutorialModuleKey,
  TutorialPlacement,
  TutorialProgress,
  TutorialProgressStatus,
  TutorialSession,
  TutorialStep,
} from '../tutorials/types';
