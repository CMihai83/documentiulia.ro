import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
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
import { OAuth2ProviderService } from './oauth2-provider.service';

@ApiTags('Integrations - OAuth2')
@Controller('integrations/oauth')
export class OAuth2ProviderController {
  constructor(private readonly oauth2Service: OAuth2ProviderService) {}

  // =================== PROVIDERS ===================

  @Get('providers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get OAuth2 providers' })
  @ApiResponse({ status: 200, description: 'OAuth2 providers' })
  async getProviders() {
    const providers = await this.oauth2Service.getProviders();
    return { providers, total: providers.length };
  }

  @Get('providers/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get provider details' })
  @ApiResponse({ status: 200, description: 'Provider details' })
  async getProvider(@Param('id') id: string) {
    const provider = await this.oauth2Service.getProvider(id);
    if (!provider) {
      return { error: 'Provider not found' };
    }
    return provider;
  }

  // =================== AUTHORIZATION ===================

  @Get('authorize/:providerId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authorization URL' })
  @ApiQuery({ name: 'scopes', required: false, description: 'Comma-separated scopes' })
  @ApiQuery({ name: 'redirect', required: false, description: 'Custom redirect URI' })
  @ApiResponse({ status: 200, description: 'Authorization URL' })
  async getAuthorizationUrl(
    @Request() req: any,
    @Param('providerId') providerId: string,
    @Query('scopes') scopes?: string,
    @Query('redirect') redirect?: string,
  ) {
    const result = await this.oauth2Service.getAuthorizationUrl({
      providerId,
      tenantId: req.user.tenantId,
      scopes: scopes ? scopes.split(',') : undefined,
      redirectUri: redirect,
    });
    return result;
  }

  @Get('authorize/:providerId/redirect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redirect to authorization URL' })
  @ApiResponse({ status: 302, description: 'Redirect to provider' })
  async redirectToAuthorization(
    @Request() req: any,
    @Res() res: Response,
    @Param('providerId') providerId: string,
    @Query('scopes') scopes?: string,
  ) {
    const result = await this.oauth2Service.getAuthorizationUrl({
      providerId,
      tenantId: req.user.tenantId,
      scopes: scopes ? scopes.split(',') : undefined,
    });
    res.redirect(result.url);
  }

  @Get('callback')
  @ApiOperation({ summary: 'OAuth2 callback handler' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'state', required: true })
  @ApiResponse({ status: 200, description: 'Token created' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error?: string,
    @Query('error_description') errorDescription?: string,
  ) {
    if (error) {
      return {
        success: false,
        error,
        errorDescription,
      };
    }

    try {
      // Extract providerId from state (could be stored in state object)
      // For now, we'll need to look it up
      const token = await this.oauth2Service.handleCallback({
        providerId: 'unknown', // Will be determined from state
        code,
        state,
      });

      return {
        success: true,
        tokenId: token.id,
        provider: token.providerName,
        expiresAt: token.expiresAt,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  @Get('callback/:providerId')
  @ApiOperation({ summary: 'Provider-specific callback handler' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'state', required: true })
  @ApiResponse({ status: 200, description: 'Token created' })
  async handleProviderCallback(
    @Param('providerId') providerId: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error?: string,
  ) {
    if (error) {
      return { success: false, error };
    }

    const token = await this.oauth2Service.handleCallback({
      providerId,
      code,
      state,
    });

    return {
      success: true,
      tokenId: token.id,
      provider: token.providerName,
      expiresAt: token.expiresAt,
    };
  }

  // =================== TOKENS ===================

  @Get('tokens')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my OAuth2 tokens' })
  @ApiResponse({ status: 200, description: 'OAuth2 tokens' })
  async getTokens(@Request() req: any) {
    const tokens = await this.oauth2Service.getTokens(req.user.tenantId);
    return { tokens, total: tokens.length };
  }

  @Get('tokens/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get token details' })
  @ApiResponse({ status: 200, description: 'Token details' })
  async getToken(@Param('id') id: string) {
    const token = await this.oauth2Service.getToken(id);
    if (!token) {
      return { error: 'Token not found' };
    }
    return {
      ...token,
      accessToken: '***',
      refreshToken: token.refreshToken ? '***' : undefined,
    };
  }

  @Post('tokens/:id/refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  async refreshToken(@Param('id') id: string) {
    const token = await this.oauth2Service.refreshToken(id);
    return {
      success: true,
      tokenId: token.id,
      expiresAt: token.expiresAt,
    };
  }

  @Delete('tokens/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke token' })
  @ApiResponse({ status: 200, description: 'Token revoked' })
  async revokeToken(@Param('id') id: string) {
    await this.oauth2Service.revokeToken(id);
    return { success: true };
  }

  // =================== STATS ===================

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get OAuth2 statistics' })
  @ApiResponse({ status: 200, description: 'OAuth2 stats' })
  async getStats(@Request() req: any) {
    return this.oauth2Service.getStats(req.user.tenantId);
  }
}
