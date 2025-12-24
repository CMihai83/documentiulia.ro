'use client';

import React, { useState } from 'react';
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
  Users,
  Briefcase,
  Search,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  MapPin,
  Building,
  Mail,
  Phone,
  FileText,
  Video,
  UserPlus,
  TrendingUp,
  Target,
  Award,
  Filter,
  MoreHorizontal,
  Eye,
  MessageSquare,
  Send,
  Linkedin,
  Globe,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Funnel,
  FunnelChart,
} from 'recharts';

// Types
type JobStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED';
type CandidateStatus = 'NEW' | 'SCREENING' | 'INTERVIEW' | 'ASSESSMENT' | 'OFFER' | 'HIRED' | 'REJECTED';

interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  jobType: string;
  experienceLevel: string;
  status: JobStatus;
  applicantCount: number;
  viewCount: number;
  salaryMin: number;
  salaryMax: number;
  createdAt: string;
  deadline?: string;
}

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentPosition: string;
  currentCompany: string;
  location: string;
  yearsExperience: number;
  skills: string[];
  matchScore: number;
  status: CandidateStatus;
  appliedAt: string;
  jobId: string;
  jobTitle: string;
  source: string;
  linkedIn?: string;
}

interface Interview {
  id: string;
  candidateName: string;
  jobTitle: string;
  type: string;
  scheduledAt: string;
  duration: number;
  interviewers: string[];
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  meetingUrl?: string;
}

// Sample data
const jobPostings: JobPosting[] = [
  {
    id: 'job-001',
    title: 'Senior Full Stack Developer',
    department: 'Engineering',
    location: 'București / Remote',
    jobType: 'Full-time',
    experienceLevel: 'Senior',
    status: 'PUBLISHED',
    applicantCount: 45,
    viewCount: 1234,
    salaryMin: 8000,
    salaryMax: 12000,
    createdAt: '2025-12-01',
    deadline: '2025-12-31',
  },
  {
    id: 'job-002',
    title: 'Product Manager',
    department: 'Product',
    location: 'București',
    jobType: 'Full-time',
    experienceLevel: 'Mid',
    status: 'PUBLISHED',
    applicantCount: 28,
    viewCount: 856,
    salaryMin: 7000,
    salaryMax: 10000,
    createdAt: '2025-12-05',
    deadline: '2025-12-25',
  },
  {
    id: 'job-003',
    title: 'UX/UI Designer',
    department: 'Design',
    location: 'Remote',
    jobType: 'Full-time',
    experienceLevel: 'Mid',
    status: 'PUBLISHED',
    applicantCount: 32,
    viewCount: 678,
    salaryMin: 5000,
    salaryMax: 8000,
    createdAt: '2025-12-08',
  },
  {
    id: 'job-004',
    title: 'DevOps Engineer',
    department: 'Engineering',
    location: 'București / Hybrid',
    jobType: 'Full-time',
    experienceLevel: 'Senior',
    status: 'DRAFT',
    applicantCount: 0,
    viewCount: 0,
    salaryMin: 9000,
    salaryMax: 14000,
    createdAt: '2025-12-12',
  },
  {
    id: 'job-005',
    title: 'Marketing Specialist',
    department: 'Marketing',
    location: 'București',
    jobType: 'Full-time',
    experienceLevel: 'Junior',
    status: 'CLOSED',
    applicantCount: 56,
    viewCount: 1450,
    salaryMin: 4000,
    salaryMax: 6000,
    createdAt: '2025-11-15',
  },
];

