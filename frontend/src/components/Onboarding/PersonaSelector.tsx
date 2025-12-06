import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/I18nContext';

interface Persona {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  default_features: string[];
  recommended_tier: string;
}

interface PersonaSelectorProps {
  onSelect: (persona: Persona) => void;
  onQuizStart: () => void;
  selectedId?: string;
}

const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  onSelect,
  onQuizStart,
  selectedId
}) => {
  const { language } = useI18n();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadPersonas();
  }, [language]);

  const loadPersonas = async () => {
    try {
      const response = await fetch(`/api/v1/personas/list.php`, {
        headers: {
          'Accept-Language': language
        }
      });
      const data = await response.json();
      if (data.success) {
        setPersonas(data.data);
      }
    } catch (error) {
      console.error('Failed to load personas:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', label: language === 'ro' ? 'Toate' : 'All' },
    { id: 'service', label: language === 'ro' ? 'Servicii' : 'Services' },
    { id: 'retail', label: language === 'ro' ? 'Retail' : 'Retail' },
    { id: 'specialty', label: language === 'ro' ? 'Specializate' : 'Specialty' }
  ];

  const filteredPersonas = filter === 'all'
    ? personas
    : personas.filter(p => p.category === filter);

  const iconMap: Record<string, string> = {
    'briefcase': 'M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-6 0h-4V4h4v3z',
    'store': 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z',
    'truck': 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zm-.5 1.5l1.96 2.5H17V9.5h2.5zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z',
    'scissors': 'M12 12.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1zm-7-4a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7-4l3-3 3 3 3-3-3-3 3-3-3-3-3 3-3-3-3 3 3 3-3 3z',
    'wrench': 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
    'restaurant': 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z',
    'build': 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
    'flash': 'M7 2v11h3v9l7-12h-4l4-8z',
    'medical': 'M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z',
    'shopping': 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z',
    'directions-car': 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
    'agriculture': 'M19.5 12c.93 0 1.78.28 2.5.76V8c0-1.1-.9-2-2-2h-6.29l-1.06-1.06 1.41-1.41-.71-.71-3.53 3.53.71.71 1.41-1.41L13 6.71V9c0 1.1-.9 2-2 2h-.54c.95 1.06 1.54 2.46 1.54 4 0 .34-.04.67-.09 1h3.14c.25-2.25 2.14-4 4.45-4z'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="persona-selector">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {language === 'ro' ? 'Ce tip de afacere ai?' : 'What type of business do you have?'}
        </h1>
        <p className="text-gray-600 text-lg">
          {language === 'ro'
            ? 'Alege profilul care descrie cel mai bine afacerea ta. Vei primi o experienta personalizata.'
            : 'Choose the profile that best describes your business. You\'ll get a personalized experience.'}
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex justify-center gap-2 mb-8">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Persona Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {filteredPersonas.map(persona => (
          <div
            key={persona.id}
            onClick={() => onSelect(persona)}
            onMouseEnter={() => setHoveredId(persona.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`relative p-6 rounded-xl cursor-pointer transition-all duration-200 ${
              selectedId === persona.id
                ? 'ring-2 ring-blue-600 bg-blue-50'
                : hoveredId === persona.id
                ? 'bg-gray-50 shadow-lg transform -translate-y-1'
                : 'bg-white border border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Selection indicator */}
            {selectedId === persona.id && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {/* Icon */}
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: `${persona.color}20` }}
            >
              <svg
                className="w-6 h-6"
                fill={persona.color}
                viewBox="0 0 24 24"
              >
                <path d={iconMap[persona.icon] || iconMap['briefcase']} />
              </svg>
            </div>

            {/* Name */}
            <h3 className="font-semibold text-gray-900 mb-1">{persona.name}</h3>

            {/* Description (truncated) */}
            <p className="text-sm text-gray-500 line-clamp-2">
              {persona.description}
            </p>

            {/* Features preview on hover */}
            {hoveredId === persona.id && persona.default_features.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">
                  {language === 'ro' ? 'Include:' : 'Includes:'}
                </p>
                <div className="flex flex-wrap gap-1">
                  {persona.default_features.slice(0, 3).map((feature, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {feature}
                    </span>
                  ))}
                  {persona.default_features.length > 3 && (
                    <span className="text-xs text-gray-400">
                      +{persona.default_features.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Not sure section */}
      <div className="text-center py-6 border-t border-gray-200">
        <p className="text-gray-500 mb-3">
          {language === 'ro' ? 'Nu esti sigur ce sa alegi?' : 'Not sure what to choose?'}
        </p>
        <button
          onClick={onQuizStart}
          className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {language === 'ro' ? 'Ajuta-ma sa aleg' : 'Help me choose'}
        </button>
      </div>
    </div>
  );
};

export default PersonaSelector;
