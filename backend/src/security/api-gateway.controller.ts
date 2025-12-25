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
  Headers,
  Ip,
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
  ApiGatewayService,
  RateLimitConfig,
  Transformation,
  IpFilterAction,
  QuotaPeriod,
} from './api-gateway.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('API Gateway')
@Controller('gateway')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiGatewayController {
  constructor(private readonly gatewayService: ApiGatewayService) {}

  // =================== API KEYS ===================

  @Post('api-keys')
  @ApiOperation({ summary: 'Create API key' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        tenantId: { type: 'string' },
        createdBy: { type: 'string' },
        scopes: { type: 'array', items: { type: 'string' } },
        quotaLimit: { type: 'number' },
        quotaPeriod: { type: 'string' },
        allowedIps: { type: 'array', items: { type: 'string' } },
        expiresAt: { type: 'string' },
      },
      required: ['name', 'tenantId', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'API key created' })
  async createApiKey(
    @Body('name') name: string,
    @Body('tenantId') tenantId: string,
    @Body('createdBy') createdBy: string,
    @Body('scopes') scopes?: string[],
    @Body('rateLimitOverride') rateLimitOverride?: RateLimitConfig,
    @Body('quotaLimit') quotaLimit?: number,
    @Body('quotaPeriod') quotaPeriod?: QuotaPeriod,
    @Body('allowedIps') allowedIps?: string[],
    @Body('allowedOrigins') allowedOrigins?: string[],
    @Body('expiresAt') expiresAt?: string,
    @Body('metadata') metadata?: Record<string, any>,
  ) {
    return this.gatewayService.createApiKey(name, tenantId, createdBy, {
      scopes,
      rateLimitOverride,
      quotaLimit,
      quotaPeriod,
      allowedIps,
      allowedOrigins,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      metadata,
    });
  }

  @Get('api-keys/:keyId')
  @ApiOperation({ summary: 'Get API key by ID' })
  @ApiResponse({ status: 200, description: 'API key details' })
  async getApiKey(@Param('keyId') keyId: string) {
    const key = await this.gatewayService.getApiKey(keyId);
    if (!key) {
      return { error: 'API key not found' };
    }
    // Don't return the actual key value
    return { ...key, key: key.key.substring(0, 7) + '...' };
  }

  @Get('api-keys/tenant/:tenantId')
  @ApiOperation({ summary: 'Get API keys for tenant' })
  @ApiResponse({ status: 200, description: 'List of API keys' })
  async getApiKeys(@Param('tenantId') tenantId: string) {
    const keys = await this.gatewayService.getApiKeys(tenantId);
    // Mask key values
    return {
      keys: keys.map(k => ({ ...k, key: k.key.substring(0, 7) + '...' })),
    };
  }

  @Put('api-keys/:keyId')
  @ApiOperation({ summary: 'Update API key' })
  @ApiResponse({ status: 200, description: 'API key updated' })
  async updateApiKey(
    @Param('keyId') keyId: string,
    @Body() updates: Record<string, any>,
  ) {
    const key = await this.gatewayService.updateApiKey(keyId, updates);
    if (!key) {
      return { error: 'API key not found' };
    }
    return { ...key, key: key.key.substring(0, 7) + '...' };
  }

  @Post('api-keys/:keyId/revoke')
  @ApiOperation({ summary: 'Revoke API key' })
  @ApiResponse({ status: 200, description: 'API key revoked' })
  async revokeApiKey(@Param('keyId') keyId: string) {
    const success = await this.gatewayService.revokeApiKey(keyId);
    return { success };
  }

  @Post('api-keys/:keyId/rotate')
  @ApiOperation({ summary: 'Rotate API key' })
  @ApiResponse({ status: 200, description: 'API key rotated, new key returned' })
  async rotateApiKey(@Param('keyId') keyId: string) {
    const key = await this.gatewayService.rotateApiKey(keyId);
    if (!key) {
      return { error: 'API key not found' };
    }
    // Return full key only on rotation
    return key;
  }

  @Post('api-keys/validate')
  @ApiOperation({ summary: 'Validate API key' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { key: { type: 'string' } },
      required: ['key'],
    },
  })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateApiKey(@Body('key') key: string) {
    const result = await this.gatewayService.validateApiKey(key);
    if (result.valid && result.apiKey) {
      return {
        valid: true,
        keyId: result.apiKey.id,
        name: result.apiKey.name,
        scopes: result.apiKey.scopes,
      };
    }
    return { valid: false, error: result.error };
  }

  // =================== RATE LIMIT RULES ===================

  @Post('rate-limits')
  @ApiOperation({ summary: 'Create rate limit rule' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        config: { type: 'object' },
        endpoint: { type: 'string' },
        method: { type: 'string' },
        priority: { type: 'number' },
      },
      required: ['name', 'description', 'config'],
    },
  })
  @ApiResponse({ status: 201, description: 'Rate limit rule created' })
  async createRateLimitRule(
    @Body('name') name: string,
    @Body('description') description: string,
    @Body('config') config: RateLimitConfig,
    @Body('endpoint') endpoint?: string,
    @Body('method') method?: string,
    @Body('priority') priority?: number,
  ) {
    return this.gatewayService.createRateLimitRule(name, description, config, {
      endpoint,
      method,
      priority,
    });
  }

  @Get('rate-limits')
  @ApiOperation({ summary: 'Get all rate limit rules' })
  @ApiResponse({ status: 200, description: 'List of rate limit rules' })
  async getRateLimitRules() {
    return { rules: await this.gatewayService.getRateLimitRules() };
  }

  @Get('rate-limits/:ruleId')
  @ApiOperation({ summary: 'Get rate limit rule by ID' })
  @ApiResponse({ status: 200, description: 'Rate limit rule details' })
  async getRateLimitRule(@Param('ruleId') ruleId: string) {
    const rule = await this.gatewayService.getRateLimitRule(ruleId);
    if (!rule) {
      return { error: 'Rule not found' };
    }
    return rule;
  }

  @Put('rate-limits/:ruleId')
  @ApiOperation({ summary: 'Update rate limit rule' })
  @ApiResponse({ status: 200, description: 'Rule updated' })
  async updateRateLimitRule(
    @Param('ruleId') ruleId: string,
    @Body() updates: Record<string, any>,
  ) {
    const rule = await this.gatewayService.updateRateLimitRule(ruleId, updates);
    if (!rule) {
      return { error: 'Rule not found' };
    }
    return rule;
  }

  @Delete('rate-limits/:ruleId')
  @ApiOperation({ summary: 'Delete rate limit rule' })
  @ApiResponse({ status: 200, description: 'Rule deleted' })
  async deleteRateLimitRule(@Param('ruleId') ruleId: string) {
    const success = await this.gatewayService.deleteRateLimitRule(ruleId);
    return { success };
  }

  @Post('rate-limits/check')
  @ApiOperation({ summary: 'Check rate limit for request' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        apiKey: { type: 'string' },
        endpoint: { type: 'string' },
        method: { type: 'string' },
        ipAddress: { type: 'string' },
      },
      required: ['endpoint', 'method', 'ipAddress'],
    },
  })
  @ApiResponse({ status: 200, description: 'Rate limit status' })
  async checkRateLimit(
    @Body('apiKey') apiKey: string,
    @Body('endpoint') endpoint: string,
    @Body('method') method: string,
    @Body('ipAddress') ipAddress: string,
    @Body('userAgent') userAgent?: string,
  ) {
    return this.gatewayService.checkRateLimit({
      apiKey,
      endpoint,
      method,
      ipAddress,
      userAgent,
      headers: {},
    });
  }

  // =================== IP FILTERING ===================

  @Post('ip-filters')
  @ApiOperation({ summary: 'Add IP filter' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        ipAddress: { type: 'string' },
        action: { type: 'string', enum: ['allow', 'block'] },
        reason: { type: 'string' },
        expiresAt: { type: 'string' },
      },
      required: ['tenantId', 'ipAddress', 'action'],
    },
  })
  @ApiResponse({ status: 201, description: 'IP filter added' })
  async addIpFilter(
    @Body('tenantId') tenantId: string,
    @Body('ipAddress') ipAddress: string,
    @Body('action') action: IpFilterAction,
    @Body('reason') reason?: string,
    @Body('expiresAt') expiresAt?: string,
  ) {
    return this.gatewayService.addIpFilter(tenantId, ipAddress, action, {
      reason,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
  }

  @Get('ip-filters/:tenantId')
  @ApiOperation({ summary: 'Get IP filters for tenant' })
  @ApiResponse({ status: 200, description: 'List of IP filters' })
  async getIpFilters(@Param('tenantId') tenantId: string) {
    return { filters: await this.gatewayService.getIpFilters(tenantId) };
  }

  @Delete('ip-filters/:filterId')
  @ApiOperation({ summary: 'Remove IP filter' })
  @ApiResponse({ status: 200, description: 'IP filter removed' })
  async removeIpFilter(@Param('filterId') filterId: string) {
    const success = await this.gatewayService.removeIpFilter(filterId);
    return { success };
  }

  @Post('ip-filters/check')
  @ApiOperation({ summary: 'Check if IP is allowed' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ipAddress: { type: 'string' },
        tenantId: { type: 'string' },
      },
      required: ['ipAddress'],
    },
  })
  @ApiResponse({ status: 200, description: 'IP check result' })
  async checkIpFilter(
    @Body('ipAddress') ipAddress: string,
    @Body('tenantId') tenantId?: string,
  ) {
    return this.gatewayService.checkIpFilter(ipAddress, tenantId);
  }

  // =================== QUOTAS ===================

  @Get('quotas/:keyId')
  @ApiOperation({ summary: 'Get quota for API key' })
  @ApiResponse({ status: 200, description: 'Quota details' })
  async getQuota(@Param('keyId') keyId: string) {
    const quota = await this.gatewayService.getQuota(keyId);
    if (!quota) {
      return { error: 'No quota configured for this key' };
    }
    return quota;
  }

  @Post('quotas/:keyId/reset')
  @ApiOperation({ summary: 'Reset quota for API key' })
  @ApiResponse({ status: 200, description: 'Quota reset' })
  async resetQuota(@Param('keyId') keyId: string) {
    const success = await this.gatewayService.resetQuota(keyId);
    return { success };
  }

  @Post('quotas/:keyId/check')
  @ApiOperation({ summary: 'Check quota for API key' })
  @ApiResponse({ status: 200, description: 'Quota check result' })
  async checkQuota(@Param('keyId') keyId: string) {
    return this.gatewayService.checkQuota(keyId);
  }

  // =================== TRANSFORM RULES ===================

  @Post('transforms')
  @ApiOperation({ summary: 'Create transformation rule' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['request', 'response'] },
        endpoint: { type: 'string' },
        transformations: { type: 'array' },
        method: { type: 'string' },
        priority: { type: 'number' },
      },
      required: ['name', 'type', 'endpoint', 'transformations'],
    },
  })
  @ApiResponse({ status: 201, description: 'Transform rule created' })
  async createTransformRule(
    @Body('name') name: string,
    @Body('type') type: 'request' | 'response',
    @Body('endpoint') endpoint: string,
    @Body('transformations') transformations: Transformation[],
    @Body('method') method?: string,
    @Body('priority') priority?: number,
  ) {
    return this.gatewayService.createTransformRule(name, type, endpoint, transformations, {
      method,
      priority,
    });
  }

  @Get('transforms')
  @ApiOperation({ summary: 'Get transformation rules' })
  @ApiQuery({ name: 'type', required: false })
  @ApiResponse({ status: 200, description: 'List of transform rules' })
  async getTransformRules(@Query('type') type?: 'request' | 'response') {
    return { rules: await this.gatewayService.getTransformRules(type) };
  }

  @Delete('transforms/:ruleId')
  @ApiOperation({ summary: 'Delete transformation rule' })
  @ApiResponse({ status: 200, description: 'Transform rule deleted' })
  async deleteTransformRule(@Param('ruleId') ruleId: string) {
    const success = await this.gatewayService.deleteTransformRule(ruleId);
    return { success };
  }

  // =================== USAGE & METRICS ===================

  @Get('usage/:keyId')
  @ApiOperation({ summary: 'Get usage log for API key' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Usage log' })
  async getUsageLog(
    @Param('keyId') keyId: string,
    @Query('limit') limit?: string,
  ) {
    return {
      usage: await this.gatewayService.getUsageLog(
        keyId,
        limit ? parseInt(limit) : 100,
      ),
    };
  }

  @Get('metrics/:tenantId')
  @ApiOperation({ summary: 'Get API metrics for tenant' })
  @ApiQuery({ name: 'hours', required: false })
  @ApiResponse({ status: 200, description: 'API metrics' })
  async getApiMetrics(
    @Param('tenantId') tenantId: string,
    @Query('hours') hours?: string,
  ) {
    return {
      metrics: await this.gatewayService.getApiMetrics(
        tenantId,
        hours ? parseInt(hours) : 24,
      ),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get gateway health status' })
  @ApiResponse({ status: 200, description: 'Gateway health' })
  async getGatewayHealth() {
    return await this.gatewayService.getGatewayHealth();
  }

  // =================== FULL REQUEST PROCESSING ===================

  @Post('process')
  @ApiOperation({ summary: 'Process API request through gateway' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        apiKey: { type: 'string' },
        tenantId: { type: 'string' },
        endpoint: { type: 'string' },
        method: { type: 'string' },
        ipAddress: { type: 'string' },
        userAgent: { type: 'string' },
        headers: { type: 'object' },
      },
      required: ['endpoint', 'method', 'ipAddress'],
    },
  })
  @ApiResponse({ status: 200, description: 'Request processing result' })
  async processRequest(
    @Body('apiKey') apiKey: string,
    @Body('tenantId') tenantId: string,
    @Body('endpoint') endpoint: string,
    @Body('method') method: string,
    @Body('ipAddress') ipAddress: string,
    @Body('userAgent') userAgent?: string,
    @Body('headers') headers?: Record<string, string>,
  ) {
    const result = await this.gatewayService.processRequest({
      apiKey,
      tenantId,
      endpoint,
      method,
      ipAddress,
      userAgent,
      headers: headers || {},
    });

    // Mask API key details in response
    if (result.apiKey) {
      result.apiKey = {
        ...result.apiKey,
        key: result.apiKey.key.substring(0, 7) + '...',
      };
    }

    return result;
  }
}
