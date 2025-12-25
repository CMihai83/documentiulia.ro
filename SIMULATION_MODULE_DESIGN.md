# Business Simulation Module - Technical Design
**Date:** December 25, 2025
**Module:** Simulator de Afaceri (Business Simulator)
**Status:** Implementation Phase

---

## 1. CORE CONCEPT

### Overview
An interactive, game-like business simulation that allows users to:
- Apply knowledge learned from 72 LMS courses (1,856 lessons)
- Use real company data as simulation baseline
- Make strategic decisions across finance, operations, HR, and compliance
- See simulated results over multiple business cycles (months/quarters/years)
- Learn from AI-powered recommendations tied to course content

### Target Users
- New entrepreneurs learning business fundamentals
- Existing business owners testing strategic decisions
- Accounting/finance professionals training on scenarios
- Students studying business administration

---

## 2. SIMULATION ENGINE ARCHITECTURE

### 2.1 Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    SIMULATION ENGINE                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ State Manager │  │ Decision     │  │ Impact       │       │
│  │ (Redux-like) │  │ Processor    │  │ Calculator   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│           │                │                │                │
│           ▼                ▼                ▼                │
│  ┌──────────────────────────────────────────────────┐       │
│  │              Business Model Core                  │       │
│  │  - Financial Model (P&L, Cash Flow, Balance)     │       │
│  │  - Operations Model (Inventory, Capacity)         │       │
│  │  - HR Model (Employees, Productivity)             │       │
│  │  - Market Model (Demand, Competition)             │       │
│  │  - Compliance Model (ANAF, VAT, Deadlines)        │       │
│  └──────────────────────────────────────────────────┘       │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Event        │  │ Random       │  │ Achievement  │       │
│  │ Generator    │  │ Events       │  │ Tracker      │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Simulation Cycle (1 Month = 1 Turn)

1. **Start of Month**: Display current state, pending decisions
2. **Decision Phase**: User makes choices (budget 5-10 decisions/turn)
3. **Processing Phase**: Engine calculates impacts
4. **Event Phase**: Random events occur (market changes, audits, etc.)
5. **Results Phase**: Show outcomes, update scores
6. **Learning Phase**: AI recommendations based on course content

---

## 3. DECISION CATEGORIES & FORMULAS

### 3.1 Financial Decisions

| Decision | Parameters | Impact Formula |
|----------|------------|----------------|
| **Set Prices** | price_change % | revenue = base_revenue × (1 + price_change) × demand_elasticity |
| **Take Loan** | amount, rate, term | monthly_payment = amount × (rate/12) / (1 - (1+rate/12)^-term) |
| **Invest Cash** | amount, type | return = amount × investment_rate × market_factor |
| **Manage Receivables** | collection_effort | cash_in = receivables × (0.6 + 0.4 × collection_effort) |

### 3.2 Operations Decisions

| Decision | Parameters | Impact Formula |
|----------|------------|----------------|
| **Hire Employee** | salary, role | capacity += role_capacity; costs += salary × 1.45 (with taxes) |
| **Buy Equipment** | cost, efficiency | capacity += efficiency × 0.2; depreciation = cost / useful_life |
| **Order Inventory** | quantity, supplier | inventory += quantity; costs += unit_cost × quantity |
| **Marketing Spend** | budget, channel | demand += budget × channel_efficiency × market_saturation |

### 3.3 Compliance Decisions

| Decision | Parameters | Impact Formula |
|----------|------------|----------------|
| **VAT Strategy** | quarterly vs monthly | cash_flow_impact = vat_collected × timing_factor |
| **Tax Optimization** | deductions, credits | tax_liability = profit × rate - deductions - credits |
| **Audit Preparation** | hours_invested | audit_risk = base_risk × (1 - preparation_factor) |

### 3.4 Romanian Market Parameters

```typescript
const ROMANIAN_MARKET = {
  vat_rates: { standard: 0.19, reduced: 0.09, special: 0.05 },
  vat_rates_2025: { standard: 0.21, reduced: 0.11 }, // After Aug 2025
  employer_contributions: 0.2225, // CAS 25%, CASS 10% (employer part)
  employee_contributions: 0.35, // CAS 25%, CASS 10%
  corporate_tax: 0.16,
  micro_tax_rates: { under_500k: 0.01, over_500k: 0.03 },
  minimum_wage: 3700, // RON gross 2025
  inflation_rate: 0.05, // 5% baseline
  interest_rate: 0.07, // BNR reference
  market_growth: 0.03, // 3% GDP growth
};
```

---

## 4. DATABASE SCHEMA

### 4.1 Prisma Schema Additions

