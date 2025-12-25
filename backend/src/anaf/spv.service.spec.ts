import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SpvService } from './spv.service';
import { SpvStatus, SpvMessageStatus, SpvSubmissionType, SpvSubmissionStatus } from '@prisma/client';

// Mock axios
const mockAxiosInstance = {
  post: jest.fn(),
  get: jest.fn(),
};

jest.mock('axios', () => ({
  default: {
    create: jest.fn(() => mockAxiosInstance),
  },
  create: jest.fn(() => mockAxiosInstance),
}));

describe('SpvService', () => {
  let service: SpvService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        ANAF_CLIENT_ID: 'test-client-id',
        ANAF_CLIENT_SECRET: 'test-client-secret',
        ANAF_REDIRECT_URI: 'https://app.example.com/api/v1/spv/oauth/callback',
        APP_URL: 'https://app.example.com',
      };
      return config[key];
    }),
  };

  const mockPrismaService = {
    spvToken: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    spvSubmission: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    spvMessage: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    sAFTReport: {
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpvService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SpvService>(SpvService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('OAuth2 Flow', () => {
    describe('getAuthorizationUrl', () => {
      it('should generate authorization URL', () => {
        const result = service.getAuthorizationUrl('user-1', '12345678');

        expect(result.authUrl).toContain('https://logincert.anaf.ro/anaf-oauth2/v1/authorize');
        expect(result.authUrl).toContain('client_id=test-client-id');
        expect(result.authUrl).toContain('response_type=code');
        expect(result.authUrl).toContain('redirect_uri=');
        expect(result.authUrl).toContain('scope=');
        expect(result.authUrl).toContain('state=');
        expect(result.state).toBeDefined();
        expect(result.state).toHaveLength(64); // hex encoded 32 bytes
      });

      it('should include CSRF state parameter', () => {
        const result1 = service.getAuthorizationUrl('user-1', '12345678');
        const result2 = service.getAuthorizationUrl('user-1', '12345678');

        // State should be unique each time
        expect(result1.state).not.toBe(result2.state);
      });

      it('should include SPV scopes', () => {
        const result = service.getAuthorizationUrl('user-1', '12345678');

        expect(result.authUrl).toContain('SPVWebServiceAccess');
        expect(result.authUrl).toContain('SPVWebServiceUpload');
      });

      it('should encode redirect URI', () => {
        const result = service.getAuthorizationUrl('user-1', '12345678');

        // Should be URL encoded
        expect(result.authUrl).toContain(encodeURIComponent('https://app.example.com/api/v1/spv/oauth/callback'));
      });
    });

    describe('handleOAuthCallback', () => {
      it('should reject invalid state', async () => {
        await expect(
          service.handleOAuthCallback('auth-code', 'invalid-state'),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should reject expired state', async () => {
        // Get auth URL to create state
        const { state } = service.getAuthorizationUrl('user-1', '12345678');

        // Manually expire the state by accessing internal state map
        const statesMap = (service as any).states;
        const stateData = statesMap.get(state);
        stateData.expiresAt = Date.now() - 1000; // Expired

        await expect(
          service.handleOAuthCallback('auth-code', state),
        ).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('refreshToken', () => {
      it('should throw if no token exists', async () => {
        mockPrismaService.spvToken.findUnique.mockResolvedValue(null);

        await expect(service.refreshToken('user-1')).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw if no refresh token available', async () => {
        mockPrismaService.spvToken.findUnique.mockResolvedValue({
          userId: 'user-1',
          accessToken: 'old-token',
          refreshToken: null,
        });

        await expect(service.refreshToken('user-1')).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('getValidToken', () => {
      it('should return valid token if not expired', async () => {
        const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        mockPrismaService.spvToken.findUnique.mockResolvedValue({
          userId: 'user-1',
          accessToken: 'valid-token',
          expiresAt: futureDate,
          status: SpvStatus.ACTIVE,
        });
        mockPrismaService.spvToken.update.mockResolvedValue({});

        const token = await service.getValidToken('user-1');

        expect(token).toBe('valid-token');
        expect(mockPrismaService.spvToken.update).toHaveBeenCalledWith({
          where: { userId: 'user-1' },
          data: { lastUsedAt: expect.any(Date) },
        });
      });

      it('should throw if no token exists', async () => {
        mockPrismaService.spvToken.findUnique.mockResolvedValue(null);

        await expect(service.getValidToken('user-1')).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should throw if token expired without refresh token', async () => {
        const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
        mockPrismaService.spvToken.findUnique.mockResolvedValue({
          userId: 'user-1',
          accessToken: 'expired-token',
          expiresAt: pastDate,
          refreshToken: null,
        });

        await expect(service.getValidToken('user-1')).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });

    describe('disconnect', () => {
      it('should revoke token and clear credentials', async () => {
        mockPrismaService.spvToken.update.mockResolvedValue({});

        await service.disconnect('user-1');

        expect(mockPrismaService.spvToken.update).toHaveBeenCalledWith({
          where: { userId: 'user-1' },
          data: {
            status: SpvStatus.REVOKED,
            accessToken: '',
            refreshToken: null,
          },
        });
      });
    });
  });

  describe('Connection Status', () => {
    describe('getConnectionStatus', () => {
      it('should return disconnected status when no token', async () => {
        mockPrismaService.spvToken.findUnique.mockResolvedValue(null);

        const status = await service.getConnectionStatus('user-1');

        expect(status.connected).toBe(false);
        expect(status.status).toBe(SpvStatus.PENDING);
        expect(status.features).toEqual({
          efactura: false,
          saft: false,
          notifications: false,
        });
      });

      it('should return connected status with active token', async () => {
        mockPrismaService.spvToken.findUnique.mockResolvedValue({
          userId: 'user-1',
          cui: '12345678',
          status: SpvStatus.ACTIVE,
          scope: 'SPVWebServiceAccess SPVWebServiceUpload',
          expiresAt: new Date(Date.now() + 3600000),
          lastUsedAt: new Date(),
          lastError: null,
        });

        const status = await service.getConnectionStatus('user-1');

        expect(status.connected).toBe(true);
        expect(status.status).toBe(SpvStatus.ACTIVE);
        expect(status.cui).toBe('12345678');
        expect(status.features.efactura).toBe(true);
        expect(status.features.saft).toBe(true);
        expect(status.features.notifications).toBe(true);
      });

      it('should return disconnected for expired token', async () => {
        mockPrismaService.spvToken.findUnique.mockResolvedValue({
          userId: 'user-1',
          status: SpvStatus.EXPIRED,
          scope: '',
          lastError: 'Token expired',
        });

        const status = await service.getConnectionStatus('user-1');

        expect(status.connected).toBe(false);
        expect(status.status).toBe(SpvStatus.EXPIRED);
        expect(status.lastError).toBe('Token expired');
      });

      it('should return features based on scope', async () => {
        mockPrismaService.spvToken.findUnique.mockResolvedValue({
          userId: 'user-1',
          status: SpvStatus.ACTIVE,
          scope: 'SPVWebServiceAccess', // Only read access
        });

        const status = await service.getConnectionStatus('user-1');

        expect(status.features.efactura).toBe(true);
        expect(status.features.saft).toBe(false);
      });
    });
  });

  describe('e-Factura Operations', () => {
    describe('submitEfactura', () => {
      it('should throw if not connected', async () => {
        mockPrismaService.spvToken.findUnique.mockResolvedValue(null);

        await expect(
          service.submitEfactura('user-1', '<xml></xml>', '12345678'),
        ).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('checkEfacturaStatus', () => {
      it('should throw if not connected', async () => {
        mockPrismaService.spvToken.findUnique.mockResolvedValue(null);

        await expect(
          service.checkEfacturaStatus('user-1', '123456'),
        ).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('downloadReceivedEfacturi', () => {
      it('should throw if not connected', async () => {
        mockPrismaService.spvToken.findUnique.mockResolvedValue(null);

        await expect(
          service.downloadReceivedEfacturi('user-1', '12345678'),
        ).rejects.toThrow(UnauthorizedException);
      });
    });
  });

  describe('SAF-T Operations', () => {
    describe('submitSaft', () => {
      it('should throw if not connected', async () => {
        mockPrismaService.spvToken.findUnique.mockResolvedValue(null);

        await expect(
          service.submitSaft('user-1', '<xml></xml>', '12345678', '2024-01'),
        ).rejects.toThrow(UnauthorizedException);
      });
    });
  });

  describe('Messages', () => {
    describe('getMessages', () => {
      it('should return messages with pagination', async () => {
        const mockMessages = [
          { id: 'msg-1', subject: 'e-Factura received', status: SpvMessageStatus.UNREAD },
          { id: 'msg-2', subject: 'SAF-T validated', status: SpvMessageStatus.READ },
        ];

        mockPrismaService.spvMessage.findMany.mockResolvedValue(mockMessages);
        mockPrismaService.spvMessage.count
          .mockResolvedValueOnce(10) // total
          .mockResolvedValueOnce(5); // unread

        const result = await service.getMessages('user-1', 50, 0);

        expect(result.messages).toHaveLength(2);
        expect(result.total).toBe(10);
        expect(result.unreadCount).toBe(5);
        expect(mockPrismaService.spvMessage.findMany).toHaveBeenCalledWith({
          where: { userId: 'user-1' },
          orderBy: { anafCreatedAt: 'desc' },
          take: 50,
          skip: 0,
        });
      });

      it('should apply pagination parameters', async () => {
        mockPrismaService.spvMessage.findMany.mockResolvedValue([]);
        mockPrismaService.spvMessage.count.mockResolvedValue(0);

        await service.getMessages('user-1', 10, 20);

        expect(mockPrismaService.spvMessage.findMany).toHaveBeenCalledWith({
          where: { userId: 'user-1' },
          orderBy: { anafCreatedAt: 'desc' },
          take: 10,
          skip: 20,
        });
      });
    });

    describe('markMessageRead', () => {
      it('should mark message as read', async () => {
        mockPrismaService.spvMessage.updateMany.mockResolvedValue({ count: 1 });

        await service.markMessageRead('user-1', 'msg-1');

        expect(mockPrismaService.spvMessage.updateMany).toHaveBeenCalledWith({
          where: { id: 'msg-1', userId: 'user-1' },
          data: { status: SpvMessageStatus.READ, readAt: expect.any(Date) },
        });
      });
    });
  });

  describe('Submissions', () => {
    describe('getSubmissions', () => {
      it('should return all submissions for user', async () => {
        const mockSubmissions = [
          { id: 'sub-1', submissionType: SpvSubmissionType.EFACTURA_SEND, status: SpvSubmissionStatus.ACCEPTED },
          { id: 'sub-2', submissionType: SpvSubmissionType.SAFT_D406, status: SpvSubmissionStatus.PENDING },
        ];

        mockPrismaService.spvSubmission.findMany.mockResolvedValue(mockSubmissions);
        mockPrismaService.spvSubmission.count.mockResolvedValue(2);

        const result = await service.getSubmissions('user-1', {});

        expect(result.submissions).toHaveLength(2);
        expect(result.total).toBe(2);
      });

      it('should filter by type', async () => {
        mockPrismaService.spvSubmission.findMany.mockResolvedValue([]);
        mockPrismaService.spvSubmission.count.mockResolvedValue(0);

        await service.getSubmissions('user-1', {
          type: SpvSubmissionType.EFACTURA_SEND,
        });

        expect(mockPrismaService.spvSubmission.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: 'user-1', submissionType: SpvSubmissionType.EFACTURA_SEND },
          }),
        );
      });

      it('should filter by status', async () => {
        mockPrismaService.spvSubmission.findMany.mockResolvedValue([]);
        mockPrismaService.spvSubmission.count.mockResolvedValue(0);

        await service.getSubmissions('user-1', {
          status: SpvSubmissionStatus.PENDING,
        });

        expect(mockPrismaService.spvSubmission.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: 'user-1', status: SpvSubmissionStatus.PENDING },
          }),
        );
      });

      it('should filter by period', async () => {
        mockPrismaService.spvSubmission.findMany.mockResolvedValue([]);
        mockPrismaService.spvSubmission.count.mockResolvedValue(0);

        await service.getSubmissions('user-1', {
          period: '2024-01',
        });

        expect(mockPrismaService.spvSubmission.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: 'user-1', period: '2024-01' },
          }),
        );
      });

      it('should apply pagination', async () => {
        mockPrismaService.spvSubmission.findMany.mockResolvedValue([]);
        mockPrismaService.spvSubmission.count.mockResolvedValue(0);

        await service.getSubmissions('user-1', {
          limit: 25,
          offset: 50,
        });

        expect(mockPrismaService.spvSubmission.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 25,
            skip: 50,
          }),
        );
      });

      it('should combine multiple filters', async () => {
        mockPrismaService.spvSubmission.findMany.mockResolvedValue([]);
        mockPrismaService.spvSubmission.count.mockResolvedValue(0);

        await service.getSubmissions('user-1', {
          type: SpvSubmissionType.SAFT_D406,
          status: SpvSubmissionStatus.ACCEPTED,
          period: '2024-06',
        });

        expect(mockPrismaService.spvSubmission.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              userId: 'user-1',
              submissionType: SpvSubmissionType.SAFT_D406,
              status: SpvSubmissionStatus.ACCEPTED,
              period: '2024-06',
            },
          }),
        );
      });
    });
  });

  describe('Dashboard', () => {
    describe('getDashboard', () => {
      it('should return dashboard data', async () => {
        mockPrismaService.spvToken.findUnique.mockResolvedValue({
          userId: 'user-1',
          status: SpvStatus.ACTIVE,
          scope: 'SPVWebServiceAccess SPVWebServiceUpload',
        });
        mockPrismaService.spvMessage.count.mockResolvedValue(3);
        mockPrismaService.spvSubmission.count.mockResolvedValue(2);
        mockPrismaService.spvSubmission.findMany.mockResolvedValue([
          { id: 'sub-1', submissionType: SpvSubmissionType.EFACTURA_SEND },
        ]);

        const dashboard = await service.getDashboard('user-1');

        expect(dashboard.connection.connected).toBe(true);
        expect(dashboard.unreadMessages).toBe(3);
        expect(dashboard.pendingSubmissions).toBe(2);
        expect(dashboard.recentSubmissions).toHaveLength(1);
        expect(dashboard.deadlines).toBeDefined();
        expect(dashboard.deadlines.saftNextDeadline).toBeInstanceOf(Date);
        expect(dashboard.deadlines.daysRemaining).toBeGreaterThanOrEqual(0);
        expect(dashboard.deadlines.saftPeriod).toMatch(/^\d{4}-\d{2}$/);
      });

      it('should calculate SAF-T deadline correctly', async () => {
        mockPrismaService.spvToken.findUnique.mockResolvedValue(null);
        mockPrismaService.spvMessage.count.mockResolvedValue(0);
        mockPrismaService.spvSubmission.count.mockResolvedValue(0);
        mockPrismaService.spvSubmission.findMany.mockResolvedValue([]);

        const dashboard = await service.getDashboard('user-1');

        // Deadline should be the 25th of next month
        const deadline = dashboard.deadlines.saftNextDeadline;
        expect(deadline.getDate()).toBe(25);
      });

      it('should return connection status', async () => {
        mockPrismaService.spvToken.findUnique.mockResolvedValue(null);
        mockPrismaService.spvMessage.count.mockResolvedValue(0);
        mockPrismaService.spvSubmission.count.mockResolvedValue(0);
        mockPrismaService.spvSubmission.findMany.mockResolvedValue([]);

        const dashboard = await service.getDashboard('user-1');

        expect(dashboard.connection.connected).toBe(false);
        expect(dashboard.connection.status).toBe(SpvStatus.PENDING);
      });
    });
  });

  describe('Scheduled Tasks', () => {
    describe('refreshExpiringTokens', () => {
      it('should find and refresh expiring tokens', async () => {
        mockPrismaService.spvToken.findMany.mockResolvedValue([]);

        await service.refreshExpiringTokens();

        expect(mockPrismaService.spvToken.findMany).toHaveBeenCalledWith({
          where: {
            status: SpvStatus.ACTIVE,
            expiresAt: { lte: expect.any(Date) },
            refreshToken: { not: null },
          },
        });
      });
    });

    describe('checkPendingSubmissions', () => {
      it('should find pending submissions from last 7 days', async () => {
        mockPrismaService.spvSubmission.findMany.mockResolvedValue([]);

        await service.checkPendingSubmissions();

        expect(mockPrismaService.spvSubmission.findMany).toHaveBeenCalledWith({
          where: {
            status: SpvSubmissionStatus.PENDING,
            submittedAt: { gte: expect.any(Date) },
          },
        });
      });
    });

    describe('syncReceivedEfacturi', () => {
      it('should find all active tokens for sync', async () => {
        mockPrismaService.spvToken.findMany.mockResolvedValue([]);

        await service.syncReceivedEfacturi();

        expect(mockPrismaService.spvToken.findMany).toHaveBeenCalledWith({
          where: { status: SpvStatus.ACTIVE },
        });
      });
    });
  });

  describe('Token Lifecycle', () => {
    it('should handle full token lifecycle', async () => {
      // 1. Generate auth URL
      const { state } = service.getAuthorizationUrl('user-1', '12345678');
      expect(state).toBeDefined();

      // 2. Cannot get token before authorization
      mockPrismaService.spvToken.findUnique.mockResolvedValue(null);
      await expect(service.getValidToken('user-1')).rejects.toThrow(UnauthorizedException);

      // 3. After successful authorization, token should be available
      const futureDate = new Date(Date.now() + 3600000);
      mockPrismaService.spvToken.findUnique.mockResolvedValue({
        userId: 'user-1',
        accessToken: 'valid-token',
        expiresAt: futureDate,
        status: SpvStatus.ACTIVE,
      });
      mockPrismaService.spvToken.update.mockResolvedValue({});

      const token = await service.getValidToken('user-1');
      expect(token).toBe('valid-token');

      // 4. Disconnect
      await service.disconnect('user-1');
      expect(mockPrismaService.spvToken.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: expect.objectContaining({
          status: SpvStatus.REVOKED,
        }),
      });
    });
  });

  describe('SpvStatus Enum', () => {
    it('should handle all SPV statuses', async () => {
      const statuses = [SpvStatus.PENDING, SpvStatus.ACTIVE, SpvStatus.EXPIRED, SpvStatus.REVOKED, SpvStatus.ERROR];

      for (const status of statuses) {
        mockPrismaService.spvToken.findUnique.mockResolvedValue({
          userId: 'user-1',
          status,
          scope: '',
        });

        const result = await service.getConnectionStatus('user-1');

        expect(result.status).toBe(status);
        expect(result.connected).toBe(status === SpvStatus.ACTIVE);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing CUI in token', async () => {
      mockPrismaService.spvToken.findUnique.mockResolvedValue({
        userId: 'user-1',
        status: SpvStatus.ACTIVE,
        scope: 'SPVWebServiceAccess',
        cui: null,
      });

      const status = await service.getConnectionStatus('user-1');

      expect(status.cui).toBeNull();
    });

    it('should handle empty scope', async () => {
      mockPrismaService.spvToken.findUnique.mockResolvedValue({
        userId: 'user-1',
        status: SpvStatus.ACTIVE,
        scope: '',
      });

      const status = await service.getConnectionStatus('user-1');

      expect(status.features.efactura).toBe(false);
      expect(status.features.saft).toBe(false);
    });

    it('should handle null scope', async () => {
      mockPrismaService.spvToken.findUnique.mockResolvedValue({
        userId: 'user-1',
        status: SpvStatus.ACTIVE,
        scope: null,
      });

      const status = await service.getConnectionStatus('user-1');

      expect(status.features.efactura).toBe(false);
      expect(status.features.saft).toBe(false);
    });
  });

  describe('Submission Types', () => {
    it('should filter by EFACTURA_SEND', async () => {
      mockPrismaService.spvSubmission.findMany.mockResolvedValue([]);
      mockPrismaService.spvSubmission.count.mockResolvedValue(0);

      await service.getSubmissions('user-1', { type: SpvSubmissionType.EFACTURA_SEND });

      expect(mockPrismaService.spvSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            submissionType: SpvSubmissionType.EFACTURA_SEND,
          }),
        }),
      );
    });

    it('should filter by SAFT_D406', async () => {
      mockPrismaService.spvSubmission.findMany.mockResolvedValue([]);
      mockPrismaService.spvSubmission.count.mockResolvedValue(0);

      await service.getSubmissions('user-1', { type: SpvSubmissionType.SAFT_D406 });

      expect(mockPrismaService.spvSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            submissionType: SpvSubmissionType.SAFT_D406,
          }),
        }),
      );
    });
  });

  describe('Submission Statuses', () => {
    it('should filter by PENDING status', async () => {
      mockPrismaService.spvSubmission.findMany.mockResolvedValue([]);
      mockPrismaService.spvSubmission.count.mockResolvedValue(0);

      await service.getSubmissions('user-1', { status: SpvSubmissionStatus.PENDING });

      expect(mockPrismaService.spvSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: SpvSubmissionStatus.PENDING,
          }),
        }),
      );
    });

    it('should filter by ACCEPTED status', async () => {
      mockPrismaService.spvSubmission.findMany.mockResolvedValue([]);
      mockPrismaService.spvSubmission.count.mockResolvedValue(0);

      await service.getSubmissions('user-1', { status: SpvSubmissionStatus.ACCEPTED });

      expect(mockPrismaService.spvSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: SpvSubmissionStatus.ACCEPTED,
          }),
        }),
      );
    });

    it('should filter by REJECTED status', async () => {
      mockPrismaService.spvSubmission.findMany.mockResolvedValue([]);
      mockPrismaService.spvSubmission.count.mockResolvedValue(0);

      await service.getSubmissions('user-1', { status: SpvSubmissionStatus.REJECTED });

      expect(mockPrismaService.spvSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: SpvSubmissionStatus.REJECTED,
          }),
        }),
      );
    });
  });

  describe('Message Status', () => {
    it('should count unread messages correctly', async () => {
      mockPrismaService.spvMessage.findMany.mockResolvedValue([]);
      mockPrismaService.spvMessage.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(25); // unread

      const result = await service.getMessages('user-1');

      expect(result.total).toBe(100);
      expect(result.unreadCount).toBe(25);

      // Verify unread count query
      expect(mockPrismaService.spvMessage.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: SpvMessageStatus.UNREAD },
      });
    });
  });

  describe('ANAF API URLs', () => {
    it('should use correct ANAF OAuth URL', () => {
      const { authUrl } = service.getAuthorizationUrl('user-1', '12345678');

      expect(authUrl).toContain('logincert.anaf.ro/anaf-oauth2/v1');
    });
  });

  describe('State Management', () => {
    it('should store state with expiration', () => {
      const { state } = service.getAuthorizationUrl('user-1', '12345678');

      const statesMap = (service as any).states;
      const stateData = statesMap.get(state);

      expect(stateData).toBeDefined();
      expect(stateData.userId).toBe('user-1');
      expect(stateData.cui).toBe('12345678');
      expect(stateData.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should clean up state after callback', async () => {
      const { state } = service.getAuthorizationUrl('user-1', '12345678');

      const statesMap = (service as any).states;
      expect(statesMap.has(state)).toBe(true);

      // Try to use the state (will fail because we can't mock axios properly, but state should be deleted)
      try {
        await service.handleOAuthCallback('code', state);
      } catch {
        // Expected to fail due to axios call
      }

      // State should be deleted after use (even on failure)
      expect(statesMap.has(state)).toBe(false);
    });
  });
});
