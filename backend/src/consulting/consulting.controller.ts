import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ConsultingService,
  ConsultingPackage,
  ConsultingBooking,
  ConsultingInvoice,
  ConsultingStats,
  AvailabilitySlot,
  ConsultingServiceType,
} from './consulting.service';
import { Tier } from '@prisma/client';

// DTOs
class CreateBookingDto {
  packageId: string;
  scheduledAt: string;
  notes?: string;
  currency?: string;
}

class RescheduleBookingDto {
  newScheduledAt: string;
}

class CancelBookingDto {
  reason?: string;
}

class CompleteBookingDto {
  deliverables?: string[];
}

class SubmitFeedbackDto {
  rating: number;
  comment?: string;
  wouldRecommend?: boolean;
}

@Controller('consulting')
export class ConsultingController {
  constructor(private readonly consultingService: ConsultingService) {}

  // =================== PUBLIC ENDPOINTS ===================

  /**
   * Get all consulting packages (public)
   */
  @Get('packages')
  getAllPackages(): ConsultingPackage[] {
    return this.consultingService.getAllPackages();
  }

  /**
   * Get packages by category (public)
   */
  @Get('packages/category/:category')
  getPackagesByCategory(
    @Param('category') category: string,
  ): ConsultingPackage[] {
    return this.consultingService.getPackagesByCategory(category);
  }

  /**
   * Get popular packages (public)
   */
  @Get('packages/popular')
  getPopularPackages(): ConsultingPackage[] {
    return this.consultingService.getPopularPackages();
  }

  /**
   * Get new packages (public)
   */
  @Get('packages/new')
  getNewPackages(): ConsultingPackage[] {
    return this.consultingService.getNewPackages();
  }

  /**
   * Get package categories summary (public)
   */
  @Get('categories')
  getCategories(): { category: string; count: number; packages: string[] }[] {
    return this.consultingService.getCategories();
  }

  /**
   * Get specific package details (public)
   */
  @Get('packages/:packageId')
  getPackage(@Param('packageId') packageId: string): ConsultingPackage {
    return this.consultingService.getPackage(packageId);
  }

  // =================== AUTHENTICATED ENDPOINTS ===================

  /**
   * Get packages available for user's tier
   */
  @Get('packages/available')
  @UseGuards(JwtAuthGuard)
  async getAvailablePackages(@Request() req: any): Promise<ConsultingPackage[]> {
    // Get user's tier from organization
    const organizationId = req.headers['x-organization-id'] || req.user?.organizationId;
    // For simplicity, assume PRO tier if no org - in production would fetch from DB
    return this.consultingService.getPackagesForTier(Tier.PRO);
  }

  /**
   * Check if user can book a specific package
   */
  @Get('packages/:packageId/can-book')
  @UseGuards(JwtAuthGuard)
  async canBookPackage(
    @Request() req: any,
    @Param('packageId') packageId: string,
  ): Promise<{ canBook: boolean; reason?: string }> {
    const organizationId = req.headers['x-organization-id'] || req.user?.organizationId;
    return this.consultingService.canBookPackage(organizationId, packageId);
  }

  /**
   * Get available time slots for a package on a specific date
   */
  @Get('availability')
  @UseGuards(JwtAuthGuard)
  getAvailability(
    @Query('date') date: string,
    @Query('packageId') packageId: string,
  ): AvailabilitySlot[] {
    return this.consultingService.getAvailableSlots(date, packageId);
  }

  /**
   * Create a new booking
   */
  @Post('bookings')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createBooking(
    @Request() req: any,
    @Body() dto: CreateBookingDto,
  ): Promise<ConsultingBooking> {
    const organizationId = req.headers['x-organization-id'] || req.user?.organizationId;
    const userId = req.user?.sub || req.user?.id;

    return this.consultingService.createBooking(
      organizationId,
      userId,
      dto.packageId,
      new Date(dto.scheduledAt),
      dto.notes,
      dto.currency || 'RON',
    );
  }

  /**
   * Get all bookings for the organization
   */
  @Get('bookings')
  @UseGuards(JwtAuthGuard)
  async getBookings(@Request() req: any): Promise<ConsultingBooking[]> {
    const organizationId = req.headers['x-organization-id'] || req.user?.organizationId;
    return this.consultingService.getOrganizationBookings(organizationId);
  }

  /**
   * Get upcoming bookings
   */
  @Get('bookings/upcoming')
  @UseGuards(JwtAuthGuard)
  async getUpcomingBookings(@Request() req: any): Promise<ConsultingBooking[]> {
    const organizationId = req.headers['x-organization-id'] || req.user?.organizationId;
    return this.consultingService.getUpcomingBookings(organizationId);
  }

  /**
   * Get booking by ID
   */
  @Get('bookings/:bookingId')
  @UseGuards(JwtAuthGuard)
  getBooking(@Param('bookingId') bookingId: string): ConsultingBooking {
    return this.consultingService.getBooking(bookingId);
  }

