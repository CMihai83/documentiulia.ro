'use client';

import { useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

/**
 * The homepage hero IS the product: a real, live CUI check against the public
 * ANAF-backed endpoint. No fabricated result ever — success stamps a real card,
 * failure says so plainly.
 */
export function HeroVerifier({ locale }: { locale: string }) {
  const ro = locale !== 'en';
  const [cui, setCui] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const lookup = async () => {
    const q = cui.trim();
    if (!q) return;
    setBusy(true); setErr(null); setRes(null);
    try {
      const r = await fetch(`${API}/tools/cui/${encodeURIComponent(q)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d?.message || 'error');
      setRes(d);
    } catch {
      setErr(ro ? 'Serviciul este momentan indisponibil. Încearcă din nou.' : 'Service temporarily unavailable. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const verified = res?.company && res.formatValid && !res.anafDown && res.found;

  return (
    <div className="w-full max-w-lg">
      <label htmlFor="hero-cui" className="registru-eyebrow block mb-2">
        {ro ? 'Verificare CUI — direct de la ANAF' : 'CUI check — straight from ANAF'}
      </label>
      <div className="flex gap-0 border border-registru-cerneala rounded-none bg-white">
        <input
          id="hero-cui"
          value={cui}
          onChange={(e) => setCui(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && lookup()}
          placeholder={ro ? 'ex. 14399840' : 'e.g. 14399840'}
          inputMode="numeric"
          aria-label={ro ? 'Cod unic de înregistrare' : 'Company registration code'}
          className="registru-focus registru-tabular flex-1 h-12 px-4 bg-transparent text-registru-cerneala placeholder:text-registru-cerneala-soft/60 outline-none"
        />
        <button
          onClick={lookup}
          disabled={busy}
          className="registru-focus h-12 px-6 bg-registru-cerneala text-white font-display font-bold text-sm tracking-wide hover:bg-registru-stampila transition-colors disabled:opacity-50"
        >
          {busy ? '…' : ro ? 'Verifică' : 'Verify'}
        </button>
      </div>

      <div role="status" aria-live="polite" className="mt-4 min-h-[1.5rem]">
        {err && <p className="text-sm text-registru-stampila">{err}</p>}
        {res && !res.formatValid && (
          <p className="text-sm text-registru-stampila">{res.errorRo || (ro ? 'Format CUI invalid.' : 'Invalid CUI format.')}</p>
        )}
        {res && res.formatValid && res.anafDown && (
          <p className="text-sm text-registru-stampila">{ro ? 'ANAF este momentan indisponibil — încearcă în câteva minute.' : 'ANAF is temporarily unavailable — try again shortly.'}</p>
        )}
        {res && res.formatValid && !res.anafDown && !res.found && (
          <p className="text-sm text-registru-cerneala-soft">{ro ? 'Nicio firmă găsită pentru acest CUI.' : 'No company found for this CUI.'}</p>
        )}

        {verified && (
          <div className="relative border border-registru-linie bg-white p-4 pr-28">
            <div className="font-display font-bold text-registru-cerneala leading-tight">{res.company.name}</div>
            {res.company.address && (
              <div className="text-sm text-registru-cerneala-soft mt-0.5">{res.company.address}</div>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div className="flex justify-between border-b border-registru-linie py-1">
                <dt className="text-registru-cerneala-soft">{ro ? 'Plătitor TVA' : 'VAT payer'}</dt>
                <dd className="font-semibold">{res.company.vatPayer ? '✓' : '—'}</dd>
              </div>
              <div className="flex justify-between border-b border-registru-linie py-1">
                <dt className="text-registru-cerneala-soft">e-Factura</dt>
                <dd className="font-semibold">{res.company.eFacturaEnrolled ? '✓' : '—'}</dd>
              </div>
            </dl>
            <span
              key={res.company.name}
              className="registru-stamp absolute top-3 right-3 select-none border-2 border-registru-stampila text-registru-stampila font-display font-extrabold text-xs px-2 py-1 leading-none"
              style={{ transform: 'rotate(-6deg)' }}
            >
              ✓ {ro ? 'VERIFICAT ANAF' : 'ANAF-VERIFIED'}
            </span>
          </div>
        )}
      </div>

      <Link
        href="/tools"
        className="registru-focus inline-flex items-center gap-1 mt-4 text-sm font-semibold text-registru-cerneala hover:text-registru-stampila transition-colors"
      >
        {ro ? 'Toate instrumentele gratuite' : 'All free tools'} →
      </Link>
    </div>
  );
}
