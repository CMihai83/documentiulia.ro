'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, FileText, Cookie, Loader2, CheckCircle2, AlertTriangle, Copy } from 'lucide-react';
import { api } from '@/lib/api';

type Tab = 'ropa' | 'policies' | 'banner' | 'dsar' | 'breach' | 'dpia' | 'vendors' | 'tools';

export default function GdprToolkitPage() {
  const params = useParams();
  const locale = (Array.isArray(params?.locale) ? params.locale[0] : params?.locale) || 'ro';
  const ro = locale !== 'en';
  const [tab, setTab] = useState<Tab>('ropa');
  const [ropa, setRopa] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [cmp, setCmp] = useState<any | null>(null);
  const [dsar, setDsar] = useState<any[]>([]);
  const [breaches, setBreaches] = useState<any[]>([]);
  const [dpia, setDpia] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [scanUrl, setScanUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [r, v, c] = await Promise.all([
      api.get<any>('/gdpr-ext/ropa'),
      api.get<any>('/gdpr-ext/policy/versions'),
      api.get<any>('/gdpr-ext/cmp/config'),
    ]);
    setRopa(Array.isArray(r.data) ? r.data : []);
    const [dq, bq] = await Promise.all([api.get('/gdpr-ext/dsar').catch(() => ({ data: [] })), api.get('/gdpr-ext/breach').catch(() => ({ data: [] }))]);
    setDsar(Array.isArray(dq.data) ? dq.data : []);
    setBreaches(Array.isArray(bq.data) ? bq.data : []);
    setVersions(Array.isArray(v.data) ? v.data : []); // 403 on FREE → stays empty (PRO feature)
    setCmp(c.data ?? null);
    // S-63 (BUSINESS): DPIA + vendors — 403 on lower tiers stays empty
    const [pq, vq] = await Promise.all([api.get('/gdpr-ext/dpia').catch(() => ({ data: [] })), api.get('/gdpr-ext/vendors').catch(() => ({ data: [] }))]);
    setDpia(Array.isArray(pq.data) ? pq.data : []);
    setVendors(Array.isArray(vq.data) ? vq.data : []);
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

      <div className="flex gap-2 flex-wrap">
        {(['ropa', 'policies', 'banner', 'dsar', 'breach', 'dpia', 'vendors', 'tools'] as Tab[]).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)}>
            {t === 'ropa' ? (ro ? 'Registru (RoPA)' : 'RoPA register') : t === 'policies' ? (ro ? 'Politici' : 'Policies') : t === 'banner' ? 'Banner' : t === 'dsar' ? (ro ? 'DSAR (PRO)' : 'DSAR (PRO)') : t === 'breach' ? (ro ? 'Incidente (BUSINESS)' : 'Breaches (BUSINESS)') : t === 'dpia' ? (ro ? 'DPIA (BUSINESS)' : 'DPIA (BUSINESS)') : t === 'vendors' ? (ro ? 'Furnizori/DPA (BUSINESS)' : 'Vendors/DPA (BUSINESS)') : (ro ? 'Instrumente (PRO)' : 'Tools (PRO)')}
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

      {tab === 'dsar' && (
        <Card><CardContent className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">{ro ? 'Cereri ale persoanelor vizate (Art. 15-22). Termen: 1 lună de la primire, extensibil cu 2 luni. Intake public: /api/v1/gdpr-public/dsar/{slug}.' : 'Data-subject requests (Art. 15-22). Deadline: 1 month, extendable by 2. Public intake: /api/v1/gdpr-public/dsar/{slug}.'}</p>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b"><th className="py-2 pr-3">{ro ? 'Tip' : 'Type'}</th><th className="pr-3">Status</th><th className="pr-3">{ro ? 'Termen' : 'Due'}</th><th className="pr-3">{ro ? 'Acțiuni' : 'Actions'}</th></tr></thead>
            <tbody>
              {dsar.map((r) => (
                <tr key={r.id} className="border-b border-border/50">
                  <td className="py-2 pr-3 font-medium">{r.type}</td>
                  <td className="pr-3">{r.status}{r.verified ? ' ✓' : ''}</td>
                  <td className={`pr-3 tabular-nums text-xs ${r.isOverdue ? 'text-red-600 font-semibold' : ''}`}>{new Date(r.extendedTo ?? r.dueAt).toLocaleDateString(ro ? 'ro-RO' : 'en-GB')}{r.isOverdue ? (ro ? ' (depășit)' : ' (overdue)') : ''}</td>
                  <td className="pr-3 space-x-1">
                    {!r.verified && <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => api.post(`/gdpr-ext/dsar/${r.id}/verify`, { providedTier: r.verificationTier }), ro ? 'Verificat.' : 'Verified.')}>{ro ? 'Verifică' : 'Verify'}</Button>}
                    {r.verified && r.type === 'erasure' && <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => api.post(`/gdpr-ext/dsar/${r.id}/erase`, {}), ro ? 'Procesat (restricționare fiscală).' : 'Processed (fiscal restriction).')}>{ro ? 'Șterge' : 'Erase'}</Button>}
                    {r.verified && r.type !== 'erasure' && <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => api.post(`/gdpr-ext/dsar/${r.id}/export`, {}), ro ? 'Export generat.' : 'Export generated.')}>{ro ? 'Export' : 'Export'}</Button>}
                  </td>
                </tr>
              ))}
              {dsar.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">{ro ? 'Nicio cerere. Necesită planul PRO.' : 'No requests. Requires PRO.'}</td></tr>}
            </tbody>
          </table></div>
        </CardContent></Card>
      )}

      {tab === 'breach' && (
        <Card><CardContent className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">{ro ? 'Registru incidente (Art. 33/34). Notificare ANSPDCP în 72h. Draft generat automat — nu se transmite automat.' : 'Breach register (Art. 33/34). 72h ANSPDCP notification. Draft generated — never auto-submitted.'}</p>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => api.get('/gdpr-ext/breach/register'), ro ? 'Registru generat.' : 'Register generated.')}>{ro ? 'Registru Art. 33(5)' : 'Art. 33(5) register'}</Button>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b"><th className="py-2 pr-3">{ro ? 'Descriere' : 'Description'}</th><th className="pr-3">{ro ? 'Severitate' : 'Severity'}</th><th className="pr-3">{ro ? 'Termen 72h' : '72h due'}</th><th className="pr-3">{ro ? 'Notificat' : 'Notified'}</th></tr></thead>
            <tbody>
              {breaches.map((b) => (
                <tr key={b.id} className="border-b border-border/50">
                  <td className="py-2 pr-3 max-w-[240px] truncate">{b.description}</td>
                  <td className="pr-3"><span className={`text-xs px-1.5 py-0.5 rounded ${b.severity === 'very_high' || b.severity === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'}`}>{b.severity}</span></td>
                  <td className={`pr-3 tabular-nums text-xs ${b.hoursRemaining < 0 ? 'text-red-600 font-semibold' : b.hoursRemaining < 24 ? 'text-amber-600' : ''}`}>{b.hoursRemaining}h</td>
                  <td className="pr-3">{b.notified ? '✓' : (b.notNotifiedReason ? (ro ? 'Nu (motivat)' : 'No (justified)') : '—')}</td>
                </tr>
              ))}
              {breaches.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">{ro ? 'Niciun incident. Necesită planul BUSINESS.' : 'No incidents. Requires BUSINESS.'}</td></tr>}
            </tbody>
          </table></div>
        </CardContent></Card>
      )}

      {tab === 'dpia' && (
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground mb-3">{ro ? 'Evaluări de impact (DPIA) — screening Art. 35 (WP248 + ANSPDCP 174/2018), matrice de risc și verificarea monitorizării angajaților (Legea 190/2018 art. 5). Deschideți o intrare RoPA pentru a porni un screening.' : 'Data Protection Impact Assessments — Art. 35 screening (WP248 + ANSPDCP 174/2018), risk matrix, and the Law-190 employee-monitoring wizard. Start a screening from a RoPA entry.'}</p>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b"><th className="py-2 pr-3">RoPA</th><th className="pr-3">{ro ? 'Verdict' : 'Verdict'}</th><th className="pr-3">{ro ? 'Risc rezidual' : 'Residual'}</th><th className="pr-3">Status</th></tr></thead>
            <tbody>
              {dpia.map((a) => (
                <tr key={a.id} className="border-b border-line-soft">
                  <td className="py-2 pr-3 font-mono text-xs">{a.ropaEntryId?.slice(0, 8)}</td>
                  <td className="pr-3"><span className={`text-xs px-1.5 py-0.5 rounded ${a.verdict === 'required' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' : a.verdict === 'recommended' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{a.verdict}</span></td>
                  <td className="pr-3 text-xs">{a.residualBand ?? '—'}</td>
                  <td className="pr-3 text-xs">{a.status}{a.status === 'blocked' && <span className="ml-1 text-red-600">🔒</span>}</td>
                </tr>
              ))}
              {dpia.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">{ro ? 'Nicio evaluare. Necesită planul BUSINESS.' : 'No assessments. Requires BUSINESS.'}</td></tr>}
            </tbody>
          </table></div>
        </CardContent></Card>
      )}

      {tab === 'vendors' && (
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground mb-3">{ro ? 'Registru furnizori / împuterniciți: generator DPA (Art. 28), modul SCC 2021/914, TIA și listă publică de sub-împuterniciți cu drept de obiecție.' : 'Vendor/processor register: Art-28 DPA generator, SCC 2021/914 module, TIA, and a public sub-processor list with objection rights.'}</p>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b"><th className="py-2 pr-3">{ro ? 'Furnizor' : 'Vendor'}</th><th className="pr-3">{ro ? 'Rol' : 'Role'}</th><th className="pr-3">{ro ? 'Țară' : 'Country'}</th><th className="pr-3">{ro ? 'Public' : 'Published'}</th></tr></thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="border-b border-line-soft">
                  <td className="py-2 pr-3">{v.name}</td>
                  <td className="pr-3 text-xs">{v.role}</td>
                  <td className="pr-3 text-xs">{v.country}{!v.isEu && ' 🌍'}</td>
                  <td className="pr-3">{v.published ? '✓' : '—'}</td>
                </tr>
              ))}
              {vendors.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">{ro ? 'Niciun furnizor. Necesită planul BUSINESS.' : 'No vendors. Requires BUSINESS.'}</td></tr>}
            </tbody>
          </table></div>
        </CardContent></Card>
      )}

      {tab === 'tools' && (
        <Card><CardContent className="p-4 space-y-4">
          <div>
            <h3 className="font-semibold text-sm mb-1">{ro ? 'Instruire GDPR (LMS)' : 'GDPR training (LMS)'}</h3>
            <p className="text-xs text-muted-foreground mb-2">{ro ? 'Cursuri pe roluri; o finalizare validă (12 luni) satisface automat condiția de instruire din Legea 190/2018.' : 'Role-based courses; a valid completion (12 months) auto-satisfies the Law-190 training condition.'}</p>
            <div className="flex gap-2">
              <Button size="sm" disabled={busy} onClick={() => act(() => api.post('/gdpr-ext/training/seed', {}), ro ? 'Cursuri create.' : 'Courses seeded.')}>{ro ? 'Creează cursuri' : 'Seed courses'}</Button>
              <a href="/api/v1/gdpr-ext/training/evidence.csv"><Button size="sm" variant="outline">{ro ? 'Export dovezi (CSV)' : 'Evidence CSV'}</Button></a>
            </div>
          </div>
          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-1">{ro ? 'Export complet cont (Data Act / Art. 20)' : 'Full account export (Data Act / Art. 20)'}</h3>
            <a href="/api/v1/gdpr-ext/export/full"><Button size="sm" variant="outline">{ro ? 'Descarcă arhiva ZIP' : 'Download ZIP'}</Button></a>
          </div>
          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-1">{ro ? 'Scanare cookie-uri (statică)' : 'Cookie scan (static)'}</h3>
            <div className="flex gap-2">
              <input value={scanUrl} onChange={(e) => setScanUrl(e.target.value)} placeholder="https://site.ro" className="h-9 px-3 rounded-md border bg-background text-sm flex-1" />
              <Button size="sm" disabled={busy || !scanUrl} onClick={() => act(() => api.post('/gdpr-ext/cmp/scan', { url: scanUrl }), ro ? 'Scanare finalizată — vezi categoriile propuse.' : 'Scan done — see proposed categories.')}>{ro ? 'Scanează' : 'Scan'}</Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{ro ? 'Scanare statică a unei singure pagini; nu înlocuiește un crawl complet.' : 'Static single-page scan; not a full crawl.'}</p>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
