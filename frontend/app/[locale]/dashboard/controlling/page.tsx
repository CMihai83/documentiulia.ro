'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, Wallet, Gauge, Percent, Building2, ClipboardList,
  AlertTriangle, Loader2, ArrowDownRight, ArrowUpRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

type VarStatus = 'favorable' | 'on_track' | 'warning' | 'critical';
interface VarianceLine { costCenterId: string; costCenterCode: string; costCenterName: string; category: string; planned: number; actual: number; variance: number; variancePercent: number; status: VarStatus; }
interface CM { segmentId: string; name: string; profitCenterName: string; revenue: number; variableCosts: number; contributionMargin1: number; cm1Percent: number; allocatedFixedCosts: number; operatingResult: number; operatingMarginPercent: number; }
interface Kpi { period: string; currency: string; totalRevenue: number; totalCost: number; ebitda: number; ebitdaMarginPercent: number; grossMarginPercent: number; budgetPlanned: number; budgetActual: number; budgetUtilizationPercent: number; costCenterCount: number; profitCenterCount: number; openInternalOrders: number; }
interface Alert { severity: VarStatus; message: string; messageRo: string; }
interface ExecSummary { kpi: Kpi; topVariances: VarianceLine[]; alerts: Alert[]; }

const T = {
  ro: { title: 'Controlling', subtitle: 'Contabilitate de gestiune — centre de cost, marje și abateri.',
    overview: 'Sinteză', costCenters: 'Centre de cost', profitability: 'Profitabilitate',
    revenue: 'Venituri', ebitda: 'EBITDA', budgetUtil: 'Consum buget', grossMargin: 'Marjă brută',
    costCenters2: 'Centre de cost', openIO: 'Ordine interne active', alerts: 'Alerte',
    planned: 'Buget', actual: 'Realizat', variance: 'Abatere', noAlerts: 'Nicio abatere semnificativă.',
    cm1: 'Marjă contribuție', opResult: 'Rezultat operațional', retry: 'Reîncearcă', loadFail: 'Nu s-au putut încărca datele.',
    status: { favorable: 'Favorabil', on_track: 'În grafic', warning: 'Atenție', critical: 'Critic' } as Record<VarStatus, string> },
  en: { title: 'Controlling', subtitle: 'Management accounting — cost centers, margins and variances.',
    overview: 'Overview', costCenters: 'Cost centers', profitability: 'Profitability',
    revenue: 'Revenue', ebitda: 'EBITDA', budgetUtil: 'Budget used', grossMargin: 'Gross margin',
    costCenters2: 'Cost centers', openIO: 'Open internal orders', alerts: 'Alerts',
    planned: 'Budget', actual: 'Actual', variance: 'Variance', noAlerts: 'No significant variances.',
    cm1: 'Contribution margin', opResult: 'Operating result', retry: 'Retry', loadFail: 'Could not load data.',
    status: { favorable: 'Favorable', on_track: 'On track', warning: 'Warning', critical: 'Critical' } as Record<VarStatus, string> },
};

