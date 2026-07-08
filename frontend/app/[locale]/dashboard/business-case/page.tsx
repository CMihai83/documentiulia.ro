'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, FileText, Calculator, History, ChevronRight, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { api, API_URL } from '@/lib/api';

type DriverColumn = { key: string; label: string; labelRo?: string; type: string; min?: number; max?: number };
type Field = {
  key: string; label: string; labelRo?: string; type: string; required?: boolean;
  min?: number; max?: number; options?: { value: string; label: string }[];
  columns?: DriverColumn[]; rowsFrom?: string; distributionTarget?: string;
  visibleIf?: { field: string; equals?: string | number | boolean; gt?: number; lt?: number };
};

// Brand categorical hues (teal / gold / violet), assigned in fixed order — never cycled.
const C = { teal: '#0b7681', gold: '#c79a3a', violet: '#6d5bd0', pos: '#2f8f5b', neg: '#b5473d', grid: '#e5e7eb' };

type Appraisal = {
  discountRate: number; discountMethod: string; npv: number; irr: number | null; multipleRoots: boolean;
  paybackYears: number | null; discountedPaybackYears: number | null; bcr: number; roi: number;
};
type TornadoBar = { key: string; lowNpv: number; highNpv: number; baseNpv: number; swing: number };
type MonteCarlo = {
  p10: number; p50: number; p90: number; mean: number; probNpvPositive: number; probIrrAboveHurdle: number;
  histogram: { x0: number; x1: number; count: number }[];
};
type Results = { assumptionVersion: number; appraisal: Appraisal; tornado: TornadoBar[]; monteCarlo: MonteCarlo };
type Section = { id: string; title: string; titleRo?: string; fields: Field[] };
type Template = { template: string; name: string; nameRo: string; skeleton: string[]; maturityStages?: string[] };
type Questionnaire = Template & { sections: Section[] };
type BusinessCase = { id: string; title: string; template: string; status: string; updatedAt: string };
type VersionRow = { version: number; createdAt: string };
type DiffChange = { field: string; from: any; to: any };

const T = {
  ro: {
    title: 'Studio Business Case', subtitle: 'Construiește cazuri de investiție riguroase — 5 cazuri, PRINCE2 sau ofertă RFQ.',
    newCase: 'Caz nou', create: 'Creează', cancel: 'Anulează', titleLabel: 'Titlu', template: 'Șablon',
    cases: 'Cazurile mele', noCases: 'Niciun caz încă. Creează primul.', open: 'Deschide',
    questionnaire: 'Chestionar', wacc: 'Rata de actualizare', save: 'Salvează versiunea', saved: 'Versiune salvată',
    versions: 'Versiuni', diff: 'Diferențe', discountRate: 'Rată de actualizare', method: 'Metodă',
    required: 'obligatoriu', loadFail: 'Nu s-au putut încărca datele.', back: 'Înapoi', from: 'de la', to: 'la',
    computed: 'Rata calculată',
    compute: 'Calculează evaluarea', results: 'Rezultatele evaluării', npv: 'VAN (NPV)', irr: 'RIR (IRR)',
    payback: 'Recuperare', years: 'ani', tornado: 'Senzitivitate (tornado)', mc: 'Monte-Carlo — distribuția VAN',
    probPos: 'Prob. VAN > 0', na: 'fără soluție', year1: 'Anul', benefit: 'Beneficiu', opex: 'Cost operare',
    dist: 'Distribuție', none: 'niciuna', computeFirst: 'Salvează versiunea, apoi calculează.',
    deliverable: 'Descarcă livrabilul (PDF)',
  },
  en: {
    title: 'Business Case Studio', subtitle: 'Build rigorous investment cases — Five Case, PRINCE2, or RFQ bid.',
    newCase: 'New case', create: 'Create', cancel: 'Cancel', titleLabel: 'Title', template: 'Template',
    cases: 'My cases', noCases: 'No cases yet. Create your first.', open: 'Open',
    questionnaire: 'Questionnaire', wacc: 'Discount rate', save: 'Save version', saved: 'Version saved',
    versions: 'Versions', diff: 'Diff', discountRate: 'Discount rate', method: 'Method',
    required: 'required', loadFail: 'Could not load data.', back: 'Back', from: 'from', to: 'to',
    computed: 'Computed rate',
    compute: 'Compute appraisal', results: 'Appraisal results', npv: 'NPV', irr: 'IRR',
    payback: 'Payback', years: 'yrs', tornado: 'Sensitivity (tornado)', mc: 'Monte-Carlo — NPV distribution',
    probPos: 'Prob. NPV > 0', na: 'no root', year1: 'Year', benefit: 'Benefit', opex: 'Op-cost',
    dist: 'Distribution', none: 'none', computeFirst: 'Save a version, then compute.',
    deliverable: 'Download deliverable (PDF)',
  },
};

