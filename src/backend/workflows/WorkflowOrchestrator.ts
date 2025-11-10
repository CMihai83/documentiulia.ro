/**
 * Workflow Orchestrator
 *
 * Guides users through complex business processes step-by-step
 * Makes complicated tasks feel simple
 */

import { BusinessContext } from '../models/BusinessContext';

export enum WorkflowType {
    ONBOARDING = 'onboarding',
    HIRING = 'hiring',
    CASH_PLANNING = 'cash_planning',
    PRICING_REVIEW = 'pricing_review',
    GOAL_SETTING = 'goal_setting',
    EXPENSE_REVIEW = 'expense_review',
    CUSTOMER_ANALYSIS = 'customer_analysis'
}

export enum StepStatus {
    NOT_STARTED = 'not_started',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    SKIPPED = 'skipped',
    BLOCKED = 'blocked'
}

export interface WorkflowStep {
    id: string;
    title: string;
    description: string;
    type: 'question' | 'input' | 'review' | 'action' | 'decision';
    status: StepStatus;
    prompt?: string;                   // What to ask/show user
    expectedInput?: {
        type: 'text' | 'number' | 'choice' | 'multiple_choice' | 'date';
        options?: string[];
        validation?: any;
    };
    helpText?: string;
    relatedMetrics?: string[];
    estimatedTime?: number;            // minutes
    dependencies?: string[];           // IDs of steps that must complete first
    result?: any;                      // User's response/action
}

export interface Workflow {
    id: string;
    type: WorkflowType;
    title: string;
    description: string;
    purpose: string;                   // Why we're doing this
    estimatedTime: number;             // total minutes
    steps: WorkflowStep[];
    currentStepIndex: number;
    status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
    startedAt?: Date;
    completedAt?: Date;
    results: {                         // Collected data from workflow
        [key: string]: any;
    };
}

/**
 * Workflow Builder
 * Creates workflows for different scenarios
 */
export class WorkflowBuilder {
    /**
     * Build hiring decision workflow
     */
    buildHiringWorkflow(context: BusinessContext): Workflow {
        return {
            id: `workflow_hiring_${Date.now()}`,
            type: WorkflowType.HIRING,
            title: 'Make a Hiring Decision',
            description: 'Let\'s figure out if and when to hire, and what role to prioritize',
            purpose: 'Hiring is expensive and risky. This workflow helps you make a data-driven decision.',
            estimatedTime: 15,
            currentStepIndex: 0,
            status: 'not_started',
            results: {},
            steps: [
                {
                    id: 'hiring_1_biggest_pain',
                    title: 'Identify biggest pain point',
                    description: 'What is hurting your business most right now?',
                    type: 'question',
                    status: StepStatus.NOT_STARTED,
                    prompt: 'What is your team struggling with most?',
                    expectedInput: {
                        type: 'choice',
                        options: [
                            'Too many projects, not enough people',
                            'Sales - need more customers',
                            'Product - features not getting built',
                            'Customer support taking too long',
                            'Operations - things falling through cracks'
                        ]
                    },
                    estimatedTime: 2
                },
                {
                    id: 'hiring_2_current_workaround',
                    title: 'Current workaround',
                    description: 'How are you handling this now?',
                    type: 'question',
                    status: StepStatus.NOT_STARTED,
                    prompt: 'How are you currently dealing with this problem?',
                    expectedInput: {
                        type: 'choice',
                        options: [
                            'Working longer hours',
                            'Turning down opportunities',
                            'Quality is suffering',
                            'Using contractors/freelancers',
                            'Nothing - just accepting it'
                        ]
                    },
                    estimatedTime: 2
                },
                {
                    id: 'hiring_3_cost_of_not_hiring',
                    title: 'Cost of not hiring',
                    description: 'What is this costing you per month?',
                    type: 'input',
                    status: StepStatus.NOT_STARTED,
                    prompt: 'Estimate the monthly cost of NOT solving this (lost revenue, team burnout, missed opportunities)',
                    expectedInput: {
                        type: 'number',
                        validation: { min: 0 }
                    },
                    helpText: 'Think about: Lost sales, delayed features, customer churn, team stress',
                    estimatedTime: 3
                },
                {
                    id: 'hiring_4_role_definition',
                    title: 'Define the role',
                    description: 'What role would best solve this?',
                    type: 'question',
                    status: StepStatus.NOT_STARTED,
                    prompt: 'What type of role would address your biggest pain point?',
                    expectedInput: {
                        type: 'choice',
                        options: [
                            'Salesperson',
                            'Developer',
                            'Customer Success',
                            'Operations Manager',
                            'Designer',
                            'Marketer'
                        ]
                    },
                    estimatedTime: 2
                },
                {
                    id: 'hiring_5_financial_check',
                    title: 'Financial reality check',
                    description: 'Let\'s make sure the numbers work',
                    type: 'review',
                    status: StepStatus.NOT_STARTED,
                    prompt: `Current runway: ${context.financial.runway} months\nMonthly revenue: $${context.financial.monthlyRevenue.toLocaleString()}\nProfit margin: ${context.financial.profitMargin}%`,
                    helpText: 'A new hire typically costs $5K-8K per month total (salary + benefits + overhead)',
                    estimatedTime: 3
                },
                {
                    id: 'hiring_6_decision',
                    title: 'Make the decision',
                    description: 'Based on everything, what\'s your decision?',
                    type: 'decision',
                    status: StepStatus.NOT_STARTED,
                    prompt: 'What do you want to do?',
                    expectedInput: {
                        type: 'choice',
                        options: [
                            'Hire full-time employee now',
                            'Hire contractor/freelancer first',
                            'Wait 2-3 months and reassess',
                            'Find other solutions (automation, process improvements)'
                        ]
                    },
                    estimatedTime: 3
                }
            ]
        };
    }

