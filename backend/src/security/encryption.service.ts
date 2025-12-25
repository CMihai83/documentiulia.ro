import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Encryption Service
 * Provides AES-256-GCM encryption for data at rest
 *
 * Features:
 * - AES-256-GCM symmetric encryption
 * - Key derivation using PBKDF2
 * - Secure key management with key rotation
 * - Field-level encryption support
 * - Envelope encryption for large data
 * - Encryption audit logging
 */

// =================== TYPES & INTERFACES ===================

export type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-256-cbc';
export type KeyDerivationFunction = 'pbkdf2' | 'scrypt' | 'argon2';

export interface EncryptionConfig {
  algorithm: EncryptionAlgorithm;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  tagLength: number;
  iterations: number;
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
  salt: string;
  algorithm: EncryptionAlgorithm;
  keyId: string;
  version: number;
}

export interface EncryptionKey {
  id: string;
  key: Buffer;
  createdAt: Date;
  rotatedAt?: Date;
  expiresAt?: Date;
  status: 'active' | 'rotating' | 'expired' | 'revoked';
  version: number;
}

export interface KeyRotationResult {
  oldKeyId: string;
  newKeyId: string;
  rotatedAt: Date;
  itemsReencrypted: number;
}

export interface EncryptionStats {
  totalEncryptions: number;
  totalDecryptions: number;
  activeKeys: number;
  lastKeyRotation?: Date;
  averageEncryptionTimeMs: number;
}

export interface FieldEncryptionConfig {
  fields: string[];
  keyId?: string;
}

// =================== CONSTANTS ===================

export const DEFAULT_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16, // 128 bits
  saltLength: 32, // 256 bits
  tagLength: 16, // 128 bits
  iterations: 100000, // PBKDF2 iterations
};

