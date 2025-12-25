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
import {
  FeatureFlagsService,
  FeatureFlag,
  FeatureEnvironment,
} from './feature-flags.service';

@ApiTags('Feature Flags')
@Controller('admin/feature-flags')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  // =================== FLAG EVALUATION ===================

  @Get('evaluate/:key')
  @ApiOperation({ summary: 'Evaluate a feature flag' })
  @ApiResponse({ status: 200, description: 'Flag value' })
  async evaluateFlag(
    @Param('key') key: string,
    @Request() req: any,
    @Query('environment') environment?: FeatureEnvironment,
  ) {
    const value = await this.featureFlagsService.evaluate(key, {
      userId: req.user.id,
      tenantId: req.user.tenantId,
      userRole: req.user.role,
      subscriptionPlan: req.user.subscriptionPlan,
      environment,
    });
    return { key, value };
  }

  @Get('evaluate')
  @ApiOperation({ summary: 'Evaluate all feature flags' })
  @ApiResponse({ status: 200, description: 'All flag values' })
  async evaluateAllFlags(
    @Request() req: any,
    @Query('environment') environment?: FeatureEnvironment,
  ) {
    const flags = await this.featureFlagsService.evaluateAll({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      userRole: req.user.role,
      subscriptionPlan: req.user.subscriptionPlan,
      environment,
    });
    return { flags };
  }

  @Get('check/:key')
  @ApiOperation({ summary: 'Check if feature is enabled (simple boolean)' })
  @ApiResponse({ status: 200, description: 'Feature enabled status' })
  async checkEnabled(
    @Param('key') key: string,
    @Request() req: any,
  ) {
    const enabled = await this.featureFlagsService.isEnabled(key, {
      userId: req.user.id,
      tenantId: req.user.tenantId,
      userRole: req.user.role,
      subscriptionPlan: req.user.subscriptionPlan,
    });
    return { key, enabled };
  }

  // =================== FLAG MANAGEMENT ===================

  @Get()
  @ApiOperation({ summary: 'Get all feature flags' })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'List of feature flags' })
  async getAllFlags(@Query('category') category?: string) {
    let flags: FeatureFlag[];
    if (category) {
      flags = await this.featureFlagsService.getFlagsByCategory(category);
    } else {
      flags = await this.featureFlagsService.getAllFlags();
    }
    return { flags, total: flags.length };
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a specific feature flag' })
  @ApiResponse({ status: 200, description: 'Feature flag details' })
  async getFlag(@Param('key') key: string) {
    return this.featureFlagsService.getFlag(key);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new feature flag' })
  @ApiResponse({ status: 201, description: 'Feature flag created' })
  async createFlag(
    @Request() req: any,
    @Body() body: {
      key: string;
      name: string;
      description: string;
      type: FeatureFlag['type'];
      enabled: boolean;
      defaultValue: any;
      environments: FeatureEnvironment[];
      category: string;
      tags?: string[];
      rolloutPercentage?: number;
      variants?: FeatureFlag['variants'];
      schedule?: FeatureFlag['schedule'];
      targeting?: FeatureFlag['targeting'];
    },
  ) {
    const flag = await this.featureFlagsService.createFlag(
      {
        ...body,
        tags: body.tags || [],
        createdBy: req.user.id,
      },
      req.user.id,
    );
    return flag;
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update a feature flag' })
  @ApiResponse({ status: 200, description: 'Feature flag updated' })
  async updateFlag(
    @Param('key') key: string,
    @Request() req: any,
    @Body() body: {
      name?: string;
      description?: string;
      enabled?: boolean;
      defaultValue?: any;
      environments?: FeatureEnvironment[];
      category?: string;
      tags?: string[];
      rolloutPercentage?: number;
      variants?: FeatureFlag['variants'];
      schedule?: FeatureFlag['schedule'];
      targeting?: FeatureFlag['targeting'];
      reason?: string;
    },
  ) {
    const { reason, ...updates } = body;
    return this.featureFlagsService.updateFlag(key, updates, req.user.id, reason);
  }

  @Post(':key/toggle')
  @ApiOperation({ summary: 'Toggle feature flag on/off' })
  @ApiResponse({ status: 200, description: 'Feature flag toggled' })
  async toggleFlag(
    @Param('key') key: string,
    @Request() req: any,
    @Body() body: { enabled: boolean },
  ) {
    return this.featureFlagsService.toggleFlag(key, body.enabled, req.user.id);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a feature flag' })
  @ApiResponse({ status: 200, description: 'Feature flag deleted' })
  async deleteFlag(@Param('key') key: string, @Request() req: any) {
    await this.featureFlagsService.deleteFlag(key, req.user.id);
    return { success: true, message: `Feature flag '${key}' deleted` };
  }

  // =================== OVERRIDES ===================

  @Get(':key/overrides')
  @ApiOperation({ summary: 'Get overrides for a flag' })
  @ApiResponse({ status: 200, description: 'Flag overrides' })
  async getOverrides(@Param('key') key: string) {
    const overrides = await this.featureFlagsService.getOverridesForFlag(key);
    return { overrides, total: overrides.length };
  }

  @Post(':key/overrides')
  @ApiOperation({ summary: 'Set an override for a flag' })
  @ApiResponse({ status: 201, description: 'Override created' })
  async setOverride(
    @Param('key') key: string,
    @Request() req: any,
    @Body() body: {
      type: 'tenant' | 'user';
      targetId: string;
      value: any;
      expiresAt?: string;
      reason?: string;
    },
  ) {
    const override = await this.featureFlagsService.setOverride(
      key,
      body.type,
      body.targetId,
      body.value,
      req.user.id,
      {
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        reason: body.reason,
      },
    );
    return override;
  }

  @Delete(':key/overrides/:type/:targetId')
  @ApiOperation({ summary: 'Remove an override' })
  @ApiResponse({ status: 200, description: 'Override removed' })
  async removeOverride(
    @Param('key') key: string,
    @Param('type') type: 'tenant' | 'user',
    @Param('targetId') targetId: string,
    @Request() req: any,
  ) {
    await this.featureFlagsService.removeOverride(key, type, targetId, req.user.id);
    return { success: true, message: 'Override removed' };
  }

  // =================== AUDIT ===================

  @Get('audit/log')
  @ApiOperation({ summary: 'Get audit log' })
  @ApiQuery({ name: 'flagKey', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Audit log' })
  async getAuditLog(
    @Query('flagKey') flagKey?: string,
    @Query('limit') limit?: string,
  ) {
    const audits = await this.featureFlagsService.getAuditLog(
      flagKey,
      limit ? parseInt(limit) : 50,
    );
    return { audits, total: audits.length };
  }

  // =================== STATS ===================

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get feature flags statistics' })
  @ApiResponse({ status: 200, description: 'Statistics' })
  async getStats() {
    return this.featureFlagsService.getStats();
  }
}
