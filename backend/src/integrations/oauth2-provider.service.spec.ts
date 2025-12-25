import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OAuth2ProviderService, OAuth2Token } from './oauth2-provider.service';

describe('OAuth2ProviderService', () => {
  let service: OAuth2ProviderService;
  let eventEmitter: EventEmitter2;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        APP_URL: 'https://api.documentiulia.ro',
        OAUTH_GOOGLE_CLIENT_ID: 'google-client-id',
        OAUTH_GOOGLE_CLIENT_SECRET: 'google-client-secret',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuth2ProviderService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<OAuth2ProviderService>(OAuth2ProviderService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with OAuth2 providers', async () => {
      const providers = await service.getProviders();
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should include major OAuth providers', async () => {
      const google = await service.getProvider('google');
      const microsoft = await service.getProvider('microsoft');
      const salesforce = await service.getProvider('salesforce');

      expect(google).toBeDefined();
      expect(microsoft).toBeDefined();
      expect(salesforce).toBeDefined();
    });
  });

  describe('getProviders', () => {
    it('should return all providers without client secrets', async () => {
      const providers = await service.getProviders();

      expect(providers.length).toBeGreaterThan(5);
      providers.forEach(p => {
        expect(p).not.toHaveProperty('clientSecret');
      });
    });

    it('should mask client IDs', async () => {
      const providers = await service.getProviders();

      providers.forEach(p => {
        expect(p.clientId).toContain('...');
      });
    });

    it('should include QuickBooks for accounting integration', async () => {
      const providers = await service.getProviders();
      const quickbooks = providers.find(p => p.id === 'quickbooks');

      expect(quickbooks).toBeDefined();
      expect(quickbooks?.scopes).toContain('com.intuit.quickbooks.accounting');
    });

    it('should include Xero for accounting integration', async () => {
      const providers = await service.getProviders();
      const xero = providers.find(p => p.id === 'xero');

      expect(xero).toBeDefined();
      expect(xero?.scopes).toContain('accounting.transactions');
    });
  });

  describe('getProvider', () => {
    it('should return provider by ID', async () => {
      const provider = await service.getProvider('google');

      expect(provider).toBeDefined();
      expect(provider?.id).toBe('google');
      expect(provider?.name).toBe('Google');
    });

    it('should not expose client secret', async () => {
      const provider = await service.getProvider('google');

      expect(provider).not.toHaveProperty('clientSecret');
    });

    it('should return null for non-existent provider', async () => {
      const provider = await service.getProvider('non-existent');

      expect(provider).toBeNull();
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should generate authorization URL', async () => {
      const result = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
      });

      expect(result.url).toContain('accounts.google.com');
      expect(result.state).toBeDefined();
      expect(result.state.length).toBe(32);
    });

    it('should include required OAuth parameters', async () => {
      const result = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
      });

      const url = new URL(result.url);
      expect(url.searchParams.get('client_id')).toBeDefined();
      expect(url.searchParams.get('redirect_uri')).toBeDefined();
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toBeDefined();
      expect(url.searchParams.get('state')).toBe(result.state);
    });

    it('should use default scopes from provider', async () => {
      const result = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
      });

      const url = new URL(result.url);
      const scopes = url.searchParams.get('scope');
      expect(scopes).toContain('openid');
      expect(scopes).toContain('email');
      expect(scopes).toContain('profile');
    });

    it('should accept custom scopes', async () => {
      const result = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      const url = new URL(result.url);
      const scopes = url.searchParams.get('scope');
      expect(scopes).toContain('drive.file');
    });

    it('should accept custom redirect URI', async () => {
      const customRedirect = 'https://custom.app/callback';

      const result = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
        redirectUri: customRedirect,
      });

      const url = new URL(result.url);
      expect(url.searchParams.get('redirect_uri')).toBe(customRedirect);
    });

    it('should include PKCE for providers that require it', async () => {
      const result = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
      });

      const url = new URL(result.url);
      expect(url.searchParams.get('code_challenge')).toBeDefined();
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(result.codeVerifier).toBeDefined();
    });

    it('should not include PKCE for providers that do not require it', async () => {
      const result = await service.getAuthorizationUrl({
        providerId: 'quickbooks',
        tenantId: 'tenant-1',
      });

      const url = new URL(result.url);
      expect(url.searchParams.get('code_challenge')).toBeNull();
      expect(result.codeVerifier).toBeUndefined();
    });

    it('should include extra params', async () => {
      const result = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
        extraParams: { access_type: 'offline', prompt: 'consent' },
      });

      const url = new URL(result.url);
      expect(url.searchParams.get('access_type')).toBe('offline');
      expect(url.searchParams.get('prompt')).toBe('consent');
    });

    it('should throw NotFoundException for invalid provider', async () => {
      await expect(
        service.getAuthorizationUrl({
          providerId: 'invalid',
          tenantId: 'tenant-1',
        }),
      ).rejects.toThrow('OAuth2 provider not found');
    });
  });

  describe('handleCallback', () => {
    let authResult: { url: string; state: string; codeVerifier?: string };

    beforeEach(async () => {
      authResult = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
      });
    });

    it('should exchange code for token', async () => {
      const token = await service.handleCallback({
        providerId: 'google',
        code: 'auth-code-123',
        state: authResult.state,
      });

      expect(token.id).toBeDefined();
      expect(token.tenantId).toBe('tenant-1');
      expect(token.providerId).toBe('google');
      expect(token.providerName).toBe('Google');
      expect(token.accessToken).toBeDefined();
      expect(token.tokenType).toBe('Bearer');
    });

    it('should include refresh token', async () => {
      const token = await service.handleCallback({
        providerId: 'google',
        code: 'auth-code-123',
        state: authResult.state,
      });

      expect(token.refreshToken).toBeDefined();
    });

    it('should set expiration time', async () => {
      const token = await service.handleCallback({
        providerId: 'google',
        code: 'auth-code-123',
        state: authResult.state,
      });

      expect(token.expiresAt).toBeDefined();
      expect(token.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should store scopes', async () => {
      const token = await service.handleCallback({
        providerId: 'google',
        code: 'auth-code-123',
        state: authResult.state,
      });

      expect(token.scopes).toContain('openid');
      expect(token.scopes).toContain('email');
    });

    it('should fetch user info when available', async () => {
      const token = await service.handleCallback({
        providerId: 'google',
        code: 'auth-code-123',
        state: authResult.state,
      });

      expect(token.userInfo).toBeDefined();
      expect(token.userInfo?.email).toBeDefined();
    });

    it('should emit oauth2.token.created event', async () => {
      await service.handleCallback({
        providerId: 'google',
        code: 'auth-code-123',
        state: authResult.state,
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('oauth2.token.created', expect.objectContaining({
        token: expect.objectContaining({
          accessToken: '***',
          refreshToken: '***',
        }),
      }));
    });

    it('should delete state after successful callback', async () => {
      await service.handleCallback({
        providerId: 'google',
        code: 'auth-code-123',
        state: authResult.state,
      });

      // Using same state again should fail
      await expect(
        service.handleCallback({
          providerId: 'google',
          code: 'auth-code-456',
          state: authResult.state,
        }),
      ).rejects.toThrow('Invalid or expired state');
    });

    it('should throw BadRequestException for invalid state', async () => {
      await expect(
        service.handleCallback({
          providerId: 'google',
          code: 'auth-code-123',
          state: 'invalid-state',
        }),
      ).rejects.toThrow('Invalid or expired state');
    });

    it('should throw BadRequestException for provider mismatch', async () => {
      await expect(
        service.handleCallback({
          providerId: 'microsoft',
          code: 'auth-code-123',
          state: authResult.state,
        }),
      ).rejects.toThrow('Provider mismatch');
    });

    it('should throw BadRequestException for expired state', async () => {
      // Manually expire the state by modifying it
      const statesMap = (service as any).states;
      const stateObj = statesMap.get(authResult.state);
      stateObj.expiresAt = new Date(Date.now() - 1000);
      statesMap.set(authResult.state, stateObj);

      await expect(
        service.handleCallback({
          providerId: 'google',
          code: 'auth-code-123',
          state: authResult.state,
        }),
      ).rejects.toThrow('State expired');
    });
  });

  describe('refreshToken', () => {
    let token: OAuth2Token;

    beforeEach(async () => {
      const authResult = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
      });

      token = await service.handleCallback({
        providerId: 'google',
        code: 'auth-code-123',
        state: authResult.state,
      });
    });

    it('should refresh access token', async () => {
      const originalAccessToken = token.accessToken;

      const refreshed = await service.refreshToken(token.id);

      expect(refreshed.accessToken).toBeDefined();
      expect(refreshed.accessToken).not.toBe(originalAccessToken);
    });

    it('should update expiration time', async () => {
      const originalExpiry = token.expiresAt;
      await new Promise(resolve => setTimeout(resolve, 5));

      const refreshed = await service.refreshToken(token.id);

      expect(refreshed.expiresAt!.getTime()).toBeGreaterThanOrEqual(originalExpiry!.getTime());
    });

    it('should set lastRefreshedAt', async () => {
      const refreshed = await service.refreshToken(token.id);

      expect(refreshed.lastRefreshedAt).toBeDefined();
    });

    it('should emit oauth2.token.refreshed event', async () => {
      await service.refreshToken(token.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('oauth2.token.refreshed', {
        tokenId: token.id,
      });
    });

    it('should throw NotFoundException for invalid token', async () => {
      await expect(service.refreshToken('invalid-id')).rejects.toThrow('Token not found');
    });

    it('should throw BadRequestException when no refresh token', async () => {
      // Remove refresh token
      const tokensMap = (service as any).tokens;
      const storedToken = tokensMap.get(token.id);
      storedToken.refreshToken = undefined;
      tokensMap.set(token.id, storedToken);

      await expect(service.refreshToken(token.id)).rejects.toThrow('No refresh token available');
    });
  });

  describe('revokeToken', () => {
    let token: OAuth2Token;

    beforeEach(async () => {
      const authResult = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
      });

      token = await service.handleCallback({
        providerId: 'google',
        code: 'auth-code-123',
        state: authResult.state,
      });
    });

    it('should revoke and delete token', async () => {
      await service.revokeToken(token.id);

      const retrieved = await service.getToken(token.id);
      expect(retrieved).toBeNull();
    });

    it('should emit oauth2.token.revoked event', async () => {
      await service.revokeToken(token.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('oauth2.token.revoked', {
        tokenId: token.id,
      });
    });

    it('should throw NotFoundException for invalid token', async () => {
      await expect(service.revokeToken('invalid-id')).rejects.toThrow('Token not found');
    });
  });

  describe('getToken', () => {
    let token: OAuth2Token;

    beforeEach(async () => {
      const authResult = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
      });

      token = await service.handleCallback({
        providerId: 'google',
        code: 'auth-code-123',
        state: authResult.state,
      });
    });

    it('should return token by ID', async () => {
      const retrieved = await service.getToken(token.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(token.id);
    });

    it('should return null for non-existent token', async () => {
      const retrieved = await service.getToken('invalid-id');

      expect(retrieved).toBeNull();
    });

    it('should auto-refresh expired token with refresh token', async () => {
      // Expire the token
      const tokensMap = (service as any).tokens;
      const storedToken = tokensMap.get(token.id);
      storedToken.expiresAt = new Date(Date.now() - 1000);
      tokensMap.set(token.id, storedToken);

      const retrieved = await service.getToken(token.id);

      expect(retrieved?.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return expired token without refresh token', async () => {
      // Expire the token and remove refresh token
      const tokensMap = (service as any).tokens;
      const storedToken = tokensMap.get(token.id);
      storedToken.expiresAt = new Date(Date.now() - 1000);
      storedToken.refreshToken = undefined;
      tokensMap.set(token.id, storedToken);

      const retrieved = await service.getToken(token.id);

      expect(retrieved?.expiresAt!.getTime()).toBeLessThan(Date.now());
    });
  });

  describe('getTokens', () => {
    beforeEach(async () => {
      // Create tokens for tenant-1
      const auth1 = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
      });
      await service.handleCallback({
        providerId: 'google',
        code: 'code-1',
        state: auth1.state,
      });

      const auth2 = await service.getAuthorizationUrl({
        providerId: 'microsoft',
        tenantId: 'tenant-1',
      });
      await service.handleCallback({
        providerId: 'microsoft',
        code: 'code-2',
        state: auth2.state,
      });

      // Create token for tenant-2
      const auth3 = await service.getAuthorizationUrl({
        providerId: 'salesforce',
        tenantId: 'tenant-2',
      });
      await service.handleCallback({
        providerId: 'salesforce',
        code: 'code-3',
        state: auth3.state,
      });
    });

    it('should return tokens for tenant', async () => {
      const tokens = await service.getTokens('tenant-1');

      expect(tokens.length).toBe(2);
      expect(tokens.every(t => t.tenantId === 'tenant-1')).toBe(true);
    });

    it('should mask access tokens', async () => {
      const tokens = await service.getTokens('tenant-1');

      tokens.forEach(t => {
        expect(t.accessToken).toBe('***');
      });
    });

    it('should mask refresh tokens', async () => {
      const tokens = await service.getTokens('tenant-1');

      tokens.forEach(t => {
        if (t.refreshToken) {
          expect(t.refreshToken).toBe('***');
        }
      });
    });

    it('should return empty array for tenant without tokens', async () => {
      const tokens = await service.getTokens('tenant-99');

      expect(tokens).toEqual([]);
    });
  });

  describe('getValidToken', () => {
    let token: OAuth2Token;

    beforeEach(async () => {
      const authResult = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
      });

      token = await service.handleCallback({
        providerId: 'google',
        code: 'auth-code-123',
        state: authResult.state,
      });
    });

    it('should return valid token for tenant and provider', async () => {
      const retrieved = await service.getValidToken('tenant-1', 'google');

      expect(retrieved).toBeDefined();
      expect(retrieved?.providerId).toBe('google');
      expect(retrieved?.tenantId).toBe('tenant-1');
    });

    it('should return null when no matching token', async () => {
      const retrieved = await service.getValidToken('tenant-1', 'salesforce');

      expect(retrieved).toBeNull();
    });

    it('should auto-refresh expired token', async () => {
      // Expire the token
      const tokensMap = (service as any).tokens;
      const storedToken = tokensMap.get(token.id);
      storedToken.expiresAt = new Date(Date.now() - 1000);
      tokensMap.set(token.id, storedToken);

      const retrieved = await service.getValidToken('tenant-1', 'google');

      expect(retrieved?.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return expired token when refresh not available', async () => {
      // Expire the token and remove refresh token
      // Service returns the token even if expired without refresh token
      const tokensMap = (service as any).tokens;
      const storedToken = tokensMap.get(token.id);
      storedToken.expiresAt = new Date(Date.now() - 1000);
      storedToken.refreshToken = undefined;
      tokensMap.set(token.id, storedToken);

      const retrieved = await service.getValidToken('tenant-1', 'google');

      expect(retrieved).toBeDefined();
      expect(retrieved?.expiresAt!.getTime()).toBeLessThan(Date.now());
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      // Create tokens
      const auth1 = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
      });
      await service.handleCallback({
        providerId: 'google',
        code: 'code-1',
        state: auth1.state,
      });

      const auth2 = await service.getAuthorizationUrl({
        providerId: 'microsoft',
        tenantId: 'tenant-1',
      });
      await service.handleCallback({
        providerId: 'microsoft',
        code: 'code-2',
        state: auth2.state,
      });

      const auth3 = await service.getAuthorizationUrl({
        providerId: 'salesforce',
        tenantId: 'tenant-2',
      });
      await service.handleCallback({
        providerId: 'salesforce',
        code: 'code-3',
        state: auth3.state,
      });
    });

    it('should return total providers count', async () => {
      const stats = await service.getStats();

      expect(stats.totalProviders).toBeGreaterThan(5);
    });

    it('should return connected providers count', async () => {
      const stats = await service.getStats();

      expect(stats.connectedProviders).toBe(3);
    });

    it('should return total tokens count', async () => {
      const stats = await service.getStats();

      expect(stats.totalTokens).toBe(3);
    });

    it('should count expired tokens', async () => {
      // Expire a token
      const tokensMap = (service as any).tokens as Map<string, OAuth2Token>;
      const firstToken = Array.from(tokensMap.values()).find((t) => t.tenantId === 'tenant-1');
      if (firstToken) {
        firstToken.expiresAt = new Date(Date.now() - 1000);
        tokensMap.set(firstToken.id, firstToken);
      }

      const stats = await service.getStats();

      expect(stats.expiredTokens).toBe(1);
    });

    it('should count tokens needing refresh', async () => {
      // Set token to expire in 15 minutes
      const tokensMap = (service as any).tokens as Map<string, OAuth2Token>;
      const firstToken = Array.from(tokensMap.values())[0];
      firstToken.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      tokensMap.set(firstToken.id, firstToken);

      const stats = await service.getStats();

      expect(stats.tokensNeedingRefresh).toBeGreaterThanOrEqual(1);
    });

    it('should filter by tenant', async () => {
      const stats = await service.getStats('tenant-1');

      expect(stats.totalTokens).toBe(2);
      expect(stats.connectedProviders).toBe(2);
    });
  });

  describe('Provider-specific tests', () => {
    describe('Google OAuth', () => {
      it('should have correct Google configuration', async () => {
        const provider = await service.getProvider('google');

        expect(provider?.authorizationUrl).toContain('accounts.google.com');
        expect(provider?.tokenUrl).toContain('googleapis.com');
        expect(provider?.pkceRequired).toBe(true);
        expect(provider?.scopes).toContain('openid');
      });

      it('should have user info URL', async () => {
        const provider = await service.getProvider('google');

        expect(provider?.userInfoUrl).toContain('googleapis.com');
      });
    });

    describe('Microsoft OAuth', () => {
      it('should have correct Microsoft configuration', async () => {
        const provider = await service.getProvider('microsoft');

        expect(provider?.authorizationUrl).toContain('login.microsoftonline.com');
        expect(provider?.pkceRequired).toBe(true);
        expect(provider?.scopes).toContain('offline_access');
      });
    });

    describe('QuickBooks OAuth', () => {
      it('should have correct QuickBooks configuration', async () => {
        const provider = await service.getProvider('quickbooks');

        expect(provider?.authorizationUrl).toContain('intuit.com');
        expect(provider?.scopes).toContain('com.intuit.quickbooks.accounting');
        expect(provider?.pkceRequired).toBe(false);
      });
    });

    describe('Salesforce OAuth', () => {
      it('should have correct Salesforce configuration', async () => {
        const provider = await service.getProvider('salesforce');

        expect(provider?.authorizationUrl).toContain('salesforce.com');
        expect(provider?.pkceRequired).toBe(true);
        expect(provider?.scopes).toContain('api');
      });
    });

    describe('Shopify OAuth', () => {
      it('should have correct Shopify configuration', async () => {
        const provider = await service.getProvider('shopify');

        expect(provider?.authorizationUrl).toContain('myshopify.com');
        expect(provider?.scopes).toContain('read_orders');
        expect(provider?.scopes).toContain('read_products');
      });
    });

    describe('Slack OAuth', () => {
      it('should have correct Slack configuration', async () => {
        const provider = await service.getProvider('slack');

        expect(provider?.authorizationUrl).toContain('slack.com');
        expect(provider?.scopes).toContain('chat:write');
      });
    });

    describe('Stripe Connect', () => {
      it('should have correct Stripe configuration', async () => {
        const provider = await service.getProvider('stripe');

        expect(provider?.authorizationUrl).toContain('connect.stripe.com');
        expect(provider?.scopes).toContain('read_write');
      });
    });

    describe('Dropbox OAuth', () => {
      it('should have correct Dropbox configuration', async () => {
        const provider = await service.getProvider('dropbox');

        expect(provider?.authorizationUrl).toContain('dropbox.com');
        expect(provider?.pkceRequired).toBe(true);
      });
    });
  });

  describe('PKCE functionality', () => {
    it('should generate code verifier for PKCE providers', async () => {
      const result = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
      });

      expect(result.codeVerifier).toBeDefined();
      expect(result.codeVerifier!.length).toBe(64);
    });

    it('should generate code challenge', async () => {
      const result = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
      });

      const url = new URL(result.url);
      const challenge = url.searchParams.get('code_challenge');

      expect(challenge).toBeDefined();
      // Base64 URL encoded (no +, /, =)
      expect(challenge).not.toContain('+');
      expect(challenge).not.toContain('/');
      expect(challenge).not.toContain('=');
    });

    it('should use S256 challenge method', async () => {
      const result = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
      });

      const url = new URL(result.url);
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    });
  });

  describe('State management', () => {
    it('should generate unique states', async () => {
      const result1 = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
      });

      const result2 = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
      });

      expect(result1.state).not.toBe(result2.state);
    });

    it('should store state with tenant context', async () => {
      const result = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
      });

      const statesMap = (service as any).states;
      const stateObj = statesMap.get(result.state);

      expect(stateObj.tenantId).toBe('tenant-1');
      expect(stateObj.providerId).toBe('google');
    });

    it('should set state expiration', async () => {
      const result = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
      });

      const statesMap = (service as any).states;
      const stateObj = statesMap.get(result.state);

      expect(stateObj.expiresAt).toBeDefined();
      expect(stateObj.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Token lifecycle', () => {
    it('should complete full OAuth flow', async () => {
      // 1. Get authorization URL
      const authResult = await service.getAuthorizationUrl({
        providerId: 'google',
        tenantId: 'tenant-1',
        scopes: ['openid', 'email', 'https://www.googleapis.com/auth/drive.file'],
      });

      expect(authResult.url).toBeDefined();
      expect(authResult.state).toBeDefined();

      // 2. Handle callback (simulates user auth)
      const token = await service.handleCallback({
        providerId: 'google',
        code: 'auth-code-from-google',
        state: authResult.state,
      });

      expect(token.accessToken).toBeDefined();
      expect(token.scopes).toContain('openid');

      // 3. Refresh token
      const refreshed = await service.refreshToken(token.id);
      expect(refreshed.accessToken).toBeDefined();
      expect(refreshed.lastRefreshedAt).toBeDefined();

      // 4. Get valid token
      const validToken = await service.getValidToken('tenant-1', 'google');
      expect(validToken).toBeDefined();

      // 5. Revoke token
      await service.revokeToken(token.id);
      const revoked = await service.getToken(token.id);
      expect(revoked).toBeNull();
    });
  });
});
