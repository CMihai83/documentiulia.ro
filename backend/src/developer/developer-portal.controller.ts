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
import { DeveloperPortalService, APIPermission } from './developer-portal.service';

@ApiTags('Developer Portal')
@Controller('developer')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeveloperPortalController {
  constructor(private readonly portalService: DeveloperPortalService) {}

  // =================== OVERVIEW ===================

  @Get('overview')
  @ApiOperation({ summary: 'Get developer portal overview' })
  @ApiResponse({ status: 200, description: 'Portal overview' })
  async getOverview(@Request() req: any) {
    return this.portalService.getPortalOverview(req.user.tenantId);
  }

  // =================== API KEYS ===================

  @Post('keys')
  @ApiOperation({ summary: 'Create API key' })
  @ApiResponse({ status: 201, description: 'API key created' })
  async createAPIKey(
    @Request() req: any,
    @Body() body: {
      name: string;
      permissions: APIPermission[];
      rateLimit?: { requestsPerMinute: number; requestsPerDay: number };
      allowedIPs?: string[];
      allowedOrigins?: string[];
      expiresInDays?: number;
    },
  ) {
    return this.portalService.createAPIKey({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('keys')
  @ApiOperation({ summary: 'List API keys' })
  @ApiResponse({ status: 200, description: 'API keys' })
  async getAPIKeys(@Request() req: any) {
    const keys = await this.portalService.getAPIKeys(req.user.tenantId);
    return { keys, total: keys.length };
  }

  @Get('keys/:id')
  @ApiOperation({ summary: 'Get API key details' })
  @ApiResponse({ status: 200, description: 'API key details' })
  async getAPIKey(@Param('id') id: string) {
    const key = await this.portalService.getAPIKey(id);
    if (!key) {
      return { error: 'API key not found' };
    }
    return key;
  }

  @Put('keys/:id')
  @ApiOperation({ summary: 'Update API key' })
  @ApiResponse({ status: 200, description: 'API key updated' })
  async updateAPIKey(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      permissions?: APIPermission[];
      rateLimit?: { requestsPerMinute: number; requestsPerDay: number };
      allowedIPs?: string[];
      allowedOrigins?: string[];
    },
  ) {
    return this.portalService.updateAPIKey(id, body);
  }

  @Delete('keys/:id')
  @ApiOperation({ summary: 'Revoke API key' })
  @ApiResponse({ status: 200, description: 'API key revoked' })
  async revokeAPIKey(@Param('id') id: string) {
    await this.portalService.revokeAPIKey(id);
    return { success: true };
  }

  @Get('keys/permissions')
  @ApiOperation({ summary: 'Get available permissions' })
  @ApiResponse({ status: 200, description: 'Available permissions' })
  async getPermissions() {
    return { permissions: this.portalService.getAvailablePermissions() };
  }

  // =================== DOCUMENTATION ===================

  @Get('docs')
  @ApiOperation({ summary: 'Get all documentation' })
  @ApiResponse({ status: 200, description: 'Documentation sections' })
  async getDocumentation() {
    const docs = await this.portalService.getDocumentation();
    return { docs, total: docs.length };
  }

  @Get('docs/categories')
  @ApiOperation({ summary: 'Get documentation by category' })
  @ApiResponse({ status: 200, description: 'Documentation by category' })
  async getDocsByCategory() {
    return this.portalService.getDocumentationByCategory();
  }

  @Get('docs/search')
  @ApiOperation({ summary: 'Search documentation' })
  @ApiQuery({ name: 'q', required: true })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchDocs(@Query('q') query: string) {
    const results = await this.portalService.searchDocumentation(query);
    return { results, total: results.length };
  }

  @Get('docs/:slug')
  @ApiOperation({ summary: 'Get documentation by slug' })
  @ApiResponse({ status: 200, description: 'Documentation section' })
  async getDocBySlug(@Param('slug') slug: string) {
    const doc = await this.portalService.getDocumentationBySlug(slug);
    if (!doc) {
      return { error: 'Documentation not found' };
    }
    return doc;
  }

  // =================== GUIDES ===================

  @Get('guides')
  @ApiOperation({ summary: 'Get all guides' })
  @ApiResponse({ status: 200, description: 'Getting started guides' })
  async getGuides() {
    const guides = await this.portalService.getGuides();
    return { guides, total: guides.length };
  }

  @Get('guides/:id')
  @ApiOperation({ summary: 'Get guide by ID' })
  @ApiResponse({ status: 200, description: 'Guide details' })
  async getGuide(@Param('id') id: string) {
    const guide = await this.portalService.getGuide(id);
    if (!guide) {
      return { error: 'Guide not found' };
    }
    return guide;
  }

  @Get('guides/difficulty/:level')
  @ApiOperation({ summary: 'Get guides by difficulty' })
  @ApiResponse({ status: 200, description: 'Guides by difficulty' })
  async getGuidesByDifficulty(
    @Param('level') level: 'beginner' | 'intermediate' | 'advanced',
  ) {
    const guides = await this.portalService.getGuidesByDifficulty(level);
    return { guides, total: guides.length };
  }

  // =================== CHANGELOG ===================

  @Get('changelog')
  @ApiOperation({ summary: 'Get changelog' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Changelog entries' })
  async getChangelog(@Query('limit') limit?: string) {
    const entries = await this.portalService.getChangelog(
      limit ? parseInt(limit) : undefined,
    );
    return { entries, total: entries.length };
  }

  @Get('changelog/version/:version')
  @ApiOperation({ summary: 'Get changelog by version' })
  @ApiResponse({ status: 200, description: 'Changelog entry' })
  async getChangelogByVersion(@Param('version') version: string) {
    const entry = await this.portalService.getChangelogByVersion(version);
    if (!entry) {
      return { error: 'Version not found' };
    }
    return entry;
  }

  @Get('changelog/type/:type')
  @ApiOperation({ summary: 'Get changelog by type' })
  @ApiResponse({ status: 200, description: 'Changelog entries' })
  async getChangelogByType(
    @Param('type') type: 'feature' | 'improvement' | 'bugfix' | 'breaking' | 'deprecation',
  ) {
    const entries = await this.portalService.getChangelogByType(type);
    return { entries, total: entries.length };
  }

  // =================== RESOURCES ===================

  @Get('resources')
  @ApiOperation({ summary: 'Get developer resources' })
  @ApiResponse({ status: 200, description: 'Developer resources' })
  async getResources() {
    const resources = await this.portalService.getResources();
    return { resources, total: resources.length };
  }

  @Get('resources/type/:type')
  @ApiOperation({ summary: 'Get resources by type' })
  @ApiResponse({ status: 200, description: 'Resources by type' })
  async getResourcesByType(
    @Param('type') type: 'video' | 'article' | 'code_sample' | 'tutorial' | 'reference',
  ) {
    const resources = await this.portalService.getResourcesByType(type);
    return { resources, total: resources.length };
  }

  @Post('resources/:id/view')
  @ApiOperation({ summary: 'Track resource view' })
  @ApiResponse({ status: 200, description: 'View tracked' })
  async trackResourceView(@Param('id') id: string) {
    await this.portalService.trackResourceView(id);
    return { success: true };
  }
}
