import { Injectable } from '@nestjs/common';

// Freelancer & Collaboration Hub Service
// AI-powered talent matching, vendor portal, and gig economy orchestration

// ===== TYPES =====

export type FreelancerStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'BLACKLISTED';
export type AvailabilityStatus = 'AVAILABLE' | 'PARTIALLY_AVAILABLE' | 'BUSY' | 'ON_VACATION' | 'NOT_AVAILABLE';
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' | 'MASTER';
export type ContractType = 'PFA' | 'SRL' | 'II' | 'IF' | 'FOREIGN_CONTRACTOR' | 'EU_POSTED_WORKER';
export type ProjectStatus = 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
export type ApplicationStatus = 'PENDING' | 'SHORTLISTED' | 'INTERVIEWING' | 'OFFERED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export type WorkforceClassification = 'EMPLOYEE' | 'INDEPENDENT_CONTRACTOR' | 'DEPENDENT_CONTRACTOR' | 'MISCLASSIFICATION_RISK';

export interface Skill {
  id: string;
  name: string;
  category: string;
  level: SkillLevel;
  yearsExperience: number;
  verified: boolean;
  verifiedAt?: Date;
  endorsements: number;
}

export interface FreelancerProfile {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl?: string;

  // Professional Info
  title: string;
  bio: string;
  skills: Skill[];
  hourlyRate: number;
  currency: string;

  // Business Entity
  contractType: ContractType;
  businessName?: string;
  cui?: string; // Romanian CUI/CIF
  vatNumber?: string;
  registrationNumber?: string; // J number for SRL

  // Location & Availability
  country: string;
  city: string;
  timezone: string;
  availability: AvailabilityStatus;
  availableHoursPerWeek: number;
  preferredProjectDuration: ('SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM')[];
  remoteOnly: boolean;
  willingToTravel: boolean;
  travelRadius?: number; // km

  // Experience & Ratings
  totalProjects: number;
  completedProjects: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  responseRate: number; // %
  responseTime: number; // hours
  onTimeDelivery: number; // %

  // Verification
  status: FreelancerStatus;
  identityVerified: boolean;
  portfolioVerified: boolean;
  skillsVerified: boolean;

  // Platforms
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  maltProfileId?: string;
  freelancerComProfileId?: string;
  upworkProfileId?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

export interface Project {
  id: string;
  clientId: string;
  title: string;
  description: string;
  requiredSkills: { skillName: string; minLevel: SkillLevel; required: boolean }[];

  // Budget
  budgetType: 'FIXED' | 'HOURLY' | 'MILESTONE';
  budgetMin: number;
  budgetMax: number;
  currency: string;

  // Timeline
  startDate?: Date;
  endDate?: Date;
  estimatedDuration: number; // days

  // Location
  locationType: 'REMOTE' | 'ONSITE' | 'HYBRID';
  location?: string;
  country: string;

  // Requirements
  experienceLevel: 'ENTRY' | 'INTERMEDIATE' | 'SENIOR' | 'EXPERT';
  contractTypes: ContractType[];
  languagesRequired: string[];

  // Status
  status: ProjectStatus;
  visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
  applicationsCount: number;
  shortlistedCount: number;
  maxApplicants?: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  closedAt?: Date;
}

export interface ProjectApplication {
  id: string;
  projectId: string;
  freelancerId: string;

  // Proposal
  coverLetter: string;
  proposedRate: number;
  proposedDuration: number; // days
  proposedStartDate: Date;

  // Match Score
  matchScore: number; // 0-100
  skillMatchScore: number;
  experienceMatchScore: number;
  rateMatchScore: number;
  availabilityMatchScore: number;

  // Status
  status: ApplicationStatus;

  // Interview
  interviewScheduledAt?: Date;
  interviewNotes?: string;
  interviewRating?: number;

  // Timestamps
  appliedAt: Date;
  updatedAt: Date;
  respondedAt?: Date;
}

export interface FreelancerReview {
  id: string;
  freelancerId: string;
  projectId: string;
  clientId: string;

  // Ratings (1-5)
  overallRating: number;
  qualityRating: number;
  communicationRating: number;
  timelinessRating: number;
  professionalismRating: number;

  // Feedback
  publicFeedback: string;
  privateFeedback?: string;

  // Project Details
  projectTitle: string;
  projectValue: number;

  // Timestamps
  createdAt: Date;
}

// EU Posted Workers Directive Compliance
export interface PostedWorkerDeclaration {
  id: string;
  freelancerId: string;
  projectId: string;

  // Worker Info
  workerNationality: string;
  homeCountry: string;
  hostCountry: string;

  // Assignment Details
  startDate: Date;
  endDate: Date;
  workLocation: string;
  jobDescription: string;

  // Pay & Conditions
  hourlyRate: number;
  currency: string;
  workingHoursPerWeek: number;
  restDays: string[];

  // Compliance
  a1CertificateNumber?: string; // Social security certificate
  a1ExpiryDate?: Date;
  healthInsuranceProvider?: string;
  healthInsurancePolicyNumber?: string;

  // Host Country Requirements
  minimumWageCompliant: boolean;
  hostCountryMinimumWage: number;
  equalTreatmentConfirmed: boolean;

  // Declaration Status
  submittedToAuthority: boolean;
  submissionDate?: Date;
  declarationNumber?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

  createdAt: Date;
  updatedAt: Date;
}

// OUG 79/2023 Workforce Classification
export interface ClassificationAssessment {
  id: string;
  freelancerId: string;
  assessedBy: string;
  assessmentDate: Date;

