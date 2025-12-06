import React, { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { useAllFeatures } from '../hooks/useFeature';
import Sidebar from '../components/layout/Sidebar';

interface FeatureItem {
  id: string;
  name: string;
  description: string;
  category: string;
  required_tier: string;
  is_beta: boolean;
  requires_setup?: boolean;
  access: {
    enabled: boolean;
    reason: string;
    feature_id: string;
    required_tier?: string;
    current_tier?: string;
  };
}

interface FeaturesByCategory {
  [category: string]: FeatureItem[];
}

const FeaturesPage: React.FC = () => {
  const { language } = useI18n();
  const isRo = language === 'ro';
  const { features, loading } = useAllFeatures();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Group features by category
  const groupedFeatures = React.useMemo(() => {
    const grouped: FeaturesByCategory = {};
    features.forEach(feature => {
      const cat = feature.category || 'other';
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(feature as FeatureItem);
    });
    return grouped;
  }, [features]);

  const categories = Object.keys(groupedFeatures);

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, { ro: string; en: string }> = {
      core: { ro: 'Funcții de Bază', en: 'Core Features' },
      premium: { ro: 'Funcții Premium', en: 'Premium Features' },
      vertical: { ro: 'Funcții Specifice', en: 'Industry-Specific' },
      regional: { ro: 'Funcții Regionale', en: 'Regional Features' },
      other: { ro: 'Alte Funcții', en: 'Other Features' }
    };
    return labels[category]?.[isRo ? 'ro' : 'en'] || category;
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      core: '&#9881;',      // gear
      premium: '&#11088;',  // star
      vertical: '&#128187;', // laptop
      regional: '&#127757;', // globe
      other: '&#128270;'     // magnifying glass
    };
    return icons[category] || '&#128462;';
  };

  const getTierBadgeColor = (tier: string): string => {
    const colors: Record<string, string> = {
      free: 'bg-gray-100 text-gray-600',
      starter: 'bg-green-100 text-green-700',
      growth: 'bg-blue-100 text-blue-700',
      professional: 'bg-purple-100 text-purple-700',
      enterprise: 'bg-amber-100 text-amber-700'
    };
    return colors[tier] || 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {isRo ? 'Funcții Platformă' : 'Platform Features'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isRo
                ? 'Explorați toate funcțiile disponibile și deblocați funcții noi prin upgrade'
                : 'Explore all available features and unlock new ones by upgrading'}
            </p>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 mb-8 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {isRo ? 'Toate' : 'All'}
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span dangerouslySetInnerHTML={{ __html: getCategoryIcon(cat) }} />
                {' '}{getCategoryLabel(cat)}
              </button>
            ))}
          </div>

          {/* Features grid */}
          {(selectedCategory ? [selectedCategory] : categories).map(category => (
            <div key={category} className="mb-8">
              {!selectedCategory && (
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span dangerouslySetInnerHTML={{ __html: getCategoryIcon(category) }} />
                  {getCategoryLabel(category)}
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedFeatures[category]?.map(feature => (
                  <div
                    key={feature.id}
                    className={`bg-white rounded-xl p-5 shadow-sm border transition-all ${
                      feature.access.enabled
                        ? 'border-gray-200 hover:shadow-md'
                        : 'border-gray-100 opacity-75'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-900">{feature.name}</h3>
                      <div className="flex gap-1">
                        {feature.is_beta && (
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                            BETA
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-xs rounded-full uppercase ${getTierBadgeColor(feature.required_tier)}`}>
                          {feature.required_tier}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">
                      {feature.description || (isRo ? 'Fără descriere' : 'No description')}
                    </p>

                    <div className="flex justify-between items-center">
                      {feature.access.enabled ? (
                        <span className="flex items-center gap-1 text-sm text-green-600">
                          <span>&#10003;</span>
                          {isRo ? 'Activat' : 'Enabled'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm text-gray-400">
                          <span>&#128274;</span>
                          {feature.access.reason === 'tier_required'
                            ? (isRo ? `Necesită ${feature.access.required_tier}` : `Requires ${feature.access.required_tier}`)
                            : (isRo ? 'Blocat' : 'Locked')}
                        </span>
                      )}

                      {feature.requires_setup && feature.access.enabled && (
                        <span className="text-xs text-amber-600">
                          {isRo ? 'Necesită configurare' : 'Needs setup'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Summary stats */}
          <div className="mt-8 p-6 bg-white rounded-xl shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">
              {isRo ? 'Rezumat Funcții' : 'Features Summary'}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {features.filter(f => f.access.enabled).length}
                </div>
                <div className="text-sm text-gray-600">
                  {isRo ? 'Funcții Active' : 'Active Features'}
                </div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">
                  {features.filter(f => !f.access.enabled).length}
                </div>
                <div className="text-sm text-gray-600">
                  {isRo ? 'Funcții Blocate' : 'Locked Features'}
                </div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {features.length}
                </div>
                <div className="text-sm text-gray-600">
                  {isRo ? 'Total Funcții' : 'Total Features'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturesPage;
