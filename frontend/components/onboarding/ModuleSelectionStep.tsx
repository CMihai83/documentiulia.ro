'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DollarSign,
  Users,
  Package,
  ShoppingCart,
  UserCheck,
  Truck,
  Shield,
  Briefcase,
  Layers,
} from 'lucide-react';
import { useOnboarding } from './OnboardingProvider';
import type { ModuleSelection } from './OnboardingProvider';

const MODULES = [
  {
    key: 'finance' as keyof ModuleSelection,
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    recommended: true,
  },
  {
    key: 'hr' as keyof ModuleSelection,
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    recommended: true,
  },
  {
    key: 'warehouse' as keyof ModuleSelection,
    icon: Package,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    recommended: false,
  },
  {
    key: 'procurement' as keyof ModuleSelection,
    icon: ShoppingCart,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    recommended: false,
  },
  {
    key: 'crm' as keyof ModuleSelection,
    icon: UserCheck,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    recommended: false,
  },
  {
    key: 'logistics' as keyof ModuleSelection,
    icon: Truck,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    recommended: false,
  },
  {
    key: 'quality' as keyof ModuleSelection,
    icon: Shield,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    recommended: false,
  },
  {
    key: 'hse' as keyof ModuleSelection,
    icon: Briefcase,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    recommended: false,
  },
];

export function ModuleSelectionStep() {
  const t = useTranslations('onboarding');
  const { data, updateModules, nextStep, previousStep } = useOnboarding();
  const [selectedModules, setSelectedModules] = useState<ModuleSelection>(
    data.modules
  );

  const handleToggleModule = (module: keyof ModuleSelection) => {
    // Finance module cannot be disabled
    if (module === 'finance') return;

    setSelectedModules((prev) => ({
      ...prev,
      [module]: !prev[module],
    }));
  };

  const handleContinue = () => {
    updateModules(selectedModules);
    nextStep();
  };

  const selectedCount = Object.values(selectedModules).filter(Boolean).length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <Layers className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {t('modules.title')}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto px-4">
          {t('modules.subtitle')}
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
          {t('modules.info')}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((module) => {
            const Icon = module.icon;
            const isSelected = selectedModules[module.key];
            const isFinance = module.key === 'finance';

            return (
              <button
                key={module.key}
                onClick={() => handleToggleModule(module.key)}
                disabled={isFinance}
                className={`relative p-4 sm:p-6 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${isFinance ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {module.recommended && (
                  <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {t('modules.recommended')}
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 sm:p-3 rounded-lg ${module.bgColor} flex-shrink-0`}
                  >
                    <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${module.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                        {t(`modules.${module.key}.name`)}
                      </h3>
                      {isFinance && (
                        <span className="text-xs text-gray-500">
                          ({t('modules.required')})
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                      {t(`modules.${module.key}.description`)}
                    </p>

                    <div className="mt-3">
                      <Checkbox
                        checked={isSelected}
                        disabled={isFinance}
                        onChange={() => {}}
                        className="pointer-events-none"
                      />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600">
            {t('modules.selectedCount', { count: selectedCount })}
          </p>
        </div>

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
