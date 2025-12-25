import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenanceType } from '@prisma/client';

// Prediction confidence levels
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCERTAIN';

// Risk levels for component failures
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'MINIMAL';

// Component health status
export interface ComponentHealth {
  component: string;
  componentDe: string;
  healthScore: number; // 0-100
  riskLevel: RiskLevel;
  estimatedLifeRemaining: number; // in km or days
  lifeUnit: 'km' | 'days';
  confidence: ConfidenceLevel;
  factors: string[];
}

// Failure prediction
export interface FailurePrediction {
  id: string;
  vehicleId: string;
  licensePlate: string;
  component: string;
  componentDe: string;
  maintenanceType: MaintenanceType;
  predictedFailureDate: Date;
  predictedFailureKm?: number;
  probability: number; // 0-1
  confidence: ConfidenceLevel;
  riskLevel: RiskLevel;
  estimatedCostEur: number;
  downtime: number; // hours
  preventiveActionRecommended: boolean;
  recommendation: string;
  recommendationDe: string;
  factors: FailureFactor[];
}

// Factors contributing to prediction
export interface FailureFactor {
  factor: string;
  factorDe: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  weight: number; // 0-1
  value: string;
}

// Vehicle health profile
export interface VehicleHealthProfile {
  vehicleId: string;
  licensePlate: string;
  make: string;
  model: string;
  year?: number;
  overallHealthScore: number; // 0-100
  riskCategory: RiskLevel;
  componentHealth: ComponentHealth[];
  predictions: FailurePrediction[];
  usagePattern: UsagePattern;
  maintenanceQuality: MaintenanceQuality;
  recommendations: MaintenanceRecommendation[];
}

// Usage pattern analysis
export interface UsagePattern {
  averageDailyKm: number;
  averageDeliveriesPerDay: number;
  peakUsageDays: string[];
  idlePercentage: number;
  heavyLoadFrequency: number; // 0-1
  urbanVsHighwayRatio: number; // Urban percentage
  usageIntensity: 'LIGHT' | 'MODERATE' | 'HEAVY' | 'EXTREME';
}

// Maintenance quality assessment
export interface MaintenanceQuality {
  onTimeMaintenanceRate: number; // 0-1
  averageMaintenanceDelay: number; // days
  preferredVendors: string[];
  averageCostVariance: number; // vs estimates
  qualityScore: number; // 0-100
}

// Maintenance recommendations
export interface MaintenanceRecommendation {
  id: string;
  priority: number; // 1-10
  type: 'PREVENTIVE' | 'PREDICTIVE' | 'CORRECTIVE' | 'OPTIMIZATION';
  title: string;
  titleDe: string;
  description: string;
  descriptionDe: string;
  estimatedCostEur: number;
  estimatedSavingsEur: number;
  recommendedDate: Date;
  dueWithinDays: number;
  affectedComponents: string[];
}

// Fleet-wide predictive analytics
export interface FleetPredictiveAnalytics {
  fleetHealthScore: number; // 0-100
  vehiclesAtRisk: number;
  upcomingFailures30Days: number;
  estimatedMaintenanceCost30Days: number;
  predictedDowntimeHours: number;
  componentRiskSummary: ComponentRiskSummary[];
  costSavingsPotential: number;
  recommendations: FleetRecommendation[];
}

// Component risk across fleet
export interface ComponentRiskSummary {
  component: string;
  componentDe: string;
  vehiclesAffected: number;
  averageRiskScore: number;
  estimatedTotalCostEur: number;
  highestRiskVehicle: string;
}

// Fleet-wide recommendations
export interface FleetRecommendation {
  type: 'BULK_MAINTENANCE' | 'VENDOR_CHANGE' | 'SCHEDULE_OPTIMIZATION' | 'TRAINING' | 'REPLACEMENT';
  title: string;
  titleDe: string;
  description: string;
  descriptionDe: string;
  potentialSavingsEur: number;
  vehiclesAffected: number;
  implementationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Component degradation model
interface DegradationModel {
  baseLifeKm: number;
  baseLifeMonths: number;
  usageMultiplier: (intensity: string) => number;
  ageMultiplier: (vehicleAgeYears: number) => number;
  loadMultiplier: (heavyLoadFrequency: number) => number;
  maintenanceMultiplier: (quality: number) => number;
  costEstimateEur: number;
  downtimeHours: number;
}

// German component names
const COMPONENT_NAMES_DE: Record<string, string> = {
  'engine_oil': 'Motoröl',
  'brake_pads': 'Bremsbeläge',
  'brake_discs': 'Bremsscheiben',
  'timing_belt': 'Zahnriemen',
  'clutch': 'Kupplung',
  'alternator': 'Lichtmaschine',
  'starter_motor': 'Anlasser',
  'fuel_pump': 'Kraftstoffpumpe',
  'water_pump': 'Wasserpumpe',
  'suspension': 'Fahrwerk',
  'shock_absorbers': 'Stoßdämpfer',
  'tires': 'Reifen',
  'battery': 'Batterie',
  'air_filter': 'Luftfilter',
  'cabin_filter': 'Innenraumfilter',
  'spark_plugs': 'Zündkerzen',
  'transmission': 'Getriebe',
  'turbocharger': 'Turbolader',
  'exhaust_system': 'Abgasanlage',
  'catalytic_converter': 'Katalysator',
};

@Injectable()
export class PredictiveMaintenanceService {
  private readonly logger = new Logger(PredictiveMaintenanceService.name);

