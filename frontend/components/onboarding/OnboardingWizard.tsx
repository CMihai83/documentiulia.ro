'use client';

import { useTranslations } from 'next-intl';
import { X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOnboarding } from './OnboardingProvider';
import { WelcomeStep } from './WelcomeStep';
import { CompanySetupStep } from './CompanySetupStep';
import { ModuleSelectionStep } from './ModuleSelectionStep';
import { IntegrationsStep } from './IntegrationsStep';
import { CompletionStep } from './CompletionStep';

export function OnboardingWizard() {
  const t = useTranslations('onboarding');
  const { data, currentStepIndex, totalSteps, skipOnboarding } =
    useOnboarding();

  const progressPercentage = ((currentStepIndex + 1) / totalSteps) * 100;

  const renderStep = () => {
    switch (data.currentStep) {
      case 'welcome':
        return <WelcomeStep />;
      case 'company-setup':
        return <CompanySetupStep />;
      case 'module-selection':
        return <ModuleSelectionStep />;
      case 'integrations':
        return <IntegrationsStep />;
      case 'completion':
        return <CompletionStep />;
      default:
        return <WelcomeStep />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">D</span>
                </div>
                <span className="font-semibold text-gray-900 hidden sm:inline">
                  DocumentIulia.ro
                </span>
              </div>

              {/* Progress Indicator */}
              <div className="flex-1 max-w-md hidden md:block">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500">
                    {t('progress.step')} {currentStepIndex + 1} / {totalSteps}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            </div>

            {/* Skip Button - Only show before completion */}
            {data.currentStep !== 'completion' && (
              <Button
                onClick={skipOnboarding}
                variant="ghost"
                size="sm"
                className="flex items-center gap-1"
              >
                <span className="hidden sm:inline">{t('common.skip')}</span>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Mobile Progress */}
          <div className="mt-3 md:hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">
                {t('progress.step')} {currentStepIndex + 1} / {totalSteps}
              </span>
              <span className="text-xs text-gray-500">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      </div>

      {/* Step Navigation Breadcrumb - Desktop */}
      <div className="hidden lg:block bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <nav className="flex items-center justify-center gap-2">
            {[
              'welcome',
              'company-setup',
              'module-selection',
              'integrations',
              'completion',
            ].map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;

              return (
                <div key={step} className="flex items-center">
                  {index > 0 && (
                    <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
                  )}
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-blue-100 text-blue-900'
                        : isCompleted
                        ? 'bg-green-50 text-green-900'
                        : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {isCompleted ? '✓' : index + 1}
                    </div>
                    <span className="text-sm font-medium">
                      {t(`steps.${step}`)}
                    </span>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8 lg:p-12">
          {renderStep()}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-4 sm:py-6 text-center text-xs sm:text-sm text-gray-500">
        <p>
          {t('footer.help')}{' '}
          <a
            href="/help"
            className="text-blue-600 hover:underline"
            target="_blank"
          >
            {t('footer.contactSupport')}
          </a>
        </p>
      </footer>
    </div>
  );
}
