import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Plan {
  id: number;
  plan_key: string;
  plan_name: string;
  description: string;
  price_monthly: number;
  price_quarterly: number;
  price_yearly: number;
  currency: string;
  features: string[];
  max_companies: number;
  max_users_per_company: number;
  max_invoices_per_month: number | null;
  ai_queries_per_month: number | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
}

type BillingCycle = 'monthly' | 'yearly';

const PricingPlans: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
    checkCurrentSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://documentiulia.ro/api/v1/subscriptions/plans.php');
      const data = await response.json();

      if (data.success) {
        setPlans(data.plans);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to load pricing plans');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentSubscription = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      const response = await fetch('https://documentiulia.ro/api/v1/subscriptions/my-subscription.php', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success && data.subscription) {
        setCurrentPlan(data.subscription.plan_key);
      }
    } catch (err) {
      console.error('Failed to check current subscription', err);
    }
  };

  const getPrice = (plan: Plan): number => {
    return billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
  };

  const calculateYearlySavings = (plan: Plan): number => {
    const monthlyTotal = plan.price_monthly * 12;
    const yearlySavings = monthlyTotal - plan.price_yearly;
    return Math.round((yearlySavings / monthlyTotal) * 100);
  };

  const handleSelectPlan = async (plan: Plan) => {
    const token = localStorage.getItem('auth_token');

    if (!token) {
      navigate('/login', { state: { returnTo: '/subscription/plans' } });
      return;
    }

    if (plan.plan_key === currentPlan) {
      navigate('/subscription');
      return;
    }

    // TODO: Integrate with Stripe checkout
    alert(`Upgrade to ${plan.plan_name} - Stripe integration coming soon!`);
  };

  const getPlanIcon = (planKey: string) => {
    switch (planKey) {
      case 'free':
        return (
          <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
          </svg>
        );
      case 'basic':
        return (
          <svg className="w-12 h-12 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        );
      case 'premium':
        return (
          <svg className="w-12 h-12 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        );
      case 'enterprise':
        return (
          <svg className="w-12 h-12 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/>
            <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
          </svg>
        );
      default:
        return null;
    }
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
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Alege planul potrivit pentru afacerea ta</h1>
          <p className="text-xl text-blue-100 mb-8">
            Începe gratuit și actualizează când afacerea ta crește
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4">
            <span className={`text-lg ${billingCycle === 'monthly' ? 'text-white font-semibold' : 'text-blue-200'}`}>
              Lunar
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                billingCycle === 'yearly' ? 'bg-white' : 'bg-blue-400'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-blue-600 transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-lg ${billingCycle === 'yearly' ? 'text-white font-semibold' : 'text-blue-200'}`}>
              Anual
            </span>
            {billingCycle === 'yearly' && (
              <span className="ml-2 px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-full">
                Economisești până la 30%!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const isPopular = plan.plan_key === 'premium';
            const isCurrent = plan.plan_key === currentPlan;
            const price = getPrice(plan);
            const savingsPercent = billingCycle === 'yearly' ? calculateYearlySavings(plan) : 0;

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                  isPopular ? 'ring-4 ring-purple-500 transform scale-105' : ''
                }`}
              >
                {isPopular && (
                  <div className="absolute top-0 right-0 bg-purple-500 text-white px-4 py-1 text-sm font-bold rounded-bl-lg">
                    CEL MAI POPULAR
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute top-0 left-0 bg-green-500 text-white px-4 py-1 text-sm font-bold rounded-br-lg">
                    PLANUL CURENT
                  </div>
                )}

                <div className="p-8">
                  {/* Icon */}
                  <div className="flex justify-center mb-4">
                    {getPlanIcon(plan.plan_key)}
                  </div>

                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">
                    {plan.plan_name}
                  </h3>

                  {/* Description */}
                  <p className="text-center text-gray-600 text-sm mb-6 h-12">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="text-center mb-6">
                    {price === 0 ? (
                      <div>
                        <p className="text-4xl font-bold text-gray-900">Gratuit</p>
                        <p className="text-sm text-gray-500">Pentru totdeauna</p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline justify-center">
                          <span className="text-4xl font-bold text-gray-900">{price}</span>
                          <span className="text-xl text-gray-600 ml-2">{plan.currency}</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          per {billingCycle === 'yearly' ? 'an' : 'lună'}
                        </p>
                        {billingCycle === 'yearly' && savingsPercent > 0 && (
                          <p className="text-xs text-green-600 font-semibold mt-1">
                            Economisești {savingsPercent}%
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isCurrent}
                    className={`w-full py-3 rounded-lg font-bold text-lg transition-colors mb-6 ${
                      isCurrent
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : isPopular
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isCurrent ? 'Planul curent' : price === 0 ? 'Începe gratuit' : 'Alege planul'}
                  </button>

                  {/* Features List */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Ce include:</p>

                    {/* Key Limits */}
                    <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                      <div className="flex items-center text-sm text-gray-700">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        <span>
                          {plan.max_invoices_per_month
                            ? `${plan.max_invoices_per_month} facturi/lună`
                            : 'Facturi nelimitate'}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        <span>{plan.max_users_per_company} utilizatori</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        <span>{plan.max_companies} {plan.max_companies === 1 ? 'companie' : 'companii'}</span>
                      </div>
                      {plan.ai_queries_per_month && (
                        <div className="flex items-center text-sm text-gray-700">
                          <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                          <span>{plan.ai_queries_per_month} interogări AI/lună</span>
                        </div>
                      )}
                    </div>

                    {/* Feature List */}
                    {plan.features && plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start">
                        <svg className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Întrebări frecvente</h2>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Pot să schimb planul oricând?
              </h3>
              <p className="text-gray-600">
                Da, poți actualiza sau retrograda planul oricând. Dacă actualizezi, vei avea acces imediat
                la noile funcționalități. Dacă retrograzi, schimbarea va intra în vigoare la sfârșitul
                perioadei de facturare curente.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ce metode de plată acceptați?
              </h3>
              <p className="text-gray-600">
                Acceptăm toate cardurile majore (Visa, Mastercard, American Express) prin Stripe.
                Pentru planul Enterprise, oferim și opțiunea de plată prin transfer bancar.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Există o perioadă de probă gratuită?
              </h3>
              <p className="text-gray-600">
                Da! Toate planurile plătite includ o perioadă de probă gratuită de 14 zile.
                Nu este necesară introducerea datelor cardului pentru planul Free.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Pot anula oricând?
              </h3>
              <p className="text-gray-600">
                Da, poți anula abonamentul oricând din panoul de administrare. Nu există penalități
                pentru anulare și vei continua să ai acces până la sfârșitul perioadei plătite.
              </p>
            </div>
          </div>
        </div>

        {/* Support CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Nu găsești răspunsul la întrebarea ta?
          </p>
          <button
            onClick={() => navigate('/support')}
            className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-semibold"
          >
            Contactează suportul
          </button>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans;
