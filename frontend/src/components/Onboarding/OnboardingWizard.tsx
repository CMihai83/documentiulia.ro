import React, { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import PersonaSelector from './PersonaSelector';
import PersonaQuiz from './PersonaQuiz';
import PersonaFeaturesPreview from './PersonaFeaturesPreview';

type OnboardingStep = 'welcome' | 'persona-select' | 'persona-quiz' | 'features-preview' | 'company-info' | 'complete';

interface Persona {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  default_features?: string[];
  recommended_tier: string;
}

interface QuizRecommendation {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  recommended_tier: string;
  score: number;
  match_percentage: number;
}

interface OnboardingWizardProps {
  companyId: string;
  authToken: string;
  onComplete: () => void;
  initialStep?: OnboardingStep;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  companyId,
  authToken,
  onComplete,
  initialStep = 'welcome'
}) => {
  const { language } = useI18n();
  const [step, setStep] = useState<OnboardingStep>(initialStep);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePersonaSelect = (persona: Persona) => {
    setSelectedPersona(persona);
  };

  const handleConfirmPersona = async () => {
    if (!selectedPersona) return;
    // Go to features preview instead of saving immediately
    setStep('features-preview');
  };

  const handleFeaturesPreviewContinue = async () => {
    if (!selectedPersona) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/personas/select.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-Company-ID': companyId
        },
        body: JSON.stringify({
          persona_id: selectedPersona.id,
          selection_method: 'manual'
        })
      });

      const data = await response.json();

      if (data.success) {
        // Track onboarding progress
        await fetch('/api/v1/onboarding/progress.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'X-Company-ID': companyId
          },
          body: JSON.stringify({
            step: 'persona_selected',
            persona_id: selectedPersona.id
          })
        });

        setStep('complete');
      } else {
        setError(data.message || 'Failed to save persona');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuizComplete = async (recommendation: QuizRecommendation) => {
    setSelectedPersona(recommendation);

    setSaving(true);
    try {
      const response = await fetch('/api/v1/personas/select.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-Company-ID': companyId
        },
        body: JSON.stringify({
          persona_id: recommendation.id,
          selection_method: 'quiz',
          quiz_score: recommendation.match_percentage
        })
      });

      const data = await response.json();

      if (data.success) {
        setStep('complete');
      } else {
        setError(data.message || 'Failed to save persona');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <div className="text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {language === 'ro' ? 'Bine ai venit!' : 'Welcome!'}
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              {language === 'ro'
                ? 'Hai sa personalizam platforma pentru afacerea ta. Acest proces dureaza mai putin de 2 minute.'
                : 'Let\'s personalize the platform for your business. This process takes less than 2 minutes.'}
            </p>

            <div className="space-y-4 text-left bg-gray-50 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {language === 'ro' ? 'Alege profilul afacerii' : 'Choose your business profile'}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {language === 'ro'
                      ? 'Selecteaza tipul de afacere pentru o experienta personalizata'
                      : 'Select your business type for a personalized experience'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {language === 'ro' ? 'Primeste functii adaptate' : 'Get tailored features'}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {language === 'ro'
                      ? 'Dashboard si navigare optimizate pentru nevoile tale'
                      : 'Dashboard and navigation optimized for your needs'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {language === 'ro' ? 'Incepe sa lucrezi' : 'Start working'}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {language === 'ro'
                      ? 'Esti gata sa gestionezi afacerea mai eficient'
                      : 'You\'re ready to manage your business more efficiently'}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('persona-select')}
              className="px-8 py-4 bg-blue-600 text-white text-lg font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              {language === 'ro' ? 'Hai sa incepem' : 'Let\'s get started'}
            </button>
          </div>
        );

      case 'persona-select':
        return (
          <div>
            <PersonaSelector
              onSelect={handlePersonaSelect}
              onQuizStart={() => setStep('persona-quiz')}
              selectedId={selectedPersona?.id}
            />

            {selectedPersona && (
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600">
                      {language === 'ro' ? 'Selectat:' : 'Selected:'}
                    </span>
                    <span className="font-semibold text-gray-900">{selectedPersona.name}</span>
                  </div>
                  <button
                    onClick={handleConfirmPersona}
                    disabled={saving}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving
                      ? (language === 'ro' ? 'Se salveaza...' : 'Saving...')
                      : (language === 'ro' ? 'Continua' : 'Continue')}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="fixed bottom-20 left-0 right-0 p-4">
                <div className="max-w-md mx-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              </div>
            )}
          </div>
        );

      case 'persona-quiz':
        return (
          <PersonaQuiz
            onComplete={handleQuizComplete}
            onBack={() => setStep('persona-select')}
          />
        );

      case 'features-preview':
        return selectedPersona ? (
          <PersonaFeaturesPreview
            personaId={selectedPersona.id}
            personaName={selectedPersona.name}
            authToken={authToken}
            onContinue={handleFeaturesPreviewContinue}
            onBack={() => setStep('persona-select')}
          />
        ) : null;

      case 'complete':
        return (
          <div className="text-center max-w-xl mx-auto">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {language === 'ro' ? 'Felicitari!' : 'Congratulations!'}
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              {language === 'ro'
                ? `Ai selectat profilul "${selectedPersona?.name}"`
                : `You've selected the "${selectedPersona?.name}" profile`}
            </p>
            <p className="text-gray-500 mb-8">
              {language === 'ro'
                ? 'Platforma a fost personalizata pentru nevoile tale. Poti schimba profilul oricand din Setari.'
                : 'The platform has been personalized for your needs. You can change the profile anytime from Settings.'}
            </p>

            <button
              onClick={onComplete}
              className="px-8 py-4 bg-blue-600 text-white text-lg font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              {language === 'ro' ? 'Intra in aplicatie' : 'Enter the app'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-blue-600">Accountech</h2>
        </div>

        {renderStep()}
      </div>
    </div>
  );
};

export default OnboardingWizard;
