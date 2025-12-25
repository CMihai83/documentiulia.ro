import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectBiddingService, BidStatus, ProjectBidType } from './project-bidding.service';

describe('ProjectBiddingService', () => {
  let service: ProjectBiddingService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectBiddingService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<ProjectBiddingService>(ProjectBiddingService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('Bidding Rounds', () => {
    it('should create a bidding round', () => {
      const round = service.createBiddingRound({
        projectId: 'project-1',
        roundNumber: 1,
        openAt: new Date(),
        closeAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'OPEN',
        requiresNDA: false,
        allowRevisions: true,
        maxRevisions: 3,
        awardCriteria: 'AI_RECOMMENDED',
        priceWeight: 30,
        qualityWeight: 40,
        experienceWeight: 30,
      });

      expect(round.id).toBeDefined();
      expect(round.projectId).toBe('project-1');
      expect(round.roundNumber).toBe(1);
      expect(round.status).toBe('OPEN');
    });

    it('should get project rounds', () => {
      service.createBiddingRound({
        projectId: 'project-1',
        roundNumber: 1,
        openAt: new Date(),
        closeAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'OPEN',
        requiresNDA: false,
        allowRevisions: true,
        maxRevisions: 3,
        awardCriteria: 'BEST_VALUE',
        priceWeight: 30,
        qualityWeight: 40,
        experienceWeight: 30,
      });

      const rounds = service.getProjectRounds('project-1');
      expect(rounds.length).toBe(1);
    });
  });

  describe('Bid Management', () => {
    let roundId: string;

    beforeEach(() => {
      const round = service.createBiddingRound({
        projectId: 'project-1',
        roundNumber: 1,
        openAt: new Date(Date.now() - 1000),
        closeAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'OPEN',
        requiresNDA: false,
        allowRevisions: true,
        maxRevisions: 3,
        awardCriteria: 'AI_RECOMMENDED',
        priceWeight: 30,
        qualityWeight: 40,
        experienceWeight: 30,
      });
      roundId = round.id;
    });

    it('should submit a bid', () => {
      const bid = service.submitBid({
        projectId: 'project-1',
        freelancerId: 'freelancer-1',
        freelancerName: 'John Doe',
        freelancerRating: 4.5,
        freelancerCompletedProjects: 10,
        bidType: 'FIXED_PRICE',
        proposedAmount: 5000,
        currency: 'EUR',
        estimatedDuration: 30,
        coverLetter: 'I am the best fit...',
        proposedApproach: 'I will use agile...',
        relevantExperience: '5 years in...',
        portfolioItems: ['portfolio-1'],
        attachments: [],
      });

      expect(bid.id).toBeDefined();
      expect(bid.status).toBe('SUBMITTED');
      expect(bid.aiScore).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'bidding.bid.submitted',
        expect.any(Object),
      );
    });

    it('should calculate AI score for bid', () => {
      const bid = service.submitBid({
        projectId: 'project-1',
        freelancerId: 'freelancer-1',
        freelancerName: 'John Doe',
        freelancerRating: 4.8,
        freelancerCompletedProjects: 50,
        bidType: 'FIXED_PRICE',
        proposedAmount: 5000,
        currency: 'EUR',
        estimatedDuration: 30,
        coverLetter: 'Expert proposal...',
        proposedApproach: 'Best practices...',
        relevantExperience: '10 years...',
        portfolioItems: [],
        attachments: [],
      });

      expect(bid.aiScore).toBeGreaterThan(0);
      expect(bid.skillMatchScore).toBeDefined();
      expect(bid.experienceScore).toBeDefined();
      expect(bid.aiRecommendation).toBeDefined();
    });

    it('should shortlist a bid', () => {
      const bid = service.submitBid({
        projectId: 'project-1',
        freelancerId: 'freelancer-1',
        freelancerName: 'Jane Doe',
        freelancerRating: 4.9,
        freelancerCompletedProjects: 25,
        bidType: 'MILESTONE_BASED',
        proposedAmount: 7500,
        currency: 'EUR',
        estimatedDuration: 45,
        coverLetter: 'Great proposal...',
        proposedApproach: 'Structured...',
        relevantExperience: '8 years...',
        portfolioItems: [],
        attachments: [],
      });

      const shortlisted = service.shortlistBid(bid.id, 'Excellent proposal');

      expect(shortlisted.status).toBe('SHORTLISTED');
      expect(shortlisted.shortlistedAt).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'bidding.bid.shortlisted',
        expect.any(Object),
      );
    });

    it('should accept a bid and reject others', () => {
      const bid1 = service.submitBid({
        projectId: 'project-1',
        freelancerId: 'freelancer-1',
        freelancerName: 'Alice',
        freelancerRating: 4.5,
        freelancerCompletedProjects: 10,
        bidType: 'FIXED_PRICE',
        proposedAmount: 5000,
        currency: 'EUR',
        estimatedDuration: 30,
        coverLetter: 'Bid 1',
        proposedApproach: 'Approach 1',
        relevantExperience: 'Exp 1',
        portfolioItems: [],
        attachments: [],
      });

      const bid2 = service.submitBid({
        projectId: 'project-1',
        freelancerId: 'freelancer-2',
        freelancerName: 'Bob',
        freelancerRating: 4.0,
        freelancerCompletedProjects: 5,
        bidType: 'FIXED_PRICE',
        proposedAmount: 4500,
        currency: 'EUR',
        estimatedDuration: 35,
        coverLetter: 'Bid 2',
        proposedApproach: 'Approach 2',
        relevantExperience: 'Exp 2',
        portfolioItems: [],
        attachments: [],
      });

      const accepted = service.acceptBid(bid1.id);

      expect(accepted.status).toBe('ACCEPTED');
      expect(accepted.awardedAt).toBeDefined();

      const rejectedBid = service.getBid(bid2.id);
      expect(rejectedBid?.status).toBe('REJECTED');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'bidding.bid.accepted',
        expect.any(Object),
      );
    });

    it('should withdraw a bid', () => {
      const bid = service.submitBid({
        projectId: 'project-1',
        freelancerId: 'freelancer-1',
        freelancerName: 'Test User',
        freelancerRating: 4.0,
        freelancerCompletedProjects: 5,
        bidType: 'HOURLY',
        proposedAmount: 50,
        hourlyRate: 50,
        estimatedHours: 100,
        currency: 'EUR',
        estimatedDuration: 30,
        coverLetter: 'Test',
        proposedApproach: 'Test',
        relevantExperience: 'Test',
        portfolioItems: [],
        attachments: [],
      });

      const withdrawn = service.withdrawBid(bid.id);

      expect(withdrawn.status).toBe('WITHDRAWN');
    });
  });

  describe('Analytics', () => {
    it('should provide bidding analytics', () => {
      const round = service.createBiddingRound({
        projectId: 'project-2',
        roundNumber: 1,
        openAt: new Date(Date.now() - 1000),
        closeAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'OPEN',
        requiresNDA: false,
        allowRevisions: true,
        maxRevisions: 3,
        awardCriteria: 'LOWEST_PRICE',
        priceWeight: 50,
        qualityWeight: 30,
        experienceWeight: 20,
      });

      // Submit some bids
      for (let i = 1; i <= 3; i++) {
        service.submitBid({
          projectId: 'project-2',
          freelancerId: `freelancer-${i}`,
          freelancerName: `Freelancer ${i}`,
          freelancerRating: 4 + i * 0.1,
          freelancerCompletedProjects: i * 5,
          bidType: 'FIXED_PRICE',
          proposedAmount: 3000 + i * 1000,
          currency: 'EUR',
          estimatedDuration: 20 + i * 5,
          coverLetter: `Cover ${i}`,
          proposedApproach: `Approach ${i}`,
          relevantExperience: `Exp ${i}`,
          portfolioItems: [],
          attachments: [],
        });
      }

      const analytics = service.getBiddingAnalytics('project-2');

      expect(analytics.totalBids).toBe(3);
      expect(analytics.avgBidAmount).toBeGreaterThan(0);
      expect(analytics.minBidAmount).toBeLessThanOrEqual(analytics.maxBidAmount);
      expect(analytics.topBids.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Notifications', () => {
    it('should create and retrieve notifications', () => {
      const round = service.createBiddingRound({
        projectId: 'project-3',
        roundNumber: 1,
        openAt: new Date(Date.now() - 1000),
        closeAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'OPEN',
        requiresNDA: false,
        allowRevisions: true,
        maxRevisions: 3,
        awardCriteria: 'AI_RECOMMENDED',
        priceWeight: 30,
        qualityWeight: 40,
        experienceWeight: 30,
      });

      service.submitBid({
        projectId: 'project-3',
        freelancerId: 'freelancer-1',
        freelancerName: 'Test',
        freelancerRating: 4.5,
        freelancerCompletedProjects: 10,
        bidType: 'FIXED_PRICE',
        proposedAmount: 5000,
        currency: 'EUR',
        estimatedDuration: 30,
        coverLetter: 'Test',
        proposedApproach: 'Test',
        relevantExperience: 'Test',
        portfolioItems: [],
        attachments: [],
      });

      // Client (project-3) should have notification
      const notifications = service.getNotifications('project-3');
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].type).toBe('BID_RECEIVED');
    });
  });
});
