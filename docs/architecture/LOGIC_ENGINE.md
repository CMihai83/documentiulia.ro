# Logic Engine Architecture

## Philosophy: Intelligence Through Questions, Not Complexity

The Logic Engine operates on a fundamental principle: **Ask the right questions at the right time, make complexity invisible.**

Users interact with a simple, familiar accounting interface. Behind the scenes, the Logic Engine:
- Learns business context through natural interactions
- Asks targeted questions at decision points
- Provides insights based on business state
- Guides users toward optimal decisions
- Prepares hooks for future AI enhancement

---

## Core Architecture

### 1. Business Context Model

The foundation of everything - a living model of the business that grows through use.

```typescript
// Business Context - The Brain of the System
interface BusinessContext {
  // Identity
  business: {
    id: string;
    name: string;
    type: BusinessType; // Service, Product, Mixed
    industry: Industry;
    stage: BusinessStage; // Startup, Growth, Mature
    setupComplete: boolean;
  };

  // Financial State
  financial: {
    currentCashPosition: number;
    monthlyRevenue: number;
    monthlyExpenses: number;
    runway: number; // months
    profitMargin: number;
    cashFlowTrend: Trend;
  };

  // Operational State
  operations: {
    employees: number;
    contractors: number;
    customers: number;
    suppliers: number;
    activeProjects: number;
  };

  // Behavioral Patterns (learned over time)
  patterns: {
    decisionStyle: DecisionStyle; // Data-driven, Intuitive, Consultative
    riskTolerance: RiskLevel;
    responseToPrompts: PromptPreferences;
    commonQuestions: string[];
    painPoints: string[];
  };

  // Current Focus (what user is working on)
  currentContext: {
    page: string;
    task: Task;
    concernsDetected: Concern[];
    opportunitiesDetected: Opportunity[];
  };
}
```

### 2. Question Engine

The heart of the Logic Engine - knows what to ask, when, and why.

```typescript
class QuestionEngine {
  // Question Registry - all possible questions categorized
  private questionRegistry: Map<QuestionCategory, Question[]>;

  // Context Analyzer - determines what's relevant now
  private contextAnalyzer: ContextAnalyzer;

  // AI Hook - where AI will enhance question selection
  private aiEnhancer?: AIQuestionSelector;

  /**
   * Core method: Determine what question to ask right now
   */
  async getNextQuestion(context: BusinessContext): Promise<Question | null> {
    // 1. Analyze current business state
    const state = this.contextAnalyzer.analyze(context);

    // 2. Check if we have critical information gaps
    const gaps = this.identifyInformationGaps(context);
    if (gaps.critical.length > 0) {
      return this.prioritizeQuestion(gaps.critical);
    }

    // 3. Check for decision points requiring input
    const decisions = this.detectDecisionPoints(context);
    if (decisions.length > 0) {
      return this.formulateDecisionQuestion(decisions[0]);
    }

    // 4. Look for optimization opportunities
    const opportunities = this.scanForOpportunities(context);
    if (opportunities.length > 0) {
      return this.craftOpportunityQuestion(opportunities[0]);
    }

    // 5. AI Enhancement (when available)
    if (this.aiEnhancer) {
      return await this.aiEnhancer.suggestQuestion(context, state);
    }

    return null; // No questions needed right now
  }

  /**
   * Information Gap Detection
   * Essential data we need but don't have
   */
  private identifyInformationGaps(context: BusinessContext): InformationGaps {
    const gaps: InformationGaps = { critical: [], important: [], nice: [] };

    // Critical: Can't operate without this
    if (!context.business.type) {
      gaps.critical.push({
        field: 'business.type',
        question: "What best describes your business?",
        options: ["Service-based", "Product-based", "Both"],
        why: "Understanding your business model helps us ask relevant questions"
      });
    }

    if (!context.financial.currentCashPosition) {
      gaps.critical.push({
        field: 'financial.currentCashPosition',
        question: "What's your current cash position?",
        type: 'number',
        why: "This helps us alert you to cash flow concerns"
      });
    }

    // Important: Significantly improves guidance
    if (context.operations.employees > 0 && !context.patterns.riskTolerance) {
      gaps.important.push({
        field: 'patterns.riskTolerance',
        question: "How do you approach business decisions?",
        options: ["Conservative - avoid risks", "Balanced - calculated risks", "Aggressive - high growth focus"],
        why: "This helps us tailor recommendations to your style"
      });
    }

    return gaps;
  }

  /**
   * Decision Point Detection
   * User needs guidance on a choice
   */
  private detectDecisionPoints(context: BusinessContext): DecisionPoint[] {
    const decisions: DecisionPoint[] = [];

    // Cash flow decision
    if (context.financial.runway < 6) {
      decisions.push({
        type: 'financial',
        severity: 'high',
        decision: 'cash_preservation',
        question: "Your runway is under 6 months. What's your plan?",
        options: [
          { value: 'reduce_expenses', label: "Cut expenses aggressively", impact: "Extends runway" },
          { value: 'increase_revenue', label: "Focus on revenue growth", impact: "Higher risk, higher reward" },
          { value: 'raise_capital', label: "Seek additional funding", impact: "Dilution but more time" },
          { value: 'combination', label: "Combination approach", impact: "Balanced strategy" }
        ],
        followUp: (answer) => this.generateCashFlowPlan(answer, context)
      });
    }

    // Hiring decision
    if (context.financial.profitMargin > 0.3 && context.operations.employees < 10) {
      decisions.push({
        type: 'operations',
        severity: 'medium',
        decision: 'team_expansion',
        question: "You're profitable. Ready to hire?",
        options: [
          { value: 'hire_now', label: "Yes, we need help", leads: "hiring_workflow" },
          { value: 'wait', label: "Not yet", leads: "ask_what_blocking" },
          { value: 'outsource', label: "Prefer contractors", leads: "contractor_setup" }
        ]
      });
    }

    return decisions;
  }

  /**
   * Opportunity Scanning
   * Proactive suggestions based on patterns
   */
  private scanForOpportunities(context: BusinessContext): Opportunity[] {
    const opportunities: Opportunity[] = [];

    // Tax optimization opportunity
    if (context.financial.monthlyExpenses > 10000 && !context.business.taxStrategy) {
      opportunities.push({
        type: 'financial',
        category: 'tax_optimization',
        title: "Potential tax savings detected",
        description: "Based on your expense level, we see opportunities for tax optimization",
        question: "Want to explore tax-saving strategies?",
        estimatedImpact: { min: 2000, max: 5000, unit: "USD/year" },
        effort: "low",
        timeframe: "quarterly"
      });
    }

    // Invoice automation opportunity
    if (context.operations.customers > 5 && context.patterns.commonQuestions.includes("invoice")) {
      opportunities.push({
        type: 'automation',
        category: 'invoicing',
        title: "Automate recurring invoices?",
        description: "You're creating similar invoices repeatedly",
        question: "Would you like to set up automatic invoicing?",
        estimatedImpact: { min: 5, max: 10, unit: "hours/month saved" },
        effort: "low",
        timeframe: "immediate"
      });
    }

    return opportunities;
  }
}
```

