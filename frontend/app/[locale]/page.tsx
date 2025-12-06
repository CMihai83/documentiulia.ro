'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowRight, FileText, Brain, Shield, Calculator, Users, Coins } from 'lucide-react';

export default function HomePage() {
  const t = useTranslations();

  const features = [
    { key: 'vat', icon: Calculator },
    { key: 'ocr', icon: FileText },
    { key: 'saft', icon: Shield },
    { key: 'efactura', icon: FileText },
    { key: 'ai', icon: Brain },
    { key: 'hr', icon: Users },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex justify-center gap-4 mb-6">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{t('compliance.anafBadge')}</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{t('compliance.gdprBadge')}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">{t('hero.title')}</h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto opacity-90">{t('hero.subtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-white text-primary-700 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition flex items-center justify-center gap-2"
            >
              {t('hero.cta')} <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/demo"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/10 transition"
            >
              {t('hero.demo')}
            </Link>
          </div>
          <div className="mt-8 flex justify-center gap-6 text-sm opacity-80">
            <span>{t('compliance.vatLaw')}</span>
            <span>|</span>
            <span>{t('compliance.saftOrder')}</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{t('features.title')}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(({ key, icon: Icon }) => (
              <div key={key} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t(`features.${key}.title`)}</h3>
                <p className="text-gray-600">{t(`features.${key}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{t('pricing.title')}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {['free', 'pro', 'business'].map((tier) => (
              <div
                key={tier}
                className={`p-8 rounded-xl border-2 ${
                  tier === 'pro' ? 'border-primary-500 shadow-lg scale-105' : 'border-gray-200'
                }`}
              >
                <h3 className="text-2xl font-bold mb-2">{t(`pricing.${tier}.name`)}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{t(`pricing.${tier}.price`)}</span>
                  <span className="text-gray-500">{t(`pricing.${tier}.period`)}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {(t.raw(`pricing.${tier}.features`) as string[]).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`block text-center py-3 rounded-lg font-semibold transition ${
                    tier === 'pro'
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {t('hero.cta')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
