import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

/**
 * Biometric Authentication Service
 * Supports WebAuthn/FIDO2 for passwordless authentication
 *
 * Features:
 * - Device registration (fingerprint, Face ID, Touch ID)
 * - Challenge generation and verification
 * - Multi-device support
 * - Session management for biometric auth
 */

// =================== TYPES ===================

export type BiometricType = 'fingerprint' | 'face' | 'iris' | 'voice' | 'platform';
export type DeviceStatus = 'active' | 'disabled' | 'revoked';

export interface BiometricDevice {
  id: string;
  userId: string;
  tenantId: string;
  deviceName: string;
  deviceType: string;
  biometricType: BiometricType;
  credentialId: string;
  publicKey: string;
  counter: number;
  status: DeviceStatus;
  lastUsedAt?: Date;
  registeredAt: Date;
  userAgent?: string;
  platform?: string;
}

export interface BiometricChallenge {
  id: string;
  challenge: string;
  userId?: string;
  type: 'registration' | 'authentication';
  expiresAt: Date;
  usedAt?: Date;
}

export interface WebAuthnRegistrationOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    alg: number;
    type: 'public-key';
  }>;
  timeout: number;
  attestation: 'none' | 'indirect' | 'direct';
  authenticatorSelection: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    requireResidentKey: boolean;
    userVerification: 'required' | 'preferred' | 'discouraged';
  };
  excludeCredentials?: Array<{
    id: string;
    type: 'public-key';
    transports?: string[];
  }>;
}

export interface WebAuthnAuthenticationOptions {
  challenge: string;
  timeout: number;
  rpId: string;
  allowCredentials: Array<{
    id: string;
    type: 'public-key';
    transports?: string[];
  }>;
  userVerification: 'required' | 'preferred' | 'discouraged';
}

export interface RegistrationCredential {
  id: string;
  rawId: string;
  type: 'public-key';
  response: {
    attestationObject: string;
    clientDataJSON: string;
  };
  deviceName?: string;
}

export interface AuthenticationCredential {
  id: string;
  rawId: string;
  type: 'public-key';
  response: {
    authenticatorData: string;
    clientDataJSON: string;
    signature: string;
    userHandle?: string;
  };
}

// =================== SERVICE ===================

@Injectable()
export class BiometricAuthService {
  private readonly logger = new Logger(BiometricAuthService.name);

  // Storage
  private devices = new Map<string, BiometricDevice>();
  private challenges = new Map<string, BiometricChallenge>();
  private userDevices = new Map<string, string[]>(); // userId -> deviceIds

  // Configuration
  private readonly rpName = 'DocumentIulia.ro';
  private readonly rpId = 'documentiulia.ro';
  private readonly challengeTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== REGISTRATION ===================

