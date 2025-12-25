'use client';

/**
 * Module Configuration Modal
 * Allows users to customize which dashboard modules they see
 * Sprint 26 - Dashboard Customization
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Check, GripVertical, Lock, Settings, RotateCcw } from 'lucide-react';
import { useDashboardPreferences } from '@/hooks/useDashboardPreferences';

interface DashboardModule {
  id: string;
  name: string;
  nameRo: string;
  path: string;
  category: string;
  tier: 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
  icon: string;
}

interface ModuleConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, { en: string; ro: string }> = {
  main: { en: 'Main', ro: 'Principal' },
  documents: { en: 'Documents', ro: 'Documente' },
  finance: { en: 'Finance', ro: 'Finanțe' },
  commerce: { en: 'Commerce & CRM', ro: 'Comerț & CRM' },
  'supply-chain': { en: 'Supply Chain', ro: 'Lanț Aprovizionare' },
  hr: { en: 'HR & Team', ro: 'HR & Echipă' },
  projects: { en: 'Projects', ro: 'Proiecte' },
  quality: { en: 'Quality', ro: 'Calitate' },
  community: { en: 'Community', ro: 'Comunitate' },
  developer: { en: 'Developer', ro: 'Dezvoltator' },
  help: { en: 'Help', ro: 'Ajutor' },
  admin: { en: 'Admin', ro: 'Administrare' },
  simulation: { en: 'Simulation', ro: 'Simulare' },
  services: { en: 'Services', ro: 'Servicii' },
  portals: { en: 'Portals', ro: 'Portaluri' },
  automation: { en: 'Automation', ro: 'Automatizare' },
  scheduling: { en: 'Scheduling', ro: 'Programări' },
};

const TIER_COLORS: Record<string, string> = {
  FREE: 'bg-green-100 text-green-700',
  PRO: 'bg-blue-100 text-blue-700',
  BUSINESS: 'bg-purple-100 text-purple-700',
  ENTERPRISE: 'bg-yellow-100 text-yellow-700',
};

export function ModuleConfigModal({ isOpen, onClose }: ModuleConfigModalProps) {
  const t = useTranslations('dashboard');
  const {
    preferences,
    availableModules,
    userTier,
    isLoading,
    toggleModule,
    resetPreferences,
    updatePreferences,
  } = useDashboardPreferences();

  const [localEnabled, setLocalEnabled] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (preferences) {
      setLocalEnabled(preferences.enabledModules);
    }
  }, [preferences]);

  useEffect(() => {
    if (preferences) {
      const changed = JSON.stringify(localEnabled.sort()) !== JSON.stringify(preferences.enabledModules.sort());
      setHasChanges(changed);
    }
  }, [localEnabled, preferences]);

  if (!isOpen) return null;

  const handleToggle = (moduleId: string) => {
    setLocalEnabled(prev => {
      if (prev.includes(moduleId)) {
        return prev.filter(id => id !== moduleId);
      } else {
        return [...prev, moduleId];
      }
    });
  };

  const handleSave = async () => {
    await updatePreferences({ enabledModules: localEnabled });
    onClose();
  };

  const handleReset = async () => {
    await resetPreferences();
    onClose();
  };

  const isModuleAccessible = (module: DashboardModule) => {
    const tierOrder = ['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE'];
    const userTierIndex = tierOrder.indexOf(userTier || 'FREE');
    const moduleTierIndex = tierOrder.indexOf(module.tier);
    return moduleTierIndex <= userTierIndex;
  };

  // Group modules by category
  const categories = [...new Set(availableModules.map(m => m.category))];
  const modulesByCategory = categories.reduce((acc, cat) => {
    acc[cat] = availableModules.filter(m => m.category === cat);
    return acc;
  }, {} as Record<string, DashboardModule[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('configureModules') || 'Configurează Modulele'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tier Info */}
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {t('yourTier') || 'Abonamentul tău'}: <span className="font-semibold">{userTier}</span>
            {userTier === 'ENTERPRISE' && ' - Acces complet la toate modulele'}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map(category => (
                <div key={category} className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {CATEGORY_LABELS[category]?.ro || category}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {modulesByCategory[category].map(module => {
                      const accessible = isModuleAccessible(module);
                      const enabled = localEnabled.includes(module.id);

                      return (
                        <div
                          key={module.id}
                          className={`
                            flex items-center justify-between p-3 rounded-lg border transition-all
                            ${enabled
                              ? 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                              : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                            }
                            ${!accessible ? 'opacity-60' : 'cursor-pointer hover:border-blue-300'}
                          `}
                          onClick={() => accessible && handleToggle(module.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`
                              w-8 h-8 rounded-lg flex items-center justify-center
                              ${enabled ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'}
                            `}>
                              {!accessible ? (
                                <Lock className="h-4 w-4 text-gray-400" />
                              ) : enabled ? (
                                <Check className="h-4 w-4 text-blue-600" />
                              ) : (
                                <div className="h-4 w-4 border-2 border-gray-300 rounded" />
                              )}
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${enabled ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                {module.nameRo}
                              </p>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${TIER_COLORS[module.tier]}`}>
                                {module.tier}
                              </span>
                            </div>
                          </div>
                          {accessible && (
                            <GripVertical className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            {t('resetDefaults') || 'Resetează la Implicit'}
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              {t('cancel') || 'Anulează'}
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`
                px-6 py-2 text-sm font-medium rounded-lg transition-colors
                ${hasChanges
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {t('saveChanges') || 'Salvează Modificările'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
