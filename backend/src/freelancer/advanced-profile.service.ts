import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Sprint 22: Freelancer Hub v2 - Advanced Profile Features
// Portfolio management, skill certifications, profile visibility, and enhanced matching

// ===== TYPES =====

export type PortfolioItemType = 'IMAGE' | 'PDF' | 'VIDEO' | 'LINK' | 'CODE_SAMPLE';
export type CertificationStatus = 'PENDING' | 'VERIFIED' | 'EXPIRED' | 'REJECTED';
export type ProfileVisibility = 'PUBLIC' | 'PRIVATE' | 'CLIENTS_ONLY' | 'INVITE_ONLY';
export type VerificationLevel = 'NONE' | 'BASIC' | 'VERIFIED' | 'PREMIUM';
export type SkillEndorsementType = 'CLIENT' | 'PEER' | 'SELF' | 'PLATFORM';

export interface PortfolioItem {
  id: string;
  freelancerId: string;
  title: string;
  description: string;
  type: PortfolioItemType;

  // File/content
  fileUrl?: string;
  thumbnailUrl?: string;
  externalUrl?: string;
  fileSize?: number; // bytes
  mimeType?: string;

  // Metadata
  tags: string[];
  skills: string[];
  projectDate?: Date;
  clientName?: string;
  clientTestimonial?: string;

