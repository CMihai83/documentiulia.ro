'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users, Briefcase, Search, Plus, Clock, MapPin, Building, Mail, Eye, Target, Star, Globe, AlertCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

type JobStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED';

interface JobPosting {
  id: string;
  title: string;
  department?: string;
  location?: string;
  jobType?: string;
  experienceLevel?: string;
  status: JobStatus;
  applicantCount?: number;
  viewCount?: number;
  salary?: { min?: number; max?: number; currency?: string; period?: string };
  createdAt?: string;
  applicationDeadline?: string;
}

interface CandidateSkill { name: string }
interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  currentPosition?: string;
  currentCompany?: string;
  location?: string;
  yearsOfExperience?: number;
  skills?: CandidateSkill[];
  linkedInUrl?: string;
}

interface PipelineStats {
  jobId: string;
  total: number;
  byStatus: Record<string, number>;
  sourceBreakdown?: Record<string, number>;
}

const STATUS_ORDER = ['NEW', 'SCREENING', 'INTERVIEW', 'ASSESSMENT', 'OFFER', 'HIRED'];
const statusLabels: Record<string, string> = {
  NEW: 'Nou', SCREENING: 'Screening', INTERVIEW: 'Interviu',
  ASSESSMENT: 'Assessment', OFFER: 'Ofertă', HIRED: 'Angajat', REJECTED: 'Respins',
};
const PIE_COLORS = ['#0A66C2', '#FF6B35', '#10B981', '#8B5CF6', '#F59E0B', '#6B7280'];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function ATSPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('jobs');

  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [pipeline, setPipeline] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const authHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }, []);

  const pick = <T,>(d: unknown): T[] => (Array.isArray(d) ? (d as T[]) : (d as { items?: T[]; data?: T[] })?.items ?? (d as { data?: T[] })?.data ?? []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [jobsRes, candRes] = await Promise.all([
        fetch(`${API_URL}/ats/jobs`, { headers: authHeaders() }),
        fetch(`${API_URL}/ats/candidates?minExperience=0`, { headers: authHeaders() }),
      ]);
      if (!jobsRes.ok && !candRes.ok) { setLoadError(true); setLoading(false); return; }
      const jobsData = jobsRes.ok ? pick<JobPosting>(await jobsRes.json()) : [];
      const candData = candRes.ok ? pick<Candidate>(await candRes.json()) : [];
      setJobs(jobsData);
      setCandidates(candData);
      if (jobsData.length && !selectedJobId) setSelectedJobId(jobsData[0].id);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, selectedJobId]);

  useEffect(() => { void loadData(); }, [loadData]);

  // Pipeline stats for the selected job
  useEffect(() => {
    if (!selectedJobId) { setPipeline(null); return; }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/ats/jobs/${selectedJobId}/pipeline`, { headers: authHeaders() });
        setPipeline(res.ok ? await res.json() : null);
      } catch { setPipeline(null); }
    })();
  }, [selectedJobId, authHeaders]);

  const money = (n?: number) => (typeof n === 'number' ? n.toLocaleString('ro-RO') : '—');
  const fmtDate = (d?: string) => { if (!d) return null; const x = new Date(d); return isNaN(x.getTime()) ? null : x.toLocaleDateString('ro-RO'); };

  const getJobStatusBadge = (status: JobStatus) => {
    const config: Record<JobStatus, { label: string; variant: 'outline' | 'default' | 'secondary' | 'destructive' }> = {
      DRAFT: { label: 'Ciornă', variant: 'outline' }, PUBLISHED: { label: 'Publicat', variant: 'default' },
      PAUSED: { label: 'Pauză', variant: 'secondary' }, CLOSED: { label: 'Închis', variant: 'destructive' },
    };
    const c = config[status] ?? { label: status, variant: 'outline' as const };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const filteredCandidates = candidates.filter((c) => {
    const q = searchTerm.toLowerCase();
    return !q
      || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
      || c.email.toLowerCase().includes(q)
      || (c.skills ?? []).some((s) => s.name?.toLowerCase().includes(q));
  });

  const activeJobs = jobs.filter((j) => j.status === 'PUBLISHED').length;
  const totalApplicants = jobs.reduce((s, j) => s + (j.applicantCount ?? 0), 0);
  const funnelData = pipeline ? STATUS_ORDER.map((st) => ({ stage: statusLabels[st], count: pipeline.byStatus?.[st] ?? 0 })) : [];
  const sourceData = pipeline?.sourceBreakdown
    ? Object.entries(pipeline.sourceBreakdown).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))
    : [];

  const errorBanner = loadError && (
    <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-900 dark:text-amber-200">
      Nu am putut încărca datele de recrutare. Reîncearcă. / Could not load recruitment data. Please retry.
    </div>
  );

  const emptyBlock = (msg: string) => (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
      <AlertCircle className="h-8 w-8 opacity-40" />
      <p className="text-sm">{msg}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {errorBanner}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recrutare (ATS)</h1>
          <p className="text-muted-foreground">Sistem de urmărire candidați cu AI matching</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" />Job nou</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Joburi active</CardTitle><Briefcase className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold tabular-nums">{loading ? '—' : activeJobs}</div><p className="text-xs text-muted-foreground">Din {jobs.length} total</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Aplicanți totali</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold tabular-nums">{loading ? '—' : totalApplicants}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Candidați</CardTitle><Target className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold tabular-nums">{loading ? '—' : candidates.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">În pipeline</CardTitle><Star className="h-4 w-4 text-yellow-500" /></CardHeader><CardContent><div className="text-2xl font-bold tabular-nums">{pipeline ? pipeline.total : '—'}</div><p className="text-xs text-muted-foreground">{pipeline ? 'jobul selectat' : 'selectează un job'}</p></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="jobs">Joburi</TabsTrigger>
          <TabsTrigger value="candidates">Candidați</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="analytics">Analiză</TabsTrigger>
        </TabsList>

        {/* Jobs */}
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Poziții deschise</CardTitle><CardDescription>Gestionare anunțuri de angajare</CardDescription></CardHeader>
            <CardContent>
              {loading ? emptyBlock('Se încarcă…')
                : jobs.length === 0 ? emptyBlock('Niciun anunț de angajare încă. Creează primul job.')
                : (
                  <div className="space-y-4">
                    {jobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1"><span className="font-medium text-lg">{job.title}</span>{getJobStatusBadge(job.status)}</div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {job.department && <span className="flex items-center gap-1"><Building className="h-4 w-4" />{job.department}</span>}
                            {job.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>}
                            <span className="flex items-center gap-1"><Users className="h-4 w-4" />{job.applicantCount ?? 0} aplicanți</span>
                            {typeof job.viewCount === 'number' && <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{job.viewCount} vizualizări</span>}
                          </div>
                          {job.salary && (job.salary.min || job.salary.max) && (
                            <div className="mt-2 text-sm"><span className="font-medium tabular-nums">{money(job.salary.min)} - {money(job.salary.max)} {job.salary.currency ?? 'RON'}</span><span className="text-muted-foreground"> / {job.salary.period === 'YEARLY' ? 'an' : 'lună'}</span>{fmtDate(job.applicationDeadline) && <span className="ml-4 text-muted-foreground">Deadline: {fmtDate(job.applicationDeadline)}</span>}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-1" />Vezi</Button>
                          <Button size="sm" onClick={() => { setSelectedJobId(job.id); setActiveTab('pipeline'); }}><Users className="h-4 w-4 mr-1" />Pipeline</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Candidates */}
        <TabsContent value="candidates" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Bază de candidați</CardTitle><CardDescription>Toți candidații înregistrați</CardDescription></CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Caută candidați, skills…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Toate</SelectItem>{Object.entries(statusLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {loading ? emptyBlock('Se încarcă…')
                : filteredCandidates.length === 0 ? emptyBlock(candidates.length === 0 ? 'Niciun candidat în bază încă.' : 'Niciun candidat pentru filtrul curent.')
                : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {filteredCandidates.map((candidate) => (
                        <div key={candidate.id} className="rounded-lg border p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <Avatar className="h-12 w-12"><AvatarFallback>{candidate.firstName?.[0]}{candidate.lastName?.[0]}</AvatarFallback></Avatar>
                              <div>
                                <span className="font-medium text-lg">{candidate.firstName} {candidate.lastName}</span>
                                {(candidate.currentPosition || candidate.currentCompany) && <p className="text-sm text-muted-foreground">{candidate.currentPosition}{candidate.currentCompany ? ` @ ${candidate.currentCompany}` : ''}</p>}
                                <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                                  {candidate.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{candidate.location}</span>}
                                  {typeof candidate.yearsOfExperience === 'number' && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{candidate.yearsOfExperience} ani experiență</span>}
                                  {candidate.linkedInUrl && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />LinkedIn</span>}
                                </div>
                                {(candidate.skills?.length ?? 0) > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {candidate.skills!.slice(0, 5).map((s, i) => <Badge key={i} variant="secondary" className="text-xs">{s.name}</Badge>)}
                                    {candidate.skills!.length > 5 && <Badge variant="outline" className="text-xs">+{candidate.skills!.length - 5}</Badge>}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm"><Mail className="h-4 w-4" /></Button>
                              <Button size="sm"><Eye className="h-4 w-4 mr-1" />Profil</Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pipeline */}
        <TabsContent value="pipeline" className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Job:</span>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger className="w-[280px]"><SelectValue placeholder="Selectează un job" /></SelectTrigger>
              <SelectContent>{jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {!selectedJobId ? emptyBlock('Selectează un job pentru a vedea pipeline-ul.')
            : !pipeline ? emptyBlock('Niciun candidat în pipeline pentru acest job.')
            : (
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {STATUS_ORDER.map((status) => (
                  <Card key={status}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center justify-between">{statusLabels[status]}<Badge variant="secondary" className="tabular-nums">{pipeline.byStatus?.[status] ?? 0}</Badge></CardTitle></CardHeader>
                  </Card>
                ))}
              </div>
            )}
        </TabsContent>

        {/* Analytics — derived from the selected job's real pipeline stats */}
        <TabsContent value="analytics" className="space-y-4">
          {!pipeline ? emptyBlock('Selectează un job cu candidați (tab Pipeline) pentru analiză.')
            : (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>Pipeline recrutare</CardTitle><CardDescription>Candidați pe etape — jobul selectat</CardDescription></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={funnelData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} /><YAxis dataKey="stage" type="category" width={100} /><Tooltip /><Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Surse aplicații</CardTitle><CardDescription>De unde vin candidații</CardDescription></CardHeader>
                  <CardContent>
                    {sourceData.length === 0 ? emptyBlock('Fără date de sursă.') : (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                            {sourceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
