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
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { ActivityFilterDto } from './dto/activity.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Activity Log')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('activity')
  @ApiOperation({ summary: 'Get activity logs with filters' })
  @ApiResponse({ status: 200, description: 'Activity logs returned' })
  async findAll(@Query() filters: ActivityFilterDto) {
    return this.activityService.findAll(filters);
  }

  @Get('companies/:companyId/activity')
  @ApiOperation({ summary: 'Get company activity logs' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company activity logs returned' })
  async findByCompany(
    @Param('companyId') companyId: string,
    @Query() filters: ActivityFilterDto,
  ) {
    return this.activityService.findByCompany(companyId, filters);
  }

  @Get('activity/recent')
  @ApiOperation({ summary: 'Get recent activity' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Recent activity returned' })
  async getRecentActivity(@Query('limit') limit?: number) {
    return this.activityService.getRecentActivity(limit || 20);
  }

  @Get('activity/stats')
  @ApiOperation({ summary: 'Get activity statistics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Activity stats returned' })
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.activityService.getStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('activity/me')
  @ApiOperation({ summary: 'Get current user activity' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'User activity returned' })
  async getMyActivity(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    return this.activityService.getByUser(user.id, limit || 50);
  }

  @Get('activity/entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get activity for a specific entity' })
  @ApiParam({ name: 'entityType', description: 'Entity type (invoice, expense, etc.)' })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  @ApiResponse({ status: 200, description: 'Entity activity returned' })
  async getByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.activityService.getByEntity(entityType, entityId);
  }

  @Get('activity/user/:userId')
  @ApiOperation({ summary: 'Get activity for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'User activity returned' })
  async getByUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.activityService.getByUser(userId, limit || 50);
  }

  @Post('activity/cleanup')
  @ApiOperation({ summary: 'Cleanup old activity logs (admin only)' })
  @ApiQuery({ name: 'retentionDays', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Cleanup completed' })
  async cleanup(@Query('retentionDays') retentionDays?: number) {
    return this.activityService.cleanup(retentionDays || 90);
  }
}
