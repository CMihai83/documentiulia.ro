import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  CarbonTrackingService,
  Vehicle,
  Trip,
  VehicleType,
  FuelType,
  EuroStandard,
} from './carbon-tracking.service';

describe('CarbonTrackingService', () => {
  let service: CarbonTrackingService;

  const createTestVehicle = (overrides?: Partial<Vehicle>): Vehicle => ({
    id: `veh_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    name: 'Test Van',
    type: 'VAN',
    fuelType: 'DIESEL',
    euroStandard: 'EURO_6',
    yearOfManufacture: 2022,
    loadCapacityKg: 1500,
    emissionFactorKgCO2PerKm: 0.21,
    fuelConsumptionL100km: 8,
    isElectric: false,
    ...overrides,
  });

  const createTestTrip = (vehicleId: string, overrides?: Partial<Trip>): Trip => ({
    id: `trip_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    vehicleId,
    date: new Date(),
    startLocation: 'București',
    endLocation: 'Constanța',
    distanceKm: 225,
    loadWeightKg: 1000,
    loadUtilization: 0.67,
    drivingMode: 'NORMAL',
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarbonTrackingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => null),
          },
        },
      ],
    }).compile();

    service = module.get<CarbonTrackingService>(CarbonTrackingService);
    service.resetState();
  });

  describe('Vehicle Management', () => {
    it('should register a vehicle', () => {
      const vehicle = createTestVehicle();
      const registered = service.registerVehicle(vehicle);

      expect(registered.id).toBe(vehicle.id);
      expect(registered.type).toBe('VAN');
    });

    it('should calculate emission factor for diesel vehicle', () => {
      const vehicle = createTestVehicle({
        fuelType: 'DIESEL',
        fuelConsumptionL100km: 10,
        euroStandard: 'EURO_6',
        emissionFactorKgCO2PerKm: undefined as any,
      });
      const registered = service.registerVehicle(vehicle);

      expect(registered.emissionFactorKgCO2PerKm).toBeGreaterThan(0);
      expect(registered.emissionFactorKgCO2PerKm).toBeLessThan(0.5);
    });

    it('should calculate lower emission factor for electric vehicles', () => {
      const electricVehicle = createTestVehicle({
        type: 'ELECTRIC_VAN',
        fuelType: 'ELECTRIC',
        isElectric: true,
        emissionFactorKgCO2PerKm: undefined as any,
      });
      const registered = service.registerVehicle(electricVehicle);

      expect(registered.emissionFactorKgCO2PerKm).toBeLessThan(0.1);
    });

    it('should list vehicles by type', () => {
      service.registerVehicle(createTestVehicle({ type: 'VAN' }));
      service.registerVehicle(createTestVehicle({ type: 'VAN' }));
      service.registerVehicle(createTestVehicle({ type: 'TRUCK_MEDIUM' }));

      const vans = service.listVehicles({ type: 'VAN' });
      expect(vans).toHaveLength(2);
    });

    it('should filter electric vehicles', () => {
      service.registerVehicle(createTestVehicle({ isElectric: false }));
      service.registerVehicle(createTestVehicle({ isElectric: true, type: 'ELECTRIC_VAN' }));

      const electric = service.listVehicles({ isElectric: true });
      expect(electric).toHaveLength(1);
    });
  });

  describe('Trip & Emission Tracking', () => {
    it('should record a trip and calculate emissions', () => {
      const vehicle = createTestVehicle();
      service.registerVehicle(vehicle);

      const trip = createTestTrip(vehicle.id, { distanceKm: 100 });
      const emission = service.recordTrip(trip);

      expect(emission.co2Kg).toBeGreaterThan(0);
      expect(emission.scope).toBe('SCOPE_1');
      expect(emission.category).toBe('FLEET_DIRECT');
    });

    it('should apply penalty for low load utilization', () => {
      const vehicle = createTestVehicle();
      service.registerVehicle(vehicle);

      const highUtilTrip = createTestTrip(vehicle.id, { loadUtilization: 0.8, distanceKm: 100 });
      const lowUtilTrip = createTestTrip(vehicle.id, { loadUtilization: 0.3, distanceKm: 100 });

      const highUtilEmission = service.recordTrip(highUtilTrip);
      const lowUtilEmission = service.recordTrip(lowUtilTrip);

      expect(lowUtilEmission.co2Kg).toBeGreaterThan(highUtilEmission.co2Kg);
    });

    it('should apply eco driving mode discount', () => {
      const vehicle = createTestVehicle();
      service.registerVehicle(vehicle);

      const normalTrip = createTestTrip(vehicle.id, { drivingMode: 'NORMAL', distanceKm: 100 });
      const ecoTrip = createTestTrip(vehicle.id, { drivingMode: 'ECO', distanceKm: 100 });

      const normalEmission = service.recordTrip(normalTrip);
      const ecoEmission = service.recordTrip(ecoTrip);

      expect(ecoEmission.co2Kg).toBeLessThan(normalEmission.co2Kg);
    });

    it('should add emissions for idle time', () => {
      const vehicle = createTestVehicle();
      service.registerVehicle(vehicle);

      const tripNoIdle = createTestTrip(vehicle.id, { idleTimeMinutes: 0 });
      const tripWithIdle = createTestTrip(vehicle.id, { idleTimeMinutes: 30 });

      const emissionNoIdle = service.recordTrip(tripNoIdle);
      const emissionWithIdle = service.recordTrip(tripWithIdle);

      expect(emissionWithIdle.co2Kg).toBeGreaterThan(emissionNoIdle.co2Kg);
    });

    it('should throw error for unknown vehicle', () => {
      const trip = createTestTrip('unknown-vehicle');

      expect(() => service.recordTrip(trip)).toThrow('Vehicle unknown-vehicle not found');
    });

    it('should filter emissions by date range', () => {
      const vehicle = createTestVehicle();
      service.registerVehicle(vehicle);

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      service.recordTrip(createTestTrip(vehicle.id, { date: new Date() }));
      service.recordTrip(createTestTrip(vehicle.id, { date: lastMonth }));

      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);

      const recent = service.getEmissions({ startDate: thisMonthStart });
      expect(recent).toHaveLength(1);
    });
  });

  describe('Carbon Footprint', () => {
    it('should calculate total carbon footprint', () => {
      const vehicle = createTestVehicle();
      service.registerVehicle(vehicle);

      for (let i = 0; i < 5; i++) {
        service.recordTrip(createTestTrip(vehicle.id, { distanceKm: 100 }));
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const footprint = service.calculateCarbonFootprint(startDate, endDate);

      expect(footprint.totalCO2Kg).toBeGreaterThan(0);
      expect(footprint.byScope.scope1).toBeGreaterThan(0);
    });

    it('should calculate intensity metrics', () => {
      const vehicle = createTestVehicle();
      service.registerVehicle(vehicle);

      service.recordTrip(createTestTrip(vehicle.id, { distanceKm: 200 }));

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);

      const footprint = service.calculateCarbonFootprint(startDate, new Date());

      expect(footprint.intensityMetrics.co2PerKm).toBeGreaterThan(0);
      expect(footprint.intensityMetrics.co2PerDelivery).toBeGreaterThan(0);
    });

    it('should calculate trend vs previous period', () => {
      const vehicle = createTestVehicle();
      service.registerVehicle(vehicle);

      // Current period
      service.recordTrip(createTestTrip(vehicle.id, { distanceKm: 100 }));

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const footprint = service.calculateCarbonFootprint(startDate, new Date());

      expect(footprint.trend).toBeDefined();
      expect(['UP', 'DOWN', 'STABLE']).toContain(footprint.trend.direction);
    });

    it('should aggregate by vehicle', () => {
      const vehicle1 = createTestVehicle({ name: 'Van 1' });
      const vehicle2 = createTestVehicle({ name: 'Van 2' });
      service.registerVehicle(vehicle1);
      service.registerVehicle(vehicle2);

      service.recordTrip(createTestTrip(vehicle1.id));
      service.recordTrip(createTestTrip(vehicle2.id));

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);

      const footprint = service.calculateCarbonFootprint(startDate, new Date());

      expect(footprint.byVehicle).toHaveLength(2);
    });
  });

  describe('EU ETS Compliance', () => {
    it('should calculate ETS compliance for a year', () => {
      const vehicle = createTestVehicle();
      service.registerVehicle(vehicle);

      // Record emissions for current year
      for (let i = 0; i < 10; i++) {
        service.recordTrip(createTestTrip(vehicle.id, { distanceKm: 500 }));
      }

      const compliance = service.calculateETSCompliance(new Date().getFullYear());

      expect(compliance.reportingYear).toBe(new Date().getFullYear());
      expect(compliance.verifiedEmissions).toBeGreaterThanOrEqual(0);
      expect(compliance.allowancePrice).toBe(80);
      expect(['COMPLIANT', 'NON_COMPLIANT', 'PENDING']).toContain(compliance.complianceStatus);
    });

    it('should include applicable regulations', () => {
      const compliance = service.calculateETSCompliance(2024);

      expect(compliance.applicableRegulations).toContain('EU ETS Directive 2003/87/EC');
      expect(compliance.applicableRegulations).toContain('Fit for 55 Package');
    });

    it('should set reporting deadline', () => {
      const compliance = service.calculateETSCompliance(2024);

      expect(compliance.reportingDeadline).toBeInstanceOf(Date);
      expect(compliance.reportingDeadline.getFullYear()).toBe(2025);
      expect(compliance.reportingDeadline.getMonth()).toBe(2); // March
    });
  });

  describe('CBAM (Carbon Border Adjustment)', () => {
    it('should create a CBAM declaration', () => {
      const declaration = service.createCBAMDeclaration({
        reportingPeriod: 'Q1 2024',
        importerInfo: {
          name: 'Test Importer SRL',
          eoriNumber: 'RO12345678000',
          country: 'Romania',
        },
        goods: [
          {
            hsCode: '72071100',
            description: 'Iron bars',
            originCountry: 'CN',
            quantity: 1000,
            unit: 'KG',
            embeddedEmissionsKgCO2: 1850,
            carbonPricePaid: 0,
          },
        ],
      });

      expect(declaration.id).toBeDefined();
      expect(declaration.status).toBe('DRAFT');
      expect(declaration.totalEmbeddedEmissions).toBe(1850);
      expect(declaration.goods[0].cbamCertificatesRequired).toBeGreaterThan(0);
    });

    it('should calculate CBAM certificates based on carbon price paid', () => {
      const declaration = service.createCBAMDeclaration({
        reportingPeriod: 'Q2 2024',
        importerInfo: { name: 'Importer', eoriNumber: 'RO123', country: 'Romania' },
        goods: [
          {
            hsCode: '76011000', // Aluminium
            description: 'Aluminium ingots',
            originCountry: 'RU',
            quantity: 100,
            unit: 'KG',
            embeddedEmissionsKgCO2: 850,
            carbonPricePaid: 40, // Already paid some carbon price
          },
        ],
      });

      // Should be less than if no carbon price was paid
      expect(declaration.goods[0].cbamCertificatesRequired).toBeLessThan(0.85);
    });

    it('should reject non-covered goods', () => {
      expect(() => {
        service.createCBAMDeclaration({
          reportingPeriod: 'Q1 2024',
          importerInfo: { name: 'Importer', eoriNumber: 'RO123', country: 'Romania' },
          goods: [
            {
              hsCode: '61091000', // T-shirts - not covered
              description: 'T-shirts',
              originCountry: 'BD',
              quantity: 1000,
              unit: 'PIECE',
              embeddedEmissionsKgCO2: 100,
              carbonPricePaid: 0,
            },
          ],
        });
      }).toThrow('is not covered by CBAM');
    });

    it('should submit CBAM declaration', () => {
      const declaration = service.createCBAMDeclaration({
        reportingPeriod: 'Q1 2024',
        importerInfo: { name: 'Importer', eoriNumber: 'RO123', country: 'Romania' },
        goods: [
          { hsCode: '72071100', description: 'Iron', originCountry: 'CN', quantity: 100, unit: 'KG', embeddedEmissionsKgCO2: 185, carbonPricePaid: 0 },
        ],
      });

      const submitted = service.submitCBAMDeclaration(declaration.id);

      expect(submitted!.status).toBe('SUBMITTED');
      expect(submitted!.submittedAt).toBeInstanceOf(Date);
    });

    it('should list CBAM covered goods', () => {
      const coveredGoods = service.getCBAMCoveredGoods();

      expect(coveredGoods.length).toBeGreaterThan(0);
      expect(coveredGoods.some(g => g.hsChapter === '72')).toBe(true); // Iron/steel
      expect(coveredGoods.some(g => g.hsChapter === '76')).toBe(true); // Aluminium
    });
  });

  describe('Sustainability Reporting', () => {
    it('should generate GRI sustainability report', () => {
      const vehicle = createTestVehicle();
      service.registerVehicle(vehicle);
      service.recordTrip(createTestTrip(vehicle.id));

      const report = service.generateSustainabilityReport(2024, 'GRI');

      expect(report.reportingYear).toBe(2024);
      expect(report.reportType).toBe('GRI');
      expect(report.environmentalMetrics.totalEmissionsTCO2e).toBeGreaterThanOrEqual(0);
      expect(report.organizationInfo.sector).toBe('Logistics & Transportation');
    });

    it('should include ESG ratings', () => {
      const report = service.generateSustainabilityReport(2024);

      expect(report.ratings.length).toBeGreaterThan(0);
      expect(report.ratings[0].agency).toBeDefined();
      expect(report.ratings[0].environmentalScore).toBeGreaterThan(0);
    });

    it('should calculate fleet electrification percentage', () => {
      service.registerVehicle(createTestVehicle({ isElectric: false }));
      service.registerVehicle(createTestVehicle({ isElectric: false }));
      service.registerVehicle(createTestVehicle({ isElectric: true, type: 'ELECTRIC_VAN' }));

      const report = service.generateSustainabilityReport(2024);

      expect(report.environmentalMetrics.fleetElectrificationPercent).toBeCloseTo(33.33, 0);
    });
  });

  describe('Sustainability Targets', () => {
    it('should create a sustainability target', () => {
      const target = service.createTarget({
        name: '50% Emission Reduction by 2030',
        description: 'Reduce fleet emissions by 50%',
        targetYear: 2030,
        baselineYear: 2020,
        baselineValue: 1000,
        targetValue: 500,
        currentValue: 800,
        category: 'EMISSIONS',
      });

      expect(target.id).toBeDefined();
      expect(target.progressPercent).toBeGreaterThan(0);
      expect(['ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'ACHIEVED']).toContain(target.status);
    });

    it('should update target progress', () => {
      const target = service.createTarget({
        name: 'Fleet Electrification',
        description: '100% electric fleet',
        targetYear: 2030,
        baselineYear: 2024,
        baselineValue: 0,
        targetValue: 100,
        currentValue: 20,
        category: 'FLEET',
      });

      const updated = service.updateTargetProgress(target.id, 50);

      expect(updated!.currentValue).toBe(50);
      expect(updated!.progressPercent).toBe(50);
    });

    it('should mark target as achieved', () => {
      const target = service.createTarget({
        name: 'Zero Waste',
        description: 'Zero waste to landfill',
        targetYear: 2025,
        baselineYear: 2020,
        baselineValue: 100,
        targetValue: 0,
        currentValue: 0,
        category: 'WASTE',
      });

      expect(target.status).toBe('ACHIEVED');
      expect(target.progressPercent).toBe(100);
    });
  });

  describe('Green Initiatives', () => {
    it('should create a green initiative', () => {
      const initiative = service.createInitiative({
        name: 'Fleet Electrification Phase 1',
        description: 'Replace 10 diesel vans with electric',
        startDate: new Date(),
        status: 'IN_PROGRESS',
        investmentEUR: 500000,
        annualSavingsCO2Kg: 50000,
        annualSavingsEUR: 30000,
        paybackYears: 5,
        category: 'FLEET_ELECTRIFICATION',
      });

      expect(initiative.id).toBeDefined();
      expect(initiative.category).toBe('FLEET_ELECTRIFICATION');
    });

    it('should calculate initiative ROI', () => {
      const initiative = service.createInitiative({
        name: 'Route Optimization Software',
        description: 'AI-powered route optimization',
        startDate: new Date(),
        status: 'COMPLETED',
        investmentEUR: 50000,
        annualSavingsCO2Kg: 10000,
        annualSavingsEUR: 15000,
        paybackYears: 3.3,
        category: 'ROUTE_OPTIMIZATION',
      });

      const roi = service.calculateInitiativeROI(initiative.id);

      expect(roi).toBeDefined();
      expect(roi!.npv10Years).toBeGreaterThan(0);
      expect(roi!.carbonPriceEquivalent).toBeGreaterThan(0);
    });

    it('should filter initiatives by status', () => {
      service.createInitiative({
        name: 'Initiative 1', description: '', startDate: new Date(), status: 'IN_PROGRESS',
        investmentEUR: 100000, annualSavingsCO2Kg: 5000, annualSavingsEUR: 10000, paybackYears: 5, category: 'OTHER',
      });
      service.createInitiative({
        name: 'Initiative 2', description: '', startDate: new Date(), status: 'COMPLETED',
        investmentEUR: 50000, annualSavingsCO2Kg: 3000, annualSavingsEUR: 8000, paybackYears: 4, category: 'OTHER',
      });

      const inProgress = service.getInitiatives({ status: 'IN_PROGRESS' });
      expect(inProgress).toHaveLength(1);
    });
  });

  describe('Green Route Optimization', () => {
    it('should optimize route for emissions', () => {
      const vehicle = createTestVehicle();
      service.registerVehicle(vehicle);

      const optimized = service.optimizeRouteForEmissions(vehicle.id, 300, 1000);

      expect(optimized.savingsCO2Kg).toBeGreaterThan(0);
      expect(optimized.savingsPercent).toBeGreaterThan(0);
      expect(optimized.alternativeOptions.length).toBeGreaterThan(0);
    });

    it('should suggest feasible alternatives', () => {
      const vehicle = createTestVehicle();
      service.registerVehicle(vehicle);

      const optimized = service.optimizeRouteForEmissions(vehicle.id, 500, 10000);

      const railOption = optimized.alternativeOptions.find(a => a.type === 'RAIL');
      expect(railOption).toBeDefined();
      expect(railOption!.feasible).toBe(true);

      const cargoBikeOption = optimized.alternativeOptions.find(a => a.type === 'CARGO_BIKE');
      expect(cargoBikeOption).toBeDefined();
      expect(cargoBikeOption!.feasible).toBe(false);
    });

    it('should calculate alternative CO2 emissions', () => {
      const vehicle = createTestVehicle();
      service.registerVehicle(vehicle);

      const optimized = service.optimizeRouteForEmissions(vehicle.id, 200, 500);

      const electricOption = optimized.alternativeOptions.find(a => a.type === 'ELECTRIC_VEHICLE');
      expect(electricOption!.co2Kg).toBeLessThan(optimized.originalCO2Kg);
    });
  });

  describe('Emissions Dashboard', () => {
    it('should return dashboard data', () => {
      const vehicle = createTestVehicle();
      service.registerVehicle(vehicle);

      for (let i = 0; i < 5; i++) {
        service.recordTrip(createTestTrip(vehicle.id));
      }

      const dashboard = service.getEmissionsDashboard();

      expect(dashboard.currentMonthEmissions).toBeGreaterThanOrEqual(0);
      expect(dashboard.emissionsByScope).toHaveLength(3);
      expect(dashboard.monthlyTrend).toHaveLength(12);
    });

    it('should identify top emitters', () => {
      const vehicle1 = createTestVehicle({ name: 'Heavy Truck' });
      const vehicle2 = createTestVehicle({ name: 'Light Van' });
      service.registerVehicle(vehicle1);
      service.registerVehicle(vehicle2);

      // Record more trips for vehicle1
      for (let i = 0; i < 10; i++) {
        service.recordTrip(createTestTrip(vehicle1.id, { distanceKm: 500 }));
      }
      service.recordTrip(createTestTrip(vehicle2.id, { distanceKm: 100 }));

      const dashboard = service.getEmissionsDashboard();

      expect(dashboard.topEmitters.length).toBeGreaterThan(0);
      expect(dashboard.topEmitters[0].vehicleId).toBe(vehicle1.id);
    });
  });

  describe('Reference Data', () => {
    it('should return emission factors', () => {
      const factors = service.getEmissionFactors();

      expect(factors.fuel.DIESEL).toBeGreaterThan(0);
      expect(factors.grid.RO).toBeGreaterThan(0);
      expect(factors.vehicle.VAN).toBeGreaterThan(0);
    });

    it('should return ETS price', () => {
      const price = service.getETSPrice();

      expect(price).toBe(80);
    });
  });
});
