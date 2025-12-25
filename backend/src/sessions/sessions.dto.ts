import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';

export class DeviceInfoDto {
  @ApiProperty({ description: 'Device type', example: 'desktop' })
  type: 'desktop' | 'mobile' | 'tablet';

  @ApiProperty({ description: 'Operating system', example: 'Windows 10' })
  os: string;

  @ApiProperty({ description: 'Browser name', example: 'Chrome' })
  browser: string;

  @ApiProperty({ description: 'Browser version', example: '120.0.0' })
  browserVersion: string;

  @ApiProperty({ description: 'Device fingerprint hash', example: 'abc123def456' })
  fingerprint: string;
}

export class LocationDto {
  @ApiProperty({ description: 'IP address', example: '192.168.1.1' })
  ip: string;

  @ApiProperty({ description: 'Country code', example: 'RO' })
  country: string;

  @ApiProperty({ description: 'City name', example: 'Bucharest' })
  city: string;

  @ApiProperty({ description: 'Latitude', required: false })
  latitude?: number;

  @ApiProperty({ description: 'Longitude', required: false })
  longitude?: number;
}

export class SessionDto {
  @ApiProperty({ description: 'Session ID', example: 'sess_123456789' })
  id: string;

  @ApiProperty({ description: 'User ID', example: 'user_123' })
  userId: string;

  @ApiProperty({ type: DeviceInfoDto, description: 'Device information' })
  device: DeviceInfoDto;

  @ApiProperty({ type: LocationDto, description: 'Location information' })
  location: LocationDto;

  @ApiProperty({ description: 'Session creation timestamp', example: '2025-12-12T10:00:00Z' })
  createdAt: string;

  @ApiProperty({ description: 'Last activity timestamp', example: '2025-12-12T12:30:00Z' })
  lastActivityAt: string;

  @ApiProperty({ description: 'Session expiry timestamp', example: '2025-12-13T10:00:00Z' })
  expiresAt: string;

  @ApiProperty({ description: 'Whether this is the current session', example: true })
  isCurrent: boolean;

  @ApiProperty({ description: 'Whether this device is trusted', example: false })
  isTrusted: boolean;
}

export class LoginActivityDto {
  @ApiProperty({ description: 'Activity ID', example: 'act_123456789' })
  id: string;

  @ApiProperty({ description: 'User ID', example: 'user_123' })
  userId: string;

  @ApiProperty({ description: 'Activity type', example: 'login_success' })
  type: 'login_success' | 'login_failed' | 'logout' | 'session_revoked' | 'password_changed' | 'suspicious_activity';

  @ApiProperty({ description: 'IP address', example: '192.168.1.1' })
  ipAddress: string;

  @ApiProperty({ description: 'User agent string', example: 'Mozilla/5.0...' })
  userAgent: string;

  @ApiProperty({ type: LocationDto, description: 'Location information' })
  location: LocationDto;

  @ApiProperty({ description: 'Activity timestamp', example: '2025-12-12T10:00:00Z' })
  timestamp: string;

  @ApiProperty({ description: 'Additional details', required: false })
  details?: string;

  @ApiProperty({ description: 'Whether activity was flagged as suspicious', example: false })
  isSuspicious: boolean;
}

export class CreateSessionDto {
  @ApiProperty({ description: 'User ID', example: 'user_123' })
  @IsString()
  userId: string;

  @ApiProperty({ type: DeviceInfoDto, description: 'Device information' })
  device: DeviceInfoDto;

  @ApiProperty({ type: LocationDto, description: 'Location information' })
  location: LocationDto;

  @ApiProperty({ description: 'Remember this device', example: false, required: false })
  @IsBoolean()
  @IsOptional()
  rememberDevice?: boolean;
}

export class RevokeSessionDto {
  @ApiProperty({ description: 'Session ID to revoke', example: 'sess_123456789' })
  @IsString()
  sessionId: string;
}

export class UpdateSessionPreferencesDto {
  @ApiProperty({ description: 'Auto-logout timeout in minutes', example: 30, required: false })
  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(1440)
  autoLogoutTimeout?: number;

  @ApiProperty({ description: 'Maximum concurrent sessions allowed', example: 3, required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  maxConcurrentSessions?: number;

  @ApiProperty({ description: 'Enable email notifications for new device logins', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  notifyNewDevice?: boolean;

  @ApiProperty({ description: 'Enable email notifications for suspicious activity', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  notifySuspiciousActivity?: boolean;
}

export class SessionPreferencesDto {
  @ApiProperty({ description: 'User ID', example: 'user_123' })
  userId: string;

  @ApiProperty({ description: 'Auto-logout timeout in minutes', example: 30 })
  autoLogoutTimeout: number;

  @ApiProperty({ description: 'Maximum concurrent sessions allowed', example: 3 })
  maxConcurrentSessions: number;

  @ApiProperty({ description: 'Enable email notifications for new device logins', example: true })
  notifyNewDevice: boolean;

  @ApiProperty({ description: 'Enable email notifications for suspicious activity', example: true })
  notifySuspiciousActivity: boolean;

  @ApiProperty({ description: 'Trusted device IDs', type: [String] })
  trustedDevices: string[];
}

export class TrustDeviceDto {
  @ApiProperty({ description: 'Device fingerprint to trust', example: 'abc123def456' })
  @IsString()
  deviceFingerprint: string;
}

export class SessionSummaryDto {
  @ApiProperty({ description: 'Total active sessions', example: 2 })
  totalSessions: number;

  @ApiProperty({ description: 'Number of trusted devices', example: 1 })
  trustedDevices: number;

  @ApiProperty({ description: 'Recent login activities count', example: 15 })
  recentActivitiesCount: number;

  @ApiProperty({ description: 'Number of suspicious activities', example: 0 })
  suspiciousActivities: number;

  @ApiProperty({ description: 'Last login timestamp', example: '2025-12-12T10:00:00Z' })
  lastLogin: string;
}
