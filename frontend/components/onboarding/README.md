# Onboarding Wizard

A comprehensive multi-step user onboarding wizard for DocumentIulia.ro that guides new users through initial setup.

## Components

### 1. OnboardingWizard.tsx
Main wizard component that orchestrates the entire onboarding flow.

**Features:**
- Multi-step progress indicator with visual breadcrumbs
- Responsive design (mobile-first)
- Step navigation (next/back/skip)
- Animated transitions between steps
- Skip functionality to bypass onboarding

### 2. Steps

#### WelcomeStep.tsx
Welcome message and user name confirmation.
- Greets the user
- Confirms/updates user name
- Displays overview of onboarding steps
- Shows estimated completion time (~3 minutes)

#### CompanySetupStep.tsx
Company details collection.
- Company name, CUI (Tax ID), industry (required)
- Contact information (phone, email)
- Full address details (street, city, county, postal code)
- Form validation

#### ModuleSelectionStep.tsx
Feature module selection.
- Visual grid of available modules
- Finance module enabled by default (required)
- HR, Warehouse, Procurement, CRM, Logistics, Quality, HSE modules
- Recommended modules highlighted
- Shows selected module count

#### IntegrationsStep.tsx
External system integrations.
- ANAF API integration
- SAGA v3.2 integration
- e-Factura SPV integration
- Bank account (PSD2) integration
- Optional setup with skip functionality
- Setup requirements displayed for each integration

#### CompletionStep.tsx
Success confirmation and next steps.
- Setup summary display
- Quick action links
- Recommended next steps
- Navigate to dashboard button

### 3. OnboardingProvider.tsx
Context provider for onboarding state management.

**State Management:**
- Current step tracking
- Completed steps tracking
- User data (name, company, modules, integrations)
- Onboarding completion status
- LocalStorage persistence

**API:**
```typescript
const {
  data,                    // Onboarding data object
  isOnboardingComplete,    // Boolean flag
  currentStepIndex,        // Current step index
  totalSteps,              // Total number of steps
  goToStep,                // Navigate to specific step
  nextStep,                // Go to next step
  previousStep,            // Go to previous step
  updateUserName,          // Update user name
  updateCompanyData,       // Update company data
  updateModules,           // Update module selection
  updateIntegrations,      // Update integration selection
  completeOnboarding,      // Mark onboarding complete
  skipOnboarding,          // Skip onboarding
  resetOnboarding,         // Reset onboarding state
} = useOnboarding();
```

### 4. useOnboarding.ts
Hook for accessing onboarding context (re-exports useOnboarding from OnboardingProvider).

## Data Types

```typescript
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
  finance: boolean;      // Always true (required)
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
```

## Integration

### 1. Add OnboardingProvider to app providers

```tsx
// components/ClientProviders.tsx
import { OnboardingProvider } from '@/components/onboarding';

export function ClientProviders({ children }) {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <OnboardingProvider>
          {children}
        </OnboardingProvider>
      </OrganizationProvider>
    </AuthProvider>
  );
}
```

### 2. Show wizard for new users

```tsx
// app/[locale]/dashboard/page.tsx
import { useOnboarding, OnboardingWizard } from '@/components/onboarding';

export default function DashboardPage() {
  const { isOnboardingComplete } = useOnboarding();

  if (!isOnboardingComplete) {
    return <OnboardingWizard />;
  }

  return <div>Dashboard content...</div>;
}
```

### 3. Reset onboarding (for testing)

```tsx
import { useOnboarding } from '@/components/onboarding';

function SettingsPage() {
  const { resetOnboarding } = useOnboarding();

  return (
    <button onClick={resetOnboarding}>
      Reset Onboarding
    </button>
  );
}
```

## Translations

The wizard uses `next-intl` for internationalization. All text is defined in `/messages/{locale}.json` under the `onboarding` key.

### Translation Keys Structure:
```
onboarding
├── progress
│   └── step
├── steps (step names)
├── common (continue, back, skip)
├── welcome
├── company
│   └── industries
├── modules
│   ├── finance
│   ├── hr
│   └── ...
├── integrations
│   ├── anaf
│   ├── saga
│   └── ...
├── completion
│   └── links
└── footer
```

## Storage

### LocalStorage Keys:
- `onboarding_data` - Stores current onboarding state
- `onboarding_complete` - Boolean flag for completion status

### Backend API:
- `POST /api/v1/onboarding/complete` - Saves final onboarding data to backend

## Styling

The wizard uses Tailwind CSS with custom components from `/components/ui`:
- `Button` - Primary actions
- `Input` - Form inputs
- `Label` - Form labels
- `Checkbox` - Module/integration selection
- `Progress` - Step progress indicator
- `Card` - Content containers

### Responsive Design:
- Mobile-first approach
- Stack columns on mobile
- Side-by-side layout on larger screens
- Touch-friendly tap targets
- Proper text scaling

## Features

### 1. Progress Tracking
- Visual progress bar
- Step breadcrumb navigation (desktop)
- Current step indicator
- Completed steps marked with checkmark

### 2. Validation
- Required fields highlighted
- Inline validation feedback
- Disabled "Continue" until requirements met
- CUI format validation

### 3. Skip Functionality
- Skip button in header (except on completion step)
- Skip individual steps (integrations)
- Marks onboarding as complete

### 4. Animations
- Fade in/slide in transitions
- Pulse animations for highlights
- Smooth progress bar updates

### 5. Mobile Responsive
- Full mobile support
- Touch-optimized interface
- Adaptive layout
- Mobile-specific progress indicator

## Testing

To test the onboarding wizard:

1. Clear localStorage:
```javascript
localStorage.removeItem('onboarding_complete');
localStorage.removeItem('onboarding_data');
```

2. Refresh the dashboard page
3. The onboarding wizard should appear

## Best Practices

1. **Data Persistence**: All form data is automatically saved to localStorage on each step
2. **Progressive Disclosure**: Only show relevant information for current step
3. **Clear CTAs**: Prominent "Continue" buttons guide users forward
4. **Escape Hatches**: Skip buttons allow power users to bypass
5. **Mobile First**: Design works seamlessly on all screen sizes
6. **Accessibility**: ARIA labels, keyboard navigation, proper contrast

## Future Enhancements

- [ ] Multi-language support expansion (add Romanian translations)
- [ ] Integration setup wizards (OAuth flows)
- [ ] Import existing data option
- [ ] Company logo upload
- [ ] Invite team members step
- [ ] Tutorial videos
- [ ] Progress save/resume across sessions
- [ ] A/B testing for different flows