```prisma
// Simulation Models

model SimulationGame {
  id              String   @id @default(cuid())
  userId          String
  businessId      String?  // Link to real business for data import
  name            String
  description     String?

  // Game State
  currentMonth    Int      @default(1)
  currentYear     Int      @default(2025)
  status          SimulationStatus @default(ACTIVE)
  difficulty      SimulationDifficulty @default(NORMAL)

  // Scores
  healthScore     Float    @default(100)
  financialScore  Float    @default(100)
  operationsScore Float    @default(100)
  complianceScore Float    @default(100)
  growthScore     Float    @default(100)

  // Relationships
  states          SimulationState[]
  decisions       SimulationDecision[]
  events          SimulationEvent[]
  achievements    SimulationAchievement[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model SimulationState {
  id              String   @id @default(cuid())
  gameId          String
  game            SimulationGame @relation(fields: [gameId], references: [id])

  month           Int
  year            Int

  // Financial State
  cash            Float
  revenue         Float
  expenses        Float
  profit          Float
  receivables     Float
  payables        Float
  inventory       Float
  equipment       Float
  loans           Float

  // Operations State
  employees       Int
  capacity        Float
  utilization     Float
  quality         Float

  // Market State
  marketShare     Float
  customerCount   Int
  reputation      Float

  // Compliance State
  taxOwed         Float
  vatBalance      Float
  penaltiesRisk   Float
  auditRisk       Float

  createdAt       DateTime @default(now())
}

model SimulationDecision {
  id              String   @id @default(cuid())
  gameId          String
  game            SimulationGame @relation(fields: [gameId], references: [id])

  month           Int
  year            Int
  category        DecisionCategory
  type            String
  parameters      Json

  // Impact tracking
  impactSummary   String?
  impactMetrics   Json?

  // Learning connection
  relatedCourseId String?
  relatedLessonId String?
  aiRecommendation String?

  createdAt       DateTime @default(now())
}

model SimulationEvent {
  id              String   @id @default(cuid())
  gameId          String
  game            SimulationGame @relation(fields: [gameId], references: [id])

  month           Int
  year            Int
  type            EventType
  title           String
  description     String
  impact          Json

  // Player response
  playerChoice    String?
  outcome         String?

  createdAt       DateTime @default(now())
}

model SimulationAchievement {
  id              String   @id @default(cuid())
  gameId          String
  game            SimulationGame @relation(fields: [gameId], references: [id])

  achievementId   String
  unlockedAt      DateTime @default(now())

  @@unique([gameId, achievementId])
}

model SimulationScenario {
  id              String   @id @default(cuid())
  slug            String   @unique
  title           String
  description     String
  difficulty      SimulationDifficulty

  // Starting conditions
  initialState    Json
  objectives      Json
  timeLimit       Int?     // months

  // Challenge type
  type            ScenarioType

  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
}

enum SimulationStatus {
  ACTIVE
  PAUSED
  COMPLETED
  FAILED
}

enum SimulationDifficulty {
  TUTORIAL
  EASY
  NORMAL
  HARD
  EXPERT
}

enum DecisionCategory {
  FINANCIAL
  OPERATIONS
  HR
  MARKETING
  COMPLIANCE
  GROWTH
  RISK
}

enum EventType {
  MARKET_CHANGE
  REGULATION_CHANGE
  ECONOMIC_SHOCK
  OPPORTUNITY
  CRISIS
  AUDIT
  CUSTOMER_EVENT
  EMPLOYEE_EVENT
}

enum ScenarioType {
  FREEPLAY
  CHALLENGE
  TUTORIAL
  CRISIS_SURVIVAL
  GROWTH_RACE
}
```

---

## 5. SIMULATION SCENARIOS (Pre-built)

### 5.1 Tutorial Scenarios

1. **Prima Mea Firmă** (My First Company)
   - Start: New SRL with €10,000 capital
   - Goal: Survive 12 months, reach profitability
   - Teaches: Basic operations, cash flow, compliance

2. **Primii Angajați** (First Employees)
   - Start: Solo business ready to hire
   - Goal: Build team of 5, maintain productivity
   - Teaches: HR decisions, payroll, labor law

### 5.2 Challenge Scenarios

1. **Supraviețuirea Crizei** (Crisis Survival)
   - Start: Business hit by 40% revenue drop
   - Goal: Survive 6 months, recover to 80% revenue
   - Random events: Supply disruptions, client losses

2. **Creștere Rapidă** (Rapid Growth)
   - Start: Business with sudden 3x demand
   - Goal: Scale operations without quality drop
   - Challenges: Hiring, capacity, cash flow

3. **Audit ANAF** (ANAF Audit)
   - Start: Business with compliance gaps
   - Goal: Pass audit with minimal penalties
   - Teaches: Compliance, documentation, SAF-T

