'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Database, Upload, CheckCircle2, AlertTriangle, XCircle, Loader2,
  ArrowRight, Trash2, Save, Wand2,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

type Entity = 'customer' | 'product' | 'invoice';
type RowStatus = 'valid' | 'warning' | 'error';
interface Summary { total: number; valid: number; warning: number; error: number; }
interface StageResult { batchId: string; entityType: Entity; sourceType: string; summary: Summary; }
interface StagedRow { id: string; rowIndex: number; rawData: Record<string, any>; status: RowStatus; errors: string[]; }
interface DryRun { batchId: string; entityType: Entity; counts: Summary; controlTotal?: number; ready: boolean; errorSamples: { rowIndex: number; errors: string[] }[]; }

const TARGETS: Record<Entity, string[]> = {
  customer: ['name', 'cui', 'address', 'city', 'county', 'email', 'phone'],
  product: ['code', 'name', 'price', 'vatRate', 'unit'],
  invoice: ['number', 'date', 'total', 'customerCui', 'currency'],
};
const ALIASES: Record<string, string[]> = {
  name: ['name', 'denumire', 'nume'], cui: ['cui', 'cif', 'cod_fiscal', 'codfiscal'],
  address: ['address', 'adresa'], city: ['city', 'oras', 'localitate'], county: ['county', 'judet'],
  email: ['email'], phone: ['phone', 'telefon'],
  code: ['code', 'cod', 'sku', 'cod_produs', 'codprodus'], price: ['price', 'pret', 'pret_unitar'],
  vatRate: ['vatrate', 'tva', 'cota_tva'], unit: ['unit', 'um', 'unitate'],
  number: ['number', 'numar_factura', 'nrfactura', 'numarfactura'], date: ['date', 'data', 'data_factura'],
  total: ['total', 'valoare', 'suma', 'total_amount'], customerCui: ['cui', 'client_cui'], currency: ['currency', 'moneda', 'valuta'],
};

const T = {
  ro: { title: 'Migrare Date', subtitle: 'Importă din SAGA, mapează câmpurile, verifică — apoi migrează.',
    source: 'Sursă', format: 'Format', entity: 'Tip entitate', auto: 'Auto',
    paste: 'Lipește conținutul CSV/XML aici…', import: 'Importă', importing: 'Se importă…',
    mapping: 'Mapare câmpuri', preview: 'Previzualizare', reconcile: 'Reconciliere',
    sourceCol: 'Coloană sursă', targetField: 'Câmp țintă', ignore: '— ignoră —',
    autoMap: 'Mapare automată', saveTpl: 'Salvează șablon', loadTpl: 'Șablon salvat aplicat',
    controlTotal: 'Total control', ready: 'Gata de migrare', notReady: 'Erori de corectat',
    valid: 'Valide', warning: 'Avertismente', error: 'Erori', discard: 'Renunță', row: 'Rând',
    noData: 'Importă un fișier pentru a începe.' },
  en: { title: 'Data Migration', subtitle: 'Import from SAGA, map fields, validate — then migrate.',
    source: 'Source', format: 'Format', entity: 'Entity type', auto: 'Auto',
    paste: 'Paste CSV/XML content here…', import: 'Import', importing: 'Importing…',
    mapping: 'Field mapping', preview: 'Preview', reconcile: 'Reconciliation',
    sourceCol: 'Source column', targetField: 'Target field', ignore: '— ignore —',
    autoMap: 'Auto-map', saveTpl: 'Save template', loadTpl: 'Saved template applied',
    controlTotal: 'Control total', ready: 'Ready to migrate', notReady: 'Errors to fix',
    valid: 'Valid', warning: 'Warnings', error: 'Errors', discard: 'Discard', row: 'Row',
    noData: 'Import a file to begin.' },
};