  // Assessment Criteria (Romanian OUG 79/2023)
  criteria: {
    // Control & Independence
    setsOwnSchedule: boolean; // Freelancer sets own work hours
    choosesWorkLocation: boolean; // Freelancer chooses where to work
    usesOwnEquipment: boolean; // Uses own tools/equipment
    canSubcontract: boolean; // Can hire helpers/subcontractors

    // Economic Dependence
    multipleClients: boolean; // Works for multiple clients
    clientRevenueShare: number; // % of revenue from this client
    marketsProfessionally: boolean; // Markets own services
    setsOwnRates: boolean; // Sets own pricing

    // Integration
    wearsCompanyUniform: boolean; // Required to wear client uniform
    usesCompanyEmail: boolean; // Uses client email address
    attendsCompanyMeetings: boolean; // Required team meetings
    reportsTomanager: boolean; // Reports to client manager

    // Risk & Profit
    bearsFinancialRisk: boolean; // Bears risk of loss
    canIncreaseProfit: boolean; // Can increase profit through efficiency
    invoicesForServices: boolean; // Issues invoices
    hasBusinessRegistration: boolean; // Registered PFA/SRL/II
  };

  // Scores
  independenceScore: number; // 0-100
  economicIndependenceScore: number; // 0-100
  integrationScore: number; // 0-100 (higher = more integrated = risk)
  entrepreneurialScore: number; // 0-100

  // Result
  overallScore: number;
  classification: WorkforceClassification;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];

  // Legal Reference
  legalBasis: string;
  relevantArticles: string[];
}

