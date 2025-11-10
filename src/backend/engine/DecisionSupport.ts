/**
 * Decision Support System
 *
 * Provides context-aware guidance at decision points
 * Works with rules-based logic, enhanced by AI when available
 */

import { BusinessContext, Trend, BusinessStage, RiskLevel } from '../models/BusinessContext';

export enum DecisionType {
    HIRING = 'hiring',
    INVESTMENT = 'investment',
    PRICING = 'pricing',
    COST_CUTTING = 'cost_cutting',
    EXPANSION = 'expansion',
    PRODUCT_LAUNCH = 'product_launch',
    CUSTOMER_ACQUISITION = 'customer_acquisition'
}

export interface DecisionOption {
    id: string;
    title: string;
    description: string;
    impact: {
        financial: 'positive' | 'negative' | 'neutral';
        risk: RiskLevel;
        timeframe: string;                 // e.g., "3-6 months"
        confidence: number;                 // 0-100
    };
    pros: string[];
    cons: string[];
    requirements: string[];
    estimatedCost?: number;
    estimatedReturn?: number;
    metrics: {
        name: string;
        value: string;
        change?: string;
    }[];
}

export interface Decision {
    id: string;
    type: DecisionType;
    title: string;
    description: string;
    context: string;
    urgency: 'immediate' | 'high' | 'medium' | 'low';
    options: DecisionOption[];
    recommendation?: string;           // Our suggested approach
    relatedMetrics: string[];
    createdAt: Date;
    expiresAt?: Date;
}

export interface Recommendation {
    id: string;
    title: string;
    description: string;
    reasoning: string;
    confidence: number;                // 0-100
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
    timeframe: string;
    actionSteps: string[];
    metrics: string[];                 // Metrics to track
    successCriteria: string[];
}

/**
 * Decision Support Engine
 */
export class DecisionSupportEngine {
    private aiRecommender?: AIRecommender; // Optional AI enhancement

    constructor(aiRecommender?: AIRecommender) {
        this.aiRecommender = aiRecommender;
    }

    /**
     * Generate decision with options for a given scenario
     */
    async generateDecision(
        type: DecisionType,
        context: BusinessContext
    ): Promise<Decision> {
        const decision = this.createBaseDecision(type, context);

        // Generate options based on business rules
        decision.options = this.generateOptions(type, context);

        // Add AI-powered recommendation if available
        if (this.aiRecommender) {
            const aiRecs = await this.aiRecommender.suggest(decision, context);
            if (aiRecs.length > 0) {
                decision.recommendation = aiRecs[0].title;
            }
        } else {
            // Use rules-based recommendation
            decision.recommendation = this.generateRulesBasedRecommendation(decision, context);
        }

        return decision;
    }

    /**
     * Create base decision structure
     */
    private createBaseDecision(type: DecisionType, context: BusinessContext): Decision {
        const templates = {
            [DecisionType.HIRING]: {
                title: 'Should you hire now?',
                description: 'Your team utilization and growth suggest considering a new hire',
                urgency: context.operations.teamUtilization > 90 ? 'high' : 'medium',
                relatedMetrics: ['team_utilization', 'revenue_growth', 'cash_runway']
            },
            [DecisionType.COST_CUTTING]: {
                title: 'Cost optimization opportunities',
                description: 'Your cash runway suggests reviewing expenses',
                urgency: context.financial.runway < 6 ? 'immediate' : 'medium',
                relatedMetrics: ['monthly_expenses', 'cash_runway', 'profit_margin']
            },
            [DecisionType.PRICING]: {
                title: 'Pricing strategy review',
                description: 'Market conditions and costs suggest reviewing pricing',
                urgency: 'medium' as const,
                relatedMetrics: ['profit_margin', 'customer_acquisition_cost', 'average_deal_size']
            },
            [DecisionType.EXPANSION]: {
                title: 'Market expansion opportunity',
                description: 'Your financial health suggests you could expand',
                urgency: 'low' as const,
                relatedMetrics: ['cash_position', 'profit_margin', 'growth_rate']
            }
        };

        const template = templates[type] || templates[DecisionType.HIRING];

        return {
            id: `decision_${type}_${Date.now()}`,
            type,
            title: template.title,
            description: template.description,
            context: this.buildContextExplanation(type, context),
            urgency: template.urgency,
            options: [],
            relatedMetrics: template.relatedMetrics,
            createdAt: new Date()
        };
    }

