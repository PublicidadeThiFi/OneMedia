import apiClient from './apiClient';
import type { TutorialModuleKey, TutorialProgress, TutorialProgressStatus } from '../tutorials/types';

export interface UpdateTutorialProgressPayload {
  status?: TutorialProgressStatus;
  currentStep?: number;
  tutorialVersion?: number;
}

function normalizeTutorialProgress(moduleKey: string, payload: Partial<TutorialProgress> | null | undefined): TutorialProgress {
  return {
    id: payload?.id ?? null,
    userId: payload?.userId ?? '',
    moduleKey: payload?.moduleKey ?? moduleKey,
    tutorialVersion: Number(payload?.tutorialVersion ?? 1),
    status: (payload?.status as TutorialProgressStatus | undefined) ?? 'NOT_STARTED',
    currentStep: Number(payload?.currentStep ?? 0),
    startedAt: payload?.startedAt ?? null,
    completedAt: payload?.completedAt ?? null,
    skippedAt: payload?.skippedAt ?? null,
    lastSeenAt: payload?.lastSeenAt ?? null,
    createdAt: payload?.createdAt ?? null,
    updatedAt: payload?.updatedAt ?? null,
  };
}

export async function getTutorialProgress(moduleKey: TutorialModuleKey | string): Promise<TutorialProgress> {
  const response = await apiClient.get<TutorialProgress>(`/tutorials/progress/${moduleKey}`);
  return normalizeTutorialProgress(String(moduleKey), response.data);
}

export async function updateTutorialProgress(
  moduleKey: TutorialModuleKey | string,
  payload: UpdateTutorialProgressPayload,
): Promise<TutorialProgress> {
  const response = await apiClient.put<TutorialProgress>(`/tutorials/progress/${moduleKey}`, payload);
  return normalizeTutorialProgress(String(moduleKey), response.data);
}
