'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

type Line = { description: string; quantity: string; unitPrice: string };

export function FreeInvoiceWidget({ locale }: { locale: string }) {
  const ro = locale !== 'en';
  const [remaining, setRemaining] = useState<number | null>(null);
  const [seller, setSeller] = useState({ name: '', cui: '', address: '', iban: '' });
  const [buyer, setBuyer] = useState({ name: '', cui: '', address: '' });
  const [invoiceNumber, setInvoiceNumber] = useState('FCT-001');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([{ description: '', quantity: '1', unitPrice: '' }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [capMsg, setCapMsg] = useState<string | null>(null);
  const [done, setDone] = useState<{ totals: any } | null>(null);

  useEffect(() => {
    fetch(`${API}/tools/invoice/remaining`).then(async (r) => {
      if (r.ok) setRemaining((await r.json()).remaining);
    }).catch(() => {});
  }, []);

  const autofillBuyer = async () => {
    if (!buyer.cui.trim()) return;
    const r = await fetch(`${API}/tools/cui/${encodeURIComponent(buyer.cui.trim())}`);
    if (r.ok) {
      const d = await r.json();
      if (d?.company) setBuyer((b) => ({ ...b, name: d.company.name || b.name, address: d.company.address || b.address }));
    }
  };

  const download = (name: string, data: string, mime: string, base64 = false) => {
    const blob = base64
      ? new Blob([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], { type: mime })
      : new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const generate = async () => {
    setBusy(true); setErr(null); setCapMsg(null); setDone(null);
    try {
      const body = {
        invoiceNumber,
        invoiceDate,
        seller: { ...seller, city: '' },
        buyer: { ...buyer, city: '' },
        lines: lines
          .filter((l) => l.description.trim())
          .map((l) => ({ description: l.description, quantity: Number(l.quantity) || 1, unitPrice: Number(l.unitPrice) || 0 })),
      };
      const r = await fetch(`${API}/tools/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (r.status === 429) { setCapMsg(d?.message); setRemaining(0); return; }
      if (!r.ok) throw new Error(d?.message || 'Eroare');
      download(`${invoiceNumber}-efactura.xml`, d.xml, 'application/xml');
      if (d.pdfBase64) download(`${invoiceNumber}.pdf`, d.pdfBase64, 'application/pdf', true);
      setRemaining(d.remaining);
      setDone({ totals: d.totals });
    } catch (e: any) {
      setErr(e?.message || 'Eroare la generare.');
    } finally {
      setBusy(false);
    }
  };

  const inputCls = 'mt-1 w-full h-10 px-3 rounded-md border bg-transparent text-sm';

  return (
    <div className="rounded-xl border bg-white dark:bg-gray-900 p-5">
      {remaining !== null && (
        <p className="text-xs text-gray-500 mb-4">
          {ro ? `Facturi gratuite rămase luna aceasta: ${remaining}/3` : `Free invoices left this month: ${remaining}/3`}
        </p>
      )}
      <div className="grid sm:grid-cols-2 gap-6">
        <fieldset>
          <legend className="font-semibold text-sm mb-2">{ro ? 'Furnizor (tu)' : 'Supplier (you)'}</legend>
          <label className="text-xs">{ro ? 'Nume / firmă*' : 'Name / company*'}<input className={inputCls} value={seller.name} onChange={(e) => setSeller({ ...seller, name: e.target.value })} /></label>
          <label className="text-xs">CUI<input className={inputCls} value={seller.cui} onChange={(e) => setSeller({ ...seller, cui: e.target.value })} /></label>
          <label className="text-xs">{ro ? 'Adresă*' : 'Address*'}<input className={inputCls} value={seller.address} onChange={(e) => setSeller({ ...seller, address: e.target.value })} /></label>
          <label className="text-xs">IBAN<input className={inputCls} value={seller.iban} onChange={(e) => setSeller({ ...seller, iban: e.target.value })} /></label>
        </fieldset>
        <fieldset>
          <legend className="font-semibold text-sm mb-2">{ro ? 'Cumpărător' : 'Buyer'}</legend>
          <label className="text-xs">CUI
            <div className="flex gap-2">
              <input className={inputCls} value={buyer.cui} onChange={(e) => setBuyer({ ...buyer, cui: e.target.value })} />
              <button onClick={autofillBuyer} className="mt-1 px-3 rounded-md border text-xs whitespace-nowrap">{ro ? 'Auto-completează' : 'Auto-fill'}</button>
            </div>
          </label>
          <label className="text-xs">{ro ? 'Nume / firmă*' : 'Name / company*'}<input className={inputCls} value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} /></label>
          <label className="text-xs">{ro ? 'Adresă*' : 'Address*'}<input className={inputCls} value={buyer.address} onChange={(e) => setBuyer({ ...buyer, address: e.target.value })} /></label>
        </fieldset>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 max-w-sm">
        <label className="text-xs">{ro ? 'Număr factură*' : 'Invoice number*'}<input className={inputCls} value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} /></label>
        <label className="text-xs">{ro ? 'Data*' : 'Date*'}<input type="date" className={inputCls} value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></label>
      </div>

      <div className="mt-4">
        <div className="font-semibold text-sm mb-2">{ro ? 'Linii factură' : 'Invoice lines'}</div>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_80px_110px_36px] gap-2 mb-2">
            <input placeholder={ro ? 'Descriere' : 'Description'} className={inputCls} value={l.description}
                   onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
            <input placeholder={ro ? 'Cant.' : 'Qty'} inputMode="decimal" className={inputCls} value={l.quantity}
                   onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} />
            <input placeholder={ro ? 'Preț unitar' : 'Unit price'} inputMode="decimal" className={inputCls} value={l.unitPrice}
                   onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x)))} />
            <button onClick={() => setLines(lines.filter((_, j) => j !== i))} disabled={lines.length === 1}
                    className="mt-1 rounded-md border text-gray-400 disabled:opacity-30">×</button>
          </div>
        ))}
        <button onClick={() => setLines([...lines, { description: '', quantity: '1', unitPrice: '' }])}
                className="text-sm text-primary-700 dark:text-teal-400">+ {ro ? 'adaugă linie' : 'add line'}</button>
      </div>

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      {capMsg && (
        <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 p-3 text-sm">
          {capMsg}{' '}
          <Link href={`/${locale}/register`} className="font-semibold underline">{ro ? 'Cont gratuit →' : 'Free account →'}</Link>
        </div>
      )}
      {done && (
        <p className="mt-3 text-sm text-green-700">
          {ro
            ? `Generat: total ${done.totals.gross} RON (TVA ${done.totals.vatRate}%). XML descărcat${'' /* pdf note */}.`
            : `Generated: total ${done.totals.gross} RON (VAT ${done.totals.vatRate}%). XML downloaded.`}
        </p>
      )}

      <button onClick={generate} disabled={busy || remaining === 0}
              className="mt-5 h-11 px-6 rounded-md bg-registru-cerneala text-white font-semibold hover:bg-registru-stampila disabled:opacity-50">
        {busy ? '…' : ro ? 'Generează factura (PDF + XML)' : 'Generate invoice (PDF + XML)'}
      </button>
    </div>
  );
}
