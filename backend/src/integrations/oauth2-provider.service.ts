import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * OAuth2 Provider Service
 * Handle OAuth2 flows for third-party integrations
 *
 * Features:
 * - OAuth2 authorization flow
 * - Token management
 * - Token refresh
 * - Provider configuration
 */

// =================== TYPES ===================

export interface OAuth2Provider {
  id: string;
  name: string;
  authorizationUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  userInfoUrl?: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  responseType: 'code' | 'token';
  grantType: 'authorization_code' | 'client_credentials' | 'refresh_token';
  pkceRequired: boolean;
  state: boolean;
}

export interface OAuth2Token {
  id: string;
  tenantId: string;
  providerId: string;
  providerName: string;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt?: Date;
  scopes: string[];
  userInfo?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastRefreshedAt?: Date;
}

export interface OAuth2State {
  id: string;
  tenantId: string;
  providerId: string;
  redirectUri: string;
  scopes: string[];
  codeVerifier?: string; // PKCE
  createdAt: Date;
  expiresAt: Date;
}

export interface AuthorizationUrlResult {
  url: string;
  state: string;
  codeVerifier?: string;
}

// =================== SERVICE ===================

@Injectable()
export class OAuth2ProviderService {
  private readonly logger = new Logger(OAuth2ProviderService.name);

  // Storage
  private providers = new Map<string, OAuth2Provider>();
  private tokens = new Map<string, OAuth2Token>();
  private states = new Map<string, OAuth2State>();

  // Configuration
  private readonly baseRedirectUri: string;

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.baseRedirectUri = this.configService.get('APP_URL', 'https://api.documentiulia.ro') + '/integrations/oauth/callback';
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Note: In production, clientId and clientSecret should come from secure config
    const providerConfigs: Omit<OAuth2Provider, 'clientId' | 'clientSecret'>[] = [
      {
        id: 'google',
        name: 'Google',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        revokeUrl: 'https://oauth2.googleapis.com/revoke',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
        scopes: ['openid', 'email', 'profile'],
        responseType: 'code',
        grantType: 'authorization_code',
        pkceRequired: true,
        state: true,
      },
      {
        id: 'microsoft',
        name: 'Microsoft',
        authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scopes: ['openid', 'email', 'profile', 'offline_access'],
        responseType: 'code',
        grantType: 'authorization_code',
        pkceRequired: true,
        state: true,
      },
      {
        id: 'quickbooks',
        name: 'QuickBooks',
        authorizationUrl: 'https://appcenter.intuit.com/connect/oauth2',
        tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        revokeUrl: 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
        scopes: ['com.intuit.quickbooks.accounting'],
        responseType: 'code',
        grantType: 'authorization_code',
        pkceRequired: false,
        state: true,
      },
      {
        id: 'xero',
        name: 'Xero',
        authorizationUrl: 'https://login.xero.com/identity/connect/authorize',
        tokenUrl: 'https://identity.xero.com/connect/token',
        revokeUrl: 'https://identity.xero.com/connect/revocation',
        scopes: ['openid', 'profile', 'email', 'accounting.transactions', 'accounting.contacts'],
        responseType: 'code',
        grantType: 'authorization_code',
        pkceRequired: true,
        state: true,
      },
      {
        id: 'hubspot',
        name: 'HubSpot',
        authorizationUrl: 'https://app.hubspot.com/oauth/authorize',
        tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
        scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write', 'crm.objects.deals.read'],
        responseType: 'code',
        grantType: 'authorization_code',
        pkceRequired: false,
        state: true,
      },
      {
        id: 'salesforce',
        name: 'Salesforce',
        authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
        tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
        revokeUrl: 'https://login.salesforce.com/services/oauth2/revoke',
        userInfoUrl: 'https://login.salesforce.com/services/oauth2/userinfo',
        scopes: ['api', 'refresh_token', 'offline_access'],
        responseType: 'code',
        grantType: 'authorization_code',
        pkceRequired: true,
        state: true,
      },
      {
        id: 'shopify',
        name: 'Shopify',
        authorizationUrl: 'https://{shop}.myshopify.com/admin/oauth/authorize',
        tokenUrl: 'https://{shop}.myshopify.com/admin/oauth/access_token',
        scopes: ['read_orders', 'read_products', 'write_inventory', 'read_customers'],
        responseType: 'code',
        grantType: 'authorization_code',
        pkceRequired: false,
        state: true,
      },
      {
        id: 'slack',
        name: 'Slack',
        authorizationUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        revokeUrl: 'https://slack.com/api/auth.revoke',
        scopes: ['chat:write', 'channels:read', 'users:read'],
        responseType: 'code',
        grantType: 'authorization_code',
        pkceRequired: false,
        state: true,
      },
      {
        id: 'mailchimp',
        name: 'Mailchimp',
        authorizationUrl: 'https://login.mailchimp.com/oauth2/authorize',
        tokenUrl: 'https://login.mailchimp.com/oauth2/token',
        scopes: [],
        responseType: 'code',
        grantType: 'authorization_code',
        pkceRequired: false,
        state: true,
      },
      {
        id: 'dropbox',
        name: 'Dropbox',
        authorizationUrl: 'https://www.dropbox.com/oauth2/authorize',
        tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
        revokeUrl: 'https://api.dropboxapi.com/2/auth/token/revoke',
        scopes: ['files.content.write', 'files.content.read', 'account_info.read'],
        responseType: 'code',
        grantType: 'authorization_code',
        pkceRequired: true,
        state: true,
      },
      {
        id: 'stripe',
        name: 'Stripe Connect',
        authorizationUrl: 'https://connect.stripe.com/oauth/authorize',
        tokenUrl: 'https://connect.stripe.com/oauth/token',
        revokeUrl: 'https://connect.stripe.com/oauth/deauthorize',
        scopes: ['read_write'],
        responseType: 'code',
        grantType: 'authorization_code',
        pkceRequired: false,
        state: true,
      },
    ];

