'use client';

import { useTranslations } from 'next-intl';
import { Building, Database, Scale, BarChart3, Share2, Globe, Clock, UserCheck, Cookie, Lock, RefreshCw, Mail } from 'lucide-react';

const sectionIcons = {
  controller: Building,
  collection: Database,
  legal: Scale,
  use: BarChart3,
  sharing: Share2,
  transfers: Globe,
  retention: Clock,
  rights: UserCheck,
  cookies: Cookie,
  security: Lock,
  changes: RefreshCw,
  contact: Mail,
};

export default function PrivacyPage() {
  const t = useTranslations();

  const sections = [
    'controller',
    'collection',
    'legal',
    'use',
    'sharing',
    'transfers',
    'retention',
    'rights',
    'cookies',
    'security',
    'changes',
    'contact',
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Lock className="w-4 h-4" />
            GDPR Compliant
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{t('privacy.title')}</h1>
          <p className="text-sm text-gray-500 mb-4">{t('privacy.lastUpdated')}</p>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t('privacy.intro')}</p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => {
            const IconComponent = sectionIcons[section];
            return (
              <div
                key={section}
                className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">
                      {t(`privacy.sections.${section}.title`)}
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                      {t(`privacy.sections.${section}.content`)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 bg-primary-50 rounded-2xl p-8 border border-primary-100">
          <h3 className="text-lg font-semibold text-primary-900 mb-2">
            {t('privacy.sections.rights.title')}
          </h3>
          <p className="text-primary-700 text-sm">
            {t('privacy.sections.contact.content')}
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            {t('privacy.lastUpdated')}
          </p>
        </div>
      </div>
    </div>
  );
}