    /**
     * Generate options for a decision
     */
    private generateOptions(type: DecisionType, context: BusinessContext): DecisionOption[] {
        switch (type) {
            case DecisionType.HIRING:
                return this.generateHiringOptions(context);

            case DecisionType.COST_CUTTING:
                return this.generateCostCuttingOptions(context);

            case DecisionType.PRICING:
                return this.generatePricingOptions(context);

            default:
                return [];
        }
    }

    /**
     * Generate hiring decision options
     */
    private generateHiringOptions(context: BusinessContext): DecisionOption[] {
        const options: DecisionOption[] = [];

        // Option 1: Hire now
        const avgSalary = 60000; // This would come from industry data
        const hiringCost = avgSalary / 12;

        options.push({
            id: 'hire_now',
            title: 'Hire Full-Time Employee Now',
            description: 'Bring on a permanent team member to handle the increased workload',
            impact: {
                financial: context.financial.runway > 12 ? 'positive' : 'negative',
                risk: context.financial.runway < 6 ? RiskLevel.HIGH : RiskLevel.MEDIUM,
                timeframe: '2-3 months',
                confidence: 75
            },
            pros: [
                'Increases team capacity immediately',
                'Builds institutional knowledge',
                'Shows confidence to market',
                `Can handle ${Math.floor(20 / context.operations.employees)}% more work`
            ],
            cons: [
                `Adds $${hiringCost.toLocaleString()}/month to expenses`,
                'Takes time to onboard and become productive',
                'Reduces cash runway',
                'Harder to reverse if growth slows'
            ],
            requirements: [
                `${Math.floor(hiringCost * 3)} in cash reserves`,
                'Stable or growing revenue',
                'Defined role and responsibilities'
            ],
            estimatedCost: hiringCost,
            metrics: [
                { name: 'Monthly Cost', value: `$${hiringCost.toLocaleString()}` },
                { name: 'New Runway', value: `${Math.floor(context.financial.runway - 1)} months`, change: '-1 month' },
                { name: 'Team Capacity', value: '+20%', change: '↑' }
            ]
        });

        // Option 2: Hire contractor
        const contractorRate = hiringCost * 0.7;

        options.push({
            id: 'hire_contractor',
            title: 'Engage Contractor/Freelancer',
            description: 'Flexible capacity without long-term commitment',
            impact: {
                financial: 'neutral',
                risk: RiskLevel.LOW,
                timeframe: '1-2 weeks',
                confidence: 85
            },
            pros: [
                'Flexible commitment',
                'Fast to onboard',
                'Lower monthly cost',
                'Easy to scale up or down'
            ],
            cons: [
                'Less invested in company',
                'May have multiple clients',
                'Knowledge walks away when contract ends',
                'Potentially higher hourly rate'
            ],
            requirements: [
                `$${contractorRate.toLocaleString()}/month budget`,
                'Clear project scope',
                'Contractor management process'
            ],
            estimatedCost: contractorRate,
            metrics: [
                { name: 'Monthly Cost', value: `$${contractorRate.toLocaleString()}` },
                { name: 'Runway Impact', value: 'Minimal', change: '-0.5 months' },
                { name: 'Flexibility', value: 'High' }
            ]
        });

        // Option 3: Wait
        options.push({
            id: 'wait',
            title: 'Wait 2-3 Months',
            description: 'Delay hiring until revenue increases or situation is clearer',
            impact: {
                financial: 'positive',
                risk: RiskLevel.MEDIUM,
                timeframe: '2-3 months',
                confidence: 60
            },
            pros: [
                'Preserves cash runway',
                'More time to validate growth',
                'Team learns to work more efficiently',
                'Clearer role definition'
            ],
            cons: [
                'Current team remains overworked',
                'May miss growth opportunities',
                'Risk of burnout',
                'Competitors may move faster'
            ],
            requirements: [
                'Team capacity to handle current load',
                'Clear triggers for when to hire'
            ],
            estimatedCost: 0,
            metrics: [
                { name: 'Cost', value: '$0' },
                { name: 'Team Stress', value: 'High', change: '↑' },
                { name: 'Runway', value: `${context.financial.runway} months`, change: '→' }
            ]
        });

        return options;
    }

