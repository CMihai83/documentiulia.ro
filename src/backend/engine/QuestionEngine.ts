/**
 * Question Engine
 *
 * The intelligence that determines what to ask, when, and why
 * Works without AI, but has clear integration hooks for AI enhancement
 */

import {
    BusinessContext,
    BusinessStage,
    Trend,
    RiskLevel
} from '../models/BusinessContext';

export enum QuestionPriority {
    CRITICAL = 'critical',      // Must ask now
    HIGH = 'high',             // Should ask soon
    MEDIUM = 'medium',         // Ask when appropriate
    LOW = 'low'                // Nice to know
}

export enum QuestionCategory {
    INFORMATION_GAP = 'information_gap',
    DECISION_POINT = 'decision_point',
    OPPORTUNITY = 'opportunity',
    RISK_WARNING = 'risk_warning',
    OPTIMIZATION = 'optimization',
    LEARNING = 'learning'
}

export interface Question {
    id: string;
    category: QuestionCategory;
    priority: QuestionPriority;
    text: string;
    context: string;                    // Why we're asking
    suggestedAnswers?: string[];        // For multiple choice
    expectedAnswerType: 'text' | 'number' | 'boolean' | 'choice' | 'date';
    relatedMetrics?: string[];
    followUpQuestions?: string[];       // What to ask based on answer
    timeframe: 'immediate' | 'this_week' | 'this_month';
    expiresAt?: Date;                   // Some questions become irrelevant
}

export interface AnalyzedState {
    healthScore: number;                // 0-100
    criticalIssues: string[];
    opportunities: string[];
    trends: {
        revenue: Trend;
        cashFlow: Trend;
        growth: Trend;
    };
    predictedRunway: number;            // months
    needsAttention: string[];
}

/**
 * Context Analyzer
 * Analyzes business state to inform question selection
 */
export class ContextAnalyzer {
    analyze(context: BusinessContext): AnalyzedState {
        const healthScore = this.calculateHealthScore(context);
        const criticalIssues = this.identifyCriticalIssues(context);
        const opportunities = this.identifyOpportunities(context);

        return {
            healthScore,
            criticalIssues,
            opportunities,
            trends: {
                revenue: context.financial.cashFlowTrend,
                cashFlow: context.financial.cashFlowTrend,
                growth: this.determineGrowthTrend(context)
            },
            predictedRunway: this.predictRunway(context),
            needsAttention: this.identifyAttentionAreas(context)
        };
    }

    private calculateHealthScore(context: BusinessContext): number {
        let score = 100;

        // Cash runway concerns
        if (context.financial.runway < 3) score -= 40;
        else if (context.financial.runway < 6) score -= 20;

        // Profitability
        if (context.financial.profitMargin < 0) score -= 20;
        else if (context.financial.profitMargin < 10) score -= 10;

        // Growth
        if (context.financial.revenueGrowthRate < 0) score -= 15;

        // Customer churn
        if (context.operations.customerChurnRate > 20) score -= 15;

        return Math.max(0, score);
    }

    private identifyCriticalIssues(context: BusinessContext): string[] {
        const issues: string[] = [];

        if (context.financial.runway < 3) {
            issues.push('critical_cash_runway');
        }

        if (context.financial.cashFlowTrend === Trend.DOWN &&
            context.financial.profitMargin < 0) {
            issues.push('negative_cash_flow_trend');
        }

        if (context.operations.customerChurnRate > 30) {
            issues.push('high_customer_churn');
        }

        return issues;
    }

    private identifyOpportunities(context: BusinessContext): string[] {
        const opportunities: string[] = [];

        if (context.financial.revenueGrowthRate > 20 &&
            context.financial.runway > 12) {
            opportunities.push('hiring_opportunity');
        }

        if (context.financial.profitMargin > 30) {
            opportunities.push('expansion_opportunity');
        }

        if (context.operations.teamUtilization < 60) {
            opportunities.push('capacity_available');
        }

        return opportunities;
    }

    private determineGrowthTrend(context: BusinessContext): Trend {
        if (context.financial.revenueGrowthRate > 10) return Trend.UP;
        if (context.financial.revenueGrowthRate < -10) return Trend.DOWN;
        return Trend.STABLE;
    }

    private predictRunway(context: BusinessContext): number {
        // Simple linear projection
        // Real implementation would use more sophisticated forecasting
        const avgMonthlyBurn = context.financial.monthlyExpenses - context.financial.monthlyRevenue;

        if (avgMonthlyBurn <= 0) return Infinity; // Profitable

        return context.financial.currentCashPosition / avgMonthlyBurn;
    }

