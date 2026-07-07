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
  UseGuards,
  Req,
  ForbiddenException,
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

  /**
   * Identity comes from the JWT, never from the client. A non-admin always acts
   * as themselves; an ADMIN may act on behalf of another user by passing
   * ?userId= (the legitimate DPO/admin fulfilment flow).
   */
  private effectiveUserId(req: Request, requestedUserId?: string): string {
    const authUser: any = (req as any).user;
    const selfId = authUser?.id || authUser?.sub;
    if (!requestedUserId || requestedUserId === selfId) return selfId;
    if (authUser?.role === UserRole.ADMIN) return requestedUserId;
    throw new ForbiddenException('You may only access your own data');
  }

  private authUserId(req: Request): string {
    const authUser: any = (req as any).user;
    return authUser?.id || authUser?.sub;
  }

  @Get('export')
  @ApiOperation({ summary: 'Export all user data (GDPR Article 20 - Data Portability)' })
  @ApiResponse({ status: 200, description: 'User data exported successfully' })
  async exportUserData(
    @Req() req: Request,
    @Res() res: Response,
    @Query('userId') requestedUserId?: string,
  ) {
    const userId = this.effectiveUserId(req, requestedUserId);
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
  async deleteUserData(@Req() req: Request, @Query('userId') requestedUserId?: string) {
    return this.gdprService.deleteUserData(this.effectiveUserId(req, requestedUserId));
  }

  @Get('consent-log')
  @ApiOperation({ summary: 'Get user consent history' })
  @ApiResponse({ status: 200, description: 'Consent log retrieved' })
  async getConsentLog(@Req() req: Request, @Query('userId') requestedUserId?: string) {
    return this.gdprService.getConsentLog(this.effectiveUserId(req, requestedUserId));
  }

  @Post('consent')
  @ApiOperation({ summary: 'Record user consent' })
  @ApiResponse({ status: 201, description: 'Consent recorded' })
  async recordConsent(
    @Req() req: Request,
    @Query('purpose') purpose: string,
    @Query('granted') granted: boolean,
    @Query('userId') requestedUserId?: string,
  ) {
    return this.gdprService.recordConsent(this.effectiveUserId(req, requestedUserId), purpose, granted);
  }

  @Get('data-inventory')
  @ApiOperation({ summary: 'Get data inventory for user' })
  @ApiResponse({ status: 200, description: 'Data inventory retrieved' })
  async getDataInventory(@Req() req: Request, @Query('userId') requestedUserId?: string) {
    return this.gdprService.getDataInventory(this.effectiveUserId(req, requestedUserId));
  }

  // DSR Request Endpoints
  @Post('dsr-requests')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a Data Subject Request' })
  @ApiResponse({ status: 201, description: 'DSR request created' })
  async createDsrRequest(
    @Body() dto: CreateDsrRequestDto,
    @Req() req: Request,
    @Query('userId') requestedUserId?: string,
  ) {
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string);
    return this.gdprService.createDsrRequest(this.effectiveUserId(req, requestedUserId), dto, ipAddress);
  }

  @Get('dsr-requests')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get DSR requests' })
  @ApiResponse({ status: 200, description: 'DSR requests retrieved' })
  async getDsrRequests(
    @Req() req: Request,
    @Query('userId') requestedUserId?: string,
    @Query('status') status?: DsrStatus,
  ) {
    const authUser: any = (req as any).user;
    // Admins may list all requests (no userId filter); users only their own.
    if (authUser?.role === UserRole.ADMIN) {
      return this.gdprService.getDsrRequests(requestedUserId, status);
    }
    return this.gdprService.getDsrRequests(this.authUserId(req), status);
  }

  @Get('dsr-requests/:id')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a specific DSR request' })
  @ApiResponse({ status: 200, description: 'DSR request retrieved' })
  async getDsrRequest(@Param('id') id: string, @Req() req: Request) {
    const request = await this.gdprService.getDsrRequest(id);
    const authUser: any = (req as any).user;
    if (authUser?.role !== UserRole.ADMIN && request?.userId !== this.authUserId(req)) {
      throw new ForbiddenException('You may only access your own requests');
    }
    return request;
  }

  @Patch('dsr-requests/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update DSR request status (Admin only)' })
  @ApiResponse({ status: 200, description: 'DSR request updated' })
  async updateDsrRequest(
    @Param('id') id: string,
    @Body() dto: UpdateDsrRequestDto,
    @Req() req: Request,
  ) {
    // adminId comes from the authenticated admin's JWT, never the client.
    return this.gdprService.updateDsrRequest(id, dto, this.authUserId(req));
  }

  // Consent Management Endpoints
  @Put('consents')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user consent' })
  @ApiResponse({ status: 200, description: 'Consent updated' })
  async updateConsent(
    @Body() dto: UpdateConsentDto,
    @Req() req: Request,
    @Query('userId') requestedUserId?: string,
  ) {
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];
    return this.gdprService.updateConsent(this.effectiveUserId(req, requestedUserId), dto, ipAddress, userAgent);
  }

  @Get('consents')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user consents' })
  @ApiResponse({ status: 200, description: 'Consents retrieved' })
  async getUserConsents(@Req() req: Request, @Query('userId') requestedUserId?: string) {
    return this.gdprService.getUserConsents(this.effectiveUserId(req, requestedUserId));
  }
}
