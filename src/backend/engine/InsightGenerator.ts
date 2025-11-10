/**
 * Insight Generator
 *
 * Proactively surfaces valuable business insights
 * Works with pattern matching and rules, enhanced by AI
 */

import { BusinessContext, Trend, BusinessStage } from '../models/BusinessContext';

export enum InsightType {
    OPPORTUNITY = 'opportunity',
    WARNING = 'warning',
    TREND = 'trend',
    ACHIEVEMENT = 'achievement',
    COMPARISON = 'comparison',
    PREDICTION = 'prediction'
}

export enum InsightPriority {
    CRITICAL = 'critical',
    HIGH = 'high',
    MEDIUM = 'medium',
    LOW = 'low'
}

export interface Insight {
    id: string;
    type: InsightType;
    priority: InsightPriority;
    title: string;
    description: string;
    explanation: string;           // Why this matters
    data: {                        // Supporting data
        [key: string]: any;
    };
    recommendations: string[];     // What to do about it
    relatedMetrics: string[];
    confidence: number;            // 0-100
    createdAt: Date;
    expiresAt?: Date;             // Time-sensitive insights expire
}

/**
 * Pattern Detector
 * Identifies patterns in business data
 */
export class PatternDetector {
    /**
     * Detect revenue patterns
     */
    detectRevenuePatterns(context: BusinessContext): any[] {
        const patterns: any[] = [];

        // Accelerating growth
        if (context.financial.revenueGrowthRate > 20) {
            patterns.push({
                type: 'accelerating_growth',
                confidence: 85,
                data: {
                    growthRate: context.financial.revenueGrowthRate,
                    trend: 'up'
                }
            });
        }

        // Declining revenue
        if (context.financial.revenueGrowthRate < -5) {
            patterns.push({
                type: 'declining_revenue',
                confidence: 90,
                data: {
                    growthRate: context.financial.revenueGrowthRate,
                    trend: 'down'
                }
            });
        }

        // Stable revenue (could be good or bad depending on stage)
        if (Math.abs(context.financial.revenueGrowthRate) < 5) {
            patterns.push({
                type: 'stable_revenue',
                confidence: 95,
                data: {
                    growthRate: context.financial.revenueGrowthRate,
                    trend: 'stable',
                    stage: context.business.stage
                }
            });
        }

        return patterns;
    }

    /**
     * Detect efficiency patterns
     */
    detectEfficiencyPatterns(context: BusinessContext): any[] {
        const patterns: any[] = [];

        // Revenue per employee (if we have the data)
        const revenuePerEmployee = context.financial.monthlyRevenue / context.operations.employees;

        if (revenuePerEmployee > 10000) {
            patterns.push({
                type: 'high_efficiency',
                confidence: 80,
                data: {
                    revenuePerEmployee,
                    employees: context.operations.employees
                }
            });
        }

        // Low team utilization
        if (context.operations.teamUtilization < 60) {
            patterns.push({
                type: 'underutilized_team',
                confidence: 90,
                data: {
                    utilization: context.operations.teamUtilization,
                    availableCapacity: 100 - context.operations.teamUtilization
                }
            });
        }

        // Overworked team
        if (context.operations.teamUtilization > 90) {
            patterns.push({
                type: 'overutilized_team',
                confidence: 95,
                data: {
                    utilization: context.operations.teamUtilization,
                    riskOfBurnout: 'high'
                }
            });
        }

        return patterns;
    }

    /**
     * Detect customer patterns
     */
    detectCustomerPatterns(context: BusinessContext): any[] {
        const patterns: any[] = [];

        // High churn
        if (context.operations.customerChurnRate > 20) {
            patterns.push({
                type: 'high_churn',
                confidence: 90,
                data: {
                    churnRate: context.operations.customerChurnRate,
                    severity: context.operations.customerChurnRate > 30 ? 'critical' : 'high'
                }
            });
        }

        // Growing customer base
        const customerGrowth = (context.operations.customers /
            Math.max(1, context.operations.customers - 10)) * 100 - 100;

        if (customerGrowth > 15) {
            patterns.push({
                type: 'growing_customer_base',
                confidence: 85,
                data: {
                    customers: context.operations.customers,
                    growthRate: customerGrowth
                }
            });
        }

        return patterns;
    }

