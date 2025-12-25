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
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateLimitService, RateLimitConfig } from './rate-limit.service';

@ApiTags('Developer - Rate Limits')
@Controller('developer/rate-limits')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  // =================== USAGE DASHBOARD ===================

  @Get('usage')
  @ApiOperation({ summary: 'Get current rate limit usage' })
  @ApiQuery({ name: 'apiKeyId', required: false })
  @ApiResponse({ status: 200, description: 'Current usage' })
  async getCurrentUsage(
    @Request() req: any,
    @Query('apiKeyId') apiKeyId?: string,
  ) {
    const usage = await this.rateLimitService.getCurrentUsage({
      tenantId: req.user.tenantId,
      apiKeyId,
    });
    return { usage, total: usage.length };
  }

  @Get('quota')
  @ApiOperation({ summary: 'Get quota status' })
  @ApiResponse({ status: 200, description: 'Quota status' })
  async getQuotaStatus(@Request() req: any) {
    return this.rateLimitService.getQuotaStatus(
      req.user.tenantId,
      req.user.plan || 'free',
    );
  }

  @Get('check')
  @ApiOperation({ summary: 'Check rate limit' })
  @ApiQuery({ name: 'apiKeyId', required: false })
  @ApiQuery({ name: 'endpoint', required: false })
  @ApiResponse({ status: 200, description: 'Rate limit check' })
  async checkRateLimit(
    @Request() req: any,
    @Query('apiKeyId') apiKeyId?: string,
    @Query('endpoint') endpoint?: string,
  ) {
    return this.rateLimitService.checkRateLimit({
      tenantId: req.user.tenantId,
      apiKeyId,
      endpoint,
      plan: req.user.plan,
    });
  }

  // =================== CONFIGURATIONS ===================

  @Get('configs')
  @ApiOperation({ summary: 'Get rate limit configurations' })
  @ApiQuery({ name: 'type', required: false, enum: ['global', 'tenant', 'api_key', 'endpoint'] })
  @ApiResponse({ status: 200, description: 'Rate limit configs' })
  async getConfigs(
    @Query('type') type?: 'global' | 'tenant' | 'api_key' | 'endpoint',
  ) {
    const configs = await this.rateLimitService.getConfigs(type);
    return { configs, total: configs.length };
  }

  @Post('configs')
  @ApiOperation({ summary: 'Create rate limit configuration' })
  @ApiResponse({ status: 201, description: 'Config created' })
  async createConfig(
    @Body() body: {
      name: string;
      type: 'global' | 'tenant' | 'api_key' | 'endpoint';
      targetId?: string;
      limits: {
        requestsPerSecond?: number;
        requestsPerMinute: number;
        requestsPerHour?: number;
        requestsPerDay: number;
      };
      burstLimit?: number;
      priority?: number;
    },
  ) {
    return this.rateLimitService.createConfig({
      ...body,
      isActive: true,
      priority: body.priority ?? 10,
    });
  }

  @Put('configs/:id')
  @ApiOperation({ summary: 'Update rate limit configuration' })
  @ApiResponse({ status: 200, description: 'Config updated' })
  async updateConfig(
    @Param('id') id: string,
    @Body() body: Partial<RateLimitConfig>,
  ) {
    const config = await this.rateLimitService.updateConfig(id, body);
    if (!config) {
      return { error: 'Config not found' };
    }
    return config;
  }

  @Delete('configs/:id')
  @ApiOperation({ summary: 'Delete rate limit configuration' })
  @ApiResponse({ status: 200, description: 'Config deleted' })
  async deleteConfig(@Param('id') id: string) {
    await this.rateLimitService.deleteConfig(id);
    return { success: true };
  }

  // =================== EVENTS ===================

  @Get('events')
  @ApiOperation({ summary: 'Get rate limit events' })
  @ApiQuery({ name: 'type', required: false, enum: ['limit_reached', 'warning_threshold', 'quota_reset', 'config_changed'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Rate limit events' })
  async getEvents(
    @Request() req: any,
    @Query('type') type?: 'limit_reached' | 'warning_threshold' | 'quota_reset' | 'config_changed',
    @Query('limit') limit?: string,
  ) {
    const events = await this.rateLimitService.getEvents({
      type,
      targetId: req.user.tenantId,
      limit: limit ? parseInt(limit) : 50,
    });
    return { events, total: events.length };
  }

  // =================== STATS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get rate limit statistics' })
  @ApiResponse({ status: 200, description: 'Rate limit stats' })
  async getStats() {
    return this.rateLimitService.getStats();
  }
}
