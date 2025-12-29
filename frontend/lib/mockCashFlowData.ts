/**
 * Mock data for Cash Flow Forecasting
 * Simulates historical transactions, AI predictions, and anomaly detection
 */

export interface CashFlowDataPoint {
  month: string;
  date: Date;
  inflow: number;
  outflow: number;
  balance: number;
  isHistorical: boolean;
  isPredicted?: boolean;
  confidenceLower?: number;
  confidenceUpper?: number;
}

export interface CashFlowInsight {
  id: string;
  type: 'positive' | 'warning' | 'alert' | 'info';
  category: 'trend' | 'seasonality' | 'risk' | 'opportunity';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  recommendation?: string;
}

export interface SeasonalPattern {
  month: string;
  avgInflow: number;
  avgOutflow: number;
  variance: number;
}

export interface AnomalyDetection {
  date: Date;
  type: 'spike' | 'drop' | 'unusual_pattern';
  severity: 'high' | 'medium' | 'low';
  description: string;
  expectedValue: number;
  actualValue: number;
}

export interface ScenarioVariable {
  id: string;
  name: string;
  currentValue: number;
  min: number;
  max: number;
  unit: string;
  description: string;
}

// Generate historical data (past 12 months)
const generateHistoricalData = (): CashFlowDataPoint[] => {
  const data: CashFlowDataPoint[] = [];
  const now = new Date();
  let balance = 150000; // Starting balance

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = date.toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' });

    // Seasonal patterns
    const monthIndex = date.getMonth();
    const seasonalFactor = 1 + Math.sin((monthIndex / 12) * Math.PI * 2) * 0.3;

    // Random variation
    const randomFactor = 0.85 + Math.random() * 0.3;

    const baseInflow = 85000;
    const baseOutflow = 65000;

    const inflow = Math.round(baseInflow * seasonalFactor * randomFactor);
    const outflow = Math.round(baseOutflow * seasonalFactor * randomFactor * 0.95);

    balance = balance + inflow - outflow;

    data.push({
      month: monthName,
      date,
      inflow,
      outflow,
      balance,
      isHistorical: true,
    });
  }

  return data;
};

// Generate AI predictions (next 6 months)
const generatePredictions = (historicalData: CashFlowDataPoint[]): CashFlowDataPoint[] => {
  const predictions: CashFlowDataPoint[] = [];
  const lastDataPoint = historicalData[historicalData.length - 1];
  let balance = lastDataPoint.balance;

  // Calculate trend from historical data
  const recentData = historicalData.slice(-6);
  const avgInflow = recentData.reduce((sum, d) => sum + d.inflow, 0) / recentData.length;
  const avgOutflow = recentData.reduce((sum, d) => sum + d.outflow, 0) / recentData.length;
  const growthRate = 1.05; // 5% growth prediction

  for (let i = 1; i <= 6; i++) {
    const date = new Date(lastDataPoint.date.getFullYear(), lastDataPoint.date.getMonth() + i, 1);
    const monthName = date.toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' });

    // Seasonal adjustment
    const monthIndex = date.getMonth();
    const seasonalFactor = 1 + Math.sin((monthIndex / 12) * Math.PI * 2) * 0.25;

    const predictedInflow = Math.round(avgInflow * Math.pow(growthRate, i / 6) * seasonalFactor);
    const predictedOutflow = Math.round(avgOutflow * Math.pow(growthRate, i / 6) * seasonalFactor * 0.92);

    balance = balance + predictedInflow - predictedOutflow;

    // Confidence intervals (wider as we go further into future)
    const confidenceWidth = (i * 0.15); // 15% wider per month
    const confidenceLower = balance * (1 - confidenceWidth);
    const confidenceUpper = balance * (1 + confidenceWidth);

    predictions.push({
      month: monthName,
      date,
      inflow: predictedInflow,
      outflow: predictedOutflow,
      balance,
      isHistorical: false,
      isPredicted: true,
      confidenceLower,
      confidenceUpper,
    });
  }

  return predictions;
};

