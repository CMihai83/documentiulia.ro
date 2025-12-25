import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  HSEPredictiveService,
  IncidentCategory,
  ShiftType,
  DayOfWeek,
} from './hse-predictive.service';

describe('HSEPredictiveService', () => {
  let service: HSEPredictiveService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HSEPredictiveService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => null),
          },
        },
      ],
    }).compile();

    service = module.get<HSEPredictiveService>(HSEPredictiveService);
    service.resetState();
  });

  describe('Historical Data Management', () => {
    it('should add historical incident', async () => {
      const incident = await service.addHistoricalIncident({
        date: new Date('2025-06-15'),
        time: '09:30',
        category: 'SLIP_TRIP_FALL',
        severity: 2,
        location: 'Warehouse A',
        department: 'Logistics',
        shift: 'DAY',
      });

      expect(incident.id).toBeDefined();
      expect(incident.category).toBe('SLIP_TRIP_FALL');
      expect(incident.dayOfWeek).toBe('SUNDAY'); // June 15, 2025 is Sunday
      expect(incident.month).toBe(6);
    });

    it('should filter historical incidents', async () => {
      await service.addHistoricalIncident({
        date: new Date('2025-01-15'),
        time: '10:00',
        category: 'SLIP_TRIP_FALL',
        severity: 2,
        location: 'Area A',
        department: 'Production',
        shift: 'DAY',
      });

      await service.addHistoricalIncident({
        date: new Date('2025-02-15'),
        time: '14:00',
        category: 'STRUCK_BY',
        severity: 3,
        location: 'Area B',
        department: 'Maintenance',
        shift: 'EVENING',
      });

      const slipIncidents = await service.getHistoricalIncidents({ category: 'SLIP_TRIP_FALL' });
      expect(slipIncidents.length).toBe(1);

      const maintenanceIncidents = await service.getHistoricalIncidents({ department: 'Maintenance' });
      expect(maintenanceIncidents.length).toBe(1);
    });

    it('should bulk import incidents', async () => {
      const incidents = [
        { date: new Date('2025-01-10'), time: '08:00', category: 'ERGONOMIC' as IncidentCategory, severity: 1 as const, location: 'Office', department: 'Admin', shift: 'DAY' as ShiftType },
        { date: new Date('2025-01-11'), time: '09:00', category: 'ERGONOMIC' as IncidentCategory, severity: 1 as const, location: 'Office', department: 'Admin', shift: 'DAY' as ShiftType },
        { date: new Date('2025-01-12'), time: '10:00', category: 'SLIP_TRIP_FALL' as IncidentCategory, severity: 2 as const, location: 'Hall', department: 'Admin', shift: 'DAY' as ShiftType },
      ];

      const count = await service.bulkImportIncidents(incidents);
      expect(count).toBe(3);

      const all = await service.getHistoricalIncidents();
      expect(all.length).toBe(3);
    });
  });

  describe('Leading Indicators', () => {
    it('should initialize with default indicators', async () => {
      const indicators = await service.getLeadingIndicators();
      expect(indicators.length).toBeGreaterThan(0);
      expect(indicators.some(i => i.name === 'Near Miss Reporting Rate')).toBe(true);
    });

    it('should update leading indicator value', async () => {
      const indicators = await service.getLeadingIndicators();
      const indicator = indicators[0];

      const updated = await service.updateLeadingIndicator(indicator.id, indicator.targetValue * 1.1);
      expect(updated.currentValue).toBe(indicator.targetValue * 1.1);
      expect(updated.lastUpdated).toBeDefined();
    });

    it('should determine indicator status', async () => {
      const indicators = await service.getLeadingIndicators();
      const indicator = indicators.find(i => i.name === 'Training Compliance')!;

      // Set to healthy value
      await service.updateLeadingIndicator(indicator.id, 100);
      const healthyStatus = await service.getIndicatorStatus(indicator.id);
      expect(healthyStatus.status).toBe('HEALTHY');

      // Set to warning value (between warningThreshold 90 and target 100)
      await service.updateLeadingIndicator(indicator.id, 92);
      const warningStatus = await service.getIndicatorStatus(indicator.id);
      expect(warningStatus.status).toBe('WARNING');

      // Set to critical value (below warningThreshold 90)
      await service.updateLeadingIndicator(indicator.id, 85);
      const criticalStatus = await service.getIndicatorStatus(indicator.id);
      expect(criticalStatus.status).toBe('CRITICAL');
    });

    it('should create custom indicator', async () => {
      const indicator = await service.createCustomIndicator({
        name: 'Custom Safety Metric',
        category: 'BEHAVIOR',
        description: 'Custom metric for testing',
        measurementUnit: '%',
        targetValue: 90,
        warningThreshold: 80,
        criticalThreshold: 70,
        correlationToIncidents: -0.5,
      });

      expect(indicator.id).toBeDefined();
      expect(indicator.name).toBe('Custom Safety Metric');
      expect(indicator.trend).toBe('STABLE');
    });

    it('should detect improving trend', async () => {
      const indicators = await service.getLeadingIndicators();
      const indicator = indicators[0];

      // First update
      await service.updateLeadingIndicator(indicator.id, 50);
      // Second update with significant improvement
      const updated = await service.updateLeadingIndicator(indicator.id, 60);

      // For negative correlation (higher is better), increasing value = improving
      if (indicator.correlationToIncidents < 0) {
        expect(updated.trend).toBe('IMPROVING');
      }
    });
  });

  describe('Temporal Pattern Analysis', () => {
    beforeEach(async () => {
      // Add incidents across different times
      for (let i = 0; i < 10; i++) {
        await service.addHistoricalIncident({
          date: new Date(`2025-01-${10 + i}`),
          time: i < 5 ? '09:00' : '14:00',
          category: 'SLIP_TRIP_FALL',
          severity: 2,
          location: 'Area A',
          department: 'Production',
          shift: i < 7 ? 'DAY' : 'NIGHT',
        });
      }
    });

    it('should analyze hourly distribution', async () => {
      const analysis = await service.analyzeTemporalPatterns();

      expect(analysis.hourlyDistribution).toBeDefined();
      expect(analysis.hourlyDistribution.length).toBe(24);

      const hour9 = analysis.hourlyDistribution.find(h => h.hour === 9);
      expect(hour9!.count).toBe(5);
    });

    it('should analyze shift distribution', async () => {
      const analysis = await service.analyzeTemporalPatterns();

      expect(analysis.shiftDistribution).toBeDefined();
      const dayShift = analysis.shiftDistribution.find(s => s.shift === 'DAY');
      expect(dayShift!.count).toBe(7);
    });

    it('should identify peak risk periods', async () => {
      const analysis = await service.analyzeTemporalPatterns();

      expect(analysis.peakRiskPeriods).toBeDefined();
      // Should identify hours and days with high incidents
    });

    it('should analyze seasonal distribution', async () => {
      const analysis = await service.analyzeTemporalPatterns();

      expect(analysis.seasonalDistribution).toBeDefined();
      expect(analysis.seasonalDistribution.length).toBe(4);
      // January is winter
      const winter = analysis.seasonalDistribution.find(s => s.season === 'WINTER');
      expect(winter!.count).toBeGreaterThan(0);
    });
  });

  describe('Spatial Pattern Analysis', () => {
    beforeEach(async () => {
      // Add incidents across different locations
      const locations = ['Warehouse A', 'Warehouse A', 'Warehouse A', 'Office', 'Workshop'];
      const departments = ['Logistics', 'Logistics', 'Logistics', 'Admin', 'Production'];

      for (let i = 0; i < 5; i++) {
        await service.addHistoricalIncident({
          date: new Date(`2025-02-${10 + i}`),
          time: '10:00',
          category: 'SLIP_TRIP_FALL',
          severity: 2,
          location: locations[i],
          department: departments[i],
          shift: 'DAY',
        });
      }
    });

    it('should identify location hotspots', async () => {
      const analysis = await service.analyzeSpatialPatterns();

      expect(analysis.locationHotspots).toBeDefined();
      expect(analysis.locationHotspots.length).toBeGreaterThan(0);

      const topHotspot = analysis.locationHotspots[0];
      expect(topHotspot.location).toBe('Warehouse A');
      expect(topHotspot.incidentCount).toBe(3);
    });

    it('should calculate department risk', async () => {
      const analysis = await service.analyzeSpatialPatterns();

      expect(analysis.departmentRisk).toBeDefined();
      const logistics = analysis.departmentRisk.find(d => d.department === 'Logistics');
      expect(logistics!.incidentRate).toBe(3);
    });

    it('should generate heat map data', async () => {
      const analysis = await service.analyzeSpatialPatterns();

      expect(analysis.heatMapData).toBeDefined();
      expect(analysis.heatMapData.length).toBeGreaterThan(0);
      expect(analysis.heatMapData[0]).toHaveProperty('x');
      expect(analysis.heatMapData[0]).toHaveProperty('y');
      expect(analysis.heatMapData[0]).toHaveProperty('intensity');
    });
  });

  describe('Pattern Detection', () => {
    beforeEach(async () => {
      // Add incidents with patterns
      for (let i = 0; i < 10; i++) {
        await service.addHistoricalIncident({
          date: new Date(`2025-03-${10 + i}`),
          time: '10:00',
          category: i < 7 ? 'SLIP_TRIP_FALL' : 'ERGONOMIC',
          severity: 2,
          location: 'Area A',
          department: 'Production',
          shift: 'NIGHT',
          workerExperience: i < 5 ? 3 : 24, // 5 incidents with low experience
        });
      }
    });

    it('should detect categorical patterns', async () => {
      const patterns = await service.detectPatterns();

      const categoryPattern = patterns.find(p => p.patternType === 'CATEGORICAL');
      expect(categoryPattern).toBeDefined();
      expect(categoryPattern!.description).toContain('SLIP_TRIP_FALL');
    });

    it('should detect shift-based patterns', async () => {
      const patterns = await service.detectPatterns();

      const shiftPattern = patterns.find(p => p.patternType === 'TEMPORAL');
      expect(shiftPattern).toBeDefined();
      expect(shiftPattern!.description).toContain('NIGHT');
    });

    it('should detect experience-based patterns', async () => {
      const patterns = await service.detectPatterns();

      const expPattern = patterns.find(p => p.patternType === 'BEHAVIORAL');
      expect(expPattern).toBeDefined();
      expect(expPattern!.description).toContain('experience');
    });

    it('should include recommendations in patterns', async () => {
      const patterns = await service.detectPatterns();

      patterns.forEach(pattern => {
        expect(pattern.recommendations).toBeDefined();
        expect(pattern.recommendations.length).toBeGreaterThan(0);
      });
    });

    it('should calculate pattern confidence', async () => {
      const patterns = await service.detectPatterns();

      patterns.forEach(pattern => {
        expect(pattern.confidence).toBeGreaterThan(0);
        expect(pattern.confidence).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Forecasting', () => {
    beforeEach(async () => {
      // Add historical data for forecasting
      for (let i = 0; i < 30; i++) {
        const date = new Date('2025-01-01');
        date.setDate(date.getDate() + i);

        await service.addHistoricalIncident({
          date,
          time: '10:00',
          category: 'SLIP_TRIP_FALL',
          severity: 2,
          location: 'Area A',
          department: 'Production',
          shift: 'DAY',
        });
      }
    });

    it('should generate forecast for specified days', async () => {
      const forecast = await service.generateForecast(7);

      expect(forecast.id).toBeDefined();
      expect(forecast.predictions.length).toBe(7);
      expect(forecast.methodology).toBe('TIME_SERIES');
    });

    it('should include confidence intervals', async () => {
      const forecast = await service.generateForecast(7);

      forecast.predictions.forEach(prediction => {
        expect(prediction.confidenceInterval).toBeDefined();
        expect(prediction.confidenceInterval.lower).toBeLessThanOrEqual(prediction.predictedIncidents);
        expect(prediction.confidenceInterval.upper).toBeGreaterThanOrEqual(prediction.predictedIncidents);
      });
    });

    it('should include accuracy metrics', async () => {
      const forecast = await service.generateForecast(30);

      expect(forecast.accuracy).toBeDefined();
      expect(forecast.accuracy.mape).toBeDefined();
      expect(forecast.accuracy.rmse).toBeDefined();
      expect(forecast.accuracy.r2).toBeDefined();
    });

    it('should assign risk levels to predictions', async () => {
      const forecast = await service.generateForecast(14);

      forecast.predictions.forEach(prediction => {
        expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(prediction.riskLevel);
      });
    });

    it('should identify primary risk factors', async () => {
      const forecast = await service.generateForecast(7);

      forecast.predictions.forEach(prediction => {
        expect(prediction.primaryRiskFactors).toBeDefined();
        expect(prediction.primaryRiskFactors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Risk Scoring', () => {
    beforeEach(async () => {
      // Add recent incidents
      for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i * 10);

        await service.addHistoricalIncident({
          date,
          time: '10:00',
          category: i < 3 ? 'SLIP_TRIP_FALL' : 'ERGONOMIC',
          severity: 2,
          location: 'Area A',
          department: 'Production',
          shift: 'DAY',
          workerExperience: i < 2 ? 3 : 24,
        });
      }
    });

    it('should calculate overall risk score', async () => {
      const riskScore = await service.calculateRiskScore();

      expect(riskScore.overall).toBeDefined();
      expect(riskScore.overall).toBeGreaterThanOrEqual(0);
      expect(riskScore.overall).toBeLessThanOrEqual(100);
    });

    it('should break down risk by component', async () => {
      const riskScore = await service.calculateRiskScore();

      expect(riskScore.components).toBeDefined();
      expect(riskScore.components.historicalIncidents).toBeDefined();
      expect(riskScore.components.leadingIndicators).toBeDefined();
      expect(riskScore.components.humanFactors).toBeDefined();
    });

    it('should break down risk by category', async () => {
      const riskScore = await service.calculateRiskScore();

      expect(riskScore.breakdown).toBeDefined();
      const slipRisk = riskScore.breakdown.find(b => b.category === 'SLIP_TRIP_FALL');
      expect(slipRisk).toBeDefined();
    });

    it('should filter by department', async () => {
      const riskScore = await service.calculateRiskScore('Production');
      expect(riskScore).toBeDefined();
    });

    it('should generate recommendations', async () => {
      const riskScore = await service.calculateRiskScore();

      expect(riskScore.recommendations).toBeDefined();
      expect(riskScore.recommendations.length).toBeGreaterThan(0);

      riskScore.recommendations.forEach(rec => {
        expect(rec.priority).toBeDefined();
        expect(rec.description).toBeDefined();
        expect(rec.targetRiskReduction).toBeDefined();
      });
    });
  });

  describe('Proactive Interventions', () => {
    it('should create intervention', async () => {
      const intervention = await service.createIntervention({
        triggeredBy: 'pattern-123',
        type: 'TRAINING',
        description: 'Safety awareness training',
        targetArea: 'Warehouse',
        targetDepartment: 'Logistics',
        scheduledDate: new Date('2025-04-01'),
        assignedTo: 'Safety Manager',
      });

      expect(intervention.id).toBeDefined();
      expect(intervention.status).toBe('PENDING');
      expect(intervention.type).toBe('TRAINING');
    });

    it('should filter interventions', async () => {
      await service.createIntervention({
        triggeredBy: 'p1',
        type: 'TRAINING',
        description: 'Training 1',
        targetArea: 'A',
        targetDepartment: 'Dept1',
        scheduledDate: new Date(),
        assignedTo: 'Manager',
      });

      await service.createIntervention({
        triggeredBy: 'p2',
        type: 'INSPECTION',
        description: 'Inspection 1',
        targetArea: 'B',
        targetDepartment: 'Dept2',
        scheduledDate: new Date(),
        assignedTo: 'Manager',
      });

      const trainings = await service.getInterventions({ type: 'TRAINING' });
      expect(trainings.length).toBe(1);
    });

    it('should update intervention status', async () => {
      const intervention = await service.createIntervention({
        triggeredBy: 'p1',
        type: 'INSPECTION',
        description: 'Monthly inspection',
        targetArea: 'All',
        targetDepartment: 'All',
        scheduledDate: new Date(),
        assignedTo: 'Inspector',
      });

      const updated = await service.updateInterventionStatus(intervention.id, 'IN_PROGRESS');
      expect(updated.status).toBe('IN_PROGRESS');

      const completed = await service.updateInterventionStatus(intervention.id, 'COMPLETED');
      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();
    });

    it('should rate intervention effectiveness', async () => {
      const intervention = await service.createIntervention({
        triggeredBy: 'p1',
        type: 'ENGINEERING_CONTROL',
        description: 'Install guardrails',
        targetArea: 'Platform',
        targetDepartment: 'Production',
        scheduledDate: new Date(),
        assignedTo: 'Engineer',
      });

      await service.updateInterventionStatus(intervention.id, 'COMPLETED');

      const rated = await service.rateInterventionEffectiveness(intervention.id, {
        incidentReduction: 30,
        rating: 4,
        notes: 'Very effective at preventing falls',
      });

      expect(rated.effectiveness).toBeDefined();
      expect(rated.effectiveness!.incidentReduction).toBe(30);
      expect(rated.effectiveness!.rating).toBe(4);
    });

    it('should auto-generate interventions from patterns', async () => {
      // Add incidents to create patterns
      for (let i = 0; i < 10; i++) {
        await service.addHistoricalIncident({
          date: new Date(`2025-05-${10 + i}`),
          time: '10:00',
          category: 'SLIP_TRIP_FALL',
          severity: 2,
          location: 'Area A',
          department: 'Production',
          shift: 'NIGHT',
        });
      }

      const interventions = await service.autoGenerateInterventions();
      expect(interventions.length).toBeGreaterThan(0);

      interventions.forEach(int => {
        expect(int.triggeredBy).toBeDefined();
        expect(int.description).toBeDefined();
      });
    });
  });

  describe('PPE Tracking', () => {
    it('should record PPE status', async () => {
      const status = await service.recordPPEStatus({
        employeeId: 'emp-001',
        employeeName: 'John Worker',
        department: 'Production',
        items: [
          { type: 'Hard Hat', issuedDate: new Date('2025-01-01'), condition: 'GOOD' },
          { type: 'Safety Glasses', issuedDate: new Date('2025-01-01'), expiryDate: new Date('2026-01-01'), condition: 'GOOD' },
          { type: 'Safety Boots', issuedDate: new Date('2024-01-01'), expiryDate: new Date('2025-01-01'), condition: 'FAIR' },
        ],
      });

      expect(status.id).toBeDefined();
      expect(status.employeeId).toBe('emp-001');
      expect(status.items.length).toBe(3);
    });

    it('should detect expired PPE', async () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);

      await service.recordPPEStatus({
        employeeId: 'emp-002',
        employeeName: 'Jane Worker',
        department: 'Maintenance',
        items: [
          { type: 'Gloves', issuedDate: new Date('2024-01-01'), expiryDate: pastDate, condition: 'FAIR' },
        ],
      });

      const status = await service.getPPEStatus('emp-002');
      expect(status!.items[0].isExpired).toBe(true);
      expect(status!.alerts).toContain('Gloves is expired');
    });

    it('should detect expiring soon PPE', async () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 15);

      await service.recordPPEStatus({
        employeeId: 'emp-003',
        employeeName: 'Bob Worker',
        department: 'Logistics',
        items: [
          { type: 'Respirator', issuedDate: new Date('2024-01-01'), expiryDate: soonDate, condition: 'GOOD' },
        ],
      });

      const status = await service.getPPEStatus('emp-003');
      expect(status!.items[0].daysUntilExpiry).toBeLessThanOrEqual(30);
      expect(status!.alerts.some(a => a.includes('expires in'))).toBe(true);
    });

    it('should detect poor condition PPE', async () => {
      await service.recordPPEStatus({
        employeeId: 'emp-004',
        employeeName: 'Alice Worker',
        department: 'Warehouse',
        items: [
          { type: 'Harness', issuedDate: new Date('2024-01-01'), condition: 'POOR' },
        ],
      });

      const status = await service.getPPEStatus('emp-004');
      expect(status!.alerts).toContain('Harness needs replacement');
    });

    it('should calculate compliance score', async () => {
      await service.recordPPEStatus({
        employeeId: 'emp-005',
        employeeName: 'Test Worker',
        department: 'Test',
        items: [
          { type: 'Item 1', issuedDate: new Date(), condition: 'GOOD' },
          { type: 'Item 2', issuedDate: new Date(), condition: 'GOOD' },
          { type: 'Item 3', issuedDate: new Date(), condition: 'REPLACE' },
          { type: 'Item 4', issuedDate: new Date(), condition: 'GOOD' },
        ],
      });

      const status = await service.getPPEStatus('emp-005');
      expect(status!.complianceScore).toBe(75); // 3 out of 4 compliant
    });

    it('should aggregate PPE alerts', async () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 15);

      await service.recordPPEStatus({
        employeeId: 'emp-a',
        employeeName: 'Worker A',
        department: 'Dept',
        items: [{ type: 'Item', issuedDate: new Date(), expiryDate: pastDate, condition: 'GOOD' }],
      });

      await service.recordPPEStatus({
        employeeId: 'emp-b',
        employeeName: 'Worker B',
        department: 'Dept',
        items: [{ type: 'Item', issuedDate: new Date(), expiryDate: soonDate, condition: 'GOOD' }],
      });

      await service.recordPPEStatus({
        employeeId: 'emp-c',
        employeeName: 'Worker C',
        department: 'Dept',
        items: [{ type: 'Item', issuedDate: new Date(), condition: 'POOR' }],
      });

      const alerts = await service.getPPEAlerts();
      expect(alerts.expired.length).toBe(1);
      expect(alerts.expiringSoon.length).toBe(1);
      expect(alerts.poorCondition.length).toBe(1);
    });
  });

  describe('Predictive Dashboard', () => {
    beforeEach(async () => {
      // Add some data for dashboard
      for (let i = 0; i < 10; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i * 5);

        await service.addHistoricalIncident({
          date,
          time: '10:00',
          category: 'SLIP_TRIP_FALL',
          severity: 2,
          location: 'Area A',
          department: 'Production',
          shift: 'DAY',
        });
      }
    });

    it('should generate predictive dashboard', async () => {
      const dashboard = await service.generatePredictiveDashboard();

      expect(dashboard.generatedAt).toBeDefined();
      expect(dashboard.overallRiskScore).toBeDefined();
      expect(dashboard.riskTrend).toBeDefined();
    });

    it('should include forecasts', async () => {
      const dashboard = await service.generatePredictiveDashboard();

      expect(dashboard.forecast).toBeDefined();
      expect(dashboard.forecast.next7Days).toBeDefined();
      expect(dashboard.forecast.next30Days).toBeDefined();
      expect(dashboard.forecast.next90Days).toBeDefined();
    });

    it('should summarize leading indicators', async () => {
      const dashboard = await service.generatePredictiveDashboard();

      expect(dashboard.leadingIndicators).toBeDefined();
      expect(dashboard.leadingIndicators.healthy).toBeDefined();
      expect(dashboard.leadingIndicators.warning).toBeDefined();
      expect(dashboard.leadingIndicators.critical).toBeDefined();
    });

    it('should identify top risks', async () => {
      const dashboard = await service.generatePredictiveDashboard();

      expect(dashboard.topRisks).toBeDefined();
      expect(dashboard.topRisks.length).toBeLessThanOrEqual(5);

      dashboard.topRisks.forEach(risk => {
        expect(risk.risk).toBeDefined();
        expect(risk.score).toBeDefined();
        expect(risk.trend).toBeDefined();
      });
    });

    it('should include detected patterns', async () => {
      const dashboard = await service.generatePredictiveDashboard();

      expect(dashboard.patterns).toBeDefined();
    });

    it('should include recommendations', async () => {
      const dashboard = await service.generatePredictiveDashboard();

      expect(dashboard.recommendations).toBeDefined();
    });

    it('should include PPE alerts summary', async () => {
      const dashboard = await service.generatePredictiveDashboard();

      expect(dashboard.ppeAlerts).toBeDefined();
      expect(dashboard.ppeAlerts.expired).toBeDefined();
      expect(dashboard.ppeAlerts.expiringSoon).toBeDefined();
      expect(dashboard.ppeAlerts.poorCondition).toBeDefined();
    });
  });
});