// Skill Categories
const SKILL_CATEGORIES = {
  'DEVELOPMENT': ['JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'React', 'Angular', 'Vue.js', 'Node.js', 'Django', 'Spring', '.NET', 'Laravel'],
  'DESIGN': ['UI Design', 'UX Design', 'Graphic Design', 'Logo Design', 'Brand Identity', 'Illustration', 'Motion Graphics', '3D Modeling', 'Figma', 'Adobe XD', 'Photoshop', 'Illustrator'],
  'MARKETING': ['SEO', 'SEM', 'Social Media Marketing', 'Content Marketing', 'Email Marketing', 'PPC', 'Google Ads', 'Facebook Ads', 'Analytics', 'Growth Hacking'],
  'WRITING': ['Copywriting', 'Content Writing', 'Technical Writing', 'Blog Writing', 'SEO Writing', 'Proofreading', 'Translation', 'Transcription'],
  'FINANCE': ['Accounting', 'Bookkeeping', 'Financial Analysis', 'Tax Preparation', 'Payroll', 'Budgeting', 'Financial Modeling', 'Audit'],
  'ADMIN': ['Virtual Assistant', 'Data Entry', 'Customer Support', 'Project Management', 'Executive Assistant', 'Research'],
  'LEGAL': ['Contract Law', 'Corporate Law', 'IP Law', 'Employment Law', 'GDPR Compliance', 'Legal Research'],
  'CONSULTING': ['Business Strategy', 'Management Consulting', 'HR Consulting', 'IT Consulting', 'Process Improvement']
};

// EU Countries for Posted Workers
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

// Minimum wages by country (EUR/hour, 2024 estimates)
const EU_MINIMUM_WAGES: Record<string, number> = {
  'RO': 4.2, 'BG': 2.8, 'HU': 4.5, 'PL': 5.0, 'CZ': 5.5, 'SK': 5.0,
  'DE': 12.4, 'FR': 11.7, 'NL': 13.3, 'BE': 12.0, 'AT': 11.0, 'IT': 9.5,
  'ES': 8.5, 'PT': 5.0, 'GR': 5.5, 'IE': 12.7, 'LU': 14.9, 'FI': 10.0,
  'SE': 12.0, 'DK': 15.0
};

@Injectable()
export class FreelancerService {
  // In-memory storage (would use Prisma in production)
  private freelancers = new Map<string, FreelancerProfile>();
  private projects = new Map<string, Project>();
  private applications = new Map<string, ProjectApplication>();
  private reviews = new Map<string, FreelancerReview>();
  private postedWorkerDeclarations = new Map<string, PostedWorkerDeclaration>();
  private classificationAssessments = new Map<string, ClassificationAssessment>();

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData(): void {
    // Initialize with some sample skill categories
  }

  // Reset for testing
  resetState(): void {
    this.freelancers.clear();
    this.projects.clear();
    this.applications.clear();
    this.reviews.clear();
    this.postedWorkerDeclarations.clear();
    this.classificationAssessments.clear();
  }

  // ===== FREELANCER PROFILE MANAGEMENT =====

  async createFreelancerProfile(data: Omit<FreelancerProfile, 'id' | 'createdAt' | 'updatedAt' | 'lastActiveAt' | 'totalProjects' | 'completedProjects' | 'totalEarnings' | 'averageRating' | 'totalReviews' | 'responseRate' | 'responseTime' | 'onTimeDelivery'>): Promise<FreelancerProfile> {
    const profile: FreelancerProfile = {
      id: `freelancer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      totalProjects: 0,
      completedProjects: 0,
      totalEarnings: 0,
      averageRating: 0,
      totalReviews: 0,
      responseRate: 100,
      responseTime: 24,
      onTimeDelivery: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActiveAt: new Date(),
    };

    this.freelancers.set(profile.id, profile);
    return profile;
  }

  async getFreelancerProfile(freelancerId: string): Promise<FreelancerProfile | null> {
    return this.freelancers.get(freelancerId) || null;
  }

  async updateFreelancerProfile(freelancerId: string, updates: Partial<FreelancerProfile>): Promise<FreelancerProfile> {
    const profile = this.freelancers.get(freelancerId);
    if (!profile) throw new Error('Freelancer not found');

    const updated: FreelancerProfile = {
      ...profile,
      ...updates,
      id: profile.id,
      createdAt: profile.createdAt,
      updatedAt: new Date(),
    };

    this.freelancers.set(freelancerId, updated);
    return updated;
  }

  async addSkill(freelancerId: string, skill: Omit<Skill, 'id' | 'verified' | 'endorsements'>): Promise<Skill> {
    const profile = this.freelancers.get(freelancerId);
    if (!profile) throw new Error('Freelancer not found');

    const newSkill: Skill = {
      id: `skill-${Date.now()}`,
      ...skill,
      verified: false,
      endorsements: 0,
    };

    profile.skills.push(newSkill);
    profile.updatedAt = new Date();
    return newSkill;
  }

  async verifySkill(freelancerId: string, skillId: string): Promise<Skill> {
    const profile = this.freelancers.get(freelancerId);
    if (!profile) throw new Error('Freelancer not found');

    const skill = profile.skills.find(s => s.id === skillId);
    if (!skill) throw new Error('Skill not found');

    skill.verified = true;
    skill.verifiedAt = new Date();
    profile.updatedAt = new Date();
    return skill;
  }

  async endorseSkill(freelancerId: string, skillId: string): Promise<Skill> {
    const profile = this.freelancers.get(freelancerId);
    if (!profile) throw new Error('Freelancer not found');

    const skill = profile.skills.find(s => s.id === skillId);
    if (!skill) throw new Error('Skill not found');

    skill.endorsements++;
    return skill;
  }

  async searchFreelancers(filters: {
    skills?: string[];
    minRating?: number;
    maxHourlyRate?: number;
    minHourlyRate?: number;
    availability?: AvailabilityStatus[];
    contractTypes?: ContractType[];
    countries?: string[];
    remoteOnly?: boolean;
    experienceLevel?: SkillLevel;
    verifiedOnly?: boolean;
  }): Promise<FreelancerProfile[]> {
    let results = Array.from(this.freelancers.values())
      .filter(f => f.status === 'ACTIVE');

    if (filters.skills?.length) {
      results = results.filter(f =>
        filters.skills!.some(skill =>
          f.skills.some(s => s.name.toLowerCase().includes(skill.toLowerCase()))
        )
      );
    }

    if (filters.minRating !== undefined) {
      results = results.filter(f => f.averageRating >= filters.minRating!);
    }

    if (filters.maxHourlyRate !== undefined) {
      results = results.filter(f => f.hourlyRate <= filters.maxHourlyRate!);
    }

    if (filters.minHourlyRate !== undefined) {
      results = results.filter(f => f.hourlyRate >= filters.minHourlyRate!);
    }

    if (filters.availability?.length) {
      results = results.filter(f => filters.availability!.includes(f.availability));
    }

    if (filters.contractTypes?.length) {
      results = results.filter(f => filters.contractTypes!.includes(f.contractType));
    }

    if (filters.countries?.length) {
      results = results.filter(f => filters.countries!.includes(f.country));
    }

    if (filters.remoteOnly) {
      results = results.filter(f => f.remoteOnly);
    }

    if (filters.verifiedOnly) {
      results = results.filter(f => f.identityVerified && f.skillsVerified);
    }

    return results;
  }

  // ===== AI TALENT MATCHING =====

  async matchFreelancersToProject(projectId: string): Promise<{
    freelancer: FreelancerProfile;
    matchScore: number;
    breakdown: {
      skillMatch: number;
      experienceMatch: number;
      rateMatch: number;
      availabilityMatch: number;
      locationMatch: number;
      ratingMatch: number;
    };
    highlights: string[];
    concerns: string[];
  }[]> {
    const project = this.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    const freelancers = Array.from(this.freelancers.values())
      .filter(f => f.status === 'ACTIVE' && f.availability !== 'NOT_AVAILABLE');

    const matches = freelancers.map(freelancer => {
      const breakdown = this.calculateMatchBreakdown(freelancer, project);
      const matchScore = this.calculateOverallMatch(breakdown);
      const { highlights, concerns } = this.analyzeMatch(freelancer, project, breakdown);

      return {
        freelancer,
        matchScore,
        breakdown,
        highlights,
        concerns,
      };
    });

    // Sort by match score descending
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  private calculateMatchBreakdown(freelancer: FreelancerProfile, project: Project): {
    skillMatch: number;
    experienceMatch: number;
    rateMatch: number;
    availabilityMatch: number;
    locationMatch: number;
    ratingMatch: number;
  } {
    // Skill Match (40% weight)
    const requiredSkills = project.requiredSkills;
    let skillPoints = 0;
    let maxSkillPoints = 0;

    for (const required of requiredSkills) {
      const weight = required.required ? 2 : 1;
      maxSkillPoints += weight * 100;

      const freelancerSkill = freelancer.skills.find(
        s => s.name.toLowerCase() === required.skillName.toLowerCase()
      );

      if (freelancerSkill) {
        const levelScore = this.getSkillLevelScore(freelancerSkill.level, required.minLevel);
        skillPoints += weight * levelScore;
        if (freelancerSkill.verified) skillPoints += weight * 10; // Bonus for verified
      }
    }
    const skillMatch = maxSkillPoints > 0 ? (skillPoints / maxSkillPoints) * 100 : 50;

    // Experience Match (20% weight)
    const experienceMap: Record<string, number> = {
      'ENTRY': 1, 'INTERMEDIATE': 2, 'SENIOR': 3, 'EXPERT': 4
    };
    const requiredLevel = experienceMap[project.experienceLevel] || 2;
    const avgYearsExp = freelancer.skills.length > 0
      ? freelancer.skills.reduce((sum, s) => sum + s.yearsExperience, 0) / freelancer.skills.length
      : 0;
    const freelancerLevel = avgYearsExp < 2 ? 1 : avgYearsExp < 5 ? 2 : avgYearsExp < 8 ? 3 : 4;
    const experienceMatch = Math.min(100, (freelancerLevel / requiredLevel) * 100);

    // Rate Match (15% weight)
    const midBudget = (project.budgetMin + project.budgetMax) / 2;
    let rateMatch: number;
    if (project.budgetType === 'HOURLY') {
      if (freelancer.hourlyRate <= project.budgetMax && freelancer.hourlyRate >= project.budgetMin) {
        rateMatch = 100;
      } else if (freelancer.hourlyRate < project.budgetMin) {
        rateMatch = 70; // Under budget is okay but might indicate less experience
      } else {
        rateMatch = Math.max(0, 100 - ((freelancer.hourlyRate - project.budgetMax) / project.budgetMax) * 100);
      }
    } else {
      rateMatch = 80; // Fixed projects - less relevant
    }

    // Availability Match (10% weight)
    let availabilityMatch = 50;
    if (freelancer.availability === 'AVAILABLE') availabilityMatch = 100;
    else if (freelancer.availability === 'PARTIALLY_AVAILABLE') availabilityMatch = 70;
    else if (freelancer.availability === 'BUSY') availabilityMatch = 30;

    // Location Match (10% weight)
    let locationMatch = 100;
    if (project.locationType === 'ONSITE') {
      if (freelancer.country !== project.country) {
        locationMatch = freelancer.willingToTravel ? 50 : 0;
      }
    } else if (project.locationType === 'REMOTE') {
      locationMatch = freelancer.remoteOnly ? 100 : 80;
    }

    // Contract type match
    if (!project.contractTypes.includes(freelancer.contractType)) {
      locationMatch *= 0.5;
    }

    // Rating Match (5% weight)
    const ratingMatch = freelancer.totalReviews > 0
      ? (freelancer.averageRating / 5) * 100
      : 50; // No reviews = neutral

    return { skillMatch, experienceMatch, rateMatch, availabilityMatch, locationMatch, ratingMatch };
  }

  private getSkillLevelScore(freelancerLevel: SkillLevel, requiredLevel: SkillLevel): number {
    const levels: Record<SkillLevel, number> = {
      'BEGINNER': 1, 'INTERMEDIATE': 2, 'ADVANCED': 3, 'EXPERT': 4, 'MASTER': 5
    };
    const fLevel = levels[freelancerLevel];
    const rLevel = levels[requiredLevel];

    if (fLevel >= rLevel) return 100;
    if (fLevel === rLevel - 1) return 70;
    return Math.max(0, 100 - (rLevel - fLevel) * 30);
  }

  private calculateOverallMatch(breakdown: {
    skillMatch: number;
    experienceMatch: number;
    rateMatch: number;
    availabilityMatch: number;
    locationMatch: number;
    ratingMatch: number;
  }): number {
    // Weighted average
    return Math.round(
      breakdown.skillMatch * 0.40 +
      breakdown.experienceMatch * 0.20 +
      breakdown.rateMatch * 0.15 +
      breakdown.availabilityMatch * 0.10 +
      breakdown.locationMatch * 0.10 +
      breakdown.ratingMatch * 0.05
    );
  }

  private analyzeMatch(freelancer: FreelancerProfile, project: Project, breakdown: {
    skillMatch: number;
    experienceMatch: number;
    rateMatch: number;
    availabilityMatch: number;
    locationMatch: number;
    ratingMatch: number;
  }): { highlights: string[]; concerns: string[] } {
    const highlights: string[] = [];
    const concerns: string[] = [];

    // Skill highlights
    if (breakdown.skillMatch >= 90) {
      highlights.push('Excellent skill match - has all required skills');
    } else if (breakdown.skillMatch >= 70) {
      highlights.push('Good skill coverage');
    }

    // Verified skills
    const verifiedCount = freelancer.skills.filter(s => s.verified).length;
    if (verifiedCount > 0) {
      highlights.push(`${verifiedCount} verified skill(s)`);
    }

    // High rating
    if (freelancer.averageRating >= 4.5 && freelancer.totalReviews >= 5) {
      highlights.push(`Highly rated (${freelancer.averageRating.toFixed(1)}/5 from ${freelancer.totalReviews} reviews)`);
    }

    // On-time delivery
    if (freelancer.onTimeDelivery >= 95) {
      highlights.push(`${freelancer.onTimeDelivery}% on-time delivery rate`);
    }

    // Fast responder
    if (freelancer.responseTime <= 4) {
      highlights.push('Fast responder (< 4 hours)');
    }

    // Experience
    if (freelancer.completedProjects >= 20) {
      highlights.push(`Experienced: ${freelancer.completedProjects} completed projects`);
    }

    // Concerns
    if (breakdown.skillMatch < 50) {
      concerns.push('Missing several required skills');
    }

    if (breakdown.rateMatch < 50) {
      concerns.push('Rate significantly above budget');
    }

    if (freelancer.availability === 'BUSY') {
      concerns.push('Currently busy - may have limited availability');
    }

    if (freelancer.totalReviews === 0) {
      concerns.push('No reviews yet - new to platform');
    }

    if (freelancer.onTimeDelivery < 80) {
      concerns.push(`Low on-time delivery rate (${freelancer.onTimeDelivery}%)`);
    }

    if (!freelancer.identityVerified) {
      concerns.push('Identity not verified');
    }

    return { highlights, concerns };
  }

  async findSimilarFreelancers(freelancerId: string, limit: number = 5): Promise<FreelancerProfile[]> {
    const source = this.freelancers.get(freelancerId);
    if (!source) throw new Error('Freelancer not found');

    const sourceSkills = new Set(source.skills.map(s => s.name.toLowerCase()));

    const others = Array.from(this.freelancers.values())
      .filter(f => f.id !== freelancerId && f.status === 'ACTIVE');

    const scored = others.map(f => {
      const fSkills = new Set(f.skills.map(s => s.name.toLowerCase()));
      const intersection = [...sourceSkills].filter(s => fSkills.has(s)).length;
      const union = new Set([...sourceSkills, ...fSkills]).size;
      const similarity = union > 0 ? intersection / union : 0;

      return { freelancer: f, similarity };
    });

    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(s => s.freelancer);
  }

  // ===== PROJECT MANAGEMENT =====

  async createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'applicationsCount' | 'shortlistedCount'>): Promise<Project> {
    const project: Project = {
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      applicationsCount: 0,
      shortlistedCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.projects.set(project.id, project);
    return project;
  }

  async getProject(projectId: string): Promise<Project | null> {
    return this.projects.get(projectId) || null;
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    const project = this.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    const updated: Project = {
      ...project,
      ...updates,
      id: project.id,
      createdAt: project.createdAt,
      updatedAt: new Date(),
    };

    this.projects.set(projectId, updated);
    return updated;
  }

  async publishProject(projectId: string): Promise<Project> {
    return this.updateProject(projectId, {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });
  }

  async searchProjects(filters: {
    skills?: string[];
    budgetMin?: number;
    budgetMax?: number;
    locationType?: ('REMOTE' | 'ONSITE' | 'HYBRID')[];
    countries?: string[];
    experienceLevel?: ('ENTRY' | 'INTERMEDIATE' | 'SENIOR' | 'EXPERT')[];
    contractTypes?: ContractType[];
    status?: ProjectStatus[];
  }): Promise<Project[]> {
    let results = Array.from(this.projects.values());

    if (filters.status?.length) {
      results = results.filter(p => filters.status!.includes(p.status));
    } else {
      results = results.filter(p => p.status === 'PUBLISHED');
    }

    if (filters.skills?.length) {
      results = results.filter(p =>
        filters.skills!.some(skill =>
          p.requiredSkills.some(rs => rs.skillName.toLowerCase().includes(skill.toLowerCase()))
        )
      );
    }

    if (filters.budgetMin !== undefined) {
      results = results.filter(p => p.budgetMax >= filters.budgetMin!);
    }

    if (filters.budgetMax !== undefined) {
      results = results.filter(p => p.budgetMin <= filters.budgetMax!);
    }

    if (filters.locationType?.length) {
      results = results.filter(p => filters.locationType!.includes(p.locationType));
    }

    if (filters.countries?.length) {
      results = results.filter(p => filters.countries!.includes(p.country));
    }

    if (filters.experienceLevel?.length) {
      results = results.filter(p => filters.experienceLevel!.includes(p.experienceLevel));
    }

    if (filters.contractTypes?.length) {
      results = results.filter(p =>
        p.contractTypes.some(ct => filters.contractTypes!.includes(ct))
      );
    }

    return results;
  }

  // ===== APPLICATIONS =====

  async applyToProject(data: {
    projectId: string;
    freelancerId: string;
    coverLetter: string;
    proposedRate: number;
    proposedDuration: number;
    proposedStartDate: Date;
  }): Promise<ProjectApplication> {
    const project = this.projects.get(data.projectId);
    if (!project) throw new Error('Project not found');

    const freelancer = this.freelancers.get(data.freelancerId);
    if (!freelancer) throw new Error('Freelancer not found');

    // Calculate match scores
    const breakdown = this.calculateMatchBreakdown(freelancer, project);
    const matchScore = this.calculateOverallMatch(breakdown);

    const application: ProjectApplication = {
      id: `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: data.projectId,
      freelancerId: data.freelancerId,
      coverLetter: data.coverLetter,
      proposedRate: data.proposedRate,
      proposedDuration: data.proposedDuration,
      proposedStartDate: data.proposedStartDate,
      matchScore,
      skillMatchScore: breakdown.skillMatch,
      experienceMatchScore: breakdown.experienceMatch,
      rateMatchScore: breakdown.rateMatch,
      availabilityMatchScore: breakdown.availabilityMatch,
      status: 'PENDING',
      appliedAt: new Date(),
      updatedAt: new Date(),
    };

    this.applications.set(application.id, application);

    // Update project counts
    project.applicationsCount++;

    return application;
  }

  async getApplicationsForProject(projectId: string): Promise<ProjectApplication[]> {
    return Array.from(this.applications.values())
      .filter(a => a.projectId === projectId)
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  async getApplicationsForFreelancer(freelancerId: string): Promise<ProjectApplication[]> {
    return Array.from(this.applications.values())
      .filter(a => a.freelancerId === freelancerId);
  }

  async updateApplicationStatus(applicationId: string, status: ApplicationStatus, notes?: string): Promise<ProjectApplication> {
    const application = this.applications.get(applicationId);
    if (!application) throw new Error('Application not found');

    application.status = status;
    application.updatedAt = new Date();
    application.respondedAt = new Date();

    if (notes && status === 'INTERVIEWING') {
      application.interviewNotes = notes;
    }

    // Update project shortlist count
    if (status === 'SHORTLISTED') {
      const project = this.projects.get(application.projectId);
      if (project) project.shortlistedCount++;
    }

    return application;
  }

  async scheduleInterview(applicationId: string, scheduledAt: Date): Promise<ProjectApplication> {
    const application = this.applications.get(applicationId);
    if (!application) throw new Error('Application not found');

    application.status = 'INTERVIEWING';
    application.interviewScheduledAt = scheduledAt;
    application.updatedAt = new Date();

    return application;
  }

  async rateInterview(applicationId: string, rating: number, notes: string): Promise<ProjectApplication> {
    const application = this.applications.get(applicationId);
    if (!application) throw new Error('Application not found');

    application.interviewRating = rating;
    application.interviewNotes = notes;
    application.updatedAt = new Date();

    return application;
  }

  // ===== REVIEWS =====

  async addReview(data: Omit<FreelancerReview, 'id' | 'createdAt'>): Promise<FreelancerReview> {
    const review: FreelancerReview = {
      id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: new Date(),
    };

    this.reviews.set(review.id, review);

    // Update freelancer ratings
    const freelancer = this.freelancers.get(data.freelancerId);
    if (freelancer) {
      const allReviews = Array.from(this.reviews.values())
        .filter(r => r.freelancerId === data.freelancerId);

      freelancer.totalReviews = allReviews.length;
      freelancer.averageRating = allReviews.reduce((sum, r) => sum + r.overallRating, 0) / allReviews.length;
      freelancer.completedProjects++;
      freelancer.totalEarnings += data.projectValue;
    }

    return review;
  }

  async getFreelancerReviews(freelancerId: string): Promise<FreelancerReview[]> {
    return Array.from(this.reviews.values())
      .filter(r => r.freelancerId === freelancerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ===== EU POSTED WORKERS DIRECTIVE =====

  async createPostedWorkerDeclaration(data: Omit<PostedWorkerDeclaration, 'id' | 'createdAt' | 'updatedAt' | 'minimumWageCompliant' | 'hostCountryMinimumWage'>): Promise<PostedWorkerDeclaration> {
    const hostMinWage = EU_MINIMUM_WAGES[data.hostCountry] || 10;
    const minimumWageCompliant = data.hourlyRate >= hostMinWage;

    const declaration: PostedWorkerDeclaration = {
      id: `pwd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      hostCountryMinimumWage: hostMinWage,
      minimumWageCompliant,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.postedWorkerDeclarations.set(declaration.id, declaration);
    return declaration;
  }

  async getPostedWorkerDeclaration(declarationId: string): Promise<PostedWorkerDeclaration | null> {
    return this.postedWorkerDeclarations.get(declarationId) || null;
  }

  async submitPostedWorkerDeclaration(declarationId: string): Promise<PostedWorkerDeclaration> {
    const declaration = this.postedWorkerDeclarations.get(declarationId);
    if (!declaration) throw new Error('Declaration not found');

    // Validate before submission
    const validation = this.validatePostedWorkerDeclaration(declaration);
    if (!validation.valid) {
      throw new Error(`Declaration invalid: ${validation.errors.join(', ')}`);
    }

    declaration.submittedToAuthority = true;
    declaration.submissionDate = new Date();
    declaration.declarationNumber = `PWD-${declaration.hostCountry}-${Date.now()}`;
    declaration.status = 'SUBMITTED';
    declaration.updatedAt = new Date();

    return declaration;
  }

  validatePostedWorkerDeclaration(declaration: PostedWorkerDeclaration): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check EU countries
    if (!EU_COUNTRIES.includes(declaration.homeCountry)) {
      errors.push(`Home country ${declaration.homeCountry} is not an EU member state`);
    }
    if (!EU_COUNTRIES.includes(declaration.hostCountry)) {
      errors.push(`Host country ${declaration.hostCountry} is not an EU member state`);
    }

    // Check minimum wage
    if (!declaration.minimumWageCompliant) {
      errors.push(`Hourly rate (€${declaration.hourlyRate}) is below host country minimum wage (€${declaration.hostCountryMinimumWage})`);
    }

    // Check A1 certificate
    if (!declaration.a1CertificateNumber) {
      errors.push('A1 social security certificate is required for posted workers');
    } else if (declaration.a1ExpiryDate && declaration.a1ExpiryDate < declaration.endDate) {
      errors.push('A1 certificate expires before assignment end date');
    }

    // Check health insurance
    if (!declaration.healthInsuranceProvider || !declaration.healthInsurancePolicyNumber) {
      errors.push('Health insurance details are required');
    }

    // Check equal treatment
    if (!declaration.equalTreatmentConfirmed) {
      warnings.push('Equal treatment confirmation not provided');
    }

    // Check assignment duration (max 12 months, extendable to 18)
    const durationMonths = Math.ceil((declaration.endDate.getTime() - declaration.startDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
    if (durationMonths > 18) {
      warnings.push(`Assignment duration (${durationMonths} months) exceeds 18-month limit - worker may be subject to host country employment law`);
    } else if (durationMonths > 12) {
      warnings.push(`Assignment duration (${durationMonths} months) exceeds initial 12-month period - extended provisions apply`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async getPostedWorkerDeclarationsForFreelancer(freelancerId: string): Promise<PostedWorkerDeclaration[]> {
    return Array.from(this.postedWorkerDeclarations.values())
      .filter(d => d.freelancerId === freelancerId);
  }

  async checkCrossBorderCompliance(freelancerId: string, hostCountry: string, hourlyRate: number): Promise<{
    compliant: boolean;
    requirements: string[];
    minimumWage: number;
    rateCompliant: boolean;
    documentsRequired: string[];
  }> {
    const minWage = EU_MINIMUM_WAGES[hostCountry] || 10;
    const rateCompliant = hourlyRate >= minWage;

    const requirements = [
      'A1 Social Security Certificate from home country',
      'Valid health insurance covering host country',
      'Pre-assignment notification to host country authorities',
      'Compliance with host country working time regulations',
      'Equal treatment with local workers for core conditions',
    ];

    const documentsRequired = [
      'A1 Certificate (portable document)',
      'European Health Insurance Card (EHIC) or private insurance',
      'Posted Worker Declaration form',
      'Employment contract (translated)',
      'Proof of accommodation in host country',
    ];

    if (!rateCompliant) {
      requirements.unshift(`Increase hourly rate to minimum €${minWage}/hour`);
    }

    return {
      compliant: rateCompliant,
      requirements,
      minimumWage: minWage,
      rateCompliant,
      documentsRequired,
    };
  }

  // ===== WORKFORCE CLASSIFICATION (OUG 79/2023) =====

  async performClassificationAssessment(freelancerId: string, assessedBy: string, criteria: ClassificationAssessment['criteria']): Promise<ClassificationAssessment> {
    // Calculate scores based on criteria

    // Independence Score (higher = more independent = good)
    const independenceFactors = [
      criteria.setsOwnSchedule,
      criteria.choosesWorkLocation,
      criteria.usesOwnEquipment,
      criteria.canSubcontract,
    ];
    const independenceScore = (independenceFactors.filter(Boolean).length / independenceFactors.length) * 100;

    // Economic Independence Score (higher = more independent = good)
    const economicFactors = [
      criteria.multipleClients,
      criteria.clientRevenueShare < 75, // Less than 75% from one client
      criteria.marketsProfessionally,
      criteria.setsOwnRates,
    ];
    const economicIndependenceScore = (economicFactors.filter(Boolean).length / economicFactors.length) * 100;

    // Integration Score (higher = more integrated = bad/risk)
    const integrationFactors = [
      criteria.wearsCompanyUniform,
      criteria.usesCompanyEmail,
      criteria.attendsCompanyMeetings,
      criteria.reportsTomanager,
    ];
    const integrationScore = (integrationFactors.filter(Boolean).length / integrationFactors.length) * 100;

    // Entrepreneurial Score (higher = more entrepreneurial = good)
    const entrepreneurialFactors = [
      criteria.bearsFinancialRisk,
      criteria.canIncreaseProfit,
      criteria.invoicesForServices,
      criteria.hasBusinessRegistration,
    ];
    const entrepreneurialScore = (entrepreneurialFactors.filter(Boolean).length / entrepreneurialFactors.length) * 100;

    // Calculate overall score (weighted)
    const overallScore = (
      independenceScore * 0.25 +
      economicIndependenceScore * 0.25 +
      (100 - integrationScore) * 0.25 + // Invert integration (high integration = bad)
      entrepreneurialScore * 0.25
    );

    // Determine classification
    let classification: WorkforceClassification;
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    const recommendations: string[] = [];

    if (overallScore >= 75) {
      classification = 'INDEPENDENT_CONTRACTOR';
      riskLevel = 'LOW';
      recommendations.push('Worker demonstrates clear independent contractor characteristics');
    } else if (overallScore >= 50) {
      classification = 'DEPENDENT_CONTRACTOR';
      riskLevel = 'MEDIUM';
      recommendations.push('Worker shows some dependency - consider strengthening independence factors');

      if (!criteria.multipleClients) {
        recommendations.push('Encourage worker to take on additional clients');
      }
      if (criteria.usesCompanyEmail) {
        recommendations.push('Consider allowing worker to use own email address');
      }
    } else if (overallScore >= 25) {
      classification = 'MISCLASSIFICATION_RISK';
      riskLevel = 'HIGH';
      recommendations.push('High risk of misclassification - immediate review recommended');
      recommendations.push('Consider restructuring engagement or transitioning to employment');

      if (criteria.clientRevenueShare >= 75) {
        recommendations.push('Critical: Worker receives >75% revenue from single client - potential dependent employment per OUG 79/2023');
      }
    } else {
      classification = 'EMPLOYEE';
      riskLevel = 'CRITICAL';
      recommendations.push('Worker characteristics indicate employment relationship');
      recommendations.push('Recommend converting to formal employment contract per Codul Muncii');
      recommendations.push('Failure to do so may result in fines of 10,000-20,000 RON per Art. 260 Codul Muncii');
    }

    // Add specific recommendations based on criteria
    if (integrationScore >= 75) {
      recommendations.push('High integration level - reduce mandatory company processes');
    }
    if (!criteria.hasBusinessRegistration) {
      recommendations.push('Worker should obtain PFA/II/SRL registration');
    }
    if (!criteria.invoicesForServices) {
      recommendations.push('Worker should issue formal invoices for services');
    }

    const assessment: ClassificationAssessment = {
      id: `assess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      freelancerId,
      assessedBy,
      assessmentDate: new Date(),
      criteria,
      independenceScore,
      economicIndependenceScore,
      integrationScore,
      entrepreneurialScore,
      overallScore,
      classification,
      riskLevel,
      recommendations,
      legalBasis: 'OUG 79/2023 privind reglementarea activității prestatorilor de servicii',
      relevantArticles: ['Art. 3 - Definiția prestatorului independent', 'Art. 5 - Criteriile de independență', 'Art. 7 - Sancțiuni'],
    };

    this.classificationAssessments.set(assessment.id, assessment);
    return assessment;
  }

  async getClassificationAssessments(freelancerId: string): Promise<ClassificationAssessment[]> {
    return Array.from(this.classificationAssessments.values())
      .filter(a => a.freelancerId === freelancerId)
      .sort((a, b) => b.assessmentDate.getTime() - a.assessmentDate.getTime());
  }

  async getLatestClassification(freelancerId: string): Promise<ClassificationAssessment | null> {
    const assessments = await this.getClassificationAssessments(freelancerId);
    return assessments[0] || null;
  }

  // ===== VENDOR PORTAL =====

  async getVendorDashboard(freelancerId: string): Promise<{
    profile: FreelancerProfile;
    activeProjects: number;
    pendingApplications: number;
    totalEarnings: number;
    averageRating: number;
    recentReviews: FreelancerReview[];
    recommendedProjects: Project[];
    classificationStatus: ClassificationAssessment | null;
    postedWorkerDeclarations: PostedWorkerDeclaration[];
    alerts: { type: string; message: string; severity: 'INFO' | 'WARNING' | 'CRITICAL' }[];
  }> {
    const profile = this.freelancers.get(freelancerId);
    if (!profile) throw new Error('Freelancer not found');

    const applications = await this.getApplicationsForFreelancer(freelancerId);
    const pendingApplications = applications.filter(a => a.status === 'PENDING').length;
    const activeProjects = applications.filter(a => a.status === 'ACCEPTED').length;

    const reviews = await this.getFreelancerReviews(freelancerId);
    const recentReviews = reviews.slice(0, 5);

    // Get recommended projects based on skills
    const allProjects = Array.from(this.projects.values()).filter(p => p.status === 'PUBLISHED');
    const recommendedProjects = allProjects
      .filter(p => {
        const hasMatchingSkill = p.requiredSkills.some(rs =>
          profile.skills.some(s => s.name.toLowerCase() === rs.skillName.toLowerCase())
        );
        const notApplied = !applications.some(a => a.projectId === p.id);
        return hasMatchingSkill && notApplied;
      })
      .slice(0, 5);

    const classificationStatus = await this.getLatestClassification(freelancerId);
    const postedWorkerDeclarations = await this.getPostedWorkerDeclarationsForFreelancer(freelancerId);

    // Generate alerts
    const alerts: { type: string; message: string; severity: 'INFO' | 'WARNING' | 'CRITICAL' }[] = [];

    if (!profile.identityVerified) {
      alerts.push({ type: 'VERIFICATION', message: 'Complete identity verification to increase visibility', severity: 'WARNING' });
    }

    if (profile.skills.length < 3) {
      alerts.push({ type: 'PROFILE', message: 'Add more skills to improve match opportunities', severity: 'INFO' });
    }

    if (classificationStatus?.riskLevel === 'HIGH' || classificationStatus?.riskLevel === 'CRITICAL') {
      alerts.push({ type: 'COMPLIANCE', message: `Workforce classification risk: ${classificationStatus.riskLevel}`, severity: 'CRITICAL' });
    }

    const expiringDeclarations = postedWorkerDeclarations.filter(d => {
      const daysUntilEnd = Math.ceil((d.endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      return daysUntilEnd > 0 && daysUntilEnd <= 30;
    });
    if (expiringDeclarations.length > 0) {
      alerts.push({ type: 'POSTED_WORKER', message: `${expiringDeclarations.length} posted worker declaration(s) expiring soon`, severity: 'WARNING' });
    }

    return {
      profile,
      activeProjects,
      pendingApplications,
      totalEarnings: profile.totalEarnings,
      averageRating: profile.averageRating,
      recentReviews,
      recommendedProjects,
      classificationStatus,
      postedWorkerDeclarations,
      alerts,
    };
  }

  // ===== ANALYTICS =====

  async getFreelancerAnalytics(freelancerId: string): Promise<{
    earnings: { month: string; amount: number }[];
    projectsByStatus: Record<ApplicationStatus, number>;
    skillDemand: { skill: string; demandScore: number }[];
    responseMetrics: { responseRate: number; averageResponseTime: number };
    competitiveAnalysis: {
      averageRateInCategory: number;
      yourRate: number;
      position: 'BELOW_AVERAGE' | 'AVERAGE' | 'ABOVE_AVERAGE';
    };
  }> {
    const profile = this.freelancers.get(freelancerId);
    if (!profile) throw new Error('Freelancer not found');

    const applications = await this.getApplicationsForFreelancer(freelancerId);

    // Calculate earnings by month (simulated)
    const earnings: { month: string; amount: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      earnings.push({
        month: month.toISOString().slice(0, 7),
        amount: Math.random() * 5000 + 1000,
      });
    }

    // Projects by status
    const projectsByStatus: Record<ApplicationStatus, number> = {
      'PENDING': 0, 'SHORTLISTED': 0, 'INTERVIEWING': 0, 'OFFERED': 0,
      'ACCEPTED': 0, 'REJECTED': 0, 'WITHDRAWN': 0
    };
    for (const app of applications) {
      projectsByStatus[app.status]++;
    }

    // Skill demand (based on project requirements)
    const allProjects = Array.from(this.projects.values());
    const skillCounts = new Map<string, number>();
    for (const project of allProjects) {
      for (const skill of project.requiredSkills) {
        const count = skillCounts.get(skill.skillName) || 0;
        skillCounts.set(skill.skillName, count + 1);
      }
    }
    const skillDemand = profile.skills.map(s => ({
      skill: s.name,
      demandScore: skillCounts.get(s.name) || 0,
    })).sort((a, b) => b.demandScore - a.demandScore);

    // Competitive analysis
    const similarFreelancers = Array.from(this.freelancers.values())
      .filter(f => f.id !== freelancerId && f.status === 'ACTIVE');
    const avgRate = similarFreelancers.length > 0
      ? similarFreelancers.reduce((sum, f) => sum + f.hourlyRate, 0) / similarFreelancers.length
      : profile.hourlyRate;

    let position: 'BELOW_AVERAGE' | 'AVERAGE' | 'ABOVE_AVERAGE';
    if (profile.hourlyRate < avgRate * 0.9) position = 'BELOW_AVERAGE';
    else if (profile.hourlyRate > avgRate * 1.1) position = 'ABOVE_AVERAGE';
    else position = 'AVERAGE';

    return {
      earnings,
      projectsByStatus,
      skillDemand,
      responseMetrics: {
        responseRate: profile.responseRate,
        averageResponseTime: profile.responseTime,
      },
      competitiveAnalysis: {
        averageRateInCategory: Math.round(avgRate * 100) / 100,
        yourRate: profile.hourlyRate,
        position,
      },
    };
  }

  async getPlatformStatistics(): Promise<{
    totalFreelancers: number;
    activeFreelancers: number;
    totalProjects: number;
    openProjects: number;
    totalApplications: number;
    averageMatchScore: number;
    topSkills: { skill: string; count: number }[];
    freelancersByCountry: { country: string; count: number }[];
    averageHourlyRate: number;
  }> {
    const freelancers = Array.from(this.freelancers.values());
    const projects = Array.from(this.projects.values());
    const applications = Array.from(this.applications.values());

    // Top skills
    const skillCounts = new Map<string, number>();
    for (const f of freelancers) {
      for (const skill of f.skills) {
        const count = skillCounts.get(skill.name) || 0;
        skillCounts.set(skill.name, count + 1);
      }
    }
    const topSkills = Array.from(skillCounts.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // By country
    const countryCounts = new Map<string, number>();
    for (const f of freelancers) {
      const count = countryCounts.get(f.country) || 0;
      countryCounts.set(f.country, count + 1);
    }
    const freelancersByCountry = Array.from(countryCounts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalFreelancers: freelancers.length,
      activeFreelancers: freelancers.filter(f => f.status === 'ACTIVE').length,
      totalProjects: projects.length,
      openProjects: projects.filter(p => p.status === 'PUBLISHED').length,
      totalApplications: applications.length,
      averageMatchScore: applications.length > 0
        ? applications.reduce((sum, a) => sum + a.matchScore, 0) / applications.length
        : 0,
      topSkills,
      freelancersByCountry,
      averageHourlyRate: freelancers.length > 0
        ? freelancers.reduce((sum, f) => sum + f.hourlyRate, 0) / freelancers.length
        : 0,
    };
  }

  // ===== SKILL CATEGORIES =====

  getSkillCategories(): typeof SKILL_CATEGORIES {
    return SKILL_CATEGORIES;
  }

  getEUCountries(): string[] {
    return EU_COUNTRIES;
  }

  getMinimumWages(): Record<string, number> {
    return EU_MINIMUM_WAGES;
  }
}
