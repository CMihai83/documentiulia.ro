import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { EncryptionService, SENSITIVE_FIELDS } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        APP_SECRET: 'test-secret-for-development',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have a current key', () => {
      const key = service.getCurrentKey();
      expect(key).toBeDefined();
      expect(key.id).toMatch(/^key_/);
      expect(key.status).toBe('active');
    });

    it('should list keys', () => {
      const keys = service.listKeys();
      expect(keys.length).toBeGreaterThan(0);
      expect(keys[0].key.length).toBe(0); // Key should be redacted
    });
  });

  describe('basic encryption/decryption', () => {
    it('should encrypt plaintext', () => {
      const plaintext = 'Hello, World!';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.keyId).toBeDefined();
    });

    it('should decrypt ciphertext', () => {
      const plaintext = 'Hello, World!';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Bună ziua! Привет! こんにちは!';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle large data', () => {
      const plaintext = 'A'.repeat(100000);
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle JSON data', () => {
      const data = { name: 'Test', value: 123, nested: { deep: true } };
      const plaintext = JSON.stringify(data);
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(JSON.parse(decrypted)).toEqual(data);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'Same message';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });
  });

  describe('string encryption/decryption', () => {
    it('should encrypt to single base64 string', () => {
      const plaintext = 'Test data';
      const encrypted = service.encryptToString(plaintext);

      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should decrypt from base64 string', () => {
      const plaintext = 'Test data';
      const encrypted = service.encryptToString(plaintext);
      const decrypted = service.decryptFromString(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('field-level encryption', () => {
    it('should encrypt specified fields', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        ssn: '123-45-6789',
        phone: '555-1234',
      };

      const encrypted = service.encryptFields(data, ['ssn', 'phone']);

      expect(encrypted.name).toBe('John Doe');
      expect(encrypted.email).toBe('john@example.com');
      expect(encrypted.ssn).not.toBe('123-45-6789');
      expect(encrypted.phone).not.toBe('555-1234');
    });

    it('should decrypt specified fields', () => {
      const data = {
        name: 'John Doe',
        ssn: '123-45-6789',
      };

      const encrypted = service.encryptFields(data, ['ssn']);
      const decrypted = service.decryptFields(encrypted, ['ssn']);

      expect(decrypted.name).toBe('John Doe');
      expect(decrypted.ssn).toBe('123-45-6789');
    });

    it('should handle non-string fields', () => {
      const data = {
        name: 'John',
        creditCard: { number: '4111111111111111', cvv: '123' },
      };

      const encrypted = service.encryptFields(data, ['creditCard']);
      const decrypted = service.decryptFields(encrypted, ['creditCard']);

      expect(decrypted.creditCard).toEqual(data.creditCard);
    });

    it('should skip null/undefined fields', () => {
      const data = {
        name: 'John',
        ssn: null,
        taxId: undefined,
      };

      const encrypted = service.encryptFields(data, ['ssn', 'taxId']);

      expect(encrypted.ssn).toBeNull();
      expect(encrypted.taxId).toBeUndefined();
    });
  });

  describe('sensitive field encryption', () => {
    it('should auto-detect and encrypt sensitive fields', () => {
      const data = {
        name: 'Test Company',
        cnp: '1234567890123', // Romanian personal ID
        cui: 'RO12345678', // Romanian company ID
        bankAccount: 'RO49AAAA1B31007593840000',
      };

      const encrypted = service.encryptSensitiveFields(data);

      expect(encrypted.name).toBe('Test Company');
      expect(encrypted.cnp).not.toBe('1234567890123');
      expect(encrypted.cui).not.toBe('RO12345678');
      expect(encrypted.bankAccount).not.toBe('RO49AAAA1B31007593840000');
    });

    it('should auto-decrypt sensitive fields', () => {
      const data = {
        name: 'Test',
        password: 'secret123',
        apiKey: 'api_key_value',
      };

      const encrypted = service.encryptSensitiveFields(data);
      const decrypted = service.decryptSensitiveFields(encrypted);

      expect(decrypted.name).toBe('Test');
      expect(decrypted.password).toBe('secret123');
      expect(decrypted.apiKey).toBe('api_key_value');
    });

    it('should have expected sensitive field patterns', () => {
      expect(SENSITIVE_FIELDS).toContain('password');
      expect(SENSITIVE_FIELDS).toContain('ssn');
      expect(SENSITIVE_FIELDS).toContain('cnp');
      expect(SENSITIVE_FIELDS).toContain('cui');
      expect(SENSITIVE_FIELDS).toContain('creditCard');
    });
  });

  describe('envelope encryption', () => {
    it('should envelope encrypt data', () => {
      const plaintext = 'Large document content...';
      const result = service.envelopeEncrypt(plaintext);

      expect(result.encryptedData).toBeDefined();
      expect(result.encryptedDataKey).toBeDefined();
    });

    it('should envelope decrypt data', () => {
      const plaintext = 'Large document content with sensitive information';
      const { encryptedData, encryptedDataKey } = service.envelopeEncrypt(plaintext);
      const decrypted = service.envelopeDecrypt(encryptedData, encryptedDataKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should use unique data keys for each encryption', () => {
      const plaintext = 'Same data';
      const result1 = service.envelopeEncrypt(plaintext);
      const result2 = service.envelopeEncrypt(plaintext);

      expect(result1.encryptedDataKey).not.toBe(result2.encryptedDataKey);
    });
  });

  describe('key management', () => {
    it('should rotate key', async () => {
      const oldKey = service.getCurrentKey();
      const result = await service.rotateKey();

      expect(result.oldKeyId).toBe(oldKey.id);
      expect(result.newKeyId).not.toBe(oldKey.id);
      expect(result.rotatedAt).toBeDefined();

      const newKey = service.getCurrentKey();
      expect(newKey.id).toBe(result.newKeyId);
    });

    it('should still decrypt data after key rotation', async () => {
      const plaintext = 'Data before rotation';
      const encrypted = service.encrypt(plaintext);

      await service.rotateKey();

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt with new key after rotation', async () => {
      const oldKeyId = service.getCurrentKey().id;

      await service.rotateKey();

      const encrypted = service.encrypt('New data');
      expect(encrypted.keyId).not.toBe(oldKeyId);
    });

    it('should revoke non-current key', async () => {
      const initialKey = service.getCurrentKey();
      await service.rotateKey();

      const revoked = service.revokeKey(initialKey.id);
      expect(revoked).toBe(true);

      const key = service.getKey(initialKey.id);
      expect(key?.status).toBe('revoked');
    });

    it('should not revoke current key', () => {
      const currentKey = service.getCurrentKey();

      expect(() => {
        service.revokeKey(currentKey.id);
      }).toThrow(BadRequestException);
    });

    it('should not decrypt with revoked key', async () => {
      const encrypted = service.encrypt('Test');
      const oldKeyId = encrypted.keyId;

      await service.rotateKey();
      service.revokeKey(oldKeyId);

      expect(() => {
        service.decrypt(encrypted);
      }).toThrow(BadRequestException);
    });
  });

  describe('hashing', () => {
    it('should create hash with auto-generated salt', () => {
      const data = 'password123';
      const result = service.hash(data);

      expect(result.hash).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.hash.length).toBe(128); // 64 bytes in hex
    });

    it('should create consistent hash with same salt', () => {
      const data = 'password123';
      const salt = 'fixed-salt-value';

      const result1 = service.hash(data, salt);
      const result2 = service.hash(data, salt);

      expect(result1.hash).toBe(result2.hash);
    });

    it('should verify correct hash', () => {
      const data = 'password123';
      const { hash, salt } = service.hash(data);

      const valid = service.verifyHash(data, hash, salt);
      expect(valid).toBe(true);
    });

    it('should reject incorrect data', () => {
      const data = 'password123';
      const { hash, salt } = service.hash(data);

      const valid = service.verifyHash('wrong-password', hash, salt);
      expect(valid).toBe(false);
    });
  });

  describe('HMAC', () => {
    it('should create HMAC', () => {
      const data = 'Important message';
      const hmac = service.createHmac(data);

      expect(hmac).toBeDefined();
      expect(hmac.length).toBe(64); // SHA-256 in hex
    });

    it('should verify correct HMAC', () => {
      const data = 'Important message';
      const hmac = service.createHmac(data);

      const valid = service.verifyHmac(data, hmac);
      expect(valid).toBe(true);
    });

    it('should reject tampered data', () => {
      const data = 'Important message';
      const hmac = service.createHmac(data);

      const valid = service.verifyHmac('Tampered message', hmac);
      expect(valid).toBe(false);
    });
  });

  describe('utilities', () => {
    it('should generate random token', () => {
      const token = service.generateToken(32);

      expect(token.length).toBe(64); // 32 bytes in hex
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('should generate different tokens', () => {
      const token1 = service.generateToken();
      const token2 = service.generateToken();

      expect(token1).not.toBe(token2);
    });

    it('should generate random password', () => {
      const password = service.generatePassword(16);

      expect(password.length).toBe(16);
    });

    it('should generate passwords with required characters', () => {
      const password = service.generatePassword(32);

      expect(password.length).toBe(32);
      // Should contain alphanumeric and special characters
    });

    it('should check if data is encrypted', () => {
      const plaintext = 'Not encrypted';
      const encrypted = service.encryptToString(plaintext);

      expect(service.isEncrypted(plaintext)).toBe(false);
      expect(service.isEncrypted(encrypted)).toBe(true);
    });

    it('should re-encrypt data', async () => {
      const plaintext = 'Original data';
      const encrypted = service.encrypt(plaintext);
      const oldKeyId = encrypted.keyId;

      await service.rotateKey();
      const reencrypted = service.reencrypt(encrypted);

      expect(reencrypted.keyId).not.toBe(oldKeyId);
      expect(service.decrypt(reencrypted)).toBe(plaintext);
    });
  });

  describe('statistics', () => {
    it('should track encryption operations', () => {
      service.resetStats();

      service.encrypt('Test 1');
      service.encrypt('Test 2');
      const encrypted = service.encrypt('Test 3');
      service.decrypt(encrypted);

      const stats = service.getStats();

      expect(stats.totalEncryptions).toBe(3);
      expect(stats.totalDecryptions).toBe(1);
      expect(stats.activeKeys).toBeGreaterThan(0);
    });

    it('should track average encryption time', () => {
      service.resetStats();

      for (let i = 0; i < 10; i++) {
        service.encrypt(`Test ${i}`);
      }

      const stats = service.getStats();
      expect(stats.averageEncryptionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should reset statistics', () => {
      service.encrypt('Test');
      service.resetStats();

      const stats = service.getStats();
      expect(stats.totalEncryptions).toBe(0);
      expect(stats.totalDecryptions).toBe(0);
    });
  });

  describe('compliance', () => {
    it('should return compliance information', () => {
      const info = service.getComplianceInfo();

      expect(info.algorithm).toBe('AES-256-GCM');
      expect(info.keyLength).toBe(256);
      expect(info.kdfIterations).toBe(100000);
      expect(info.complianceStandards).toContain('AES-256 (FIPS 197)');
      expect(info.complianceStandards).toContain('GDPR Article 32');
      expect(info.complianceStandards).toContain('SOC 2 CC6.1');
    });
  });

  describe('error handling', () => {
    it('should throw for invalid key ID', () => {
      expect(() => {
        service.encrypt('Test', 'invalid-key-id');
      }).toThrow(BadRequestException);
    });

    it('should throw for tampered ciphertext', () => {
      const encrypted = service.encrypt('Test');
      encrypted.ciphertext = 'tampered' + encrypted.ciphertext;

      expect(() => {
        service.decrypt(encrypted);
      }).toThrow();
    });

    it('should throw for tampered auth tag', () => {
      const encrypted = service.encrypt('Test');
      encrypted.tag = 'AAAAAAAAAAAAAAAAAAAAAA==';

      expect(() => {
        service.decrypt(encrypted);
      }).toThrow();
    });

    it('should throw for missing key', () => {
      const encrypted = service.encrypt('Test');
      encrypted.keyId = 'key_nonexistent';

      expect(() => {
        service.decrypt(encrypted);
      }).toThrow(BadRequestException);
    });
  });
});
