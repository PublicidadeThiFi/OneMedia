/**
 * CompanyContext - Global company and subscription state
 *
 * SINGLE SOURCE OF TRUTH for:
 * - Current company data
 * - Platform subscription details
 * - Platform plan information
 * - Access control (trial/subscription) => read-only mode
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import { useAuth } from './AuthContext';
import apiClient from '../lib/apiClient';
import {
  Company,
  PlatformSubscription,
  PlatformPlan,
  PlatformSubscriptionStatus,
  CompanySubscriptionStatus,
} from '../types';
import {
  AccessBlockReason,
  getAccessState,
  setAccessState as persistAccessState,
  clearAccessState,
  defaultBlockMessage,
  subscribeAccessState,
} from '../lib/accessControl';

interface CompanyContextValue {
  // Current data
  company: Company | null;
  subscription: PlatformSubscription | null;
  plan: PlatformPlan | null;

  // Computed values
  isTrialActive: boolean;
  daysRemainingInTrial: number | null;
  pointsUsed: number;
  pointsLimit: number;
  canAddMorePoints: boolean;

  // Access control (trial/subscription)
  isBlocked: boolean;
  blockReason: AccessBlockReason | null;
  blockMessage: string | null;
  isTrialEndingSoon: boolean;

  // Actions
  updateCompanyData: (updates: Partial<Company>) => Promise<void>;
  updateSubscriptionData: (updates: Partial<PlatformSubscription>) => Promise<void>;
  refreshCompanyData: () => Promise<void>;
  refreshPointsUsed: () => Promise<void>;

  // Loading state
  isLoading: boolean;
  error?: string | null;
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function computeBlock(
  company: Company | null,
  subscription: PlatformSubscription | null
): { isBlocked: boolean; reason: AccessBlockReason | null } {
  const now = Date.now();
  const trialEndsAt = toDate(company?.trialEndsAt)?.getTime() ?? null;

  const hasActiveSubscription =
    subscription?.status === PlatformSubscriptionStatus.ATIVA ||
    company?.subscriptionStatus === CompanySubscriptionStatus.ACTIVE;

  const inTrial =
    subscription?.status === PlatformSubscriptionStatus.TESTE ||
    company?.subscriptionStatus === CompanySubscriptionStatus.TRIAL;

  const isPastDue =
    subscription?.status === PlatformSubscriptionStatus.EM_ATRASO ||
    company?.subscriptionStatus === CompanySubscriptionStatus.PAST_DUE;

  const isCanceled =
    subscription?.status === PlatformSubscriptionStatus.CANCELADA ||
    company?.subscriptionStatus === CompanySubscriptionStatus.CANCELED;

  // Active plan always allows actions
  if (hasActiveSubscription) {
    return { isBlocked: false, reason: null };
  }

  // Trial expired and no active subscription
  if (trialEndsAt !== null && now > trialEndsAt) {
    return { isBlocked: true, reason: 'TRIAL_EXPIRED' };
  }

  // Past due: block only after grace period (3 days)
  if (isPastDue) {
    const dueAt = toDate(subscription?.currentPeriodEnd)?.getTime() ?? null;
    if (dueAt !== null) {
      const graceMs = 3 * 24 * 60 * 60 * 1000;
      if (now > dueAt + graceMs) {
        return { isBlocked: true, reason: 'PAST_DUE' };
      }
    }
  }

  // Canceled subscription and not in trial
  if (isCanceled && !inTrial) {
    return { isBlocked: true, reason: 'CANCELED' };
  }

  return { isBlocked: false, reason: null };
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [company, setCompany] = useState<Company | null>(null);
  const [subscription, setSubscription] = useState<PlatformSubscription | null>(null);
  const [plan, setPlan] = useState<PlatformPlan | null>(null);
  const [pointsUsed, setPointsUsed] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [accessState, setAccessStateLocal] = useState(() => getAccessState());

  useEffect(() => {
    const unsub = subscribeAccessState((st) => setAccessStateLocal(st));
    return () => unsub();
  }, []);

  const fetchPointsUsed = useCallback(async () => {
    try {
      // Pega apenas o total sem carregar toda a lista
      const mpRes = await apiClient.get<{ data: any[]; total: number }>(`/media-points?page=1&pageSize=1`);
      setPointsUsed(mpRes.data?.total ?? 0);
    } catch {
      setPointsUsed(0);
    }
  }, []);

  const loadCompanyData = useCallback(async () => {
    if (!user) {
      setCompany(null);
      setSubscription(null);
      setPlan(null);
      setPointsUsed(0);
      clearAccessState();
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const companyId = user.companyId;
      if (!companyId) {
        setCompany(null);
        setSubscription(null);
        setPlan(null);
        setIsLoading(false);
        return;
      }

      // Company (tenant) data
      const companyResp = await apiClient.get<Company>('/company');
      const companyData = companyResp.data;
      setCompany(companyData);

      // Subscription
      const subResp = await apiClient.get<PlatformSubscription>('/platform-subscription');
      const subscriptionData = subResp.data;
      setSubscription(subscriptionData);

      // Plan (optional)
      if (subscriptionData?.planId) {
        try {
          const planResp = await apiClient.get<PlatformPlan>(`/platform-plans/${subscriptionData.planId}`);
          setPlan(planResp.data);
        } catch {
          setPlan(null);
        }
      } else {
        setPlan(null);
      }

      // Points used
      await fetchPointsUsed();

      // Access control sync (read-only mode)
      const block = computeBlock(companyData, subscriptionData);
      if (block.isBlocked) {
        const msg = defaultBlockMessage(block.reason ?? undefined);
        persistAccessState({ isBlocked: true, reason: block.reason ?? undefined, message: msg });
      } else {
        clearAccessState();
      }
    } catch (err) {
      // Keep whatever access state we already had (e.g. from a 402 response)
      // but expose the load failure.
      // eslint-disable-next-line no-console
      console.error('Failed to load company data:', err);
      setError('Falha ao carregar dados da empresa');
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchPointsUsed]);

  useEffect(() => {
    loadCompanyData();
  }, [loadCompanyData]);

  const isTrialActive = useMemo(() => {
    const trialEnd = toDate(company?.trialEndsAt);
    if (!trialEnd) return false;
    const inTrial =
      subscription?.status === PlatformSubscriptionStatus.TESTE ||
      company?.subscriptionStatus === CompanySubscriptionStatus.TRIAL;
    return inTrial && trialEnd.getTime() > Date.now();
  }, [company?.trialEndsAt, company?.subscriptionStatus, subscription?.status]);

  const daysRemainingInTrial = useMemo(() => {
    if (!isTrialActive) return null;
    const trialEnd = toDate(company?.trialEndsAt);
    if (!trialEnd) return null;
    const diffMs = trialEnd.getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [isTrialActive, company?.trialEndsAt]);

  const isTrialEndingSoon = useMemo(() => {
    if (!isTrialActive) return false;
    if (daysRemainingInTrial == null) return false;
    return daysRemainingInTrial > 0 && daysRemainingInTrial <= 3;
  }, [isTrialActive, daysRemainingInTrial]);

  const pointsLimit = company?.pointsLimit == null ? Number.POSITIVE_INFINITY : company.pointsLimit;
  const canAddMorePoints = pointsLimit === Number.POSITIVE_INFINITY ? true : pointsUsed < pointsLimit;

  // Actions
  const updateCompanyData = async (updates: Partial<Company>) => {
    if (!company) return;
    const resp = await apiClient.put<Company>('/company', updates);
    setCompany(resp.data);

    // Re-evaluate access state in case plan/trial/status changed
    const block = computeBlock(resp.data, subscription);
    if (block.isBlocked) {
      persistAccessState({ isBlocked: true, reason: block.reason ?? undefined, message: defaultBlockMessage(block.reason ?? undefined) });
    } else {
      clearAccessState();
    }
  };

  const updateSubscriptionData = async (updates: Partial<PlatformSubscription>) => {
    if (!subscription) return;

    const resp = await apiClient.put<PlatformSubscription>('/platform-subscription', updates);
    const updated = resp.data;
    setSubscription(updated);

    // Reload plan if changed
    if (updates.planId && updates.planId !== subscription.planId) {
      try {
        const planResp = await apiClient.get<PlatformPlan>(`/platform-plans/${updates.planId}`);
        setPlan(planResp.data);
      } catch {
        setPlan(null);
      }
    }

    // Full refresh to sync limits/status/trial dates
    await loadCompanyData();
  };

  const refreshCompanyData = async () => {
    await loadCompanyData();
  };

  const refreshPointsUsed = async () => {
    await fetchPointsUsed();
  };

  const isBlocked = Boolean(accessState.isBlocked);
  const blockReason = (accessState.reason ?? null) as AccessBlockReason | null;
  const blockMessage = isBlocked ? String(accessState.message ?? defaultBlockMessage(accessState.reason as any)) : null;

  const value: CompanyContextValue = {
    company,
    subscription,
    plan,

    isTrialActive,
    daysRemainingInTrial,
    pointsUsed,
    pointsLimit,
    canAddMorePoints,

    isBlocked,
    blockReason,
    blockMessage,
    isTrialEndingSoon,

    updateCompanyData,
    updateSubscriptionData,
    refreshCompanyData,
    refreshPointsUsed,

    isLoading,
    error,
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