    /**
     * Build cash flow planning workflow
     */
    buildCashPlanningWorkflow(context: BusinessContext): Workflow {
        const currentBurn = context.financial.monthlyExpenses - context.financial.monthlyRevenue;

        return {
            id: `workflow_cash_planning_${Date.now()}`,
            type: WorkflowType.CASH_PLANNING,
            title: 'Extend Your Cash Runway',
            description: 'Create an action plan to improve your cash position',
            purpose: `You have ${context.financial.runway} months of runway. Let's create a plan to extend it.`,
            estimatedTime: 20,
            currentStepIndex: 0,
            status: 'not_started',
            results: {},
            steps: [
                {
                    id: 'cash_1_goal',
                    title: 'Set runway goal',
                    description: 'How many months of runway do you want?',
                    type: 'question',
                    status: StepStatus.NOT_STARTED,
                    prompt: 'What runway would make you feel comfortable?',
                    expectedInput: {
                        type: 'choice',
                        options: [
                            '6 months (minimum viable)',
                            '12 months (comfortable)',
                            '18+ months (very comfortable)'
                        ]
                    },
                    estimatedTime: 2
                },
                {
                    id: 'cash_2_breakdown',
                    title: 'Understand current burn',
                    description: 'Let\'s break down where money goes',
                    type: 'review',
                    status: StepStatus.NOT_STARTED,
                    prompt: `Monthly burn: $${Math.abs(currentBurn).toLocaleString()}\nMonthly expenses: $${context.financial.monthlyExpenses.toLocaleString()}\nMonthly revenue: $${context.financial.monthlyRevenue.toLocaleString()}`,
                    helpText: 'To extend runway, we need to either increase revenue or decrease expenses',
                    estimatedTime: 2
                },
                {
                    id: 'cash_3_expense_categories',
                    title: 'List major expense categories',
                    description: 'What are your biggest expense buckets?',
                    type: 'input',
                    status: StepStatus.NOT_STARTED,
                    prompt: 'List your top 3-5 expense categories with approximate monthly amounts',
                    expectedInput: {
                        type: 'text'
                    },
                    helpText: 'Examples: Salaries $50K, Software $5K, Office $3K, Marketing $10K',
                    estimatedTime: 5
                },
                {
                    id: 'cash_4_revenue_levers',
                    title: 'Identify revenue opportunities',
                    description: 'How could you increase revenue?',
                    type: 'question',
                    status: StepStatus.NOT_STARTED,
                    prompt: 'Select all revenue opportunities you could pursue',
                    expectedInput: {
                        type: 'multiple_choice',
                        options: [
                            'Reach out to past prospects',
                            'Upsell existing customers',
                            'Raise prices',
                            'Launch new marketing campaign',
                            'Add new product/service',
                            'Reactivate churned customers'
                        ]
                    },
                    estimatedTime: 4
                },
                {
                    id: 'cash_5_expense_cuts',
                    title: 'Identify expense cuts',
                    description: 'What expenses could you reduce?',
                    type: 'question',
                    status: StepStatus.NOT_STARTED,
                    prompt: 'Select all expense reductions you could make',
                    expectedInput: {
                        type: 'multiple_choice',
                        options: [
                            'Cancel unused software subscriptions',
                            'Renegotiate vendor contracts',
                            'Reduce office space',
                            'Pause marketing spend temporarily',
                            'Reduce contractor usage',
                            'Delay non-essential projects'
                        ]
                    },
                    estimatedTime: 4
                },
                {
                    id: 'cash_6_action_plan',
                    title: 'Create action plan',
                    description: 'Pick your top 3 actions to take this month',
                    type: 'action',
                    status: StepStatus.NOT_STARTED,
                    prompt: 'Based on your answers, what 3 actions will you take in the next 30 days?',
                    expectedInput: {
                        type: 'text'
                    },
                    helpText: 'Be specific: "Call 20 past prospects", "Cut $2K in software", "Launch email campaign to existing customers"',
                    estimatedTime: 3
                }
            ]
        };
    }

