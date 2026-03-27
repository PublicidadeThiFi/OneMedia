export type TutorialModuleKey =
  | 'home'
  | 'dashboard'
  | 'inventory'
  | 'mediamap'
  | 'clients'
  | 'products'
  | 'proposals'
  | 'campaigns'
  | 'reservations'
  | 'financial'
  | 'messages'
  | 'mediakit'
  | 'promotions'
  | 'activities'
  | 'settings'
  | 'superadmin'
  | 'proposals-create-flow'
  | 'mediamap-move-flow'
  | 'mediamap-create-flow'
  | 'campaigns-create-flow'
  | 'reservations-conflicts-flow';

export type TutorialScopeModuleKey =
  | 'home'
  | 'dashboard'
  | 'inventory'
  | 'mediamap'
  | 'clients'
  | 'products'
  | 'proposals'
  | 'campaigns'
  | 'reservations'
  | 'financial'
  | 'messages'
  | 'mediakit'
  | 'promotions'
  | 'activities'
  | 'settings'
  | 'superadmin';

export type TutorialPlacement = 'top' | 'right' | 'bottom' | 'left' | 'center';

export type TutorialProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export interface TutorialStep {
  id: string;
  order: number;
  title: string;
  description: string;
  target?: string;
  placement?: TutorialPlacement;
  offset?: number;
}

export interface TutorialDefinition {
  moduleKey: TutorialModuleKey;
  title: string;
  version: number;
  steps: TutorialStep[];
  scopeModuleKey?: TutorialScopeModuleKey;
}

export interface TutorialProgress {
  id: string | null;
  userId: string;
  moduleKey: string;
  tutorialVersion: number;
  status: TutorialProgressStatus;
  currentStep: number;
  startedAt: string | Date | null;
  completedAt: string | Date | null;
  skippedAt: string | Date | null;
  lastSeenAt: string | Date | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}

export interface TutorialSession extends TutorialDefinition {
  initialStepIndex?: number;
  onComplete?: () => void;
  onClose?: () => void;
}

export interface OpenModuleTutorialOptions {
  onClose?: () => void;
  onComplete?: () => void;
  initialStepIndex?: number;
}