const candidates: Candidate[] = [
  {
    id: 'cand-001',
    firstName: 'Alexandru',
    lastName: 'Popescu',
    email: 'alex.popescu@email.com',
    phone: '+40 722 123 456',
    currentPosition: 'Full Stack Developer',
    currentCompany: 'TechCorp SRL',
    location: 'București',
    yearsExperience: 6,
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS'],
    matchScore: 92,
    status: 'INTERVIEW',
    appliedAt: '2025-12-10',
    jobId: 'job-001',
    jobTitle: 'Senior Full Stack Developer',
    source: 'LinkedIn',
    linkedIn: 'linkedin.com/in/alexpopescu',
  },
  {
    id: 'cand-002',
    firstName: 'Maria',
    lastName: 'Ionescu',
    email: 'maria.ionescu@email.com',
    phone: '+40 733 234 567',
    currentPosition: 'Senior Developer',
    currentCompany: 'SoftDev Romania',
    location: 'Cluj-Napoca',
    yearsExperience: 8,
    skills: ['React', 'Python', 'Django', 'Docker', 'Kubernetes'],
    matchScore: 88,
    status: 'ASSESSMENT',
    appliedAt: '2025-12-08',
    jobId: 'job-001',
    jobTitle: 'Senior Full Stack Developer',
    source: 'eJobs',
  },
  {
    id: 'cand-003',
    firstName: 'Andrei',
    lastName: 'Dumitrescu',
    email: 'andrei.d@email.com',
    phone: '+40 744 345 678',
    currentPosition: 'Product Owner',
    currentCompany: 'StartupHub',
    location: 'București',
    yearsExperience: 5,
    skills: ['Product Strategy', 'Agile', 'User Research', 'Data Analysis'],
    matchScore: 85,
    status: 'SCREENING',
    appliedAt: '2025-12-11',
    jobId: 'job-002',
    jobTitle: 'Product Manager',
    source: 'Direct',
  },
  {
    id: 'cand-004',
    firstName: 'Elena',
    lastName: 'Gheorghe',
    email: 'elena.gh@email.com',
    phone: '+40 755 456 789',
    currentPosition: 'Junior Developer',
    currentCompany: 'WebAgency',
    location: 'Timișoara',
    yearsExperience: 2,
    skills: ['JavaScript', 'React', 'CSS', 'Git'],
    matchScore: 65,
    status: 'NEW',
    appliedAt: '2025-12-13',
    jobId: 'job-001',
    jobTitle: 'Senior Full Stack Developer',
    source: 'BestJobs',
  },
  {
    id: 'cand-005',
    firstName: 'Mihai',
    lastName: 'Stancu',
    email: 'mihai.stancu@email.com',
    phone: '+40 766 567 890',
    currentPosition: 'UI/UX Designer',
    currentCompany: 'DesignStudio',
    location: 'Remote',
    yearsExperience: 4,
    skills: ['Figma', 'Adobe XD', 'User Research', 'Prototyping'],
    matchScore: 91,
    status: 'OFFER',
    appliedAt: '2025-12-05',
    jobId: 'job-003',
    jobTitle: 'UX/UI Designer',
    source: 'Referral',
  },
  {
    id: 'cand-006',
    firstName: 'Cristina',
    lastName: 'Marin',
    email: 'cristina.m@email.com',
    phone: '+40 777 678 901',
    currentPosition: 'Frontend Developer',
    currentCompany: 'ITConsult',
    location: 'Iași',
    yearsExperience: 4,
    skills: ['Vue.js', 'TypeScript', 'SCSS', 'Jest'],
    matchScore: 78,
    status: 'REJECTED',
    appliedAt: '2025-12-02',
    jobId: 'job-001',
    jobTitle: 'Senior Full Stack Developer',
    source: 'Indeed',
  },
];

const upcomingInterviews: Interview[] = [
  {
    id: 'int-001',
    candidateName: 'Alexandru Popescu',
    jobTitle: 'Senior Full Stack Developer',
    type: 'Technical',
    scheduledAt: '2025-12-15T10:00:00',
    duration: 60,
    interviewers: ['Ion Georgescu', 'Ana Popa'],
    status: 'SCHEDULED',
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
  },
  {
    id: 'int-002',
    candidateName: 'Andrei Dumitrescu',
    jobTitle: 'Product Manager',
    type: 'HR',
    scheduledAt: '2025-12-15T14:00:00',
    duration: 45,
    interviewers: ['Maria Ionescu'],
    status: 'SCHEDULED',
  },
  {
    id: 'int-003',
    candidateName: 'Maria Ionescu',
    jobTitle: 'Senior Full Stack Developer',
    type: 'Final',
    scheduledAt: '2025-12-16T11:00:00',
    duration: 60,
    interviewers: ['CEO', 'CTO'],
    status: 'SCHEDULED',
  },
];

