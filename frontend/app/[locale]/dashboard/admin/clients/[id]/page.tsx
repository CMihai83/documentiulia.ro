'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface Client360 {
  profile: { id: string; email: string; name?: string | null; company?: string | null; cui?: string | null; address?: string | null; tier: string; role: string; language: string; createdAt: string; emailVerified: boolean; mfaEnabled: boolean };
  organization: { id: string; name: string; cui?: string | null; tier: string; isActive: boolean } | null;
  invoices: { byType: Record<string, { count: number; value: number }>; recent: { id: string; invoiceNumber: string; type: string; invoiceDate: string; partnerName?: string | null; grossAmount: string | number; currency: string; status: string; paymentStatus: string; efacturaStatus?: string | null; spvSubmitted: boolean }[] };
  efactura: Record<string, number>;
  tickets: { id: string; reference: string; subject: string; status: string; priority: string; updatedAt: string }[];
  recentErrors: { id: string; message: string; type: string; url?: string | null; createdAt: string }[];
  lastActivity: { createdAt: string; action: string } | null;
  staffChanges: { id: string; action: string; details: any; createdAt: string; user: { email: string; name?: string | null } }[];
}

const money = (v: string | number, c = 'RON') => new Intl.NumberFormat('ro-RO', { style: 'currency', currency: c }).format(Number(v));

