'use client';

/** REQ-049 B5 — e-mail verification link target. */
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { API_URL } from '@/lib/api';

function VerifyEmailInner() {
  const sp = useSearchParams();
  const { locale } = useParams<{ locale: string }>();
  const token = sp.get('token') || '';
  const [state, setState] = useState<'working' | 'ok' | 'error'>('working');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setState('error'); setMessage('Linkul de verificare este incomplet.'); return; }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/verify-email`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.messageRo || data.message || 'Linkul este invalid sau a expirat.');
        setState('ok');
      } catch (err: any) {
        setState('error'); setMessage(err.message);
      }
    })();
  }, [token]);

  if (state === 'working') return <p className="text-gray-600 text-center">Se verifică adresa de e-mail…</p>;
  if (state === 'ok') return (
    <div className="text-center space-y-3">
      <h2 className="text-2xl font-bold">E-mail confirmat</h2>
      <p className="text-gray-600">Contul dvs. este activ. Vă mulțumim.</p>
      <Link href={`/${locale || 'ro'}/dashboard`} className="inline-block mt-2 px-4 py-2 rounded-lg bg-registru-cerneala text-white">Către panou</Link>
    </div>
  );
  return (
    <div className="text-center space-y-3">
      <h2 className="text-2xl font-bold">Verificarea nu a reușit</h2>
      <p className="text-gray-600">{message}</p>
      <Link href={`/${locale || 'ro'}/login`} className="underline text-gray-700">Autentificare</Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-yellow-50 py-12 px-4">
      <div className="max-w-md w-full bg-white/80 p-8 rounded-xl shadow-sm border">
        <Suspense fallback={<p className="text-gray-500">Se încarcă…</p>}><VerifyEmailInner /></Suspense>
      </div>
    </div>
  );
}
