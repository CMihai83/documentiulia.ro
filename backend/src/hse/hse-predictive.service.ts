import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// HSE Predictive Analytics Service
// ML-based incident forecasting and proactive risk management

// Incident Categories for Pattern Analysis
export type IncidentCategory =
  | 'SLIP_TRIP_FALL'
  | 'STRUCK_BY'
  | 'CAUGHT_IN'
  | 'ERGONOMIC'
  | 'CHEMICAL_EXPOSURE'
  | 'ELECTRICAL'
  | 'FIRE'
  | 'VEHICLE'
  | 'FALLING_OBJECT'
  | 'MACHINERY'
  | 'ENVIRONMENTAL'
  | 'OTHER';

export type ShiftType = 'DAY' | 'EVENING' | 'NIGHT' | 'ROTATING';
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type Season = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TrendDirection = 'IMPROVING' | 'STABLE' | 'WORSENING';

// Leading Indicators (Predictive)
export interface LeadingIndicator {
  id: string;
  name: string;
  category: 'BEHAVIOR' | 'CONDITION' | 'PROCESS' | 'TRAINING' | 'EQUIPMENT';
  description: string;
  measurementUnit: string;
  targetValue: number;
  warningThreshold: number;
  criticalThreshold: number;
  currentValue: number;
  trend: TrendDirection;
  correlationToIncidents: number; // -1 to 1
  lastUpdated: Date;
}

// Lagging Indicators (Historical)
export interface LaggingIndicator {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  percentChange: number;
  period: { from: Date; to: Date };
}

// Historical Incident Data for Analysis
export interface HistoricalIncident {
  id: string;
  date: Date;
  time: string; // HH:mm format
  category: IncidentCategory;
  severity: 1 | 2 | 3 | 4 | 5;
  location: string;
  department: string;
  shift: ShiftType;
  dayOfWeek: DayOfWeek;
  month: number;
  weatherCondition?: string;
  workerExperience?: number; // months
  taskType?: string;
  rootCauses?: string[];
  lostDays?: number;
}

// Pattern Recognition Results
export interface IncidentPattern {
  id: string;
  patternType: 'TEMPORAL' | 'SPATIAL' | 'CATEGORICAL' | 'BEHAVIORAL' | 'ENVIRONMENTAL';
  description: string;
  confidence: number; // 0-100%
  occurrences: number;
  affectedAreas: string[];
  contributingFactors: string[];
  riskMultiplier: number;
  recommendations: string[];
}

// Time-based Analysis
export interface TemporalAnalysis {
  hourlyDistribution: { hour: number; count: number; risk: RiskLevel }[];
  dailyDistribution: { day: DayOfWeek; count: number; risk: RiskLevel }[];
  monthlyDistribution: { month: number; count: number; risk: RiskLevel }[];
  seasonalDistribution: { season: Season; count: number; risk: RiskLevel }[];
  shiftDistribution: { shift: ShiftType; count: number; risk: RiskLevel }[];
  peakRiskPeriods: {
    period: string;
    riskLevel: RiskLevel;
    historicalIncidents: number;
    recommendation: string;
  }[];
}

// Spatial Analysis (Location-based)
export interface SpatialAnalysis {
  locationHotspots: {
    location: string;
    incidentCount: number;
    riskScore: number;
    dominantCategory: IncidentCategory;
    trend: TrendDirection;
  }[];
  departmentRisk: {
    department: string;
    riskScore: number;
    incidentRate: number;
    trend: TrendDirection;
  }[];
  heatMapData: {
    x: number;
    y: number;
    intensity: number;
    location: string;
  }[];
}

// Incident Forecast
export interface IncidentForecast {
  id: string;
  generatedAt: Date;
  forecastPeriod: { from: Date; to: Date };
  methodology: 'TIME_SERIES' | 'REGRESSION' | 'MACHINE_LEARNING' | 'ENSEMBLE';
  predictions: {
    date: Date;
    predictedIncidents: number;
    confidenceInterval: { lower: number; upper: number };
    riskLevel: RiskLevel;
    primaryRiskFactors: string[];
  }[];
  accuracy: {
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
    r2: number;   // R-squared
  };
  modelVersion: string;
}

// Risk Score Calculation
export interface RiskScore {
  overall: number; // 0-100
  components: {
    historicalIncidents: number;
    leadingIndicators: number;
    environmentalFactors: number;
    humanFactors: number;
    equipmentCondition: number;
  };
  breakdown: {
    category: IncidentCategory;
    score: number;
    trend: TrendDirection;
  }[];
  recommendations: RiskRecommendation[];
}

export interface RiskRecommendation {
  id: string;
  priority: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  category: string;
  description: string;
  expectedImpact: string;
  estimatedCostReduction: number;
  implementationEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  targetRiskReduction: number; // percentage
}

// Intervention Tracking
export interface ProactiveIntervention {
  id: string;
  triggeredBy: string; // Pattern ID or indicator ID
  type: 'INSPECTION' | 'TRAINING' | 'ENGINEERING_CONTROL' | 'ADMINISTRATIVE' | 'PPE' | 'COMMUNICATION';
  description: string;
  targetArea: string;
  targetDepartment: string;
  scheduledDate: Date;
  assignedTo: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  effectiveness?: {
    incidentReduction: number;
    rating: 1 | 2 | 3 | 4 | 5;
    notes: string;
  };
  createdAt: Date;
  completedAt?: Date;
}

// PPE Tracking
export interface PPEStatus {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  items: PPEItem[];
  complianceScore: number;
  alerts: string[];
}

export interface PPEItem {
  type: string;
  issuedDate: Date;
  expiryDate?: Date;
  lastInspection?: Date;
  condition: 'GOOD' | 'FAIR' | 'POOR' | 'REPLACE';
  isExpired: boolean;
  daysUntilExpiry?: number;
}

