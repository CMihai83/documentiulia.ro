import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  AdvancedProfileService,
  PortfolioItemType,
  CertificationStatus,
  ProfileVisibility,
  VerificationLevel,
} from './advanced-profile.service';

describe('AdvancedProfileService', () => {
  let service: AdvancedProfileService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancedProfileService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AdvancedProfileService>(AdvancedProfileService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('Portfolio Management', () => {
    it('should add a portfolio item', async () => {
      const item = await service.addPortfolioItem('freelancer-1', {
        title: 'Web App Project',
        description: 'A beautiful e-commerce platform',
        type: 'IMAGE' as PortfolioItemType,
        tags: ['react', 'typescript'],
        skills: ['Web Development'],
        order: 0,
        featured: true,
      });

      expect(item.id).toBeDefined();
      expect(item.freelancerId).toBe('freelancer-1');
      expect(item.title).toBe('Web App Project');
      expect(item.viewCount).toBe(0);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'profile.portfolio.added',
        expect.objectContaining({ freelancerId: 'freelancer-1' }),
      );
    });

    it('should enforce maximum portfolio items limit', async () => {
      // Add 10 items (max allowed)
      for (let i = 0; i < 10; i++) {
        await service.addPortfolioItem('freelancer-2', {
          title: `Project ${i}`,
          description: 'Test',
          type: 'IMAGE' as PortfolioItemType,
          tags: [],
          skills: [],
          order: i,
          featured: false,
        });
      }

      // 11th should fail
      await expect(
        service.addPortfolioItem('freelancer-2', {
          title: 'Project 11',
          description: 'Test',
          type: 'IMAGE' as PortfolioItemType,
          tags: [],
          skills: [],
          order: 10,
          featured: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject files exceeding size limit', async () => {
      await expect(
        service.addPortfolioItem('freelancer-3', {
          title: 'Large File',
          description: 'Test',
          type: 'PDF' as PortfolioItemType,
          fileSize: 10 * 1024 * 1024, // 10MB exceeds 5MB limit
          tags: [],
          skills: [],
          order: 0,
          featured: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update a portfolio item', async () => {
      const item = await service.addPortfolioItem('freelancer-4', {
        title: 'Original Title',
        description: 'Original',
        type: 'IMAGE' as PortfolioItemType,
        tags: [],
        skills: [],
        order: 0,
        featured: false,
      });

      const updated = await service.updatePortfolioItem('freelancer-4', item.id, {
        title: 'Updated Title',
        featured: true,
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.featured).toBe(true);
    });

    it('should throw when updating non-existent portfolio item', async () => {
      await expect(
        service.updatePortfolioItem('freelancer-5', 'non-existent', { title: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete a portfolio item', async () => {
      const item = await service.addPortfolioItem('freelancer-6', {
        title: 'To Delete',
        description: 'Test',
        type: 'IMAGE' as PortfolioItemType,
        tags: [],
        skills: [],
        order: 0,
        featured: false,
      });

      const deleted = await service.deletePortfolioItem('freelancer-6', item.id);
      expect(deleted).toBe(true);

      const items = service.getPortfolioItems('freelancer-6');
      expect(items.length).toBe(0);
    });

    it('should reorder portfolio items', async () => {
      const item1 = await service.addPortfolioItem('freelancer-7', {
        title: 'First',
        description: 'Test',
        type: 'IMAGE' as PortfolioItemType,
        tags: [],
        skills: [],
        order: 0,
        featured: false,
      });

      const item2 = await service.addPortfolioItem('freelancer-7', {
        title: 'Second',
        description: 'Test',
        type: 'IMAGE' as PortfolioItemType,
        tags: [],
        skills: [],
        order: 1,
        featured: false,
      });

      const reordered = await service.reorderPortfolio('freelancer-7', [item2.id, item1.id]);

      expect(reordered[0].id).toBe(item2.id);
      expect(reordered[0].order).toBe(0);
      expect(reordered[1].id).toBe(item1.id);
      expect(reordered[1].order).toBe(1);
    });

    it('should increment portfolio view count', async () => {
      const item = await service.addPortfolioItem('freelancer-8', {
        title: 'Viewed Item',
        description: 'Test',
        type: 'IMAGE' as PortfolioItemType,
        tags: [],
        skills: [],
        order: 0,
        featured: false,
      });

      await service.incrementPortfolioView('freelancer-8', item.id);
      await service.incrementPortfolioView('freelancer-8', item.id);

      const items = service.getPortfolioItems('freelancer-8');
      expect(items[0].viewCount).toBe(2);
    });
  });

  describe('Certifications', () => {
    it('should add a certification', async () => {
      const cert = await service.addCertification('freelancer-10', {
        skillId: 'skill-1',
        skillName: 'React',
        certificationName: 'React Developer Certification',
        issuingOrganization: 'Meta',
        issueDate: new Date(),
        featured: true,
      });

      expect(cert.id).toBeDefined();
      expect(cert.status).toBe('PENDING');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'profile.certification.added',
        expect.objectContaining({ freelancerId: 'freelancer-10' }),
      );
    });

    it('should verify a certification (approve)', async () => {
      const cert = await service.addCertification('freelancer-11', {
        skillId: 'skill-2',
        skillName: 'TypeScript',
        certificationName: 'TypeScript Expert',
        issuingOrganization: 'Microsoft',
        issueDate: new Date(),
        featured: false,
      });

      const verified = await service.verifyCertification(cert.id, 'admin-1', true);

      expect(verified?.status).toBe('VERIFIED');
      expect(verified?.verifiedBy).toBe('admin-1');
      expect(verified?.verifiedAt).toBeDefined();
    });

    it('should verify a certification (reject)', async () => {
      const cert = await service.addCertification('freelancer-12', {
        skillId: 'skill-3',
        skillName: 'Python',
        certificationName: 'Fake Cert',
        issuingOrganization: 'Unknown',
        issueDate: new Date(),
        featured: false,
      });

      const rejected = await service.verifyCertification(cert.id, 'admin-1', false);

      expect(rejected?.status).toBe('REJECTED');
    });

    it('should get verified certifications only', async () => {
      await service.addCertification('freelancer-13', {
        skillId: 'skill-1',
        skillName: 'React',
        certificationName: 'Pending Cert',
        issuingOrganization: 'Test',
        issueDate: new Date(),
        featured: false,
      });

      const cert2 = await service.addCertification('freelancer-13', {
        skillId: 'skill-2',
        skillName: 'Node.js',
        certificationName: 'Verified Cert',
        issuingOrganization: 'Test',
        issueDate: new Date(),
        featured: false,
      });

      await service.verifyCertification(cert2.id, 'admin', true);

      const allCerts = service.getCertifications('freelancer-13');
      const verifiedCerts = service.getVerifiedCertifications('freelancer-13');

      expect(allCerts.length).toBe(2);
      expect(verifiedCerts.length).toBe(1);
      expect(verifiedCerts[0].status).toBe('VERIFIED');
    });
  });

  describe('Skill Endorsements', () => {
    it('should add an endorsement', async () => {
      const endorsement = await service.addEndorsement('freelancer-20', {
        skillId: 'skill-react',
        skillName: 'React',
        endorserType: 'CLIENT',
        endorserId: 'client-1',
        endorserName: 'John Client',
        endorserTitle: 'CEO',
        endorserCompany: 'Acme Inc',
        comment: 'Excellent React developer!',
        rating: 5,
      });

      expect(endorsement.id).toBeDefined();
      expect(endorsement.rating).toBe(5);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'profile.skill.endorsed',
        expect.objectContaining({ freelancerId: 'freelancer-20' }),
      );
    });

    it('should prevent duplicate endorsements from same person', async () => {
      await service.addEndorsement('freelancer-21', {
        skillId: 'skill-1',
        skillName: 'TypeScript',
        endorserType: 'PEER',
        endorserId: 'peer-1',
        endorserName: 'Jane Peer',
        rating: 4,
      });

      await expect(
        service.addEndorsement('freelancer-21', {
          skillId: 'skill-1',
          skillName: 'TypeScript',
          endorserType: 'PEER',
          endorserId: 'peer-1',
          endorserName: 'Jane Peer',
          rating: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should filter endorsements by skill', async () => {
      await service.addEndorsement('freelancer-22', {
        skillId: 'skill-react',
        skillName: 'React',
        endorserType: 'CLIENT',
        endorserId: 'client-1',
        endorserName: 'Client 1',
        rating: 5,
      });

      await service.addEndorsement('freelancer-22', {
        skillId: 'skill-node',
        skillName: 'Node.js',
        endorserType: 'CLIENT',
        endorserId: 'client-2',
        endorserName: 'Client 2',
        rating: 4,
      });

      const allEndorsements = service.getEndorsements('freelancer-22');
      const reactEndorsements = service.getEndorsements('freelancer-22', 'skill-react');

      expect(allEndorsements.length).toBe(2);
      expect(reactEndorsements.length).toBe(1);
      expect(reactEndorsements[0].skillName).toBe('React');
    });

    it('should count endorsements for a skill', async () => {
      await service.addEndorsement('freelancer-23', {
        skillId: 'skill-1',
        skillName: 'JavaScript',
        endorserType: 'CLIENT',
        endorserId: 'c1',
        endorserName: 'Client 1',
        rating: 5,
      });

      await service.addEndorsement('freelancer-23', {
        skillId: 'skill-1',
        skillName: 'JavaScript',
        endorserType: 'PEER',
        endorserId: 'p1',
        endorserName: 'Peer 1',
        rating: 4,
      });

      const count = service.getEndorsementCount('freelancer-23', 'skill-1');
      expect(count).toBe(2);
    });
  });

  describe('Profile Settings', () => {
    it('should return default settings for new users', () => {
      const settings = service.getProfileSettings('new-user');

      expect(settings.visibility).toBe('PUBLIC');
      expect(settings.showContactInfo).toBe(true);
      expect(settings.emailNotifications).toBe(true);
      expect(settings.preferredLanguages).toContain('ro');
      expect(settings.preferredCurrencies).toContain('RON');
    });

    it('should update profile settings', async () => {
      const updated = await service.updateProfileSettings('freelancer-30', {
        visibility: 'PRIVATE',
        showEarnings: true,
        smsNotifications: true,
      });

      expect(updated.visibility).toBe('PRIVATE');
      expect(updated.showEarnings).toBe(true);
      expect(updated.smsNotifications).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'profile.settings.updated',
        expect.any(Object),
      );
    });

    it('should set profile visibility', async () => {
      await service.setProfileVisibility('freelancer-31', 'CLIENTS_ONLY');

      const settings = service.getProfileSettings('freelancer-31');
      expect(settings.visibility).toBe('CLIENTS_ONLY');
    });

    it('should hide profile from specific client', async () => {
      await service.hideFromClient('freelancer-32', 'bad-client');

      const settings = service.getProfileSettings('freelancer-32');
      expect(settings.hiddenFromClients).toContain('bad-client');
    });

    it('should unhide profile from client', async () => {
      await service.hideFromClient('freelancer-33', 'client-1');
      await service.unhideFromClient('freelancer-33', 'client-1');

      const settings = service.getProfileSettings('freelancer-33');
      expect(settings.hiddenFromClients).not.toContain('client-1');
    });
  });

  describe('Profile Visibility', () => {
    it('should check visibility for PUBLIC profiles', () => {
      service.updateProfileSettings('freelancer-40', { visibility: 'PUBLIC' });

      expect(service.isProfileVisibleToClient('freelancer-40', 'any-client')).toBe(true);
    });

    it('should check visibility for PRIVATE profiles', async () => {
      await service.updateProfileSettings('freelancer-41', { visibility: 'PRIVATE' });

      expect(service.isProfileVisibleToClient('freelancer-41', 'any-client')).toBe(false);
    });

    it('should respect hidden client list', async () => {
      await service.updateProfileSettings('freelancer-42', { visibility: 'PUBLIC' });
      await service.hideFromClient('freelancer-42', 'hidden-client');

      expect(service.isProfileVisibleToClient('freelancer-42', 'visible-client')).toBe(true);
      expect(service.isProfileVisibleToClient('freelancer-42', 'hidden-client')).toBe(false);
    });
  });

  describe('Profile Analytics', () => {
    it('should record profile views', () => {
      service.recordProfileView('freelancer-50', 'viewer-1', 'search');
      service.recordProfileView('freelancer-50', 'viewer-2', 'search');
      service.recordProfileView('freelancer-50', undefined, 'direct');

      const analytics = service.getProfileAnalytics('freelancer-50');

      expect(analytics.profileViews).toBe(3);
      expect(analytics.uniqueViewers).toBe(2);
    });

    it('should track view sources', () => {
      service.recordProfileView('freelancer-51', 'v1', 'search');
      service.recordProfileView('freelancer-51', 'v2', 'search');
      service.recordProfileView('freelancer-51', 'v3', 'referral');

      const analytics = service.getProfileAnalytics('freelancer-51');

      expect(analytics.topViewSources.find(s => s.source === 'search')?.count).toBe(2);
      expect(analytics.topViewSources.find(s => s.source === 'referral')?.count).toBe(1);
    });

    it('should record search appearances', () => {
      service.recordSearchAppearance('freelancer-52', 'react developer');
      service.recordSearchAppearance('freelancer-52', 'react developer');
      service.recordSearchAppearance('freelancer-52', 'frontend');

      const analytics = service.getProfileAnalytics('freelancer-52');

      expect(analytics.searchAppearances).toBe(3);
      expect(analytics.topSearchTerms.find(t => t.term === 'react developer')?.count).toBe(2);
    });

    it('should record contact requests and update conversion rates', () => {
      service.recordProfileView('freelancer-53', 'v1');
      service.recordProfileView('freelancer-53', 'v2');
      service.recordContactRequest('freelancer-53');

      const analytics = service.getProfileAnalytics('freelancer-53');

      expect(analytics.contactRequests).toBe(1);
      expect(analytics.viewToContactRate).toBe(50); // 1 contact / 2 views * 100
    });

    it('should record project invitations', () => {
      service.recordProjectInvitation('freelancer-54');
      service.recordProjectInvitation('freelancer-54');

      const analytics = service.getProfileAnalytics('freelancer-54');
      expect(analytics.projectInvitations).toBe(2);
    });
  });

  describe('Profile Completeness', () => {
    it('should calculate completeness for empty profile', () => {
      const completeness = service.calculateProfileCompleteness('new-freelancer');

      expect(completeness.overallScore).toBe(0);
      expect(completeness.sections.length).toBe(4);
      expect(completeness.nextSteps.length).toBeGreaterThan(0);
    });

    it('should increase score with portfolio items', async () => {
      await service.addPortfolioItem('freelancer-60', {
        title: 'Project',
        description: 'Test',
        type: 'IMAGE' as PortfolioItemType,
        tags: [],
        skills: [],
        order: 0,
        featured: false,
      });

      const completeness = service.calculateProfileCompleteness('freelancer-60');
      const portfolioSection = completeness.sections.find(s => s.name === 'Portfolio');

      expect(portfolioSection?.score).toBe(5); // 5 points per item
    });

    it('should include suggestions for incomplete sections', () => {
      const completeness = service.calculateProfileCompleteness('incomplete-user');

      const hassuggestions = completeness.sections.some(s => s.suggestions.length > 0);
      expect(hassuggestions).toBe(true);
    });
  });

  describe('Advanced Profile', () => {
    it('should create an advanced profile', async () => {
      const profile = await service.createAdvancedProfile({
        freelancerId: 'freelancer-70',
        displayName: 'John Developer',
        title: 'Senior Full Stack Developer',
        bio: 'Experienced developer with 10 years in web development',
        country: 'Romania',
        city: 'Bucharest',
        timezone: 'Europe/Bucharest',
        yearsOfExperience: 10,
        languages: [
          { language: 'Romanian', proficiency: 'NATIVE' },
          { language: 'English', proficiency: 'FLUENT' },
        ],
        verificationLevel: 'VERIFIED',
        identityVerified: true,
        phoneVerified: true,
        emailVerified: true,
        paymentVerified: true,
        totalEarnings: 50000,
        totalProjects: 25,
        successRate: 98,
        avgRating: 4.9,
        totalReviews: 20,
        repeatClientRate: 40,
        skills: [
          { id: 's1', name: 'React', level: 'EXPERT', endorsementCount: 15, verified: true },
          { id: 's2', name: 'Node.js', level: 'ADVANCED', endorsementCount: 10, verified: true },
        ],
      });

      expect(profile.freelancerId).toBe('freelancer-70');
      expect(profile.displayName).toBe('John Developer');
      expect(profile.portfolioItems).toEqual([]);
      expect(profile.settings).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'profile.advanced.created',
        expect.any(Object),
      );
    });

    it('should update an advanced profile', async () => {
      await service.createAdvancedProfile({
        freelancerId: 'freelancer-71',
        displayName: 'Jane Dev',
        title: 'Developer',
        bio: 'Bio',
        country: 'Romania',
        city: 'Cluj',
        timezone: 'Europe/Bucharest',
        yearsOfExperience: 5,
        languages: [],
        verificationLevel: 'BASIC',
        identityVerified: false,
        phoneVerified: false,
        emailVerified: true,
        paymentVerified: false,
        totalEarnings: 0,
        totalProjects: 0,
        successRate: 0,
        avgRating: 0,
        totalReviews: 0,
        repeatClientRate: 0,
        skills: [],
      });

      const updated = await service.updateAdvancedProfile('freelancer-71', {
        title: 'Senior Developer',
        yearsOfExperience: 6,
      });

      expect(updated.title).toBe('Senior Developer');
      expect(updated.yearsOfExperience).toBe(6);
    });

    it('should throw when updating non-existent profile', async () => {
      await expect(
        service.updateAdvancedProfile('non-existent', { title: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should get advanced profile with attached data', async () => {
      await service.createAdvancedProfile({
        freelancerId: 'freelancer-72',
        displayName: 'Test User',
        title: 'Developer',
        bio: 'Bio',
        country: 'Romania',
        city: 'Timisoara',
        timezone: 'Europe/Bucharest',
        yearsOfExperience: 3,
        languages: [],
        verificationLevel: 'NONE',
        identityVerified: false,
        phoneVerified: false,
        emailVerified: true,
        paymentVerified: false,
        totalEarnings: 0,
        totalProjects: 0,
        successRate: 0,
        avgRating: 0,
        totalReviews: 0,
        repeatClientRate: 0,
        skills: [],
      });

      await service.addPortfolioItem('freelancer-72', {
        title: 'Project',
        description: 'Test',
        type: 'IMAGE' as PortfolioItemType,
        tags: [],
        skills: [],
        order: 0,
        featured: false,
      });

      await service.addCertification('freelancer-72', {
        skillId: 's1',
        skillName: 'React',
        certificationName: 'React Cert',
        issuingOrganization: 'Meta',
        issueDate: new Date(),
        featured: false,
      });

      const profile = service.getAdvancedProfile('freelancer-72');

      expect(profile?.portfolioItems.length).toBe(1);
      expect(profile?.certifications.length).toBe(1);
      expect(profile?.settings).toBeDefined();
    });

    it('should update last active timestamp', async () => {
      await service.createAdvancedProfile({
        freelancerId: 'freelancer-73',
        displayName: 'Test',
        title: 'Dev',
        bio: 'Bio',
        country: 'Romania',
        city: 'Iasi',
        timezone: 'Europe/Bucharest',
        yearsOfExperience: 2,
        languages: [],
        verificationLevel: 'NONE',
        identityVerified: false,
        phoneVerified: false,
        emailVerified: true,
        paymentVerified: false,
        totalEarnings: 0,
        totalProjects: 0,
        successRate: 0,
        avgRating: 0,
        totalReviews: 0,
        repeatClientRate: 0,
        skills: [],
      });

      const before = service.getAdvancedProfile('freelancer-73')?.lastActiveAt;

      // Wait a bit
      await new Promise(r => setTimeout(r, 10));

      await service.updateLastActive('freelancer-73');

      const after = service.getAdvancedProfile('freelancer-73')?.lastActiveAt;

      expect(after?.getTime()).toBeGreaterThanOrEqual(before?.getTime() || 0);
    });
  });

  describe('Search & Discovery', () => {
    beforeEach(async () => {
      // Create some searchable profiles
      await service.createAdvancedProfile({
        freelancerId: 'search-1',
        displayName: 'React Expert',
        title: 'Senior React Developer',
        bio: 'Expert in React',
        country: 'Romania',
        city: 'Bucharest',
        timezone: 'Europe/Bucharest',
        yearsOfExperience: 8,
        languages: [],
        verificationLevel: 'VERIFIED',
        identityVerified: true,
        phoneVerified: true,
        emailVerified: true,
        paymentVerified: true,
        totalEarnings: 100000,
        totalProjects: 50,
        successRate: 99,
        avgRating: 4.9,
        totalReviews: 45,
        repeatClientRate: 50,
        skills: [
          { id: 's1', name: 'React', level: 'EXPERT', endorsementCount: 20, verified: true },
        ],
      });

      await service.createAdvancedProfile({
        freelancerId: 'search-2',
        displayName: 'Node Developer',
        title: 'Backend Developer',
        bio: 'Node.js specialist',
        country: 'Romania',
        city: 'Cluj',
        timezone: 'Europe/Bucharest',
        yearsOfExperience: 5,
        languages: [],
        verificationLevel: 'BASIC',
        identityVerified: false,
        phoneVerified: true,
        emailVerified: true,
        paymentVerified: false,
        totalEarnings: 30000,
        totalProjects: 20,
        successRate: 95,
        avgRating: 4.5,
        totalReviews: 18,
        repeatClientRate: 30,
        skills: [
          { id: 's2', name: 'Node.js', level: 'ADVANCED', endorsementCount: 10, verified: true },
        ],
      });

      // Make profiles public
      await service.updateProfileSettings('search-1', { visibility: 'PUBLIC' });
      await service.updateProfileSettings('search-2', { visibility: 'PUBLIC' });
    });

    it('should search profiles by skills', () => {
      const results = service.searchProfiles({ skills: ['React'] });

      expect(results.length).toBe(1);
      expect(results[0].displayName).toBe('React Expert');
    });

    it('should search profiles by minimum rating', () => {
      const results = service.searchProfiles({ minRating: 4.8 });

      expect(results.length).toBe(1);
      expect(results[0].avgRating).toBeGreaterThanOrEqual(4.8);
    });

    it('should search profiles by country', () => {
      const results = service.searchProfiles({ country: 'Romania' });

      expect(results.length).toBe(2);
    });

    it('should search profiles by verification level', () => {
      const results = service.searchProfiles({ verificationLevel: 'VERIFIED' });

      expect(results.length).toBe(1);
      expect(results[0].verificationLevel).toBe('VERIFIED');
    });

    it('should exclude private profiles from search', async () => {
      await service.updateProfileSettings('search-2', { visibility: 'PRIVATE' });

      const results = service.searchProfiles({});

      expect(results.length).toBe(1);
    });

    it('should sort results by rating', () => {
      const results = service.searchProfiles({});

      expect(results[0].avgRating).toBeGreaterThanOrEqual(results[1]?.avgRating || 0);
    });
  });

  describe('Romanian Localization', () => {
    it('should have Romanian language as default preference', () => {
      const settings = service.getProfileSettings('ro-user');

      expect(settings.preferredLanguages).toContain('ro');
    });

    it('should have RON currency as default preference', () => {
      const settings = service.getProfileSettings('ro-user-2');

      expect(settings.preferredCurrencies).toContain('RON');
    });
  });
});
