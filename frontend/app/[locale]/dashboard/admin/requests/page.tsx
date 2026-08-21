'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

type Status = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';
interface Ticket {
  id: string; reference: string; subject: string; category: string; status: Status; priority: string; source: string;
  createdAt: string; updatedAt: string; guestName?: string | null; guestEmail?: string | null; guestCompany?: string | null;
  user?: { id: string; email: string; name?: string | null; company?: string | null; tier: string } | null;
  assignedTo?: { id: string; name?: string | null; email: string } | null;
  _count: { messages: number };
  messages?: { id: string; body: string; isStaff: boolean; isInternal: boolean; createdAt: string; author?: { name?: string | null; email?: string } | null }[];
}
interface Staff { id: string; name?: string | null; email: string; role: string }

const STATUS_RO: Record<Status, string> = { OPEN: 'Deschisă', IN_PROGRESS: 'În lucru', WAITING_CLIENT: 'Așteaptă clientul', RESOLVED: 'Rezolvată', CLOSED: 'Închisă' };
const STATUS_EN: Record<Status, string> = { OPEN: 'Open', IN_PROGRESS: 'In progress', WAITING_CLIENT: 'Waiting on client', RESOLVED: 'Resolved', CLOSED: 'Closed' };
const tone: Record<Status, string> = { OPEN: 'bg-blue-100 text-blue-900', IN_PROGRESS: 'bg-violet-100 text-violet-900', WAITING_CLIENT: 'bg-amber-100 text-amber-900', RESOLVED: 'bg-emerald-100 text-emerald-900', CLOSED: 'bg-gray-100 text-gray-700' };

