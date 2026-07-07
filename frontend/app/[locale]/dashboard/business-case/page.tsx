'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, FileText, Calculator, History, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

type Field = {
  key: string; label: string; labelRo?: string; type: string; required?: boolean;
  min?: number; max?: number; options?: { value: string; label: string }[];
  visibleIf?: { field: string; equals?: string | number | boolean; gt?: number; lt?: number };
};
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
  },
  en: {
    title: 'Business Case Studio', subtitle: 'Build rigorous investment cases — Five Case, PRINCE2, or RFQ bid.',
    newCase: 'New case', create: 'Create', cancel: 'Cancel', titleLabel: 'Title', template: 'Template',
    cases: 'My cases', noCases: 'No cases yet. Create your first.', open: 'Open',
    questionnaire: 'Questionnaire', wacc: 'Discount rate', save: 'Save version', saved: 'Version saved',
    versions: 'Versions', diff: 'Diff', discountRate: 'Discount rate', method: 'Method',
    required: 'required', loadFail: 'Could not load data.', back: 'Back', from: 'from', to: 'to',
    computed: 'Computed rate',
  },
};

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

  const backToList = () => { setActive(null); setQuestionnaire(null); setAnswers({}); setVersions([]); setDiff(null); setRate(null); setError(null); };

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
            <Button size="sm" disabled={busy} onClick={save}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {t.save}</Button>
          </div>

          {questionnaire?.sections.map((section) => (
            <Card key={section.id}>
              <CardHeader><CardTitle className="text-base flex items-center gap-2">
                {section.id === 'wacc' ? <Calculator className="h-4 w-4" /> : null}
                {locale === 'ro' && section.titleRo ? section.titleRo : section.title}
              </CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {section.fields.filter((f) => isVisible(f, answers)).map((f) => (
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
