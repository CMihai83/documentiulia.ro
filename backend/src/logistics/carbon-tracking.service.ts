import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Carbon Tracking & ESG Service
// EU ETS compliance, CBAM support, GRI/SASB reporting, green logistics

// =================== INTERFACES ===================

export interface Vehicle {
  id: string;
  name: string;
  type: VehicleType;
  fuelType: FuelType;
  euroStandard: EuroStandard;
  yearOfManufacture: number;
  loadCapacityKg: number;
  emissionFactorKgCO2PerKm: number;
  fuelConsumptionL100km: number;
  isElectric: boolean;
  averageSpeedKmh?: number;
}

export type VehicleType = 'VAN' | 'TRUCK_SMALL' | 'TRUCK_MEDIUM' | 'TRUCK_LARGE' | 'TRUCK_ARTICULATED' | 'CARGO_BIKE' | 'ELECTRIC_VAN';

export type FuelType = 'DIESEL' | 'PETROL' | 'LPG' | 'CNG' | 'ELECTRIC' | 'HYBRID' | 'HYDROGEN' | 'BIODIESEL';

export type EuroStandard = 'EURO_3' | 'EURO_4' | 'EURO_5' | 'EURO_6' | 'EURO_6D' | 'ZERO_EMISSION';

export interface Trip {
  id: string;
  vehicleId: string;
  date: Date;
  startLocation: string;
  endLocation: string;
  distanceKm: number;
  loadWeightKg: number;
  loadUtilization: number; // 0-1
  fuelConsumedL?: number;
  idleTimeMinutes?: number;
  drivingMode?: 'ECO' | 'NORMAL' | 'AGGRESSIVE';
}

export interface EmissionRecord {
  id: string;
  tripId?: string;
  vehicleId: string;
  date: Date;
  scope: EmissionScope;
  category: EmissionCategory;
  co2Kg: number;
  co2eKg: number; // CO2 equivalent (includes other GHGs)
  ch4Kg?: number;
  n2oKg?: number;
  distanceKm?: number;
  fuelConsumedL?: number;
  calculationMethod: string;
  verified: boolean;
}

export type EmissionScope = 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3';

export type EmissionCategory =
  | 'FLEET_DIRECT'           // Scope 1: Company vehicles
  | 'ELECTRICITY'            // Scope 2: Purchased electricity
  | 'UPSTREAM_TRANSPORT'     // Scope 3: Supplier transport
  | 'DOWNSTREAM_TRANSPORT'   // Scope 3: Customer delivery
  | 'BUSINESS_TRAVEL'        // Scope 3: Employee travel
  | 'WASTE'                  // Scope 3: Waste disposal
  | 'PURCHASED_GOODS';       // Scope 3: Embodied carbon

export interface CarbonFootprint {
  periodStart: Date;
  periodEnd: Date;
  totalCO2Kg: number;
  totalCO2eKg: number;
  byScope: {
    scope1: number;
    scope2: number;
    scope3: number;
  };
  byCategory: { [category: string]: number };
  byVehicle: { vehicleId: string; co2Kg: number }[];
  intensityMetrics: {
    co2PerKm: number;
    co2PerTonKm: number;
    co2PerDelivery: number;
  };
  trend: {
    previousPeriodCO2Kg: number;
    changePercent: number;
    direction: 'UP' | 'DOWN' | 'STABLE';
  };
}

export interface ETSCompliance {
  reportingYear: number;
  applicableRegulations: string[];
  verifiedEmissions: number;
  allocatedAllowances: number;
  surrenderedAllowances: number;
  remainingAllowances: number;
  allowancePrice: number;
  totalCost: number;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING';
  reportingDeadline: Date;
  verificationStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'VERIFIED';
}

export interface CBAMDeclaration {
  id: string;
  reportingPeriod: string; // Q1 2024, etc.
  importerInfo: {
    name: string;
    eoriNumber: string;
    country: string;
  };
  goods: CBAMGood[];
  totalEmbeddedEmissions: number;
  totalCarbonPrice: number;
  status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED';
  submittedAt?: Date;
}

export interface CBAMGood {
  hsCode: string;
  description: string;
  originCountry: string;
  quantity: number;
  unit: string;
  embeddedEmissionsKgCO2: number;
  carbonPricePaid: number; // In origin country
  cbamCertificatesRequired: number;
}

export interface SustainabilityReport {
  reportingYear: number;
  reportType: 'GRI' | 'SASB' | 'CDP' | 'TCFD' | 'CUSTOM';
  organizationInfo: {
    name: string;
    sector: string;
    employees: number;
    revenue: number;
  };
  environmentalMetrics: EnvironmentalMetrics;
  targets: SustainabilityTarget[];
  initiatives: GreenInitiative[];
  ratings: ESGRating[];
}

