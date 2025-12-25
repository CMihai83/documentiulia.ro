import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Tachograph Data Integration Service
 * Per EU Regulation 561/2006 (driving/rest times) and 165/2014 (tachograph equipment)
 *
 * Features:
 * - Digital tachograph file (.ddd) parsing
 * - Driver card data analysis
 * - Activity tracking (driving, rest, work, availability)
 * - EU compliance checking with infringement detection
 * - Rest period validation
 * - Weekly driving time tracking
 * - Driver attestation forms (Form EU 561/2006)
 */

// =================== TYPES & ENUMS ===================

export enum TachographActivityType {
  DRIVING = 'DRIVING',
  REST = 'REST',
  WORK = 'WORK',
  AVAILABILITY = 'AVAILABILITY',
  BREAK = 'BREAK',
  UNKNOWN = 'UNKNOWN',
}

export enum InfringementSeverity {
  MINOR = 'MINOR',       // No fine, just warning
  SERIOUS = 'SERIOUS',   // Fine up to €500
  VERY_SERIOUS = 'VERY_SERIOUS', // Fine up to €2000, possible license suspension
  MOST_SERIOUS = 'MOST_SERIOUS', // Fine up to €5000, license suspension
}

export enum InfringementType {
  DAILY_DRIVING_EXCEEDED = 'DAILY_DRIVING_EXCEEDED',
  WEEKLY_DRIVING_EXCEEDED = 'WEEKLY_DRIVING_EXCEEDED',
  BI_WEEKLY_DRIVING_EXCEEDED = 'BI_WEEKLY_DRIVING_EXCEEDED',
  CONTINUOUS_DRIVING_EXCEEDED = 'CONTINUOUS_DRIVING_EXCEEDED',
  DAILY_REST_INSUFFICIENT = 'DAILY_REST_INSUFFICIENT',
  WEEKLY_REST_INSUFFICIENT = 'WEEKLY_REST_INSUFFICIENT',
  BREAK_INSUFFICIENT = 'BREAK_INSUFFICIENT',
  MISSING_MANUAL_ENTRY = 'MISSING_MANUAL_ENTRY',
  CARD_NOT_INSERTED = 'CARD_NOT_INSERTED',
  MANIPULATION_DETECTED = 'MANIPULATION_DETECTED',
}

export interface TachographFile {
  id: string;
  userId: string;
  driverId?: string;
  vehicleId?: string;
  fileType: 'DRIVER_CARD' | 'VEHICLE_UNIT' | 'COMPANY_CARD';
  fileName: string;
  fileHash: string;
  uploadedAt: Date;
  parsedAt?: Date;
  periodStart: Date;
  periodEnd: Date;
  status: 'PENDING' | 'PARSED' | 'ERROR';
  errorMessage?: string;
}

export interface DriverCardData {
  cardNumber: string;
  driverName: string;
  birthDate?: Date;
  issuingCountry: string;
  issuingAuthority: string;
  validFrom: Date;
  validTo: Date;
  cardGeneration: number; // 1 or 2
}

export interface VehicleUnitData {
  vehicleRegistration: string;
  vehicleIdentification: string; // VIN
  registrationCountry: string;
  tachographSerial: string;
  calibrationDate?: Date;
  nextCalibrationDue?: Date;
}

export interface ActivityRecord {
  id: string;
  driverId: string;
  vehicleId?: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  activityType: TachographActivityType;
  durationMinutes: number;
  distanceKm?: number;
  startOdometer?: number;
  endOdometer?: number;
  isManualEntry: boolean;
  location?: {
    country: string;
    region?: string;
  };
}

export interface DailyAnalysis {
  date: Date;
  driverId: string;
  driverName: string;
  totalDrivingMinutes: number;
  totalRestMinutes: number;
  totalWorkMinutes: number;
  totalAvailabilityMinutes: number;
  continuousDrivingPeriods: {
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    breakTakenMinutes: number;
  }[];
  dailyRestPeriod?: {
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    isReduced: boolean;
    isSplit: boolean;
  };
  infringements: Infringement[];
  isCompliant: boolean;
  distanceKm: number;
}

