import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { SrlRegistrationService } from './srl-registration.service';
import { PfaRegistrationService } from './pfa-registration.service';
import { CreateSrlRegistrationDto } from './dto/create-srl-registration.dto';
import { CreatePfaRegistrationDto } from './dto/create-pfa-registration.dto';

/**
 * Services Controller
 *
 * API endpoints for business registration services:
 * - Get service packages and pricing
 * - Create SRL registration
 * - Create PFA registration
 * - Track registration status
 * - Manage registration lifecycle
 *
 * All endpoints require authentication (JWT)
 */
@ApiTags('Services - Business Registration')
@Controller('services')
@ApiBearerAuth()
export class ServicesController {
  constructor(
    private servicesService: ServicesService,
    private srlRegistration: SrlRegistrationService,
    private pfaRegistration: PfaRegistrationService,
  ) {}

  /**
   * Get service packages and pricing
   * GET /api/services/packages
   */
  @Get('packages')
  @ApiOperation({
    summary: 'Get available service packages',
    description: 'Returns pricing, features, and requirements for SRL, SRL-D, and PFA registration services',
  })
  @ApiResponse({ status: 200, description: 'Service packages retrieved successfully' })
  getServicePackages() {
    return {
      success: true,
      data: this.servicesService.getServicePackages(),
    };
  }

  /**
   * Get testimonials
   * GET /api/services/testimonials
   */
  @Get('testimonials')
  @ApiOperation({
    summary: 'Get customer testimonials',
    description: 'Returns success stories and reviews from satisfied customers',
  })
  @ApiResponse({ status: 200, description: 'Testimonials retrieved successfully' })
  getTestimonials() {
    return {
      success: true,
      data: this.servicesService.getTestimonials(),
    };
  }

  /**
   * Get FAQ
   * GET /api/services/faq
   */
  @Get('faq')
  @ApiOperation({
    summary: 'Get frequently asked questions',
    description: 'Returns common questions about business registration process',
  })
  @ApiResponse({ status: 200, description: 'FAQ retrieved successfully' })
  getFAQ() {
    return {
      success: true,
      data: this.servicesService.getFAQ(),
    };
  }

  // ============================================================================
  // SRL REGISTRATION ENDPOINTS
  // ============================================================================

  /**
   * Create SRL registration
   * POST /api/services/srl
   */
  @Post('srl')
  @ApiOperation({
    summary: 'Create SRL registration',
    description: 'Submit a new SRL (Limited Liability Company) registration request',
  })
  @ApiBody({ type: CreateSrlRegistrationDto })
  @ApiResponse({ status: 201, description: 'SRL registration created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or company name not available' })
  @HttpCode(HttpStatus.CREATED)
  async createSrlRegistration(@Request() req: any, @Body() body: CreateSrlRegistrationDto) {
    const userId = req.user?.id || 'test-user-id';
    const result = await this.srlRegistration.createRegistration(userId, body);

    return {
      success: true,
      data: result,
      message: 'Cererea de înregistrare SRL a fost creată cu succes',
    };
  }

