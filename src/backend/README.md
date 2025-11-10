# Logic Engine Backend

This directory contains the intelligent backend that powers the "accounting that thinks with you" platform.

## Architecture Overview

The Logic Engine is designed to work fully without AI, but has clear integration hooks for AI enhancement. It provides:

- **Question-driven workflows**: Asks the right questions at the right time
- **Decision support**: Context-aware guidance at decision points
- **Proactive insights**: Surfaces opportunities and concerns automatically
- **Guided processes**: Makes complex business tasks feel simple

## Directory Structure

```
backend/
├── models/              # Data models and business context
│   └── BusinessContext.ts    # The "brain" - living business model
├── engine/              # Core intelligence engines
│   ├── QuestionEngine.ts     # Determines what to ask and when
│   ├── DecisionSupport.ts    # Provides decision guidance
│   └── InsightGenerator.ts   # Surfaces proactive insights
├── workflows/           # Guided workflow implementations
│   └── WorkflowOrchestrator.ts  # Manages multi-step processes
└── services/            # External integrations (future)
```

## Core Components

### 1. Business Context Model

**File**: `models/BusinessContext.ts`

The living "brain" of the system that learns about the business over time.

**Key Features**:
- Stores business profile, financial state, operations data
- Learns user patterns (decision style, risk tolerance, preferences)
- Tracks information gaps and completion score
- Evolves based on user interactions

**Usage Example**:
```typescript
import { BusinessContextManager } from './models/BusinessContext';

const contextManager = new BusinessContextManager({
    business: {
        id: 'biz_123',
        name: 'Acme Consulting',
        type: BusinessType.SERVICE,
        industry: Industry.CONSULTING,
        stage: BusinessStage.GROWTH
    },
    financial: {
        currentCashPosition: 120000,
        monthlyRevenue: 45000,
        monthlyExpenses: 38000,
        runway: 17,
        profitMargin: 15.5,
        cashFlowTrend: Trend.UP
    }
});

// Update with new information
contextManager.updateContext({
    financial: {
        ...context.financial,
        monthlyRevenue: 48000
    }
});

// Learn from user behavior
contextManager.learnFromInteraction({
    type: 'decision_made',
    data: { decision: 'hired_contractor', timeToDecide: 2 },
    responseTime: 3
});
```

### 2. Question Engine

**File**: `engine/QuestionEngine.ts`

Determines what question to ask next based on business context.

**How It Works**:
1. Analyzes current business state
2. Identifies critical information gaps
3. Detects decision points requiring user input
4. Scans for optimization opportunities
5. (Optional) Uses AI for sophisticated question selection
6. Generates learning questions to improve context

**Key Methods**:
- `getNextQuestion(context)`: Returns next question or null
- `identifyInformationGaps(context)`: Finds missing critical data
- `detectDecisionPoints(context, state)`: Identifies when guidance is needed

**Usage Example**:
```typescript
import { QuestionEngine } from './engine/QuestionEngine';

const engine = new QuestionEngine();
const question = await engine.getNextQuestion(context);

if (question) {
    console.log(question.text);
    // "Your cash runway is 8 months. Would you like to create a plan to extend it?"
    console.log(question.context);
    // "At your current burn rate of $7,000/month, you have limited runway..."
}
```

### 3. Decision Support System

**File**: `engine/DecisionSupport.ts`

Provides context-aware guidance when users face important decisions.

**Features**:
- Generates decision options with pros/cons
- Calculates impact on key metrics
- Provides rules-based recommendations
- (Optional) AI-enhanced recommendations

**Supported Decision Types**:
- Hiring decisions
- Cost cutting scenarios
- Pricing reviews
- Investment decisions
- Expansion opportunities

**Usage Example**:
```typescript
import { DecisionSupportEngine, DecisionType } from './engine/DecisionSupport';

const decisionEngine = new DecisionSupportEngine();
const decision = await decisionEngine.generateDecision(
    DecisionType.HIRING,
    context
);

// Returns decision with 2-3 options, each with:
// - Impact analysis (financial, risk, timeframe)
// - Pros and cons
// - Requirements
// - Estimated costs/returns
// - Recommended approach
```

### 4. Insight Generator

**File**: `engine/InsightGenerator.ts`

Proactively surfaces valuable business insights without being asked.

**Pattern Detection**:
- Revenue trends (growth, decline, stability)
- Efficiency patterns (team utilization, revenue per employee)
- Customer patterns (churn, growth)
- Cash flow patterns (runway, burn rate)

**Insight Types**:
- **Opportunities**: "Team capacity available - 40% unutilized"
- **Warnings**: "Cash runway shrinking - only 5 months left"
- **Achievements**: "Revenue growing 25% month-over-month"
- **Trends**: "Customer churn increasing - up to 22%"