const statusPill: Record<RowStatus, string> = {
  valid: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

export default function DataMigrationPage() {
  const routeParams = useParams();
  const locale = (Array.isArray(routeParams?.locale) ? routeParams.locale[0] : routeParams?.locale) || 'ro';
  const t = locale === 'en' ? T.en : T.ro;

  const [format, setFormat] = useState<'csv' | 'xml'>('csv');
  const [entity, setEntity] = useState<'' | Entity>('');
  const [content, setContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StageResult | null>(null);
  const [rows, setRows] = useState<StagedRow[]>([]);
  const [dry, setDry] = useState<DryRun | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // sourceCol -> targetField

  const sourceCols = useMemo(() => (rows[0] ? Object.keys(rows[0].rawData) : []), [rows]);

  const autoMap = (cols: string[], ent: Entity): Record<string, string> => {
    const m: Record<string, string> = {};
    for (const col of cols) {
      const lc = col.toLowerCase().trim();
      const target = TARGETS[ent].find((tf) => ALIASES[tf]?.includes(lc));
      if (target) m[col] = target;
    }
    return m;
  };

  const doImport = async () => {
    if (!content.trim()) return;
    setImporting(true); setError(null); setResult(null); setRows([]); setDry(null);
    const res = await api.post<StageResult>('/migration/import', { format, content, entityType: entity || undefined });
    if (res.error || !res.data) { setError(res.error || 'Import failed'); setImporting(false); return; }
    const r = res.data;
    setResult(r);
    const [rowsRes, dryRes] = await Promise.all([
      api.get<StagedRow[]>(`/migration/batches/${r.batchId}`),
      api.get<DryRun>(`/migration/batches/${r.batchId}/dry-run`),
    ]);
    const loaded = Array.isArray(rowsRes.data) ? rowsRes.data : [];
    setRows(loaded);
    if (dryRes.data) setDry(dryRes.data);
    // auto-map + apply saved template if present
    const cols = loaded[0] ? Object.keys(loaded[0].rawData) : [];
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`migmap:${r.entityType}`) : null;
    setMapping(saved ? JSON.parse(saved) : autoMap(cols, r.entityType));
    setImporting(false);
  };

  const discard = async () => {
    if (!result) return;
    await api.delete(`/migration/batches/${result.batchId}`);
    setResult(null); setRows([]); setDry(null); setMapping({});
  };

  const saveTemplate = () => {
    if (result && typeof window !== 'undefined') localStorage.setItem(`migmap:${result.entityType}`, JSON.stringify(mapping));
  };

  const previewRows = useMemo<Record<string, any>[]>(() => rows.slice(0, 8).map((r) => {
    const out: Record<string, any> = {};
    for (const [src, tgt] of Object.entries(mapping)) if (tgt) out[tgt] = r.rawData[src];
    return { ...out, _status: r.status };
  }), [rows, mapping]);
  const mappedTargets = useMemo(() => Array.from(new Set(Object.values(mapping).filter(Boolean))), [mapping]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-serif font-semibold flex items-center gap-2"><Database className="h-6 w-6 text-teal-600" /> {t.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t.subtitle}</p>
      </div>

      {/* Import panel */}
      <Card><CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center text-sm">
          <label className="flex items-center gap-1.5">{t.format}
            <select className="border rounded px-2 py-1 bg-background" value={format} onChange={(e) => setFormat(e.target.value as any)}>
              <option value="csv">CSV</option><option value="xml">XML / SAF-T</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5">{t.entity}
            <select className="border rounded px-2 py-1 bg-background" value={entity} onChange={(e) => setEntity(e.target.value as any)}>
              <option value="">{t.auto}</option><option value="customer">customer</option><option value="product">product</option><option value="invoice">invoice</option>
            </select>
          </label>
          <Button size="sm" disabled={importing || !content.trim()} onClick={doImport} className="ml-auto">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {importing ? t.importing : t.import}
          </Button>
        </div>
        <textarea className="w-full h-28 border rounded p-2 font-mono text-xs bg-background" placeholder={t.paste} value={content} onChange={(e) => setContent(e.target.value)} />
        {error && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> {error}</p>}
      </CardContent></Card>

      {!result ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t.noData}</p>
      ) : (
        <>
          {/* Reconciliation summary */}
          {dry && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{t.row}s</div><p className="text-xl font-semibold tabular-nums">{dry.counts.total}</p></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" />{t.valid}</div><p className="text-xl font-semibold tabular-nums text-green-600">{dry.counts.valid}</p></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-600" />{t.warning}</div><p className="text-xl font-semibold tabular-nums text-amber-600">{dry.counts.warning}</p></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-red-600" />{t.error}</div><p className="text-xl font-semibold tabular-nums text-red-600">{dry.counts.error}</p></CardContent></Card>
              <Card className={dry.ready ? 'border-green-500' : 'border-amber-500'}><CardContent className="p-4">
                <div className="text-xs text-muted-foreground">{dry.controlTotal !== undefined ? t.controlTotal : ''}</div>
                {dry.controlTotal !== undefined && <p className="text-lg font-semibold tabular-nums">{dry.controlTotal.toLocaleString(locale === 'en' ? 'en-GB' : 'ro-RO')}</p>}
                <p className={`text-xs mt-0.5 font-medium ${dry.ready ? 'text-green-600' : 'text-amber-600'}`}>{dry.ready ? t.ready : t.notReady}</p>
              </CardContent></Card>
            </div>
          )}

          <Tabs defaultValue="mapping">
            <TabsList>
              <TabsTrigger value="mapping">{t.mapping}</TabsTrigger>
              <TabsTrigger value="preview">{t.preview}</TabsTrigger>
              <TabsTrigger value="reconcile">{t.reconcile}</TabsTrigger>
            </TabsList>

            {/* Mapping */}
            <TabsContent value="mapping" className="mt-4">
              <Card><CardContent className="p-4">
                <div className="flex justify-end gap-2 mb-3">
                  <Button size="sm" variant="outline" onClick={() => setMapping(autoMap(sourceCols, result.entityType))}><Wand2 className="h-4 w-4" /> {t.autoMap}</Button>
                  <Button size="sm" variant="outline" onClick={saveTemplate}><Save className="h-4 w-4" /> {t.saveTpl}</Button>
                </div>
                <div className="space-y-2">
                  {sourceCols.map((col) => (
                    <div key={col} className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-xs bg-muted rounded px-2 py-1 w-40 truncate">{col}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <select className="border rounded px-2 py-1 bg-background min-w-[160px]" value={mapping[col] || ''} onChange={(e) => setMapping((m) => ({ ...m, [col]: e.target.value }))}>
                        <option value="">{t.ignore}</option>
                        {TARGETS[result.entityType].map((tf) => <option key={tf} value={tf}>{tf}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </CardContent></Card>
            </TabsContent>

            {/* Preview */}
            <TabsContent value="preview" className="mt-4">
              <Card><CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs min-w-[520px]">
                  <thead><tr className="text-left text-muted-foreground border-b">
                    <th className="p-2">#</th>{mappedTargets.map((tf) => <th key={tf} className="p-2">{tf}</th>)}<th className="p-2"></th>
                  </tr></thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        {mappedTargets.map((tf) => <td key={tf} className="p-2 font-mono">{String(r[tf] ?? '')}</td>)}
                        <td className="p-2"><span className={`px-1.5 py-0.5 rounded ${statusPill[r._status as RowStatus]}`}>{r._status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent></Card>
            </TabsContent>

            {/* Reconciliation errors */}
            <TabsContent value="reconcile" className="mt-4">
              <Card><CardContent className="p-4">
                {dry && dry.errorSamples.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {dry.errorSamples.map((e) => (
                      <li key={e.rowIndex} className="flex items-start gap-2">
                        <span className="font-mono text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded px-1.5 py-0.5 shrink-0">{t.row} {e.rowIndex + 1}</span>
                        <span className="text-muted-foreground">{e.errors.join('; ')}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-green-600 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> {t.ready}</p>}
              </CardContent></Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button variant="ghost" className="text-red-600" onClick={discard}><Trash2 className="h-4 w-4" /> {t.discard}</Button>
          </div>
        </>
      )}
    </div>
  );
}
