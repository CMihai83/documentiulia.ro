import React from 'react';
import { useFeature } from '../../hooks/useFeature';
import { useI18n } from '../../i18n/I18nContext';

interface FeatureGateProps {
  featureId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  loadingComponent?: React.ReactNode;
}

/**
 * Feature Gate Component
 * Conditionally renders children based on feature access
 *
 * Usage:
 *   <FeatureGate featureId="advanced_reporting" showUpgradePrompt>
 *     <AdvancedReportingDashboard />
 *   </FeatureGate>
 */
const FeatureGate: React.FC<FeatureGateProps> = ({
  featureId,
  children,
  fallback,
  showUpgradePrompt = true,
  loadingComponent
}) => {
  const { enabled, loading, access } = useFeature(featureId);
  const { language } = useI18n();

  if (loading) {
    return (
      <>
        {loadingComponent || (
          <div className="animate-pulse bg-gray-100 rounded-lg h-32" />
        )}
      </>
    );
  }

  if (enabled) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt && access) {
    return <UpgradePrompt access={access} language={language} />;
  }

  return null;
};

interface UpgradePromptProps {
  access: {
    reason: string;
    feature_name?: string;
    required_tier?: string;
    current_tier?: string;
    upgrade_url?: string;
  };
  language: string;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ access, language }) => {
  const isRo = language === 'ro';

  const getTierLabel = (tier: string): string => {
    const labels: Record<string, { ro: string; en: string }> = {
      free: { ro: 'Gratuit', en: 'Free' },
      starter: { ro: 'Starter', en: 'Starter' },
      professional: { ro: 'Profesional', en: 'Professional' },
      business: { ro: 'Business', en: 'Business' },
      enterprise: { ro: 'Enterprise', en: 'Enterprise' }
    };
    return labels[tier]?.[isRo ? 'ro' : 'en'] || tier;
  };

  if (access.reason === 'tier_required') {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {access.feature_name || (isRo ? 'Funcție Premium' : 'Premium Feature')}
        </h3>
        <p className="text-gray-600 mb-4">
          {isRo
            ? `Această funcție necesită planul ${getTierLabel(access.required_tier || 'professional')} sau superior.`
            : `This feature requires the ${getTierLabel(access.required_tier || 'professional')} plan or higher.`}
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
          <span className="px-2 py-1 bg-gray-100 rounded-full">
            {isRo ? 'Plan curent:' : 'Current plan:'} {getTierLabel(access.current_tier || 'free')}
          </span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
            {isRo ? 'Necesar:' : 'Required:'} {getTierLabel(access.required_tier || 'professional')}
          </span>
        </div>
        <a
          href={access.upgrade_url || '/settings/subscription'}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {isRo ? 'Upgrade acum' : 'Upgrade now'}
        </a>
      </div>
    );
  }

  if (access.reason === 'persona_restricted') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isRo ? 'Funcție indisponibilă' : 'Feature Unavailable'}
        </h3>
        <p className="text-gray-600">
          {isRo
            ? 'Această funcție nu este disponibilă pentru tipul tău de afacere. Poți schimba profilul din Setări.'
            : 'This feature is not available for your business type. You can change your profile in Settings.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
      <p className="text-gray-600">
        {isRo ? 'Această funcție nu este disponibilă momentan.' : 'This feature is currently unavailable.'}
      </p>
    </div>
  );
};

export default FeatureGate;
export { UpgradePrompt };