    /**
     * Detect cash flow patterns
     */
    detectCashFlowPatterns(context: BusinessContext): any[] {
        const patterns: any[] = [];

        // Shrinking runway
        if (context.financial.runway < 6 && context.financial.cashFlowTrend === Trend.DOWN) {
            patterns.push({
                type: 'shrinking_runway',
                confidence: 95,
                data: {
                    runway: context.financial.runway,
                    trend: context.financial.cashFlowTrend,
                    severity: context.financial.runway < 3 ? 'critical' : 'high'
                }
            });
        }

        // Improving cash position
        if (context.financial.cashFlowTrend === Trend.UP && context.financial.profitMargin > 0) {
            patterns.push({
                type: 'improving_cash_position',
                confidence: 85,
                data: {
                    trend: context.financial.cashFlowTrend,
                    profitMargin: context.financial.profitMargin
                }
            });
        }

        // Burning cash while unprofitable
        if (context.financial.profitMargin < 0 && context.financial.runway < 12) {
            patterns.push({
                type: 'cash_burn_concern',
                confidence: 90,
                data: {
                    profitMargin: context.financial.profitMargin,
                    runway: context.financial.runway,
                    monthlyBurn: context.financial.monthlyExpenses - context.financial.monthlyRevenue
                }
            });
        }

        return patterns;
    }
}

/**
 * Insight Generator
 * Converts detected patterns into actionable insights
 */
export class InsightGenerator {
    private patternDetector: PatternDetector;
    private aiEngine?: AIInsightEngine; // Optional AI enhancement

    constructor(aiEngine?: AIInsightEngine) {
        this.patternDetector = new PatternDetector();
        this.aiEngine = aiEngine;
    }

    /**
     * Generate insights from current business context
     */
    async generate(context: BusinessContext): Promise<Insight[]> {
        const insights: Insight[] = [];

        // Detect patterns
        const revenuePatterns = this.patternDetector.detectRevenuePatterns(context);
        const efficiencyPatterns = this.patternDetector.detectEfficiencyPatterns(context);
        const customerPatterns = this.patternDetector.detectCustomerPatterns(context);
        const cashFlowPatterns = this.patternDetector.detectCashFlowPatterns(context);

        // Convert patterns to insights
        insights.push(...this.convertToInsights(revenuePatterns, context));
        insights.push(...this.convertToInsights(efficiencyPatterns, context));
        insights.push(...this.convertToInsights(customerPatterns, context));
        insights.push(...this.convertToInsights(cashFlowPatterns, context));

        // Add AI-generated insights if available
        if (this.aiEngine) {
            const aiInsights = await this.aiEngine.generate(context);
            insights.push(...aiInsights);
        }

        // Sort by priority
        return this.prioritizeInsights(insights);
    }

    /**
     * Convert detected patterns to actionable insights
     */
    private convertToInsights(patterns: any[], context: BusinessContext): Insight[] {
        const insights: Insight[] = [];

        for (const pattern of patterns) {
            const insight = this.patternToInsight(pattern, context);
            if (insight) {
                insights.push(insight);
            }
        }

        return insights;
    }

