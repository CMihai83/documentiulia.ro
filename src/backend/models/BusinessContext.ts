/**
 * Business Context Model
 *
 * The living brain of the Logic Engine - learns and evolves with the business
 */

export enum BusinessType {
    SERVICE = 'service',
    PRODUCT = 'product',
    MIXED = 'mixed',
    SAAS = 'saas',
    CONSULTING = 'consulting'
}

export enum Industry {
    TECHNOLOGY = 'technology',
    RETAIL = 'retail',
    MANUFACTURING = 'manufacturing',
    CONSULTING = 'consulting',
    HEALTHCARE = 'healthcare',
    FINANCE = 'finance',
    EDUCATION = 'education',
    OTHER = 'other'
}

export enum BusinessStage {
    STARTUP = 'startup',        // 0-2 years
    GROWTH = 'growth',          // 2-5 years
    MATURE = 'mature',          // 5+ years
    SCALING = 'scaling'         // Rapid expansion phase
}

export enum DecisionStyle {
    DATA_DRIVEN = 'data_driven',        // Wants all the numbers
    GUT_FEELING = 'gut_feeling',        // Goes with intuition
    COLLABORATIVE = 'collaborative',     // Seeks input from team
    CAUTIOUS = 'cautious',              // Prefers validation
    AGGRESSIVE = 'aggressive'            // Fast mover
}

export enum RiskLevel {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high'
}

export enum Trend {
    UP = 'up',
    DOWN = 'down',
    STABLE = 'stable',
    VOLATILE = 'volatile'
}

export interface FinancialState {
    currentCashPosition: number;
    monthlyRevenue: number;
    monthlyExpenses: number;
    runway: number;                    // months of cash remaining
    profitMargin: number;              // percentage
    cashFlowTrend: Trend;
    averageTransactionSize: number;
    revenueGrowthRate: number;         // month-over-month %
}

export interface OperationalState {
    employees: number;
    customers: number;
    activeProjects: number;
    teamUtilization: number;           // percentage
    averageProjectDuration: number;    // days
    customerChurnRate: number;         // percentage
}

export interface LearnedPatterns {
    decisionStyle: DecisionStyle;
    riskTolerance: RiskLevel;
    commonQuestions: string[];
    painPoints: string[];
    preferredMetrics: string[];
    typicalResponseTime: number;       // hours to respond to prompts
    engagementLevel: 'high' | 'medium' | 'low';
}

export interface BusinessGoals {
    primaryGoal: string;
    targetRevenue?: number;
    targetCustomers?: number;
    targetGrowthRate?: number;
    timeframe: number;                 // months
    constraints: string[];
}

export interface BusinessContext {
    // Core business identity
    business: {
        id: string;
        name: string;
        type: BusinessType;
        industry: Industry;
        stage: BusinessStage;
        foundedDate: Date;
    };

    // Financial state
    financial: FinancialState;

    // Operations
    operations: OperationalState;

    // Goals
    goals: BusinessGoals;

    // Learned patterns (evolves over time)
    patterns: LearnedPatterns;

    // Context metadata
    metadata: {
        lastUpdated: Date;
        contextQuality: 'complete' | 'partial' | 'minimal';
        knownGaps: string[];            // What info we still need
        completionScore: number;         // 0-100
    };
}

/**
 * Business Context Manager
 * Maintains and evolves the business context over time
 */
export class BusinessContextManager {
    private context: BusinessContext;

    constructor(initialContext: Partial<BusinessContext>) {
        this.context = this.initializeContext(initialContext);
    }

    /**
     * Initialize context with sensible defaults
     */
    private initializeContext(partial: Partial<BusinessContext>): BusinessContext {
        return {
            business: partial.business || {
                id: this.generateId(),
                name: 'Unnamed Business',
                type: BusinessType.MIXED,
                industry: Industry.OTHER,
                stage: BusinessStage.STARTUP,
                foundedDate: new Date()
            },
            financial: partial.financial || {
                currentCashPosition: 0,
                monthlyRevenue: 0,
                monthlyExpenses: 0,
                runway: 0,
                profitMargin: 0,
                cashFlowTrend: Trend.STABLE,
                averageTransactionSize: 0,
                revenueGrowthRate: 0
            },
            operations: partial.operations || {
                employees: 1,
                customers: 0,
                activeProjects: 0,
                teamUtilization: 0,
                averageProjectDuration: 0,
                customerChurnRate: 0
            },
            goals: partial.goals || {
                primaryGoal: 'Not set',
                timeframe: 12,
                constraints: []
            },
            patterns: partial.patterns || {
                decisionStyle: DecisionStyle.DATA_DRIVEN,
                riskTolerance: RiskLevel.MEDIUM,
                commonQuestions: [],
                painPoints: [],
                preferredMetrics: [],
                typicalResponseTime: 24,
                engagementLevel: 'medium'
            },
            metadata: {
                lastUpdated: new Date(),
                contextQuality: 'minimal',
                knownGaps: this.identifyInitialGaps(partial),
                completionScore: this.calculateCompletionScore(partial)
            }
        };
    }