export const SENSITIVE_FIELDS = [
  'password',
  'ssn',
  'socialSecurityNumber',
  'taxId',
  'bankAccount',
  'creditCard',
  'apiKey',
  'secretKey',
  'privateKey',
  'cnp', // Romanian personal identification number
  'cui', // Romanian company identification number
];

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly config: EncryptionConfig;
  private readonly masterKey: Buffer;

  // Key management
  private keys: Map<string, EncryptionKey> = new Map();
  private currentKeyId: string;

  // Statistics
  private stats = {
    totalEncryptions: 0,
    totalDecryptions: 0,
    encryptionTimes: [] as number[],
  };

  constructor(private readonly configService: ConfigService) {
    this.config = DEFAULT_CONFIG;
    this.masterKey = this.initializeMasterKey();
    this.initializeKeys();
  }

  // =================== INITIALIZATION ===================

  private initializeMasterKey(): Buffer {
    const masterKeyEnv = this.configService.get<string>('ENCRYPTION_MASTER_KEY');

    if (masterKeyEnv) {
      // Use provided master key (should be 64 hex characters = 32 bytes)
      return Buffer.from(masterKeyEnv, 'hex');
    }

    // Generate a deterministic key for development (NOT for production!)
    const devSecret = this.configService.get<string>('APP_SECRET') || 'documentiulia-dev-secret';
    return crypto.pbkdf2Sync(
      devSecret,
      'documentiulia-salt',
      this.config.iterations,
      this.config.keyLength,
      'sha512',
    );
  }

  private initializeKeys(): void {
    // Create initial data encryption key (DEK)
    const keyId = this.generateKeyId();
    const key = this.deriveKey(this.masterKey, keyId);

    this.keys.set(keyId, {
      id: keyId,
      key,
      createdAt: new Date(),
      status: 'active',
      version: 1,
    });

    this.currentKeyId = keyId;
    this.logger.log(`Encryption service initialized with key: ${keyId}`);
  }

  // =================== KEY MANAGEMENT ===================

  private generateKeyId(): string {
    return `key_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private deriveKey(masterKey: Buffer, salt: string | Buffer): Buffer {
    const saltBuffer = typeof salt === 'string' ? Buffer.from(salt) : salt;
    return crypto.pbkdf2Sync(
      masterKey,
      saltBuffer,
      this.config.iterations,
      this.config.keyLength,
      'sha512',
    );
  }

  /**
   * Get encryption key by ID
   */
  getKey(keyId: string): EncryptionKey | null {
    return this.keys.get(keyId) || null;
  }

  /**
   * Get current active key
   */
  getCurrentKey(): EncryptionKey {
    const key = this.keys.get(this.currentKeyId);
    if (!key) {
      throw new BadRequestException('No active encryption key');
    }
    return key;
  }

  /**
   * List all keys
   */
  listKeys(): EncryptionKey[] {
    return Array.from(this.keys.values()).map((k) => ({
      ...k,
      key: Buffer.alloc(0), // Don't expose actual key
    }));
  }

  /**
   * Rotate encryption key
   */
  async rotateKey(): Promise<KeyRotationResult> {
    const oldKeyId = this.currentKeyId;
    const oldKey = this.keys.get(oldKeyId);

    if (oldKey) {
      oldKey.status = 'rotating';
      oldKey.rotatedAt = new Date();
    }

    // Generate new key
    const newKeyId = this.generateKeyId();
    const newKey = this.deriveKey(this.masterKey, newKeyId);
    const version = (oldKey?.version || 0) + 1;

    this.keys.set(newKeyId, {
      id: newKeyId,
      key: newKey,
      createdAt: new Date(),
      status: 'active',
      version,
    });

    this.currentKeyId = newKeyId;

    // Mark old key as expired after grace period
    if (oldKey) {
      oldKey.status = 'expired';
      oldKey.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }

    this.logger.log(`Key rotated: ${oldKeyId} -> ${newKeyId}`);

    return {
      oldKeyId,
      newKeyId,
      rotatedAt: new Date(),
      itemsReencrypted: 0, // Would track re-encrypted items in production
    };
  }

  /**
   * Revoke a key (emergency use)
   */
  revokeKey(keyId: string): boolean {
    const key = this.keys.get(keyId);
    if (!key) return false;

    if (keyId === this.currentKeyId) {
      throw new BadRequestException('Cannot revoke current active key');
    }

    key.status = 'revoked';
    this.logger.warn(`Key revoked: ${keyId}`);

    return true;
  }

  // =================== ENCRYPTION OPERATIONS ===================

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(plaintext: string, keyId?: string): EncryptedData {
    const startTime = Date.now();
    const key = keyId ? this.keys.get(keyId) : this.getCurrentKey();

    if (!key || key.status === 'revoked') {
      throw new BadRequestException('Invalid or revoked encryption key');
    }

    // Generate random IV and salt
    const iv = crypto.randomBytes(this.config.ivLength);
    const salt = crypto.randomBytes(this.config.saltLength);

    // Derive data key from encryption key and salt
    const dataKey = this.deriveKey(key.key, salt);

    // Encrypt using AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv);
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const tag = cipher.getAuthTag();

    // Update stats
    this.stats.totalEncryptions++;
    this.stats.encryptionTimes.push(Date.now() - startTime);

    return {
      ciphertext,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      salt: salt.toString('base64'),
      algorithm: 'aes-256-gcm',
      keyId: key.id,
      version: key.version,
    };
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData: EncryptedData): string {
    const startTime = Date.now();
    const key = this.keys.get(encryptedData.keyId);

    if (!key) {
      throw new BadRequestException('Encryption key not found');
    }

    if (key.status === 'revoked') {
      throw new BadRequestException('Encryption key has been revoked');
    }

    // Parse components
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const salt = Buffer.from(encryptedData.salt, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');

    // Derive data key
    const dataKey = this.deriveKey(key.key, salt);

    // Decrypt using AES-256-GCM
    const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, iv);
    decipher.setAuthTag(tag);

    let plaintext = decipher.update(ciphertext);
    plaintext = Buffer.concat([plaintext, decipher.final()]);

    // Update stats
    this.stats.totalDecryptions++;
    this.stats.encryptionTimes.push(Date.now() - startTime);

    return plaintext.toString('utf8');
  }

  /**
   * Encrypt data to a single base64 string (simpler storage)
   */
  encryptToString(plaintext: string, keyId?: string): string {
    const encrypted = this.encrypt(plaintext, keyId);
    return Buffer.from(JSON.stringify(encrypted)).toString('base64');
  }

  /**
   * Decrypt from a single base64 string
   */
  decryptFromString(encryptedString: string): string {
    const encrypted = JSON.parse(
      Buffer.from(encryptedString, 'base64').toString('utf8'),
    ) as EncryptedData;
    return this.decrypt(encrypted);
  }

  // =================== FIELD-LEVEL ENCRYPTION ===================

  /**
   * Encrypt specific fields in an object
   */
  encryptFields<T extends Record<string, any>>(
    data: T,
    fields: string[],
    keyId?: string,
  ): T {
    const result = { ...data };

    for (const field of fields) {
      if (result[field] !== undefined && result[field] !== null) {
        const value = typeof result[field] === 'string'
          ? result[field]
          : JSON.stringify(result[field]);
        (result as any)[field] = this.encryptToString(value, keyId);
      }
    }

    return result;
  }

  /**
   * Decrypt specific fields in an object
   */
  decryptFields<T extends Record<string, any>>(
    data: T,
    fields: string[],
  ): T {
    const result = { ...data };

    for (const field of fields) {
      if (result[field] !== undefined && result[field] !== null) {
        try {
          const decrypted = this.decryptFromString(result[field]);
          // Try to parse as JSON
          try {
            (result as any)[field] = JSON.parse(decrypted);
          } catch {
            (result as any)[field] = decrypted;
          }
        } catch (error) {
          this.logger.warn(`Failed to decrypt field ${field}`);
        }
      }
    }

    return result;
  }

  /**
   * Encrypt sensitive fields automatically based on field names
   */
  encryptSensitiveFields<T extends Record<string, any>>(data: T): T {
    const fieldsToEncrypt = Object.keys(data).filter((key) =>
      SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase())),
    );
    return this.encryptFields(data, fieldsToEncrypt);
  }

  /**
   * Decrypt sensitive fields automatically
   */
  decryptSensitiveFields<T extends Record<string, any>>(data: T): T {
    const fieldsToDecrypt = Object.keys(data).filter((key) =>
      SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase())),
    );
    return this.decryptFields(data, fieldsToDecrypt);
  }

  // =================== ENVELOPE ENCRYPTION ===================

  /**
   * Encrypt large data using envelope encryption
   * Generates a unique data key for each encryption
   */
  envelopeEncrypt(plaintext: string): {
    encryptedData: string;
    encryptedDataKey: string;
  } {
    // Generate random data encryption key (DEK)
    const dek = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    // Encrypt data with DEK
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const tag = cipher.getAuthTag();

    // Encrypt DEK with master key (KEK)
    const masterKey = this.getCurrentKey().key;
    const dekIv = crypto.randomBytes(16);
    const dekCipher = crypto.createCipheriv('aes-256-gcm', masterKey, dekIv);
    let encryptedDek = dekCipher.update(dek);
    encryptedDek = Buffer.concat([encryptedDek, dekCipher.final()]);
    const dekTag = dekCipher.getAuthTag();

    return {
      encryptedData: JSON.stringify({
        ciphertext,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
      }),
      encryptedDataKey: JSON.stringify({
        encryptedKey: encryptedDek.toString('base64'),
        iv: dekIv.toString('base64'),
        tag: dekTag.toString('base64'),
        keyId: this.currentKeyId,
      }),
    };
  }

  /**
   * Decrypt envelope-encrypted data
   */
  envelopeDecrypt(encryptedData: string, encryptedDataKey: string): string {
    const dataEnvelope = JSON.parse(encryptedData);
    const keyEnvelope = JSON.parse(encryptedDataKey);

    // Get master key
    const key = this.keys.get(keyEnvelope.keyId);
    if (!key) {
      throw new BadRequestException('Encryption key not found');
    }

    // Decrypt DEK
    const dekIv = Buffer.from(keyEnvelope.iv, 'base64');
    const dekTag = Buffer.from(keyEnvelope.tag, 'base64');
    const encryptedDek = Buffer.from(keyEnvelope.encryptedKey, 'base64');

    const dekDecipher = crypto.createDecipheriv('aes-256-gcm', key.key, dekIv);
    dekDecipher.setAuthTag(dekTag);
    let dek = dekDecipher.update(encryptedDek);
    dek = Buffer.concat([dek, dekDecipher.final()]);

    // Decrypt data with DEK
    const dataIv = Buffer.from(dataEnvelope.iv, 'base64');
    const dataTag = Buffer.from(dataEnvelope.tag, 'base64');
    const ciphertext = Buffer.from(dataEnvelope.ciphertext, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', dek, dataIv);
    decipher.setAuthTag(dataTag);
    let plaintext = decipher.update(ciphertext);
    plaintext = Buffer.concat([plaintext, decipher.final()]);

    return plaintext.toString('utf8');
  }

  // =================== HASHING ===================

  /**
   * Create a secure hash (for passwords, etc.)
   */
  hash(data: string, salt?: string): { hash: string; salt: string } {
    const actualSalt = salt || crypto.randomBytes(32).toString('hex');
    const hash = crypto
      .pbkdf2Sync(data, actualSalt, this.config.iterations, 64, 'sha512')
      .toString('hex');

    return { hash, salt: actualSalt };
  }

  /**
   * Verify a hash
   */
  verifyHash(data: string, hash: string, salt: string): boolean {
    const { hash: computed } = this.hash(data, salt);
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  }

  /**
   * Create HMAC for data integrity
   */
  createHmac(data: string): string {
    const key = this.getCurrentKey().key;
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Verify HMAC
   */
  verifyHmac(data: string, hmac: string): boolean {
    const computed = this.createHmac(data);
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmac));
  }

  // =================== UTILITIES ===================

  /**
   * Generate a secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a secure random password
   */
  generatePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const randomBytes = crypto.randomBytes(length);
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }
    return password;
  }

  /**
   * Check if data looks encrypted
   */
  isEncrypted(data: string): boolean {
    try {
      const decoded = Buffer.from(data, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      return !!(
        parsed.ciphertext &&
        parsed.iv &&
        parsed.tag &&
        parsed.salt &&
        parsed.keyId
      );
    } catch {
      return false;
    }
  }

  /**
   * Re-encrypt data with new key (for key rotation)
   */
  reencrypt(encryptedData: EncryptedData, newKeyId?: string): EncryptedData {
    const plaintext = this.decrypt(encryptedData);
    return this.encrypt(plaintext, newKeyId);
  }

  // =================== STATISTICS ===================

  /**
   * Get encryption statistics
   */
  getStats(): EncryptionStats {
    const times = this.stats.encryptionTimes;
    const avgTime = times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;

    const activeKeys = Array.from(this.keys.values()).filter(
      (k) => k.status === 'active',
    ).length;

    const rotatedKeys = Array.from(this.keys.values())
      .filter((k) => k.rotatedAt)
      .sort((a, b) => (b.rotatedAt?.getTime() || 0) - (a.rotatedAt?.getTime() || 0));

    return {
      totalEncryptions: this.stats.totalEncryptions,
      totalDecryptions: this.stats.totalDecryptions,
      activeKeys,
      lastKeyRotation: rotatedKeys[0]?.rotatedAt,
      averageEncryptionTimeMs: Math.round(avgTime * 100) / 100,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalEncryptions: 0,
      totalDecryptions: 0,
      encryptionTimes: [],
    };
  }

  // =================== COMPLIANCE HELPERS ===================

  /**
   * Get encryption configuration for compliance reporting
   */
  getComplianceInfo(): {
    algorithm: string;
    keyLength: number;
    kdfIterations: number;
    activeKeyVersion: number;
    complianceStandards: string[];
  } {
    const currentKey = this.getCurrentKey();

    return {
      algorithm: this.config.algorithm.toUpperCase(),
      keyLength: this.config.keyLength * 8, // bits
      kdfIterations: this.config.iterations,
      activeKeyVersion: currentKey.version,
      complianceStandards: [
        'AES-256 (FIPS 197)',
        'PBKDF2 (NIST SP 800-132)',
        'GCM Mode (NIST SP 800-38D)',
        'GDPR Article 32',
        'SOC 2 CC6.1',
        'PCI DSS Requirement 3',
      ],
    };
  }
}
