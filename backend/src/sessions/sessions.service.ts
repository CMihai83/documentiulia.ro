import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SessionDto,
  LoginActivityDto,
  CreateSessionDto,
  SessionPreferencesDto,
  UpdateSessionPreferencesDto,
  SessionSummaryDto,
  DeviceInfoDto,
  LocationDto,
} from './sessions.dto';
import * as crypto from 'crypto';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly SESSION_EXPIRY_HOURS = 24;
  private readonly MAX_SESSIONS_DEFAULT = 5;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new session
   */
  async createSession(createSessionDto: CreateSessionDto, currentSessionId?: string): Promise<SessionDto> {
    const { userId, device, location, rememberDevice } = createSessionDto;

    // Get user preferences
    const preferences = await this.getSessionPreferences(userId);

    // Check if user has exceeded max concurrent sessions
    const activeSessions = await this.getActiveSessions(userId);
    if (activeSessions.length >= preferences.maxConcurrentSessions) {
      // Revoke oldest session
      const oldestSession = activeSessions.sort(
        (a, b) => new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime()
      )[0];
      await this.revokeSession(userId, oldestSession.id);
      this.logger.log(`Revoked oldest session ${oldestSession.id} for user ${userId} due to max session limit`);
    }

    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

    const isTrusted = preferences.trustedDevices.includes(device.fingerprint);
    const isNewDevice = !isTrusted && activeSessions.every(s => s.device.fingerprint !== device.fingerprint);

    // In production, this would be stored in a database
    // For now, we'll use in-memory storage (would be Redis in production)
    const session: SessionDto = {
      id: sessionId,
      userId,
      device,
      location,
      createdAt: now.toISOString(),
      lastActivityAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isCurrent: sessionId === currentSessionId,
      isTrusted,
    };

    // Log login activity
    await this.logActivity(userId, 'login_success', location.ip, this.buildUserAgent(device), location, isNewDevice);

    // If new device and notifications enabled, send email
    if (isNewDevice && preferences.notifyNewDevice) {
      await this.sendNewDeviceNotification(userId, device, location);
    }

    // Trust device if requested
    if (rememberDevice && !isTrusted) {
      await this.trustDevice(userId, device.fingerprint);
    }

    this.logger.log(`Created session ${sessionId} for user ${userId}`);
    return session;
  }

  /**
   * Get all active sessions for a user
   */
  async getActiveSessions(userId: string, currentSessionId?: string): Promise<SessionDto[]> {
    // In production, retrieve from database/Redis
    // For now, return mock data with varied devices and locations
    const mockSessions = await this.getMockActiveSessions(userId, currentSessionId);
    return mockSessions;
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<SessionDto> {
    // In production, retrieve from database/Redis
    const sessions = await this.getMockActiveSessions('mock-user', sessionId);
    const session = sessions.find(s => s.id === sessionId);

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return session;
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    // In production, update lastActivityAt in database/Redis
    this.logger.debug(`Updated activity for session ${sessionId}`);
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    // In production, delete from database/Redis

    // Log revocation activity
    await this.logActivity(userId, 'session_revoked', '0.0.0.0', 'System', {
      ip: '0.0.0.0',
      country: 'N/A',
      city: 'N/A',
    }, false, `Session ${sessionId} revoked`);

    this.logger.log(`Revoked session ${sessionId} for user ${userId}`);
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllOtherSessions(userId: string, currentSessionId: string): Promise<number> {
    const activeSessions = await this.getActiveSessions(userId, currentSessionId);
    const otherSessions = activeSessions.filter(s => s.id !== currentSessionId);

    for (const session of otherSessions) {
      await this.revokeSession(userId, session.id);
    }

    this.logger.log(`Revoked ${otherSessions.length} sessions for user ${userId}`);
    return otherSessions.length;
  }

  /**
   * Get login activity history
   */
  async getLoginActivity(userId: string, limit: number = 50): Promise<LoginActivityDto[]> {
    // In production, retrieve from database
    return this.getMockLoginActivity(userId, limit);
  }

  /**
   * Get session preferences
   */
  async getSessionPreferences(userId: string): Promise<SessionPreferencesDto> {
    // In production, retrieve from database
    // For now, return defaults
    return {
      userId,
      autoLogoutTimeout: 30,
      maxConcurrentSessions: this.MAX_SESSIONS_DEFAULT,
      notifyNewDevice: true,
      notifySuspiciousActivity: true,
      trustedDevices: [],
    };
  }

  /**
   * Update session preferences
   */
  async updateSessionPreferences(
    userId: string,
    updateDto: UpdateSessionPreferencesDto
  ): Promise<SessionPreferencesDto> {
    // In production, update in database
    const currentPrefs = await this.getSessionPreferences(userId);

    const updatedPrefs: SessionPreferencesDto = {
      ...currentPrefs,
      ...updateDto,
    };

    this.logger.log(`Updated session preferences for user ${userId}`);
    return updatedPrefs;
  }

  /**
   * Trust a device
   */
  async trustDevice(userId: string, deviceFingerprint: string): Promise<void> {
    // In production, add to trusted devices in database
    const preferences = await this.getSessionPreferences(userId);

    if (!preferences.trustedDevices.includes(deviceFingerprint)) {
      preferences.trustedDevices.push(deviceFingerprint);
      this.logger.log(`Trusted device ${deviceFingerprint} for user ${userId}`);
    }
  }

  /**
   * Untrust a device
   */
  async untrustDevice(userId: string, deviceFingerprint: string): Promise<void> {
    // In production, remove from trusted devices in database
    const preferences = await this.getSessionPreferences(userId);
    preferences.trustedDevices = preferences.trustedDevices.filter(fp => fp !== deviceFingerprint);
    this.logger.log(`Untrusted device ${deviceFingerprint} for user ${userId}`);
  }

  /**
   * Get session summary
   */
  async getSessionSummary(userId: string): Promise<SessionSummaryDto> {
    const activeSessions = await this.getActiveSessions(userId);
    const loginActivity = await this.getLoginActivity(userId);
    const preferences = await this.getSessionPreferences(userId);

    const suspiciousActivities = loginActivity.filter(a => a.isSuspicious).length;
    const lastLogin = loginActivity.length > 0 ? loginActivity[0].timestamp : new Date().toISOString();

    return {
      totalSessions: activeSessions.length,
      trustedDevices: preferences.trustedDevices.length,
      recentActivitiesCount: loginActivity.length,
      suspiciousActivities,
      lastLogin,
    };
  }

  /**
   * Detect suspicious activity
   */
  private async detectSuspiciousActivity(
    userId: string,
    location: LocationDto,
    device: DeviceInfoDto
  ): Promise<boolean> {
    // Get recent login activity
    const recentActivity = await this.getLoginActivity(userId, 10);

    // Check for rapid location changes (impossible travel)
    if (recentActivity.length > 0) {
      const lastActivity = recentActivity[0];
      const timeDiff = Date.now() - new Date(lastActivity.timestamp).getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff < 1 && lastActivity.location.country !== location.country) {
        return true; // Suspicious: different country within 1 hour
      }
    }

    // Check for multiple failed login attempts (would need to track failed attempts)
    const recentFailed = recentActivity.filter(
      a => a.type === 'login_failed' && Date.now() - new Date(a.timestamp).getTime() < 60000
    );
    if (recentFailed.length >= 3) {
      return true; // Suspicious: 3+ failed attempts in last minute
    }

    return false;
  }

  /**
   * Log activity
   */
  private async logActivity(
    userId: string,
    type: LoginActivityDto['type'],
    ipAddress: string,
    userAgent: string,
    location: LocationDto,
    isSuspicious: boolean = false,
    details?: string
  ): Promise<void> {
    // In production, save to database
    this.logger.log(`Activity logged: ${type} for user ${userId} from ${ipAddress}`);
  }

  /**
   * Send new device notification
   */
  private async sendNewDeviceNotification(
    userId: string,
    device: DeviceInfoDto,
    location: LocationDto
  ): Promise<void> {
    // In production, send email via email service
    this.logger.log(`New device notification sent to user ${userId}: ${device.type} from ${location.city}, ${location.country}`);
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `sess_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Build user agent string from device info
   */
  private buildUserAgent(device: DeviceInfoDto): string {
    return `${device.browser}/${device.browserVersion} (${device.os})`;
  }

  /**
   * Mock data generators
   */
  private async getMockActiveSessions(userId: string, currentSessionId?: string): Promise<SessionDto[]> {
    const now = new Date();

    return [
      {
        id: currentSessionId || 'sess_current_123',
        userId,
        device: {
          type: 'desktop',
          os: 'Windows 10',
          browser: 'Chrome',
          browserVersion: '120.0.0',
          fingerprint: 'fp_desktop_123',
        },
        location: {
          ip: '86.124.45.67',
          country: 'RO',
          city: 'Bucharest',
          latitude: 44.4268,
          longitude: 26.1025,
        },
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        lastActivityAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        expiresAt: new Date(now.getTime() + 22 * 60 * 60 * 1000).toISOString(),
        isCurrent: true,
        isTrusted: true,
      },
      {
        id: 'sess_mobile_456',
        userId,
        device: {
          type: 'mobile',
          os: 'iOS 17',
          browser: 'Safari',
          browserVersion: '17.0',
          fingerprint: 'fp_mobile_456',
        },
        location: {
          ip: '86.124.45.68',
          country: 'RO',
          city: 'Cluj-Napoca',
          latitude: 46.7712,
          longitude: 23.6236,
        },
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
        lastActivityAt: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
        expiresAt: new Date(now.getTime() + 19 * 60 * 60 * 1000).toISOString(),
        isCurrent: false,
        isTrusted: false,
      },
      {
        id: 'sess_tablet_789',
        userId,
        device: {
          type: 'tablet',
          os: 'Android 13',
          browser: 'Chrome',
          browserVersion: '119.0.0',
          fingerprint: 'fp_tablet_789',
        },
        location: {
          ip: '86.124.45.69',
          country: 'RO',
          city: 'Timisoara',
          latitude: 45.7489,
          longitude: 21.2087,
        },
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
        lastActivityAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(),
        isCurrent: false,
        isTrusted: true,
      },
    ];
  }

  private async getMockLoginActivity(userId: string, limit: number): Promise<LoginActivityDto[]> {
    const now = new Date();

    const activities: LoginActivityDto[] = [
      {
        id: 'act_1',
        userId,
        type: 'login_success',
        ipAddress: '86.124.45.67',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0',
        location: {
          ip: '86.124.45.67',
          country: 'RO',
          city: 'Bucharest',
        },
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        isSuspicious: false,
      },
      {
        id: 'act_2',
        userId,
        type: 'login_success',
        ipAddress: '86.124.45.68',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/17.0',
        location: {
          ip: '86.124.45.68',
          country: 'RO',
          city: 'Cluj-Napoca',
        },
        timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
        details: 'New device login',
        isSuspicious: false,
      },
      {
        id: 'act_3',
        userId,
        type: 'logout',
        ipAddress: '86.124.45.70',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0) Firefox/120.0',
        location: {
          ip: '86.124.45.70',
          country: 'RO',
          city: 'Bucharest',
        },
        timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
        isSuspicious: false,
      },
      {
        id: 'act_4',
        userId,
        type: 'login_success',
        ipAddress: '86.124.45.69',
        userAgent: 'Mozilla/5.0 (Android 13) Chrome/119.0.0',
        location: {
          ip: '86.124.45.69',
          country: 'RO',
          city: 'Timisoara',
        },
        timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
        isSuspicious: false,
      },
      {
        id: 'act_5',
        userId,
        type: 'login_failed',
        ipAddress: '192.168.1.100',
        userAgent: 'Unknown',
        location: {
          ip: '192.168.1.100',
          country: 'US',
          city: 'Unknown',
        },
        timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        details: 'Invalid password',
        isSuspicious: true,
      },
    ];

    return activities.slice(0, limit);
  }
}
