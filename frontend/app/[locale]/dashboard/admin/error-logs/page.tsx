'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Server, MonitorSmartphone } from 'lucide-react';
import { api } from '@/lib/api';

interface ErrorLog {
  id: string;
  createdAt: string;
  source: string;
  level: string;
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  userId?: string;
  meta?: Record<string, unknown>;
}

export default function ErrorLogsPage() {
  const params = useParams();
  const locale = (Array.isArray(params?.locale) ? params.locale[0] : params?.locale) || 'ro';
  const ro = locale !== 'en';
  const [items, setItems] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<{ total: number; last24h: number; frontend: number; backend: number } | null>(null);
  const [source, setSource] = useState<string>('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [list, st] = await Promise.all([
      api.get<{ items: ErrorLog[]; total: number }>('/admin/client-logs', { params: { ...(source ? { source } : {}), ...(q ? { q } : {}), take: 100 } }),
      api.get<any>('/admin/client-logs/stats'),
    ]);
    if (list.status === 403) { setForbidden(true); setLoading(false); return; }
    setItems(list.data?.items ?? []);
    if (st.data) setStats(st.data);
    setLoading(false);
  }, [source, q]);

  useEffect(() => { void load(); }, [load]);

  if (forbidden) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center text-muted-foreground">
        {ro ? 'Doar administratorii pot vedea jurnalul de erori.' : 'Only administrators can view the error log.'}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-serif font-semibold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-600" /> {ro ? 'Jurnal erori (live)' : 'Live error log'}
        </h1>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4 mr-1" /> {ro ? 'Reîncarcă' : 'Refresh'}
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: ro ? 'Total (30 zile)' : 'Total (30 days)', value: stats.total },
            { label: ro ? 'Ultimele 24h' : 'Last 24h', value: stats.last24h },
            { label: 'Frontend', value: stats.frontend },
            { label: 'Backend (5xx)', value: stats.backend },
          ].map((t) => (
            <Card key={t.label}><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{t.label}</div>
              <div className="text-2xl font-serif font-semibold tabular-nums">{t.value}</div>
            </CardContent></Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        {['', 'frontend', 'backend'].map((s) => (
          <Button key={s || 'all'} size="sm" variant={source === s ? 'default' : 'outline'} onClick={() => setSource(s)}>
            {s === '' ? (ro ? 'Toate' : 'All') : s === 'frontend' ? <><MonitorSmartphone className="h-3.5 w-3.5 mr-1" />Frontend</> : <><Server className="h-3.5 w-3.5 mr-1" />Backend</>}
          </Button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={ro ? 'Caută în mesaje…' : 'Search messages…'}
          className="ml-auto h-9 px-3 rounded-md border bg-background text-sm w-56"
        />
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground text-sm">{ro ? 'Se încarcă…' : 'Loading…'}</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              {ro ? 'Nicio eroare înregistrată. 🎉' : 'No errors logged. 🎉'}
            </div>
          ) : (
            items.map((e) => (
              <div key={e.id} className="p-3 text-sm cursor-pointer hover:bg-muted/40" onClick={() => setOpen(open === e.id ? null : e.id)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${e.source === 'backend' ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300' : 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'}`}>{e.source}</span>
                  {e.level === 'warning' && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">warn</span>}
                  <span className="font-mono text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString(ro ? 'ro-RO' : 'en-GB')}</span>
                  <span className="truncate flex-1 min-w-0">{e.message}</span>
                </div>
                {open === e.id && (
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {e.url && <div><b>URL:</b> {e.url}</div>}
                    {e.userId && <div><b>User:</b> {e.userId}</div>}
                    {e.userAgent && <div><b>UA:</b> {e.userAgent}</div>}
                    {e.meta ? <div><b>Meta:</b> {JSON.stringify(e.meta)}</div> : null}
                    {e.stack && <pre className="mt-1 p-2 bg-muted rounded overflow-x-auto max-h-64 whitespace-pre-wrap">{e.stack}</pre>}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        {ro
          ? 'Erorile din browser (ca în consola DevTools: erori JS, promisiuni respinse, console.error, crash-uri React, apeluri API eșuate) și erorile 5xx de server. Retenție 30 de zile.'
          : 'Browser errors (as in the DevTools console: JS errors, unhandled rejections, console.error, React crashes, failed API calls) plus server 5xx errors. 30-day retention.'}
      </p>
    </div>
  );
}
