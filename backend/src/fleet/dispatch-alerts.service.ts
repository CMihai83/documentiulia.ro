import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FleetGateway } from './fleet.gateway';
import { RouteStatus, DeliveryStopStatus } from '@prisma/client';

/**
 * Real-time Dispatch Alerts System
 * Centralized alerting for fleet dispatch operations in Munich.
 *
 * Alert Types:
 * - SOS: Emergency situations (accidents, medical, security)
 * - DELAY: Route delays, traffic issues
 * - DEVIATION: Route deviations, off-route driving
 * - MAINTENANCE: Vehicle maintenance required
 * - CAPACITY: Capacity issues (overload, underutilization)
 * - WEATHER: Weather-related alerts
 * - DELIVERY_FAILED: Failed deliveries
 * - DRIVER_ISSUE: Driver availability, performance issues
 * - SYSTEM: System alerts (API issues, connectivity)
 *
 * Features:
 * - Alert creation and broadcasting
 * - Priority levels and escalation
 * - Acknowledgment workflow
 * - Resolution tracking
 * - Alert history and analytics
 * - Notification preferences
 */

export type AlertType =
  | 'SOS'
  | 'DELAY'
  | 'DEVIATION'
  | 'MAINTENANCE'
  | 'CAPACITY'
  | 'WEATHER'
  | 'DELIVERY_FAILED'
  | 'DRIVER_ISSUE'
  | 'SYSTEM'
  | 'GEOFENCE'
  | 'SPEED'
  | 'IDLE';

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';

export interface DispatchAlert {
  id: string;
  userId: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  data: Record<string, any>;
  vehicleId?: string;
  routeId?: string;
  driverId?: string;
  stopId?: string;
  location?: { lat: number; lng: number };
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNote?: string;
  escalatedAt?: Date;
  escalationLevel: number;
  expiresAt?: Date;
}

export interface AlertRule {
  id: string;
  userId: string;
  name: string;
  type: AlertType;
  enabled: boolean;
  conditions: {
    threshold?: number;
    duration?: number;
    zones?: string[];
  };
  actions: {
    notify: boolean;
    escalate: boolean;
    autoResolve: boolean;
    escalationDelayMinutes?: number;
  };
}

export interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  byType: Record<AlertType, number>;
  bySeverity: Record<AlertSeverity, number>;
  avgResolutionTimeMinutes: number;
  escalatedCount: number;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  alertTypes: Partial<Record<AlertType, boolean>>;
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm
    end: string;
  };
  escalationEnabled: boolean;
}

@Injectable()
export class DispatchAlertsService {
  private readonly logger = new Logger(DispatchAlertsService.name);

  // In-memory storage (would be Prisma in production)
  private alerts: Map<string, DispatchAlert> = new Map();
  private alertRules: Map<string, AlertRule[]> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();

