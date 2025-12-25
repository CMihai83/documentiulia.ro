'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Cookie, Shield } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const CONSENT_KEY = 'gdpr_cookie_consent';

interface ConsentState {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
}

export function GDPRCookieBanner() {
  const t = useTranslations('gdpr');
  const pathname = usePathname();
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({
    essential: true,
    analytics: false,
    marketing: false,
    timestamp: 0,
  });

  // Extract locale from pathname
  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch ? localeMatch[1] : 'ro';

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Check if consent is less than 365 days old
        const daysSinceConsent = (Date.now() - parsed.timestamp) / (1000 * 60 * 60 * 24);
        if (daysSinceConsent < 365) {
          setConsent(parsed);
          return;
        }
      } catch (e) {
        // Invalid stored consent
      }
    }
    // Show banner if no valid consent
    setShowBanner(true);
  }, []);

  const saveConsent = (newConsent: ConsentState) => {
    const consentWithTimestamp = { ...newConsent, timestamp: Date.now() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consentWithTimestamp));
    setConsent(consentWithTimestamp);
    setShowBanner(false);
  };

  const acceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
    });
  };

  const acceptEssential = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    });
  };

  const savePreferences = () => {
    saveConsent(consent);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg md:p-6">
      <div className="max-w-7xl mx-auto">
        {!showDetails ? (
          // Simple banner
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900">
                  {t('title') || 'Utilizăm cookie-uri'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {t('description') || 'Folosim cookie-uri pentru a îmbunătăți experiența dumneavoastră pe site. Puteți alege ce tipuri de cookie-uri acceptați.'}
                  {' '}
                  <Link href={`/${locale}/privacy`} className="text-blue-600 hover:underline">
                    {t('learnMore') || 'Află mai multe'}
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                {t('customize') || 'Personalizează'}
              </button>
              <button
                onClick={acceptEssential}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('acceptEssential') || 'Doar necesare'}
              </button>
              <button
                onClick={acceptAll}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {t('acceptAll') || 'Acceptă toate'}
              </button>
            </div>
          </div>
        ) : (
          // Detailed preferences
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                <h3 className="font-semibold text-gray-900">
                  {t('preferencesTitle') || 'Preferințe cookie-uri'}
                </h3>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Essential */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {t('essential') || 'Esențiale'}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                    {t('required') || 'Obligatorii'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {t('essentialDesc') || 'Necesare pentru funcționarea site-ului. Nu pot fi dezactivate.'}
                </p>
              </div>

              {/* Analytics */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {t('analytics') || 'Analitice'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent.analytics}
                      onChange={(e) => setConsent(prev => ({ ...prev, analytics: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-sm text-gray-600">
                  {t('analyticsDesc') || 'Ne ajută să înțelegem cum utilizați site-ul pentru a-l îmbunătăți.'}
                </p>
              </div>

              {/* Marketing */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {t('marketing') || 'Marketing'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent.marketing}
                      onChange={(e) => setConsent(prev => ({ ...prev, marketing: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-sm text-gray-600">
                  {t('marketingDesc') || 'Folosite pentru a vă arăta reclame relevante pe alte site-uri.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <button
                onClick={acceptEssential}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('acceptEssential') || 'Doar necesare'}
              </button>
              <button
                onClick={savePreferences}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {t('savePreferences') || 'Salvează preferințele'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
