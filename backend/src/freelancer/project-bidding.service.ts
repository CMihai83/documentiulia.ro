import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Sprint 21: Project Bidding System for Freelancer Hub MVP
// AI-powered bid matching, escrow integration, and automated award recommendations

// ===== TYPES =====

export type BidStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'EXPIRED';
export type ProjectBidType = 'FIXED_PRICE' | 'HOURLY' | 'MILESTONE_BASED';
export type AwardCriteria = 'LOWEST_PRICE' | 'BEST_VALUE' | 'HIGHEST_RATED' | 'AI_RECOMMENDED';

export interface ProjectBid {
  id: string;
  projectId: string;
  freelancerId: string;
  freelancerName: string;
  freelancerRating: number;
  freelancerCompletedProjects: number;

  // Bid details
  bidType: ProjectBidType;
  proposedAmount: number;
  currency: string;
  hourlyRate?: number;
  estimatedHours?: number;
  estimatedDuration: number; // Days

  // Proposal
  coverLetter: string;
  proposedApproach: string;
  relevantExperience: string;
  portfolioItems: string[];

  // Milestones (for milestone-based bids)
  proposedMilestones?: {
    title: string;
    description: string;
    amount: number;
    durationDays: number;
  }[];

  // Attachments
  attachments: {
    id: string;
    filename: string;
    url: string;
    type: 'PROPOSAL' | 'PORTFOLIO' | 'CERTIFICATE' | 'OTHER';
  }[];

  // Status
  status: BidStatus;
  submittedAt?: Date;
  reviewedAt?: Date;
  shortlistedAt?: Date;
  awardedAt?: Date;
  rejectedAt?: Date;

  // AI Scoring
  aiScore?: number;
  aiRecommendation?: string;
  skillMatchScore?: number;
  priceCompetitivenessScore?: number;
  experienceScore?: number;