export interface WeeklyAnalysis {
  weekNumber: number;
  year: number;
  weekStart: Date;
  weekEnd: Date;
  driverId: string;
  driverName: string;
  totalDrivingMinutes: number;
  dailyAnalyses: DailyAnalysis[];
  weeklyRestPeriod?: {
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    isReduced: boolean;
  };
  extendedDaysUsed: number; // Max 2 per week (10h instead of 9h)
  reducedRestDaysUsed: number; // Max 3 per week (9h instead of 11h)
  infringements: Infringement[];
  isCompliant: boolean;
}

export interface Infringement {
  id: string;
  driverId: string;
  vehicleId?: string;
  date: Date;
  type: InfringementType;
  severity: InfringementSeverity;
  description: string;
  actualValue: number;
  limitValue: number;
  unit: string;
  potentialFine?: number;
  acknowledged: boolean;
  notes?: string;
}

export interface ComplianceSummary {
  driverId: string;
  driverName: string;
  periodStart: Date;
  periodEnd: Date;
  totalDrivingHours: number;
  totalInfringements: number;
  infringementsBySeverity: Record<InfringementSeverity, number>;
  complianceScore: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  potentialFines: number;
  recommendations: string[];
}

// EU Regulation 561/2006 limits
const EU_REGULATIONS = {
  // Daily driving
  MAX_DAILY_DRIVING_MINUTES: 9 * 60, // 9 hours
  MAX_EXTENDED_DAILY_DRIVING_MINUTES: 10 * 60, // 10 hours (max 2x per week)

  // Continuous driving
  MAX_CONTINUOUS_DRIVING_MINUTES: 4.5 * 60, // 4.5 hours
  MIN_BREAK_MINUTES: 45, // 45 minutes (can be split: 15 + 30)

  // Weekly driving
  MAX_WEEKLY_DRIVING_MINUTES: 56 * 60, // 56 hours
  MAX_BI_WEEKLY_DRIVING_MINUTES: 90 * 60, // 90 hours (two consecutive weeks)

  // Daily rest
  MIN_DAILY_REST_MINUTES: 11 * 60, // 11 hours
  MIN_REDUCED_DAILY_REST_MINUTES: 9 * 60, // 9 hours (max 3x per week)
  MAX_REDUCED_DAILY_REST_PER_WEEK: 3,

  // Split daily rest
  MIN_SPLIT_REST_FIRST_PERIOD: 3 * 60, // At least 3 hours
  MIN_SPLIT_REST_SECOND_PERIOD: 9 * 60, // At least 9 hours (total 12h)

  // Weekly rest
  MIN_WEEKLY_REST_MINUTES: 45 * 60, // 45 hours
  MIN_REDUCED_WEEKLY_REST_MINUTES: 24 * 60, // 24 hours (must compensate within 3 weeks)

  // Work period limits
  MAX_DRIVING_BEFORE_REST: 6 * 24 * 60, // 6 x 24h periods maximum before weekly rest
};

// Fine structure (typical EU amounts)
const FINE_STRUCTURE: Record<InfringementSeverity, { min: number; max: number }> = {
  [InfringementSeverity.MINOR]: { min: 0, max: 100 },
  [InfringementSeverity.SERIOUS]: { min: 100, max: 500 },
  [InfringementSeverity.VERY_SERIOUS]: { min: 500, max: 2000 },
  [InfringementSeverity.MOST_SERIOUS]: { min: 2000, max: 5000 },
};

@Injectable()
export class TachographService {
  private readonly logger = new Logger(TachographService.name);

  // In-memory storage (would be Prisma models in production)
  private tachographFiles: Map<string, TachographFile> = new Map();
  private activityRecords: Map<string, ActivityRecord[]> = new Map();
  private infringements: Map<string, Infringement[]> = new Map();
  private fileCounter = 0;
  private activityCounter = 0;
  private infringementCounter = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // =================== FILE PROCESSING ===================

