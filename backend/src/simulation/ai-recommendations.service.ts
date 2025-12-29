/**
 * AI Recommendations Service
 * Provides intelligent decision recommendations based on game state and LMS content
 * Links business simulation decisions to relevant courses and lessons
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SimulationState, HealthScores } from './business-logic.engine';
import { ALL_DECISIONS, Decision, DecisionCategory } from './decision-matrix';

export interface AIRecommendation {
  decision: Decision;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  expectedImpact: {
    shortTerm: Record<string, number>;
    longTerm: Record<string, number>;
  };
  relatedCourses: Array<{
    id: string;
    title: string;
    relevance: number;
    keyLessons: string[];
  }>;
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
}

export interface CourseMapping {
  decisionId: string;
  courseId: string;
  relevanceWeight: number;
  keyConcepts: string[];
  difficultyMatch: string[];
}

@Injectable()
export class AIRecommendationsService {
  constructor(private prisma: PrismaService) {}

  // Course mappings for decisions
  private readonly COURSE_MAPPINGS: CourseMapping[] = [
    {
      decisionId: 'SET_PRICES',
      courseId: 'pricing-strategy',
      relevanceWeight: 0.9,
      keyConcepts: ['price elasticity', 'value-based pricing', 'competition analysis'],
      difficultyMatch: ['beginner', 'intermediate'],
    },
    {
      decisionId: 'TAKE_LOAN',
      courseId: 'finantare-startup-romania-2025',
      relevanceWeight: 0.95,
      keyConcepts: ['loan types', 'interest rates', 'collateral requirements'],
      difficultyMatch: ['beginner', 'intermediate'],
    },
    {
      decisionId: 'HIRE_EMPLOYEE',
      courseId: 'primii-angajati',
      relevanceWeight: 0.9,
      keyConcepts: ['employment contracts', 'salary calculation', 'benefits'],
      difficultyMatch: ['beginner', 'intermediate'],
    },
    {
      decisionId: 'PAY_TAXES',
      courseId: 'conformitate-legala-firme-noi',
      relevanceWeight: 0.85,
      keyConcepts: ['tax obligations', 'payment deadlines', 'penalties'],
      difficultyMatch: ['beginner'],
    },
    {
      decisionId: 'IMPLEMENT_ERP',
      courseId: 'digitalizare-afaceri',
      relevanceWeight: 0.8,
      keyConcepts: ['digital transformation', 'process automation', 'data integration'],
      difficultyMatch: ['intermediate', 'advanced'],
    },
    {
      decisionId: 'APPLY_PNRR',
      courseId: 'fonduri-europene',
      relevanceWeight: 0.9,
      keyConcepts: ['EU funding', 'grant applications', 'project management'],
      difficultyMatch: ['intermediate', 'advanced'],
    },
    {
      decisionId: 'GREEN_ENERGY',
      courseId: 'sustainability-business',
      relevanceWeight: 0.85,
      keyConcepts: ['green transition', 'energy efficiency', 'sustainability reporting'],
      difficultyMatch: ['intermediate'],
    },
    // Add more mappings as needed
  ];

  /**
   * Generate AI recommendations for current game state
   */
  async generateRecommendations(
    gameId: string,
    state: SimulationState,
    healthScores: HealthScores
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    // Analyze each decision type
    for (const decision of ALL_DECISIONS) {
      const score = this.scoreDecision(decision, state, healthScores);
      if (score.confidence > 0.3) { // Only recommend decisions with reasonable confidence
        const recommendation = await this.buildRecommendation(decision, state, score);
        recommendations.push(recommendation);
      }
    }

    // Sort by priority and confidence
    return recommendations
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];

        if (aPriority !== bPriority) return bPriority - aPriority;
        return b.confidence - a.confidence;
      })
      .slice(0, 5); // Return top 5 recommendations
  }

  /**
   * Score a decision based on current state
   */
  private scoreDecision(
    decision: Decision,
    state: SimulationState,
    healthScores: HealthScores
  ): { confidence: number; priority: 'high' | 'medium' | 'low'; reasoning: string } {
    let confidence = 0;
    let priority: 'high' | 'medium' | 'low' = 'low';
    const reasons: string[] = [];

    // Financial health analysis
    if (healthScores.financial < 40) {
      if (decision.category === 'FINANCIAL') {
        confidence += 0.3;
        priority = 'high';
        reasons.push('Critical financial health requires immediate action');
      }
    }

    // Compliance analysis
    if (healthScores.compliance < 50) {
      if (decision.category === 'COMPLIANCE') {
        confidence += 0.4;
        priority = 'high';
        reasons.push('Compliance issues need urgent attention');
      }
    }

    // Growth opportunities
    if (healthScores.growth > 70) {
      if (decision.category === 'GROWTH') {
        confidence += 0.2;
        priority = 'medium';
        reasons.push('Strong position enables growth investments');
      }
    }

    // Operational efficiency
    if (state.utilization < 60) {
      if (decision.category === 'OPERATIONS') {
        confidence += 0.25;
        priority = 'medium';
        reasons.push('Low capacity utilization indicates operational opportunities');
      }
    }

    // Marketing needs
    if (state.marketShare < 5) {
      if (decision.category === 'MARKETING') {
        confidence += 0.2;
        priority = 'medium';
        reasons.push('Limited market presence suggests marketing focus needed');
      }
    }

    // HR considerations
    if (state.employees < 3 && state.capacity > 50) {
      if (decision.category === 'HR') {
        confidence += 0.35;
        priority = 'high';
        reasons.push('Capacity constraints with insufficient staff');
      }
    }

    // Cash flow analysis
    if (state.cash < state.expenses * 2) {
      if (['TAKE_LOAN', 'COLLECT_RECEIVABLES', 'PAY_SUPPLIERS'].includes(decision.id)) {
        confidence += 0.3;
        priority = 'high';
        reasons.push('Cash flow constraints require immediate action');
      }
    }

    // Risk assessment
    if (state.auditRisk > 50 || state.penaltiesRisk > 50) {
      if (decision.category === 'COMPLIANCE' || decision.category === 'RISK') {
        confidence += 0.25;
        priority = 'high';
        reasons.push('High risk levels require mitigation');
      }
    }

    // Sustainability and digital transformation
    if (state.reputation > 70) {
      if (['GREEN_ENERGY', 'IMPLEMENT_ERP', 'DATA_ANALYTICS'].includes(decision.id)) {
        confidence += 0.15;
        priority = 'medium';
        reasons.push('Strong reputation enables advanced initiatives');
      }
    }

    // Requirements check
    if (decision.requirements) {
      const meetsRequirements = this.checkRequirements(decision.requirements, state);
      if (!meetsRequirements) {
        confidence *= 0.3; // Reduce confidence if requirements not met
        reasons.push('Decision requirements not fully met');
      }
    }

    // Cooldown consideration (simplified)
    // In real implementation, check last usage from database

    return {
      confidence: Math.min(confidence, 1.0),
      priority,
      reasoning: reasons.join('; '),
    };
  }

  /**
   * Build detailed recommendation
   */
  private async buildRecommendation(
    decision: Decision,
    state: SimulationState,
    score: { confidence: number; priority: 'high' | 'medium' | 'low'; reasoning: string }
  ): Promise<AIRecommendation> {
    const relatedCourses = await this.findRelatedCourses(decision.id);
    const expectedImpact = this.calculateExpectedImpact(decision, state);
    const riskAssessment = this.assessRisks(decision, state);

    return {
      decision,
      confidence: score.confidence,
      priority: score.priority,
      reasoning: score.reasoning,
      expectedImpact,
      relatedCourses,
      riskAssessment,
    };
  }

  /**
   * Find related courses for a decision
   */
  private async findRelatedCourses(decisionId: string): Promise<Array<{
    id: string;
    title: string;
    relevance: number;
    keyLessons: string[];
  }>> {
    const mappings = this.COURSE_MAPPINGS.filter(m => m.decisionId === decisionId);

    const courses = [];
    for (const mapping of mappings) {
      try {
        const course = await this.prisma.course.findUnique({
          where: { id: mapping.courseId },
          select: { id: true, title: true, lessons: { select: { title: true } } },
        });

        if (course) {
          courses.push({
            id: course.id,
            title: course.title,
            relevance: mapping.relevanceWeight,
            keyLessons: course.lessons.slice(0, 3).map(l => l.title),
          });
        }
      } catch (error) {
        // Course might not exist, continue
        console.warn(`Course ${mapping.courseId} not found for decision ${decisionId}`);
      }
    }

    return courses;
  }

  /**
   * Calculate expected impact of decision
   */
  private calculateExpectedImpact(
    decision: Decision,
    state: SimulationState
  ): {
    shortTerm: Record<string, number>;
    longTerm: Record<string, number>;
  } {
    const shortTerm: Record<string, number> = {};
    const longTerm: Record<string, number> = {};

    // Simple impact estimation based on decision type
    switch (decision.category) {
      case 'FINANCIAL':
        shortTerm.cash = decision.immediateImpacts.cash ? -10000 : 0; // Estimate
        longTerm.revenue = 5000;
        break;
      case 'OPERATIONS':
        shortTerm.capacity = 10;
        longTerm.expenses = -2000;
        break;
      case 'HR':
        shortTerm.employees = 1;
        longTerm.capacity = 50;
        break;
      case 'MARKETING':
        shortTerm.reputation = 5;
        longTerm.customerCount = 10;
        break;
      case 'COMPLIANCE':
        shortTerm.complianceScore = 10;
        longTerm.auditRisk = -5;
        break;
      case 'GROWTH':
        shortTerm.equipment = 50000;
        longTerm.capacity = 25;
        break;
      default:
        break;
    }

    return { shortTerm, longTerm };
  }

  /**
   * Assess risks for decision
   */
  private assessRisks(
    decision: Decision,
    state: SimulationState
  ): {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  } {
    const factors: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Analyze decision risks
    if (decision.risks && decision.risks.length > 0) {
      riskLevel = 'medium';
      factors.push('Decision has inherent risks');
    }

    // State-based risk assessment
    if (state.cash < 50000 && decision.immediateImpacts.cash) {
      riskLevel = 'high';
      factors.push('Low cash reserves increase financial risk');
    }

    if (state.complianceScore < 60 && decision.category === 'GROWTH') {
      riskLevel = 'medium';
      factors.push('Compliance issues may complicate growth initiatives');
    }

    if (state.employees > 20 && decision.category === 'HR') {
      riskLevel = 'medium';
      factors.push('Large team may have morale implications');
    }

    return { level: riskLevel, factors };
  }

  /**
   * Check if decision requirements are met
   */
  private checkRequirements(requirements: string[], state: SimulationState): boolean {
    for (const req of requirements) {
      // Simple requirement checking
      if (req.includes('cash >') && state.cash <= 0) return false;
      if (req.includes('employees >') && state.employees <= 1) return false;
      if (req.includes('complianceScore >') && state.complianceScore <= 50) return false;
    }
    return true;
  }

  /**
   * Get learning path recommendations
   */
  async getLearningPath(gameId: string): Promise<Array<{
    courseId: string;
    title: string;
    priority: 'high' | 'medium' | 'low';
    reason: string;
  }>> {
    const game = await this.prisma.simulationGame.findUnique({
      where: { id: gameId },
      select: { currentMonth: true, currentYear: true },
    });

    if (!game) return [];

    // Recommend courses based on game progress
    const monthsPlayed = (game.currentYear - 2025) * 12 + game.currentMonth;

    const learningPath = [];

    if (monthsPlayed < 3) {
      learningPath.push({
        courseId: 'pricing-strategy',
        title: 'Pricing Strategy Fundamentals',
        priority: 'high',
        reason: 'Essential for early business decisions',
      });
    }

    if (monthsPlayed < 6) {
      learningPath.push({
        courseId: 'primii-angajati',
        title: 'First Employees Management',
        priority: 'high',
        reason: 'Critical as business grows',
      });
    }

    return learningPath;
  }
}