### 3. Decision Support System

Provides context-aware guidance at every decision point.

```typescript
class DecisionSupportSystem {
  /**
   * Generate decision support panel for current context
   */
  async generateSupport(context: BusinessContext, decision: Decision): Promise<DecisionSupport> {
    const support: DecisionSupport = {
      decision: decision,
      analysis: await this.analyzeDecision(decision, context),
      recommendations: await this.generateRecommendations(decision, context),
      risks: await this.identifyRisks(decision, context),
      opportunities: await this.identifyOpportunities(decision, context),
      similarCases: await this.findSimilarCases(decision, context) // AI Hook
    };

    return support;
  }

  /**
   * Rules-Based Analysis (AI will enhance this)
   */
  private async analyzeDecision(decision: Decision, context: BusinessContext): Promise<Analysis> {
    // Example: Hiring decision analysis
    if (decision.type === 'hiring') {
      return {
        currentState: {
          cashReserves: context.financial.currentCashPosition,
          monthlyBurn: context.financial.monthlyExpenses,
          runway: context.financial.runway,
          teamSize: context.operations.employees
        },
        implications: {
          cost: {
            immediate: decision.salary * 1.3, // salary + benefits
            monthly: decision.salary / 12 * 1.3,
            annual: decision.salary * 1.3
          },
          runwayImpact: this.calculateRunwayImpact(decision, context),
          breakeven: this.calculateBreakevenRevenue(decision, context)
        },
        factors: [
          {
            factor: "Cash runway",
            status: context.financial.runway > 12 ? "healthy" : "concerning",
            weight: "critical"
          },
          {
            factor: "Revenue trend",
            status: context.financial.cashFlowTrend === "increasing" ? "positive" : "watch",
            weight: "high"
          }
        ]
      };
    }

    return { /* ... */ };
  }

  /**
   * Generate Recommendations
   * Rules-based initially, AI-enhanced later
   */
  private async generateRecommendations(
    decision: Decision,
    context: BusinessContext
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Rule: If cash runway < 12 months, be conservative
    if (context.financial.runway < 12 && decision.type === 'hiring') {
      recommendations.push({
        type: 'caution',
        title: "Consider your runway",
        message: "With under 12 months of runway, ensure this hire directly impacts revenue",
        action: "Review revenue projections with this hire included",
        priority: "high"
      });
    }

    // Rule: If profit margin high, invest in growth
    if (context.financial.profitMargin > 0.3 && decision.type === 'hiring') {
      recommendations.push({
        type: 'opportunity',
        title: "Strong position to invest",
        message: "Your profit margin supports strategic hires",
        action: "Consider hiring for high-impact roles",
        priority: "medium"
      });
    }

    // AI Hook: This is where AI will add nuanced, context-aware recommendations
    if (this.aiRecommender) {
      const aiRecs = await this.aiRecommender.suggest(decision, context);
      recommendations.push(...aiRecs);
    }

    return recommendations;
  }
}
```