export interface EnvironmentalMetrics {
  totalEmissionsTCO2e: number;
  scope1EmissionsTCO2e: number;
  scope2EmissionsTCO2e: number;
  scope3EmissionsTCO2e: number;
  emissionsIntensity: number;
  renewableEnergyPercent: number;
  fleetElectrificationPercent: number;
  wasteRecycledPercent: number;
  waterUsageM3: number;
  biodiversityImpactScore: number;
}

export interface SustainabilityTarget {
  id: string;
  name: string;
  description: string;
  targetYear: number;
  baselineYear: number;
  baselineValue: number;
  targetValue: number;
  currentValue: number;
  progressPercent: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK' | 'ACHIEVED';
  category: 'EMISSIONS' | 'ENERGY' | 'FLEET' | 'WASTE' | 'WATER';
}

export interface GreenInitiative {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  investmentEUR: number;
  annualSavingsCO2Kg: number;
  annualSavingsEUR: number;
  paybackYears: number;
  category: 'FLEET_ELECTRIFICATION' | 'ROUTE_OPTIMIZATION' | 'RENEWABLE_ENERGY' | 'BUILDING_EFFICIENCY' | 'PACKAGING' | 'OTHER';
}

export interface ESGRating {
  agency: string;
  rating: string;
  score: number;
  maxScore: number;
  date: Date;
  environmentalScore: number;
  socialScore: number;
  governanceScore: number;
}

export interface GreenRoute {
  routeId: string;
  originalDistanceKm: number;
  optimizedDistanceKm: number;
  originalCO2Kg: number;
  optimizedCO2Kg: number;
  savingsKm: number;
  savingsCO2Kg: number;
  savingsPercent: number;
  optimizationType: 'DISTANCE' | 'ECO' | 'LOAD_CONSOLIDATION' | 'MODAL_SHIFT';
  alternativeOptions: AlternativeRoute[];
}

export interface AlternativeRoute {
  type: 'RAIL' | 'INTERMODAL' | 'ELECTRIC_VEHICLE' | 'CARGO_BIKE' | 'CONSOLIDATION';
  distanceKm: number;
  co2Kg: number;
  costEUR: number;
  timeHours: number;
  feasible: boolean;
  reason?: string;
}

// =================== SERVICE ===================

@Injectable()
export class CarbonTrackingService {
  private readonly logger = new Logger(CarbonTrackingService.name);

  // In-memory storage
  private vehicles = new Map<string, Vehicle>();
  private trips = new Map<string, Trip>();
  private emissions = new Map<string, EmissionRecord>();
  private cbamDeclarations = new Map<string, CBAMDeclaration>();
  private targets = new Map<string, SustainabilityTarget>();
  private initiatives = new Map<string, GreenInitiative>();

  // Emission factors (kg CO2 per liter of fuel)
  private readonly fuelEmissionFactors: { [key in FuelType]: number } = {
    'DIESEL': 2.68,
    'PETROL': 2.31,
    'LPG': 1.51,
    'CNG': 2.75, // per kg
    'ELECTRIC': 0,
    'HYBRID': 1.8,
    'HYDROGEN': 0,
    'BIODIESEL': 0.5, // Assuming B100
  };

  // Grid emission factors by country (kg CO2 per kWh)
  private readonly gridEmissionFactors: { [countryCode: string]: number } = {
    'RO': 0.298, // Romania - significant hydro/nuclear
    'DE': 0.366, // Germany
    'FR': 0.052, // France - mostly nuclear
    'PL': 0.765, // Poland - coal heavy
    'IT': 0.327, // Italy
    'ES': 0.210, // Spain
    'AT': 0.091, // Austria - hydro
    'HU': 0.261, // Hungary
    'BG': 0.450, // Bulgaria
    'EU': 0.295, // EU average
  };

  // Vehicle emission factors by type (kg CO2 per km) - defaults
  private readonly defaultVehicleEmissions: { [key in VehicleType]: number } = {
    'CARGO_BIKE': 0,
    'ELECTRIC_VAN': 0.05, // From grid electricity
    'VAN': 0.21,
    'TRUCK_SMALL': 0.35,
    'TRUCK_MEDIUM': 0.55,
    'TRUCK_LARGE': 0.85,
    'TRUCK_ARTICULATED': 1.1,
  };

  // Euro standard adjustment factors
  private readonly euroStandardFactors: { [key in EuroStandard]: number } = {
    'EURO_3': 1.3,
    'EURO_4': 1.15,
    'EURO_5': 1.05,
    'EURO_6': 1.0,
    'EURO_6D': 0.95,
    'ZERO_EMISSION': 0,
  };

