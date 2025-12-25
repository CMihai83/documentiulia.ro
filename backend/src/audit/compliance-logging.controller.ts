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
  ComplianceLoggingService,
  ComplianceStandard,
  LogSeverity,
  RetentionAction,
  AlertCondition,
  AlertStatus,
} from './compliance-logging.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Compliance Logging')
@Controller('compliance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ComplianceLoggingController {
  constructor(private readonly complianceService: ComplianceLoggingService) {}

  // =================== LOGGING ===================

  @Post('logs')
  @ApiOperation({ summary: 'Create compliance log entry' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        standard: { type: 'string', enum: ['GDPR', 'ANAF', 'SOC2', 'ISO27001', 'PCIDSS'] },
        category: { type: 'string' },
        action: { type: 'string' },
        resource: { type: 'string' },
        resourceId: { type: 'string' },
        severity: { type: 'string', enum: ['info', 'warning', 'error', 'critical'] },
        description: { type: 'string' },
        data: { type: 'object' },
        outcome: { type: 'string', enum: ['success', 'failure', 'partial'] },
        sessionId: { type: 'string' },
        ipAddress: { type: 'string' },
        userAgent: { type: 'string' },
      },
      required: ['tenantId', 'userId', 'standard', 'category', 'action', 'resource'],
    },
  })
  @ApiResponse({ status: 201, description: 'Log entry created' })
  async createLog(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('standard') standard: ComplianceStandard,
    @Body('category') category: string,
    @Body('action') action: string,
    @Body('resource') resource: string,
    @Body('resourceId') resourceId?: string,
    @Body('severity') severity?: LogSeverity,
    @Body('description') description?: string,
    @Body('data') data?: Record<string, any>,
    @Body('outcome') outcome?: 'success' | 'failure' | 'partial',
    @Body('sessionId') sessionId?: string,
    @Body('ipAddress') ipAddress?: string,
    @Body('userAgent') userAgent?: string,
  ) {
    return this.complianceService.log(tenantId, userId, standard, category, action, resource, {
      resourceId,
      severity,
      description,
      data,
      outcome,
      sessionId,
      ipAddress,
      userAgent,
    });
  }

  @Get('logs/:logId')
  @ApiOperation({ summary: 'Get log entry by ID' })
  @ApiResponse({ status: 200, description: 'Log entry details' })
  async getLog(@Param('logId') logId: string) {
    const log = await this.complianceService.getLog(logId);
    if (!log) {
      return { error: 'Log not found' };
    }
    return log;
  }

  @Get('logs/tenant/:tenantId')
  @ApiOperation({ summary: 'Get logs for tenant' })
  @ApiQuery({ name: 'standard', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of logs' })
  async getLogs(
    @Param('tenantId') tenantId: string,
    @Query('standard') standard?: ComplianceStandard,
    @Query('category') category?: string,
    @Query('action') action?: string,
    @Query('severity') severity?: LogSeverity,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      logs: await this.complianceService.getLogs(
        tenantId,
        {
          standard,
          category,
          action,
          severity,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          userId,
        },
        limit ? parseInt(limit) : 100,
      ),
    };
  }

  // =================== GDPR SPECIFIC ===================

  @Post('gdpr/data-access')
  @ApiOperation({ summary: 'Log GDPR data access' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        resource: { type: 'string' },
        resourceId: { type: 'string' },
        accessType: { type: 'string', enum: ['view', 'export', 'modify', 'delete'] },
        details: { type: 'object' },
      },
      required: ['tenantId', 'userId', 'resource', 'resourceId', 'accessType'],
    },
  })
  @ApiResponse({ status: 201, description: 'Data access logged' })
  async logDataAccess(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('resource') resource: string,
    @Body('resourceId') resourceId: string,
    @Body('accessType') accessType: 'view' | 'export' | 'modify' | 'delete',
    @Body('details') details?: Record<string, any>,
  ) {
    return this.complianceService.logDataAccess(
      tenantId,
      userId,
      resource,
      resourceId,
      accessType,
      details,
    );
  }

  @Post('gdpr/consent')
  @ApiOperation({ summary: 'Log consent change' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        consentType: { type: 'string' },
        newValue: { type: 'boolean' },
        details: { type: 'object' },
      },
      required: ['tenantId', 'userId', 'consentType', 'newValue'],
    },
  })
  @ApiResponse({ status: 201, description: 'Consent change logged' })
  async logConsentChange(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('consentType') consentType: string,
    @Body('newValue') newValue: boolean,
    @Body('details') details?: Record<string, any>,
  ) {
    return this.complianceService.logConsentChange(tenantId, userId, consentType, newValue, details);
  }

  @Post('gdpr/data-export')
  @ApiOperation({ summary: 'Log data export request' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        requestedBy: { type: 'string' },
        dataTypes: { type: 'array', items: { type: 'string' } },
        format: { type: 'string' },
      },
      required: ['tenantId', 'userId', 'requestedBy', 'dataTypes', 'format'],
    },
  })
  @ApiResponse({ status: 201, description: 'Data export logged' })
  async logDataExport(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('requestedBy') requestedBy: string,
    @Body('dataTypes') dataTypes: string[],
    @Body('format') format: string,
  ) {
    return this.complianceService.logDataExport(tenantId, userId, requestedBy, dataTypes, format);
  }

  @Post('gdpr/data-deletion')
  @ApiOperation({ summary: 'Log data deletion' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        resource: { type: 'string' },
        resourceId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['tenantId', 'userId', 'resource', 'resourceId', 'reason'],
    },
  })
  @ApiResponse({ status: 201, description: 'Data deletion logged' })
  async logDataDeletion(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('resource') resource: string,
    @Body('resourceId') resourceId: string,
    @Body('reason') reason: string,
  ) {
    return this.complianceService.logDataDeletion(tenantId, userId, resource, resourceId, reason);
  }

  // =================== ANAF SPECIFIC ===================

  @Post('anaf/declaration')
  @ApiOperation({ summary: 'Log ANAF declaration submission' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        declarationType: { type: 'string' },
        period: { type: 'string' },
        outcome: { type: 'string', enum: ['success', 'failure', 'partial'] },
        details: { type: 'object' },
      },
      required: ['tenantId', 'userId', 'declarationType', 'period', 'outcome'],
    },
  })
  @ApiResponse({ status: 201, description: 'Declaration logged' })
  async logDeclarationSubmission(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('declarationType') declarationType: string,
    @Body('period') period: string,
    @Body('outcome') outcome: 'success' | 'failure' | 'partial',
    @Body('details') details?: Record<string, any>,
  ) {
    return this.complianceService.logDeclarationSubmission(
      tenantId,
      userId,
      declarationType,
      period,
      outcome,
      details,
    );
  }

  @Post('anaf/efactura')
  @ApiOperation({ summary: 'Log e-Factura operation' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        operation: { type: 'string', enum: ['upload', 'download', 'validate', 'sign'] },
        invoiceNumber: { type: 'string' },
        outcome: { type: 'string', enum: ['success', 'failure'] },
        details: { type: 'object' },
      },
      required: ['tenantId', 'userId', 'operation', 'invoiceNumber', 'outcome'],
    },
  })
  @ApiResponse({ status: 201, description: 'e-Factura operation logged' })
  async logEfacturaOperation(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('operation') operation: 'upload' | 'download' | 'validate' | 'sign',
    @Body('invoiceNumber') invoiceNumber: string,
    @Body('outcome') outcome: 'success' | 'failure',
    @Body('details') details?: Record<string, any>,
  ) {
    return this.complianceService.logEfacturaOperation(
      tenantId,
      userId,
      operation,
      invoiceNumber,
      outcome,
      details,
    );
  }

  @Post('anaf/saft')
  @ApiOperation({ summary: 'Log SAF-T generation' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        period: { type: 'string' },
        outcome: { type: 'string', enum: ['success', 'failure'] },
        fileSize: { type: 'number' },
        recordCount: { type: 'number' },
      },
      required: ['tenantId', 'userId', 'period', 'outcome'],
    },
  })
  @ApiResponse({ status: 201, description: 'SAF-T generation logged' })
  async logSaftGeneration(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('period') period: string,
    @Body('outcome') outcome: 'success' | 'failure',
    @Body('fileSize') fileSize?: number,
    @Body('recordCount') recordCount?: number,
  ) {
    return this.complianceService.logSaftGeneration(
      tenantId,
      userId,
      period,
      outcome,
      fileSize,
      recordCount,
    );
  }

  // =================== SECURITY LOGGING ===================

  @Post('security/authentication')
  @ApiOperation({ summary: 'Log authentication event' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        outcome: { type: 'string', enum: ['success', 'failure'] },
        method: { type: 'string' },
        ipAddress: { type: 'string' },
        userAgent: { type: 'string' },
        details: { type: 'object' },
      },
      required: ['tenantId', 'userId', 'outcome', 'method'],
    },
  })
  @ApiResponse({ status: 201, description: 'Authentication logged' })
  async logAuthentication(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('outcome') outcome: 'success' | 'failure',
    @Body('method') method: string,
    @Body('ipAddress') ipAddress?: string,
    @Body('userAgent') userAgent?: string,
    @Body('details') details?: Record<string, any>,
  ) {
    return this.complianceService.logAuthentication(
      tenantId,
      userId,
      outcome,
      method,
      ipAddress,
      userAgent,
      details,
    );
  }

  @Post('security/permission-change')
  @ApiOperation({ summary: 'Log permission change' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        targetUserId: { type: 'string' },
        permission: { type: 'string' },
        action: { type: 'string', enum: ['grant', 'revoke'] },
      },
      required: ['tenantId', 'userId', 'targetUserId', 'permission', 'action'],
    },
  })
  @ApiResponse({ status: 201, description: 'Permission change logged' })
  async logPermissionChange(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('targetUserId') targetUserId: string,
    @Body('permission') permission: string,
    @Body('action') action: 'grant' | 'revoke',
  ) {
    return this.complianceService.logPermissionChange(
      tenantId,
      userId,
      targetUserId,
      permission,
      action,
    );
  }

  @Post('security/incident')
  @ApiOperation({ summary: 'Log security incident' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        incidentType: { type: 'string' },
        severity: { type: 'string', enum: ['info', 'warning', 'error', 'critical'] },
        description: { type: 'string' },
        details: { type: 'object' },
      },
      required: ['tenantId', 'userId', 'incidentType', 'severity', 'description'],
    },
  })
  @ApiResponse({ status: 201, description: 'Incident logged' })
  async logSecurityIncident(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('incidentType') incidentType: string,
    @Body('severity') severity: LogSeverity,
    @Body('description') description: string,
    @Body('details') details?: Record<string, any>,
  ) {
    return this.complianceService.logSecurityIncident(
      tenantId,
      userId,
      incidentType,
      severity,
      description,
      details,
    );
  }

  // =================== RETENTION POLICIES ===================

  @Post('retention-policies')
  @ApiOperation({ summary: 'Create retention policy' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        standard: { type: 'string', enum: ['GDPR', 'ANAF', 'SOC2', 'ISO27001', 'PCIDSS'] },
        retentionDays: { type: 'number' },
        action: { type: 'string', enum: ['archive', 'delete', 'anonymize'] },
      },
      required: ['tenantId', 'standard', 'retentionDays', 'action'],
    },
  })
  @ApiResponse({ status: 201, description: 'Policy created' })
  async createRetentionPolicy(
    @Body('tenantId') tenantId: string,
    @Body('standard') standard: ComplianceStandard,
    @Body('retentionDays') retentionDays: number,
    @Body('action') action: RetentionAction,
  ) {
    return this.complianceService.createRetentionPolicy(tenantId, standard, retentionDays, action);
  }

  @Get('retention-policies/:tenantId')
  @ApiOperation({ summary: 'Get retention policies for tenant' })
  @ApiResponse({ status: 200, description: 'List of retention policies' })
  async getRetentionPolicies(@Param('tenantId') tenantId: string) {
    return { policies: await this.complianceService.getRetentionPolicies(tenantId) };
  }

  @Put('retention-policies/:policyId')
  @ApiOperation({ summary: 'Update retention policy' })
  @ApiResponse({ status: 200, description: 'Policy updated' })
  async updateRetentionPolicy(
    @Param('policyId') policyId: string,
    @Body() updates: Record<string, any>,
  ) {
    const policy = await this.complianceService.updateRetentionPolicy(policyId, updates);
    if (!policy) {
      return { error: 'Policy not found' };
    }
    return policy;
  }

  @Post('retention-policies/:tenantId/apply')
  @ApiOperation({ summary: 'Apply retention policies' })
  @ApiResponse({ status: 200, description: 'Policies applied' })
  async applyRetentionPolicies(@Param('tenantId') tenantId: string) {
    return this.complianceService.applyRetentionPolicies(tenantId);
  }

  // =================== ALERTS ===================

  @Post('alert-rules')
  @ApiOperation({ summary: 'Create alert rule' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        condition: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['threshold', 'pattern', 'frequency', 'anomaly'] },
            threshold: { type: 'number' },
            timeWindowMinutes: { type: 'number' },
            pattern: { type: 'string' },
          },
        },
        standard: { type: 'string' },
        severity: { type: 'string' },
        category: { type: 'string' },
        action: { type: 'string' },
        notifyUsers: { type: 'array', items: { type: 'string' } },
      },
      required: ['tenantId', 'name', 'description', 'condition'],
    },
  })
  @ApiResponse({ status: 201, description: 'Alert rule created' })
  async createAlertRule(
    @Body('tenantId') tenantId: string,
    @Body('name') name: string,
    @Body('description') description: string,
    @Body('condition') condition: AlertCondition,
    @Body('standard') standard?: ComplianceStandard,
    @Body('severity') severity?: LogSeverity,
    @Body('category') category?: string,
    @Body('action') action?: string,
    @Body('notifyUsers') notifyUsers?: string[],
  ) {
    return this.complianceService.createAlertRule(tenantId, name, description, condition, {
      standard,
      severity,
      category,
      action,
      notifyUsers,
    });
  }

  @Get('alert-rules/:tenantId')
  @ApiOperation({ summary: 'Get alert rules for tenant' })
  @ApiResponse({ status: 200, description: 'List of alert rules' })
  async getAlertRules(@Param('tenantId') tenantId: string) {
    return { rules: await this.complianceService.getAlertRules(tenantId) };
  }

  @Delete('alert-rules/:ruleId')
  @ApiOperation({ summary: 'Delete alert rule' })
  @ApiResponse({ status: 200, description: 'Rule deleted' })
  async deleteAlertRule(@Param('ruleId') ruleId: string) {
    const success = await this.complianceService.deleteAlertRule(ruleId);
    return { success };
  }

  @Get('alerts/:tenantId')
  @ApiOperation({ summary: 'Get alerts for tenant' })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'List of alerts' })
  async getAlerts(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: AlertStatus,
  ) {
    return { alerts: await this.complianceService.getAlerts(tenantId, status) };
  }

  @Post('alerts/:alertId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge alert' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { userId: { type: 'string' } },
      required: ['userId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  async acknowledgeAlert(
    @Param('alertId') alertId: string,
    @Body('userId') userId: string,
  ) {
    const alert = await this.complianceService.acknowledgeAlert(alertId, userId);
    if (!alert) {
      return { error: 'Alert not found' };
    }
    return alert;
  }

  @Post('alerts/:alertId/resolve')
  @ApiOperation({ summary: 'Resolve alert' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { userId: { type: 'string' } },
      required: ['userId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  async resolveAlert(
    @Param('alertId') alertId: string,
    @Body('userId') userId: string,
  ) {
    const alert = await this.complianceService.resolveAlert(alertId, userId);
    if (!alert) {
      return { error: 'Alert not found' };
    }
    return alert;
  }

  // =================== INTEGRITY ===================

  @Get('integrity/:tenantId')
  @ApiOperation({ summary: 'Verify log integrity' })
  @ApiResponse({ status: 200, description: 'Integrity check result' })
  async verifyLogIntegrity(@Param('tenantId') tenantId: string) {
    return this.complianceService.verifyLogIntegrity(tenantId);
  }

  // =================== REPORTS ===================

  @Post('reports')
  @ApiOperation({ summary: 'Generate compliance report' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        standard: { type: 'string', enum: ['GDPR', 'ANAF', 'SOC2', 'ISO27001', 'PCIDSS'] },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        generatedBy: { type: 'string' },
      },
      required: ['tenantId', 'standard', 'startDate', 'endDate', 'generatedBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Report generated' })
  async generateComplianceReport(
    @Body('tenantId') tenantId: string,
    @Body('standard') standard: ComplianceStandard,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
    @Body('generatedBy') generatedBy: string,
  ) {
    return this.complianceService.generateComplianceReport(
      tenantId,
      standard,
      { start: new Date(startDate), end: new Date(endDate) },
      generatedBy,
    );
  }

  @Get('reports/:tenantId')
  @ApiOperation({ summary: 'Get compliance reports' })
  @ApiQuery({ name: 'standard', required: false })
  @ApiResponse({ status: 200, description: 'List of reports' })
  async getReports(
    @Param('tenantId') tenantId: string,
    @Query('standard') standard?: ComplianceStandard,
  ) {
    return { reports: await this.complianceService.getReports(tenantId, standard) };
  }

  // =================== EXPORT ===================

  @Post('export')
  @ApiOperation({ summary: 'Export compliance logs' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        standard: { type: 'string', enum: ['GDPR', 'ANAF', 'SOC2', 'ISO27001', 'PCIDSS'] },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        format: { type: 'string', enum: ['json', 'csv'] },
      },
      required: ['tenantId', 'standard', 'startDate', 'endDate', 'format'],
    },
  })
  @ApiResponse({ status: 200, description: 'Export data' })
  async exportLogs(
    @Body('tenantId') tenantId: string,
    @Body('standard') standard: ComplianceStandard,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
    @Body('format') format: 'json' | 'csv',
  ) {
    return this.complianceService.exportLogs(
      tenantId,
      standard,
      { start: new Date(startDate), end: new Date(endDate) },
      format,
    );
  }

  // =================== STATISTICS ===================

  @Get('stats/:tenantId')
  @ApiOperation({ summary: 'Get compliance statistics' })
  @ApiResponse({ status: 200, description: 'Compliance stats' })
  async getComplianceStats(@Param('tenantId') tenantId: string) {
    return { stats: await this.complianceService.getComplianceStats(tenantId) };
  }

  // =================== METADATA ===================

  @Get('metadata/standards')
  @ApiOperation({ summary: 'Get compliance standards' })
  @ApiResponse({ status: 200, description: 'Available standards' })
  async getComplianceStandards() {
    return { standards: this.complianceService.getComplianceStandards() };
  }

  @Get('metadata/severities')
  @ApiOperation({ summary: 'Get log severities' })
  @ApiResponse({ status: 200, description: 'Available severities' })
  async getLogSeverities() {
    return { severities: this.complianceService.getLogSeverities() };
  }
}
