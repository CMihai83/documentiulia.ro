'use client';

import { useTranslations } from 'next-intl';
import { FileText, Scale, Shield, CreditCard, Gavel, AlertCircle, X, Globe, RefreshCw, Mail } from 'lucide-react';

const sectionIcons = {
  acceptance: Scale,
  description: FileText,
  accounts: Shield,
  obligations: AlertCircle,
  payment: CreditCard,
  intellectual: FileText,
  liability: Gavel,
  termination: X,
  governing: Globe,
  changes: RefreshCw,
  contact: Mail,
};

export default function TermsPage() {
  const t = useTranslations();

  const sections = [
    'acceptance',
    'description',
    'accounts',
    'obligations',
    'payment',
    'intellectual',
    'liability',
    'termination',
    'governing',
    'changes',
    'contact',
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{t('terms.title')}</h1>
          <p className="text-sm text-gray-500 mb-4">{t('terms.lastUpdated')}</p>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t('terms.intro')}</p>
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
                      {t(`terms.sections.${section}.title`)}
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                      {t(`terms.sections.${section}.content`)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            {t('terms.lastUpdated')}
          </p>
        </div>
      </div>
    </div>
  );
}