  // Client feedback
  clientNotes?: string;
  interviewRequested?: boolean;
  interviewScheduledAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface BiddingRound {
  id: string;
  projectId: string;
  roundNumber: number;

  // Timeline
  openAt: Date;
  closeAt: Date;
  status: 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'AWARDED' | 'CANCELLED';

  // Configuration
  maxBids?: number;
  minBidAmount?: number;
  maxBidAmount?: number;
  requiresNDA: boolean;
  allowRevisions: boolean;
  maxRevisions: number;

  // Award criteria
  awardCriteria: AwardCriteria;
  priceWeight: number; // 0-100
  qualityWeight: number; // 0-100
  experienceWeight: number; // 0-100

  // Results
  totalBids: number;
  shortlistedBids: string[];
  winningBidId?: string;
  awardedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface BidEvaluation {
  bidId: string;
  evaluatorId: string;
  evaluatorRole: 'CLIENT' | 'ADMIN' | 'AI';

  // Scores (1-10)
  technicalScore: number;
  priceScore: number;
  experienceScore: number;
  communicationScore: number;
  overallScore: number;

  // Feedback
  strengths: string[];
  weaknesses: string[];
  recommendation: 'STRONGLY_RECOMMEND' | 'RECOMMEND' | 'NEUTRAL' | 'NOT_RECOMMENDED' | 'REJECT';
  notes?: string;

  // Timestamps
  evaluatedAt: Date;
}

export interface BidNotification {
  id: string;
  type: 'BID_RECEIVED' | 'BID_SHORTLISTED' | 'BID_ACCEPTED' | 'BID_REJECTED' | 'ROUND_OPENING' | 'ROUND_CLOSING' | 'INTERVIEW_REQUEST';
  recipientId: string;
  recipientType: 'CLIENT' | 'FREELANCER';
  bidId?: string;
  projectId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

@Injectable()
export class ProjectBiddingService {
  private readonly logger = new Logger(ProjectBiddingService.name);

  // Storage
  private readonly bids: Map<string, ProjectBid> = new Map();
  private readonly rounds: Map<string, BiddingRound> = new Map();
  private readonly evaluations: Map<string, BidEvaluation[]> = new Map();
  private readonly notifications: Map<string, BidNotification[]> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  // ===== BIDDING ROUNDS =====

  createBiddingRound(data: Omit<BiddingRound, 'id' | 'totalBids' | 'shortlistedBids' | 'createdAt' | 'updatedAt'>): BiddingRound {
    const id = this.generateId();
    const round: BiddingRound = {
      ...data,
      id,
      totalBids: 0,
      shortlistedBids: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rounds.set(id, round);
    this.logger.log(`Created bidding round ${id} for project ${data.projectId}`);

    // Schedule round opening/closing
    this.scheduleRoundEvents(round);

    return round;
  }

  getBiddingRound(roundId: string): BiddingRound | undefined {
    return this.rounds.get(roundId);
  }

  getProjectRounds(projectId: string): BiddingRound[] {
    return Array.from(this.rounds.values())
      .filter(r => r.projectId === projectId)
      .sort((a, b) => a.roundNumber - b.roundNumber);
  }

  updateBiddingRound(roundId: string, updates: Partial<BiddingRound>): BiddingRound {
    const round = this.rounds.get(roundId);
    if (!round) {
      throw new NotFoundException(`Bidding round ${roundId} not found`);
    }

    Object.assign(round, updates, { updatedAt: new Date() });
    return round;
  }

  openBiddingRound(roundId: string): BiddingRound {
    const round = this.rounds.get(roundId);
    if (!round) {
      throw new NotFoundException(`Bidding round ${roundId} not found`);
    }

    round.status = 'OPEN';
    round.updatedAt = new Date();

    // Notify registered freelancers
    this.eventEmitter.emit('bidding.round.opened', {
      roundId,
      projectId: round.projectId,
      closeAt: round.closeAt,
    });

    this.logger.log(`Bidding round ${roundId} opened`);
    return round;
  }

  closeBiddingRound(roundId: string): BiddingRound {
    const round = this.rounds.get(roundId);
    if (!round) {
      throw new NotFoundException(`Bidding round ${roundId} not found`);
    }

    round.status = 'CLOSED';
    round.updatedAt = new Date();

    // Calculate AI scores for all bids
    const bids = this.getRoundBids(roundId);
    for (const bid of bids) {
      this.calculateAIScore(bid);
    }

    // Auto-shortlist top bids based on criteria
    this.autoShortlistBids(round);

    this.eventEmitter.emit('bidding.round.closed', {
      roundId,
      projectId: round.projectId,
      totalBids: round.totalBids,
    });

    this.logger.log(`Bidding round ${roundId} closed with ${round.totalBids} bids`);
    return round;
  }

  // ===== BID MANAGEMENT =====

  submitBid(data: Omit<ProjectBid, 'id' | 'status' | 'submittedAt' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'aiScore'>): ProjectBid {
    const round = this.getActiveRound(data.projectId);
    if (!round) {
      throw new BadRequestException('No active bidding round for this project');
    }

    if (round.maxBids && round.totalBids >= round.maxBids) {
      throw new BadRequestException('Maximum number of bids reached for this round');
    }

    // Check existing bid from same freelancer
    const existingBid = this.getFreelancerBidForProject(data.freelancerId, data.projectId);
    if (existingBid && existingBid.status !== 'WITHDRAWN') {
      throw new BadRequestException('You have already submitted a bid for this project');
    }

    // Validate bid amount
    if (round.minBidAmount && data.proposedAmount < round.minBidAmount) {
      throw new BadRequestException(`Bid amount must be at least ${round.minBidAmount}`);
    }
    if (round.maxBidAmount && data.proposedAmount > round.maxBidAmount) {
      throw new BadRequestException(`Bid amount must not exceed ${round.maxBidAmount}`);
    }

    const id = this.generateId();
    const bid: ProjectBid = {
      ...data,
      id,
      status: 'SUBMITTED',
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: round.closeAt,
    };

    // Calculate initial AI score
    this.calculateAIScore(bid);

    this.bids.set(id, bid);
    round.totalBids++;

    // Create notification for client
    this.createNotification({
      type: 'BID_RECEIVED',
      recipientId: data.projectId, // Would be client ID in real implementation
      recipientType: 'CLIENT',
      bidId: id,
      projectId: data.projectId,
      message: `New bid received from ${data.freelancerName} for ${data.proposedAmount} ${data.currency}`,
    });

    this.eventEmitter.emit('bidding.bid.submitted', {
      bidId: id,
      projectId: data.projectId,
      freelancerId: data.freelancerId,
      amount: data.proposedAmount,
    });

    this.logger.log(`Bid ${id} submitted by ${data.freelancerId} for project ${data.projectId}`);
    return bid;
  }

  getBid(bidId: string): ProjectBid | undefined {
    return this.bids.get(bidId);
  }

  getProjectBids(projectId: string): ProjectBid[] {
    return Array.from(this.bids.values())
      .filter(b => b.projectId === projectId)
      .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
  }

  getRoundBids(roundId: string): ProjectBid[] {
    const round = this.rounds.get(roundId);
    if (!round) return [];

    return Array.from(this.bids.values())
      .filter(b => b.projectId === round.projectId && b.submittedAt && b.submittedAt >= round.openAt)
      .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
  }

  getFreelancerBids(freelancerId: string): ProjectBid[] {
    return Array.from(this.bids.values())
      .filter(b => b.freelancerId === freelancerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getFreelancerBidForProject(freelancerId: string, projectId: string): ProjectBid | undefined {
    return Array.from(this.bids.values())
      .find(b => b.freelancerId === freelancerId && b.projectId === projectId);
  }

  updateBid(bidId: string, updates: Partial<ProjectBid>): ProjectBid {
    const bid = this.bids.get(bidId);
    if (!bid) {
      throw new NotFoundException(`Bid ${bidId} not found`);
    }

    if (!['DRAFT', 'SUBMITTED'].includes(bid.status)) {
      throw new BadRequestException('Cannot update bid in current status');
    }

    const round = this.getActiveRound(bid.projectId);
    if (!round || !round.allowRevisions) {
      throw new BadRequestException('Bid revisions are not allowed');
    }

    Object.assign(bid, updates, { updatedAt: new Date() });

    // Recalculate AI score
    this.calculateAIScore(bid);

    return bid;
  }

  withdrawBid(bidId: string): ProjectBid {
    const bid = this.bids.get(bidId);
    if (!bid) {
      throw new NotFoundException(`Bid ${bidId} not found`);
    }

    if (!['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'].includes(bid.status)) {
      throw new BadRequestException('Cannot withdraw bid in current status');
    }

    bid.status = 'WITHDRAWN';
    bid.updatedAt = new Date();

    const round = this.getActiveRound(bid.projectId);
    if (round) {
      round.totalBids--;
    }

    this.eventEmitter.emit('bidding.bid.withdrawn', {
      bidId,
      projectId: bid.projectId,
      freelancerId: bid.freelancerId,
    });

    return bid;
  }

  shortlistBid(bidId: string, notes?: string): ProjectBid {
    const bid = this.bids.get(bidId);
    if (!bid) {
      throw new NotFoundException(`Bid ${bidId} not found`);
    }

    bid.status = 'SHORTLISTED';
    bid.shortlistedAt = new Date();
    bid.clientNotes = notes;
    bid.updatedAt = new Date();

    // Add to round shortlist
    const rounds = this.getProjectRounds(bid.projectId);
    const activeRound = rounds.find(r => r.status === 'CLOSED' || r.status === 'OPEN');
    if (activeRound) {
      activeRound.shortlistedBids.push(bidId);
    }

    // Notify freelancer
    this.createNotification({
      type: 'BID_SHORTLISTED',
      recipientId: bid.freelancerId,
      recipientType: 'FREELANCER',
      bidId,
      projectId: bid.projectId,
      message: 'Congratulations! Your bid has been shortlisted.',
    });

    this.eventEmitter.emit('bidding.bid.shortlisted', {
      bidId,
      projectId: bid.projectId,
      freelancerId: bid.freelancerId,
    });

    return bid;
  }

  acceptBid(bidId: string): ProjectBid {
    const bid = this.bids.get(bidId);
    if (!bid) {
      throw new NotFoundException(`Bid ${bidId} not found`);
    }

    bid.status = 'ACCEPTED';
    bid.awardedAt = new Date();
    bid.updatedAt = new Date();

    // Update round
    const rounds = this.getProjectRounds(bid.projectId);
    const activeRound = rounds.find(r => ['OPEN', 'CLOSED'].includes(r.status));
    if (activeRound) {
      activeRound.winningBidId = bidId;
      activeRound.awardedAt = new Date();
      activeRound.status = 'AWARDED';
    }

    // Reject other bids
    const otherBids = this.getProjectBids(bid.projectId)
      .filter(b => b.id !== bidId && !['REJECTED', 'WITHDRAWN', 'EXPIRED'].includes(b.status));

    for (const otherBid of otherBids) {
      otherBid.status = 'REJECTED';
      otherBid.rejectedAt = new Date();

      this.createNotification({
        type: 'BID_REJECTED',
        recipientId: otherBid.freelancerId,
        recipientType: 'FREELANCER',
        bidId: otherBid.id,
        projectId: otherBid.projectId,
        message: 'Unfortunately, your bid was not selected for this project.',
      });
    }

    // Notify winning freelancer
    this.createNotification({
      type: 'BID_ACCEPTED',
      recipientId: bid.freelancerId,
      recipientType: 'FREELANCER',
      bidId,
      projectId: bid.projectId,
      message: 'Congratulations! Your bid has been accepted!',
    });

    this.eventEmitter.emit('bidding.bid.accepted', {
      bidId,
      projectId: bid.projectId,
      freelancerId: bid.freelancerId,
      amount: bid.proposedAmount,
    });

    this.logger.log(`Bid ${bidId} accepted for project ${bid.projectId}`);
    return bid;
  }

  rejectBid(bidId: string, reason?: string): ProjectBid {
    const bid = this.bids.get(bidId);
    if (!bid) {
      throw new NotFoundException(`Bid ${bidId} not found`);
    }

    bid.status = 'REJECTED';
    bid.rejectedAt = new Date();
    bid.clientNotes = reason;
    bid.updatedAt = new Date();

    this.createNotification({
      type: 'BID_REJECTED',
      recipientId: bid.freelancerId,
      recipientType: 'FREELANCER',
      bidId,
      projectId: bid.projectId,
      message: reason || 'Your bid was not selected for this project.',
    });

    return bid;
  }

  requestInterview(bidId: string, scheduledAt?: Date): ProjectBid {
    const bid = this.bids.get(bidId);
    if (!bid) {
      throw new NotFoundException(`Bid ${bidId} not found`);
    }

    bid.interviewRequested = true;
    bid.interviewScheduledAt = scheduledAt;
    bid.updatedAt = new Date();

    this.createNotification({
      type: 'INTERVIEW_REQUEST',
      recipientId: bid.freelancerId,
      recipientType: 'FREELANCER',
      bidId,
      projectId: bid.projectId,
      message: `Interview requested${scheduledAt ? ` for ${scheduledAt.toISOString()}` : ''}`,
    });

    return bid;
  }

  // ===== BID EVALUATION =====

  evaluateBid(data: Omit<BidEvaluation, 'evaluatedAt'>): BidEvaluation {
    const bid = this.bids.get(data.bidId);
    if (!bid) {
      throw new NotFoundException(`Bid ${data.bidId} not found`);
    }

    const evaluation: BidEvaluation = {
      ...data,
      evaluatedAt: new Date(),
    };

    const bidEvaluations = this.evaluations.get(data.bidId) || [];
    bidEvaluations.push(evaluation);
    this.evaluations.set(data.bidId, bidEvaluations);

    // Update bid status if needed
    if (bid.status === 'SUBMITTED') {
      bid.status = 'UNDER_REVIEW';
      bid.reviewedAt = new Date();
    }

    return evaluation;
  }

  getBidEvaluations(bidId: string): BidEvaluation[] {
    return this.evaluations.get(bidId) || [];
  }

  // ===== AI SCORING =====

  private calculateAIScore(bid: ProjectBid): void {
    // Skill match score (based on profile match - simulated)
    const skillMatchScore = Math.min(100, 60 + Math.random() * 40);

    // Price competitiveness (compare to average - simulated)
    const projectBids = this.getProjectBids(bid.projectId);
    const avgAmount = projectBids.length > 0
      ? projectBids.reduce((sum, b) => sum + b.proposedAmount, 0) / projectBids.length
      : bid.proposedAmount;
    const priceDeviation = Math.abs(bid.proposedAmount - avgAmount) / avgAmount;
    const priceScore = Math.max(0, 100 - priceDeviation * 100);

    // Experience score (based on completed projects and rating)
    const experienceScore = Math.min(100,
      (bid.freelancerRating * 10) +
      (bid.freelancerCompletedProjects * 2)
    );

    // Overall AI score (weighted average)
    const aiScore = (skillMatchScore * 0.4) + (priceScore * 0.3) + (experienceScore * 0.3);

    bid.skillMatchScore = Math.round(skillMatchScore);
    bid.priceCompetitivenessScore = Math.round(priceScore);
    bid.experienceScore = Math.round(experienceScore);
    bid.aiScore = Math.round(aiScore);

    // Generate recommendation
    if (aiScore >= 85) {
      bid.aiRecommendation = 'STRONGLY_RECOMMEND';
    } else if (aiScore >= 70) {
      bid.aiRecommendation = 'RECOMMEND';
    } else if (aiScore >= 50) {
      bid.aiRecommendation = 'CONSIDER';
    } else {
      bid.aiRecommendation = 'REVIEW_CAREFULLY';
    }
  }

  private autoShortlistBids(round: BiddingRound): void {
    const bids = this.getRoundBids(round.id);
    if (bids.length === 0) return;

    // Sort by award criteria
    let sortedBids: ProjectBid[];
    switch (round.awardCriteria) {
      case 'LOWEST_PRICE':
        sortedBids = [...bids].sort((a, b) => a.proposedAmount - b.proposedAmount);
        break;
      case 'HIGHEST_RATED':
        sortedBids = [...bids].sort((a, b) => b.freelancerRating - a.freelancerRating);
        break;
      case 'AI_RECOMMENDED':
        sortedBids = [...bids].sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
        break;
      case 'BEST_VALUE':
      default:
        // Weighted score based on round configuration
        sortedBids = [...bids].sort((a, b) => {
          const scoreA = this.calculateWeightedScore(a, round);
          const scoreB = this.calculateWeightedScore(b, round);
          return scoreB - scoreA;
        });
    }

    // Auto-shortlist top 3 (or fewer if less bids)
    const shortlistCount = Math.min(3, sortedBids.length);
    for (let i = 0; i < shortlistCount; i++) {
      this.shortlistBid(sortedBids[i].id, 'Auto-shortlisted based on evaluation criteria');
    }
  }

  private calculateWeightedScore(bid: ProjectBid, round: BiddingRound): number {
    const normalizedPrice = 100 - ((bid.proposedAmount / 100000) * 100); // Normalize price to 0-100
    return (
      (normalizedPrice * (round.priceWeight / 100)) +
      ((bid.aiScore || 50) * (round.qualityWeight / 100)) +
      ((bid.experienceScore || 50) * (round.experienceWeight / 100))
    );
  }

  // ===== NOTIFICATIONS =====

  private createNotification(data: Omit<BidNotification, 'id' | 'read' | 'createdAt'>): BidNotification {
    const notification: BidNotification = {
      ...data,
      id: this.generateId(),
      read: false,
      createdAt: new Date(),
    };

    const userNotifications = this.notifications.get(data.recipientId) || [];
    userNotifications.push(notification);
    this.notifications.set(data.recipientId, userNotifications);

    return notification;
  }

  getNotifications(userId: string, unreadOnly: boolean = false): BidNotification[] {
    const notifications = this.notifications.get(userId) || [];
    return unreadOnly ? notifications.filter(n => !n.read) : notifications;
  }

  markNotificationRead(userId: string, notificationId: string): boolean {
    const notifications = this.notifications.get(userId) || [];
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }

  // ===== ANALYTICS =====

  getBiddingAnalytics(projectId: string): {
    totalBids: number;
    avgBidAmount: number;
    minBidAmount: number;
    maxBidAmount: number;
    avgAIScore: number;
    bidsByStatus: Record<BidStatus, number>;
    topBids: ProjectBid[];
    timeline: { date: string; count: number }[];
  } {
    const bids = this.getProjectBids(projectId);
    const amounts = bids.map(b => b.proposedAmount);

    const bidsByStatus: Record<BidStatus, number> = {
      DRAFT: 0, SUBMITTED: 0, UNDER_REVIEW: 0, SHORTLISTED: 0,
      ACCEPTED: 0, REJECTED: 0, WITHDRAWN: 0, EXPIRED: 0,
    };

    for (const bid of bids) {
      bidsByStatus[bid.status]++;
    }

    // Timeline (bids per day)
    const timelineMap = new Map<string, number>();
    for (const bid of bids) {
      if (bid.submittedAt) {
        const date = bid.submittedAt.toISOString().split('T')[0];
        timelineMap.set(date, (timelineMap.get(date) || 0) + 1);
      }
    }

    return {
      totalBids: bids.length,
      avgBidAmount: amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0,
      minBidAmount: amounts.length > 0 ? Math.min(...amounts) : 0,
      maxBidAmount: amounts.length > 0 ? Math.max(...amounts) : 0,
      avgAIScore: bids.length > 0 ? bids.reduce((sum, b) => sum + (b.aiScore || 0), 0) / bids.length : 0,
      bidsByStatus,
      topBids: bids.slice(0, 5),
      timeline: Array.from(timelineMap.entries()).map(([date, count]) => ({ date, count })),
    };
  }

  // ===== HELPERS =====

  private getActiveRound(projectId: string): BiddingRound | undefined {
    return Array.from(this.rounds.values())
      .find(r => r.projectId === projectId && r.status === 'OPEN');
  }

  private scheduleRoundEvents(round: BiddingRound): void {
    // In production, use a proper job scheduler (Bull, Agenda, etc.)
    const now = new Date();

    if (round.openAt > now) {
      setTimeout(() => {
        if (round.status === 'SCHEDULED') {
          this.openBiddingRound(round.id);
        }
      }, round.openAt.getTime() - now.getTime());
    }

    if (round.closeAt > now) {
      setTimeout(() => {
        if (round.status === 'OPEN') {
          this.closeBiddingRound(round.id);
        }
      }, round.closeAt.getTime() - now.getTime());
    }
  }

  private generateId(): string {
    return `bid-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
