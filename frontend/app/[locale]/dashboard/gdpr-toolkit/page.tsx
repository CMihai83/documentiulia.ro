'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, FileText, Cookie, Loader2, CheckCircle2, AlertTriangle, Copy } from 'lucide-react';
import { api } from '@/lib/api';

type Tab = 'ropa' | 'policies' | 'banner';

export default function GdprToolkitPage() {
  const params = useParams();
  const locale = (Array.isArray(params?.locale) ? params.locale[0] : params?.locale) || 'ro';
  const ro = locale !== 'en';
  const [tab, setTab] = useState<Tab>('ropa');
  const [ropa, setRopa] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [cmp, setCmp] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [r, v, c] = await Promise.all([
      api.get<any>('/gdpr-ext/ropa'),
      api.get<any>('/gdpr-ext/policy/versions'),
      api.get<any>('/gdpr-ext/cmp/config'),
    ]);
    setRopa(Array.isArray(r.data) ? r.data : []);
    setVersions(Array.isArray(v.data) ? v.data : []); // 403 on FREE → stays empty (PRO feature)
    setCmp(c.data ?? null);
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true); setMsg('');
    const r = await fn();
    setBusy(false);
    setMsg(r?.error ? String(r.error) : ok);
    if (!r?.error) load();
  };

  const embed = cmp
    ? `<script src="https://documentiulia.ro/api/v1/gdpr-public/cmp/ORG_SLUG.js" defer></script>\n<!-- ${ro ? 'scripturile blocate până la consimțământ' : 'scripts blocked until consent'}: -->\n<script type="text/plain" data-gdpr-category="analytics" src="https://example.com/analytics.js"></script>`
    : '';

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-serif font-semibold flex items-center gap-2">
          <Shield className="h-6 w-6 text-teal-600" /> GDPR Toolkit
        </h1>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          {ro
            ? 'Instrumentele GDPR sunt informative și nu constituie consultanță juridică.'
            : 'These GDPR tools are informational and do not constitute legal advice.'}
        </p>
      </div>

      <div className="flex gap-2">
        {(['ropa', 'policies', 'banner'] as Tab[]).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)}>
            {t === 'ropa' ? (ro ? 'Registru (RoPA)' : 'RoPA register') : t === 'policies' ? (ro ? 'Politici' : 'Policies') : 'Banner'}
          </Button>
        ))}
      </div>

      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

      {tab === 'ropa' && (
        <Card><CardContent className="p-5 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" disabled={busy} onClick={() => act(() => api.post('/gdpr-ext/ropa/seed', {}), ro ? 'Registru generat din datele ERP.' : 'Register seeded from ERP data.')}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (ro ? 'Generează din ERP (PRO)' : 'Seed from ERP (PRO)')}
            </Button>
            {['accounting-practice', 'ecommerce', 'services'].map((t) => (
              <Button key={t} size="sm" variant="outline" disabled={busy} onClick={() => act(() => api.post(`/gdpr-ext/ropa/template/${t}`, {}), ro ? 'Șablon aplicat.' : 'Template applied.')}>
                {t}
              </Button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground border-b">
                <th className="py-2 pr-3">{ro ? 'Proces' : 'Process'}</th><th className="pr-3">{ro ? 'Rol' : 'Role'}</th>
                <th className="pr-3">{ro ? 'Temei' : 'Basis'}</th><th className="pr-3">{ro ? 'Păstrare' : 'Retention'}</th>
                <th className="pr-3">Art. 30</th></tr></thead>
              <tbody>
                {ropa.map((e) => (
                  <tr key={e.id} className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium">{e.processName}
                      {(e.specialCategories ?? []).length > 0 && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">CNP</span>}
                    </td>
                    <td className="pr-3">{e.role}</td>
                    <td className="pr-3 text-muted-foreground text-xs max-w-[220px] truncate">{e.legalBasis}</td>
                    <td className="pr-3 tabular-nums">{e.retentionMonths ? `${e.retentionMonths} ${ro ? 'luni' : 'mo'}` : '—'}</td>
                    <td className="pr-3">
                      <span className={`inline-flex items-center gap-1 text-xs ${e.completeness?.pct === 100 ? 'text-teal-600' : 'text-amber-600'}`}>
                        {e.completeness?.pct === 100 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        {e.completeness?.pct ?? 0}%
                      </span>
                    </td>
                  </tr>
                ))}
                {ropa.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">{ro ? 'Registrul este gol — generați din ERP sau aplicați un șablon.' : 'Register is empty — seed from ERP or apply a template.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      )}

      {tab === 'policies' && (
        <Card><CardContent className="p-5 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(['privacy', 'cookie'] as const).map((k) => (
              <Button key={k} size="sm" disabled={busy} onClick={() => act(() => api.post('/gdpr-ext/policy/generate', { kind: k, locale }), ro ? 'Politică generată (draft).' : 'Policy generated (draft).')}>
                <FileText className="h-4 w-4 mr-1" /> {k === 'privacy' ? (ro ? 'Politica de confidențialitate' : 'Privacy policy') : (ro ? 'Politica de cookie-uri' : 'Cookie policy')}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                <span>{v.kind} · v{v.version} · {v.locale} · <span className={v.status === 'published' ? 'text-teal-600' : 'text-muted-foreground'}>{v.status}</span></span>
                {v.status !== 'published' && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => api.post(`/gdpr-ext/policy/${v.id}/publish`, {}), ro ? 'Publicată.' : 'Published.')}>
                    {ro ? 'Publică' : 'Publish'}
                  </Button>
                )}
              </div>
            ))}
            {versions.length === 0 && <p className="text-sm text-muted-foreground">{ro ? 'Versiunile apar aici (istoricul complet necesită PRO).' : 'Versions appear here (full history requires PRO).'}</p>}
          </div>
        </CardContent></Card>
      )}

      {tab === 'banner' && cmp && (
        <Card><CardContent className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            {ro ? 'Banner de consimțământ cu blocare prealabilă și buton de refuz cu vizibilitate egală. Versiune banner:' : 'Consent banner with prior blocking and an equal-prominence reject button. Banner version:'} <strong>{cmp.bannerVersion}</strong>
          </p>
          <div className="bg-muted rounded-lg p-3 font-mono text-xs whitespace-pre-wrap break-all">{embed}</div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(embed); setMsg(ro ? 'Copiat.' : 'Copied.'); }}>
              <Copy className="h-4 w-4 mr-1" /> {ro ? 'Copiază snippetul' : 'Copy snippet'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => act(() => api.get('/gdpr-ext/cmp/consents.csv'), ro ? 'Export generat (PRO).' : 'Export generated (PRO).')}>
              <Cookie className="h-4 w-4 mr-1" /> {ro ? 'Dovadă consimțământ (CSV, PRO)' : 'Proof of consent (CSV, PRO)'}
            </Button>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
