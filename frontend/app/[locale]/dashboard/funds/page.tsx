'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Landmark, CheckCircle2, XCircle, Search, Save } from 'lucide-react';
import { api } from '@/lib/api';

type Criterion = { criterion: string; pass: boolean; reason: string };
type FilterResult = { filter: string; pass: boolean; reason: string };
type Match = {
  programId: string; programName: string; eligible: boolean; perFilter: FilterResult[];
  size: string; nuts2?: string; effectiveIntensityPct?: number; coFinPct?: number; estMaxGrantEur?: number;
};

const t = (ro: boolean, r: string, e: string) => (ro ? r : e);

export default function FundsPage() {
  const params = useParams();
  const locale = (Array.isArray(params?.locale) ? params.locale[0] : params?.locale) || 'ro';
  const ro = locale !== 'en';

  const [profile, setProfile] = useState<any>({ caenPrimary: '', headcount: '', turnoverEur: '', foundedDate: '', subscribedCapitalEur: '', accumulatedLossEur: '', anafDebt: false, insolvent: false });
  const [requestedCostEur, setRequestedCostEur] = useState('100000');
  const [projectType, setProjectType] = useState('digitalization');
  const [precheck, setPrecheck] = useState<{ eligible: boolean; criteria: Criterion[]; leadId: string } | null>(null);
  const [matches, setMatches] = useState<{ deMinimisHeadroomEur: number; eligibleCount: number; matches: Match[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    const r = await api.get<any>('/funds/profile');
    if (r.data) setProfile((p: any) => ({ ...p, ...r.data, foundedDate: r.data.foundedDate?.slice(0, 10) ?? '' }));
  }, []);
  useEffect(() => { loadProfile(); }, [loadProfile]);

  const saveProfile = async () => {
    setSaving(true);
    const body: any = { ...profile };
    ['headcount', 'turnoverEur', 'subscribedCapitalEur', 'accumulatedLossEur', 'balanceSheetEur', 'equityEur']
      .forEach((k) => { if (body[k] === '' || body[k] == null) delete body[k]; else body[k] = Number(body[k]); });
    if (!body.foundedDate) delete body.foundedDate;
    await api.post('/funds/profile', body);
    setSaving(false);
  };

  const run = async () => {
    setLoading(true);
    await saveProfile();
    const pc = await api.post<any>('/funds/precheck', { requestedType: projectType, requestedCostEur: Number(requestedCostEur) });
    if (pc.data) setPrecheck(pc.data);
    const m = await api.post<any>('/funds/match', { requestedCostEur: Number(requestedCostEur), projectType });
    if (m.data) setMatches(m.data);
    setLoading(false);
  };

  const critLabel: Record<string, [string, string]> = {
    enterprise_size: ['Dimensiune întreprindere', 'Enterprise size'],
    age: ['Vechime (≥1 an fiscal)', 'Age (≥1 fiscal year)'],
    firm_in_difficulty: ['Firmă în dificultate', 'Firm in difficulty'],
    anaf_debt: ['Datorii ANAF', 'ANAF debt'],
    insolvency: ['Insolvență', 'Insolvency'],
    de_minimis_headroom: ['Plafon de minimis', 'De minimis headroom'],
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold flex items-center gap-2">
          <Landmark className="h-6 w-6 text-teal-600" /> {t(ro, 'Finanțări & Fonduri', 'Funds & Financing')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t(ro, 'Verificare eligibilitate și potrivire cu programele de finanțare deschise (7 filtre).', 'Eligibility pre-check and matching against open funding programs (7 filters).')}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t(ro, 'Profil firmă', 'Company profile')}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div><Label>{t(ro, 'CAEN principal', 'Primary CAEN')}</Label><Input value={profile.caenPrimary ?? ''} onChange={(e) => setProfile({ ...profile, caenPrimary: e.target.value })} placeholder="6201" /></div>
          <div><Label>{t(ro, 'Nr. angajați', 'Headcount')}</Label><Input type="number" value={profile.headcount ?? ''} onChange={(e) => setProfile({ ...profile, headcount: e.target.value })} /></div>
          <div><Label>{t(ro, 'Cifră afaceri (EUR)', 'Turnover (EUR)')}</Label><Input type="number" value={profile.turnoverEur ?? ''} onChange={(e) => setProfile({ ...profile, turnoverEur: e.target.value })} /></div>
          <div><Label>{t(ro, 'Dată înființare', 'Founded date')}</Label><Input type="date" value={profile.foundedDate ?? ''} onChange={(e) => setProfile({ ...profile, foundedDate: e.target.value })} /></div>
          <div><Label>{t(ro, 'Capital subscris (EUR)', 'Subscribed capital (EUR)')}</Label><Input type="number" value={profile.subscribedCapitalEur ?? ''} onChange={(e) => setProfile({ ...profile, subscribedCapitalEur: e.target.value })} /></div>
          <div><Label>{t(ro, 'Pierderi acumulate (EUR)', 'Accumulated loss (EUR)')}</Label><Input type="number" value={profile.accumulatedLossEur ?? ''} onChange={(e) => setProfile({ ...profile, accumulatedLossEur: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm mt-2"><input type="checkbox" checked={!!profile.anafDebt} onChange={(e) => setProfile({ ...profile, anafDebt: e.target.checked })} />{t(ro, 'Datorii ANAF', 'ANAF debt')}</label>
          <label className="flex items-center gap-2 text-sm mt-2"><input type="checkbox" checked={!!profile.insolvent} onChange={(e) => setProfile({ ...profile, insolvent: e.target.checked })} />{t(ro, 'Insolvență', 'Insolvent')}</label>
          <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={saveProfile} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t(ro, 'Salvează profil', 'Save profile')}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div><Label>{t(ro, 'Cost proiect (EUR)', 'Project cost (EUR)')}</Label><Input type="number" value={requestedCostEur} onChange={(e) => setRequestedCostEur(e.target.value)} /></div>
          <div><Label>{t(ro, 'Tip proiect', 'Project type')}</Label><Input value={projectType} onChange={(e) => setProjectType(e.target.value)} /></div>
          <Button onClick={run} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} {t(ro, 'Verifică & potrivește', 'Check & match')}</Button>
        </CardContent>
      </Card>

      {precheck && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2">{t(ro, 'Pre-verificare eligibilitate', 'Eligibility pre-check')}{precheck.eligible ? <Badge className="bg-emerald-600">{t(ro, 'Eligibil', 'Eligible')}</Badge> : <Badge variant="destructive">{t(ro, 'Neeligibil', 'Not eligible')}</Badge>}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {precheck.criteria.map((c) => (
              <div key={c.criterion} className="flex items-start gap-2 text-sm">
                {c.pass ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                <span className="font-medium w-48 shrink-0">{(critLabel[c.criterion]?.[ro ? 0 : 1]) ?? c.criterion}</span>
                <span className="text-muted-foreground">{c.reason}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1">{t(ro, 'Salvat ca lead', 'Saved as lead')}: {precheck.leadId}</p>
          </CardContent>
        </Card>
      )}

      {matches && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t(ro, 'Programe potrivite', 'Matched programs')} — {matches.eligibleCount} {t(ro, 'eligibile', 'eligible')} · {t(ro, 'plafon de minimis', 'de minimis headroom')} €{matches.deMinimisHeadroomEur.toLocaleString()}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {matches.matches.map((m) => (
              <div key={m.programId} className="border rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{m.programName}</span>
                  {m.eligible
                    ? <Badge className="bg-emerald-600">{t(ro, 'Eligibil', 'Eligible')} · ~€{(m.estMaxGrantEur ?? 0).toLocaleString()}</Badge>
                    : <Badge variant="outline">{t(ro, 'Neeligibil', 'Not eligible')}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{t(ro, 'Dimensiune', 'Size')}: {m.size}{m.nuts2 ? ` · ${m.nuts2}` : ''}{m.effectiveIntensityPct != null ? ` · ${t(ro, 'intensitate', 'intensity')} ${m.effectiveIntensityPct}%` : ''}{m.coFinPct != null ? ` · co-fin ${m.coFinPct}%` : ''}</div>
                <div className="grid gap-1 mt-2 sm:grid-cols-2">
                  {m.perFilter.map((f) => (
                    <div key={f.filter} className="flex items-start gap-1.5 text-xs">
                      {f.pass ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" /> : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />}
                      <span className="text-muted-foreground"><span className="font-medium text-foreground">{f.filter}</span>: {f.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
