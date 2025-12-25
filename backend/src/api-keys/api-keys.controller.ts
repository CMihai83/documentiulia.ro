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
import { ApiKeyService, ApiKeyScope, CreateApiKeyDto } from './api-key.service';

@ApiTags('API Keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  // =================== API KEY MANAGEMENT ===================

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new API key' })
  @ApiResponse({ status: 201, description: 'API key created (returns plain text key only once)' })
  async createApiKey(
    @Request() req: any,
    @Body() body: {
      name: string;
      nameRo: string;
      description?: string;
      descriptionRo?: string;
      scopes: ApiKeyScope[];
      ipWhitelist?: string[];
      rateLimit?: number;
      rateLimitWindow?: number;
      expiresAt?: string;
    },
  ) {
    const dto: CreateApiKeyDto = {
      organizationId: req.user.organizationId || req.user.sub,
      name: body.name,
      nameRo: body.nameRo,
      description: body.description,
      descriptionRo: body.descriptionRo,
      scopes: body.scopes,
      createdBy: req.user.sub,
      createdByName: req.user.name || req.user.email,
      ipWhitelist: body.ipWhitelist,
      rateLimit: body.rateLimit,
      rateLimitWindow: body.rateLimitWindow,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    };
    return this.apiKeyService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all API keys for organization' })
  @ApiResponse({ status: 200, description: 'List of API keys (without secret)' })
  async listApiKeys(@Request() req: any) {
    return this.apiKeyService.getByOrganization(req.user.organizationId || req.user.sub);
  }

  @Get('scopes')
  @ApiOperation({ summary: 'Get available API key scopes' })
  @ApiResponse({ status: 200, description: 'List of scopes' })
  async getScopes() {
    return this.apiKeyService.getScopes();
  }

  @Get('statuses')
  @ApiOperation({ summary: 'Get possible API key statuses' })
  @ApiResponse({ status: 200, description: 'List of statuses' })
  async getStatuses() {
    return this.apiKeyService.getStatuses();
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get API key statistics for organization' })
  @ApiResponse({ status: 200, description: 'API key statistics' })
  async getStatistics(@Request() req: any) {
    return this.apiKeyService.getStatistics(req.user.organizationId || req.user.sub);
  }

  @Get('audit-log')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get API key audit log' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Audit log entries' })
  async getAuditLog(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    return this.apiKeyService.getAuditLog(
      req.user.organizationId || req.user.sub,
      limit ? parseInt(limit) : 100,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get API key details' })
  @ApiResponse({ status: 200, description: 'API key details' })
  async getApiKey(@Param('id') id: string) {
    const key = await this.apiKeyService.getById(id);
    return key || { error: 'API key not found' };
  }

  @Get(':id/usage')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get API key usage history' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Usage history' })
  async getUsage(
    @Param('id') id: string,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    const daysNum = days ? parseInt(days) : 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysNum);

    return this.apiKeyService.getUsage(id, {
      from: fromDate,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update API key' })
  @ApiResponse({ status: 200, description: 'Updated API key' })
  async updateApiKey(
    @Param('id') id: string,
    @Body() updates: {
      name?: string;
      nameRo?: string;
      description?: string;
      descriptionRo?: string;
      scopes?: ApiKeyScope[];
      ipWhitelist?: string[];
      rateLimit?: number;
      rateLimitWindow?: number;
      expiresAt?: string;
    },
  ) {
    return this.apiKeyService.update(id, {
      ...updates,
      expiresAt: updates.expiresAt ? new Date(updates.expiresAt) : undefined,
    });
  }

  @Post(':id/activate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activate API key' })
  @ApiResponse({ status: 200, description: 'Activated API key' })
  async activateApiKey(@Param('id') id: string) {
    return this.apiKeyService.activate(id);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate API key' })
  @ApiResponse({ status: 200, description: 'Deactivated API key' })
  async deactivateApiKey(@Param('id') id: string) {
    return this.apiKeyService.deactivate(id);
  }

  @Post(':id/revoke')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Revoke API key permanently' })
  @ApiResponse({ status: 200, description: 'Revoked API key' })
  async revokeApiKey(@Param('id') id: string) {
    return this.apiKeyService.revoke(id);
  }

  @Post(':id/regenerate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Regenerate API key secret' })
  @ApiResponse({ status: 200, description: 'New API key (returns plain text key only once)' })
  async regenerateApiKey(@Param('id') id: string) {
    return this.apiKeyService.regenerate(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete API key' })
  @ApiResponse({ status: 200, description: 'API key deleted' })
  async deleteApiKey(@Param('id') id: string) {
    await this.apiKeyService.delete(id);
    return { success: true };
  }

  // =================== ADMIN OPERATIONS ===================

  @Post('cleanup-expired')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Clean up expired API keys' })
  @ApiResponse({ status: 200, description: 'Number of keys cleaned up' })
  async cleanupExpired() {
    const count = await this.apiKeyService.cleanupExpired();
    return { cleaned: count };
  }
}
