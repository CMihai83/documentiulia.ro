/**
 * Dashboard Preferences Controller
 * API endpoints for dashboard customization
 * Sprint 26 - Dashboard Customization
 */

import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { DashboardPreferencesService, DashboardPreferencesDto, ALL_DASHBOARD_MODULES } from './dashboard-preferences.service';

class UpdatePreferencesDto implements Partial<DashboardPreferencesDto> {
  enabledModules?: string[];
  moduleOrder?: string[];
  collapsedSections?: string[];
  sidebarCollapsed?: boolean;
  compactMode?: boolean;
  darkMode?: boolean;
  dashboardWidgets?: string[];
}

@ApiTags('Dashboard Preferences')
@Controller('users/dashboard-preferences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardPreferencesController {
  constructor(private readonly preferencesService: DashboardPreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user dashboard preferences' })
  @ApiResponse({ status: 200, description: 'User dashboard preferences' })
  async getPreferences(@Request() req: { user: { id: string } }) {
    return this.preferencesService.getPreferences(req.user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update dashboard preferences' })
  @ApiBody({ type: UpdatePreferencesDto })
  @ApiResponse({ status: 200, description: 'Updated preferences' })
  async updatePreferences(
    @Request() req: { user: { id: string } },
    @Body() updates: UpdatePreferencesDto,
  ) {
    return this.preferencesService.updatePreferences(req.user.id, updates);
  }

  @Post('toggle/:moduleId')
  @ApiOperation({ summary: 'Toggle a specific module on/off' })
  @ApiResponse({ status: 200, description: 'Updated preferences' })
  async toggleModule(
    @Request() req: { user: { id: string } },
    @Param('moduleId') moduleId: string,
  ) {
    return this.preferencesService.toggleModule(req.user.id, moduleId);
  }

  @Delete()
  @ApiOperation({ summary: 'Reset preferences to defaults' })
  @ApiResponse({ status: 200, description: 'Default preferences' })
  async resetPreferences(@Request() req: { user: { id: string } }) {
    return this.preferencesService.resetPreferences(req.user.id);
  }

  @Get('modules')
  @ApiOperation({ summary: 'Get all available modules for current user' })
  @ApiResponse({ status: 200, description: 'Available modules with access info' })
  async getAvailableModules(@Request() req: { user: { id: string } }) {
    return this.preferencesService.getAvailableModules(req.user.id);
  }

  @Get('all-modules')
  @Public()
  @ApiOperation({ summary: 'Get list of all dashboard modules' })
  @ApiResponse({ status: 200, description: 'All dashboard modules' })
  getAllModules() {
    return ALL_DASHBOARD_MODULES;
  }
}
