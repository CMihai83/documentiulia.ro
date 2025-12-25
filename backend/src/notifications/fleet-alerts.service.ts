import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Fleet Alerts Service
 * Monitors fleet operations and triggers alerts for:
 * - Delayed deliveries
 * - Maintenance due
 * - Route deviations
 * - Low fuel warnings
 * - Driver hours compliance
 */
@Injectable()
export class FleetAlertsService {
  private readonly logger = new Logger(FleetAlertsService.name);

  // In-memory alert storage for real-time access
  private alerts: Map<string, FleetAlert[]> = new Map();

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =================== SCHEDULED CHECKS ===================

  /**
   * Check for delayed deliveries every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkDelayedDeliveries() {
    this.logger.debug('Checking for delayed deliveries...');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Find routes that are past their planned end time but not completed
    const delayedRoutes = await this.prisma.deliveryRoute.findMany({
      where: {
        routeDate: today,
        status: 'IN_PROGRESS',
        plannedEndTime: { lt: now },
      },
      include: {
        vehicle: { select: { licensePlate: true } },
        driver: { select: { firstName: true, lastName: true, userId: true } },
        stops: { where: { status: 'PENDING' } },
      },
    });

    for (const route of delayedRoutes) {
      const pendingStops = route.stops.length;
      if (pendingStops > 0) {
        this.addAlert(route.userId, {
          type: 'DELIVERY_DELAY',
          severity: pendingStops > 5 ? 'WARNING' : 'INFO',
          title: `Route Delayed: ${route.routeName || route.id.slice(-6)}`,
          message: `${pendingStops} deliveries pending. Vehicle ${route.vehicle.licensePlate}`,
          entityType: 'ROUTE',
          entityId: route.id,
          data: {
            vehicleId: route.vehicleId,
            pendingStops,
            driverName: route.driver ? `${route.driver.firstName} ${route.driver.lastName}` : 'Unassigned',
          },
        });
      }
    }
  }

  /**
   * Check for maintenance due daily at 7am
   */
  @Cron('0 7 * * *')
  async checkMaintenanceDue() {
    this.logger.log('Checking vehicles for maintenance due...');

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Find vehicles with maintenance due in the next week
    const vehiclesDue = await this.prisma.vehicle.findMany({
      where: {
        nextServiceDate: { lte: nextWeek },
        status: { not: 'RETIRED' },
      },
    });

    for (const vehicle of vehiclesDue) {
      const daysUntil = Math.ceil(
        (vehicle.nextServiceDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      const severity = daysUntil <= 0 ? 'CRITICAL' : daysUntil <= 3 ? 'WARNING' : 'INFO';

      this.addAlert(vehicle.userId, {
        type: 'MAINTENANCE_DUE',
        severity,
        title: `Maintenance ${daysUntil <= 0 ? 'Overdue' : 'Due'}: ${vehicle.licensePlate}`,
        message: `${vehicle.make} ${vehicle.model} - Service ${daysUntil <= 0 ? 'overdue by ' + Math.abs(daysUntil) : 'due in ' + daysUntil} days`,
        entityType: 'VEHICLE',
        entityId: vehicle.id,
        data: {
          nextServiceDate: vehicle.nextServiceDate,
          mileage: vehicle.mileage,
          daysUntil,
        },
      });
    }
  }

  /**
   * Check driver hours compliance daily
   * EU regulation: Max 9h driving/day, 56h/week
   */
  @Cron('0 20 * * *') // 8pm daily
  async checkDriverHoursCompliance() {
    this.logger.log('Checking driver hours compliance...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get all timesheets for the past week
    const timesheets = await this.prisma.timesheet.findMany({
      where: {
        date: { gte: weekAgo },
        status: 'APPROVED',
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, userId: true } },
      },
    });

    // Group by employee
    const hoursPerEmployee = new Map<string, { employee: any; dailyHours: number; weeklyHours: number }>();

    for (const ts of timesheets) {
      if (!hoursPerEmployee.has(ts.employeeId)) {
        hoursPerEmployee.set(ts.employeeId, {
          employee: ts.employee,
          dailyHours: 0,
          weeklyHours: 0,
        });
      }

      const entry = hoursPerEmployee.get(ts.employeeId)!;
      entry.weeklyHours += ts.workedHours || 0;

      // Check if this is today's entry
      if (ts.date.toDateString() === today.toDateString()) {
        entry.dailyHours += ts.workedHours || 0;
      }
    }

    for (const [, data] of hoursPerEmployee) {
      const MAX_DAILY_HOURS = 9;
      const MAX_WEEKLY_HOURS = 56;

      // Check daily limit
      if (data.dailyHours > MAX_DAILY_HOURS) {
        this.addAlert(data.employee.userId, {
          type: 'DRIVER_HOURS_EXCEEDED',
          severity: 'WARNING',
          title: `Daily Hours Exceeded: ${data.employee.firstName} ${data.employee.lastName}`,
          message: `${data.dailyHours.toFixed(1)}h worked today (max ${MAX_DAILY_HOURS}h)`,
          entityType: 'EMPLOYEE',
          entityId: data.employee.id,
          data: {
            dailyHours: data.dailyHours,
            maxDaily: MAX_DAILY_HOURS,
          },
        });
      }

      // Check weekly limit
      if (data.weeklyHours > MAX_WEEKLY_HOURS) {
        this.addAlert(data.employee.userId, {
          type: 'DRIVER_HOURS_EXCEEDED',
          severity: 'CRITICAL',
          title: `Weekly Hours Exceeded: ${data.employee.firstName} ${data.employee.lastName}`,
          message: `${data.weeklyHours.toFixed(1)}h worked this week (max ${MAX_WEEKLY_HOURS}h)`,
          entityType: 'EMPLOYEE',
          entityId: data.employee.id,
          data: {
            weeklyHours: data.weeklyHours,
            maxWeekly: MAX_WEEKLY_HOURS,
          },
        });
      }
    }
  }

  /**
   * Check for failed deliveries and retry opportunities
   */
  @Cron('0 18 * * *') // 6pm daily
  async checkFailedDeliveries() {
    this.logger.log('Checking failed deliveries for retry...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const failedStops = await this.prisma.deliveryStop.findMany({
      where: {
        status: { in: ['FAILED', 'ATTEMPTED'] },
        route: { routeDate: today },
      },
      include: {
        route: {
          select: {
            id: true,
            userId: true,
            vehicle: { select: { licensePlate: true } },
          },
        },
      },
    });

    if (failedStops.length > 0) {
      // Group by user
      const byUser = new Map<string, typeof failedStops>();
      for (const stop of failedStops) {
        const userId = stop.route.userId;
        if (!byUser.has(userId)) {
          byUser.set(userId, []);
        }
        byUser.get(userId)!.push(stop);
      }

      for (const [userId, stops] of byUser) {
        this.addAlert(userId, {
          type: 'FAILED_DELIVERIES',
          severity: stops.length > 10 ? 'WARNING' : 'INFO',
          title: `${stops.length} Failed Deliveries Today`,
          message: `Consider scheduling retry deliveries for tomorrow`,
          entityType: 'DELIVERY',
          entityId: stops[0].routeId,
          data: {
            failedCount: stops.length,
            stops: stops.map(s => ({
              id: s.id,
              address: `${s.streetAddress}, ${s.postalCode} ${s.city}`,
              reason: s.failureReason,
            })),
          },
        });
      }
    }
  }