    /**
     * Generate cost cutting options
     */
    private generateCostCuttingOptions(context: BusinessContext): DecisionOption[] {
        const monthlyExpenses = context.financial.monthlyExpenses;
        const targetSavings = monthlyExpenses * 0.2; // Target 20% reduction

        return [
            {
                id: 'cut_deep',
                title: 'Aggressive Cost Reduction',
                description: `Cut $${Math.floor(targetSavings).toLocaleString()}/month in expenses`,
                impact: {
                    financial: 'positive',
                    risk: RiskLevel.HIGH,
                    timeframe: '1 month',
                    confidence: 80
                },
                pros: [
                    `Extends runway by ${Math.floor(context.financial.currentCashPosition / (monthlyExpenses - targetSavings))} months`,
                    'Forces efficiency',
                    'Buys time to increase revenue'
                ],
                cons: [
                    'May impact quality or growth',
                    'Could hurt team morale',
                    'Some cuts may be hard to reverse'
                ],
                requirements: [
                    'Full expense audit',
                    'Team communication plan',
                    'Priority setting'
                ],
                estimatedCost: 0,
                metrics: [
                    { name: 'Monthly Savings', value: `$${Math.floor(targetSavings).toLocaleString()}` },
                    { name: 'New Runway', value: `${Math.floor(context.financial.currentCashPosition / (monthlyExpenses - targetSavings))} months` }
                ]
            },
            {
                id: 'cut_moderate',
                title: 'Targeted Cost Optimization',
                description: 'Focus on low-impact areas for modest savings',
                impact: {
                    financial: 'positive',
                    risk: RiskLevel.LOW,
                    timeframe: '2-3 weeks',
                    confidence: 90
                },
                pros: [
                    'Low risk to operations',
                    'Easy to implement',
                    'Still extends runway'
                ],
                cons: [
                    'Smaller impact',
                    'May need additional measures'
                ],
                requirements: [
                    'Review of subscriptions and tools',
                    'Vendor renegotiation'
                ],
                estimatedCost: 0,
                metrics: [
                    { name: 'Monthly Savings', value: `$${Math.floor(targetSavings * 0.5).toLocaleString()}` },
                    { name: 'Risk', value: 'Low' }
                ]
            }
        ];
    }

    /**
     * Generate pricing options
     */
    private generatePricingOptions(context: BusinessContext): DecisionOption[] {
        return [
            {
                id: 'increase_price',
                title: 'Increase Prices 10-15%',
                description: 'Raise prices to improve margins',
                impact: {
                    financial: 'positive',
                    risk: RiskLevel.MEDIUM,
                    timeframe: '1-2 months',
                    confidence: 70
                },
                pros: [
                    'Improved profit margins',
                    'Better customer perception',
                    'More sustainable business'
                ],
                cons: [
                    'May lose price-sensitive customers',
                    'Need to communicate value',
                    'Competitors may undercut'
                ],
                requirements: [
                    'Value proposition review',
                    'Customer communication plan',
                    'Competitor analysis'
                ],
                metrics: [
                    { name: 'Revenue Impact', value: '+10-15%' },
                    { name: 'Churn Risk', value: '5-10%' }
                ]
            }
        ];
    }

    /**
     * Build context explanation for decision
     */
    private buildContextExplanation(type: DecisionType, context: BusinessContext): string {
        const explanations = {
            [DecisionType.HIRING]: `Your team is at ${context.operations.teamUtilization}% utilization and revenue is growing ${context.financial.revenueGrowthRate}% per month. You have ${context.financial.runway} months of runway.`,

            [DecisionType.COST_CUTTING]: `Your current runway is ${context.financial.runway} months with monthly expenses of $${context.financial.monthlyExpenses.toLocaleString()}.`,

            [DecisionType.PRICING]: `Your current profit margin is ${context.financial.profitMargin}% with average transaction size of $${context.financial.averageTransactionSize.toLocaleString()}.`
        };

        return explanations[type] || 'Based on your current business metrics.';
    }

    /**
     * Generate rules-based recommendation
     */
    private generateRulesBasedRecommendation(decision: Decision, context: BusinessContext): string {
        if (decision.type === DecisionType.HIRING) {
            if (context.financial.runway < 6) {
                return 'Consider hiring a contractor first to preserve cash runway';
            } else if (context.financial.runway > 12 && context.operations.teamUtilization > 85) {
                return 'Your metrics support hiring a full-time employee now';
            } else {
                return 'Wait 2-3 months to validate growth before committing';
            }
        }

        if (decision.type === DecisionType.COST_CUTTING) {
            if (context.financial.runway < 3) {
                return 'Aggressive cost reduction is necessary to extend runway';
            } else {
                return 'Targeted optimization can improve runway with minimal risk';
            }
        }

        return 'Review options carefully based on your specific situation';
    }
}

/**
 * AI Recommender Interface
 * When AI is available, provides more nuanced recommendations
 */
export interface AIRecommender {
    suggest(
        decision: Decision,
        context: BusinessContext
    ): Promise<Recommendation[]>;

    analyzeOptions(
        options: DecisionOption[],
        context: BusinessContext
    ): Promise<DecisionOption[]>; // Returns options with enhanced analysis
}
