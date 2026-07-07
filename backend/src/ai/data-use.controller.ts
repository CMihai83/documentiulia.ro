import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { DataUseGuardService } from './data-use-guard.service';

/**
 * GI-AI-2 — explicit, audited authorisation for own-purpose use of an
 * organisation's data in AI training/calibration (Art 28(10)).
 */
@ApiTags('ai')
@Controller('ai/data-use')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DataUseController {
  constructor(
    private readonly guard: DataUseGuardService,
    private readonly prisma: PrismaService,
  ) {}

  private orgId(req: Request): string {
    const u: any = (req as any).user;
    return (req.headers['x-organization-id'] as string) || u?.organizationId;
  }
  private userId(req: Request): string {
    const u: any = (req as any).user;
    return u?.id || u?.sub;
  }

  @Get('authorization')
  @ApiOperation({ summary: 'Whether this org has authorised its data for AI training' })
  async get(@Req() req: Request) {
    const authorized = await this.guard.isTrainingAllowed(this.orgId(req));
    return { organizationId: this.orgId(req), aiTrainingAuthorized: authorized };
  }

  @Post('authorization')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Set/revoke AI-training authorisation for this org (admin)' })
  async set(@Req() req: Request, @Body() body: { authorized: boolean }) {
    const orgId = this.orgId(req);
    const actor = this.userId(req);
    await this.guard.setAuthorization(orgId, !!body.authorized, actor);
    await this.prisma.auditLog.create({
      data: {
        userId: actor,
        organizationId: orgId,
        action: body.authorized ? 'AI_DATA_USE_AUTHORIZED' : 'AI_DATA_USE_REVOKED',
        entity: 'Organization',
        entityId: orgId,
        details: { aiTrainingAuthorized: !!body.authorized },
        ipAddress: req.ip,
      },
    });
    return { organizationId: orgId, aiTrainingAuthorized: !!body.authorized };
  }
}