  // CBAM covered goods (HS codes)
  private readonly cbamCoveredGoods = [
    { hsChapter: '72', description: 'Iron and steel', defaultEmissionFactor: 1.85 },
    { hsChapter: '73', description: 'Articles of iron or steel', defaultEmissionFactor: 2.1 },
    { hsChapter: '76', description: 'Aluminium', defaultEmissionFactor: 8.5 },
    { hsChapter: '25', description: 'Cement', defaultEmissionFactor: 0.9 },
    { hsChapter: '28', description: 'Fertilizers', defaultEmissionFactor: 2.5 },
    { hsChapter: '27', description: 'Electricity', defaultEmissionFactor: 0.5 },
    { hsChapter: '29', description: 'Hydrogen', defaultEmissionFactor: 9.3 },
  ];

  // Current EU ETS carbon price (EUR per tCO2)
  private readonly etsPrice = 80;

  constructor(private readonly configService: ConfigService) {}

  // =================== VEHICLE MANAGEMENT ===================

  registerVehicle(vehicle: Vehicle): Vehicle {
    // Calculate emission factor if not provided
    if (!vehicle.emissionFactorKgCO2PerKm) {
      vehicle.emissionFactorKgCO2PerKm = this.calculateVehicleEmissionFactor(vehicle);
    }
    this.vehicles.set(vehicle.id, vehicle);
    this.logger.log(`Registered vehicle ${vehicle.id}: ${vehicle.name} (${vehicle.type})`);
    return vehicle;
  }

  getVehicle(vehicleId: string): Vehicle | undefined {
    return this.vehicles.get(vehicleId);
  }

  listVehicles(filters?: { type?: VehicleType; fuelType?: FuelType; isElectric?: boolean }): Vehicle[] {
    let vehicles = Array.from(this.vehicles.values());

    if (filters?.type) {
      vehicles = vehicles.filter(v => v.type === filters.type);
    }
    if (filters?.fuelType) {
      vehicles = vehicles.filter(v => v.fuelType === filters.fuelType);
    }
    if (filters?.isElectric !== undefined) {
      vehicles = vehicles.filter(v => v.isElectric === filters.isElectric);
    }

    return vehicles;
  }

  private calculateVehicleEmissionFactor(vehicle: Vehicle): number {
    if (vehicle.isElectric || vehicle.fuelType === 'ELECTRIC') {
      // Electric vehicle: emissions from grid
      const gridFactor = this.gridEmissionFactors['RO'];
      const energyConsumptionKwhPerKm = 0.2; // Typical for electric van
      return gridFactor * energyConsumptionKwhPerKm;
    }

    // Calculate from fuel consumption
    const fuelFactor = this.fuelEmissionFactors[vehicle.fuelType];
    const baseEmission = (vehicle.fuelConsumptionL100km / 100) * fuelFactor;

    // Adjust for Euro standard
    const euroFactor = this.euroStandardFactors[vehicle.euroStandard];

    return Math.round(baseEmission * euroFactor * 1000) / 1000;
  }

  // =================== TRIP & EMISSION TRACKING ===================

  recordTrip(trip: Trip): EmissionRecord {
    this.trips.set(trip.id, trip);

    const vehicle = this.vehicles.get(trip.vehicleId);
    if (!vehicle) {
      throw new Error(`Vehicle ${trip.vehicleId} not found`);
    }

    // Calculate emissions
    let co2Kg = trip.distanceKm * vehicle.emissionFactorKgCO2PerKm;

    // Adjust for load utilization (empty runs emit more per ton-km)
    if (trip.loadUtilization < 0.5) {
      co2Kg *= 1.1; // 10% penalty for low utilization
    }

    // Adjust for driving mode
    if (trip.drivingMode === 'AGGRESSIVE') {
      co2Kg *= 1.2;
    } else if (trip.drivingMode === 'ECO') {
      co2Kg *= 0.9;
    }

    // Add idle time emissions
    if (trip.idleTimeMinutes) {
      const idleEmissionPerMinute = 0.05; // kg CO2
      co2Kg += trip.idleTimeMinutes * idleEmissionPerMinute;
    }

    const emission: EmissionRecord = {
      id: `em_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      tripId: trip.id,
      vehicleId: trip.vehicleId,
      date: trip.date,
      scope: 'SCOPE_1',
      category: 'FLEET_DIRECT',
      co2Kg: Math.round(co2Kg * 100) / 100,
      co2eKg: Math.round(co2Kg * 1.02 * 100) / 100, // Include N2O, CH4
      distanceKm: trip.distanceKm,
      fuelConsumedL: trip.fuelConsumedL,
      calculationMethod: 'DISTANCE_BASED',
      verified: false,
    };

    this.emissions.set(emission.id, emission);
    this.logger.log(`Recorded trip ${trip.id}: ${trip.distanceKm}km, ${emission.co2Kg}kg CO2`);

    return emission;
  }

  recordEmission(emission: Omit<EmissionRecord, 'id'>): EmissionRecord {
    const record: EmissionRecord = {
      id: `em_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      ...emission,
    };
    this.emissions.set(record.id, record);
    return record;
  }