  // =================== REAL-TIME ALERTS ===================

  /**
   * Trigger alert when vehicle enters/exits geofence
   */
  async triggerGeofenceAlert(
    vehicleId: string,
    geofenceName: string,
    action: 'ENTERED' | 'EXITED',
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { licensePlate: true, userId: true },
    });

    if (vehicle) {
      this.addAlert(vehicle.userId, {
        type: 'GEOFENCE',
        severity: 'INFO',
        title: `Vehicle ${action.toLowerCase()} ${geofenceName}`,
        message: `${vehicle.licensePlate} has ${action.toLowerCase()} the ${geofenceName} zone`,
        entityType: 'VEHICLE',
        entityId: vehicleId,
        data: { geofenceName, action },
      });
    }
  }

  /**
   * Trigger SOS emergency alert
   */
  async triggerSOSAlert(
    vehicleId: string,
    driverId: string,
    sosType: string,
    location: { lat: number; lng: number },
    message?: string,
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { licensePlate: true, userId: true },
    });

    const driver = await this.prisma.employee.findFirst({
      where: { id: driverId },
      select: { firstName: true, lastName: true },
    });

    this.addAlert(vehicle?.userId || '', {
      type: 'SOS_EMERGENCY',
      severity: 'CRITICAL',
      title: `EMERGENCY SOS: ${sosType}`,
      message: `Driver ${driver?.firstName} ${driver?.lastName} (${vehicle?.licensePlate}) needs assistance`,
      entityType: 'VEHICLE',
      entityId: vehicleId,
      data: {
        sosType,
        location,
        driverMessage: message,
        driverId,
      },
    });

    this.logger.error(`SOS ALERT: ${sosType} - Vehicle ${vehicle?.licensePlate} at ${location.lat}, ${location.lng}`);
  }

  /**
   * Trigger low fuel warning
   */
  async triggerLowFuelAlert(vehicleId: string, fuelLevel: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { licensePlate: true, userId: true },
    });

    if (vehicle && fuelLevel < 20) {
      this.addAlert(vehicle.userId, {
        type: 'LOW_FUEL',
        severity: fuelLevel < 10 ? 'WARNING' : 'INFO',
        title: `Low Fuel: ${vehicle.licensePlate}`,
        message: `Fuel level at ${fuelLevel}%. Refueling recommended.`,
        entityType: 'VEHICLE',
        entityId: vehicleId,
        data: { fuelLevel },
      });
    }
  }

  // =================== HELPER METHODS ===================

  private addAlert(userId: string, alert: Omit<FleetAlert, 'id' | 'timestamp' | 'read'>) {
    const fullAlert: FleetAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    if (!this.alerts.has(userId)) {
      this.alerts.set(userId, []);
    }

    const userAlerts = this.alerts.get(userId)!;
    userAlerts.unshift(fullAlert);

    // Keep only last 100 alerts per user
    if (userAlerts.length > 100) {
      userAlerts.splice(100);
    }

    this.logger.log(`Alert created: [${alert.severity}] ${alert.title} for user ${userId}`);
  }

  // =================== API METHODS ===================

  /**
   * Get alerts for a user
   */
  getAlerts(userId: string, options?: { unreadOnly?: boolean; limit?: number }): FleetAlert[] {
    let alerts = this.alerts.get(userId) || [];

    if (options?.unreadOnly) {
      alerts = alerts.filter(a => !a.read);
    }

    if (options?.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  /**
   * Mark alert as read
   */
  markAsRead(userId: string, alertId: string): boolean {
    const userAlerts = this.alerts.get(userId);
    if (!userAlerts) return false;

    const alert = userAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.read = true;
      return true;
    }
    return false;
  }

  /**
   * Mark all alerts as read for a user
   */
  markAllAsRead(userId: string): number {
    const userAlerts = this.alerts.get(userId);
    if (!userAlerts) return 0;

    let count = 0;
    for (const alert of userAlerts) {
      if (!alert.read) {
        alert.read = true;
        count++;
      }
    }
    return count;
  }

  /**
   * Get alert statistics for dashboard
   */
  getAlertStats(userId: string): AlertStats {
    const userAlerts = this.alerts.get(userId) || [];

    const bySeverity = { INFO: 0, WARNING: 0, CRITICAL: 0 };
    const byType: Record<string, number> = {};
    let unread = 0;

    for (const alert of userAlerts) {
      bySeverity[alert.severity]++;
      byType[alert.type] = (byType[alert.type] || 0) + 1;
      if (!alert.read) unread++;
    }

    return {
      total: userAlerts.length,
      unread,
      bySeverity,
      byType,
    };
  }
}

// Types
interface FleetAlert {
  id: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  data?: any;
  timestamp: string;
  read: boolean;
}

interface AlertStats {
  total: number;
  unread: number;
  bySeverity: { INFO: number; WARNING: number; CRITICAL: number };
  byType: Record<string, number>;
}
