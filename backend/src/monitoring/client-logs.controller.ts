import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { ClientErrorInput, ClientLogsService } from './client-logs.service';

/**
 * Public ingest for frontend errors. Deliberately unauthenticated (errors happen
 * on the login page too) but tightly throttled and size-capped; if a JWT happens
 * to be attached the user is recorded via the optional guard-less req.user probe.
 */
@Controller('client-logs')
@UseGuards(ThrottlerGuard)
export class ClientLogsIngestController {
  constructor(private readonly logs: ClientLogsService) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } }) // 30 batches/min/IP
  ingest(@Request() req: any, @Body() body: { errors: ClientErrorInput[] }) {
    const userId = req.user?.id ?? undefined;
    const orgId = req.user?.activeOrganizationId ?? req.headers?.['x-organization-id'] ?? undefined;
    return this.logs.ingest(body?.errors ?? [], userId, orgId);
  }
}

/** Admin-only viewer. */
@Controller('admin/client-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ClientLogsAdminController {
  constructor(private readonly logs: ClientLogsService) {}

  @Get()
  list(
    @Query('source') source?: string,
    @Query('level') level?: string,
    @Query('take') take?: string,
    @Query('before') before?: string,
    @Query('q') q?: string,
  ) {
    return this.logs.list({ source, level, take: take ? parseInt(take, 10) : undefined, before, q });
  }

  @Get('stats')
  stats() {
    return this.logs.stats();
  }
}
