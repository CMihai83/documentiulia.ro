'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type OnboardingStep =
  | 'welcome'
  | 'company-setup'
  | 'module-selection'
  | 'integrations'
  | 'completion';

export interface CompanyData {
  name: string;
  cui: string;
  address: string;
  city: string;
  county: string;
  postalCode: string;
  industry: string;
  phone: string;
  email: string;
}

export interface ModuleSelection {
  finance: boolean;
  hr: boolean;
  warehouse: boolean;
  procurement: boolean;
  crm: boolean;
  logistics: boolean;
  quality: boolean;
  hse: boolean;
}

export interface IntegrationSelection {
  anaf: boolean;
  saga: boolean;
  bank: boolean;
  efactura: boolean;
}

export interface OnboardingData {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  userName: string;
  companyData: Partial<CompanyData>;
  modules: ModuleSelection;
  integrations: IntegrationSelection;
  isComplete: boolean;
}

interface OnboardingContextType {
  data: OnboardingData;
  isOnboardingComplete: boolean;
  currentStepIndex: number;
  totalSteps: number;
  goToStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  previousStep: () => void;
  updateUserName: (name: string) => void;
  updateCompanyData: (data: Partial<CompanyData>) => void;
  updateModules: (modules: Partial<ModuleSelection>) => void;
  updateIntegrations: (integrations: Partial<IntegrationSelection>) => void;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

const ONBOARDING_STORAGE_KEY = 'onboarding_data';
const ONBOARDING_COMPLETE_KEY = 'onboarding_complete';

const steps: OnboardingStep[] = [
  'welcome',
  'company-setup',
  'module-selection',
  'integrations',
  'completion',
];

const defaultModules: ModuleSelection = {
  finance: true, // Finance is enabled by default
  hr: false,
  warehouse: false,
  procurement: false,
  crm: false,
  logistics: false,
  quality: false,
  hse: false,
};

const defaultIntegrations: IntegrationSelection = {
  anaf: false,
  saga: false,
  bank: false,
  efactura: false,
};

const defaultData: OnboardingData = {
  currentStep: 'welcome',
  completedSteps: [],
  userName: '',
  companyData: {},
  modules: defaultModules,
  integrations: defaultIntegrations,
  isComplete: false,
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  // Load onboarding data from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      const isComplete = localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';

      setIsOnboardingComplete(isComplete);

      if (stored) {
        const parsedData = JSON.parse(stored);
        setData({
          ...defaultData,
          ...parsedData,
          userName: parsedData.userName || user?.name || '',
        });
      } else if (user?.name) {
        setData((prev) => ({ ...prev, userName: user.name }));
      }
    } catch (error) {
      console.error('Failed to load onboarding data:', error);
    }
  }, [user]);

  // Save onboarding data to localStorage
  const saveData = useCallback((newData: OnboardingData) => {
    setData(newData);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(newData));
  }, []);

  const currentStepIndex = steps.indexOf(data.currentStep);
  const totalSteps = steps.length;

  const goToStep = useCallback(
    (step: OnboardingStep) => {
      saveData({ ...data, currentStep: step });
    },
    [data, saveData]
  );

  const nextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      const nextStep = steps[nextIndex];
      const completedSteps = [...new Set([...data.completedSteps, data.currentStep])];
      saveData({
        ...data,
        currentStep: nextStep,
        completedSteps,
      });
    }
  }, [currentStepIndex, data, saveData]);

  const previousStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      saveData({ ...data, currentStep: steps[prevIndex] });
    }
  }, [currentStepIndex, data, saveData]);

  const updateUserName = useCallback(
    (name: string) => {
      saveData({ ...data, userName: name });
    },
    [data, saveData]
  );

  const updateCompanyData = useCallback(
    (companyData: Partial<CompanyData>) => {
      saveData({
        ...data,
        companyData: { ...data.companyData, ...companyData },
      });
    },
    [data, saveData]
  );

  const updateModules = useCallback(
    (modules: Partial<ModuleSelection>) => {
      saveData({
        ...data,
        modules: { ...data.modules, ...modules },
      });
    },
    [data, saveData]
  );

  const updateIntegrations = useCallback(
    (integrations: Partial<IntegrationSelection>) => {
      saveData({
        ...data,
        integrations: { ...data.integrations, ...integrations },
      });
    },
    [data, saveData]
  );

  const completeOnboarding = useCallback(async () => {
    try {
      // Send onboarding data to backend
      if (token) {
        await fetch(`${API_URL}/onboarding/complete`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyData: data.companyData,
            modules: data.modules,
            integrations: data.integrations,
          }),
        });
      }

      // Mark onboarding as complete
      localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      saveData({ ...data, isComplete: true });
      setIsOnboardingComplete(true);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      // Still mark as complete locally even if API fails
      localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      saveData({ ...data, isComplete: true });
      setIsOnboardingComplete(true);
    }
  }, [data, token, saveData]);

  const skipOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setIsOnboardingComplete(true);
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
    setData(defaultData);
    setIsOnboardingComplete(false);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        data,
        isOnboardingComplete,
        currentStepIndex,
        totalSteps,
        goToStep,
        nextStep,
        previousStep,
        updateUserName,
        updateCompanyData,
        updateModules,
        updateIntegrations,
        completeOnboarding,
        skipOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
