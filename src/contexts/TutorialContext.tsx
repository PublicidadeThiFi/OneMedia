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

export type TutorialPlacement = 'top' | 'right' | 'bottom' | 'left' | 'center';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  placement?: TutorialPlacement;
  offset?: number;
}

export interface TutorialSession {
  moduleKey: string;
  title?: string;
  version?: number;
  steps: TutorialStep[];
  onComplete?: () => void;
  onClose?: () => void;
}

interface TutorialContextValue {
  currentModule: string | null;
  activeTutorial: TutorialSession | null;
  isOpen: boolean;
  currentStepIndex: number;
  currentStep: TutorialStep | null;
  totalSteps: number;
  hasPreviousStep: boolean;
  hasNextStep: boolean;
  setCurrentModule: (moduleKey: string | null) => void;
  openTutorial: (session: TutorialSession) => void;
  closeTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  restartTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [currentModule, setCurrentModule] = useState<string | null>(null);
  const [activeTutorial, setActiveTutorial] = useState<TutorialSession | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const lastTutorialRef = useRef<TutorialSession | null>(null);

  const isOpen = Boolean(activeTutorial && activeTutorial.steps.length > 0);
  const totalSteps = activeTutorial?.steps.length ?? 0;
  const currentStep = activeTutorial?.steps[currentStepIndex] ?? null;
  const hasPreviousStep = currentStepIndex > 0;
  const hasNextStep = currentStepIndex < totalSteps - 1;

  const openTutorial = useCallback((session: TutorialSession) => {
    lastTutorialRef.current = session;
    setCurrentStepIndex(0);
    setActiveTutorial(session.steps.length > 0 ? session : null);
  }, []);

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
    setActiveTutorial(tutorialToRestart.steps.length > 0 ? tutorialToRestart : null);
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
      isOpen,
      currentStepIndex,
      currentStep,
      totalSteps,
      hasPreviousStep,
      hasNextStep,
      setCurrentModule,
      openTutorial,
      closeTutorial,
      nextStep,
      previousStep,
      restartTutorial,
    }),
    [
      activeTutorial,
      closeTutorial,
      currentModule,
      currentStep,
      currentStepIndex,
      hasNextStep,
      hasPreviousStep,
      isOpen,
      nextStep,
      openTutorial,
      previousStep,
      restartTutorial,
      totalSteps,
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
