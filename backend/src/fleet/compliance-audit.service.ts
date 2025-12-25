import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RouteStatus, DeliveryStopStatus, VehicleStatus } from '@prisma/client';

/**
 * Fleet Compliance & Audit Trail Service
 * Comprehensive tracking for regulatory compliance and auditing.
 *
 * Features:
 * - Audit trail for all fleet operations
 * - Driver hours compliance (EU driving time regulations)
 * - Vehicle compliance (TÜV, insurance, safety)
 * - Document retention tracking
 * - Compliance reporting and alerts
 * - Change history tracking
 */

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'EXPORT'
  | 'APPROVE'
  | 'REJECT'
  | 'ASSIGN'
  | 'COMPLETE'
  | 'CANCEL';

export type AuditEntity =
  | 'VEHICLE'
  | 'DRIVER'
  | 'ROUTE'
  | 'DELIVERY'
  | 'FUEL_LOG'
  | 'MAINTENANCE'
  | 'DOCUMENT'
  | 'INVOICE'
  | 'SUBCONTRACTOR'
  | 'SETTINGS';

export interface AuditLogEntry {
  id: string;
  userId: string;
  performedBy: string;
  performerName?: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  entityName?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: Record<string, any>;
}

export interface ComplianceStatus {
  isCompliant: boolean;
  score: number; // 0-100
  issues: ComplianceIssue[];
  lastChecked: Date;
}

export interface ComplianceIssue {
  id: string;
  type: 'VEHICLE' | 'DRIVER' | 'DOCUMENT' | 'OPERATION';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  entity: { id: string; name: string };
  dueDate?: Date;
  resolution?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'WAIVED';
}

export interface DriverHoursCompliance {
  driverId: string;
  driverName: string;
  date: Date;
  drivingHours: number;
  restHours: number;
  weeklyDrivingHours: number;
  biweeklyDrivingHours: number;
  isCompliant: boolean;
  violations: string[];
}

export interface DocumentRetention {
  id: string;
  documentType: string;
  entityType: string;
  entityId: string;
  entityName: string;
  createdAt: Date;
  retentionPeriodYears: number;
  expiresAt: Date;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'ARCHIVED';
}

@Injectable()
export class ComplianceAuditService {
  private readonly logger = new Logger(ComplianceAuditService.name);

  // In-memory audit log storage (would be Prisma in production)
  private auditLogs: Map<string, AuditLogEntry[]> = new Map();
  private complianceIssues: Map<string, ComplianceIssue[]> = new Map();
  private auditCounter = 0;
  private issueCounter = 0;

  // EU driving time regulations
  private readonly DRIVING_REGULATIONS = {
    maxDailyDriving: 9, // hours (can be 10h twice per week)
    maxExtendedDailyDriving: 10, // hours (max 2x per week)
    maxWeeklyDriving: 56, // hours
    maxBiweeklyDriving: 90, // hours (2 consecutive weeks)
    minDailyRest: 11, // hours (can be reduced to 9h 3x per week)
    minReducedDailyRest: 9, // hours
    minWeeklyRest: 45, // hours (can be reduced every 2nd week)
    maxContinuousDriving: 4.5, // hours (then 45min break)
  };

  // Document retention periods (years)
  private readonly RETENTION_PERIODS: Record<string, number> = {
    DELIVERY_RECORD: 3,
    FUEL_LOG: 5,
    MAINTENANCE_LOG: 5,
    DRIVER_TIMESHEET: 7,
    INVOICE: 10,
    CONTRACT: 10,
    VEHICLE_REGISTRATION: 10,
    INSURANCE_DOCUMENT: 5,
    ACCIDENT_REPORT: 10,
    TRAINING_RECORD: 5,
  };

  constructor(private readonly prisma: PrismaService) {}

  // =================== AUDIT LOGGING ===================