    /**
     * Build intelligent onboarding workflow
     */
    buildOnboardingWorkflow(): Workflow {
        return {
            id: `workflow_onboarding_${Date.now()}`,
            type: WorkflowType.ONBOARDING,
            title: 'Tell us about your business',
            description: 'Help us understand your business so we can provide relevant insights',
            purpose: 'The more we know about your business, the better guidance we can provide.',
            estimatedTime: 10,
            currentStepIndex: 0,
            status: 'not_started',
            results: {},
            steps: [
                {
                    id: 'onboard_1_basics',
                    title: 'Business basics',
                    description: 'Start with the essentials',
                    type: 'question',
                    status: StepStatus.NOT_STARTED,
                    prompt: 'What type of business do you run?',
                    expectedInput: {
                        type: 'choice',
                        options: [
                            'Service business (consulting, agency, etc)',
                            'Product business (physical or digital products)',
                            'SaaS / Software',
                            'E-commerce / Retail',
                            'Mixed (services and products)'
                        ]
                    },
                    estimatedTime: 1
                },
                {
                    id: 'onboard_2_stage',
                    title: 'Business stage',
                    description: 'Where are you in your journey?',
                    type: 'question',
                    status: StepStatus.NOT_STARTED,
                    prompt: 'What stage is your business in?',
                    expectedInput: {
                        type: 'choice',
                        options: [
                            'Just getting started (0-1 years)',
                            'Finding traction (1-3 years)',
                            'Scaling up (3-5 years)',
                            'Established (5+ years)'
                        ]
                    },
                    estimatedTime: 1
                },
                {
                    id: 'onboard_3_financials',
                    title: 'Financial snapshot',
                    description: 'Help us understand your finances',
                    type: 'input',
                    status: StepStatus.NOT_STARTED,
                    prompt: 'What is your average monthly revenue?',
                    expectedInput: {
                        type: 'number',
                        validation: { min: 0 }
                    },
                    helpText: 'Rough number is fine - we can refine this later',
                    estimatedTime: 1
                },
                {
                    id: 'onboard_4_expenses',
                    title: 'Monthly expenses',
                    description: 'What do you spend per month?',
                    type: 'input',
                    status: StepStatus.NOT_STARTED,
                    prompt: 'What are your average monthly expenses?',
                    expectedInput: {
                        type: 'number',
                        validation: { min: 0 }
                    },
                    helpText: 'Include everything: salaries, software, rent, marketing, etc.',
                    estimatedTime: 1
                },
                {
                    id: 'onboard_5_cash',
                    title: 'Cash position',
                    description: 'How much cash do you have?',
                    type: 'input',
                    status: StepStatus.NOT_STARTED,
                    prompt: 'What is your current cash position?',
                    expectedInput: {
                        type: 'number',
                        validation: { min: 0 }
                    },
                    helpText: 'Total cash in bank accounts',
                    estimatedTime: 1
                },
                {
                    id: 'onboard_6_team',
                    title: 'Team size',
                    description: 'How many people work on the business?',
                    type: 'input',
                    status: StepStatus.NOT_STARTED,
                    prompt: 'How many people (including yourself) work on the business?',
                    expectedInput: {
                        type: 'number',
                        validation: { min: 1 }
                    },
                    estimatedTime: 1
                },
                {
                    id: 'onboard_7_customers',
                    title: 'Customer base',
                    description: 'How many customers do you have?',
                    type: 'input',
                    status: StepStatus.NOT_STARTED,
                    prompt: 'How many active customers do you have?',
                    expectedInput: {
                        type: 'number',
                        validation: { min: 0 }
                    },
                    helpText: 'Active customers who have paid you in the last 3 months',
                    estimatedTime: 1
                },
                {
                    id: 'onboard_8_goal',
                    title: 'Primary goal',
                    description: 'What are you trying to achieve?',
                    type: 'question',
                    status: StepStatus.NOT_STARTED,
                    prompt: 'What is your primary goal for the next 12 months?',
                    expectedInput: {
                        type: 'choice',
                        options: [
                            'Increase revenue',
                            'Improve profitability',
                            'Grow customer base',
                            'Build the team',
                            'Achieve work-life balance'
                        ]
                    },
                    estimatedTime: 2
                }
            ]
        };
    }
}

