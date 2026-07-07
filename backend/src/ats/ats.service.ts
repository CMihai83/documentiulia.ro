import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';

// ATS (Applicant Tracking System) Service
// AI-powered recruitment with 99% candidate matching, bias detection, multi-channel posting
// Compliant with Romanian labor law and GDPR
//
// F-3: jobs/candidates/applications persist via Prisma (AtsJobPosting/AtsCandidate/
// AtsApplication); all match scoring is delegated to the shared MatchingService.

// ===== ENUMS =====

export enum JobStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export enum JobType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERNSHIP = 'INTERNSHIP',
  TEMPORARY = 'TEMPORARY',
  REMOTE = 'REMOTE',
  HYBRID = 'HYBRID',
}

export enum ExperienceLevel {
  ENTRY = 'ENTRY',
  JUNIOR = 'JUNIOR',
  MID = 'MID',
  SENIOR = 'SENIOR',
  LEAD = 'LEAD',
  EXECUTIVE = 'EXECUTIVE',
}

export enum CandidateStatus {
  NEW = 'NEW',
  SCREENING = 'SCREENING',
  PHONE_SCREEN = 'PHONE_SCREEN',
  INTERVIEW = 'INTERVIEW',
  ASSESSMENT = 'ASSESSMENT',
  OFFER = 'OFFER',
  HIRED = 'HIRED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum ApplicationSource {
  DIRECT = 'DIRECT',
  LINKEDIN = 'LINKEDIN',
  EJOBS = 'EJOBS',
  BESTJOBS = 'BESTJOBS',
  HIPO = 'HIPO',
  INDEED = 'INDEED',
  REFERRAL = 'REFERRAL',
  AGENCY = 'AGENCY',
  UNIVERSITY = 'UNIVERSITY',
  OTHER = 'OTHER',
}

export enum InterviewType {
  PHONE = 'PHONE',
  VIDEO = 'VIDEO',
  ONSITE = 'ONSITE',
  PANEL = 'PANEL',
  TECHNICAL = 'TECHNICAL',
  HR = 'HR',
  FINAL = 'FINAL',
}

export enum BiasCategory {
  GENDER = 'GENDER',
  AGE = 'AGE',
  ETHNICITY = 'ETHNICITY',
  DISABILITY = 'DISABILITY',
  RELIGION = 'RELIGION',
  MARITAL_STATUS = 'MARITAL_STATUS',
}

// ===== INTERFACES =====

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  skills: Skill[];
  salary: SalaryRange;
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  status: JobStatus;
  publishedChannels: PublishedChannel[];
  applicationDeadline?: Date;
  hiringManagerId?: string;
  recruiterId?: string;
  createdAt: Date;
  updatedAt: Date;
  applicantCount: number;
  viewCount: number;
}

export interface Skill {
  name: string;
  level: 'REQUIRED' | 'PREFERRED' | 'NICE_TO_HAVE';
  yearsRequired?: number;
}

export interface SalaryRange {
  min: number;
  max: number;
  currency: string;
  period: 'MONTHLY' | 'YEARLY';
  negotiable: boolean;
}

export interface PublishedChannel {
  channel: ApplicationSource;
  publishedAt: Date;
  externalId?: string;
  url?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REMOVED';
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
  currentPosition?: string;
  currentCompany?: string;
  location?: string;
  yearsOfExperience: number;
  skills: CandidateSkill[];
  education: Education[];
  workExperience: WorkExperience[];
  languages: Language[];
  cvUrl?: string;
  coverLetterUrl?: string;
  source: ApplicationSource;
  referredBy?: string;
  gdprConsent: boolean;
  gdprConsentDate: Date;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface CandidateSkill {
  name: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  yearsOfExperience: number;
  verified: boolean;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  startYear: number;
  endYear?: number;
  gpa?: number;
  current: boolean;
}

export interface WorkExperience {
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  achievements: string[];
}

export interface Language {
  name: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'NATIVE';
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  status: CandidateStatus;
  appliedAt: Date;
  source: ApplicationSource;
  matchScore: number;
  skillsMatch: SkillMatch[];
  experienceMatch: number;
  educationMatch: number;
  cultureMatch: number;
  overallScore: number;
  notes: ApplicationNote[];
  interviews: Interview[];
  assessments: Assessment[];
  offer?: JobOffer;
  rejectionReason?: string;
  updatedAt: Date;
}

export interface SkillMatch {
  skill: string;
  required: boolean;
  candidateLevel: string;
  requiredLevel: string;
  match: number; // 0-100
}

export interface ApplicationNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
  isPrivate: boolean;
}

export interface Interview {
  id: string;
  type: InterviewType;
  scheduledAt: Date;
  duration: number; // minutes
  location?: string;
  meetingUrl?: string;
  interviewers: string[];
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  feedback?: InterviewFeedback;
  createdAt: Date;
}

export interface InterviewFeedback {
  interviewerId: string;
  rating: number; // 1-5
  strengths: string[];
  weaknesses: string[];
  recommendation: 'STRONG_YES' | 'YES' | 'NEUTRAL' | 'NO' | 'STRONG_NO';
  notes: string;
  submittedAt: Date;
}