const statusColor: Record<VarStatus, string> = { favorable: '#2f9e6f', on_track: '#0c7d88', warning: '#bd7f24', critical: '#c2453d' };
const statusBadge: Record<VarStatus, string> = {
  favorable: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  on_track: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

export default function ControllingCockpitPage() {
  const routeParams = useParams();
  const locale = (Array.isArray(routeParams?.locale) ? routeParams.locale[0] : routeParams?.locale) || 'ro';
  const t = locale === 'en' ? T.en : T.ro;
  const [summary, setSummary] = useState<ExecSummary | null>(null);
  const [variances, setVariances] = useState<VarianceLine[]>([]);
  const [margins, setMargins] = useState<CM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [s, v, m] = await Promise.all([
      api.get<ExecSummary>('/controlling/executive-summary'),
      api.get<VarianceLine[]>('/controlling/cost-centers/variance'),
      api.get<CM[]>('/controlling/profitability/contribution-margins'),
    ]);
    if (s.error && v.error) { setError(t.loadFail); setLoading(false); return; }
    if (s.data) setSummary(s.data);
    setVariances(Array.isArray(v.data) ? v.data : []);
    setMargins(Array.isArray(m.data) ? m.data : []);
    setLoading(false);
  }, [t.loadFail]);

  useEffect(() => { load(); }, [load]);

  const money = (n: number, c = 'RON') => new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'ro-RO', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);
  const pct = (n: number) => `${n.toFixed(1)}%`;

  const kpi = summary?.kpi;
  const tiles = kpi && [
    { label: t.revenue, value: money(kpi.totalRevenue), icon: TrendingUp },
    { label: t.ebitda, value: money(kpi.ebitda), sub: pct(kpi.ebitdaMarginPercent), icon: Wallet },
    { label: t.budgetUtil, value: pct(kpi.budgetUtilizationPercent), sub: money(kpi.budgetActual), icon: Gauge, warn: kpi.budgetUtilizationPercent > 100 },
    { label: t.grossMargin, value: pct(kpi.grossMarginPercent), icon: Percent },
    { label: t.costCenters2, value: String(kpi.costCenterCount), icon: Building2 },
    { label: t.openIO, value: String(kpi.openInternalOrders), icon: ClipboardList },
  ];

  const varChart = variances.map((v) => ({ name: v.costCenterCode, [t.planned]: v.planned, [t.actual]: v.actual, status: v.status }));
  const cmChart = margins.map((m) => ({ name: m.name.length > 18 ? m.name.slice(0, 17) + '…' : m.name, cm1: m.contributionMargin1, cm1Percent: m.cm1Percent }));

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-serif font-semibold flex items-center gap-2">
          <Gauge className="h-6 w-6 text-teal-600" /> {t.title}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t.subtitle}{kpi ? ` · ${kpi.period}` : ''}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : error ? (
        <Card><CardContent className="p-8 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={load}>{t.retry}</Button>
        </CardContent></Card>
      ) : (
        <>
          {tiles && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {tiles.map((s) => (
                <Card key={s.label}><CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><s.icon className="h-4 w-4" /> {s.label}</div>
                  <p className={`text-lg font-semibold mt-1 tabular-nums ${s.warn ? 'text-red-600 dark:text-red-400' : ''}`}>{s.value}</p>
                  {s.sub && <p className="text-[11px] text-muted-foreground tabular-nums">{s.sub}</p>}
                </CardContent></Card>
              ))}
            </div>
          )}

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">{t.overview}</TabsTrigger>
              <TabsTrigger value="cc">{t.costCenters}</TabsTrigger>
              <TabsTrigger value="pa">{t.profitability}</TabsTrigger>
            </TabsList>

            {/* Overview: alerts + variance chart */}
            <TabsContent value="overview" className="mt-4 space-y-4">
              <Card><CardContent className="p-4">
                <p className="text-sm font-medium mb-3">{t.alerts}</p>
                {summary && summary.alerts.length > 0 ? (
                  <ul className="space-y-2">
                    {summary.alerts.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className={`mt-0.5 h-2 w-2 rounded-full shrink-0`} style={{ background: statusColor[a.severity] }} />
                        <span className="text-muted-foreground">{locale === 'en' ? a.message : a.messageRo}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">{t.noAlerts}</p>}
              </CardContent></Card>

              <Card><CardContent className="p-4">
                <p className="text-sm font-medium mb-3">{t.planned} vs {t.actual}</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={varChart} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} width={48} />
                      <Tooltip formatter={(v: number) => money(v)} />
                      <Bar dataKey={t.planned} fill="#94a3b8" radius={[3, 3, 0, 0]} />
                      <Bar dataKey={t.actual} radius={[3, 3, 0, 0]}>
                        {varChart.map((d, i) => <Cell key={i} fill={statusColor[d.status as VarStatus]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent></Card>
            </TabsContent>

            {/* Cost centers: RAG variance table */}
            <TabsContent value="cc" className="mt-4">
              <Card><CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                  <thead><tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="p-3">{t.costCenters}</th><th className="p-3 text-right">{t.planned}</th>
                    <th className="p-3 text-right">{t.actual}</th><th className="p-3 text-right">{t.variance}</th><th className="p-3">{''}</th>
                  </tr></thead>
                  <tbody>
                    {variances.map((v) => (
                      <tr key={v.costCenterId} className="border-b last:border-0">
                        <td className="p-3"><span className="font-mono text-xs text-muted-foreground">{v.costCenterCode}</span> {v.costCenterName}</td>
                        <td className="p-3 text-right tabular-nums">{money(v.planned)}</td>
                        <td className="p-3 text-right tabular-nums">{money(v.actual)}</td>
                        <td className={`p-3 text-right tabular-nums font-medium ${v.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          <span className="inline-flex items-center gap-0.5">{v.variance < 0 ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}{money(Math.abs(v.variance))}</span>
                        </td>
                        <td className="p-3"><span className={`text-[11px] px-2 py-0.5 rounded ${statusBadge[v.status]}`}>{t.status[v.status]}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent></Card>
            </TabsContent>

            {/* Profitability: CO-PA */}
            <TabsContent value="pa" className="mt-4 space-y-4">
              <Card><CardContent className="p-4">
                <p className="text-sm font-medium mb-3">{t.cm1}</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cmChart} layout="vertical" margin={{ left: 8, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis type="number" fontSize={11} /><YAxis type="category" dataKey="name" width={120} fontSize={11} />
                      <Tooltip formatter={(v: number) => money(v)} />
                      <ReferenceLine x={0} stroke="#94a3b8" />
                      <Bar dataKey="cm1" fill="#0c7d88" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent></Card>
              <div className="grid gap-3 sm:grid-cols-2">
                {margins.map((m) => (
                  <Card key={m.segmentId}><CardContent className="p-4 space-y-1">
                    <p className="font-medium text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.profitCenterName}</p>
                    <div className="flex justify-between text-sm pt-1"><span className="text-muted-foreground">{t.cm1}</span><span className="tabular-nums">{money(m.contributionMargin1)} ({pct(m.cm1Percent)})</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t.opResult}</span><span className={`tabular-nums ${m.operatingResult < 0 ? 'text-red-600' : 'text-green-600'}`}>{money(m.operatingResult)}</span></div>
                  </CardContent></Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