4. **Expansiune Regională** (Regional Expansion)
   - Start: Local business ready to expand
   - Goal: Open 3 new locations in 24 months
   - Challenges: Financing, management, logistics

---

## 6. GAMIFICATION SYSTEM

### 6.1 Business Health Score (0-100)

```typescript
const calculateHealthScore = (state: SimulationState) => {
  const financial = calculateFinancialHealth(state); // 30%
  const operations = calculateOperationsHealth(state); // 25%
  const compliance = calculateComplianceHealth(state); // 20%
  const growth = calculateGrowthHealth(state); // 15%
  const risk = calculateRiskHealth(state); // 10%

  return (
    financial * 0.30 +
    operations * 0.25 +
    compliance * 0.20 +
    growth * 0.15 +
    risk * 0.10
  );
};
```

### 6.2 Achievements (Badges)

| Badge | Requirement | Related Course |
|-------|-------------|----------------|
| 🏆 Antreprenor Începător | Complete tutorial | Ghid Complet Înființare |
| 💰 Cash Flow Master | 6 months positive cash flow | Plan de Afaceri |
| 📋 Compliance Champion | 12 months no penalties | Conformitate Legală |
| 👥 Team Builder | Hire 10 employees | HR Management |
| 📈 Growth Hacker | 100% revenue growth | Marketing Digital |
| 🛡️ Risk Manager | Survive crisis scenario | Risk Management |
| 🎯 Strategic Thinker | Complete 5 scenarios | All courses |

### 6.3 Leaderboards (Optional)

- **Highest Health Score** (anonymized by default)
- **Fastest Scenario Completion**
- **Most Challenges Completed**
- **Longest Survival Streak**

---

## 7. AI RECOMMENDATIONS ENGINE

### 7.1 Course-Linked Recommendations

```typescript
interface AIRecommendation {
  decision: string;
  recommendation: string;
  confidence: number;
  relatedCourse: {
    id: string;
    title: string;
    lessonId: string;
    lessonTitle: string;
  };
  explanation: string;
}

const getRecommendation = async (
  gameState: SimulationState,
  pendingDecision: DecisionType
): Promise<AIRecommendation> => {
  // Analyze current state
  const analysis = analyzeState(gameState);

  // Match to course content
  const relevantCourses = findRelevantCourses(pendingDecision);

  // Generate recommendation
  return {
    decision: pendingDecision,
    recommendation: generateRecommendation(analysis, relevantCourses),
    confidence: calculateConfidence(analysis),
    relatedCourse: relevantCourses[0],
    explanation: generateExplanation(analysis, relevantCourses),
  };
};
```

### 7.2 Learning Integration

- **Pre-Decision Tips**: Show relevant course excerpts before decisions
- **Post-Decision Analysis**: Explain why outcomes occurred, link to lessons
- **Skill Gaps**: Identify courses user should complete based on poor decisions
- **Mastery Tracking**: Track which concepts user has applied successfully

---

## 8. MVP IMPLEMENTATION SCOPE

### Phase 1: Core Engine (This Sprint)
- [x] Database schema
- [ ] Simulation state management
- [ ] Basic decision processing
- [ ] Financial model (P&L, cash flow)
- [ ] Tutorial scenario
- [ ] Basic UI with decisions and results

### Phase 2: Full Features (Next Sprint)
- [ ] All decision categories
- [ ] Random events system
- [ ] Achievement system
- [ ] 4 challenge scenarios
- [ ] AI recommendations
- [ ] Real company data import

### Phase 3: Advanced (Future)
- [ ] Multiplayer scenarios
- [ ] Custom scenario builder
- [ ] API for external simulations
- [ ] Mobile app version
- [ ] VR/AR visualization

---

## 9. FRONTEND COMPONENTS

### 9.1 Page Structure

```
/simulation
├── /page.tsx                    # Simulation dashboard, game list
├── /new/page.tsx               # Create new simulation
├── /[gameId]/page.tsx          # Active simulation game
├── /[gameId]/decisions/page.tsx # Decision making interface
├── /[gameId]/results/page.tsx   # Results and analytics
├── /scenarios/page.tsx          # Scenario library
└── /leaderboard/page.tsx        # Leaderboards
```

### 9.2 Key Components

- `SimulationDashboard`: Health scores, quick actions
- `DecisionPanel`: Category tabs, decision cards
- `ImpactPreview`: Real-time impact visualization
- `TimelineView`: Historical decisions and events
- `FinancialChart`: P&L, cash flow, balance sheet
- `EventModal`: Random events with choices
- `AchievementToast`: Badge unlocks
- `AIAdvisor`: Course-linked recommendations

---

*Generated for DocumentIulia.ro Sprint 25*
*Simulator de Afaceri - Learn by Doing*