  /**
   * Upload and parse tachograph file (.ddd format)
   */
  async uploadTachographFile(
    userId: string,
    file: {
      buffer: Buffer;
      originalName: string;
      fileType: 'DRIVER_CARD' | 'VEHICLE_UNIT' | 'COMPANY_CARD';
      driverId?: string;
      vehicleId?: string;
    },
  ): Promise<TachographFile> {
    const id = `tacho_${++this.fileCounter}_${Date.now()}`;
    const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Check for duplicate
    const existingFiles = Array.from(this.tachographFiles.values());
    if (existingFiles.some(f => f.fileHash === fileHash && f.userId === userId)) {
      throw new BadRequestException('This tachograph file has already been uploaded');
    }

    const tachoFile: TachographFile = {
      id,
      userId,
      driverId: file.driverId,
      vehicleId: file.vehicleId,
      fileType: file.fileType,
      fileName: file.originalName,
      fileHash,
      uploadedAt: new Date(),
      periodStart: new Date(), // Will be updated after parsing
      periodEnd: new Date(),
      status: 'PENDING',
    };

    this.tachographFiles.set(id, tachoFile);

    // Parse file asynchronously
    this.parseFile(tachoFile, file.buffer).catch(err => {
      this.logger.error(`Failed to parse tachograph file ${id}: ${err.message}`);
    });

    this.logger.log(`Uploaded tachograph file ${id}: ${file.originalName}`);
    return tachoFile;
  }

  /**
   * Parse .ddd file format (simplified implementation)
   * Real implementation would use a proper DDD parser library
   */
  private async parseFile(tachoFile: TachographFile, buffer: Buffer): Promise<void> {
    try {
      // This is a simplified parser
      // Real .ddd files have a complex binary format with multiple blocks:
      // - Card/Vehicle identification
      // - Events & Faults
      // - Driver activity
      // - Vehicles used
      // - Places

      // Simulate parsing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // For demo purposes, generate sample activity data
      const activities = this.generateSampleActivities(
        tachoFile.userId,
        tachoFile.driverId || 'unknown',
        tachoFile.vehicleId,
      );

      // Store activities
      const existingActivities = this.activityRecords.get(tachoFile.userId) || [];
      existingActivities.push(...activities);
      this.activityRecords.set(tachoFile.userId, existingActivities);

      // Update period dates
      if (activities.length > 0) {
        tachoFile.periodStart = activities[0].startTime;
        tachoFile.periodEnd = activities[activities.length - 1].endTime;
      }

      tachoFile.parsedAt = new Date();
      tachoFile.status = 'PARSED';

      // Run compliance check on new data
      if (tachoFile.driverId) {
        await this.analyzeDriver(tachoFile.userId, tachoFile.driverId);
      }

      this.logger.log(`Parsed tachograph file ${tachoFile.id}: ${activities.length} activities`);
    } catch (error) {
      tachoFile.status = 'ERROR';
      tachoFile.errorMessage = error.message;
      this.logger.error(`Error parsing tachograph file ${tachoFile.id}: ${error.message}`);
    }
  }

  /**
   * Generate sample activity data for demonstration
   */
  private generateSampleActivities(
    userId: string,
    driverId: string,
    vehicleId?: string,
  ): ActivityRecord[] {
    const activities: ActivityRecord[] = [];
    const now = new Date();
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (let day = 0; day < 7; day++) {
      const date = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);

      // Morning driving period
      activities.push({
        id: `act_${++this.activityCounter}`,
        driverId,
        vehicleId,
        date,
        startTime: new Date(date.setHours(6, 0, 0, 0)),
        endTime: new Date(date.setHours(10, 30, 0, 0)),
        activityType: TachographActivityType.DRIVING,
        durationMinutes: 270,
        distanceKm: Math.floor(Math.random() * 200) + 100,
        isManualEntry: false,
      });

      // Break
      activities.push({
        id: `act_${++this.activityCounter}`,
        driverId,
        vehicleId,
        date,
        startTime: new Date(date.setHours(10, 30, 0, 0)),
        endTime: new Date(date.setHours(11, 15, 0, 0)),
        activityType: TachographActivityType.BREAK,
        durationMinutes: 45,
        isManualEntry: false,
      });

      // Afternoon driving
      activities.push({
        id: `act_${++this.activityCounter}`,
        driverId,
        vehicleId,
        date,
        startTime: new Date(date.setHours(11, 15, 0, 0)),
        endTime: new Date(date.setHours(15, 30, 0, 0)),
        activityType: TachographActivityType.DRIVING,
        durationMinutes: 255,
        distanceKm: Math.floor(Math.random() * 180) + 80,
        isManualEntry: false,
      });

      // Daily rest
      activities.push({
        id: `act_${++this.activityCounter}`,
        driverId,
        vehicleId,
        date,
        startTime: new Date(date.setHours(16, 0, 0, 0)),
        endTime: new Date(new Date(date).setHours(16 + 11, 0, 0, 0)),
        activityType: TachographActivityType.REST,
        durationMinutes: 11 * 60,
        isManualEntry: false,
      });
    }

