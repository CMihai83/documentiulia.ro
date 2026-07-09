'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export function SalaryCalcWidget({ locale }: { locale: string }) {
  const ro = locale !== 'en';
  const [mode, setMode] = useState<'gross' | 'net'>('gross');
  const [amount, setAmount] = useState('5000');
  const [dependents, setDependents] = useState('0');
  const [res, setRes] = useState<any>(null);

  useEffect(() => {
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) { setRes(null); return; }
    const q = new URLSearchParams({ [mode]: String(a), dependents });
    const t = setTimeout(async () => {
      const r = await fetch(`${API}/tools/salary?${q.toString()}`);
      if (r.ok) setRes(await r.json());
    }, 250);
    return () => clearTimeout(t);
  }, [mode, amount, dependents]);

  const fmt = (n: number) => new Intl.NumberFormat(ro ? 'ro-RO' : 'en-GB').format(n);

  return (
    <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 max-w-xl">
      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm col-span-1">
          {ro ? 'Pornesc de la' : 'Starting from'}
          <select value={mode} onChange={(e) => setMode(e.target.value as any)}
                  className="mt-1 w-full h-10 px-2 rounded-md border bg-transparent">
            <option value="gross">{ro ? 'Brut' : 'Gross'}</option>
            <option value="net">{ro ? 'Net dorit' : 'Target net'}</option>
          </select>
        </label>
        <label className="text-sm">
          {mode === 'gross' ? (ro ? 'Salariu brut (lei)' : 'Gross salary (lei)') : (ro ? 'Salariu net (lei)' : 'Net salary (lei)')}
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric"
                 className="mt-1 w-full h-10 px-3 rounded-md border bg-transparent" />
        </label>
        <label className="text-sm">
          {ro ? 'Persoane în întreținere' : 'Dependents'}
          <select value={dependents} onChange={(e) => setDependents(e.target.value)}
                  className="mt-1 w-full h-10 px-2 rounded-md border bg-transparent">
            {['0', '1', '2', '3', '4'].map((d) => <option key={d} value={d}>{d}{d === '4' ? '+' : ''}</option>)}
          </select>
        </label>
      </div>

      {res && (
        <div className="mt-5">
          <div className="grid grid-cols-2 gap-3 text-center mb-4">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
              <div className="text-xs text-gray-500">{ro ? 'Brut' : 'Gross'}</div>
              <div className="text-xl font-bold tabular-nums">{fmt(res.gross)} lei</div>
            </div>
            <div className="rounded-lg bg-primary-50 dark:bg-teal-950/40 p-3">
              <div className="text-xs text-gray-500">{ro ? 'Net în mână' : 'Net take-home'}</div>
              <div className="text-xl font-bold tabular-nums text-primary-700 dark:text-teal-400">{fmt(res.net)} lei</div>
            </div>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {[
                ['CAS (25%)', res.cas],
                ['CASS (10%)', res.cass],
                [ro ? 'Deducere personală' : 'Personal deduction', res.personalDeduction],
                [ro ? 'Impozit (10%)' : 'Income tax (10%)', res.incomeTax],
              ].map(([l, v]) => (
                <tr key={String(l)} className="border-b last:border-0">
                  <td className="py-1.5 text-gray-600 dark:text-gray-400">{l}</td>
                  <td className="py-1.5 text-right tabular-nums">{fmt(Number(v))} lei</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gray-400">{res.employerCostNote}</p>
        </div>
      )}

      <div className="mt-4 rounded-lg bg-primary-50 dark:bg-teal-950/40 p-3 text-sm">
        {ro ? 'State de plată și contracte generate automat?' : 'Payroll and contracts generated automatically?'}{' '}
        <Link href={`/${locale}/register`} className="font-semibold text-primary-700 dark:text-teal-400 underline">
          {ro ? 'Cont gratuit →' : 'Free account →'}
        </Link>
      </div>
    </div>
  );
}