  /**
   * Log an audit event
   */
  async logAudit(
    userId: string,
    entry: {
      performedBy: string;
      performerName?: string;
      action: AuditAction;
      entity: AuditEntity;
      entityId: string;
      entityName?: string;
      changes?: { field: string; oldValue: any; newValue: any }[];
      metadata?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<AuditLogEntry> {
    const id = `audit-${++this.auditCounter}-${Date.now()}`;

    const logEntry: AuditLogEntry = {
      id,
      userId,
      ...entry,
      timestamp: new Date(),
    };

    const userLogs = this.auditLogs.get(userId) || [];
    userLogs.push(logEntry);
    this.auditLogs.set(userId, userLogs);

    this.logger.log(
      `Audit: ${entry.action} ${entry.entity} ${entry.entityId} by ${entry.performerName || entry.performedBy}`,
    );

    return logEntry;
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(
    userId: string,
    options?: {
      from?: Date;
      to?: Date;
      action?: AuditAction;
      entity?: AuditEntity;
      entityId?: string;
      performedBy?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ logs: AuditLogEntry[]; total: number }> {
    let logs = this.auditLogs.get(userId) || [];

    if (options?.from) {
      logs = logs.filter(l => l.timestamp >= options.from!);
    }
    if (options?.to) {
      logs = logs.filter(l => l.timestamp <= options.to!);
    }
    if (options?.action) {
      logs = logs.filter(l => l.action === options.action);
    }
    if (options?.entity) {
      logs = logs.filter(l => l.entity === options.entity);
    }
    if (options?.entityId) {
      logs = logs.filter(l => l.entityId === options.entityId);
    }
    if (options?.performedBy) {
      logs = logs.filter(l => l.performedBy === options.performedBy);
    }

    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = logs.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;

    return {
      logs: logs.slice(offset, offset + limit),
      total,
    };
  }

  /**
   * Get entity audit history
   */
  async getEntityHistory(
    userId: string,
    entity: AuditEntity,
    entityId: string,
  ): Promise<AuditLogEntry[]> {
    const logs = this.auditLogs.get(userId) || [];
    return logs
      .filter(l => l.entity === entity && l.entityId === entityId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // =================== COMPLIANCE CHECKS ===================

  /**
   * Get overall compliance status
   */
  async getComplianceStatus(userId: string): Promise<ComplianceStatus> {
    const issues = await this.getComplianceIssues(userId);
    const openIssues = issues.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS');

    // Calculate compliance score
    let score = 100;
    for (const issue of openIssues) {
      switch (issue.severity) {
        case 'CRITICAL':
          score -= 25;
          break;
        case 'HIGH':
          score -= 15;
          break;
        case 'MEDIUM':
          score -= 5;
          break;
        case 'LOW':
          score -= 2;
          break;
      }
    }

    return {
      isCompliant: score >= 80 && !openIssues.some(i => i.severity === 'CRITICAL'),
      score: Math.max(0, score),
      issues: openIssues,
      lastChecked: new Date(),
    };
  }

  /**
   * Run all compliance checks
   */
  async runComplianceChecks(userId: string): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    // Vehicle compliance
    const vehicleIssues = await this.checkVehicleCompliance(userId);
    issues.push(...vehicleIssues);

    // Driver hours compliance
    const driverIssues = await this.checkDriverHoursCompliance(userId);
    issues.push(...driverIssues);

    // Document expiry
    const documentIssues = await this.checkDocumentCompliance(userId);
    issues.push(...documentIssues);

    // Store issues
    this.complianceIssues.set(userId, issues);

    return issues;
  }

  /**
   * Check vehicle compliance (TÜV, insurance, etc.)
   */
  async checkVehicleCompliance(userId: string): Promise<ComplianceIssue[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
    });

    const issues: ComplianceIssue[] = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    for (const vehicle of vehicles) {
      // TÜV check
      if (vehicle.tuvExpiry) {
        if (vehicle.tuvExpiry < now) {
          issues.push({
            id: `issue-${++this.issueCounter}`,
            type: 'VEHICLE',
            severity: 'CRITICAL',
            title: 'TÜV abgelaufen',
            description: `Fahrzeug ${vehicle.licensePlate} hat abgelaufenen TÜV seit ${this.formatDate(vehicle.tuvExpiry)}. Fahrzeug darf nicht mehr eingesetzt werden.`,
            entity: { id: vehicle.id, name: vehicle.licensePlate },
            dueDate: vehicle.tuvExpiry,
            status: 'OPEN',
          });
        } else if (vehicle.tuvExpiry < thirtyDaysFromNow) {
          issues.push({
            id: `issue-${++this.issueCounter}`,
            type: 'VEHICLE',
            severity: 'HIGH',
            title: 'TÜV läuft bald ab',
            description: `Fahrzeug ${vehicle.licensePlate} TÜV läuft am ${this.formatDate(vehicle.tuvExpiry)} ab. Termin vereinbaren.`,
            entity: { id: vehicle.id, name: vehicle.licensePlate },
            dueDate: vehicle.tuvExpiry,
            status: 'OPEN',
          });
        }
      }

      // Insurance check
      if (vehicle.insuranceExpiry) {
        if (vehicle.insuranceExpiry < now) {
          issues.push({
            id: `issue-${++this.issueCounter}`,
            type: 'VEHICLE',
            severity: 'CRITICAL',
            title: 'Versicherung abgelaufen',
            description: `Fahrzeug ${vehicle.licensePlate} hat abgelaufene Versicherung. Fahrzeug nicht versichert!`,
            entity: { id: vehicle.id, name: vehicle.licensePlate },
            dueDate: vehicle.insuranceExpiry,
            status: 'OPEN',
          });
        } else if (vehicle.insuranceExpiry < thirtyDaysFromNow) {
          issues.push({
            id: `issue-${++this.issueCounter}`,
            type: 'VEHICLE',
            severity: 'HIGH',
            title: 'Versicherung läuft bald ab',
            description: `Fahrzeug ${vehicle.licensePlate} Versicherung läuft am ${this.formatDate(vehicle.insuranceExpiry)} ab.`,
            entity: { id: vehicle.id, name: vehicle.licensePlate },
            dueDate: vehicle.insuranceExpiry,
            status: 'OPEN',
          });
        }
      }

      // Maintenance check - vehicles that haven't been serviced in a long time
      const lastMaintenance = await this.prisma.maintenanceLog.findFirst({
        where: { vehicleId: vehicle.id },
        orderBy: { serviceDate: 'desc' },
      });

      if (lastMaintenance) {
        const daysSinceMaintenance = Math.floor(
          (now.getTime() - lastMaintenance.serviceDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysSinceMaintenance > 180) {
          issues.push({
            id: `issue-${++this.issueCounter}`,
            type: 'VEHICLE',
            severity: 'MEDIUM',
            title: 'Wartung überfällig',
            description: `Fahrzeug ${vehicle.licensePlate} wurde seit ${daysSinceMaintenance} Tagen nicht gewartet.`,
            entity: { id: vehicle.id, name: vehicle.licensePlate },
            status: 'OPEN',
          });
        }
      }

      // Out of service vehicles
      if (vehicle.status === VehicleStatus.OUT_OF_SERVICE) {
        issues.push({
          id: `issue-${++this.issueCounter}`,
          type: 'VEHICLE',
          severity: 'MEDIUM',
          title: 'Fahrzeug außer Betrieb',
          description: `Fahrzeug ${vehicle.licensePlate} ist als außer Betrieb markiert.`,
          entity: { id: vehicle.id, name: vehicle.licensePlate },
          status: 'OPEN',
        });
      }
    }

    return issues;
  }

  /**
   * Check driver hours compliance (EU regulations)
   */
  async checkDriverHoursCompliance(userId: string): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: weekAgo },
        driverId: { not: undefined },
        actualStartTime: { not: null },
        actualEndTime: { not: null },
      },
      include: {
        driver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Group by driver
    const driverHours: Record<string, { name: string; hours: number }> = {};

    for (const route of routes) {
      if (!route.driver || !route.actualStartTime || !route.actualEndTime) continue;

      const driverId = route.driverId!;
      const driverName = `${route.driver.firstName} ${route.driver.lastName}`;
      const drivingHours =
        (route.actualEndTime.getTime() - route.actualStartTime.getTime()) / (1000 * 60 * 60);

      if (!driverHours[driverId]) {
        driverHours[driverId] = { name: driverName, hours: 0 };
      }
      driverHours[driverId].hours += drivingHours;
    }

    // Check for violations
    for (const [driverId, data] of Object.entries(driverHours)) {
      if (data.hours > this.DRIVING_REGULATIONS.maxWeeklyDriving) {
        issues.push({
          id: `issue-${++this.issueCounter}`,
          type: 'DRIVER',
          severity: 'CRITICAL',
          title: 'Wöchentliche Lenkzeit überschritten',
          description: `Fahrer ${data.name} hat ${data.hours.toFixed(1)} Stunden in der letzten Woche gearbeitet. Maximum: ${this.DRIVING_REGULATIONS.maxWeeklyDriving} Stunden.`,
          entity: { id: driverId, name: data.name },
          status: 'OPEN',
        });
      } else if (data.hours > this.DRIVING_REGULATIONS.maxWeeklyDriving * 0.9) {
        issues.push({
          id: `issue-${++this.issueCounter}`,
          type: 'DRIVER',
          severity: 'HIGH',
          title: 'Wöchentliche Lenkzeit fast erreicht',
          description: `Fahrer ${data.name} hat ${data.hours.toFixed(1)} von ${this.DRIVING_REGULATIONS.maxWeeklyDriving} erlaubten Stunden erreicht.`,
          entity: { id: driverId, name: data.name },
          status: 'OPEN',
        });
      }
    }

    return issues;
  }

  /**
   * Check document compliance (expiring documents)
   */
  async checkDocumentCompliance(userId: string): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];
    // This would check for expiring contracts, licenses, etc.
    // Placeholder for now as it depends on document management system

    return issues;
  }

