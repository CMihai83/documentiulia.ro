'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  ArrowRight,
  BookOpen,
  FileText,
  Users,
  Settings,
} from 'lucide-react';
import { useOnboarding } from './OnboardingProvider';

const QUICK_LINKS = [
  {
    key: 'invoices',
    icon: FileText,
    href: '/dashboard/invoices',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    key: 'vat',
    icon: FileText,
    href: '/dashboard/vat',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    key: 'hr',
    icon: Users,
    href: '/dashboard/hr',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    key: 'settings',
    icon: Settings,
    href: '/settings',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
];

export function CompletionStep() {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const { data, completeOnboarding } = useOnboarding();

  const handleComplete = async () => {
    await completeOnboarding();
    router.push('/dashboard');
  };

  const handleQuickLink = async (href: string) => {
    await completeOnboarding();
    router.push(href);
  };

  return (
    <div className="text-center space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-center">
        <div className="relative">
          <CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 text-green-600" />
          <div className="absolute inset-0 animate-ping opacity-30">
            <CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 text-green-400" />
          </div>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
          {t('completion.title', { name: data.userName })}
        </h1>
        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
          {t('completion.subtitle')}
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 space-y-6">
        {/* Summary Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4 sm:p-6 text-left">
          <h3 className="font-semibold text-gray-900 mb-4">
            {t('completion.summary')}
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">
                  {t('completion.companySetup')}
                </p>
                <p className="text-sm text-gray-600">
                  {data.companyData.name} ({data.companyData.cui})
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">
                  {t('completion.modulesEnabled')}
                </p>
                <p className="text-sm text-gray-600">
                  {Object.entries(data.modules)
                    .filter(([_, enabled]) => enabled)
                    .map(([module]) => t(`modules.${module}.name`))
                    .join(', ')}
                </p>
              </div>
            </div>

            {Object.values(data.integrations).some((v) => v) && (
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">
                    {t('completion.integrationsConfigured')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {Object.entries(data.integrations)
                      .filter(([_, enabled]) => enabled)
                      .map(([integration]) =>
                        t(`integrations.${integration}.name`)
                      )
                      .join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 text-left">
            {t('completion.quickLinks')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.key}
                  onClick={() => handleQuickLink(link.href)}
                  className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all text-left"
                >
                  <div className={`p-2 rounded-lg ${link.bgColor}`}>
                    <Icon className={`w-5 h-5 ${link.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {t(`completion.links.${link.key}.title`)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {t(`completion.links.${link.key}.description`)}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 text-left">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-semibold text-gray-900">
                {t('completion.nextSteps')}
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>{t('completion.step1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>{t('completion.step2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>{t('completion.step3')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>{t('completion.step4')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <Button
          onClick={handleComplete}
          variant="primary"
          size="lg"
          className="w-full"
        >
          {t('completion.goToDashboard')}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
