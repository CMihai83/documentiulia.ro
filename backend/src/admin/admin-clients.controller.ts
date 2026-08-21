import { Body, Controller, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Tier, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminClientsService } from './admin-clients.service';

/**
 * REQ-049 A1 — staff back-office: overview, client search, client-360,
 * account changes. Reads for ADMIN + ACCOUNTANT (staff), mutations ADMIN only.
 */
@ApiTags('admin-clients')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminClientsController {
  constructor(private readonly clients: AdminClientsService) {}

  @Get('overview')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Back-office KPIs' })
  overview() {
    return this.clients.overview();
  }

  @Get('clients')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Search clients' })
  list(
    @Query('search') search?: string,
    @Query('tier') tier?: Tier,
    @Query('role') role?: UserRole,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.clients.list({ search, tier, role, page: Number(page), limit: Number(limit) });
  }

  @Get('clients/:id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Client 360' })
  get(@Param('id') id: string) {
    return this.clients.get360(id);
  }

  @Patch('clients/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Change tier / role (audited)' })
  update(@Request() req: any, @Param('id') id: string, @Body() body: { tier?: Tier; role?: UserRole; reason?: string }) {
    return this.clients.update(req.user.sub, id, body);
  }
}
