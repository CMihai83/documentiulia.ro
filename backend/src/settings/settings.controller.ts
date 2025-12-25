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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { SettingsManagementService } from './settings-management.service';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsManagementService) {}

  // =================== SETTINGS ===================

  @Get()
  @ApiOperation({ summary: 'Get all settings for current user/org' })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'Settings list' })
  async getAllSettings(@Query('category') category?: string) {
    if (category) {
      return this.settingsService.getAllSettingDefinitions(category as any);
    }
    return this.settingsService.getSettingsByCategory();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get specific setting value' })
  @ApiResponse({ status: 200, description: 'Setting value' })
  async getSetting(
    @Param('key') key: string,
    @Query('scopeId') scopeId?: string,
  ) {
    return this.settingsService.getSetting(key, scopeId);
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update setting value' })
  @ApiResponse({ status: 200, description: 'Setting updated' })
  async setSetting(
    @Request() req: any,
    @Param('key') key: string,
    @Body() body: { value: any; scopeId?: string },
  ) {
    return this.settingsService.setSetting(key, body.value, req.user.sub, body.scopeId);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Reset setting to default' })
  @ApiResponse({ status: 200, description: 'Setting reset' })
  async resetSetting(
    @Request() req: any,
    @Param('key') key: string,
    @Query('scopeId') scopeId?: string,
  ) {
    await this.settingsService.resetSetting(key, req.user.sub, scopeId);
    return { success: true };
  }

  @Get(':key/history')
  @ApiOperation({ summary: 'Get setting change history' })
  @ApiResponse({ status: 200, description: 'Setting history' })
  async getSettingHistory(
    @Param('key') key: string,
    @Query('scopeId') scopeId?: string,
  ) {
    return this.settingsService.getSettingHistory(key, scopeId);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Get multiple settings at once' })
  @ApiResponse({ status: 200, description: 'Settings values' })
  async bulkGetSettings(
    @Body() body: { keys: string[]; scopeId?: string },
  ) {
    return this.settingsService.bulkGetSettings(body.keys, body.scopeId);
  }

  @Put('bulk')
  @ApiOperation({ summary: 'Update multiple settings at once' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async bulkSetSettings(
    @Request() req: any,
    @Body() body: { settings: Record<string, any>; scopeId?: string },
  ) {
    return this.settingsService.bulkSetSettings(body.settings, req.user.sub, body.scopeId);
  }

  // =================== FEATURE FLAGS ===================

  @Get('features/all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all feature flags' })
  @ApiResponse({ status: 200, description: 'Feature flags list' })
  async getAllFeatureFlags() {
    return this.settingsService.getAllFeatureFlags();
  }

  @Get('features/:key')
  @ApiOperation({ summary: 'Check if feature is enabled' })
  @ApiResponse({ status: 200, description: 'Feature status' })
  async isFeatureEnabled(
    @Request() req: any,
    @Param('key') key: string,
  ) {
    const enabled = await this.settingsService.isFeatureEnabled(key, req.user.sub);
    return { key, enabled };
  }

  // =================== USER PREFERENCES ===================

  @Get('preferences/me')
  @ApiOperation({ summary: 'Get current user preferences' })
  @ApiResponse({ status: 200, description: 'User preferences' })
  async getMyPreferences(@Request() req: any) {
    return this.settingsService.getUserPreferences(req.user.sub);
  }

  @Put('preferences/me')
  @ApiOperation({ summary: 'Update current user preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updateMyPreferences(
    @Request() req: any,
    @Body() preferences: Record<string, any>,
  ) {
    return this.settingsService.updateUserPreferences(req.user.sub, preferences);
  }

  @Delete('preferences/me')
  @ApiOperation({ summary: 'Reset user preferences to defaults' })
  @ApiResponse({ status: 200, description: 'Preferences reset' })
  async resetMyPreferences(@Request() req: any) {
    return this.settingsService.resetUserPreferences(req.user.sub);
  }

  // =================== EXPORT/IMPORT ===================

  @Get('export')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Export all settings' })
  @ApiResponse({ status: 200, description: 'Settings export' })
  async exportSettings(@Query('scopeId') scopeId?: string) {
    return this.settingsService.exportSettings(scopeId);
  }

  @Post('import')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Import settings' })
  @ApiResponse({ status: 200, description: 'Settings imported' })
  async importSettings(
    @Request() req: any,
    @Body() body: { settings: Record<string, any>; scopeId?: string },
  ) {
    return this.settingsService.importSettings(body.settings, req.user.sub, body.scopeId);
  }
}