    private identifyAttentionAreas(context: BusinessContext): string[] {
        const areas: string[] = [];

        if (context.financial.runway < 6) areas.push('cash_management');
        if (context.operations.customerChurnRate > 15) areas.push('customer_retention');
        if (context.operations.teamUtilization > 90) areas.push('team_capacity');
        if (context.financial.revenueGrowthRate < 5) areas.push('revenue_growth');

        return areas;
    }
}

/**
 * Question Engine
 * Determines what question to ask next based on context
 */
export class QuestionEngine {
    private contextAnalyzer: ContextAnalyzer;
    private aiEnhancer?: AIQuestionSelector; // Optional AI enhancement

    constructor(aiEnhancer?: AIQuestionSelector) {
        this.contextAnalyzer = new ContextAnalyzer();
        this.aiEnhancer = aiEnhancer;
    }

    /**
     * Get the next question to ask
     * Returns null if no questions are needed right now
     */
    async getNextQuestion(context: BusinessContext): Promise<Question | null> {
        // 1. Analyze current business state
        const state = this.contextAnalyzer.analyze(context);

        // 2. Check for critical information gaps
        const gaps = this.identifyInformationGaps(context);
        if (gaps.critical.length > 0) {
            return this.prioritizeQuestion(gaps.critical);
        }

        // 3. Check for decision points requiring input
        const decisions = this.detectDecisionPoints(context, state);
        if (decisions.length > 0) {
            return this.formulateDecisionQuestion(decisions[0]);
        }

        // 4. Look for optimization opportunities
        const opportunities = this.scanForOpportunities(context, state);
        if (opportunities.length > 0) {
            return this.formulateOpportunityQuestion(opportunities[0]);
        }

        // 5. AI Enhancement (when available)
        if (this.aiEnhancer) {
            return await this.aiEnhancer.suggestQuestion(context, state);
        }

        // 6. Learning questions (lowest priority)
        return this.generateLearningQuestion(context);
    }

    /**
     * Identify missing critical information
     */
    identifyInformationGaps(context: BusinessContext): {
        critical: Question[];
        important: Question[];
        optional: Question[];
    } {
        const critical: Question[] = [];
        const important: Question[] = [];
        const optional: Question[] = [];

        // Check critical gaps
        if (context.metadata.knownGaps.includes('monthly_revenue')) {
            critical.push({
                id: 'gap_revenue',
                category: QuestionCategory.INFORMATION_GAP,
                priority: QuestionPriority.CRITICAL,
                text: 'What is your average monthly revenue?',
                context: 'We need this to calculate your cash runway and help with financial planning.',
                expectedAnswerType: 'number',
                timeframe: 'immediate'
            });
        }

        if (context.metadata.knownGaps.includes('primary_goal')) {
            important.push({
                id: 'gap_goal',
                category: QuestionCategory.INFORMATION_GAP,
                priority: QuestionPriority.HIGH,
                text: 'What is your primary business goal for the next 12 months?',
                context: 'Knowing your goal helps us provide relevant insights and guidance.',
                suggestedAnswers: [
                    'Increase revenue',
                    'Improve profitability',
                    'Grow customer base',
                    'Expand team',
                    'Launch new product'
                ],
                expectedAnswerType: 'choice',
                timeframe: 'this_week'
            });
        }

        return { critical, important, optional };
    }

    /**
     * Detect decision points where user needs guidance
     */
    detectDecisionPoints(context: BusinessContext, state: AnalyzedState): any[] {
        const decisions: any[] = [];

        // Cash runway getting low
        if (context.financial.runway < 6 && context.financial.runway > 0) {
            decisions.push({
                type: 'cash_runway_concern',
                severity: context.financial.runway < 3 ? 'critical' : 'high',
                data: {
                    currentRunway: context.financial.runway,
                    monthlyBurn: context.financial.monthlyExpenses - context.financial.monthlyRevenue
                }
            });
        }

        // High growth with cash - hiring opportunity
        if (context.financial.revenueGrowthRate > 20 &&
            context.financial.runway > 12 &&
            context.operations.teamUtilization > 85) {
            decisions.push({
                type: 'hiring_opportunity',
                severity: 'medium',
                data: {
                    growthRate: context.financial.revenueGrowthRate,
                    utilization: context.operations.teamUtilization
                }
            });
        }

        // High customer churn
        if (context.operations.customerChurnRate > 20) {
            decisions.push({
                type: 'churn_concern',
                severity: 'high',
                data: {
                    churnRate: context.operations.customerChurnRate,
                    customersLost: Math.floor(context.operations.customers * context.operations.customerChurnRate / 100)
                }
            });
        }

        return decisions;
    }