export default function AdminRequestsPage() {
  const { locale } = useParams<{ locale: string }>();
  const sp = useSearchParams();
  const ro = locale !== 'en';
  const L = ro ? STATUS_RO : STATUS_EN;
  const [status, setStatus] = useState<Status | 'ALL'>('ALL');
  const [assigned, setAssigned] = useState('');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Ticket[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [staff, setStaff] = useState<Staff[]>([]);
  const [openId, setOpenId] = useState<string | null>(sp.get('open'));
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState(''); const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const r = await api.get<{ items: Ticket[]; byStatus: Record<string, number> }>('/admin/tickets', { params: { status, ...(assigned ? { assignedTo: assigned } : {}), ...(q ? { search: q } : {}), limit: 50 } });
    if (r.status === 200 && r.data) { setItems(r.data.items); setByStatus(r.data.byStatus); }
    else setError(r.error || (ro ? 'Nu am putut încărca cererile.' : 'Could not load requests.'));
    setLoading(false);
  }, [status, assigned, q, ro]);
  useEffect(() => { void load(); void api.get<Staff[]>('/admin/tickets/staff').then((r) => r.data && setStaff(r.data)); }, [load]);

  const openTicket = useCallback(async (id: string) => {
    setOpenId(id); setNotice(null);
    const r = await api.get<Ticket>(`/admin/tickets/${id}`);
    if (r.status === 200 && r.data) setTicket(r.data);
  }, []);
  useEffect(() => { if (openId) void openTicket(openId); }, [openId, openTicket]);

  const send = async (nextStatus?: Status) => {
    if (!ticket || !reply.trim()) return;
    setBusy(true); setNotice(null);
    const r = await api.post(`/admin/tickets/${ticket.id}/messages`, { body: reply, internal, status: nextStatus });
    setBusy(false);
    if (r.status === 201 || r.status === 200) { setReply(''); setNotice(internal ? (ro ? 'Notă internă adăugată.' : 'Internal note added.') : (ro ? 'Răspuns trimis clientului.' : 'Reply sent to the client.')); await openTicket(ticket.id); void load(); }
    else setNotice(r.error || (ro ? 'Mesajul nu a fost trimis.' : 'Message was not sent.'));
  };
  const patch = async (body: Record<string, unknown>) => {
    if (!ticket) return;
    setBusy(true);
    const r = await api.patch(`/admin/tickets/${ticket.id}`, body);
    setBusy(false);
    if (r.status === 200) { await openTicket(ticket.id); void load(); } else setNotice(r.error || (ro ? 'Modificarea nu a fost salvată.' : 'Change was not saved.'));
  };

  const who = (t: Ticket) => t.user ? (t.user.company || t.user.name || t.user.email) : (t.guestCompany || t.guestName || t.guestEmail || '—');
  const d = (s: string) => new Date(s).toLocaleString(ro ? 'ro-RO' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {(['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED'] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1 text-xs border ${status === s ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}>
              {s === 'ALL' ? (ro ? 'Toate' : 'All') : L[s]} {s !== 'ALL' && byStatus[s] ? <span className="tabular-nums opacity-80">· {byStatus[s]}</span> : null}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder={ro ? 'Caută referință, subiect, e-mail, firmă' : 'Search reference, subject, e-mail, company'} value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="border rounded-md px-2 text-sm bg-background" value={assigned} onChange={(e) => setAssigned(e.target.value)} aria-label={ro ? 'Alocare' : 'Assignee'}>
            <option value="">{ro ? 'Oricine' : 'Anyone'}</option><option value="me">{ro ? 'Alocate mie' : 'Assigned to me'}</option><option value="unassigned">{ro ? 'Nealocate' : 'Unassigned'}</option>
          </select>
        </div>
        <Card><CardContent className="p-0 divide-y">
          {loading ? <p className="p-4 text-muted-foreground">{ro ? 'Se încarcă…' : 'Loading…'}</p>
          : error ? <p className="p-4 text-destructive">{error}</p>
          : items.length === 0 ? <p className="p-4 text-muted-foreground">{ro ? 'Nicio cerere în această vedere. Formularul de contact și cererile din panoul clienților ajung aici.' : 'No requests in this view. Contact-form submissions and dashboard requests land here.'}</p>
          : items.map((t) => (
            <button key={t.id} onClick={() => void openTicket(t.id)} className={`w-full text-left p-3 hover:bg-muted/40 ${openId === t.id ? 'bg-muted/60' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs tabular-nums text-muted-foreground">{t.reference}</span>
                <span className={`text-[11px] rounded-full px-2 py-0.5 ${tone[t.status]}`}>{L[t.status]}</span>
              </div>
              <div className="font-medium truncate">{t.subject}</div>
              <div className="text-xs text-muted-foreground flex justify-between gap-2"><span className="truncate">{who(t)}{t.source === 'contact_form' ? ` · ${ro ? 'formular public' : 'public form'}` : ''}</span><span className="shrink-0 tabular-nums">{d(t.updatedAt)}</span></div>
            </button>
          ))}
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-4 space-y-3 min-h-[400px]">
        {!ticket ? <p className="text-muted-foreground">{ro ? 'Selectați o cerere din listă.' : 'Select a request from the list.'}</p> : (<>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs tabular-nums text-muted-foreground">{ticket.reference} · {ticket.category} · {ticket.priority}</p>
              <h2 className="text-lg font-semibold">{ticket.subject}</h2>
              <p className="text-sm text-muted-foreground">{who(ticket)}{ticket.user ? <> · <Link className="underline" href={`/${locale}/dashboard/admin/clients/${ticket.user.id}`}>{ro ? 'fișa clientului' : 'client record'}</Link></> : ticket.guestEmail ? ` · ${ticket.guestEmail}` : ''}</p>
            </div>
            <div className="flex flex-wrap gap-1 text-xs">
              <select className="border rounded-md px-2 py-1 bg-background" value={ticket.status} onChange={(e) => void patch({ status: e.target.value })} disabled={busy} aria-label="Status">
                {(Object.keys(L) as Status[]).map((s) => <option key={s} value={s}>{L[s]}</option>)}
              </select>
              <select className="border rounded-md px-2 py-1 bg-background" value={ticket.priority} onChange={(e) => void patch({ priority: e.target.value })} disabled={busy} aria-label={ro ? 'Prioritate' : 'Priority'}>
                {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((p) => <option key={p}>{p}</option>)}
              </select>
              <select className="border rounded-md px-2 py-1 bg-background" value={ticket.assignedTo?.id || ''} onChange={(e) => void patch({ assignedToId: e.target.value || null })} disabled={busy} aria-label={ro ? 'Alocat' : 'Assignee'}>
                <option value="">{ro ? '— nealocat —' : '— unassigned —'}</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {ticket.messages?.map((m) => (
              <div key={m.id} className={`rounded-md p-3 text-sm ${m.isInternal ? 'bg-amber-50 border border-amber-200' : m.isStaff ? 'bg-primary/10' : 'bg-muted'}`}>
                <div className="text-xs text-muted-foreground mb-1">{m.isInternal ? (ro ? 'Notă internă' : 'Internal note') : m.isStaff ? (ro ? 'Echipa' : 'Staff') : (ro ? 'Client' : 'Client')} · {m.author?.name || m.author?.email || ticket.guestName || (ro ? 'vizitator' : 'guest')} · {d(m.createdAt)}</div>
                <div className="whitespace-pre-wrap">{m.body}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t pt-3">
            <textarea className="w-full border rounded-md p-2 text-sm bg-background min-h-[90px]" placeholder={internal ? (ro ? 'Notă vizibilă doar echipei…' : 'Note visible to staff only…') : (ro ? 'Răspuns către client…' : 'Reply to the client…')} value={reply} onChange={(e) => setReply(e.target.value)} />
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> {ro ? 'notă internă' : 'internal note'}</label>
              <Button size="sm" onClick={() => void send()} disabled={busy || !reply.trim()}>{internal ? (ro ? 'Adaugă nota' : 'Add note') : (ro ? 'Trimite răspunsul' : 'Send reply')}</Button>
              {!internal && <Button size="sm" variant="outline" onClick={() => void send('RESOLVED')} disabled={busy || !reply.trim()}>{ro ? 'Trimite și marchează rezolvată' : 'Send and resolve'}</Button>}
              {notice && <span className="text-xs text-muted-foreground">{notice}</span>}
            </div>
          </div>
        </>)}
      </CardContent></Card>
    </div>
  );
}