### 4. Insight Generator

Surfaces valuable insights without being asked.

```typescript
class InsightGenerator {
  /**
   * Generate contextual insights for dashboard
   */
  async generateInsights(context: BusinessContext): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Financial insights
    insights.push(...await this.financialInsights(context));

    // Operational insights
    insights.push(...await this.operationalInsights(context));

    // Pattern-based insights
    insights.push(...await this.patternInsights(context));

    // AI-generated insights (when available)
    if (this.aiInsightEngine) {
      insights.push(...await this.aiInsightEngine.generate(context));
    }

    // Rank by relevance and urgency
    return this.rankInsights(insights, context);
  }

  /**
   * Financial Insights (Rules-Based)
   */
  private async financialInsights(context: BusinessContext): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Cash flow trending
    if (context.financial.cashFlowTrend === 'declining') {
      const projected = this.projectCashPosition(context, 90);
      insights.push({
        type: 'warning',
        category: 'cash_flow',
        title: "Cash flow declining",
        message: `At current trend, you'll be at $${projected.toLocaleString()} in 90 days`,
        actions: [
          { label: "Review expenses", link: "/expenses" },
          { label: "Accelerate collections", link: "/invoices?status=overdue" },
          { label: "Create cash flow plan", link: "/planning/cashflow" }
        ],
        priority: 'high',
        seenAt: null
      });
    }

    // Profit margin improvement
    const avgMargin = this.getIndustryAverage(context.business.industry, 'profitMargin');
    if (context.financial.profitMargin > avgMargin * 1.2) {
      insights.push({
        type: 'success',
        category: 'profitability',
        title: "Profit margin above industry average",
        message: `Your ${(context.financial.profitMargin * 100).toFixed(1)}% margin beats industry average of ${(avgMargin * 100).toFixed(1)}%`,
        actions: [
          { label: "See breakdown", link: "/reports/profitability" },
          { label: "Compare trends", link: "/reports/benchmarks" }
        ],
        priority: 'low',
        seenAt: null
      });
    }

    return insights;
  }

  /**
   * Pattern-Based Insights
   * Learn from user behavior
   */
  private async patternInsights(context: BusinessContext): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Detect repetitive tasks
    if (context.patterns.commonQuestions.filter(q => q.includes("invoice")).length > 10) {
      insights.push({
        type: 'opportunity',
        category: 'automation',
        title: "Automate recurring invoices?",
        message: "You've created 10+ similar invoices. We can automate this.",
        actions: [
          { label: "Set up automation", link: "/settings/automation/invoices" },
          { label: "Learn more", link: "/help/recurring-invoices" }
        ],
        priority: 'medium',
        seenAt: null
      });
    }

    return insights;
  }
}
```

### 5. Workflow Orchestrator

Guides users through complex processes with smart questions.

```typescript
class WorkflowOrchestrator {
  /**
   * Start a workflow, asking questions as needed
   */
  async startWorkflow(
    workflowType: WorkflowType,
    context: BusinessContext
  ): Promise<WorkflowSession> {
    const workflow = this.getWorkflow(workflowType);
    const session: WorkflowSession = {
      id: generateId(),
      workflowType,
      context,
      currentStep: 0,
      data: {},
      startedAt: new Date()
    };

    // Determine first step based on context
    const firstStep = await this.determineFirstStep(workflow, context);
    session.currentStep = firstStep;

    return session;
  }

