'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

interface Overview {
  users: { total: number; new30d: number; active7d: number };
  organizations: number;
  invoices30d: { count: number; value: number };
  efacturaSubmissions30d: number;
  tickets: { open: number; unassigned: number; waitingClient: number };
  byTier: Record<string, number>;
  newestClients: { id: string; email: string; name?: string | null; company?: string | null; cui?: string | null; tier: string; createdAt: string }[];
  generatedAt: string;
}

const ron = (v: number) => new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 }).format(v);

export default function AdminOverviewPage() {
  const { locale } = useParams<{ locale: string }>();
  const ro = locale !== 'en';
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const r = await api.get<Overview>('/admin/overview');
    if (r.status === 200 && r.data) setData(r.data);
    else setError(r.status === 403 ? (ro ? 'Nu aveți drepturi pentru această zonă.' : 'You do not have access to this area.') : (r.error || (ro ? 'Nu am putut încărca indicatorii.' : 'Could not load metrics.')));
    setLoading(false);
  }, [ro]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <p className="text-muted-foreground">{ro ? 'Se încarcă indicatorii…' : 'Loading metrics…'}</p>;
  if (error || !data) return <p className="text-destructive">{error}</p>;

  const kpis = [
    { l: ro ? 'Clienți' : 'Clients', v: data.users.total, s: ro ? `+${data.users.new30d} în 30 zile · ${data.users.active7d} activi 7 zile` : `+${data.users.new30d} in 30d · ${data.users.active7d} active 7d` },
    { l: ro ? 'Organizații' : 'Organizations', v: data.organizations },
    { l: ro ? 'Facturi 30 zile' : 'Invoices 30d', v: data.invoices30d.count, s: ron(data.invoices30d.value) },
    { l: ro ? 'Transmise e-Factura 30 zile' : 'e-Factura submitted 30d', v: data.efacturaSubmissions30d },
    { l: ro ? 'Cereri deschise' : 'Open requests', v: data.tickets.open, s: ro ? `${data.tickets.unassigned} nealocate · ${data.tickets.waitingClient} așteaptă clientul` : `${data.tickets.unassigned} unassigned · ${data.tickets.waitingClient} waiting on client`, href: `/${locale}/dashboard/admin/requests` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{ro ? 'Actualizat' : 'Updated'} {new Date(data.generatedAt).toLocaleString(ro ? 'ro-RO' : 'en-GB')}</p>
        <Button size="sm" variant="outline" onClick={() => void load()}><RefreshCw className="h-4 w-4 mr-1" />{ro ? 'Reîncarcă' : 'Refresh'}</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map((k) => {
          const body = (
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.l}</p>
              <p className="text-2xl font-semibold tabular-nums">{k.v}</p>
              {k.s && <p className="text-xs text-muted-foreground mt-1">{k.s}</p>}
            </CardContent>
          );
          return k.href ? <Link key={k.l} href={k.href}><Card className="hover:bg-muted/40 transition-colors">{body}</Card></Link> : <Card key={k.l}>{body}</Card>;
        })}
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">{ro ? 'Clienți noi' : 'Newest clients'}</h2>
              <Link href={`/${locale}/dashboard/admin/clients`} className="text-sm text-primary underline">{ro ? 'Toți clienții' : 'All clients'}</Link>
            </div>
            {data.newestClients.length === 0 ? <p className="text-sm text-muted-foreground">{ro ? 'Niciun client încă.' : 'No clients yet.'}</p> : (
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground"><tr><th className="py-1 font-normal">{ro ? 'Client' : 'Client'}</th><th className="font-normal">CUI</th><th className="font-normal">Plan</th><th className="font-normal">{ro ? 'Înregistrat' : 'Joined'}</th></tr></thead>
                <tbody>
                  {data.newestClients.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="py-1.5"><Link href={`/${locale}/dashboard/admin/clients/${c.id}`} className="hover:underline">{c.company || c.name || c.email}</Link><div className="text-xs text-muted-foreground">{c.email}</div></td>
                      <td className="tabular-nums">{c.cui || '—'}</td>
                      <td>{c.tier}</td>
                      <td className="tabular-nums">{new Date(c.createdAt).toLocaleDateString(ro ? 'ro-RO' : 'en-GB')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">{ro ? 'Clienți pe plan' : 'Clients by plan'}</h2>
            <ul className="space-y-1 text-sm">
              {['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE'].map((t) => (
                <li key={t} className="flex justify-between"><span>{t}</span><span className="tabular-nums">{data.byTier[t] ?? 0}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