**Usage Example**:
```typescript
import { InsightGenerator } from './engine/InsightGenerator';

const insightGen = new InsightGenerator();
const insights = await insightGen.generate(context);

// Returns prioritized array of insights:
// [
//   {
//     title: "⚠️ Cash runway shrinking",
//     priority: "critical",
//     recommendations: ["Create cash flow projection", "Identify cost cuts", ...],
//     relatedMetrics: ["cash_runway", "monthly_burn"]
//   },
//   ...
// ]
```

### 5. Workflow Orchestrator

**File**: `workflows/WorkflowOrchestrator.ts`

Guides users through complex multi-step processes.

**Available Workflows**:
- **Onboarding**: Learn about business (8 steps, ~10 min)
- **Hiring Decision**: Should you hire? (6 steps, ~15 min)
- **Cash Planning**: Extend runway (6 steps, ~20 min)
- **Pricing Review**: Optimize pricing
- **Goal Setting**: Define and track goals

**Usage Example**:
```typescript
import { WorkflowOrchestrator, WorkflowType } from './workflows/WorkflowOrchestrator';

const orchestrator = new WorkflowOrchestrator();

// Start workflow
const workflow = orchestrator.startWorkflow(WorkflowType.HIRING, context);

// Get current step
const step = orchestrator.getCurrentStep(workflow.id);
console.log(step.prompt);
// "What is your team struggling with most?"

// Submit user response
const { completed, nextStep } = orchestrator.submitStep(
    workflow.id,
    step.id,
    'Too many projects, not enough people'
);

if (!completed && nextStep) {
    console.log(nextStep.prompt);
    // Move to next step
}

// Get final results
if (completed) {
    const results = orchestrator.getResults(workflow.id);
    // Contains all collected data from workflow
}
```

## AI Integration Points

The system is designed to work fully without AI, but has clear hooks for AI enhancement:

### AIQuestionSelector
```typescript
interface AIQuestionSelector {
    suggestQuestion(context, state): Promise<Question | null>;
    scoreQuestions(questions, context): Promise<Question[]>;
}
```

### AIRecommender
```typescript
interface AIRecommender {
    suggest(decision, context): Promise<Recommendation[]>;
    analyzeOptions(options, context): Promise<DecisionOption[]>;
}
```

### AIInsightEngine
```typescript
interface AIInsightEngine {
    generate(context): Promise<Insight[]>;
    predictTrends(context, timeframe): Promise<Prediction[]>;
    findAnomalies(context): Promise<Anomaly[]>;
}
```

## Implementation Phases

### Phase 1: Rules-Based Intelligence (No AI)
- ✅ Business Context Model
- ✅ Question Engine with rule-based logic
- ✅ Decision Support with standard scenarios
- ✅ Insight Generator with pattern detection
- ✅ Workflow Orchestrator with guided processes

### Phase 2: AI Enhancement (Future)
- Integrate AI question selection
- Add AI-powered recommendations
- Implement predictive analytics
- Natural language processing for inputs
- Anomaly detection

### Phase 3: Advanced Features (Future)
- Multi-business benchmarking
- Industry-specific workflows
- Collaborative decision making
- Integration with accounting software
- Advanced forecasting

## Design Principles

1. **Intelligence Through Questions**: Don't bombard with data - ask targeted questions
2. **Progressive Disclosure**: Show complexity only when needed
3. **Context-Aware**: Everything adapts to business state
4. **Action-Oriented**: Every insight includes recommendations
5. **Human-Friendly**: Use plain language, not jargon
6. **AI-Ready**: Clear integration points, fully functional without AI

## Testing Approach

Each component should be tested with:

1. **Unit Tests**: Test individual methods
2. **Integration Tests**: Test component interactions
3. **Scenario Tests**: Test realistic business scenarios
4. **User Flow Tests**: Test complete workflows

Example test scenarios:
- Business with 3 months runway → Should trigger critical warnings
- High team utilization + strong growth → Should suggest hiring
- Low utilization → Should suggest capacity usage
- Declining revenue → Should trigger analysis workflow

## Next Steps

1. **Database Schema**: Design schema for storing contexts, insights, decisions
2. **API Layer**: Create REST/GraphQL API for frontend
3. **Real-Time Updates**: Implement websockets for live insights
4. **Data Integration**: Connect to accounting systems
5. **AI Integration**: Implement AI enhancement interfaces
6. **User Feedback Loop**: Track which insights/recommendations are useful

## Contributing

When adding new features:

1. Start with rules-based logic that works without AI
2. Define clear AI integration interfaces
3. Test with realistic business scenarios
4. Document the business logic and reasoning
5. Keep the user experience simple

## Questions?

This backend represents a fundamental shift from "show all the data" to "ask the right questions". Each component is designed to make business owners feel supported, not overwhelmed.