  // Display
  order: number;
  featured: boolean;
  viewCount: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillCertification {
  id: string;
  freelancerId: string;
  skillId: string;
  skillName: string;

  // Certification details
  certificationName: string;
  issuingOrganization: string;
  issueDate: Date;
  expirationDate?: Date;
  credentialId?: string;
  credentialUrl?: string;

  // Verification
  status: CertificationStatus;
  verifiedAt?: Date;
  verifiedBy?: string;
  documentUrl?: string;

  // Display
  featured: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillEndorsement {
  id: string;
  freelancerId: string;
  skillId: string;
  skillName: string;

  // Endorser
  endorserType: SkillEndorsementType;
  endorserId?: string;
  endorserName: string;
  endorserTitle?: string;
  endorserCompany?: string;

  // Content
  comment?: string;
  rating: number; // 1-5

  // Timestamps
  createdAt: Date;
}

export interface ProfileSettings {
  freelancerId: string;

  // Visibility
  visibility: ProfileVisibility;
  showContactInfo: boolean;
  showHourlyRate: boolean;
  showAvailability: boolean;
  showEarnings: boolean;
  showReviews: boolean;

  // Notifications
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  notifyOnProjectMatch: boolean;
  notifyOnClientView: boolean;
  notifyOnEndorsement: boolean;

  // Privacy
  allowClientContact: boolean;
  allowSearchEngines: boolean;
  hiddenFromClients: string[]; // Client IDs to hide from

  // Preferences
  preferredLanguages: string[];
  preferredCurrencies: string[];
  minimumProjectBudget?: number;
  maximumProjectDuration?: number; // Days

  // Timestamps
  updatedAt: Date;
}

export interface ProfileAnalytics {
  freelancerId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';

  // Views
  profileViews: number;
  uniqueViewers: number;
  searchAppearances: number;

  // Engagement
  portfolioViews: number;
  contactRequests: number;
  projectInvitations: number;
  proposalsSent: number;
  proposalsAccepted: number;

  // Conversion
  viewToContactRate: number;
  contactToHireRate: number;

  // Trends
  viewsTrend: number; // Percentage change
  engagementTrend: number;

  // Top sources
  topViewSources: { source: string; count: number }[];
  topSearchTerms: { term: string; count: number }[];

  // Timestamp
  calculatedAt: Date;
}

export interface ProfileCompleteness {
  freelancerId: string;
  overallScore: number; // 0-100

  sections: {
    name: string;
    score: number;
    maxScore: number;
    missingItems: string[];
    suggestions: string[];
  }[];

  nextSteps: string[];
  estimatedTimeToComplete: number; // Minutes
}

export interface AdvancedProfile {
  freelancerId: string;

  // Basic info (from main profile)
  displayName: string;
  title: string;
  bio: string;
  avatar?: string;
  coverImage?: string;

  // Location
  country: string;
  city: string;
  timezone: string;

  // Professional
  yearsOfExperience: number;
  educationLevel?: string;
  languages: { language: string; proficiency: 'BASIC' | 'CONVERSATIONAL' | 'FLUENT' | 'NATIVE' }[];

  // Verification
  verificationLevel: VerificationLevel;
  identityVerified: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
  paymentVerified: boolean;

  // Stats
  totalEarnings: number;
  totalProjects: number;
  successRate: number;
  avgRating: number;
  totalReviews: number;
  repeatClientRate: number;

  // Portfolio
  portfolioItems: PortfolioItem[];

  // Certifications
  certifications: SkillCertification[];

  // Skills with endorsements
  skills: {
    id: string;
    name: string;
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
    endorsementCount: number;
    verified: boolean;
  }[];

  // Settings
  settings: ProfileSettings;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

// ===== CONSTANTS =====

const MAX_PORTFOLIO_ITEMS = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf'];

@Injectable()
export class AdvancedProfileService {
  private readonly logger = new Logger(AdvancedProfileService.name);

  // Storage
  private readonly portfolioItems: Map<string, PortfolioItem[]> = new Map();
  private readonly certifications: Map<string, SkillCertification[]> = new Map();
  private readonly endorsements: Map<string, SkillEndorsement[]> = new Map();
  private readonly profileSettings: Map<string, ProfileSettings> = new Map();
  private readonly profileAnalytics: Map<string, ProfileAnalytics> = new Map();
  private readonly profiles: Map<string, AdvancedProfile> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  // ===== PORTFOLIO MANAGEMENT =====

  async addPortfolioItem(
    freelancerId: string,
    data: Omit<PortfolioItem, 'id' | 'freelancerId' | 'viewCount' | 'createdAt' | 'updatedAt'>,
  ): Promise<PortfolioItem> {
    const items = this.portfolioItems.get(freelancerId) || [];

    if (items.length >= MAX_PORTFOLIO_ITEMS) {
      throw new BadRequestException(`Maximum ${MAX_PORTFOLIO_ITEMS} portfolio items allowed`);
    }

    // Validate file size if provided
    if (data.fileSize && data.fileSize > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const item: PortfolioItem = {
      ...data,
      id: this.generateId(),
      freelancerId,
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    items.push(item);
    this.portfolioItems.set(freelancerId, items);

    this.eventEmitter.emit('profile.portfolio.added', {
      freelancerId,
      itemId: item.id,
      type: item.type,
    });

    this.logger.log(`Portfolio item added for freelancer ${freelancerId}`);
    return item;
  }

  async updatePortfolioItem(
    freelancerId: string,
    itemId: string,
    updates: Partial<PortfolioItem>,
  ): Promise<PortfolioItem> {
    const items = this.portfolioItems.get(freelancerId) || [];
    const index = items.findIndex(i => i.id === itemId);

    if (index === -1) {
      throw new NotFoundException(`Portfolio item ${itemId} not found`);
    }

    items[index] = { ...items[index], ...updates, updatedAt: new Date() };
    return items[index];
  }

  async deletePortfolioItem(freelancerId: string, itemId: string): Promise<boolean> {
    const items = this.portfolioItems.get(freelancerId) || [];
    const index = items.findIndex(i => i.id === itemId);

    if (index === -1) {
      return false;
    }

    items.splice(index, 1);
    this.portfolioItems.set(freelancerId, items);

    this.eventEmitter.emit('profile.portfolio.deleted', {
      freelancerId,
      itemId,
    });

    return true;
  }

  getPortfolioItems(freelancerId: string): PortfolioItem[] {
    return (this.portfolioItems.get(freelancerId) || [])
      .sort((a, b) => a.order - b.order);
  }

  async reorderPortfolio(freelancerId: string, itemIds: string[]): Promise<PortfolioItem[]> {
    const items = this.portfolioItems.get(freelancerId) || [];

    itemIds.forEach((id, index) => {
      const item = items.find(i => i.id === id);
      if (item) {
        item.order = index;
        item.updatedAt = new Date();
      }
    });

    return this.getPortfolioItems(freelancerId);
  }

  async incrementPortfolioView(freelancerId: string, itemId: string): Promise<void> {
    const items = this.portfolioItems.get(freelancerId) || [];
    const item = items.find(i => i.id === itemId);
    if (item) {
      item.viewCount++;
    }
  }

  // ===== CERTIFICATIONS =====

  async addCertification(
    freelancerId: string,
    data: Omit<SkillCertification, 'id' | 'freelancerId' | 'status' | 'createdAt' | 'updatedAt'>,
  ): Promise<SkillCertification> {
    const certs = this.certifications.get(freelancerId) || [];

    const cert: SkillCertification = {
      ...data,
      id: this.generateId(),
      freelancerId,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    certs.push(cert);
    this.certifications.set(freelancerId, certs);

    this.eventEmitter.emit('profile.certification.added', {
      freelancerId,
      certificationId: cert.id,
      skillName: cert.skillName,
    });

    this.logger.log(`Certification added for freelancer ${freelancerId}: ${cert.certificationName}`);
    return cert;
  }

  async verifyCertification(
    certificationId: string,
    verifiedBy: string,
    approved: boolean,
  ): Promise<SkillCertification | null> {
    for (const [freelancerId, certs] of this.certifications) {
      const cert = certs.find(c => c.id === certificationId);
      if (cert) {
        cert.status = approved ? 'VERIFIED' : 'REJECTED';
        cert.verifiedAt = new Date();
        cert.verifiedBy = verifiedBy;
        cert.updatedAt = new Date();

        this.eventEmitter.emit('profile.certification.verified', {
          freelancerId,
          certificationId,
          approved,
        });

        return cert;
      }
    }
    return null;
  }

  getCertifications(freelancerId: string): SkillCertification[] {
    return this.certifications.get(freelancerId) || [];
  }

  getVerifiedCertifications(freelancerId: string): SkillCertification[] {
    return this.getCertifications(freelancerId)
      .filter(c => c.status === 'VERIFIED');
  }

  // ===== SKILL ENDORSEMENTS =====

  async addEndorsement(
    freelancerId: string,
    data: Omit<SkillEndorsement, 'id' | 'freelancerId' | 'createdAt'>,
  ): Promise<SkillEndorsement> {
    const endorsements = this.endorsements.get(freelancerId) || [];

    // Check for duplicate endorsement from same endorser for same skill
    const existing = endorsements.find(
      e => e.endorserId === data.endorserId && e.skillId === data.skillId,
    );
    if (existing) {
      throw new BadRequestException('This skill has already been endorsed by this person');
    }

    const endorsement: SkillEndorsement = {
      ...data,
      id: this.generateId(),
      freelancerId,
      createdAt: new Date(),
    };

    endorsements.push(endorsement);
    this.endorsements.set(freelancerId, endorsements);

    this.eventEmitter.emit('profile.skill.endorsed', {
      freelancerId,
      skillId: data.skillId,
      endorserType: data.endorserType,
    });

    return endorsement;
  }

  getEndorsements(freelancerId: string, skillId?: string): SkillEndorsement[] {
    const endorsements = this.endorsements.get(freelancerId) || [];
    return skillId
      ? endorsements.filter(e => e.skillId === skillId)
      : endorsements;
  }

  getEndorsementCount(freelancerId: string, skillId: string): number {
    return this.getEndorsements(freelancerId, skillId).length;
  }

  // ===== PROFILE SETTINGS =====

  async updateProfileSettings(
    freelancerId: string,
    updates: Partial<ProfileSettings>,
  ): Promise<ProfileSettings> {
    const current = this.profileSettings.get(freelancerId) || this.getDefaultSettings(freelancerId);
    const updated = { ...current, ...updates, updatedAt: new Date() };
    this.profileSettings.set(freelancerId, updated);

    this.eventEmitter.emit('profile.settings.updated', {
      freelancerId,
      changes: Object.keys(updates),
    });

    return updated;
  }

  getProfileSettings(freelancerId: string): ProfileSettings {
    return this.profileSettings.get(freelancerId) || this.getDefaultSettings(freelancerId);
  }

  private getDefaultSettings(freelancerId: string): ProfileSettings {
    return {
      freelancerId,
      visibility: 'PUBLIC',
      showContactInfo: true,
      showHourlyRate: true,
      showAvailability: true,
      showEarnings: false,
      showReviews: true,
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      notifyOnProjectMatch: true,
      notifyOnClientView: false,
      notifyOnEndorsement: true,
      allowClientContact: true,
      allowSearchEngines: true,
      hiddenFromClients: [],
      preferredLanguages: ['ro', 'en'],
      preferredCurrencies: ['RON', 'EUR'],
      updatedAt: new Date(),
    };
  }

  // ===== PROFILE VISIBILITY =====

  async setProfileVisibility(
    freelancerId: string,
    visibility: ProfileVisibility,
  ): Promise<ProfileSettings> {
    return this.updateProfileSettings(freelancerId, { visibility });
  }

  async hideFromClient(freelancerId: string, clientId: string): Promise<void> {
    const settings = this.getProfileSettings(freelancerId);
    if (!settings.hiddenFromClients.includes(clientId)) {
      settings.hiddenFromClients.push(clientId);
      await this.updateProfileSettings(freelancerId, {
        hiddenFromClients: settings.hiddenFromClients,
      });
    }
  }

  async unhideFromClient(freelancerId: string, clientId: string): Promise<void> {
    const settings = this.getProfileSettings(freelancerId);
    settings.hiddenFromClients = settings.hiddenFromClients.filter(id => id !== clientId);
    await this.updateProfileSettings(freelancerId, {
      hiddenFromClients: settings.hiddenFromClients,
    });
  }

  isProfileVisibleToClient(freelancerId: string, clientId: string): boolean {
    const settings = this.getProfileSettings(freelancerId);

    if (settings.hiddenFromClients.includes(clientId)) {
      return false;
    }

    switch (settings.visibility) {
      case 'PUBLIC':
        return true;
      case 'PRIVATE':
        return false;
      case 'CLIENTS_ONLY':
        return true; // Assuming clientId indicates a client
      case 'INVITE_ONLY':
        return false; // Would need additional invite logic
      default:
        return true;
    }
  }

  // ===== PROFILE ANALYTICS =====

  recordProfileView(freelancerId: string, viewerId?: string, source?: string): void {
    const analytics = this.getOrCreateAnalytics(freelancerId);
    analytics.profileViews++;
    if (viewerId) {
      analytics.uniqueViewers++;
    }
    analytics.calculatedAt = new Date();

    // Track source
    if (source) {
      const existing = analytics.topViewSources.find(s => s.source === source);
      if (existing) {
        existing.count++;
      } else {
        analytics.topViewSources.push({ source, count: 1 });
      }
    }
  }

  recordSearchAppearance(freelancerId: string, searchTerm?: string): void {
    const analytics = this.getOrCreateAnalytics(freelancerId);
    analytics.searchAppearances++;

    if (searchTerm) {
      const existing = analytics.topSearchTerms.find(t => t.term === searchTerm);
      if (existing) {
        existing.count++;
      } else {
        analytics.topSearchTerms.push({ term: searchTerm, count: 1 });
      }
    }
  }

  recordContactRequest(freelancerId: string): void {
    const analytics = this.getOrCreateAnalytics(freelancerId);
    analytics.contactRequests++;
    this.updateConversionRates(analytics);
  }

  recordProjectInvitation(freelancerId: string): void {
    const analytics = this.getOrCreateAnalytics(freelancerId);
    analytics.projectInvitations++;
  }

  getProfileAnalytics(freelancerId: string): ProfileAnalytics {
    return this.getOrCreateAnalytics(freelancerId);
  }

  private getOrCreateAnalytics(freelancerId: string): ProfileAnalytics {
    let analytics = this.profileAnalytics.get(freelancerId);
    if (!analytics) {
      analytics = {
        freelancerId,
        period: 'all_time',
        profileViews: 0,
        uniqueViewers: 0,
        searchAppearances: 0,
        portfolioViews: 0,
        contactRequests: 0,
        projectInvitations: 0,
        proposalsSent: 0,
        proposalsAccepted: 0,
        viewToContactRate: 0,
        contactToHireRate: 0,
        viewsTrend: 0,
        engagementTrend: 0,
        topViewSources: [],
        topSearchTerms: [],
        calculatedAt: new Date(),
      };
      this.profileAnalytics.set(freelancerId, analytics);
    }
    return analytics;
  }

  private updateConversionRates(analytics: ProfileAnalytics): void {
    if (analytics.profileViews > 0) {
      analytics.viewToContactRate = (analytics.contactRequests / analytics.profileViews) * 100;
    }
    if (analytics.contactRequests > 0) {
      analytics.contactToHireRate = (analytics.proposalsAccepted / analytics.contactRequests) * 100;
    }
  }

  // ===== PROFILE COMPLETENESS =====

  calculateProfileCompleteness(freelancerId: string): ProfileCompleteness {
    const portfolio = this.getPortfolioItems(freelancerId);
    const certs = this.getCertifications(freelancerId);
    const settings = this.getProfileSettings(freelancerId);
    const profile = this.profiles.get(freelancerId);

    const sections: ProfileCompleteness['sections'] = [];

    // Basic Info (30 points)
    const basicMissing: string[] = [];
    const basicSuggestions: string[] = [];
    let basicScore = 0;
    if (profile?.displayName) basicScore += 5; else basicMissing.push('Display name');
    if (profile?.title) basicScore += 5; else basicMissing.push('Professional title');
    if (profile?.bio && profile.bio.length > 100) basicScore += 10;
    else if (profile?.bio) { basicScore += 5; basicSuggestions.push('Expand your bio to at least 100 characters'); }
    else basicMissing.push('Bio');
    if (profile?.avatar) basicScore += 5; else basicMissing.push('Profile photo');
    if (profile?.coverImage) basicScore += 5; else basicSuggestions.push('Add a cover image');

    sections.push({
      name: 'Basic Information',
      score: basicScore,
      maxScore: 30,
      missingItems: basicMissing,
      suggestions: basicSuggestions,
    });

    // Portfolio (25 points)
    const portfolioScore = Math.min(25, portfolio.length * 5);
    const portfolioMissing = portfolio.length === 0 ? ['At least one portfolio item'] : [];
    const portfolioSuggestions = portfolio.length < 3
      ? ['Add more portfolio items to showcase your work']
      : [];

    sections.push({
      name: 'Portfolio',
      score: portfolioScore,
      maxScore: 25,
      missingItems: portfolioMissing,
      suggestions: portfolioSuggestions,
    });

    // Skills & Certifications (25 points)
    const verifiedCerts = this.getVerifiedCertifications(freelancerId);
    const skillsScore = Math.min(15, (profile?.skills?.length || 0) * 3);
    const certsScore = Math.min(10, verifiedCerts.length * 5);
    const skillsMissing: string[] = [];
    const skillsSuggestions: string[] = [];
    if (!profile?.skills?.length) skillsMissing.push('Add your skills');
    if (verifiedCerts.length === 0) skillsSuggestions.push('Add certifications to boost credibility');

    sections.push({
      name: 'Skills & Certifications',
      score: skillsScore + certsScore,
      maxScore: 25,
      missingItems: skillsMissing,
      suggestions: skillsSuggestions,
    });

    // Verification (20 points)
    let verificationScore = 0;
    const verificationMissing: string[] = [];
    if (profile?.emailVerified) verificationScore += 5; else verificationMissing.push('Verify email');
    if (profile?.phoneVerified) verificationScore += 5; else verificationMissing.push('Verify phone');
    if (profile?.identityVerified) verificationScore += 5; else verificationMissing.push('Verify identity');
    if (profile?.paymentVerified) verificationScore += 5; else verificationMissing.push('Add payment method');

    sections.push({
      name: 'Verification',
      score: verificationScore,
      maxScore: 20,
      missingItems: verificationMissing,
      suggestions: [],
    });

    // Calculate overall score
    const overallScore = sections.reduce((sum, s) => sum + s.score, 0);

    // Generate next steps
    const nextSteps: string[] = [];
    for (const section of sections) {
      if (section.missingItems.length > 0) {
        nextSteps.push(section.missingItems[0]);
      }
      if (nextSteps.length >= 3) break;
    }

    // Estimate time to complete
    const estimatedTime = sections.reduce((sum, s) => sum + (s.maxScore - s.score), 0);

    return {
      freelancerId,
      overallScore,
      sections,
      nextSteps,
      estimatedTimeToComplete: estimatedTime,
    };
  }

  // ===== ADVANCED PROFILE =====

  async createAdvancedProfile(data: Omit<AdvancedProfile, 'portfolioItems' | 'certifications' | 'settings' | 'createdAt' | 'updatedAt' | 'lastActiveAt'>): Promise<AdvancedProfile> {
    const profile: AdvancedProfile = {
      ...data,
      portfolioItems: [],
      certifications: [],
      settings: this.getDefaultSettings(data.freelancerId),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActiveAt: new Date(),
    };

    this.profiles.set(data.freelancerId, profile);

    this.eventEmitter.emit('profile.advanced.created', {
      freelancerId: data.freelancerId,
    });

    return profile;
  }

  async updateAdvancedProfile(
    freelancerId: string,
    updates: Partial<AdvancedProfile>,
  ): Promise<AdvancedProfile> {
    const profile = this.profiles.get(freelancerId);
    if (!profile) {
      throw new NotFoundException(`Profile ${freelancerId} not found`);
    }

    const updated = { ...profile, ...updates, updatedAt: new Date() };
    this.profiles.set(freelancerId, updated);

    return updated;
  }

  getAdvancedProfile(freelancerId: string): AdvancedProfile | undefined {
    const profile = this.profiles.get(freelancerId);
    if (profile) {
      // Attach current portfolio and certifications
      profile.portfolioItems = this.getPortfolioItems(freelancerId);
      profile.certifications = this.getCertifications(freelancerId);
      profile.settings = this.getProfileSettings(freelancerId);
    }
    return profile;
  }

  async updateLastActive(freelancerId: string): Promise<void> {
    const profile = this.profiles.get(freelancerId);
    if (profile) {
      profile.lastActiveAt = new Date();
    }
  }

  // ===== SEARCH & DISCOVERY =====

  searchProfiles(filters: {
    skills?: string[];
    minRating?: number;
    maxHourlyRate?: number;
    country?: string;
    verificationLevel?: VerificationLevel;
    availability?: boolean;
  }): AdvancedProfile[] {
    let results = Array.from(this.profiles.values());

    // Filter by visibility
    results = results.filter(p => {
      const settings = this.getProfileSettings(p.freelancerId);
      return settings.visibility === 'PUBLIC' || settings.visibility === 'CLIENTS_ONLY';
    });

    if (filters.skills?.length) {
      results = results.filter(p =>
        filters.skills!.some(skill =>
          p.skills?.some(s => s.name.toLowerCase().includes(skill.toLowerCase()))
        )
      );
    }

    if (filters.minRating !== undefined) {
      results = results.filter(p => p.avgRating >= filters.minRating!);
    }

    if (filters.country) {
      results = results.filter(p => p.country === filters.country);
    }

    if (filters.verificationLevel) {
      results = results.filter(p => p.verificationLevel === filters.verificationLevel);
    }

    return results.sort((a, b) => b.avgRating - a.avgRating);
  }

  // ===== HELPERS =====

  private generateId(): string {
    return `prof-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
