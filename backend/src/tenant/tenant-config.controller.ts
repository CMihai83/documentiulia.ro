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
  TenantConfigService,
  SubscriptionTier,
  FeatureFlag,
  ConfigScope,
  TenantLimits,
  TenantSettings,
} from './tenant-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Tenant Configuration')
@Controller('tenant-config')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantConfigController {
  constructor(private readonly tenantConfigService: TenantConfigService) {}

  // =================== PROFILE MANAGEMENT ===================

  @Post('profiles')
  @ApiOperation({ summary: 'Create tenant profile' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        name: { type: 'string' },
        tier: { type: 'string' },
        displayName: { type: 'string' },
        domain: { type: 'string' },
        timezone: { type: 'string' },
        locale: { type: 'string' },
        currency: { type: 'string' },
      },
      required: ['tenantId', 'name', 'tier'],
    },
  })
  @ApiResponse({ status: 201, description: 'Profile created' })
  async createProfile(
    @Body('tenantId') tenantId: string,
    @Body('name') name: string,
    @Body('tier') tier: SubscriptionTier,
    @Body('displayName') displayName?: string,
    @Body('domain') domain?: string,
    @Body('timezone') timezone?: string,
    @Body('locale') locale?: string,
    @Body('currency') currency?: string,
  ) {
    return this.tenantConfigService.createProfile(tenantId, name, tier, {
      displayName,
      domain,
      timezone,
      locale,
      currency,
    });
  }

  @Get('profiles/:tenantId')
  @ApiOperation({ summary: 'Get tenant profile' })
  @ApiResponse({ status: 200, description: 'Tenant profile' })
  async getProfile(@Param('tenantId') tenantId: string) {
    const profile = await this.tenantConfigService.getProfile(tenantId);
    if (!profile) return { error: 'Profile not found' };
    return profile;
  }

  @Put('profiles/:tenantId')
  @ApiOperation({ summary: 'Update tenant profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @Param('tenantId') tenantId: string,
    @Body() updates: Record<string, any>,
  ) {
    const profile = await this.tenantConfigService.updateProfile(tenantId, updates);
    if (!profile) return { error: 'Profile not found' };
    return profile;
  }

  @Post('profiles/:tenantId/upgrade')
  @ApiOperation({ summary: 'Upgrade subscription tier' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tier: { type: 'string' },
      },
      required: ['tier'],
    },
  })
  @ApiResponse({ status: 200, description: 'Subscription upgraded' })
  async upgradeSubscription(
    @Param('tenantId') tenantId: string,
    @Body('tier') tier: SubscriptionTier,
  ) {
    const profile = await this.tenantConfigService.upgradeSubscription(tenantId, tier);
    if (!profile) return { error: 'Profile not found' };
    return profile;
  }

  @Get('profiles')
  @ApiOperation({ summary: 'Get all profiles' })
  @ApiResponse({ status: 200, description: 'All tenant profiles' })
  async getAllProfiles() {
    return { profiles: await this.tenantConfigService.getAllProfiles() };
  }

  // =================== CONFIG MANAGEMENT ===================

  @Post('configs')
  @ApiOperation({ summary: 'Set configuration' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        key: { type: 'string' },
        value: {},
        category: { type: 'string' },
        description: { type: 'string' },
        isSecret: { type: 'boolean' },
        updatedBy: { type: 'string' },
      },
      required: ['tenantId', 'key', 'value'],
    },
  })
  @ApiResponse({ status: 201, description: 'Config set' })
  async setConfig(
    @Body('tenantId') tenantId: string,
    @Body('key') key: string,
    @Body('value') value: any,
    @Body('category') category?: string,
    @Body('description') description?: string,
    @Body('isSecret') isSecret?: boolean,
    @Body('updatedBy') updatedBy?: string,
  ) {
    return this.tenantConfigService.setConfig(tenantId, key, value, {
      category,
      description,
      isSecret,
      updatedBy,
    });
  }

  @Get('configs/:tenantId/:key')
  @ApiOperation({ summary: 'Get configuration by key' })
  @ApiResponse({ status: 200, description: 'Config value' })
  async getConfig(
    @Param('tenantId') tenantId: string,
    @Param('key') key: string,
  ) {
    const config = await this.tenantConfigService.getConfig(tenantId, key);
    if (!config) return { error: 'Config not found' };
    return config;
  }

  @Get('configs/:tenantId')
  @ApiOperation({ summary: 'Get all configurations' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'scope', required: false })
  @ApiResponse({ status: 200, description: 'All configurations' })
  async getAllConfigs(
    @Param('tenantId') tenantId: string,
    @Query('category') category?: string,
    @Query('scope') scope?: ConfigScope,
  ) {
    return {
      configs: await this.tenantConfigService.getAllConfigs(tenantId, { category, scope }),
    };
  }

  @Delete('configs/:tenantId/:key')
  @ApiOperation({ summary: 'Delete configuration' })
  @ApiResponse({ status: 200, description: 'Config deleted' })
  async deleteConfig(
    @Param('tenantId') tenantId: string,
    @Param('key') key: string,
  ) {
    const success = await this.tenantConfigService.deleteConfig(tenantId, key);
    return { success };
  }

  @Post('configs/:tenantId/bulk')
  @ApiOperation({ summary: 'Bulk set configurations' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        configs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              value: {},
              category: { type: 'string' },
            },
          },
        },
        updatedBy: { type: 'string' },
      },
      required: ['configs'],
    },
  })
  @ApiResponse({ status: 201, description: 'Configs set' })
  async bulkSetConfigs(
    @Param('tenantId') tenantId: string,
    @Body('configs') configs: Array<{ key: string; value: any; category?: string }>,
    @Body('updatedBy') updatedBy?: string,
  ) {
    return {
      configs: await this.tenantConfigService.bulkSetConfigs(tenantId, configs, updatedBy),
    };
  }

  // =================== CONFIG HISTORY ===================

  @Get('history/:tenantId')
  @ApiOperation({ summary: 'Get configuration history' })
  @ApiQuery({ name: 'key', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Config history' })
  async getConfigHistory(
    @Param('tenantId') tenantId: string,
    @Query('key') key?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      history: await this.tenantConfigService.getConfigHistory(tenantId, key, {
        limit: limit ? parseInt(limit) : undefined,
      }),
    };
  }

  // =================== FEATURES ===================

  @Get('features/:tenantId')
  @ApiOperation({ summary: 'Get enabled features' })
  @ApiResponse({ status: 200, description: 'Enabled features' })
  async getEnabledFeatures(@Param('tenantId') tenantId: string) {
    return { features: await this.tenantConfigService.getEnabledFeatures(tenantId) };
  }

  @Get('features/:tenantId/check/:feature')
  @ApiOperation({ summary: 'Check if feature is enabled' })
  @ApiResponse({ status: 200, description: 'Feature status' })
  async hasFeature(
    @Param('tenantId') tenantId: string,
    @Param('feature') feature: FeatureFlag,
  ) {
    return { hasFeature: await this.tenantConfigService.hasFeature(tenantId, feature) };
  }

  @Post('features/:tenantId/:feature/enable')
  @ApiOperation({ summary: 'Enable feature' })
  @ApiResponse({ status: 200, description: 'Feature enabled' })
  async enableFeature(
    @Param('tenantId') tenantId: string,
    @Param('feature') feature: FeatureFlag,
  ) {
    const profile = await this.tenantConfigService.enableFeature(tenantId, feature);
    if (!profile) return { error: 'Profile not found' };
    return profile;
  }

  @Post('features/:tenantId/:feature/disable')
  @ApiOperation({ summary: 'Disable feature' })
  @ApiResponse({ status: 200, description: 'Feature disabled' })
  async disableFeature(
    @Param('tenantId') tenantId: string,
    @Param('feature') feature: FeatureFlag,
  ) {
    const profile = await this.tenantConfigService.disableFeature(tenantId, feature);
    if (!profile) return { error: 'Profile not found' };
    return profile;
  }

  // =================== LIMITS ===================

  @Get('limits/:tenantId')
  @ApiOperation({ summary: 'Get tenant limits' })
  @ApiResponse({ status: 200, description: 'Tenant limits' })
  async getLimits(@Param('tenantId') tenantId: string) {
    const limits = await this.tenantConfigService.getLimits(tenantId);
    if (!limits) return { error: 'Profile not found' };
    return { limits };
  }

  @Post('limits/:tenantId/check')
  @ApiOperation({ summary: 'Check limit usage' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        limitKey: { type: 'string' },
        currentUsage: { type: 'number' },
      },
      required: ['limitKey', 'currentUsage'],
    },
  })
  @ApiResponse({ status: 200, description: 'Limit check result' })
  async checkLimit(
    @Param('tenantId') tenantId: string,
    @Body('limitKey') limitKey: keyof TenantLimits,
    @Body('currentUsage') currentUsage: number,
  ) {
    return this.tenantConfigService.checkLimit(tenantId, limitKey, currentUsage);
  }

  @Put('limits/:tenantId')
  @ApiOperation({ summary: 'Update limits' })
  @ApiResponse({ status: 200, description: 'Limits updated' })
  async updateLimits(
    @Param('tenantId') tenantId: string,
    @Body() limits: Partial<TenantLimits>,
  ) {
    const profile = await this.tenantConfigService.updateLimits(tenantId, limits);
    if (!profile) return { error: 'Profile not found' };
    return profile;
  }

  // =================== SETTINGS ===================

  @Get('settings/:tenantId')
  @ApiOperation({ summary: 'Get tenant settings' })
  @ApiResponse({ status: 200, description: 'Tenant settings' })
  async getSettings(@Param('tenantId') tenantId: string) {
    const profile = await this.tenantConfigService.getProfile(tenantId);
    if (!profile) return { error: 'Profile not found' };
    return { settings: profile.settings };
  }

  @Get('settings/:tenantId/:key')
  @ApiOperation({ summary: 'Get specific setting' })
  @ApiResponse({ status: 200, description: 'Setting value' })
  async getSetting(
    @Param('tenantId') tenantId: string,
    @Param('key') key: keyof TenantSettings,
  ) {
    const value = await this.tenantConfigService.getSetting(tenantId, key);
    return { key, value };
  }

  @Put('settings/:tenantId')
  @ApiOperation({ summary: 'Update settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(
    @Param('tenantId') tenantId: string,
    @Body() settings: Partial<TenantSettings>,
  ) {
    const profile = await this.tenantConfigService.updateSettings(tenantId, settings);
    if (!profile) return { error: 'Profile not found' };
    return profile;
  }

  // =================== TEMPLATES ===================

  @Get('templates')
  @ApiOperation({ summary: 'Get all templates' })
  @ApiResponse({ status: 200, description: 'All templates' })
  async getAllTemplates() {
    return { templates: await this.tenantConfigService.getAllTemplates() };
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('templateId') templateId: string) {
    const template = await this.tenantConfigService.getTemplate(templateId);
    if (!template) return { error: 'Template not found' };
    return template;
  }

  @Get('templates/tier/:tier')
  @ApiOperation({ summary: 'Get template by tier' })
  @ApiResponse({ status: 200, description: 'Template for tier' })
  async getTemplateByTier(@Param('tier') tier: SubscriptionTier) {
    const template = await this.tenantConfigService.getTemplateByTier(tier);
    if (!template) return { error: 'Template not found' };
    return template;
  }

  @Post('templates/:templateId/apply/:tenantId')
  @ApiOperation({ summary: 'Apply template to tenant' })
  @ApiResponse({ status: 200, description: 'Template applied' })
  async applyTemplate(
    @Param('templateId') templateId: string,
    @Param('tenantId') tenantId: string,
  ) {
    try {
      const configs = await this.tenantConfigService.applyTemplate(tenantId, templateId);
      return { applied: true, configsSet: configs.length };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== METADATA ===================

  @Get('metadata/tiers')
  @ApiOperation({ summary: 'Get subscription tiers' })
  async getSubscriptionTiers() {
    return { tiers: this.tenantConfigService.getSubscriptionTiers() };
  }

  @Get('metadata/features')
  @ApiOperation({ summary: 'Get all feature flags' })
  async getFeatureFlags() {
    return { features: this.tenantConfigService.getFeatureFlags() };
  }

  @Get('metadata/categories')
  @ApiOperation({ summary: 'Get config categories' })
  async getConfigCategories() {
    return { categories: this.tenantConfigService.getConfigCategories() };
  }

  @Get('metadata/tier-defaults/:tier')
  @ApiOperation({ summary: 'Get default limits and features for tier' })
  async getTierDefaults(@Param('tier') tier: SubscriptionTier) {
    return {
      limits: this.tenantConfigService.getDefaultLimitsForTier(tier),
      features: this.tenantConfigService.getDefaultFeaturesForTier(tier),
    };
  }
}