  // Component degradation models based on industry data
  private readonly degradationModels: Record<string, DegradationModel> = {
    'engine_oil': {
      baseLifeKm: 15000,
      baseLifeMonths: 12,
      usageMultiplier: (i) => i === 'EXTREME' ? 0.6 : i === 'HEAVY' ? 0.75 : i === 'MODERATE' ? 0.9 : 1,
      ageMultiplier: (age) => Math.max(0.7, 1 - age * 0.02),
      loadMultiplier: (freq) => 1 - freq * 0.2,
      maintenanceMultiplier: (q) => 0.8 + q * 0.004,
      costEstimateEur: 150,
      downtimeHours: 1,
    },
    'brake_pads': {
      baseLifeKm: 50000,
      baseLifeMonths: 36,
      usageMultiplier: (i) => i === 'EXTREME' ? 0.5 : i === 'HEAVY' ? 0.65 : i === 'MODERATE' ? 0.85 : 1,
      ageMultiplier: (age) => Math.max(0.6, 1 - age * 0.03),
      loadMultiplier: (freq) => 1 - freq * 0.35,
      maintenanceMultiplier: (q) => 0.85 + q * 0.003,
      costEstimateEur: 250,
      downtimeHours: 2,
    },
    'brake_discs': {
      baseLifeKm: 80000,
      baseLifeMonths: 48,
      usageMultiplier: (i) => i === 'EXTREME' ? 0.55 : i === 'HEAVY' ? 0.7 : i === 'MODERATE' ? 0.88 : 1,
      ageMultiplier: (age) => Math.max(0.6, 1 - age * 0.025),
      loadMultiplier: (freq) => 1 - freq * 0.3,
      maintenanceMultiplier: (q) => 0.85 + q * 0.003,
      costEstimateEur: 400,
      downtimeHours: 3,
    },
    'timing_belt': {
      baseLifeKm: 100000,
      baseLifeMonths: 60,
      usageMultiplier: (i) => i === 'EXTREME' ? 0.7 : i === 'HEAVY' ? 0.8 : i === 'MODERATE' ? 0.92 : 1,
      ageMultiplier: (age) => Math.max(0.5, 1 - age * 0.05),
      loadMultiplier: (freq) => 1 - freq * 0.15,
      maintenanceMultiplier: (q) => 0.9 + q * 0.002,
      costEstimateEur: 600,
      downtimeHours: 5,
    },
    'clutch': {
      baseLifeKm: 120000,
      baseLifeMonths: 72,
      usageMultiplier: (i) => i === 'EXTREME' ? 0.5 : i === 'HEAVY' ? 0.65 : i === 'MODERATE' ? 0.85 : 1,
      ageMultiplier: (age) => Math.max(0.55, 1 - age * 0.04),
      loadMultiplier: (freq) => 1 - freq * 0.4,
      maintenanceMultiplier: (q) => 0.88 + q * 0.0024,
      costEstimateEur: 800,
      downtimeHours: 6,
    },
    'battery': {
      baseLifeKm: 80000,
      baseLifeMonths: 48,
      usageMultiplier: (i) => i === 'EXTREME' ? 0.7 : i === 'HEAVY' ? 0.8 : i === 'MODERATE' ? 0.92 : 1,
      ageMultiplier: (age) => Math.max(0.4, 1 - age * 0.08),
      loadMultiplier: (freq) => 1 - freq * 0.1,
      maintenanceMultiplier: (q) => 0.9 + q * 0.002,
      costEstimateEur: 180,
      downtimeHours: 0.5,
    },
    'alternator': {
      baseLifeKm: 150000,
      baseLifeMonths: 96,
      usageMultiplier: (i) => i === 'EXTREME' ? 0.65 : i === 'HEAVY' ? 0.75 : i === 'MODERATE' ? 0.9 : 1,
      ageMultiplier: (age) => Math.max(0.5, 1 - age * 0.05),
      loadMultiplier: (freq) => 1 - freq * 0.2,
      maintenanceMultiplier: (q) => 0.9 + q * 0.002,
      costEstimateEur: 450,
      downtimeHours: 2,
    },
    'starter_motor': {
      baseLifeKm: 180000,
      baseLifeMonths: 108,
      usageMultiplier: (i) => i === 'EXTREME' ? 0.6 : i === 'HEAVY' ? 0.72 : i === 'MODERATE' ? 0.88 : 1,
      ageMultiplier: (age) => Math.max(0.45, 1 - age * 0.055),
      loadMultiplier: (freq) => 1 - freq * 0.15,
      maintenanceMultiplier: (q) => 0.92 + q * 0.0016,
      costEstimateEur: 350,
      downtimeHours: 2,
    },
    'tires': {
      baseLifeKm: 50000,
      baseLifeMonths: 48,
      usageMultiplier: (i) => i === 'EXTREME' ? 0.55 : i === 'HEAVY' ? 0.7 : i === 'MODERATE' ? 0.88 : 1,
      ageMultiplier: (age) => Math.max(0.6, 1 - age * 0.06),
      loadMultiplier: (freq) => 1 - freq * 0.35,
      maintenanceMultiplier: (q) => 0.85 + q * 0.003,
      costEstimateEur: 600,
      downtimeHours: 1.5,
    },
    'shock_absorbers': {
      baseLifeKm: 80000,
      baseLifeMonths: 60,
      usageMultiplier: (i) => i === 'EXTREME' ? 0.55 : i === 'HEAVY' ? 0.7 : i === 'MODERATE' ? 0.88 : 1,
      ageMultiplier: (age) => Math.max(0.55, 1 - age * 0.045),
      loadMultiplier: (freq) => 1 - freq * 0.35,
      maintenanceMultiplier: (q) => 0.88 + q * 0.0024,
      costEstimateEur: 500,
      downtimeHours: 3,
    },
    'water_pump': {
      baseLifeKm: 100000,
      baseLifeMonths: 72,
      usageMultiplier: (i) => i === 'EXTREME' ? 0.65 : i === 'HEAVY' ? 0.78 : i === 'MODERATE' ? 0.92 : 1,
      ageMultiplier: (age) => Math.max(0.5, 1 - age * 0.05),
      loadMultiplier: (freq) => 1 - freq * 0.2,
      maintenanceMultiplier: (q) => 0.9 + q * 0.002,
      costEstimateEur: 300,
      downtimeHours: 3,
    },
    'turbocharger': {
      baseLifeKm: 150000,
      baseLifeMonths: 96,
      usageMultiplier: (i) => i === 'EXTREME' ? 0.55 : i === 'HEAVY' ? 0.7 : i === 'MODERATE' ? 0.88 : 1,
      ageMultiplier: (age) => Math.max(0.45, 1 - age * 0.055),
      loadMultiplier: (freq) => 1 - freq * 0.3,
      maintenanceMultiplier: (q) => 0.85 + q * 0.003,
      costEstimateEur: 1500,
      downtimeHours: 6,
    },
  };

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =================== VEHICLE HEALTH PROFILE ===================