  /**
   * Get all compliance issues
   */
  async getComplianceIssues(
    userId: string,
    filters?: {
      type?: 'VEHICLE' | 'DRIVER' | 'DOCUMENT' | 'OPERATION';
      severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'WAIVED';
    },
  ): Promise<ComplianceIssue[]> {
    let issues = this.complianceIssues.get(userId) || [];

    if (filters?.type) {
      issues = issues.filter(i => i.type === filters.type);
    }
    if (filters?.severity) {
      issues = issues.filter(i => i.severity === filters.severity);
    }
    if (filters?.status) {
      issues = issues.filter(i => i.status === filters.status);
    }

    return issues;
  }

  /**
   * Update compliance issue status
   */
  async updateIssueStatus(
    userId: string,
    issueId: string,
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'WAIVED',
    resolution?: string,
  ): Promise<ComplianceIssue | null> {
    const issues = this.complianceIssues.get(userId) || [];
    const issue = issues.find(i => i.id === issueId);

    if (!issue) return null;

    issue.status = status;
    if (resolution) {
      issue.resolution = resolution;
    }

    return issue;
  }

  // =================== DRIVER HOURS TRACKING ===================

  /**
   * Get driver hours compliance for a specific driver
   */
  async getDriverHoursDetail(
    userId: string,
    driverId: string,
    date?: Date,
  ): Promise<DriverHoursCompliance> {
    const targetDate = date || new Date();
    const weekStart = new Date(targetDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    const twoWeeksAgo = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        driverId,
        routeDate: { gte: twoWeeksAgo },
        actualStartTime: { not: null },
        actualEndTime: { not: null },
      },
      include: {
        driver: { select: { firstName: true, lastName: true } },
      },
    });

    // Calculate hours
    let dailyDriving = 0;
    let weeklyDriving = 0;
    let biweeklyDriving = 0;

    const todayStart = new Date(targetDate);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(targetDate);
    todayEnd.setHours(23, 59, 59, 999);

    for (const route of routes) {
      if (!route.actualStartTime || !route.actualEndTime) continue;

      const drivingHours =
        (route.actualEndTime.getTime() - route.actualStartTime.getTime()) / (1000 * 60 * 60);

      biweeklyDriving += drivingHours;

      if (route.routeDate >= weekStart) {
        weeklyDriving += drivingHours;
      }

      if (route.routeDate >= todayStart && route.routeDate <= todayEnd) {
        dailyDriving += drivingHours;
      }
    }

    // Calculate rest (simplified - would need more detailed tracking)
    const restHours = 24 - dailyDriving;

    // Check violations
    const violations: string[] = [];

    if (dailyDriving > this.DRIVING_REGULATIONS.maxDailyDriving) {
      violations.push(`Tägliche Lenkzeit überschritten: ${dailyDriving.toFixed(1)}h / ${this.DRIVING_REGULATIONS.maxDailyDriving}h`);
    }
    if (weeklyDriving > this.DRIVING_REGULATIONS.maxWeeklyDriving) {
      violations.push(`Wöchentliche Lenkzeit überschritten: ${weeklyDriving.toFixed(1)}h / ${this.DRIVING_REGULATIONS.maxWeeklyDriving}h`);
    }
    if (biweeklyDriving > this.DRIVING_REGULATIONS.maxBiweeklyDriving) {
      violations.push(`Zwei-Wochen Lenkzeit überschritten: ${biweeklyDriving.toFixed(1)}h / ${this.DRIVING_REGULATIONS.maxBiweeklyDriving}h`);
    }
    if (restHours < this.DRIVING_REGULATIONS.minDailyRest) {
      violations.push(`Tägliche Ruhezeit unterschritten: ${restHours.toFixed(1)}h / ${this.DRIVING_REGULATIONS.minDailyRest}h`);
    }

    const driverName = routes[0]?.driver
      ? `${routes[0].driver.firstName} ${routes[0].driver.lastName}`
      : 'Unknown';

    return {
      driverId,
      driverName,
      date: targetDate,
      drivingHours: Math.round(dailyDriving * 10) / 10,
      restHours: Math.round(restHours * 10) / 10,
      weeklyDrivingHours: Math.round(weeklyDriving * 10) / 10,
      biweeklyDrivingHours: Math.round(biweeklyDriving * 10) / 10,
      isCompliant: violations.length === 0,
      violations,
    };
  }

  /**
   * Get all drivers' hours compliance summary
   */
  async getAllDriversHoursCompliance(userId: string): Promise<DriverHoursCompliance[]> {
    const employees = await this.prisma.employee.findMany({
      where: { userId },
    });

    const results: DriverHoursCompliance[] = [];

    for (const employee of employees) {
      const compliance = await this.getDriverHoursDetail(userId, employee.id);
      results.push(compliance);
    }

    return results.sort((a, b) => {
      // Sort by compliance status first, then by weekly hours
      if (a.isCompliant !== b.isCompliant) {
        return a.isCompliant ? 1 : -1;
      }
      return b.weeklyDrivingHours - a.weeklyDrivingHours;
    });
  }

  // =================== DOCUMENT RETENTION ===================

  /**
   * Get document retention status
   */
  async getDocumentRetention(userId: string): Promise<DocumentRetention[]> {
    const retentionList: DocumentRetention[] = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Check routes/deliveries
    const oldRoutes = await this.prisma.deliveryRoute.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    for (const route of oldRoutes) {
      const expiresAt = new Date(
        route.createdAt.getTime() + this.RETENTION_PERIODS.DELIVERY_RECORD * 365 * 24 * 60 * 60 * 1000,
      );

      let status: DocumentRetention['status'];
      if (expiresAt < now) {
        status = 'EXPIRED';
      } else if (expiresAt < thirtyDaysFromNow) {
        status = 'EXPIRING_SOON';
      } else {
        status = 'ACTIVE';
      }

      retentionList.push({
        id: `retention-${route.id}`,
        documentType: 'DELIVERY_RECORD',
        entityType: 'ROUTE',
        entityId: route.id,
        entityName: route.routeName || `Route ${route.routeDate.toISOString().split('T')[0]}`,
        createdAt: route.createdAt,
        retentionPeriodYears: this.RETENTION_PERIODS.DELIVERY_RECORD,
        expiresAt,
        status,
      });
    }

    // Check fuel logs
    const fuelLogs = await this.prisma.fuelLog.findMany({
      where: { vehicle: { userId } },
      include: { vehicle: { select: { licensePlate: true } } },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    for (const log of fuelLogs) {
      const expiresAt = new Date(
        log.createdAt.getTime() + this.RETENTION_PERIODS.FUEL_LOG * 365 * 24 * 60 * 60 * 1000,
      );

      let status: DocumentRetention['status'];
      if (expiresAt < now) {
        status = 'EXPIRED';
      } else if (expiresAt < thirtyDaysFromNow) {
        status = 'EXPIRING_SOON';
      } else {
        status = 'ACTIVE';
      }

      retentionList.push({
        id: `retention-${log.id}`,
        documentType: 'FUEL_LOG',
        entityType: 'FUEL_LOG',
        entityId: log.id,
        entityName: `Tankung ${log.vehicle.licensePlate} - ${log.fueledAt.toISOString().split('T')[0]}`,
        createdAt: log.createdAt,
        retentionPeriodYears: this.RETENTION_PERIODS.FUEL_LOG,
        expiresAt,
        status,
      });
    }

    return retentionList.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
  }

  /**
   * Get compliance report summary
   */
  async getComplianceReport(userId: string): Promise<{
    overallStatus: ComplianceStatus;
    vehicleCompliance: { total: number; compliant: number; issues: number };
    driverCompliance: { total: number; compliant: number; violations: number };
    documentCompliance: { total: number; active: number; expiringSoon: number; expired: number };
    recentAuditLogs: AuditLogEntry[];
  }> {
    const [overallStatus, vehicles, drivers, documents, auditLogs] = await Promise.all([
      this.getComplianceStatus(userId),
      this.prisma.vehicle.findMany({ where: { userId } }),
      this.prisma.employee.findMany({ where: { userId } }),
      this.getDocumentRetention(userId),
      this.getAuditLogs(userId, { limit: 10 }),
    ]);

    // Run compliance checks to get fresh data
    await this.runComplianceChecks(userId);

    const vehicleIssues = overallStatus.issues.filter(i => i.type === 'VEHICLE');
    const driverIssues = overallStatus.issues.filter(i => i.type === 'DRIVER');

    return {
      overallStatus,
      vehicleCompliance: {
        total: vehicles.length,
        compliant: vehicles.length - vehicleIssues.length,
        issues: vehicleIssues.length,
      },
      driverCompliance: {
        total: drivers.length,
        compliant: drivers.length - driverIssues.length,
        violations: driverIssues.length,
      },
      documentCompliance: {
        total: documents.length,
        active: documents.filter(d => d.status === 'ACTIVE').length,
        expiringSoon: documents.filter(d => d.status === 'EXPIRING_SOON').length,
        expired: documents.filter(d => d.status === 'EXPIRED').length,
      },
      recentAuditLogs: auditLogs.logs,
    };
  }

  // =================== HELPERS ===================

  private formatDate(date: Date): string {
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
