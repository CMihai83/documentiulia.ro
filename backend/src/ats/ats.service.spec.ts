import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  ATSService,
  JobStatus,
  JobType,
  ExperienceLevel,
  CandidateStatus,
  ApplicationSource,
  InterviewType,
  BiasCategory,
} from './ats.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ATSService', () => {
  let service: ATSService;
  let module: TestingModule;

  const mockPrismaService = {
    employee: {
      findFirst: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Create a fresh module for each test to reset in-memory state
    module = await Test.createTestingModule({
      providers: [
        ATSService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ATSService>(ATSService);
    service.resetState(); // Clear in-memory data
    jest.clearAllMocks();
  });

  describe('Job Postings', () => {
    it('should create a job posting', async () => {
      const job = await service.createJobPosting({
        title: 'Software Developer',
        department: 'Engineering',
        location: 'Bucharest',
        description: 'Build amazing software',
        jobType: JobType.FULL_TIME,
        experienceLevel: ExperienceLevel.MID,
      }, 'recruiter-1');

      expect(job.id).toBeDefined();
      expect(job.title).toBe('Software Developer');
      expect(job.status).toBe(JobStatus.DRAFT);
      expect(job.applicantCount).toBe(0);
    });

    it('should get job posting by id', async () => {
      const created = await service.createJobPosting({
        title: 'Product Manager',
      }, 'recruiter-1');

      const fetched = await service.getJobPosting(created.id);
      expect(fetched.title).toBe('Product Manager');
    });

    it('should throw NotFoundException for unknown job', async () => {
      await expect(service.getJobPosting('unknown-job')).rejects.toThrow(NotFoundException);
    });

    it('should update job posting', async () => {
      const job = await service.createJobPosting({ title: 'Developer' }, 'recruiter-1');
      const updated = await service.updateJobPosting(job.id, {
        title: 'Senior Developer',
        description: 'Updated description',
      });

      expect(updated.title).toBe('Senior Developer');
      expect(updated.description).toBe('Updated description');
    });

    it('should publish job to channels', async () => {
      const job = await service.createJobPosting({
        title: 'QA Engineer',
      }, 'recruiter-1');

      const published = await service.publishJob(job.id, [ApplicationSource.LINKEDIN, ApplicationSource.EJOBS]);

      expect(published.status).toBe(JobStatus.PUBLISHED);
      expect(published.publishedChannels.length).toBe(2);
      expect(published.publishedChannels[0].channel).toBe(ApplicationSource.LINKEDIN);
    });

    it('should not publish already published job', async () => {
      const job = await service.createJobPosting({ title: 'Test' }, 'recruiter-1');
      await service.publishJob(job.id, [ApplicationSource.DIRECT]);

      await expect(
        service.publishJob(job.id, [ApplicationSource.LINKEDIN])
      ).rejects.toThrow(BadRequestException);
    });

    it('should close job posting', async () => {
      const job = await service.createJobPosting({ title: 'Test' }, 'recruiter-1');
      await service.publishJob(job.id, [ApplicationSource.DIRECT]);
      const closed = await service.closeJob(job.id);

      expect(closed.status).toBe(JobStatus.CLOSED);
    });

    it('should list jobs with filters', async () => {
      await service.createJobPosting({
        title: 'Backend Dev',
        department: 'Engineering',
        jobType: JobType.FULL_TIME,
      }, 'recruiter-1');

      await service.createJobPosting({
        title: 'Designer',
        department: 'Design',
        jobType: JobType.CONTRACT,
      }, 'recruiter-1');

      const engineeringJobs = await service.listJobs({ department: 'Engineering' });
      expect(engineeringJobs.length).toBe(1);
      expect(engineeringJobs[0].title).toBe('Backend Dev');

      const contractJobs = await service.listJobs({ jobType: JobType.CONTRACT });
      expect(contractJobs.length).toBe(1);
      expect(contractJobs[0].title).toBe('Designer');
    });

    it('should search jobs by query', async () => {
      await service.createJobPosting({
        title: 'React Developer',
        description: 'Build React applications',
      }, 'recruiter-1');

      await service.createJobPosting({
        title: 'Python Engineer',
        description: 'Build backend services',
      }, 'recruiter-1');

      const results = await service.searchJobs('React');
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('React Developer');
    });
  });

  describe('Candidates', () => {
    it('should create a candidate', async () => {
      const candidate = await service.createCandidate({
        firstName: 'Ion',
        lastName: 'Popescu',
        email: 'ion.popescu@example.com',
        yearsOfExperience: 5,
        skills: [
          { name: 'JavaScript', level: 'ADVANCED', yearsOfExperience: 4, verified: false },
          { name: 'React', level: 'INTERMEDIATE', yearsOfExperience: 2, verified: false },
        ],
        gdprConsent: true,
      });

      expect(candidate.id).toBeDefined();
      expect(candidate.firstName).toBe('Ion');
      expect(candidate.skills.length).toBe(2);
    });

    it('should require email for candidate', async () => {
      await expect(
        service.createCandidate({ firstName: 'Test' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should not allow duplicate email', async () => {
      await service.createCandidate({
        email: 'duplicate@example.com',
        gdprConsent: true,
      });

      await expect(
        service.createCandidate({
          email: 'duplicate@example.com',
          gdprConsent: true,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should get candidate by id', async () => {
      const created = await service.createCandidate({
        firstName: 'Maria',
        email: 'maria@example.com',
        gdprConsent: true,
      });

      const fetched = await service.getCandidate(created.id);
      expect(fetched.firstName).toBe('Maria');
    });

    it('should update candidate', async () => {
      const candidate = await service.createCandidate({
        firstName: 'Test',
        email: 'test.update@example.com',
        gdprConsent: true,
      });

      const updated = await service.updateCandidate(candidate.id, {
        firstName: 'Updated',
        yearsOfExperience: 10,
      });

      expect(updated.firstName).toBe('Updated');
      expect(updated.yearsOfExperience).toBe(10);
    });

    it('should search candidates by name', async () => {
      await service.createCandidate({
        firstName: 'Alexandru',
        lastName: 'Ionescu',
        email: 'alex@example.com',
        gdprConsent: true,
      });

      const results = await service.searchCandidates('Alexandru');
      expect(results.length).toBe(1);
    });

    it('should filter candidates by experience', async () => {
      await service.createCandidate({
        email: 'junior@example.com',
        yearsOfExperience: 2,
        gdprConsent: true,
      });

      await service.createCandidate({
        email: 'senior@example.com',
        yearsOfExperience: 8,
        gdprConsent: true,
      });

      const seniors = await service.listCandidates({ minExperience: 5 });
      expect(seniors.length).toBe(1);
      expect(seniors[0].yearsOfExperience).toBe(8);
    });

    it('should filter candidates by skills', async () => {
      await service.createCandidate({
        email: 'frontend@example.com',
        skills: [{ name: 'React', level: 'ADVANCED', yearsOfExperience: 3, verified: false }],
        gdprConsent: true,
      });

      await service.createCandidate({
        email: 'backend@example.com',
        skills: [{ name: 'Python', level: 'ADVANCED', yearsOfExperience: 3, verified: false }],
        gdprConsent: true,
      });

      const reactDevs = await service.listCandidates({ skills: ['React'] });
      expect(reactDevs.length).toBe(1);
    });
  });

  describe('Applications', () => {
    let jobId: string;
    let candidateId: string;

    beforeEach(async () => {
      const job = await service.createJobPosting({
        title: 'Test Position',
        skills: [
          { name: 'JavaScript', level: 'REQUIRED' },
          { name: 'React', level: 'PREFERRED' },
        ],
        experienceLevel: ExperienceLevel.MID,
      }, 'recruiter-1');
      await service.publishJob(job.id, [ApplicationSource.DIRECT]);
      jobId = job.id;

      const candidate = await service.createCandidate({
        firstName: 'Test',
        lastName: 'Candidate',
        email: 'test.candidate@example.com',
        yearsOfExperience: 4,
        skills: [
          { name: 'JavaScript', level: 'ADVANCED', yearsOfExperience: 3, verified: false },
          { name: 'React', level: 'INTERMEDIATE', yearsOfExperience: 2, verified: false },
        ],
        gdprConsent: true,
      });
      candidateId = candidate.id;
    });

    it('should apply to job', async () => {
      const application = await service.applyToJob(jobId, candidateId, ApplicationSource.DIRECT);

      expect(application.id).toBeDefined();
      expect(application.jobId).toBe(jobId);
      expect(application.candidateId).toBe(candidateId);
      expect(application.status).toBe(CandidateStatus.NEW);
      expect(application.matchScore).toBeGreaterThan(0);
    });

    it('should not apply to unpublished job', async () => {
      const draftJob = await service.createJobPosting({ title: 'Draft' }, 'recruiter-1');

      await expect(
        service.applyToJob(draftJob.id, candidateId, ApplicationSource.DIRECT)
      ).rejects.toThrow(BadRequestException);
    });

    it('should not apply twice to same job', async () => {
      await service.applyToJob(jobId, candidateId, ApplicationSource.DIRECT);

      await expect(
        service.applyToJob(jobId, candidateId, ApplicationSource.LINKEDIN)
      ).rejects.toThrow(BadRequestException);
    });

    it('should update application status', async () => {
      const app = await service.applyToJob(jobId, candidateId, ApplicationSource.DIRECT);
      const updated = await service.updateApplicationStatus(app.id, CandidateStatus.SCREENING);

      expect(updated.status).toBe(CandidateStatus.SCREENING);
    });

    it('should add rejection reason', async () => {
      const app = await service.applyToJob(jobId, candidateId, ApplicationSource.DIRECT);
      const rejected = await service.updateApplicationStatus(
        app.id,
        CandidateStatus.REJECTED,
        'Does not meet experience requirements'
      );

      expect(rejected.status).toBe(CandidateStatus.REJECTED);
      expect(rejected.rejectionReason).toBe('Does not meet experience requirements');
    });

    it('should add notes to application', async () => {
      const app = await service.applyToJob(jobId, candidateId, ApplicationSource.DIRECT);
      const withNote = await service.addApplicationNote(
        app.id,
        'recruiter-1',
        'John Recruiter',
        'Strong communication skills',
        false
      );

      expect(withNote.notes.length).toBe(1);
      expect(withNote.notes[0].content).toBe('Strong communication skills');
    });

    it('should get applications for job', async () => {
      await service.applyToJob(jobId, candidateId, ApplicationSource.DIRECT);

      const applications = await service.getApplicationsForJob(jobId);
      expect(applications.length).toBe(1);
    });

    it('should get applications for candidate', async () => {
      await service.applyToJob(jobId, candidateId, ApplicationSource.DIRECT);

      const applications = await service.getApplicationsForCandidate(candidateId);
      expect(applications.length).toBe(1);
    });
  });

  describe('Interviews', () => {
    let applicationId: string;

    beforeEach(async () => {
      const job = await service.createJobPosting({ title: 'Test' }, 'recruiter-1');
      await service.publishJob(job.id, [ApplicationSource.DIRECT]);

      const candidate = await service.createCandidate({
        email: 'interview.test@example.com',
        gdprConsent: true,
      });

      const app = await service.applyToJob(job.id, candidate.id, ApplicationSource.DIRECT);
      applicationId = app.id;
    });

    it('should schedule interview', async () => {
      const interview = await service.scheduleInterview(
        applicationId,
        InterviewType.PHONE,
        new Date('2025-02-01T10:00:00Z'),
        30,
        ['interviewer-1'],
        undefined,
        'https://meet.example.com/abc'
      );

      expect(interview.id).toBeDefined();
      expect(interview.type).toBe(InterviewType.PHONE);
      expect(interview.status).toBe('SCHEDULED');
      expect(interview.duration).toBe(30);
    });

    it('should update application status to INTERVIEW', async () => {
      await service.scheduleInterview(
        applicationId,
        InterviewType.VIDEO,
        new Date('2025-02-01T10:00:00Z'),
        45,
        ['interviewer-1'],
      );

      const app = await service.getApplication(applicationId);
      expect(app.status).toBe(CandidateStatus.INTERVIEW);
    });

    it('should submit interview feedback', async () => {
      const interview = await service.scheduleInterview(
        applicationId,
        InterviewType.TECHNICAL,
        new Date('2025-02-01T10:00:00Z'),
        60,
        ['tech-lead'],
      );

      const withFeedback = await service.submitInterviewFeedback(applicationId, interview.id, {
        interviewerId: 'tech-lead',
        rating: 4,
        strengths: ['Problem solving', 'Communication'],
        weaknesses: ['Limited system design experience'],
        recommendation: 'YES',
        notes: 'Good candidate overall',
      });

      expect(withFeedback.status).toBe('COMPLETED');
      expect(withFeedback.feedback?.rating).toBe(4);
      expect(withFeedback.feedback?.recommendation).toBe('YES');
    });

    it('should cancel interview', async () => {
      const interview = await service.scheduleInterview(
        applicationId,
        InterviewType.ONSITE,
        new Date('2025-02-01T10:00:00Z'),
        90,
        ['hiring-manager'],
      );

      const cancelled = await service.cancelInterview(applicationId, interview.id);
      expect(cancelled.status).toBe('CANCELLED');
    });

    it('should throw for unknown interview', async () => {
      await expect(
        service.submitInterviewFeedback(applicationId, 'unknown-interview', {
          interviewerId: 'test',
          rating: 3,
          strengths: [],
          weaknesses: [],
          recommendation: 'NEUTRAL',
          notes: '',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Assessments', () => {
    let applicationId: string;

    beforeEach(async () => {
      const job = await service.createJobPosting({ title: 'Test' }, 'recruiter-1');
      await service.publishJob(job.id, [ApplicationSource.DIRECT]);

      const candidate = await service.createCandidate({
        email: 'assessment.test@example.com',
        gdprConsent: true,
      });

      const app = await service.applyToJob(job.id, candidate.id, ApplicationSource.DIRECT);
      applicationId = app.id;
    });

    it('should send assessment', async () => {
      const assessment = await service.sendAssessment(
        applicationId,
        'TECHNICAL',
        'JavaScript Coding Challenge',
        100
      );

      expect(assessment.id).toBeDefined();
      expect(assessment.type).toBe('TECHNICAL');
      expect(assessment.status).toBe('PENDING');
    });

    it('should submit assessment result', async () => {
      const assessment = await service.sendAssessment(
        applicationId,
        'COGNITIVE',
        'Logic Test',
        50
      );

      const completed = await service.submitAssessmentResult(
        applicationId,
        assessment.id,
        42,
        { correctAnswers: 42, totalQuestions: 50 }
      );

      expect(completed.status).toBe('COMPLETED');
      expect(completed.score).toBe(42);
      expect(completed.completedAt).toBeDefined();
    });
  });

  describe('Job Offers', () => {
    let applicationId: string;

    beforeEach(async () => {
      const job = await service.createJobPosting({ title: 'Test' }, 'recruiter-1');
      await service.publishJob(job.id, [ApplicationSource.DIRECT]);

      const candidate = await service.createCandidate({
        email: 'offer.test@example.com',
        gdprConsent: true,
      });

      const app = await service.applyToJob(job.id, candidate.id, ApplicationSource.DIRECT);
      applicationId = app.id;
    });

    it('should create job offer', async () => {
      const offer = await service.createOffer(
        applicationId,
        8000,
        'RON',
        '2025-03-01',
        ['Health insurance', 'Remote work'],
        90,
        'CIM nedeterminat',
        7
      );

      expect(offer.id).toBeDefined();
      expect(offer.salary).toBe(8000);
      expect(offer.status).toBe('DRAFT');
    });

    it('should send offer', async () => {
      await service.createOffer(applicationId, 8000, 'RON', '2025-03-01', [], 90, 'CIM');
      const sent = await service.sendOffer(applicationId);

      expect(sent.status).toBe('SENT');
      expect(sent.sentAt).toBeDefined();
    });

    it('should not send already sent offer', async () => {
      await service.createOffer(applicationId, 8000, 'RON', '2025-03-01', [], 90, 'CIM');
      await service.sendOffer(applicationId);

      await expect(service.sendOffer(applicationId)).rejects.toThrow(BadRequestException);
    });

    it('should accept offer', async () => {
      await service.createOffer(applicationId, 8000, 'RON', '2025-03-01', [], 90, 'CIM');
      await service.sendOffer(applicationId);
      const accepted = await service.respondToOffer(applicationId, true);

      expect(accepted.status).toBe('ACCEPTED');

      const app = await service.getApplication(applicationId);
      expect(app.status).toBe(CandidateStatus.HIRED);
    });

    it('should reject offer', async () => {
      await service.createOffer(applicationId, 8000, 'RON', '2025-03-01', [], 90, 'CIM');
      await service.sendOffer(applicationId);
      const rejected = await service.respondToOffer(applicationId, false);

      expect(rejected.status).toBe('REJECTED');

      const app = await service.getApplication(applicationId);
      expect(app.status).toBe(CandidateStatus.REJECTED);
    });

    it('should not allow duplicate offers', async () => {
      await service.createOffer(applicationId, 8000, 'RON', '2025-03-01', [], 90, 'CIM');

      await expect(
        service.createOffer(applicationId, 9000, 'RON', '2025-03-01', [], 90, 'CIM')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('AI Features - CV Parsing', () => {
    it('should parse CV text and extract information', async () => {
      const cvText = `
        Ion Popescu
        ion.popescu@example.com
        +40721234567

        Summary: 5 years of experience in software development

        Skills: JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker

        Experience:
        Senior Developer at TechCorp (2020-Present)
        - Built React applications
        - Led team of 5 developers
      `;

      const result = await service.parseCV(cvText);

      expect(result.success).toBe(true);
      expect(result.candidate.email).toBe('ion.popescu@example.com');
      expect(result.candidate.firstName).toBe('Ion');
      expect(result.candidate.skills?.length).toBeGreaterThan(0);
      expect(result.candidate.yearsOfExperience).toBe(5);
    });

    it('should return warnings for incomplete CV', async () => {
      const cvText = `
        Just some random text without contact info
        I know Python and Java
      `;

      const result = await service.parseCV(cvText);

      expect(result.success).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('AI Features - Match Scoring', () => {
    it('should calculate match score between candidate and job', async () => {
      const job = await service.createJobPosting({
        title: 'React Developer',
        skills: [
          { name: 'React', level: 'REQUIRED' },
          { name: 'TypeScript', level: 'REQUIRED' },
          { name: 'Node.js', level: 'PREFERRED' },
        ],
        experienceLevel: ExperienceLevel.MID,
      }, 'recruiter-1');

      const candidate = await service.createCandidate({
        email: 'match.test@example.com',
        yearsOfExperience: 4,
        skills: [
          { name: 'React', level: 'ADVANCED', yearsOfExperience: 3, verified: false },
          { name: 'TypeScript', level: 'ADVANCED', yearsOfExperience: 2, verified: false },
          { name: 'JavaScript', level: 'EXPERT', yearsOfExperience: 5, verified: false },
        ],
        gdprConsent: true,
      });

      const result = service.calculateMatchScore(candidate, job);

      expect(result.overallScore).toBeGreaterThan(50);
      expect(result.breakdown.skills).toBeGreaterThan(0);
      expect(result.breakdown.experience).toBeGreaterThan(0);
      expect(result.strengths.length).toBeGreaterThan(0);
      expect(result.recommendation).toBeDefined();
    });

    it('should give lower score for missing required skills', async () => {
      const job = await service.createJobPosting({
        title: 'Java Developer',
        skills: [
          { name: 'Java', level: 'REQUIRED' },
          { name: 'Spring', level: 'REQUIRED' },
        ],
        experienceLevel: ExperienceLevel.SENIOR,
      }, 'recruiter-1');

      const candidate = await service.createCandidate({
        email: 'mismatch@example.com',
        yearsOfExperience: 2,
        skills: [
          { name: 'Python', level: 'ADVANCED', yearsOfExperience: 2, verified: false },
        ],
        gdprConsent: true,
      });

      const result = service.calculateMatchScore(candidate, job);

      expect(result.overallScore).toBeLessThan(50);
      expect(result.gaps.length).toBeGreaterThan(0);
    });
  });

  describe('AI Features - Bias Detection', () => {
    it('should detect gender bias', async () => {
      const text = 'We are looking for a young, energetic chairman to join his team.';
      const result = await service.detectBias(text);

      expect(result.hasBias).toBe(true);
      expect(result.issues.some(i => i.category === BiasCategory.GENDER)).toBe(true);
      expect(result.issues.some(i => i.category === BiasCategory.AGE)).toBe(true);
    });

    it('should detect age bias', async () => {
      const text = 'Looking for a recent graduate or digital native.';
      const result = await service.detectBias(text);

      expect(result.hasBias).toBe(true);
      expect(result.issues.some(i => i.category === BiasCategory.AGE)).toBe(true);
    });

    it('should detect Romanian language bias', async () => {
      const text = 'Căutăm un bărbat tânăr pentru poziția de vânzător.';
      const result = await service.detectBias(text);

      expect(result.hasBias).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should pass for neutral job description', async () => {
      const text = 'We are looking for a software developer with 3+ years of experience in JavaScript.';
      const result = await service.detectBias(text);

      expect(result.overallScore).toBe(0);
      expect(result.issues.length).toBe(0);
    });

    it('should provide suggestions for fixing bias', async () => {
      const text = 'Chairman of the board should be an aggressive leader.';
      const result = await service.detectBias(text);

      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Pipeline Stats', () => {
    it('should calculate pipeline statistics', async () => {
      const job = await service.createJobPosting({ title: 'Test' }, 'recruiter-1');
      await service.publishJob(job.id, [ApplicationSource.DIRECT]);

      // Create multiple applications
      for (let i = 0; i < 5; i++) {
        const candidate = await service.createCandidate({
          email: `pipeline-${i}@example.com`,
          gdprConsent: true,
        });
        const app = await service.applyToJob(job.id, candidate.id, ApplicationSource.DIRECT);

        if (i < 3) {
          await service.updateApplicationStatus(app.id, CandidateStatus.SCREENING);
        }
        if (i < 2) {
          await service.updateApplicationStatus(app.id, CandidateStatus.INTERVIEW);
        }
      }

      const stats = await service.getPipelineStats(job.id);

      expect(stats.total).toBe(5);
      expect(stats.byStatus[CandidateStatus.NEW]).toBe(2);
      expect(stats.sourceBreakdown[ApplicationSource.DIRECT]).toBe(5);
    });
  });

  describe('Top Candidates', () => {
    it('should return top candidates sorted by match score', async () => {
      const job = await service.createJobPosting({
        title: 'Developer',
        skills: [{ name: 'React', level: 'REQUIRED' }],
      }, 'recruiter-1');
      await service.publishJob(job.id, [ApplicationSource.DIRECT]);

      // Create candidates with different skill levels
      const strongCandidate = await service.createCandidate({
        email: 'strong@example.com',
        skills: [{ name: 'React', level: 'EXPERT', yearsOfExperience: 5, verified: false }],
        yearsOfExperience: 5,
        gdprConsent: true,
      });

      const weakCandidate = await service.createCandidate({
        email: 'weak@example.com',
        skills: [{ name: 'Vue', level: 'BEGINNER', yearsOfExperience: 1, verified: false }],
        yearsOfExperience: 1,
        gdprConsent: true,
      });

      await service.applyToJob(job.id, weakCandidate.id, ApplicationSource.DIRECT);
      await service.applyToJob(job.id, strongCandidate.id, ApplicationSource.DIRECT);

      const top = await service.getTopCandidatesForJob(job.id, 2);

      expect(top.length).toBe(2);
      expect(top[0].overallScore).toBeGreaterThanOrEqual(top[1].overallScore);
    });
  });

  describe('Similar Candidates', () => {
    it('should find similar candidates based on skills', async () => {
      // Create first candidate
      const candidate1 = await service.createCandidate({
        email: 'primary@example.com',
        firstName: 'Primary',
        skills: [
          { name: 'React', level: 'ADVANCED', yearsOfExperience: 3, verified: false },
          { name: 'TypeScript', level: 'ADVANCED', yearsOfExperience: 2, verified: false },
        ],
        yearsOfExperience: 4,
        gdprConsent: true,
      });

      // Create a similar candidate (shares React/TypeScript)
      const candidate2 = await service.createCandidate({
        email: 'similar@example.com',
        firstName: 'Similar',
        skills: [
          { name: 'React', level: 'INTERMEDIATE', yearsOfExperience: 2, verified: false },
        ],
        yearsOfExperience: 3,
        gdprConsent: true,
      });

      // Create a different candidate (different skills)
      const candidate3 = await service.createCandidate({
        email: 'different@example.com',
        firstName: 'Different',
        skills: [
          { name: 'Java', level: 'EXPERT', yearsOfExperience: 5, verified: false },
        ],
        yearsOfExperience: 6,
        gdprConsent: true,
      });

      // Verify candidates were created
      const allCandidates = await service.listCandidates();
      expect(allCandidates.length).toBe(3);

      const similar = await service.getSimilarCandidates(candidate1.id, 5);

      // Should return 2 other candidates (excluding self)
      expect(similar.length).toBe(2);
      // The first candidate should have higher similarity (React skills)
      expect(similar[0].email).toBe('similar@example.com');
    });
  });

  describe('Recruitment Metrics', () => {
    it('should calculate recruitment metrics for period', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const metrics = await service.getRecruitmentMetrics(startDate, endDate);

      expect(metrics.period).toBeDefined();
      expect(metrics.totalJobs).toBeGreaterThanOrEqual(0);
      expect(metrics.sourcingEfficiency).toBeDefined();
    });
  });
});
