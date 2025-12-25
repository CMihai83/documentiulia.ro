'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plug,
  FileText,
  Building,
  CreditCard,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useOnboarding } from './OnboardingProvider';
import type { IntegrationSelection } from './OnboardingProvider';

const INTEGRATIONS = [
  {
    key: 'anaf' as keyof IntegrationSelection,
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    recommended: true,
  },
  {
    key: 'saga' as keyof IntegrationSelection,
    icon: Building,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    recommended: true,
  },
  {
    key: 'efactura' as keyof IntegrationSelection,
    icon: FileText,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    recommended: true,
  },
  {
    key: 'bank' as keyof IntegrationSelection,
    icon: CreditCard,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    recommended: false,
  },
];

export function IntegrationsStep() {
  const t = useTranslations('onboarding');
  const { data, updateIntegrations, nextStep, previousStep } = useOnboarding();
  const [selectedIntegrations, setSelectedIntegrations] =
    useState<IntegrationSelection>(data.integrations);

  const handleToggleIntegration = (
    integration: keyof IntegrationSelection
  ) => {
    setSelectedIntegrations((prev) => ({
      ...prev,
      [integration]: !prev[integration],
    }));
  };

  const handleContinue = () => {
    updateIntegrations(selectedIntegrations);
    nextStep();
  };

  const handleSkip = () => {
    // Clear all integrations and continue
    updateIntegrations({
      anaf: false,
      saga: false,
      bank: false,
      efactura: false,
    });
    nextStep();
  };

  const selectedCount = Object.values(selectedIntegrations).filter(
    Boolean
  ).length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <Plug className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {t('integrations.title')}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto px-4">
          {t('integrations.subtitle')}
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-900">
            <p className="font-semibold">{t('integrations.note')}</p>
            <p className="mt-1">{t('integrations.noteDescription')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {INTEGRATIONS.map((integration) => {
            const Icon = integration.icon;
            const isSelected = selectedIntegrations[integration.key];

            return (
              <button
                key={integration.key}
                onClick={() => handleToggleIntegration(integration.key)}
                className={`relative p-4 sm:p-6 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {integration.recommended && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {t('integrations.recommended')}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 sm:p-3 rounded-lg ${integration.bgColor} flex-shrink-0`}
                    >
                      <Icon
                        className={`w-5 h-5 sm:w-6 sm:h-6 ${integration.color}`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                        {t(`integrations.${integration.key}.name`)}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {t(`integrations.${integration.key}.description`)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => {}}
                      className="pointer-events-none"
                    />
                    {isSelected && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        {t('integrations.selected')}
                      </span>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      {t(`integrations.${integration.key}.setup`)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedCount > 0 && (
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-sm text-green-900">
              {t('integrations.selectedCount', { count: selectedCount })}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={previousStep}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            {t('common.back')}
          </Button>
          <Button
            onClick={handleSkip}
            variant="ghost"
            size="lg"
            className="w-full sm:w-auto"
          >
            {t('common.skip')}
          </Button>
          <Button
            onClick={handleContinue}
            variant="primary"
            size="lg"
            className="w-full sm:flex-1"
          >
            {t('common.continue')}
          </Button>
        </div>
      </div>
    </div>
  );
}
