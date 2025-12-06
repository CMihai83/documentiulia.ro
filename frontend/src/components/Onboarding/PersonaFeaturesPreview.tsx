import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/I18nContext';

interface Feature {
  id: string;
  name: string;
  description: string;
  category: string;
  required_tier: string;
  is_beta: boolean;
  is_enabled: boolean;
}

interface PersonaFeaturesPreviewProps {
  personaId: string;
  personaName: string;
  authToken: string;
  onContinue: () => void;
  onBack: () => void;
}

const PersonaFeaturesPreview: React.FC<PersonaFeaturesPreviewProps> = ({
  personaId,
  personaName,
  authToken,
  onContinue,
  onBack
}) => {
  const { language } = useI18n();
  const isRo = language === 'ro';
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const response = await fetch(`/api/v1/personas/features.php?persona_id=${personaId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setFeatures(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch features:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
  }, [personaId, authToken]);

  // Group features by category
  const groupedFeatures = React.useMemo(() => {
    const grouped: Record<string, Feature[]> = {};
    features.forEach(f => {
      const cat = f.category || 'other';
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(f);
    });
    return grouped;
  }, [features]);

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, { ro: string; en: string }> = {
      core: { ro: 'Functii de Baza', en: 'Core Features' },
      premium: { ro: 'Functii Premium', en: 'Premium Features' },
      vertical: { ro: 'Specifice Industriei', en: 'Industry-Specific' },
      regional: { ro: 'Functii Locale', en: 'Regional Features' },
      other: { ro: 'Alte Functii', en: 'Other Features' }
    };
    return labels[category]?.[isRo ? 'ro' : 'en'] || category;
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      core: '&#9881;',
      premium: '&#11088;',
      vertical: '&#128187;',
      regional: '&#127757;',
      other: '&#128270;'
    };
    return icons[category] || '&#128462;';
  };

  const enabledFeatures = features.filter(f => f.is_enabled);
  const lockedFeatures = features.filter(f => !f.is_enabled);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">&#10003;</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isRo ? `Functii pentru "${personaName}"` : `Features for "${personaName}"`}
        </h2>
        <p className="text-gray-600">
          {isRo
            ? 'Iata ce vei putea face cu profilul selectat:'
            : 'Here\'s what you\'ll be able to do with your selected profile:'}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{enabledFeatures.length}</div>
          <div className="text-sm text-gray-600">
            {isRo ? 'Functii Active' : 'Active Features'}
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-amber-600">{lockedFeatures.length}</div>
          <div className="text-sm text-gray-600">
            {isRo ? 'Cu Upgrade' : 'With Upgrade'}
          </div>
        </div>
      </div>

      {/* Feature categories */}
      <div className="space-y-6 mb-8">
        {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => {
          const enabledInCategory = categoryFeatures.filter(f => f.is_enabled);
          if (enabledInCategory.length === 0) return null;

          return (
            <div key={category} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span dangerouslySetInnerHTML={{ __html: getCategoryIcon(category) }} />
                {getCategoryLabel(category)}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {enabledInCategory.map(feature => (
                  <div
                    key={feature.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="text-green-600">&#10003;</span>
                    <span className="text-gray-700">{feature.name}</span>
                    {feature.is_beta && (
                      <span className="px-1 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                        BETA
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Locked features teaser */}
      {lockedFeatures.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 mb-8">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span>&#128274;</span>
            {isRo ? 'Disponibile cu Upgrade' : 'Available with Upgrade'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {lockedFeatures.slice(0, 8).map(feature => (
              <span
                key={feature.id}
                className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-500"
              >
                {feature.name}
              </span>
            ))}
            {lockedFeatures.length > 8 && (
              <span className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-600">
                +{lockedFeatures.length - 8} {isRo ? 'mai multe' : 'more'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          {isRo ? 'Inapoi' : 'Back'}
        </button>
        <button
          onClick={onContinue}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {isRo ? 'Continua' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

export default PersonaFeaturesPreview;
