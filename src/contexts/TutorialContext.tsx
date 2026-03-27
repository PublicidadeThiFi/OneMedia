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
import { buildTutorialSession, getTutorialDefinition, hasTutorialDefinition, listTutorialDefinitions } from '../tutorials/moduleTutorials';
import type { TutorialDefinition, TutorialModuleKey, TutorialSession, TutorialStep } from '../tutorials/types';

interface TutorialContextValue {
  currentModule: TutorialModuleKey | null;
  activeTutorial: TutorialSession | null;
  tutorialDefinitions: TutorialDefinition[];
  isOpen: boolean;
  currentStepIndex: number;
  currentStep: TutorialStep | null;
  totalSteps: number;
  hasPreviousStep: boolean;
  hasNextStep: boolean;
  setCurrentModule: (moduleKey: TutorialModuleKey | null) => void;
  openTutorial: (session: TutorialSession) => void;
  openModuleTutorial: (
    moduleKey: TutorialModuleKey | string,
    options?: Pick<TutorialSession, 'onClose' | 'onComplete'>,
  ) => boolean;
  closeTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  restartTutorial: () => void;
  getTutorialForModule: (moduleKey: TutorialModuleKey | string | null | undefined) => TutorialDefinition | null;
  hasTutorialForModule: (moduleKey: TutorialModuleKey | string | null | undefined) => boolean;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

function normalizeSession(session: TutorialSession): TutorialSession | null {
  const normalizedSteps = [...session.steps].sort((a, b) => a.order - b.order);
  if (normalizedSteps.length === 0) return null;

  return {
    ...session,
    steps: normalizedSteps,
  };
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [currentModule, setCurrentModule] = useState<TutorialModuleKey | null>(null);
  const [activeTutorial, setActiveTutorial] = useState<TutorialSession | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const lastTutorialRef = useRef<TutorialSession | null>(null);

  const tutorialDefinitions = useMemo(() => listTutorialDefinitions(), []);
  const isOpen = Boolean(activeTutorial && activeTutorial.steps.length > 0);
  const totalSteps = activeTutorial?.steps.length ?? 0;
  const currentStep = activeTutorial?.steps[currentStepIndex] ?? null;
  const hasPreviousStep = currentStepIndex > 0;
  const hasNextStep = currentStepIndex < totalSteps - 1;

  const openTutorial = useCallback((session: TutorialSession) => {
    const normalizedSession = normalizeSession(session);
    if (!normalizedSession) {
      setActiveTutorial(null);
      setCurrentStepIndex(0);
      return;
    }

    lastTutorialRef.current = normalizedSession;
    setCurrentStepIndex(0);
    setActiveTutorial(normalizedSession);
  }, []);

  const getTutorialForModule = useCallback((moduleKey: TutorialModuleKey | string | null | undefined) => {
    return getTutorialDefinition(moduleKey);
  }, []);

  const hasTutorialForModule = useCallback((moduleKey: TutorialModuleKey | string | null | undefined) => {
    return hasTutorialDefinition(moduleKey);
  }, []);

  const openModuleTutorial = useCallback(
    (moduleKey: TutorialModuleKey | string, options?: Pick<TutorialSession, 'onClose' | 'onComplete'>) => {
      const session = buildTutorialSession(moduleKey, options);
      if (!session) return false;

      openTutorial(session);
      return true;
    },
    [openTutorial],
  );

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

    setCurrentStepIndex(0);
    setActiveTutorial(normalizeSession(tutorialToRestart));
  }, [activeTutorial]);

  useEffect(() => {
    if (!activeTutorial || !currentModule) return;
    if (activeTutorial.moduleKey === currentModule) return;

    setActiveTutorial(null);
    setCurrentStepIndex(0);
  }, [activeTutorial, currentModule]);

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
      restartTutorial,
      totalSteps,
      tutorialDefinitions,
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
  TutorialDefinition,
  TutorialModuleKey,
  TutorialPlacement,
  TutorialSession,
  TutorialStep,
} from '../tutorials/types';