/**
 * Workflow Orchestrator
 * Manages workflow execution
 */
export class WorkflowOrchestrator {
    private workflows: Map<string, Workflow> = new Map();
    private builder: WorkflowBuilder;

    constructor() {
        this.builder = new WorkflowBuilder();
    }

    /**
     * Start a new workflow
     */
    startWorkflow(type: WorkflowType, context: BusinessContext): Workflow {
        let workflow: Workflow;

        switch (type) {
            case WorkflowType.HIRING:
                workflow = this.builder.buildHiringWorkflow(context);
                break;
            case WorkflowType.CASH_PLANNING:
                workflow = this.builder.buildCashPlanningWorkflow(context);
                break;
            case WorkflowType.ONBOARDING:
                workflow = this.builder.buildOnboardingWorkflow();
                break;
            default:
                throw new Error(`Unsupported workflow type: ${type}`);
        }

        workflow.status = 'in_progress';
        workflow.startedAt = new Date();
        this.workflows.set(workflow.id, workflow);

        return workflow;
    }

    /**
     * Get current step
     */
    getCurrentStep(workflowId: string): WorkflowStep | null {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) return null;

        return workflow.steps[workflow.currentStepIndex];
    }

    /**
     * Submit step response and advance workflow
     */
    submitStep(workflowId: string, stepId: string, response: any): {
        completed: boolean;
        nextStep: WorkflowStep | null;
    } {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error('Workflow not found');
        }

        const step = workflow.steps.find(s => s.id === stepId);
        if (!step) {
            throw new Error('Step not found');
        }

        // Store response
        step.result = response;
        step.status = StepStatus.COMPLETED;
        workflow.results[stepId] = response;

        // Move to next step
        workflow.currentStepIndex++;

        // Check if workflow is complete
        if (workflow.currentStepIndex >= workflow.steps.length) {
            workflow.status = 'completed';
            workflow.completedAt = new Date();
            return {
                completed: true,
                nextStep: null
            };
        }

        // Get next step
        const nextStep = workflow.steps[workflow.currentStepIndex];
        nextStep.status = StepStatus.IN_PROGRESS;

        return {
            completed: false,
            nextStep
        };
    }

    /**
     * Get workflow results
     */
    getResults(workflowId: string): any {
        const workflow = this.workflows.get(workflowId);
        return workflow?.results || {};
    }

    /**
     * Get workflow progress
     */
    getProgress(workflowId: string): {
        completed: number;
        total: number;
        percentage: number;
    } {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            return { completed: 0, total: 0, percentage: 0 };
        }

        const completed = workflow.steps.filter(s =>
            s.status === StepStatus.COMPLETED
        ).length;

        return {
            completed,
            total: workflow.steps.length,
            percentage: (completed / workflow.steps.length) * 100
        };
    }

    /**
     * Resume workflow
     */
    resumeWorkflow(workflowId: string): Workflow | null {
        const workflow = this.workflows.get(workflowId);
        if (!workflow || workflow.status === 'completed') {
            return null;
        }

        workflow.status = 'in_progress';
        return workflow;
    }
}
