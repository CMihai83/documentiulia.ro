'use client';

import { useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export function XmlValidatorWidget({ locale }: { locale: string }) {
  const ro = locale !== 'en';
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const onFile = async (f: File | null) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setErr(ro ? 'Fișierul depășește 10MB.' : 'File exceeds 10MB.'); return; }
    setBusy(true); setErr(null); setRes(null);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const r = await fetch(`${API}/tools/validate-xml`, { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.message || 'Eroare');
      setRes(d);
    } catch (e: any) {
      setErr(e?.message || (ro ? 'Eroare la validare.' : 'Validation error.'));
    } finally {
      setBusy(false);
    }
  };

  const typeLabel =
    res?.detectedType === 'efactura' ? 'e-Factura (UBL 2.1)' : res?.detectedType === 'saft' ? 'SAF-T (D406)' : ro ? 'necunoscut' : 'unknown';

  return (
    <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 max-w-xl">
      <label className="block rounded-lg border-2 border-dashed p-8 text-center cursor-pointer hover:border-registru-cerneala">
        <input type="file" accept=".xml,text/xml,application/xml" className="hidden"
               onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {busy ? '…' : ro ? 'Alege sau trage aici fișierul XML (max 10MB)' : 'Choose or drop the XML file (max 10MB)'}
        </span>
      </label>

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      {res && (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">{ro ? 'Tip detectat:' : 'Detected type:'}</span>
            <b>{typeLabel}</b>
            <span className={`ml-auto font-semibold ${res.valid ? 'text-green-600' : 'text-red-600'}`}>
              {res.valid ? (ro ? '✓ Fără erori găsite' : '✓ No errors found') : (ro ? `✗ ${res.errors.length} probleme` : `✗ ${res.errors.length} issues`)}
            </span>
          </div>
          {!res.valid && (
            <ul className="mt-3 space-y-2">
              {res.errors.map((e: any, i: number) => (
                <li key={i} className="rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-2.5 text-sm">
                  {e.line ? <span className="font-mono text-xs text-red-500 mr-2">L{e.line}</span> : null}
                  {e.element ? <code className="text-xs mr-2">{e.element}</code> : null}
                  {e.message}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-gray-400">
            {ro
              ? 'Verificare structurală (well-formed + elemente obligatorii). Validarea XSD completă DUKIntegrator rulează în platformă.'
              : 'Structural check (well-formed + mandatory elements). Full DUKIntegrator XSD validation runs inside the platform.'}
          </p>
          <div className="mt-3 rounded-lg bg-primary-50 dark:bg-teal-950/40 p-3 text-sm">
            {ro ? 'Vrei validare completă + depunere direct în SPV?' : 'Want full validation + direct SPV submission?'}{' '}
            <Link href={`/${locale}/register`} className="font-semibold text-primary-700 dark:text-teal-400 underline">
              {ro ? 'Cont gratuit →' : 'Free account →'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