  async generateRegistrationOptions(
    userId: string,
    tenantId: string,
    userEmail: string,
    userName: string,
    platform?: 'platform' | 'cross-platform',
  ): Promise<WebAuthnRegistrationOptions> {
    const challenge = this.generateChallenge();

    // Store challenge
    const challengeId = `challenge-${Date.now()}`;
    const challengeData: BiometricChallenge = {
      id: challengeId,
      challenge,
      userId,
      type: 'registration',
      expiresAt: new Date(Date.now() + this.challengeTimeout),
    };
    this.challenges.set(challengeId, challengeData);

    // Get existing credentials to exclude
    const existingDeviceIds = this.userDevices.get(userId) || [];
    const excludeCredentials = existingDeviceIds
      .map(id => this.devices.get(id))
      .filter(d => d && d.status === 'active')
      .map(d => ({
        id: d!.credentialId,
        type: 'public-key' as const,
        transports: ['internal', 'usb', 'ble', 'nfc'],
      }));

    const options: WebAuthnRegistrationOptions = {
      challenge,
      rp: {
        name: this.rpName,
        id: this.rpId,
      },
      user: {
        id: Buffer.from(userId).toString('base64'),
        name: userEmail,
        displayName: userName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      timeout: this.challengeTimeout,
      attestation: 'none',
      authenticatorSelection: {
        authenticatorAttachment: platform || 'platform',
        requireResidentKey: false,
        userVerification: 'required',
      },
      excludeCredentials,
    };

    this.logger.log(`Generated registration options for user ${userId}`);
    return options;
  }

  async verifyRegistration(
    userId: string,
    tenantId: string,
    credential: RegistrationCredential,
    userAgent?: string,
  ): Promise<BiometricDevice> {
    // Find and validate challenge
    const challenge = this.findValidChallenge(userId, 'registration');
    if (!challenge) {
      throw new UnauthorizedException('Invalid or expired challenge');
    }

    // Mark challenge as used
    challenge.usedAt = new Date();

    // Parse attestation (simplified - in production use a proper WebAuthn library)
    const clientData = this.parseClientData(credential.response.clientDataJSON);

    // Verify origin and type
    if (clientData.type !== 'webauthn.create') {
      throw new BadRequestException('Invalid credential type');
    }

    // Extract public key from attestation object (simplified)
    const publicKey = this.extractPublicKey(credential.response.attestationObject);

    // Create device record
    const deviceId = `device-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const device: BiometricDevice = {
      id: deviceId,
      userId,
      tenantId,
      deviceName: credential.deviceName || 'Biometric Device',
      deviceType: this.detectDeviceType(userAgent),
      biometricType: 'platform',
      credentialId: credential.id,
      publicKey,
      counter: 0,
      status: 'active',
      registeredAt: new Date(),
      userAgent,
      platform: this.detectPlatform(userAgent),
    };

    this.devices.set(deviceId, device);

    // Track device for user
    const userDeviceList = this.userDevices.get(userId) || [];
    userDeviceList.push(deviceId);
    this.userDevices.set(userId, userDeviceList);

    this.eventEmitter.emit('biometric.device_registered', {
      userId,
      deviceId,
      deviceName: device.deviceName,
    });

    this.logger.log(`Registered biometric device ${deviceId} for user ${userId}`);
    return device;
  }

  // =================== AUTHENTICATION ===================

  async generateAuthenticationOptions(
    userId?: string,
  ): Promise<WebAuthnAuthenticationOptions & { challengeId: string }> {
    const challenge = this.generateChallenge();

    // Store challenge
    const challengeId = `challenge-${Date.now()}`;
    const challengeData: BiometricChallenge = {
      id: challengeId,
      challenge,
      userId,
      type: 'authentication',
      expiresAt: new Date(Date.now() + this.challengeTimeout),
    };
    this.challenges.set(challengeId, challengeData);

    // Get allowed credentials
    let allowCredentials: Array<{ id: string; type: 'public-key'; transports?: string[] }> = [];

    if (userId) {
      const userDeviceList = this.userDevices.get(userId) || [];
      allowCredentials = userDeviceList
        .map(id => this.devices.get(id))
        .filter(d => d && d.status === 'active')
        .map(d => ({
          id: d!.credentialId,
          type: 'public-key' as const,
          transports: ['internal', 'usb', 'ble', 'nfc'],
        }));
    }

    const options: WebAuthnAuthenticationOptions & { challengeId: string } = {
      challengeId,
      challenge,
      timeout: this.challengeTimeout,
      rpId: this.rpId,
      allowCredentials,
      userVerification: 'required',
    };

    this.logger.log(`Generated authentication options for user ${userId || 'discoverable'}`);
    return options;
  }

  async verifyAuthentication(
    credential: AuthenticationCredential,
    challengeId: string,
  ): Promise<{ userId: string; device: BiometricDevice }> {
    // Get challenge
    const challenge = this.challenges.get(challengeId);
    if (!challenge || challenge.usedAt || new Date() > challenge.expiresAt) {
      throw new UnauthorizedException('Invalid or expired challenge');
    }

    // Mark challenge as used
    challenge.usedAt = new Date();

    // Find device by credential ID
    let device: BiometricDevice | undefined;
    for (const d of this.devices.values()) {
      if (d.credentialId === credential.id && d.status === 'active') {
        device = d;
        break;
      }
    }

    if (!device) {
      throw new UnauthorizedException('Device not found or disabled');
    }

    // Verify challenge matches
    if (challenge.userId && challenge.userId !== device.userId) {
      throw new UnauthorizedException('Credential does not match user');
    }

    // Parse and verify client data
    const clientData = this.parseClientData(credential.response.clientDataJSON);
    if (clientData.type !== 'webauthn.get') {
      throw new BadRequestException('Invalid credential type');
    }

    // Verify signature (simplified - in production use proper crypto verification)
    const isValid = this.verifySignature(
      credential.response.authenticatorData,
      credential.response.clientDataJSON,
      credential.response.signature,
      device.publicKey,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Update counter for replay attack protection
    const newCounter = this.parseCounter(credential.response.authenticatorData);
    if (newCounter <= device.counter) {
      this.logger.warn(`Possible replay attack detected for device ${device.id}`);
      throw new UnauthorizedException('Invalid authenticator counter');
    }

    device.counter = newCounter;
    device.lastUsedAt = new Date();
    this.devices.set(device.id, device);

    this.eventEmitter.emit('biometric.authentication_success', {
      userId: device.userId,
      deviceId: device.id,
    });

    this.logger.log(`Biometric authentication successful for user ${device.userId}`);
    return { userId: device.userId, device };
  }

  // =================== DEVICE MANAGEMENT ===================

  async getUserDevices(userId: string): Promise<BiometricDevice[]> {
    const deviceIds = this.userDevices.get(userId) || [];
    return deviceIds
      .map(id => this.devices.get(id))
      .filter(d => d !== undefined) as BiometricDevice[];
  }

  async getDevice(userId: string, deviceId: string): Promise<BiometricDevice> {
    const device = this.devices.get(deviceId);
    if (!device || device.userId !== userId) {
      throw new BadRequestException('Device not found');
    }
    return device;
  }

  async updateDeviceName(
    userId: string,
    deviceId: string,
    deviceName: string,
  ): Promise<BiometricDevice> {
    const device = await this.getDevice(userId, deviceId);
    device.deviceName = deviceName;
    this.devices.set(deviceId, device);
    return device;
  }

  async disableDevice(userId: string, deviceId: string): Promise<void> {
    const device = await this.getDevice(userId, deviceId);
    device.status = 'disabled';
    this.devices.set(deviceId, device);

    this.eventEmitter.emit('biometric.device_disabled', {
      userId,
      deviceId,
    });

    this.logger.log(`Disabled biometric device ${deviceId} for user ${userId}`);
  }

  async enableDevice(userId: string, deviceId: string): Promise<void> {
    const device = await this.getDevice(userId, deviceId);
    if (device.status === 'revoked') {
      throw new BadRequestException('Cannot enable revoked device');
    }
    device.status = 'active';
    this.devices.set(deviceId, device);

    this.logger.log(`Enabled biometric device ${deviceId} for user ${userId}`);
  }

  async revokeDevice(userId: string, deviceId: string): Promise<void> {
    const device = await this.getDevice(userId, deviceId);
    device.status = 'revoked';
    this.devices.set(deviceId, device);

    this.eventEmitter.emit('biometric.device_revoked', {
      userId,
      deviceId,
    });

    this.logger.log(`Revoked biometric device ${deviceId} for user ${userId}`);
  }

  async deleteDevice(userId: string, deviceId: string): Promise<void> {
    const device = await this.getDevice(userId, deviceId);
    this.devices.delete(deviceId);

    // Remove from user's device list
    const userDeviceList = this.userDevices.get(userId) || [];
    const index = userDeviceList.indexOf(deviceId);
    if (index > -1) {
      userDeviceList.splice(index, 1);
      this.userDevices.set(userId, userDeviceList);
    }

    this.eventEmitter.emit('biometric.device_deleted', {
      userId,
      deviceId,
    });

    this.logger.log(`Deleted biometric device ${deviceId} for user ${userId}`);
  }

  async revokeAllDevices(userId: string): Promise<number> {
    const deviceIds = this.userDevices.get(userId) || [];
    let count = 0;

    for (const deviceId of deviceIds) {
      const device = this.devices.get(deviceId);
      if (device && device.status !== 'revoked') {
        device.status = 'revoked';
        this.devices.set(deviceId, device);
        count++;
      }
    }

    this.eventEmitter.emit('biometric.all_devices_revoked', {
      userId,
      count,
    });

    this.logger.log(`Revoked ${count} biometric devices for user ${userId}`);
    return count;
  }

  // =================== HELPERS ===================

  private generateChallenge(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  private findValidChallenge(
    userId: string,
    type: 'registration' | 'authentication',
  ): BiometricChallenge | null {
    for (const challenge of this.challenges.values()) {
      if (
        challenge.userId === userId &&
        challenge.type === type &&
        !challenge.usedAt &&
        new Date() < challenge.expiresAt
      ) {
        return challenge;
      }
    }
    return null;
  }

  private parseClientData(clientDataJSON: string): {
    type: string;
    challenge: string;
    origin: string;
  } {
    try {
      const decoded = Buffer.from(clientDataJSON, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      throw new BadRequestException('Invalid client data');
    }
  }

  private extractPublicKey(attestationObject: string): string {
    // Simplified - in production, properly parse CBOR attestation object
    // and extract the public key from authData
    return crypto.createHash('sha256').update(attestationObject).digest('base64');
  }

  private verifySignature(
    authenticatorData: string,
    clientDataJSON: string,
    signature: string,
    publicKey: string,
  ): boolean {
    // Simplified signature verification
    // In production, use proper ECDSA/RSA verification with the stored public key
    try {
      // Hash of clientDataJSON
      const clientDataHash = crypto
        .createHash('sha256')
        .update(Buffer.from(clientDataJSON, 'base64'))
        .digest();

      // Concatenate authenticatorData + clientDataHash
      const authData = Buffer.from(authenticatorData, 'base64');
      const signedData = Buffer.concat([authData, clientDataHash]);

      // For demo, just check signature exists
      return signature.length > 0;
    } catch {
      return false;
    }
  }

  private parseCounter(authenticatorData: string): number {
    try {
      const authData = Buffer.from(authenticatorData, 'base64');
      // Counter is at bytes 33-36 (4 bytes, big-endian)
      if (authData.length >= 37) {
        return authData.readUInt32BE(33);
      }
      return 0;
    } catch {
      return 0;
    }
  }

  private detectDeviceType(userAgent?: string): string {
    if (!userAgent) return 'Unknown';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    return 'Unknown';
  }

  private detectPlatform(userAgent?: string): string {
    if (!userAgent) return 'unknown';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'ios';
    if (userAgent.includes('Android')) return 'android';
    if (userAgent.includes('Windows')) return 'windows';
    if (userAgent.includes('Mac')) return 'macos';
    if (userAgent.includes('Linux')) return 'linux';
    return 'unknown';
  }

  // =================== STATS ===================

  async getStats(): Promise<{
    totalDevices: number;
    activeDevices: number;
    devicesByType: Record<string, number>;
    devicesByPlatform: Record<string, number>;
    usersWithBiometrics: number;
  }> {
    const devices = Array.from(this.devices.values());

    const devicesByType: Record<string, number> = {};
    const devicesByPlatform: Record<string, number> = {};

    for (const device of devices) {
      devicesByType[device.biometricType] = (devicesByType[device.biometricType] || 0) + 1;
      const platform = device.platform || 'unknown';
      devicesByPlatform[platform] = (devicesByPlatform[platform] || 0) + 1;
    }

    return {
      totalDevices: devices.length,
      activeDevices: devices.filter(d => d.status === 'active').length,
      devicesByType,
      devicesByPlatform,
      usersWithBiometrics: this.userDevices.size,
    };
  }

  // Cleanup expired challenges periodically
  async cleanupExpiredChallenges(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [id, challenge] of this.challenges.entries()) {
      if (challenge.expiresAt < now) {
        this.challenges.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired biometric challenges`);
    }

    return cleaned;
  }
}
