'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';

interface ClientRow {
  id: string; email: string; name?: string | null; company?: string | null; cui?: string | null;
  tier: string; role: string; createdAt: string; emailVerified: boolean; mfaEnabled: boolean;
  lastActivityAt?: string | null; _count: { invoices: number; supportTickets: number };
}

export default function AdminClientsPage() {
  const { locale } = useParams<{ locale: string }>();
  const ro = locale !== 'en';
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const r = await api.get<{ items: ClientRow[]; total: number }>('/admin/clients', { params: { ...(q ? { search: q } : {}), ...(tier ? { tier } : {}), page, limit: 25 } });
    if (r.status === 200 && r.data) { setRows(r.data.items); setTotal(r.data.total); }
    else setError(r.error || (ro ? 'Nu am putut încărca lista de clienți.' : 'Could not load clients.'));
    setLoading(false);
  }, [q, tier, page, ro]);
  useEffect(() => { void load(); }, [load]);

  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString(ro ? 'ro-RO' : 'en-GB') : '—');

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); void load(); }}>
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input className="pl-8" placeholder={ro ? 'Caută după e-mail, nume, firmă sau CUI' : 'Search by e-mail, name, company or CUI'} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="border rounded-md px-2 text-sm bg-background" value={tier} onChange={(e) => { setTier(e.target.value); setPage(1); }} aria-label="Plan">
          <option value="">{ro ? 'Toate planurile' : 'All plans'}</option>
          {['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <Button type="submit">{ro ? 'Caută' : 'Search'}</Button>
      </form>

      <Card><CardContent className="p-0">
        {loading ? <p className="p-4 text-muted-foreground">{ro ? 'Se încarcă…' : 'Loading…'}</p>
        : error ? <p className="p-4 text-destructive">{error}</p>
        : rows.length === 0 ? <p className="p-4 text-muted-foreground">{ro ? 'Niciun client nu corespunde căutării.' : 'No client matches your search.'}</p>
        : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground bg-muted/40">
                <tr>
                  <th className="p-3 font-normal">{ro ? 'Client' : 'Client'}</th><th className="font-normal">CUI</th><th className="font-normal">Plan</th><th className="font-normal">Rol</th>
                  <th className="font-normal text-right">{ro ? 'Facturi' : 'Invoices'}</th><th className="font-normal text-right">{ro ? 'Cereri' : 'Requests'}</th>
                  <th className="font-normal">{ro ? 'Ultima activitate' : 'Last activity'}</th><th className="font-normal">{ro ? 'Înregistrat' : 'Joined'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-muted/30">
                    <td className="p-3"><Link href={`/${locale}/dashboard/admin/clients/${c.id}`} className="font-medium hover:underline">{c.company || c.name || c.email}</Link><div className="text-xs text-muted-foreground">{c.email}{!c.emailVerified && <span className="ml-2 text-amber-600">{ro ? 'neverificat' : 'unverified'}</span>}</div></td>
                    <td className="tabular-nums">{c.cui || '—'}</td><td>{c.tier}</td><td>{c.role}</td>
                    <td className="text-right tabular-nums">{c._count.invoices}</td><td className="text-right tabular-nums">{c._count.supportTickets}</td>
                    <td className="tabular-nums">{fmt(c.lastActivityAt)}</td><td className="tabular-nums">{fmt(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent></Card>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} {ro ? 'clienți' : 'clients'}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{ro ? 'Înapoi' : 'Previous'}</Button>
          <Button size="sm" variant="outline" disabled={page * 25 >= total} onClick={() => setPage((p) => p + 1)}>{ro ? 'Înainte' : 'Next'}</Button>
        </div>
      </div>
    </div>
  );
}
