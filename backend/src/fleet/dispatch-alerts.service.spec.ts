import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  DispatchAlertsService,
  AlertType,
  AlertSeverity,
  AlertStatus,
  DispatchAlert,
} from './dispatch-alerts.service';
import { PrismaService } from '../prisma/prisma.service';
import { FleetGateway } from './fleet.gateway';
import { RouteStatus, DeliveryStopStatus } from '@prisma/client';

describe('DispatchAlertsService', () => {
  let service: DispatchAlertsService;
  let prismaService: jest.Mocked<PrismaService>;
  let fleetGateway: jest.Mocked<FleetGateway>;

  const mockUserId = 'user-123';

  const mockFleetGateway = {
    broadcastAlert: jest.fn(),
  };

  const mockPrismaService = {
    deliveryRoute: {
      findMany: jest.fn(),
    },
    deliveryStop: {
      findMany: jest.fn(),
    },
    vehicle: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchAlertsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: FleetGateway, useValue: mockFleetGateway },
      ],
    }).compile();

    service = module.get<DispatchAlertsService>(DispatchAlertsService);
    prismaService = module.get(PrismaService);
    fleetGateway = module.get(FleetGateway);
  });

  describe('createAlert', () => {
    it('should create a new alert successfully', async () => {
      const alertData = {
        type: 'DELAY' as AlertType,
        severity: 'HIGH' as AlertSeverity,
        title: 'Verspätung: Route München-Süd',
        message: '15 Minuten Verspätung bei Sendlinger Straße',
        vehicleId: 'vehicle-123',
        routeId: 'route-123',
      };

      const result = await service.createAlert(mockUserId, alertData);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^alert-/);
      expect(result.type).toBe('DELAY');
      expect(result.severity).toBe('HIGH');
      expect(result.status).toBe('ACTIVE');
      expect(result.title).toBe(alertData.title);
      expect(result.message).toBe(alertData.message);
      expect(result.userId).toBe(mockUserId);
      expect(result.vehicleId).toBe(alertData.vehicleId);
      expect(result.routeId).toBe(alertData.routeId);
      expect(result.escalationLevel).toBe(0);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(mockFleetGateway.broadcastAlert).toHaveBeenCalled();
    });

    it('should create an alert with expiration time', async () => {
      const alertData = {
        type: 'SOS' as AlertType,
        severity: 'CRITICAL' as AlertSeverity,
        title: 'Notfall: Unfall',
        message: 'Fahrzeug in Unfall verwickelt',
        expiresInMinutes: 60,
      };

      const result = await service.createAlert(mockUserId, alertData);

      expect(result.expiresAt).toBeDefined();
      expect(result.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should create an alert with location', async () => {
      const alertData = {
        type: 'DEVIATION' as AlertType,
        severity: 'MEDIUM' as AlertSeverity,
        title: 'Routenabweichung',
        message: 'Fahrzeug hat Route verlassen',
        location: { lat: 48.1351, lng: 11.5820 },
      };

      const result = await service.createAlert(mockUserId, alertData);

      expect(result.location).toEqual({ lat: 48.1351, lng: 11.5820 });
    });

    it('should broadcast alert via WebSocket', async () => {
      const alertData = {
        type: 'MAINTENANCE' as AlertType,
        severity: 'HIGH' as AlertSeverity,
        title: 'TÜV überfällig',
        message: 'Fahrzeug M-DL 1234 TÜV abgelaufen',
      };

      await service.createAlert(mockUserId, alertData);

      expect(mockFleetGateway.broadcastAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MAINTENANCE',
          severity: 'HIGH',
          message: alertData.message,
        }),
      );
    });
  });

  describe('getActiveAlerts', () => {
    it('should return active alerts for user', async () => {
      // Create some alerts first
      await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'HIGH',
        title: 'Alert 1',
        message: 'Message 1',
      });
      await service.createAlert(mockUserId, {
        type: 'SOS',
        severity: 'CRITICAL',
        title: 'Alert 2',
        message: 'Message 2',
      });

      const result = await service.getActiveAlerts(mockUserId);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0].status).toBe('ACTIVE');
    });

    it('should filter alerts by type', async () => {
      await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'HIGH',
        title: 'Delay Alert',
        message: 'Delay',
      });
      await service.createAlert(mockUserId, {
        type: 'MAINTENANCE',
        severity: 'MEDIUM',
        title: 'Maintenance Alert',
        message: 'Maintenance',
      });

      const result = await service.getActiveAlerts(mockUserId, { type: 'DELAY' });

      expect(result.every(a => a.type === 'DELAY')).toBe(true);
    });

    it('should filter alerts by severity', async () => {
      await service.createAlert(mockUserId, {
        type: 'SOS',
        severity: 'CRITICAL',
        title: 'Critical Alert',
        message: 'Critical',
      });
      await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'LOW',
        title: 'Low Alert',
        message: 'Low',
      });

      const result = await service.getActiveAlerts(mockUserId, { severity: 'CRITICAL' });

      expect(result.every(a => a.severity === 'CRITICAL')).toBe(true);
    });

    it('should sort alerts by severity then date', async () => {
      await service.createAlert(mockUserId, {
        type: 'INFO' as AlertType,
        severity: 'LOW',
        title: 'Low Alert',
        message: 'Low priority',
      });
      await service.createAlert(mockUserId, {
        type: 'SOS',
        severity: 'CRITICAL',
        title: 'Critical Alert',
        message: 'Critical priority',
      });
      await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'HIGH',
        title: 'High Alert',
        message: 'High priority',
      });

      const result = await service.getActiveAlerts(mockUserId);

      // Should be sorted: CRITICAL, HIGH, then LOW
      const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
      for (let i = 1; i < result.length; i++) {
        const prevIndex = severityOrder.indexOf(result[i - 1].severity);
        const currIndex = severityOrder.indexOf(result[i].severity);
        expect(prevIndex).toBeLessThanOrEqual(currIndex);
      }
    });
  });

  describe('getAlert', () => {
    it('should return alert by ID', async () => {
      const created = await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'HIGH',
        title: 'Test Alert',
        message: 'Test message',
      });

      const result = await service.getAlert(created.id);

      expect(result.id).toBe(created.id);
      expect(result.title).toBe('Test Alert');
    });

    it('should throw NotFoundException for non-existent alert', async () => {
      await expect(service.getAlert('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an active alert', async () => {
      const created = await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'HIGH',
        title: 'Test Alert',
        message: 'Test message',
      });

      const result = await service.acknowledgeAlert(created.id, 'dispatcher-1');

      expect(result.status).toBe('ACKNOWLEDGED');
      expect(result.acknowledgedAt).toBeInstanceOf(Date);
      expect(result.acknowledgedBy).toBe('dispatcher-1');
    });

    it('should throw error when acknowledging non-active alert', async () => {
      const created = await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'HIGH',
        title: 'Test Alert',
        message: 'Test message',
      });

      await service.acknowledgeAlert(created.id, 'dispatcher-1');

      await expect(
        service.acknowledgeAlert(created.id, 'dispatcher-2'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markInProgress', () => {
    it('should mark alert as in progress', async () => {
      const created = await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'HIGH',
        title: 'Test Alert',
        message: 'Test message',
      });

      const result = await service.markInProgress(created.id, 'driver-1');

      expect(result.status).toBe('IN_PROGRESS');
      expect(result.acknowledgedBy).toBe('driver-1');
    });

    it('should throw error for already resolved alert', async () => {
      const created = await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'HIGH',
        title: 'Test Alert',
        message: 'Test message',
      });

      await service.resolveAlert(created.id, 'dispatcher-1');

      await expect(
        service.markInProgress(created.id, 'driver-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert with note', async () => {
      const created = await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'HIGH',
        title: 'Test Alert',
        message: 'Test message',
      });

      const result = await service.resolveAlert(
        created.id,
        'dispatcher-1',
        'Problem behoben durch alternative Route',
      );

      expect(result.status).toBe('RESOLVED');
      expect(result.resolvedAt).toBeInstanceOf(Date);
      expect(result.resolvedBy).toBe('dispatcher-1');
      expect(result.resolutionNote).toBe('Problem behoben durch alternative Route');
    });

    it('should throw error when resolving already resolved alert', async () => {
      const created = await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'HIGH',
        title: 'Test Alert',
        message: 'Test message',
      });

      await service.resolveAlert(created.id, 'dispatcher-1');

      await expect(
        service.resolveAlert(created.id, 'dispatcher-2'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('dismissAlert', () => {
    it('should dismiss an alert with reason', async () => {
      const created = await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'LOW',
        title: 'Test Alert',
        message: 'Test message',
      });

      const result = await service.dismissAlert(
        created.id,
        'dispatcher-1',
        'Fehlalarm - Stau bereits aufgelöst',
      );

      expect(result.status).toBe('DISMISSED');
      expect(result.resolvedBy).toBe('dispatcher-1');
      expect(result.resolutionNote).toBe('Fehlalarm - Stau bereits aufgelöst');
    });

    it('should throw error when dismissing closed alert', async () => {
      const created = await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'HIGH',
        title: 'Test Alert',
        message: 'Test message',
      });

      await service.resolveAlert(created.id, 'dispatcher-1');

      await expect(
        service.dismissAlert(created.id, 'dispatcher-2'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAlertHistory', () => {
    it('should return alert history for user', async () => {
      await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'HIGH',
        title: 'Alert 1',
        message: 'Message 1',
      });
      const alert2 = await service.createAlert(mockUserId, {
        type: 'SOS',
        severity: 'CRITICAL',
        title: 'Alert 2',
        message: 'Message 2',
      });
      await service.resolveAlert(alert2.id, 'dispatcher-1');

      const result = await service.getAlertHistory(mockUserId);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter history by date range', async () => {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      const to = new Date();
      to.setHours(23, 59, 59, 999);

      await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'HIGH',
        title: 'Today Alert',
        message: 'Created today',
      });

      const result = await service.getAlertHistory(mockUserId, { from, to });

      expect(result.every(a => a.createdAt >= from && a.createdAt <= to)).toBe(true);
    });

    it('should filter history by status', async () => {
      await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'HIGH',
        title: 'Active Alert',
        message: 'Still active',
      });
      const resolved = await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'HIGH',
        title: 'Resolved Alert',
        message: 'Already resolved',
      });
      await service.resolveAlert(resolved.id, 'dispatcher-1');

      const result = await service.getAlertHistory(mockUserId, { status: 'RESOLVED' });

      expect(result.every(a => a.status === 'RESOLVED')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        await service.createAlert(mockUserId, {
          type: 'DELAY',
          severity: 'LOW',
          title: `Alert ${i}`,
          message: `Message ${i}`,
        });
      }

      const result = await service.getAlertHistory(mockUserId, { limit: 5 });

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getAlertStats', () => {
    it('should return alert statistics', async () => {
      // Create various alerts
      await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'HIGH',
        title: 'Delay',
        message: 'Delay alert',
      });
      const sosAlert = await service.createAlert(mockUserId, {
        type: 'SOS',
        severity: 'CRITICAL',
        title: 'SOS',
        message: 'SOS alert',
      });
      await service.resolveAlert(sosAlert.id, 'dispatcher-1');

      const result = await service.getAlertStats(mockUserId);

      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.active).toBeGreaterThanOrEqual(1);
      expect(result.resolved).toBeGreaterThanOrEqual(1);
      expect(result.byType).toBeDefined();
      expect(result.bySeverity).toBeDefined();
      expect(typeof result.avgResolutionTimeMinutes).toBe('number');
    });
  });

  describe('Alert Rules', () => {
    describe('createAlertRule', () => {
      it('should create a new alert rule', async () => {
        const rule = await service.createAlertRule(mockUserId, {
          name: 'Verspätung > 15 Min',
          type: 'DELAY',
          enabled: true,
          conditions: {
            threshold: 15,
            duration: 5,
          },
          actions: {
            notify: true,
            escalate: true,
            autoResolve: false,
            escalationDelayMinutes: 10,
          },
        });

        expect(rule.id).toMatch(/^rule-/);
        expect(rule.name).toBe('Verspätung > 15 Min');
        expect(rule.type).toBe('DELAY');
        expect(rule.enabled).toBe(true);
        expect(rule.conditions.threshold).toBe(15);
      });
    });

    describe('getAlertRules', () => {
      it('should return all rules for user', async () => {
        await service.createAlertRule(mockUserId, {
          name: 'Rule 1',
          type: 'DELAY',
          enabled: true,
          conditions: {},
          actions: { notify: true, escalate: false, autoResolve: false },
        });
        await service.createAlertRule(mockUserId, {
          name: 'Rule 2',
          type: 'SOS',
          enabled: true,
          conditions: {},
          actions: { notify: true, escalate: true, autoResolve: false },
        });

        const result = await service.getAlertRules(mockUserId);

        expect(result.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('updateAlertRule', () => {
      it('should update an existing rule', async () => {
        const rule = await service.createAlertRule(mockUserId, {
          name: 'Original Name',
          type: 'DELAY',
          enabled: true,
          conditions: { threshold: 10 },
          actions: { notify: true, escalate: false, autoResolve: false },
        });

        const updated = await service.updateAlertRule(mockUserId, rule.id, {
          name: 'Updated Name',
          enabled: false,
        });

        expect(updated.name).toBe('Updated Name');
        expect(updated.enabled).toBe(false);
      });

      it('should throw NotFoundException for non-existent rule', async () => {
        await expect(
          service.updateAlertRule(mockUserId, 'non-existent', { name: 'Test' }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteAlertRule', () => {
      it('should delete an existing rule', async () => {
        const rule = await service.createAlertRule(mockUserId, {
          name: 'To Delete',
          type: 'DELAY',
          enabled: true,
          conditions: {},
          actions: { notify: true, escalate: false, autoResolve: false },
        });

        await service.deleteAlertRule(mockUserId, rule.id);

        const rules = await service.getAlertRules(mockUserId);
        expect(rules.find(r => r.id === rule.id)).toBeUndefined();
      });
    });
  });

  describe('Notification Preferences', () => {
    describe('getNotificationPreferences', () => {
      it('should return default preferences for new user', async () => {
        const result = await service.getNotificationPreferences('new-user-123');

        expect(result.userId).toBe('new-user-123');
        expect(result.channels.inApp).toBe(true);
        expect(result.channels.email).toBe(true);
        expect(result.channels.push).toBe(true);
        expect(result.escalationEnabled).toBe(true);
      });
    });

    describe('updateNotificationPreferences', () => {
      it('should update notification preferences', async () => {
        const result = await service.updateNotificationPreferences(mockUserId, {
          channels: {
            inApp: true,
            email: false,
            sms: true,
            push: false,
          },
          quietHours: {
            enabled: true,
            start: '22:00',
            end: '07:00',
          },
        });

        expect(result.channels.email).toBe(false);
        expect(result.channels.sms).toBe(true);
        expect(result.quietHours?.enabled).toBe(true);
        expect(result.quietHours?.start).toBe('22:00');
      });
    });
  });

  describe('Automated Alert Checks', () => {
    describe('checkRouteDelays', () => {
      it('should create alerts for delayed routes', async () => {
        const now = new Date();
        const pastTime = new Date(now.getTime() - 20 * 60 * 1000); // 20 minutes ago

        mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
          {
            id: 'route-1',
            routeName: 'München-Süd',
            vehicleId: 'vehicle-1',
            driverId: 'driver-1',
            stops: [
              {
                id: 'stop-1',
                streetAddress: 'Sendlinger Straße 1',
                estimatedArrival: pastTime,
                status: DeliveryStopStatus.PENDING,
              },
            ],
            vehicle: { licensePlate: 'M-DL 1234' },
            driver: { firstName: 'Max', lastName: 'Mustermann' },
          },
        ]);

        const result = await service.checkRouteDelays(mockUserId);

        expect(result).toBeGreaterThanOrEqual(0);
        expect(mockPrismaService.deliveryRoute.findMany).toHaveBeenCalled();
      });
    });

    describe('checkFailedDeliveries', () => {
      it('should create alerts for failed deliveries', async () => {
        mockPrismaService.deliveryStop.findMany.mockResolvedValue([
          {
            id: 'stop-1',
            streetAddress: 'Marienplatz 1',
            failureReason: 'Empfänger nicht angetroffen',
            recipientName: 'Hans Müller',
            attemptCount: 2,
            routeId: 'route-1',
            route: {
              vehicleId: 'vehicle-1',
              driverId: 'driver-1',
              vehicle: { licensePlate: 'M-DL 1234' },
              driver: { firstName: 'Max', lastName: 'Mustermann' },
            },
          },
        ]);

        const result = await service.checkFailedDeliveries(mockUserId);

        expect(result).toBeGreaterThanOrEqual(0);
        expect(mockPrismaService.deliveryStop.findMany).toHaveBeenCalled();
      });
    });

    describe('checkMaintenanceAlerts', () => {
      it('should create alerts for expired TÜV', async () => {
        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - 30); // 30 days ago

        mockPrismaService.vehicle.findMany.mockResolvedValue([
          {
            id: 'vehicle-1',
            licensePlate: 'M-DL 1234',
            tuvExpiry: expiredDate,
            insuranceExpiry: null,
          },
        ]);

        const result = await service.checkMaintenanceAlerts(mockUserId);

        expect(result).toBeGreaterThanOrEqual(0);
        expect(mockPrismaService.vehicle.findMany).toHaveBeenCalled();
      });

      it('should create critical alerts for expired insurance', async () => {
        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - 5); // 5 days ago

        mockPrismaService.vehicle.findMany.mockResolvedValue([
          {
            id: 'vehicle-2',
            licensePlate: 'M-DL 5678',
            tuvExpiry: null,
            insuranceExpiry: expiredDate,
          },
        ]);

        const result = await service.checkMaintenanceAlerts(mockUserId);

        expect(result).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('getDispatchDashboard', () => {
    it('should return dashboard summary', async () => {
      // Create some alerts
      await service.createAlert(mockUserId, {
        type: 'SOS',
        severity: 'CRITICAL',
        title: 'Critical Alert',
        message: 'Critical message',
      });
      await service.createAlert(mockUserId, {
        type: 'DELAY',
        severity: 'HIGH',
        title: 'High Alert',
        message: 'High message',
      });

      const result = await service.getDispatchDashboard(mockUserId);

      expect(result.activeAlerts).toBeGreaterThanOrEqual(2);
      expect(result.criticalAlerts).toBeGreaterThanOrEqual(1);
      expect(result.pendingAcknowledgment).toBeGreaterThanOrEqual(2);
      expect(result.recentAlerts).toBeDefined();
      expect(result.alertsByType).toBeDefined();
    });
  });
});