// Chart data
const pipelineData = [
  { stage: 'Aplicări', count: 161, fill: '#3B82F6' },
  { stage: 'Screening', count: 85, fill: '#8B5CF6' },
  { stage: 'Interviu', count: 42, fill: '#F59E0B' },
  { stage: 'Assessment', count: 18, fill: '#10B981' },
  { stage: 'Ofertă', count: 8, fill: '#EC4899' },
  { stage: 'Angajat', count: 5, fill: '#06B6D4' },
];

const sourceData = [
  { name: 'LinkedIn', value: 35, color: '#0A66C2' },
  { name: 'eJobs', value: 25, color: '#FF6B35' },
  { name: 'Direct', value: 20, color: '#10B981' },
  { name: 'Referral', value: 12, color: '#8B5CF6' },
  { name: 'Altele', value: 8, color: '#6B7280' },
];

const hiringTrendData = [
  { month: 'Ian', applications: 120, hires: 3 },
  { month: 'Feb', applications: 145, hires: 4 },
  { month: 'Mar', applications: 168, hires: 5 },
  { month: 'Apr', applications: 132, hires: 3 },
  { month: 'Mai', applications: 189, hires: 6 },
  { month: 'Iun', applications: 210, hires: 7 },
];

const statusLabels: Record<CandidateStatus, string> = {
  NEW: 'Nou',
  SCREENING: 'Screening',
  INTERVIEW: 'Interviu',
  ASSESSMENT: 'Assessment',
  OFFER: 'Ofertă',
  HIRED: 'Angajat',
  REJECTED: 'Respins',
};

