'use client';

import { useTranslations } from 'next-intl';
import { Check, Star } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const t = useTranslations();

  const tiers = ['free', 'pro', 'business', 'enterprise'] as const;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            {t('home.pricing.badge')}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{t('pricing.title')}</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t('home.pricing.subtitle')}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {tiers.map((tier) => (
            <div
              key={tier}
              className={`relative bg-white rounded-2xl shadow-lg p-8 border-2 transition-all duration-300 hover:shadow-xl ${
                tier === 'pro'
                  ? 'border-primary-500 scale-105 bg-gradient-to-b from-primary-50 to-white'
                  : 'border-gray-200 hover:border-primary-300'
              }`}
            >
              {tier === 'pro' && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  {t('home.pricing.mostPopular')}
                </div>
              )}

              <h3 className="text-2xl font-bold text-gray-900 text-center">{t(`pricing.${tier}.name`)}</h3>
              <p className="text-gray-500 text-center mt-2 text-sm">
                {t(`home.pricing.tierDescriptions.${tier}`)}
              </p>

              <div className="mt-6 text-center">
                <span className="text-5xl font-bold text-gray-900">{t(`pricing.${tier}.price`)}</span>
                <span className="text-gray-500 text-lg">{t(`pricing.${tier}.period`)}</span>
              </div>

              <ul className="mt-8 space-y-4">
                {(() => {
                  try {
                    const features = t.raw(`pricing.${tier}.features`);
                    if (Array.isArray(features)) {
                      return features.map((feature: string, i: number) => (
                        <li key={i} className="flex items-center gap-3">
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ));
                    }
                    return null;
                  } catch {
                    return null;
                  }
                })()}
              </ul>

              <Link
                href="/register"
                className={`mt-8 block w-full text-center py-4 rounded-xl font-semibold transition-all duration-300 ${
                  tier === 'pro'
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 shadow-lg'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {tier === 'free' ? t('home.pricing.ctaFree') : t('home.pricing.ctaPaid')}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-500 mt-12">
          <Check className="w-4 h-4 inline mr-1 text-green-500" />
          {t('home.pricing.trialInfo')}
        </p>
      </div>
    </div>
  );
}