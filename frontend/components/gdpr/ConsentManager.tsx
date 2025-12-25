'use client';

import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Info, Loader2 } from 'lucide-react';

interface Consent {
  id: string;
  purpose: string;
  granted: boolean;
  timestamp: Date;
  description: string;
  required: boolean;
}

interface ConsentManagerProps {
  userId: string;
}

const CONSENT_PURPOSES = [
  {
    purpose: 'ESSENTIAL',
    label: 'Essential Services',
    description: 'Required for basic platform functionality, account management, and legal compliance.',
    required: true,
  },
  {
    purpose: 'ANALYTICS',
    label: 'Analytics & Performance',
    description: 'Help us improve the platform by analyzing usage patterns and performance metrics.',
    required: false,
  },
  {
    purpose: 'MARKETING',
    label: 'Marketing Communications',
    description: 'Receive newsletters, product updates, and promotional offers via email.',
    required: false,
  },
  {
    purpose: 'PERSONALIZATION',
    label: 'Personalization',
    description: 'Customize your experience with personalized recommendations and content.',
    required: false,
  },
  {
    purpose: 'THIRD_PARTY_SHARING',
    label: 'Third-Party Integrations',
    description: 'Share data with integrated third-party services (SAGA, ANAF, banks) for enhanced functionality.',
    required: false,
  },
];

export function ConsentManager({ userId }: ConsentManagerProps) {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConsents();
  }, [userId]);

  const fetchConsents = async () => {
    try {
      const response = await fetch(`/api/gdpr/consents?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch consents');

      const data = await response.json();

      // Merge with default purposes
      const mergedConsents = CONSENT_PURPOSES.map((purpose) => {
        const existing = data.find((c: any) => c.purpose === purpose.purpose);
        return {
          id: existing?.id || '',
          purpose: purpose.purpose,
          granted: existing?.granted || purpose.required,
          timestamp: existing?.timestamp ? new Date(existing.timestamp) : new Date(),
          description: purpose.description,
          required: purpose.required,
        };
      });

      setConsents(mergedConsents);
    } catch (err) {
      setError('Failed to load consent preferences');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConsent = async (purpose: string, granted: boolean) => {
    setUpdating(purpose);
    setError(null);

    try {
      const response = await fetch(`/api/gdpr/consents?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purpose,
          granted,
        }),
      });

      if (!response.ok) throw new Error('Failed to update consent');

      // Update local state
      setConsents((prev) =>
        prev.map((c) =>
          c.purpose === purpose
            ? { ...c, granted, timestamp: new Date() }
            : c
        )
      );
    } catch (err) {
      setError('Failed to update consent preference');
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start gap-3 mb-6">
        <Shield className="w-6 h-6 text-blue-600 mt-1" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Consent Management</h3>
          <p className="text-sm text-gray-600 mt-1">
            Control how we use your data. You can change these preferences at any time.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {consents.map((consent) => {
          const purposeConfig = CONSENT_PURPOSES.find((p) => p.purpose === consent.purpose);
          if (!purposeConfig) return null;

          return (
            <div
              key={consent.purpose}
              className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition"
            >
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-gray-900">{purposeConfig.label}</h4>
                  {consent.required && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{consent.description}</p>
                {consent.timestamp && (
                  <p className="text-xs text-gray-500 mt-2">
                    Last updated: {new Date(consent.timestamp).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {consent.required ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Always On</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleToggleConsent(consent.purpose, !consent.granted)}
                    disabled={updating === consent.purpose}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      consent.granted ? 'bg-blue-600' : 'bg-gray-300'
                    } ${updating === consent.purpose ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        consent.granted ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-2">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">About Your Privacy</p>
            <p>
              We respect your privacy and process your data in accordance with GDPR. Essential services are required
              for the platform to function properly. You can withdraw consent for optional services at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
