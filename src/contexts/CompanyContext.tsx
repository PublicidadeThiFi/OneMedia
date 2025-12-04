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
import { Company, PlatformSubscription, PlatformPlan } from '../types';
import { 
  getCurrentCompany, 
  getPlatformSubscriptionForCompany,
  getPlatformPlanById,
  updateCompany as mockUpdateCompany,
  updatePlatformSubscription as mockUpdateSubscription,
  CURRENT_COMPANY_ID
} from '../lib/mockDataCentral';

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
  const [pointsUsed, setPointsUsed] = useState(0);

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
      
      // In real app: fetch from API based on user.companyId
      // For now: use mock data
      const companyId = user.companyId || CURRENT_COMPANY_ID;
      
      const companyData = getCurrentCompany(companyId);
      const subscriptionData = getPlatformSubscriptionForCompany(companyId);
      const planData = subscriptionData ? getPlatformPlanById(subscriptionData.planId) : null;
      
      setCompany(companyData);
      setSubscription(subscriptionData);
      setPlan(planData);
      
      // In real app: fetch actual points count from API
      // For now: use mock calculation
      setPointsUsed(25); // Mock: empresa tem 25 pontos cadastrados
    } catch (error) {
      console.error('Failed to load company data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCompanyData();
  }, [loadCompanyData]);

  // Computed: is trial active
  const isTrialActive = Boolean(
    subscription?.status === 'TESTE' && 
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
  const pointsLimit = company?.pointsLimit || 50;

  // Computed: can add more points
  const canAddMorePoints = pointsUsed < pointsLimit;

  // Action: update company data
  const updateCompanyData = async (updates: Partial<Company>) => {
    if (!company) return;

    try {
      // In real app: PATCH /companies/:id
      const updated = await mockUpdateCompany(company.id, updates);
      setCompany(updated);
    } catch (error) {
      console.error('Failed to update company:', error);
      throw error;
    }
  };

  // Action: update subscription data
  const updateSubscriptionData = async (updates: Partial<PlatformSubscription>) => {
    if (!subscription) return;

    try {
      // In real app: PATCH /platform-subscriptions/:id
      const updated = await mockUpdateSubscription(subscription.id, updates);
      setSubscription(updated);
      
      // If plan changed, reload plan data
      if (updates.planId && updates.planId !== subscription.planId) {
        const newPlan = getPlatformPlanById(updates.planId);
        setPlan(newPlan);
        
        // Also update company pointsLimit if plan changed
        if (newPlan && company) {
          const updatedCompany = await mockUpdateCompany(company.id, {
            planId: newPlan.id,
            pointsLimit: newPlan.maxPoints || 999999,
          });
          setCompany(updatedCompany);
        }
      }
    } catch (error) {
      console.error('Failed to update subscription:', error);
      throw error;
    }
  };

  // Action: refresh company data
  const refreshCompanyData = async () => {
    await loadCompanyData();
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
    isLoading,
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
