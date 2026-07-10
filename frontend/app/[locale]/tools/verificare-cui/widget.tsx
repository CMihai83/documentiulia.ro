'use client';

import { useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export function CuiLookupWidget({ locale }: { locale: string }) {
  const ro = locale !== 'en';
  const [cui, setCui] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const lookup = async () => {
    if (!cui.trim()) return;
    setBusy(true); setErr(null); setRes(null);
    try {
      const r = await fetch(`${API}/tools/cui/${encodeURIComponent(cui.trim())}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d?.message || 'Eroare');
      setRes(d);
    } catch (e: any) {
      setErr(ro ? 'Serviciul este momentan indisponibil. Încearcă din nou.' : 'Service temporarily unavailable. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const Row = ({ label, ok, warn }: { label: string; ok: boolean; warn?: boolean }) => (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
      <span>{label}</span>
      <span className={`font-semibold ${warn ? 'text-red-600' : ok ? 'text-green-600' : 'text-gray-500'}`}>
        {warn ? '⚠' : ok ? '✓' : '—'}
      </span>
    </div>
  );

  return (
    <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 max-w-xl">
      <div className="flex gap-2">
        <input
          value={cui}
          onChange={(e) => setCui(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && lookup()}
          placeholder={ro ? 'CUI, ex: 14399840' : 'CUI, e.g. 14399840'}
          inputMode="numeric"
          className="flex-1 h-11 px-3 rounded-md border bg-transparent"
        />
        <button
          onClick={lookup}
          disabled={busy}
          className="h-11 px-5 rounded-md bg-registru-cerneala text-white font-semibold hover:bg-registru-stampila disabled:opacity-50"
        >
          {busy ? '…' : ro ? 'Verifică' : 'Check'}
        </button>
      </div>

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      {res && !res.formatValid && (
        <p className="mt-3 text-sm text-red-600">{res.errorRo || (ro ? 'Format CUI invalid.' : 'Invalid CUI format.')}</p>
      )}

      {res && res.formatValid && res.anafDown && (
        <p className="mt-3 text-sm text-amber-600">
          {ro ? 'ANAF este momentan indisponibil — încearcă în câteva minute.' : 'ANAF is temporarily unavailable — try again in a few minutes.'}
        </p>
      )}

      {res && res.formatValid && !res.anafDown && !res.found && (
        <p className="mt-3 text-sm text-gray-600">{ro ? 'Nicio firmă găsită pentru acest CUI.' : 'No company found for this CUI.'}</p>
      )}

      {res?.company && (
        <div className="mt-4">
          <div className="font-semibold">{res.company.name}</div>
          {res.company.address && <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">{res.company.address}</div>}
          <Row label={ro ? 'Plătitor de TVA' : 'VAT payer'} ok={res.company.vatPayer} />
          <Row label="Split TVA" ok={res.company.splitVat} />
          <Row label={ro ? 'Înrolat e-Factura' : 'e-Factura enrolled'} ok={res.company.eFacturaEnrolled} />
          <Row label={ro ? 'Inactiv fiscal' : 'Fiscally inactive'} ok={false} warn={res.company.inactive} />
          {res.cached && <p className="mt-2 text-xs text-gray-400">{ro ? 'Rezultat din cache (24h).' : 'Cached result (24h).'}</p>}
          <div className="mt-4 rounded-lg bg-primary-50 dark:bg-teal-950/40 p-3 text-sm">
            {ro ? 'Vrei verificare automată a partenerilor la fiecare factură?' : 'Want automatic partner checks on every invoice?'}{' '}
            <Link href={`/${locale}/register`} className="font-semibold text-primary-700 dark:text-teal-400 underline">
              {ro ? 'Creează-ți cont gratuit →' : 'Create a free account →'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
