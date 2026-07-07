'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Play, Gauge, AlertTriangle, Loader2, Clock, TrendingUp, Users, Zap, Download, ChevronRight, Rewind,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { api, API_URL } from '@/lib/api';

type Row = { tick: number; cash: number; revenue: number; customerBase: number; brandEquity: number; morale: number; marketShare: number; productivity: number; churnRate: number; cyclePhase: string };
type Run = { id: string; scenarioKey: string; mode: string; mirrorMode?: boolean; currentTick: number; status: string };
type Pending = {
  currentTick: number;
  pending: { id: string; description: string; visibleHint: string; ticksUntil: number }[];
  telegraphed: { eventId: string; ticksUntil: number }[];
  pendingEvents: { eventId: string; title: string; category: string; choices: { label: string }[] }[];
  activeModifiers: { targetKpi: string; mult?: number; add?: number; ticksLeft: number }[];
  delegations: string[];
};

const T = {
  ro: { title: 'Simulator Business v2', subtitle: 'Rulează afacerea în timp — deciziile se acumulează.', newRun: 'Simulare nouă', calibrated: 'Din datele reale (oglindă)', advance: 'Avansează', day: 'zi', days: 'zile', evolution: 'Evoluție KPI', consequences: 'Consecințe în așteptare', events: 'Evenimente', timeline: 'Jurnal', csv: 'Export CSV', noRun: 'Creează o simulare pentru a începe.', tick: 'Ziua', cash: 'Numerar', revenue: 'Venituri', customers: 'Clienți', brand: 'Brand', morale: 'Moral', share: 'Cotă piață', respond: 'Alege', in: 'în', ticksLeft: 'zile rămase', phase: 'Fază', loadFail: 'Nu s-au putut încărca datele.', practice: 'Exersare', scored: 'Punctat', rewind: 'Derulează', rewindHint: 'Doar în modul exersare (max 5 zile înapoi)' },
  en: { title: 'Business Simulator v2', subtitle: 'Run your business over time — decisions compound.', newRun: 'New run', calibrated: 'From real data (mirror)', advance: 'Advance', day: 'day', days: 'days', evolution: 'KPI evolution', consequences: 'Pending consequences', events: 'Events', timeline: 'Log', csv: 'Export CSV', noRun: 'Create a run to begin.', tick: 'Day', cash: 'Cash', revenue: 'Revenue', customers: 'Customers', brand: 'Brand', morale: 'Morale', share: 'Market share', respond: 'Choose', in: 'in', ticksLeft: 'days left', phase: 'Phase', loadFail: 'Could not load data.', practice: 'Practice', scored: 'Scored', rewind: 'Rewind', rewindHint: 'Practice mode only (up to 5 days back)' },
};

const TEAL = '#0b7681';
const GOLD = '#9a6a2f';
const VIOLET = '#6d4a9c';