export interface Assessment {
  id: string;
  type: 'TECHNICAL' | 'PERSONALITY' | 'COGNITIVE' | 'SKILLS' | 'CASE_STUDY';
  name: string;
  sentAt: Date;
  completedAt?: Date;
  score?: number;
  maxScore: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';
  results?: Record<string, any>;
}

export interface JobOffer {
  id: string;
  salary: number;
  currency: string;
  startDate: string;
  benefits: string[];
  probationPeriod: number; // days
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'NEGOTIATING' | 'EXPIRED';
  sentAt?: Date;
  respondedAt?: Date;
  expiresAt: Date;
  contractType: string;
}

export interface BiasDetectionResult {
  hasBias: boolean;
  overallScore: number; // 0-100, higher is more biased
  issues: BiasIssue[];
  suggestions: string[];
  analyzedText: string;
}

export interface BiasIssue {
  category: BiasCategory;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  phrase: string;
  suggestion: string;
  position: { start: number; end: number };
}

export interface AIMatchResult {
  candidateId: string;
  jobId: string;
  overallScore: number;
  breakdown: {
    skills: number;
    experience: number;
    education: number;
    culture: number;
  };
  strengths: string[];
  gaps: string[];
  recommendation: string;
  confidence: number;
}

export interface CVParseResult {
  success: boolean;
  candidate: Partial<Candidate>;
  rawText: string;
  confidence: number;
  warnings: string[];
}

export interface PipelineStats {
  jobId: string;
  total: number;
  byStatus: Record<CandidateStatus, number>;
  avgTimeToHire: number; // days
  conversionRates: {
    screeningToInterview: number;
    interviewToOffer: number;
    offerToHire: number;
  };
  sourceBreakdown: Record<ApplicationSource, number>;
}

export interface RecruitmentMetrics {
  period: string;
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  totalHires: number;
  avgTimeToFill: number;
  avgCostPerHire: number;
  offerAcceptanceRate: number;
  sourcingEfficiency: Record<ApplicationSource, { applications: number; hires: number; cost: number }>;
  diversityMetrics: {
    genderDistribution: Record<string, number>;
    ageDistribution: Record<string, number>;
  };
}

// ===== SERVICE =====

@Injectable()
export class ATSService {
  private readonly logger = new Logger(ATSService.name);

