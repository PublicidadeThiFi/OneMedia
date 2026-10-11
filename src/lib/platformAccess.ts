import apiClient from './apiClient';

export type PlatformModule = 'OOH' | 'DOOH';
export type ModuleAccessMode = 'FULL' | 'READ_ONLY' | 'NONE';

export type PlatformAccessReason =
  | 'ACTIVE_SUBSCRIPTION'
  | 'TRIAL_ACTIVE'
  | 'TRIAL_EXEMPT'
  | 'GRACE_PERIOD'
  | 'CANCELED_ACCESS_UNTIL_END'
  | 'TRIAL_EXPIRED'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'NO_SUBSCRIPTION'
  | 'MODULE_NOT_GRANTED'
  | 'ENTITLEMENT_CONFLICT'
  | 'LEGACY_COMPATIBILITY';

export interface PlatformModuleAccess {
  module: PlatformModule;
  granted: boolean;
  accessMode: ModuleAccessMode;
  reason: PlatformAccessReason;
  message: string;
  subscriptionIds: string[];
  capabilities: string[];
  limits: Record<string, unknown>;
  trialEndsAt: string | null;
  trialExempt: boolean;
  currentPeriodEnd: string | null;
  graceUntil: string | null;
}

export interface PlatformAccessSnapshot {
  companyId: string;
  modules: Record<PlatformModule, PlatformModuleAccess>;
  sharedLimits: {
    usersLimit: number | null;
    storageLimitMb: number | null;
    trafficLimitMb: number | null;
  };
  generatedAt: string;
  compatibilityMode: 'GRANTS_D1B' | 'LEGACY_OOH_FALLBACK';
}

export function isModuleUsable(access?: PlatformModuleAccess | null): boolean {
  return Boolean(access?.granted && access.accessMode !== 'NONE');
}

export function isModuleWritable(access?: PlatformModuleAccess | null): boolean {
  return Boolean(access?.granted && access.accessMode === 'FULL');
}

export async function fetchPlatformAccess(): Promise<PlatformAccessSnapshot> {
  const response = await apiClient.get<PlatformAccessSnapshot>('/platform-access');
  return response.data;
}
