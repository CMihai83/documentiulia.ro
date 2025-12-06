import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface SubscriptionPlan {
  id: number;
  plan_key: string;
  plan_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: string[];
  max_companies: number;
  max_users_per_company: number;
  max_invoices_per_month: number | null;
  ai_queries_per_month: number | null;
}

interface Subscription {
  id: number;
  plan_id: number;
  plan_key: string;
  plan_name: string;
  status: string;
  billing_cycle: string;
  amount_paid: number;
  currency: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  auto_renew: boolean;
  cancel_at_period_end: boolean;
  features: string[];
}

interface UsageStats {
  invoices_this_month: number;
  invoices_limit: number | null;
  ai_queries_this_month: number;
  ai_queries_limit: number | null;
  storage_used_gb: number;
  storage_limit_gb: number;
}

const SubscriptionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      if (!token) {
        navigate('/login');
        return;
      }

      // Fetch current subscription and usage
      const subResponse = await fetch(
        'https://documentiulia.ro/api/v1/subscriptions/my-subscription.php',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const subData = await subResponse.json();
      if (subData.success) {
        setSubscription(subData.subscription);
        setUsage(subData.usage);
      }

      // Fetch available plans
      const plansResponse = await fetch(
        'https://documentiulia.ro/api/v1/subscriptions/plans.php'
      );

      const plansData = await plansResponse.json();
      if (plansData.success) {
        setPlans(plansData.plans);
      }
    } catch (err) {
      setError('Failed to load subscription data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { bg: string; text: string; label: string } } = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Activ' },
      trialing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Perioadă trial' },
      past_due: { bg: 'bg-red-100', text: 'text-red-800', label: 'Plată restantă' },
      canceled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Anulat' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expirat' },
    };

    const badge = badges[status] || badges.active;

    return (
      <span className={`px-3 py-1 ${badge.bg} ${badge.text} text-sm font-semibold rounded-full`}>
        {badge.label}
      </span>
    );
  };

  const calculatePercentage = (used: number, limit: number | null): number => {
    if (!limit) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const daysUntilRenewal = (endDate: string): number => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2">Abonamentul meu</h1>
          <p className="text-blue-100">Gestionează abonamentul și facturarea</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Subscription Card */}
        {subscription ? (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Plan {subscription.plan_name}
                </h2>
                <div className="flex items-center space-x-4">
                  {getStatusBadge(subscription.status)}
                  {subscription.cancel_at_period_end && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
                      Se anulează la {formatDate(subscription.current_period_end)}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className="text-3xl font-bold text-blue-600">
                  {subscription.amount_paid} {subscription.currency}
                </p>
                <p className="text-sm text-gray-600">
                  /{subscription.billing_cycle === 'yearly' ? 'an' : 'lună'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Perioadă curentă</p>
                <p className="font-semibold text-gray-900">
                  {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {daysUntilRenewal(subscription.current_period_end)} zile până la reînnoire
                </p>
              </div>

              {subscription.trial_ends_at && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 mb-1">Perioadă trial</p>
                  <p className="font-semibold text-blue-900">
                    Expiră {formatDate(subscription.trial_ends_at)}
                  </p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Reînnoire automată</p>
                <p className="font-semibold text-gray-900">
                  {subscription.auto_renew ? 'Activată' : 'Dezactivată'}
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/subscription/plans')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Schimbă planul
              </button>
              <button
                onClick={() => navigate('/subscription/billing')}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Istoric facturi
              </button>
              {subscription.status === 'active' && !subscription.cancel_at_period_end && (
                <button
                  onClick={() => {/* TODO: Cancel subscription */}}
                  className="px-6 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-semibold"
                >
                  Anulează abonamentul
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Niciun abonament activ</h3>
            <p className="text-gray-600 mb-6">
              Ești pe planul Free. Actualizează pentru a debloca toate funcționalitățile platformei.
            </p>
            <button
              onClick={() => navigate('/subscription/plans')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Vezi planurile disponibile
            </button>
          </div>
        )}

        {/* Usage Stats */}
        {usage && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Utilizare resurse</h2>

            <div className="space-y-6">
              {/* Invoices Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Facturi luna aceasta</span>
                  <span className="text-sm text-gray-600">
                    {usage.invoices_this_month} / {usage.invoices_limit || '∞'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getProgressColor(
                      calculatePercentage(usage.invoices_this_month, usage.invoices_limit)
                    )}`}
                    style={{
                      width: `${calculatePercentage(usage.invoices_this_month, usage.invoices_limit)}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* AI Queries Usage */}
              {usage.ai_queries_limit && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Interogări AI</span>
                    <span className="text-sm text-gray-600">
                      {usage.ai_queries_this_month} / {usage.ai_queries_limit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressColor(
                        calculatePercentage(usage.ai_queries_this_month, usage.ai_queries_limit)
                      )}`}
                      style={{
                        width: `${calculatePercentage(usage.ai_queries_this_month, usage.ai_queries_limit)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Storage Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Spațiu stocare</span>
                  <span className="text-sm text-gray-600">
                    {usage.storage_used_gb.toFixed(2)} GB / {usage.storage_limit_gb} GB
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getProgressColor(
                      calculatePercentage(usage.storage_used_gb, usage.storage_limit_gb)
                    )}`}
                    style={{
                      width: `${calculatePercentage(usage.storage_used_gb, usage.storage_limit_gb)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features List */}
        {subscription && subscription.features && subscription.features.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Funcționalități incluse</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscription.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upgrade CTA (if on free plan) */}
        {!subscription && plans.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-xl p-8 text-white mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">Actualizează la Premium</h3>
                <p className="text-blue-100 mb-4">
                  Deblochează funcționalități avansate: AI, integrare bancară, CRM și multe altele
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Facturi nelimitate
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Asistent fiscal AI
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Acces la toate cursurile
                  </li>
                </ul>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-200 mb-2">Începând de la</p>
                <p className="text-4xl font-bold mb-2">{plans[1]?.price_monthly} EUR</p>
                <p className="text-sm text-blue-200 mb-4">/lună</p>
                <button
                  onClick={() => navigate('/subscription/plans')}
                  className="px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-bold text-lg"
                >
                  Vezi planurile
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionDashboard;
