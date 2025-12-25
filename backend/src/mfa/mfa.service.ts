import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly APP_NAME = 'DocumentIulia.ro';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate MFA setup data (QR code + secret)
   * Does NOT enable MFA - user must verify first
   */
  async generateMfaSetup(userId: string, userPassword: string) {
    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(userPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Check if MFA is already enabled
    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled. Disable it first to re-enable.');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${this.APP_NAME} (${user.email})`,
      issuer: this.APP_NAME,
      length: 32,
    });

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

    this.logger.log(`MFA setup generated for user ${userId}`);

    return {
      qrCode: qrCodeDataUrl,
      secret: secret.base32,
      backupUrl: secret.otpauth_url!,
    };
  }

  /**
   * Verify MFA setup and enable MFA
   * This confirms the user has successfully added the secret to their authenticator
   */
  async verifyAndEnableMfa(userId: string, token: string, secret: string) {
    // Verify the token
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after (60 seconds window)
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10)),
    );

    // Enable MFA for user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: secret,
        mfaBackupCodes: hashedBackupCodes,
        mfaEnabledAt: new Date(),
      },
    });

    // Log audit
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'MFA_ENABLED',
        entity: 'User',
        entityId: userId,
        details: { timestamp: new Date().toISOString() },
      },
    });

    this.logger.log(`MFA enabled for user ${userId}`);

    return {
      success: true,
      backupCodes,
      message: 'MFA enabled successfully. Save these backup codes in a secure location.',
    };
  }

  /**
   * Verify MFA token during login
   */
  async verifyMfaToken(userId: string, token: string, backupCode?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled for this user');
    }

    // Try backup code first if provided
    if (backupCode) {
      return this.verifyBackupCode(userId, backupCode);
    }

    // Verify TOTP token
    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!isValid) {
      // Log failed attempt
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'MFA_VERIFICATION_FAILED',
          entity: 'User',
          entityId: userId,
          details: { timestamp: new Date().toISOString() },
        },
      });

      throw new UnauthorizedException('Invalid MFA code');
    }

    // Log successful verification
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'MFA_VERIFICATION_SUCCESS',
        entity: 'User',
        entityId: userId,
        details: { timestamp: new Date().toISOString() },
      },
    });

    return { success: true };
  }

  /**
   * Verify backup code
   */
  private async verifyBackupCode(userId: string, backupCode: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfaBackupCodes) {
      throw new UnauthorizedException('Invalid backup code');
    }

    // Check each hashed backup code
    const backupCodes = user.mfaBackupCodes as string[];
    let validCodeIndex = -1;

    for (let i = 0; i < backupCodes.length; i++) {
      const isValid = await bcrypt.compare(backupCode, backupCodes[i]);
      if (isValid) {
        validCodeIndex = i;
        break;
      }
    }

    if (validCodeIndex === -1) {
      throw new UnauthorizedException('Invalid backup code');
    }

    // Remove used backup code
    const updatedBackupCodes = backupCodes.filter((_, index) => index !== validCodeIndex);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaBackupCodes: updatedBackupCodes,
      },
    });

    // Log backup code usage
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'MFA_BACKUP_CODE_USED',
        entity: 'User',
        entityId: userId,
        details: {
          timestamp: new Date().toISOString(),
          remainingCodes: updatedBackupCodes.length,
        },
      },
    });

    this.logger.warn(
      `Backup code used for user ${userId}. Remaining codes: ${updatedBackupCodes.length}`,
    );

    return {
      success: true,
      backupCodesRemaining: updatedBackupCodes.length,
    };
  }

  /**
   * Disable MFA
   */
  async disableMfa(userId: string, password: string, token: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    if (!user.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Verify MFA token before disabling
    const isTokenValid = speakeasy.totp.verify({
      secret: user.mfaSecret!,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    // Disable MFA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
        mfaEnabledAt: null,
      },
    });

    // Log audit
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'MFA_DISABLED',
        entity: 'User',
        entityId: userId,
        details: { timestamp: new Date().toISOString() },
      },
    });

    this.logger.log(`MFA disabled for user ${userId}`);

    return { success: true, message: 'MFA disabled successfully' };
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string, password: string, token: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Verify MFA token
    const isTokenValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10)),
    );

    // Update backup codes
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaBackupCodes: hashedBackupCodes,
      },
    });

    // Log audit
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'MFA_BACKUP_CODES_REGENERATED',
        entity: 'User',
        entityId: userId,
        details: { timestamp: new Date().toISOString() },
      },
    });

    this.logger.log(`Backup codes regenerated for user ${userId}`);

    return {
      backupCodes,
      message: 'New backup codes generated. Save these in a secure location.',
    };
  }

  /**
   * Get MFA status for user
   */
  async getMfaStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaBackupCodes: true,
        mfaEnabledAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      enabled: user.mfaEnabled || false,
      backupCodesRemaining: user.mfaBackupCodes
        ? (user.mfaBackupCodes as string[]).length
        : 0,
      enabledAt: user.mfaEnabledAt ?? undefined,
    };
  }

  /**
   * Generate secure backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase()
        .match(/.{1,4}/g)!
        .join('-');
      codes.push(code);
    }
    return codes;
  }
}