// Generate AI insights
export const generateInsights = (data: CashFlowDataPoint[]): CashFlowInsight[] => {
  const historicalData = data.filter(d => d.isHistorical);
  const predictedData = data.filter(d => d.isPredicted);

  const insights: CashFlowInsight[] = [];

  // Trend analysis
  const recentInflows = historicalData.slice(-3).map(d => d.inflow);
  const avgRecentInflow = recentInflows.reduce((a, b) => a + b, 0) / recentInflows.length;
  const previousInflows = historicalData.slice(-6, -3).map(d => d.inflow);
  const avgPreviousInflow = previousInflows.reduce((a, b) => a + b, 0) / previousInflows.length;

  if (avgRecentInflow > avgPreviousInflow * 1.1) {
    insights.push({
      id: 'trend-positive',
      type: 'positive',
      category: 'trend',
      title: 'Trend pozitiv la încasări',
      description: `Încasările au crescut cu ${Math.round(((avgRecentInflow - avgPreviousInflow) / avgPreviousInflow) * 100)}% în ultimele 3 luni comparativ cu perioada anterioară.`,
      impact: 'high',
      confidence: 0.87,
      recommendation: 'Identificați factorii care au contribuit la creștere și replicați strategia.',
    });
  }

  // Seasonal pattern detection
  insights.push({
    id: 'seasonal-q4',
    type: 'info',
    category: 'seasonality',
    title: 'Pattern sezonier identificat',
    description: 'Se observă o creștere constantă a încasărilor în lunile octombrie-decembrie, urmată de o scădere în ianuarie-februarie.',
    impact: 'medium',
    confidence: 0.92,
    recommendation: 'Planificați cheltuielile mari pentru perioada de vârf și creați rezerve pentru lunile mai slabe.',
  });

  // Risk alert
  const nextMonthPrediction = predictedData[0];
  if (nextMonthPrediction && nextMonthPrediction.balance < historicalData[historicalData.length - 1].balance * 0.8) {
    insights.push({
      id: 'risk-cashflow',
      type: 'alert',
      category: 'risk',
      title: 'Risc: Scădere prevăzută a cashflow-ului',
      description: `Modelul AI prevede o scădere a soldului cu aproximativ ${Math.round(((historicalData[historicalData.length - 1].balance - nextMonthPrediction.balance) / historicalData[historicalData.length - 1].balance) * 100)}% în luna următoare.`,
      impact: 'high',
      confidence: 0.78,
      recommendation: 'Verificați plățile scadente și amânați cheltuielile neesențiale. Contactați clienții cu plăți restante.',
    });
  }

  // Opportunity
  insights.push({
    id: 'opportunity-liquidity',
    type: 'positive',
    category: 'opportunity',
    title: 'Oportunitate: Lichiditate excedentară',
    description: 'Soldul mediu lunar este cu 35% mai mare decât cheltuielile lunare medii, indicând o poziție financiară solidă.',
    impact: 'medium',
    confidence: 0.85,
    recommendation: 'Considerați investiții pe termen scurt sau negociați termeni mai favorabili cu furnizorii pentru plăți în avans.',
  });

  // Cash runway
  const avgMonthlyBurn = historicalData.slice(-3).reduce((sum, d) => sum + (d.outflow - d.inflow), 0) / 3;
  if (avgMonthlyBurn > 0) {
    const runway = Math.floor(historicalData[historicalData.length - 1].balance / avgMonthlyBurn);
    insights.push({
      id: 'warning-runway',
      type: 'warning',
      category: 'risk',
      title: 'Atenție: Cash runway limitat',
      description: `La rata actuală de cheltuire, aveți aproximativ ${runway} luni de runway. Este recomandat să mențineți minimum 6 luni.`,
      impact: 'high',
      confidence: 0.81,
      recommendation: 'Creșteți încasările sau reduceți cheltuielile pentru a extinde runway-ul financiar.',
    });
  }

  return insights;
};

// Seasonal patterns
export const seasonalPatterns: SeasonalPattern[] = [
  { month: 'Ian', avgInflow: 68000, avgOutflow: 55000, variance: 0.15 },
  { month: 'Feb', avgInflow: 72000, avgOutflow: 58000, variance: 0.12 },
  { month: 'Mar', avgInflow: 78000, avgOutflow: 62000, variance: 0.18 },
  { month: 'Apr', avgInflow: 85000, avgOutflow: 65000, variance: 0.10 },
  { month: 'Mai', avgInflow: 90000, avgOutflow: 68000, variance: 0.14 },
  { month: 'Iun', avgInflow: 95000, avgOutflow: 70000, variance: 0.11 },
  { month: 'Iul', avgInflow: 88000, avgOutflow: 72000, variance: 0.16 },
  { month: 'Aug', avgInflow: 75000, avgOutflow: 60000, variance: 0.20 },
  { month: 'Sep', avgInflow: 92000, avgOutflow: 68000, variance: 0.13 },
  { month: 'Oct', avgInflow: 105000, avgOutflow: 75000, variance: 0.09 },
  { month: 'Noi', avgInflow: 110000, avgOutflow: 78000, variance: 0.08 },
  { month: 'Dec', avgInflow: 115000, avgOutflow: 82000, variance: 0.12 },
];

// Anomaly detection
export const anomalies: AnomalyDetection[] = [
  {
    date: new Date(2024, 7, 15), // August
    type: 'drop',
    severity: 'medium',
    description: 'Scădere neașteptată a încasărilor cu 28% față de media sezonieră',
    expectedValue: 95000,
    actualValue: 68400,
  },
  {
    date: new Date(2024, 10, 20), // November
    type: 'spike',
    severity: 'low',
    description: 'Creștere semnificativă a plăților - probabil achizitii de final de an',
    expectedValue: 78000,
    actualValue: 105000,
  },
];

// Scenario variables
export const scenarioVariables: ScenarioVariable[] = [
  {
    id: 'revenue-growth',
    name: 'Creștere venituri',
    currentValue: 5,
    min: -20,
    max: 50,
    unit: '%',
    description: 'Rata de creștere lunară a veniturilor',
  },
  {
    id: 'expense-increase',
    name: 'Creștere cheltuieli',
    currentValue: 3,
    min: -10,
    max: 30,
    unit: '%',
    description: 'Rata de creștere lunară a cheltuielilor',
  },
  {
    id: 'payment-delay',
    name: 'Întârziere încasări',
    currentValue: 30,
    min: 0,
    max: 90,
    unit: 'zile',
    description: 'Întârziere medie la încasarea facturilor',
  },
  {
    id: 'new-contract',
    name: 'Contract nou',
    currentValue: 0,
    min: 0,
    max: 100000,
    unit: 'RON',
    description: 'Valoare lunară contract nou potențial',
  },
  {
    id: 'one-time-expense',
    name: 'Cheltuială unică',
    currentValue: 0,
    min: 0,
    max: 200000,
    unit: 'RON',
    description: 'Cheltuială mare planificată (echipamente, investiții)',
  },
];

// Main data export
export const getMockCashFlowData = () => {
  const historical = generateHistoricalData();
  const predictions = generatePredictions(historical);
  const allData = [...historical, ...predictions];
  const insights = generateInsights(allData);

  return {
    data: allData,
    historical,
    predictions,
    insights,
    seasonalPatterns,
    anomalies,
    scenarioVariables,
  };
};