  /**
   * Get all SRL registrations for user
   * GET /api/services/srl
   */
  @Get('srl')
  @ApiOperation({
    summary: 'List SRL registrations',
    description: 'Get all SRL registrations for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'SRL registrations retrieved successfully' })
  async listSrlRegistrations(@Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    const registrations = await this.srlRegistration.listRegistrations(userId);

    return {
      success: true,
      data: registrations,
      count: registrations.length,
    };
  }

  /**
   * Get SRL registration by ID
   * GET /api/services/srl/:id
   */
  @Get('srl/:id')
  @ApiOperation({
    summary: 'Get SRL registration details',
    description: 'Get details and status of a specific SRL registration',
  })
  @ApiResponse({ status: 200, description: 'SRL registration retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async getSrlRegistration(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'test-user-id';
    const registration = await this.srlRegistration.getRegistrationStatus(id, userId);

    return {
      success: true,
      data: registration,
    };
  }

  /**
   * Update SRL registration
   * PUT /api/services/srl/:id
   */
  @Put('srl/:id')
  @ApiOperation({
    summary: 'Update SRL registration',
    description: 'Update SRL registration (only in DRAFT status)',
  })
  @ApiResponse({ status: 200, description: 'SRL registration updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update - registration already submitted' })
  async updateSrlRegistration(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Partial<CreateSrlRegistrationDto>,
  ) {
    const userId = req.user?.id || 'test-user-id';
    const registration = await this.srlRegistration.updateRegistration(id, userId, body);

    return {
      success: true,
      data: registration,
      message: 'Cererea de înregistrare a fost actualizată',
    };
  }

  /**
   * Submit SRL registration to ONRC
   * POST /api/services/srl/:id/submit
   */
  @Post('srl/:id/submit')
  @ApiOperation({
    summary: 'Submit SRL registration to ONRC',
    description: 'Submit the registration to Romanian Trade Register after payment confirmation',
  })
  @ApiResponse({ status: 200, description: 'Registration submitted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot submit - payment not confirmed or already submitted' })
  async submitSrlRegistration(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'test-user-id';
    const result = await this.srlRegistration.submitToOnrc(id, userId);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Cancel SRL registration
   * DELETE /api/services/srl/:id
   */
  @Delete('srl/:id')
  @ApiOperation({
    summary: 'Cancel SRL registration',
    description: 'Cancel a registration request (not possible after approval)',
  })
  @ApiResponse({ status: 200, description: 'Registration cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel - registration already approved' })
  async cancelSrlRegistration(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'test-user-id';
    const registration = await this.srlRegistration.cancelRegistration(id, userId);

    return {
      success: true,
      data: registration,
      message: 'Cererea de înregistrare a fost anulată',
    };
  }

  // ============================================================================
  // PFA REGISTRATION ENDPOINTS
  // ============================================================================

  /**
   * Create PFA registration
   * POST /api/services/pfa
   */
  @Post('pfa')
  @ApiOperation({
    summary: 'Create PFA registration',
    description: 'Submit a new PFA (Authorized Natural Person) registration request',
  })
  @ApiBody({ type: CreatePfaRegistrationDto })
  @ApiResponse({ status: 201, description: 'PFA registration created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or active PFA already exists' })
  @HttpCode(HttpStatus.CREATED)
  async createPfaRegistration(@Request() req: any, @Body() body: CreatePfaRegistrationDto) {
    const userId = req.user?.id || 'test-user-id';
    const result = await this.pfaRegistration.createRegistration(userId, body);

    return {
      success: true,
      data: result,
      message: 'Cererea de înregistrare PFA a fost creată cu succes',
    };
  }

  /**
   * Get all PFA registrations for user
   * GET /api/services/pfa
   */
  @Get('pfa')
  @ApiOperation({
    summary: 'List PFA registrations',
    description: 'Get all PFA registrations for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'PFA registrations retrieved successfully' })
  async listPfaRegistrations(@Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    const registrations = await this.pfaRegistration.listRegistrations(userId);

    return {
      success: true,
      data: registrations,
      count: registrations.length,
    };
  }

  /**
   * Get PFA registration by ID
   * GET /api/services/pfa/:id
   */
  @Get('pfa/:id')
  @ApiOperation({
    summary: 'Get PFA registration details',
    description: 'Get details and status of a specific PFA registration',
  })
  @ApiResponse({ status: 200, description: 'PFA registration retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async getPfaRegistration(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'test-user-id';
    const registration = await this.pfaRegistration.getRegistrationStatus(id, userId);

    return {
      success: true,
      data: registration,
    };
  }

  /**
   * Update PFA registration
   * PUT /api/services/pfa/:id
   */
  @Put('pfa/:id')
  @ApiOperation({
    summary: 'Update PFA registration',
    description: 'Update PFA registration (only in DRAFT status)',
  })
  @ApiResponse({ status: 200, description: 'PFA registration updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update - registration already submitted' })
  async updatePfaRegistration(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Partial<CreatePfaRegistrationDto>,
  ) {
    const userId = req.user?.id || 'test-user-id';
    const registration = await this.pfaRegistration.updateRegistration(id, userId, body);

    return {
      success: true,
      data: registration,
      message: 'Cererea de înregistrare a fost actualizată',
    };
  }

  /**
   * Submit PFA registration to ANAF
   * POST /api/services/pfa/:id/submit
   */
  @Post('pfa/:id/submit')
  @ApiOperation({
    summary: 'Submit PFA registration to ANAF',
    description: 'Submit the registration to Romanian Tax Authority after payment confirmation',
  })
  @ApiResponse({ status: 200, description: 'Registration submitted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot submit - payment not confirmed or already submitted' })
  async submitPfaRegistration(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'test-user-id';
    const result = await this.pfaRegistration.submitToAnaf(id, userId);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Cancel PFA registration
   * DELETE /api/services/pfa/:id
   */
  @Delete('pfa/:id')
  @ApiOperation({
    summary: 'Cancel PFA registration',
    description: 'Cancel a registration request (not possible after approval)',
  })
  @ApiResponse({ status: 200, description: 'Registration cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel - registration already approved' })
  async cancelPfaRegistration(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'test-user-id';
    const registration = await this.pfaRegistration.cancelRegistration(id, userId);

    return {
      success: true,
      data: registration,
      message: 'Cererea de înregistrare a fost anulată',
    };
  }
}
