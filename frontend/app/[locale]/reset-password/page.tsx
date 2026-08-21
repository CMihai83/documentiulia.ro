'use client';

/** REQ-049 B5 — the link e-mailed by /auth/forgot-password lands here. */
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { API_URL } from '@/lib/api';

function ResetPasswordForm() {
  const sp = useSearchParams();
  const { locale } = useParams<{ locale: string }>();
  const token = sp.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 12) return setError('Parola trebuie să aibă cel puțin 12 caractere.');
    if (password !== confirm) return setError('Parolele nu coincid.');
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.messageRo || data.message || 'Linkul este invalid sau a expirat.');
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return <p className="text-center text-gray-700">Linkul de resetare este incomplet. <Link className="underline" href={`/${locale || 'ro'}/forgot-password`}>Solicitați unul nou</Link>.</p>;
  }
  if (done) {
    return (
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold">Parola a fost schimbată</h2>
        <p className="text-gray-600">Vă puteți autentifica cu noua parolă.</p>
        <Link href={`/${locale || 'ro'}/login`} className="inline-block mt-2 px-4 py-2 rounded-lg bg-registru-cerneala text-white">Autentificare</Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Setează o parolă nouă</h2>
      {error && <div className="rounded-md bg-red-50 p-3 border border-red-200 text-sm text-red-700">{error}</div>}
      <input type="password" required minLength={12} autoComplete="new-password" placeholder="Parolă nouă (min. 12 caractere)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border px-4 py-3" />
      <input type="password" required autoComplete="new-password" placeholder="Confirmă parola" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-lg border px-4 py-3" />
      <button type="submit" disabled={busy} className="w-full py-3 rounded-lg text-white bg-registru-cerneala hover:bg-registru-stampila disabled:opacity-50">{busy ? 'Se salvează…' : 'Schimbă parola'}</button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-yellow-50 py-12 px-4">
      <div className="max-w-md w-full bg-white/80 p-8 rounded-xl shadow-sm border">
        <Suspense fallback={<p className="text-gray-500">Se încarcă…</p>}><ResetPasswordForm /></Suspense>
      </div>
    </div>
  );
}