    /**
     * Update context with new information
     */
    updateContext(updates: Partial<BusinessContext>): void {
        this.context = {
            ...this.context,
            ...updates,
            metadata: {
                ...this.context.metadata,
                lastUpdated: new Date(),
                completionScore: this.calculateCompletionScore({
                    ...this.context,
                    ...updates
                })
            }
        };
    }

    /**
     * Learn from user behavior
     */
    learnFromInteraction(interaction: {
        type: 'question_answered' | 'decision_made' | 'metric_viewed' | 'prompt_dismissed';
        data: any;
        responseTime?: number;
    }): void {
        const patterns = { ...this.context.patterns };

        switch (interaction.type) {
            case 'question_answered':
                if (!patterns.commonQuestions.includes(interaction.data.question)) {
                    patterns.commonQuestions.push(interaction.data.question);
                }
                break;

            case 'decision_made':
                // Analyze decision style from choices
                this.inferDecisionStyle(interaction.data, patterns);
                break;

            case 'metric_viewed':
                if (!patterns.preferredMetrics.includes(interaction.data.metric)) {
                    patterns.preferredMetrics.push(interaction.data.metric);
                }
                break;
        }

        if (interaction.responseTime) {
            // Update typical response time (moving average)
            patterns.typicalResponseTime =
                (patterns.typicalResponseTime * 0.8) + (interaction.responseTime * 0.2);
        }

        this.context.patterns = patterns;
    }

    /**
     * Get current context
     */
    getContext(): BusinessContext {
        return { ...this.context };
    }

    /**
     * Calculate how complete the context is (0-100)
     */
    private calculateCompletionScore(context: Partial<BusinessContext>): number {
        let score = 0;
        const weights = {
            business: 20,
            financial: 30,
            operations: 20,
            goals: 20,
            patterns: 10
        };

        // Check each section
        if (context.business?.name && context.business.name !== 'Unnamed Business') {
            score += weights.business;
        }

        if (context.financial?.currentCashPosition && context.financial.monthlyRevenue) {
            score += weights.financial;
        }

        if (context.operations?.employees && context.operations.customers) {
            score += weights.operations;
        }

        if (context.goals?.primaryGoal && context.goals.primaryGoal !== 'Not set') {
            score += weights.goals;
        }

        if (context.patterns?.commonQuestions && context.patterns.commonQuestions.length > 3) {
            score += weights.patterns;
        }

        return Math.min(score, 100);
    }

    /**
     * Identify what information is missing
     */
    private identifyInitialGaps(context: Partial<BusinessContext>): string[] {
        const gaps: string[] = [];

        if (!context.business?.name) gaps.push('business_name');
        if (!context.business?.type) gaps.push('business_type');
        if (!context.financial?.currentCashPosition) gaps.push('cash_position');
        if (!context.financial?.monthlyRevenue) gaps.push('monthly_revenue');
        if (!context.operations?.employees) gaps.push('team_size');
        if (!context.goals?.primaryGoal) gaps.push('primary_goal');

        return gaps;
    }

    /**
     * Infer decision style from choices
     */
    private inferDecisionStyle(decision: any, patterns: LearnedPatterns): void {
        // Logic to infer decision style from user's choices
        // This is a simplified version - real implementation would be more sophisticated

        if (decision.timeToDecide < 1) {
            // Fast decisions suggest gut feeling or aggressive style
            patterns.decisionStyle = DecisionStyle.AGGRESSIVE;
        } else if (decision.dataPointsReviewed > 5) {
            // Reviewed lots of data suggests data-driven style
            patterns.decisionStyle = DecisionStyle.DATA_DRIVEN;
        } else if (decision.consultedTeam) {
            patterns.decisionStyle = DecisionStyle.COLLABORATIVE;
        }
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `biz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