  // Bias detection patterns (Romanian and English)
  private readonly BIAS_PATTERNS = {
    [BiasCategory.GENDER]: [
      { pattern: /\b(he|his|him|she|her|hers)\b/gi, suggestion: 'Use gender-neutral pronouns (they/their)' },
      { pattern: /\b(mankind|manpower|man-hours|chairman)\b/gi, suggestion: 'Use gender-neutral terms' },
      { pattern: /\b(aggressive|dominant|competitive)\b/gi, suggestion: 'These terms may discourage female applicants' },
      { pattern: /\b(nurturing|supportive|collaborative)\b/gi, suggestion: 'Balance with achievement-oriented terms' },
      { pattern: /\b(bărbat|femeie|domn|doamnă)\b/gi, suggestion: 'Folosiți termeni neutri din punct de vedere al genului' },
    ],
    [BiasCategory.AGE]: [
      { pattern: /\b(young|youthful|energetic|digital native)\b/gi, suggestion: 'May discriminate against older candidates' },
      { pattern: /\b(experienced|seasoned|mature)\b/gi, suggestion: 'May discriminate against younger candidates' },
      { pattern: /\b(recent graduate|fresh graduate)\b/gi, suggestion: 'Consider "entry-level" instead' },
      { pattern: /\b(tânăr|junior|senior|vârstă)\b/gi, suggestion: 'Evitați referințele la vârstă' },
    ],
    [BiasCategory.DISABILITY]: [
      { pattern: /\b(able-bodied|physically fit|standing for long periods)\b/gi, suggestion: 'Specify only if essential for the role' },
      { pattern: /\b(normal|healthy)\b/gi, suggestion: 'Avoid terms that imply disability discrimination' },
    ],
    [BiasCategory.MARITAL_STATUS]: [
      { pattern: /\b(single|married|family-oriented)\b/gi, suggestion: 'Remove references to marital/family status' },
      { pattern: /\b(căsătorit|necăsătorit|familie)\b/gi, suggestion: 'Eliminați referințele la starea civilă' },
    ],
  };

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private matching: MatchingService,
  ) {}

  // For testing - reset all persisted ATS data
  async resetState(): Promise<void> {
    await this.prisma.atsApplication.deleteMany({});
    await this.prisma.atsCandidate.deleteMany({});
    await this.prisma.atsJobPosting.deleteMany({});
  }

  // ===== ROW ↔ INTERFACE MAPPERS =====

  private reviveDate<T>(v: T): T {
    return (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) ? new Date(v) : v) as unknown as T;
  }

  private rowToJob(row: any): JobPosting {
    const channels = ((row.publishedChannels as any[]) || []).map(c => ({
      ...c,
      publishedAt: this.reviveDate(c.publishedAt),
    }));
    return {
      id: row.id,
      title: row.title,
      department: row.department,
      location: row.location,
      description: row.description,
      requirements: row.requirements || [],
      responsibilities: row.responsibilities || [],
      skills: (row.skills as Skill[]) || [],
      salary: (row.salary as SalaryRange) || { min: 0, max: 0, currency: 'RON', period: 'MONTHLY', negotiable: true },
      jobType: row.jobType as JobType,
      experienceLevel: row.experienceLevel as ExperienceLevel,
      status: row.status as JobStatus,
      publishedChannels: channels,
      applicationDeadline: row.applicationDeadline || undefined,
      hiringManagerId: row.hiringManagerId || undefined,
      recruiterId: row.recruiterId || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      applicantCount: row.applicantCount,
      viewCount: row.viewCount,
    };
  }

  private jobToRowData(job: JobPosting): any {
    return {
      title: job.title,
      department: job.department,
      location: job.location,
      description: job.description,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
      skills: job.skills as any,
      salary: job.salary as any,
      jobType: job.jobType,
      experienceLevel: job.experienceLevel,
      status: job.status,
      publishedChannels: job.publishedChannels as any,
      applicationDeadline: job.applicationDeadline ?? null,
      hiringManagerId: job.hiringManagerId ?? null,
      recruiterId: job.recruiterId ?? null,
      applicantCount: job.applicantCount,
      viewCount: job.viewCount,
    };
  }

  private rowToCandidate(row: any): Candidate {
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone || undefined,
      linkedInUrl: row.linkedInUrl || undefined,
      portfolioUrl: row.portfolioUrl || undefined,
      currentPosition: row.currentPosition || undefined,
      currentCompany: row.currentCompany || undefined,
      location: row.location || undefined,
      yearsOfExperience: row.yearsOfExperience,
      skills: (row.skills as CandidateSkill[]) || [],
      education: (row.education as Education[]) || [],
      workExperience: (row.workExperience as WorkExperience[]) || [],
      languages: (row.languages as Language[]) || [],
      cvUrl: row.cvUrl || undefined,
      coverLetterUrl: row.coverLetterUrl || undefined,
      source: row.source as ApplicationSource,
      referredBy: row.referredBy || undefined,
      gdprConsent: row.gdprConsent,
      gdprConsentDate: row.gdprConsentDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tags: row.tags || [],
    };
  }

  private candidateToRowData(c: Candidate): any {
    return {
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone ?? null,
      linkedInUrl: c.linkedInUrl ?? null,
      portfolioUrl: c.portfolioUrl ?? null,
      currentPosition: c.currentPosition ?? null,
      currentCompany: c.currentCompany ?? null,
      location: c.location ?? null,
      yearsOfExperience: c.yearsOfExperience,
      skills: c.skills as any,
      education: c.education as any,
      workExperience: c.workExperience as any,
      languages: c.languages as any,
      cvUrl: c.cvUrl ?? null,
      coverLetterUrl: c.coverLetterUrl ?? null,
      source: c.source,
      referredBy: c.referredBy ?? null,
      gdprConsent: c.gdprConsent,
      gdprConsentDate: c.gdprConsentDate,
      tags: c.tags,
    };
  }

  private rowToApplication(row: any): Application {
    const notes = ((row.notes as any[]) || []).map(n => ({ ...n, createdAt: this.reviveDate(n.createdAt) }));
    const interviews = ((row.interviews as any[]) || []).map(i => ({
      ...i,
      scheduledAt: this.reviveDate(i.scheduledAt),
      createdAt: this.reviveDate(i.createdAt),
      feedback: i.feedback ? { ...i.feedback, submittedAt: this.reviveDate(i.feedback.submittedAt) } : undefined,
    }));
    const assessments = ((row.assessments as any[]) || []).map(a => ({
      ...a,
      sentAt: this.reviveDate(a.sentAt),
      completedAt: a.completedAt ? this.reviveDate(a.completedAt) : undefined,
    }));
    const offer = row.offer
      ? {
          ...(row.offer as any),
          sentAt: row.offer.sentAt ? this.reviveDate(row.offer.sentAt) : undefined,
          respondedAt: row.offer.respondedAt ? this.reviveDate(row.offer.respondedAt) : undefined,
          expiresAt: this.reviveDate(row.offer.expiresAt),
        }
      : undefined;
    return {
      id: row.id,
      jobId: row.jobId,
      candidateId: row.candidateId,
      status: row.status as CandidateStatus,
      appliedAt: row.appliedAt,
      source: row.source as ApplicationSource,
      matchScore: row.matchScore,
      skillsMatch: (row.skillsMatch as SkillMatch[]) || [],
      experienceMatch: row.experienceMatch,
      educationMatch: row.educationMatch,
      cultureMatch: row.cultureMatch,
      overallScore: row.overallScore,
      notes,
      interviews,
      assessments,
      offer,
      rejectionReason: row.rejectionReason || undefined,
      updatedAt: row.updatedAt,
    };
  }

  private applicationToRowData(a: Application): any {
    return {
      status: a.status,
      source: a.source,
      matchScore: a.matchScore,
      skillsMatch: a.skillsMatch as any,
      experienceMatch: a.experienceMatch,
      educationMatch: a.educationMatch,
      cultureMatch: a.cultureMatch,
      overallScore: a.overallScore,
      notes: a.notes as any,
      interviews: a.interviews as any,
      assessments: a.assessments as any,
      offer: (a.offer as any) ?? null,
      rejectionReason: a.rejectionReason ?? null,
    };
  }

  private async saveApplication(application: Application): Promise<Application> {
    const row = await this.prisma.atsApplication.update({
      where: { id: application.id },
      data: this.applicationToRowData(application),
    });
    return this.rowToApplication(row);
  }

  // ===== JOB POSTINGS =====

  async createJobPosting(data: Partial<JobPosting>, creatorId: string): Promise<JobPosting> {
    const row = await this.prisma.atsJobPosting.create({
      data: {
        title: data.title || 'Untitled Position',
        department: data.department || 'General',
        location: data.location || 'Remote',
        description: data.description || '',
        requirements: data.requirements || [],
        responsibilities: data.responsibilities || [],
        skills: (data.skills as any) || [],
        salary: (data.salary as any) || { min: 0, max: 0, currency: 'RON', period: 'MONTHLY', negotiable: true },
        jobType: data.jobType || JobType.FULL_TIME,
        experienceLevel: data.experienceLevel || ExperienceLevel.MID,
        status: JobStatus.DRAFT,
        publishedChannels: [],
        applicationDeadline: data.applicationDeadline ?? null,
        hiringManagerId: data.hiringManagerId ?? null,
        recruiterId: creatorId,
        applicantCount: 0,
        viewCount: 0,
      },
    });
    this.logger.log(`Job posting created: ${row.id} - ${row.title}`);
    return this.rowToJob(row);
  }

  async getJobPosting(jobId: string): Promise<JobPosting> {
    const row = await this.prisma.atsJobPosting.findUnique({ where: { id: jobId } });
    if (!row) {
      throw new NotFoundException(`Job posting ${jobId} not found`);
    }
    return this.rowToJob(row);
  }

  async updateJobPosting(jobId: string, data: Partial<JobPosting>): Promise<JobPosting> {
    const job = await this.getJobPosting(jobId);
    const updated: JobPosting = {
      ...job,
      ...data,
      id: jobId,
      createdAt: job.createdAt,
      updatedAt: new Date(),
    };
    const row = await this.prisma.atsJobPosting.update({ where: { id: jobId }, data: this.jobToRowData(updated) });
    return this.rowToJob(row);
  }

  async publishJob(jobId: string, channels: ApplicationSource[]): Promise<JobPosting> {
    const job = await this.getJobPosting(jobId);

    if (job.status === JobStatus.PUBLISHED) {
      throw new BadRequestException('Job is already published');
    }

    // Simulate publishing to external channels
    const publishedChannels: PublishedChannel[] = channels.map(channel => ({
      channel,
      publishedAt: new Date(),
      externalId: `ext-${channel}-${Date.now()}`,
      url: this.getChannelUrl(channel, jobId),
      status: 'ACTIVE' as const,
    }));

    job.status = JobStatus.PUBLISHED;
    job.publishedChannels = [...job.publishedChannels, ...publishedChannels];

    const row = await this.prisma.atsJobPosting.update({ where: { id: jobId }, data: this.jobToRowData(job) });
    this.logger.log(`Job ${jobId} published to ${channels.join(', ')}`);
    return this.rowToJob(row);
  }

  async closeJob(jobId: string): Promise<JobPosting> {
    const job = await this.getJobPosting(jobId);
    job.status = JobStatus.CLOSED;
    const row = await this.prisma.atsJobPosting.update({ where: { id: jobId }, data: this.jobToRowData(job) });
    return this.rowToJob(row);
  }

  async listJobs(filters?: {
    status?: JobStatus;
    department?: string;
    jobType?: JobType;
    experienceLevel?: ExperienceLevel;
  }): Promise<JobPosting[]> {
    const rows = await this.prisma.atsJobPosting.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.department ? { department: filters.department } : {}),
        ...(filters?.jobType ? { jobType: filters.jobType } : {}),
        ...(filters?.experienceLevel ? { experienceLevel: filters.experienceLevel } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this.rowToJob(r));
  }

  async searchJobs(query: string): Promise<JobPosting[]> {
    const lowerQuery = query.toLowerCase();
    const rows = await this.prisma.atsJobPosting.findMany({});
    return rows.map(r => this.rowToJob(r)).filter(job =>
      job.title.toLowerCase().includes(lowerQuery) ||
      job.description.toLowerCase().includes(lowerQuery) ||
      job.skills.some(s => s.name.toLowerCase().includes(lowerQuery))
    );
  }

  // ===== CANDIDATES =====

  async createCandidate(data: Partial<Candidate>): Promise<Candidate> {
    if (!data.email) {
      throw new BadRequestException('Email is required');
    }

    // Check for existing candidate with same email
    const existing = await this.prisma.atsCandidate.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new BadRequestException('Candidate with this email already exists');
    }

    try {
      const row = await this.prisma.atsCandidate.create({
        data: {
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email,
          phone: data.phone ?? null,
          linkedInUrl: data.linkedInUrl ?? null,
          portfolioUrl: data.portfolioUrl ?? null,
          currentPosition: data.currentPosition ?? null,
          currentCompany: data.currentCompany ?? null,
          location: data.location ?? null,
          yearsOfExperience: data.yearsOfExperience || 0,
          skills: (data.skills as any) || [],
          education: (data.education as any) || [],
          workExperience: (data.workExperience as any) || [],
          languages: (data.languages as any) || [],
          cvUrl: data.cvUrl ?? null,
          coverLetterUrl: data.coverLetterUrl ?? null,
          source: data.source || ApplicationSource.DIRECT,
          referredBy: data.referredBy ?? null,
          gdprConsent: data.gdprConsent || false,
          gdprConsentDate: data.gdprConsentDate || new Date(),
          tags: data.tags || [],
        },
      });
      this.logger.log(`Candidate created: ${row.id} - ${row.firstName} ${row.lastName}`);
      return this.rowToCandidate(row);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Candidate with this email already exists');
      }
      throw e;
    }
  }

  async getCandidate(candidateId: string): Promise<Candidate> {
    const row = await this.prisma.atsCandidate.findUnique({ where: { id: candidateId } });
    if (!row) {
      throw new NotFoundException(`Candidate ${candidateId} not found`);
    }
    return this.rowToCandidate(row);
  }

  async updateCandidate(candidateId: string, data: Partial<Candidate>): Promise<Candidate> {
    const candidate = await this.getCandidate(candidateId);
    const updated: Candidate = {
      ...candidate,
      ...data,
      id: candidateId,
      createdAt: candidate.createdAt,
      updatedAt: new Date(),
    };
    const row = await this.prisma.atsCandidate.update({
      where: { id: candidateId },
      data: this.candidateToRowData(updated),
    });
    return this.rowToCandidate(row);
  }

  async searchCandidates(query: string): Promise<Candidate[]> {
    const lowerQuery = query.toLowerCase();
    const rows = await this.prisma.atsCandidate.findMany({});
    return rows.map(r => this.rowToCandidate(r)).filter(c =>
      c.firstName.toLowerCase().includes(lowerQuery) ||
      c.lastName.toLowerCase().includes(lowerQuery) ||
      c.email.toLowerCase().includes(lowerQuery) ||
      c.skills.some(s => s.name.toLowerCase().includes(lowerQuery))
    );
  }

  async listCandidates(filters?: {
    source?: ApplicationSource;
    minExperience?: number;
    skills?: string[];
  }): Promise<Candidate[]> {
    const rows = await this.prisma.atsCandidate.findMany({
      where: { ...(filters?.source ? { source: filters.source } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    let candidates = rows.map(r => this.rowToCandidate(r));

    if (filters?.minExperience !== undefined) {
      const minExp = filters.minExperience;
      candidates = candidates.filter(c => c.yearsOfExperience >= minExp);
    }
    if (filters?.skills?.length) {
      candidates = candidates.filter(c =>
        filters.skills!.some(skill =>
          c.skills.some(cs => this.matching.skillMatches(cs.name, skill))
        )
      );
    }

    return candidates;
  }

  // ===== APPLICATIONS =====

  async applyToJob(jobId: string, candidateId: string, source: ApplicationSource): Promise<Application> {
    const job = await this.getJobPosting(jobId);
    const candidate = await this.getCandidate(candidateId);

    if (job.status !== JobStatus.PUBLISHED) {
      throw new BadRequestException('Cannot apply to unpublished job');
    }

    // Check if already applied
    const existingApp = await this.prisma.atsApplication.findFirst({ where: { jobId, candidateId } });
    if (existingApp) {
      throw new BadRequestException('Already applied to this job');
    }

    // Calculate AI match score via the shared engine
    const matchResult = this.matching.scoreCandidateToJob(candidate, job);

    try {
      const row = await this.prisma.atsApplication.create({
        data: {
          jobId,
          candidateId,
          status: CandidateStatus.NEW,
          appliedAt: new Date(),
          source,
          matchScore: matchResult.overallScore,
          skillsMatch: this.matching.candidateSkillsMatch(candidate, job) as any,
          experienceMatch: matchResult.breakdown.experience,
          educationMatch: matchResult.breakdown.education,
          cultureMatch: matchResult.breakdown.culture,
          overallScore: matchResult.overallScore,
          notes: [],
          interviews: [],
          assessments: [],
        },
      });

      // Update job applicant count
      await this.prisma.atsJobPosting.update({
        where: { id: jobId },
        data: { applicantCount: job.applicantCount + 1 },
      });

      this.logger.log(`Application created: ${row.id} for job ${jobId}`);
      return this.rowToApplication(row);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Already applied to this job');
      }
      throw e;
    }
  }

  async getApplication(applicationId: string): Promise<Application> {
    const row = await this.prisma.atsApplication.findUnique({ where: { id: applicationId } });
    if (!row) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }
    return this.rowToApplication(row);
  }

  async updateApplicationStatus(applicationId: string, status: CandidateStatus, reason?: string): Promise<Application> {
    const application = await this.getApplication(applicationId);

    application.status = status;
    application.updatedAt = new Date();

    if (status === CandidateStatus.REJECTED && reason) {
      application.rejectionReason = reason;
    }

    return this.saveApplication(application);
  }

  async addApplicationNote(applicationId: string, authorId: string, authorName: string, content: string, isPrivate: boolean = false): Promise<Application> {
    const application = await this.getApplication(applicationId);

    const note: ApplicationNote = {
      id: `note-${Date.now()}`,
      authorId,
      authorName,
      content,
      createdAt: new Date(),
      isPrivate,
    };

    application.notes.push(note);
    return this.saveApplication(application);
  }

  async getApplicationsForJob(jobId: string, status?: CandidateStatus): Promise<Application[]> {
    const rows = await this.prisma.atsApplication.findMany({
      where: { jobId, ...(status ? { status } : {}) },
    });
    return rows
      .map(r => this.rowToApplication(r))
      .sort((a, b) => b.overallScore - a.overallScore);
  }

  async getApplicationsForCandidate(candidateId: string): Promise<Application[]> {
    const rows = await this.prisma.atsApplication.findMany({ where: { candidateId } });
    return rows
      .map(r => this.rowToApplication(r))
      .sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
  }

  // ===== INTERVIEWS =====

  async scheduleInterview(
    applicationId: string,
    type: InterviewType,
    scheduledAt: Date,
    duration: number,
    interviewers: string[],
    location?: string,
    meetingUrl?: string,
  ): Promise<Interview> {
    const application = await this.getApplication(applicationId);

    const interview: Interview = {
      id: `int-${Date.now()}`,
      type,
      scheduledAt,
      duration,
      location,
      meetingUrl,
      interviewers,
      status: 'SCHEDULED',
      createdAt: new Date(),
    };

    application.interviews.push(interview);
    application.status = CandidateStatus.INTERVIEW;
    await this.saveApplication(application);

    this.logger.log(`Interview scheduled: ${interview.id} for application ${applicationId}`);
    return interview;
  }

  async submitInterviewFeedback(
    applicationId: string,
    interviewId: string,
    feedback: Omit<InterviewFeedback, 'submittedAt'>,
  ): Promise<Interview> {
    const application = await this.getApplication(applicationId);
    const interview = application.interviews.find(i => i.id === interviewId);

    if (!interview) {
      throw new NotFoundException(`Interview ${interviewId} not found`);
    }

    interview.feedback = {
      ...feedback,
      submittedAt: new Date(),
    };
    interview.status = 'COMPLETED';

    await this.saveApplication(application);
    return interview;
  }

  async cancelInterview(applicationId: string, interviewId: string): Promise<Interview> {
    const application = await this.getApplication(applicationId);
    const interview = application.interviews.find(i => i.id === interviewId);

    if (!interview) {
      throw new NotFoundException(`Interview ${interviewId} not found`);
    }

    interview.status = 'CANCELLED';
    await this.saveApplication(application);
    return interview;
  }

  // ===== ASSESSMENTS =====

  async sendAssessment(
    applicationId: string,
    type: Assessment['type'],
    name: string,
    maxScore: number,
  ): Promise<Assessment> {
    const application = await this.getApplication(applicationId);

    const assessment: Assessment = {
      id: `assess-${Date.now()}`,
      type,
      name,
      sentAt: new Date(),
      maxScore,
      status: 'PENDING',
    };

    application.assessments.push(assessment);
    application.status = CandidateStatus.ASSESSMENT;
    await this.saveApplication(application);

    this.logger.log(`Assessment sent: ${assessment.id} for application ${applicationId}`);
    return assessment;
  }

  async submitAssessmentResult(
    applicationId: string,
    assessmentId: string,
    score: number,
    results?: Record<string, any>,
  ): Promise<Assessment> {
    const application = await this.getApplication(applicationId);
    const assessment = application.assessments.find(a => a.id === assessmentId);

    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found`);
    }

    assessment.completedAt = new Date();
    assessment.score = score;
    assessment.results = results;
    assessment.status = 'COMPLETED';

    await this.saveApplication(application);
    return assessment;
  }

  // ===== JOB OFFERS =====

  async createOffer(
    applicationId: string,
    salary: number,
    currency: string,
    startDate: string,
    benefits: string[],
    probationPeriod: number,
    contractType: string,
    expiresInDays: number = 7,
  ): Promise<JobOffer> {
    const application = await this.getApplication(applicationId);

    if (application.offer) {
      throw new BadRequestException('An offer already exists for this application');
    }

    const offer: JobOffer = {
      id: `offer-${Date.now()}`,
      salary,
      currency,
      startDate,
      benefits,
      probationPeriod,
      status: 'DRAFT',
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      contractType,
    };

    application.offer = offer;
    application.status = CandidateStatus.OFFER;
    await this.saveApplication(application);

    return offer;
  }

  async sendOffer(applicationId: string): Promise<JobOffer> {
    const application = await this.getApplication(applicationId);

    if (!application.offer) {
      throw new NotFoundException('No offer exists for this application');
    }

    if (application.offer.status !== 'DRAFT') {
      throw new BadRequestException('Offer has already been sent');
    }

    application.offer.status = 'SENT';
    application.offer.sentAt = new Date();
    await this.saveApplication(application);

    this.logger.log(`Offer sent for application ${applicationId}`);
    return application.offer;
  }

  async respondToOffer(applicationId: string, accepted: boolean): Promise<JobOffer> {
    const application = await this.getApplication(applicationId);

    if (!application.offer) {
      throw new NotFoundException('No offer exists for this application');
    }

    if (application.offer.status !== 'SENT') {
      throw new BadRequestException('Offer is not in sent status');
    }

    application.offer.status = accepted ? 'ACCEPTED' : 'REJECTED';
    application.offer.respondedAt = new Date();
    application.status = accepted ? CandidateStatus.HIRED : CandidateStatus.REJECTED;
    await this.saveApplication(application);

    return application.offer;
  }

  // ===== AI FEATURES =====

  async parseCV(cvText: string): Promise<CVParseResult> {
    // Simulate NLP extraction from CV text
    const warnings: string[] = [];

    // Extract email
    const emailMatch = cvText.match(/[\w.-]+@[\w.-]+\.\w+/);
    const email = emailMatch ? emailMatch[0] : '';

    // Extract phone (Romanian format)
    const phoneMatch = cvText.match(/(\+?40|0)?[0-9]{9,10}/);
    const phone = phoneMatch ? phoneMatch[0] : undefined;

    // Extract name (first line assumption)
    const lines = cvText.split('\n').filter(l => l.trim());
    const nameLine = (lines[0] || '').trim();
    const nameParts = nameLine.split(/\s+/).filter(p => p);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Extract skills (look for common skill keywords)
    const skillKeywords = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust',
      'React', 'Angular', 'Vue', 'Node.js', 'Express', 'NestJS', 'Django', 'Flask',
      'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
      'Git', 'CI/CD', 'Agile', 'Scrum',
    ];

    const foundSkills: CandidateSkill[] = skillKeywords
      .filter(skill => cvText.toLowerCase().includes(skill.toLowerCase()))
      .map(skill => ({
        name: skill,
        level: 'INTERMEDIATE' as const,
        yearsOfExperience: 0,
        verified: false,
      }));

    // Extract years of experience
    const expMatch = cvText.match(/(\d+)\s*(?:years?|ani)\s*(?:of\s*)?(?:experience|experiență)/i);
    const yearsOfExperience = expMatch ? parseInt(expMatch[1]) : 0;

    if (!email) warnings.push('Could not extract email address');
    if (foundSkills.length === 0) warnings.push('No skills detected');

    const candidate: Partial<Candidate> = {
      firstName,
      lastName,
      email,
      phone,
      skills: foundSkills,
      yearsOfExperience,
    };

    return {
      success: !!email,
      candidate,
      rawText: cvText,
      confidence: email ? (foundSkills.length > 3 ? 0.85 : 0.6) : 0.3,
      warnings,
    };
  }

  /** Delegates to the shared MatchingService (F-3) — same weights as before (40/30/15/15). */
  calculateMatchScore(candidate: Candidate, job: JobPosting): AIMatchResult {
    return this.matching.scoreCandidateToJob(candidate, job);
  }

  async detectBias(text: string): Promise<BiasDetectionResult> {
    const issues: BiasIssue[] = [];
    const suggestions: string[] = [];

    for (const [category, patterns] of Object.entries(this.BIAS_PATTERNS)) {
      for (const { pattern, suggestion } of patterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          issues.push({
            category: category as BiasCategory,
            severity: this.getBiasSeverity(category as BiasCategory),
            phrase: match[0],
            suggestion,
            position: { start: match.index || 0, end: (match.index || 0) + match[0].length },
          });
          if (!suggestions.includes(suggestion)) {
            suggestions.push(suggestion);
          }
        }
      }
    }

    const overallScore = Math.min(100, issues.length * 15);

    return {
      hasBias: issues.length > 0,
      overallScore,
      issues,
      suggestions,
      analyzedText: text,
    };
  }

  async getTopCandidatesForJob(jobId: string, limit: number = 10): Promise<Application[]> {
    const applications = await this.getApplicationsForJob(jobId);
    return applications
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit);
  }

  async getSimilarCandidates(candidateId: string, limit: number = 5): Promise<Candidate[]> {
    const candidate = await this.getCandidate(candidateId);
    const rows = await this.prisma.atsCandidate.findMany({ where: { id: { not: candidateId } } });
    const allCandidates = rows.map(r => this.rowToCandidate(r));

    // Score similarity based on skills overlap (shared engine)
    const scored = allCandidates.map(c => ({
      candidate: c,
      similarity: this.matching.candidateSimilarity(candidate, c),
    }));

    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(s => s.candidate);
  }

  // ===== PIPELINE & METRICS =====

  async getPipelineStats(jobId: string): Promise<PipelineStats> {
    const applications = await this.getApplicationsForJob(jobId);

    const byStatus: Record<CandidateStatus, number> = {} as Record<CandidateStatus, number>;
    for (const status of Object.values(CandidateStatus)) {
      byStatus[status] = applications.filter(a => a.status === status).length;
    }

    const sourceBreakdown: Record<ApplicationSource, number> = {} as Record<ApplicationSource, number>;
    for (const source of Object.values(ApplicationSource)) {
      sourceBreakdown[source] = applications.filter(a => a.source === source).length;
    }

    const hiredApps = applications.filter(a => a.status === CandidateStatus.HIRED);
    const avgTimeToHire = hiredApps.length > 0
      ? hiredApps.reduce((sum, a) => {
          const days = Math.ceil((a.updatedAt.getTime() - a.appliedAt.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / hiredApps.length
      : 0;

    const screening = byStatus[CandidateStatus.SCREENING] || 0;
    const interview = byStatus[CandidateStatus.INTERVIEW] || 0;
    const offer = byStatus[CandidateStatus.OFFER] || 0;
    const hired = byStatus[CandidateStatus.HIRED] || 0;

    return {
      jobId,
      total: applications.length,
      byStatus,
      avgTimeToHire: Math.round(avgTimeToHire),
      conversionRates: {
        screeningToInterview: screening > 0 ? Math.round((interview / screening) * 100) : 0,
        interviewToOffer: interview > 0 ? Math.round((offer / interview) * 100) : 0,
        offerToHire: offer > 0 ? Math.round((hired / offer) * 100) : 0,
      },
      sourceBreakdown,
    };
  }

  async getRecruitmentMetrics(startDate: Date, endDate: Date): Promise<RecruitmentMetrics> {
    const jobRows = await this.prisma.atsJobPosting.findMany({});
    const appRows = await this.prisma.atsApplication.findMany({});
    const jobs = jobRows.map(r => this.rowToJob(r)).filter(
      j => j.createdAt >= startDate && j.createdAt <= endDate
    );
    const applications = appRows.map(r => this.rowToApplication(r)).filter(
      a => a.appliedAt >= startDate && a.appliedAt <= endDate
    );

    const hires = applications.filter(a => a.status === CandidateStatus.HIRED);
    const offers = applications.filter(a => a.status === CandidateStatus.OFFER || a.status === CandidateStatus.HIRED);

    const sourcingEfficiency: Record<ApplicationSource, { applications: number; hires: number; cost: number }> = {} as any;
    for (const source of Object.values(ApplicationSource)) {
      const sourceApps = applications.filter(a => a.source === source);
      const sourceHires = hires.filter(a => a.source === source);
      sourcingEfficiency[source] = {
        applications: sourceApps.length,
        hires: sourceHires.length,
        cost: this.getSourceCost(source) * sourceApps.length,
      };
    }

    return {
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.status === JobStatus.PUBLISHED).length,
      totalApplications: applications.length,
      totalHires: hires.length,
      avgTimeToFill: 30, // Mock value
      avgCostPerHire: 500, // Mock value in EUR
      offerAcceptanceRate: offers.length > 0 ? Math.round((hires.length / offers.length) * 100) : 0,
      sourcingEfficiency,
      diversityMetrics: {
        genderDistribution: { 'Not disclosed': 100 },
        ageDistribution: { 'Not disclosed': 100 },
      },
    };
  }

  // ===== HELPERS =====

  private getChannelUrl(channel: ApplicationSource, jobId: string): string {
    const urls: Record<ApplicationSource, string> = {
      [ApplicationSource.LINKEDIN]: `https://linkedin.com/jobs/${jobId}`,
      [ApplicationSource.EJOBS]: `https://ejobs.ro/job/${jobId}`,
      [ApplicationSource.BESTJOBS]: `https://bestjobs.eu/job/${jobId}`,
      [ApplicationSource.HIPO]: `https://hipo.ro/job/${jobId}`,
      [ApplicationSource.INDEED]: `https://indeed.com/job/${jobId}`,
      [ApplicationSource.DIRECT]: `https://careers.example.com/jobs/${jobId}`,
      [ApplicationSource.REFERRAL]: '',
      [ApplicationSource.AGENCY]: '',
      [ApplicationSource.UNIVERSITY]: '',
      [ApplicationSource.OTHER]: '',
    };
    return urls[channel] || '';
  }

  private getBiasSeverity(category: BiasCategory): 'LOW' | 'MEDIUM' | 'HIGH' {
    const severities: Record<BiasCategory, 'LOW' | 'MEDIUM' | 'HIGH'> = {
      [BiasCategory.GENDER]: 'HIGH',
      [BiasCategory.AGE]: 'HIGH',
      [BiasCategory.DISABILITY]: 'HIGH',
      [BiasCategory.ETHNICITY]: 'HIGH',
      [BiasCategory.RELIGION]: 'MEDIUM',
      [BiasCategory.MARITAL_STATUS]: 'MEDIUM',
    };
    return severities[category] || 'LOW';
  }

  private getSourceCost(source: ApplicationSource): number {
    const costs: Record<ApplicationSource, number> = {
      [ApplicationSource.DIRECT]: 0,
      [ApplicationSource.REFERRAL]: 50,
      [ApplicationSource.LINKEDIN]: 150,
      [ApplicationSource.EJOBS]: 100,
      [ApplicationSource.BESTJOBS]: 80,
      [ApplicationSource.HIPO]: 90,
      [ApplicationSource.INDEED]: 120,
      [ApplicationSource.AGENCY]: 500,
      [ApplicationSource.UNIVERSITY]: 30,
      [ApplicationSource.OTHER]: 50,
    };
    return costs[source] || 50;
  }
}