  getEmissions(filters?: {
    vehicleId?: string;
    scope?: EmissionScope;
    category?: EmissionCategory;
    startDate?: Date;
    endDate?: Date;
  }): EmissionRecord[] {
    let records = Array.from(this.emissions.values());

    if (filters?.vehicleId) {
      records = records.filter(e => e.vehicleId === filters.vehicleId);
    }
    if (filters?.scope) {
      records = records.filter(e => e.scope === filters.scope);
    }
    if (filters?.category) {
      records = records.filter(e => e.category === filters.category);
    }
    if (filters?.startDate) {
      records = records.filter(e => e.date >= filters.startDate!);
    }
    if (filters?.endDate) {
      records = records.filter(e => e.date <= filters.endDate!);
    }

    return records.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // =================== CARBON FOOTPRINT ===================

  calculateCarbonFootprint(startDate: Date, endDate: Date): CarbonFootprint {
    const emissions = this.getEmissions({ startDate, endDate });

    let totalCO2 = 0;
    let totalCO2e = 0;
    const byScope = { scope1: 0, scope2: 0, scope3: 0 };
    const byCategory: { [key: string]: number } = {};
    const byVehicle = new Map<string, number>();
    let totalDistance = 0;
    let totalDeliveries = 0;
    let totalTonKm = 0;

    emissions.forEach(e => {
      totalCO2 += e.co2Kg;
      totalCO2e += e.co2eKg;

      if (e.scope === 'SCOPE_1') byScope.scope1 += e.co2Kg;
      else if (e.scope === 'SCOPE_2') byScope.scope2 += e.co2Kg;
      else byScope.scope3 += e.co2Kg;

      byCategory[e.category] = (byCategory[e.category] || 0) + e.co2Kg;

      if (e.vehicleId) {
        byVehicle.set(e.vehicleId, (byVehicle.get(e.vehicleId) || 0) + e.co2Kg);
      }

      if (e.distanceKm) {
        totalDistance += e.distanceKm;
        totalDeliveries++;
        const trip = e.tripId ? this.trips.get(e.tripId) : undefined;
        if (trip) {
          totalTonKm += (trip.loadWeightKg / 1000) * e.distanceKm;
        }
      }
    });

    // Calculate previous period for trend
    const periodDuration = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodDuration);
    const prevEnd = new Date(startDate.getTime() - 1);
    const prevEmissions = this.getEmissions({ startDate: prevStart, endDate: prevEnd });
    const prevCO2 = prevEmissions.reduce((sum, e) => sum + e.co2Kg, 0);

    const changePercent = prevCO2 > 0 ? ((totalCO2 - prevCO2) / prevCO2) * 100 : 0;
    let direction: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
    if (changePercent > 5) direction = 'UP';
    else if (changePercent < -5) direction = 'DOWN';

    return {
      periodStart: startDate,
      periodEnd: endDate,
      totalCO2Kg: Math.round(totalCO2 * 100) / 100,
      totalCO2eKg: Math.round(totalCO2e * 100) / 100,
      byScope: {
        scope1: Math.round(byScope.scope1 * 100) / 100,
        scope2: Math.round(byScope.scope2 * 100) / 100,
        scope3: Math.round(byScope.scope3 * 100) / 100,
      },
      byCategory: Object.fromEntries(
        Object.entries(byCategory).map(([k, v]) => [k, Math.round(v * 100) / 100])
      ),
      byVehicle: Array.from(byVehicle.entries()).map(([vehicleId, co2Kg]) => ({
        vehicleId,
        co2Kg: Math.round(co2Kg * 100) / 100,
      })),
      intensityMetrics: {
        co2PerKm: totalDistance > 0 ? Math.round((totalCO2 / totalDistance) * 1000) / 1000 : 0,
        co2PerTonKm: totalTonKm > 0 ? Math.round((totalCO2 / totalTonKm) * 1000) / 1000 : 0,
        co2PerDelivery: totalDeliveries > 0 ? Math.round((totalCO2 / totalDeliveries) * 100) / 100 : 0,
      },
      trend: {
        previousPeriodCO2Kg: Math.round(prevCO2 * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        direction,
      },
    };
  }

  // =================== EU ETS COMPLIANCE ===================

  calculateETSCompliance(year: number): ETSCompliance {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const emissions = this.getEmissions({ startDate, endDate, scope: 'SCOPE_1' });

    const verifiedEmissions = emissions.reduce((sum, e) => sum + e.co2Kg, 0) / 1000; // Convert to tonnes

    // Simplified allocation calculation
    const baseAllocation = 100; // tonnes CO2 (would come from actual allocation)
    const benchmarkReduction = 0.022 * (year - 2021); // 2.2% annual reduction
    const allocatedAllowances = Math.max(0, baseAllocation * (1 - benchmarkReduction));

    const surrenderedAllowances = Math.min(verifiedEmissions, allocatedAllowances);
    const remainingAllowances = allocatedAllowances - surrenderedAllowances;
    const shortfall = Math.max(0, verifiedEmissions - allocatedAllowances);
    const totalCost = shortfall * this.etsPrice;

    return {
      reportingYear: year,
      applicableRegulations: [
        'EU ETS Directive 2003/87/EC',
        'EU ETS Phase 4 (2021-2030)',
        'Fit for 55 Package',
      ],
      verifiedEmissions: Math.round(verifiedEmissions * 100) / 100,
      allocatedAllowances: Math.round(allocatedAllowances * 100) / 100,
      surrenderedAllowances: Math.round(surrenderedAllowances * 100) / 100,
      remainingAllowances: Math.round(remainingAllowances * 100) / 100,
      allowancePrice: this.etsPrice,
      totalCost: Math.round(totalCost * 100) / 100,
      complianceStatus: shortfall > 0 ? 'NON_COMPLIANT' : 'COMPLIANT',
      reportingDeadline: new Date(year + 1, 2, 31), // March 31
      verificationStatus: emissions.some(e => !e.verified) ? 'IN_PROGRESS' : 'VERIFIED',
    };
  }

  // =================== CBAM (Carbon Border Adjustment) ===================

  createCBAMDeclaration(params: {
    reportingPeriod: string;
    importerInfo: CBAMDeclaration['importerInfo'];
    goods: (Omit<CBAMGood, 'cbamCertificatesRequired' | 'embeddedEmissionsKgCO2'> & { embeddedEmissionsKgCO2?: number })[];
  }): CBAMDeclaration {
    const goods = params.goods.map(good => {
      const hsChapter = good.hsCode.substring(0, 2);
      const coveredGood = this.cbamCoveredGoods.find(cg => cg.hsChapter === hsChapter);

      if (!coveredGood) {
        throw new Error(`HS code ${good.hsCode} is not covered by CBAM`);
      }

      // Calculate embedded emissions if not provided
      const embeddedEmissions = good.embeddedEmissionsKgCO2 ||
        good.quantity * coveredGood.defaultEmissionFactor;

      // Calculate CBAM certificates (1 certificate = 1 tonne CO2)
      const netEmissions = embeddedEmissions / 1000 - (good.carbonPricePaid / this.etsPrice);
      const certificatesRequired = Math.max(0, netEmissions);

      return {
        ...good,
        embeddedEmissionsKgCO2: Math.round(embeddedEmissions * 100) / 100,
        cbamCertificatesRequired: Math.round(certificatesRequired * 100) / 100,
      };
    });

    const declaration: CBAMDeclaration = {
      id: `cbam_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      reportingPeriod: params.reportingPeriod,
      importerInfo: params.importerInfo,
      goods,
      totalEmbeddedEmissions: Math.round(
        goods.reduce((sum, g) => sum + g.embeddedEmissionsKgCO2, 0) * 100
      ) / 100,
      totalCarbonPrice: Math.round(
        goods.reduce((sum, g) => sum + g.cbamCertificatesRequired * this.etsPrice, 0) * 100
      ) / 100,
      status: 'DRAFT',
    };

    this.cbamDeclarations.set(declaration.id, declaration);
    this.logger.log(`Created CBAM declaration ${declaration.id} for ${params.reportingPeriod}`);

    return declaration;
  }

  getCBAMDeclaration(id: string): CBAMDeclaration | undefined {
    return this.cbamDeclarations.get(id);
  }

  submitCBAMDeclaration(id: string): CBAMDeclaration | undefined {
    const declaration = this.cbamDeclarations.get(id);
    if (declaration && declaration.status === 'DRAFT') {
      declaration.status = 'SUBMITTED';
      declaration.submittedAt = new Date();
      this.logger.log(`Submitted CBAM declaration ${id}`);
    }
    return declaration;
  }

  listCBAMDeclarations(filters?: { status?: CBAMDeclaration['status']; period?: string }): CBAMDeclaration[] {
    let declarations = Array.from(this.cbamDeclarations.values());

    if (filters?.status) {
      declarations = declarations.filter(d => d.status === filters.status);
    }
    if (filters?.period) {
      declarations = declarations.filter(d => d.reportingPeriod === filters.period);
    }

    return declarations;
  }

  getCBAMCoveredGoods(): typeof this.cbamCoveredGoods {
    return [...this.cbamCoveredGoods];
  }

  // =================== SUSTAINABILITY REPORTING ===================

  generateSustainabilityReport(year: number, reportType: SustainabilityReport['reportType'] = 'GRI'): SustainabilityReport {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const footprint = this.calculateCarbonFootprint(startDate, endDate);
    const allTargets = Array.from(this.targets.values());
    const allInitiatives = Array.from(this.initiatives.values());

    const electricVehicles = this.listVehicles({ isElectric: true }).length;
    const totalVehicles = Array.from(this.vehicles.values()).length;

    const environmentalMetrics: EnvironmentalMetrics = {
      totalEmissionsTCO2e: footprint.totalCO2eKg / 1000,
      scope1EmissionsTCO2e: footprint.byScope.scope1 / 1000,
      scope2EmissionsTCO2e: footprint.byScope.scope2 / 1000,
      scope3EmissionsTCO2e: footprint.byScope.scope3 / 1000,
      emissionsIntensity: footprint.intensityMetrics.co2PerKm,
      renewableEnergyPercent: 35, // Would come from actual data
      fleetElectrificationPercent: totalVehicles > 0 ? (electricVehicles / totalVehicles) * 100 : 0,
      wasteRecycledPercent: 75, // Placeholder
      waterUsageM3: 5000, // Placeholder
      biodiversityImpactScore: 7.5, // Placeholder
    };

    return {
      reportingYear: year,
      reportType,
      organizationInfo: {
        name: 'DocumentIulia Transport SRL',
        sector: 'Logistics & Transportation',
        employees: 150,
        revenue: 5000000,
      },
      environmentalMetrics,
      targets: allTargets.filter(t => t.targetYear >= year),
      initiatives: allInitiatives,
      ratings: this.getESGRatings(),
    };
  }

  private getESGRatings(): ESGRating[] {
    return [
      {
        agency: 'MSCI ESG',
        rating: 'A',
        score: 6.8,
        maxScore: 10,
        date: new Date(),
        environmentalScore: 7.2,
        socialScore: 6.5,
        governanceScore: 6.8,
      },
      {
        agency: 'CDP Climate',
        rating: 'B',
        score: 7,
        maxScore: 10,
        date: new Date(),
        environmentalScore: 7,
        socialScore: 0,
        governanceScore: 0,
      },
    ];
  }

  // =================== SUSTAINABILITY TARGETS ===================

  createTarget(target: Omit<SustainabilityTarget, 'id' | 'progressPercent' | 'status'>): SustainabilityTarget {
    const id = `target_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const progress = target.baselineValue !== target.targetValue
      ? ((target.baselineValue - target.currentValue) / (target.baselineValue - target.targetValue)) * 100
      : 100;

    let status: SustainabilityTarget['status'] = 'ON_TRACK';
    const yearsRemaining = target.targetYear - new Date().getFullYear();
    const expectedProgress = yearsRemaining > 0 ? ((new Date().getFullYear() - target.baselineYear) / (target.targetYear - target.baselineYear)) * 100 : 100;

    if (progress >= 100) status = 'ACHIEVED';
    else if (progress < expectedProgress - 10) status = 'OFF_TRACK';
    else if (progress < expectedProgress) status = 'AT_RISK';

    const fullTarget: SustainabilityTarget = {
      id,
      ...target,
      progressPercent: Math.round(Math.min(100, Math.max(0, progress)) * 100) / 100,
      status,
    };

    this.targets.set(id, fullTarget);
    return fullTarget;
  }

  getTargets(category?: SustainabilityTarget['category']): SustainabilityTarget[] {
    let targets = Array.from(this.targets.values());
    if (category) {
      targets = targets.filter(t => t.category === category);
    }
    return targets;
  }

  updateTargetProgress(targetId: string, currentValue: number): SustainabilityTarget | undefined {
    const target = this.targets.get(targetId);
    if (!target) return undefined;

    target.currentValue = currentValue;

    // Recalculate progress and status
    const progress = target.baselineValue !== target.targetValue
      ? ((target.baselineValue - currentValue) / (target.baselineValue - target.targetValue)) * 100
      : 100;

    target.progressPercent = Math.round(Math.min(100, Math.max(0, progress)) * 100) / 100;

    const yearsRemaining = target.targetYear - new Date().getFullYear();
    const expectedProgress = yearsRemaining > 0
      ? ((new Date().getFullYear() - target.baselineYear) / (target.targetYear - target.baselineYear)) * 100
      : 100;

    if (target.progressPercent >= 100) target.status = 'ACHIEVED';
    else if (target.progressPercent < expectedProgress - 10) target.status = 'OFF_TRACK';
    else if (target.progressPercent < expectedProgress) target.status = 'AT_RISK';
    else target.status = 'ON_TRACK';

    return target;
  }

  // =================== GREEN INITIATIVES ===================

  createInitiative(initiative: Omit<GreenInitiative, 'id'>): GreenInitiative {
    const id = `init_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const fullInitiative: GreenInitiative = { id, ...initiative };
    this.initiatives.set(id, fullInitiative);
    return fullInitiative;
  }

  getInitiatives(filters?: {
    status?: GreenInitiative['status'];
    category?: GreenInitiative['category'];
  }): GreenInitiative[] {
    let initiatives = Array.from(this.initiatives.values());

    if (filters?.status) {
      initiatives = initiatives.filter(i => i.status === filters.status);
    }
    if (filters?.category) {
      initiatives = initiatives.filter(i => i.category === filters.category);
    }

    return initiatives;
  }

  calculateInitiativeROI(initiativeId: string): {
    investmentEUR: number;
    annualSavingsEUR: number;
    annualSavingsCO2Kg: number;
    paybackYears: number;
    npv10Years: number;
    carbonPriceEquivalent: number;
  } | undefined {
    const initiative = this.initiatives.get(initiativeId);
    if (!initiative) return undefined;

    const npv = initiative.annualSavingsEUR * 7.72 - initiative.investmentEUR; // 10-year NPV at 5% discount
    const carbonPriceEquivalent = initiative.annualSavingsCO2Kg > 0
      ? (initiative.investmentEUR / initiative.paybackYears) / (initiative.annualSavingsCO2Kg / 1000)
      : 0;

    return {
      investmentEUR: initiative.investmentEUR,
      annualSavingsEUR: initiative.annualSavingsEUR,
      annualSavingsCO2Kg: initiative.annualSavingsCO2Kg,
      paybackYears: initiative.paybackYears,
      npv10Years: Math.round(npv * 100) / 100,
      carbonPriceEquivalent: Math.round(carbonPriceEquivalent * 100) / 100,
    };
  }

  // =================== GREEN ROUTE OPTIMIZATION ===================

  optimizeRouteForEmissions(
    vehicleId: string,
    distanceKm: number,
    loadWeightKg: number
  ): GreenRoute {
    const vehicle = this.vehicles.get(vehicleId);
    const originalCO2 = vehicle
      ? distanceKm * vehicle.emissionFactorKgCO2PerKm
      : distanceKm * this.defaultVehicleEmissions['TRUCK_MEDIUM'];

    // Calculate optimized route (10-15% reduction through better routing)
    const optimizedDistanceKm = Math.round(distanceKm * 0.9 * 100) / 100;
    const optimizedCO2 = Math.round(originalCO2 * 0.85 * 100) / 100;

    const alternatives: AlternativeRoute[] = [
      {
        type: 'ELECTRIC_VEHICLE',
        distanceKm,
        co2Kg: Math.round(distanceKm * 0.05 * 100) / 100,
        costEUR: Math.round(distanceKm * 0.35 * 100) / 100,
        timeHours: distanceKm / 60,
        feasible: distanceKm <= 200, // Range limitation
        reason: distanceKm > 200 ? 'Distance exceeds electric vehicle range' : undefined,
      },
      {
        type: 'RAIL',
        distanceKm: distanceKm * 1.1, // Slightly longer due to rail network
        co2Kg: Math.round(distanceKm * 0.03 * 100) / 100,
        costEUR: Math.round(distanceKm * 0.15 * 100) / 100,
        timeHours: distanceKm / 40,
        feasible: distanceKm >= 300 && loadWeightKg >= 5000,
        reason: distanceKm < 300 ? 'Distance too short for rail' : loadWeightKg < 5000 ? 'Load too small for rail' : undefined,
      },
      {
        type: 'INTERMODAL',
        distanceKm: distanceKm * 1.05,
        co2Kg: Math.round(originalCO2 * 0.6 * 100) / 100,
        costEUR: Math.round(distanceKm * 0.25 * 100) / 100,
        timeHours: distanceKm / 45,
        feasible: distanceKm >= 200,
        reason: distanceKm < 200 ? 'Distance too short for intermodal' : undefined,
      },
      {
        type: 'CARGO_BIKE',
        distanceKm,
        co2Kg: 0,
        costEUR: Math.round(distanceKm * 0.5 * 100) / 100,
        timeHours: distanceKm / 15,
        feasible: distanceKm <= 20 && loadWeightKg <= 100,
        reason: distanceKm > 20 ? 'Distance too long for cargo bike' : loadWeightKg > 100 ? 'Load too heavy for cargo bike' : undefined,
      },
      {
        type: 'CONSOLIDATION',
        distanceKm: distanceKm * 0.7,
        co2Kg: Math.round(originalCO2 * 0.5 * 100) / 100,
        costEUR: Math.round(distanceKm * 0.2 * 100) / 100,
        timeHours: distanceKm / 50,
        feasible: true,
      },
    ];

    return {
      routeId: `route_${Date.now()}`,
      originalDistanceKm: distanceKm,
      optimizedDistanceKm,
      originalCO2Kg: Math.round(originalCO2 * 100) / 100,
      optimizedCO2Kg: optimizedCO2,
      savingsKm: Math.round((distanceKm - optimizedDistanceKm) * 100) / 100,
      savingsCO2Kg: Math.round((originalCO2 - optimizedCO2) * 100) / 100,
      savingsPercent: Math.round(((originalCO2 - optimizedCO2) / originalCO2) * 100 * 100) / 100,
      optimizationType: 'ECO',
      alternativeOptions: alternatives,
    };
  }

  // =================== ANALYTICS & DASHBOARDS ===================

  getEmissionsDashboard(): {
    currentMonthEmissions: number;
    previousMonthEmissions: number;
    changePercent: number;
    ytdEmissions: number;
    ytdTarget: number;
    targetProgress: number;
    topEmitters: { vehicleId: string; name: string; co2Kg: number }[];
    emissionsByScope: { scope: string; co2Kg: number; percent: number }[];
    monthlyTrend: { month: string; co2Kg: number }[];
  } {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const currentMonthEmissions = this.getEmissions({ startDate: currentMonthStart })
      .reduce((sum, e) => sum + e.co2Kg, 0);
    const previousMonthEmissions = this.getEmissions({ startDate: previousMonthStart, endDate: previousMonthEnd })
      .reduce((sum, e) => sum + e.co2Kg, 0);
    const ytdEmissions = this.getEmissions({ startDate: yearStart })
      .reduce((sum, e) => sum + e.co2Kg, 0);

    const ytdTarget = 50000; // Example annual target in kg
    const changePercent = previousMonthEmissions > 0
      ? ((currentMonthEmissions - previousMonthEmissions) / previousMonthEmissions) * 100
      : 0;

    // Top emitters
    const vehicleEmissions = new Map<string, number>();
    this.getEmissions({ startDate: yearStart }).forEach(e => {
      if (e.vehicleId) {
        vehicleEmissions.set(e.vehicleId, (vehicleEmissions.get(e.vehicleId) || 0) + e.co2Kg);
      }
    });

    const topEmitters = Array.from(vehicleEmissions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([vehicleId, co2Kg]) => ({
        vehicleId,
        name: this.vehicles.get(vehicleId)?.name || vehicleId,
        co2Kg: Math.round(co2Kg * 100) / 100,
      }));

    // Emissions by scope
    const scopeEmissions = { SCOPE_1: 0, SCOPE_2: 0, SCOPE_3: 0 };
    this.getEmissions({ startDate: yearStart }).forEach(e => {
      scopeEmissions[e.scope] += e.co2Kg;
    });
    const totalScope = scopeEmissions.SCOPE_1 + scopeEmissions.SCOPE_2 + scopeEmissions.SCOPE_3;

    // Monthly trend
    const monthlyTrend: { month: string; co2Kg: number }[] = [];
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(now.getFullYear(), m, 1);
      const monthEnd = new Date(now.getFullYear(), m + 1, 0);
      const monthEmissions = this.getEmissions({ startDate: monthStart, endDate: monthEnd })
        .reduce((sum, e) => sum + e.co2Kg, 0);
      monthlyTrend.push({
        month: monthStart.toLocaleString('ro-RO', { month: 'short' }),
        co2Kg: Math.round(monthEmissions * 100) / 100,
      });
    }

    return {
      currentMonthEmissions: Math.round(currentMonthEmissions * 100) / 100,
      previousMonthEmissions: Math.round(previousMonthEmissions * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      ytdEmissions: Math.round(ytdEmissions * 100) / 100,
      ytdTarget,
      targetProgress: Math.round((ytdEmissions / ytdTarget) * 100 * 100) / 100,
      topEmitters,
      emissionsByScope: [
        { scope: 'Scope 1', co2Kg: Math.round(scopeEmissions.SCOPE_1 * 100) / 100, percent: totalScope > 0 ? Math.round((scopeEmissions.SCOPE_1 / totalScope) * 100) : 0 },
        { scope: 'Scope 2', co2Kg: Math.round(scopeEmissions.SCOPE_2 * 100) / 100, percent: totalScope > 0 ? Math.round((scopeEmissions.SCOPE_2 / totalScope) * 100) : 0 },
        { scope: 'Scope 3', co2Kg: Math.round(scopeEmissions.SCOPE_3 * 100) / 100, percent: totalScope > 0 ? Math.round((scopeEmissions.SCOPE_3 / totalScope) * 100) : 0 },
      ],
      monthlyTrend,
    };
  }

  // =================== UTILITIES ===================

  getEmissionFactors(): {
    fuel: typeof this.fuelEmissionFactors;
    grid: typeof this.gridEmissionFactors;
    vehicle: typeof this.defaultVehicleEmissions;
  } {
    return {
      fuel: { ...this.fuelEmissionFactors },
      grid: { ...this.gridEmissionFactors },
      vehicle: { ...this.defaultVehicleEmissions },
    };
  }

  getETSPrice(): number {
    return this.etsPrice;
  }

  // Reset for testing
  resetState(): void {
    this.vehicles.clear();
    this.trips.clear();
    this.emissions.clear();
    this.cbamDeclarations.clear();
    this.targets.clear();
    this.initiatives.clear();
  }
}