  // Alert counter for IDs
  private alertCounter = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly fleetGateway: FleetGateway,
  ) {
    // Start background monitoring
    this.startMonitoring();
  }

  /**
   * Create and broadcast a new alert
   */
  async createAlert(
    userId: string,
    alert: {
      type: AlertType;
      severity: AlertSeverity;
      title: string;
      message: string;
      data?: Record<string, any>;
      vehicleId?: string;
      routeId?: string;
      driverId?: string;
      stopId?: string;
      location?: { lat: number; lng: number };
      expiresInMinutes?: number;
    },
  ): Promise<DispatchAlert> {
    const id = `alert-${++this.alertCounter}-${Date.now()}`;

    const newAlert: DispatchAlert = {
      id,
      userId,
      type: alert.type,
      severity: alert.severity,
      status: 'ACTIVE',
      title: alert.title,
      message: alert.message,
      data: alert.data || {},
      vehicleId: alert.vehicleId,
      routeId: alert.routeId,
      driverId: alert.driverId,
      stopId: alert.stopId,
      location: alert.location,
      createdAt: new Date(),
      escalationLevel: 0,
      expiresAt: alert.expiresInMinutes
        ? new Date(Date.now() + alert.expiresInMinutes * 60 * 1000)
        : undefined,
    };

    this.alerts.set(id, newAlert);

    // Broadcast via WebSocket
    this.broadcastAlert(newAlert);

    // Log
    this.logger.log(
      `Alert created: [${newAlert.severity}] ${newAlert.type} - ${newAlert.title}`,
    );

    // Schedule escalation for critical alerts
    if (newAlert.severity === 'CRITICAL' || newAlert.severity === 'HIGH') {
      this.scheduleEscalation(newAlert);
    }

    return newAlert;
  }

  /**
   * Get all active alerts for a user
   */
  async getActiveAlerts(
    userId: string,
    filters?: {
      type?: AlertType;
      severity?: AlertSeverity;
      vehicleId?: string;
      routeId?: string;
    },
  ): Promise<DispatchAlert[]> {
    let alerts = Array.from(this.alerts.values())
      .filter(a => a.userId === userId && a.status === 'ACTIVE');

    if (filters?.type) {
      alerts = alerts.filter(a => a.type === filters.type);
    }
    if (filters?.severity) {
      alerts = alerts.filter(a => a.severity === filters.severity);
    }
    if (filters?.vehicleId) {
      alerts = alerts.filter(a => a.vehicleId === filters.vehicleId);
    }
    if (filters?.routeId) {
      alerts = alerts.filter(a => a.routeId === filters.routeId);
    }

    // Sort by severity (CRITICAL first) then by date
    const severityOrder: Record<AlertSeverity, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
      INFO: 4,
    };

    return alerts.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /**
   * Get alert by ID
   */
  async getAlert(alertId: string): Promise<DispatchAlert> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }
    return alert;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
  ): Promise<DispatchAlert> {
    const alert = await this.getAlert(alertId);

    if (alert.status !== 'ACTIVE') {
      throw new BadRequestException('Alert is not active');
    }

    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    this.alerts.set(alertId, alert);

    // Broadcast update
    this.broadcastAlertUpdate(alert);

    this.logger.log(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);

    return alert;
  }

  /**
   * Mark alert as in progress
   */
  async markInProgress(
    alertId: string,
    assignedTo: string,
  ): Promise<DispatchAlert> {
    const alert = await this.getAlert(alertId);

    if (alert.status === 'RESOLVED' || alert.status === 'DISMISSED') {
      throw new BadRequestException('Alert is already closed');
    }

    alert.status = 'IN_PROGRESS';
    if (!alert.acknowledgedAt) {
      alert.acknowledgedAt = new Date();
      alert.acknowledgedBy = assignedTo;
    }

    this.alerts.set(alertId, alert);
    this.broadcastAlertUpdate(alert);

    return alert;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(
    alertId: string,
    resolvedBy: string,
    resolutionNote?: string,
  ): Promise<DispatchAlert> {
    const alert = await this.getAlert(alertId);

    if (alert.status === 'RESOLVED') {
      throw new BadRequestException('Alert is already resolved');
    }

    alert.status = 'RESOLVED';
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;
    alert.resolutionNote = resolutionNote;

    this.alerts.set(alertId, alert);

    // Broadcast resolution
    this.broadcastAlertUpdate(alert);

    // Calculate resolution time
    const resolutionTimeMs = alert.resolvedAt.getTime() - alert.createdAt.getTime();
    const resolutionTimeMin = Math.round(resolutionTimeMs / (1000 * 60));

    this.logger.log(
      `Alert ${alertId} resolved by ${resolvedBy} in ${resolutionTimeMin} minutes`,
    );

    return alert;
  }

  /**
   * Dismiss an alert (not relevant/false positive)
   */
  async dismissAlert(
    alertId: string,
    dismissedBy: string,
    reason?: string,
  ): Promise<DispatchAlert> {
    const alert = await this.getAlert(alertId);

    if (alert.status === 'RESOLVED' || alert.status === 'DISMISSED') {
      throw new BadRequestException('Alert is already closed');
    }

    alert.status = 'DISMISSED';
    alert.resolvedAt = new Date();
    alert.resolvedBy = dismissedBy;
    alert.resolutionNote = reason || 'Dismissed';

    this.alerts.set(alertId, alert);
    this.broadcastAlertUpdate(alert);

    return alert;
  }

  /**
   * Get alert history
   */
  async getAlertHistory(
    userId: string,
    options?: {
      from?: Date;
      to?: Date;
      type?: AlertType;
      status?: AlertStatus;
      limit?: number;
    },
  ): Promise<DispatchAlert[]> {
    let alerts = Array.from(this.alerts.values())
      .filter(a => a.userId === userId);

    if (options?.from) {
      alerts = alerts.filter(a => a.createdAt >= options.from!);
    }
    if (options?.to) {
      alerts = alerts.filter(a => a.createdAt <= options.to!);
    }
    if (options?.type) {
      alerts = alerts.filter(a => a.type === options.type);
    }
    if (options?.status) {
      alerts = alerts.filter(a => a.status === options.status);
    }

    alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(
    userId: string,
    from?: Date,
    to?: Date,
  ): Promise<AlertStats> {
    const fromDate = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = to || new Date();

    const alerts = Array.from(this.alerts.values())
      .filter(a => a.userId === userId && a.createdAt >= fromDate && a.createdAt <= toDate);

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let escalatedCount = 0;

    for (const alert of alerts) {
      byType[alert.type] = (byType[alert.type] || 0) + 1;
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;

      if (alert.resolvedAt && alert.status === 'RESOLVED') {
        totalResolutionTime += alert.resolvedAt.getTime() - alert.createdAt.getTime();
        resolvedCount++;
      }

      if (alert.escalationLevel > 0) {
        escalatedCount++;
      }
    }

    const avgResolutionTimeMinutes = resolvedCount > 0
      ? Math.round(totalResolutionTime / resolvedCount / (1000 * 60))
      : 0;

    return {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'ACTIVE').length,
      acknowledged: alerts.filter(a => a.status === 'ACKNOWLEDGED').length,
      resolved: alerts.filter(a => a.status === 'RESOLVED').length,
      byType: byType as Record<AlertType, number>,
      bySeverity: bySeverity as Record<AlertSeverity, number>,
      avgResolutionTimeMinutes,
      escalatedCount,
    };
  }

  // =================== ALERT RULES ===================

  /**
   * Create an alert rule
   */
  async createAlertRule(
    userId: string,
    rule: Omit<AlertRule, 'id' | 'userId'>,
  ): Promise<AlertRule> {
    const id = `rule-${Date.now()}`;

    const newRule: AlertRule = {
      id,
      userId,
      ...rule,
    };

    const userRules = this.alertRules.get(userId) || [];
    userRules.push(newRule);
    this.alertRules.set(userId, userRules);

    return newRule;
  }

  /**
   * Get alert rules
   */
  async getAlertRules(userId: string): Promise<AlertRule[]> {
    return this.alertRules.get(userId) || [];
  }

  /**
   * Update an alert rule
   */
  async updateAlertRule(
    userId: string,
    ruleId: string,
    updates: Partial<AlertRule>,
  ): Promise<AlertRule> {
    const userRules = this.alertRules.get(userId) || [];
    const ruleIndex = userRules.findIndex(r => r.id === ruleId);

    if (ruleIndex === -1) {
      throw new NotFoundException('Alert rule not found');
    }

    userRules[ruleIndex] = { ...userRules[ruleIndex], ...updates };
    this.alertRules.set(userId, userRules);

    return userRules[ruleIndex];
  }

  /**
   * Delete an alert rule
   */
  async deleteAlertRule(userId: string, ruleId: string): Promise<void> {
    const userRules = this.alertRules.get(userId) || [];
    const filtered = userRules.filter(r => r.id !== ruleId);
    this.alertRules.set(userId, filtered);
  }

  // =================== NOTIFICATION PREFERENCES ===================

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    return this.preferences.get(userId) || {
      userId,
      channels: {
        inApp: true,
        email: true,
        sms: false,
        push: true,
      },
      alertTypes: {
        SOS: true,
        DELAY: true,
        DEVIATION: true,
        MAINTENANCE: true,
        CAPACITY: true,
        WEATHER: true,
        DELIVERY_FAILED: true,
        DRIVER_ISSUE: true,
        SYSTEM: true,
        GEOFENCE: true,
        SPEED: true,
        IDLE: true,
      },
      escalationEnabled: true,
    };
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const current = await this.getNotificationPreferences(userId);
    const updated = { ...current, ...updates, userId };
    this.preferences.set(userId, updated);
    return updated;
  }

  // =================== AUTOMATED ALERT GENERATION ===================

  /**
   * Check for route delays and create alerts
   */
  async checkRouteDelays(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: today,
        status: RouteStatus.IN_PROGRESS,
      },
      include: {
        stops: {
          where: { status: DeliveryStopStatus.PENDING },
          orderBy: { stopOrder: 'asc' },
        },
        vehicle: { select: { licensePlate: true } },
        driver: { select: { firstName: true, lastName: true } },
      },
    });

    let alertsCreated = 0;

    for (const route of routes) {
      // Check if behind schedule
      for (const stop of route.stops) {
        if (stop.estimatedArrival && stop.estimatedArrival < new Date()) {
          const delayMinutes = Math.round(
            (Date.now() - stop.estimatedArrival.getTime()) / (1000 * 60),
          );

          if (delayMinutes > 15) {
            // Check if we already have an alert for this stop
            const existingAlert = Array.from(this.alerts.values()).find(
              a => a.stopId === stop.id && a.status === 'ACTIVE' && a.type === 'DELAY',
            );

            if (!existingAlert) {
              await this.createAlert(userId, {
                type: 'DELAY',
                severity: delayMinutes > 30 ? 'HIGH' : 'MEDIUM',
                title: `Verspätung: ${route.routeName || 'Route'}`,
                message: `${delayMinutes} Minuten Verspätung bei ${stop.streetAddress}`,
                routeId: route.id,
                stopId: stop.id,
                vehicleId: route.vehicleId,
                driverId: route.driverId || undefined,
                data: {
                  delayMinutes,
                  driverName: route.driver
                    ? `${route.driver.firstName} ${route.driver.lastName}`
                    : 'Unknown',
                  vehiclePlate: route.vehicle?.licensePlate,
                },
              });
              alertsCreated++;
            }
          }
        }
      }
    }

    return alertsCreated;
  }

  /**
   * Check for failed deliveries and create alerts
   */
  async checkFailedDeliveries(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const failedStops = await this.prisma.deliveryStop.findMany({
      where: {
        route: { userId, routeDate: today },
        status: DeliveryStopStatus.FAILED,
        updatedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // Last 30 minutes
      },
      include: {
        route: {
          include: {
            vehicle: { select: { licensePlate: true } },
            driver: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    let alertsCreated = 0;

    for (const stop of failedStops) {
      const existingAlert = Array.from(this.alerts.values()).find(
        a => a.stopId === stop.id && a.type === 'DELIVERY_FAILED',
      );

      if (!existingAlert) {
        await this.createAlert(userId, {
          type: 'DELIVERY_FAILED',
          severity: 'MEDIUM',
          title: 'Zustellung fehlgeschlagen',
          message: `${stop.streetAddress}: ${stop.failureReason || 'Grund unbekannt'}`,
          routeId: stop.routeId,
          stopId: stop.id,
          vehicleId: stop.route.vehicleId,
          driverId: stop.route.driverId || undefined,
          data: {
            reason: stop.failureReason,
            recipientName: stop.recipientName,
            attemptCount: stop.attemptCount,
          },
        });
        alertsCreated++;
      }
    }

    return alertsCreated;
  }

  /**
   * Check vehicle maintenance status
   */
  async checkMaintenanceAlerts(userId: string): Promise<number> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
    });

    let alertsCreated = 0;
    const now = new Date();

    for (const vehicle of vehicles) {
      // Check TÜV expiry
      if (vehicle.tuvExpiry && vehicle.tuvExpiry < now) {
        const existingAlert = Array.from(this.alerts.values()).find(
          a => a.vehicleId === vehicle.id && a.type === 'MAINTENANCE' && a.status === 'ACTIVE',
        );

        if (!existingAlert) {
          await this.createAlert(userId, {
            type: 'MAINTENANCE',
            severity: 'HIGH',
            title: 'TÜV überfällig',
            message: `Fahrzeug ${vehicle.licensePlate}: TÜV seit ${this.formatDate(vehicle.tuvExpiry)} abgelaufen`,
            vehicleId: vehicle.id,
            data: {
              maintenanceType: 'TÜV',
              expiredSince: vehicle.tuvExpiry,
            },
          });
          alertsCreated++;
        }
      }

      // Check insurance expiry
      if (vehicle.insuranceExpiry && vehicle.insuranceExpiry < now) {
        const existingAlert = Array.from(this.alerts.values()).find(
          a =>
            a.vehicleId === vehicle.id &&
            a.type === 'MAINTENANCE' &&
            a.data?.maintenanceType === 'INSURANCE' &&
            a.status === 'ACTIVE',
        );

        if (!existingAlert) {
          await this.createAlert(userId, {
            type: 'MAINTENANCE',
            severity: 'CRITICAL',
            title: 'Versicherung abgelaufen',
            message: `Fahrzeug ${vehicle.licensePlate}: Versicherung seit ${this.formatDate(vehicle.insuranceExpiry)} abgelaufen`,
            vehicleId: vehicle.id,
            data: {
              maintenanceType: 'INSURANCE',
              expiredSince: vehicle.insuranceExpiry,
            },
          });
          alertsCreated++;
        }
      }
    }

    return alertsCreated;
  }

  // =================== PRIVATE HELPERS ===================

  private broadcastAlert(alert: DispatchAlert): void {
    this.fleetGateway.broadcastAlert({
      type: alert.type,
      severity: alert.severity,
      alertId: alert.id,
      message: alert.message,
      data: {
        ...alert.data,
        title: alert.title,
        vehicleId: alert.vehicleId,
        routeId: alert.routeId,
        location: alert.location,
      },
    });
  }

  private broadcastAlertUpdate(alert: DispatchAlert): void {
    this.fleetGateway.broadcastAlert({
      type: 'SYSTEM',
      severity: 'INFO',
      alertId: alert.id,
      message: `Alert ${alert.id} updated: ${alert.status}`,
      data: {
        alertId: alert.id,
        status: alert.status,
        resolvedBy: alert.resolvedBy,
        acknowledgedBy: alert.acknowledgedBy,
      },
    });
  }

  private scheduleEscalation(alert: DispatchAlert): void {
    // Escalate after 5 minutes for critical, 15 for high
    const delayMinutes = alert.severity === 'CRITICAL' ? 5 : 15;

    setTimeout(async () => {
      const currentAlert = this.alerts.get(alert.id);
      if (currentAlert && currentAlert.status === 'ACTIVE') {
        currentAlert.escalationLevel++;
        currentAlert.escalatedAt = new Date();
        this.alerts.set(alert.id, currentAlert);

        this.logger.warn(
          `Alert ${alert.id} escalated to level ${currentAlert.escalationLevel}`,
        );

        // Broadcast escalation
        this.broadcastAlert(currentAlert);
      }
    }, delayMinutes * 60 * 1000);
  }

  private startMonitoring(): void {
    // Check for expired alerts every minute
    setInterval(() => {
      const now = new Date();
      for (const [id, alert] of this.alerts) {
        if (alert.expiresAt && alert.expiresAt < now && alert.status === 'ACTIVE') {
          alert.status = 'DISMISSED';
          alert.resolutionNote = 'Auto-expired';
          this.alerts.set(id, alert);
        }
      }
    }, 60 * 1000);
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /**
   * Get dashboard summary for dispatch
   */
  async getDispatchDashboard(userId: string): Promise<{
    activeAlerts: number;
    criticalAlerts: number;
    pendingAcknowledgment: number;
    recentAlerts: DispatchAlert[];
    alertsByType: Record<string, number>;
  }> {
    const alerts = await this.getActiveAlerts(userId);
    const stats = await this.getAlertStats(userId);

    return {
      activeAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'CRITICAL').length,
      pendingAcknowledgment: alerts.filter(a => a.status === 'ACTIVE').length,
      recentAlerts: alerts.slice(0, 5),
      alertsByType: stats.byType,
    };
  }
}
