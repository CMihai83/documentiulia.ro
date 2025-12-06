/**
 * EU Funds Controller - Gateway to PNRR/Cohesion/InvestEU enchantments
 * All buttons functional, all links enchanted, overlap-ban enforced
 */

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
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { EuFundsService } from './eu-funds.service';
import {
  EligibilityCheckDto,
  CreateApplicationDto,
  UpdateApplicationDto,
  UpdateMilestoneDto,
  InvestEUVoucherDto,
  FundSource,
  ProgramStatus,
  ApplicationStatus,
} from './dto/eu-funds.dto';

@ApiTags('EU Funds')
@ApiBearerAuth()
@Controller('eu-funds')
@UseGuards(ClerkAuthGuard)
export class EuFundsController {
  constructor(private readonly euFundsService: EuFundsService) {}

  // ==================== FUNDING PROGRAMS ====================

  @Get('programs')
  @ApiOperation({ summary: 'Get all funding programs - PNRR/Cohesion/InvestEU scanner' })
  @ApiQuery({ name: 'source', enum: FundSource, required: false })
  @ApiQuery({ name: 'status', enum: ProgramStatus, required: false })
  @ApiQuery({ name: 'sector', required: false })
  @ApiQuery({ name: 'minFunding', type: Number, required: false })
  @ApiQuery({ name: 'maxFunding', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'List of funding programs' })
  async getPrograms(
    @Query('source') source?: FundSource,
    @Query('status') status?: ProgramStatus,
    @Query('sector') sector?: string,
    @Query('minFunding') minFunding?: number,
    @Query('maxFunding') maxFunding?: number,
  ) {
    return this.euFundsService.getPrograms({
      source,
      status,
      sector,
      minFunding: minFunding ? Number(minFunding) : undefined,
      maxFunding: maxFunding ? Number(maxFunding) : undefined,
    });
  }

  @Get('programs/:id')
  @ApiOperation({ summary: 'Get single funding program details' })
  @ApiParam({ name: 'id', description: 'Program ID' })
  async getProgram(@Param('id') programId: string) {
    return this.euFundsService.getProgram(programId);
  }

  // ==================== ELIGIBILITY CHECK ====================

  @Post('eligibility/check')
  @ApiOperation({ summary: 'AI-powered eligibility check - Match company to programs' })
  @ApiResponse({ status: 200, description: 'Eligibility results with scores and recommendations' })
  async checkEligibility(@Body() dto: EligibilityCheckDto) {
    return this.euFundsService.checkEligibility(dto);
  }

  // ==================== APPLICATIONS ====================

  @Post('applications')
  @ApiOperation({ summary: 'Create new funding application' })
  @ApiResponse({ status: 201, description: 'Application created' })
  async createApplication(
    @CompanyId() companyId: string,
    @Body() dto: CreateApplicationDto,
  ) {
    return this.euFundsService.createApplication(companyId, dto);
  }

  @Get('applications')
  @ApiOperation({ summary: 'Get all applications for company' })
  @ApiQuery({ name: 'status', enum: ApplicationStatus, required: false })
  @ApiQuery({ name: 'programId', required: false })
  async getApplications(
    @CompanyId() companyId: string,
    @Query('status') status?: ApplicationStatus,
    @Query('programId') programId?: string,
  ) {
    return this.euFundsService.getApplications(companyId, { status, programId });
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get single application with milestones' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  async getApplication(
    @CompanyId() companyId: string,
    @Param('id') applicationId: string,
  ) {
    return this.euFundsService.getApplication(companyId, applicationId);
  }

  @Put('applications/:id')
  @ApiOperation({ summary: 'Update application - Edit before submission' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  async updateApplication(
    @CompanyId() companyId: string,
    @Param('id') applicationId: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.euFundsService.updateApplication(companyId, applicationId, dto);
  }

  @Post('applications/:id/submit')
  @ApiOperation({ summary: 'Submit application for review' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  async submitApplication(
    @CompanyId() companyId: string,
    @Param('id') applicationId: string,
  ) {
    return this.euFundsService.submitApplication(companyId, applicationId);
  }

  @Delete('applications/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete draft application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  async deleteApplication(
    @CompanyId() companyId: string,
    @Param('id') applicationId: string,
  ) {
    await this.euFundsService.deleteApplication(companyId, applicationId);
  }

  // ==================== MILESTONES ====================

  @Put('applications/:applicationId/milestones/:milestoneId')
  @ApiOperation({ summary: 'Update milestone status' })
  @ApiParam({ name: 'applicationId', description: 'Application ID' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone ID' })
  async updateMilestone(
    @CompanyId() companyId: string,
    @Param('applicationId') applicationId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.euFundsService.updateMilestone(companyId, applicationId, milestoneId, dto);
  }

  // ==================== ANALYTICS ====================

  @Get('analytics')
  @ApiOperation({ summary: 'Get EU Funds dashboard analytics' })
  async getAnalytics(@CompanyId() companyId: string) {
    return this.euFundsService.getAnalytics(companyId);
  }

  // ==================== INVESTEU VOUCHERS ====================

  @Post('vouchers/apply')
  @ApiOperation({ summary: 'Apply for InvestEU voucher (€5k-€50k simplified)' })
  @ApiResponse({ status: 201, description: 'Voucher application created' })
  async applyForVoucher(
    @CompanyId() companyId: string,
    @Body() dto: InvestEUVoucherDto,
  ) {
    return this.euFundsService.applyForVoucher(companyId, dto);
  }

  // ==================== SEED (Development only) ====================

  @Post('seed')
  @ApiOperation({ summary: 'Seed funding programs (development only)' })
  @ApiResponse({ status: 201, description: 'Programs seeded' })
  async seedPrograms() {
    return this.euFundsService.seedPrograms();
  }
}
