import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SDKGeneratorService, SDKLanguage, SDKConfig } from './sdk-generator.service';

@ApiTags('Developer - SDK')
@Controller('developer/sdk')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SDKGeneratorController {
  constructor(private readonly sdkService: SDKGeneratorService) {}

  // =================== SDK GENERATION ===================

  @Post('generate')
  @ApiOperation({ summary: 'Generate SDK for a language' })
  @ApiResponse({ status: 201, description: 'SDK generated' })
  async generateSDK(
    @Body() body: {
      language: SDKLanguage;
      version?: string;
      packageName?: string;
      description?: string;
      author?: string;
      license?: string;
      repository?: string;
      includeExamples?: boolean;
      includeTests?: boolean;
      minifyCode?: boolean;
    },
  ) {
    const config: SDKConfig = {
      language: body.language,
      version: body.version || '1.0.0',
      packageName: body.packageName || `documentiulia-${body.language}-sdk`,
      description: body.description || 'DocumentIulia API SDK',
      author: body.author || 'DocumentIulia Team',
      license: body.license || 'MIT',
      repository: body.repository,
      includeExamples: body.includeExamples ?? true,
      includeTests: body.includeTests ?? false,
      minifyCode: body.minifyCode ?? false,
    };

    const sdk = await this.sdkService.generateSDK(config);
    return {
      id: sdk.id,
      language: sdk.language,
      version: sdk.version,
      packageName: sdk.packageName,
      files: sdk.files.map(f => ({ path: f.path, size: f.content.length })),
      generatedAt: sdk.generatedAt,
      totalSize: sdk.size,
    };
  }

  @Get('languages')
  @ApiOperation({ summary: 'Get supported SDK languages' })
  @ApiResponse({ status: 200, description: 'Supported languages' })
  async getSupportedLanguages() {
    const languages = await this.sdkService.getSupportedLanguages();
    return { languages };
  }

  @Get('generated')
  @ApiOperation({ summary: 'Get all generated SDKs' })
  @ApiResponse({ status: 200, description: 'Generated SDKs' })
  async getGeneratedSDKs() {
    const sdks = await this.sdkService.getGeneratedSDKs();
    return {
      sdks: sdks.map(sdk => ({
        id: sdk.id,
        language: sdk.language,
        version: sdk.version,
        packageName: sdk.packageName,
        generatedAt: sdk.generatedAt,
        size: sdk.size,
      })),
      total: sdks.length,
    };
  }

  @Get('generated/:id')
  @ApiOperation({ summary: 'Get generated SDK by ID' })
  @ApiResponse({ status: 200, description: 'SDK details' })
  async getSDK(@Param('id') id: string) {
    const sdk = await this.sdkService.getSDK(id);
    if (!sdk) {
      return { error: 'SDK not found' };
    }
    return {
      id: sdk.id,
      language: sdk.language,
      version: sdk.version,
      packageName: sdk.packageName,
      files: sdk.files.map(f => ({ path: f.path, size: f.content.length })),
      generatedAt: sdk.generatedAt,
      totalSize: sdk.size,
    };
  }

  @Get('generated/:id/files')
  @ApiOperation({ summary: 'Get SDK file contents' })
  @ApiQuery({ name: 'path', required: false, description: 'Specific file path' })
  @ApiResponse({ status: 200, description: 'SDK files' })
  async getSDKFiles(
    @Param('id') id: string,
    @Query('path') path?: string,
  ) {
    const sdk = await this.sdkService.getSDK(id);
    if (!sdk) {
      return { error: 'SDK not found' };
    }

    if (path) {
      const file = sdk.files.find(f => f.path === path);
      if (!file) {
        return { error: 'File not found' };
      }
      return { file };
    }

    return { files: sdk.files };
  }

  // =================== API ENDPOINTS ===================

  @Get('endpoints')
  @ApiOperation({ summary: 'Get all API endpoints' })
  @ApiResponse({ status: 200, description: 'API endpoints' })
  async getEndpoints() {
    const endpoints = await this.sdkService.getEndpoints();
    return {
      endpoints,
      total: endpoints.length,
    };
  }

  // =================== CODE SAMPLES ===================

  @Get('samples/:endpoint')
  @ApiOperation({ summary: 'Get code samples for endpoint' })
  @ApiResponse({ status: 200, description: 'Code samples' })
  async getCodeSamples(@Param('endpoint') endpoint: string) {
    const decodedEndpoint = decodeURIComponent(endpoint);
    const samples = await this.sdkService.generateCodeSamples(decodedEndpoint);
    return { samples, total: samples.length };
  }

  // =================== OPENAPI ===================

  @Get('openapi')
  @ApiOperation({ summary: 'Get OpenAPI specification' })
  @ApiResponse({ status: 200, description: 'OpenAPI spec' })
  async getOpenAPISpec() {
    return this.sdkService.generateOpenAPISpec();
  }

  @Get('openapi/download')
  @ApiOperation({ summary: 'Download OpenAPI spec as JSON file' })
  @ApiResponse({ status: 200, description: 'OpenAPI JSON file' })
  async downloadOpenAPISpec(@Res() res: Response) {
    const spec = await this.sdkService.generateOpenAPISpec();
    const json = JSON.stringify(spec, null, 2);

    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="openapi.json"',
    });
    res.send(json);
  }
}
