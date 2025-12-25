import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  CarbonTrackingService,
  Vehicle,
  Trip,
  EmissionScope,
  EmissionCategory,
  VehicleType,
  FuelType,
} from './carbon-tracking.service';

// Carbon Tracking & ESG Controller
// EU ETS compliance, CBAM, sustainability reporting

@Controller('logistics/carbon')
@UseGuards(ThrottlerGuard)
export class CarbonTrackingController {
  constructor(private readonly carbonService: CarbonTrackingService) {}

  // =================== VEHICLES ===================

  @Post('vehicles')
  registerVehicle(@Body() vehicle: Vehicle) {
    if (!vehicle.id || !vehicle.name || !vehicle.type) {
      throw new HttpException('Vehicle id, name, and type are required', HttpStatus.BAD_REQUEST);
    }
    return this.carbonService.registerVehicle(vehicle);
  }

  @Get('vehicles')
  listVehicles(
    @Query('type') type?: VehicleType,
    @Query('fuelType') fuelType?: FuelType,
    @Query('isElectric') isElectric?: string,
  ) {
    return this.carbonService.listVehicles({
      type,
      fuelType,
      isElectric: isElectric !== undefined ? isElectric === 'true' : undefined,
    });
  }

  @Get('vehicles/:id')
  getVehicle(@Param('id') id: string) {
    const vehicle = this.carbonService.getVehicle(id);
    if (!vehicle) {
      throw new HttpException('Vehicle not found', HttpStatus.NOT_FOUND);
    }
    return vehicle;
  }

  // =================== TRIPS & EMISSIONS ===================

