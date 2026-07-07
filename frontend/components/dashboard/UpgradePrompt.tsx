'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * App-wide upgrade banner. lib/api.ts dispatches `tier:upgrade-required`
 * whenever the backend TierGuard rejects a call (403 "requires the X plan").
 */
export function UpgradePrompt() {
  const [info, setInfo] = useState<{ requiredTier: string; message: string } | null>(null);
  const router = useRouter();
  const params = useParams();
  const locale = (Array.isArray(params?.locale) ? params.locale[0] : params?.locale) || 'ro';
  const ro = locale !== 'en';

  useEffect(() => {
    const onNeed = (e: Event) => setInfo((e as CustomEvent).detail);
    window.addEventListener('tier:upgrade-required', onNeed);
    return () => window.removeEventListener('tier:upgrade-required', onNeed);
  }, []);

  if (!info) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(560px,92vw)]" role="alert">
      <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/90 shadow-lg p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">
            {ro ? `Funcție disponibilă în planul ${info.requiredTier}` : `This feature requires the ${info.requiredTier} plan`}
          </p>
          <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
            {ro
              ? 'Planul tău actual nu include această funcționalitate. Vezi opțiunile de abonament.'
              : 'Your current plan does not include this feature. See subscription options.'}
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={() => { setInfo(null); router.push(`/${locale}/dashboard/settings/subscription`); }}
            >
              {ro ? 'Vezi planurile' : 'View plans'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setInfo(null)}>
              {ro ? 'Mai târziu' : 'Later'}
            </Button>
          </div>
        </div>
        <button aria-label={ro ? 'Închide' : 'Dismiss'} onClick={() => setInfo(null)} className="text-amber-700 hover:text-amber-900 dark:text-amber-300">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
