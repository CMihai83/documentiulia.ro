'use client';

/**
 * REQ-049 B3 — tells a user what still blocks e-Factura, instead of letting the
 * first submission fail with "No CUI configured". Shown only while something is
 * missing; dismissible for the session.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

interface Profile { cui?: string | null; company?: string | null; organization?: { cui?: string | null; name?: string | null } | null }
interface SpvStatus { connected: boolean; status?: string }

export function SetupBanner() {
  const { locale } = useParams<{ locale: string }>() ?? { locale: 'ro' };
  const [missing, setMissing] = useState<{ company: boolean; spv: boolean } | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try { if (sessionStorage.getItem('setup-banner-dismissed') === '1') { setHidden(true); return; } } catch { /* ignore */ }
    (async () => {
      const [p, s] = await Promise.all([api.get<Profile>('/auth/profile'), api.get<SpvStatus>('/spv/status')]);
      if (p.status !== 200) return; // not logged in / transient — say nothing
      const prof = p.data || {};
      const hasCompany = Boolean((prof.organization?.cui || prof.cui) && (prof.organization?.name || prof.company));
      const spvConnected = s.status === 200 ? Boolean(s.data?.connected) : true; // unknown → don't nag
      setMissing({ company: !hasCompany, spv: !spvConnected });
    })();
  }, []);

  if (hidden || !missing || (!missing.company && !missing.spv)) return null;
  const prefix = locale && locale !== 'ro' ? `/${locale}` : '';

  return (
    <div role="status" className="mx-4 mt-3 mb-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3 text-sm flex flex-wrap items-center gap-x-4 gap-y-2">
      <strong className="font-semibold">Pentru a transmite facturi la ANAF mai lipsesc:</strong>
      {missing.company && <Link href={`${prefix}/dashboard/settings/organization`} className="underline">datele firmei (CUI, denumire, adresă)</Link>}
      {missing.spv && <Link href={`${prefix}/dashboard/settings/integrations`} className="underline">conectarea contului SPV (ANAF)</Link>}
      <button type="button" onClick={() => { setHidden(true); try { sessionStorage.setItem('setup-banner-dismissed', '1'); } catch { /* ignore */ } }} className="ml-auto text-amber-700 hover:text-amber-900" aria-label="Ascunde">✕</button>
    </div>
  );
}