  async getVehicleHealthProfile(
    userId: string,
    vehicleId: string,
  ): Promise<VehicleHealthProfile> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, userId },
      include: {
        maintenanceLogs: {
          orderBy: { serviceDate: 'desc' },
        },
        fuelLogs: {
          orderBy: { fueledAt: 'desc' },
          take: 90,
        },
      },
    });

    if (!vehicle) {
      throw new Error('Fahrzeug nicht gefunden');
    }

    // Analyze usage patterns
    const usagePattern = await this.analyzeUsagePattern(userId, vehicleId, vehicle);

    // Assess maintenance quality
    const maintenanceQuality = this.assessMaintenanceQuality(vehicle.maintenanceLogs as any[] || []);

    // Calculate component health
    const componentHealth = this.calculateComponentHealth(vehicle, usagePattern, maintenanceQuality);

    // Generate predictions
    const predictions = this.generateFailurePredictions(vehicle, componentHealth, usagePattern);

    // Generate recommendations
    const recommendations = this.generateRecommendations(vehicle, componentHealth, predictions, maintenanceQuality);

    // Calculate overall health score
    const overallHealthScore = this.calculateOverallHealthScore(componentHealth);
    const riskCategory = this.categorizeRisk(overallHealthScore);

    return {
      vehicleId: vehicle.id,
      licensePlate: vehicle.licensePlate,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year || undefined,
      overallHealthScore,
      riskCategory,
      componentHealth,
      predictions,
      usagePattern,
      maintenanceQuality,
      recommendations,
    };
  }

  // =================== FAILURE PREDICTIONS ===================

  async getFailurePredictions(
    userId: string,
    options?: {
      vehicleId?: string;
      daysAhead?: number;
      minProbability?: number;
      riskLevel?: RiskLevel;
    },
  ): Promise<FailurePrediction[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        userId,
        ...(options?.vehicleId ? { id: options.vehicleId } : {}),
      },
      include: {
        maintenanceLogs: {
          orderBy: { serviceDate: 'desc' },
        },
        fuelLogs: {
          orderBy: { fueledAt: 'desc' },
          take: 90,
        },
      },
    });

    const allPredictions: FailurePrediction[] = [];
    const daysAhead = options?.daysAhead || 90;
    const minProbability = options?.minProbability || 0.3;
    const cutoffDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    for (const vehicle of vehicles) {
      const usagePattern = await this.analyzeUsagePattern(userId, vehicle.id, vehicle);
      const maintenanceQuality = this.assessMaintenanceQuality(vehicle.maintenanceLogs as any[] || []);
      const componentHealth = this.calculateComponentHealth(vehicle, usagePattern, maintenanceQuality);
      const predictions = this.generateFailurePredictions(vehicle, componentHealth, usagePattern);

      for (const prediction of predictions) {
        // Filter by date range
        if (prediction.predictedFailureDate > cutoffDate) continue;

        // Filter by probability
        if (prediction.probability < minProbability) continue;

        // Filter by risk level
        if (options?.riskLevel && prediction.riskLevel !== options.riskLevel) continue;

        allPredictions.push(prediction);
      }
    }

    // Sort by probability (highest first) then by date (soonest first)
    return allPredictions.sort((a, b) => {
      if (Math.abs(a.probability - b.probability) > 0.1) {
        return b.probability - a.probability;
      }
      return a.predictedFailureDate.getTime() - b.predictedFailureDate.getTime();
    });
  }

  // =================== FLEET-WIDE ANALYTICS ===================

  async getFleetPredictiveAnalytics(userId: string): Promise<FleetPredictiveAnalytics> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      include: {
        maintenanceLogs: {
          orderBy: { serviceDate: 'desc' },
        },
        fuelLogs: {
          orderBy: { fueledAt: 'desc' },
          take: 90,
        },
      },
    });

    const healthProfiles: VehicleHealthProfile[] = [];
    const componentRisks: Map<string, { vehicles: string[]; scores: number[]; costs: number[] }> = new Map();

    for (const vehicle of vehicles) {
      const usagePattern = await this.analyzeUsagePattern(userId, vehicle.id, vehicle);
      const maintenanceQuality = this.assessMaintenanceQuality(vehicle.maintenanceLogs as any[] || []);
      const componentHealth = this.calculateComponentHealth(vehicle, usagePattern, maintenanceQuality);
      const predictions = this.generateFailurePredictions(vehicle, componentHealth, usagePattern);
      const recommendations = this.generateRecommendations(vehicle, componentHealth, predictions, maintenanceQuality);
      const overallHealthScore = this.calculateOverallHealthScore(componentHealth);

      healthProfiles.push({
        vehicleId: vehicle.id,
        licensePlate: vehicle.licensePlate,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year || undefined,
        overallHealthScore,
        riskCategory: this.categorizeRisk(overallHealthScore),
        componentHealth,
        predictions,
        usagePattern,
        maintenanceQuality,
        recommendations,
      });

      // Aggregate component risks
      for (const health of componentHealth) {
        if (!componentRisks.has(health.component)) {
          componentRisks.set(health.component, { vehicles: [], scores: [], costs: [] });
        }
        const risk = componentRisks.get(health.component)!;
        risk.vehicles.push(vehicle.licensePlate);
        risk.scores.push(100 - health.healthScore);
        const model = this.degradationModels[health.component];
        if (model) risk.costs.push(model.costEstimateEur);
      }
    }

    // Calculate fleet metrics
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const vehiclesAtRisk = healthProfiles.filter(
      p => p.riskCategory === 'CRITICAL' || p.riskCategory === 'HIGH',
    ).length;

    let upcomingFailures30Days = 0;
    let estimatedMaintenanceCost30Days = 0;
    let predictedDowntimeHours = 0;

    for (const profile of healthProfiles) {
      for (const pred of profile.predictions) {
        if (pred.predictedFailureDate <= in30Days && pred.probability >= 0.5) {
          upcomingFailures30Days++;
          estimatedMaintenanceCost30Days += pred.estimatedCostEur;
          predictedDowntimeHours += pred.downtime;
        }
      }
    }

    // Calculate fleet health score
    const fleetHealthScore = healthProfiles.length > 0
      ? Math.round(healthProfiles.reduce((sum, p) => sum + p.overallHealthScore, 0) / healthProfiles.length)
      : 100;

    // Build component risk summary
    const componentRiskSummary: ComponentRiskSummary[] = [];
    componentRisks.forEach((data, component) => {
      const avgRisk = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      const highestRiskIdx = data.scores.indexOf(Math.max(...data.scores));

      componentRiskSummary.push({
        component,
        componentDe: COMPONENT_NAMES_DE[component] || component,
        vehiclesAffected: data.vehicles.length,
        averageRiskScore: Math.round(avgRisk),
        estimatedTotalCostEur: data.costs.reduce((a, b) => a + b, 0),
        highestRiskVehicle: data.vehicles[highestRiskIdx],
      });
    });

    // Sort by risk score
    componentRiskSummary.sort((a, b) => b.averageRiskScore - a.averageRiskScore);

    // Generate fleet recommendations
    const fleetRecommendations = this.generateFleetRecommendations(
      healthProfiles,
      componentRiskSummary,
    );

    // Calculate potential savings
    const costSavingsPotential = this.calculateCostSavingsPotential(healthProfiles);

    return {
      fleetHealthScore,
      vehiclesAtRisk,
      upcomingFailures30Days,
      estimatedMaintenanceCost30Days: Math.round(estimatedMaintenanceCost30Days * 100) / 100,
      predictedDowntimeHours: Math.round(predictedDowntimeHours * 10) / 10,
      componentRiskSummary: componentRiskSummary.slice(0, 10),
      costSavingsPotential: Math.round(costSavingsPotential * 100) / 100,
      recommendations: fleetRecommendations,
    };
  }

  // =================== COMPONENT HEALTH TRENDS ===================

  async getComponentHealthTrends(
    userId: string,
    vehicleId: string,
    component: string,
    months: number = 12,
  ): Promise<{
    component: string;
    componentDe: string;
    currentHealth: number;
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    history: Array<{ date: string; healthScore: number; event?: string }>;
    projectedHealth: Array<{ date: string; healthScore: number }>;
  }> {

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, userId },
      include: {
        maintenanceLogs: {
          where: {
            serviceDate: {
              gte: new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { serviceDate: 'asc' },
        },
      },
    });

    if (!vehicle) {
      throw new Error('Fahrzeug nicht gefunden');
    }

    const model = this.degradationModels[component];
    if (!model) {
      throw new Error(`Unbekannte Komponente: ${component}`);
    }

    // Build historical health data
    const history: Array<{ date: string; healthScore: number; event?: string }> = [];
    const now = new Date();

    // Simulate past health based on maintenance events
    let lastMaintenanceDate: Date | null = null;
    let currentHealthScore = 100;

    for (let i = months; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dateStr = date.toISOString().slice(0, 7);

      // Check for maintenance events this month
      const maintenanceThisMonth = vehicle.maintenanceLogs?.filter(log => {
        const logDate = new Date(log.serviceDate);
        return logDate.getFullYear() === date.getFullYear() &&
               logDate.getMonth() === date.getMonth() &&
               this.isComponentRelatedMaintenance(log.type, component);
      });

      if (maintenanceThisMonth && maintenanceThisMonth.length > 0) {
        currentHealthScore = 95 + Math.random() * 5; // Reset to near 100 after maintenance
        lastMaintenanceDate = new Date(maintenanceThisMonth[0].serviceDate);
        history.push({
          date: dateStr,
          healthScore: Math.round(currentHealthScore),
          event: 'Wartung durchgeführt',
        });
      } else {
        // Degradation over time
        const degradationPerMonth = (100 - 20) / (model.baseLifeMonths || 36);
        currentHealthScore = Math.max(20, currentHealthScore - degradationPerMonth);
        history.push({
          date: dateStr,
          healthScore: Math.round(currentHealthScore),
        });
      }
    }

    // Project future health
    const projectedHealth: Array<{ date: string; healthScore: number }> = [];
    let futureHealth = currentHealthScore;

    for (let i = 1; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const degradationPerMonth = (100 - 20) / (model.baseLifeMonths || 36);
      futureHealth = Math.max(0, futureHealth - degradationPerMonth);
      projectedHealth.push({
        date: date.toISOString().slice(0, 7),
        healthScore: Math.round(futureHealth),
      });
    }

    // Determine trend
    const recentHistory = history.slice(-3);
    const healthChange = recentHistory[recentHistory.length - 1]?.healthScore - recentHistory[0]?.healthScore;
    const trend: 'IMPROVING' | 'STABLE' | 'DECLINING' =
      healthChange > 10 ? 'IMPROVING' :
      healthChange < -10 ? 'DECLINING' : 'STABLE';

    return {
      component,
      componentDe: COMPONENT_NAMES_DE[component] || component,
      currentHealth: Math.round(currentHealthScore),
      trend,
      history,
      projectedHealth,
    };
  }

  // =================== MAINTENANCE OPTIMIZATION ===================

  async getOptimizedMaintenanceSchedule(
    userId: string,
    options?: {
      vehicleIds?: string[];
      daysAhead?: number;
      maxDowntimePerDay?: number;
      preferredDays?: number[]; // 0=Sunday, 1=Monday...
    },
  ): Promise<{
    schedule: Array<{
      date: string;
      dayOfWeek: string;
      vehicles: Array<{
        vehicleId: string;
        licensePlate: string;
        maintenanceItems: string[];
        estimatedDuration: number;
        estimatedCost: number;
        priority: number;
      }>;
      totalDuration: number;
      totalCost: number;
    }>;
    optimizationSummary: {
      totalMaintenanceItems: number;
      totalVehicles: number;
      totalCostEur: number;
      totalDowntimeHours: number;
      daysRequired: number;
      savingsFromBatching: number;
    };
  }> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        userId,
        ...(options?.vehicleIds?.length ? { id: { in: options.vehicleIds } } : {}),
      },
      include: {
        maintenanceLogs: {
          orderBy: { serviceDate: 'desc' },
        },
        fuelLogs: {
          orderBy: { fueledAt: 'desc' },
          take: 90,
        },
      },
    });

    const daysAhead = options?.daysAhead || 30;
    const maxDowntime = options?.maxDowntimePerDay || 8;
    const preferredDays = options?.preferredDays || [1, 2, 3, 4, 5]; // Mon-Fri

    // Collect all maintenance items
    interface MaintenanceItem {
      vehicleId: string;
      licensePlate: string;
      component: string;
      priority: number;
      estimatedDuration: number;
      estimatedCost: number;
      dueDate: Date;
    }

    const maintenanceItems: MaintenanceItem[] = [];

    for (const vehicle of vehicles) {
      const usagePattern = await this.analyzeUsagePattern(userId, vehicle.id, vehicle);
      const maintenanceQuality = this.assessMaintenanceQuality(vehicle.maintenanceLogs as any[] || []);
      const componentHealth = this.calculateComponentHealth(vehicle, usagePattern, maintenanceQuality);

      for (const health of componentHealth) {
        if (health.healthScore < 70) {
          const model = this.degradationModels[health.component];
          if (model) {
            const daysUntilDue = health.lifeUnit === 'days'
              ? health.estimatedLifeRemaining
              : Math.round(health.estimatedLifeRemaining / (usagePattern.averageDailyKm || 50));

            maintenanceItems.push({
              vehicleId: vehicle.id,
              licensePlate: vehicle.licensePlate,
              component: health.component,
              priority: 100 - health.healthScore,
              estimatedDuration: model.downtimeHours,
              estimatedCost: model.costEstimateEur,
              dueDate: new Date(Date.now() + Math.max(0, daysUntilDue) * 24 * 60 * 60 * 1000),
            });
          }
        }
      }
    }

    // Sort by priority (highest first)
    maintenanceItems.sort((a, b) => b.priority - a.priority);

    // Build optimized schedule
    const schedule: Map<string, {
      vehicles: Map<string, {
        licensePlate: string;
        items: string[];
        duration: number;
        cost: number;
        priority: number;
      }>;
      totalDuration: number;
      totalCost: number;
    }> = new Map();

    const germanDays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

    for (const item of maintenanceItems) {
      // Find best date for this item
      let scheduled = false;
      const now = new Date();

      for (let d = 0; d < daysAhead && !scheduled; d++) {
        const date = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
        const dayOfWeek = date.getDay();

        // Skip non-preferred days
        if (!preferredDays.includes(dayOfWeek)) continue;

        const dateStr = date.toISOString().slice(0, 10);

        // Initialize date if needed
        if (!schedule.has(dateStr)) {
          schedule.set(dateStr, {
            vehicles: new Map(),
            totalDuration: 0,
            totalCost: 0,
          });
        }

        const daySchedule = schedule.get(dateStr)!;

        // Check if we have capacity
        if (daySchedule.totalDuration + item.estimatedDuration <= maxDowntime) {
          // Add to vehicle entry
          if (!daySchedule.vehicles.has(item.vehicleId)) {
            daySchedule.vehicles.set(item.vehicleId, {
              licensePlate: item.licensePlate,
              items: [],
              duration: 0,
              cost: 0,
              priority: 0,
            });
          }

          const vehicleEntry = daySchedule.vehicles.get(item.vehicleId)!;
          vehicleEntry.items.push(COMPONENT_NAMES_DE[item.component] || item.component);
          vehicleEntry.duration += item.estimatedDuration;
          vehicleEntry.cost += item.estimatedCost;
          vehicleEntry.priority = Math.max(vehicleEntry.priority, item.priority);

          daySchedule.totalDuration += item.estimatedDuration;
          daySchedule.totalCost += item.estimatedCost;
          scheduled = true;
        }
      }
    }

    // Convert to array format
    const scheduleArray = Array.from(schedule.entries())
      .filter(([_, data]) => data.vehicles.size > 0)
      .map(([dateStr, data]) => {
        const date = new Date(dateStr);
        return {
          date: dateStr,
          dayOfWeek: germanDays[date.getDay()],
          vehicles: Array.from(data.vehicles.entries()).map(([vehicleId, v]) => ({
            vehicleId,
            licensePlate: v.licensePlate,
            maintenanceItems: v.items,
            estimatedDuration: Math.round(v.duration * 10) / 10,
            estimatedCost: Math.round(v.cost * 100) / 100,
            priority: Math.round(v.priority),
          })),
          totalDuration: Math.round(data.totalDuration * 10) / 10,
          totalCost: Math.round(data.totalCost * 100) / 100,
        };
      });

    // Calculate batching savings (15% reduction when multiple items done together)
    const totalCost = scheduleArray.reduce((sum, day) => sum + day.totalCost, 0);
    const batchedVehicles = scheduleArray.reduce(
      (sum, day) => sum + day.vehicles.filter(v => v.maintenanceItems.length > 1).length,
      0,
    );
    const savingsFromBatching = batchedVehicles * 50; // ~50 EUR savings per batched service

    return {
      schedule: scheduleArray,
      optimizationSummary: {
        totalMaintenanceItems: maintenanceItems.length,
        totalVehicles: vehicles.length,
        totalCostEur: Math.round(totalCost * 100) / 100,
        totalDowntimeHours: Math.round(
          scheduleArray.reduce((sum, day) => sum + day.totalDuration, 0) * 10,
        ) / 10,
        daysRequired: scheduleArray.length,
        savingsFromBatching: Math.round(savingsFromBatching * 100) / 100,
      },
    };
  }

  // =================== ANOMALY DETECTION ===================

  async detectMaintenanceAnomalies(
    userId: string,
    vehicleId: string,
  ): Promise<{
    vehicleId: string;
    licensePlate: string;
    anomalies: Array<{
      type: 'COST' | 'FREQUENCY' | 'PATTERN' | 'PERFORMANCE';
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      title: string;
      titleDe: string;
      description: string;
      descriptionDe: string;
      detectedAt: Date;
      relatedData: Record<string, any>;
      recommendation: string;
      recommendationDe: string;
    }>;
    anomalyScore: number;
  }> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, userId },
      include: {
        maintenanceLogs: {
          orderBy: { serviceDate: 'desc' },
        },
        fuelLogs: {
          orderBy: { fueledAt: 'desc' },
          take: 90,
        },
      },
    });

    if (!vehicle) {
      throw new Error('Fahrzeug nicht gefunden');
    }

    const anomalies: Array<{
      type: 'COST' | 'FREQUENCY' | 'PATTERN' | 'PERFORMANCE';
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      title: string;
      titleDe: string;
      description: string;
      descriptionDe: string;
      detectedAt: Date;
      relatedData: Record<string, any>;
      recommendation: string;
      recommendationDe: string;
    }> = [];

    const logs = vehicle.maintenanceLogs as any[] || [];

    // 1. Cost anomalies - check for unusually high costs
    const costs: number[] = logs.map((l: any) => l.totalCost || 0).filter((c: number) => c > 0);
    if (costs.length >= 3) {
      const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
      const stdDev = Math.sqrt(costs.reduce((sum, c) => sum + Math.pow(c - avgCost, 2), 0) / costs.length);

      const recentHighCosts = logs.slice(0, 3).filter((l: any) => (l.totalCost || 0) > avgCost + 2 * stdDev);

      for (const log of recentHighCosts) {
        anomalies.push({
          type: 'COST',
          severity: 'HIGH',
          title: 'Unusually High Maintenance Cost',
          titleDe: 'Ungewöhnlich hohe Wartungskosten',
          description: `Cost of €${log.totalCost} is ${((log.totalCost! / avgCost - 1) * 100).toFixed(0)}% above average`,
          descriptionDe: `Kosten von €${log.totalCost} liegen ${((log.totalCost! / avgCost - 1) * 100).toFixed(0)}% über dem Durchschnitt`,
          detectedAt: new Date(),
          relatedData: {
            cost: log.totalCost,
            averageCost: Math.round(avgCost),
            standardDeviation: Math.round(stdDev),
            maintenanceType: log.type,
          },
          recommendation: 'Review vendor pricing and consider getting competitive quotes',
          recommendationDe: 'Überprüfen Sie die Preise des Anbieters und holen Sie Vergleichsangebote ein',
        });
      }
    }

    // 2. Frequency anomalies - same maintenance type too often
    const maintenanceByType = new Map<string, Date[]>();
    for (const log of logs) {
      if (!maintenanceByType.has(log.type)) {
        maintenanceByType.set(log.type, []);
      }
      maintenanceByType.get(log.type)!.push(new Date(log.serviceDate));
    }

    maintenanceByType.forEach((dates, type) => {
      if (dates.length >= 3) {
        const intervals = [];
        for (let i = 0; i < dates.length - 1; i++) {
          intervals.push((dates[i].getTime() - dates[i + 1].getTime()) / (24 * 60 * 60 * 1000));
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

        // Check for expected interval based on type
        const expectedIntervals: Record<string, number> = {
          OIL_CHANGE: 180, // 6 months
          BRAKE_SERVICE: 365, // 1 year
          TIRE_ROTATION: 120, // 4 months
        };

        const expected = expectedIntervals[type];
        if (expected && avgInterval < expected * 0.5) {
          anomalies.push({
            type: 'FREQUENCY',
            severity: 'MEDIUM',
            title: `Frequent ${type.replace(/_/g, ' ')} Services`,
            titleDe: `Häufige ${this.getGermanMaintenanceType(type)} Wartungen`,
            description: `Average interval of ${Math.round(avgInterval)} days vs expected ${expected} days`,
            descriptionDe: `Durchschnittliches Intervall von ${Math.round(avgInterval)} Tagen statt erwarteter ${expected} Tage`,
            detectedAt: new Date(),
            relatedData: {
              maintenanceType: type,
              averageIntervalDays: Math.round(avgInterval),
              expectedIntervalDays: expected,
              occurrences: dates.length,
            },
            recommendation: 'Investigate root cause - possible component quality issue',
            recommendationDe: 'Ursache untersuchen - möglicherweise ein Qualitätsproblem der Komponente',
          });
        }
      }
    });

    // 3. Fuel efficiency anomalies
    const fuelLogs = (vehicle.fuelLogs as any[]) || [];
    if (fuelLogs.length >= 10) {
      const efficiencies = fuelLogs
        .filter((f: any) => f.liters && f.odometerReading)
        .slice(0, -1)
        .map((log: any, i: number) => {
          const nextLog = fuelLogs[i + 1];
          if (nextLog?.odometerReading && log.odometerReading) {
            const distance = log.odometerReading - nextLog.odometerReading;
            const liters = typeof log.liters === 'object' ? parseFloat(log.liters.toString()) : log.liters;
            return distance > 0 ? (liters / distance) * 100 : null;
          }
          return null;
        })
        .filter((e: any): e is number => e !== null && e > 0 && e < 30);

      if (efficiencies.length >= 5) {
        const avgEfficiency = efficiencies.reduce((a: number, b: number) => a + b, 0) / efficiencies.length;
        const recentAvg = efficiencies.slice(0, 3).reduce((a: number, b: number) => a + b, 0) / 3;

        if (recentAvg > avgEfficiency * 1.2) {
          anomalies.push({
            type: 'PERFORMANCE',
            severity: 'MEDIUM',
            title: 'Declining Fuel Efficiency',
            titleDe: 'Sinkende Kraftstoffeffizienz',
            description: `Recent consumption ${recentAvg.toFixed(1)} L/100km vs average ${avgEfficiency.toFixed(1)} L/100km`,
            descriptionDe: `Aktueller Verbrauch ${recentAvg.toFixed(1)} L/100km vs Durchschnitt ${avgEfficiency.toFixed(1)} L/100km`,
            detectedAt: new Date(),
            relatedData: {
              recentConsumption: Math.round(recentAvg * 10) / 10,
              averageConsumption: Math.round(avgEfficiency * 10) / 10,
              increasePercent: Math.round((recentAvg / avgEfficiency - 1) * 100),
            },
            recommendation: 'Check air filter, tire pressure, and consider engine diagnostics',
            recommendationDe: 'Luftfilter und Reifendruck prüfen, ggf. Motordiagnose durchführen',
          });
        }
      }
    }

    // Calculate overall anomaly score (0-100, higher = more anomalies)
    const severityWeights = { LOW: 10, MEDIUM: 30, HIGH: 50 };
    const anomalyScore = Math.min(100, anomalies.reduce(
      (sum, a) => sum + severityWeights[a.severity],
      0,
    ));

    return {
      vehicleId: vehicle.id,
      licensePlate: vehicle.licensePlate,
      anomalies,
      anomalyScore,
    };
  }

  // =================== PRIVATE HELPER METHODS ===================

  private async analyzeUsagePattern(
    userId: string,
    vehicleId: string,
    vehicle: any,
  ): Promise<UsagePattern> {
    // Get route history to analyze usage
    const routes = await this.prisma.deliveryRoute.findMany({
      where: { vehicleId },
      orderBy: { createdAt: 'desc' },
      take: 90,
      include: {
        stops: true,
      },
    });

    // Calculate average daily km from routes
    const kmByDay = new Map<string, number>();
    const deliveriesByDay = new Map<string, number>();

    for (const route of routes) {
      const dateKey = new Date(route.createdAt).toISOString().slice(0, 10);
      const distanceKm = route.actualDistanceKm
        ? (typeof route.actualDistanceKm === 'object' ? parseFloat(route.actualDistanceKm.toString()) : route.actualDistanceKm)
        : 0;
      kmByDay.set(dateKey, (kmByDay.get(dateKey) || 0) + distanceKm);
      deliveriesByDay.set(dateKey, (deliveriesByDay.get(dateKey) || 0) + (route.stops?.length || 0));
    }

    const avgDailyKm = kmByDay.size > 0
      ? Array.from(kmByDay.values()).reduce((a, b) => a + b, 0) / kmByDay.size
      : 50;

    const avgDeliveriesPerDay = deliveriesByDay.size > 0
      ? Array.from(deliveriesByDay.values()).reduce((a, b) => a + b, 0) / deliveriesByDay.size
      : 10;

    // Determine peak usage days
    const dayTotals = new Map<number, number>();
    routes.forEach(r => {
      const day = new Date(r.createdAt).getDay();
      dayTotals.set(day, (dayTotals.get(day) || 0) + 1);
    });

    const germanDays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const sortedDays = Array.from(dayTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([day]) => germanDays[day]);

    // Estimate urban vs highway ratio based on average speed/distance
    const urbanRatio = avgDailyKm < 100 ? 0.8 : avgDailyKm < 200 ? 0.5 : 0.3;

    // Determine usage intensity
    let usageIntensity: 'LIGHT' | 'MODERATE' | 'HEAVY' | 'EXTREME';
    if (avgDailyKm >= 300 || avgDeliveriesPerDay >= 40) {
      usageIntensity = 'EXTREME';
    } else if (avgDailyKm >= 200 || avgDeliveriesPerDay >= 25) {
      usageIntensity = 'HEAVY';
    } else if (avgDailyKm >= 100 || avgDeliveriesPerDay >= 15) {
      usageIntensity = 'MODERATE';
    } else {
      usageIntensity = 'LIGHT';
    }

    return {
      averageDailyKm: Math.round(avgDailyKm),
      averageDeliveriesPerDay: Math.round(avgDeliveriesPerDay * 10) / 10,
      peakUsageDays: sortedDays,
      idlePercentage: Math.max(0, 100 - (routes.length / 90) * 100),
      heavyLoadFrequency: avgDeliveriesPerDay >= 30 ? 0.7 : avgDeliveriesPerDay >= 20 ? 0.4 : 0.2,
      urbanVsHighwayRatio: urbanRatio,
      usageIntensity,
    };
  }

  private assessMaintenanceQuality(logs: any[]): MaintenanceQuality {
    if (logs.length === 0) {
      return {
        onTimeMaintenanceRate: 1,
        averageMaintenanceDelay: 0,
        preferredVendors: [],
        averageCostVariance: 0,
        qualityScore: 75,
      };
    }

    // Analyze vendor patterns
    const vendorCounts = new Map<string, number>();
    for (const log of logs) {
      if (log.vendorName) {
        vendorCounts.set(log.vendorName, (vendorCounts.get(log.vendorName) || 0) + 1);
      }
    }

    const preferredVendors = Array.from(vendorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    // Estimate quality based on maintenance regularity
    const intervals: number[] = [];
    for (let i = 0; i < logs.length - 1; i++) {
      const interval = new Date(logs[i].serviceDate).getTime() -
                       new Date(logs[i + 1].serviceDate).getTime();
      intervals.push(interval / (24 * 60 * 60 * 1000));
    }

    const avgInterval = intervals.length > 0
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 90;

    // Good maintenance is regular (30-90 day intervals typically)
    const regularityScore = avgInterval >= 30 && avgInterval <= 180 ? 85 :
                           avgInterval < 30 ? 70 : 60;

    return {
      onTimeMaintenanceRate: 0.85 + Math.random() * 0.1,
      averageMaintenanceDelay: Math.max(0, Math.round(Math.random() * 10 - 3)),
      preferredVendors,
      averageCostVariance: -5 + Math.random() * 15,
      qualityScore: regularityScore,
    };
  }

  private calculateComponentHealth(
    vehicle: any,
    usagePattern: UsagePattern,
    maintenanceQuality: MaintenanceQuality,
  ): ComponentHealth[] {
    const componentHealth: ComponentHealth[] = [];
    const now = new Date();
    const vehicleAgeYears = vehicle.year
      ? (now.getFullYear() - vehicle.year)
      : 5;

    const mileage = vehicle.mileage || 50000;

    for (const [component, model] of Object.entries(this.degradationModels)) {
      // Calculate remaining life based on model
      const usageMult = model.usageMultiplier(usagePattern.usageIntensity);
      const ageMult = model.ageMultiplier(vehicleAgeYears);
      const loadMult = model.loadMultiplier(usagePattern.heavyLoadFrequency);
      const maintMult = model.maintenanceMultiplier(maintenanceQuality.qualityScore);

      const effectiveLifeKm = model.baseLifeKm * usageMult * ageMult * loadMult * maintMult;

      // Find last maintenance for this component
      const lastMaintenance = vehicle.maintenanceLogs?.find((l: any) =>
        this.isComponentRelatedMaintenance(l.type, component),
      );

      let kmSinceLastService = mileage;
      if (lastMaintenance?.odometerReading) {
        kmSinceLastService = mileage - lastMaintenance.odometerReading;
      }

      // Calculate health score (100 = new, 0 = failed)
      const usedLifePercent = Math.min(1, kmSinceLastService / effectiveLifeKm);
      const healthScore = Math.max(0, Math.round((1 - usedLifePercent) * 100));

      // Calculate remaining life
      const estimatedLifeRemaining = Math.max(0, effectiveLifeKm - kmSinceLastService);

      // Determine risk level
      let riskLevel: RiskLevel;
      if (healthScore <= 20) {
        riskLevel = 'CRITICAL';
      } else if (healthScore <= 40) {
        riskLevel = 'HIGH';
      } else if (healthScore <= 60) {
        riskLevel = 'MODERATE';
      } else if (healthScore <= 80) {
        riskLevel = 'LOW';
      } else {
        riskLevel = 'MINIMAL';
      }

      // Determine confidence based on data quality
      const confidence: ConfidenceLevel = lastMaintenance
        ? (vehicle.maintenanceLogs?.length >= 5 ? 'HIGH' : 'MEDIUM')
        : 'LOW';

      // Build contributing factors
      const factors: string[] = [];
      if (usagePattern.usageIntensity === 'EXTREME' || usagePattern.usageIntensity === 'HEAVY') {
        factors.push(`Hohe Nutzungsintensität (${usagePattern.usageIntensity})`);
      }
      if (vehicleAgeYears > 5) {
        factors.push(`Fahrzeugalter: ${vehicleAgeYears} Jahre`);
      }
      if (usagePattern.heavyLoadFrequency > 0.5) {
        factors.push('Häufige Schwerlast');
      }
      if (maintenanceQuality.qualityScore < 70) {
        factors.push('Wartungsqualität verbesserungswürdig');
      }

      componentHealth.push({
        component,
        componentDe: COMPONENT_NAMES_DE[component] || component,
        healthScore,
        riskLevel,
        estimatedLifeRemaining: Math.round(estimatedLifeRemaining),
        lifeUnit: 'km',
        confidence,
        factors,
      });
    }

    // Sort by health score (lowest first = highest priority)
    return componentHealth.sort((a, b) => a.healthScore - b.healthScore);
  }

  private generateFailurePredictions(
    vehicle: any,
    componentHealth: ComponentHealth[],
    usagePattern: UsagePattern,
  ): FailurePrediction[] {
    const predictions: FailurePrediction[] = [];
    const now = new Date();
    const avgDailyKm = usagePattern.averageDailyKm || 50;

    for (const health of componentHealth) {
      if (health.healthScore > 80) continue; // Skip healthy components

      const model = this.degradationModels[health.component];
      if (!model) continue;

      // Calculate predicted failure date
      const daysUntilFailure = health.lifeUnit === 'km'
        ? Math.round(health.estimatedLifeRemaining / avgDailyKm)
        : health.estimatedLifeRemaining;

      const predictedDate = new Date(now.getTime() + daysUntilFailure * 24 * 60 * 60 * 1000);

      // Calculate probability (inverse of health with some variance)
      const baseProbability = (100 - health.healthScore) / 100;
      const probability = Math.min(0.95, baseProbability * (0.9 + Math.random() * 0.2));

      // Map component to maintenance type
      const maintenanceType = this.mapComponentToMaintenanceType(health.component);

      // Build factors
      const factors: FailureFactor[] = health.factors.map(f => ({
        factor: f,
        factorDe: f,
        impact: 'NEGATIVE' as const,
        weight: 0.3,
        value: '',
      }));

      factors.push({
        factor: 'Component age',
        factorDe: 'Komponentenalter',
        impact: health.healthScore < 50 ? 'NEGATIVE' : 'NEUTRAL',
        weight: 0.4,
        value: `${health.healthScore}% Gesundheit`,
      });

      // Recommendations in both languages
      const isPreventive = daysUntilFailure > 14;
      const recommendation = isPreventive
        ? `Schedule ${COMPONENT_NAMES_DE[health.component] || health.component} maintenance within ${daysUntilFailure} days`
        : `Urgent: ${COMPONENT_NAMES_DE[health.component] || health.component} replacement needed immediately`;

      const recommendationDe = isPreventive
        ? `${COMPONENT_NAMES_DE[health.component] || health.component} Wartung innerhalb von ${daysUntilFailure} Tagen planen`
        : `Dringend: ${COMPONENT_NAMES_DE[health.component] || health.component} Austausch sofort erforderlich`;

      predictions.push({
        id: `pred-${vehicle.id}-${health.component}`,
        vehicleId: vehicle.id,
        licensePlate: vehicle.licensePlate,
        component: health.component,
        componentDe: COMPONENT_NAMES_DE[health.component] || health.component,
        maintenanceType,
        predictedFailureDate: predictedDate,
        predictedFailureKm: vehicle.mileage ? vehicle.mileage + health.estimatedLifeRemaining : undefined,
        probability: Math.round(probability * 100) / 100,
        confidence: health.confidence,
        riskLevel: health.riskLevel,
        estimatedCostEur: model.costEstimateEur,
        downtime: model.downtimeHours,
        preventiveActionRecommended: isPreventive,
        recommendation,
        recommendationDe,
        factors,
      });
    }

    // Sort by probability then by date
    return predictions.sort((a, b) => {
      if (Math.abs(a.probability - b.probability) > 0.1) {
        return b.probability - a.probability;
      }
      return a.predictedFailureDate.getTime() - b.predictedFailureDate.getTime();
    });
  }

  private generateRecommendations(
    vehicle: any,
    componentHealth: ComponentHealth[],
    predictions: FailurePrediction[],
    maintenanceQuality: MaintenanceQuality,
  ): MaintenanceRecommendation[] {
    const recommendations: MaintenanceRecommendation[] = [];
    const now = new Date();

    // Add recommendations for critical components
    for (const pred of predictions.filter(p => p.probability >= 0.5)) {
      const daysUntil = Math.round(
        (pred.predictedFailureDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );

      recommendations.push({
        id: `rec-${pred.id}`,
        priority: pred.riskLevel === 'CRITICAL' ? 10 : pred.riskLevel === 'HIGH' ? 8 : 5,
        type: pred.preventiveActionRecommended ? 'PREVENTIVE' : 'PREDICTIVE',
        title: `Service ${pred.componentDe}`,
        titleDe: `${pred.componentDe} warten`,
        description: pred.recommendation,
        descriptionDe: pred.recommendationDe,
        estimatedCostEur: pred.estimatedCostEur,
        estimatedSavingsEur: pred.probability >= 0.7 ? pred.estimatedCostEur * 0.3 : 0,
        recommendedDate: new Date(now.getTime() + Math.max(1, daysUntil - 7) * 24 * 60 * 60 * 1000),
        dueWithinDays: Math.max(1, daysUntil),
        affectedComponents: [pred.component],
      });
    }

    // Add quality improvement recommendation if needed
    if (maintenanceQuality.qualityScore < 70) {
      recommendations.push({
        id: `rec-quality-${vehicle.id}`,
        priority: 4,
        type: 'OPTIMIZATION',
        title: 'Improve Maintenance Regularity',
        titleDe: 'Wartungsregelmäßigkeit verbessern',
        description: 'Establish a more consistent maintenance schedule to extend component life',
        descriptionDe: 'Regelmäßigeren Wartungsplan erstellen, um die Lebensdauer der Komponenten zu verlängern',
        estimatedCostEur: 0,
        estimatedSavingsEur: 500,
        recommendedDate: new Date(),
        dueWithinDays: 30,
        affectedComponents: [],
      });
    }

    // Sort by priority
    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  private generateFleetRecommendations(
    profiles: VehicleHealthProfile[],
    componentRisks: ComponentRiskSummary[],
  ): FleetRecommendation[] {
    const recommendations: FleetRecommendation[] = [];

    // Check for bulk maintenance opportunities
    const highRiskComponents = componentRisks.filter(c => c.averageRiskScore >= 50);
    for (const comp of highRiskComponents.slice(0, 3)) {
      if (comp.vehiclesAffected >= 3) {
        recommendations.push({
          type: 'BULK_MAINTENANCE',
          title: `Bulk ${comp.componentDe} Service`,
          titleDe: `Sammelwartung ${comp.componentDe}`,
          description: `Schedule bulk maintenance for ${comp.vehiclesAffected} vehicles to save on service costs`,
          descriptionDe: `Sammelwartung für ${comp.vehiclesAffected} Fahrzeuge planen, um Servicekosten zu sparen`,
          potentialSavingsEur: comp.vehiclesAffected * 50, // ~50 EUR savings per vehicle
          vehiclesAffected: comp.vehiclesAffected,
          implementationComplexity: 'LOW',
        });
      }
    }

    // Check for schedule optimization
    const criticalVehicles = profiles.filter(
      p => p.riskCategory === 'CRITICAL' || p.riskCategory === 'HIGH',
    );
    if (criticalVehicles.length >= 2) {
      recommendations.push({
        type: 'SCHEDULE_OPTIMIZATION',
        title: 'Prioritize Critical Vehicles',
        titleDe: 'Kritische Fahrzeuge priorisieren',
        description: `${criticalVehicles.length} vehicles require immediate attention - optimize schedule`,
        descriptionDe: `${criticalVehicles.length} Fahrzeuge erfordern sofortige Aufmerksamkeit - Zeitplan optimieren`,
        potentialSavingsEur: criticalVehicles.length * 200,
        vehiclesAffected: criticalVehicles.length,
        implementationComplexity: 'MEDIUM',
      });
    }

    // Check for replacement recommendations
    const veryOldVehicles = profiles.filter(p => p.overallHealthScore < 40);
    if (veryOldVehicles.length > 0) {
      recommendations.push({
        type: 'REPLACEMENT',
        title: 'Consider Vehicle Replacement',
        titleDe: 'Fahrzeugaustausch erwägen',
        description: `${veryOldVehicles.length} vehicle(s) have low health scores - consider replacement analysis`,
        descriptionDe: `${veryOldVehicles.length} Fahrzeug(e) haben niedrige Gesundheitswerte - Austausch-Analyse erwägen`,
        potentialSavingsEur: veryOldVehicles.length * 1000,
        vehiclesAffected: veryOldVehicles.length,
        implementationComplexity: 'HIGH',
      });
    }

    return recommendations;
  }

  private calculateOverallHealthScore(componentHealth: ComponentHealth[]): number {
    if (componentHealth.length === 0) return 100;

    // Weighted average - critical components have higher weight
    const weights: Record<string, number> = {
      'brake_pads': 1.5,
      'brake_discs': 1.5,
      'timing_belt': 1.3,
      'tires': 1.2,
      'engine_oil': 1.1,
    };

    let totalWeight = 0;
    let weightedSum = 0;

    for (const health of componentHealth) {
      const weight = weights[health.component] || 1;
      weightedSum += health.healthScore * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 100;
  }

  private calculateCostSavingsPotential(profiles: VehicleHealthProfile[]): number {
    let savings = 0;

    for (const profile of profiles) {
      // Savings from predictive vs reactive maintenance
      for (const pred of profile.predictions) {
        if (pred.probability >= 0.6 && pred.preventiveActionRecommended) {
          savings += pred.estimatedCostEur * 0.25; // 25% savings from proactive maintenance
        }
      }

      // Savings from optimized scheduling
      if (profile.recommendations.length >= 2) {
        savings += 100; // Batching savings
      }
    }

    return savings;
  }

  private categorizeRisk(healthScore: number): RiskLevel {
    if (healthScore <= 30) return 'CRITICAL';
    if (healthScore <= 50) return 'HIGH';
    if (healthScore <= 70) return 'MODERATE';
    if (healthScore <= 85) return 'LOW';
    return 'MINIMAL';
  }

  private isComponentRelatedMaintenance(type: MaintenanceType, component: string): boolean {
    const mapping: Record<string, MaintenanceType[]> = {
      'engine_oil': ['OIL_CHANGE', 'SCHEDULED_SERVICE'],
      'brake_pads': ['BRAKE_SERVICE', 'SCHEDULED_SERVICE'],
      'brake_discs': ['BRAKE_SERVICE', 'SCHEDULED_SERVICE'],
      'tires': ['TIRE_ROTATION', 'SCHEDULED_SERVICE'],
      'timing_belt': ['SCHEDULED_SERVICE', 'REPAIR'],
      'clutch': ['REPAIR', 'UNSCHEDULED_REPAIR'],
      'battery': ['SCHEDULED_SERVICE', 'REPAIR'],
      'alternator': ['REPAIR', 'UNSCHEDULED_REPAIR'],
      'starter_motor': ['REPAIR', 'UNSCHEDULED_REPAIR'],
      'shock_absorbers': ['SCHEDULED_SERVICE', 'REPAIR'],
      'water_pump': ['SCHEDULED_SERVICE', 'REPAIR'],
      'turbocharger': ['REPAIR', 'UNSCHEDULED_REPAIR'],
    };

    const relatedTypes = mapping[component] || [];
    return relatedTypes.includes(type);
  }

  private mapComponentToMaintenanceType(component: string): MaintenanceType {
    const mapping: Record<string, MaintenanceType> = {
      'engine_oil': 'OIL_CHANGE',
      'brake_pads': 'BRAKE_SERVICE',
      'brake_discs': 'BRAKE_SERVICE',
      'tires': 'TIRE_ROTATION',
      'timing_belt': 'SCHEDULED_SERVICE',
      'clutch': 'REPAIR',
      'battery': 'REPAIR',
      'alternator': 'REPAIR',
      'starter_motor': 'REPAIR',
      'shock_absorbers': 'REPAIR',
      'water_pump': 'REPAIR',
      'turbocharger': 'REPAIR',
    };

    return mapping[component] || 'OTHER';
  }

  private getGermanMaintenanceType(type: string): string {
    const labels: Record<string, string> = {
      OIL_CHANGE: 'Ölwechsel',
      BRAKE_SERVICE: 'Bremsenservice',
      TIRE_ROTATION: 'Reifenwechsel',
      SCHEDULED_SERVICE: 'Planmäßige Wartung',
      TUV_INSPECTION: 'TÜV-Prüfung',
      REPAIR: 'Reparatur',
      UNSCHEDULED_REPAIR: 'Außerplanmäßige Reparatur',
      CLEANING: 'Reinigung',
      OTHER: 'Sonstiges',
    };
    return labels[type] || type;
  }
}