    /**
     * Scan for optimization opportunities
     */
    scanForOpportunities(context: BusinessContext, state: AnalyzedState): any[] {
        const opportunities: any[] = [];

        // Low team utilization
        if (context.operations.teamUtilization < 60) {
            opportunities.push({
                type: 'capacity_available',
                potential: 'high',
                data: {
                    utilization: context.operations.teamUtilization,
                    additionalCapacity: 100 - context.operations.teamUtilization
                }
            });
        }

        // Strong profitability
        if (context.financial.profitMargin > 30 &&
            context.financial.revenueGrowthRate > 15) {
            opportunities.push({
                type: 'expansion_ready',
                potential: 'high',
                data: {
                    profitMargin: context.financial.profitMargin,
                    growthRate: context.financial.revenueGrowthRate
                }
            });
        }

        return opportunities;
    }

    /**
     * Formulate decision question
     */
    private formulateDecisionQuestion(decision: any): Question {
        switch (decision.type) {
            case 'cash_runway_concern':
                return {
                    id: `decision_${decision.type}_${Date.now()}`,
                    category: QuestionCategory.DECISION_POINT,
                    priority: decision.severity === 'critical' ?
                        QuestionPriority.CRITICAL : QuestionPriority.HIGH,
                    text: `Your cash runway is ${decision.data.currentRunway} months. Would you like to create a plan to extend it?`,
                    context: `At your current burn rate of $${decision.data.monthlyBurn.toLocaleString()}/month, you have limited runway. Let's create an action plan.`,
                    expectedAnswerType: 'boolean',
                    timeframe: 'immediate',
                    followUpQuestions: [
                        'What cost reductions could you implement?',
                        'What revenue increases could you target?',
                        'Should we explore funding options?'
                    ]
                };

            case 'hiring_opportunity':
                return {
                    id: `decision_${decision.type}_${Date.now()}`,
                    category: QuestionCategory.OPPORTUNITY,
                    priority: QuestionPriority.MEDIUM,
                    text: `Your team is ${decision.data.utilization}% utilized and revenue is growing ${decision.data.growthRate}% monthly. Time to hire?`,
                    context: 'Your growth and capacity suggest you could benefit from expanding the team.',
                    expectedAnswerType: 'boolean',
                    timeframe: 'this_week',
                    followUpQuestions: [
                        'What role would have the biggest impact?',
                        'What is your budget for this hire?',
                        'When do you want them to start?'
                    ]
                };

            default:
                return this.generateGenericQuestion(decision);
        }
    }

    /**
     * Formulate opportunity question
     */
    private formulateOpportunityQuestion(opportunity: any): Question {
        return {
            id: `opportunity_${opportunity.type}_${Date.now()}`,
            category: QuestionCategory.OPPORTUNITY,
            priority: QuestionPriority.MEDIUM,
            text: `You have ${opportunity.data.additionalCapacity}% team capacity available. Want ideas for using it?`,
            context: 'Additional capacity could be used for new projects, product development, or sales.',
            expectedAnswerType: 'boolean',
            timeframe: 'this_week'
        };
    }

    /**
     * Generate learning question to improve context
     */
    private generateLearningQuestion(context: BusinessContext): Question | null {
        // Ask about decision style if we don't know it yet
        if (context.patterns.commonQuestions.length < 3) {
            return {
                id: `learning_decision_style_${Date.now()}`,
                category: QuestionCategory.LEARNING,
                priority: QuestionPriority.LOW,
                text: 'When making business decisions, what matters most to you?',
                context: 'This helps us provide more relevant guidance.',
                suggestedAnswers: [
                    'Hard data and metrics',
                    'Gut feeling and experience',
                    'Input from my team',
                    'Expert validation'
                ],
                expectedAnswerType: 'choice',
                timeframe: 'this_month'
            };
        }

        return null;
    }

    /**
     * Prioritize among multiple critical questions
     */
    private prioritizeQuestion(questions: Question[]): Question {
        // Return highest priority question
        return questions.sort((a, b) => {
            const priorityOrder = {
                [QuestionPriority.CRITICAL]: 0,
                [QuestionPriority.HIGH]: 1,
                [QuestionPriority.MEDIUM]: 2,
                [QuestionPriority.LOW]: 3
            };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        })[0];
    }

    /**
     * Generic question for unknown decision types
     */
    private generateGenericQuestion(decision: any): Question {
        return {
            id: `decision_generic_${Date.now()}`,
            category: QuestionCategory.DECISION_POINT,
            priority: QuestionPriority.MEDIUM,
            text: 'We noticed something that needs your attention.',
            context: 'Based on your business metrics, there may be an action to take.',
            expectedAnswerType: 'text',
            timeframe: 'this_week'
        };
    }
}

/**
 * AI Enhancement Interface
 * When AI is available, it can provide more sophisticated question selection
 */
export interface AIQuestionSelector {
    suggestQuestion(
        context: BusinessContext,
        state: AnalyzedState
    ): Promise<Question | null>;

    scoreQuestions(
        questions: Question[],
        context: BusinessContext
    ): Promise<Question[]>; // Returns questions sorted by relevance
}
