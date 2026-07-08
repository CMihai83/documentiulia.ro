'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, GraduationCap, Target, Route, Sparkles, Users2 } from 'lucide-react';
import { api } from '@/lib/api';

const t = (ro: boolean, r: string, e: string) => (ro ? r : e);

type Occupation = { escoUri: string; label: string };
type Gap = { skillId: string; label: string; relation: string; requiredLevel: number; currentLevel: number; deficit: number; weight: number; resources?: { id: string; title: string }[] };
type RadarAxis = { label: string; required: number; current: number };
type GapResult = { occupation: string; readiness: number; radar: RadarAxis[]; gaps: Gap[] };
type Step = { order: number; kind: string; skillId?: string; title: string; estMinutes: number };
type Path = { id: string; title: string; difficulty: string; estTotalMinutes: number; steps: Step[] };

const OCCUPATIONS: Occupation[] = [
  { escoUri: 'http://data.europa.eu/esco/occupation/accountant', label: 'Contabil' },
  { escoUri: 'http://data.europa.eu/esco/occupation/financial-manager', label: 'Manager financiar' },
  { escoUri: 'http://data.europa.eu/esco/occupation/entrepreneur', label: 'Antreprenor' },
];
const DIFFICULTIES = ['gentle', 'standard', 'intensive'] as const;