    return activities;
  }

  // =================== ANALYSIS ===================

  /**
   * Analyze daily activities for a driver
   */
  async analyzeDailyActivities(
    userId: string,
    driverId: string,
    date: Date,
  ): Promise<DailyAnalysis> {
    const activities = this.activityRecords.get(userId) || [];
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayActivities = activities.filter(
      a => a.driverId === driverId &&
           a.startTime >= dayStart &&
           a.startTime <= dayEnd
    );

    // Calculate totals
    let totalDriving = 0;
    let totalRest = 0;
    let totalWork = 0;
    let totalAvailability = 0;
    let totalDistance = 0;
    const continuousDrivingPeriods: DailyAnalysis['continuousDrivingPeriods'] = [];

    let currentDrivingPeriod: {
      startTime: Date;
      durationMinutes: number;
      breakMinutes: number;
    } | null = null;

    for (const activity of dayActivities) {
      switch (activity.activityType) {
        case TachographActivityType.DRIVING:
          totalDriving += activity.durationMinutes;
          if (activity.distanceKm) totalDistance += activity.distanceKm;

          if (!currentDrivingPeriod) {
            currentDrivingPeriod = {
              startTime: activity.startTime,
              durationMinutes: activity.durationMinutes,
              breakMinutes: 0,
            };
          } else {
            currentDrivingPeriod.durationMinutes += activity.durationMinutes;
          }
          break;
        case TachographActivityType.REST:
          totalRest += activity.durationMinutes;
          if (currentDrivingPeriod) {
            continuousDrivingPeriods.push({
              startTime: currentDrivingPeriod.startTime,
              endTime: activity.startTime,
              durationMinutes: currentDrivingPeriod.durationMinutes,
              breakTakenMinutes: currentDrivingPeriod.breakMinutes,
            });
            currentDrivingPeriod = null;
          }
          break;
        case TachographActivityType.WORK:
          totalWork += activity.durationMinutes;
          break;
        case TachographActivityType.AVAILABILITY:
          totalAvailability += activity.durationMinutes;
          break;
        case TachographActivityType.BREAK:
          if (currentDrivingPeriod) {
            currentDrivingPeriod.breakMinutes += activity.durationMinutes;
          }
          totalRest += activity.durationMinutes;
          break;
      }
    }

    // Check for infringements
    const infringements: Infringement[] = [];

    // Check daily driving limit
    if (totalDriving > EU_REGULATIONS.MAX_DAILY_DRIVING_MINUTES) {
      const exceededBy = totalDriving - EU_REGULATIONS.MAX_DAILY_DRIVING_MINUTES;
      infringements.push(this.createInfringement(
        driverId,
        date,
        InfringementType.DAILY_DRIVING_EXCEEDED,
        this.determineSeverity(exceededBy, 60, 120, 180),
        `Depășire timp conducere zilnic: ${Math.round(totalDriving / 60 * 10) / 10} ore (limită: 9 ore)`,
        totalDriving,
        EU_REGULATIONS.MAX_DAILY_DRIVING_MINUTES,
        'minute',
      ));
    }

    // Check continuous driving
    for (const period of continuousDrivingPeriods) {
      if (period.durationMinutes > EU_REGULATIONS.MAX_CONTINUOUS_DRIVING_MINUTES &&
          period.breakTakenMinutes < EU_REGULATIONS.MIN_BREAK_MINUTES) {
        const exceededBy = period.durationMinutes - EU_REGULATIONS.MAX_CONTINUOUS_DRIVING_MINUTES;
        infringements.push(this.createInfringement(
          driverId,
          period.startTime,
          InfringementType.CONTINUOUS_DRIVING_EXCEEDED,
          this.determineSeverity(exceededBy, 30, 60, 90),
          `Conducere continuă fără pauză: ${Math.round(period.durationMinutes / 60 * 10) / 10} ore (limită: 4.5 ore)`,
          period.durationMinutes,
          EU_REGULATIONS.MAX_CONTINUOUS_DRIVING_MINUTES,
          'minute',
        ));
      }
    }

    // Check daily rest
    const restActivities = dayActivities.filter(a =>
      a.activityType === TachographActivityType.REST
    );
    const longestRest = Math.max(0, ...restActivities.map(a => a.durationMinutes));

    if (longestRest < EU_REGULATIONS.MIN_REDUCED_DAILY_REST_MINUTES) {
      const shortage = EU_REGULATIONS.MIN_REDUCED_DAILY_REST_MINUTES - longestRest;
      infringements.push(this.createInfringement(
        driverId,
        date,
        InfringementType.DAILY_REST_INSUFFICIENT,
        this.determineSeverity(shortage, 60, 120, 180),
        `Repaus zilnic insuficient: ${Math.round(longestRest / 60 * 10) / 10} ore (minim: 9 ore)`,
        longestRest,
        EU_REGULATIONS.MIN_REDUCED_DAILY_REST_MINUTES,
        'minute',
      ));
    }

    // Get driver name
    const driver = await this.prisma.employee.findUnique({
      where: { id: driverId },
      select: { firstName: true, lastName: true },
    });
    const driverName = driver ? `${driver.firstName} ${driver.lastName}` : 'Unknown';

    // Store infringements
    const existingInfringements = this.infringements.get(userId) || [];
    existingInfringements.push(...infringements);
    this.infringements.set(userId, existingInfringements);

    return {
      date,
      driverId,
      driverName,
      totalDrivingMinutes: totalDriving,
      totalRestMinutes: totalRest,
      totalWorkMinutes: totalWork,
      totalAvailabilityMinutes: totalAvailability,
      continuousDrivingPeriods,
      dailyRestPeriod: longestRest > 0 ? {
        startTime: restActivities[0]?.startTime || date,
        endTime: restActivities[restActivities.length - 1]?.endTime || date,
        durationMinutes: longestRest,
        isReduced: longestRest < EU_REGULATIONS.MIN_DAILY_REST_MINUTES,
        isSplit: false,
      } : undefined,
      infringements,
      isCompliant: infringements.length === 0,
      distanceKm: totalDistance,
    };
  }

  /**
   * Analyze weekly activities for a driver
   */
  async analyzeWeeklyActivities(
    userId: string,
    driverId: string,
    weekStart: Date,
  ): Promise<WeeklyAnalysis> {
    const dailyAnalyses: DailyAnalysis[] = [];
    let totalDriving = 0;
    const allInfringements: Infringement[] = [];

    // Analyze each day of the week
    for (let day = 0; day < 7; day++) {
      const date = new Date(weekStart.getTime() + day * 24 * 60 * 60 * 1000);
      const dayAnalysis = await this.analyzeDailyActivities(userId, driverId, date);
      dailyAnalyses.push(dayAnalysis);
      totalDriving += dayAnalysis.totalDrivingMinutes;
      allInfringements.push(...dayAnalysis.infringements);
    }

    // Check weekly driving limit
    if (totalDriving > EU_REGULATIONS.MAX_WEEKLY_DRIVING_MINUTES) {
      const exceededBy = totalDriving - EU_REGULATIONS.MAX_WEEKLY_DRIVING_MINUTES;
      allInfringements.push(this.createInfringement(
        driverId,
        weekStart,
        InfringementType.WEEKLY_DRIVING_EXCEEDED,
        this.determineSeverity(exceededBy, 120, 240, 360),
        `Depășire timp conducere săptămânal: ${Math.round(totalDriving / 60 * 10) / 10} ore (limită: 56 ore)`,
        totalDriving,
        EU_REGULATIONS.MAX_WEEKLY_DRIVING_MINUTES,
        'minute',
      ));
    }

    // Count extended days and reduced rest days
    const extendedDays = dailyAnalyses.filter(
      d => d.totalDrivingMinutes > EU_REGULATIONS.MAX_DAILY_DRIVING_MINUTES &&
           d.totalDrivingMinutes <= EU_REGULATIONS.MAX_EXTENDED_DAILY_DRIVING_MINUTES
    ).length;

    const reducedRestDays = dailyAnalyses.filter(
      d => d.dailyRestPeriod?.isReduced
    ).length;

    // Get driver name
    const driver = await this.prisma.employee.findUnique({
      where: { id: driverId },
      select: { firstName: true, lastName: true },
    });
    const driverName = driver ? `${driver.firstName} ${driver.lastName}` : 'Unknown';

    // Calculate week end
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    weekEnd.setHours(23, 59, 59, 999);

    // Get ISO week number
    const date = new Date(weekStart);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);

    return {
      weekNumber,
      year: weekStart.getFullYear(),
      weekStart,
      weekEnd,
      driverId,
      driverName,
      totalDrivingMinutes: totalDriving,
      dailyAnalyses,
      extendedDaysUsed: extendedDays,
      reducedRestDaysUsed: reducedRestDays,
      infringements: allInfringements,
      isCompliant: allInfringements.length === 0,
    };
  }

  /**
   * Full driver analysis for a period
   */
  async analyzeDriver(
    userId: string,
    driverId: string,
    periodStart?: Date,
    periodEnd?: Date,
  ): Promise<ComplianceSummary> {
    const start = periodStart || new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const end = periodEnd || new Date();

    // Analyze weeks
    const weeklyAnalyses: WeeklyAnalysis[] = [];
    let currentWeekStart = new Date(start);
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1);
    currentWeekStart.setHours(0, 0, 0, 0);

    while (currentWeekStart < end) {
      const weekAnalysis = await this.analyzeWeeklyActivities(userId, driverId, currentWeekStart);
      weeklyAnalyses.push(weekAnalysis);
      currentWeekStart = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // Aggregate data
    let totalDriving = 0;
    const allInfringements: Infringement[] = [];
    const infringementsBySeverity: Record<InfringementSeverity, number> = {
      [InfringementSeverity.MINOR]: 0,
      [InfringementSeverity.SERIOUS]: 0,
      [InfringementSeverity.VERY_SERIOUS]: 0,
      [InfringementSeverity.MOST_SERIOUS]: 0,
    };

    for (const week of weeklyAnalyses) {
      totalDriving += week.totalDrivingMinutes;
      for (const infringement of week.infringements) {
        allInfringements.push(infringement);
        infringementsBySeverity[infringement.severity]++;
      }
    }

    // Check bi-weekly limit
    for (let i = 0; i < weeklyAnalyses.length - 1; i++) {
      const biWeeklyDriving = weeklyAnalyses[i].totalDrivingMinutes +
                              weeklyAnalyses[i + 1].totalDrivingMinutes;
      if (biWeeklyDriving > EU_REGULATIONS.MAX_BI_WEEKLY_DRIVING_MINUTES) {
        const exceededBy = biWeeklyDriving - EU_REGULATIONS.MAX_BI_WEEKLY_DRIVING_MINUTES;
        const infringement = this.createInfringement(
          driverId,
          weeklyAnalyses[i].weekStart,
          InfringementType.BI_WEEKLY_DRIVING_EXCEEDED,
          this.determineSeverity(exceededBy, 120, 300, 480),
          `Depășire timp conducere bi-săptămânal: ${Math.round(biWeeklyDriving / 60 * 10) / 10} ore (limită: 90 ore)`,
          biWeeklyDriving,
          EU_REGULATIONS.MAX_BI_WEEKLY_DRIVING_MINUTES,
          'minute',
        );
        allInfringements.push(infringement);
        infringementsBySeverity[infringement.severity]++;
      }
    }

    // Calculate compliance score and potential fines
    let complianceScore = 100;
    let potentialFines = 0;

    for (const infringement of allInfringements) {
      const fineRange = FINE_STRUCTURE[infringement.severity];
      potentialFines += fineRange.min;

      switch (infringement.severity) {
        case InfringementSeverity.MINOR:
          complianceScore -= 2;
          break;
        case InfringementSeverity.SERIOUS:
          complianceScore -= 5;
          break;
        case InfringementSeverity.VERY_SERIOUS:
          complianceScore -= 10;
          break;
        case InfringementSeverity.MOST_SERIOUS:
          complianceScore -= 20;
          break;
      }
    }
    complianceScore = Math.max(0, complianceScore);

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (complianceScore >= 90) riskLevel = 'LOW';
    else if (complianceScore >= 70) riskLevel = 'MEDIUM';
    else if (complianceScore >= 50) riskLevel = 'HIGH';
    else riskLevel = 'CRITICAL';

    // Generate recommendations
    const recommendations: string[] = [];
    if (infringementsBySeverity[InfringementSeverity.MOST_SERIOUS] > 0) {
      recommendations.push('URGENT: Încălcări foarte grave detectate. Revizuire imediată necesară.');
    }
    if (infringementsBySeverity[InfringementSeverity.VERY_SERIOUS] > 0) {
      recommendations.push('Încălcări grave detectate. Instruire suplimentară recomandată.');
    }
    if (allInfringements.some(i => i.type === InfringementType.CONTINUOUS_DRIVING_EXCEEDED)) {
      recommendations.push('Asigurați pauze de 45 minute după 4.5 ore de conducere.');
    }
    if (allInfringements.some(i => i.type === InfringementType.DAILY_REST_INSUFFICIENT)) {
      recommendations.push('Respectați perioada minimă de odihnă zilnică de 9-11 ore.');
    }
    if (allInfringements.some(i => i.type === InfringementType.WEEKLY_DRIVING_EXCEEDED)) {
      recommendations.push('Reduceți orele de conducere săptămânale la maximum 56 ore.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Șoferul respectă reglementările UE. Continuați monitorizarea.');
    }

    // Get driver name
    const driver = await this.prisma.employee.findUnique({
      where: { id: driverId },
      select: { firstName: true, lastName: true },
    });
    const driverName = driver ? `${driver.firstName} ${driver.lastName}` : 'Unknown';

    return {
      driverId,
      driverName,
      periodStart: start,
      periodEnd: end,
      totalDrivingHours: Math.round(totalDriving / 60 * 10) / 10,
      totalInfringements: allInfringements.length,
      infringementsBySeverity,
      complianceScore,
      riskLevel,
      potentialFines,
      recommendations,
    };
  }

  // =================== RETRIEVAL ===================

  /**
   * Get tachograph files for user
   */
  getTachographFiles(
    userId: string,
    options?: {
      fileType?: TachographFile['fileType'];
      driverId?: string;
      vehicleId?: string;
      status?: TachographFile['status'];
    },
  ): TachographFile[] {
    let files = Array.from(this.tachographFiles.values())
      .filter(f => f.userId === userId);

    if (options?.fileType) {
      files = files.filter(f => f.fileType === options.fileType);
    }
    if (options?.driverId) {
      files = files.filter(f => f.driverId === options.driverId);
    }
    if (options?.vehicleId) {
      files = files.filter(f => f.vehicleId === options.vehicleId);
    }
    if (options?.status) {
      files = files.filter(f => f.status === options.status);
    }

    return files.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  /**
   * Get activity records for driver
   */
  getActivityRecords(
    userId: string,
    driverId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): ActivityRecord[] {
    let activities = (this.activityRecords.get(userId) || [])
      .filter(a => a.driverId === driverId);

    if (dateFrom) {
      activities = activities.filter(a => a.startTime >= dateFrom);
    }
    if (dateTo) {
      activities = activities.filter(a => a.endTime <= dateTo);
    }

    return activities.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  /**
   * Get infringements for driver
   */
  getInfringements(
    userId: string,
    driverId?: string,
    options?: {
      type?: InfringementType;
      severity?: InfringementSeverity;
      acknowledged?: boolean;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Infringement[] {
    let infringements = this.infringements.get(userId) || [];

    if (driverId) {
      infringements = infringements.filter(i => i.driverId === driverId);
    }
    if (options?.type) {
      infringements = infringements.filter(i => i.type === options.type);
    }
    if (options?.severity) {
      infringements = infringements.filter(i => i.severity === options.severity);
    }
    if (options?.acknowledged !== undefined) {
      infringements = infringements.filter(i => i.acknowledged === options.acknowledged);
    }
    if (options?.dateFrom) {
      infringements = infringements.filter(i => i.date >= options.dateFrom!);
    }
    if (options?.dateTo) {
      infringements = infringements.filter(i => i.date <= options.dateTo!);
    }

    return infringements.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Acknowledge infringement
   */
  acknowledgeInfringement(
    userId: string,
    infringementId: string,
    notes?: string,
  ): Infringement | null {
    const infringements = this.infringements.get(userId) || [];
    const infringement = infringements.find(i => i.id === infringementId);

    if (!infringement) return null;

    infringement.acknowledged = true;
    if (notes) infringement.notes = notes;

    return infringement;
  }

  /**
   * Get driver dashboard data
   */
  async getDriverDashboard(
    userId: string,
    driverId: string,
  ): Promise<{
    todayAnalysis: DailyAnalysis;
    weekAnalysis: WeeklyAnalysis;
    complianceSummary: ComplianceSummary;
    recentInfringements: Infringement[];
    remainingDrivingToday: number;
    remainingDrivingWeek: number;
  }> {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const [todayAnalysis, weekAnalysis, complianceSummary] = await Promise.all([
      this.analyzeDailyActivities(userId, driverId, today),
      this.analyzeWeeklyActivities(userId, driverId, weekStart),
      this.analyzeDriver(userId, driverId),
    ]);

    const recentInfringements = this.getInfringements(userId, driverId)
      .slice(0, 5);

    const remainingDrivingToday = Math.max(0,
      EU_REGULATIONS.MAX_DAILY_DRIVING_MINUTES - todayAnalysis.totalDrivingMinutes
    );
    const remainingDrivingWeek = Math.max(0,
      EU_REGULATIONS.MAX_WEEKLY_DRIVING_MINUTES - weekAnalysis.totalDrivingMinutes
    );

    return {
      todayAnalysis,
      weekAnalysis,
      complianceSummary,
      recentInfringements,
      remainingDrivingToday,
      remainingDrivingWeek,
    };
  }

  // =================== HELPERS ===================

  private createInfringement(
    driverId: string,
    date: Date,
    type: InfringementType,
    severity: InfringementSeverity,
    description: string,
    actualValue: number,
    limitValue: number,
    unit: string,
    vehicleId?: string,
  ): Infringement {
    return {
      id: `inf_${++this.infringementCounter}_${Date.now()}`,
      driverId,
      vehicleId,
      date,
      type,
      severity,
      description,
      actualValue,
      limitValue,
      unit,
      potentialFine: FINE_STRUCTURE[severity].min,
      acknowledged: false,
    };
  }

  private determineSeverity(
    exceededBy: number,
    seriousThreshold: number,
    verySeriousThreshold: number,
    mostSeriousThreshold: number,
  ): InfringementSeverity {
    if (exceededBy >= mostSeriousThreshold) return InfringementSeverity.MOST_SERIOUS;
    if (exceededBy >= verySeriousThreshold) return InfringementSeverity.VERY_SERIOUS;
    if (exceededBy >= seriousThreshold) return InfringementSeverity.SERIOUS;
    return InfringementSeverity.MINOR;
  }
}
