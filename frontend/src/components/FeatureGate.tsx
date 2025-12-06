import React from 'react';
import { useFeature, type FeatureAccess } from '../hooks/useFeature';
import { useI18n } from '../i18n/I18nContext';

interface FeatureGateProps {
  featureId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

/**
 * FeatureGate - Conditionally renders children based on feature access
 *
 * Usage:
 * <FeatureGate featureId="advanced_analytics" showUpgradePrompt>
 *   <AdvancedAnalytics />
 * </FeatureGate>
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  featureId,
  children,
  fallback,
  showUpgradePrompt = false
}) => {
  const { enabled, loading, access } = useFeature(featureId);

  if (loading) {
    return <FeatureGateLoading />;
  }

  if (enabled) {
    return <>{children}</>;
  }

  if (showUpgradePrompt && access) {
    return <UpgradePrompt access={access} />;
  }

  return fallback ? <>{fallback}</> : null;
};

/**
 * Loading state for feature gate
 */
const FeatureGateLoading: React.FC = () => (
  <div className="animate-pulse bg-gray-100 rounded-lg p-4 h-24" />
);

interface UpgradePromptProps {
  access: FeatureAccess;
  compact?: boolean;
  onUpgradeClick?: () => void;
}

/**
 * UpgradePrompt - Shows upgrade message when feature is not available
 */
export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  access,
  compact = false,
  onUpgradeClick
}) => {
  const { language } = useI18n();
  const isRo = language === 'ro';

  const getMessage = () => {
    switch (access.reason) {
      case 'tier_required':
        return isRo
          ? `Această funcție necesită planul ${access.required_tier?.toUpperCase()}`
          : `This feature requires the ${access.required_tier?.toUpperCase()} plan`;
      case 'persona_restricted':
        return isRo
          ? 'Această funcție nu este disponibilă pentru tipul dvs. de afacere'
          : 'This feature is not available for your business type';
      case 'feature_disabled':
        return isRo
          ? 'Această funcție este temporar indisponibilă'
          : 'This feature is temporarily unavailable';
      default:
        return isRo
          ? 'Funcție indisponibilă'
          : 'Feature unavailable';
    }
  };

  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else if (access.upgrade_url) {
      window.location.href = access.upgrade_url;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="text-amber-500">&#128274;</span>
        <span>{getMessage()}</span>
        {access.reason === 'tier_required' && (
          <button
            onClick={handleUpgradeClick}
            className="text-blue-600 hover:underline"
          >
            {isRo ? 'Upgrade' : 'Upgrade'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 text-center">
      <div className="text-4xl mb-3">&#128274;</div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        {access.feature_name || (isRo ? 'Funcție Premium' : 'Premium Feature')}
      </h3>
      <p className="text-gray-600 mb-4">{getMessage()}</p>

      {access.reason === 'tier_required' && (
        <div className="space-y-3">
          <div className="flex justify-center items-center gap-2 text-sm text-gray-500">
            <span>{isRo ? 'Plan curent:' : 'Current plan:'}</span>
            <span className="px-2 py-0.5 bg-gray-200 rounded font-medium">
              {access.current_tier?.toUpperCase()}
            </span>
            <span>→</span>
            <span className="px-2 py-0.5 bg-blue-600 text-white rounded font-medium">
              {access.required_tier?.toUpperCase()}
            </span>
          </div>
          <button
            onClick={handleUpgradeClick}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {isRo ? 'Upgrade Acum' : 'Upgrade Now'}
          </button>
        </div>
      )}

      {access.is_beta && (
        <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
          <span>&#128640;</span>
          <span>BETA</span>
        </div>
      )}

      {access.requires_setup && (
        <p className="mt-3 text-sm text-amber-600">
          {isRo
            ? 'Această funcție necesită configurare suplimentară'
            : 'This feature requires additional setup'}
        </p>
      )}
    </div>
  );
};

interface FeatureBadgeProps {
  featureId: string;
  showLock?: boolean;
}

/**
 * FeatureBadge - Small indicator showing if a feature is locked/unlocked
 */
export const FeatureBadge: React.FC<FeatureBadgeProps> = ({
  featureId,
  showLock = true
}) => {
  const { enabled, loading, access } = useFeature(featureId);

  if (loading) return null;

  if (enabled) {
    return null; // No badge needed for enabled features
  }

  if (!showLock) return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded"
      title={access?.reason === 'tier_required'
        ? `Requires ${access.required_tier} plan`
        : 'Feature locked'}
    >
      <span>&#128274;</span>
      {access?.required_tier && (
        <span className="uppercase">{access.required_tier}</span>
      )}
    </span>
  );
};

/**
 * Type export for FeatureAccess
 */
export type { FeatureAccess };

export default FeatureGate;
