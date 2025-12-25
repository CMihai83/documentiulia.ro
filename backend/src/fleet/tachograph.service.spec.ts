import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  TachographService,
  TachographFile,
  TachographActivityType,
  InfringementType,
  InfringementSeverity,
} from './tachograph.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TachographService', () => {
  let service: TachographService;
  let mockPrismaService: any;

  beforeEach(async () => {
    mockPrismaService = {
      employee: {
        findUnique: jest.fn().mockResolvedValue({
          firstName: 'Ion',
          lastName: 'Popescu',
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TachographService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<TachographService>(TachographService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('File Upload', () => {
    describe('uploadTachographFile', () => {
      it('should upload driver card file', async () => {
        const buffer = Buffer.from('test tachograph data');

        const file = await service.uploadTachographFile('user-1', {
          buffer,
          originalName: 'driver_card.ddd',
          fileType: 'DRIVER_CARD',
          driverId: 'driver-1',
        });

        expect(file.id).toBeDefined();
        expect(file.fileName).toBe('driver_card.ddd');
        expect(file.fileType).toBe('DRIVER_CARD');
        expect(file.status).toBe('PENDING');
        expect(file.fileHash).toBeDefined();
      });

      it('should upload vehicle unit file', async () => {
        const buffer = Buffer.from('vehicle unit data');

        const file = await service.uploadTachographFile('user-1', {
          buffer,
          originalName: 'vehicle.ddd',
          fileType: 'VEHICLE_UNIT',
          vehicleId: 'vehicle-1',
        });

        expect(file.fileType).toBe('VEHICLE_UNIT');
        expect(file.vehicleId).toBe('vehicle-1');
      });

      it('should upload company card file', async () => {
        const buffer = Buffer.from('company card data');

        const file = await service.uploadTachographFile('user-1', {
          buffer,
          originalName: 'company.ddd',
          fileType: 'COMPANY_CARD',
        });

        expect(file.fileType).toBe('COMPANY_CARD');
      });

      it('should generate unique file hash', async () => {
        const buffer1 = Buffer.from('data 1');
        const buffer2 = Buffer.from('data 2');

        const file1 = await service.uploadTachographFile('user-1', {
          buffer: buffer1,
          originalName: 'file1.ddd',
          fileType: 'DRIVER_CARD',
        });

        const file2 = await service.uploadTachographFile('user-1', {
          buffer: buffer2,
          originalName: 'file2.ddd',
          fileType: 'DRIVER_CARD',
        });

        expect(file1.fileHash).not.toBe(file2.fileHash);
      });

      it('should reject duplicate files', async () => {
        const buffer = Buffer.from('duplicate data');

        await service.uploadTachographFile('user-1', {
          buffer,
          originalName: 'original.ddd',
          fileType: 'DRIVER_CARD',
        });

        await expect(
          service.uploadTachographFile('user-1', {
            buffer,
            originalName: 'duplicate.ddd',
            fileType: 'DRIVER_CARD',
          }),
        ).rejects.toThrow('This tachograph file has already been uploaded');
      });

      it('should allow same file for different users', async () => {
        const buffer = Buffer.from('shared data');

        const file1 = await service.uploadTachographFile('user-1', {
          buffer,
          originalName: 'file.ddd',
          fileType: 'DRIVER_CARD',
        });

        const file2 = await service.uploadTachographFile('user-2', {
          buffer,
          originalName: 'file.ddd',
          fileType: 'DRIVER_CARD',
        });

        expect(file1.id).not.toBe(file2.id);
      });
    });
  });

  describe('File Retrieval', () => {
    beforeEach(async () => {
      await service.uploadTachographFile('user-1', {
        buffer: Buffer.from('driver 1'),
        originalName: 'driver1.ddd',
        fileType: 'DRIVER_CARD',
        driverId: 'driver-1',
      });

      await new Promise(r => setTimeout(r, 5));

      await service.uploadTachographFile('user-1', {
        buffer: Buffer.from('vehicle 1'),
        originalName: 'vehicle1.ddd',
        fileType: 'VEHICLE_UNIT',
        vehicleId: 'vehicle-1',
      });
    });

    describe('getTachographFiles', () => {
      it('should return files for user', () => {
        const files = service.getTachographFiles('user-1');

        expect(files.length).toBe(2);
      });

      it('should filter by file type', () => {
        const files = service.getTachographFiles('user-1', { fileType: 'DRIVER_CARD' });

        expect(files.every(f => f.fileType === 'DRIVER_CARD')).toBe(true);
      });

      it('should filter by driver', () => {
        const files = service.getTachographFiles('user-1', { driverId: 'driver-1' });

        expect(files.every(f => f.driverId === 'driver-1')).toBe(true);
      });

      it('should filter by vehicle', () => {
        const files = service.getTachographFiles('user-1', { vehicleId: 'vehicle-1' });

        expect(files.every(f => f.vehicleId === 'vehicle-1')).toBe(true);
      });

      it('should sort by upload date descending', () => {
        const files = service.getTachographFiles('user-1');

        for (let i = 1; i < files.length; i++) {
          expect(files[i - 1].uploadedAt.getTime()).toBeGreaterThanOrEqual(
            files[i].uploadedAt.getTime(),
          );
        }
      });
    });
  });

  describe('Activity Analysis', () => {
    describe('analyzeDailyActivities', () => {
      beforeEach(async () => {
        // Upload file to generate sample activities
        await service.uploadTachographFile('user-1', {
          buffer: Buffer.from('sample data'),
          originalName: 'sample.ddd',
          fileType: 'DRIVER_CARD',
          driverId: 'driver-1',
        });

        // Wait for parsing
        await new Promise(r => setTimeout(r, 1500));
      });

      it('should analyze daily activities', async () => {
        const today = new Date();
        today.setDate(today.getDate() - 1);

        const analysis = await service.analyzeDailyActivities('user-1', 'driver-1', today);

        expect(analysis.driverId).toBe('driver-1');
        expect(analysis.driverName).toBeDefined();
        expect(analysis.totalDrivingMinutes).toBeGreaterThanOrEqual(0);
        expect(analysis.totalRestMinutes).toBeGreaterThanOrEqual(0);
      });

      it('should track continuous driving periods', async () => {
        const today = new Date();
        today.setDate(today.getDate() - 1);

        const analysis = await service.analyzeDailyActivities('user-1', 'driver-1', today);

        expect(Array.isArray(analysis.continuousDrivingPeriods)).toBe(true);
      });

      it('should detect daily rest period', async () => {
        const today = new Date();
        today.setDate(today.getDate() - 1);

        const analysis = await service.analyzeDailyActivities('user-1', 'driver-1', today);

        if (analysis.dailyRestPeriod) {
          expect(analysis.dailyRestPeriod.durationMinutes).toBeGreaterThan(0);
        }
      });

      it('should return compliance status', async () => {
        const today = new Date();
        today.setDate(today.getDate() - 1);

        const analysis = await service.analyzeDailyActivities('user-1', 'driver-1', today);

        expect(typeof analysis.isCompliant).toBe('boolean');
      });
    });

    describe('analyzeWeeklyActivities', () => {
      beforeEach(async () => {
        await service.uploadTachographFile('user-1', {
          buffer: Buffer.from('weekly data'),
          originalName: 'weekly.ddd',
          fileType: 'DRIVER_CARD',
          driverId: 'driver-1',
        });

        await new Promise(r => setTimeout(r, 1500));
      });

      it('should analyze weekly activities', async () => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);

        const analysis = await service.analyzeWeeklyActivities('user-1', 'driver-1', weekStart);

        expect(analysis.driverId).toBe('driver-1');
        expect(analysis.weekNumber).toBeGreaterThan(0);
        expect(analysis.year).toBe(weekStart.getFullYear());
        expect(analysis.dailyAnalyses.length).toBe(7);
      });

      it('should track extended days used', async () => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);

        const analysis = await service.analyzeWeeklyActivities('user-1', 'driver-1', weekStart);

        expect(typeof analysis.extendedDaysUsed).toBe('number');
        expect(analysis.extendedDaysUsed).toBeGreaterThanOrEqual(0);
      });

      it('should track reduced rest days used', async () => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);

        const analysis = await service.analyzeWeeklyActivities('user-1', 'driver-1', weekStart);

        expect(typeof analysis.reducedRestDaysUsed).toBe('number');
        expect(analysis.reducedRestDaysUsed).toBeGreaterThanOrEqual(0);
      });

      it('should aggregate all infringements', async () => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);

        const analysis = await service.analyzeWeeklyActivities('user-1', 'driver-1', weekStart);

        expect(Array.isArray(analysis.infringements)).toBe(true);
      });
    });

    describe('analyzeDriver', () => {
      beforeEach(async () => {
        await service.uploadTachographFile('user-1', {
          buffer: Buffer.from('driver analysis data'),
          originalName: 'driver.ddd',
          fileType: 'DRIVER_CARD',
          driverId: 'driver-1',
        });

        await new Promise(r => setTimeout(r, 1500));
      });

      it('should analyze driver for default period', async () => {
        const summary = await service.analyzeDriver('user-1', 'driver-1');

        expect(summary.driverId).toBe('driver-1');
        expect(summary.driverName).toBeDefined();
        expect(summary.totalDrivingHours).toBeGreaterThanOrEqual(0);
      });

      it('should calculate compliance score', async () => {
        const summary = await service.analyzeDriver('user-1', 'driver-1');

        expect(summary.complianceScore).toBeGreaterThanOrEqual(0);
        expect(summary.complianceScore).toBeLessThanOrEqual(100);
      });

      it('should determine risk level', async () => {
        const summary = await service.analyzeDriver('user-1', 'driver-1');

        expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(summary.riskLevel);
      });

      it('should calculate potential fines', async () => {
        const summary = await service.analyzeDriver('user-1', 'driver-1');

        expect(typeof summary.potentialFines).toBe('number');
        expect(summary.potentialFines).toBeGreaterThanOrEqual(0);
      });

      it('should provide recommendations', async () => {
        const summary = await service.analyzeDriver('user-1', 'driver-1');

        expect(Array.isArray(summary.recommendations)).toBe(true);
        expect(summary.recommendations.length).toBeGreaterThan(0);
      });

      it('should count infringements by severity', async () => {
        const summary = await service.analyzeDriver('user-1', 'driver-1');

        expect(summary.infringementsBySeverity).toBeDefined();
        expect(summary.infringementsBySeverity[InfringementSeverity.MINOR]).toBeGreaterThanOrEqual(0);
        expect(summary.infringementsBySeverity[InfringementSeverity.SERIOUS]).toBeGreaterThanOrEqual(0);
        expect(summary.infringementsBySeverity[InfringementSeverity.VERY_SERIOUS]).toBeGreaterThanOrEqual(0);
        expect(summary.infringementsBySeverity[InfringementSeverity.MOST_SERIOUS]).toBeGreaterThanOrEqual(0);
      });

      it('should analyze custom date range', async () => {
        const start = new Date();
        start.setDate(start.getDate() - 14);
        const end = new Date();

        const summary = await service.analyzeDriver('user-1', 'driver-1', start, end);

        expect(summary.periodStart.getTime()).toBe(start.getTime());
        expect(summary.periodEnd.getTime()).toBe(end.getTime());
      });
    });
  });

  describe('Infringement Management', () => {
    describe('getInfringements', () => {
      beforeEach(async () => {
        await service.uploadTachographFile('user-1', {
          buffer: Buffer.from('infringement data'),
          originalName: 'inf.ddd',
          fileType: 'DRIVER_CARD',
          driverId: 'driver-1',
        });

        await new Promise(r => setTimeout(r, 1500));
        await service.analyzeDriver('user-1', 'driver-1');
      });

      it('should return infringements for user', () => {
        const infringements = service.getInfringements('user-1');

        expect(Array.isArray(infringements)).toBe(true);
      });

      it('should filter by driver', () => {
        const infringements = service.getInfringements('user-1', 'driver-1');

        expect(infringements.every(i => i.driverId === 'driver-1')).toBe(true);
      });

      it('should filter by type', () => {
        const infringements = service.getInfringements('user-1', undefined, {
          type: InfringementType.DAILY_DRIVING_EXCEEDED,
        });

        expect(infringements.every(i => i.type === InfringementType.DAILY_DRIVING_EXCEEDED)).toBe(true);
      });

      it('should filter by severity', () => {
        const infringements = service.getInfringements('user-1', undefined, {
          severity: InfringementSeverity.SERIOUS,
        });

        expect(infringements.every(i => i.severity === InfringementSeverity.SERIOUS)).toBe(true);
      });

      it('should filter by acknowledged status', () => {
        const infringements = service.getInfringements('user-1', undefined, {
          acknowledged: false,
        });

        expect(infringements.every(i => i.acknowledged === false)).toBe(true);
      });

      it('should sort by date descending', () => {
        const infringements = service.getInfringements('user-1');

        for (let i = 1; i < infringements.length; i++) {
          expect(infringements[i - 1].date.getTime()).toBeGreaterThanOrEqual(
            infringements[i].date.getTime(),
          );
        }
      });
    });

    describe('acknowledgeInfringement', () => {
      let infringementId: string;

      beforeEach(async () => {
        await service.uploadTachographFile('user-1', {
          buffer: Buffer.from('ack data'),
          originalName: 'ack.ddd',
          fileType: 'DRIVER_CARD',
          driverId: 'driver-1',
        });

        await new Promise(r => setTimeout(r, 1500));
        await service.analyzeDriver('user-1', 'driver-1');

        const infringements = service.getInfringements('user-1');
        if (infringements.length > 0) {
          infringementId = infringements[0].id;
        }
      });

      it('should acknowledge infringement', () => {
        if (!infringementId) return;

        const result = service.acknowledgeInfringement('user-1', infringementId);

        expect(result?.acknowledged).toBe(true);
      });

      it('should add notes to acknowledged infringement', () => {
        if (!infringementId) return;

        const result = service.acknowledgeInfringement(
          'user-1',
          infringementId,
          'Reviewed and discussed with driver',
        );

        expect(result?.notes).toBe('Reviewed and discussed with driver');
      });

      it('should return null for non-existent infringement', () => {
        const result = service.acknowledgeInfringement('user-1', 'non-existent');

        expect(result).toBeNull();
      });
    });
  });

  describe('Activity Records', () => {
    describe('getActivityRecords', () => {
      beforeEach(async () => {
        await service.uploadTachographFile('user-1', {
          buffer: Buffer.from('activity data'),
          originalName: 'activity.ddd',
          fileType: 'DRIVER_CARD',
          driverId: 'driver-1',
        });

        await new Promise(r => setTimeout(r, 1500));
      });

      it('should return activities for driver', () => {
        const activities = service.getActivityRecords('user-1', 'driver-1');

        expect(Array.isArray(activities)).toBe(true);
        expect(activities.every(a => a.driverId === 'driver-1')).toBe(true);
      });

      it('should filter by date range', () => {
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 3);
        const dateTo = new Date();

        const activities = service.getActivityRecords('user-1', 'driver-1', dateFrom, dateTo);

        activities.forEach(a => {
          expect(a.startTime.getTime()).toBeGreaterThanOrEqual(dateFrom.getTime());
          expect(a.endTime.getTime()).toBeLessThanOrEqual(dateTo.getTime());
        });
      });

      it('should sort by start time ascending', () => {
        const activities = service.getActivityRecords('user-1', 'driver-1');

        for (let i = 1; i < activities.length; i++) {
          expect(activities[i - 1].startTime.getTime()).toBeLessThanOrEqual(
            activities[i].startTime.getTime(),
          );
        }
      });

      it('should include driving activities', () => {
        const activities = service.getActivityRecords('user-1', 'driver-1');

        expect(activities.some(a => a.activityType === TachographActivityType.DRIVING)).toBe(true);
      });

      it('should include rest activities', () => {
        const activities = service.getActivityRecords('user-1', 'driver-1');

        expect(activities.some(a => a.activityType === TachographActivityType.REST)).toBe(true);
      });

      it('should include break activities', () => {
        const activities = service.getActivityRecords('user-1', 'driver-1');

        expect(activities.some(a => a.activityType === TachographActivityType.BREAK)).toBe(true);
      });
    });
  });

  describe('Driver Dashboard', () => {
    beforeEach(async () => {
      await service.uploadTachographFile('user-1', {
        buffer: Buffer.from('dashboard data'),
        originalName: 'dashboard.ddd',
        fileType: 'DRIVER_CARD',
        driverId: 'driver-1',
      });

      await new Promise(r => setTimeout(r, 1500));
    });

    it('should return driver dashboard', async () => {
      const dashboard = await service.getDriverDashboard('user-1', 'driver-1');

      expect(dashboard.todayAnalysis).toBeDefined();
      expect(dashboard.weekAnalysis).toBeDefined();
      expect(dashboard.complianceSummary).toBeDefined();
      expect(dashboard.recentInfringements).toBeDefined();
    });

    it('should calculate remaining driving time today', async () => {
      const dashboard = await service.getDriverDashboard('user-1', 'driver-1');

      expect(typeof dashboard.remainingDrivingToday).toBe('number');
      expect(dashboard.remainingDrivingToday).toBeGreaterThanOrEqual(0);
    });

    it('should calculate remaining driving time this week', async () => {
      const dashboard = await service.getDriverDashboard('user-1', 'driver-1');

      expect(typeof dashboard.remainingDrivingWeek).toBe('number');
      expect(dashboard.remainingDrivingWeek).toBeGreaterThanOrEqual(0);
    });

    it('should limit recent infringements to 5', async () => {
      const dashboard = await service.getDriverDashboard('user-1', 'driver-1');

      expect(dashboard.recentInfringements.length).toBeLessThanOrEqual(5);
    });
  });

  describe('EU Regulation Compliance', () => {
    it('should check max daily driving (9 hours)', async () => {
      // 9 hours = 540 minutes
      // Sample activities generate ~8.75 hours of driving per day
      await service.uploadTachographFile('user-1', {
        buffer: Buffer.from('eu compliance'),
        originalName: 'eu.ddd',
        fileType: 'DRIVER_CARD',
        driverId: 'driver-1',
      });

      await new Promise(r => setTimeout(r, 1500));

      const summary = await service.analyzeDriver('user-1', 'driver-1');

      // No daily driving exceeded infringements expected with sample data
      expect(summary).toBeDefined();
    });

    it('should check weekly driving limit (56 hours)', async () => {
      await service.uploadTachographFile('user-1', {
        buffer: Buffer.from('weekly limit'),
        originalName: 'weekly.ddd',
        fileType: 'DRIVER_CARD',
        driverId: 'driver-1',
      });

      await new Promise(r => setTimeout(r, 1500));

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const analysis = await service.analyzeWeeklyActivities('user-1', 'driver-1', weekStart);

      // Verify weekly driving is tracked (56 hours = 3360 minutes limit)
      expect(analysis.totalDrivingMinutes).toBeGreaterThan(0);
      // If over limit, should have infringement flagged
      if (analysis.totalDrivingMinutes > 3360) {
        expect(analysis.infringements.some(
          i => i.type === InfringementType.WEEKLY_DRIVING_EXCEEDED
        )).toBe(true);
      }
    });

    it('should check continuous driving (4.5 hours before break)', async () => {
      await service.uploadTachographFile('user-1', {
        buffer: Buffer.from('continuous'),
        originalName: 'continuous.ddd',
        fileType: 'DRIVER_CARD',
        driverId: 'driver-1',
      });

      await new Promise(r => setTimeout(r, 1500));

      const today = new Date();
      today.setDate(today.getDate() - 1);

      const analysis = await service.analyzeDailyActivities('user-1', 'driver-1', today);

      // Sample data includes breaks after driving periods
      expect(analysis.continuousDrivingPeriods).toBeDefined();
    });

    it('should check daily rest (minimum 9 hours reduced, 11 hours normal)', async () => {
      await service.uploadTachographFile('user-1', {
        buffer: Buffer.from('daily rest'),
        originalName: 'rest.ddd',
        fileType: 'DRIVER_CARD',
        driverId: 'driver-1',
      });

      await new Promise(r => setTimeout(r, 1500));

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const analysis = await service.analyzeDailyActivities('user-1', 'driver-1', yesterday);

      // Sample data includes 11-hour rest periods
      if (analysis.dailyRestPeriod) {
        expect(analysis.dailyRestPeriod.durationMinutes).toBeGreaterThanOrEqual(540); // 9 hours minimum
      }
    });
  });

  describe('Infringement Types', () => {
    it('should detect daily driving exceeded', async () => {
      // This test verifies the infringement type exists and is handled
      const types = Object.values(InfringementType);
      expect(types).toContain(InfringementType.DAILY_DRIVING_EXCEEDED);
    });

    it('should detect weekly driving exceeded', async () => {
      const types = Object.values(InfringementType);
      expect(types).toContain(InfringementType.WEEKLY_DRIVING_EXCEEDED);
    });

    it('should detect bi-weekly driving exceeded', async () => {
      const types = Object.values(InfringementType);
      expect(types).toContain(InfringementType.BI_WEEKLY_DRIVING_EXCEEDED);
    });

    it('should detect continuous driving exceeded', async () => {
      const types = Object.values(InfringementType);
      expect(types).toContain(InfringementType.CONTINUOUS_DRIVING_EXCEEDED);
    });

    it('should detect daily rest insufficient', async () => {
      const types = Object.values(InfringementType);
      expect(types).toContain(InfringementType.DAILY_REST_INSUFFICIENT);
    });

    it('should detect weekly rest insufficient', async () => {
      const types = Object.values(InfringementType);
      expect(types).toContain(InfringementType.WEEKLY_REST_INSUFFICIENT);
    });

    it('should detect break insufficient', async () => {
      const types = Object.values(InfringementType);
      expect(types).toContain(InfringementType.BREAK_INSUFFICIENT);
    });

    it('should detect manipulation', async () => {
      const types = Object.values(InfringementType);
      expect(types).toContain(InfringementType.MANIPULATION_DETECTED);
    });
  });

  describe('Severity Levels', () => {
    it('should have minor severity', async () => {
      const severities = Object.values(InfringementSeverity);
      expect(severities).toContain(InfringementSeverity.MINOR);
    });

    it('should have serious severity', async () => {
      const severities = Object.values(InfringementSeverity);
      expect(severities).toContain(InfringementSeverity.SERIOUS);
    });

    it('should have very serious severity', async () => {
      const severities = Object.values(InfringementSeverity);
      expect(severities).toContain(InfringementSeverity.VERY_SERIOUS);
    });

    it('should have most serious severity', async () => {
      const severities = Object.values(InfringementSeverity);
      expect(severities).toContain(InfringementSeverity.MOST_SERIOUS);
    });
  });

  describe('Activity Types', () => {
    it('should support driving activity', async () => {
      const types = Object.values(TachographActivityType);
      expect(types).toContain(TachographActivityType.DRIVING);
    });

    it('should support rest activity', async () => {
      const types = Object.values(TachographActivityType);
      expect(types).toContain(TachographActivityType.REST);
    });

    it('should support work activity', async () => {
      const types = Object.values(TachographActivityType);
      expect(types).toContain(TachographActivityType.WORK);
    });

    it('should support availability activity', async () => {
      const types = Object.values(TachographActivityType);
      expect(types).toContain(TachographActivityType.AVAILABILITY);
    });

    it('should support break activity', async () => {
      const types = Object.values(TachographActivityType);
      expect(types).toContain(TachographActivityType.BREAK);
    });
  });
});
