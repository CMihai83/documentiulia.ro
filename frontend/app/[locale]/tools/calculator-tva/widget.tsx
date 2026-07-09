'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export function VatCalcWidget({ locale }: { locale: string }) {
  const ro = locale !== 'en';
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [amount, setAmount] = useState(sp.get('amount') || '1000');
  const [direction, setDirection] = useState(sp.get('direction') === 'extract' ? 'extract' : 'add');
  const [date, setDate] = useState(sp.get('date') || new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(sp.get('category') || 'STANDARD');
  const [res, setRes] = useState<any>(null);

  const calc = useCallback(async () => {
    const a = Number(amount);
    if (!Number.isFinite(a) || a < 0) { setRes(null); return; }
    const q = new URLSearchParams({ amount: String(a), direction, date, category });
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    const r = await fetch(`${API}/tools/vat?${q.toString()}`);
    if (r.ok) setRes(await r.json());
  }, [amount, direction, date, category, pathname, router]);

  useEffect(() => { void calc(); /* initial + on change */ }, [calc]);

  const fmt = (n: number) => new Intl.NumberFormat(ro ? 'ro-RO' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 max-w-xl">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          {direction === 'add' ? (ro ? 'Sumă fără TVA (net)' : 'Amount excl. VAT (net)') : (ro ? 'Sumă cu TVA (brut)' : 'Amount incl. VAT (gross)')}
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal"
                 className="mt-1 w-full h-10 px-3 rounded-md border bg-transparent" />
        </label>
        <label className="text-sm">
          {ro ? 'Operație' : 'Operation'}
          <select value={direction} onChange={(e) => setDirection(e.target.value)}
                  className="mt-1 w-full h-10 px-2 rounded-md border bg-transparent">
            <option value="add">{ro ? 'Adaugă TVA' : 'Add VAT'}</option>
            <option value="extract">{ro ? 'Extrage TVA' : 'Extract VAT'}</option>
          </select>
        </label>
        <label className="text-sm">
          {ro ? 'Data tranzacției' : 'Transaction date'}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                 className="mt-1 w-full h-10 px-3 rounded-md border bg-transparent" />
        </label>
        <label className="text-sm">
          {ro ? 'Cota' : 'Rate'}
          <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full h-10 px-2 rounded-md border bg-transparent">
            <option value="STANDARD">{ro ? 'Standard' : 'Standard'}</option>
            <option value="REDUCED">{ro ? 'Redusă' : 'Reduced'}</option>
            <option value="SPECIAL">{ro ? 'Specială' : 'Special'}</option>
          </select>
        </label>
      </div>

      {res && (
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          {[
            [ro ? 'Net' : 'Net', res.net],
            [`TVA ${res.ratePct}%`, res.vat],
            [ro ? 'Total (brut)' : 'Total (gross)', res.gross],
          ].map(([l, v]) => (
            <div key={String(l)} className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
              <div className="text-xs text-gray-500">{l}</div>
              <div className="font-bold tabular-nums">{fmt(Number(v))} RON</div>
            </div>
          ))}
        </div>
      )}
      {res && (
        <p className="mt-3 text-xs text-gray-400">
          {ro ? `Cotă valabilă de la ${res.rateEffectiveDate}.` : `Rate effective from ${res.rateEffectiveDate}.`}
        </p>
      )}
      <div className="mt-4 rounded-lg bg-primary-50 dark:bg-teal-950/40 p-3 text-sm">
        {ro ? 'Facturi cu TVA calculat corect, automat?' : 'Invoices with VAT computed correctly, automatically?'}{' '}
        <Link href={`/${locale}/register`} className="font-semibold text-primary-700 dark:text-teal-400 underline">
          {ro ? 'Cont gratuit →' : 'Free account →'}
        </Link>
      </div>
    </div>
  );
}
