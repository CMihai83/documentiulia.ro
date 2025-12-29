import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * UI State Store - DocumentIulia.ro
 * Manages global UI state, feature flags, and user preferences
 */

// Feature flag types
export type FeatureFlag =
  | 'new-dashboard-ui'
  | 'ai-assistant-v2'
  | 'efactura-batch-upload'
  | 'advanced-analytics'
  | 'dark-mode-beta'
  | 'saft-auto-submit'
  | 'multi-currency'
  | 'team-collaboration';

// A/B test variant types
export type ABTestVariant = 'control' | 'variant-a' | 'variant-b';

interface ABTest {
  name: string;
  variant: ABTestVariant;
  enrolled: boolean;
}

interface UIState {
  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Feature Flags
  activeFeatureFlags: FeatureFlag[];
  setFeatureFlags: (flags: FeatureFlag[]) => void;
  hasFeatureFlag: (flag: FeatureFlag) => boolean;

  // A/B Tests
  abTests: Record<string, ABTest>;
  setABTest: (testName: string, variant: ABTestVariant) => void;
  getABTestVariant: (testName: string) => ABTestVariant | null;

  // Sidebar state
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Mobile navigation
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;

  // Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Onboarding
  onboardingCompleted: boolean;
  onboardingStep: number;
  setOnboardingCompleted: (completed: boolean) => void;
  setOnboardingStep: (step: number) => void;

  // Notifications
  unreadNotifications: number;
  setUnreadNotifications: (count: number) => void;

  // Reset store
  reset: () => void;
}

const initialState = {
  isDarkMode: false,
  activeFeatureFlags: [] as FeatureFlag[],
  abTests: {} as Record<string, ABTest>,
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  commandPaletteOpen: false,
  onboardingCompleted: false,
  onboardingStep: 0,
  unreadNotifications: 0,
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Theme
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

      // Feature Flags
      setFeatureFlags: (flags) => set({ activeFeatureFlags: flags }),
      hasFeatureFlag: (flag) => get().activeFeatureFlags.includes(flag),

      // A/B Tests
      setABTest: (testName, variant) =>
        set((state) => ({
          abTests: {
            ...state.abTests,
            [testName]: { name: testName, variant, enrolled: true },
          },
        })),
      getABTestVariant: (testName) => {
        const test = get().abTests[testName];
        return test?.enrolled ? test.variant : null;
      },

      // Sidebar
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Mobile menu
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

      // Command palette
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      // Onboarding
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
      setOnboardingStep: (step) => set({ onboardingStep: step }),

      // Notifications
      setUnreadNotifications: (count) => set({ unreadNotifications: count }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'documentiulia-ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        sidebarCollapsed: state.sidebarCollapsed,
        onboardingCompleted: state.onboardingCompleted,
        onboardingStep: state.onboardingStep,
      }),
    }
  )
);

// Selector hooks for specific state slices
export const useTheme = () => useUIStore((state) => ({ isDarkMode: state.isDarkMode, toggleDarkMode: state.toggleDarkMode }));
export const useFeatureFlags = () => useUIStore((state) => ({ flags: state.activeFeatureFlags, hasFlag: state.hasFeatureFlag }));
export const useSidebar = () => useUIStore((state) => ({ collapsed: state.sidebarCollapsed, toggle: state.toggleSidebar }));
export const useABTests = () => useUIStore((state) => ({ tests: state.abTests, getVariant: state.getABTestVariant }));
