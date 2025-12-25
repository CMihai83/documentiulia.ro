import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { CdnService, CdnProvider, UploadOptions, SignedUrlOptions } from './cdn.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('CDN - Content Delivery')
@Controller('cdn')
export class CdnController {
  constructor(private readonly cdnService: CdnService) {}

  // =================== PROVIDER MANAGEMENT ===================

  @Get('providers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all CDN providers' })
  @ApiResponse({ status: 200, description: 'List of CDN providers' })
  getAllProviders() {
    return {
      providers: this.cdnService.getAllProviders(),
      active: this.cdnService.getActiveProvider(),
    };
  }

  @Get('providers/enabled')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get enabled CDN providers' })
  @ApiResponse({ status: 200, description: 'List of enabled CDN providers' })
  getEnabledProviders() {
    return { providers: this.cdnService.getEnabledProviders() };
  }

  @Get('providers/:provider')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get specific CDN provider config' })
  @ApiResponse({ status: 200, description: 'Provider configuration' })
  getProvider(@Param('provider') provider: CdnProvider) {
    const config = this.cdnService.getProviderConfig(provider);
    if (!config) {
      throw new BadRequestException(`Provider ${provider} not found`);
    }
    return config;
  }

  @Post('providers/:provider/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set active CDN provider' })
  @ApiResponse({ status: 200, description: 'Provider activated' })
  setActiveProvider(@Param('provider') provider: CdnProvider) {
    this.cdnService.setActiveProvider(provider);
    return { success: true, activeProvider: provider };
  }

  @Post('providers/:provider/enable')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable a CDN provider' })
  @ApiResponse({ status: 200, description: 'Provider enabled' })
  enableProvider(@Param('provider') provider: CdnProvider) {
    const success = this.cdnService.enableProvider(provider);
    return { success, provider };
  }

  @Post('providers/:provider/disable')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable a CDN provider' })
  @ApiResponse({ status: 200, description: 'Provider disabled' })
  disableProvider(@Param('provider') provider: CdnProvider) {
    const success = this.cdnService.disableProvider(provider);
    return { success, provider };
  }

  // =================== ASSET MANAGEMENT ===================

  @Post('assets/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an asset to CDN' })
  @ApiResponse({ status: 201, description: 'Asset uploaded successfully' })
  async uploadAsset(
    @UploadedFile() file: Express.Multer.File,
    @Body('path') path?: string,
    @Body('isPublic') isPublic?: string,
    @Body('optimize') optimize?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const options: UploadOptions = {
      path,
      fileName: file.originalname,
      mimeType: file.mimetype,
      isPublic: isPublic === 'true',
      optimize: optimize === 'true',
    };

    return this.cdnService.uploadAsset(file.buffer, options);
  }

  @Post('assets/upload-base64')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a base64 encoded asset to CDN' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: { type: 'string' },
        fileName: { type: 'string' },
        mimeType: { type: 'string' },
        path: { type: 'string' },
        isPublic: { type: 'boolean' },
        optimize: { type: 'boolean' },
      },
      required: ['data'],
    },
  })
  @ApiResponse({ status: 201, description: 'Asset uploaded successfully' })
  async uploadBase64Asset(
    @Body()
    body: {
      data: string;
      fileName?: string;
      mimeType?: string;
      path?: string;
      isPublic?: boolean;
      optimize?: boolean;
    },
  ) {
    if (!body.data) {
      throw new BadRequestException('No data provided');
    }

    const options: UploadOptions = {
      path: body.path,
      fileName: body.fileName,
      mimeType: body.mimeType,
      isPublic: body.isPublic,
      optimize: body.optimize,
    };

    return this.cdnService.uploadAsset(body.data, options);
  }

  @Get('assets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List CDN assets' })
  @ApiQuery({ name: 'path', required: false })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'List of assets' })
  async listAssets(
    @Query('path') path?: string,
    @Query('provider') provider?: CdnProvider,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.cdnService.listAssets({
      path,
      provider,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('assets/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get asset by ID' })
  @ApiResponse({ status: 200, description: 'Asset details' })
  async getAsset(@Param('id') id: string) {
    const asset = await this.cdnService.getAsset(id);
    if (!asset) {
      throw new BadRequestException('Asset not found');
    }
    return asset;
  }

  @Delete('assets/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an asset' })
  @ApiResponse({ status: 200, description: 'Asset deleted' })
  async deleteAsset(@Param('id') id: string) {
    const success = await this.cdnService.deleteAsset(id);
    return { success, id };
  }

  // =================== URL GENERATION ===================

  @Get('url/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate CDN URL for a path' })
  @ApiQuery({ name: 'path', required: true })
  @ApiQuery({ name: 'provider', required: false })
  @ApiResponse({ status: 200, description: 'CDN URL' })
  generateUrl(
    @Query('path') path: string,
    @Query('provider') provider?: CdnProvider,
  ) {
    return { url: this.cdnService.generateCdnUrl(path, provider) };
  }

  @Post('url/signed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate signed URL with expiration' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        expiresIn: { type: 'number' },
        ipAddress: { type: 'string' },
        countryCode: { type: 'string' },
      },
      required: ['path', 'expiresIn'],
    },
  })
  @ApiResponse({ status: 200, description: 'Signed URL with expiration' })
  generateSignedUrl(
    @Body()
    body: {
      path: string;
      expiresIn: number;
      ipAddress?: string;
      countryCode?: string;
    },
  ) {
    const options: SignedUrlOptions = {
      expiresIn: body.expiresIn,
      ipAddress: body.ipAddress,
      countryCode: body.countryCode,
    };

    return this.cdnService.generateSignedUrl(body.path, options);
  }

  @Post('url/verify')
  @ApiOperation({ summary: 'Verify a signed URL' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
    },
  })
  @ApiResponse({ status: 200, description: 'URL verification result' })
  verifySignedUrl(@Body('url') url: string) {
    return { valid: this.cdnService.verifySignedUrl(url) };
  }

  // =================== CACHE MANAGEMENT ===================

  @Post('cache/invalidate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate cache for specific paths' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { paths: { type: 'array', items: { type: 'string' } } },
      required: ['paths'],
    },
  })
  @ApiResponse({ status: 200, description: 'Cache invalidation started' })
  async invalidateCache(@Body('paths') paths: string[]) {
    return this.cdnService.invalidateCache(paths);
  }

  @Post('cache/purge-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Purge all cached content' })
  @ApiResponse({ status: 200, description: 'Full cache purge started' })
  async purgeAll() {
    return this.cdnService.purgeAll();
  }

  @Get('cache/invalidations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List recent cache invalidations' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of invalidations' })
  async listInvalidations(@Query('limit') limit?: string) {
    return {
      invalidations: await this.cdnService.listInvalidations(
        limit ? parseInt(limit, 10) : 20,
      ),
    };
  }

  @Get('cache/invalidations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get invalidation status' })
  @ApiResponse({ status: 200, description: 'Invalidation details' })
  async getInvalidationStatus(@Param('id') id: string) {
    const invalidation = await this.cdnService.getInvalidationStatus(id);
    if (!invalidation) {
      throw new BadRequestException('Invalidation not found');
    }
    return invalidation;
  }

  // =================== EDGE LOCATIONS ===================

  @Get('edge-locations')
  @ApiOperation({ summary: 'Get all edge locations' })
  @ApiQuery({ name: 'provider', required: false })
  @ApiResponse({ status: 200, description: 'List of edge locations' })
  getEdgeLocations(@Query('provider') provider?: CdnProvider) {
    return { locations: this.cdnService.getEdgeLocations(provider) };
  }

  @Get('edge-locations/active')
  @ApiOperation({ summary: 'Get active edge locations' })
  @ApiResponse({ status: 200, description: 'Active edge locations' })
  getActiveEdgeLocations() {
    return { locations: this.cdnService.getActiveEdgeLocations() };
  }

  @Get('edge-locations/region/:region')
  @ApiOperation({ summary: 'Get edge locations by region' })
  @ApiResponse({ status: 200, description: 'Edge locations in region' })
  getEdgeLocationsByRegion(@Param('region') region: string) {
    return { locations: this.cdnService.getEdgeLocationsByRegion(region) };
  }

  @Get('edge-locations/country/:country')
  @ApiOperation({ summary: 'Get edge locations by country' })
  @ApiResponse({ status: 200, description: 'Edge locations in country' })
  getEdgeLocationsByCountry(@Param('country') country: string) {
    return { locations: this.cdnService.getEdgeLocationsByCountry(country) };
  }

  @Get('edge-locations/nearest')
  @ApiOperation({ summary: 'Get nearest edge location' })
  @ApiQuery({ name: 'lat', required: true })
  @ApiQuery({ name: 'lon', required: true })
  @ApiResponse({ status: 200, description: 'Nearest edge location' })
  getNearestEdgeLocation(
    @Query('lat') lat: string,
    @Query('lon') lon: string,
  ) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException('Invalid coordinates');
    }

    const location = this.cdnService.getNearestEdgeLocation(latitude, longitude);
    return { location };
  }

  // =================== USAGE & STATISTICS ===================

  @Get('stats/usage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get CDN usage statistics' })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Usage statistics' })
  async getUsageStats(
    @Query('provider') provider?: CdnProvider,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const period = startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : undefined;

    return this.cdnService.getUsageStats(provider, period);
  }

  // =================== OPTIMIZATION ===================

  @Post('optimize/:assetId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Optimize an image asset' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quality: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
        format: { type: 'string', enum: ['webp', 'avif', 'jpeg', 'png'] },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Optimization result' })
  async optimizeImage(
    @Param('assetId') assetId: string,
    @Body()
    options: {
      quality?: number;
      width?: number;
      height?: number;
      format?: 'webp' | 'avif' | 'jpeg' | 'png';
    },
  ) {
    return this.cdnService.optimizeImage(assetId, options);
  }

  @Get('variants/:assetId/:variant')
  @ApiOperation({ summary: 'Get image variant URL' })
  @ApiResponse({ status: 200, description: 'Variant URL' })
  getImageVariant(
    @Param('assetId') assetId: string,
    @Param('variant') variant: 'thumbnail' | 'small' | 'medium' | 'large',
  ) {
    return { url: this.cdnService.generateImageVariant(assetId, variant) };
  }

  // =================== HEALTH & DASHBOARD ===================

  @Get('health')
  @ApiOperation({ summary: 'CDN health check' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async healthCheck() {
    return this.cdnService.healthCheck();
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get CDN dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  getDashboard() {
    return this.cdnService.getDashboard();
  }
}