  /**
   * Example: Hiring Workflow
   */
  private hiringWorkflow: Workflow = {
    id: 'hiring',
    name: 'Hire New Employee',
    steps: [
      {
        id: 'validate_need',
        type: 'decision',
        question: "Why do you need this hire?",
        options: [
          { value: 'overworked', label: "Current team is overworked", leads: 'capacity_analysis' },
          { value: 'new_capability', label: "Need new capability", leads: 'role_definition' },
          { value: 'growth', label: "Preparing for growth", leads: 'growth_plan_check' },
          { value: 'replacement', label: "Replacing someone", leads: 'replacement_flow' }
        ],
        aiHook: 'suggest_alternative' // AI might suggest contractor, automation, etc.
      },
      {
        id: 'capacity_analysis',
        type: 'analysis',
        run: async (context, data) => {
          // Analyze current team capacity
          const analysis = await this.analyzeTeamCapacity(context);
          return {
            recommendation: analysis.shouldHire ? 'proceed' : 'optimize_current',
            reasoning: analysis.reasoning,
            alternatives: analysis.alternatives
          };
        }
      },
      {
        id: 'role_definition',
        type: 'form',
        fields: [
          { name: 'title', type: 'text', label: "Job title", required: true },
          { name: 'salary_range', type: 'range', label: "Salary range", required: true },
          { name: 'start_date', type: 'date', label: "Target start date" },
          { name: 'responsibilities', type: 'textarea', label: "Key responsibilities" }
        ],
        aiHook: 'suggest_salary_range' // AI suggests based on market data
      },
      {
        id: 'financial_impact',
        type: 'analysis',
        run: async (context, data) => {
          // Calculate financial impact
          const impact = this.calculateHiringImpact(data.salary_range, context);

          // Show decision support
          return {
            monthlyImpact: impact.monthly,
            runwayImpact: impact.runwayReduction,
            breakeven: impact.revenueNeeded,
            recommendation: impact.recommended,
            concerns: impact.concerns
          };
        }
      },
      {
        id: 'final_decision',
        type: 'decision',
        question: "Ready to proceed?",
        showSummary: true,
        options: [
          { value: 'proceed', label: "Yes, start hiring process", leads: 'create_job_posting' },
          { value: 'reconsider', label: "Let me think about it", leads: 'save_draft' },
          { value: 'adjust', label: "Adjust parameters", leads: 'role_definition' }
        ]
      }
    ]
  };
}
```

---

## AI Integration Points (Future)

The system is designed with clear AI integration points that enhance but don't replace the rules-based logic:

### 1. Question Enhancement
```typescript
interface AIQuestionSelector {
  /**
   * AI suggests best question given context
   * Falls back to rules if AI unavailable
   */
  suggestQuestion(
    context: BusinessContext,
    state: AnalyzedState
  ): Promise<Question>;
}
```

### 2. Recommendation Enhancement
```typescript
interface AIRecommender {
  /**
   * AI provides nuanced recommendations
   * Augments rules-based recommendations
   */
  suggest(
    decision: Decision,
    context: BusinessContext
  ): Promise<Recommendation[]>;
}
```

### 3. Insight Generation
```typescript
interface AIInsightEngine {
  /**
   * AI discovers non-obvious patterns
   * Added to rules-based insights
   */
  generate(context: BusinessContext): Promise<Insight[]>;
}
```

### 4. Natural Language Processing
```typescript
interface AINLPEngine {
  /**
   * User asks questions in natural language
   * AI interprets and routes to appropriate workflow
   */
  interpret(
    query: string,
    context: BusinessContext
  ): Promise<Intent>;
}
```

---

## Key Principles

1. **Questions Over Complexity**: Ask clear questions instead of showing complex options
2. **Context-Aware**: Every interaction considers full business context
3. **Progressive Disclosure**: Show information when needed, not all at once
4. **Guided Workflows**: Complex tasks broken into simple steps
5. **Proactive Insights**: Surface relevant information without being asked
6. **Decision Support**: Help make better decisions, don't make decisions for users
7. **Learn Over Time**: System gets smarter as it learns the business
8. **AI-Ready**: Clear integration points for AI without depending on it

---

## Implementation Phases

### Phase 1: Rules-Based Logic Engine (No AI)
- Business context model
- Question engine with rules-based selection
- Decision support with template analysis
- Workflow orchestration
- Insight generation from patterns
- **Status**: Fully functional, no AI required

### Phase 2: AI Enhancement
- AI-powered question selection
- Nuanced recommendations
- Pattern discovery
- Natural language understanding
- Predictive insights

### Phase 3: Advanced AI
- Deep learning from usage patterns
- Industry benchmarking
- Scenario simulation
- Automated decision-making (with approval)

---

**Next**: Build the simple, clean UI that uses this powerful backend.