// Predictive Dashboard
export interface PredictiveDashboard {
  generatedAt: Date;
  overallRiskScore: number;
  riskTrend: TrendDirection;
  forecast: {
    next7Days: { incidents: number; confidence: number };
    next30Days: { incidents: number; confidence: number };
    next90Days: { incidents: number; confidence: number };
  };
  leadingIndicators: {
    healthy: number;
    warning: number;
    critical: number;
  };
  topRisks: {
    risk: string;
    score: number;
    trend: TrendDirection;
  }[];
  upcomingInterventions: ProactiveIntervention[];
  ppeAlerts: {
    expired: number;
    expiringSoon: number;
    poorCondition: number;
  };
  patterns: IncidentPattern[];
  recommendations: RiskRecommendation[];
}

@Injectable()
export class HSEPredictiveService {
  // In-memory storage
  private historicalIncidents: Map<string, HistoricalIncident> = new Map();
  private leadingIndicators: Map<string, LeadingIndicator> = new Map();
  private patterns: Map<string, IncidentPattern> = new Map();
  private interventions: Map<string, ProactiveIntervention> = new Map();
  private ppeRecords: Map<string, PPEStatus> = new Map();
  private forecasts: Map<string, IncidentForecast> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeDefaultIndicators();
  }

  private initializeDefaultIndicators(): void {
    const defaultIndicators: Partial<LeadingIndicator>[] = [
      {
        name: 'Near Miss Reporting Rate',
        category: 'BEHAVIOR',
        description: 'Number of near misses reported per 100 employees per month',
        measurementUnit: 'per 100 employees',
        targetValue: 10,
        warningThreshold: 5,
        criticalThreshold: 2,
        correlationToIncidents: -0.7,
      },
      {
        name: 'Safety Observation Rate',
        category: 'BEHAVIOR',
        description: 'Safety observations conducted per supervisor per week',
        measurementUnit: 'per supervisor/week',
        targetValue: 5,
        warningThreshold: 3,
        criticalThreshold: 1,
        correlationToIncidents: -0.6,
      },
      {
        name: 'Training Compliance',
        category: 'TRAINING',
        description: 'Percentage of employees with valid safety training',
        measurementUnit: '%',
        targetValue: 100,
        warningThreshold: 90,
        criticalThreshold: 80,
        correlationToIncidents: -0.8,
      },
      {
        name: 'Hazard Close-out Rate',
        category: 'PROCESS',
        description: 'Percentage of identified hazards closed within 30 days',
        measurementUnit: '%',
        targetValue: 95,
        warningThreshold: 80,
        criticalThreshold: 60,
        correlationToIncidents: -0.75,
      },
      {
        name: 'PPE Compliance',
        category: 'EQUIPMENT',
        description: 'Percentage of workers with proper PPE during observations',
        measurementUnit: '%',
        targetValue: 100,
        warningThreshold: 95,
        criticalThreshold: 90,
        correlationToIncidents: -0.65,
      },
      {
        name: 'Equipment Inspection Rate',
        category: 'EQUIPMENT',
        description: 'Percentage of equipment inspected on schedule',
        measurementUnit: '%',
        targetValue: 100,
        warningThreshold: 90,
        criticalThreshold: 75,
        correlationToIncidents: -0.7,
      },
      {
        name: 'Safety Meeting Attendance',
        category: 'BEHAVIOR',
        description: 'Average attendance rate at safety meetings',
        measurementUnit: '%',
        targetValue: 95,
        warningThreshold: 85,
        criticalThreshold: 70,
        correlationToIncidents: -0.5,
      },
      {
        name: 'Unsafe Condition Reports',
        category: 'CONDITION',
        description: 'Unsafe conditions reported per 100 employees per month',
        measurementUnit: 'per 100 employees',
        targetValue: 15,
        warningThreshold: 8,
        criticalThreshold: 3,
        correlationToIncidents: -0.6,
      },
    ];

    defaultIndicators.forEach((indicator, index) => {
      const id = `indicator-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
      this.leadingIndicators.set(id, {
        id,
        ...indicator,
        currentValue: indicator.targetValue! * 0.9,
        trend: 'STABLE',
        lastUpdated: new Date(),
      } as LeadingIndicator);
    });
  }

  resetState(): void {
    this.historicalIncidents.clear();
    this.leadingIndicators.clear();
    this.patterns.clear();
    this.interventions.clear();
    this.ppeRecords.clear();
    this.forecasts.clear();
    this.initializeDefaultIndicators();
  }

  // ===== HISTORICAL DATA MANAGEMENT =====

  async addHistoricalIncident(data: Omit<HistoricalIncident, 'id' | 'dayOfWeek' | 'month'>): Promise<HistoricalIncident> {
    const id = `incident-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const date = new Date(data.date);
    const days: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

    const incident: HistoricalIncident = {
      id,
      ...data,
      date,
      dayOfWeek: days[date.getDay()],
      month: date.getMonth() + 1,
    };

    this.historicalIncidents.set(id, incident);
    return incident;
  }

  async getHistoricalIncidents(filters?: {
    fromDate?: Date;
    toDate?: Date;
    category?: IncidentCategory;
    department?: string;
    location?: string;
    shift?: ShiftType;
  }): Promise<HistoricalIncident[]> {
    let incidents = Array.from(this.historicalIncidents.values());

    if (filters) {
      if (filters.fromDate) {
        incidents = incidents.filter(i => i.date >= filters.fromDate!);
      }
      if (filters.toDate) {
        incidents = incidents.filter(i => i.date <= filters.toDate!);
      }
      if (filters.category) {
        incidents = incidents.filter(i => i.category === filters.category);
      }
      if (filters.department) {
        incidents = incidents.filter(i => i.department === filters.department);
      }
      if (filters.location) {
        incidents = incidents.filter(i => i.location === filters.location);
      }
      if (filters.shift) {
        incidents = incidents.filter(i => i.shift === filters.shift);
      }
    }

    return incidents.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async bulkImportIncidents(incidents: Omit<HistoricalIncident, 'id' | 'dayOfWeek' | 'month'>[]): Promise<number> {
    let imported = 0;
    for (const incident of incidents) {
      await this.addHistoricalIncident(incident);
      imported++;
    }
    return imported;
  }

  // ===== LEADING INDICATORS =====

  async getLeadingIndicators(): Promise<LeadingIndicator[]> {
    return Array.from(this.leadingIndicators.values());
  }

  async updateLeadingIndicator(indicatorId: string, value: number): Promise<LeadingIndicator> {
    const indicator = this.leadingIndicators.get(indicatorId);
    if (!indicator) throw new Error('Indicator not found');

    const previousValue = indicator.currentValue;
    indicator.currentValue = value;
    indicator.lastUpdated = new Date();

    // Determine trend
    if (value > previousValue * 1.05) {
      indicator.trend = indicator.correlationToIncidents < 0 ? 'IMPROVING' : 'WORSENING';
    } else if (value < previousValue * 0.95) {
      indicator.trend = indicator.correlationToIncidents < 0 ? 'WORSENING' : 'IMPROVING';
    } else {
      indicator.trend = 'STABLE';
    }

    return indicator;
  }

  async getIndicatorStatus(indicatorId: string): Promise<{
    indicator: LeadingIndicator;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    gapToTarget: number;
    recommendation: string;
  }> {
    const indicator = this.leadingIndicators.get(indicatorId);
    if (!indicator) throw new Error('Indicator not found');

    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    let recommendation: string;

    // For indicators where higher is better (negative correlation to incidents)
    if (indicator.correlationToIncidents < 0) {
      if (indicator.currentValue >= indicator.targetValue) {
        status = 'HEALTHY';
        recommendation = 'Maintain current performance';
      } else if (indicator.currentValue >= indicator.warningThreshold) {
        status = 'WARNING';
        recommendation = `Increase ${indicator.name} to meet target of ${indicator.targetValue}`;
      } else {
        status = 'CRITICAL';
        recommendation = `Urgent action needed: ${indicator.name} is critically low`;
      }
    } else {
      // For indicators where lower is better
      if (indicator.currentValue <= indicator.targetValue) {
        status = 'HEALTHY';
        recommendation = 'Maintain current performance';
      } else if (indicator.currentValue <= indicator.warningThreshold) {
        status = 'WARNING';
        recommendation = `Reduce ${indicator.name} to meet target of ${indicator.targetValue}`;
      } else {
        status = 'CRITICAL';
        recommendation = `Urgent action needed: ${indicator.name} is critically high`;
      }
    }

    return {
      indicator,
      status,
      gapToTarget: indicator.currentValue - indicator.targetValue,
      recommendation,
    };
  }

  async createCustomIndicator(data: Omit<LeadingIndicator, 'id' | 'currentValue' | 'trend' | 'lastUpdated'>): Promise<LeadingIndicator> {
    const id = `indicator-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const indicator: LeadingIndicator = {
      id,
      ...data,
      currentValue: data.targetValue,
      trend: 'STABLE',
      lastUpdated: new Date(),
    };

    this.leadingIndicators.set(id, indicator);
    return indicator;
  }

  // ===== PATTERN RECOGNITION =====

  async analyzeTemporalPatterns(): Promise<TemporalAnalysis> {
    const incidents = Array.from(this.historicalIncidents.values());

    // Hourly distribution
    const hourlyCount: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourlyCount[h] = 0;

    incidents.forEach(i => {
      const hour = parseInt(i.time.split(':')[0]);
      hourlyCount[hour]++;
    });

    const maxHourly = Math.max(...Object.values(hourlyCount));
    const hourlyDistribution = Object.entries(hourlyCount).map(([hour, count]) => ({
      hour: parseInt(hour),
      count,
      risk: this.calculateRiskLevel(count, maxHourly),
    }));

    // Daily distribution
    const days: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const dailyCount: Record<DayOfWeek, number> = {} as Record<DayOfWeek, number>;
    days.forEach(d => dailyCount[d] = 0);

    incidents.forEach(i => dailyCount[i.dayOfWeek]++);

    const maxDaily = Math.max(...Object.values(dailyCount));
    const dailyDistribution = days.map(day => ({
      day,
      count: dailyCount[day],
      risk: this.calculateRiskLevel(dailyCount[day], maxDaily),
    }));

    // Monthly distribution
    const monthlyCount: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) monthlyCount[m] = 0;

    incidents.forEach(i => monthlyCount[i.month]++);

    const maxMonthly = Math.max(...Object.values(monthlyCount));
    const monthlyDistribution = Object.entries(monthlyCount).map(([month, count]) => ({
      month: parseInt(month),
      count,
      risk: this.calculateRiskLevel(count, maxMonthly),
    }));

    // Seasonal distribution
    const seasonalCount: Record<Season, number> = { SPRING: 0, SUMMER: 0, AUTUMN: 0, WINTER: 0 };
    incidents.forEach(i => {
      const season = this.getSeasonFromMonth(i.month);
      seasonalCount[season]++;
    });

    const maxSeasonal = Math.max(...Object.values(seasonalCount));
    const seasonalDistribution = (Object.entries(seasonalCount) as [Season, number][]).map(([season, count]) => ({
      season,
      count,
      risk: this.calculateRiskLevel(count, maxSeasonal),
    }));

    // Shift distribution
    const shifts: ShiftType[] = ['DAY', 'EVENING', 'NIGHT', 'ROTATING'];
    const shiftCount: Record<ShiftType, number> = {} as Record<ShiftType, number>;
    shifts.forEach(s => shiftCount[s] = 0);

    incidents.forEach(i => {
      if (i.shift) shiftCount[i.shift]++;
    });

    const maxShift = Math.max(...Object.values(shiftCount));
    const shiftDistribution = shifts.map(shift => ({
      shift,
      count: shiftCount[shift],
      risk: this.calculateRiskLevel(shiftCount[shift], maxShift),
    }));

    // Peak risk periods
    const peakRiskPeriods: TemporalAnalysis['peakRiskPeriods'] = [];

    // Find peak hours
    const peakHours = hourlyDistribution.filter(h => h.risk === 'HIGH' || h.risk === 'CRITICAL');
    peakHours.forEach(h => {
      peakRiskPeriods.push({
        period: `${h.hour}:00 - ${h.hour + 1}:00`,
        riskLevel: h.risk,
        historicalIncidents: h.count,
        recommendation: `Increase supervision during ${h.hour}:00 - ${h.hour + 1}:00`,
      });
    });

    // Find peak days
    const peakDays = dailyDistribution.filter(d => d.risk === 'HIGH' || d.risk === 'CRITICAL');
    peakDays.forEach(d => {
      peakRiskPeriods.push({
        period: d.day,
        riskLevel: d.risk,
        historicalIncidents: d.count,
        recommendation: `Enhanced safety measures on ${d.day}s`,
      });
    });

    return {
      hourlyDistribution,
      dailyDistribution,
      monthlyDistribution,
      seasonalDistribution,
      shiftDistribution,
      peakRiskPeriods,
    };
  }

  private calculateRiskLevel(count: number, max: number): RiskLevel {
    if (max === 0) return 'LOW';
    const ratio = count / max;
    if (ratio >= 0.8) return 'CRITICAL';
    if (ratio >= 0.6) return 'HIGH';
    if (ratio >= 0.3) return 'MEDIUM';
    return 'LOW';
  }

  private getSeasonFromMonth(month: number): Season {
    if (month >= 3 && month <= 5) return 'SPRING';
    if (month >= 6 && month <= 8) return 'SUMMER';
    if (month >= 9 && month <= 11) return 'AUTUMN';
    return 'WINTER';
  }

  async analyzeSpatialPatterns(): Promise<SpatialAnalysis> {
    const incidents = Array.from(this.historicalIncidents.values());

    // Location hotspots
    const locationCount: Record<string, { count: number; categories: Record<IncidentCategory, number> }> = {};

    incidents.forEach(i => {
      if (!locationCount[i.location]) {
        locationCount[i.location] = { count: 0, categories: {} as Record<IncidentCategory, number> };
      }
      locationCount[i.location].count++;
      locationCount[i.location].categories[i.category] = (locationCount[i.location].categories[i.category] || 0) + 1;
    });

    const maxLocationCount = Math.max(...Object.values(locationCount).map(l => l.count), 1);

    const locationHotspots = Object.entries(locationCount)
      .map(([location, data]) => {
        const dominantCategory = Object.entries(data.categories)
          .sort((a, b) => b[1] - a[1])[0]?.[0] as IncidentCategory || 'OTHER';

        return {
          location,
          incidentCount: data.count,
          riskScore: Math.round((data.count / maxLocationCount) * 100),
          dominantCategory,
          trend: 'STABLE' as TrendDirection,
        };
      })
      .sort((a, b) => b.incidentCount - a.incidentCount);

    // Department risk
    const departmentCount: Record<string, number> = {};
    incidents.forEach(i => {
      departmentCount[i.department] = (departmentCount[i.department] || 0) + 1;
    });

    const maxDeptCount = Math.max(...Object.values(departmentCount), 1);

    const departmentRisk = Object.entries(departmentCount)
      .map(([department, count]) => ({
        department,
        riskScore: Math.round((count / maxDeptCount) * 100),
        incidentRate: count,
        trend: 'STABLE' as TrendDirection,
      }))
      .sort((a, b) => b.riskScore - a.riskScore);

    // Generate heat map data (simplified grid)
    const heatMapData = locationHotspots.slice(0, 10).map((loc, index) => ({
      x: (index % 5) * 20 + 10,
      y: Math.floor(index / 5) * 30 + 15,
      intensity: loc.riskScore,
      location: loc.location,
    }));

    return {
      locationHotspots,
      departmentRisk,
      heatMapData,
    };
  }

  async detectPatterns(): Promise<IncidentPattern[]> {
    const incidents = Array.from(this.historicalIncidents.values());
    const detectedPatterns: IncidentPattern[] = [];

    // Category clustering pattern
    const categoryCount: Record<IncidentCategory, number> = {} as Record<IncidentCategory, number>;
    incidents.forEach(i => {
      categoryCount[i.category] = (categoryCount[i.category] || 0) + 1;
    });

    const totalIncidents = incidents.length || 1;
    Object.entries(categoryCount).forEach(([category, count]) => {
      const percentage = (count / totalIncidents) * 100;
      if (percentage > 20) {
        const patternId = `pattern-cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        detectedPatterns.push({
          id: patternId,
          patternType: 'CATEGORICAL',
          description: `${category} incidents represent ${percentage.toFixed(1)}% of all incidents`,
          confidence: Math.min(percentage * 2, 95),
          occurrences: count,
          affectedAreas: [...new Set(incidents.filter(i => i.category === category).map(i => i.location))],
          contributingFactors: this.getCategoryFactors(category as IncidentCategory),
          riskMultiplier: percentage > 30 ? 1.5 : 1.2,
          recommendations: this.getCategoryRecommendations(category as IncidentCategory),
        });
        this.patterns.set(patternId, detectedPatterns[detectedPatterns.length - 1]);
      }
    });

    // Shift-based pattern
    const shiftCount: Record<ShiftType, number> = { DAY: 0, EVENING: 0, NIGHT: 0, ROTATING: 0 };
    incidents.forEach(i => {
      if (i.shift) shiftCount[i.shift]++;
    });

    const maxShift = Math.max(...Object.values(shiftCount));
    Object.entries(shiftCount).forEach(([shift, count]) => {
      if (count === maxShift && count > 3) {
        const patternId = `pattern-shift-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        detectedPatterns.push({
          id: patternId,
          patternType: 'TEMPORAL',
          description: `${shift} shift has the highest incident frequency`,
          confidence: 75,
          occurrences: count,
          affectedAreas: [...new Set(incidents.filter(i => i.shift === shift).map(i => i.department))],
          contributingFactors: this.getShiftFactors(shift as ShiftType),
          riskMultiplier: 1.3,
          recommendations: this.getShiftRecommendations(shift as ShiftType),
        });
        this.patterns.set(patternId, detectedPatterns[detectedPatterns.length - 1]);
      }
    });

    // Experience-based pattern
    const lowExperienceIncidents = incidents.filter(i => i.workerExperience && i.workerExperience < 6);
    if (lowExperienceIncidents.length > incidents.length * 0.3) {
      const patternId = `pattern-exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      detectedPatterns.push({
        id: patternId,
        patternType: 'BEHAVIORAL',
        description: `${((lowExperienceIncidents.length / totalIncidents) * 100).toFixed(1)}% of incidents involve workers with less than 6 months experience`,
        confidence: 80,
        occurrences: lowExperienceIncidents.length,
        affectedAreas: [...new Set(lowExperienceIncidents.map(i => i.department))],
        contributingFactors: ['Insufficient training', 'Lack of experience', 'Unfamiliarity with hazards'],
        riskMultiplier: 1.4,
        recommendations: [
          'Enhanced onboarding safety training',
          'Buddy system for new workers',
          'More frequent supervision checks for new hires',
          'Competency assessment before independent work',
        ],
      });
      this.patterns.set(patternId, detectedPatterns[detectedPatterns.length - 1]);
    }

    return detectedPatterns;
  }

  private getCategoryFactors(category: IncidentCategory): string[] {
    const factors: Record<IncidentCategory, string[]> = {
      SLIP_TRIP_FALL: ['Wet surfaces', 'Poor lighting', 'Cluttered walkways', 'Improper footwear'],
      STRUCK_BY: ['Moving equipment', 'Falling objects', 'Lack of barriers', 'Poor communication'],
      CAUGHT_IN: ['Unguarded machinery', 'Loose clothing', 'Lack of lockout/tagout'],
      ERGONOMIC: ['Repetitive motion', 'Poor posture', 'Heavy lifting', 'Inadequate rest breaks'],
      CHEMICAL_EXPOSURE: ['Improper storage', 'Missing SDS', 'Inadequate ventilation', 'Lack of PPE'],
      ELECTRICAL: ['Damaged equipment', 'Improper grounding', 'Overloaded circuits'],
      FIRE: ['Flammable storage', 'Hot work', 'Electrical faults', 'Smoking'],
      VEHICLE: ['Speed', 'Blind spots', 'Fatigue', 'Poor maintenance'],
      FALLING_OBJECT: ['Improper stacking', 'Lack of toe boards', 'Unsecured loads'],
      MACHINERY: ['Bypassed guards', 'Lack of training', 'Poor maintenance'],
      ENVIRONMENTAL: ['Weather conditions', 'Temperature extremes', 'Poor air quality'],
      OTHER: ['Various factors'],
    };
    return factors[category] || ['Unknown factors'];
  }

  private getCategoryRecommendations(category: IncidentCategory): string[] {
    const recommendations: Record<IncidentCategory, string[]> = {
      SLIP_TRIP_FALL: ['Improve housekeeping', 'Install anti-slip flooring', 'Enhance lighting', 'Enforce footwear policy'],
      STRUCK_BY: ['Install barriers', 'Improve signage', 'Use spotters', 'Hard hat enforcement'],
      CAUGHT_IN: ['Machine guarding audit', 'LOTO compliance check', 'Dress code enforcement'],
      ERGONOMIC: ['Ergonomic assessment', 'Job rotation', 'Mechanical aids', 'Stretching program'],
      CHEMICAL_EXPOSURE: ['SDS training', 'Ventilation upgrade', 'PPE audit', 'Storage review'],
      ELECTRICAL: ['Electrical inspection', 'GFI installation', 'Cable management'],
      FIRE: ['Fire drill', 'Hot work permit review', 'Extinguisher check'],
      VEHICLE: ['Driver training', 'Speed monitoring', 'Maintenance schedule'],
      FALLING_OBJECT: ['Stacking training', 'Netting installation', 'Load securing'],
      MACHINERY: ['Guard inspection', 'Operator training', 'Maintenance review'],
      ENVIRONMENTAL: ['Weather monitoring', 'Climate control', 'Air quality testing'],
      OTHER: ['General safety review'],
    };
    return recommendations[category] || ['Conduct root cause analysis'];
  }

  private getShiftFactors(shift: ShiftType): string[] {
    const factors: Record<ShiftType, string[]> = {
      DAY: ['High activity', 'Multiple operations', 'Visitor presence'],
      EVENING: ['Reduced supervision', 'Shift transition', 'Fatigue'],
      NIGHT: ['Fatigue', 'Reduced visibility', 'Minimal supervision', 'Circadian disruption'],
      ROTATING: ['Sleep disruption', 'Inconsistent schedules', 'Adaptation stress'],
    };
    return factors[shift];
  }

  private getShiftRecommendations(shift: ShiftType): string[] {
    const recommendations: Record<ShiftType, string[]> = {
      DAY: ['Staggered break times', 'Traffic management', 'Enhanced coordination'],
      EVENING: ['Handover procedures', 'Supervision coverage', 'Lighting check'],
      NIGHT: ['Fatigue management', 'Enhanced lighting', 'Regular welfare checks', 'Alertness monitoring'],
      ROTATING: ['Rotation schedule optimization', 'Sleep hygiene training', 'Health monitoring'],
    };
    return recommendations[shift];
  }

  // ===== FORECASTING =====

  async generateForecast(
    daysAhead: number,
    methodology: IncidentForecast['methodology'] = 'TIME_SERIES',
  ): Promise<IncidentForecast> {
    const incidents = Array.from(this.historicalIncidents.values());
    const id = `forecast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Simple time series forecast using moving average
    const dailyCounts: Record<string, number> = {};
    incidents.forEach(i => {
      const dateKey = i.date.toISOString().split('T')[0];
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
    });

    const counts = Object.values(dailyCounts);
    const avgDaily = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0.1;
    const stdDev = counts.length > 1
      ? Math.sqrt(counts.reduce((sum, c) => sum + Math.pow(c - avgDaily, 2), 0) / counts.length)
      : avgDaily * 0.3;

    const predictions: IncidentForecast['predictions'] = [];
    const now = new Date();

    for (let day = 1; day <= daysAhead; day++) {
      const forecastDate = new Date(now);
      forecastDate.setDate(forecastDate.getDate() + day);

      // Add some seasonality effect
      const dayOfWeek = forecastDate.getDay();
      const seasonalFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.7 : 1.0;

      const predicted = avgDaily * seasonalFactor;
      const confidence = 0.95;
      const zScore = 1.96; // 95% confidence

      predictions.push({
        date: forecastDate,
        predictedIncidents: Math.round(predicted * 100) / 100,
        confidenceInterval: {
          lower: Math.max(0, Math.round((predicted - zScore * stdDev) * 100) / 100),
          upper: Math.round((predicted + zScore * stdDev) * 100) / 100,
        },
        riskLevel: this.predictRiskLevel(predicted, avgDaily),
        primaryRiskFactors: this.getPredictedRiskFactors(forecastDate, incidents),
      });
    }

    // Calculate accuracy metrics (using historical data)
    const mape = counts.length > 0
      ? counts.reduce((sum, actual) => sum + Math.abs(actual - avgDaily) / Math.max(actual, 0.1), 0) / counts.length * 100
      : 20;

    const forecast: IncidentForecast = {
      id,
      generatedAt: now,
      forecastPeriod: {
        from: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        to: new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000),
      },
      methodology,
      predictions,
      accuracy: {
        mape: Math.round(mape * 10) / 10,
        rmse: Math.round(stdDev * 100) / 100,
        r2: Math.max(0, Math.round((1 - (stdDev / Math.max(avgDaily, 0.1))) * 100) / 100),
      },
      modelVersion: '1.0.0',
    };

    this.forecasts.set(id, forecast);
    return forecast;
  }

  private predictRiskLevel(predicted: number, average: number): RiskLevel {
    const ratio = predicted / Math.max(average, 0.1);
    if (ratio >= 1.5) return 'CRITICAL';
    if (ratio >= 1.2) return 'HIGH';
    if (ratio >= 0.8) return 'MEDIUM';
    return 'LOW';
  }

  private getPredictedRiskFactors(date: Date, incidents: HistoricalIncident[]): string[] {
    const factors: string[] = [];
    const dayOfWeek = date.getDay();
    const month = date.getMonth() + 1;

    // Check historical patterns for this day
    const sameDayIncidents = incidents.filter(i => i.date.getDay() === dayOfWeek);
    if (sameDayIncidents.length > incidents.length * 0.2) {
      factors.push('Historically high-risk day of week');
    }

    // Seasonal factors
    if (month >= 6 && month <= 8) {
      factors.push('Summer heat exposure risk');
    } else if (month >= 12 || month <= 2) {
      factors.push('Winter slip/fall risk');
    }

    if (factors.length === 0) {
      factors.push('Normal operational risk');
    }

    return factors;
  }

  // ===== RISK SCORING =====

  async calculateRiskScore(department?: string, location?: string): Promise<RiskScore> {
    const incidents = Array.from(this.historicalIncidents.values());
    const indicators = Array.from(this.leadingIndicators.values());

    // Filter if department/location specified
    let filteredIncidents = incidents;
    if (department) {
      filteredIncidents = incidents.filter(i => i.department === department);
    }
    if (location) {
      filteredIncidents = incidents.filter(i => i.location === location);
    }

    // Historical incidents component (0-100)
    const recentIncidents = filteredIncidents.filter(i =>
      i.date >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    );
    const historicalScore = Math.min(recentIncidents.length * 10, 100);

    // Leading indicators component (0-100)
    let indicatorScore = 0;
    let indicatorCount = 0;
    indicators.forEach(ind => {
      const ratio = ind.currentValue / ind.targetValue;
      if (ind.correlationToIncidents < 0) {
        indicatorScore += (1 - ratio) * 100;
      } else {
        indicatorScore += ratio * 100;
      }
      indicatorCount++;
    });
    indicatorScore = indicatorCount > 0 ? indicatorScore / indicatorCount : 50;

    // Other components (simplified)
    const environmentalScore = 30; // Placeholder
    const humanScore = Math.min(recentIncidents.filter(i => i.workerExperience && i.workerExperience < 12).length * 15, 100);
    const equipmentScore = 25; // Placeholder

    // Overall score (weighted average)
    const overall = Math.round(
      historicalScore * 0.3 +
      indicatorScore * 0.3 +
      environmentalScore * 0.15 +
      humanScore * 0.15 +
      equipmentScore * 0.1
    );

    // Category breakdown
    const categoryCount: Record<IncidentCategory, number> = {} as Record<IncidentCategory, number>;
    recentIncidents.forEach(i => {
      categoryCount[i.category] = (categoryCount[i.category] || 0) + 1;
    });

    const maxCatCount = Math.max(...Object.values(categoryCount), 1);
    const breakdown = Object.entries(categoryCount).map(([category, count]) => ({
      category: category as IncidentCategory,
      score: Math.round((count / maxCatCount) * 100),
      trend: 'STABLE' as TrendDirection,
    }));

    // Generate recommendations
    const recommendations = this.generateRiskRecommendations(overall, breakdown, indicators);

    return {
      overall,
      components: {
        historicalIncidents: historicalScore,
        leadingIndicators: Math.round(indicatorScore),
        environmentalFactors: environmentalScore,
        humanFactors: humanScore,
        equipmentCondition: equipmentScore,
      },
      breakdown,
      recommendations,
    };
  }

  private generateRiskRecommendations(
    overall: number,
    breakdown: { category: IncidentCategory; score: number }[],
    indicators: LeadingIndicator[],
  ): RiskRecommendation[] {
    const recommendations: RiskRecommendation[] = [];

    // Based on overall score
    if (overall >= 70) {
      recommendations.push({
        id: `rec-${Date.now()}-1`,
        priority: 'IMMEDIATE',
        category: 'General',
        description: 'Conduct emergency safety stand-down meeting',
        expectedImpact: '20-30% incident reduction',
        estimatedCostReduction: 50000,
        implementationEffort: 'LOW',
        targetRiskReduction: 25,
      });
    }

    // Based on top categories
    const topCategory = breakdown.sort((a, b) => b.score - a.score)[0];
    if (topCategory && topCategory.score >= 50) {
      recommendations.push({
        id: `rec-${Date.now()}-2`,
        priority: 'SHORT_TERM',
        category: topCategory.category,
        description: `Targeted ${topCategory.category} prevention program`,
        expectedImpact: '15-25% reduction in category incidents',
        estimatedCostReduction: 25000,
        implementationEffort: 'MEDIUM',
        targetRiskReduction: 20,
      });
    }

    // Based on indicators
    const criticalIndicators = indicators.filter(i => {
      if (i.correlationToIncidents < 0) {
        return i.currentValue < i.criticalThreshold;
      }
      return i.currentValue > i.criticalThreshold;
    });

    criticalIndicators.forEach((ind, index) => {
      recommendations.push({
        id: `rec-${Date.now()}-${3 + index}`,
        priority: 'SHORT_TERM',
        category: ind.category,
        description: `Improve ${ind.name} from ${ind.currentValue} to ${ind.targetValue}`,
        expectedImpact: `${Math.abs(ind.correlationToIncidents * 100).toFixed(0)}% correlation to incident reduction`,
        estimatedCostReduction: 10000,
        implementationEffort: 'MEDIUM',
        targetRiskReduction: Math.abs(ind.correlationToIncidents * 15),
      });
    });

    return recommendations.slice(0, 5);
  }

  // ===== PROACTIVE INTERVENTIONS =====

  async createIntervention(data: {
    triggeredBy: string;
    type: ProactiveIntervention['type'];
    description: string;
    targetArea: string;
    targetDepartment: string;
    scheduledDate: Date;
    assignedTo: string;
  }): Promise<ProactiveIntervention> {
    const id = `intervention-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const intervention: ProactiveIntervention = {
      id,
      ...data,
      status: 'PENDING',
      createdAt: new Date(),
    };

    this.interventions.set(id, intervention);
    return intervention;
  }

  async getInterventions(filters?: {
    status?: ProactiveIntervention['status'];
    type?: ProactiveIntervention['type'];
    department?: string;
  }): Promise<ProactiveIntervention[]> {
    let interventions = Array.from(this.interventions.values());

    if (filters) {
      if (filters.status) {
        interventions = interventions.filter(i => i.status === filters.status);
      }
      if (filters.type) {
        interventions = interventions.filter(i => i.type === filters.type);
      }
      if (filters.department) {
        interventions = interventions.filter(i => i.targetDepartment === filters.department);
      }
    }

    return interventions.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }

  async updateInterventionStatus(
    interventionId: string,
    status: ProactiveIntervention['status'],
  ): Promise<ProactiveIntervention> {
    const intervention = this.interventions.get(interventionId);
    if (!intervention) throw new Error('Intervention not found');

    intervention.status = status;
    if (status === 'COMPLETED') {
      intervention.completedAt = new Date();
    }

    return intervention;
  }

  async rateInterventionEffectiveness(
    interventionId: string,
    effectiveness: NonNullable<ProactiveIntervention['effectiveness']>,
  ): Promise<ProactiveIntervention> {
    const intervention = this.interventions.get(interventionId);
    if (!intervention) throw new Error('Intervention not found');

    intervention.effectiveness = effectiveness;
    return intervention;
  }

  async autoGenerateInterventions(): Promise<ProactiveIntervention[]> {
    const patterns = await this.detectPatterns();
    const riskScore = await this.calculateRiskScore();
    const generatedInterventions: ProactiveIntervention[] = [];

    // Generate interventions from patterns
    for (const pattern of patterns.slice(0, 3)) {
      if (pattern.confidence >= 70) {
        const intervention = await this.createIntervention({
          triggeredBy: pattern.id,
          type: this.getInterventionTypeFromPattern(pattern),
          description: pattern.recommendations[0] || 'Address identified pattern',
          targetArea: pattern.affectedAreas[0] || 'General',
          targetDepartment: pattern.affectedAreas[0] || 'All',
          scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          assignedTo: 'HSE Manager',
        });
        generatedInterventions.push(intervention);
      }
    }

    // Generate interventions from recommendations
    for (const rec of riskScore.recommendations.filter(r => r.priority === 'IMMEDIATE')) {
      const intervention = await this.createIntervention({
        triggeredBy: rec.id,
        type: this.getInterventionTypeFromCategory(rec.category),
        description: rec.description,
        targetArea: 'All areas',
        targetDepartment: 'All',
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        assignedTo: 'HSE Manager',
      });
      generatedInterventions.push(intervention);
    }

    return generatedInterventions;
  }

  private getInterventionTypeFromPattern(pattern: IncidentPattern): ProactiveIntervention['type'] {
    switch (pattern.patternType) {
      case 'BEHAVIORAL': return 'TRAINING';
      case 'CATEGORICAL': return 'ENGINEERING_CONTROL';
      case 'TEMPORAL': return 'ADMINISTRATIVE';
      case 'SPATIAL': return 'INSPECTION';
      default: return 'COMMUNICATION';
    }
  }

  private getInterventionTypeFromCategory(category: string): ProactiveIntervention['type'] {
    if (category.includes('TRAINING')) return 'TRAINING';
    if (category.includes('EQUIPMENT')) return 'ENGINEERING_CONTROL';
    if (category.includes('BEHAVIOR')) return 'ADMINISTRATIVE';
    return 'INSPECTION';
  }

  // ===== PPE TRACKING =====

  async recordPPEStatus(data: {
    employeeId: string;
    employeeName: string;
    department: string;
    items: Omit<PPEItem, 'isExpired' | 'daysUntilExpiry'>[];
  }): Promise<PPEStatus> {
    const id = `ppe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const items: PPEItem[] = data.items.map(item => {
      const isExpired = item.expiryDate ? item.expiryDate < now : false;
      const daysUntilExpiry = item.expiryDate
        ? Math.ceil((item.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      return {
        ...item,
        isExpired,
        daysUntilExpiry,
      };
    });

    const alerts: string[] = [];
    let compliantItems = 0;

    items.forEach(item => {
      if (item.isExpired) {
        alerts.push(`${item.type} is expired`);
      } else if (item.daysUntilExpiry && item.daysUntilExpiry <= 30) {
        alerts.push(`${item.type} expires in ${item.daysUntilExpiry} days`);
      }
      if (item.condition === 'POOR' || item.condition === 'REPLACE') {
        alerts.push(`${item.type} needs replacement`);
      }
      if (!item.isExpired && item.condition !== 'POOR' && item.condition !== 'REPLACE') {
        compliantItems++;
      }
    });

    const complianceScore = items.length > 0 ? Math.round((compliantItems / items.length) * 100) : 100;

    const ppeStatus: PPEStatus = {
      id,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      department: data.department,
      items,
      complianceScore,
      alerts,
    };

    this.ppeRecords.set(data.employeeId, ppeStatus);
    return ppeStatus;
  }

  async getPPEStatus(employeeId: string): Promise<PPEStatus | null> {
    return this.ppeRecords.get(employeeId) || null;
  }

  async getPPEAlerts(): Promise<{
    expired: PPEStatus[];
    expiringSoon: PPEStatus[];
    poorCondition: PPEStatus[];
  }> {
    const records = Array.from(this.ppeRecords.values());

    return {
      expired: records.filter(r => r.items.some(i => i.isExpired)),
      expiringSoon: records.filter(r => r.items.some(i => i.daysUntilExpiry && i.daysUntilExpiry <= 30 && !i.isExpired)),
      poorCondition: records.filter(r => r.items.some(i => i.condition === 'POOR' || i.condition === 'REPLACE')),
    };
  }

  // ===== DASHBOARD =====

  async generatePredictiveDashboard(): Promise<PredictiveDashboard> {
    const now = new Date();

    // Generate forecasts
    const forecast7 = await this.generateForecast(7);
    const forecast30 = await this.generateForecast(30);
    const forecast90 = await this.generateForecast(90);

    // Get risk score
    const riskScore = await this.calculateRiskScore();

    // Get indicator status
    const indicators = Array.from(this.leadingIndicators.values());
    let healthy = 0, warning = 0, critical = 0;

    for (const ind of indicators) {
      const status = await this.getIndicatorStatus(ind.id);
      if (status.status === 'HEALTHY') healthy++;
      else if (status.status === 'WARNING') warning++;
      else critical++;
    }

    // Get patterns
    const patterns = await this.detectPatterns();

    // Get interventions
    const interventions = await this.getInterventions({ status: 'PENDING' });

    // Get PPE alerts
    const ppeAlerts = await this.getPPEAlerts();

    // Determine overall trend
    let riskTrend: TrendDirection = 'STABLE';
    const improvingIndicators = indicators.filter(i => i.trend === 'IMPROVING').length;
    const worseningIndicators = indicators.filter(i => i.trend === 'WORSENING').length;
    if (improvingIndicators > worseningIndicators * 1.5) riskTrend = 'IMPROVING';
    else if (worseningIndicators > improvingIndicators * 1.5) riskTrend = 'WORSENING';

    // Top risks from breakdown
    const topRisks = riskScore.breakdown
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(b => ({
        risk: b.category,
        score: b.score,
        trend: b.trend,
      }));

    return {
      generatedAt: now,
      overallRiskScore: riskScore.overall,
      riskTrend,
      forecast: {
        next7Days: {
          incidents: Math.round(forecast7.predictions.reduce((sum, p) => sum + p.predictedIncidents, 0) * 10) / 10,
          confidence: 85,
        },
        next30Days: {
          incidents: Math.round(forecast30.predictions.reduce((sum, p) => sum + p.predictedIncidents, 0) * 10) / 10,
          confidence: 75,
        },
        next90Days: {
          incidents: Math.round(forecast90.predictions.reduce((sum, p) => sum + p.predictedIncidents, 0) * 10) / 10,
          confidence: 60,
        },
      },
      leadingIndicators: { healthy, warning, critical },
      topRisks,
      upcomingInterventions: interventions.slice(0, 5),
      ppeAlerts: {
        expired: ppeAlerts.expired.length,
        expiringSoon: ppeAlerts.expiringSoon.length,
        poorCondition: ppeAlerts.poorCondition.length,
      },
      patterns: patterns.slice(0, 5),
      recommendations: riskScore.recommendations,
    };
  }
}
