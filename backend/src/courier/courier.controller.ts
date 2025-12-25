import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { CourierService } from './courier.service';
import { SubcontractorPaymentService } from './subcontractor-payment.service';
import {
  CourierProvider,
  TrackParcelDto,
  TrackingResult,
  DPDShipmentRequest,
  GLSShipmentRequest,
  ShipmentCreateResult,
  ImportDeliveriesDto,
  DeliverySummaryDto,
  GetDeliverySummaryDto,
} from './dto/courier.dto';

interface AuthenticatedRequest extends Request {
  user: { id: string; userId?: string; sub?: string; role: UserRole };
}

@ApiTags('Courier Integration')
@ApiBearerAuth()
@Controller('courier')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourierController {
  constructor(
    private readonly courierService: CourierService,
    private readonly paymentService: SubcontractorPaymentService,
  ) {}

  private getUserId(req: AuthenticatedRequest): string {
    return req.user?.id || req.user?.userId || req.user?.sub || '';
  }

  // =================== TRACKING ===================

  @Get('track')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Track a parcel by tracking number' })
  @ApiQuery({ name: 'trackingNumber', description: 'Parcel tracking number' })
  @ApiQuery({ name: 'provider', enum: CourierProvider, description: 'Courier provider (DPD, GLS)' })
  @ApiResponse({ status: HttpStatus.OK, type: TrackingResult })
  async trackParcel(
    @Query('trackingNumber') trackingNumber: string,
    @Query('provider') provider: CourierProvider,
  ): Promise<TrackingResult> {
    return this.courierService.trackParcel(trackingNumber, provider);
  }

  @Post('track/bulk')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Track multiple parcels' })
  @ApiResponse({ status: HttpStatus.OK, type: [TrackingResult] })
  async trackBulk(@Body() parcels: TrackParcelDto[]): Promise<TrackingResult[]> {
    const results = await Promise.all(
      parcels.map((p) => this.courierService.trackParcel(p.trackingNumber, p.provider)),
    );
    return results;
  }

  // =================== SHIPMENT CREATION ===================

  @Post('dpd/shipment')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a DPD shipment' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ShipmentCreateResult })
  async createDPDShipment(
    @Body() request: DPDShipmentRequest,
  ): Promise<ShipmentCreateResult> {
    return this.courierService.createDPDShipment(request);
  }

  @Post('gls/shipment')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a GLS shipment' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ShipmentCreateResult })
  async createGLSShipment(
    @Body() request: GLSShipmentRequest,
  ): Promise<ShipmentCreateResult> {
    return this.courierService.createGLSShipment(request);
  }

  // =================== SUBCONTRACTOR DATA ===================

  @Post('import-deliveries')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Import delivery data from courier for subcontractor reconciliation' })
  @ApiResponse({ status: HttpStatus.OK })
  async importDeliveries(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ImportDeliveriesDto,
  ) {
    const userId = this.getUserId(req);
    return this.courierService.importSubcontractorDeliveries(
      userId,
      dto.provider,
      new Date(dto.dateFrom),
      new Date(dto.dateTo),
    );
  }

  @Get('delivery-summary')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get delivery summary for payment reconciliation' })
  @ApiQuery({ name: 'provider', enum: CourierProvider })
  @ApiQuery({ name: 'month', description: 'Month (YYYY-MM)' })
  @ApiResponse({ status: HttpStatus.OK, type: DeliverySummaryDto })
  async getDeliverySummary(
    @Req() req: AuthenticatedRequest,
    @Query('provider') provider: CourierProvider,
    @Query('month') month: string,
  ): Promise<DeliverySummaryDto> {
    const userId = this.getUserId(req);
    return this.courierService.getDeliverySummary(userId, provider, month);
  }

  // =================== SUPPORTED PROVIDERS ===================

  @Get('providers')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get list of supported courier providers' })
  @ApiResponse({ status: HttpStatus.OK })
  async getSupportedProviders() {
    return {
      providers: [
        {
          id: CourierProvider.DPD,
          name: 'DPD Deutschland',
          trackingUrl: 'https://tracking.dpd.de/parcelstatus?query=',
          features: ['tracking', 'shipment', 'subcontractor'],
        },
        {
          id: CourierProvider.GLS,
          name: 'GLS Germany',
          trackingUrl: 'https://gls-group.eu/DE/de/paketverfolgung?match=',
          features: ['tracking', 'shipment', 'subcontractor'],
        },
      ],
    };
  }

  // =================== SUBCONTRACTOR PAYMENTS ===================

  @Get('payments/calculate')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Calculate payment for a date range' })
  @ApiQuery({ name: 'provider', enum: CourierProvider })
  @ApiQuery({ name: 'dateFrom', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment calculation' })
  async calculatePayment(
    @Req() req: AuthenticatedRequest,
    @Query('provider') provider: CourierProvider,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    const userId = this.getUserId(req);
    return this.paymentService.calculatePayment(
      userId,
      provider,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }

  @Post('payments/process')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Process payment for a subcontractor' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment result' })
  async processPayment(
    @Req() req: AuthenticatedRequest,
    @Body() dto: {
      provider: CourierProvider;
      dateFrom: string;
      dateTo: string;
      generateInvoice?: boolean;
      scheduledDate?: string;
    },
  ) {
    const userId = this.getUserId(req);
    return this.paymentService.processPayment(
      userId,
      dto.provider,
      { from: new Date(dto.dateFrom), to: new Date(dto.dateTo) },
      {
        generateInvoice: dto.generateInvoice,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
      },
    );
  }

  @Get('payments/monthly-summary')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get monthly payment summary for all providers' })
  @ApiQuery({ name: 'year', description: 'Year (YYYY)' })
  @ApiQuery({ name: 'month', description: 'Month (1-12)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Monthly payment summary' })
  async getMonthlySummary(
    @Req() req: AuthenticatedRequest,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const userId = this.getUserId(req);
    return this.paymentService.generateMonthlySummary(
      userId,
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  @Post('payments/reconcile')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Reconcile payments with courier statement' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reconciliation result' })
  async reconcilePayments(
    @Req() req: AuthenticatedRequest,
    @Body() dto: {
      provider: CourierProvider;
      courierStatementAmount: number;
      dateFrom: string;
      dateTo: string;
    },
  ) {
    const userId = this.getUserId(req);
    return this.paymentService.reconcileWithCourier(
      userId,
      dto.provider,
      dto.courierStatementAmount,
      { from: new Date(dto.dateFrom), to: new Date(dto.dateTo) },
    );
  }

  // =================== DRIVER PAYOUTS ===================

  @Get('driver-payouts')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Calculate payouts for all drivers' })
  @ApiQuery({ name: 'dateFrom', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver payout calculations' })
  async calculateDriverPayouts(
    @Req() req: AuthenticatedRequest,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    const userId = this.getUserId(req);
    return this.paymentService.calculateAllDriverPayouts(
      userId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }

  @Get('driver-payouts/:driverId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Calculate payout for a specific driver' })
  @ApiParam({ name: 'driverId', description: 'Driver/Employee ID' })
  @ApiQuery({ name: 'dateFrom', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver payout calculation' })
  async calculateDriverPayout(
    @Param('driverId') driverId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.paymentService.calculateDriverPayout(
      driverId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }
}
