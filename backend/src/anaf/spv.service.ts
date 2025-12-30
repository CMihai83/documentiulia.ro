import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimiterService } from '../rate-limiter/rate-limiter.service';
import { SpvStatus, SpvMessageType, SpvMessageStatus, SpvSubmissionType, SpvSubmissionStatus } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

// ANAF SPV OAuth2 Configuration
// Production: https://logincert.anaf.ro/anaf-oauth2/v1
// Test: https://logincert.anaf.ro/anaf-oauth2/v1 (same endpoint, different credentials)

interface AnafOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface AnafUploadResponse {
  ExecutionStatus: number;
  index_incarcare: string;
  Errors?: { errorMessage: string }[];
}

interface AnafStatusResponse {
  stare: string;
  Errors?: { errorMessage: string }[];
  id_descarcare?: string;
}

@Injectable()
export class SpvService {
  private readonly logger = new Logger(SpvService.name);
  private client: AxiosInstance;
  private states = new Map<string, { userId: string; cui: string; expiresAt: number }>();

  // ANAF API Endpoints
  private readonly ANAF_OAUTH_URL = 'https://logincert.anaf.ro/anaf-oauth2/v1';
  private readonly ANAF_EFACTURA_URL = 'https://api.anaf.ro/prod/FCTEL/rest';
  private readonly ANAF_SAFT_URL = 'https://api.anaf.ro/prod/D406/upload';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private rateLimiter: RateLimiterService,
  ) {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // ===== OAuth2 Flow =====

  /**
   * Generate OAuth2 authorization URL for ANAF SPV
   * User will be redirected to ANAF login page
   */
  getAuthorizationUrl(userId: string, cui: string): { authUrl: string; state: string } {
    const clientId = this.configService.get('ANAF_CLIENT_ID');
    const redirectUri = this.configService.get('ANAF_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/api/v1/spv/oauth/callback`;

    // Generate secure state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state with userId for verification (expires in 10 minutes)
    this.states.set(state, {
      userId,
      cui,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    // ANAF OAuth2 scopes for e-Factura and SAF-T
    const scope = 'SPVWebServiceAccess SPVWebServiceUpload';

    const authUrl = `${this.ANAF_OAUTH_URL}/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${state}`;

    this.logger.log(`Generated OAuth URL for user ${userId}, CUI: ${cui}`);
    return { authUrl, state };
  }

  /**
   * Handle OAuth2 callback from ANAF
   * Exchange authorization code for access token
   */
  async handleOAuthCallback(code: string, state: string): Promise<{ userId: string; success: boolean }> {
    // Verify state
    const stateData = this.states.get(state);
    if (!stateData || stateData.expiresAt < Date.now()) {
      this.states.delete(state);
      throw new UnauthorizedException('Invalid or expired state parameter');
    }

    const { userId, cui } = stateData;
    this.states.delete(state);

    try {
      const clientId = this.configService.get('ANAF_CLIENT_ID');
      const clientSecret = this.configService.get('ANAF_CLIENT_SECRET');
      const redirectUri = this.configService.get('ANAF_REDIRECT_URI') ||
        `${this.configService.get('APP_URL')}/api/v1/spv/oauth/callback`;

      // Check rate limit for ANAF OAuth calls
      const rateLimitKey = `anaf:oauth:${userId}`;
      const rateLimitResult = await this.rateLimiter.consumeRateLimit('INTEGRATION', rateLimitKey, {
        integrationType: 'ANAF'
      });

      if (!rateLimitResult.allowed) {
        this.logger.warn(`ANAF OAuth rate limited for user ${userId}`);
        throw new BadRequestException(`Rate limit exceeded. Try again in ${Math.ceil((rateLimitResult.retryAfterMs || 5000) / 1000)} seconds.`);
      }

      // Exchange code for token
      const response = await this.client.post<AnafOAuthTokenResponse>(
        `${this.ANAF_OAUTH_URL}/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token, refresh_token, expires_in, scope } = response.data;

      // Store token in database
      await this.prisma.spvToken.upsert({
        where: { userId },
        create: {
          userId,
          cui,
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: new Date(Date.now() + expires_in * 1000),
          refreshExpiresAt: refresh_token ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null, // 30 days
          scope,
          status: SpvStatus.ACTIVE,
        },
        update: {
          cui,
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: new Date(Date.now() + expires_in * 1000),
          refreshExpiresAt: refresh_token ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
          scope,
          status: SpvStatus.ACTIVE,
          lastError: null,
        },
      });

      this.logger.log(`OAuth token stored for user ${userId}`);
      return { userId, success: true };
    } catch (error) {
      this.logger.error(`OAuth callback failed for user ${userId}`, error);

      // Store error status
      await this.prisma.spvToken.upsert({
        where: { userId },
        create: {
          userId,
          cui,
          accessToken: '',
          expiresAt: new Date(),
          status: SpvStatus.ERROR,
          lastError: error.message,
        },
        update: {
          status: SpvStatus.ERROR,
          lastError: error.message,
        },
      });

      throw new BadRequestException('Failed to exchange OAuth code');
    }
  }

  /**
   * Refresh OAuth2 access token
   */
  async refreshToken(userId: string): Promise<boolean> {
    const token = await this.prisma.spvToken.findUnique({ where: { userId } });

    if (!token || !token.refreshToken) {
      throw new BadRequestException('No refresh token available');
    }

    try {
      // Check rate limit for ANAF OAuth refresh calls
      const rateLimitKey = `anaf:oauth-refresh:${userId}`;
      const rateLimitResult = await this.rateLimiter.consumeRateLimit('INTEGRATION', rateLimitKey, {
        integrationType: 'ANAF'
      });

      if (!rateLimitResult.allowed) {
        this.logger.warn(`ANAF OAuth refresh rate limited for user ${userId}`);
        return false;
      }

      const clientId = this.configService.get('ANAF_CLIENT_ID');
      const clientSecret = this.configService.get('ANAF_CLIENT_SECRET');

      const response = await this.client.post<AnafOAuthTokenResponse>(
        `${this.ANAF_OAUTH_URL}/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: token.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token, refresh_token, expires_in, scope } = response.data;

      await this.prisma.spvToken.update({
        where: { userId },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token || token.refreshToken,
          expiresAt: new Date(Date.now() + expires_in * 1000),
          scope: scope || token.scope,
          status: SpvStatus.ACTIVE,
          lastError: null,
        },
      });

      this.logger.log(`Token refreshed for user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Token refresh failed for user ${userId}`, error);

      await this.prisma.spvToken.update({
        where: { userId },
        data: {
          status: SpvStatus.EXPIRED,
          lastError: error.message,
        },
      });

      return false;
    }
  }

  /**
   * Get valid access token (refreshes if needed)
   */
  async getValidToken(userId: string): Promise<string> {
    const token = await this.prisma.spvToken.findUnique({ where: { userId } });

    if (!token) {
      throw new UnauthorizedException('SPV not connected. Please authorize first.');
    }

    // Check if token is expired or will expire in 5 minutes
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

    if (token.expiresAt <= fiveMinutesFromNow) {
      if (token.refreshToken) {
        const refreshed = await this.refreshToken(userId);
        if (!refreshed) {
          throw new UnauthorizedException('Token expired. Please reconnect to SPV.');
        }
        // Get updated token
        const updatedToken = await this.prisma.spvToken.findUnique({ where: { userId } });
        return updatedToken!.accessToken;
      } else {
        throw new UnauthorizedException('Token expired. Please reconnect to SPV.');
      }
    }

    // Update last used timestamp
    await this.prisma.spvToken.update({
      where: { userId },
      data: { lastUsedAt: new Date() },
    });

    return token.accessToken;
  }

  /**
   * Disconnect SPV (revoke token)
   */
  async disconnect(userId: string): Promise<void> {
    await this.prisma.spvToken.update({
      where: { userId },
      data: {
        status: SpvStatus.REVOKED,
        accessToken: '',
        refreshToken: null,
      },
    });

    this.logger.log(`SPV disconnected for user ${userId}`);
  }

  // ===== Connection Status =====

  async getConnectionStatus(userId: string) {
    const token = await this.prisma.spvToken.findUnique({ where: { userId } });

    if (!token) {
      return {
        connected: false,
        status: SpvStatus.PENDING,
        features: { efactura: false, saft: false, notifications: false },
      };
    }

    const scope = token.scope || '';
    return {
      connected: token.status === SpvStatus.ACTIVE,
      status: token.status,
      cui: token.cui,
      expiresAt: token.expiresAt,
      lastUsedAt: token.lastUsedAt,
      lastError: token.lastError,
      features: {
        efactura: scope.includes('SPVWebService'),
        saft: scope.includes('SPVWebServiceUpload'),
        notifications: true,
      },
    };
  }

  // ===== e-Factura Operations =====

  /**
   * Submit e-Factura to ANAF SPV
   */
  async submitEfactura(userId: string, xml: string, cui: string): Promise<{ uploadIndex: string; submissionId: string }> {
    const accessToken = await this.getValidToken(userId);

    try {
      const response = await this.client.post<AnafUploadResponse>(
        `${this.ANAF_EFACTURA_URL}/upload`,
        xml,
        {
          params: {
            standard: 'UBL',
            cif: cui,
          },
          headers: {
            'Content-Type': 'text/plain',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (response.data.ExecutionStatus !== 0) {
        const errorMsg = response.data.Errors?.map(e => e.errorMessage).join('; ') || 'Unknown error';
        throw new BadRequestException(`ANAF rejected e-Factura: ${errorMsg}`);
      }

      const uploadIndex = response.data.index_incarcare;

      // Log submission
      const submission = await this.prisma.spvSubmission.create({
        data: {
          userId,
          cui,
          submissionType: SpvSubmissionType.EFACTURA_SEND,
          uploadIndex,
          status: SpvSubmissionStatus.PENDING,
        },
      });

      this.logger.log(`e-Factura submitted: ${uploadIndex} for user ${userId}`);
      return { uploadIndex, submissionId: submission.id };
    } catch (error) {
      this.logger.error(`e-Factura submission failed`, error);
      throw error;
    }
  }

  /**
   * Check e-Factura submission status
   */
  async checkEfacturaStatus(userId: string, uploadIndex: string): Promise<{ status: string; downloadId?: string }> {
    const accessToken = await this.getValidToken(userId);

    try {
      const response = await this.client.get<AnafStatusResponse>(
        `${this.ANAF_EFACTURA_URL}/status/${uploadIndex}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      // Update submission record
      const anafStatus = response.data.stare;
      let status: SpvSubmissionStatus;

      if (anafStatus === 'ok') status = SpvSubmissionStatus.ACCEPTED;
      else if (anafStatus === 'in prelucrare') status = SpvSubmissionStatus.PROCESSING;
      else if (anafStatus === 'nok') status = SpvSubmissionStatus.REJECTED;
      else status = SpvSubmissionStatus.PENDING;

      await this.prisma.spvSubmission.updateMany({
        where: { uploadIndex },
        data: {
          status,
          anafStatus,
          lastCheckedAt: new Date(),
          completedAt: status === SpvSubmissionStatus.ACCEPTED || status === SpvSubmissionStatus.REJECTED ? new Date() : null,
        },
      });

      return {
        status: anafStatus,
        downloadId: response.data.id_descarcare,
      };
    } catch (error) {
      this.logger.error(`Status check failed for ${uploadIndex}`, error);
      throw error;
    }
  }

  /**
   * Download received e-Facturi from ANAF
   */
  async downloadReceivedEfacturi(userId: string, cui: string, days: number = 60) {
    const accessToken = await this.getValidToken(userId);

    try {
      const response = await this.client.get(
        `${this.ANAF_EFACTURA_URL}/listaMesajePaginworatio`,
        {
          params: {
            cif: cui,
            zile: days,
            pagina: 1,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const messages = response.data.mesaje || [];

      // Store messages in database
      for (const msg of messages) {
        await this.prisma.spvMessage.upsert({
          where: { messageId: msg.id },
          create: {
            userId,
            cui,
            messageId: msg.id,
            messageType: SpvMessageType.EFACTURA_RECEIVED,
            subject: `e-Factura de la ${msg.cif_emitent}`,
            uploadIndex: msg.id_solicitare,
            anafCreatedAt: new Date(msg.data_creare),
          },
          update: {
            anafCreatedAt: new Date(msg.data_creare),
          },
        });
      }

      this.logger.log(`Downloaded ${messages.length} e-Facturi for CUI ${cui}`);
      return messages;
    } catch (error) {
      this.logger.error(`Download received e-Facturi failed`, error);
      throw error;
    }
  }

  // ===== SAF-T Operations =====

  /**
   * Submit SAF-T D406 to ANAF SPV
   */
  async submitSaft(userId: string, xml: string, cui: string, period: string): Promise<{ reference: string; submissionId: string }> {
    const accessToken = await this.getValidToken(userId);
    const xmlHash = crypto.createHash('sha256').update(xml).digest('hex');

    try {
      const response = await this.client.post<AnafUploadResponse>(
        this.ANAF_SAFT_URL,
        xml,
        {
          params: {
            cif: cui,
            perioada: period,
          },
          headers: {
            'Content-Type': 'application/xml',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (response.data.ExecutionStatus !== 0) {
        const errorMsg = response.data.Errors?.map(e => e.errorMessage).join('; ') || 'Unknown error';
        throw new BadRequestException(`ANAF rejected SAF-T: ${errorMsg}`);
      }

      const reference = response.data.index_incarcare;

      // Log submission
      const submission = await this.prisma.spvSubmission.create({
        data: {
          userId,
          cui,
          submissionType: SpvSubmissionType.SAFT_D406,
          uploadIndex: reference,
          period,
          xmlHash,
          xmlSize: Buffer.byteLength(xml, 'utf8'),
          status: SpvSubmissionStatus.PENDING,
        },
      });

      // Update SAF-T report if exists
      await this.prisma.sAFTReport.updateMany({
        where: { userId, period },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          spvRef: reference,
        },
      });

      this.logger.log(`SAF-T D406 submitted: ${reference} for period ${period}`);
      return { reference, submissionId: submission.id };
    } catch (error) {
      this.logger.error(`SAF-T submission failed`, error);
      throw error;
    }
  }

  // ===== Messages =====

  async getMessages(userId: string, limit = 50, offset = 0) {
    const [messages, total, unreadCount] = await Promise.all([
      this.prisma.spvMessage.findMany({
        where: { userId },
        orderBy: { anafCreatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.spvMessage.count({ where: { userId } }),
      this.prisma.spvMessage.count({ where: { userId, status: SpvMessageStatus.UNREAD } }),
    ]);

    return { messages, total, unreadCount };
  }

  async markMessageRead(userId: string, messageId: string): Promise<void> {
    await this.prisma.spvMessage.updateMany({
      where: { id: messageId, userId },
      data: { status: SpvMessageStatus.READ, readAt: new Date() },
    });
  }

  // ===== Submissions =====

  async getSubmissions(userId: string, filters: {
    type?: SpvSubmissionType;
    status?: SpvSubmissionStatus;
    period?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { userId };
    if (filters.type) where.submissionType = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.period) where.period = filters.period;

    const [submissions, total] = await Promise.all([
      this.prisma.spvSubmission.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.spvSubmission.count({ where }),
    ]);

    return { submissions, total };
  }

  // ===== Dashboard =====

  async getDashboard(userId: string) {
    const [connection, unreadMessages, pendingSubmissions, recentSubmissions] = await Promise.all([
      this.getConnectionStatus(userId),
      this.prisma.spvMessage.count({ where: { userId, status: SpvMessageStatus.UNREAD } }),
      this.prisma.spvSubmission.count({ where: { userId, status: SpvSubmissionStatus.PENDING } }),
      this.prisma.spvSubmission.findMany({
        where: { userId },
        orderBy: { submittedAt: 'desc' },
        take: 5,
      }),
    ]);

    // Calculate next SAF-T deadline (25th of next month)
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 25);
    const daysRemaining = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const saftPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return {
      connection,
      unreadMessages,
      pendingSubmissions,
      recentSubmissions,
      deadlines: {
        saftNextDeadline: nextMonth,
        saftPeriod,
        daysRemaining,
      },
    };
  }

  // ===== Scheduled Tasks =====

  /**
   * Refresh expiring tokens automatically
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async refreshExpiringTokens(): Promise<void> {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

    const expiringTokens = await this.prisma.spvToken.findMany({
      where: {
        status: SpvStatus.ACTIVE,
        expiresAt: { lte: oneHourFromNow },
        refreshToken: { not: null },
      },
    });

    for (const token of expiringTokens) {
      try {
        await this.refreshToken(token.userId);
      } catch (error) {
        this.logger.warn(`Failed to refresh token for user ${token.userId}`);
      }
    }
  }

  /**
   * Check pending submission statuses
   * Runs every 15 minutes
   */
  @Cron('0 */15 * * * *')
  async checkPendingSubmissions(): Promise<void> {
    const pendingSubmissions = await this.prisma.spvSubmission.findMany({
      where: {
        status: SpvSubmissionStatus.PENDING,
        submittedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      },
    });

    for (const submission of pendingSubmissions) {
      try {
        if (submission.submissionType === SpvSubmissionType.EFACTURA_SEND) {
          await this.checkEfacturaStatus(submission.userId, submission.uploadIndex);
        }
      } catch (error) {
        this.logger.warn(`Failed to check status for submission ${submission.id}`);
      }
    }
  }

  /**
   * Sync received e-Facturi for active connections
   * Runs daily at 6 AM
   */
  @Cron('0 6 * * *')
  async syncReceivedEfacturi(): Promise<void> {
    const activeTokens = await this.prisma.spvToken.findMany({
      where: { status: SpvStatus.ACTIVE },
    });

    for (const token of activeTokens) {
      try {
        await this.downloadReceivedEfacturi(token.userId, token.cui, 7); // Last 7 days
      } catch (error) {
        this.logger.warn(`Failed to sync e-Facturi for user ${token.userId}`);
      }
    }
  }
}
