import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import {
  AuditTrailService,
  AuditAction,
  AuditCategory,
  ComplianceFramework,
  SeverityLevel,
} from './audit-trail.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Audit & Compliance')
@Controller('compliance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuditTrailController {
  constructor(private readonly auditService: AuditTrailService) {}

  // =================== AUDIT LOG ===================

  @Post('audit')
  @ApiOperation({ summary: 'Log audit action' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        action: { type: 'string' },
        category: { type: 'string' },
        resourceType: { type: 'string' },
        userId: { type: 'string' },
        userName: { type: 'string' },
        resourceId: { type: 'string' },
        resourceName: { type: 'string' },
        oldValue: { type: 'object' },
        newValue: { type: 'object' },
        ipAddress: { type: 'string' },
        severity: { type: 'string' },
        success: { type: 'boolean' },
        complianceFlags: { type: 'array' },
      },
      required: ['tenantId', 'action', 'category', 'resourceType'],
    },
  })
  @ApiResponse({ status: 201, description: 'Action logged' })
  async logAction(
    @Body('tenantId') tenantId: string,
    @Body('action') action: AuditAction,
    @Body('category') category: AuditCategory,
    @Body('resourceType') resourceType: string,
    @Body('userId') userId?: string,
    @Body('userName') userName?: string,
    @Body('resourceId') resourceId?: string,
    @Body('resourceName') resourceName?: string,
    @Body('oldValue') oldValue?: Record<string, any>,
    @Body('newValue') newValue?: Record<string, any>,
    @Body('ipAddress') ipAddress?: string,
    @Body('userAgent') userAgent?: string,
    @Body('sessionId') sessionId?: string,
    @Body('severity') severity?: SeverityLevel,
    @Body('success') success?: boolean,
    @Body('errorMessage') errorMessage?: string,
    @Body('metadata') metadata?: Record<string, any>,
    @Body('complianceFlags') complianceFlags?: ComplianceFramework[],
  ) {
    return this.auditService.logAction(tenantId, action, category, resourceType, {
      userId, userName, resourceId, resourceName, oldValue, newValue,
      ipAddress, userAgent, sessionId, severity, success, errorMessage,
      metadata, complianceFlags,
    });
  }

  @Get('audit/:entryId')
  @ApiOperation({ summary: 'Get audit entry by ID' })
  @ApiResponse({ status: 200, description: 'Audit entry details' })
  async getAuditEntry(@Param('entryId') entryId: string) {
    const entry = await this.auditService.getAuditEntry(entryId);
    if (!entry) return { error: 'Entry not found' };
    return entry;
  }

  @Get('audit/tenant/:tenantId')
  @ApiOperation({ summary: 'Query audit log' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'resourceType', required: false })
  @ApiQuery({ name: 'resourceId', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'success', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Audit entries' })
  async queryAuditLog(
    @Param('tenantId') tenantId: string,
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('category') category?: AuditCategory,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('severity') severity?: SeverityLevel,
    @Query('success') success?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      entries: await this.auditService.queryAuditLog({
        tenantId,
        userId,
        action,
        category,
        resourceType,
        resourceId,
        severity,
        success: success !== undefined ? success === 'true' : undefined,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      }),
    };
  }

  // =================== DATA ACCESS ===================

  @Post('data-access')
  @ApiOperation({ summary: 'Log data access' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        dataType: { type: 'string' },
        dataIds: { type: 'array', items: { type: 'string' } },
        accessType: { type: 'string' },
        purpose: { type: 'string' },
        legalBasis: { type: 'string' },
        sensitiveData: { type: 'boolean' },
      },
      required: ['tenantId', 'userId', 'dataType', 'dataIds', 'accessType'],
    },
  })
  @ApiResponse({ status: 201, description: 'Access logged' })
  async logDataAccess(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('dataType') dataType: string,
    @Body('dataIds') dataIds: string[],
    @Body('accessType') accessType: 'view' | 'download' | 'export' | 'print',
    @Body('purpose') purpose?: string,
    @Body('legalBasis') legalBasis?: string,
    @Body('sensitiveData') sensitiveData?: boolean,
  ) {
    return this.auditService.logDataAccess(tenantId, userId, dataType, dataIds, accessType, {
      purpose, legalBasis, sensitiveData,
    });
  }

  @Get('data-access/:tenantId')
  @ApiOperation({ summary: 'Get data access logs' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'dataType', required: false })
  @ApiQuery({ name: 'sensitiveOnly', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Data access logs' })
  async getDataAccessLogs(
    @Param('tenantId') tenantId: string,
    @Query('userId') userId?: string,
    @Query('dataType') dataType?: string,
    @Query('sensitiveOnly') sensitiveOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      logs: await this.auditService.getDataAccessLogs(tenantId, {
        userId,
        dataType,
        sensitiveOnly: sensitiveOnly === 'true',
        limit: limit ? parseInt(limit) : undefined,
      }),
    };
  }

  // =================== CONSENT ===================

  @Post('consent')
  @ApiOperation({ summary: 'Record consent' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        subjectId: { type: 'string' },
        subjectType: { type: 'string' },
        consentType: { type: 'string' },
        version: { type: 'string' },
        method: { type: 'string' },
        proof: { type: 'string' },
      },
      required: ['tenantId', 'subjectId', 'subjectType', 'consentType', 'version', 'method'],
    },
  })
  @ApiResponse({ status: 201, description: 'Consent recorded' })
  async recordConsent(
    @Body('tenantId') tenantId: string,
    @Body('subjectId') subjectId: string,
    @Body('subjectType') subjectType: 'customer' | 'employee' | 'vendor',
    @Body('consentType') consentType: string,
    @Body('version') version: string,
    @Body('method') method: 'explicit' | 'implied' | 'opt_out',
    @Body('proof') proof?: string,
    @Body('metadata') metadata?: Record<string, any>,
  ) {
    return this.auditService.recordConsent(
      tenantId, subjectId, subjectType, consentType, version, method,
      { proof, metadata },
    );
  }

  @Post('consent/:consentId/revoke')
  @ApiOperation({ summary: 'Revoke consent' })
  @ApiResponse({ status: 200, description: 'Consent revoked' })
  async revokeConsent(@Param('consentId') consentId: string) {
    const record = await this.auditService.revokeConsent(consentId);
    if (!record) return { error: 'Consent not found or already revoked' };
    return record;
  }

  @Get('consent/:tenantId')
  @ApiOperation({ summary: 'Get consent records' })
  @ApiQuery({ name: 'subjectId', required: false })
  @ApiQuery({ name: 'consentType', required: false })
  @ApiQuery({ name: 'activeOnly', required: false })
  @ApiResponse({ status: 200, description: 'Consent records' })
  async getConsentRecords(
    @Param('tenantId') tenantId: string,
    @Query('subjectId') subjectId?: string,
    @Query('consentType') consentType?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return {
      records: await this.auditService.getConsentRecords(tenantId, {
        subjectId,
        consentType,
        activeOnly: activeOnly === 'true',
      }),
    };
  }

  @Get('consent/:tenantId/check/:subjectId/:consentType')
  @ApiOperation({ summary: 'Check consent status' })
  @ApiResponse({ status: 200, description: 'Consent status' })
  async checkConsent(
    @Param('tenantId') tenantId: string,
    @Param('subjectId') subjectId: string,
    @Param('consentType') consentType: string,
  ) {
    return this.auditService.checkConsent(tenantId, subjectId, consentType);
  }

  // =================== RETENTION ===================

  @Post('retention')
  @ApiOperation({ summary: 'Create retention policy' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        name: { type: 'string' },
        dataType: { type: 'string' },
        retentionDays: { type: 'number' },
        deletionDays: { type: 'number' },
        legalBasis: { type: 'string' },
        archiveDays: { type: 'number' },
        exceptions: { type: 'array' },
      },
      required: ['tenantId', 'name', 'dataType', 'retentionDays', 'deletionDays', 'legalBasis'],
    },
  })
  @ApiResponse({ status: 201, description: 'Policy created' })
  async createRetentionPolicy(
    @Body('tenantId') tenantId: string,
    @Body('name') name: string,
    @Body('dataType') dataType: string,
    @Body('retentionDays') retentionDays: number,
    @Body('deletionDays') deletionDays: number,
    @Body('legalBasis') legalBasis: string,
    @Body('archiveDays') archiveDays?: number,
    @Body('exceptions') exceptions?: string[],
  ) {
    return this.auditService.createRetentionPolicy(
      tenantId, name, dataType, retentionDays, deletionDays, legalBasis,
      { archiveDays, exceptions },
    );
  }

  @Get('retention/:tenantId')
  @ApiOperation({ summary: 'Get retention policies' })
  @ApiResponse({ status: 200, description: 'Retention policies' })
  async getRetentionPolicies(@Param('tenantId') tenantId: string) {
    return { policies: await this.auditService.getRetentionPolicies(tenantId) };
  }

  @Post('retention/:policyId/apply')
  @ApiOperation({ summary: 'Apply retention policy' })
  @ApiResponse({ status: 200, description: 'Policy applied' })
  async applyRetentionPolicy(@Param('policyId') policyId: string) {
    const result = await this.auditService.applyRetentionPolicy(policyId);
    if (!result) return { error: 'Policy not found' };
    return result;
  }

  // =================== REPORTS ===================

  @Post('reports')
  @ApiOperation({ summary: 'Generate compliance report' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        framework: { type: 'string' },
        reportType: { type: 'string' },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        generatedBy: { type: 'string' },
      },
      required: ['tenantId', 'framework', 'reportType', 'startDate', 'endDate', 'generatedBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Report generated' })
  async generateReport(
    @Body('tenantId') tenantId: string,
    @Body('framework') framework: ComplianceFramework,
    @Body('reportType') reportType: 'audit' | 'access' | 'consent' | 'retention' | 'breach',
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
    @Body('generatedBy') generatedBy: string,
  ) {
    return this.auditService.generateComplianceReport(
      tenantId,
      framework,
      reportType,
      { start: new Date(startDate), end: new Date(endDate) },
      generatedBy,
    );
  }

  // =================== USER ACTIVITY ===================

  @Get('activity/:tenantId/:userId')
  @ApiOperation({ summary: 'Get user activity' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'User activity' })
  async getUserActivity(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return {
      activity: await this.auditService.getUserActivity(tenantId, userId, {
        limit: limit ? parseInt(limit) : undefined,
      }),
    };
  }

  @Get('history/:tenantId/:resourceType/:resourceId')
  @ApiOperation({ summary: 'Get resource history' })
  @ApiResponse({ status: 200, description: 'Resource history' })
  async getResourceHistory(
    @Param('tenantId') tenantId: string,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return {
      history: await this.auditService.getResourceHistory(tenantId, resourceType, resourceId),
    };
  }

  // =================== METADATA ===================

  @Get('metadata/actions')
  @ApiOperation({ summary: 'Get audit actions' })
  async getActions() {
    return { actions: this.auditService.getAuditActions() };
  }

  @Get('metadata/categories')
  @ApiOperation({ summary: 'Get audit categories' })
  async getCategories() {
    return { categories: this.auditService.getAuditCategories() };
  }

  @Get('metadata/frameworks')
  @ApiOperation({ summary: 'Get compliance frameworks' })
  async getFrameworks() {
    return { frameworks: this.auditService.getComplianceFrameworks() };
  }

  @Get('metadata/severity-levels')
  @ApiOperation({ summary: 'Get severity levels' })
  async getSeverityLevels() {
    return { levels: this.auditService.getSeverityLevels() };
  }
}