export default function SimulationV2Page() {
  const rp = useParams();
  const locale = (Array.isArray(rp?.locale) ? rp.locale[0] : rp?.locale) || 'ro';
  const t = locale === 'en' ? T.en : T.ro;

  const [runs, setRuns] = useState<Run[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [history, setHistory] = useState<Row[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [log, setLog] = useState<{ tick: number; kind: string; message: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRun = useCallback(async (id: string) => {
    const [h, p, r] = await Promise.all([
      api.get<Row[]>(`/simulation/v2/runs/${id}/history`),
      api.get<Pending>(`/simulation/v2/runs/${id}/pending`),
      api.get<{ run: Run }>(`/simulation/v2/runs/${id}`),
    ]);
    setHistory(Array.isArray(h.data) ? h.data : []);
    if (p.data) setPending(p.data);
    if (r.data?.run) setRun(r.data.run);
  }, []);

  const loadRuns = useCallback(async () => {
    setLoading(true); setError(null);
    const res = await api.get<Run[]>('/simulation/v2/runs');
    const list = Array.isArray(res.data) ? res.data : [];
    setRuns(list);
    if (list[0]) await loadRun(list[0].id);
    setLoading(false);
  }, [loadRun]);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  const newRun = async (calibrated: boolean) => {
    setBusy(true);
    const res = await api.post<{ run: Run }>(calibrated ? '/simulation/v2/runs/calibrated' : '/simulation/v2/runs', { scenarioKey: 'services' });
    setBusy(false);
    if (res.data?.run) { await loadRuns(); await loadRun(res.data.run.id); }
  };

  const advance = async (ticks: number) => {
    if (!run) return;
    setBusy(true);
    const res = await api.post<{ log: any[] }>(`/simulation/v2/runs/${run.id}/advance`, { tickType: 'day', ticks });
    setBusy(false);
    if (res.data?.log) setLog((prev) => [...res.data!.log, ...prev].slice(0, 60));
    await loadRun(run.id);
  };

  // SIM-8 — rewind a practice run up to 5 ticks back (scored runs cannot rewind).
  const rewind = async (backBy: number) => {
    if (!run) return;
    const toTick = Math.max(0, run.currentTick - backBy);
    if (toTick >= run.currentTick) return;
    setBusy(true);
    const res = await api.post(`/simulation/v2/runs/${run.id}/rewind`, { toTick });
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    setError(null);
    await loadRun(run.id);
  };

  const respond = async (eventId: string, choiceIndex: number) => {
    if (!run) return;
    setBusy(true);
    await api.post(`/simulation/v2/runs/${run.id}/events/${eventId}/respond`, { choiceIndex });
    setBusy(false);
    await loadRun(run.id);
  };

  const downloadCsv = async () => {
    if (!run) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const res = await fetch(`${API_URL}/simulation/v2/runs/${run.id}/history.csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sim-${run.id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = useMemo(() => history.map((r) => ({ ...r, cashK: Math.round(r.cash / 1000), revK: Math.round(r.revenue) })), [history]);
  const latest = history[history.length - 1];

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-semibold flex items-center gap-2"><Gauge className="h-6 w-6 text-teal-600" /> {t.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => newRun(false)}><Play className="h-4 w-4" /> {t.newRun}</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => newRun(true)}>{t.calibrated}</Button>
        </div>
      </div>

      {!run ? (
        <p className="text-sm text-muted-foreground text-center py-10">{t.noRun}</p>
      ) : (
        <>
          {/* run header + advance */}
          <Card><CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-mono text-xs bg-muted rounded px-2 py-1">{run.scenarioKey}</span>
              {/* SIM-8 run-mode badge */}
              <span className={`text-xs px-2 py-1 rounded ${run.mode === 'scored' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>{run.mode === 'scored' ? t.scored : t.practice}</span>
              {run.mirrorMode && <span className="text-xs px-2 py-1 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">{t.calibrated}</span>}
              <span className="text-muted-foreground">{t.tick} <b className="tabular-nums text-foreground">{run.currentTick}</b></span>
              {latest && <span className="text-xs text-muted-foreground">{t.phase}: {latest.cyclePhase}</span>}
            </div>
            <div className="flex gap-2">
              {/* SIM-8 rewind — practice-only, up to 5 days back */}
              {run.mode !== 'scored' && run.currentTick > 0 && (
                <Button size="sm" variant="outline" disabled={busy} title={t.rewindHint} onClick={() => rewind(5)}><Rewind className="h-4 w-4" /> {t.rewind} 5 {t.days}</Button>
              )}
              <Button size="sm" disabled={busy} onClick={() => advance(7)}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />} {t.advance} 7 {t.days}</Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => advance(30)}>{t.advance} 30 {t.days}</Button>
            </div>
          </CardContent></Card>

          {/* KPI tiles */}
          {latest && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KTile icon={TrendingUp} label={t.cash} value={`${Math.round(latest.cash / 1000)}k`} />
              <KTile icon={Users} label={t.customers} value={Math.round(latest.customerBase)} />
              <KTile icon={Zap} label={t.morale} value={`${Math.round(latest.morale)}`} />
              <KTile icon={Gauge} label={t.share} value={`${latest.marketShare?.toFixed(1)}%`} />
            </div>
          )}

          <Tabs defaultValue="evolution">
            <TabsList>
              <TabsTrigger value="evolution">{t.evolution}</TabsTrigger>
              <TabsTrigger value="consequences">{t.consequences} {pending?.pending?.length ? `(${pending.pending.length})` : ''}</TabsTrigger>
              <TabsTrigger value="events">{t.events} {pending?.pendingEvents?.length ? `(${pending.pendingEvents.length})` : ''}</TabsTrigger>
              <TabsTrigger value="timeline">{t.timeline}</TabsTrigger>
            </TabsList>

            <TabsContent value="evolution" className="mt-4 space-y-4">
              <ChartCard title={`${t.cash} / ${t.revenue}`}>
                <AreaChart data={chartData}>
                  <defs><linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={TEAL} stopOpacity={0.35} /><stop offset="100%" stopColor={TEAL} stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="tick" fontSize={11} /><YAxis fontSize={11} width={44} />
                  <Tooltip /><Legend />
                  <Area type="monotone" dataKey="cashK" name={t.cash + ' (k)'} stroke={TEAL} fill="url(#gc)" strokeWidth={2} />
                  <Line type="monotone" dataKey="revK" name={t.revenue} stroke={GOLD} dot={false} strokeWidth={1.5} />
                </AreaChart>
              </ChartCard>
              <div className="grid md:grid-cols-2 gap-4">
                <ChartCard title={`${t.customers} / ${t.brand}`} h={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="tick" fontSize={11} /><YAxis fontSize={11} width={40} />
                    <Tooltip /><Line type="monotone" dataKey="customerBase" name={t.customers} stroke={TEAL} dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="brandEquity" name={t.brand} stroke={VIOLET} dot={false} strokeWidth={1.5} />
                  </LineChart>
                </ChartCard>
                <ChartCard title={`${t.morale} / ${t.share}`} h={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="tick" fontSize={11} /><YAxis fontSize={11} width={40} />
                    <Tooltip /><Line type="monotone" dataKey="morale" name={t.morale} stroke={GOLD} dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="marketShare" name={t.share} stroke={TEAL} dot={false} strokeWidth={1.5} />
                  </LineChart>
                </ChartCard>
              </div>
              <Button size="sm" variant="ghost" onClick={downloadCsv}><Download className="h-4 w-4" /> {t.csv}</Button>
            </TabsContent>

            <TabsContent value="consequences" className="mt-4">
              <Card><CardContent className="p-4 space-y-4">
                {pending?.telegraphed?.length ? (
                  <div className="space-y-1.5">
                    {pending.telegraphed.map((tg, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4" /> {tg.eventId} — {t.in} {tg.ticksUntil} {t.days}
                      </div>
                    ))}
                  </div>
                ) : null}
                {pending?.pending?.length ? pending.pending.map((p) => (
                  <div key={p.id} className="flex items-start gap-2 text-sm border-b border-border/50 pb-2 last:border-0">
                    <Clock className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
                    <div><div>{p.visibleHint || p.description}</div><div className="text-xs text-muted-foreground">{t.in} {p.ticksUntil} {t.days}</div></div>
                  </div>
                )) : <p className="text-sm text-muted-foreground">—</p>}
                {pending?.activeModifiers?.length ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {pending.activeModifiers.map((m, i) => (
                      <span key={i} className="text-xs bg-muted rounded px-2 py-0.5">{m.targetKpi} {m.mult !== undefined ? `×${m.mult}` : `+${m.add}`} · {m.ticksLeft}{t.ticksLeft.slice(0, 1)}</span>
                    ))}
                  </div>
                ) : null}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="events" className="mt-4">
              <Card><CardContent className="p-4 space-y-3">
                {pending?.pendingEvents?.length ? pending.pendingEvents.map((ev) => (
                  <div key={ev.eventId} className="space-y-2 border-b border-border/50 pb-3 last:border-0">
                    <div className="font-medium text-sm">{ev.title} <span className="text-xs text-muted-foreground">({ev.category})</span></div>
                    <div className="flex flex-wrap gap-2">
                      {ev.choices.map((c, i) => (
                        <Button key={i} size="sm" variant="outline" disabled={busy} onClick={() => respond(ev.eventId, i)}>{t.respond}: {c.label}</Button>
                      ))}
                    </div>
                  </div>
                )) : <p className="text-sm text-muted-foreground">—</p>}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <Card><CardContent className="p-4">
                <ul className="space-y-1.5 text-sm">
                  {log.length ? log.map((l, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-mono text-xs text-muted-foreground w-14 shrink-0">{t.tick} {l.tick}</span>
                      <span className={l.kind === 'event' ? 'text-violet-600 dark:text-violet-400' : l.kind === 'hint' ? 'text-amber-600 dark:text-amber-400' : l.kind === 'guardrail' ? 'text-red-600' : ''}>{l.message}</span>
                    </li>
                  )) : <li className="text-muted-foreground">—</li>}
                </ul>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function KTile({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" /> {label}</div>
      <p className="text-xl font-semibold mt-1 tabular-nums">{value}</p>
    </CardContent></Card>
  );
}

function ChartCard({ title, children, h = 260 }: { title: string; children: React.ReactElement; h?: number }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-sm font-medium mb-3">{title}</p>
      <div style={{ height: h }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
    </CardContent></Card>
  );
}
