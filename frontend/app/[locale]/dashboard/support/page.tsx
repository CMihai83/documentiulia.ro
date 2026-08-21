'use client';

/** REQ-049 A2 — client side: „Ajutor · Cererile mele". Own tickets only (enforced by the API). */
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

type Status = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';
interface Ticket { id: string; reference: string; subject: string; status: Status; category: string; updatedAt: string; assignedTo?: { name?: string | null } | null; _count?: { messages: number }; messages?: { id: string; body: string; isStaff: boolean; createdAt: string; author?: { name?: string | null } | null }[] }
const RO: Record<Status, string> = { OPEN: 'Deschisă', IN_PROGRESS: 'În lucru', WAITING_CLIENT: 'Așteptăm răspunsul dvs.', RESOLVED: 'Rezolvată', CLOSED: 'Închisă' };
const EN: Record<Status, string> = { OPEN: 'Open', IN_PROGRESS: 'In progress', WAITING_CLIENT: 'Waiting for your reply', RESOLVED: 'Resolved', CLOSED: 'Closed' };
const CATS = [['general', 'General'], ['efactura', 'e-Factura / SPV'], ['saft', 'SAF-T D406'], ['billing', 'Abonament & facturare'], ['hr', 'HR & salarizare'], ['technical', 'Problemă tehnică'], ['sales', 'Ofertă / vânzări']];

export default function SupportPage() {
  const { locale } = useParams<{ locale: string }>();
  const ro = locale !== 'en'; const L = ro ? RO : EN;
  const [list, setList] = useState<Ticket[]>([]); const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Ticket | null>(null);
  const [subject, setSubject] = useState(''); const [body, setBody] = useState(''); const [category, setCategory] = useState('general');
  const [reply, setReply] = useState(''); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => { setLoading(true); const r = await api.get<Ticket[]>('/support/tickets'); if (r.status === 200 && r.data) setList(r.data); setLoading(false); }, []);
  useEffect(() => { void load(); }, [load]);
  const show = async (id: string) => { const r = await api.get<Ticket>(`/support/tickets/${id}`); if (r.status === 200 && r.data) setOpen(r.data); };

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setNotice(null);
    const r = await api.post<Ticket>('/support/tickets', { subject, body, category });
    setBusy(false);
    if ((r.status === 201 || r.status === 200) && r.data) { setSubject(''); setBody(''); setNotice(ro ? `Cererea ${r.data.reference} a fost înregistrată. Vă răspundem aici și pe e-mail.` : `Request ${r.data.reference} recorded. We reply here and by e-mail.`); void load(); void show(r.data.id); }
    else setNotice(r.error || (ro ? 'Cererea nu a putut fi trimisă. Încercați din nou.' : 'The request could not be sent. Please try again.'));
  };
  const send = async () => {
    if (!open || !reply.trim()) return; setBusy(true);
    const r = await api.post(`/support/tickets/${open.id}/messages`, { body: reply }); setBusy(false);
    if (r.status === 201 || r.status === 200) { setReply(''); void show(open.id); void load(); } else setNotice(r.error || (ro ? 'Mesajul nu a fost trimis.' : 'Message was not sent.'));
  };
  const d = (s: string) => new Date(s).toLocaleString(ro ? 'ro-RO' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      <h1 className="text-2xl font-serif font-semibold">{ro ? 'Ajutor · Cererile mele' : 'Help · My requests'}</h1>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Card><CardContent className="p-4">
            <h2 className="font-semibold mb-2">{ro ? 'Cerere nouă' : 'New request'}</h2>
            <form className="space-y-2" onSubmit={create}>
              <select className="w-full border rounded-md px-2 py-1.5 text-sm bg-background" value={category} onChange={(e) => setCategory(e.target.value)}>{CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <Input required placeholder={ro ? 'Subiect' : 'Subject'} value={subject} onChange={(e) => setSubject(e.target.value)} />
              <textarea required className="w-full border rounded-md p-2 text-sm bg-background min-h-[110px]" placeholder={ro ? 'Descrieți situația: ce ați încercat, ce mesaj ați primit, numărul facturii dacă e cazul.' : 'Describe the situation: what you tried, what message you got, the invoice number if relevant.'} value={body} onChange={(e) => setBody(e.target.value)} />
              <Button type="submit" disabled={busy}>{busy ? (ro ? 'Se trimite…' : 'Sending…') : (ro ? 'Trimite cererea' : 'Send request')}</Button>
              {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
            </form>
          </CardContent></Card>
          <Card><CardContent className="p-0 divide-y">
            {loading ? <p className="p-4 text-muted-foreground">{ro ? 'Se încarcă…' : 'Loading…'}</p>
            : list.length === 0 ? <p className="p-4 text-muted-foreground">{ro ? 'Nu aveți cereri. Echipa răspunde de regulă în aceeași zi lucrătoare.' : 'You have no requests yet. The team usually replies the same business day.'}</p>
            : list.map((t) => (
              <button key={t.id} onClick={() => void show(t.id)} className={`w-full text-left p-3 hover:bg-muted/40 ${open?.id === t.id ? 'bg-muted/60' : ''}`}>
                <div className="flex justify-between gap-2 text-xs text-muted-foreground"><span className="tabular-nums">{t.reference}</span><span>{L[t.status]}</span></div>
                <div className="font-medium truncate">{t.subject}</div>
                <div className="text-xs text-muted-foreground">{d(t.updatedAt)}{t.assignedTo?.name ? ` · ${ro ? 'se ocupă' : 'handled by'} ${t.assignedTo.name}` : ''}</div>
              </button>
            ))}
          </CardContent></Card>
        </div>
        <Card><CardContent className="p-4 space-y-3 min-h-[300px]">
          {!open ? <p className="text-muted-foreground">{ro ? 'Selectați o cerere pentru a vedea conversația.' : 'Select a request to view the conversation.'}</p> : (<>
            <div><p className="text-xs text-muted-foreground tabular-nums">{open.reference} · {L[open.status]}</p><h2 className="text-lg font-semibold">{open.subject}</h2></div>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {open.messages?.map((m) => (
                <div key={m.id} className={`rounded-md p-3 text-sm ${m.isStaff ? 'bg-primary/10' : 'bg-muted'}`}>
                  <div className="text-xs text-muted-foreground mb-1">{m.isStaff ? `${ro ? 'Echipa DocumentIulia' : 'DocumentIulia team'}${m.author?.name ? ` · ${m.author.name}` : ''}` : (ro ? 'Dvs.' : 'You')} · {d(m.createdAt)}</div>
                  <div className="whitespace-pre-wrap">{m.body}</div>
                </div>
              ))}
            </div>
            {open.status === 'CLOSED' ? <p className="text-sm text-muted-foreground">{ro ? 'Cererea este închisă. Pentru o problemă nouă, deschideți o cerere nouă.' : 'This request is closed. Open a new request for a new issue.'}</p> : (
              <div className="border-t pt-3 space-y-2">
                <textarea className="w-full border rounded-md p-2 text-sm bg-background min-h-[80px]" placeholder={ro ? 'Răspunsul dvs.…' : 'Your reply…'} value={reply} onChange={(e) => setReply(e.target.value)} />
                <Button size="sm" onClick={() => void send()} disabled={busy || !reply.trim()}>{ro ? 'Trimite' : 'Send'}</Button>
              </div>
            )}
          </>)}
        </CardContent></Card>
      </div>
    </div>
  );
}
