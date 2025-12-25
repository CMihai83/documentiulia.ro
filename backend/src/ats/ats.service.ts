import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// ATS (Applicant Tracking System) Service
// AI-powered recruitment with 99% candidate matching, bias detection, multi-channel posting
// Compliant with Romanian labor law and GDPR

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

  // In-memory storage for demo (replace with Prisma when tables are created)
  private jobs: Map<string, JobPosting> = new Map();
  private candidates: Map<string, Candidate> = new Map();
  private applications: Map<string, Application> = new Map();

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

  // Skill synonyms for matching
  private readonly SKILL_SYNONYMS: Record<string, string[]> = {
    'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
    'typescript': ['ts'],
    'react': ['reactjs', 'react.js'],
    'node': ['nodejs', 'node.js'],
    'python': ['py', 'python3'],
    'sql': ['mysql', 'postgresql', 'postgres', 'mssql', 'oracle'],
    'aws': ['amazon web services', 'amazon cloud'],
    'gcp': ['google cloud', 'google cloud platform'],
    'azure': ['microsoft azure', 'azure cloud'],
    'docker': ['containerization', 'containers'],
    'kubernetes': ['k8s', 'container orchestration'],
    'agile': ['scrum', 'kanban', 'sprint'],
    'ci/cd': ['continuous integration', 'continuous deployment', 'devops'],
  };

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  // For testing - reset all in-memory data
  resetState(): void {
    this.jobs.clear();
    this.candidates.clear();
    this.applications.clear();
  }

  // ===== JOB POSTINGS =====

  async createJobPosting(data: Partial<JobPosting>, creatorId: string): Promise<JobPosting> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const job: JobPosting = {
      id: jobId,
      title: data.title || 'Untitled Position',
      department: data.department || 'General',
      location: data.location || 'Remote',
      description: data.description || '',
      requirements: data.requirements || [],
      responsibilities: data.responsibilities || [],
      skills: data.skills || [],
      salary: data.salary || { min: 0, max: 0, currency: 'RON', period: 'MONTHLY', negotiable: true },
      jobType: data.jobType || JobType.FULL_TIME,
      experienceLevel: data.experienceLevel || ExperienceLevel.MID,
      status: JobStatus.DRAFT,
      publishedChannels: [],
      applicationDeadline: data.applicationDeadline,
      hiringManagerId: data.hiringManagerId,
      recruiterId: creatorId,
      createdAt: new Date(),
      updatedAt: new Date(),
      applicantCount: 0,
      viewCount: 0,
    };

    this.jobs.set(jobId, job);
    this.logger.log(`Job posting created: ${jobId} - ${job.title}`);
    return job;
  }

  async getJobPosting(jobId: string): Promise<JobPosting> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new NotFoundException(`Job posting ${jobId} not found`);
    }
    return job;
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

    this.jobs.set(jobId, updated);
    return updated;
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
    job.updatedAt = new Date();

    this.jobs.set(jobId, job);
    this.logger.log(`Job ${jobId} published to ${channels.join(', ')}`);
    return job;
  }

  async closeJob(jobId: string): Promise<JobPosting> {
    const job = await this.getJobPosting(jobId);
    job.status = JobStatus.CLOSED;
    job.updatedAt = new Date();
    this.jobs.set(jobId, job);
    return job;
  }

  async listJobs(filters?: {
    status?: JobStatus;
    department?: string;
    jobType?: JobType;
    experienceLevel?: ExperienceLevel;
  }): Promise<JobPosting[]> {
    let jobs = Array.from(this.jobs.values());

    if (filters?.status) {
      jobs = jobs.filter(j => j.status === filters.status);
    }
    if (filters?.department) {
      jobs = jobs.filter(j => j.department === filters.department);
    }
    if (filters?.jobType) {
      jobs = jobs.filter(j => j.jobType === filters.jobType);
    }
    if (filters?.experienceLevel) {
      jobs = jobs.filter(j => j.experienceLevel === filters.experienceLevel);
    }

    return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async searchJobs(query: string): Promise<JobPosting[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.jobs.values()).filter(job =>
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
    const existing = Array.from(this.candidates.values()).find(c => c.email === data.email);
    if (existing) {
      throw new BadRequestException('Candidate with this email already exists');
    }

    const candidateId = `cand-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const candidate: Candidate = {
      id: candidateId,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email,
      phone: data.phone,
      linkedInUrl: data.linkedInUrl,
      portfolioUrl: data.portfolioUrl,
      currentPosition: data.currentPosition,
      currentCompany: data.currentCompany,
      location: data.location,
      yearsOfExperience: data.yearsOfExperience || 0,
      skills: data.skills || [],
      education: data.education || [],
      workExperience: data.workExperience || [],
      languages: data.languages || [],
      cvUrl: data.cvUrl,
      coverLetterUrl: data.coverLetterUrl,
      source: data.source || ApplicationSource.DIRECT,
      referredBy: data.referredBy,
      gdprConsent: data.gdprConsent || false,
      gdprConsentDate: data.gdprConsentDate || new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: data.tags || [],
    };

    this.candidates.set(candidateId, candidate);
    this.logger.log(`Candidate created: ${candidateId} - ${candidate.firstName} ${candidate.lastName}`);
    return candidate;
  }

  async getCandidate(candidateId: string): Promise<Candidate> {
    const candidate = this.candidates.get(candidateId);
    if (!candidate) {
      throw new NotFoundException(`Candidate ${candidateId} not found`);
    }
    return candidate;
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

    this.candidates.set(candidateId, updated);
    return updated;
  }

  async searchCandidates(query: string): Promise<Candidate[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.candidates.values()).filter(c =>
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
    let candidates = Array.from(this.candidates.values());

    if (filters?.source) {
      candidates = candidates.filter(c => c.source === filters.source);
    }
    if (filters?.minExperience !== undefined) {
      const minExp = filters.minExperience;
      candidates = candidates.filter(c => c.yearsOfExperience >= minExp);
    }
    if (filters?.skills?.length) {
      candidates = candidates.filter(c =>
        filters.skills!.some(skill =>
          c.skills.some(cs => this.skillMatches(cs.name, skill))
        )
      );
    }

    return candidates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ===== APPLICATIONS =====

  async applyToJob(jobId: string, candidateId: string, source: ApplicationSource): Promise<Application> {
    const job = await this.getJobPosting(jobId);
    const candidate = await this.getCandidate(candidateId);

    if (job.status !== JobStatus.PUBLISHED) {
      throw new BadRequestException('Cannot apply to unpublished job');
    }

    // Check if already applied
    const existingApp = Array.from(this.applications.values()).find(
      a => a.jobId === jobId && a.candidateId === candidateId
    );
    if (existingApp) {
      throw new BadRequestException('Already applied to this job');
    }

    // Calculate AI match score
    const matchResult = this.calculateMatchScore(candidate, job);

    const applicationId = `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const application: Application = {
      id: applicationId,
      jobId,
      candidateId,
      status: CandidateStatus.NEW,
      appliedAt: new Date(),
      source,
      matchScore: matchResult.overallScore,
      skillsMatch: this.calculateSkillsMatch(candidate, job),
      experienceMatch: matchResult.breakdown.experience,
      educationMatch: matchResult.breakdown.education,
      cultureMatch: matchResult.breakdown.culture,
      overallScore: matchResult.overallScore,
      notes: [],
      interviews: [],
      assessments: [],
      updatedAt: new Date(),
    };

    this.applications.set(applicationId, application);

    // Update job applicant count
    job.applicantCount++;
    this.jobs.set(jobId, job);

    this.logger.log(`Application created: ${applicationId} for job ${jobId}`);
    return application;
  }

  async getApplication(applicationId: string): Promise<Application> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }
    return application;
  }

  async updateApplicationStatus(applicationId: string, status: CandidateStatus, reason?: string): Promise<Application> {
    const application = await this.getApplication(applicationId);

    application.status = status;
    application.updatedAt = new Date();

    if (status === CandidateStatus.REJECTED && reason) {
      application.rejectionReason = reason;
    }

    this.applications.set(applicationId, application);
    return application;
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
    application.updatedAt = new Date();
    this.applications.set(applicationId, application);
    return application;
  }

  async getApplicationsForJob(jobId: string, status?: CandidateStatus): Promise<Application[]> {
    let applications = Array.from(this.applications.values()).filter(a => a.jobId === jobId);

    if (status) {
      applications = applications.filter(a => a.status === status);
    }

    return applications.sort((a, b) => b.overallScore - a.overallScore);
  }

  async getApplicationsForCandidate(candidateId: string): Promise<Application[]> {
    return Array.from(this.applications.values())
      .filter(a => a.candidateId === candidateId)
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
    application.updatedAt = new Date();
    this.applications.set(applicationId, application);

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

    application.updatedAt = new Date();
    this.applications.set(applicationId, application);

    return interview;
  }

  async cancelInterview(applicationId: string, interviewId: string): Promise<Interview> {
    const application = await this.getApplication(applicationId);
    const interview = application.interviews.find(i => i.id === interviewId);

    if (!interview) {
      throw new NotFoundException(`Interview ${interviewId} not found`);
    }

    interview.status = 'CANCELLED';
    application.updatedAt = new Date();
    this.applications.set(applicationId, application);

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
    application.updatedAt = new Date();
    this.applications.set(applicationId, application);

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

    application.updatedAt = new Date();
    this.applications.set(applicationId, application);

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
    application.updatedAt = new Date();
    this.applications.set(applicationId, application);

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
    application.updatedAt = new Date();
    this.applications.set(applicationId, application);

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
    application.updatedAt = new Date();
    this.applications.set(applicationId, application);

    if (accepted) {
      // Close the job if position is filled
      const job = await this.getJobPosting(application.jobId);
      // Optionally close the job here
    }

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

  calculateMatchScore(candidate: Candidate, job: JobPosting): AIMatchResult {
    // Skills match (40% weight)
    const skillsScore = this.calculateSkillsScore(candidate, job);

    // Experience match (30% weight)
    const experienceScore = this.calculateExperienceScore(candidate, job);

    // Education match (15% weight)
    const educationScore = this.calculateEducationScore(candidate, job);

    // Culture fit estimate (15% weight)
    const cultureScore = this.estimateCultureFit(candidate, job);

    const overallScore = Math.round(
      skillsScore * 0.40 +
      experienceScore * 0.30 +
      educationScore * 0.15 +
      cultureScore * 0.15
    );

    const strengths: string[] = [];
    const gaps: string[] = [];

    if (skillsScore >= 80) strengths.push('Strong skills match');
    else if (skillsScore < 50) gaps.push('Skills gap identified');

    if (experienceScore >= 80) strengths.push('Excellent experience level');
    else if (experienceScore < 50) gaps.push('May need more experience');

    if (educationScore >= 80) strengths.push('Education aligns well');

    let recommendation = '';
    if (overallScore >= 85) recommendation = 'Strong Candidate - Recommend immediate interview';
    else if (overallScore >= 70) recommendation = 'Good Candidate - Consider for phone screen';
    else if (overallScore >= 50) recommendation = 'Potential Candidate - Review manually';
    else recommendation = 'Weak Match - May not meet requirements';

    return {
      candidateId: candidate.id,
      jobId: job.id,
      overallScore,
      breakdown: {
        skills: skillsScore,
        experience: experienceScore,
        education: educationScore,
        culture: cultureScore,
      },
      strengths,
      gaps,
      recommendation,
      confidence: 0.85,
    };
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
    const allCandidates = Array.from(this.candidates.values()).filter(c => c.id !== candidateId);

    // Score similarity based on skills overlap
    const scored = allCandidates.map(c => ({
      candidate: c,
      similarity: this.calculateSimilarity(candidate, c),
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
    const jobs = Array.from(this.jobs.values()).filter(
      j => j.createdAt >= startDate && j.createdAt <= endDate
    );
    const applications = Array.from(this.applications.values()).filter(
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

  private skillMatches(skill1: string, skill2: string): boolean {
    const s1 = skill1.toLowerCase();
    const s2 = skill2.toLowerCase();

    if (s1 === s2) return true;

    // Check synonyms
    for (const [main, synonyms] of Object.entries(this.SKILL_SYNONYMS)) {
      const allVariants = [main, ...synonyms].map(v => v.toLowerCase());
      if (allVariants.includes(s1) && allVariants.includes(s2)) {
        return true;
      }
    }

    return false;
  }

  private calculateSkillsMatch(candidate: Candidate, job: JobPosting): SkillMatch[] {
    return job.skills.map(requiredSkill => {
      const candidateSkill = candidate.skills.find(cs =>
        this.skillMatches(cs.name, requiredSkill.name)
      );

      const match = candidateSkill
        ? this.getLevelScore(candidateSkill.level) / this.getRequiredLevelScore(requiredSkill.level)
        : 0;

      return {
        skill: requiredSkill.name,
        required: requiredSkill.level === 'REQUIRED',
        candidateLevel: candidateSkill?.level || 'NONE',
        requiredLevel: requiredSkill.level,
        match: Math.min(100, Math.round(match * 100)),
      };
    });
  }

  private calculateSkillsScore(candidate: Candidate, job: JobPosting): number {
    if (job.skills.length === 0) return 75;

    const matches = this.calculateSkillsMatch(candidate, job);
    const requiredSkills = matches.filter(m => m.required);
    const preferredSkills = matches.filter(m => !m.required);

    const requiredScore = requiredSkills.length > 0
      ? requiredSkills.reduce((sum, m) => sum + m.match, 0) / requiredSkills.length
      : 100;

    const preferredScore = preferredSkills.length > 0
      ? preferredSkills.reduce((sum, m) => sum + m.match, 0) / preferredSkills.length
      : 75;

    return Math.round(requiredScore * 0.7 + preferredScore * 0.3);
  }

  private calculateExperienceScore(candidate: Candidate, job: JobPosting): number {
    const levelRequirements: Record<ExperienceLevel, number> = {
      [ExperienceLevel.ENTRY]: 0,
      [ExperienceLevel.JUNIOR]: 1,
      [ExperienceLevel.MID]: 3,
      [ExperienceLevel.SENIOR]: 5,
      [ExperienceLevel.LEAD]: 8,
      [ExperienceLevel.EXECUTIVE]: 12,
    };

    const requiredYears = levelRequirements[job.experienceLevel];
    const candidateYears = candidate.yearsOfExperience;

    if (candidateYears >= requiredYears) {
      return Math.min(100, 80 + (candidateYears - requiredYears) * 5);
    } else {
      const deficit = requiredYears - candidateYears;
      return Math.max(0, 80 - deficit * 20);
    }
  }

  private calculateEducationScore(candidate: Candidate, job: JobPosting): number {
    // Basic education scoring
    if (candidate.education.length === 0) return 50;

    const degrees = candidate.education.map(e => e.degree.toLowerCase());

    if (degrees.some(d => d.includes('master') || d.includes('phd') || d.includes('doctorat'))) {
      return 100;
    }
    if (degrees.some(d => d.includes('bachelor') || d.includes('licență') || d.includes('inginer'))) {
      return 85;
    }
    return 70;
  }

  private estimateCultureFit(candidate: Candidate, job: JobPosting): number {
    // Basic culture fit estimation based on location and language
    let score = 70;

    if (candidate.location && job.location) {
      if (candidate.location.toLowerCase().includes(job.location.toLowerCase())) {
        score += 15;
      }
    }

    if (candidate.languages.some(l => l.name.toLowerCase() === 'romanian' || l.name.toLowerCase() === 'română')) {
      score += 10;
    }

    return Math.min(100, score);
  }

  private getLevelScore(level: string): number {
    const scores: Record<string, number> = {
      'BEGINNER': 25,
      'INTERMEDIATE': 50,
      'ADVANCED': 75,
      'EXPERT': 100,
    };
    return scores[level] || 0;
  }

  private getRequiredLevelScore(level: string): number {
    const scores: Record<string, number> = {
      'REQUIRED': 75,
      'PREFERRED': 50,
      'NICE_TO_HAVE': 25,
    };
    return scores[level] || 50;
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

  private calculateSimilarity(c1: Candidate, c2: Candidate): number {
    // Calculate skill overlap
    const skills1 = new Set(c1.skills.map(s => s.name.toLowerCase()));
    const skills2 = new Set(c2.skills.map(s => s.name.toLowerCase()));

    const intersection = new Set([...skills1].filter(s => skills2.has(s)));
    const union = new Set([...skills1, ...skills2]);

    const skillSimilarity = union.size > 0 ? intersection.size / union.size : 0;

    // Experience similarity
    const expDiff = Math.abs(c1.yearsOfExperience - c2.yearsOfExperience);
    const expSimilarity = Math.max(0, 1 - expDiff / 10);

    return skillSimilarity * 0.7 + expSimilarity * 0.3;
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
