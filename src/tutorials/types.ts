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
  | 'superadmin';

export type TutorialPlacement = 'top' | 'right' | 'bottom' | 'left' | 'center';

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
}

export interface TutorialSession extends TutorialDefinition {
  onComplete?: () => void;
  onClose?: () => void;
}
