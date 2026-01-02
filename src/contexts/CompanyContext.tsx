/**
 * CompanyContext - Global company and subscription state
 * 
 * SINGLE SOURCE OF TRUTH for:
 * - Current company data
 * - Platform subscription details
 * - Platform plan information
 * 
 * Used across:
 * - Sidebar (plan info)
 * - Dashboard (company data)
 * - Settings (edit company, subscription)
 * - Inventory (limits, multi-owner restrictions)
 * - All modules that need company context
 * 
 * When integrated with API:
 * - Replace mock functions with API calls
 * - Keep the same interface/methods
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import apiClient from '../lib/apiClient';
import { Company, PlatformSubscription, PlatformPlan, PlatformSubscriptionStatus } from '../types';

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

  // Actions
  updateCompanyData: (updates: Partial<Company>) => Promise<void>;
  updateSubscriptionData: (updates: Partial<PlatformSubscription>) => Promise<void>;
  refreshCompanyData: () => Promise<void>;
  /**
   * Recalcula o uso de pontos (total de MediaPoints) sem precisar recarregar todos os dados da empresa.
   * Útil após criar/excluir pontos no Inventário para manter Configurações em sincronia.
   */
  refreshPointsUsed: () => Promise<void>;

  // Loading state
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [subscription, setSubscription] = useState<PlatformSubscription | null>(null);
  const [plan, setPlan] = useState<PlatformPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pointsUsed, setPointsUsed] = useState(0);

  const fetchPointsUsed = useCallback(async () => {
    try {
      // Pega apenas o total sem carregar toda a lista
      const mpRes = await apiClient.get<{ data: any[]; total: number }>(`/media-points?page=1&pageSize=1`);
      setPointsUsed(mpRes.data?.total ?? 0);
    } catch {
      setPointsUsed(0);
    }
  }, []);

  // Load company data when user logs in
  const loadCompanyData = useCallback(async () => {
    if (!user) {
      setCompany(null);
      setSubscription(null);
      setPlan(null);
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

      // Backend usa o companyId do token → rota é simplesmente /company
      const companyResp = await apiClient.get<Company>('/company');
      const companyData = companyResp.data;
      setCompany(companyData);

      // Mesma ideia para a assinatura: /platform-subscription
      const subResp = await apiClient.get<PlatformSubscription>('/platform-subscription');
      const subscriptionData = subResp.data;
      setSubscription(subscriptionData);


      // Optionally fetch plan if API exists; keep null if not necessary
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

      // Points used (limite de pontos é por conta): pega o total sem carregar toda a lista
      await fetchPointsUsed();
    } catch (error) {
      console.error('Failed to load company data:', error);
      setError('Falha ao carregar dados da empresa');
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchPointsUsed]);

  useEffect(() => {
    loadCompanyData();
  }, [loadCompanyData]);

  // Computed: is trial active
  const isTrialActive = Boolean(
    (subscription?.status === PlatformSubscriptionStatus.TESTE || company?.subscriptionStatus === 'TRIAL') &&
    company?.trialEndsAt &&
    new Date(company.trialEndsAt) > new Date()
  );

  // Computed: days remaining in trial
  const daysRemainingInTrial = (() => {
    if (!isTrialActive || !company?.trialEndsAt) return null;

    const now = new Date();
    const trialEnd = new Date(company.trialEndsAt);
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  })();

  // Computed: points limit
  const pointsLimit = company?.pointsLimit == null ? Number.POSITIVE_INFINITY : company.pointsLimit;

  // Computed: can add more points
  const canAddMorePoints = pointsLimit === Number.POSITIVE_INFINITY ? true : pointsUsed < pointsLimit;

  // Action: update company data
  const updateCompanyData = async (updates: Partial<Company>) => {
    if (!company) return;

    try {
      const resp = await apiClient.put<Company>('/company', updates);
      setCompany(resp.data);
    } catch (error) {
      console.error('Failed to update company:', error);
      throw error;
    }
  };


  // Action: update subscription data
  const updateSubscriptionData = async (updates: Partial<PlatformSubscription>) => {
    if (!subscription) return;

    try {
      const resp = await apiClient.put<PlatformSubscription>('/platform-subscription', updates);
      const updated = resp.data;
      setSubscription(updated);

      if (updates.planId && updates.planId !== subscription.planId) {
        try {
          const planResp = await apiClient.get<PlatformPlan>(`/platform-plans/${updates.planId}`);
          setPlan(planResp.data);
        } catch {
          setPlan(null);
        }
      }

      // Atualiza também a empresa (pointsLimit / status) e o uso de pontos
      await loadCompanyData();

    } catch (error) {
      console.error('Failed to update subscription:', error);
      throw error;
    }
  };


  // Action: refresh company data
  const refreshCompanyData = async () => {
    await loadCompanyData();
  };

  const refreshPointsUsed = async () => {
    await fetchPointsUsed();
  };

  const value: CompanyContextValue = {
    company,
    subscription,
    plan,
    isTrialActive,
    daysRemainingInTrial,
    pointsUsed,
    pointsLimit,
    canAddMorePoints,
    updateCompanyData,
    updateSubscriptionData,
    refreshCompanyData,
    refreshPointsUsed,
    isLoading,
    // Add error to context consumers
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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
