'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Check, Zap, Building2, Loader2, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';

interface BillingInfo {
  plan: string;
  status: 'active' | 'canceled' | 'past_due';
  nextBillingDate: string;
  amount: number;
  currency: string;
  paymentMethod?: {
    type: string;
    last4: string;
    expiry: string;
  };
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  downloadUrl: string;
}

const plans = [
  {
    id: 'free',
    name: 'Gratuit',
    price: 0,
    period: 'luna',
    features: [
      '10 facturi/luna',
      'Calcul TVA basic',
      'OCR limitat (5 documente)',
      'Suport email',
    ],
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    period: 'luna',
    features: [
      'Facturi nelimitate',
      'e-Factura SPV complet',
      'SAF-T D406 automat',
      'OCR nelimitat',
      'Rapoarte avansate',
      'Suport prioritar',
    ],
    highlighted: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 149,
    period: 'luna',
    features: [
      'Tot din Pro +',
      'API access complet',
      'SAGA integration',
      'Multi-utilizatori (5)',
      'White-label reports',
      'Account manager dedicat',
    ],
    highlighted: false,
  },
];

export default function BillingSettingsPage() {
  const router = useRouter();
  const t = useTranslations();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const fetchBillingInfo = async () => {
    // Simulate API call
    setTimeout(() => {
      setBilling({
        plan: 'pro',
        status: 'active',
        nextBillingDate: '2025-01-13',
        amount: 49,
        currency: 'RON',
        paymentMethod: {
          type: 'card',
          last4: '4242',
          expiry: '12/26',
        },
      });
      setInvoices([
        { id: 'INV-001', date: '2024-12-13', amount: 49, status: 'paid', downloadUrl: '#' },
        { id: 'INV-002', date: '2024-11-13', amount: 49, status: 'paid', downloadUrl: '#' },
        { id: 'INV-003', date: '2024-10-13', amount: 49, status: 'paid', downloadUrl: '#' },
      ]);
      setLoading(false);
    }, 500);
  };

  const handleChangePlan = async (planId: string) => {
    if (planId === billing?.plan) return;

    setChangingPlan(planId);
    // Simulate plan change
    setTimeout(() => {
      setBilling(prev => prev ? { ...prev, plan: planId } : null);
      setChangingPlan(null);
    }, 1500);
  };

  const handleChangePaymentMethod = () => {
    // Navigate to payment method update page
    router.push('/dashboard/settings/billing/payment-method');
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    if (invoice.downloadUrl && invoice.downloadUrl !== '#') {
      window.open(invoice.downloadUrl, '_blank');
      toast.success('Descărcare inițiată', `Factura ${invoice.id} se descarcă...`);
    } else {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/v1/billing/invoices/${invoice.id}/download`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${invoice.id}.pdf`;
          a.click();
          toast.success('Descărcare completă', `Factura ${invoice.id}`);
        } else {
          toast.success('Descărcare (Demo)', `Factura ${invoice.id} - funcționalitate în dezvoltare`);
        }
      } catch (err) {
        toast.success('Descărcare (Demo)', `Factura ${invoice.id} - funcționalitate în dezvoltare`);
      }
    }
  };

  const handleCancelSubscription = () => {
    // Navigate to subscription cancellation page
    router.push('/dashboard/settings/billing/cancel');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/settings"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Abonament</h1>
          <p className="text-gray-600">Gestioneaza planul si plata</p>
        </div>
      </div>

      {/* Current Plan Summary */}
      {billing && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Planul curent</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-primary-600 capitalize">
                  {billing.plan}
                </span>
                {billing.status === 'active' && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                    Activ
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Urmatoarea facturare: {new Date(billing.nextBillingDate).toLocaleDateString('ro-RO')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{billing.amount} RON</p>
              <p className="text-sm text-gray-500">/luna</p>
            </div>
          </div>

          {billing.paymentMethod && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">
                    •••• •••• •••• {billing.paymentMethod.last4}
                  </p>
                  <p className="text-xs text-gray-500">
                    Expira {billing.paymentMethod.expiry}
                  </p>
                </div>
                <button onClick={handleChangePaymentMethod} className="ml-auto text-sm text-primary-600 hover:text-primary-700">
                  Schimba
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plans */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Planuri disponibile</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-xl p-6 ${
                plan.highlighted
                  ? 'bg-primary-50 border-2 border-primary-500'
                  : 'bg-white border border-gray-200'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-500 text-white text-xs font-medium rounded-full">
                  Popular
                </span>
              )}

              <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
              <div className="mt-2">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-gray-500"> RON/{plan.period}</span>
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleChangePlan(plan.id)}
                disabled={changingPlan !== null || billing?.plan === plan.id}
                className={`mt-6 w-full py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                  billing?.plan === plan.id
                    ? 'bg-gray-100 text-gray-500 cursor-default'
                    : plan.highlighted
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {changingPlan === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : billing?.plan === plan.id ? (
                  'Plan curent'
                ) : plan.price > (billing?.amount || 0) ? (
                  <>
                    <Zap className="w-4 h-4" />
                    Upgrade
                  </>
                ) : (
                  'Selecteaza'
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Enterprise */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <Building2 className="w-12 h-12" />
          <div className="flex-1">
            <h3 className="text-xl font-semibold">Enterprise</h3>
            <p className="text-gray-300 mt-1">
              Solutii personalizate pentru corporatii. SSO, SLA dedicat, implementare on-premise.
            </p>
          </div>
          <a
            href="mailto:enterprise@documentiulia.ro"
            className="px-6 py-2 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition"
          >
            Contacteaza-ne
          </a>
        </div>
      </div>

      {/* Invoice History */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Istoric facturi</h3>

        {invoices.length > 0 ? (
          <div className="divide-y">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{invoice.id}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(invoice.date).toLocaleDateString('ro-RO')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    invoice.status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : invoice.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {invoice.status === 'paid' ? 'Platita' :
                     invoice.status === 'pending' ? 'In asteptare' : 'Esuata'}
                  </span>
                  <span className="font-medium">{invoice.amount} RON</span>
                  <button onClick={() => handleDownloadInvoice(invoice)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                    <Download className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            Nu exista facturi inca
          </p>
        )}
      </div>

      {/* Cancel Subscription */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Anuleaza abonamentul</h3>
        <p className="text-sm text-gray-500 mb-4">
          Poti anula oricand. Vei avea acces pana la sfarsitul perioadei de facturare.
        </p>
        <button onClick={handleCancelSubscription} className="text-red-600 hover:text-red-700 text-sm font-medium">
          Anuleaza abonamentul
        </button>
      </div>
    </div>
  );
}
