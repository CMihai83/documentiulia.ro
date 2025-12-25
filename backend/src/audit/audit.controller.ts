import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { TenantGuard } from '../tenant/tenant.guard';
import { TenantScope } from '../tenant/tenant.decorator';
import { AuditService } from './audit.service';
import { AuditLogQueryDto, AuditLogListResponseDto, AuditLogResponseDto } from './dto/audit.dto';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @TenantScope()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get audit logs with filtering and pagination' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action type' })
  @ApiQuery({ name: 'entity', required: false, description: 'Filter by entity type' })
  @ApiQuery({ name: 'entityId', required: false, description: 'Filter by entity ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results (max 100)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  async findAll(
    @Query() query: AuditLogQueryDto,
    @Req() req: any,
  ): Promise<AuditLogListResponseDto> {
    // Automatically filter by organization context
    const organizationId = req.tenantContext?.organizationId;
    return this.auditService.findAll({
      ...query,
      organizationId,
    });
  }

  @Get('stats')
  @TenantScope()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get audit log statistics' })
  async getStats(@Req() req: any) {
    const organizationId = req.tenantContext?.organizationId;
    return this.auditService.getStats(organizationId);
  }

  @Get('actions')
  @TenantScope()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get list of distinct action types' })
  async getDistinctActions(): Promise<string[]> {
    return this.auditService.getDistinctActions();
  }

  @Get('entities')
  @TenantScope()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get list of distinct entity types' })
  async getDistinctEntities(): Promise<string[]> {
    return this.auditService.getDistinctEntities();
  }

  @Get('export')
  @TenantScope()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Export audit logs to CSV or JSON' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'], description: 'Export format (default: csv)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action type' })
  @ApiQuery({ name: 'entity', required: false, description: 'Filter by entity type' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date' })
  async exportLogs(
    @Query() query: AuditLogQueryDto & { format?: 'csv' | 'json' },
    @Req() req: any,
  ) {
    const organizationId = req.tenantContext?.organizationId;
    return this.auditService.exportAuditLogs({
      ...query,
      organizationId,
    });
  }

  @Get('compliance-summary')
  @TenantScope()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get compliance audit summary for reporting' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start of period (ISO date)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End of period (ISO date)' })
  async getComplianceSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: any,
  ) {
    const organizationId = req.tenantContext?.organizationId;
    if (!organizationId) {
      throw new NotFoundException('Organization context required');
    }
    return this.auditService.getComplianceSummary(
      organizationId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(':id')
  @TenantScope()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a specific audit log entry' })
  @ApiParam({ name: 'id', description: 'Audit log ID' })
  async findOne(@Param('id') id: string): Promise<AuditLogResponseDto> {
    const log = await this.auditService.findOne(id);
    if (!log) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }
    return log;
  }
}