  @Post('trips')
  recordTrip(@Body() trip: Trip) {
    if (!trip.id || !trip.vehicleId || trip.distanceKm === undefined) {
      throw new HttpException('Trip id, vehicleId, and distanceKm are required', HttpStatus.BAD_REQUEST);
    }
    trip.date = new Date(trip.date);
    try {
      return this.carbonService.recordTrip(trip);
    } catch (error) {
      throw new HttpException((error as Error).message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('emissions')
  recordEmission(
    @Body() body: {
      vehicleId: string;
      date: string;
      scope: EmissionScope;
      category: EmissionCategory;
      co2Kg: number;
      co2eKg?: number;
      distanceKm?: number;
      fuelConsumedL?: number;
      calculationMethod?: string;
    },
  ) {
    if (!body.vehicleId || !body.scope || !body.category || body.co2Kg === undefined) {
      throw new HttpException('vehicleId, scope, category, and co2Kg are required', HttpStatus.BAD_REQUEST);
    }
    return this.carbonService.recordEmission({
      vehicleId: body.vehicleId,
      date: new Date(body.date),
      scope: body.scope,
      category: body.category,
      co2Kg: body.co2Kg,
      co2eKg: body.co2eKg || body.co2Kg * 1.02,
      distanceKm: body.distanceKm,
      fuelConsumedL: body.fuelConsumedL,
      calculationMethod: body.calculationMethod || 'MANUAL',
      verified: false,
    });
  }

  @Get('emissions')
  getEmissions(
    @Query('vehicleId') vehicleId?: string,
    @Query('scope') scope?: EmissionScope,
    @Query('category') category?: EmissionCategory,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.carbonService.getEmissions({
      vehicleId,
      scope,
      category,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  // =================== CARBON FOOTPRINT ===================

  @Get('footprint')
  calculateFootprint(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new HttpException('startDate and endDate are required', HttpStatus.BAD_REQUEST);
    }
    return this.carbonService.calculateCarbonFootprint(
      new Date(startDate),
      new Date(endDate),
    );
  }

  // =================== EU ETS ===================

  @Get('ets/:year')
  calculateETSCompliance(@Param('year') year: string) {
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 2021) {
      throw new HttpException('Valid year >= 2021 required', HttpStatus.BAD_REQUEST);
    }
    return this.carbonService.calculateETSCompliance(yearNum);
  }

  // =================== CBAM ===================

  @Post('cbam')
  createCBAMDeclaration(
    @Body() body: {
      reportingPeriod: string;
      importerInfo: {
        name: string;
        eoriNumber: string;
        country: string;
      };
      goods: Array<{
        hsCode: string;
        description: string;
        originCountry: string;
        quantity: number;
        unit: string;
        embeddedEmissionsKgCO2?: number;
        carbonPricePaid: number;
      }>;
    },
  ) {
    if (!body.reportingPeriod || !body.importerInfo || !body.goods?.length) {
      throw new HttpException('reportingPeriod, importerInfo, and goods are required', HttpStatus.BAD_REQUEST);
    }
    try {
      return this.carbonService.createCBAMDeclaration(body);
    } catch (error) {
      throw new HttpException((error as Error).message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('cbam')
  listCBAMDeclarations(
    @Query('status') status?: 'DRAFT' | 'SUBMITTED' | 'VERIFIED',
    @Query('period') period?: string,
  ) {
    return this.carbonService.listCBAMDeclarations({ status, period });
  }

  @Get('cbam/:id')
  getCBAMDeclaration(@Param('id') id: string) {
    const declaration = this.carbonService.getCBAMDeclaration(id);
    if (!declaration) {
      throw new HttpException('CBAM declaration not found', HttpStatus.NOT_FOUND);
    }
    return declaration;
  }

  @Put('cbam/:id/submit')
  submitCBAMDeclaration(@Param('id') id: string) {
    const declaration = this.carbonService.submitCBAMDeclaration(id);
    if (!declaration) {
      throw new HttpException('CBAM declaration not found or already submitted', HttpStatus.BAD_REQUEST);
    }
    return declaration;
  }

  @Get('cbam-covered-goods')
  getCBAMCoveredGoods() {
    return this.carbonService.getCBAMCoveredGoods();
  }

  // =================== SUSTAINABILITY REPORTING ===================

  @Get('sustainability-report/:year')
  generateSustainabilityReport(
    @Param('year') year: string,
    @Query('type') type?: 'GRI' | 'SASB' | 'CDP' | 'TCFD' | 'CUSTOM',
  ) {
    const yearNum = parseInt(year);
    if (isNaN(yearNum)) {
      throw new HttpException('Valid year required', HttpStatus.BAD_REQUEST);
    }
    return this.carbonService.generateSustainabilityReport(yearNum, type || 'GRI');
  }

  // =================== TARGETS ===================

  @Post('targets')
  createTarget(
    @Body() body: {
      name: string;
      description: string;
      targetYear: number;
      baselineYear: number;
      baselineValue: number;
      targetValue: number;
      currentValue: number;
      category: 'EMISSIONS' | 'ENERGY' | 'FLEET' | 'WASTE' | 'WATER';
    },
  ) {
    if (!body.name || !body.targetYear || body.baselineValue === undefined) {
      throw new HttpException('name, targetYear, and baselineValue are required', HttpStatus.BAD_REQUEST);
    }
    return this.carbonService.createTarget(body);
  }

  @Get('targets')
  getTargets(@Query('category') category?: 'EMISSIONS' | 'ENERGY' | 'FLEET' | 'WASTE' | 'WATER') {
    return this.carbonService.getTargets(category);
  }

  @Put('targets/:id/progress')
  updateTargetProgress(
    @Param('id') id: string,
    @Body('currentValue') currentValue: number,
  ) {
    if (currentValue === undefined) {
      throw new HttpException('currentValue is required', HttpStatus.BAD_REQUEST);
    }
    const target = this.carbonService.updateTargetProgress(id, currentValue);
    if (!target) {
      throw new HttpException('Target not found', HttpStatus.NOT_FOUND);
    }
    return target;
  }

  // =================== GREEN INITIATIVES ===================

  @Post('initiatives')
  createInitiative(
    @Body() body: {
      name: string;
      description: string;
      startDate: string;
      endDate?: string;
      status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
      investmentEUR: number;
      annualSavingsCO2Kg: number;
      annualSavingsEUR: number;
      paybackYears: number;
      category: 'FLEET_ELECTRIFICATION' | 'ROUTE_OPTIMIZATION' | 'RENEWABLE_ENERGY' | 'BUILDING_EFFICIENCY' | 'PACKAGING' | 'OTHER';
    },
  ) {
    if (!body.name || !body.startDate || body.investmentEUR === undefined) {
      throw new HttpException('name, startDate, and investmentEUR are required', HttpStatus.BAD_REQUEST);
    }
    return this.carbonService.createInitiative({
      ...body,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
  }

  @Get('initiatives')
  getInitiatives(
    @Query('status') status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    @Query('category') category?: 'FLEET_ELECTRIFICATION' | 'ROUTE_OPTIMIZATION' | 'RENEWABLE_ENERGY' | 'BUILDING_EFFICIENCY' | 'PACKAGING' | 'OTHER',
  ) {
    return this.carbonService.getInitiatives({ status, category });
  }

  @Get('initiatives/:id/roi')
  calculateInitiativeROI(@Param('id') id: string) {
    const roi = this.carbonService.calculateInitiativeROI(id);
    if (!roi) {
      throw new HttpException('Initiative not found', HttpStatus.NOT_FOUND);
    }
    return roi;
  }

  // =================== GREEN ROUTE OPTIMIZATION ===================

  @Post('optimize-route')
  optimizeRouteForEmissions(
    @Body() body: {
      vehicleId?: string;
      distanceKm: number;
      loadWeightKg: number;
    },
  ) {
    if (body.distanceKm === undefined || body.loadWeightKg === undefined) {
      throw new HttpException('distanceKm and loadWeightKg are required', HttpStatus.BAD_REQUEST);
    }
    return this.carbonService.optimizeRouteForEmissions(
      body.vehicleId || 'default',
      body.distanceKm,
      body.loadWeightKg,
    );
  }

  // =================== DASHBOARD ===================

  @Get('dashboard')
  getEmissionsDashboard() {
    return this.carbonService.getEmissionsDashboard();
  }

  // =================== REFERENCE DATA ===================

  @Get('emission-factors')
  getEmissionFactors() {
    return this.carbonService.getEmissionFactors();
  }

  @Get('ets-price')
  getETSPrice() {
    return { price: this.carbonService.getETSPrice(), currency: 'EUR', unit: 'per tCO2' };
  }
}