const money = (n: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
const pctStr = (n: number | null, dp = 1) => (n === null || n === undefined ? null : `${(n * 100).toFixed(dp)}%`);

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' }) {
  const color = tone === 'pos' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'neg' ? 'text-red-600 dark:text-red-400' : 'text-foreground';
  return (
    <div className="rounded-lg border p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function isVisible(f: Field, answers: Record<string, any>): boolean {
  const v = f.visibleIf; if (!v) return true;
  const val = answers[v.field];
  if (v.equals !== undefined) return val === v.equals;
  if (v.gt !== undefined) return typeof val === 'number' && val > v.gt;
  if (v.lt !== undefined) return typeof val === 'number' && val < v.lt;
  return true;
}

export default function BusinessCasePage() {
  const rp = useParams();
  const locale = (Array.isArray(rp?.locale) ? rp.locale[0] : rp?.locale) || 'ro';
  const t = locale === 'en' ? T.en : T.ro;

  const [cases, setCases] = useState<BusinessCase[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTemplate, setNewTemplate] = useState('FIVE_CASE');
  const [active, setActive] = useState<BusinessCase | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [diff, setDiff] = useState<{ from: number; to: number; changes: DiffChange[] } | null>(null);
  const [rate, setRate] = useState<{ rate: number; method: string } | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [computing, setComputing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    const [c, tpl] = await Promise.all([
      api.get<BusinessCase[]>('/business-case'),
      api.get<Template[]>('/business-case/templates'),
    ]);
    if (c.data) setCases(c.data);
    if (tpl.data) setTemplates(tpl.data);
  }, []);

  useEffect(() => { loadList().catch(() => setError(t.loadFail)); }, [loadList, t.loadFail]);

  const openCase = async (bc: BusinessCase) => {
    setActive(bc); setBusy(true); setDiff(null); setRate(null);
    const [q, full, vers] = await Promise.all([
      api.get<Questionnaire>(`/business-case/templates/${bc.template}/questionnaire`),
      api.get<{ latest?: { answers: Record<string, any> } }>(`/business-case/${bc.id}`),
      api.get<VersionRow[]>(`/business-case/${bc.id}/versions`),
    ]);
    setBusy(false);
    if (q.data) setQuestionnaire(q.data);
    setAnswers(full.data?.latest?.answers ?? {});
    if (vers.data) setVersions(vers.data);
    const r = await api.get<Results | null>(`/business-case/${bc.id}/results`);
    setResults(r.data ?? null);
  };

  const compute = async () => {
    if (!active) return;
    setComputing(true); setError(null);
    const res = await api.post<Results>(`/business-case/${active.id}/compute`, { seed: 12345 });
    setComputing(false);
    if (res.error) { setError(typeof res.error === 'string' ? res.error : t.computeFirst); return; }
    if (res.data) setResults(res.data);
  };

  const create = async () => {
    if (!newTitle.trim()) return;
    setBusy(true);
    const res = await api.post<BusinessCase>('/business-case', { title: newTitle.trim(), template: newTemplate });
    setBusy(false);
    if (res.data) { setCreating(false); setNewTitle(''); await loadList(); await openCase(res.data); }
  };

  const setAnswer = (key: string, value: any) => setAnswers((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    if (!active) return;
    setBusy(true); setError(null);
    const res = await api.post<{ version: number; discountRate: { rate: number; method: string } }>(
      `/business-case/${active.id}/answers`, { answers },
    );
    setBusy(false);
    if (res.error) { setError(typeof res.error === 'string' ? res.error : 'Validation failed'); return; }
    if (res.data) {
      setRate(res.data.discountRate);
      const vers = await api.get<VersionRow[]>(`/business-case/${active.id}/versions`);
      if (vers.data) setVersions(vers.data);
    }
  };

  const showDiff = async (from: number, to: number) => {
    if (!active) return;
    const res = await api.get<{ from: number; to: number; changes: DiffChange[] }>(
      `/business-case/${active.id}/diff`, { params: { from, to } },
    );
    if (res.data) setDiff(res.data);
  };

  const backToList = () => { setActive(null); setQuestionnaire(null); setAnswers({}); setVersions([]); setDiff(null); setRate(null); setResults(null); setError(null); };

  // driver-table + distribution cell helpers
  const rowCount = (f: Field) => Math.max(0, Math.round(Number(f.rowsFrom ? answers[f.rowsFrom] : 0)) || 0);
  const setCell = (key: string, row: number, col: string, val: number) => setAnswers((prev) => {
    const table = Array.isArray(prev[key]) ? [...prev[key]] : [];
    table[row] = { ...(table[row] ?? {}), [col]: val };
    return { ...prev, [key]: table };
  });
  const setDist = (key: string, patch: Record<string, any>) => setAnswers((prev) => ({ ...prev, [key]: { ...(prev[key] ?? { dist: 'triangular' }), ...patch } }));

  // BC-107 — authenticated PDF download (bare <a href> would drop the JWT → 401).
  const downloadDeliverable = async (maturity: 'SOC' | 'OBC' | 'FBC') => {
    if (!active) return;
    setError(null);
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const res = await fetch(`${API_URL}/business-case/${active.id}/deliverable?maturity=${maturity}&locale=${locale}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) { setError(t.loadFail); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${active.title}-${maturity}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const label = (o: { label: string; labelRo?: string }) => (locale === 'ro' && (o as any).labelRo ? (o as any).labelRo : o.label);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><FileText className="h-6 w-6" /> {t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </header>

      {error && <Card className="border-destructive"><CardContent className="p-3 text-sm text-destructive">{error}</CardContent></Card>}

      {!active ? (
        <>
          <div className="flex justify-end">
            {!creating
              ? <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> {t.newCase}</Button>
              : (
                <Card className="w-full"><CardContent className="p-4 flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="bc-title">{t.titleLabel}</Label>
                    <Input id="bc-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="…" />
                  </div>
                  <div className="min-w-[220px]">
                    <Label htmlFor="bc-template">{t.template}</Label>
                    <select id="bc-template" className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                      value={newTemplate} onChange={(e) => setNewTemplate(e.target.value)}>
                      {templates.map((tp) => <option key={tp.template} value={tp.template}>{label(tp as any)}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busy} onClick={create}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {t.create}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>{t.cancel}</Button>
                  </div>
                </CardContent></Card>
              )}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">{t.cases}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {cases.length === 0 && <p className="text-sm text-muted-foreground">{t.noCases}</p>}
              {cases.map((bc) => (
                <button key={bc.id} onClick={() => openCase(bc)}
                  className="w-full flex items-center justify-between gap-3 rounded-md border p-3 text-left hover:bg-muted/50 transition">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{bc.title}</span>
                    <Badge variant="secondary">{bc.template}</Badge>
                    <Badge variant="outline">{bc.status}</Badge>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button size="sm" variant="ghost" onClick={backToList}>← {t.back}</Button>
              <h2 className="font-semibold">{active.title}</h2>
              <Badge variant="secondary">{active.template}</Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={computing} onClick={compute}>
                {computing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />} {t.compute}
              </Button>
              <Button size="sm" disabled={busy} onClick={save}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {t.save}</Button>
            </div>
          </div>

          {questionnaire?.sections.map((section) => (
            <Card key={section.id}>
              <CardHeader><CardTitle className="text-base flex items-center gap-2">
                {section.id === 'wacc' ? <Calculator className="h-4 w-4" /> : null}
                {locale === 'ro' && section.titleRo ? section.titleRo : section.title}
              </CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {section.fields.filter((f) => isVisible(f, answers)).map((f) => (
                  f.type === 'driver-table' ? (
                    <div key={f.key} className="space-y-2 sm:col-span-2">
                      <Label className="text-xs">{label(f)} {f.required && <span className="text-destructive">*</span>}</Label>
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b bg-muted/40">
                            <th className="p-2 text-left font-medium">{t.year1}</th>
                            {(f.columns ?? []).map((c) => <th key={c.key} className="p-2 text-left font-medium">{label(c as any)}</th>)}
                          </tr></thead>
                          <tbody>
                            {Array.from({ length: rowCount(f) }).map((_, r) => (
                              <tr key={r} className="border-b last:border-0">
                                <td className="p-2 text-muted-foreground tabular-nums">{r + 1}</td>
                                {(f.columns ?? []).map((c) => (
                                  <td key={c.key} className="p-1">
                                    <Input type="number" inputMode="decimal" className="h-8" min={c.min} max={c.max}
                                      value={answers[f.key]?.[r]?.[c.key] ?? ''}
                                      onChange={(e) => setCell(f.key, r, c.key, e.target.value === '' ? 0 : Number(e.target.value))} />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {rowCount(f) === 0 && <p className="text-[11px] text-muted-foreground">{t.computeFirst}</p>}
                    </div>
                  ) : f.type === 'distribution' ? (
                    <div key={f.key} className="space-y-1">
                      <Label className="text-xs">{label(f)}</Label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <select className="h-9 rounded-md border bg-background px-2 text-xs"
                          value={answers[f.key]?.dist ?? ''} onChange={(e) => e.target.value === '' ? setAnswer(f.key, undefined) : setDist(f.key, { dist: e.target.value })}>
                          <option value="">{t.none}</option>
                          <option value="triangular">triangular</option>
                          <option value="pert">pert</option>
                          <option value="uniform">uniform</option>
                          <option value="normal">normal</option>
                        </select>
                        {answers[f.key]?.dist && answers[f.key].dist !== 'normal' && (['min', 'mode', 'max'] as const).map((p) => (
                          (p !== 'mode' || ['triangular', 'pert'].includes(answers[f.key].dist)) &&
                          <Input key={p} type="number" step="0.05" placeholder={p} className="h-9 w-20"
                            value={answers[f.key]?.[p] ?? ''} onChange={(e) => setDist(f.key, { [p]: Number(e.target.value) })} />
                        ))}
                        {answers[f.key]?.dist === 'normal' && (['mean', 'sd'] as const).map((p) => (
                          <Input key={p} type="number" step="0.05" placeholder={p} className="h-9 w-20"
                            value={answers[f.key]?.[p] ?? ''} onChange={(e) => setDist(f.key, { [p]: Number(e.target.value) })} />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground">× multiplier</span>
                    </div>
                  ) : (
                  <div key={f.key} className="space-y-1">
                    <Label htmlFor={f.key} className="text-xs">
                      {label(f)} {f.required && <span className="text-destructive">*</span>}
                    </Label>
                    {f.type === 'select' ? (
                      <select id={f.key} className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                        value={answers[f.key] ?? ''} onChange={(e) => setAnswer(f.key, e.target.value)}>
                        <option value="">—</option>
                        {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <Input id={f.key} type={f.type === 'date' ? 'date' : 'number'}
                        inputMode={f.type === 'date' ? undefined : 'decimal'}
                        value={answers[f.key] ?? ''} min={f.min} max={f.max}
                        onChange={(e) => setAnswer(f.key, e.target.value === '' ? '' : (f.type === 'date' ? e.target.value : Number(e.target.value)))}
                      />
                    )}
                    {(f.type === 'percent') && <span className="text-[10px] text-muted-foreground">%</span>}
                  </div>
                  )
                ))}
              </CardContent>
            </Card>
          ))}

          {rate && (
            <Card className="border-teal-300 dark:border-teal-800">
              <CardContent className="p-4 text-sm flex items-center gap-4">
                <Calculator className="h-5 w-5 text-teal-600" />
                <span>{t.computed}: <b className="tabular-nums">{(rate.rate * 100).toFixed(2)}%</b></span>
                <Badge variant="outline">{t.method}: {rate.method.toUpperCase()}</Badge>
              </CardContent>
            </Card>
          )}

          {results && (
            <Card className="border-teal-300 dark:border-teal-800">
              <CardHeader><CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-teal-600" /> {t.results}
                <Badge variant="outline" className="ml-1">v{results.assumptionVersion}</Badge>
              </CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {/* KPI stat tiles — hero numbers, text in ink not series color */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Stat label={t.npv} value={money(results.appraisal.npv)} tone={results.appraisal.npv >= 0 ? 'pos' : 'neg'} />
                  <Stat label={t.irr} value={results.appraisal.irr === null ? t.na : pctStr(results.appraisal.irr)!} />
                  <Stat label={t.payback} value={results.appraisal.paybackYears === null ? '—' : `${results.appraisal.paybackYears.toFixed(1)} ${t.years}`} />
                  <Stat label={t.probPos} value={pctStr(results.monteCarlo.probNpvPositive, 0)!} tone={results.monteCarlo.probNpvPositive >= 0.5 ? 'pos' : 'neg'} />
                </div>

                {/* Tornado — horizontal bars diverging from base NPV, ranked by swing */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t.tornado}</p>
                  <ResponsiveContainer width="100%" height={Math.max(120, results.tornado.length * 44)}>
                    <BarChart layout="vertical" data={results.tornado.map((b) => ({ ...b, low: b.lowNpv - b.baseNpv, high: b.highNpv - b.baseNpv }))}
                      margin={{ left: 8, right: 8 }}>
                      <CartesianGrid horizontal={false} stroke={C.grid} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => money(v)} />
                      <YAxis type="category" dataKey="key" tick={{ fontSize: 11 }} width={72} />
                      <RTooltip formatter={(v: any, n: any) => [money(Number(v) + results.appraisal.npv), n === 'low' ? '−10%' : '+10%']} />
                      <ReferenceLine x={0} stroke="#94a3b8" />
                      <Bar dataKey="low" fill={C.neg} radius={[4, 0, 0, 4]} />
                      <Bar dataKey="high" fill={C.teal} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Monte-Carlo NPV histogram — single hue, P50 marked */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {t.mc} · P10 {money(results.monteCarlo.p10)} · P50 {money(results.monteCarlo.p50)} · P90 {money(results.monteCarlo.p90)}
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={results.monteCarlo.histogram.map((h) => ({ mid: (h.x0 + h.x1) / 2, count: h.count }))}>
                      <CartesianGrid vertical={false} stroke={C.grid} />
                      <XAxis dataKey="mid" tick={{ fontSize: 10 }} tickFormatter={(v) => money(v)} />
                      <YAxis tick={{ fontSize: 10 }} width={32} />
                      <RTooltip formatter={(v: any) => [v, '#']} labelFormatter={(v) => `NPV ≈ ${money(Number(v))}`} />
                      <ReferenceLine x={results.monteCarlo.p50} stroke={C.gold} strokeWidth={2} />
                      <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                        {results.monteCarlo.histogram.map((h, i) => (
                          <Cell key={i} fill={(h.x0 + h.x1) / 2 >= 0 ? C.teal : C.neg} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* BC-107 — deliverable download, one button per maturity (authenticated blob) */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">{t.deliverable}:</span>
                  {(['SOC', 'OBC', 'FBC'] as const).map((m) => (
                    <Button key={m} size="sm" variant="outline" onClick={() => downloadDeliverable(m)}>
                      <FileText className="h-4 w-4" /> {m}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {versions.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> {t.versions}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {versions.map((v) => <Badge key={v.version} variant="secondary">v{v.version}</Badge>)}
                </div>
                {versions.length >= 2 && (
                  <Button size="sm" variant="outline"
                    onClick={() => showDiff(versions[versions.length - 1].version, versions[0].version)}>
                    {t.diff}: v{versions[versions.length - 1].version} → v{versions[0].version}
                  </Button>
                )}
                {diff && (
                  <div className="rounded-md border divide-y text-sm">
                    {diff.changes.length === 0 && <div className="p-2 text-muted-foreground">—</div>}
                    {diff.changes.map((c) => (
                      <div key={c.field} className="p-2 flex items-center gap-2">
                        <span className="font-mono text-xs">{c.field}</span>
                        <span className="text-muted-foreground">{t.from}</span>
                        <code className="text-xs">{JSON.stringify(c.from)}</code>
                        <span className="text-muted-foreground">{t.to}</span>
                        <code className="text-xs text-teal-600">{JSON.stringify(c.to)}</code>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
