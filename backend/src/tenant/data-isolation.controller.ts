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
  DataIsolationService,
  IsolationLevel,
  DataClassification,
  AccessType,
  AccessCondition,
} from './data-isolation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Data Isolation')
@Controller('isolation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DataIsolationController {
  constructor(private readonly isolationService: DataIsolationService) {}

  // =================== POLICIES ===================

  @Post('policies')
  @ApiOperation({ summary: 'Create isolation policy' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        tenantId: { type: 'string' },
        level: { type: 'string', enum: ['strict', 'standard', 'relaxed'] },
        dataClassifications: { type: 'array', items: { type: 'string' } },
        encryptionRequired: { type: 'boolean' },
        auditRequired: { type: 'boolean' },
        retentionDays: { type: 'number' },
        allowedExportFormats: { type: 'array', items: { type: 'string' } },
        ipWhitelist: { type: 'array', items: { type: 'string' } },
      },
      required: ['name', 'tenantId', 'level'],
    },
  })
  @ApiResponse({ status: 201, description: 'Policy created' })
  async createPolicy(
    @Body('name') name: string,
    @Body('tenantId') tenantId: string,
    @Body('level') level: IsolationLevel,
    @Body('dataClassifications') dataClassifications?: DataClassification[],
    @Body('encryptionRequired') encryptionRequired?: boolean,
    @Body('auditRequired') auditRequired?: boolean,
    @Body('retentionDays') retentionDays?: number,
    @Body('allowedExportFormats') allowedExportFormats?: string[],
    @Body('ipWhitelist') ipWhitelist?: string[],
  ) {
    return this.isolationService.createPolicy(name, tenantId, level, {
      dataClassifications,
      encryptionRequired,
      auditRequired,
      retentionDays,
      allowedExportFormats,
      ipWhitelist,
    });
  }

  @Get('policies/:policyId')
  @ApiOperation({ summary: 'Get policy by ID' })
  @ApiResponse({ status: 200, description: 'Policy details' })
  async getPolicy(@Param('policyId') policyId: string) {
    const policy = await this.isolationService.getPolicy(policyId);
    if (!policy) {
      return { error: 'Policy not found' };
    }
    return policy;
  }

  @Get('policies/tenant/:tenantId')
  @ApiOperation({ summary: 'Get tenant policy' })
  @ApiResponse({ status: 200, description: 'Tenant policy' })
  async getTenantPolicy(@Param('tenantId') tenantId: string) {
    const policy = await this.isolationService.getTenantPolicy(tenantId);
    return policy || { message: 'Using default policy' };
  }

  @Put('policies/:policyId')
  @ApiOperation({ summary: 'Update policy' })
  @ApiResponse({ status: 200, description: 'Policy updated' })
  async updatePolicy(
    @Param('policyId') policyId: string,
    @Body() updates: Record<string, any>,
  ) {
    const policy = await this.isolationService.updatePolicy(policyId, updates);
    if (!policy) {
      return { error: 'Policy not found' };
    }
    return policy;
  }

  @Delete('policies/:policyId')
  @ApiOperation({ summary: 'Delete policy' })
  @ApiResponse({ status: 200, description: 'Policy deleted' })
  async deletePolicy(@Param('policyId') policyId: string) {
    const success = await this.isolationService.deletePolicy(policyId);
    return { success };
  }

  // =================== ACCESS RULES ===================

  @Post('rules')
  @ApiOperation({ summary: 'Create access rule' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        policyId: { type: 'string' },
        resource: { type: 'string' },
        action: { type: 'string' },
        allow: { type: 'boolean' },
        conditions: { type: 'array' },
        priority: { type: 'number' },
      },
      required: ['policyId', 'resource', 'action', 'allow'],
    },
  })
  @ApiResponse({ status: 201, description: 'Rule created' })
  async createAccessRule(
    @Body('policyId') policyId: string,
    @Body('resource') resource: string,
    @Body('action') action: AccessType,
    @Body('allow') allow: boolean,
    @Body('conditions') conditions?: AccessCondition[],
    @Body('priority') priority?: number,
  ) {
    return this.isolationService.createAccessRule(
      policyId,
      resource,
      action,
      allow,
      conditions,
      priority,
    );
  }

  @Get('rules/:policyId')
  @ApiOperation({ summary: 'Get access rules for policy' })
  @ApiResponse({ status: 200, description: 'List of rules' })
  async getAccessRules(@Param('policyId') policyId: string) {
    return { rules: await this.isolationService.getAccessRules(policyId) };
  }

  @Delete('rules/:ruleId')
  @ApiOperation({ summary: 'Delete access rule' })
  @ApiResponse({ status: 200, description: 'Rule deleted' })
  async deleteAccessRule(@Param('ruleId') ruleId: string) {
    const success = await this.isolationService.deleteAccessRule(ruleId);
    return { success };
  }

  // =================== ACCESS CONTROL ===================

  @Post('check-access')
  @ApiOperation({ summary: 'Check access permission' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        resource: { type: 'string' },
        action: { type: 'string' },
        targetTenantId: { type: 'string' },
        ipAddress: { type: 'string' },
      },
      required: ['tenantId', 'userId', 'resource', 'action'],
    },
  })
  @ApiResponse({ status: 200, description: 'Access check result' })
  async checkAccess(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('resource') resource: string,
    @Body('action') action: AccessType,
    @Body('targetTenantId') targetTenantId?: string,
    @Body('ipAddress') ipAddress?: string,
  ) {
    return this.isolationService.checkAccess(
      tenantId,
      userId,
      resource,
      action,
      targetTenantId,
      ipAddress,
    );
  }

  @Get('access-log/:tenantId')
  @ApiOperation({ summary: 'Get access log' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Access log' })
  async getAccessLog(
    @Param('tenantId') tenantId: string,
    @Query('limit') limit?: string,
  ) {
    return {
      log: await this.isolationService.getAccessLog(
        tenantId,
        limit ? parseInt(limit) : 100,
      ),
    };
  }

  // =================== CROSS-TENANT REQUESTS ===================

  @Post('cross-tenant/request')
  @ApiOperation({ summary: 'Request cross-tenant access' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceTenantId: { type: 'string' },
        targetTenantId: { type: 'string' },
        resource: { type: 'string' },
        action: { type: 'string' },
        requestedBy: { type: 'string' },
        reason: { type: 'string' },
        expirationHours: { type: 'number' },
      },
      required: ['sourceTenantId', 'targetTenantId', 'resource', 'action', 'requestedBy', 'reason'],
    },
  })
  @ApiResponse({ status: 201, description: 'Request created' })
  async requestCrossTenantAccess(
    @Body('sourceTenantId') sourceTenantId: string,
    @Body('targetTenantId') targetTenantId: string,
    @Body('resource') resource: string,
    @Body('action') action: AccessType,
    @Body('requestedBy') requestedBy: string,
    @Body('reason') reason: string,
    @Body('expirationHours') expirationHours?: number,
  ) {
    return this.isolationService.requestCrossTenantAccess(
      sourceTenantId,
      targetTenantId,
      resource,
      action,
      requestedBy,
      reason,
      expirationHours,
    );
  }

  @Post('cross-tenant/:requestId/approve')
  @ApiOperation({ summary: 'Approve cross-tenant request' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { approvedBy: { type: 'string' } },
      required: ['approvedBy'],
    },
  })
  @ApiResponse({ status: 200, description: 'Request approved' })
  async approveCrossTenantRequest(
    @Param('requestId') requestId: string,
    @Body('approvedBy') approvedBy: string,
  ) {
    const request = await this.isolationService.approveCrossTenantRequest(requestId, approvedBy);
    if (!request) {
      return { error: 'Request not found or not pending' };
    }
    return request;
  }

  @Post('cross-tenant/:requestId/reject')
  @ApiOperation({ summary: 'Reject cross-tenant request' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { approvedBy: { type: 'string' } },
      required: ['approvedBy'],
    },
  })
  @ApiResponse({ status: 200, description: 'Request rejected' })
  async rejectCrossTenantRequest(
    @Param('requestId') requestId: string,
    @Body('approvedBy') approvedBy: string,
  ) {
    const request = await this.isolationService.rejectCrossTenantRequest(requestId, approvedBy);
    if (!request) {
      return { error: 'Request not found or not pending' };
    }
    return request;
  }

  @Get('cross-tenant/pending/:tenantId')
  @ApiOperation({ summary: 'Get pending cross-tenant requests' })
  @ApiResponse({ status: 200, description: 'Pending requests' })
  async getPendingCrossTenantRequests(@Param('tenantId') tenantId: string) {
    return {
      requests: await this.isolationService.getPendingCrossTenantRequests(tenantId),
    };
  }

  // =================== ENCRYPTION ===================

  @Post('encryption/keys/:tenantId')
  @ApiOperation({ summary: 'Create encryption key for tenant' })
  @ApiResponse({ status: 201, description: 'Key created' })
  async createEncryptionKey(@Param('tenantId') tenantId: string) {
    return this.isolationService.createEncryptionKey(tenantId);
  }

  @Get('encryption/keys/:tenantId')
  @ApiOperation({ summary: 'Get encryption key for tenant' })
  @ApiResponse({ status: 200, description: 'Encryption key info' })
  async getEncryptionKey(@Param('tenantId') tenantId: string) {
    const key = await this.isolationService.getEncryptionKey(tenantId);
    if (!key) {
      return { error: 'No active key found' };
    }
    // Don't return the actual key material
    return { keyId: key.keyId, version: key.version, status: key.status };
  }

  @Post('encryption/keys/:tenantId/rotate')
  @ApiOperation({ summary: 'Rotate encryption key' })
  @ApiResponse({ status: 200, description: 'Key rotated' })
  async rotateEncryptionKey(@Param('tenantId') tenantId: string) {
    const key = await this.isolationService.rotateEncryptionKey(tenantId);
    if (!key) {
      return { error: 'Failed to rotate key' };
    }
    return { keyId: key.keyId, version: key.version };
  }

  // =================== DATA MASKING ===================

  @Post('masking/rules')
  @ApiOperation({ summary: 'Create masking rule' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        field: { type: 'string' },
        pattern: { type: 'string' },
        replacement: { type: 'string' },
        applyTo: { type: 'array', items: { type: 'string' } },
      },
      required: ['tenantId', 'field', 'pattern', 'replacement', 'applyTo'],
    },
  })
  @ApiResponse({ status: 201, description: 'Rule created' })
  async createMaskingRule(
    @Body('tenantId') tenantId: string,
    @Body('field') field: string,
    @Body('pattern') pattern: string,
    @Body('replacement') replacement: string,
    @Body('applyTo') applyTo: string[],
  ) {
    return this.isolationService.createMaskingRule(
      tenantId,
      field,
      pattern,
      replacement,
      applyTo,
    );
  }

  @Get('masking/rules/:tenantId')
  @ApiOperation({ summary: 'Get masking rules for tenant' })
  @ApiResponse({ status: 200, description: 'List of masking rules' })
  async getMaskingRules(@Param('tenantId') tenantId: string) {
    return { rules: await this.isolationService.getMaskingRules(tenantId) };
  }

  @Delete('masking/rules/:ruleId')
  @ApiOperation({ summary: 'Delete masking rule' })
  @ApiResponse({ status: 200, description: 'Rule deleted' })
  async deleteMaskingRule(@Param('ruleId') ruleId: string) {
    const success = await this.isolationService.deleteMaskingRule(ruleId);
    return { success };
  }

  @Post('masking/apply')
  @ApiOperation({ summary: 'Apply masking to data' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        data: { type: 'object' },
        context: { type: 'string' },
      },
      required: ['tenantId', 'data', 'context'],
    },
  })
  @ApiResponse({ status: 200, description: 'Masked data' })
  async applyMasking(
    @Body('tenantId') tenantId: string,
    @Body('data') data: Record<string, any>,
    @Body('context') context: string,
  ) {
    return { masked: this.isolationService.applyMasking(tenantId, data, context) };
  }

  // =================== EXPORT VALIDATION ===================

  @Post('export/validate')
  @ApiOperation({ summary: 'Validate export permission' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        format: { type: 'string' },
        dataClassification: { type: 'string' },
      },
      required: ['tenantId', 'userId', 'format', 'dataClassification'],
    },
  })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateExportPermission(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('format') format: string,
    @Body('dataClassification') dataClassification: DataClassification,
  ) {
    return this.isolationService.validateExportPermission(
      tenantId,
      userId,
      format,
      dataClassification,
    );
  }

  // =================== STATISTICS ===================

  @Get('stats/:tenantId')
  @ApiOperation({ summary: 'Get isolation statistics' })
  @ApiResponse({ status: 200, description: 'Isolation stats' })
  async getIsolationStats(@Param('tenantId') tenantId: string) {
    return { stats: await this.isolationService.getIsolationStats(tenantId) };
  }

  // =================== METADATA ===================

  @Get('metadata/levels')
  @ApiOperation({ summary: 'Get isolation levels' })
  @ApiResponse({ status: 200, description: 'Available isolation levels' })
  async getIsolationLevels() {
    return { levels: this.isolationService.getIsolationLevels() };
  }

  @Get('metadata/classifications')
  @ApiOperation({ summary: 'Get data classifications' })
  @ApiResponse({ status: 200, description: 'Available data classifications' })
  async getDataClassifications() {
    return { classifications: this.isolationService.getDataClassifications() };
  }

  @Get('metadata/access-types')
  @ApiOperation({ summary: 'Get access types' })
  @ApiResponse({ status: 200, description: 'Available access types' })
  async getAccessTypes() {
    return { types: this.isolationService.getAccessTypes() };
  }
}
