import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Patch,
  Query,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { GdprService } from './gdpr.service';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CreateDsrRequestDto,
  UpdateDsrRequestDto,
  UpdateConsentDto,
  DsrStatus,
} from './gdpr.dto';

@ApiTags('gdpr')
@Controller('gdpr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  @Get('export')
  @ApiOperation({ summary: 'Export all user data (GDPR Article 20 - Data Portability)' })
  @ApiResponse({ status: 200, description: 'User data exported successfully' })
  async exportUserData(
    @Query('userId') userId: string,
    @Res() res: Response,
  ) {
    const data = await this.gdprService.exportUserData(userId);

    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="gdpr-export-${userId}-${Date.now()}.json"`,
    });

    res.send(JSON.stringify(data, null, 2));
  }

  @Delete('delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all user data (GDPR Article 17 - Right to Erasure)' })
  @ApiResponse({ status: 200, description: 'User data deleted successfully' })
  async deleteUserData(@Query('userId') userId: string) {
    return this.gdprService.deleteUserData(userId);
  }

  @Get('consent-log')
  @ApiOperation({ summary: 'Get user consent history' })
  @ApiResponse({ status: 200, description: 'Consent log retrieved' })
  async getConsentLog(@Query('userId') userId: string) {
    return this.gdprService.getConsentLog(userId);
  }

  @Post('consent')
  @ApiOperation({ summary: 'Record user consent' })
  @ApiResponse({ status: 201, description: 'Consent recorded' })
  async recordConsent(
    @Query('userId') userId: string,
    @Query('purpose') purpose: string,
    @Query('granted') granted: boolean,
  ) {
    return this.gdprService.recordConsent(userId, purpose, granted);
  }

  @Get('data-inventory')
  @ApiOperation({ summary: 'Get data inventory for user' })
  @ApiResponse({ status: 200, description: 'Data inventory retrieved' })
  async getDataInventory(@Query('userId') userId: string) {
    return this.gdprService.getDataInventory(userId);
  }

  // DSR Request Endpoints
  @Post('dsr-requests')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a Data Subject Request' })
  @ApiResponse({ status: 201, description: 'DSR request created' })
  async createDsrRequest(
    @Body() dto: CreateDsrRequestDto,
    @Query('userId') userId: string,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
    return this.gdprService.createDsrRequest(userId, dto, ipAddress);
  }

  @Get('dsr-requests')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get DSR requests' })
  @ApiResponse({ status: 200, description: 'DSR requests retrieved' })
  async getDsrRequests(
    @Query('userId') userId?: string,
    @Query('status') status?: DsrStatus,
  ) {
    return this.gdprService.getDsrRequests(userId, status);
  }

  @Get('dsr-requests/:id')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a specific DSR request' })
  @ApiResponse({ status: 200, description: 'DSR request retrieved' })
  async getDsrRequest(@Param('id') id: string) {
    return this.gdprService.getDsrRequest(id);
  }

  @Patch('dsr-requests/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update DSR request status (Admin only)' })
  @ApiResponse({ status: 200, description: 'DSR request updated' })
  async updateDsrRequest(
    @Param('id') id: string,
    @Body() dto: UpdateDsrRequestDto,
    @Query('adminId') adminId: string,
  ) {
    return this.gdprService.updateDsrRequest(id, dto, adminId);
  }

  // Consent Management Endpoints
  @Put('consents')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user consent' })
  @ApiResponse({ status: 200, description: 'Consent updated' })
  async updateConsent(
    @Body() dto: UpdateConsentDto,
    @Query('userId') userId: string,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];
    return this.gdprService.updateConsent(userId, dto, ipAddress, userAgent);
  }

  @Get('consents')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user consents' })
  @ApiResponse({ status: 200, description: 'Consents retrieved' })
  async getUserConsents(@Query('userId') userId: string) {
    return this.gdprService.getUserConsents(userId);
  }
}