  /**
   * Confirm a booking (simulates payment confirmation)
   */
  @Post('bookings/:bookingId/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  confirmBooking(@Param('bookingId') bookingId: string): ConsultingBooking {
    return this.consultingService.confirmBooking(bookingId);
  }

  /**
   * Cancel a booking
   */
  @Delete('bookings/:bookingId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  cancelBooking(
    @Param('bookingId') bookingId: string,
    @Body() dto: CancelBookingDto,
  ): ConsultingBooking {
    return this.consultingService.cancelBooking(bookingId, dto.reason);
  }

  /**
   * Reschedule a booking
   */
  @Put('bookings/:bookingId/reschedule')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  rescheduleBooking(
    @Param('bookingId') bookingId: string,
    @Body() dto: RescheduleBookingDto,
  ): ConsultingBooking {
    return this.consultingService.rescheduleBooking(
      bookingId,
      new Date(dto.newScheduledAt),
    );
  }

  /**
   * Complete a booking (admin/consultant action)
   */
  @Post('bookings/:bookingId/complete')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  completeBooking(
    @Param('bookingId') bookingId: string,
    @Body() dto: CompleteBookingDto,
  ): ConsultingBooking {
    return this.consultingService.completeBooking(bookingId, dto.deliverables);
  }

  /**
   * Submit feedback for a completed booking
   */
  @Post('bookings/:bookingId/feedback')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  submitFeedback(
    @Param('bookingId') bookingId: string,
    @Body() dto: SubmitFeedbackDto,
  ): ConsultingBooking {
    return this.consultingService.submitFeedback(
      bookingId,
      dto.rating,
      dto.comment,
      dto.wouldRecommend ?? true,
    );
  }

  /**
   * Generate invoice for a booking
   */
  @Get('bookings/:bookingId/invoice')
  @UseGuards(JwtAuthGuard)
  generateInvoice(@Param('bookingId') bookingId: string): ConsultingInvoice {
    return this.consultingService.generateInvoice(bookingId);
  }

  /**
   * Get consulting statistics for organization
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Request() req: any): Promise<ConsultingStats> {
    const organizationId = req.headers['x-organization-id'] || req.user?.organizationId;
    return this.consultingService.getStats(organizationId);
  }

  // =================== PRICING CALCULATOR ===================

  /**
   * Calculate total price for a package
   */
  @Get('packages/:packageId/price')
  calculatePrice(
    @Param('packageId') packageId: string,
    @Query('currency') currency: string = 'RON',
  ): { packageId: string; price: number; vatAmount: number; total: number; currency: string } {
    const pkg = this.consultingService.getPackage(packageId);
    const basePrice = currency === 'EUR' ? pkg.priceEur : pkg.priceRon;
    const vatRate = 0.19; // Romanian VAT for services
    const vatAmount = Math.round(basePrice * vatRate * 100) / 100;
    const total = Math.round((basePrice + vatAmount) * 100) / 100;

    return {
      packageId,
      price: basePrice,
      vatAmount,
      total,
      currency,
    };
  }

  // =================== SERVICE TYPE LISTING ===================

  /**
   * Get all service types
   */
  @Get('service-types')
  getServiceTypes(): { type: ConsultingServiceType; name: string; nameRo: string }[] {
    const serviceTypes: { type: ConsultingServiceType; name: string; nameRo: string }[] = [
      { type: 'accounting_setup', name: 'Accounting Setup', nameRo: 'Configurare Contabilitate' },
      { type: 'tax_planning', name: 'Tax Planning', nameRo: 'Planificare Fiscala' },
      { type: 'audit_preparation', name: 'Audit Preparation', nameRo: 'Pregatire Audit' },
      { type: 'financial_review', name: 'Financial Review', nameRo: 'Revizuire Financiara' },
      { type: 'compliance_check', name: 'Compliance Check', nameRo: 'Verificare Conformitate' },
      { type: 'saga_migration', name: 'SAGA Migration', nameRo: 'Migrare SAGA' },
      { type: 'anaf_integration', name: 'ANAF Integration', nameRo: 'Integrare ANAF' },
      { type: 'custom_reports', name: 'Custom Reports', nameRo: 'Rapoarte Personalizate' },
      { type: 'training_session', name: 'Training Session', nameRo: 'Sesiune Training' },
      { type: 'efactura_setup', name: 'e-Factura Setup', nameRo: 'Configurare e-Factura' },
      { type: 'saft_optimization', name: 'SAF-T Optimization', nameRo: 'Optimizare SAF-T' },
      { type: 'hr_compliance', name: 'HR Compliance', nameRo: 'Conformitate HR' },
      { type: 'payroll_setup', name: 'Payroll Setup', nameRo: 'Configurare Salarizare' },
      { type: 'vat_analysis', name: 'VAT Analysis', nameRo: 'Analiza TVA' },
    ];

    return serviceTypes;
  }
}