    /**
     * Convert single pattern to insight
     */
    private patternToInsight(pattern: any, context: BusinessContext): Insight | null {
        switch (pattern.type) {
            case 'accelerating_growth':
                return {
                    id: `insight_${pattern.type}_${Date.now()}`,
                    type: InsightType.OPPORTUNITY,
                    priority: InsightPriority.HIGH,
                    title: '🚀 Revenue accelerating',
                    description: `Your revenue is growing ${pattern.data.growthRate}% per month - well above average!`,
                    explanation: 'This level of growth creates opportunities to invest in expansion, but also requires careful cash management.',
                    data: pattern.data,
                    recommendations: [
                        'Consider hiring to support growth',
                        'Review pricing to ensure margins remain healthy',
                        'Document processes before scaling further',
                        'Ensure customer success can keep up with new customers'
                    ],
                    relatedMetrics: ['revenue_growth', 'cash_runway', 'team_utilization'],
                    confidence: pattern.confidence,
                    createdAt: new Date()
                };

            case 'declining_revenue':
                return {
                    id: `insight_${pattern.type}_${Date.now()}`,
                    type: InsightType.WARNING,
                    priority: InsightPriority.CRITICAL,
                    title: '⚠️ Revenue declining',
                    description: `Revenue has decreased ${Math.abs(pattern.data.growthRate)}% this month`,
                    explanation: 'Declining revenue reduces cash runway and may indicate problems with product-market fit, competition, or delivery.',
                    data: pattern.data,
                    recommendations: [
                        'Analyze which customers you lost and why',
                        'Review customer feedback for common issues',
                        'Assess competitive landscape',
                        'Consider pivoting strategy if trend continues',
                        'Review and optimize sales pipeline'
                    ],
                    relatedMetrics: ['monthly_revenue', 'customer_churn', 'win_rate'],
                    confidence: pattern.confidence,
                    createdAt: new Date()
                };

            case 'underutilized_team':
                return {
                    id: `insight_${pattern.type}_${Date.now()}`,
                    type: InsightType.OPPORTUNITY,
                    priority: InsightPriority.MEDIUM,
                    title: '💡 Team capacity available',
                    description: `Your team is only ${pattern.data.utilization}% utilized - ${pattern.data.availableCapacity}% capacity available`,
                    explanation: 'Additional capacity could be used for product development, sales, or taking on more clients.',
                    data: pattern.data,
                    recommendations: [
                        'Launch new marketing campaigns to drive sales',
                        'Invest in product improvements',
                        'Build new features customers have requested',
                        'Develop content or training materials',
                        'Reach out to past prospects'
                    ],
                    relatedMetrics: ['team_utilization', 'monthly_revenue', 'customer_count'],
                    confidence: pattern.confidence,
                    createdAt: new Date()
                };

            case 'overutilized_team':
                return {
                    id: `insight_${pattern.type}_${Date.now()}`,
                    type: InsightType.WARNING,
                    priority: InsightPriority.HIGH,
                    title: '🔥 Team at capacity',
                    description: `Your team is ${pattern.data.utilization}% utilized - burnout risk is ${pattern.data.riskOfBurnout}`,
                    explanation: 'Sustained high utilization leads to burnout, quality issues, and employee turnover.',
                    data: pattern.data,
                    recommendations: [
                        'Consider hiring or engaging contractors',
                        'Review and reprioritize current work',
                        'Identify tasks that could be automated',
                        'Say no to some opportunities to protect team health',
                        'Check in with team on workload and morale'
                    ],
                    relatedMetrics: ['team_utilization', 'revenue_per_employee'],
                    confidence: pattern.confidence,
                    createdAt: new Date()
                };

            case 'high_churn':
                return {
                    id: `insight_${pattern.type}_${Date.now()}`,
                    type: InsightType.WARNING,
                    priority: pattern.data.severity === 'critical' ?
                        InsightPriority.CRITICAL : InsightPriority.HIGH,
                    title: '⚠️ Customer churn is high',
                    description: `${pattern.data.churnRate}% of customers are churning`,
                    explanation: 'High churn means you need to constantly acquire new customers just to stand still. This is expensive and unsustainable.',
                    data: pattern.data,
                    recommendations: [
                        'Interview churned customers to understand why they left',
                        'Implement customer success check-ins',
                        'Review product quality and support response times',
                        'Consider customer retention incentives',
                        'Analyze if you\'re targeting the right customers'
                    ],
                    relatedMetrics: ['customer_churn_rate', 'customer_lifetime_value', 'nps_score'],
                    confidence: pattern.confidence,
                    createdAt: new Date()
                };

            case 'shrinking_runway':
                return {
                    id: `insight_${pattern.type}_${Date.now()}`,
                    type: InsightType.WARNING,
                    priority: pattern.data.severity === 'critical' ?
                        InsightPriority.CRITICAL : InsightPriority.HIGH,
                    title: '⏰ Cash runway shrinking',
                    description: `Only ${pattern.data.runway} months of cash left and trending down`,
                    explanation: 'You need to either increase revenue or decrease expenses soon, or you\'ll run out of cash.',
                    data: pattern.data,
                    recommendations: [
                        'Create detailed cash flow projection for next 6 months',
                        'Identify opportunities to increase revenue',
                        'Review all expenses for potential cuts',
                        'Consider raising capital if growth is strong',
                        'Set clear milestones for when to take action'
                    ],
                    relatedMetrics: ['cash_runway', 'monthly_burn', 'cash_position'],
                    confidence: pattern.confidence,
                    createdAt: new Date(),
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
                };

            case 'improving_cash_position':
                return {
                    id: `insight_${pattern.type}_${Date.now()}`,
                    type: InsightType.ACHIEVEMENT,
                    priority: InsightPriority.MEDIUM,
                    title: '✅ Cash position improving',
                    description: `Your cash is trending up and you're ${pattern.data.profitMargin}% profitable`,
                    explanation: 'This gives you options - you can invest in growth, build reserves, or return value to stakeholders.',
                    data: pattern.data,
                    recommendations: [
                        'Consider strategic investments in growth',
                        'Build 6-12 month cash reserves for stability',
                        'Invest in systems and processes',
                        'Reward team for driving profitability'
                    ],
                    relatedMetrics: ['cash_position', 'profit_margin', 'revenue_growth'],
                    confidence: pattern.confidence,
                    createdAt: new Date()
                };

            case 'high_efficiency':
                return {
                    id: `insight_${pattern.type}_${Date.now()}`,
                    type: InsightType.ACHIEVEMENT,
                    priority: InsightPriority.LOW,
                    title: '🎯 High efficiency',
                    description: `$${Math.floor(pattern.data.revenuePerEmployee).toLocaleString()} revenue per employee - strong!`,
                    explanation: 'Your team is highly productive, which gives you strong unit economics.',
                    data: pattern.data,
                    recommendations: [
                        'Document what makes your team so efficient',
                        'Use this metric when hiring to maintain efficiency',
                        'Share this win with the team'
                    ],
                    relatedMetrics: ['revenue_per_employee', 'profit_margin'],
                    confidence: pattern.confidence,
                    createdAt: new Date()
                };

            default:
                return null;
        }
    }

    /**
     * Prioritize insights by importance
     */
    private prioritizeInsights(insights: Insight[]): Insight[] {
        return insights.sort((a, b) => {
            const priorityOrder = {
                [InsightPriority.CRITICAL]: 0,
                [InsightPriority.HIGH]: 1,
                [InsightPriority.MEDIUM]: 2,
                [InsightPriority.LOW]: 3
            };

            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }
}

/**
 * AI Insight Engine Interface
 * When AI is available, generates more sophisticated insights
 */
export interface AIInsightEngine {
    generate(context: BusinessContext): Promise<Insight[]>;

    predictTrends(
        context: BusinessContext,
        timeframe: number
    ): Promise<{
        metric: string;
        prediction: number;
        confidence: number;
    }[]>;

    findAnomalies(
        context: BusinessContext
    ): Promise<{
        metric: string;
        expected: number;
        actual: number;
        explanation: string;
    }[]>;
}