export default function AdminClientDetailPage() {
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const ro = locale !== 'en';
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [data, setData] = useState<Client360 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState(''); const [role, setRole] = useState(''); const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false); const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api.get<Client360>(`/admin/clients/${id}`);
    if (r.status === 200 && r.data) { setData(r.data); setTier(r.data.profile.tier); setRole(r.data.profile.role); }
    else setError(r.status === 404 ? (ro ? 'Clientul nu există.' : 'Client not found.') : (r.error || (ro ? 'Nu am putut încărca clientul.' : 'Could not load client.')));
  }, [id, ro]);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!data) return;
    if (!window.confirm(ro ? `Confirmați modificarea contului ${data.profile.email}?` : `Confirm changing account ${data.profile.email}?`)) return;
    setSaving(true); setNotice(null);
    const r = await api.patch<{ changed: boolean }>(`/admin/clients/${id}`, { tier, role, reason });
    setSaving(false);
    if (r.status === 200) { setNotice(r.data?.changed ? (ro ? 'Modificare salvată și înregistrată în jurnalul de audit.' : 'Change saved and written to the audit log.') : (ro ? 'Nicio modificare.' : 'No change.')); setReason(''); void load(); }
    else setNotice(r.error || (ro ? 'Modificarea nu a fost salvată.' : 'Change was not saved.'));
  };

  if (error) return <p className="text-destructive">{error} <Link className="underline" href={`/${locale}/dashboard/admin/clients`}>{ro ? 'Înapoi la clienți' : 'Back to clients'}</Link></p>;
  if (!data) return <p className="text-muted-foreground">{ro ? 'Se încarcă…' : 'Loading…'}</p>;
  const p = data.profile;
  const d = (s: string) => new Date(s).toLocaleDateString(ro ? 'ro-RO' : 'en-GB');

  return (
    <div className="space-y-4">
      <Link href={`/${locale}/dashboard/admin/clients`} className="text-sm text-muted-foreground hover:underline">← {ro ? 'Toți clienții' : 'All clients'}</Link>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2"><CardContent className="p-4 space-y-2">
          <h2 className="text-xl font-semibold">{p.company || p.name || p.email}</h2>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <dt className="text-muted-foreground">E-mail</dt><dd>{p.email} {p.emailVerified ? '' : <span className="text-amber-600">({ro ? 'neverificat' : 'unverified'})</span>}</dd>
            <dt className="text-muted-foreground">{ro ? 'Nume' : 'Name'}</dt><dd>{p.name || '—'}</dd>
            <dt className="text-muted-foreground">CUI</dt><dd className="tabular-nums">{p.cui || '—'}</dd>
            <dt className="text-muted-foreground">{ro ? 'Adresă' : 'Address'}</dt><dd>{p.address || '—'}</dd>
            <dt className="text-muted-foreground">{ro ? 'Organizație' : 'Organization'}</dt><dd>{data.organization ? `${data.organization.name} (${data.organization.cui || 'fără CUI'}, ${data.organization.tier})` : '—'}</dd>
            <dt className="text-muted-foreground">MFA</dt><dd>{p.mfaEnabled ? (ro ? 'activ' : 'on') : (ro ? 'inactiv' : 'off')}</dd>
            <dt className="text-muted-foreground">{ro ? 'Înregistrat' : 'Joined'}</dt><dd>{d(p.createdAt)}</dd>
            <dt className="text-muted-foreground">{ro ? 'Ultima activitate' : 'Last activity'}</dt><dd>{data.lastActivity ? `${d(data.lastActivity.createdAt)} · ${data.lastActivity.action}` : '—'}</dd>
          </dl>
        </CardContent></Card>
        <Card><CardContent className="p-4 space-y-3">
          <h3 className="font-semibold">{ro ? 'Cont' : 'Account'}</h3>
          <label className="block text-sm">{ro ? 'Plan' : 'Plan'}
            <select className="mt-1 w-full border rounded-md px-2 py-1.5 bg-background" value={tier} onChange={(e) => setTier(e.target.value)} disabled={!isAdmin}>
              {['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE'].map((t) => <option key={t}>{t}</option>)}
            </select></label>
          <label className="block text-sm">{ro ? 'Rol' : 'Role'}
            <select className="mt-1 w-full border rounded-md px-2 py-1.5 bg-background" value={role} onChange={(e) => setRole(e.target.value)} disabled={!isAdmin}>
              {['USER', 'ACCOUNTANT', 'ADMIN'].map((t) => <option key={t}>{t}</option>)}
            </select></label>
          <label className="block text-sm">{ro ? 'Motiv (intră în audit)' : 'Reason (audited)'}
            <input className="mt-1 w-full border rounded-md px-2 py-1.5 bg-background" value={reason} onChange={(e) => setReason(e.target.value)} disabled={!isAdmin} placeholder={ro ? 'ex. upgrade plătit prin transfer' : 'e.g. paid upgrade by transfer'} /></label>
          {isAdmin ? <Button size="sm" onClick={() => void save()} disabled={saving || (tier === p.tier && role === p.role)}>{saving ? (ro ? 'Se salvează…' : 'Saving…') : (ro ? 'Salvează modificarea' : 'Save change')}</Button>
            : <p className="text-xs text-muted-foreground">{ro ? 'Doar administratorii pot modifica planul sau rolul.' : 'Only administrators can change plan or role.'}</p>}
          {notice && <p className="text-sm">{notice}</p>}
        </CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card><CardContent className="p-4">
          <h3 className="font-semibold mb-2">{ro ? 'Facturi' : 'Invoices'}</h3>
          <div className="flex gap-6 text-sm mb-3">
            {Object.entries(data.invoices.byType).map(([t, v]) => <div key={t}><span className="text-muted-foreground">{t === 'ISSUED' ? (ro ? 'Emise' : 'Issued') : (ro ? 'Primite' : 'Received')}</span> <b className="tabular-nums">{v.count}</b> · {money(v.value)}</div>)}
            {Object.keys(data.invoices.byType).length === 0 && <span className="text-muted-foreground">{ro ? 'Nicio factură.' : 'No invoices.'}</span>}
          </div>
          {data.invoices.recent.length > 0 && (
            <table className="w-full text-sm"><tbody>
              {data.invoices.recent.map((i) => (
                <tr key={i.id} className="border-t"><td className="py-1 tabular-nums">{i.invoiceNumber}</td><td>{i.partnerName || '—'}</td><td className="tabular-nums">{d(i.invoiceDate)}</td><td className="text-right tabular-nums">{money(i.grossAmount, i.currency)}</td><td className="text-right text-xs text-muted-foreground">{i.spvSubmitted ? `SPV: ${i.efacturaStatus || 'trimis'}` : i.status}</td></tr>
              ))}
            </tbody></table>
          )}
          {Object.keys(data.efactura).length > 0 && <p className="text-xs text-muted-foreground mt-2">e-Factura: {Object.entries(data.efactura).map(([k, v]) => `${k} ${v}`).join(' · ')}</p>}
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <h3 className="font-semibold mb-2">{ro ? 'Cereri' : 'Requests'}</h3>
          {data.tickets.length === 0 ? <p className="text-sm text-muted-foreground">{ro ? 'Nicio cerere.' : 'No requests.'}</p> : (
            <ul className="text-sm space-y-1">{data.tickets.map((t) => <li key={t.id} className="flex justify-between gap-2"><Link href={`/${locale}/dashboard/admin/requests?open=${t.id}`} className="hover:underline truncate"><span className="tabular-nums text-muted-foreground mr-2">{t.reference}</span>{t.subject}</Link><span className="text-xs text-muted-foreground shrink-0">{t.status}</span></li>)}</ul>
          )}
          <h3 className="font-semibold mt-4 mb-2">{ro ? 'Erori recente' : 'Recent errors'}</h3>
          {data.recentErrors.length === 0 ? <p className="text-sm text-muted-foreground">{ro ? 'Nicio eroare înregistrată.' : 'No errors recorded.'}</p> : (
            <ul className="text-xs space-y-1">{data.recentErrors.map((e) => <li key={e.id}><span className="text-muted-foreground tabular-nums">{d(e.createdAt)}</span> · {e.type} · <span className="break-all">{e.message.slice(0, 120)}</span></li>)}</ul>
          )}
          {data.staffChanges.length > 0 && (<>
            <h3 className="font-semibold mt-4 mb-2">{ro ? 'Modificări făcute de echipă' : 'Staff changes'}</h3>
            <ul className="text-xs space-y-1">{data.staffChanges.map((a) => <li key={a.id}><span className="tabular-nums text-muted-foreground">{d(a.createdAt)}</span> · {a.user.name || a.user.email}: {JSON.stringify(a.details?.before)} → {JSON.stringify(a.details?.after)}{a.details?.reason ? ` (${a.details.reason})` : ''}</li>)}</ul>
          </>)}
        </CardContent></Card>
      </div>
    </div>
  );
}