export default function ATSPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [jobFilter, setJobFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('jobs');

  const getJobStatusBadge = (status: JobStatus) => {
    const config = {
      DRAFT: { label: 'Ciornă', variant: 'outline' as const },
      PUBLISHED: { label: 'Publicat', variant: 'default' as const },
      PAUSED: { label: 'Pauză', variant: 'secondary' as const },
      CLOSED: { label: 'Închis', variant: 'destructive' as const },
    };
    return <Badge variant={config[status].variant}>{config[status].label}</Badge>;
  };

  const getCandidateStatusBadge = (status: CandidateStatus) => {
    const config = {
      NEW: { color: 'bg-blue-100 text-blue-800' },
      SCREENING: { color: 'bg-purple-100 text-purple-800' },
      INTERVIEW: { color: 'bg-yellow-100 text-yellow-800' },
      ASSESSMENT: { color: 'bg-orange-100 text-orange-800' },
      OFFER: { color: 'bg-green-100 text-green-800' },
      HIRED: { color: 'bg-emerald-100 text-emerald-800' },
      REJECTED: { color: 'bg-red-100 text-red-800' },
    };
    return <Badge className={config[status].color}>{statusLabels[status]}</Badge>;
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.skills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesJob = jobFilter === 'all' || candidate.jobId === jobFilter;
    const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;
    return matchesSearch && matchesJob && matchesStatus;
  });

  // Stats
  const activeJobs = jobPostings.filter((j) => j.status === 'PUBLISHED').length;
  const totalApplicants = jobPostings.reduce((sum, j) => sum + j.applicantCount, 0);
  const inPipeline = candidates.filter((c) => !['HIRED', 'REJECTED'].includes(c.status)).length;
  const avgMatchScore = Math.round(candidates.reduce((sum, c) => sum + c.matchScore, 0) / candidates.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recrutare (ATS)</h1>
          <p className="text-muted-foreground">
            Sistem de urmărire candidați cu AI matching
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Import CV-uri
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Job nou
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Joburi active</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeJobs}</div>
            <p className="text-xs text-muted-foreground">
              Din {jobPostings.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aplicanți totali</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApplicants}</div>
            <p className="text-xs text-muted-foreground">
              +23% față de luna trecută
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">În pipeline</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inPipeline}</div>
            <p className="text-xs text-muted-foreground">
              Candidați activi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Scor AI mediu</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMatchScore}%</div>
            <Progress value={avgMatchScore} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="jobs">Joburi</TabsTrigger>
          <TabsTrigger value="candidates">Candidați</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="interviews">Interviuri</TabsTrigger>
          <TabsTrigger value="analytics">Analiză</TabsTrigger>
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Poziții deschise</CardTitle>
              <CardDescription>Gestionare anunțuri de angajare</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobPostings.map((job) => (
                  <div key={job.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-lg">{job.title}</span>
                        {getJobStatusBadge(job.status)}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          {job.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {job.applicantCount} aplicanți
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {job.viewCount} vizualizări
                        </span>
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="font-medium">{job.salaryMin.toLocaleString()} - {job.salaryMax.toLocaleString()} RON</span>
                        <span className="text-muted-foreground"> / lună</span>
                        {job.deadline && (
                          <span className="ml-4 text-muted-foreground">
                            Deadline: {new Date(job.deadline).toLocaleDateString('ro-RO')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Vezi
                      </Button>
                      <Button size="sm">
                        <Users className="h-4 w-4 mr-1" />
                        Candidați
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Candidates Tab */}
        <TabsContent value="candidates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Bază de candidați</CardTitle>
                  <CardDescription>Toți candidații și scorul AI de potrivire</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Caută candidați, skills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={jobFilter} onValueChange={setJobFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Job" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate joburile</SelectItem>
                    {jobPostings.map((job) => (
                      <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate</SelectItem>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Candidates List */}
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredCandidates.map((candidate) => (
                    <div key={candidate.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback>
                              {candidate.firstName[0]}{candidate.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-lg">
                                {candidate.firstName} {candidate.lastName}
                              </span>
                              {getCandidateStatusBadge(candidate.status)}
                              <span className={`font-bold ${getMatchScoreColor(candidate.matchScore)}`}>
                                {candidate.matchScore}% match
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {candidate.currentPosition} @ {candidate.currentCompany}
                            </p>
                            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {candidate.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {candidate.yearsExperience} ani experiență
                              </span>
                              <span className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {candidate.jobTitle}
                              </span>
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {candidate.source}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {candidate.skills.slice(0, 5).map((skill, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {candidate.skills.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{candidate.skills.length - 5}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Calendar className="h-4 w-4" />
                          </Button>
                          <Button size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Profil
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-6">
            {(['NEW', 'SCREENING', 'INTERVIEW', 'ASSESSMENT', 'OFFER', 'HIRED'] as CandidateStatus[]).map((status) => {
              const statusCandidates = candidates.filter((c) => c.status === status);
              return (
                <Card key={status}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      {statusLabels[status]}
                      <Badge variant="secondary">{statusCandidates.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {statusCandidates.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="rounded-lg border p-3 bg-card hover:bg-accent cursor-pointer"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {candidate.firstName[0]}{candidate.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm truncate">
                                {candidate.firstName} {candidate.lastName}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {candidate.jobTitle}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className={`text-xs font-bold ${getMatchScoreColor(candidate.matchScore)}`}>
                                {candidate.matchScore}%
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {candidate.source}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {statusCandidates.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            Niciun candidat
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Interviews Tab */}
        <TabsContent value="interviews" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Interviuri programate</CardTitle>
                  <CardDescription>Calendar interviuri și evaluări</CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Programează interviu
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingInterviews.map((interview) => (
                  <div key={interview.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className="rounded-full bg-primary/10 p-3">
                        <Video className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{interview.candidateName}</span>
                          <Badge variant="outline">{interview.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{interview.jobTitle}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(interview.scheduledAt).toLocaleDateString('ro-RO')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(interview.scheduledAt).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>{interview.duration} min</span>
                        </div>
                        <div className="mt-1 text-sm">
                          <span className="text-muted-foreground">Intervievatori: </span>
                          {interview.interviewers.join(', ')}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {interview.meetingUrl && (
                        <Button variant="outline" size="sm">
                          <Video className="h-4 w-4 mr-1" />
                          Join
                        </Button>
                      )}
                      <Button size="sm">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Feedback
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Pipeline Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Pipeline recrutare</CardTitle>
                <CardDescription>Rata de conversie pe etape</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pipelineData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="stage" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Source Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Surse aplicații</CardTitle>
                <CardDescription>De unde vin candidații</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Hiring Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Trend recrutare</CardTitle>
                <CardDescription>Aplicații vs. angajări pe luni</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hiringTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="applications"
                      name="Aplicații"
                      stroke="#3B82F6"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="hires"
                      name="Angajări"
                      stroke="#10B981"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