    for (const config of providerConfigs) {
      this.providers.set(config.id, {
        ...config,
        clientId: this.configService.get(`OAUTH_${config.id.toUpperCase()}_CLIENT_ID`, 'placeholder'),
        clientSecret: this.configService.get(`OAUTH_${config.id.toUpperCase()}_CLIENT_SECRET`, 'placeholder'),
      });
    }

    this.logger.log(`Initialized ${this.providers.size} OAuth2 providers`);
  }

  // =================== AUTHORIZATION ===================

  async getAuthorizationUrl(params: {
    providerId: string;
    tenantId: string;
    scopes?: string[];
    redirectUri?: string;
    extraParams?: Record<string, string>;
  }): Promise<AuthorizationUrlResult> {
    const provider = this.providers.get(params.providerId);
    if (!provider) {
      throw new NotFoundException('OAuth2 provider not found');
    }

    const state = this.generateState();
    const scopes = params.scopes || provider.scopes;
    const redirectUri = params.redirectUri || this.baseRedirectUri;

    // Store state for verification
    const stateObj: OAuth2State = {
      id: state,
      tenantId: params.tenantId,
      providerId: params.providerId,
      redirectUri,
      scopes,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    };

    let codeVerifier: string | undefined;
    if (provider.pkceRequired) {
      codeVerifier = this.generateCodeVerifier();
      stateObj.codeVerifier = codeVerifier;
    }

    this.states.set(state, stateObj);

    // Build authorization URL
    const url = new URL(provider.authorizationUrl);
    url.searchParams.set('client_id', provider.clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', provider.responseType);
    url.searchParams.set('scope', scopes.join(' '));

    if (provider.state) {
      url.searchParams.set('state', state);
    }

    if (provider.pkceRequired && codeVerifier) {
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      url.searchParams.set('code_challenge', codeChallenge);
      url.searchParams.set('code_challenge_method', 'S256');
    }

    // Add extra params
    if (params.extraParams) {
      for (const [key, value] of Object.entries(params.extraParams)) {
        url.searchParams.set(key, value);
      }
    }

    return {
      url: url.toString(),
      state,
      codeVerifier,
    };
  }

  async handleCallback(params: {
    providerId: string;
    code: string;
    state: string;
  }): Promise<OAuth2Token> {
    // Verify state
    const stateObj = this.states.get(params.state);
    if (!stateObj) {
      throw new BadRequestException('Invalid or expired state');
    }

    if (stateObj.providerId !== params.providerId) {
      throw new BadRequestException('Provider mismatch');
    }

    if (new Date() > stateObj.expiresAt) {
      this.states.delete(params.state);
      throw new BadRequestException('State expired');
    }

    const provider = this.providers.get(params.providerId);
    if (!provider) {
      throw new NotFoundException('OAuth2 provider not found');
    }

    // Exchange code for tokens
    const tokenData = await this.exchangeCodeForToken({
      provider,
      code: params.code,
      redirectUri: stateObj.redirectUri,
      codeVerifier: stateObj.codeVerifier,
    });

    // Create token record
    const token: OAuth2Token = {
      id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId: stateObj.tenantId,
      providerId: params.providerId,
      providerName: provider.name,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type || 'Bearer',
      expiresAt: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : undefined,
      scopes: stateObj.scopes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Get user info if available
    if (provider.userInfoUrl) {
      try {
        token.userInfo = await this.getUserInfo(provider, token.accessToken);
      } catch (error) {
        this.logger.warn(`Failed to get user info for ${provider.name}`);
      }
    }

    this.tokens.set(token.id, token);
    this.states.delete(params.state);

    this.eventEmitter.emit('oauth2.token.created', { token: { ...token, accessToken: '***', refreshToken: '***' } });
    this.logger.log(`OAuth2 token created for ${provider.name}`);

    return token;
  }

  private async exchangeCodeForToken(params: {
    provider: OAuth2Provider;
    code: string;
    redirectUri: string;
    codeVerifier?: string;
  }): Promise<{
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
  }> {
    // In production, this would make an actual HTTP request
    // Simulating for development
    return {
      access_token: `at_${Math.random().toString(36).substr(2, 40)}`,
      refresh_token: `rt_${Math.random().toString(36).substr(2, 40)}`,
      token_type: 'Bearer',
      expires_in: 3600,
    };
  }

  private async getUserInfo(provider: OAuth2Provider, accessToken: string): Promise<Record<string, any>> {
    // In production, this would make an actual HTTP request
    // Simulating for development
    return {
      id: 'user-123',
      email: 'user@example.com',
      name: 'Test User',
    };
  }

  // =================== TOKEN MANAGEMENT ===================

  async refreshToken(tokenId: string): Promise<OAuth2Token> {
    const token = this.tokens.get(tokenId);
    if (!token) {
      throw new NotFoundException('Token not found');
    }

    if (!token.refreshToken) {
      throw new BadRequestException('No refresh token available');
    }

    const provider = this.providers.get(token.providerId);
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // In production, this would make an actual HTTP request
    const newTokenData = {
      access_token: `at_${Math.random().toString(36).substr(2, 40)}`,
      refresh_token: token.refreshToken, // Some providers return new refresh token
      expires_in: 3600,
    };

    token.accessToken = newTokenData.access_token;
    if (newTokenData.refresh_token) {
      token.refreshToken = newTokenData.refresh_token;
    }
    token.expiresAt = new Date(Date.now() + (newTokenData.expires_in || 3600) * 1000);
    token.updatedAt = new Date();
    token.lastRefreshedAt = new Date();

    this.tokens.set(tokenId, token);

    this.eventEmitter.emit('oauth2.token.refreshed', { tokenId });
    this.logger.log(`OAuth2 token refreshed for ${provider.name}`);

    return token;
  }

  async revokeToken(tokenId: string): Promise<void> {
    const token = this.tokens.get(tokenId);
    if (!token) {
      throw new NotFoundException('Token not found');
    }

    const provider = this.providers.get(token.providerId);
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // In production, would call provider's revoke endpoint
    this.tokens.delete(tokenId);

    this.eventEmitter.emit('oauth2.token.revoked', { tokenId });
    this.logger.log(`OAuth2 token revoked for ${provider.name}`);
  }

  async getToken(tokenId: string): Promise<OAuth2Token | null> {
    const token = this.tokens.get(tokenId);
    if (!token) return null;

    // Check if expired and auto-refresh
    if (token.expiresAt && new Date() > token.expiresAt && token.refreshToken) {
      try {
        return await this.refreshToken(tokenId);
      } catch (error) {
        this.logger.warn(`Failed to auto-refresh token: ${error}`);
      }
    }

    return token;
  }

  async getTokens(tenantId: string): Promise<OAuth2Token[]> {
    return Array.from(this.tokens.values())
      .filter(t => t.tenantId === tenantId)
      .map(t => ({ ...t, accessToken: '***', refreshToken: t.refreshToken ? '***' : undefined }));
  }

  async getValidToken(tenantId: string, providerId: string): Promise<OAuth2Token | null> {
    for (const token of this.tokens.values()) {
      if (token.tenantId === tenantId && token.providerId === providerId) {
        // Auto-refresh if needed
        if (token.expiresAt && new Date() > token.expiresAt && token.refreshToken) {
          try {
            return await this.refreshToken(token.id);
          } catch {
            continue;
          }
        }
        return token;
      }
    }
    return null;
  }

  // =================== PROVIDERS ===================

  async getProviders(): Promise<Array<Omit<OAuth2Provider, 'clientSecret'>>> {
    return Array.from(this.providers.values()).map(p => {
      const { clientSecret, ...rest } = p;
      return { ...rest, clientId: p.clientId.substring(0, 8) + '...' };
    });
  }

  async getProvider(id: string): Promise<Omit<OAuth2Provider, 'clientSecret'> | null> {
    const provider = this.providers.get(id);
    if (!provider) return null;
    const { clientSecret, ...rest } = provider;
    return rest;
  }

  // =================== HELPERS ===================

  private generateState(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let state = '';
    for (let i = 0; i < 32; i++) {
      state += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return state;
  }

  private generateCodeVerifier(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let verifier = '';
    for (let i = 0; i < 64; i++) {
      verifier += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return verifier;
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    // In production, use proper SHA-256 hashing
    // Simplified for development
    return Buffer.from(verifier).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // =================== STATS ===================

  async getStats(tenantId?: string): Promise<{
    totalProviders: number;
    connectedProviders: number;
    totalTokens: number;
    expiredTokens: number;
    tokensNeedingRefresh: number;
  }> {
    let tokens = Array.from(this.tokens.values());
    if (tenantId) {
      tokens = tokens.filter(t => t.tenantId === tenantId);
    }

    const now = new Date();
    const soonExpiry = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

    return {
      totalProviders: this.providers.size,
      connectedProviders: new Set(tokens.map(t => t.providerId)).size,
      totalTokens: tokens.length,
      expiredTokens: tokens.filter(t => t.expiresAt && t.expiresAt < now).length,
      tokensNeedingRefresh: tokens.filter(t => t.expiresAt && t.expiresAt < soonExpiry && t.expiresAt > now).length,
    };
  }
}
