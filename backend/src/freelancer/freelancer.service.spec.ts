import { Test, TestingModule } from '@nestjs/testing';
import { FreelancerService } from './freelancer.service';

describe('FreelancerService', () => {
  let service: FreelancerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FreelancerService],
    }).compile();

    service = module.get<FreelancerService>(FreelancerService);
    service.resetState();
  });

  describe('Freelancer Profile Management', () => {
    it('should create a freelancer profile', async () => {
      const profile = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'freelancer@example.com',
        firstName: 'Ion',
        lastName: 'Popescu',
        displayName: 'Ion P.',
        title: 'Full Stack Developer',
        bio: 'Experienced developer with 10 years of experience',
        skills: [],
        hourlyRate: 50,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: false,
      });

      expect(profile.id).toBeDefined();
      expect(profile.email).toBe('freelancer@example.com');
      expect(profile.contractType).toBe('PFA');
      expect(profile.totalProjects).toBe(0);
      expect(profile.averageRating).toBe(0);
    });

    it('should get freelancer profile by ID', async () => {
      const created = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test U.',
        title: 'Developer',
        bio: 'Test bio',
        skills: [],
        hourlyRate: 40,
        currency: 'EUR',
        contractType: 'SRL',
        country: 'RO',
        city: 'Cluj',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 30,
        preferredProjectDuration: ['SHORT_TERM'],
        remoteOnly: false,
        willingToTravel: true,
        status: 'ACTIVE',
        identityVerified: false,
        portfolioVerified: false,
        skillsVerified: false,
      });

      const profile = await service.getFreelancerProfile(created.id);
      expect(profile).not.toBeNull();
      expect(profile!.id).toBe(created.id);
    });

    it('should update freelancer profile', async () => {
      const created = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test U.',
        title: 'Developer',
        bio: 'Test bio',
        skills: [],
        hourlyRate: 40,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'Cluj',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 30,
        preferredProjectDuration: ['SHORT_TERM'],
        remoteOnly: false,
        willingToTravel: true,
        status: 'ACTIVE',
        identityVerified: false,
        portfolioVerified: false,
        skillsVerified: false,
      });

      const updated = await service.updateFreelancerProfile(created.id, {
        hourlyRate: 60,
        availability: 'PARTIALLY_AVAILABLE',
      });

      expect(updated.hourlyRate).toBe(60);
      expect(updated.availability).toBe('PARTIALLY_AVAILABLE');
    });

    it('should add skill to freelancer', async () => {
      const profile = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test U.',
        title: 'Developer',
        bio: 'Test bio',
        skills: [],
        hourlyRate: 40,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'Cluj',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 30,
        preferredProjectDuration: ['SHORT_TERM'],
        remoteOnly: false,
        willingToTravel: true,
        status: 'ACTIVE',
        identityVerified: false,
        portfolioVerified: false,
        skillsVerified: false,
      });

      const skill = await service.addSkill(profile.id, {
        name: 'JavaScript',
        category: 'DEVELOPMENT',
        level: 'EXPERT',
        yearsExperience: 8,
      });

      expect(skill.id).toBeDefined();
      expect(skill.name).toBe('JavaScript');
      expect(skill.verified).toBe(false);
    });

    it('should verify skill', async () => {
      const profile = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test U.',
        title: 'Developer',
        bio: 'Test bio',
        skills: [],
        hourlyRate: 40,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'Cluj',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 30,
        preferredProjectDuration: ['SHORT_TERM'],
        remoteOnly: false,
        willingToTravel: true,
        status: 'ACTIVE',
        identityVerified: false,
        portfolioVerified: false,
        skillsVerified: false,
      });

      const skill = await service.addSkill(profile.id, {
        name: 'TypeScript',
        category: 'DEVELOPMENT',
        level: 'ADVANCED',
        yearsExperience: 5,
      });

      const verified = await service.verifySkill(profile.id, skill.id);
      expect(verified.verified).toBe(true);
      expect(verified.verifiedAt).toBeDefined();
    });

    it('should endorse skill', async () => {
      const profile = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test U.',
        title: 'Developer',
        bio: 'Test bio',
        skills: [],
        hourlyRate: 40,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'Cluj',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 30,
        preferredProjectDuration: ['SHORT_TERM'],
        remoteOnly: false,
        willingToTravel: true,
        status: 'ACTIVE',
        identityVerified: false,
        portfolioVerified: false,
        skillsVerified: false,
      });

      const skill = await service.addSkill(profile.id, {
        name: 'React',
        category: 'DEVELOPMENT',
        level: 'EXPERT',
        yearsExperience: 6,
      });

      await service.endorseSkill(profile.id, skill.id);
      await service.endorseSkill(profile.id, skill.id);

      const updated = await service.getFreelancerProfile(profile.id);
      const updatedSkill = updated!.skills.find(s => s.id === skill.id);
      expect(updatedSkill!.endorsements).toBe(2);
    });

    it('should search freelancers by skills', async () => {
      await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'dev1@example.com',
        firstName: 'Dev',
        lastName: 'One',
        displayName: 'Dev One',
        title: 'Frontend Developer',
        bio: 'Frontend expert',
        skills: [{ id: 'skill-1', name: 'React', category: 'DEVELOPMENT', level: 'EXPERT', yearsExperience: 5, verified: true, endorsements: 10 }],
        hourlyRate: 50,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: true,
        skillsVerified: true,
      });

      await service.createFreelancerProfile({
        userId: 'user-2',
        email: 'dev2@example.com',
        firstName: 'Dev',
        lastName: 'Two',
        displayName: 'Dev Two',
        title: 'Backend Developer',
        bio: 'Backend expert',
        skills: [{ id: 'skill-2', name: 'Node.js', category: 'DEVELOPMENT', level: 'ADVANCED', yearsExperience: 4, verified: false, endorsements: 5 }],
        hourlyRate: 45,
        currency: 'EUR',
        contractType: 'SRL',
        country: 'RO',
        city: 'Cluj',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 35,
        preferredProjectDuration: ['LONG_TERM'],
        remoteOnly: false,
        willingToTravel: true,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: false,
      });

      const results = await service.searchFreelancers({ skills: ['React'] });
      expect(results.length).toBe(1);
      expect(results[0].skills[0].name).toBe('React');
    });

    it('should search freelancers by rate range', async () => {
      await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'cheap@example.com',
        firstName: 'Cheap',
        lastName: 'Dev',
        displayName: 'Cheap Dev',
        title: 'Developer',
        bio: 'Budget friendly',
        skills: [],
        hourlyRate: 20,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['SHORT_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: false,
      });

      await service.createFreelancerProfile({
        userId: 'user-2',
        email: 'expensive@example.com',
        firstName: 'Premium',
        lastName: 'Dev',
        displayName: 'Premium Dev',
        title: 'Senior Developer',
        bio: 'Premium quality',
        skills: [],
        hourlyRate: 100,
        currency: 'EUR',
        contractType: 'SRL',
        country: 'RO',
        city: 'Cluj',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 30,
        preferredProjectDuration: ['LONG_TERM'],
        remoteOnly: false,
        willingToTravel: true,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: true,
        skillsVerified: true,
      });

      const results = await service.searchFreelancers({ maxHourlyRate: 50 });
      expect(results.length).toBe(1);
      expect(results[0].hourlyRate).toBe(20);
    });
  });

  describe('Project Management', () => {
    it('should create a project', async () => {
      const project = await service.createProject({
        clientId: 'client-1',
        title: 'E-commerce Website',
        description: 'Build a modern e-commerce platform',
        requiredSkills: [
          { skillName: 'React', minLevel: 'ADVANCED', required: true },
          { skillName: 'Node.js', minLevel: 'INTERMEDIATE', required: true },
        ],
        budgetType: 'FIXED',
        budgetMin: 5000,
        budgetMax: 10000,
        currency: 'EUR',
        estimatedDuration: 60,
        locationType: 'REMOTE',
        country: 'RO',
        experienceLevel: 'SENIOR',
        contractTypes: ['PFA', 'SRL'],
        languagesRequired: ['Romanian', 'English'],
        status: 'DRAFT',
        visibility: 'PUBLIC',
      });

      expect(project.id).toBeDefined();
      expect(project.title).toBe('E-commerce Website');
      expect(project.status).toBe('DRAFT');
      expect(project.applicationsCount).toBe(0);
    });

    it('should publish a project', async () => {
      const project = await service.createProject({
        clientId: 'client-1',
        title: 'Mobile App',
        description: 'Build a mobile app',
        requiredSkills: [{ skillName: 'React Native', minLevel: 'ADVANCED', required: true }],
        budgetType: 'HOURLY',
        budgetMin: 40,
        budgetMax: 60,
        currency: 'EUR',
        estimatedDuration: 90,
        locationType: 'REMOTE',
        country: 'RO',
        experienceLevel: 'INTERMEDIATE',
        contractTypes: ['PFA'],
        languagesRequired: ['English'],
        status: 'DRAFT',
        visibility: 'PUBLIC',
      });

      const published = await service.publishProject(project.id);
      expect(published.status).toBe('PUBLISHED');
      expect(published.publishedAt).toBeDefined();
    });

    it('should search projects by skills', async () => {
      await service.createProject({
        clientId: 'client-1',
        title: 'React Project',
        description: 'Need React developer',
        requiredSkills: [{ skillName: 'React', minLevel: 'ADVANCED', required: true }],
        budgetType: 'FIXED',
        budgetMin: 3000,
        budgetMax: 5000,
        currency: 'EUR',
        estimatedDuration: 30,
        locationType: 'REMOTE',
        country: 'RO',
        experienceLevel: 'INTERMEDIATE',
        contractTypes: ['PFA'],
        languagesRequired: ['English'],
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });

      await service.createProject({
        clientId: 'client-2',
        title: 'Python Project',
        description: 'Need Python developer',
        requiredSkills: [{ skillName: 'Python', minLevel: 'EXPERT', required: true }],
        budgetType: 'HOURLY',
        budgetMin: 50,
        budgetMax: 80,
        currency: 'EUR',
        estimatedDuration: 60,
        locationType: 'HYBRID',
        country: 'DE',
        experienceLevel: 'SENIOR',
        contractTypes: ['SRL'],
        languagesRequired: ['German'],
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });

      const results = await service.searchProjects({ skills: ['React'] });
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('React Project');
    });
  });

  describe('AI Talent Matching', () => {
    let freelancer1Id: string;
    let freelancer2Id: string;
    let projectId: string;

    beforeEach(async () => {
      const f1 = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'expert@example.com',
        firstName: 'Expert',
        lastName: 'Developer',
        displayName: 'Expert Dev',
        title: 'Senior Full Stack Developer',
        bio: 'Expert in React and Node.js',
        skills: [
          { id: 'skill-1', name: 'React', category: 'DEVELOPMENT', level: 'EXPERT', yearsExperience: 8, verified: true, endorsements: 20 },
          { id: 'skill-2', name: 'Node.js', category: 'DEVELOPMENT', level: 'ADVANCED', yearsExperience: 6, verified: true, endorsements: 15 },
        ],
        hourlyRate: 55,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: true,
        skillsVerified: true,
      });
      freelancer1Id = f1.id;

      const f2 = await service.createFreelancerProfile({
        userId: 'user-2',
        email: 'junior@example.com',
        firstName: 'Junior',
        lastName: 'Developer',
        displayName: 'Junior Dev',
        title: 'Junior Developer',
        bio: 'Learning React',
        skills: [
          { id: 'skill-3', name: 'React', category: 'DEVELOPMENT', level: 'BEGINNER', yearsExperience: 1, verified: false, endorsements: 2 },
        ],
        hourlyRate: 20,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'Cluj',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['SHORT_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: false,
        portfolioVerified: false,
        skillsVerified: false,
      });
      freelancer2Id = f2.id;

      const project = await service.createProject({
        clientId: 'client-1',
        title: 'Complex React Application',
        description: 'Build a complex React application',
        requiredSkills: [
          { skillName: 'React', minLevel: 'ADVANCED', required: true },
          { skillName: 'Node.js', minLevel: 'INTERMEDIATE', required: true },
        ],
        budgetType: 'HOURLY',
        budgetMin: 40,
        budgetMax: 60,
        currency: 'EUR',
        estimatedDuration: 90,
        locationType: 'REMOTE',
        country: 'RO',
        experienceLevel: 'SENIOR',
        contractTypes: ['PFA', 'SRL'],
        languagesRequired: ['Romanian', 'English'],
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });
      projectId = project.id;
    });

    it('should match freelancers to project', async () => {
      const matches = await service.matchFreelancersToProject(projectId);

      expect(matches.length).toBe(2);
      // Expert should rank higher
      expect(matches[0].freelancer.id).toBe(freelancer1Id);
      expect(matches[0].matchScore).toBeGreaterThan(matches[1].matchScore);
    });

    it('should calculate skill match correctly', async () => {
      const matches = await service.matchFreelancersToProject(projectId);

      const expertMatch = matches.find(m => m.freelancer.id === freelancer1Id);
      expect(expertMatch!.breakdown.skillMatch).toBeGreaterThan(80);
    });

    it('should include highlights and concerns', async () => {
      const matches = await service.matchFreelancersToProject(projectId);

      const expertMatch = matches.find(m => m.freelancer.id === freelancer1Id);
      expect(expertMatch!.highlights.length).toBeGreaterThan(0);

      const juniorMatch = matches.find(m => m.freelancer.id === freelancer2Id);
      expect(juniorMatch!.concerns.length).toBeGreaterThan(0);
    });

    it('should find similar freelancers', async () => {
      const similar = await service.findSimilarFreelancers(freelancer1Id, 5);
      expect(similar.length).toBe(1);
      expect(similar[0].id).toBe(freelancer2Id);
    });
  });

  describe('Applications', () => {
    it('should apply to project', async () => {
      const freelancer = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'applicant@example.com',
        firstName: 'Test',
        lastName: 'Applicant',
        displayName: 'Test A.',
        title: 'Developer',
        bio: 'Test bio',
        skills: [{ id: 'skill-1', name: 'JavaScript', category: 'DEVELOPMENT', level: 'ADVANCED', yearsExperience: 5, verified: true, endorsements: 10 }],
        hourlyRate: 45,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: true,
      });

      const project = await service.createProject({
        clientId: 'client-1',
        title: 'JavaScript Project',
        description: 'Need JavaScript developer',
        requiredSkills: [{ skillName: 'JavaScript', minLevel: 'INTERMEDIATE', required: true }],
        budgetType: 'HOURLY',
        budgetMin: 40,
        budgetMax: 60,
        currency: 'EUR',
        estimatedDuration: 30,
        locationType: 'REMOTE',
        country: 'RO',
        experienceLevel: 'INTERMEDIATE',
        contractTypes: ['PFA'],
        languagesRequired: ['English'],
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });

      const application = await service.applyToProject({
        projectId: project.id,
        freelancerId: freelancer.id,
        coverLetter: 'I am interested in this project...',
        proposedRate: 50,
        proposedDuration: 25,
        proposedStartDate: new Date(),
      });

      expect(application.id).toBeDefined();
      expect(application.status).toBe('PENDING');
      expect(application.matchScore).toBeGreaterThan(0);
    });

    it('should update application status', async () => {
      const freelancer = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test U.',
        title: 'Developer',
        bio: 'Test bio',
        skills: [],
        hourlyRate: 40,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: false,
      });

      const project = await service.createProject({
        clientId: 'client-1',
        title: 'Test Project',
        description: 'Test description',
        requiredSkills: [],
        budgetType: 'FIXED',
        budgetMin: 1000,
        budgetMax: 2000,
        currency: 'EUR',
        estimatedDuration: 14,
        locationType: 'REMOTE',
        country: 'RO',
        experienceLevel: 'ENTRY',
        contractTypes: ['PFA'],
        languagesRequired: ['English'],
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });

      const application = await service.applyToProject({
        projectId: project.id,
        freelancerId: freelancer.id,
        coverLetter: 'Test cover letter',
        proposedRate: 1500,
        proposedDuration: 10,
        proposedStartDate: new Date(),
      });

      const updated = await service.updateApplicationStatus(application.id, 'SHORTLISTED');
      expect(updated.status).toBe('SHORTLISTED');
    });

    it('should schedule interview', async () => {
      const freelancer = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test U.',
        title: 'Developer',
        bio: 'Test bio',
        skills: [],
        hourlyRate: 40,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: false,
      });

      const project = await service.createProject({
        clientId: 'client-1',
        title: 'Test Project',
        description: 'Test description',
        requiredSkills: [],
        budgetType: 'FIXED',
        budgetMin: 1000,
        budgetMax: 2000,
        currency: 'EUR',
        estimatedDuration: 14,
        locationType: 'REMOTE',
        country: 'RO',
        experienceLevel: 'ENTRY',
        contractTypes: ['PFA'],
        languagesRequired: ['English'],
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });

      const application = await service.applyToProject({
        projectId: project.id,
        freelancerId: freelancer.id,
        coverLetter: 'Test cover letter',
        proposedRate: 1500,
        proposedDuration: 10,
        proposedStartDate: new Date(),
      });

      const interviewDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const updated = await service.scheduleInterview(application.id, interviewDate);

      expect(updated.status).toBe('INTERVIEWING');
      expect(updated.interviewScheduledAt).toEqual(interviewDate);
    });
  });

  describe('Reviews', () => {
    it('should add review and update ratings', async () => {
      const freelancer = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test U.',
        title: 'Developer',
        bio: 'Test bio',
        skills: [],
        hourlyRate: 40,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: false,
      });

      await service.addReview({
        freelancerId: freelancer.id,
        projectId: 'project-1',
        clientId: 'client-1',
        overallRating: 5,
        qualityRating: 5,
        communicationRating: 4,
        timelinessRating: 5,
        professionalismRating: 5,
        publicFeedback: 'Excellent work!',
        projectTitle: 'Test Project',
        projectValue: 5000,
      });

      const updated = await service.getFreelancerProfile(freelancer.id);
      expect(updated!.totalReviews).toBe(1);
      expect(updated!.averageRating).toBe(5);
      expect(updated!.completedProjects).toBe(1);
      expect(updated!.totalEarnings).toBe(5000);
    });

    it('should calculate average rating from multiple reviews', async () => {
      const freelancer = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test U.',
        title: 'Developer',
        bio: 'Test bio',
        skills: [],
        hourlyRate: 40,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: false,
      });

      await service.addReview({
        freelancerId: freelancer.id,
        projectId: 'project-1',
        clientId: 'client-1',
        overallRating: 5,
        qualityRating: 5,
        communicationRating: 5,
        timelinessRating: 5,
        professionalismRating: 5,
        publicFeedback: 'Perfect!',
        projectTitle: 'Project 1',
        projectValue: 3000,
      });

      await service.addReview({
        freelancerId: freelancer.id,
        projectId: 'project-2',
        clientId: 'client-2',
        overallRating: 3,
        qualityRating: 3,
        communicationRating: 3,
        timelinessRating: 3,
        professionalismRating: 3,
        publicFeedback: 'Average work',
        projectTitle: 'Project 2',
        projectValue: 2000,
      });

      const updated = await service.getFreelancerProfile(freelancer.id);
      expect(updated!.totalReviews).toBe(2);
      expect(updated!.averageRating).toBe(4);
    });
  });

  describe('EU Posted Workers Directive', () => {
    it('should create posted worker declaration', async () => {
      const declaration = await service.createPostedWorkerDeclaration({
        freelancerId: 'freelancer-1',
        projectId: 'project-1',
        workerNationality: 'RO',
        homeCountry: 'RO',
        hostCountry: 'DE',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-30'),
        workLocation: 'Berlin, Germany',
        jobDescription: 'Software development services',
        hourlyRate: 50,
        currency: 'EUR',
        workingHoursPerWeek: 40,
        restDays: ['Saturday', 'Sunday'],
        a1CertificateNumber: 'A1-RO-123456',
        a1ExpiryDate: new Date('2025-12-31'),
        healthInsuranceProvider: 'CNAS Romania',
        healthInsurancePolicyNumber: 'HI-123456',
        equalTreatmentConfirmed: true,
        submittedToAuthority: false,
        status: 'DRAFT',
      });

      expect(declaration.id).toBeDefined();
      expect(declaration.minimumWageCompliant).toBe(true);
      expect(declaration.hostCountryMinimumWage).toBe(12.4); // Germany min wage
    });

    it('should detect minimum wage non-compliance', async () => {
      const declaration = await service.createPostedWorkerDeclaration({
        freelancerId: 'freelancer-1',
        projectId: 'project-1',
        workerNationality: 'RO',
        homeCountry: 'RO',
        hostCountry: 'DE',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-30'),
        workLocation: 'Berlin, Germany',
        jobDescription: 'Software development services',
        hourlyRate: 10, // Below German minimum wage
        currency: 'EUR',
        workingHoursPerWeek: 40,
        restDays: ['Saturday', 'Sunday'],
        equalTreatmentConfirmed: true,
        submittedToAuthority: false,
        status: 'DRAFT',
      });

      expect(declaration.minimumWageCompliant).toBe(false);
    });

    it('should validate posted worker declaration', async () => {
      const declaration = await service.createPostedWorkerDeclaration({
        freelancerId: 'freelancer-1',
        projectId: 'project-1',
        workerNationality: 'RO',
        homeCountry: 'RO',
        hostCountry: 'DE',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-30'),
        workLocation: 'Berlin, Germany',
        jobDescription: 'Software development services',
        hourlyRate: 50,
        currency: 'EUR',
        workingHoursPerWeek: 40,
        restDays: ['Saturday', 'Sunday'],
        a1CertificateNumber: 'A1-RO-123456',
        a1ExpiryDate: new Date('2025-12-31'),
        healthInsuranceProvider: 'CNAS Romania',
        healthInsurancePolicyNumber: 'HI-123456',
        equalTreatmentConfirmed: true,
        submittedToAuthority: false,
        status: 'DRAFT',
      });

      const validation = service.validatePostedWorkerDeclaration(declaration);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should reject declaration without A1 certificate', async () => {
      const declaration = await service.createPostedWorkerDeclaration({
        freelancerId: 'freelancer-1',
        projectId: 'project-1',
        workerNationality: 'RO',
        homeCountry: 'RO',
        hostCountry: 'DE',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-30'),
        workLocation: 'Berlin, Germany',
        jobDescription: 'Software development services',
        hourlyRate: 50,
        currency: 'EUR',
        workingHoursPerWeek: 40,
        restDays: ['Saturday', 'Sunday'],
        // Missing A1 certificate
        healthInsuranceProvider: 'CNAS Romania',
        healthInsurancePolicyNumber: 'HI-123456',
        equalTreatmentConfirmed: true,
        submittedToAuthority: false,
        status: 'DRAFT',
      });

      const validation = service.validatePostedWorkerDeclaration(declaration);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('A1 social security certificate is required for posted workers');
    });

    it('should check cross-border compliance', async () => {
      const compliance = await service.checkCrossBorderCompliance('freelancer-1', 'DE', 50);

      expect(compliance.compliant).toBe(true);
      expect(compliance.minimumWage).toBe(12.4);
      expect(compliance.rateCompliant).toBe(true);
      expect(compliance.documentsRequired.length).toBeGreaterThan(0);
    });

    it('should flag non-compliant rate', async () => {
      const compliance = await service.checkCrossBorderCompliance('freelancer-1', 'LU', 10);

      expect(compliance.compliant).toBe(false);
      expect(compliance.minimumWage).toBe(14.9); // Luxembourg
      expect(compliance.rateCompliant).toBe(false);
    });
  });

  describe('Workforce Classification (OUG 79/2023)', () => {
    it('should classify independent contractor correctly', async () => {
      const freelancer = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'independent@example.com',
        firstName: 'Independent',
        lastName: 'Contractor',
        displayName: 'Independent C.',
        title: 'Consultant',
        bio: 'Independent consultant',
        skills: [],
        hourlyRate: 80,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 20,
        preferredProjectDuration: ['SHORT_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: true,
        skillsVerified: true,
      });

      const assessment = await service.performClassificationAssessment(
        freelancer.id,
        'hr-manager-1',
        {
          setsOwnSchedule: true,
          choosesWorkLocation: true,
          usesOwnEquipment: true,
          canSubcontract: true,
          multipleClients: true,
          clientRevenueShare: 30,
          marketsProfessionally: true,
          setsOwnRates: true,
          wearsCompanyUniform: false,
          usesCompanyEmail: false,
          attendsCompanyMeetings: false,
          reportsTomanager: false,
          bearsFinancialRisk: true,
          canIncreaseProfit: true,
          invoicesForServices: true,
          hasBusinessRegistration: true,
        }
      );

      expect(assessment.classification).toBe('INDEPENDENT_CONTRACTOR');
      expect(assessment.riskLevel).toBe('LOW');
      expect(assessment.overallScore).toBeGreaterThan(75);
    });

    it('should flag misclassification risk', async () => {
      const freelancer = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'risky@example.com',
        firstName: 'Risky',
        lastName: 'Worker',
        displayName: 'Risky W.',
        title: 'Developer',
        bio: 'Works for one client',
        skills: [],
        hourlyRate: 30,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['LONG_TERM'],
        remoteOnly: false,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: false,
      });

      const assessment = await service.performClassificationAssessment(
        freelancer.id,
        'hr-manager-1',
        {
          setsOwnSchedule: false,
          choosesWorkLocation: false,
          usesOwnEquipment: false,
          canSubcontract: false,
          multipleClients: false,
          clientRevenueShare: 100, // 100% from single client
          marketsProfessionally: false,
          setsOwnRates: false,
          wearsCompanyUniform: true,
          usesCompanyEmail: true,
          attendsCompanyMeetings: true,
          reportsTomanager: true,
          bearsFinancialRisk: false,
          canIncreaseProfit: false,
          invoicesForServices: true,
          hasBusinessRegistration: true,
        }
      );

      expect(['MISCLASSIFICATION_RISK', 'EMPLOYEE']).toContain(assessment.classification);
      expect(['HIGH', 'CRITICAL']).toContain(assessment.riskLevel);
      expect(assessment.recommendations.length).toBeGreaterThan(0);
    });

    it('should include legal references', async () => {
      const freelancer = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test U.',
        title: 'Developer',
        bio: 'Test',
        skills: [],
        hourlyRate: 40,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: false,
      });

      const assessment = await service.performClassificationAssessment(
        freelancer.id,
        'hr-manager-1',
        {
          setsOwnSchedule: true,
          choosesWorkLocation: true,
          usesOwnEquipment: true,
          canSubcontract: false,
          multipleClients: true,
          clientRevenueShare: 50,
          marketsProfessionally: true,
          setsOwnRates: true,
          wearsCompanyUniform: false,
          usesCompanyEmail: false,
          attendsCompanyMeetings: false,
          reportsTomanager: false,
          bearsFinancialRisk: true,
          canIncreaseProfit: true,
          invoicesForServices: true,
          hasBusinessRegistration: true,
        }
      );

      expect(assessment.legalBasis).toContain('OUG 79/2023');
      expect(assessment.relevantArticles.length).toBeGreaterThan(0);
    });
  });

  describe('Vendor Portal Dashboard', () => {
    it('should generate vendor dashboard', async () => {
      const freelancer = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'vendor@example.com',
        firstName: 'Vendor',
        lastName: 'User',
        displayName: 'Vendor U.',
        title: 'Developer',
        bio: 'Experienced vendor',
        skills: [{ id: 'skill-1', name: 'JavaScript', category: 'DEVELOPMENT', level: 'ADVANCED', yearsExperience: 5, verified: true, endorsements: 10 }],
        hourlyRate: 50,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: true,
      });

      const dashboard = await service.getVendorDashboard(freelancer.id);

      expect(dashboard.profile).toBeDefined();
      expect(dashboard.activeProjects).toBe(0);
      expect(dashboard.pendingApplications).toBe(0);
      expect(dashboard.alerts).toBeDefined();
    });

    it('should include alerts for unverified profiles', async () => {
      const freelancer = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'unverified@example.com',
        firstName: 'Unverified',
        lastName: 'User',
        displayName: 'Unverified U.',
        title: 'Developer',
        bio: 'New vendor',
        skills: [],
        hourlyRate: 30,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['SHORT_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: false,
        portfolioVerified: false,
        skillsVerified: false,
      });

      const dashboard = await service.getVendorDashboard(freelancer.id);

      const verificationAlert = dashboard.alerts.find(a => a.type === 'VERIFICATION');
      expect(verificationAlert).toBeDefined();

      const profileAlert = dashboard.alerts.find(a => a.type === 'PROFILE');
      expect(profileAlert).toBeDefined();
    });
  });

  describe('Analytics', () => {
    it('should generate freelancer analytics', async () => {
      const freelancer = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'analytics@example.com',
        firstName: 'Analytics',
        lastName: 'User',
        displayName: 'Analytics U.',
        title: 'Developer',
        bio: 'Test',
        skills: [{ id: 'skill-1', name: 'JavaScript', category: 'DEVELOPMENT', level: 'ADVANCED', yearsExperience: 5, verified: true, endorsements: 10 }],
        hourlyRate: 50,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: true,
        skillsVerified: true,
      });

      const analytics = await service.getFreelancerAnalytics(freelancer.id);

      expect(analytics.earnings.length).toBe(6);
      expect(analytics.projectsByStatus).toBeDefined();
      expect(analytics.skillDemand).toBeDefined();
      expect(analytics.responseMetrics).toBeDefined();
      expect(analytics.competitiveAnalysis).toBeDefined();
    });

    it('should generate platform statistics', async () => {
      await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'stat1@example.com',
        firstName: 'Stat',
        lastName: 'One',
        displayName: 'Stat O.',
        title: 'Developer',
        bio: 'Test',
        skills: [{ id: 'skill-1', name: 'React', category: 'DEVELOPMENT', level: 'EXPERT', yearsExperience: 8, verified: true, endorsements: 20 }],
        hourlyRate: 60,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: true,
        skillsVerified: true,
      });

      await service.createProject({
        clientId: 'client-1',
        title: 'Test Project',
        description: 'Test',
        requiredSkills: [{ skillName: 'React', minLevel: 'ADVANCED', required: true }],
        budgetType: 'FIXED',
        budgetMin: 5000,
        budgetMax: 10000,
        currency: 'EUR',
        estimatedDuration: 30,
        locationType: 'REMOTE',
        country: 'RO',
        experienceLevel: 'SENIOR',
        contractTypes: ['PFA'],
        languagesRequired: ['English'],
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });

      const stats = await service.getPlatformStatistics();

      expect(stats.totalFreelancers).toBe(1);
      expect(stats.activeFreelancers).toBe(1);
      expect(stats.totalProjects).toBe(1);
      expect(stats.openProjects).toBe(1);
      expect(stats.topSkills.length).toBeGreaterThan(0);
      expect(stats.freelancersByCountry.length).toBeGreaterThan(0);
    });
  });

  describe('Reference Data', () => {
    it('should return skill categories', () => {
      const categories = service.getSkillCategories();
      expect(categories['DEVELOPMENT']).toBeDefined();
      expect(categories['DESIGN']).toBeDefined();
      expect(categories['MARKETING']).toBeDefined();
    });

    it('should return EU countries', () => {
      const countries = service.getEUCountries();
      expect(countries).toContain('RO');
      expect(countries).toContain('DE');
      expect(countries).toContain('FR');
      expect(countries.length).toBe(27);
    });

    it('should return minimum wages', () => {
      const wages = service.getMinimumWages();
      expect(wages['RO']).toBeDefined();
      expect(wages['DE']).toBe(12.4);
      expect(wages['LU']).toBe(14.9);
    });
  });

  describe('Advanced Search and Filtering', () => {
    it('should filter freelancers by availability', async () => {
      await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'available@example.com',
        firstName: 'Available',
        lastName: 'User',
        displayName: 'Available U.',
        title: 'Developer',
        bio: 'Available for work',
        skills: [],
        hourlyRate: 40,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: false,
      });

      await service.createFreelancerProfile({
        userId: 'user-2',
        email: 'busy@example.com',
        firstName: 'Busy',
        lastName: 'User',
        displayName: 'Busy U.',
        title: 'Developer',
        bio: 'Currently busy',
        skills: [],
        hourlyRate: 50,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'Cluj',
        timezone: 'Europe/Bucharest',
        availability: 'BUSY',
        availableHoursPerWeek: 0,
        preferredProjectDuration: ['LONG_TERM'],
        remoteOnly: false,
        willingToTravel: true,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: true,
        skillsVerified: true,
      });

      const results = await service.searchFreelancers({ availability: ['AVAILABLE'] });
      expect(results.length).toBe(1);
      expect(results[0].availability).toBe('AVAILABLE');
    });

    it('should filter freelancers by contract type', async () => {
      await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'pfa@example.com',
        firstName: 'PFA',
        lastName: 'User',
        displayName: 'PFA U.',
        title: 'Consultant',
        bio: 'PFA registered',
        skills: [],
        hourlyRate: 45,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: false,
      });

      await service.createFreelancerProfile({
        userId: 'user-2',
        email: 'srl@example.com',
        firstName: 'SRL',
        lastName: 'User',
        displayName: 'SRL U.',
        title: 'Agency Owner',
        bio: 'SRL company',
        skills: [],
        hourlyRate: 80,
        currency: 'EUR',
        contractType: 'SRL',
        country: 'RO',
        city: 'Cluj',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 30,
        preferredProjectDuration: ['LONG_TERM'],
        remoteOnly: false,
        willingToTravel: true,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: true,
        skillsVerified: true,
      });

      const results = await service.searchFreelancers({ contractTypes: ['SRL'] });
      expect(results.length).toBe(1);
      expect(results[0].contractType).toBe('SRL');
    });

    it('should filter freelancers by country', async () => {
      await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'ro@example.com',
        firstName: 'Romanian',
        lastName: 'User',
        displayName: 'Romanian U.',
        title: 'Developer',
        bio: 'From Romania',
        skills: [],
        hourlyRate: 40,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: false,
      });

      await service.createFreelancerProfile({
        userId: 'user-2',
        email: 'de@example.com',
        firstName: 'German',
        lastName: 'User',
        displayName: 'German U.',
        title: 'Developer',
        bio: 'From Germany',
        skills: [],
        hourlyRate: 80,
        currency: 'EUR',
        contractType: 'FOREIGN_CONTRACTOR',
        country: 'DE',
        city: 'Berlin',
        timezone: 'Europe/Berlin',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 30,
        preferredProjectDuration: ['LONG_TERM'],
        remoteOnly: false,
        willingToTravel: true,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: true,
        skillsVerified: true,
      });

      const results = await service.searchFreelancers({ countries: ['RO'] });
      expect(results.length).toBe(1);
      expect(results[0].country).toBe('RO');
    });

    it('should filter verified freelancers only', async () => {
      await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'verified@example.com',
        firstName: 'Verified',
        lastName: 'User',
        displayName: 'Verified U.',
        title: 'Developer',
        bio: 'Fully verified',
        skills: [],
        hourlyRate: 60,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: true,
        skillsVerified: true,
      });

      await service.createFreelancerProfile({
        userId: 'user-2',
        email: 'unverified@example.com',
        firstName: 'Unverified',
        lastName: 'User',
        displayName: 'Unverified U.',
        title: 'Developer',
        bio: 'Not verified yet',
        skills: [],
        hourlyRate: 30,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'Cluj',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['SHORT_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: false,
        portfolioVerified: false,
        skillsVerified: false,
      });

      const results = await service.searchFreelancers({ verifiedOnly: true });
      expect(results.length).toBe(1);
      expect(results[0].identityVerified).toBe(true);
      expect(results[0].skillsVerified).toBe(true);
    });

    it('should search projects by budget range', async () => {
      await service.createProject({
        clientId: 'client-1',
        title: 'Low Budget Project',
        description: 'Small project',
        requiredSkills: [],
        budgetType: 'FIXED',
        budgetMin: 500,
        budgetMax: 1000,
        currency: 'EUR',
        estimatedDuration: 7,
        locationType: 'REMOTE',
        country: 'RO',
        experienceLevel: 'ENTRY',
        contractTypes: ['PFA'],
        languagesRequired: ['Romanian'],
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });

      await service.createProject({
        clientId: 'client-2',
        title: 'High Budget Project',
        description: 'Large project',
        requiredSkills: [],
        budgetType: 'FIXED',
        budgetMin: 10000,
        budgetMax: 20000,
        currency: 'EUR',
        estimatedDuration: 90,
        locationType: 'REMOTE',
        country: 'RO',
        experienceLevel: 'SENIOR',
        contractTypes: ['SRL'],
        languagesRequired: ['English'],
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });

      const results = await service.searchProjects({ budgetMax: 5000 });
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Low Budget Project');
    });

    it('should search projects by location type', async () => {
      await service.createProject({
        clientId: 'client-1',
        title: 'Remote Project',
        description: 'Fully remote',
        requiredSkills: [],
        budgetType: 'HOURLY',
        budgetMin: 30,
        budgetMax: 50,
        currency: 'EUR',
        estimatedDuration: 30,
        locationType: 'REMOTE',
        country: 'RO',
        experienceLevel: 'INTERMEDIATE',
        contractTypes: ['PFA'],
        languagesRequired: ['English'],
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });

      await service.createProject({
        clientId: 'client-2',
        title: 'Onsite Project',
        description: 'Must be in office',
        requiredSkills: [],
        budgetType: 'FIXED',
        budgetMin: 5000,
        budgetMax: 8000,
        currency: 'EUR',
        estimatedDuration: 45,
        locationType: 'ONSITE',
        country: 'RO',
        location: 'București',
        experienceLevel: 'SENIOR',
        contractTypes: ['PFA', 'SRL'],
        languagesRequired: ['Romanian'],
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });

      const results = await service.searchProjects({ locationType: ['REMOTE'] });
      expect(results.length).toBe(1);
      expect(results[0].locationType).toBe('REMOTE');
    });

    it('should search projects by experience level', async () => {
      await service.createProject({
        clientId: 'client-1',
        title: 'Junior Project',
        description: 'For beginners',
        requiredSkills: [],
        budgetType: 'FIXED',
        budgetMin: 500,
        budgetMax: 1000,
        currency: 'EUR',
        estimatedDuration: 14,
        locationType: 'REMOTE',
        country: 'RO',
        experienceLevel: 'ENTRY',
        contractTypes: ['PFA'],
        languagesRequired: ['Romanian'],
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });

      await service.createProject({
        clientId: 'client-2',
        title: 'Expert Project',
        description: 'For experts',
        requiredSkills: [],
        budgetType: 'FIXED',
        budgetMin: 15000,
        budgetMax: 25000,
        currency: 'EUR',
        estimatedDuration: 60,
        locationType: 'HYBRID',
        country: 'DE',
        experienceLevel: 'EXPERT',
        contractTypes: ['SRL'],
        languagesRequired: ['German', 'English'],
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });

      const results = await service.searchProjects({ experienceLevel: ['ENTRY'] });
      expect(results.length).toBe(1);
      expect(results[0].experienceLevel).toBe('ENTRY');
    });
  });

  describe('Posted Worker Declaration Workflow', () => {
    it('should submit valid declaration', async () => {
      const declaration = await service.createPostedWorkerDeclaration({
        freelancerId: 'freelancer-1',
        projectId: 'project-1',
        workerNationality: 'RO',
        homeCountry: 'RO',
        hostCountry: 'FR',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-07-31'),
        workLocation: 'Paris, France',
        jobDescription: 'IT Consulting',
        hourlyRate: 60,
        currency: 'EUR',
        workingHoursPerWeek: 35,
        restDays: ['Saturday', 'Sunday'],
        a1CertificateNumber: 'A1-RO-789',
        a1ExpiryDate: new Date('2025-12-31'),
        healthInsuranceProvider: 'Private Insurance',
        healthInsurancePolicyNumber: 'HI-789',
        equalTreatmentConfirmed: true,
        submittedToAuthority: false,
        status: 'DRAFT',
      });

      const submitted = await service.submitPostedWorkerDeclaration(declaration.id);
      expect(submitted.status).toBe('SUBMITTED');
      expect(submitted.submittedToAuthority).toBe(true);
      expect(submitted.declarationNumber).toContain('PWD-FR');
    });

    it('should fail submission for non-EU country', async () => {
      const declaration = await service.createPostedWorkerDeclaration({
        freelancerId: 'freelancer-1',
        projectId: 'project-1',
        workerNationality: 'RO',
        homeCountry: 'RO',
        hostCountry: 'US', // Non-EU country
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-07-31'),
        workLocation: 'New York, USA',
        jobDescription: 'IT Consulting',
        hourlyRate: 100,
        currency: 'USD',
        workingHoursPerWeek: 40,
        restDays: ['Saturday', 'Sunday'],
        a1CertificateNumber: 'A1-RO-789',
        a1ExpiryDate: new Date('2025-12-31'),
        healthInsuranceProvider: 'Private Insurance',
        healthInsurancePolicyNumber: 'HI-789',
        equalTreatmentConfirmed: true,
        submittedToAuthority: false,
        status: 'DRAFT',
      });

      const validation = service.validatePostedWorkerDeclaration(declaration);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('US'))).toBe(true);
    });

    it('should warn about long assignment duration', async () => {
      const declaration = await service.createPostedWorkerDeclaration({
        freelancerId: 'freelancer-1',
        projectId: 'project-1',
        workerNationality: 'RO',
        homeCountry: 'RO',
        hostCountry: 'DE',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-06-30'), // 18 months
        workLocation: 'Munich, Germany',
        jobDescription: 'Long-term consulting',
        hourlyRate: 70,
        currency: 'EUR',
        workingHoursPerWeek: 40,
        restDays: ['Saturday', 'Sunday'],
        a1CertificateNumber: 'A1-RO-123',
        a1ExpiryDate: new Date('2026-12-31'),
        healthInsuranceProvider: 'CNAS',
        healthInsurancePolicyNumber: 'HI-123',
        equalTreatmentConfirmed: true,
        submittedToAuthority: false,
        status: 'DRAFT',
      });

      const validation = service.validatePostedWorkerDeclaration(declaration);
      expect(validation.warnings.some(w => w.includes('12-month') || w.includes('18-month'))).toBe(true);
    });
  });

  describe('Classification Assessment History', () => {
    it('should get classification history for freelancer', async () => {
      const freelancer = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'history@example.com',
        firstName: 'History',
        lastName: 'Test',
        displayName: 'History T.',
        title: 'Consultant',
        bio: 'Test',
        skills: [],
        hourlyRate: 50,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: false,
      });

      // First assessment
      await service.performClassificationAssessment(
        freelancer.id,
        'assessor-1',
        {
          setsOwnSchedule: true,
          choosesWorkLocation: true,
          usesOwnEquipment: true,
          canSubcontract: true,
          multipleClients: true,
          clientRevenueShare: 40,
          marketsProfessionally: true,
          setsOwnRates: true,
          wearsCompanyUniform: false,
          usesCompanyEmail: false,
          attendsCompanyMeetings: false,
          reportsTomanager: false,
          bearsFinancialRisk: true,
          canIncreaseProfit: true,
          invoicesForServices: true,
          hasBusinessRegistration: true,
        }
      );

      // Second assessment (changed circumstances)
      await service.performClassificationAssessment(
        freelancer.id,
        'assessor-2',
        {
          setsOwnSchedule: false,
          choosesWorkLocation: false,
          usesOwnEquipment: false,
          canSubcontract: false,
          multipleClients: false,
          clientRevenueShare: 90,
          marketsProfessionally: false,
          setsOwnRates: false,
          wearsCompanyUniform: true,
          usesCompanyEmail: true,
          attendsCompanyMeetings: true,
          reportsTomanager: true,
          bearsFinancialRisk: false,
          canIncreaseProfit: false,
          invoicesForServices: true,
          hasBusinessRegistration: true,
        }
      );

      const assessments = await service.getClassificationAssessments(freelancer.id);
      expect(assessments.length).toBe(2);
      // Both assessors should be present
      expect(assessments.some(a => a.assessedBy === 'assessor-1')).toBe(true);
      expect(assessments.some(a => a.assessedBy === 'assessor-2')).toBe(true);
    });

    it('should get latest classification', async () => {
      const freelancer = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'latest@example.com',
        firstName: 'Latest',
        lastName: 'Test',
        displayName: 'Latest T.',
        title: 'Consultant',
        bio: 'Test',
        skills: [],
        hourlyRate: 50,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: false,
      });

      await service.performClassificationAssessment(
        freelancer.id,
        'assessor-1',
        {
          setsOwnSchedule: true,
          choosesWorkLocation: true,
          usesOwnEquipment: true,
          canSubcontract: true,
          multipleClients: true,
          clientRevenueShare: 30,
          marketsProfessionally: true,
          setsOwnRates: true,
          wearsCompanyUniform: false,
          usesCompanyEmail: false,
          attendsCompanyMeetings: false,
          reportsTomanager: false,
          bearsFinancialRisk: true,
          canIncreaseProfit: true,
          invoicesForServices: true,
          hasBusinessRegistration: true,
        }
      );

      const latest = await service.getLatestClassification(freelancer.id);
      expect(latest).not.toBeNull();
      expect(latest!.classification).toBe('INDEPENDENT_CONTRACTOR');
    });
  });

  describe('Application Workflow', () => {
    it('should get applications for freelancer', async () => {
      const freelancer = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'apps@example.com',
        firstName: 'Apps',
        lastName: 'Test',
        displayName: 'Apps T.',
        title: 'Developer',
        bio: 'Test',
        skills: [],
        hourlyRate: 45,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: false,
      });

      const project1 = await service.createProject({
        clientId: 'client-1',
        title: 'Project 1',
        description: 'Test',
        requiredSkills: [],
        budgetType: 'FIXED',
        budgetMin: 1000,
        budgetMax: 2000,
        currency: 'EUR',
        estimatedDuration: 14,
        locationType: 'REMOTE',
        country: 'RO',
        experienceLevel: 'INTERMEDIATE',
        contractTypes: ['PFA'],
        languagesRequired: ['English'],
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });

      const project2 = await service.createProject({
        clientId: 'client-2',
        title: 'Project 2',
        description: 'Test',
        requiredSkills: [],
        budgetType: 'HOURLY',
        budgetMin: 30,
        budgetMax: 50,
        currency: 'EUR',
        estimatedDuration: 30,
        locationType: 'REMOTE',
        country: 'RO',
        experienceLevel: 'SENIOR',
        contractTypes: ['PFA'],
        languagesRequired: ['Romanian'],
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });

      await service.applyToProject({
        projectId: project1.id,
        freelancerId: freelancer.id,
        coverLetter: 'Cover letter 1',
        proposedRate: 1500,
        proposedDuration: 10,
        proposedStartDate: new Date(),
      });

      await service.applyToProject({
        projectId: project2.id,
        freelancerId: freelancer.id,
        coverLetter: 'Cover letter 2',
        proposedRate: 40,
        proposedDuration: 25,
        proposedStartDate: new Date(),
      });

      const applications = await service.getApplicationsForFreelancer(freelancer.id);
      expect(applications.length).toBe(2);
    });

    it('should rate interview', async () => {
      const freelancer = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'interview@example.com',
        firstName: 'Interview',
        lastName: 'Test',
        displayName: 'Interview T.',
        title: 'Developer',
        bio: 'Test',
        skills: [],
        hourlyRate: 50,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: false,
      });

      const project = await service.createProject({
        clientId: 'client-1',
        title: 'Interview Project',
        description: 'Test',
        requiredSkills: [],
        budgetType: 'FIXED',
        budgetMin: 3000,
        budgetMax: 5000,
        currency: 'EUR',
        estimatedDuration: 21,
        locationType: 'REMOTE',
        country: 'RO',
        experienceLevel: 'INTERMEDIATE',
        contractTypes: ['PFA'],
        languagesRequired: ['English'],
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });

      const application = await service.applyToProject({
        projectId: project.id,
        freelancerId: freelancer.id,
        coverLetter: 'Test cover letter',
        proposedRate: 4000,
        proposedDuration: 18,
        proposedStartDate: new Date(),
      });

      await service.scheduleInterview(application.id, new Date());
      const rated = await service.rateInterview(application.id, 4, 'Good candidate');

      expect(rated.interviewRating).toBe(4);
      expect(rated.interviewNotes).toBe('Good candidate');
    });
  });

  describe('Reviews Workflow', () => {
    it('should get freelancer reviews', async () => {
      const freelancer = await service.createFreelancerProfile({
        userId: 'user-1',
        email: 'reviews@example.com',
        firstName: 'Reviews',
        lastName: 'Test',
        displayName: 'Reviews T.',
        title: 'Developer',
        bio: 'Test',
        skills: [],
        hourlyRate: 50,
        currency: 'EUR',
        contractType: 'PFA',
        country: 'RO',
        city: 'București',
        timezone: 'Europe/Bucharest',
        availability: 'AVAILABLE',
        availableHoursPerWeek: 40,
        preferredProjectDuration: ['MEDIUM_TERM'],
        remoteOnly: true,
        willingToTravel: false,
        status: 'ACTIVE',
        identityVerified: true,
        portfolioVerified: false,
        skillsVerified: false,
      });

      await service.addReview({
        freelancerId: freelancer.id,
        projectId: 'project-1',
        clientId: 'client-1',
        overallRating: 5,
        qualityRating: 5,
        communicationRating: 5,
        timelinessRating: 5,
        professionalismRating: 5,
        publicFeedback: 'Excellent!',
        projectTitle: 'First Project',
        projectValue: 3000,
      });

      await service.addReview({
        freelancerId: freelancer.id,
        projectId: 'project-2',
        clientId: 'client-2',
        overallRating: 4,
        qualityRating: 4,
        communicationRating: 5,
        timelinessRating: 4,
        professionalismRating: 4,
        publicFeedback: 'Good work!',
        projectTitle: 'Second Project',
        projectValue: 2000,
      });

      const reviews = await service.getFreelancerReviews(freelancer.id);
      expect(reviews.length).toBe(2);
      // Both reviews should be present
      expect(reviews.some(r => r.projectTitle === 'First Project')).toBe(true);
      expect(reviews.some(r => r.projectTitle === 'Second Project')).toBe(true);
    });
  });
});