export default function ExpertisePage() {
  const params = useParams();
  const locale = (Array.isArray(params?.locale) ? params.locale[0] : params?.locale) || 'ro';
  const ro = locale !== 'en';

  const [target, setTarget] = useState(OCCUPATIONS[0].escoUri);
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('standard');
  const [gap, setGap] = useState<GapResult | null>(null);
  const [path, setPath] = useState<Path | null>(null);
  const [loading, setLoading] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const seed = useCallback(async () => {
    await api.post('/expertise/seed', {}).catch(() => {});
    setSeeded(true);
  }, []);
  useEffect(() => { seed(); }, [seed]);

  const analyse = useCallback(async () => {
    setLoading(true); setPath(null);
    try {
      const g = await api.post<GapResult>('/expertise/gap', { occupationUri: target });
      setGap(g.data ?? (g as any));
    } finally { setLoading(false); }
  }, [target]);

  const build = useCallback(async () => {
    setLoading(true);
    try {
      const p = await api.post<Path>('/expertise/path', { occupationUri: target, difficulty });
      setPath(p.data ?? (p as any));
    } finally { setLoading(false); }
  }, [target, difficulty]);

  // ---- EXP-10 expert profile (S-56) ----
  const [profile, setProfile] = useState<any | null>(null);
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const loadProfile = useCallback(async () => {
    const r = await api.get<any>('/expertise/me/profile').catch(() => null);
    if (r?.data) {
      setProfile(r.data);
      setHeadline(r.data.profile?.headline ?? '');
      setBio(r.data.profile?.bio ?? '');
    }
  }, []);
  useEffect(() => { loadProfile(); }, [loadProfile]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.post('/expertise/me/profile', { headline, bio });
      await loadProfile();
    } finally { setSavingProfile(false); }
  };
  const toggleVisibility = async () => {
    const next = !profile?.profile?.isPublic;
    await api.post('/expertise/me/profile/visibility', { isPublic: next });
    await loadProfile();
  };
  const claimCredential = async (escoUri: string) => {
    await api.post('/expertise/me/credentials/claim', { skillUri: escoUri }).catch(() => {});
    await loadProfile();
  };

  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const hrs = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

  // ---- S-57 EXP-11/12: coaching + marketplace ----
  const [coachRes, setCoachRes] = useState<any | null>(null);
  const [experts, setExperts] = useState<any[] | null>(null);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [mktBusy, setMktBusy] = useState(false);

  const runCoach = async () => {
    setMktBusy(true);
    const r = await api.post<any>('/expertise/coach', {}).catch(() => null);
    setCoachRes(r?.data ?? null);
    setMktBusy(false);
  };
  const loadMarketplace = async () => {
    setMktBusy(true);
    const [m, e] = await Promise.all([
      api.get<any>('/expertise/marketplace').catch(() => null),
      api.get<any>('/expertise/me/engagements').catch(() => null),
    ]);
    setExperts(m?.data?.experts ?? []);
    setEngagements(Array.isArray(e?.data) ? e.data : []);
    setMktBusy(false);
  };
  const toggleMarketplaceOptIn = async () => {
    const next = !profile?.profile?.marketplaceOptIn;
    await api.post('/expertise/me/marketplace', { optIn: next, sessionTypes: ['mentoring', 'business_plan_review', 'sim_debrief'] });
    await loadProfile();
  };
  const bookExpert = async (expertUserId: string) => {
    const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); // next Monday
    const iso = `${d.toISOString().slice(0, 10)}T10:00:00Z`;
    await api.post('/expertise/engagements', { expertUserId, sessionType: 'mentoring', scheduledAt: iso }).catch(() => {});
    await loadMarketplace();
  };
  const engAction = async (id: string, action: string) => {
    await api.post(`/expertise/engagements/${id}/${action}`, action === 'rate' ? { rating: 5 } : {}).catch(() => {});
    await loadMarketplace();
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-teal-600" /> {t(ro, 'Expertiză & Cariere', 'Expertise & Careers')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t(ro, 'Analiză de competențe față de o ocupație țintă și traseu de învățare personalizat.', 'Skill-gap analysis vs a target occupation and a personalised learning path.')}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> {t(ro, 'Ocupație țintă', 'Target occupation')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {OCCUPATIONS.map((o) => (
              <Button key={o.escoUri} size="sm" variant={target === o.escoUri ? 'default' : 'outline'} onClick={() => setTarget(o.escoUri)}>{o.label}</Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{t(ro, 'Dificultate:', 'Difficulty:')}</span>
            {DIFFICULTIES.map((d) => (
              <Button key={d} size="sm" variant={difficulty === d ? 'default' : 'outline'} onClick={() => setDifficulty(d)}>
                {d === 'gentle' ? t(ro, 'Lejer', 'Gentle') : d === 'intensive' ? t(ro, 'Intensiv', 'Intensive') : t(ro, 'Standard', 'Standard')}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={analyse} disabled={loading || !seeded}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}{t(ro, 'Analizează golurile', 'Analyse gaps')}</Button>
            <Button variant="outline" onClick={build} disabled={loading || !gap}><Route className="h-4 w-4 mr-1" />{t(ro, 'Construiește traseul', 'Build path')}</Button>
          </div>
        </CardContent>
      </Card>

      {gap && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t(ro, 'Goluri de competențe', 'Skill gaps')} — {gap.occupation} · {t(ro, 'pregătire', 'readiness')} {pct(gap.readiness)}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {gap.gaps.length === 0 && <p className="text-sm text-muted-foreground">{t(ro, 'Nicio lipsă — ești pregătit!', 'No gaps — you are ready!')}</p>}
            {gap.gaps.map((g) => (
              <div key={g.skillId} className="flex items-center justify-between border rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{g.label}</span>
                    <Badge variant={g.relation === 'essential' ? 'default' : 'secondary'} className="text-[10px]">{g.relation === 'essential' ? t(ro, 'esențial', 'essential') : t(ro, 'opțional', 'optional')}</Badge>
                  </div>
                  {g.resources && g.resources.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">{t(ro, 'Resurse:', 'Resources:')} {g.resources.map((r) => r.title).join(', ')}</p>
                  )}
                </div>
                <span className="text-xs tabular-nums text-muted-foreground shrink-0">{g.currentLevel} → {g.requiredLevel}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {profile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>{t(ro, 'Profil de expert', 'Expert profile')} · {t(ro, 'reputație', 'reputation')} {profile.reputation?.reputation ?? 0}/100</span>
              <Badge variant={profile.profile?.isPublic ? 'default' : 'secondary'} className="text-[10px]">
                {profile.profile?.publiclyVisible
                  ? t(ro, 'PUBLIC', 'PUBLIC')
                  : profile.profile?.isPublic
                    ? t(ro, 'opt-in (așteaptă activarea publică)', 'opted-in (awaiting public rollout)')
                    : t(ro, 'PRIVAT', 'PRIVATE')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder={t(ro, 'Titlu (ex: Expert contabilitate & TVA)', 'Headline (e.g. Accounting & VAT expert)')} className="border rounded-lg px-3 py-2 text-sm bg-transparent" />
              <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t(ro, 'Scurtă descriere', 'Short bio')} className="border rounded-lg px-3 py-2 text-sm bg-transparent" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={saveProfile} disabled={savingProfile}>{t(ro, 'Salvează profilul', 'Save profile')}</Button>
              <Button size="sm" variant="outline" onClick={toggleVisibility}>
                {profile.profile?.isPublic ? t(ro, 'Retrage consimțământul public', 'Withdraw public consent') : t(ro, 'Optează pentru profil public', 'Opt in to a public profile')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(ro,
                'Profilul este PRIVAT implicit. Optarea pentru public este un consimțământ explicit (înregistrat în jurnalul de audit); vizibilitatea publică efectivă se activează doar după avizul DPO.',
                'Your profile is PRIVATE by default. Opting in is explicit consent (recorded in the audit log); actual public visibility only activates after DPO clearance.')}
            </p>
            {profile.credentials?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium">{t(ro, 'Credențiale (Open Badges 3.0)', 'Credentials (Open Badges 3.0)')}</p>
                {profile.credentials.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                    <span className="text-sm truncate">{c.name ?? 'Credential'}{c.revoked ? ` — ${t(ro, 'revocat', 'revoked')}` : ''}</span>
                    <a className="text-xs text-teal-600 underline shrink-0" href={`/api/v1/expertise/verify/${c.verifyCode}`} target="_blank" rel="noreferrer">{t(ro, 'verifică public', 'verify publicly')}</a>
                  </div>
                ))}
              </div>
            )}
            {profile.skills?.some((sk: any) => sk.evidenceTier === 'verified' || (sk.evidenceTier === 'assessed' && sk.proficiency >= 4)) && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium">{t(ro, 'Competențe eligibile pentru credențial', 'Skills eligible for a credential')}</p>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.filter((sk: any) => sk.evidenceTier === 'verified' || (sk.evidenceTier === 'assessed' && sk.proficiency >= 4)).map((sk: any) => (
                    <Button key={sk.escoUri} size="sm" variant="outline" onClick={() => claimCredential(sk.escoUri)}>{t(ro, 'Emite credențial:', 'Claim credential:')} {sk.label}</Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> {t(ro, 'Coach de carieră', 'Career coach')}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Button size="sm" onClick={runCoach} disabled={mktBusy || !seeded}>{t(ro, 'Sugerează următorii pași', 'Suggest next moves')}</Button>
          {coachRes?.suggestions?.map((sg: any) => (
            <div key={sg.escoUri} className="flex items-center gap-3 border rounded-lg px-3 py-2">
              <span className="text-sm flex-1 min-w-0 truncate">{sg.label}{sg.mastered ? ' ✓' : ''}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{sg.readinessPct}% {t(ro, 'pregătit', 'ready')}</span>
              {sg.salary && <span className="text-xs tabular-nums text-teal-700 dark:text-teal-300 shrink-0">{sg.salary.minEur}–{sg.salary.maxEur} €/lună*</span>}
            </div>
          ))}
          {coachRes && <p className="text-[11px] text-muted-foreground">* {t(ro, 'estimări orientative 2025-26, nu date live', 'indicative 2025-26 estimates, not live data')}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users2 className="h-4 w-4" /> {t(ro, 'Piața experților', 'Expert marketplace')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={loadMarketplace} disabled={mktBusy}>{t(ro, 'Caută experți', 'Browse experts')}</Button>
            <Button size="sm" variant="outline" onClick={toggleMarketplaceOptIn}>{t(ro, 'Comută listarea mea în piață (consimțământ)', 'Toggle my marketplace listing (consent)')}</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">{t(ro, 'Plata online în curând — rezervările se confirmă fără plată. Listarea este vizibilă doar utilizatorilor autentificați și necesită consimțământ explicit, retractabil.', 'Online payment coming soon — bookings confirm without payment. Listing is visible to authenticated users only and requires explicit, withdrawable consent.')}</p>
          {experts?.map((e) => (
            <div key={e.expertUserId} className="flex items-center gap-3 border rounded-lg px-3 py-2">
              <span className="text-sm flex-1 min-w-0 truncate">{e.headline || t(ro, 'Expert', 'Expert')}</span>
              <Badge variant="outline" className="text-[10px] tabular-nums">{t(ro, 'reputație', 'reputation')} {e.reputation}</Badge>
              {e.hourlyRateEur != null && <span className="text-xs tabular-nums text-muted-foreground">{e.hourlyRateEur} €/h</span>}
              <Button size="sm" onClick={() => bookExpert(e.expertUserId)}>{t(ro, 'Rezervă', 'Book')}</Button>
            </div>
          ))}
          {experts?.length === 0 && <p className="text-sm text-muted-foreground">{t(ro, 'Niciun expert listat încă.', 'No experts listed yet.')}</p>}
          {engagements.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{t(ro, 'Sesiunile mele', 'My sessions')}</p>
              {engagements.map((g) => (
                <div key={g.id} className="flex items-center gap-2 border rounded-lg px-3 py-2">
                  <span className="text-xs flex-1 truncate">{g.sessionType} · {new Date(g.scheduledAt).toLocaleString()}</span>
                  <Badge variant="outline" className="text-[10px]">{g.status}</Badge>
                  {g.status === 'requested' && <Button size="sm" variant="outline" onClick={() => engAction(g.id, 'confirm')}>{t(ro, 'Confirmă', 'Confirm')}</Button>}
                  {g.status === 'confirmed' && <Button size="sm" variant="outline" onClick={() => engAction(g.id, 'complete')}>{t(ro, 'Finalizează', 'Complete')}</Button>}
                  {g.status === 'completed' && g.rating == null && <Button size="sm" variant="outline" onClick={() => engAction(g.id, 'rate')}>{t(ro, 'Evaluează 5★', 'Rate 5★')}</Button>}
                  {g.rating != null && <span className="text-xs">{'★'.repeat(g.rating)}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {path && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Route className="h-4 w-4" /> {path.title} · {hrs(path.estTotalMinutes)}</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {path.steps.map((s) => (
              <div key={s.order} className="flex items-center gap-3 border rounded-lg px-3 py-2">
                <span className="text-xs font-semibold text-teal-600 w-6 tabular-nums">{s.order + 1}</span>
                <Badge variant="outline" className="text-[10px]">{s.kind === 'course' ? t(ro, 'curs', 'course') : s.kind === 'sim_scenario' ? t(ro, 'simulare', 'sim') : t(ro, 'evaluare', 'assessment')}</Badge>
                <span className="text-sm flex-1 min-w-0 truncate">{s.title}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">{s.estMinutes}m</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
