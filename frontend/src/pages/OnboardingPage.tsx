import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import OnboardingWizard from '../components/Onboarding/OnboardingWizard';

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { token, companyId } = useAuth();
  const { language } = useI18n();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPersonaStatus();
  }, [companyId, token]);

  const checkPersonaStatus = async () => {
    if (!companyId || !token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/v1/personas/get.php`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId
        }
      });
      const data = await response.json();

      if (data.success && data.data?.persona_id) {
        // Already has persona, redirect to dashboard
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      console.error('Failed to check persona status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    navigate('/dashboard', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">
            {language === 'ro' ? 'Se incarca...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!companyId || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {language === 'ro' ? 'Eroare de autentificare' : 'Authentication Error'}
          </h2>
          <p className="text-gray-600 mb-4">
            {language === 'ro'
              ? 'Te rugam sa te autentifici pentru a continua.'
              : 'Please log in to continue.'}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {language === 'ro' ? 'Autentificare' : 'Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <OnboardingWizard
        companyId={companyId}
        authToken={token}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
};

export default OnboardingPage;
