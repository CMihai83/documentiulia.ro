'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Crown, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type TierKey = 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
const ORDER: TierKey[] = ['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE'];

const PLANS: { key: TierKey; ro: string; en: string; price: string; features: { ro: string; en: string }[] }[] = [
  {
    key: 'FREE', ro: 'Gratuit', en: 'Free', price: '0 RON',
    features: [
      { ro: 'TVA & OCR de bază', en: 'Basic VAT & OCR' },
      { ro: 'Facturi și documente', en: 'Invoices & documents' },
      { ro: 'Catalog de cursuri (vizualizare)', en: 'Course catalog (browse)' },
    ],
  },
  {
    key: 'PRO', ro: 'Pro', en: 'Pro', price: '49 RON/lună',
    features: [
      { ro: 'Tot din Gratuit, nelimitat', en: 'Everything in Free, unlimited' },
      { ro: 'HR & salarizare', en: 'HR & payroll' },
      { ro: 'Simulator de business (v1 + v2)', en: 'Business simulator (v1 + v2)' },
      { ro: 'Cursuri LMS + gamificare', en: 'LMS courses + gamification' },
      { ro: 'Șabloane documente & OCR avansat', en: 'Document templates & advanced OCR' },
      { ro: 'ATS, freelanceri, consultanță', en: 'ATS, freelancers, consulting' },
    ],
  },
  {
    key: 'BUSINESS', ro: 'Business', en: 'Business', price: '149 RON/lună',
    features: [
      { ro: 'Tot din Pro', en: 'Everything in Pro' },
      { ro: 'Controlling (SAP CO): centre de cost, CO-PA', en: 'Controlling (SAP CO): cost centers, CO-PA' },
      { ro: 'Studio migrare date (SAGA import)', en: 'Data-migration studio (SAGA import)' },
      { ro: 'API & integrări custom', en: 'Custom API & integrations' },
    ],
  },
];

export default function SubscriptionPage() {
  const params = useParams();
  const locale = (Array.isArray(params?.locale) ? params.locale[0] : params?.locale) || 'ro';
  const ro = locale !== 'en';
  const { user } = useAuth();
  const [statusTier, setStatusTier] = useState<TierKey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await api.get<any>('/subscription/status');
      const t = (r.data?.tier || r.data?.plan || '').toUpperCase();
      if (ORDER.includes(t as TierKey)) setStatusTier(t as TierKey);
      setLoading(false);
    })();
  }, []);

  const current: TierKey = statusTier || ((user?.tier as TierKey) ?? 'FREE');
  const rank = (t: TierKey) => ORDER.indexOf(t);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold flex items-center gap-2">
          <Crown className="h-6 w-6 text-teal-600" /> {ro ? 'Abonament' : 'Subscription'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {ro ? 'Planul tău curent și opțiunile de upgrade.' : 'Your current plan and upgrade options.'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => {
            const isCurrent = p.key === current;
            const isUpgrade = rank(p.key) > rank(current);
            return (
              <Card key={p.key} className={isCurrent ? 'border-teal-500 ring-1 ring-teal-500' : ''}>
                <CardContent className="p-5 flex flex-col gap-3 h-full">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{ro ? p.ro : p.en}</span>
                    {isCurrent && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                        {ro ? 'Planul tău' : 'Your plan'}
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-serif font-semibold tabular-nums">{p.price}</div>
                  <ul className="space-y-1.5 text-sm text-muted-foreground flex-1">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex gap-2"><Check className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />{ro ? f.ro : f.en}</li>
                    ))}
                  </ul>
                  {isUpgrade && (
                    <a href={`mailto:contact@documentiulia.ro?subject=${encodeURIComponent((ro ? 'Upgrade la ' : 'Upgrade to ') + p.key)}`}>
                      <Button className="w-full" size="sm">{ro ? 'Solicită upgrade' : 'Request upgrade'}</Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {ro
          ? 'Plata online cu cardul va fi disponibilă în curând. Până atunci, solicită upgrade-ul prin e-mail și îl activăm în aceeași zi.'
          : 'Online card payment is coming soon. Until then, request the upgrade by e-mail and we activate it the same day.'}
      </p>
    </div>
  );
}
