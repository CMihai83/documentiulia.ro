import { Injectable, UnauthorizedException, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

interface RegisterDto {
  email: string;
  password: string;
  name: string;
  company?: string;
  cui?: string;
}

interface LoginDto {
  email: string;
  password: string;
}

interface RefreshTokenPayload {
  sub: string;
  email: string;
  tokenId: string;
  type: 'refresh';
}

interface AccessTokenPayload {
  sub: string;
  email: string;
  type: 'access';
}

// In-memory refresh token store (should be Redis in production for scalability)
interface StoredRefreshToken {
  userId: string;
  tokenId: string;
  createdAt: Date;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  isRevoked: boolean;
}

interface StoredVerificationToken {
  userId: string;
  email: string;
  type: 'email_verification' | 'password_reset';
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Token configuration
  private readonly ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access token
  private readonly REFRESH_TOKEN_EXPIRY = '30d'; // Long-lived refresh token
  private readonly REFRESH_TOKEN_ROTATION = true; // Rotate refresh tokens on use
  private readonly MAX_REFRESH_TOKENS_PER_USER = 5; // Max concurrent sessions

  // In-memory storage for refresh tokens (production should use Redis)
  private refreshTokens: Map<string, StoredRefreshToken> = new Map();

  // In-memory storage for verification tokens
  private verificationTokens: Map<string, StoredVerificationToken> = new Map();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
  ) {
    // Cleanup expired tokens every hour
    setInterval(() => this.cleanupExpiredTokens(), 60 * 60 * 1000);
  }

  async register(dto: RegisterDto, metadata?: { userAgent?: string; ipAddress?: string }) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password with bcrypt (cost factor 12 for production security)
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Create user with proper password storage
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        company: dto.company,
        cui: dto.cui,
      },
    });

    // Generate tokens with metadata for session tracking
    const tokens = await this.generateTokens(user.id, user.email, metadata);

    // Send welcome email notification
    try {
      await this.notificationsService.send({
        userId: user.id,
        type: NotificationType.WELCOME,
        recipientEmail: user.email,
        recipientName: user.name || user.company || user.email,
        data: {
          userName: user.name || user.company || 'utilizator',
          registrationDate: new Date().toISOString().split('T')[0],
          dashboardUrl: 'https://documentiulia.ro/dashboard',
        },
      });
      this.logger.log(`Welcome email sent to ${user.email}`);
    } catch (error) {
      this.logger.warn(`Failed to send welcome email to ${user.email}: ${error.message}`);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        tier: user.tier,
        role: user.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  async login(dto: LoginDto, metadata?: { userAgent?: string; ipAddress?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password using proper password field
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens with metadata for session tracking
    const tokens = await this.generateTokens(user.id, user.email, metadata);

    // Log audit
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        entity: 'User',
        entityId: user.id,
        details: { method: 'jwt', tokenId: tokens.tokenId, userAgent: metadata?.userAgent },
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        tier: user.tier,
        role: user.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  async refreshToken(refreshTokenString: string, metadata?: { userAgent?: string; ipAddress?: string }) {
    // Verify the refresh token
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshTokenString);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Validate it's a refresh token
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Check if token exists and is valid
    const storedToken = this.refreshTokens.get(payload.tokenId);
    if (!storedToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    if (storedToken.isRevoked) {
      // Token reuse detected - revoke all user tokens (security measure)
      this.logger.warn(`Refresh token reuse detected for user ${payload.sub}`);
      await this.revokeAllUserTokens(payload.sub);
      throw new UnauthorizedException('Token has been revoked - all sessions terminated');
    }

    if (new Date() > storedToken.expiresAt) {
      this.refreshTokens.delete(payload.tokenId);
      throw new UnauthorizedException('Refresh token expired');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Implement token rotation - revoke old token and issue new one
    if (this.REFRESH_TOKEN_ROTATION) {
      storedToken.isRevoked = true;
    }

    // Generate new tokens
    const tokens = await this.generateTokens(user.id, user.email, metadata);

    // Log audit
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'TOKEN_REFRESH',
        entity: 'Auth',
        entityId: payload.tokenId,
        details: { newTokenId: tokens.tokenId, rotated: this.REFRESH_TOKEN_ROTATION },
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: this.getAccessTokenExpirySeconds(),
    };
  }

  async logout(refreshTokenString: string) {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshTokenString);
      if (payload.tokenId) {
        const token = this.refreshTokens.get(payload.tokenId);
        if (token) {
          token.isRevoked = true;
          this.logger.log(`User ${payload.sub} logged out, token ${payload.tokenId} revoked`);
        }
      }
    } catch {
      // Token already invalid, nothing to do
    }
    return { success: true };
  }

  async logoutAllSessions(userId: string) {
    await this.revokeAllUserTokens(userId);
    this.logger.log(`All sessions terminated for user ${userId}`);
    return { success: true, message: 'All sessions terminated' };
  }

  async getActiveSessions(userId: string) {
    const sessions: Array<{
      tokenId: string;
      createdAt: Date;
      expiresAt: Date;
      userAgent?: string;
      ipAddress?: string;
    }> = [];

    for (const [tokenId, token] of this.refreshTokens.entries()) {
      if (token.userId === userId && !token.isRevoked && new Date() < token.expiresAt) {
        sessions.push({
          tokenId,
          createdAt: token.createdAt,
          expiresAt: token.expiresAt,
          userAgent: token.userAgent,
          ipAddress: token.ipAddress,
        });
      }
    }

    return sessions;
  }

  async revokeSession(userId: string, tokenId: string) {
    const token = this.refreshTokens.get(tokenId);
    if (token && token.userId === userId) {
      token.isRevoked = true;
      return { success: true };
    }
    throw new BadRequestException('Session not found');
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        cui: true,
        tier: true,
      },
    });
  }

  private async generateTokens(userId: string, email: string, metadata?: { userAgent?: string; ipAddress?: string }) {
    const tokenId = uuidv4();

    // Access token payload (short-lived)
    const accessPayload: AccessTokenPayload = {
      sub: userId,
      email,
      type: 'access',
    };

    // Refresh token payload (long-lived, with unique ID for revocation)
    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      email,
      tokenId,
      type: 'refresh',
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    this.refreshTokens.set(tokenId, {
      userId,
      tokenId,
      createdAt: new Date(),
      expiresAt,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
      isRevoked: false,
    });

    // Enforce max sessions per user
    await this.enforceMaxSessions(userId);

    return {
      accessToken,
      refreshToken,
      tokenId,
      expiresIn: this.getAccessTokenExpirySeconds(),
    };
  }

  private async enforceMaxSessions(userId: string) {
    const userTokens: Array<{ tokenId: string; createdAt: Date }> = [];

    for (const [tokenId, token] of this.refreshTokens.entries()) {
      if (token.userId === userId && !token.isRevoked && new Date() < token.expiresAt) {
        userTokens.push({ tokenId, createdAt: token.createdAt });
      }
    }

    // If user has more than max sessions, revoke oldest ones
    if (userTokens.length > this.MAX_REFRESH_TOKENS_PER_USER) {
      userTokens.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const tokensToRevoke = userTokens.slice(0, userTokens.length - this.MAX_REFRESH_TOKENS_PER_USER);

      for (const { tokenId } of tokensToRevoke) {
        const token = this.refreshTokens.get(tokenId);
        if (token) {
          token.isRevoked = true;
          this.logger.log(`Session ${tokenId} auto-revoked due to max sessions limit`);
        }
      }
    }
  }

  private async revokeAllUserTokens(userId: string) {
    for (const token of this.refreshTokens.values()) {
      if (token.userId === userId) {
        token.isRevoked = true;
      }
    }
  }

  private cleanupExpiredTokens() {
    const now = new Date();
    let cleaned = 0;

    for (const [tokenId, token] of this.refreshTokens.entries()) {
      if (token.isRevoked || now > token.expiresAt) {
        this.refreshTokens.delete(tokenId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired/revoked refresh tokens`);
    }
  }

  private getAccessTokenExpirySeconds(): number {
    // Parse ACCESS_TOKEN_EXPIRY (e.g., '15m' -> 900 seconds)
    const match = this.ACCESS_TOKEN_EXPIRY.match(/^(\d+)(m|h|d)$/);
    if (!match) return 900;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: return 900;
    }
  }

  getTokenConfig() {
    return {
      accessTokenExpiry: this.ACCESS_TOKEN_EXPIRY,
      refreshTokenExpiry: this.REFRESH_TOKEN_EXPIRY,
      maxSessionsPerUser: this.MAX_REFRESH_TOKENS_PER_USER,
      tokenRotation: this.REFRESH_TOKEN_ROTATION,
    };
  }

  // =================== PASSWORD RESET ===================

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      this.logger.log(`Password reset requested for non-existent email: ${email}`);
      return {
        success: true,
        message: 'If an account exists with this email, a reset link will be sent.',
        messageRo: 'Dacă există un cont cu acest email, veți primi un link de resetare.',
      };
    }

    // Generate reset token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    this.verificationTokens.set(token, {
      userId: user.id,
      email: user.email,
      type: 'password_reset',
      createdAt: new Date(),
      expiresAt,
      used: false,
    });

    // Send reset email
    try {
      await this.notificationsService.send({
        userId: user.id,
        type: NotificationType.PASSWORD_RESET,
        recipientEmail: user.email,
        recipientName: user.name || user.email,
        data: {
          userName: user.name || 'utilizator',
          resetUrl: `https://documentiulia.ro/reset-password?token=${token}`,
          expiryHours: 1,
        },
      });
      this.logger.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error.message}`);
    }

    return {
      success: true,
      message: 'If an account exists with this email, a reset link will be sent.',
      messageRo: 'Dacă există un cont cu acest email, veți primi un link de resetare.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const storedToken = this.verificationTokens.get(token);

    if (!storedToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (storedToken.type !== 'password_reset') {
      throw new BadRequestException('Invalid token type');
    }

    if (storedToken.used) {
      throw new BadRequestException('This reset link has already been used');
    }

    if (new Date() > storedToken.expiresAt) {
      this.verificationTokens.delete(token);
      throw new BadRequestException('Reset link has expired. Please request a new one.');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await this.prisma.user.update({
      where: { id: storedToken.userId },
      data: { password: hashedPassword },
    });

    // Mark token as used
    storedToken.used = true;

    // Revoke all existing sessions for security
    await this.revokeAllUserTokens(storedToken.userId);

    // Log audit
    await this.prisma.auditLog.create({
      data: {
        userId: storedToken.userId,
        action: 'PASSWORD_RESET',
        entity: 'User',
        entityId: storedToken.userId,
        details: { method: 'email_token' },
      },
    });

    this.logger.log(`Password reset successful for user ${storedToken.userId}`);

    return {
      success: true,
      message: 'Password has been reset successfully. Please login with your new password.',
      messageRo: 'Parola a fost resetată cu succes. Vă rugăm să vă autentificați cu noua parolă.',
    };
  }

  // =================== EMAIL VERIFICATION ===================

  async verifyEmail(token: string) {
    const storedToken = this.verificationTokens.get(token);

    if (!storedToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (storedToken.type !== 'email_verification') {
      throw new BadRequestException('Invalid token type');
    }

    if (storedToken.used) {
      return {
        success: true,
        message: 'Email already verified.',
        messageRo: 'Email-ul a fost deja verificat.',
      };
    }

    if (new Date() > storedToken.expiresAt) {
      this.verificationTokens.delete(token);
      throw new BadRequestException('Verification link has expired. Please request a new one.');
    }

    // Update user email verified status
    await this.prisma.user.update({
      where: { id: storedToken.userId },
      data: { emailVerified: true },
    });

    // Mark token as used
    storedToken.used = true;

    // Log audit
    await this.prisma.auditLog.create({
      data: {
        userId: storedToken.userId,
        action: 'EMAIL_VERIFIED',
        entity: 'User',
        entityId: storedToken.userId,
        details: { email: storedToken.email },
      },
    });

    this.logger.log(`Email verified for user ${storedToken.userId}`);

    return {
      success: true,
      message: 'Email verified successfully!',
      messageRo: 'Email-ul a fost verificat cu succes!',
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        success: true,
        message: 'If an account exists with this email, a verification link will be sent.',
        messageRo: 'Dacă există un cont cu acest email, veți primi un link de verificare.',
      };
    }

    // Check if already verified
    if (user.emailVerified) {
      return {
        success: true,
        message: 'Email is already verified.',
        messageRo: 'Email-ul este deja verificat.',
        alreadyVerified: true,
      };
    }

    // Generate verification token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    this.verificationTokens.set(token, {
      userId: user.id,
      email: user.email,
      type: 'email_verification',
      createdAt: new Date(),
      expiresAt,
      used: false,
    });

    // Send verification email
    try {
      await this.notificationsService.send({
        userId: user.id,
        type: NotificationType.EMAIL_VERIFICATION,
        recipientEmail: user.email,
        recipientName: user.name || user.email,
        data: {
          userName: user.name || 'utilizator',
          verificationUrl: `https://documentiulia.ro/verify-email?token=${token}`,
          expiryHours: 24,
        },
      });
      this.logger.log(`Verification email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error.message}`);
    }

    return {
      success: true,
      message: 'If an account exists with this email, a verification link will be sent.',
      messageRo: 'Dacă există un cont cu acest email, veți primi un link de verificare.',
    };
  }
}
